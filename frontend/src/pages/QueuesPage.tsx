import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api.js";
import {
  Layers,
  Plus,
  Play,
  Pause,
  Trash2,
  Settings2,
  RefreshCw,
  Zap,
} from "lucide-react";
import { RetryStrategy } from "shared";

export const QueuesPage: React.FC = () => {
  const projectId = localStorage.getItem("currentProjectId");
  const queryClient = useQueryClient();
  const [triggerRefresh, setTriggerRefresh] = useState(0);
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState(5);
  const [concurrency, setConcurrency] = useState(5);
  const [rateLimit, setRateLimit] = useState("");
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [timeout, setTimeoutVal] = useState(30000);
  const [strategy, setStrategy] = useState<RetryStrategy>(RetryStrategy.FIXED);
  const [retryDelay, setRetryDelay] = useState(5000);

  useEffect(() => {
    const handleProjectChange = () => {
      setTriggerRefresh((prev) => prev + 1);
    };
    window.addEventListener("projectChanged", handleProjectChange);
    return () => window.removeEventListener("projectChanged", handleProjectChange);
  }, []);

  const { data: queues, isLoading } = useQuery({
    queryKey: ["queues", projectId, triggerRefresh],
    queryFn: async () => {
      if (!projectId) return [];
      const res = await api.get(`/projects/${projectId}/queues`);
      return res.data.data;
    },
    enabled: !!projectId,
  });

  const createQueueMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post(`/projects/${projectId}/queues`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queues"] });
      setShowModal(false);
      resetForm();
    },
  });

  const togglePauseMutation = useMutation({
    mutationFn: async ({ queueId, isPaused }: { queueId: string; isPaused: boolean }) => {
      const action = isPaused ? "resume" : "pause";
      return api.post(`/projects/${projectId}/queues/${queueId}/${action}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queues"] });
    },
  });

  const deleteQueueMutation = useMutation({
    mutationFn: async (queueId: string) => {
      return api.delete(`/projects/${projectId}/queues/${queueId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queues"] });
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setPriority(5);
    setConcurrency(5);
    setRateLimit("");
    setMaxAttempts(3);
    setTimeoutVal(30000);
    setStrategy(RetryStrategy.FIXED);
    setRetryDelay(5000);
  };

  const handleCreateQueue = (e: React.FormEvent) => {
    e.preventDefault();
    createQueueMutation.mutate({
      name,
      description,
      priority,
      concurrency,
      rateLimit: rateLimit ? parseInt(rateLimit) : null,
      maxAttempts,
      timeout,
      retryPolicy: {
        strategy,
        delay: retryDelay,
        maxAttempts,
      },
    });
  };

  if (isLoading) {
    return <div className="text-slate-400 text-sm">Loading queue structures...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Control Actions Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Configure parallel enqueuing bounds and thresholds</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition shadow-lg shadow-indigo-600/10"
        >
          <Plus className="w-4 h-4" /> Provision Queue
        </button>
      </div>

      {/* Queues Card Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {queues && queues.length > 0 ? (
          queues.map((q: any) => {
            const isPaused = q.status === "PAUSED";
            return (
              <div
                key={q.id}
                className={`glass-panel rounded-3xl p-6 border flex flex-col justify-between transition-all duration-300 relative ${
                  isPaused ? "border-slate-800 opacity-60" : "border-slate-800 hover:border-slate-700"
                }`}
              >
                <div>
                  {/* Status Indicator */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono text-slate-500 tracking-wider">ID: {q.id.slice(0, 8)}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                        isPaused
                          ? "bg-slate-900 border-slate-700 text-slate-400"
                          : "bg-emerald-950/20 border-emerald-800/40 text-emerald-400"
                      }`}
                    >
                      {q.status}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold flex items-center gap-2 mb-1">
                    <Layers className="w-5 h-5 text-indigo-400" /> {q.name}
                  </h3>
                  <p className="text-slate-400 text-xs line-clamp-2 h-8 mb-6">{q.description || "No description configured."}</p>

                  {/* Config settings parameters */}
                  <div className="grid grid-cols-2 gap-4 border-y border-slate-800/60 py-4 mb-6 text-xs">
                    <div>
                      <p className="text-slate-500 font-medium">Concurrency</p>
                      <p className="text-slate-200 font-bold mt-0.5">{q.concurrency} concurrent</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-medium">Rate Limit</p>
                      <p className="text-slate-200 font-bold mt-0.5">{q.rateLimit ? `${q.rateLimit} /sec` : "Unlimited"}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-medium">Retry Backoff</p>
                      <p className="text-slate-200 font-bold mt-0.5 capitalize">
                        {q.retryPolicy ? `${q.retryPolicy.strategy.toLowerCase()} (${q.retryPolicy.delay}ms)` : "None"}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-medium">Timeout Limit</p>
                      <p className="text-slate-200 font-bold mt-0.5">{q.timeout / 1000}s</p>
                    </div>
                  </div>
                </div>

                {/* Operations triggers */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => togglePauseMutation.mutate({ queueId: q.id, isPaused })}
                    className={`flex-1 py-2 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 transition ${
                      isPaused
                        ? "bg-indigo-600/10 hover:bg-indigo-600/20 border-indigo-500/20 text-indigo-400"
                        : "bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-300"
                    }`}
                  >
                    {isPaused ? (
                      <>
                        <Play className="w-3.5 h-3.5" /> Resume Queue
                      </>
                    ) : (
                      <>
                        <Pause className="w-3.5 h-3.5" /> Pause Queue
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      if (confirm("Obliterating the queue will delete all jobs. Proceed?")) {
                        deleteQueueMutation.mutate(q.id);
                      }
                    }}
                    className="p-2 border border-slate-850 hover:bg-red-950/20 hover:border-red-900 text-slate-500 hover:text-red-400 rounded-xl transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full text-center py-20 border border-dashed border-slate-800 rounded-3xl">
            <Layers className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h4 className="text-md font-bold mb-1">No queues provisioned</h4>
            <p className="text-slate-500 text-xs max-w-xs mx-auto mb-6">
              Establish a messaging queue with custom priority gates and linear/exponential retry strategy.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-indigo-600/10 hover:bg-indigo-600/25 border border-indigo-500/20 text-indigo-400 text-xs px-4 py-2 rounded-xl transition"
            >
              Provision Queue
            </button>
          </div>
        )}
      </div>

      {/* Provision Queue Dialog Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleCreateQueue}
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl p-6 overflow-hidden shadow-2xl relative max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-lg font-bold font-display uppercase mb-6 flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-400" /> Provision Dynamic Queue
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs uppercase text-slate-400 font-bold block mb-1">Queue Name</label>
                <input
                  type="text"
                  required
                  placeholder="acme-billing-events"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-655 focus:outline-none transition text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs uppercase text-slate-400 font-bold block mb-1">Description</label>
                <textarea
                  placeholder="Processes recurring webhook triggers and generates invoice pdf logs"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-655 focus:outline-none transition text-sm h-16"
                />
              </div>

              <div>
                <label className="text-xs uppercase text-slate-400 font-bold block mb-1">Concurrency Limit</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={100}
                  value={concurrency}
                  onChange={(e) => setConcurrency(parseInt(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none transition text-sm"
                />
              </div>

              <div>
                <label className="text-xs uppercase text-slate-400 font-bold block mb-1">Rate Limit (Jobs/Sec)</label>
                <input
                  type="number"
                  placeholder="Unlimited"
                  value={rateLimit}
                  onChange={(e) => setRateLimit(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none transition text-sm"
                />
              </div>

              <div>
                <label className="text-xs uppercase text-slate-400 font-bold block mb-1">Max Executions Attempts</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={20}
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(parseInt(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none transition text-sm"
                />
              </div>

              <div>
                <label className="text-xs uppercase text-slate-400 font-bold block mb-1">Timeout (ms)</label>
                <input
                  type="number"
                  required
                  step={1000}
                  value={timeout}
                  onChange={(e) => setTimeoutVal(parseInt(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none transition text-sm"
                />
              </div>

              <div className="md:col-span-2 border-t border-slate-800 pt-4 mt-2">
                <h4 className="text-xs uppercase text-slate-400 font-bold block mb-3">Retry Backoff Strategy</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-500 font-bold block mb-1">Strategy Type</label>
                    <select
                      value={strategy}
                      onChange={(e) => setStrategy(e.target.value as RetryStrategy)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none transition text-sm cursor-pointer"
                    >
                      <option value={RetryStrategy.FIXED}>Fixed Delay</option>
                      <option value={RetryStrategy.LINEAR}>Linear Backoff</option>
                      <option value={RetryStrategy.EXPONENTIAL}>Exponential Backoff</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 font-bold block mb-1">Retry Base Delay (ms)</label>
                    <input
                      type="number"
                      required
                      step={500}
                      value={retryDelay}
                      onChange={(e) => setRetryDelay(parseInt(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none transition text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-8 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-xl px-4 py-2 text-sm font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createQueueMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 text-sm font-semibold transition"
              >
                Provision Queue
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default QueuesPage;
