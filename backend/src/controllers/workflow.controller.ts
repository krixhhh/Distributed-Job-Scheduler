import { Response, NextFunction } from "express";
import { WorkflowService } from "../services/workflow.service.js";
import { AuthRequest } from "../types/express.js";

export class WorkflowController {
  private workflowService = new WorkflowService();

  listWorkflows = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;
      const workflows = await this.workflowService.getWorkflows(projectId);
      res.status(200).json({
        success: true,
        data: workflows,
      });
    } catch (error) {
      next(error);
    }
  };

  getWorkflow = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { workflowId } = req.params;
      const workflow = await this.workflowService.getWorkflowById(workflowId);
      res.status(200).json({
        success: true,
        data: workflow,
      });
    } catch (error) {
      next(error);
    }
  };

  createWorkflow = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;
      const workflow = await this.workflowService.createWorkflow(projectId, req.body);
      res.status(201).json({
        success: true,
        data: workflow,
      });
    } catch (error) {
      next(error);
    }
  };

  triggerWorkflow = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { workflowId } = req.params;
      const result = await this.workflowService.triggerWorkflow(workflowId);
      res.status(200).json({
        success: true,
        message: "Workflow triggered, root nodes enqueued",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteWorkflow = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { workflowId } = req.params;
      await this.workflowService.deleteWorkflow(workflowId);
      res.status(200).json({
        success: true,
        message: "Workflow deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  };
}
