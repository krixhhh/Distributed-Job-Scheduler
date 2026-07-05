import crypto from "crypto";
import { ProjectRepository } from "../repositories/project.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { NotFoundError, BadRequestError } from "../errors/custom-errors.js";

export class ProjectService {
  private projectRepo = new ProjectRepository();
  private userRepo = new UserRepository();

  async getProjectsForUser(userId: string) {
    return this.projectRepo.getProjectsForUser(userId);
  }

  async getProjectById(projectId: string, userId: string) {
    const project = await this.projectRepo.findById(projectId);
    if (!project) {
      throw new NotFoundError("Project not found");
    }

    // Verify user is a member
    const isMember = project.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new BadRequestError("Access denied to this project");
    }

    return project;
  }

  async createProject(userId: string, data: { name: string; description?: string }) {
    // Fetch user's organization to attach the project
    const memberships = await this.userRepo.getOrganizationsForUser(userId);
    if (memberships.length === 0) {
      throw new BadRequestError("User does not belong to any organization");
    }

    // Default to the first organization (simplifies flow for single-org users)
    const orgId = memberships[0].organizationId;

    const project = await this.projectRepo.create({
      name: data.name,
      description: data.description,
      organizationId: orgId,
    });

    // Add user as ADMIN member of the project
    await this.projectRepo.addMember(project.id, userId, "ADMIN");

    return project;
  }

  async updateProject(projectId: string, data: Partial<{ name: string; description: string | null }>) {
    return this.projectRepo.update(projectId, data);
  }

  async deleteProject(projectId: string) {
    return this.projectRepo.delete(projectId);
  }

  // Members Management
  async addProjectMember(projectId: string, data: { email: string; role: string }) {
    const user = await this.userRepo.findByEmail(data.email);
    if (!user) {
      throw new NotFoundError("User with this email not found");
    }

    const members = await this.projectRepo.listMembers(projectId);
    const alreadyMember = members.some((m) => m.userId === user.id);
    if (alreadyMember) {
      throw new BadRequestError("User is already a member of this project");
    }

    return this.projectRepo.addMember(projectId, user.id, data.role);
  }

  async removeProjectMember(projectId: string, userId: string) {
    return this.projectRepo.removeMember(projectId, userId);
  }

  async listProjectMembers(projectId: string) {
    return this.projectRepo.listMembers(projectId);
  }

  // API Key Management
  async generateApiKey(projectId: string, data: { name: string; scope: string; expiresDays?: number }) {
    const token = `djs_${crypto.randomBytes(24).toString("hex")}`;
    const expiresAt = data.expiresDays ? new Date(Date.now() + data.expiresDays * 24 * 60 * 60 * 1000) : undefined;

    const apiKey = await this.projectRepo.createApiKey({
      name: data.name,
      key: token,
      projectId,
      scope: data.scope,
      expiresAt,
    });

    return {
      id: apiKey.id,
      name: apiKey.name,
      scope: apiKey.scope,
      expiresAt: apiKey.expiresAt,
      key: token, // Return raw key ONLY during creation
      createdAt: apiKey.createdAt,
    };
  }

  async revokeApiKey(apiKeyId: string) {
    return this.projectRepo.deleteApiKey(apiKeyId);
  }

  async listApiKeys(projectId: string) {
    const keys = await this.projectRepo.listApiKeys(projectId);
    return keys.map((k) => ({
      ...k,
      key: `djs_...${k.key.slice(-4)}`, // redact full token from normal lists
    }));
  }
}
