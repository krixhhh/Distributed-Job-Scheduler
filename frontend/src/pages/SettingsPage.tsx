import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api.js";
import { Key, Plus, Trash2, Shield, Slack, MessageSquare, Mail, Settings, UserPlus } from "lucide-react";
import { UserRole } from "shared";

export const SettingsPage: React.FC = () => {
  const projectId = localStorage.getItem("currentProjectId");
  const queryClient = useQueryClient();
  const [triggerRefresh, setTriggerRefresh] = useState(0);

  // API Key Form
  const [keyName, setKeyName] = useState("");
  const [keyScope, setKeyScope] = useState("READ");
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);

  // Member Form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>(UserRole.MEMBER);

  // Notification Webhook Config
  const [alertType, setAlertType] = useState<"SLACK" | "DISCORD" | "EMAIL">("SLACK");
  const [alertTarget, setAlertTarget] = useState("");

  useEffect(() => {
    const handleProjectChange = () => {
      setTriggerRefresh((prev) => prev + 1);
      setNewlyCreatedKey(null);
    };
    window.addEventListener("projectChanged", handleProjectChange);
    return () => window.removeEventListener("projectChanged", handleProjectChange);
  }, []);

  // Fetch API Keys
  const { data: apiKeys } = useQuery({
    queryKey: ["apiKeys", projectId, triggerRefresh],
    queryFn: async () => {
      if (!projectId) return [];
      const res = await api.get(`/projects/${projectId}/keys`);
      return res.data.data;
    },
    enabled: !!projectId,
  });

  // Fetch Members
  const { data: members } = useQuery({
    queryKey: ["members", projectId, triggerRefresh],
    queryFn: async () => {
      if (!projectId) return [];
      const res = await api.get(`/projects/${projectId}/members`);
      return res.data.data;
    },
    enabled: !!projectId,
  });

  const createApiKeyMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post(`/projects/${projectId}/keys`, payload);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["apiKeys"] });
      setNewlyCreatedKey(response.data.data.key);
      setKeyName("");
    },
  });

  const revokeApiKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      return api.delete(`/projects/${projectId}/keys/${keyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apiKeys"] });
    },
  });

  const inviteMemberMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post(`/projects/${projectId}/members`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      setInviteEmail("");
      alert("Member invited successfully");
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Failed to invite member");
    },
  });

  const addNotificationMutation = useMutation({
    mutationFn: async (payload: any) => {
      // Mock notification config creation on backend or store in config mapping
      alert(`Alert hook registered for: ${payload.config.webhookUrl || payload.config.email}`);
    },
  });

  const handleCreateKey = (e: React.FormEvent) => {
    e.preventDefault();
    createApiKeyMutation.mutate({
      name: keyName,
      scope: keyScope,
    });
  };

  const handleInviteMember = (e: React.FormEvent) => {
    e.preventDefault();
    inviteMemberMutation.mutate({
      email: inviteEmail,
      role: inviteRole,
    });
  };

  const handleAddAlert = (e: React.FormEvent) => {
    e.preventDefault();
    const config: any = {};
    if (alertType === "EMAIL") config.email = alertTarget;
    else config.webhookUrl = alertTarget;

    addNotificationMutation.mutate({
      type: alertType,
      config,
    });
    setAlertTarget("");
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Upper Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Developer Keys Card */}
        <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-6">
          <h3 className="text-md font-bold font-display uppercase tracking-wide flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-400" /> Developer API Keys
          </h3>

          <form onSubmit={handleCreateKey} className="flex gap-2 text-xs">
            <input
              type="text"
              required
              placeholder="e.g. Github Action Runner"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-200 focus:outline-none transition"
            />
            <select
              value={keyScope}
              onChange={(e) => setKeyScope(e.target.value)}
              className="bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="READ">Read</option>
              <option value="WRITE">Write</option>
              <option value="ADMIN">Admin</option>
            </select>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 font-semibold transition"
            >
              Generate Key
            </button>
          </form>

          {newlyCreatedKey && (
            <div className="bg-emerald-950/20 border border-emerald-800/30 text-emerald-300 rounded-2xl p-4 text-xs space-y-2">
              <p className="font-bold">Write down your key. It won't be shown again:</p>
              <pre className="font-mono bg-slate-950 p-2.5 rounded-lg select-all border border-emerald-900/40 text-[10px] break-all">
                {newlyCreatedKey}
              </pre>
            </div>
          )}

          {/* Keys list */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {apiKeys && apiKeys.length > 0 ? (
              apiKeys.map((key: any) => (
                <div key={key.id} className="bg-slate-950/40 border border-slate-850 rounded-xl p-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-300">{key.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-mono">{key.key} · Scope: {key.scope}</p>
                  </div>
                  <button
                    onClick={() => revokeApiKeyMutation.mutate(key.id)}
                    className="p-1.5 hover:bg-red-950/20 border border-transparent hover:border-red-950/30 text-slate-500 hover:text-red-400 rounded-lg transition"
                    title="Revoke Key"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-slate-655 text-xs text-center py-4">No API Keys created.</p>
            )}
          </div>
        </div>

        {/* Project Team Members Card */}
        <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-6">
          <h3 className="text-md font-bold font-display uppercase tracking-wide flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-purple-400" /> Workspace Team Members
          </h3>

          <form onSubmit={handleInviteMember} className="flex gap-2 text-xs">
            <input
              type="email"
              required
              placeholder="colleague@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-200 focus:outline-none transition"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as UserRole)}
              className="bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value={UserRole.MEMBER}>Member</option>
              <option value={UserRole.ADMIN}>Admin</option>
            </select>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 font-semibold transition"
            >
              Invite
            </button>
          </form>

          {/* Members list */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {members && members.length > 0 ? (
              members.map((m: any) => (
                <div key={m.id} className="bg-slate-950/40 border border-slate-850 rounded-xl p-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-300">{m.user.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{m.user.email} · Role: {m.role}</p>
                  </div>
                  <div className="p-1 px-2 border border-slate-800 text-slate-400 text-[10px] font-bold rounded-lg uppercase">
                    {m.role}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-655 text-xs text-center py-4">No team members linked.</p>
            )}
          </div>
        </div>
      </div>

      {/* Notification Alert Webhooks Settings */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-6">
        <h3 className="text-md font-bold font-display uppercase tracking-wide flex items-center gap-2">
          <Settings className="w-5 h-5 text-pink-400" /> Diagnostic Notifications Alerts
        </h3>
        <p className="text-xs text-slate-500">
          Subscribe to queue events, final retry DLQ drops, or worker failure alerts.
        </p>

        <form onSubmit={handleAddAlert} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end text-xs">
          <div>
            <label className="text-slate-500 font-bold block mb-1">Target Channel</label>
            <select
              value={alertType}
              onChange={(e) => setAlertType(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-300 focus:outline-none transition cursor-pointer"
            >
              <option value="SLACK">Slack Webhook</option>
              <option value="DISCORD">Discord Webhook</option>
              <option value="EMAIL">Email Alert</option>
            </select>
          </div>

          <div>
            <label className="text-slate-500 font-bold block mb-1">
              {alertType === "EMAIL" ? "Target Email Address" : "Incoming Webhook URL"}
            </label>
            <input
              type={alertType === "EMAIL" ? "email" : "url"}
              required
              placeholder={alertType === "EMAIL" ? "pagerduty@company.com" : "https://hooks.slack.com/services/..."}
              value={alertTarget}
              onChange={(e) => setAlertTarget(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-200 focus:outline-none transition"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2 font-semibold transition"
          >
            Add Alert Endpoint
          </button>
        </form>

        {/* Channels listing icons mockup */}
        <div className="flex gap-4 border-t border-slate-850 pt-4 text-slate-500 text-xs">
          <div className="flex items-center gap-1.5 opacity-50">
            <Slack className="w-4 h-4 text-emerald-400" /> Slack Channel Active
          </div>
          <div className="flex items-center gap-1.5 opacity-50">
            <MessageSquare className="w-4 h-4 text-blue-400" /> Discord Hook Active
          </div>
          <div className="flex items-center gap-1.5 opacity-50">
            <Mail className="w-4 h-4 text-indigo-400" /> Email Pager Active
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
