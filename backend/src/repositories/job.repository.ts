import { prisma } from "../config/prisma.js";

export class JobRepository {
  async findById(id: string) {
    return prisma.job.findUnique({
      where: { id },
      include: {
        queue: true,
        executions: {
          orderBy: { startedAt: "desc" },
        },
        dlqRecord: true,
      },
    });
  }

  async findMany(filters: {
    projectId?: string;
    queueId?: string;
    status?: string;
    type?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const limit = filters.limit ?? 20;
    const offset = filters.offset ?? 0;

    const whereClause: any = {};

    if (filters.queueId) {
      whereClause.queueId = filters.queueId;
    } else if (filters.projectId) {
      whereClause.queue = {
        projectId: filters.projectId,
      };
    }

    if (filters.status) {
      whereClause.status = filters.status;
    }

    if (filters.type) {
      whereClause.type = filters.type;
    }

    if (filters.search) {
      whereClause.name = {
        contains: filters.search,
      };
    }

    const [total, data] = await Promise.all([
      prisma.job.count({ where: whereClause }),
      prisma.job.findMany({
        where: whereClause,
        include: {
          queue: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
    ]);

    return { total, data };
  }

  async create(data: {
    name: string;
    queueId: string;
    type: string;
    status: string;
    payload: string;
    maxAttempts: number;
    timeout: number;
    cronExpression?: string;
    runAt?: Date;
    parentJobId?: string;
    workflowId?: string;
  }) {
    return prisma.job.create({
      data,
    });
  }

  async update(id: string, data: Partial<{
    status: string;
    payload: string;
    result: string | null;
    error: string | null;
    attempts: number;
    maxAttempts: number;
    timeout: number;
    lockedBy: string | null;
    lockedAt: Date | null;
    runAt: Date | null;
  }>) {
    return prisma.job.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.job.delete({
      where: { id },
    });
  }

  // Executions logs & histories
  async createExecution(data: {
    jobId: string;
    workerId: string;
    status: string;
    attempt: number;
  }) {
    return prisma.jobExecution.create({
      data,
    });
  }

  async updateExecution(id: string, data: Partial<{
    status: string;
    completedAt: Date;
    errorReason: string | null;
    suggestion: string | null;
  }>) {
    return prisma.jobExecution.update({
      where: { id },
      data,
    });
  }

  async createExecutionLog(data: {
    jobExecutionId: string;
    message: string;
    logLevel: string;
  }) {
    return prisma.executionLog.create({
      data,
    });
  }

  async getExecutionsForJob(jobId: string) {
    return prisma.jobExecution.findMany({
      where: { jobId },
      orderBy: { startedAt: "desc" },
      include: {
        worker: true,
      },
    });
  }

  async getExecutionLogs(executionId: string) {
    return prisma.executionLog.findMany({
      where: { jobExecutionId: executionId },
      orderBy: { createdAt: "asc" },
    });
  }

  // DLQ (Dead Letter Queue) Management
  async addToDlq(data: { jobId: string; reason: string; suggestions?: string }) {
    return prisma.deadLetterQueue.create({
      data: {
        jobId: data.jobId,
        reason: data.reason,
        suggestions: data.suggestions,
        suggestionsUpdatedAt: data.suggestions ? new Date() : null,
      },
    });
  }

  async updateDlqSuggestions(jobId: string, suggestions: string) {
    return prisma.deadLetterQueue.update({
      where: { jobId },
      data: {
        suggestions,
        suggestionsUpdatedAt: new Date(),
      },
    });
  }

  async getDlqList(projectId: string, limit = 20, offset = 0) {
    const [total, data] = await Promise.all([
      prisma.deadLetterQueue.count({
        where: {
          job: {
            queue: { projectId },
          },
        },
      }),
      prisma.deadLetterQueue.findMany({
        where: {
          job: {
            queue: { projectId },
          },
        },
        include: {
          job: {
            include: {
              queue: true,
            },
          },
        },
        orderBy: { failedAt: "desc" },
        take: limit,
        skip: offset,
      }),
    ]);

    return { total, data };
  }

  async removeFromDlq(jobId: string) {
    return prisma.deadLetterQueue.delete({
      where: { jobId },
    }).catch(() => {});
  }
}
