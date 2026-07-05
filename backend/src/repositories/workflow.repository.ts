import { prisma } from "../config/prisma.js";

export class WorkflowRepository {
  async findById(id: string) {
    return prisma.workflow.findUnique({
      where: { id },
      include: {
        jobs: true,
      },
    });
  }

  async findByProjectId(projectId: string) {
    return prisma.workflow.findMany({
      where: { projectId },
      include: {
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
    projectId: string;
    structure: string; // JSON DAG
  }) {
    return prisma.workflow.create({
      data,
    });
  }

  async update(id: string, data: Partial<{ name: string; structure: string; status: string }>) {
    return prisma.workflow.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.workflow.delete({
      where: { id },
    });
  }
}
