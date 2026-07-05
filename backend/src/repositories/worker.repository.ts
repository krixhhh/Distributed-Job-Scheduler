import { prisma } from "../config/prisma.js";

export class WorkerRepository {
  async upsertWorker(data: {
    name: string;
    concurrency: number;
    hostname?: string;
    ipAddress?: string;
  }) {
    // Check if worker already exists by name
    const existing = await prisma.worker.findFirst({
      where: { name: data.name },
    });

    if (existing) {
      return prisma.worker.update({
        where: { id: existing.id },
        data: {
          status: "ACTIVE",
          concurrency: data.concurrency,
          lastHeartbeat: new Date(),
          hostname: data.hostname,
          ipAddress: data.ipAddress,
        },
      });
    }

    return prisma.worker.create({
      data: {
        name: data.name,
        concurrency: data.concurrency,
        status: "ACTIVE",
        hostname: data.hostname,
        ipAddress: data.ipAddress,
      },
    });
  }

  async recordHeartbeat(data: {
    workerId: string;
    cpuUsage: number;
    memoryUsage: number;
    activeJobsCount: number;
  }) {
    await prisma.worker.update({
      where: { id: data.workerId },
      data: {
        lastHeartbeat: new Date(),
      },
    });

    return prisma.workerHeartbeat.create({
      data: {
        workerId: data.workerId,
        cpuUsage: data.cpuUsage,
        memoryUsage: data.memoryUsage,
        activeJobsCount: data.activeJobsCount,
      },
    });
  }

  async findActiveWorkers(thresholdMinutes = 5) {
    const cutoff = new Date(Date.now() - thresholdMinutes * 60 * 1000);
    return prisma.worker.findMany({
      where: {
        lastHeartbeat: {
          gt: cutoff,
        },
        status: "ACTIVE",
      },
      include: {
        _count: {
          select: {
            executions: {
              where: { status: "RUNNING" },
            },
          },
        },
      },
    });
  }

  async updateWorkerStatus(id: string, status: string) {
    return prisma.worker.update({
      where: { id },
      data: { status },
    });
  }

  async listWorkers() {
    return prisma.worker.findMany({
      include: {
        _count: {
          select: {
            executions: true,
          },
        },
      },
      orderBy: { lastHeartbeat: "desc" },
    });
  }

  async getHeartbeatHistory(workerId: string, limit = 50) {
    return prisma.workerHeartbeat.findMany({
      where: { workerId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async getMetricsSummary() {
    const activeCount = await prisma.worker.count({
      where: { status: "ACTIVE" },
    });

    const averageSystemMetrics = await prisma.workerHeartbeat.aggregate({
      where: {
        createdAt: {
          gt: new Date(Date.now() - 5 * 60 * 1000), // last 5 minutes
        },
      },
      _avg: {
        cpuUsage: true,
        memoryUsage: true,
        activeJobsCount: true,
      },
    });

    return {
      activeWorkersCount: activeCount,
      avgCpuUsage: averageSystemMetrics._avg.cpuUsage || 0,
      avgMemoryUsage: averageSystemMetrics._avg.memoryUsage || 0,
      avgActiveJobsCount: averageSystemMetrics._avg.activeJobsCount || 0,
    };
  }
}
