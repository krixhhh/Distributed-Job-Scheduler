import { Router } from "express";
import { MetricsController } from "../controllers/metrics.controller.js";
import { authenticate, requireProjectMember } from "../middleware/auth.middleware.js";

const router = Router();
const controller = new MetricsController();

router.use(authenticate as any);

router.get("/projects/:projectId/metrics/dashboard", requireProjectMember() as any, controller.getDashboardMetrics as any);
router.get("/projects/:projectId/metrics/executions", requireProjectMember() as any, controller.getExecutionMetrics as any);

export default router;
