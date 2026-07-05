import { Response, NextFunction } from "express";
import { JobService } from "../services/job.service.js";
import { AuthRequest } from "../types/express.js";
import { JobType } from "shared";

export class JobController {
  private jobService = new JobService();

  listJobs = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;
      const { queueId, status, type, search, limit, offset } = req.query;

      const filters = {
        projectId,
        queueId: queueId ? String(queueId) : undefined,
        status: status ? String(status) : undefined,
        type: type ? String(type) : undefined,
        search: search ? String(search) : undefined,
        limit: limit ? parseInt(String(limit)) : undefined,
        offset: offset ? parseInt(String(offset)) : undefined,
      };

      const result = await this.jobService.getJobs(filters);
      res.status(200).json({
        success: true,
        data: result.data,
        total: result.total,
      });
    } catch (error) {
      next(error);
    }
  };

  getJob = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { jobId } = req.params;
      const job = await this.jobService.getJobById(jobId);
      res.status(200).json({
        success: true,
        data: job,
      });
    } catch (error) {
      next(error);
    }
  };

  createJob = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const job = await this.jobService.createJob(req.body);
      res.status(201).json({
        success: true,
        data: job,
      });
    } catch (error) {
      next(error);
    }
  };

  retryJob = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { jobId } = req.params;
      const job = await this.jobService.retryJob(jobId);
      res.status(200).json({
        success: true,
        message: "Job execution scheduled for retry",
        data: job,
      });
    } catch (error) {
      next(error);
    }
  };

  cancelJob = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { jobId } = req.params;
      const job = await this.jobService.cancelJob(jobId);
      res.status(200).json({
        success: true,
        message: "Job cancelled successfully",
        data: job,
      });
    } catch (error) {
      next(error);
    }
  };

  cloneJob = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { jobId } = req.params;
      const job = await this.jobService.cloneJob(jobId);
      res.status(201).json({
        success: true,
        message: "Job cloned successfully",
        data: job,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteJob = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { jobId } = req.params;
      await this.jobService.deleteJob(jobId);
      res.status(200).json({
        success: true,
        message: "Job deleted successfully from queue system",
      });
    } catch (error) {
      next(error);
    }
  };

  listExecutions = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { jobId } = req.params;
      const executions = await this.jobService.getExecutionHistory(jobId);
      res.status(200).json({
        success: true,
        data: executions,
      });
    } catch (error) {
      next(error);
    }
  };

  listExecutionLogs = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { executionId } = req.params;
      const logs = await this.jobService.getExecutionLogs(executionId);
      res.status(200).json({
        success: true,
        data: logs,
      });
    } catch (error) {
      next(error);
    }
  };

  listDlq = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;
      const { limit, offset } = req.query;

      const parsedLimit = limit ? parseInt(String(limit)) : undefined;
      const parsedOffset = offset ? parseInt(String(offset)) : undefined;

      const dlq = await this.jobService.getDlqJobs(projectId, parsedLimit, parsedOffset);
      res.status(200).json({
        success: true,
        data: dlq.data,
        total: dlq.total,
      });
    } catch (error) {
      next(error);
    }
  };
}
