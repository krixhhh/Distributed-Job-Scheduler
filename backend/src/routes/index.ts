import { Router } from "express";
import authRoutes from "./auth.routes.js";
import projectRoutes from "./project.routes.js";
import queueRoutes from "./queue.routes.js";
import jobRoutes from "./job.routes.js";
import workerRoutes from "./worker.routes.js";
import workflowRoutes from "./workflow.routes.js";
import metricsRoutes from "./metrics.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/projects", projectRoutes);
router.use("/", queueRoutes);
router.use("/", jobRoutes);
router.use("/workers", workerRoutes);
router.use("/", workflowRoutes);
router.use("/", metricsRoutes);

export default router;
