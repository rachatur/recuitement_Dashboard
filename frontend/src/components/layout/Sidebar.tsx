import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, Building2, Briefcase, Users, Send,
  CalendarCheck2, FileCheck2, BarChart3, ShieldAlert,
  UserCheck, Sparkles, Workflow, Layers, MessageSquare,
  Radio, FileText, MessagesSquare, Ban, Settings,
  History, ChevronDown, ChevronRight, Award, Bot, TrendingUp
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { user } = useAuth();
  const role = user?.role;
  const [waExpanded, setWaExpanded] = useState(true);

  const isRoleAllowed = (allowedRoles: string[]) => {
    if (!role) return true;
    const r = role.toString().toUpperCase();
    if (r === 'SUPER_ADMIN' || r === 'HR_RECRUITER' || r === 'ADMIN' || r === 'RECRUITER') return true;
    return allowedRoles.some((ar) => ar.toUpperCase() === r);
  };

  const getNavClass = (tabName: string) => {
    const isActive = activeTab === tabName;
    return `w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
      isActive
        ? 'bg-brand-50 text-brand-700 border border-brand-200 shadow-sm font-bold dark:bg-brand-600/20 dark:text-brand-300 dark:border-brand-500/30'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-900/60'
    }`;
  };

  return (
    <aside className="w-64 bg-white dark:bg-slate-950/90 border-r border-slate-200 dark:border-slate-800/80 flex flex-col h-screen select-none shrink-0 transition-colors">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-transparent">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
          <Workflow className="w-5 h-5 text-white" />
        </div>
        <div className="overflow-hidden">
          <h1 className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
            RecruitFlow
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40 rounded">
              v2.0
            </span>
          </h1>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">ATS & WhatsApp Outreach</p>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4 custom-scrollbar">
        {/* SECTION 1: RECRUITMENT CORE */}
        <div>
          <div className="px-3 mb-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Recruitment Core
            </p>
          </div>
          <div className="space-y-0.5">
            {/* Dashboard */}
            {isRoleAllowed(['SUPER_ADMIN', 'ADMIN', 'RECRUITER', 'TEAM_LEAD', 'CLIENT', 'HIRING_MANAGER', 'VIEWER']) && (
              <button
                onClick={() => setActiveTab('dashboard')}
                className={getNavClass('dashboard')}
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span>Dashboard</span>
              </button>
            )}

            {/* Clients */}
            {isRoleAllowed(['SUPER_ADMIN', 'ADMIN', 'RECRUITER', 'TEAM_LEAD', 'CLIENT', 'HIRING_MANAGER', 'VIEWER']) && (
              <button
                onClick={() => setActiveTab('clients')}
                className={getNavClass('clients')}
              >
                <Building2 className="w-4 h-4 shrink-0" />
                <span>Clients</span>
              </button>
            )}

            {/* Job Requirements */}
            {isRoleAllowed(['SUPER_ADMIN', 'ADMIN', 'RECRUITER', 'TEAM_LEAD', 'CLIENT', 'HIRING_MANAGER', 'VIEWER']) && (
              <button
                onClick={() => setActiveTab('requirements')}
                className={getNavClass('requirements')}
              >
                <Briefcase className="w-4 h-4 shrink-0" />
                <span className="truncate">Job Requirements</span>
              </button>
            )}

            {/* Position Tracking */}
            {isRoleAllowed(['SUPER_ADMIN', 'ADMIN', 'RECRUITER', 'TEAM_LEAD', 'CLIENT', 'HIRING_MANAGER', 'VIEWER']) && (
              <button
                onClick={() => setActiveTab('position-tracking')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'position-tracking'
                    ? 'bg-brand-50 text-brand-700 border border-brand-200 shadow-sm font-bold dark:bg-brand-600/20 dark:text-brand-300 dark:border-brand-500/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Layers className="w-4 h-4 shrink-0" />
                  <span className="truncate">Position Tracking</span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.2 bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 rounded">
                  Status
                </span>
              </button>
            )}

            {/* Candidates & CVs */}
            {isRoleAllowed(['SUPER_ADMIN', 'ADMIN', 'RECRUITER', 'TEAM_LEAD', 'CLIENT', 'HIRING_MANAGER', 'VIEWER']) && (
              <button
                onClick={() => setActiveTab('candidates')}
                className={getNavClass('candidates')}
              >
                <Users className="w-4 h-4 shrink-0" />
                <span className="truncate">Candidates & CVs</span>
              </button>
            )}

            {/* Candidate History */}
            {isRoleAllowed(['SUPER_ADMIN', 'ADMIN', 'RECRUITER', 'TEAM_LEAD', 'CLIENT', 'HIRING_MANAGER', 'VIEWER']) && (
              <button
                onClick={() => setActiveTab('candidate-history')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'candidate-history'
                    ? 'bg-cyan-50 text-cyan-800 border border-cyan-200 shadow-sm font-bold dark:bg-cyan-600/20 dark:text-cyan-300 dark:border-cyan-500/40'
                    : 'text-slate-600 hover:text-cyan-700 hover:bg-cyan-50/60 dark:text-slate-400 dark:hover:text-cyan-300 dark:hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <History className="w-4 h-4 shrink-0 text-cyan-600 dark:text-cyan-400" />
                  <span className="truncate">Candidate History</span>
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.5 bg-cyan-100 text-cyan-700 border border-cyan-200 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/40 rounded-full">
                  Status
                </span>
              </button>
            )}

            {/* Bench Resource Pool */}
            {isRoleAllowed(['SUPER_ADMIN', 'ADMIN', 'RECRUITER', 'TEAM_LEAD', 'CLIENT', 'HIRING_MANAGER', 'VIEWER']) && (
              <button
                onClick={() => setActiveTab('bench')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'bench'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm font-bold dark:bg-emerald-600/20 dark:text-emerald-300 dark:border-emerald-500/30'
                    : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/60 dark:text-slate-400 dark:hover:text-emerald-300 dark:hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="truncate font-bold text-emerald-700 dark:text-emerald-300">Bench Resource Pool</span>
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30 rounded-full">
                  Pool
                </span>
              </button>
            )}

            {/* CV Submissions */}
            {isRoleAllowed(['SUPER_ADMIN', 'ADMIN', 'RECRUITER', 'TEAM_LEAD', 'CLIENT', 'HIRING_MANAGER', 'VIEWER']) && (
              <button
                onClick={() => setActiveTab('submissions')}
                className={getNavClass('submissions')}
              >
                <Send className="w-4 h-4 shrink-0" />
                <span>CV Submissions</span>
              </button>
            )}

            {/* Interviews & Feedback */}
            {isRoleAllowed(['SUPER_ADMIN', 'ADMIN', 'RECRUITER', 'TEAM_LEAD', 'CLIENT', 'HIRING_MANAGER', 'VIEWER']) && (
              <button
                onClick={() => setActiveTab('interviews')}
                className={getNavClass('interviews')}
              >
                <CalendarCheck2 className="w-4 h-4 shrink-0" />
                <span>Interviews & Feedback</span>
              </button>
            )}

            {/* Offers & Joining */}
            {isRoleAllowed(['SUPER_ADMIN', 'ADMIN', 'RECRUITER', 'TEAM_LEAD', 'VIEWER']) && (
              <button
                onClick={() => setActiveTab('offers')}
                className={getNavClass('offers')}
              >
                <FileCheck2 className="w-4 h-4 shrink-0" />
                <span>Offers & Joining</span>
              </button>
            )}
          </div>
        </div>

        {/* SECTION 2: WHATSAPP OUTREACH */}
        {isRoleAllowed(['SUPER_ADMIN', 'ADMIN', 'RECRUITER', 'TEAM_LEAD']) && (
          <div>
            <div
              onClick={() => setWaExpanded(!waExpanded)}
              className="px-3 mb-1.5 flex items-center justify-between cursor-pointer group"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                WhatsApp Outreach
              </p>
              {waExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300" />
              )}
            </div>

            {waExpanded && (
              <div className="space-y-0.5 pl-2 border-l border-emerald-200 dark:border-emerald-500/20 ml-3">
                {/* Outreach Dashboard */}
                <button
                  onClick={() => setActiveTab('whatsapp-dashboard')}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'whatsapp-dashboard'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold dark:bg-emerald-600/20 dark:text-emerald-300 dark:border-emerald-500/30'
                      : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/50 dark:text-slate-400 dark:hover:text-emerald-300 dark:hover:bg-slate-900/50'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
                  <span>Outreach Dashboard</span>
                </button>

                {/* Campaigns */}
                <button
                  onClick={() => setActiveTab('whatsapp-campaigns')}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'whatsapp-campaigns'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold dark:bg-emerald-600/20 dark:text-emerald-300 dark:border-emerald-500/30'
                      : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/50 dark:text-slate-400 dark:hover:text-emerald-300 dark:hover:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Radio className="w-3.5 h-3.5 shrink-0" />
                    <span>Campaigns</span>
                  </div>
                </button>

                {/* Message Templates */}
                <button
                  onClick={() => setActiveTab('whatsapp-templates')}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'whatsapp-templates'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold dark:bg-emerald-600/20 dark:text-emerald-300 dark:border-emerald-500/30'
                      : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/50 dark:text-slate-400 dark:hover:text-emerald-300 dark:hover:bg-slate-900/50'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span>Message Templates</span>
                </button>

                {/* Conversations */}
                <button
                  onClick={() => setActiveTab('whatsapp-conversations')}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'whatsapp-conversations'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold dark:bg-emerald-600/20 dark:text-emerald-300 dark:border-emerald-500/30'
                      : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/50 dark:text-slate-400 dark:hover:text-emerald-300 dark:hover:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <MessagesSquare className="w-3.5 h-3.5 shrink-0" />
                    <span>Conversations</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </button>

                {/* Opt-Out Suppression */}
                <button
                  onClick={() => setActiveTab('whatsapp-opt-outs')}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'whatsapp-opt-outs'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold dark:bg-emerald-600/20 dark:text-emerald-300 dark:border-emerald-500/30'
                      : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/50 dark:text-slate-400 dark:hover:text-emerald-300 dark:hover:bg-slate-900/50'
                  }`}
                >
                  <Ban className="w-3.5 h-3.5 shrink-0" />
                  <span>Opt-Out Suppression</span>
                </button>

                {/* Integration Settings */}
                {isRoleAllowed(['SUPER_ADMIN', 'ADMIN']) && (
                  <button
                    onClick={() => setActiveTab('whatsapp-settings')}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeTab === 'whatsapp-settings'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold dark:bg-emerald-600/20 dark:text-emerald-300 dark:border-emerald-500/30'
                        : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/50 dark:text-slate-400 dark:hover:text-emerald-300 dark:hover:bg-slate-900/50'
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

        {/* SECTION 3: INTELLIGENCE & AUDIT */}
        <div>
          <div className="px-3 mb-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Intelligence & Audit
            </p>
          </div>
          <div className="space-y-0.5">
            {/* Weekly HR Report */}
            {isRoleAllowed(['SUPER_ADMIN', 'ADMIN', 'RECRUITER', 'TEAM_LEAD', 'CLIENT', 'HIRING_MANAGER', 'VIEWER']) && (
              <button
                onClick={() => setActiveTab('weekly-hr-report')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'weekly-hr-report'
                    ? 'bg-blue-50 text-blue-800 border border-blue-200 shadow-sm font-bold dark:bg-blue-600/20 dark:text-blue-300 dark:border-blue-500/30'
                    : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50/60 dark:text-slate-400 dark:hover:text-blue-300 dark:hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="truncate font-bold text-blue-700 dark:text-blue-300">Weekly HR Report</span>
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30 rounded-full">
                  Report
                </span>
              </button>
            )}

            {/* AI Resume & Matcher */}
            {isRoleAllowed(['SUPER_ADMIN', 'ADMIN', 'RECRUITER', 'TEAM_LEAD']) && (
              <button
                onClick={() => setActiveTab('ai-tools')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'ai-tools'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm font-bold dark:bg-emerald-600/20 dark:text-emerald-300 dark:border-emerald-500/30'
                    : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/60 dark:text-slate-400 dark:hover:text-emerald-300 dark:hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="truncate font-semibold text-emerald-700 dark:text-emerald-300">AI Resume & Matcher</span>
                </div>
                <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30 rounded">
                  AI Match
                </span>
              </button>
            )}

            {/* Recruitment Analytics */}
            {isRoleAllowed(['SUPER_ADMIN', 'ADMIN', 'TEAM_LEAD', 'RECRUITER', 'VIEWER']) && (
              <button
                onClick={() => setActiveTab('analytics')}
                className={getNavClass('analytics')}
              >
                <TrendingUp className="w-4 h-4 shrink-0" />
                <span>Recruitment Analytics</span>
              </button>
            )}

            {/* AI Assistant & Copilot */}
            {isRoleAllowed(['SUPER_ADMIN', 'ADMIN', 'RECRUITER', 'TEAM_LEAD', 'VIEWER']) && (
              <button
                onClick={() => setActiveTab('ai-assistant')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'ai-assistant'
                    ? 'bg-gradient-to-r from-brand-100 to-indigo-100 text-brand-900 border border-brand-300 shadow-sm font-bold dark:from-brand-600/30 dark:to-indigo-600/30 dark:text-brand-200 dark:border-brand-500/40'
                    : 'text-slate-700 hover:text-brand-700 hover:bg-brand-50/60 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Bot className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
                  <span className="font-bold">AI Assistant</span>
                </div>
                <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-gradient-to-r from-brand-100 to-indigo-100 text-brand-800 border border-brand-300 dark:from-brand-500/30 dark:to-indigo-500/30 dark:text-brand-300 dark:border-brand-400/40 rounded-full flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  Copilot
                </span>
              </button>
            )}

            {/* Activity / Audit Log */}
            {isRoleAllowed(['SUPER_ADMIN', 'ADMIN', 'TEAM_LEAD', 'RECRUITER']) && (
              <button
                onClick={() => setActiveTab('audit-logs')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'audit-logs'
                    ? 'bg-brand-50 text-brand-700 border border-brand-200 shadow-sm font-bold dark:bg-brand-600/20 dark:text-brand-300 dark:border-brand-500/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span className="truncate">Activity / Audit Log</span>
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.2 bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 rounded">
                  Audit
                </span>
              </button>
            )}

            {/* User Management */}
            {isRoleAllowed(['SUPER_ADMIN', 'ADMIN', 'HR_RECRUITER']) && (
              <button
                onClick={() => setActiveTab('users')}
                className={getNavClass('users')}
              >
                <UserCheck className="w-4 h-4 shrink-0" />
                <span>User Management</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* User profile footer */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/60">
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm">
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.full_name}
              className="w-7 h-7 rounded-lg border border-brand-200 dark:border-brand-500/40 object-cover shrink-0"
            />
          ) : (
            <div className="w-7 h-7 rounded-lg bg-brand-100 dark:bg-brand-500/20 border border-brand-200 dark:border-brand-500/40 flex items-center justify-center text-brand-700 dark:text-brand-300 text-xs font-bold shrink-0">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
          )}
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.full_name || 'Recruiter'}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium capitalize truncate">{user?.role?.replace('_', ' ').toLowerCase()}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
