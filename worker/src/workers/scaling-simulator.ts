import { prisma } from "../config/prisma.js";
import { logger } from "../logger/index.js";

export class AutoWorkerScalingSimulator {
  private interval?: NodeJS.Timeout;
  private currentWorkers = 3; // base baseline workers
  private minWorkers = 1;
  private maxWorkers = 10;

  start(intervalMs = 20000) {
    logger.info("Auto Worker Scaling Simulator started");
    this.interval = setInterval(() => this.evaluateLoad(), intervalMs);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
  }

  private async evaluateLoad() {
    try {
      const queuedJobsCount = await prisma.job.count({
        where: { status: "QUEUED" },
      });

      const originalCount = this.currentWorkers;

      if (queuedJobsCount > 10 && this.currentWorkers < this.maxWorkers) {
        // Enqueue queue congestion, spin up workers
        const scaleAmount = Math.min(2, this.maxWorkers - this.currentWorkers);
        this.currentWorkers += scaleAmount;
        logger.warn(
          `[Scaling Monitor] Queued items backlog count: ${queuedJobsCount}. Spinning up ${scaleAmount} virtual worker nodes. Active pool size: ${this.currentWorkers}`
        );
      } else if (queuedJobsCount === 0 && this.currentWorkers > this.minWorkers) {
        // Underutilization, spin down workers
        this.currentWorkers--;
        logger.info(
          `[Scaling Monitor] Workload is idle. Deprovisioning 1 virtual worker. Active pool size: ${this.currentWorkers}`
        );
      } else {
        logger.debug(
          `[Scaling Monitor] Queue depth stable. Queued jobs: ${queuedJobsCount}. Active pool size: ${this.currentWorkers}`
        );
      }
    } catch (err: any) {
      logger.error(`Error calculating scaling dimensions: ${err.message}`);
    }
  }

  getCurrentWorkersCount(): number {
    return this.currentWorkers;
  }
}
