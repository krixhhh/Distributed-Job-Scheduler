import { Response, NextFunction } from "express";
import { MetricsService } from "../services/metrics.service.js";
import { AuthRequest } from "../types/express.js";

export class MetricsController {
  private metricsService = new MetricsService();

  getDashboardMetrics = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;
      const metrics = await this.metricsService.getDashboardOverview(projectId);
      res.status(200).json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  };

  getExecutionMetrics = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;
      const executionStats = await this.metricsService.getExecutionMetrics(projectId);
      res.status(200).json({
        success: true,
        data: executionStats,
      });
    } catch (error) {
      next(error);
    }
  };
}
