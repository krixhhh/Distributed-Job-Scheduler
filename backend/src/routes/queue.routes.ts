import { Router } from "express";
import { QueueController } from "../controllers/queue.controller.js";
import { authenticate, requireProjectMember } from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { CreateQueueSchema, UpdateQueueSchema } from "shared";

const router = Router();
const controller = new QueueController();

router.use(authenticate as any);

router.get("/projects/:projectId/queues", requireProjectMember() as any, controller.listQueues as any);
router.post("/projects/:projectId/queues", requireProjectMember("ADMIN") as any, validateBody(CreateQueueSchema), controller.createQueue as any);

router.get("/projects/:projectId/queues/:queueId", requireProjectMember() as any, controller.getQueue as any);
router.put("/projects/:projectId/queues/:queueId", requireProjectMember("ADMIN") as any, validateBody(UpdateQueueSchema), controller.updateQueue as any);
router.delete("/projects/:projectId/queues/:queueId", requireProjectMember("ADMIN") as any, controller.deleteQueue as any);

router.post("/projects/:projectId/queues/:queueId/pause", requireProjectMember("ADMIN") as any, controller.pauseQueue as any);
router.post("/projects/:projectId/queues/:queueId/resume", requireProjectMember("ADMIN") as any, controller.resumeQueue as any);

export default router;
