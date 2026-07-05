import { Response, NextFunction } from "express";
import { WorkerService } from "../services/worker.service.js";
import { AuthRequest } from "../types/express.js";

export class WorkerController {
  private workerService = new WorkerService();

  listWorkers = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const workers = await this.workerService.getWorkers();
      res.status(200).json({
        success: true,
        data: workers,
      });
    } catch (error) {
      next(error);
    }
  };

  getWorkerMetrics = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { workerId } = req.params;
      const history = await this.workerService.getWorkerMetrics(workerId);
      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  };

  getSummary = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const summary = await this.workerService.getMetricsSummary();
      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  };
}
