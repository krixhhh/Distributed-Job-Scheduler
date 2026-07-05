import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./context/AuthContext.js";
import {
  LayoutDashboard,
  Layers,
  Activity,
  Cpu,
  Key,
  Settings,
  LogOut,
  ChevronDown,
  User,
  Plus,
  Workflow,
  Sparkles,
} from "lucide-react";
import { api } from "./services/api.js";

// Page imports (to be created)
import LoginPage from "./pages/LoginPage.js";
import RegisterPage from "./pages/RegisterPage.js";
import OverviewPage from "./pages/OverviewPage.js";
import QueuesPage from "./pages/QueuesPage.js";
import JobsPage from "./pages/JobsPage.js";
import WorkersPage from "./pages/WorkersPage.js";
import WorkflowsPage from "./pages/WorkflowsPage.js";
import SettingsPage from "./pages/SettingsPage.js";

const queryClient = new QueryClient();

// ==========================================
// Layout Wrapper Component
// ==========================================
const SidebarLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [activeProject, setActiveProject] = useState<any | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await api.get("/projects");
      const list = response.data.data;
      setProjects(list);
      
      const cachedId = localStorage.getItem("currentProjectId");
      const match = list.find((p: any) => p.id === cachedId) || list[0];
      if (match) {
        setActiveProject(match);
        localStorage.setItem("currentProjectId", match.id);
      }
    } catch (e) {
      // API might fail if auth is loading or invalid
    }
  };

  const handleProjectSelect = (project: any) => {
    setActiveProject(project);
    localStorage.setItem("currentProjectId", project.id);
    // Reload state if needed on change
    window.dispatchEvent(new Event("projectChanged"));
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName) return;
    try {
      const response = await api.post("/projects", {
        name: newProjectName,
        description: newProjectDesc,
      });
      const created = response.data.data;
      setProjects([...projects, created]);
      setActiveProject(created);
      localStorage.setItem("currentProjectId", created.id);
      setShowProjectModal(false);
      setNewProjectName("");
      setNewProjectDesc("");
      window.dispatchEvent(new Event("projectChanged"));
    } catch (e) {
      alert("Failed to create project");
    }
  };

  const navItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Queues", path: "/queues", icon: Layers },
    { name: "Jobs & DLQ", path: "/jobs", icon: Activity },
    { name: "Workflows (DAG)", path: "/workflows", icon: Workflow },
    { name: "Workers", path: "/workers", icon: Cpu },
    { name: "Settings & API Keys", path: "/settings", icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar Panel */}
      <aside className="w-64 glass-panel border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo Header */}
          <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800 bg-slate-900/50">
            <span className="text-xl font-display font-extrabold tracking-wider bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent flex items-center gap-2">
              ⚡ SCHEDULER
            </span>
          </div>

          {/* Project Selector */}
          <div className="p-4 border-b border-slate-800 bg-slate-900/20">
            <label className="text-xs uppercase text-slate-500 font-bold tracking-wider mb-2 block">
              Workspace Project
            </label>
            <div className="relative group">
              {activeProject ? (
                <div className="w-full flex items-center justify-between bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg px-3 py-2 text-sm cursor-pointer transition">
                  <span className="font-semibold truncate">{activeProject.name}</span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>
              ) : (
                <button
                  onClick={() => setShowProjectModal(true)}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-3 py-2 text-sm font-semibold transition"
                >
                  <Plus className="w-4 h-4" /> Create Project
                </button>
              )}

              {/* Selector Menu dropdown */}
              <div className="absolute left-0 right-0 mt-1 hidden group-hover:block bg-slate-900 border border-slate-800 rounded-lg shadow-xl overflow-hidden z-50">
                {projects.map((proj) => (
                  <div
                    key={proj.id}
                    onClick={() => handleProjectSelect(proj)}
                    className="px-3 py-2 hover:bg-slate-800 cursor-pointer text-sm font-medium transition"
                  >
                    {proj.name}
                  </div>
                ))}
                <div
                  onClick={() => setShowProjectModal(true)}
                  className="px-3 py-2 border-t border-slate-800 bg-slate-900/50 hover:bg-slate-800 cursor-pointer text-sm text-indigo-400 font-semibold flex items-center gap-1 transition"
                >
                  <Plus className="w-4 h-4" /> Create New
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/10 border-l-4 border-indigo-500 text-indigo-200"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Footer Panel */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center font-display font-bold text-white shadow-md">
              {user?.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-red-950/30 hover:border-red-900 border border-slate-800 text-slate-400 hover:text-red-400 rounded-xl py-2.5 text-sm font-semibold transition duration-200"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Navbar */}
        <header className="h-16 border-b border-slate-800 bg-slate-950/60 backdrop-blur flex items-center justify-between px-8 z-35 sticky top-0">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold">
              {navItems.find((n) => n.path === location.pathname)?.name || "Dashboard"}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-indigo-500/30 text-indigo-400 text-xs font-semibold rounded-full animate-pulse-glow">
              <Sparkles className="w-3.5 h-3.5" /> AI Diagnostic Ready
            </span>
          </div>
        </header>

        {/* Content Page Container */}
        <div className="flex-1 p-8">
          {activeProject ? (
            children
          ) : (
            <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center mt-20">
              <Layers className="w-16 h-16 text-indigo-500 mb-6 animate-bounce" />
              <h2 className="text-2xl font-bold font-display mb-2">Create your first Project</h2>
              <p className="text-slate-400 text-sm mb-6">
                Distributed Job Scheduler scopes queues, jobs, and diagnostic models inside Project Workspaces. Get started by creating one.
              </p>
              <button
                onClick={() => setShowProjectModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 py-3 font-semibold transition"
              >
                Create Workspace Project
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Project Modal dialog */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleCreateProject}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 overflow-hidden shadow-2xl relative"
          >
            <h3 className="text-xl font-bold font-display mb-4">Create New Project</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase text-slate-400 font-bold block mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  placeholder="Billing Engine"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none transition"
                />
              </div>
              <div>
                <label className="text-xs uppercase text-slate-400 font-bold block mb-1">Description (Optional)</label>
                <textarea
                  placeholder="Processes recurring invoices and customer billing triggers"
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none transition h-20"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowProjectModal(false)}
                className="bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-xl px-4 py-2 text-sm font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 text-sm font-semibold transition"
              >
                Provision Project
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// ==========================================
// Protected Route Gate
// ==========================================
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <SidebarLayout>{children}</SidebarLayout>;
};

// ==========================================
// App Routes Setup
// ==========================================
export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <OverviewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/queues"
              element={
                <ProtectedRoute>
                  <QueuesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs"
              element={
                <ProtectedRoute>
                  <JobsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/workflows"
              element={
                <ProtectedRoute>
                  <WorkflowsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/workers"
              element={
                <ProtectedRoute>
                  <WorkersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
