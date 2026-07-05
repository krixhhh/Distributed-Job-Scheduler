import { Queue as BullQueue } from "bullmq";
import { QueueRepository } from "../repositories/queue.repository.js";
import { redisConfig } from "../config/redis.js";
import { NotFoundError } from "../errors/custom-errors.js";

// Cache map of active BullMQ queue instances in the backend service
const activeBullQueues = new Map<string, BullQueue>();

export const getBullQueueInstance = (queueName: string): BullQueue => {
  let q = activeBullQueues.get(queueName);
  if (!q) {
    q = new BullQueue(queueName, {
      connection: redisConfig,
      defaultJobOptions: {
        removeOnComplete: true, // Clean completed jobs from Redis memory
        removeOnFail: false,    // Keep failed jobs for DLQ/AI Analysis
      },
    });
    activeBullQueues.set(queueName, q);
  }
  return q;
};

export class QueueService {
  private queueRepo = new QueueRepository();

  async getQueues(projectId: string) {
    return this.queueRepo.findByProjectId(projectId);
  }

  async getQueueById(queueId: string) {
    const queue = await this.queueRepo.findById(queueId);
    if (!queue) {
      throw new NotFoundError("Queue not found");
    }
    return queue;
  }

  async createQueue(projectId: string, data: {
    name: string;
    description?: string;
    priority: number;
    concurrency: number;
    rateLimit?: number | null;
    maxAttempts: number;
    timeout: number;
    retryPolicy?: {
      strategy: string;
      delay: number;
      maxAttempts: number;
    };
  }) {
    const queue = await this.queueRepo.create({
      ...data,
      projectId,
    });

    // Warm up the BullMQ queue instance in Redis
    getBullQueueInstance(queue.id);

    return queue;
  }

  async updateQueue(queueId: string, data: {
    description?: string;
    priority?: number;
    concurrency?: number;
    rateLimit?: number | null;
    maxAttempts?: number;
    timeout?: number;
    retryPolicy?: {
      strategy: string;
      delay: number;
      maxAttempts: number;
    };
  }) {
    const updated = await this.queueRepo.update(queueId, data);
    return updated;
  }

  async pauseQueue(queueId: string) {
    const queue = await this.getQueueById(queueId);
    await this.queueRepo.update(queueId, { status: "PAUSED" });

    const bullQueue = getBullQueueInstance(queue.id);
    await bullQueue.pause();

    return { ...queue, status: "PAUSED" };
  }

  async resumeQueue(queueId: string) {
    const queue = await this.getQueueById(queueId);
    await this.queueRepo.update(queueId, { status: "ACTIVE" });

    const bullQueue = getBullQueueInstance(queue.id);
    await bullQueue.resume();

    return { ...queue, status: "ACTIVE" };
  }

  async deleteQueue(queueId: string) {
    const queue = await this.getQueueById(queueId);
    await this.queueRepo.delete(queueId);

    const bullQueue = activeBullQueues.get(queue.id) || getBullQueueInstance(queue.id);
    await bullQueue.obliterate({ force: true });
    activeBullQueues.delete(queue.id);

    return { success: true };
  }
}
