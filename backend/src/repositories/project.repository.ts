import { prisma } from "../config/prisma.js";

export class ProjectRepository {
  async findById(id: string) {
    return prisma.project.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  async findByOrgId(organizationId: string) {
    return prisma.project.findMany({
      where: { organizationId },
    });
  }

  async getProjectsForUser(userId: string) {
    return prisma.project.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        organization: true,
      },
    });
  }

  async create(data: { name: string; description?: string; organizationId: string }) {
    return prisma.project.create({
      data,
    });
  }

  async update(id: string, data: Partial<{ name: string; description: string | null }>) {
    return prisma.project.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.project.delete({
      where: { id },
    });
  }

  async addMember(projectId: string, userId: string, role: string) {
    return prisma.projectMember.create({
      data: {
        projectId,
        userId,
        role,
      },
    });
  }

  async removeMember(projectId: string, userId: string) {
    return prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });
  }

  async listMembers(projectId: string) {
    return prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  // API Key operations
  async createApiKey(data: { name: string; key: string; projectId: string; scope: string; expiresAt?: Date }) {
    return prisma.apiKey.create({
      data,
    });
  }

  async deleteApiKey(id: string) {
    return prisma.apiKey.delete({
      where: { id },
    });
  }

  async listApiKeys(projectId: string) {
    return prisma.apiKey.findMany({
      where: { projectId },
      select: {
        id: true,
        name: true,
        scope: true,
        expiresAt: true,
        createdAt: true,
        // Don't leak full key, just last 4 characters
        key: true,
      },
    });
  }
}
