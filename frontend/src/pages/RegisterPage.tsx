import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import { ShieldCheck, Mail, Lock, User, Building, AlertCircle } from "lucide-react";

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await register(name, email, password, orgName || undefined);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create account. Please check parameters.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-pink-500/5 blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 shadow-inner mb-4">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold font-display tracking-wide uppercase">
            Create Account
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Provision developer workspace credentials
          </p>
        </div>

        {/* Card */}
        <div className="glass-panel rounded-3xl p-8 shadow-2xl relative border border-slate-800 bg-slate-900/60">
          {success ? (
            <div className="text-center py-6">
              <ShieldCheck className="w-16 h-16 text-indigo-400 mx-auto mb-4 animate-pulse" />
              <h3 className="text-lg font-bold font-display mb-2">Registration Complete</h3>
              <p className="text-slate-400 text-sm mb-6">
                We have logged a mock email verification link to the server console log. Please click it or proceed to log in.
              </p>
              <Link
                to="/login"
                className="inline-block w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition"
              >
                Go to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-3 bg-red-950/20 border border-red-800/40 text-red-300 px-4 py-3 rounded-2xl text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="text-xs uppercase text-slate-400 font-bold block mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500 rounded-xl pl-11 pr-4 py-2.5 text-slate-100 placeholder-slate-655 focus:outline-none transition"
                  />
                  <User className="w-4 h-4 text-slate-600 absolute left-4 top-3.5" />
                </div>
              </div>

              <div>
                <label className="text-xs uppercase text-slate-400 font-bold block mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="john@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500 rounded-xl pl-11 pr-4 py-2.5 text-slate-100 placeholder-slate-655 focus:outline-none transition"
                  />
                  <Mail className="w-4 h-4 text-slate-600 absolute left-4 top-3.5" />
                </div>
              </div>

              <div>
                <label className="text-xs uppercase text-slate-400 font-bold block mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500 rounded-xl pl-11 pr-4 py-2.5 text-slate-100 placeholder-slate-655 focus:outline-none transition"
                  />
                  <Lock className="w-4 h-4 text-slate-600 absolute left-4 top-3.5" />
                </div>
              </div>

              <div>
                <label className="text-xs uppercase text-slate-400 font-bold block mb-1">
                  Organization Name (Optional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Acme Corp"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500 rounded-xl pl-11 pr-4 py-2.5 text-slate-100 placeholder-slate-655 focus:outline-none transition"
                  />
                  <Building className="w-4 h-4 text-slate-600 absolute left-4 top-3.5" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/20 active:translate-y-px transition duration-200 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/35 border-t-white rounded-full animate-spin"></div>
                ) : (
                  "Create Account"
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-8">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-indigo-400 hover:text-indigo-300 font-semibold transition"
          >
            Sign In instead
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
