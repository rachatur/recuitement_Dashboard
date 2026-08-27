import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../types';
import {
  LayoutDashboard, Building2, Briefcase, Users, Send,
  CalendarCheck2, FileCheck2, BarChart3, ShieldAlert,
  UserCheck, Sparkles, Workflow, Layers, MessageSquare,
  Radio, FileText, MessagesSquare, Ban, Settings,
  History, ChevronDown, ChevronRight, CheckCircle2, Award
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { user } = useAuth();
  const role = user?.role;
  const [waExpanded, setWaExpanded] = useState(true);

  const isRoleAllowed = (allowedRoles: string[]) =>
    !role || role === 'SUPER_ADMIN' || role === 'HR_RECRUITER' || allowedRoles.includes(role);

  const isWhatsAppActive = activeTab.startsWith('whatsapp-');

  return (
    <aside className="w-64 bg-slate-950/90 border-r border-slate-800/80 flex flex-col h-screen select-none shrink-0">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-800/80">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
          <Workflow className="w-5 h-5 text-white" />
        </div>
        <div className="overflow-hidden">
          <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5 truncate">
            RecruitFlow
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded">
              v2.0
            </span>
          </h1>
          <p className="text-[10px] text-slate-400 font-medium truncate">ATS & WhatsApp Outreach</p>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4 custom-scrollbar">
        {/* Core Recruiting Section */}
        <div>
          <div className="px-3 mb-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Recruitment Core
            </p>
          </div>
          <div className="space-y-0.5">
            {isRoleAllowed(['SUPER_ADMIN', 'ADMIN', 'RECRUITER', 'TEAM_LEAD', 'CLIENT', 'HIRING_MANAGER', 'VIEWER']) && (
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span>Dashboard</span>
              </button>
            )}

            {isRoleAllowed(['SUPER_ADMIN', 'ADMIN', 'RECRUITER', 'TEAM_LEAD', 'CLIENT', 'HIRING_MANAGER', 'VIEWER']) && (
              <button
                onClick={() => setActiveTab('clients')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'clients'
                    ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Building2 className="w-4 h-4 shrink-0" />
                <span>Clients</span>
              </button>
            )}

            {isRoleAllowed(['SUPER_ADMIN', 'ADMIN', 'RECRUITER', 'TEAM_LEAD', 'CLIENT', 'HIRING_MANAGER', 'VIEWER']) && (
              <button
                onClick={() => setActiveTab('requirements')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'requirements'
                    ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Briefcase className="w-4 h-4 shrink-0" />
                  <span className="truncate">Job Requirements</span>
                </div>
              </button>
            )}

            {isRoleAllowed(['SUPER_ADMIN', 'ADMIN', 'RECRUITER', 'TEAM_LEAD', 'CLIENT', 'HIRING_MANAGER', 'VIEWER']) && (
              <button
                onClick={() => setActiveTab('position-tracking')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'position-tracking'
                    ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Layers className="w-4 h-4 shrink-0" />
                  <span className="truncate">Position Tracking</span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded border border-slate-700">
                  Status
                </span>
              </button>
            )}

            {isRoleAllowed(['SUPER_ADMIN', 'ADMIN', 'RECRUITER', 'TEAM_LEAD', 'CLIENT', 'HIRING_MANAGER', 'VIEWER']) && (
              <button
                onClick={() => setActiveTab('candidates')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'candidates'
                    ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Users className="w-4 h-4 shrink-0" />
                  <span className="truncate">Candidates & CVs</span>
                </div>
              </button>
            )}

            {/* Dedicated Bench Section */}
            {isRoleAllowed(['SUPER_ADMIN', 'ADMIN', 'RECRUITER', 'TEAM_LEAD', 'VIEWER']) && (
              <button
                onClick={() => setActiveTab('bench')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'bench'
                    ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Award className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate font-bold text-emerald-300">Bench Pool</span>
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                  Live
                </span>
              </button>
            )}

            {isRoleAllowed(['SUPER_ADMIN', 'ADMIN', 'RECRUITER', 'TEAM_LEAD', 'CLIENT', 'HIRING_MANAGER', 'VIEWER']) && (
              <button
                onClick={() => setActiveTab('submissions')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'submissions'
                    ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Send className="w-4 h-4 shrink-0" />
                <span>CV Submissions</span>
              </button>
            )}

            {isRoleAllowed(['SUPER_ADMIN', 'ADMIN', 'RECRUITER', 'TEAM_LEAD', 'CLIENT', 'HIRING_MANAGER', 'VIEWER']) && (
              <button
                onClick={() => setActiveTab('interviews')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'interviews'
                    ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <CalendarCheck2 className="w-4 h-4 shrink-0" />
                <span>Interviews & Feedback</span>
              </button>
            )}

            {isRoleAllowed(['SUPER_ADMIN', 'ADMIN', 'RECRUITER', 'TEAM_LEAD', 'VIEWER']) && (
              <button
                onClick={() => setActiveTab('offers')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'offers'
                    ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <FileCheck2 className="w-4 h-4 shrink-0" />
                <span>Offers & Joining</span>
              </button>
            )}
          </div>
        </div>

        {/* WhatsApp Outreach Module Section */}
        {isRoleAllowed(['SUPER_ADMIN', 'ADMIN', 'RECRUITER', 'TEAM_LEAD']) && (
          <div>
            <div
              onClick={() => setWaExpanded(!waExpanded)}
              className="px-3 mb-1.5 flex items-center justify-between cursor-pointer group"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3 text-emerald-400" />
                WhatsApp Outreach
              </p>
              {waExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
              )}
            </div>

            {waExpanded && (
              <div className="space-y-0.5 pl-2 border-l border-emerald-500/20 ml-3">
                <button
                  onClick={() => setActiveTab('whatsapp-dashboard')}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'whatsapp-dashboard'
                      ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-900/50'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
                  <span>Outreach Dashboard</span>
                </button>

                <button
                  onClick={() => setActiveTab('whatsapp-campaigns')}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'whatsapp-campaigns'
                      ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Radio className="w-3.5 h-3.5 shrink-0" />
                    <span>Campaigns</span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('whatsapp-templates')}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'whatsapp-templates'
                      ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-900/50'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span>Message Templates</span>
                </button>

                <button
                  onClick={() => setActiveTab('whatsapp-conversations')}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'whatsapp-conversations'
                      ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <MessagesSquare className="w-3.5 h-3.5 shrink-0" />
                    <span>Conversations</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </button>

                <button
                  onClick={() => setActiveTab('whatsapp-opt-outs')}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'whatsapp-opt-outs'
                      ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-900/50'
                  }`}
                >
                  <Ban className="w-3.5 h-3.5 shrink-0" />
                  <span>Opt-Out Suppression</span>
                </button>

                {isRoleAllowed(['SUPER_ADMIN', 'ADMIN']) && (
                  <button
                    onClick={() => setActiveTab('whatsapp-settings')}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeTab === 'whatsapp-settings'
                        ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                        : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-900/50'
                    }`}
                  >
                    <Settings className="w-3.5 h-3.5 shrink-0" />
                    <span>Integration Settings</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Intelligence & Audit */}
        <div>
          <div className="px-3 mb-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Intelligence & Audit
            </p>
          </div>
          <div className="space-y-0.5">
            {isRoleAllowed(['SUPER_ADMIN', 'ADMIN', 'TEAM_LEAD', 'RECRUITER', 'VIEWER']) && (
              <button
                onClick={() => setActiveTab('analytics')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'analytics'
                    ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <BarChart3 className="w-4 h-4 shrink-0" />
                <span>Time-Series Analytics</span>
              </button>
            )}

            {isRoleAllowed(['SUPER_ADMIN', 'ADMIN', 'RECRUITER', 'TEAM_LEAD']) && (
              <button
                onClick={() => setActiveTab('ai-tools')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'ai-tools'
                    ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>AI Resume & Matcher</span>
              </button>
            )}

            {/* Dedicated Date-wise History Page */}
            {isRoleAllowed(['SUPER_ADMIN', 'ADMIN', 'TEAM_LEAD', 'RECRUITER']) && (
              <button
                onClick={() => setActiveTab('history')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'history'
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <History className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Date-wise History</span>
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded">
                  Audit
                </span>
              </button>
            )}

            {isRoleAllowed(['SUPER_ADMIN', 'ADMIN', 'TEAM_LEAD']) && (
              <button
                onClick={() => setActiveTab('audit-logs')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'audit-logs'
                    ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>Audit Trail Explorer</span>
              </button>
            )}

            {isRoleAllowed(['SUPER_ADMIN', 'ADMIN']) && (
              <button
                onClick={() => setActiveTab('users')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'users'
                    ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <UserCheck className="w-4 h-4 shrink-0" />
                <span>User Management</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* User profile footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60">
        <div className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-900/80 border border-slate-800">
          <div className="w-7 h-7 rounded-lg bg-brand-500/20 border border-brand-500/40 flex items-center justify-center text-brand-300 text-xs font-bold shrink-0">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-white truncate">{user?.full_name || 'Recruiter'}</p>
            <p className="text-[10px] text-slate-400 font-medium capitalize truncate">{user?.role?.replace('_', ' ').toLowerCase()}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
