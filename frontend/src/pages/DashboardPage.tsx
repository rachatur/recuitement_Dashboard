import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { DashboardSummary, Client, User } from '../types';
import { StatCard } from '../components/common/StatCard';
import {
  Briefcase, Users, FileText, CheckSquare, Send,
  MessageSquare, Calendar, Award, FileCheck2, UserCheck,
  TrendingUp, Clock, Filter, Sparkles, RefreshCw, PieChart as PieIcon,
  Sun, Moon
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer
} from 'recharts';
import { useTheme } from '../contexts/ThemeContext';

export const DashboardPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [recruiters, setRecruiters] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedRecruiter, setSelectedRecruiter] = useState('');

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedClient) params.append('client_id', selectedClient);
      if (selectedRecruiter) params.append('recruiter_id', selectedRecruiter);

      const [dashRes, clientsRes, recRes] = await Promise.all([
        api.get(`/dashboard?${params.toString()}`),
        api.get('/clients'),
        api.get('/users/recruiters')
      ]);

      setData(dashRes.data);
      setClients(clientsRes.data);
      setRecruiters(recRes.data);
    } catch (err) {
      console.error('Error loading dashboard data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedClient, selectedRecruiter]);

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  const kpis = data?.kpis;
  const funnel = data?.pipeline_funnel || data?.funnel || [];
  const benchKpis = data?.bench_kpis;
  const waKpis = data?.whatsapp_kpis;
  const posDist = data?.position_status_distribution || {};

  // Funnel Pie Chart Data
  const funnelColors: Record<string, string> = {
    'Requirements': '#0ea5e9',      // Sky blue
    'CVs Received': '#6366f1',      // Indigo
    'CVs Submitted': '#3b82f6',     // Blue
    'Shortlisted': '#a855f7',       // Purple
    'Interview': '#ec4899',         // Pink
    'Selected': '#10b981',          // Emerald
    'Joined': '#14b8a6',            // Teal
  };

  const funnelPieData = funnel.map((st, idx) => ({
    name: st.stage,
    stageIndex: idx + 1,
    value: st.count,
    conversionRate: st.conversion_rate,
    color: funnelColors[st.stage] || '#38bdf8'
  }));

  const activeFunnelPieData = funnelPieData.filter(d => d.value > 0);
  const totalFunnelCount = funnelPieData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm dark:shadow-lg transition-colors">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            Recruitment Command Center & WhatsApp Intelligence
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time pipeline progression, bench talent availability, and candidate WhatsApp outreach velocity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Client Filter */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none text-xs cursor-pointer"
            >
              <option value="" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* HR Recruiter Filter */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl text-xs">
            <Users className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
            <select
              value={selectedRecruiter}
              onChange={(e) => setSelectedRecruiter(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none text-xs cursor-pointer"
            >
              <option value="" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">All Recruiters</option>
              {recruiters.map((r) => (
                <option key={r.id} value={r.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                  {r.full_name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchDashboardData}
            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors border border-slate-200 dark:border-slate-700"
            title="Refresh metrics"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Dark / Light Mode Toggle Button */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors border border-slate-200 dark:border-slate-700 text-xs font-semibold shadow-sm"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Dark / Light Mode"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-500" />
                <span className="hidden sm:inline">Dark</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Top 10 Core KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <StatCard
          title="Open Jobs"
          value={kpis?.open_requirements || kpis?.open_positions || 0}
          icon={Briefcase}
          color="brand"
        />
        <StatCard
          title="Total Talent"
          value={kpis?.total_candidates || 0}
          icon={Users}
          color="sky"
        />
        <StatCard
          title="CVs Received"
          value={kpis?.cvs_received || 0}
          icon={FileText}
          color="purple"
        />
        <StatCard
          title="CVs Screened"
          value={kpis?.cvs_screened || 0}
          icon={CheckSquare}
          color="indigo"
        />
        <StatCard
          title="CVs Submitted"
          value={kpis?.cvs_submitted || 0}
          icon={Send}
          color="sky"
        />
        <StatCard
          title="Client Feedback"
          value={kpis?.client_responses || 0}
          icon={MessageSquare}
          color="amber"
        />
        <StatCard
          title="Interviews"
          value={kpis?.interviews || 0}
          icon={Calendar}
          color="sky"
        />
        <StatCard
          title="Selected"
          value={kpis?.selected || 0}
          icon={Award}
          color="emerald"
        />
        <StatCard
          title="Offers Released"
          value={kpis?.offers || 0}
          icon={FileCheck2}
          color="purple"
        />
        <StatCard
          title="Candidates Joined"
          value={kpis?.joined || 0}
          icon={UserCheck}
          color="emerald"
        />
      </div>

      {/* WhatsApp Outreach & Bench Performance Highlight Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* WhatsApp Outreach Snapshot */}
        <div className="p-4 bg-gradient-to-r from-emerald-50 to-white dark:from-emerald-950/40 dark:to-slate-900/90 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-400">WhatsApp Candidate Outreach</p>
              <p className="text-sm font-semibold text-slate-800 dark:text-white mt-0.5">
                {waKpis?.total_messages_sent || 0} Messages Sent • {waKpis?.response_rate_percent || 0}% Response Rate
              </p>
            </div>
          </div>
          <div className="text-right font-mono text-xs">
            <span className="text-emerald-700 dark:text-emerald-300 font-bold">{waKpis?.total_campaigns || 0} Campaigns</span>
            <span className="text-slate-500 dark:text-slate-400 block text-[10px]">{waKpis?.opted_out_count || 0} Opt-Outs</span>
          </div>
        </div>

        {/* Bench Talent Snapshot */}
        <div className="p-4 bg-gradient-to-r from-teal-50 to-white dark:from-teal-950/40 dark:to-slate-900/90 border border-teal-200 dark:border-teal-500/30 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-teal-700 dark:text-teal-400">Bench Talent Pool</p>
              <p className="text-sm font-semibold text-slate-800 dark:text-white mt-0.5">
                {benchKpis?.total_bench || 0} Total Bench • {benchKpis?.available || 0} Available for Deployment
              </p>
            </div>
          </div>
          <div className="text-right font-mono text-xs">
            <span className="text-teal-700 dark:text-teal-300 font-bold">{benchKpis?.interviewing || 0} Interviewing</span>
            <span className="text-slate-500 dark:text-slate-400 block text-[10px]">{benchKpis?.allocated || 0} Allocated</span>
          </div>
        </div>
      </div>

      {/* Recruitment Conversion Funnel rendered as Pie Chart */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm dark:shadow-xl transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              Recruitment Conversion Funnel
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Stage-by-stage candidate progression, pipeline volume, and conversion pass-through rates.
            </p>
          </div>
          <span className="text-xs font-mono font-bold px-3 py-1 bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 rounded-xl border border-brand-200 dark:border-brand-500/20 w-fit">
            {totalFunnelCount} Total Activities
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Pie Chart */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <div className="h-72 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
                      borderColor: theme === 'dark' ? '#334155' : '#e2e8f0',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: theme === 'dark' ? '#ffffff' : '#0f172a',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: any, name: any) => [
                      `${value} (${totalFunnelCount ? Math.round((Number(value) / totalFunnelCount) * 100) : 0}%)`,
                      name
                    ]}
                  />
                  <Pie
                    data={activeFunnelPieData.length > 0 ? activeFunnelPieData : [{ name: 'Requirements', value: 1, color: '#0ea5e9' }]}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={0}
                    outerRadius={100}
                    paddingAngle={2}
                  >
                    {activeFunnelPieData.map((entry, index) => (
                      <Cell key={`cell-funnel-${index}`} fill={entry.color} stroke={theme === 'dark' ? '#0f172a' : '#ffffff'} strokeWidth={2} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Funnel Stage Details Grid */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {funnelPieData.map((st) => (
              <div
                key={st.name}
                className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 p-3.5 rounded-xl transition-all flex flex-col justify-between shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: st.color }} />
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      #{st.stageIndex}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-brand-700 dark:text-brand-300 bg-brand-100/60 dark:bg-brand-950/80 px-1.5 py-0.5 rounded border border-brand-200 dark:border-brand-800/60">
                    {st.conversionRate}%
                  </span>
                </div>

                <div className="mt-3 flex items-baseline justify-between">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{st.name}</h4>
                  <p className="text-xl font-black font-mono text-slate-900 dark:text-white ml-2">{st.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
