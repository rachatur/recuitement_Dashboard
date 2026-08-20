import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../types';
import {
  LayoutDashboard, Building2, Briefcase, Users, Send,
  CalendarCheck2, FileCheck2, BarChart3, ShieldAlert,
  UserCheck, Sparkles, Workflow, Layers
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { user } = useAuth();
  const role = user?.role;

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['SUPER_ADMIN', 'ADMIN', 'RECRUITER', 'TEAM_LEAD', 'CLIENT', 'HIRING_MANAGER', 'VIEWER'],
    },
    {
      id: 'clients',
      label: 'Clients',
      icon: Building2,
      roles: ['SUPER_ADMIN', 'ADMIN', 'RECRUITER', 'TEAM_LEAD', 'CLIENT', 'HIRING_MANAGER', 'VIEWER'],
    },
    {
      id: 'requirements',
      label: 'Job Requirements',
      icon: Briefcase,
      roles: ['SUPER_ADMIN', 'ADMIN', 'RECRUITER', 'TEAM_LEAD', 'CLIENT', 'HIRING_MANAGER', 'VIEWER'],
    },
    {
      id: 'candidates',
      label: 'Candidates & CVs',
      icon: Users,
      roles: ['SUPER_ADMIN', 'ADMIN', 'RECRUITER', 'TEAM_LEAD', 'CLIENT', 'HIRING_MANAGER', 'VIEWER'],
    },
    {
      id: 'submissions',
      label: 'CV Submissions',
      icon: Send,
      roles: ['SUPER_ADMIN', 'ADMIN', 'RECRUITER', 'TEAM_LEAD', 'CLIENT', 'HIRING_MANAGER', 'VIEWER'],
    },
    {
      id: 'interviews',
      label: 'Interviews & Feedback',
      icon: CalendarCheck2,
      roles: ['SUPER_ADMIN', 'ADMIN', 'RECRUITER', 'TEAM_LEAD', 'CLIENT', 'HIRING_MANAGER', 'VIEWER'],
    },
    {
      id: 'offers',
      label: 'Offers & Joining',
      icon: FileCheck2,
      roles: ['SUPER_ADMIN', 'ADMIN', 'RECRUITER', 'TEAM_LEAD', 'VIEWER'],
    },
    {
      id: 'analytics',
      label: 'Time-Series Analytics',
      icon: BarChart3,
      roles: ['SUPER_ADMIN', 'ADMIN', 'TEAM_LEAD', 'RECRUITER', 'VIEWER'],
    },
    {
      id: 'ai-tools',
      label: 'AI Resume & Matcher',
      icon: Sparkles,
      roles: ['SUPER_ADMIN', 'ADMIN', 'RECRUITER', 'TEAM_LEAD'],
    },
    {
      id: 'audit-logs',
      label: 'Audit Trail Explorer',
      icon: ShieldAlert,
      roles: ['SUPER_ADMIN', 'ADMIN', 'TEAM_LEAD'],
    },
    {
      id: 'users',
      label: 'User Management',
      icon: UserCheck,
      roles: ['SUPER_ADMIN', 'ADMIN'],
    },
  ];

  const allowedNav = navItems.filter((item) => !role || item.roles.includes(role));

  return (
    <aside className="w-64 bg-slate-950/90 border-r border-slate-800/80 flex flex-col h-screen select-none">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800/80">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-sky-400 flex items-center justify-center shadow-lg shadow-brand-500/20">
          <Workflow className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
            RecruitFlow
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-brand-500/20 text-brand-300 border border-brand-500/40 rounded">
              v1.0
            </span>
          </h1>
          <p className="text-[10px] text-slate-400 font-medium">Enterprise ATS Platform</p>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 mb-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Navigation
          </p>
        </div>
        {allowedNav.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                isActive
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/90'
              }`}
            >
              <Icon
                className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Tenant Info Card */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950">
        <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold text-slate-300">Enterprise Tenant</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 font-mono">PostgreSQL 17 • Active</p>
        </div>
      </div>
    </aside>
  );
};
