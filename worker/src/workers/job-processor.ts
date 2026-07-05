import { Worker as BullWorker, Queue as BullQueue } from "bullmq";
import { prisma } from "../config/prisma.js";
import { redisConfig } from "../config/redis.js";
import { logger } from "../logger/index.js";
import { DistributedLock } from "./distributed-lock.js";
import { GeminiService } from "../services/gemini.service.js";
import { NotificationService } from "../services/notification.service.js";
import { WorkerMonitor } from "./worker-monitor.js";
import { JobStatus, RetryStrategy, NotificationType } from "shared";

const activeWorkers = new Map<string, BullWorker>();
const activeBullQueues = new Map<string, BullQueue>();

export const getBullQueueInstance = (queueName: string): BullQueue => {
  let q = activeBullQueues.get(queueName);
  if (!q) {
    q = new BullQueue(queueName, {
      connection: redisConfig,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
    activeBullQueues.set(queueName, q);
  }
  return q;
};

export class JobProcessor {
  private syncInterval?: NodeJS.Timeout;

  constructor(
    private workerName: string,
    private monitor: WorkerMonitor
  ) {}

  async start() {
    logger.info("Initializing Job Processor and syncing queue workers...");
    
    // Sync queue workers every 15 seconds
    this.syncInterval = setInterval(() => this.syncQueueWorkers(), 15000);
    
    // Run initial sync
    await this.syncQueueWorkers();
  }

  async stop() {
    if (this.syncInterval) clearInterval(this.syncInterval);

    for (const [queueId, worker] of activeWorkers.entries()) {
      logger.info(`Shutting down worker for queue: ${queueId}`);
      await worker.close();
    }
    activeWorkers.clear();
  }

  private async syncQueueWorkers() {
    try {
      // Find all active queues in the database
      const queues = await prisma.queue.findMany({
        where: { status: "ACTIVE" },
        include: { retryPolicy: true },
      });

      const queueIds = new Set(queues.map((q) => q.id));

      // 1. Clean up workers for queues that were deleted or paused
      for (const queueId of activeWorkers.keys()) {
        if (!queueIds.has(queueId)) {
          logger.info(`Closing worker for paused or deleted queue: ${queueId}`);
          const worker = activeWorkers.get(queueId);
          if (worker) {
            await worker.close();
            activeWorkers.delete(queueId);
          }
        }
      }

      // 2. Spawn or update workers for active queues
      for (const queue of queues) {
        const existingWorker = activeWorkers.get(queue.id);

        if (!existingWorker) {
          logger.info(`Spawning worker for queue "${queue.name}" with concurrency: ${queue.concurrency}`);
          const worker = new BullWorker(
            queue.id,
            async (bullJob) => this.processJob(queue.id, bullJob.data.jobId),
            {
              connection: redisConfig,
              concurrency: queue.concurrency,
            }
          );
          activeWorkers.set(queue.id, worker);
        } else if (existingWorker.opts.concurrency !== queue.concurrency) {
          // Dynamic concurrency updates: restart worker with new limits
          logger.info(`Updating concurrency for queue "${queue.name}" to ${queue.concurrency}`);
          await existingWorker.close();
          const worker = new BullWorker(
            queue.id,
            async (bullJob) => this.processJob(queue.id, bullJob.data.jobId),
            {
              connection: redisConfig,
              concurrency: queue.concurrency,
            }
          );
          activeWorkers.set(queue.id, worker);
        }
      }
    } catch (err: any) {
      logger.error(`Error syncing queue workers: ${err.message}`);
    }
  }

  private async processJob(queueId: string, jobId: string) {
    // 1. Acquire distributed lock to ensure atomic claiming
    const lockToken = await DistributedLock.acquire(jobId);
    if (!lockToken) {
      logger.info(`Job ${jobId} is already locked by another worker. Skipping.`);
      return;
    }

    this.monitor.incrementActiveCount();
    
    // Fetch job details
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        queue: {
          include: {
            retryPolicy: true,
            project: true,
          },
        },
      },
    });

    if (!job) {
      logger.error(`Job record ${jobId} not found in database.`);
      await DistributedLock.release(jobId, lockToken);
      this.monitor.decrementActiveCount();
      return;
    }

    const currentAttempt = job.attempts + 1;
    let executionRecord: any;

    try {
      // 2. Update job state to CLAIMED -> RUNNING
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: JobStatus.RUNNING,
          attempts: currentAttempt,
          lockedBy: this.workerName,
          lockedAt: new Date(),
        },
      });

      // 3. Create JobExecution record
      executionRecord = await prisma.jobExecution.create({
        data: {
          jobId: job.id,
          workerId: this.workerName,
          status: "RUNNING",
          attempt: currentAttempt,
        },
      });

      await this.logToExecution(executionRecord.id, `Starting execution attempt ${currentAttempt}...`, "INFO");

      // 4. Run Job Core Payload simulation
      const resultPayload = await this.executePayload(job.name, JSON.parse(job.payload), executionRecord.id);

      // 5. Success Flow
      await this.logToExecution(executionRecord.id, "Job completed successfully.", "INFO");

      await prisma.jobExecution.update({
        where: { id: executionRecord.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: JobStatus.COMPLETED,
          result: JSON.stringify(resultPayload),
          lockedBy: null,
          lockedAt: null,
        },
      });

      // 6. Workflow DAG Dependents Triggering
      await this.triggerDependents(job);

    } catch (error: any) {
      // 7. Failure Handling & Backoff calculations
      const errorMsg = error.message || "Unknown execution exception";
      logger.error(`Job ${job.id} failed on attempt ${currentAttempt}: ${errorMsg}`);

      if (executionRecord) {
        await this.logToExecution(executionRecord.id, `Exception encountered: ${errorMsg}\nStack: ${error.stack}`, "ERROR");
        await prisma.jobExecution.update({
          where: { id: executionRecord.id },
          data: {
            status: "FAILED",
            completedAt: new Date(),
            errorReason: errorMsg,
          },
        });
      }

      const retryPolicy = job.queue.retryPolicy;
      const isRetryable = currentAttempt < job.maxAttempts;

      if (isRetryable && retryPolicy) {
        // Schedule next retry backoff delay
        const delay = this.calculateBackoff(retryPolicy, currentAttempt);
        await this.logToExecution(executionRecord.id, `Scheduling retry attempt ${currentAttempt + 1} in ${delay}ms...`, "WARN");

        await prisma.job.update({
          where: { id: job.id },
          data: {
            status: JobStatus.RETRYING,
            error: JSON.stringify({ message: errorMsg }),
            lockedBy: null,
            lockedAt: null,
            runAt: new Date(Date.now() + delay),
          },
        });

        // Enqueue retry back into BullMQ
        const bullQueue = getBullQueueInstance(job.queueId);
        await bullQueue.add(
          job.name,
          { jobId: job.id },
          { delay, jobId: job.id }
        );
      } else {
        // Exhausted retries or no policy configured -> Move to DLQ
        await prisma.job.update({
          where: { id: job.id },
          data: {
            status: JobStatus.DLQ,
            error: JSON.stringify({ message: errorMsg }),
            lockedBy: null,
            lockedAt: null,
          },
        });

        // Trigger AI failure analysis via Gemini API
        await this.logToExecution(executionRecord.id, "Exhausted all retry attempts. Commencing Gemini AI Failure Analysis...", "WARN");
        const suggestions = await GeminiService.analyzeFailure(job.name, job.payload, errorMsg);

        // Save DLQ record
        await prisma.deadLetterQueue.create({
          data: {
            jobId: job.id,
            reason: errorMsg,
            suggestions,
            suggestionsUpdatedAt: new Date(),
          },
        });

        // Save analysis to execution output
        await prisma.jobExecution.update({
          where: { id: executionRecord.id },
          data: { suggestion: suggestions },
        });

        // Dispatch Slack/Discord notifications alerts
        const subject = `CRITICAL: Job Failure Alert - ${job.name}`;
        const message = `Job ID: ${job.id}\nQueue: ${job.queue.name}\nAttempts: ${currentAttempt}/${job.maxAttempts}\nReason: ${errorMsg}\n\nAI Diagnostic Suggestion:\n${suggestions}`;
        await NotificationService.dispatchProjectAlert(job.queue.projectId, subject, message);

        await this.logToExecution(executionRecord.id, "Job moved to DLQ. Alerts successfully dispatched.", "ERROR");
      }
    } finally {
      // 8. Clean up execution state
      await DistributedLock.release(job.id, lockToken);
      this.monitor.decrementActiveCount();
    }
  }

  private async executePayload(jobName: string, payload: any, executionId: string): Promise<any> {
    await this.logToExecution(executionId, `Processing payload details: ${JSON.stringify(payload)}`, "INFO");

    // Intentionally trigger failure paths for testing hooks
    if (jobName.toLowerCase().includes("fail") || payload.shouldFail === true) {
      throw new Error("Triggered simulated execution error exception");
    }

    // Delay mock executions
    if (payload.delayMs) {
      await this.logToExecution(executionId, `Simulating latency delay of ${payload.delayMs}ms...`, "INFO");
      await new Promise((resolve) => setTimeout(resolve, payload.delayMs));
    }

    return { processed: true, timestamp: new Date().toISOString() };
  }

  private async triggerDependents(completedJob: any) {
    // Find job siblings that list this job as parentJobId
    const dependents = await prisma.job.findMany({
      where: {
        parentJobId: completedJob.id,
        status: JobStatus.QUEUED,
      },
    });

    for (const dep of dependents) {
      // Find if there are other parents that are NOT completed
      // If none, we trigger enqueuing this job!
      const parentCount = await prisma.job.count({
        where: {
          id: dep.parentJobId || "",
          status: { not: JobStatus.COMPLETED },
        },
      });

      if (parentCount === 0) {
        logger.info(`Dependency satisfied. Enqueuing workflow child task: ${dep.name}`);
        const queue = getBullQueueInstance(dep.queueId);
        await queue.add(dep.name, { jobId: dep.id }, { jobId: dep.id });
      }
    }
  }

  private calculateBackoff(
    policy: { strategy: string; delay: number; maxAttempts: number },
    attempt: number
  ): number {
    if (policy.strategy === RetryStrategy.LINEAR) {
      return policy.delay * attempt;
    }
    if (policy.strategy === RetryStrategy.EXPONENTIAL) {
      return policy.delay * Math.pow(2, attempt - 1);
    }
    return policy.delay; // FIXED backoff
  }

  private async logToExecution(executionId: string, message: string, logLevel: string) {
    logger.debug(`[Execution Log] [${logLevel}] ${message}`);
    await prisma.executionLog.create({
      data: {
        jobExecutionId: executionId,
        message,
        logLevel,
      },
    });
  }
}
