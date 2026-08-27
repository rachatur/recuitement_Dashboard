import React, { useState } from 'react';
import { useAuth, DEMO_PERSONAS } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { Role } from '../types';
import { RoleBadge } from '../components/common/Badge';
import { Workflow, Lock, Mail, ArrowRight, Shield, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, isLoading } = useAuth();
  const { showToast } = useNotifications();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await login(email, password);
      showToast('success', 'Welcome Back', 'Successfully authenticated into RecruitFlow');
    } catch (err: any) {
      showToast('error', 'Authentication Failed', err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (email: string) => {
    const p = DEMO_PERSONAS.find((item) => item.email === email);
    if (!p) return;
    const pwd = p.email === 'admin@recruitflow.com' ? 'AdminPassword123!' : 'Password123!';
    setEmail(p.email);
    setPassword(pwd);
    try {
      await login(p.email, pwd);
      showToast('success', 'Logged in as HR / Admin', `Signed in as ${p.name}`);
    } catch (err: any) {
      showToast('error', 'Login Failed', err.response?.data?.detail || 'Could not log in');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glowing effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[300px] bg-purple-600/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-sky-400 flex items-center justify-center shadow-xl shadow-brand-500/25 mb-4">
          <Workflow className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-black text-white tracking-tight">RecruitFlow</h2>
        <p className="mt-1 text-xs text-slate-400">
          Enterprise Recruitment Management & Applicant Tracking Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl px-4 relative z-10">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
          {/* Main Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500 transition-colors"
                  placeholder="admin@recruitflow.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500 transition-colors"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full mt-2 py-3 px-4 bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-brand-900/40 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </form>

          {/* Quick Demo Persona Selector */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-brand-400" />
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                1-Click Quick Login
              </h4>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Click any configured user account below to instantly authenticate:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {DEMO_PERSONAS.map((p) => {
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleQuickLogin(p.email)}
                    className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-brand-950/40 hover:border-brand-600/50 transition-all text-left group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-200 group-hover:text-brand-300">
                        {p.name}
                      </span>
                    </div>
                    <RoleBadge role={p.role} />
                    <p className="text-[10px] text-slate-400 truncate mt-1.5">{p.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
