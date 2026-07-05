"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueService = exports.getBullQueueInstance = void 0;
const bullmq_1 = require("bullmq");
const queue_repository_js_1 = require("../repositories/queue.repository.js");
const redis_js_1 = require("../config/redis.js");
const custom_errors_js_1 = require("../errors/custom-errors.js");
// Cache map of active BullMQ queue instances in the backend service
const activeBullQueues = new Map();
const getBullQueueInstance = (queueName) => {
    let q = activeBullQueues.get(queueName);
    if (!q) {
        q = new bullmq_1.Queue(queueName, {
            connection: redis_js_1.redisConfig,
            defaultJobOptions: {
                removeOnComplete: true, // Clean completed jobs from Redis memory
                removeOnFail: false, // Keep failed jobs for DLQ/AI Analysis
            },
        });
        activeBullQueues.set(queueName, q);
    }
    return q;
};
exports.getBullQueueInstance = getBullQueueInstance;
class QueueService {
    queueRepo = new queue_repository_js_1.QueueRepository();
    async getQueues(projectId) {
        return this.queueRepo.findByProjectId(projectId);
    }
    async getQueueById(queueId) {
        const queue = await this.queueRepo.findById(queueId);
        if (!queue) {
            throw new custom_errors_js_1.NotFoundError("Queue not found");
        }
        return queue;
    }
    async createQueue(projectId, data) {
        const queue = await this.queueRepo.create({
            ...data,
            projectId,
        });
        // Warm up the BullMQ queue instance in Redis
        (0, exports.getBullQueueInstance)(queue.id);
        return queue;
    }
    async updateQueue(queueId, data) {
        const updated = await this.queueRepo.update(queueId, data);
        return updated;
    }
    async pauseQueue(queueId) {
        const queue = await this.getQueueById(queueId);
        await this.queueRepo.update(queueId, { status: "PAUSED" });
        const bullQueue = (0, exports.getBullQueueInstance)(queue.id);
        await bullQueue.pause();
        return { ...queue, status: "PAUSED" };
    }
    async resumeQueue(queueId) {
        const queue = await this.getQueueById(queueId);
        await this.queueRepo.update(queueId, { status: "ACTIVE" });
        const bullQueue = (0, exports.getBullQueueInstance)(queue.id);
        await bullQueue.resume();
        return { ...queue, status: "ACTIVE" };
    }
    async deleteQueue(queueId) {
        const queue = await this.getQueueById(queueId);
        await this.queueRepo.delete(queueId);
        const bullQueue = activeBullQueues.get(queue.id) || (0, exports.getBullQueueInstance)(queue.id);
        await bullQueue.obliterate({ force: true });
        activeBullQueues.delete(queue.id);
        return { success: true };
    }
}
exports.QueueService = QueueService;
