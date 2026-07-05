import { WorkflowRepository } from "../repositories/workflow.repository.js";
import { JobService } from "./job.service.js";
import { JobRepository } from "../repositories/job.repository.js";
import { BadRequestError, NotFoundError } from "../errors/custom-errors.js";
import { JobType } from "shared";

export const hasCycle = (nodes: { id: string }[], edges: { from: string; to: string }[]): boolean => {
  const adj = new Map<string, string[]>();
  for (const n of nodes) {
    adj.set(n.id, []);
  }
  for (const e of edges) {
    if (adj.has(e.from)) {
      adj.get(e.from)!.push(e.to);
    }
  }

  const visited = new Set<string>();
  const recStack = new Set<string>();

  const dfs = (u: string): boolean => {
    visited.add(u);
    recStack.add(u);

    const neighbors = adj.get(u) || [];
    for (const v of neighbors) {
      if (!visited.has(v)) {
        if (dfs(v)) return true;
      } else if (recStack.has(v)) {
        return true;
      }
    }

    recStack.delete(u);
    return false;
  };

  for (const n of nodes) {
    if (!visited.has(n.id)) {
      if (dfs(n.id)) return true;
    }
  }

  return false;
};

export class WorkflowService {
  private workflowRepo = new WorkflowRepository();
  private jobService = new JobService();
  private jobRepo = new JobRepository();

  async getWorkflows(projectId: string) {
    return this.workflowRepo.findByProjectId(projectId);
  }

  async getWorkflowById(workflowId: string) {
    const workflow = await this.workflowRepo.findById(workflowId);
    if (!workflow) {
      throw new NotFoundError("Workflow not found");
    }
    return workflow;
  }

  async createWorkflow(projectId: string, data: {
    name: string;
    nodes: any[];
    edges: any[];
  }) {
    // 1. Cycle Detection (Must be a Directed Acyclic Graph)
    if (hasCycle(data.nodes, data.edges)) {
      throw new BadRequestError("Cycle detected in the workflow DAG structure");
    }

    const structure = JSON.stringify({
      nodes: data.nodes,
      edges: data.edges,
    });

    return this.workflowRepo.create({
      name: data.name,
      projectId,
      structure,
    });
  }

  async triggerWorkflow(workflowId: string) {
    const workflow = await this.getWorkflowById(workflowId);
    const parsedStructure = JSON.parse(workflow.structure);
    const nodes: any[] = parsedStructure.nodes;
    const edges: any[] = parsedStructure.edges;

    // We need to create a Job for each node in the DAG.
    // Since jobs are dependent on parent completion, we map nodeIds to newly created jobIds.
    const nodeToJobMap = new Map<string, string>();

    // Sort nodes topologically to ensure parents are created BEFORE children.
    const sortedNodeIds = this.topologicalSort(nodes, edges);

    // Track created jobs
    const createdJobs = [];

    for (const nodeId of sortedNodeIds) {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) continue;

      // Find if this node has a parent edge pointing to it
      const parentEdges = edges.filter((e) => e.to === nodeId);
      
      // For simplicity in single parent/sequential paths, we take the first parent.
      // If there are multiple parents, we can take the first or link multiple.
      // Our database schema supports a parentJobId, which represents the primary dependency block.
      const primaryParentNodeId = parentEdges.length > 0 ? parentEdges[0].from : undefined;
      const parentJobId = primaryParentNodeId ? nodeToJobMap.get(primaryParentNodeId) : undefined;

      const job = await this.jobService.createJob({
        name: `${workflow.name} - ${node.name}`,
        queueId: node.queueId,
        type: JobType.IMMEDIATE,
        payload: node.payload || {},
        maxAttempts: node.maxAttempts,
        timeout: node.timeout,
        parentJobId,
        workflowId: workflow.id,
      });

      nodeToJobMap.set(nodeId, job.id);
      createdJobs.push(job);
    }

    return {
      message: "Workflow triggered successfully",
      workflowId: workflow.id,
      jobs: createdJobs,
    };
  }

  async deleteWorkflow(workflowId: string) {
    return this.workflowRepo.delete(workflowId);
  }

  // Topological sorting helper
  private topologicalSort(nodes: any[], edges: any[]): string[] {
    const sorted: string[] = [];
    const visited = new Set<string>();
    const temp = new Set<string>();

    const adj = new Map<string, string[]>();
    for (const n of nodes) {
      adj.set(n.id, []);
    }
    for (const e of edges) {
      if (adj.has(e.from)) {
        adj.get(e.from)!.push(e.to);
      }
    }

    const visit = (nodeId: string) => {
      if (temp.has(nodeId)) {
        throw new Error("Cycle detected during topological sort");
      }
      if (!visited.has(nodeId)) {
        temp.add(nodeId);
        const neighbors = adj.get(nodeId) || [];
        for (const neighbor of neighbors) {
          visit(neighbor);
        }
        temp.delete(nodeId);
        visited.add(nodeId);
        sorted.unshift(nodeId); // prepend to output
      }
    };

    for (const n of nodes) {
      if (!visited.has(n.id)) {
        visit(n.id);
      }
    }

    return sorted.reverse(); // Reverse to get parents first
  }
}
