import { prisma } from "../config/prisma.js";

export class QueueRepository {
  async findById(id: string) {
    return prisma.queue.findUnique({
      where: { id },
      include: {
        retryPolicy: true,
      },
    });
  }

  async findByName(projectId: string, name: string) {
    return prisma.queue.findUnique({
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

  async findByProjectId(projectId: string) {
    return prisma.queue.findMany({
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

  async create(data: {
    name: string;
    description?: string;
    projectId: string;
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
    let retryPolicyId: string | undefined;

    if (data.retryPolicy) {
      const policy = await prisma.retryPolicy.create({
        data: {
          strategy: data.retryPolicy.strategy,
          delay: data.retryPolicy.delay,
          maxAttempts: data.retryPolicy.maxAttempts,
        },
      });
      retryPolicyId = policy.id;
    }

    return prisma.queue.create({
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

  async update(id: string, data: {
    description?: string;
    priority?: number;
    concurrency?: number;
    rateLimit?: number | null;
    maxAttempts?: number;
    timeout?: number;
    status?: string;
    retryPolicy?: {
      strategy: string;
      delay: number;
      maxAttempts: number;
    };
  }) {
    const queue = await prisma.queue.findUnique({
      where: { id },
    });

    if (!queue) {
      throw new Error("Queue not found");
    }

    let retryPolicyId = queue.retryPolicyId;

    if (data.retryPolicy) {
      if (retryPolicyId) {
        await prisma.retryPolicy.update({
          where: { id: retryPolicyId },
          data: data.retryPolicy,
        });
      } else {
        const policy = await prisma.retryPolicy.create({
          data: data.retryPolicy,
        });
        retryPolicyId = policy.id;
      }
    }

    return prisma.queue.update({
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

  async delete(id: string) {
    const queue = await prisma.queue.findUnique({
      where: { id },
    });

    if (!queue) {
      throw new Error("Queue not found");
    }

    await prisma.queue.delete({
      where: { id },
    });

    if (queue.retryPolicyId) {
      await prisma.retryPolicy.delete({
        where: { id: queue.retryPolicyId },
      }).catch(() => {}); // ignore errors if already deleted
    }

    return queue;
  }
}
