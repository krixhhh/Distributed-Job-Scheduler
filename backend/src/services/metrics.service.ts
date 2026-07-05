import { prisma } from "../config/prisma.js";

export class MetricsService {
  async getDashboardOverview(projectId: string) {
    // Group job records count by current status inside the project
    const statusCounts = await prisma.job.groupBy({
      by: ["status"],
      where: {
        queue: { projectId },
      },
      _count: {
        id: true,
      },
    });

    const statusMap = {
      QUEUED: 0,
      SCHEDULED: 0,
      CLAIMED: 0,
      RUNNING: 0,
      COMPLETED: 0,
      FAILED: 0,
      RETRYING: 0,
      DLQ: 0,
    };

    for (const item of statusCounts) {
      if (item.status in statusMap) {
        statusMap[item.status as keyof typeof statusMap] = item._count.id;
      }
    }

    const activeWorkers = await prisma.worker.count({
      where: { status: "ACTIVE" },
    });

    const totalQueues = await prisma.queue.count({
      where: { projectId },
    });

    const dlqCount = await prisma.deadLetterQueue.count({
      where: {
        job: {
          queue: { projectId },
        },
      },
    });

    return {
      statusMap,
      activeWorkersCount: activeWorkers,
      totalQueuesCount: totalQueues,
      dlqCount,
    };
  }

  async getExecutionMetrics(projectId: string) {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const executions = await prisma.jobExecution.findMany({
      where: {
        startedAt: { gt: yesterday },
        job: {
          queue: { projectId },
        },
      },
      select: {
        status: true,
        startedAt: true,
        completedAt: true,
      },
    });

    // Create 24 hourly time-series buckets (from 23 hours ago up to current hour)
    const hourlyBuckets = Array.from({ length: 24 }, (_, i) => {
      const d = new Date(Date.now() - (23 - i) * 60 * 60 * 1000);
      d.setMinutes(0, 0, 0);
      return {
        timestamp: d.toISOString(),
        label: `${String(d.getHours()).padStart(2, "0")}:00`,
        completed: 0,
        failed: 0,
      };
    });

    let totalDurationMs = 0;
    let durationCount = 0;

    for (const exec of executions) {
      const execTime = new Date(exec.startedAt);
      
      const bucket = hourlyBuckets.find((b) => {
        const bt = new Date(b.timestamp);
        return (
          execTime.getFullYear() === bt.getFullYear() &&
          execTime.getMonth() === bt.getMonth() &&
          execTime.getDate() === bt.getDate() &&
          execTime.getHours() === bt.getHours()
        );
      });

      if (bucket) {
        if (exec.status === "COMPLETED") {
          bucket.completed++;
        } else if (exec.status === "FAILED") {
          bucket.failed++;
        }
      }

      if (exec.completedAt && exec.status === "COMPLETED") {
        const diff = new Date(exec.completedAt).getTime() - new Date(exec.startedAt).getTime();
        totalDurationMs += diff;
        durationCount++;
      }
    }

    const averageLatencyMs = durationCount > 0 ? Math.round(totalDurationMs / durationCount) : 0;

    return {
      hourlyStats: hourlyBuckets,
      averageLatencyMs,
      totalProcessed: executions.length,
    };
  }
}
