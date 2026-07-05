import { prisma } from "../config/prisma.js";

export class UserRepository {
  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });
  }

  async findByVerificationToken(token: string) {
    return prisma.user.findFirst({
      where: { verificationToken: token },
    });
  }

  async findByResetToken(token: string) {
    return prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpires: {
          gt: new Date(),
        },
      },
    });
  }

  async create(data: { email: string; passwordHash: string; name: string; verificationToken?: string }) {
    return prisma.user.create({
      data,
    });
  }

  async update(id: string, data: Partial<{
    passwordHash: string;
    name: string;
    isVerified: boolean;
    verificationToken: string | null;
    resetToken: string | null;
    resetTokenExpires: Date | null;
    refreshToken: string | null;
  }>) {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  async createOrganization(name: string) {
    return prisma.organization.create({
      data: { name },
    });
  }

  async addOrganizationMember(organizationId: string, userId: string, role: string) {
    return prisma.organizationMember.create({
      data: {
        organizationId,
        userId,
        role,
      },
    });
  }

  async getOrganizationsForUser(userId: string) {
    return prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: true,
      },
    });
  }
}
