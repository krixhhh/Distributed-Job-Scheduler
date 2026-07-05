import React, { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api.js";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Workflow, Plus, Trash2, Play, Sparkles, Layers } from "lucide-react";

const initialNodes = [
  {
    id: "node_1",
    type: "default",
    data: { label: "Step 1: Ingest Data" },
    position: { x: 100, y: 150 },
    style: { background: "#1e1b4b", color: "#e0e7ff", border: "1px solid #4f46e5", borderRadius: "12px", padding: "10px" },
  },
  {
    id: "node_2",
    type: "default",
    data: { label: "Step 2: Clean Dataset" },
    position: { x: 350, y: 150 },
    style: { background: "#1e1b4b", color: "#e0e7ff", border: "1px solid #4f46e5", borderRadius: "12px", padding: "10px" },
  },
];

const initialEdges = [
  { id: "edge_1-2", source: "node_1", target: "node_2", animated: true },
];

export const WorkflowsPage: React.FC = () => {
  const projectId = localStorage.getItem("currentProjectId");
  const queryClient = useQueryClient();
  const [triggerRefresh, setTriggerRefresh] = useState(0);

  // React Flow state hooks
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Workflow meta details
  const [workflowName, setWorkflowName] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodeName, setNodeName] = useState("");
  const [nodeQueueId, setNodeQueueId] = useState("");
  const [nodePayload, setNodePayload] = useState("{}");

  useEffect(() => {
    const handleProjectChange = () => {
      setTriggerRefresh((prev) => prev + 1);
    };
    window.addEventListener("projectChanged", handleProjectChange);
    return () => window.removeEventListener("projectChanged", handleProjectChange);
  }, []);

  // Fetch queues to link nodes
  const { data: queues } = useQuery({
    queryKey: ["queues-workflows", projectId, triggerRefresh],
    queryFn: async () => {
      if (!projectId) return [];
      const res = await api.get(`/projects/${projectId}/queues`);
      return res.data.data;
    },
    enabled: !!projectId,
  });

  // Fetch active workflows
  const { data: workflows } = useQuery({
    queryKey: ["workflows", projectId, triggerRefresh],
    queryFn: async () => {
      if (!projectId) return [];
      const res = await api.get(`/projects/${projectId}/workflows`);
      return res.data.data;
    },
    enabled: !!projectId,
  });

  const createWorkflowMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post(`/projects/${projectId}/workflows`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      setWorkflowName("");
      alert("Workflow DAG saved successfully.");
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Failed to create workflow (Cycle Check failed).");
    },
  });

  const triggerWorkflowMutation = useMutation({
    mutationFn: async (workflowId: string) => {
      return api.post(`/projects/${projectId}/workflows/${workflowId}/trigger`);
    },
    onSuccess: () => {
      alert("Workflow enqueued. Roots are running.");
    },
  });

  const deleteWorkflowMutation = useMutation({
    mutationFn: async (workflowId: string) => {
      return api.delete(`/projects/${projectId}/workflows/${workflowId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
  });

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge({ ...params, animated: true }, eds) as any),
    [setEdges]
  );

  const addCustomNode = () => {
    if (!queues || queues.length === 0) {
      alert("Please provision at least one queue before configuring workflows");
      return;
    }

    const defaultQueue = queues[0];
    const newId = `node_${Date.now()}`;
    const newNode = {
      id: newId,
      type: "default",
      data: { label: `Task: ${defaultQueue.name}`, queueId: defaultQueue.id, payload: {} },
      position: { x: 150, y: 150 },
      style: { background: "#1e1b4b", color: "#e0e7ff", border: "1px solid #4f46e5", borderRadius: "12px", padding: "10px" },
    };

    setNodes((nds) => nds.concat(newNode));
    setSelectedNodeId(newId);
    setNodeName(`Task: ${defaultQueue.name}`);
    setNodeQueueId(defaultQueue.id);
    setNodePayload("{}");
  };

  const handleNodeClick = (_: any, node: any) => {
    setSelectedNodeId(node.id);
    setNodeName(node.data.label);
    setNodeQueueId(node.data.queueId || "");
    setNodePayload(JSON.stringify(node.data.payload || {}, null, 2));
  };

  const handleUpdateNodeDetails = () => {
    if (!selectedNodeId) return;

    let parsedPayload = {};
    try {
      parsedPayload = JSON.parse(nodePayload);
    } catch (e) {
      alert("Invalid JSON format in payload text area.");
      return;
    }

    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === selectedNodeId) {
          const selectedQueue = queues?.find((q: any) => q.id === nodeQueueId);
          return {
            ...n,
            data: {
              ...n.data,
              label: nodeName || (selectedQueue ? `Task: ${selectedQueue.name}` : n.data.label),
              queueId: nodeQueueId,
              payload: parsedPayload,
            },
          };
        }
        return n;
      })
    );
    alert("Node properties updated inside active editor.");
  };

  const handleDeleteNode = () => {
    if (!selectedNodeId) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
  };

  const handleSaveWorkflow = () => {
    if (!workflowName) {
      alert("Please provide a workflow configuration name");
      return;
    }

    // Prepare serializable payload structure matching backend expectation
    const formattedNodes = nodes.map((n) => ({
      id: n.id,
      name: n.data.label as string,
      queueId: (n.data as any).queueId || queues?.[0]?.id,
      payload: (n.data as any).payload || {},
    }));

    const formattedEdges = edges.map((e) => ({
      from: e.source,
      to: e.target,
    }));

    createWorkflowMutation.mutate({
      name: workflowName,
      nodes: formattedNodes,
      edges: formattedEdges,
    });
  };

  return (
    <div className="space-y-6">
      {/* Upper active list */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
        <h3 className="text-md font-bold font-display uppercase tracking-wider">Configured Workflows (DAGs)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflows && workflows.length > 0 ? (
            workflows.map((wf: any) => (
              <div key={wf.id} className="bg-slate-950 border border-slate-850 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-bold flex items-center gap-1.5 text-xs text-slate-200">
                    <Workflow className="w-4 h-4 text-indigo-400" /> {wf.name}
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">
                    Steps: {wf._count?.jobs || 0} tasks
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => triggerWorkflowMutation.mutate(wf.id)}
                    className="p-2 bg-indigo-600/10 hover:bg-indigo-600/25 border border-indigo-500/25 text-indigo-400 rounded-xl transition"
                    title="Trigger Workflow Pipeline"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Delete this workflow and cancel dependents?")) {
                        deleteWorkflowMutation.mutate(wf.id);
                      }
                    }}
                    className="p-2 border border-slate-850 hover:bg-red-950/20 hover:border-red-900 text-slate-500 hover:text-red-400 rounded-xl transition"
                    title="Delete Workflow"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-slate-655 text-xs col-span-full py-4 text-center">No workflows created in this project workspace.</p>
          )}
        </div>
      </div>

      {/* Builder Main Canvas Section */}
      <div className="flex flex-col lg:flex-row gap-6 items-start h-[500px]">
        {/* React Flow Editor Workspace */}
        <div className="flex-1 w-full h-full border border-slate-800 rounded-3xl bg-slate-950/80 overflow-hidden relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            fitView
          >
            <Controls className="!bg-slate-900 !border-slate-800 !text-slate-200" />
            <MiniMap className="!bg-slate-900 !border-slate-800" nodeColor="#312e81" maskColor="rgba(0,0,0,0.5)" />
            <Background color="rgba(255,255,255,0.02)" gap={16} />
          </ReactFlow>

          {/* Canvas Upper Tool Panel */}
          <div className="absolute top-4 left-4 z-40 bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex items-center gap-3">
            <input
              type="text"
              placeholder="Workflow Name..."
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-xs focus:outline-none transition w-44"
            />
            <button
              onClick={handleSaveWorkflow}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Sparkles className="w-3.5 h-3.5" /> Save DAG Workflow
            </button>
            <button
              onClick={addCustomNode}
              className="bg-slate-950 border border-slate-850 hover:bg-slate-850 rounded-xl px-3.5 py-1.5 text-xs font-semibold text-slate-300 flex items-center gap-1 transition"
            >
              <Plus className="w-3.5 h-3.5" /> Add Task Node
            </button>
          </div>
        </div>

        {/* Selected Node parameters Inspector Sidebar */}
        {selectedNodeId && (
          <div className="w-full lg:w-80 glass-panel rounded-3xl p-6 border border-slate-800 space-y-4 shrink-0 h-full overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-xs uppercase text-slate-400 tracking-wider">Node Inspector</h3>
              <button
                onClick={handleDeleteNode}
                className="p-1 hover:bg-red-950/20 text-slate-500 hover:text-red-400 border border-transparent hover:border-red-950 rounded-lg transition"
                title="Remove Node"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-500 font-bold block mb-1">Step Name</label>
                <input
                  type="text"
                  value={nodeName}
                  onChange={(e) => setNodeName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-200 focus:outline-none transition text-xs"
                />
              </div>

              <div>
                <label className="text-slate-500 font-bold block mb-1">Target Queue</label>
                <select
                  value={nodeQueueId}
                  onChange={(e) => setNodeQueueId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-200 focus:outline-none transition text-xs cursor-pointer"
                >
                  {queues?.map((q: any) => (
                    <option key={q.id} value={q.id}>
                      {q.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-500 font-bold block mb-1">Payload parameters JSON</label>
                <textarea
                  value={nodePayload}
                  onChange={(e) => setNodePayload(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-200 focus:outline-none transition font-mono h-24 text-[10px]"
                />
              </div>

              <button
                onClick={handleUpdateNodeDetails}
                className="w-full py-2 bg-slate-900 border border-slate-850 hover:bg-slate-850 hover:border-slate-700 text-slate-200 rounded-xl font-semibold transition"
              >
                Update Node Properties
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowsPage;
