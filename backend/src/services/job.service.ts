import { JobRepository } from "../repositories/job.repository.js";
import { QueueRepository } from "../repositories/queue.repository.js";
import { getBullQueueInstance } from "./queue.service.js";
import { NotFoundError, BadRequestError } from "../errors/custom-errors.js";
import { JobType, JobStatus } from "shared";

export class JobService {
  private jobRepo = new JobRepository();
  private queueRepo = new QueueRepository();

  async getJobs(filters: {
    projectId?: string;
    queueId?: string;
    status?: string;
    type?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    return this.jobRepo.findMany(filters);
  }

  async getJobById(jobId: string) {
    const job = await this.jobRepo.findById(jobId);
    if (!job) {
      throw new NotFoundError("Job not found");
    }
    return job;
  }

  async createJob(data: {
    name: string;
    queueId: string;
    type: JobType;
    payload: any;
    cronExpression?: string;
    runAt?: string;
    maxAttempts?: number;
    timeout?: number;
    parentJobId?: string;
    workflowId?: string;
  }) {
    const queue = await this.queueRepo.findById(data.queueId);
    if (!queue) {
      throw new NotFoundError("Target queue not found");
    }

    if (queue.status === "PAUSED") {
      throw new BadRequestError("Cannot submit jobs to a paused queue");
    }

    // Determine initial status & execution timing
    let status = JobStatus.QUEUED;
    let runAtDate: Date | undefined;

    if (data.type === JobType.DELAYED || data.type === JobType.SCHEDULED) {
      if (!data.runAt) {
        throw new BadRequestError("runAt timestamp is required for delayed/scheduled jobs");
      }
      runAtDate = new Date(data.runAt);
      if (runAtDate.getTime() > Date.now()) {
        status = JobStatus.SCHEDULED;
      }
    } else if (data.type === JobType.CRON || data.type === JobType.RECURRING) {
      if (!data.cronExpression) {
        throw new BadRequestError("cronExpression is required for cron/recurring jobs");
      }
      status = JobStatus.SCHEDULED;
    }

    const maxAttempts = data.maxAttempts ?? queue.maxAttempts;
    const timeout = data.timeout ?? queue.timeout;

    // Create job record in PostgreSQL database
    const job = await this.jobRepo.create({
      name: data.name,
      queueId: data.queueId,
      type: data.type,
      status,
      payload: JSON.stringify(data.payload || {}),
      maxAttempts,
      timeout,
      cronExpression: data.cronExpression,
      runAt: runAtDate,
      parentJobId: data.parentJobId,
      workflowId: data.workflowId,
    });

    // If job has a parent (workflow dependency) and the parent is NOT completed, do not enqueue yet!
    // It will be enqueued dynamically by the worker when the parent finishes.
    if (data.parentJobId) {
      const parent = await this.jobRepo.findById(data.parentJobId);
      if (parent && parent.status !== JobStatus.COMPLETED) {
        // Leave in QUEUED state in DB, do not send to BullMQ
        return job;
      }
    }

    // Submit job execution request to BullMQ Redis Queue
    await this.enqueueInBull(job);

    return job;
  }

  async retryJob(jobId: string) {
    const job = await this.getJobById(jobId);
    if (job.status !== JobStatus.FAILED && job.status !== JobStatus.DLQ) {
      throw new BadRequestError("Only failed or DLQ jobs can be retried");
    }

    // Update job record in PostgreSQL
    const updated = await this.jobRepo.update(jobId, {
      status: JobStatus.QUEUED,
      attempts: 0,
      error: null,
      result: null,
    });

    // Remove from DLQ if exists
    await this.jobRepo.removeFromDlq(jobId);

    // Enqueue to BullMQ
    await this.enqueueInBull(updated);

    return updated;
  }

  async cancelJob(jobId: string) {
    const job = await this.getJobById(jobId);

    if (job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED) {
      throw new BadRequestError("Cannot cancel an already finished job");
    }

    const bullQueue = getBullQueueInstance(job.queueId);

    // Attempt removal from BullMQ
    if (job.type === JobType.CRON || job.type === JobType.RECURRING) {
      const repeatable = await bullQueue.getRepeatableJobs();
      const match = repeatable.find((r) => r.id === job.id);
      if (match) {
        await bullQueue.removeRepeatableByKey(match.key);
      }
    } else {
      await bullQueue.remove(job.id).catch(() => {});
    }

    const updated = await this.jobRepo.update(jobId, {
      status: JobStatus.FAILED,
      error: JSON.stringify({ message: "Job cancelled by user" }),
    });

    return updated;
  }

  async cloneJob(jobId: string) {
    const job = await this.getJobById(jobId);
    return this.createJob({
      name: `${job.name} (Clone)`,
      queueId: job.queueId,
      type: job.type as JobType,
      payload: JSON.parse(job.payload),
      cronExpression: job.cronExpression || undefined,
      maxAttempts: job.maxAttempts,
      timeout: job.timeout,
    });
  }

  async deleteJob(jobId: string) {
    const job = await this.getJobById(jobId);

    // Cancel in BullMQ first
    try {
      await this.cancelJob(jobId);
    } catch (e) {}

    await this.jobRepo.delete(jobId);
    return { success: true };
  }

  async getExecutionHistory(jobId: string) {
    await this.getJobById(jobId); // validation
    return this.jobRepo.getExecutionsForJob(jobId);
  }

  async getExecutionLogs(executionId: string) {
    return this.jobRepo.getExecutionLogs(executionId);
  }

  async getDlqJobs(projectId: string, limit = 20, offset = 0) {
    return this.jobRepo.getDlqList(projectId, limit, offset);
  }

  // ==========================================
  // Helper methods
  // ==========================================

  private async enqueueInBull(job: any) {
    const bullQueue = getBullQueueInstance(job.queueId);
    const options: any = { jobId: job.id };

    if (job.type === JobType.CRON || job.type === JobType.RECURRING) {
      if (job.cronExpression) {
        options.repeat = { pattern: job.cronExpression };
      }
    } else if (job.type === JobType.DELAYED || job.type === JobType.SCHEDULED) {
      if (job.runAt) {
        const delay = new Date(job.runAt).getTime() - Date.now();
        if (delay > 0) {
          options.delay = delay;
        }
      }
    }

    // Add task payload containing database jobId reference
    await bullQueue.add(job.name, { jobId: job.id }, options);
  }
}
