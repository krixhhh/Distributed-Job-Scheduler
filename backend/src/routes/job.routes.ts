import { Router } from "express";
import { JobController } from "../controllers/job.controller.js";
import { authenticate, requireProjectMember } from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { CreateJobSchema } from "shared";

const router = Router();
const controller = new JobController();

// Support both JWT user and Api Key access
router.use(authenticate as any);

router.get("/projects/:projectId/jobs", requireProjectMember() as any, controller.listJobs as any);
router.post("/projects/:projectId/jobs", requireProjectMember() as any, validateBody(CreateJobSchema), controller.createJob as any);

router.get("/projects/:projectId/jobs/:jobId", requireProjectMember() as any, controller.getJob as any);
router.delete("/projects/:projectId/jobs/:jobId", requireProjectMember() as any, controller.deleteJob as any);

router.post("/projects/:projectId/jobs/:jobId/retry", requireProjectMember() as any, controller.retryJob as any);
router.post("/projects/:projectId/jobs/:jobId/cancel", requireProjectMember() as any, controller.cancelJob as any);
router.post("/projects/:projectId/jobs/:jobId/clone", requireProjectMember() as any, controller.cloneJob as any);

// Executions and Logs
router.get("/projects/:projectId/jobs/:jobId/executions", requireProjectMember() as any, controller.listExecutions as any);
router.get("/projects/:projectId/executions/:executionId/logs", requireProjectMember() as any, controller.listExecutionLogs as any);

// Dead Letter Queue
router.get("/projects/:projectId/dlq", requireProjectMember() as any, controller.listDlq as any);

export default router;
