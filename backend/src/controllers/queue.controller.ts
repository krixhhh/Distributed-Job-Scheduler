import { Response, NextFunction } from "express";
import { QueueService } from "../services/queue.service.js";
import { AuthRequest } from "../types/express.js";

export class QueueController {
  private queueService = new QueueService();

  listQueues = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;
      const queues = await this.queueService.getQueues(projectId);
      res.status(200).json({
        success: true,
        data: queues,
      });
    } catch (error) {
      next(error);
    }
  };

  getQueue = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { queueId } = req.params;
      const queue = await this.queueService.getQueueById(queueId);
      res.status(200).json({
        success: true,
        data: queue,
      });
    } catch (error) {
      next(error);
    }
  };

  createQueue = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;
      const queue = await this.queueService.createQueue(projectId, req.body);
      res.status(201).json({
        success: true,
        data: queue,
      });
    } catch (error) {
      next(error);
    }
  };

  updateQueue = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { queueId } = req.params;
      const queue = await this.queueService.updateQueue(queueId, req.body);
      res.status(200).json({
        success: true,
        data: queue,
      });
    } catch (error) {
      next(error);
    }
  };

  pauseQueue = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { queueId } = req.params;
      const queue = await this.queueService.pauseQueue(queueId);
      res.status(200).json({
        success: true,
        message: "Queue paused successfully",
        data: queue,
      });
    } catch (error) {
      next(error);
    }
  };

  resumeQueue = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { queueId } = req.params;
      const queue = await this.queueService.resumeQueue(queueId);
      res.status(200).json({
        success: true,
        message: "Queue resumed successfully",
        data: queue,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteQueue = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { queueId } = req.params;
      await this.queueService.deleteQueue(queueId);
      res.status(200).json({
        success: true,
        message: "Queue deleted successfully from databases and Redis namespaces",
      });
    } catch (error) {
      next(error);
    }
  };
}
