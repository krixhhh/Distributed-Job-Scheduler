import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api.js";
import { Cpu, Server, Shield, HardDrive, RefreshCw } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export const WorkersPage: React.FC = () => {
  const [selectedWorker, setSelectedWorker] = useState<any | null>(null);

  // Poll workers list every 4 seconds
  const { data: workers, isLoading } = useQuery({
    queryKey: ["workers"],
    queryFn: async () => {
      const res = await api.get("/workers");
      return res.data.data;
    },
    refetchInterval: 4000,
  });

  // Fetch heartbeat history for the selected worker
  const { data: metricsHistory } = useQuery({
    queryKey: ["workerMetrics", selectedWorker?.id],
    queryFn: async () => {
      if (!selectedWorker) return [];
      const res = await api.get(`/workers/${selectedWorker.id}/metrics`);
      return res.data.data.reverse(); // chronological order
    },
    refetchInterval: 5000,
    enabled: !!selectedWorker,
  });

  if (isLoading) {
    return <div className="text-slate-400 text-sm">Loading workers directory...</div>;
  }

  const handleSelectWorker = (worker: any) => {
    setSelectedWorker(worker);
  };

  return (
    <div className="space-y-6 flex flex-col lg:flex-row gap-8 items-start">
      {/* Left panel: Active Workers Registry */}
      <div className="flex-1 w-full space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {workers && workers.length > 0 ? (
            workers.map((worker: any) => {
              const isActive = worker.status === "ACTIVE";
              const lastSeen = new Date(worker.lastHeartbeat);
              const isSelected = selectedWorker?.id === worker.id;

              return (
                <div
                  key={worker.id}
                  onClick={() => handleSelectWorker(worker)}
                  className={`glass-panel rounded-3xl p-6 border cursor-pointer transition-all duration-300 flex flex-col justify-between ${
                    isSelected
                      ? "border-indigo-500 bg-slate-900/60 shadow-lg shadow-indigo-500/5"
                      : "border-slate-800 hover:border-slate-700 hover:bg-slate-900/30"
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="inline-flex items-center gap-2">
                        <Server className={`w-5 h-5 ${isActive ? "text-indigo-400 animate-pulse" : "text-slate-655"}`} />
                        <h3 className="font-bold text-slate-200 truncate max-w-[150px]">{worker.name}</h3>
                      </div>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                          isActive
                            ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-400"
                            : "bg-slate-900 border-slate-700 text-slate-500"
                        }`}
                      >
                        {worker.status}
                      </span>
                    </div>

                    {/* Metadata parameters */}
                    <div className="space-y-2 text-xs border-y border-slate-850 py-3 mb-4 text-slate-400">
                      <div className="flex justify-between">
                        <span>Host address</span>
                        <span className="font-semibold text-slate-300 font-mono">{worker.ipAddress || "127.0.0.1"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Concurrency threshold</span>
                        <span className="font-semibold text-slate-300">{worker.concurrency} concurrent</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Jobs Executed</span>
                        <span className="font-semibold text-slate-300">{worker._count?.executions || 0} runs</span>
                      </div>
                    </div>
                  </div>

                  {/* Heartbeat timestamps indicator */}
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <RefreshCw className="w-3.5 h-3.5" />
                      Last Heartbeat: {lastSeen.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full text-center py-16 border border-dashed border-slate-800 rounded-3xl">
              <Server className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h4 className="text-md font-bold mb-1">No workers registered</h4>
              <p className="text-slate-500 text-xs max-w-xs mx-auto">
                Spawning a worker service node (via Docker or local ts-node scripts) will register here automatically.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right panel: Workers Performance Charts Metrics */}
      {selectedWorker && (
        <div className="w-full lg:w-96 glass-panel rounded-3xl p-6 border border-slate-800 space-y-6 shrink-0 lg:sticky lg:top-24">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="font-bold text-md truncate">{selectedWorker.name} Performance</h3>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">Host: {selectedWorker.hostname || "Local Node"}</p>
          </div>

          {/* Historical graphs charts using Recharts */}
          <div className="space-y-6">
            {metricsHistory && metricsHistory.length > 0 ? (
              <div className="space-y-6">
                {/* CPU usage Area chart */}
                <div>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wide">
                    <Cpu className="w-4 h-4 text-indigo-400" /> CPU Consumption (%)
                  </div>
                  <div className="h-28 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={metricsHistory} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="cpuGlow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                        <XAxis dataKey="id" hide />
                        <YAxis stroke="#475569" fontSize={9} domain={[0, 100]} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0f172a",
                            borderColor: "#1e293b",
                            borderRadius: "10px",
                            fontSize: "10px",
                          }}
                        />
                        <Area type="monotone" dataKey="cpuUsage" name="CPU %" stroke="#6366f1" fillOpacity={1} fill="url(#cpuGlow)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Memory usage Area chart */}
                <div>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wide">
                    <HardDrive className="w-4 h-4 text-pink-400" /> Memory Consumption (%)
                  </div>
                  <div className="h-28 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={metricsHistory} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="memGlow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ec4899" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                        <XAxis dataKey="id" hide />
                        <YAxis stroke="#475569" fontSize={9} domain={[0, 100]} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0f172a",
                            borderColor: "#1e293b",
                            borderRadius: "10px",
                            fontSize: "10px",
                          }}
                        />
                        <Area type="monotone" dataKey="memoryUsage" name="RAM %" stroke="#ec4899" fillOpacity={1} fill="url(#memGlow)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Active Jobs Load area chart */}
                <div>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wide">
                    <Shield className="w-4 h-4 text-emerald-400" /> Concurrent Workload Load
                  </div>
                  <div className="h-28 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={metricsHistory} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="loadGlow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                        <XAxis dataKey="id" hide />
                        <YAxis stroke="#475569" fontSize={9} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0f172a",
                            borderColor: "#1e293b",
                            borderRadius: "10px",
                            fontSize: "10px",
                          }}
                        />
                        <Area type="monotone" dataKey="activeJobsCount" name="Active Jobs" stroke="#10b981" fillOpacity={1} fill="url(#loadGlow)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-slate-600 text-xs text-center py-10">Waiting for performance samples...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkersPage;
