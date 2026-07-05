import { WorkerRepository } from "../repositories/worker.repository.js";
import { NotFoundError } from "../errors/custom-errors.js";

export class WorkerService {
  private workerRepo = new WorkerRepository();

  async getWorkers() {
    return this.workerRepo.listWorkers();
  }

  async getWorkerMetrics(workerId: string) {
    const history = await this.workerRepo.getHeartbeatHistory(workerId);
    if (!history) {
      throw new NotFoundError("Worker heartbeat records not found");
    }
    return history;
  }

  async getMetricsSummary() {
    return this.workerRepo.getMetricsSummary();
  }
}
