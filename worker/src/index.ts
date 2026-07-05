import dotenv from "dotenv";
dotenv.config();

import { WorkerMonitor } from "./workers/worker-monitor.js";
import { JobProcessor } from "./workers/job-processor.js";
import { AutoWorkerScalingSimulator } from "./workers/scaling-simulator.js";
import { logger } from "./logger/index.js";

const workerName = process.env.WORKER_NAME || `worker-${Math.random().toString(36).substring(2, 8)}`;
const concurrency = parseInt(process.env.WORKER_CONCURRENCY || "5");

const monitor = new WorkerMonitor(workerName, concurrency);
const processor = new JobProcessor(workerName, monitor);
const simulator = new AutoWorkerScalingSimulator();

const start = async () => {
  logger.info(`Bootstrapping worker engine Node name: ${workerName}...`);

  // 1. Start metric heartbeats and recovery checker
  await monitor.start();

  // 2. Start queue worker synchronizer and processing pools
  await processor.start();

  // 3. Start scaling simulators
  simulator.start();
};

const shutdown = async (signal: string) => {
  logger.warn(`Received termination signal ${signal}. Starting graceful shutdown...`);

  // Deprovision scaling simulator checks
  simulator.stop();

  // Close BullMQ workers
  await processor.stop();

  // Mark worker node inactive in DB
  await monitor.stop();

  logger.info("Graceful shutdown complete. Exiting.");
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

start().catch((err: any) => {
  logger.error(`Fatal execution crash on worker start: ${err.message}`);
  process.exit(1);
});
