import { Response, NextFunction } from "express";
import { ProjectService } from "../services/project.service.js";
import { AuthRequest } from "../types/express.js";

export class ProjectController {
  private projectService = new ProjectService();

  listProjects = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const projects = await this.projectService.getProjectsForUser(userId);
      res.status(200).json({
        success: true,
        data: projects,
      });
    } catch (error) {
      next(error);
    }
  };

  getProject = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { projectId } = req.params;
      const project = await this.projectService.getProjectById(projectId, userId);
      res.status(200).json({
        success: true,
        data: project,
      });
    } catch (error) {
      next(error);
    }
  };

  createProject = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const project = await this.projectService.createProject(userId, req.body);
      res.status(201).json({
        success: true,
        data: project,
      });
    } catch (error) {
      next(error);
    }
  };

  updateProject = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;
      const project = await this.projectService.updateProject(projectId, req.body);
      res.status(200).json({
        success: true,
        data: project,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteProject = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;
      await this.projectService.deleteProject(projectId);
      res.status(200).json({
        success: true,
        message: "Project deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  };

  // Members Management
  addMember = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;
      const member = await this.projectService.addProjectMember(projectId, req.body);
      res.status(201).json({
        success: true,
        data: member,
      });
    } catch (error) {
      next(error);
    }
  };

  removeMember = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { projectId, userId } = req.params;
      await this.projectService.removeProjectMember(projectId, userId);
      res.status(200).json({
        success: true,
        message: "Member removed from project",
      });
    } catch (error) {
      next(error);
    }
  };

  listMembers = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;
      const members = await this.projectService.listProjectMembers(projectId);
      res.status(200).json({
        success: true,
        data: members,
      });
    } catch (error) {
      next(error);
    }
  };

  // API Key Management
  createApiKey = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;
      const apiKey = await this.projectService.generateApiKey(projectId, req.body);
      res.status(201).json({
        success: true,
        data: apiKey,
      });
    } catch (error) {
      next(error);
    }
  };

  listApiKeys = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;
      const keys = await this.projectService.listApiKeys(projectId);
      res.status(200).json({
        success: true,
        data: keys,
      });
    } catch (error) {
      next(error);
    }
  };

  revokeApiKey = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { keyId } = req.params;
      await this.projectService.revokeApiKey(keyId);
      res.status(200).json({
        success: true,
        message: "API Key revoked successfully",
      });
    } catch (error) {
      next(error);
    }
  };
}
