import { Router } from "express";
import { WorkflowController } from "../controllers/workflow.controller.js";
import { authenticate, requireProjectMember } from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { CreateWorkflowSchema } from "shared";

const router = Router();
const controller = new WorkflowController();

router.use(authenticate as any);

router.get("/projects/:projectId/workflows", requireProjectMember() as any, controller.listWorkflows as any);
router.post("/projects/:projectId/workflows", requireProjectMember("ADMIN") as any, validateBody(CreateWorkflowSchema), controller.createWorkflow as any);

router.get("/projects/:projectId/workflows/:workflowId", requireProjectMember() as any, controller.getWorkflow as any);
router.post("/projects/:projectId/workflows/:workflowId/trigger", requireProjectMember() as any, controller.triggerWorkflow as any);
router.delete("/projects/:projectId/workflows/:workflowId", requireProjectMember("ADMIN") as any, controller.deleteWorkflow as any);

export default router;
