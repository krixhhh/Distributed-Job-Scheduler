import os from "os";
import { prisma } from "../config/prisma.js";
import { logger } from "../logger/index.js";
import { JobStatus } from "shared";
import { getBullQueueInstance } from "./job-processor.js"; // Import queue instance helper

export const getCpuUsage = (): Promise<number> => {
  return new Promise((resolve) => {
    const startMeasure = os.cpus().map((cpu) => cpu.times);
    setTimeout(() => {
      const endMeasure = os.cpus().map((cpu) => cpu.times);
      let totalDiff = 0;
      let idleDiff = 0;

      for (let i = 0; i < startMeasure.length; i++) {
        const start = startMeasure[i];
        const end = endMeasure[i];

        const startTotal = start.user + start.nice + start.sys + start.idle + start.irq;
        const endTotal = end.user + end.nice + end.sys + end.idle + end.irq;

        totalDiff += endTotal - startTotal;
        idleDiff += end.idle - start.idle;
      }

      const percentage = 100 - (totalDiff > 0 ? (100 * idleDiff) / totalDiff : 0);
      resolve(Math.round(percentage * 100) / 100);
    }, 200);
  });
};

export const getMemoryUsage = (): number => {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  return Math.round((used / total) * 100 * 100) / 100;
};

export class WorkerMonitor {
  private workerId?: string;
  private heartbeatInterval?: NodeJS.Timeout;
  private recoveryInterval?: NodeJS.Timeout;
  private activeJobsCount = 0;

  constructor(
    private workerName: string,
    private concurrency: number
  ) {}

  async start() {
    try {
      // 1. Upsert worker record in PostgreSQL database
      const worker = await prisma.worker.upsert({
        where: { id: this.workerName }, // Use name directly as ID or search
        create: {
          id: this.workerName,
          name: this.workerName,
          concurrency: this.concurrency,
          ipAddress: this.getIpAddress(),
          hostname: os.hostname(),
          status: "ACTIVE",
        },
        update: {
          concurrency: this.concurrency,
          ipAddress: this.getIpAddress(),
          hostname: os.hostname(),
          status: "ACTIVE",
          lastHeartbeat: new Date(),
        },
      });

      this.workerId = worker.id;
      logger.info(`Worker monitor started for worker: ${this.workerName} (ID: ${this.workerId})`);

      // 2. Start heartbeat loop (every 10 seconds)
      this.heartbeatInterval = setInterval(() => this.emitHeartbeat(), 10000);

      // 3. Start auto-recovery loop (every 30 seconds)
      this.recoveryInterval = setInterval(() => this.runAutoRecovery(), 30000);

      // Perform initial recovery run
      await this.runAutoRecovery();
    } catch (err: any) {
      logger.error(`Failed to register worker monitor: ${err.message}`);
    }
  }

  incrementActiveCount() {
    this.activeJobsCount++;
  }

  decrementActiveCount() {
    this.activeJobsCount = Math.max(0, this.activeJobsCount - 1);
  }

  async stop() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.recoveryInterval) clearInterval(this.recoveryInterval);

    if (this.workerId) {
      try {
        await prisma.worker.update({
          where: { id: this.workerId },
          data: { status: "INACTIVE" },
        });
        logger.info(`Worker status set to INACTIVE`);
      } catch (err: any) {
        logger.error(`Error updating worker exit status: ${err.message}`);
      }
    }
  }

  private async emitHeartbeat() {
    if (!this.workerId) return;

    try {
      const cpu = await getCpuUsage();
      const mem = getMemoryUsage();

      await prisma.worker.update({
        where: { id: this.workerId },
        data: { lastHeartbeat: new Date() },
      });

      await prisma.workerHeartbeat.create({
        data: {
          workerId: this.workerId,
          cpuUsage: cpu,
          memoryUsage: mem,
          activeJobsCount: this.activeJobsCount,
        },
      });
    } catch (err: any) {
      logger.error(`Heartbeat emission error: ${err.message}`);
    }
  }

  private async runAutoRecovery() {
    try {
      // Find workers inactive for more than 2 minutes
      const thresholdTime = new Date(Date.now() - 2 * 60 * 1000);

      const deadWorkers = await prisma.worker.findMany({
        where: {
          lastHeartbeat: { lt: thresholdTime },
          status: "ACTIVE",
        },
      });

      if (deadWorkers.length === 0) return;

      logger.info(`Found ${deadWorkers.length} dead workers to process for recovery`);

      for (const worker of deadWorkers) {
        // Mark worker as INACTIVE
        await prisma.worker.update({
          where: { id: worker.id },
          data: { status: "INACTIVE" },
        });

        // Find jobs claimed/running by this worker
        const stuckJobs = await prisma.job.findMany({
          where: {
            lockedBy: worker.name,
            status: { in: [JobStatus.CLAIMED, JobStatus.RUNNING] },
          },
        });

        if (stuckJobs.length > 0) {
          logger.warn(`Recovering ${stuckJobs.length} jobs stuck on dead worker: ${worker.name}`);

          for (const job of stuckJobs) {
            const incrementedAttempts = job.attempts + 1;

            if (incrementedAttempts >= job.maxAttempts) {
              // Exceeded attempts limit, move to DLQ
              await prisma.job.update({
                where: { id: job.id },
                data: {
                  status: JobStatus.DLQ,
                  attempts: incrementedAttempts,
                  lockedBy: null,
                  lockedAt: null,
                  error: JSON.stringify({ message: "Worker crashed and job exceeded maximum attempts limit." }),
                },
              });

              await prisma.deadLetterQueue.create({
                data: {
                  jobId: job.id,
                  reason: "Worker node crashed during execution, exceeding max attempt retries.",
                },
              }).catch(() => {}); // ignore duplicates

              logger.error(`Job ${job.id} moved to DLQ due to worker crash recovery limits`);
            } else {
              // Re-enqueue job
              const updatedJob = await prisma.job.update({
                where: { id: job.id },
                data: {
                  status: JobStatus.QUEUED,
                  attempts: incrementedAttempts,
                  lockedBy: null,
                  lockedAt: null,
                },
              });

              // Re-submit to BullMQ
              const queue = getBullQueueInstance(job.queueId);
              await queue.add(updatedJob.name, { jobId: updatedJob.id });
              logger.info(`Job ${job.id} re-enqueued successfully`);
            }
          }
        }
      }
    } catch (err: any) {
      logger.error(`Auto recovery cycle execution error: ${err.message}`);
    }
  }

  private getIpAddress(): string {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === "IPv4" && !iface.internal) {
          return iface.address;
        }
      }
    }
    return "127.0.0.1";
  }
}
