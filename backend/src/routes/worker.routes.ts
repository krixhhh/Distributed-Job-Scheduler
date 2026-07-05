import { Router } from "express";
import { WorkerController } from "../controllers/worker.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();
const controller = new WorkerController();

router.use(authenticate as any);

router.get("/", controller.listWorkers as any);
router.get("/summary", controller.getSummary as any);
router.get("/:workerId/metrics", controller.getWorkerMetrics as any);

export default router;
