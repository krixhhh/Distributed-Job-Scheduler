import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api.js";
import {
  Activity,
  Plus,
  RefreshCw,
  XCircle,
  Play,
  Trash2,
  Search,
  Filter,
  Eye,
  AlertTriangle,
  Terminal,
  Sparkles,
  Layers,
} from "lucide-react";
import { JobType, JobStatus } from "shared";

export const JobsPage: React.FC = () => {
  const projectId = localStorage.getItem("currentProjectId");
  const queryClient = useQueryClient();
  const [triggerRefresh, setTriggerRefresh] = useState(0);

  // Filter states
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [queueIdFilter, setQueueIdFilter] = useState("");
  const [page, setPage] = useState(0);
  const limit = 10;

  // Selected Job Details Drawer
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "history" | "logs">("details");
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);

  // New Job Modal
  const [showModal, setShowModal] = useState(false);
  const [jobName, setJobName] = useState("");
  const [targetQueueId, setTargetQueueId] = useState("");
  const [jobType, setJobType] = useState<JobType>(JobType.IMMEDIATE);
  const [payloadText, setPayloadText] = useState("{}");
  const [cronExpression, setCronExpression] = useState("");
  const [runAt, setRunAt] = useState("");

  useEffect(() => {
    const handleProjectChange = () => {
      setTriggerRefresh((prev) => prev + 1);
      setSelectedJob(null);
    };
    window.addEventListener("projectChanged", handleProjectChange);
    return () => window.removeEventListener("projectChanged", handleProjectChange);
  }, []);

  // Fetch queues to load dynamic selector options
  const { data: queues } = useQuery({
    queryKey: ["queues-options", projectId, triggerRefresh],
    queryFn: async () => {
      if (!projectId) return [];
      const res = await api.get(`/projects/${projectId}/queues`);
      return res.data.data;
    },
    enabled: !!projectId,
  });

  // Fetch jobs lists
  const { data: jobsResult, isLoading } = useQuery({
    queryKey: ["jobs", projectId, search, statusFilter, typeFilter, queueIdFilter, page, triggerRefresh],
    queryFn: async () => {
      if (!projectId) return { data: [], total: 0 };
      const offset = page * limit;
      const res = await api.get(`/projects/${projectId}/jobs`, {
        params: {
          queueId: queueIdFilter || undefined,
          status: statusFilter || undefined,
          type: typeFilter || undefined,
          search: search || undefined,
          limit,
          offset,
        },
      });
      return res.data;
    },
    refetchInterval: 4000, // Live poll jobs
    enabled: !!projectId,
  });

  // Fetch selected job's execution history
  const { data: executions } = useQuery({
    queryKey: ["jobExecutions", selectedJob?.id],
    queryFn: async () => {
      if (!selectedJob) return [];
      const res = await api.get(`/projects/${projectId}/jobs/${selectedJob.id}/executions`);
      return res.data.data;
    },
    enabled: !!selectedJob,
  });

  // Fetch execution logs
  const { data: executionLogs } = useQuery({
    queryKey: ["executionLogs", selectedExecutionId],
    queryFn: async () => {
      if (!selectedExecutionId) return [];
      const res = await api.get(`/projects/${projectId}/executions/${selectedExecutionId}/logs`);
      return res.data.data;
    },
    enabled: !!selectedExecutionId,
  });

  const createJobMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post(`/projects/${projectId}/jobs`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      setShowModal(false);
      resetJobForm();
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Failed to trigger job");
    },
  });

  const retryJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      return api.post(`/projects/${projectId}/jobs/${jobId}/retry`);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      setSelectedJob(data.data.data);
    },
  });

  const cancelJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      return api.post(`/projects/${projectId}/jobs/${jobId}/cancel`);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      setSelectedJob(data.data.data);
    },
  });

  const deleteJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      return api.delete(`/projects/${projectId}/jobs/${jobId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      setSelectedJob(null);
    },
  });

  const resetJobForm = () => {
    setJobName("");
    setTargetQueueId("");
    setJobType(JobType.IMMEDIATE);
    setPayloadText("{}");
    setCronExpression("");
    setRunAt("");
  };

  const handleCreateJob = (e: React.FormEvent) => {
    e.preventDefault();
    let parsedPayload = {};
    try {
      parsedPayload = JSON.parse(payloadText);
    } catch (e) {
      alert("Invalid JSON format in payload text area.");
      return;
    }

    createJobMutation.mutate({
      name: jobName,
      queueId: targetQueueId,
      type: jobType,
      payload: parsedPayload,
      cronExpression: cronExpression || undefined,
      runAt: runAt ? new Date(runAt).toISOString() : undefined,
    });
  };

  // Set default target execution
  useEffect(() => {
    if (executions && executions.length > 0) {
      setSelectedExecutionId(executions[0].id);
    } else {
      setSelectedExecutionId(null);
    }
  }, [executions]);

  const viewDetails = (job: any) => {
    setSelectedJob(job);
    setActiveTab("details");
  };

  return (
    <div className="space-y-6 flex flex-col lg:flex-row gap-8 items-start">
      {/* Left panel: Filters, Search, Tables */}
      <div className="flex-1 w-full space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Filters lists */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search jobs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none transition w-48 text-slate-200"
              />
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs focus:outline-none transition cursor-pointer text-slate-300"
            >
              <option value="">All Statuses</option>
              <option value={JobStatus.QUEUED}>Queued</option>
              <option value={JobStatus.SCHEDULED}>Scheduled</option>
              <option value={JobStatus.RUNNING}>Running</option>
              <option value={JobStatus.COMPLETED}>Completed</option>
              <option value={JobStatus.FAILED}>Failed</option>
              <option value={JobStatus.DLQ}>Dead Letter Queue</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs focus:outline-none transition cursor-pointer text-slate-300"
            >
              <option value="">All Types</option>
              <option value={JobType.IMMEDIATE}>Immediate</option>
              <option value={JobType.DELAYED}>Delayed</option>
              <option value={JobType.SCHEDULED}>Scheduled</option>
              <option value={JobType.CRON}>Cron Schedule</option>
              <option value={JobType.RECURRING}>Recurring</option>
            </select>

            <select
              value={queueIdFilter}
              onChange={(e) => setQueueIdFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs focus:outline-none transition cursor-pointer text-slate-300"
            >
              <option value="">All Queues</option>
              {queues?.map((q: any) => (
                <option key={q.id} value={q.id}>
                  {q.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 text-xs font-semibold transition shadow-lg shadow-indigo-600/10"
          >
            <Plus className="w-4 h-4" /> Trigger Job
          </button>
        </div>

        {/* Jobs List Grid Table */}
        <div className="glass-panel rounded-3xl overflow-hidden border border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900/50 text-slate-500 font-bold border-b border-slate-850 uppercase tracking-wider">
                  <th className="px-6 py-4">Job Name / Queue</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Attempts</th>
                  <th className="px-6 py-4">Run Time</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/60">
                {jobsResult?.data && jobsResult.data.length > 0 ? (
                  jobsResult.data.map((job: any) => (
                    <tr
                      key={job.id}
                      onClick={() => viewDetails(job)}
                      className={`hover:bg-slate-900/40 cursor-pointer transition ${
                        selectedJob?.id === job.id ? "bg-slate-900/50" : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-200">{job.name}</p>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Layers className="w-3 h-3" /> {job.queue.name}
                        </p>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-400 capitalize">
                        {job.type.toLowerCase()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${
                            job.status === "COMPLETED"
                              ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-400"
                              : job.status === "FAILED" || job.status === "DLQ"
                                ? "bg-pink-950/20 border-pink-800/40 text-pink-400"
                                : job.status === "RUNNING"
                                  ? "bg-indigo-950/20 border-indigo-800/40 text-indigo-400"
                                  : "bg-slate-900 border-slate-800 text-slate-400"
                          }`}
                        >
                          {job.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-400">
                        {job.attempts} / {job.maxAttempts}
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-mono">
                        {new Date(job.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => viewDetails(job)}
                          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-slate-500 font-semibold">
                      No matching job submissions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {jobsResult && jobsResult.total > limit && (
            <div className="p-4 border-t border-slate-850 bg-slate-900/20 flex items-center justify-between">
              <button
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 bg-slate-950 border border-slate-850 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-slate-100 disabled:opacity-40 transition"
              >
                Previous
              </button>
              <span className="text-slate-500">
                Page {page + 1} of {Math.ceil(jobsResult.total / limit)}
              </span>
              <button
                disabled={(page + 1) * limit >= jobsResult.total}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 bg-slate-950 border border-slate-850 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-slate-100 disabled:opacity-40 transition"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right panel: Details Slider Drawer */}
      {selectedJob && (
        <div className="w-full lg:w-96 glass-panel rounded-3xl p-6 border border-slate-800 space-y-6 shrink-0 relative lg:sticky lg:top-24">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-bold text-md truncate max-w-[200px]">{selectedJob.name}</h3>
              <p className="text-[10px] text-slate-500 mt-0.5 font-mono">UUID: {selectedJob.id}</p>
            </div>
            <button
              onClick={() => setSelectedJob(null)}
              className="text-slate-500 hover:text-slate-300 text-xs font-semibold"
            >
              Close
            </button>
          </div>

          {/* Details actions */}
          <div className="flex flex-wrap gap-2">
            {(selectedJob.status === "FAILED" || selectedJob.status === "DLQ") && (
              <button
                onClick={() => retryJobMutation.mutate(selectedJob.id)}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Re-trigger Retry
              </button>
            )}
            {selectedJob.status !== "COMPLETED" && selectedJob.status !== "FAILED" && (
              <button
                onClick={() => cancelJobMutation.mutate(selectedJob.id)}
                className="flex-1 py-2 bg-slate-900 hover:bg-red-950/20 hover:border-red-900 border border-slate-800 text-slate-400 hover:text-red-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <XCircle className="w-3.5 h-3.5" /> Cancel Execution
              </button>
            )}
            <button
              onClick={() => {
                if (confirm("Delete this job permanently?")) {
                  deleteJobMutation.mutate(selectedJob.id);
                }
              }}
              className="px-3 py-2 border border-slate-850 hover:bg-red-950/20 hover:border-red-900 text-slate-500 hover:text-red-400 rounded-xl transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer tab navigation */}
          <div className="flex border-b border-slate-850 text-xs font-semibold">
            {(["details", "history", "logs"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 capitalize border-b-2 -mb-px text-center transition ${
                  activeTab === tab
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab content area */}
          <div className="text-xs space-y-4 max-h-[400px] overflow-y-auto pr-1">
            {activeTab === "details" && (
              <div className="space-y-4">
                <div>
                  <p className="text-slate-500 font-bold mb-1 uppercase tracking-wider text-[10px]">Payload Arguments</p>
                  <pre className="bg-slate-950/80 border border-slate-850 rounded-xl p-3 text-slate-300 font-mono overflow-x-auto max-h-32 text-[10px]">
                    {JSON.stringify(JSON.parse(selectedJob.payload), null, 2)}
                  </pre>
                </div>

                {selectedJob.result && (
                  <div>
                    <p className="text-slate-500 font-bold mb-1 uppercase tracking-wider text-[10px]">Execution Result</p>
                    <pre className="bg-emerald-950/5 border border-emerald-900/30 text-emerald-300 rounded-xl p-3 font-mono overflow-x-auto max-h-32 text-[10px]">
                      {JSON.stringify(JSON.parse(selectedJob.result), null, 2)}
                    </pre>
                  </div>
                )}

                {/* Thrown runtime error exception details */}
                {selectedJob.error && (
                  <div>
                    <p className="text-slate-500 font-bold mb-1 uppercase tracking-wider text-[10px]">Diagnostics Error</p>
                    <pre className="bg-red-950/5 border border-red-900/30 text-red-300 rounded-xl p-3 font-mono overflow-x-auto max-h-32 text-[10px] whitespace-pre-wrap">
                      {JSON.stringify(JSON.parse(selectedJob.error), null, 2)}
                    </pre>
                  </div>
                )}

                {/* AI Diagnostics suggestions box */}
                {selectedJob.status === "DLQ" && selectedJob.dlqRecord?.suggestions && (
                  <div className="bg-gradient-to-r from-indigo-950/20 to-purple-950/20 border border-indigo-800/30 rounded-2xl p-4 space-y-2">
                    <h4 className="font-bold font-display text-[10px] text-indigo-400 flex items-center gap-1.5 uppercase tracking-wide">
                      <Sparkles className="w-4 h-4 animate-pulse" /> Gemini AI Failure Diagnostics
                    </h4>
                    <div className="text-slate-300 leading-relaxed text-[11px] prose prose-invert whitespace-pre-line">
                      {selectedJob.dlqRecord.suggestions}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "history" && (
              <div className="space-y-3">
                <p className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Attempt History</p>
                {executions && executions.length > 0 ? (
                  executions.map((exec: any) => (
                    <div
                      key={exec.id}
                      onClick={() => setSelectedExecutionId(exec.id)}
                      className={`p-3 border rounded-xl cursor-pointer transition flex items-center justify-between ${
                        selectedExecutionId === exec.id
                          ? "bg-slate-900 border-indigo-500/30"
                          : "bg-slate-950/40 border-slate-850 hover:bg-slate-900"
                      }`}
                    >
                      <div>
                        <p className="font-bold text-slate-300">Attempt #{exec.attempt}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {new Date(exec.startedAt).toLocaleTimeString()}
                        </p>
                      </div>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                          exec.status === "COMPLETED"
                            ? "bg-emerald-950/10 border-emerald-900/30 text-emerald-400"
                            : "bg-pink-950/10 border-pink-900/30 text-pink-400"
                        }`}
                      >
                        {exec.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-655 text-center py-4">No logged runs found.</p>
                )}
              </div>
            )}

            {activeTab === "logs" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Execution Output Console</p>
                  <span className="text-[9px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded">
                    Active Run Logs
                  </span>
                </div>

                <div className="bg-slate-950 border border-slate-850 rounded-xl p-3 font-mono text-[10px] space-y-1.5 h-64 overflow-y-auto select-text">
                  {executionLogs && executionLogs.length > 0 ? (
                    executionLogs.map((log: any, idx: number) => (
                      <div key={idx} className="flex gap-2">
                        <span className="text-slate-600 select-none">{idx + 1}</span>
                        <span
                          className={
                            log.logLevel === "ERROR"
                              ? "text-red-400"
                              : log.logLevel === "WARN"
                                ? "text-amber-400"
                                : "text-slate-300"
                          }
                        >
                          [{log.logLevel}] {log.message}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-600 text-center py-10 flex flex-col items-center justify-center gap-1">
                      <Terminal className="w-6 h-6 text-slate-700" />
                      <span>Console outputs are empty.</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trigger Job Dialog Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleCreateJob}
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl p-6 overflow-hidden shadow-2xl relative max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-lg font-bold font-display uppercase mb-6">Trigger Scheduled/Immediate Job</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs uppercase text-slate-400 font-bold block mb-1">Job Name / Description</label>
                <input
                  type="text"
                  required
                  placeholder="Trigger Billing PDF Generation"
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-655 focus:outline-none transition text-sm"
                />
              </div>

              <div>
                <label className="text-xs uppercase text-slate-400 font-bold block mb-1">Target Queue</label>
                <select
                  required
                  value={targetQueueId}
                  onChange={(e) => setTargetQueueId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none transition text-sm cursor-pointer"
                >
                  <option value="">Select Target Queue</option>
                  {queues?.map((q: any) => (
                    <option key={q.id} value={q.id}>
                      {q.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs uppercase text-slate-400 font-bold block mb-1">Job Dispatch Type</label>
                <select
                  value={jobType}
                  onChange={(e) => setJobType(e.target.value as JobType)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none transition text-sm cursor-pointer"
                >
                  <option value={JobType.IMMEDIATE}>Immediate execution</option>
                  <option value={JobType.DELAYED}>Delayed offset</option>
                  <option value={JobType.CRON}>Cron pattern</option>
                </select>
              </div>

              {jobType === JobType.DELAYED && (
                <div className="md:col-span-2">
                  <label className="text-xs uppercase text-slate-400 font-bold block mb-1">Run At Timestamp</label>
                  <input
                    type="datetime-local"
                    required
                    value={runAt}
                    onChange={(e) => setRunAt(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none transition text-sm cursor-pointer"
                  />
                </div>
              )}

              {jobType === JobType.CRON && (
                <div className="md:col-span-2">
                  <label className="text-xs uppercase text-slate-400 font-bold block mb-1">Cron Expression</label>
                  <input
                    type="text"
                    required
                    placeholder="*/5 * * * * (Every 5 minutes)"
                    value={cronExpression}
                    onChange={(e) => setCronExpression(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-655 focus:outline-none transition text-sm"
                  />
                </div>
              )}

              <div className="md:col-span-2">
                <label className="text-xs uppercase text-slate-400 font-bold block mb-1">Payload JSON Parameters</label>
                <textarea
                  value={payloadText}
                  onChange={(e) => setPayloadText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-655 focus:outline-none transition text-sm font-mono h-24"
                />
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
                disabled={createJobMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 text-sm font-semibold transition"
              >
                En-queue Job Task
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default JobsPage;
