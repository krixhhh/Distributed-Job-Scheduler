import { Router } from "express";
import { ProjectController } from "../controllers/project.controller.js";
import { authenticate, requireProjectMember } from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { CreateProjectSchema, InviteMemberSchema } from "shared";

const router = Router();
const controller = new ProjectController();

// All project routes require authentication
router.use(authenticate as any);

router.get("/", controller.listProjects as any);
router.post("/", validateBody(CreateProjectSchema), controller.createProject as any);

// Scoped to a specific project
router.get("/:projectId", requireProjectMember() as any, controller.getProject as any);
router.put("/:projectId", requireProjectMember("ADMIN") as any, controller.updateProject as any);
router.delete("/:projectId", requireProjectMember("ADMIN") as any, controller.deleteProject as any);

// Members
router.get("/:projectId/members", requireProjectMember() as any, controller.listMembers as any);
router.post("/:projectId/members", requireProjectMember("ADMIN") as any, validateBody(InviteMemberSchema), controller.addMember as any);
router.delete("/:projectId/members/:userId", requireProjectMember("ADMIN") as any, controller.removeMember as any);

// API Keys
router.get("/:projectId/keys", requireProjectMember("ADMIN") as any, controller.listApiKeys as any);
router.post("/:projectId/keys", requireProjectMember("ADMIN") as any, controller.createApiKey as any);
router.delete("/:projectId/keys/:keyId", requireProjectMember("ADMIN") as any, controller.revokeApiKey as any);

export default router;
