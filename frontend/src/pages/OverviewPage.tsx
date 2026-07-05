import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api.js";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Cpu,
  AlertTriangle,
  Layers,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";

export const OverviewPage: React.FC = () => {
  const projectId = localStorage.getItem("currentProjectId");
  const [triggerRefresh, setTriggerRefresh] = useState(0);

  useEffect(() => {
    const handleProjectChange = () => {
      setTriggerRefresh((prev) => prev + 1);
    };
    window.addEventListener("projectChanged", handleProjectChange);
    return () => window.removeEventListener("projectChanged", handleProjectChange);
  }, []);

  // Poll overview statistics every 5 seconds (Live Queue Monitoring)
  const { data: overview, refetch: refetchOverview } = useQuery({
    queryKey: ["dashboardOverview", projectId, triggerRefresh],
    queryFn: async () => {
      if (!projectId) return null;
      const res = await api.get(`/projects/${projectId}/metrics/dashboard`);
      return res.data.data;
    },
    refetchInterval: 5000,
    enabled: !!projectId,
  });

  // Fetch 24 hours execution statistics
  const { data: chartData } = useQuery({
    queryKey: ["executionMetrics", projectId, triggerRefresh],
    queryFn: async () => {
      if (!projectId) return null;
      const res = await api.get(`/projects/${projectId}/metrics/executions`);
      return res.data.data;
    },
    refetchInterval: 10000,
    enabled: !!projectId,
  });

  if (!projectId) {
    return <div className="text-slate-400 text-sm">Loading workspace dashboard context...</div>;
  }

  const stats = overview
    ? [
        {
          name: "Running Jobs",
          value: overview.statusMap.RUNNING + overview.statusMap.CLAIMED,
          icon: Activity,
          color: "text-indigo-400 border-indigo-500/20 bg-indigo-500/5",
        },
        {
          name: "Completed Jobs",
          value: overview.statusMap.COMPLETED,
          icon: CheckCircle2,
          color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
        },
        {
          name: "Failed Jobs",
          value: overview.statusMap.FAILED,
          icon: XCircle,
          color: "text-pink-400 border-pink-500/20 bg-pink-500/5",
        },
        {
          name: "Dead Letter Queue",
          value: overview.dlqCount,
          icon: AlertTriangle,
          color: "text-amber-400 border-amber-500/20 bg-amber-500/5",
        },
      ]
    : [];

  const pieData = overview
    ? [
        { name: "Queued / Scheduled", value: overview.statusMap.QUEUED + overview.statusMap.SCHEDULED },
        { name: "Running / Claimed", value: overview.statusMap.RUNNING + overview.statusMap.CLAIMED },
        { name: "Completed", value: overview.statusMap.COMPLETED },
        { name: "Failed / DLQ", value: overview.statusMap.FAILED + overview.dlqCount },
      ].filter((x) => x.value > 0)
    : [];

  const PIE_COLORS = ["#818cf8", "#4f46e5", "#10b981", "#f43f5e"];

  return (
    <div className="space-y-8">
      {/* Overview Stat Cards Grid */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.name}
                className={`glass-card rounded-2xl p-6 border flex items-center justify-between ${item.color}`}
              >
                <div>
                  <p className="text-xs uppercase text-slate-500 font-bold tracking-wider mb-1">
                    {item.name}
                  </p>
                  <p className="text-3xl font-display font-black tracking-tight">
                    {item.value}
                  </p>
                </div>
                <div className="p-3 rounded-xl border border-white/5 bg-slate-900/50">
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Main Charts & Analytics Block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Time-Series Line Area Chart */}
        <div className="lg:col-span-2 glass-panel rounded-3xl p-6 flex flex-col justify-between min-h-[400px]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              <h3 className="text-md font-bold font-display uppercase tracking-wide">
                Execution History (Last 24 Hours)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-6">
              Latency:{" "}
              <span className="font-semibold text-slate-300">
                {chartData?.averageLatencyMs || 0} ms
              </span>{" "}
              · Total Processed:{" "}
              <span className="font-semibold text-slate-300">
                {chartData?.totalProcessed || 0} jobs
              </span>
            </p>
          </div>

          <div className="h-64 w-full">
            {chartData?.hourlyStats && chartData.hourlyStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.hourlyStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="completedGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="failedGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="label" stroke="#475569" fontSize={11} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#1e293b",
                      borderRadius: "12px",
                      color: "#f1f5f9",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    name="Completed"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#completedGlow)"
                  />
                  <Area
                    type="monotone"
                    dataKey="failed"
                    name="Failed"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#failedGlow)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600 text-sm">
                No job execution statistics logged in the last 24 hours.
              </div>
            )}
          </div>
        </div>

        {/* State Distribution Pie Chart */}
        <div className="glass-panel rounded-3xl p-6 flex flex-col justify-between">
          <h3 className="text-md font-bold font-display uppercase tracking-wide mb-6">
            Status Breakdown
          </h3>
          <div className="h-48 w-full flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#1e293b",
                      borderRadius: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-600 text-sm text-center">No active queues or jobs mapped yet.</div>
            )}
          </div>

          {/* Custom Legends list */}
          <div className="space-y-2 mt-4">
            {pieData.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-400">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                  ></div>
                  <span>{item.name}</span>
                </div>
                <span className="font-bold text-slate-200">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Auxiliary Metrics Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel rounded-3xl p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/25">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold">Active Workers Pool</h4>
              <p className="text-xs text-slate-500">
                Total virtual and system nodes reporting heartbeats:{" "}
                <span className="text-slate-300 font-semibold">
                  {overview?.activeWorkersCount || 0}
                </span>
              </p>
            </div>
          </div>
          <Link
            to="/workers"
            className="flex items-center justify-center p-2 rounded-xl hover:bg-slate-900 border border-transparent hover:border-slate-800 text-slate-400 hover:text-slate-100 transition"
          >
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        <div className="glass-panel rounded-3xl p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl border border-purple-500/25">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold">Configured Queues</h4>
              <p className="text-xs text-slate-500">
                Number of registered active queue structures:{" "}
                <span className="text-slate-300 font-semibold">
                  {overview?.totalQueuesCount || 0}
                </span>
              </p>
            </div>
          </div>
          <Link
            to="/queues"
            className="flex items-center justify-center p-2 rounded-xl hover:bg-slate-900 border border-transparent hover:border-slate-800 text-slate-400 hover:text-slate-100 transition"
          >
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OverviewPage;
