"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueRepository = void 0;
const prisma_js_1 = require("../config/prisma.js");
class QueueRepository {
    async findById(id) {
        return prisma_js_1.prisma.queue.findUnique({
            where: { id },
            include: {
                retryPolicy: true,
            },
        });
    }
    async findByName(projectId, name) {
        return prisma_js_1.prisma.queue.findUnique({
            where: {
                projectId_name: {
                    projectId,
                    name,
                },
            },
            include: {
                retryPolicy: true,
            },
        });
    }
    async findByProjectId(projectId) {
        return prisma_js_1.prisma.queue.findMany({
            where: { projectId },
            include: {
                retryPolicy: true,
                _count: {
                    select: {
                        jobs: true,
                    },
                },
            },
        });
    }
    async create(data) {
        let retryPolicyId;
        if (data.retryPolicy) {
            const policy = await prisma_js_1.prisma.retryPolicy.create({
                data: {
                    strategy: data.retryPolicy.strategy,
                    delay: data.retryPolicy.delay,
                    maxAttempts: data.retryPolicy.maxAttempts,
                },
            });
            retryPolicyId = policy.id;
        }
        return prisma_js_1.prisma.queue.create({
            data: {
                name: data.name,
                description: data.description,
                projectId: data.projectId,
                priority: data.priority,
                concurrency: data.concurrency,
                rateLimit: data.rateLimit,
                maxAttempts: data.maxAttempts,
                timeout: data.timeout,
                retryPolicyId,
            },
            include: {
                retryPolicy: true,
            },
        });
    }
    async update(id, data) {
        const queue = await prisma_js_1.prisma.queue.findUnique({
            where: { id },
        });
        if (!queue) {
            throw new Error("Queue not found");
        }
        let retryPolicyId = queue.retryPolicyId;
        if (data.retryPolicy) {
            if (retryPolicyId) {
                await prisma_js_1.prisma.retryPolicy.update({
                    where: { id: retryPolicyId },
                    data: data.retryPolicy,
                });
            }
            else {
                const policy = await prisma_js_1.prisma.retryPolicy.create({
                    data: data.retryPolicy,
                });
                retryPolicyId = policy.id;
            }
        }
        return prisma_js_1.prisma.queue.update({
            where: { id },
            data: {
                description: data.description,
                priority: data.priority,
                concurrency: data.concurrency,
                rateLimit: data.rateLimit,
                maxAttempts: data.maxAttempts,
                timeout: data.timeout,
                status: data.status,
                retryPolicyId,
            },
            include: {
                retryPolicy: true,
            },
        });
    }
    async delete(id) {
        const queue = await prisma_js_1.prisma.queue.findUnique({
            where: { id },
        });
        if (!queue) {
            throw new Error("Queue not found");
        }
        await prisma_js_1.prisma.queue.delete({
            where: { id },
        });
        if (queue.retryPolicyId) {
            await prisma_js_1.prisma.retryPolicy.delete({
                where: { id: queue.retryPolicyId },
            }).catch(() => { }); // ignore errors if already deleted
        }
        return queue;
    }
}
exports.QueueRepository = QueueRepository;
