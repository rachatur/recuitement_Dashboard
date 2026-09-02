import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { DashboardSummary, Client, User } from '../types';
import { StatCard } from '../components/common/StatCard';
import {
  Briefcase, Users, FileText, CheckSquare, Send,
  MessageSquare, Calendar, Award, FileCheck2, UserCheck,
  TrendingUp, Clock, Filter, Sparkles, RefreshCw,
  Sun, Moon, ArrowRight, UserPlus, FileUp, Zap,
  Activity, CheckCircle2, AlertTriangle, ShieldCheck,
  ChevronRight, Radio, ExternalLink, Building2
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';

interface DashboardPageProps {
  onNavigate?: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
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
      setClients(clientsRes.data || []);
      setRecruiters(recRes.data || []);
    } catch (err) {
      console.error('Error loading dashboard data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedClient, selectedRecruiter]);

  const handleNav = (tab: string) => {
    if (onNavigate) {
      onNavigate(tab);
    }
  };

  const kpis = data?.kpis;
  const funnel = data?.pipeline_funnel || data?.funnel || [];
  const benchKpis = data?.bench_kpis;
  const waKpis = data?.whatsapp_kpis;
  const candDist = data?.candidate_status_distribution || {};
  const urgentReqs = data?.urgent_requirements || [];
  const recentActivities = data?.recent_activities || [];
  const timeseries = data?.timeseries || data?.time_series_trend || [];

  // Funnel Color Palette (Rich Vibrant Tones)
  const funnelColors: Record<string, string> = {
    'Requirements': '#0284c7',   // Sky 600
    'CVs Received': '#6366f1',   // Indigo 500
    'CVs Submitted': '#3b82f6',  // Blue 500
    'Shortlisted': '#8b5cf6',    // Purple 500
    'Interview': '#ec4899',      // Pink 500
    'Selected': '#10b981',       // Emerald 500
    'Joined': '#14b8a6',         // Teal 500
  };

  const funnelPieData = funnel.map((st, idx) => ({
    name: st.stage,
    stageIndex: idx + 1,
    value: st.count,
    conversionRate: st.conversion_rate,
    color: funnelColors[st.stage] || '#0284c7'
  }));

  const activeFunnelPieData = funnelPieData.filter(d => d.value > 0);
  const totalFunnelCount = funnelPieData.reduce((sum, item) => sum + item.value, 0);

  // Status mapping for progress bars
  const totalCandDistCount = Object.values(candDist).reduce((a: number, b: any) => a + (Number(b) || 0), 0) || 1;

  return (
    <div className="space-y-6 pb-16">
      {/* 1. EXECUTIVE COMMAND HERO & QUICK ACTION TOOLBAR */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800/80 p-6 rounded-3xl shadow-xl dark:shadow-2xl transition-all">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Greeting & Subtitle */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold tracking-wide">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Pipeline Active
              </span>
              <span className="text-slate-400 text-xs hidden sm:inline">
                • {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span>Recruitment Command Center</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Real-time enterprise talent progression, ATS recruitment velocity, WhatsApp candidate outreach, and bench availability.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => handleNav('candidates')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-600/30 hover-lift transition-all"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Add Candidate</span>
            </button>

            <button
              onClick={() => handleNav('requirements')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-xl text-xs font-bold hover-lift transition-all"
            >
              <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
              <span>+ Job Requirement</span>
            </button>

            <button
              onClick={() => handleNav('whatsapp-campaigns')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold hover-lift transition-all"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>Broadcast WhatsApp</span>
            </button>

            <button
              onClick={() => handleNav('ai-tools')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-bold hover-lift transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>AI Matcher</span>
            </button>
          </div>
        </div>

        {/* Filters & Control Bar */}
        <div className="relative z-10 mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Client Filter */}
            <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/80 px-3 py-1.5 rounded-xl text-xs text-slate-200 shadow-sm">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="bg-transparent text-slate-200 focus:outline-none text-xs cursor-pointer pr-2"
              >
                <option value="" className="bg-slate-900 text-slate-200">All Clients ({clients.length})</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-slate-200">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Recruiter Filter */}
            <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/80 px-3 py-1.5 rounded-xl text-xs text-slate-200 shadow-sm">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <select
                value={selectedRecruiter}
                onChange={(e) => setSelectedRecruiter(e.target.value)}
                className="bg-transparent text-slate-200 focus:outline-none text-xs cursor-pointer pr-2"
              >
                <option value="" className="bg-slate-900 text-slate-200">All Recruiters ({recruiters.length})</option>
                {recruiters.map((r) => (
                  <option key={r.id} value={r.id} className="bg-slate-900 text-slate-200">
                    {r.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchDashboardData}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold transition-colors"
              title="Refresh all metrics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-brand-400' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={toggleTheme}
              className="p-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
              title="Toggle Theme"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px]">Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-[11px]">Dark Mode</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. TOP 10 CORE EXECUTIVE KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <StatCard
          title="Open Jobs"
          value={kpis?.open_requirements || kpis?.open_positions || 0}
          icon={Briefcase}
          color="brand"
          subtitle="Active Openings"
          change="+8%"
          isPositive={true}
          onClick={() => handleNav('requirements')}
        />
        <StatCard
          title="Total Talent"
          value={kpis?.total_candidates || 0}
          icon={Users}
          color="indigo"
          subtitle="Talent Pool"
          change="+14%"
          isPositive={true}
          onClick={() => handleNav('candidates')}
        />
        <StatCard
          title="CVs Received"
          value={kpis?.cvs_received || 0}
          icon={FileText}
          color="purple"
          subtitle="Resumes Sourced"
          onClick={() => handleNav('candidates')}
        />
        <StatCard
          title="CVs Screened"
          value={kpis?.cvs_screened || 0}
          icon={CheckSquare}
          color="teal"
          subtitle="Quality Verified"
          onClick={() => handleNav('candidates')}
        />
        <StatCard
          title="CVs Submitted"
          value={kpis?.cvs_submitted || 0}
          icon={Send}
          color="sky"
          subtitle="Client Submissions"
          change="+12%"
          isPositive={true}
          onClick={() => handleNav('submissions')}
        />
        <StatCard
          title="Client Feedback"
          value={kpis?.client_responses || 0}
          icon={MessageSquare}
          color="amber"
          subtitle="Evaluations"
          onClick={() => handleNav('submissions')}
        />
        <StatCard
          title="Interviews"
          value={kpis?.interviews || 0}
          icon={Calendar}
          color="indigo"
          subtitle="Rounds Active"
          onClick={() => handleNav('interviews')}
        />
        <StatCard
          title="Selected"
          value={kpis?.selected || 0}
          icon={Award}
          color="emerald"
          subtitle="Cleared Final"
          change="+5%"
          isPositive={true}
          onClick={() => handleNav('offers')}
        />
        <StatCard
          title="Offers Released"
          value={kpis?.offers || 0}
          icon={FileCheck2}
          color="purple"
          subtitle="Offer Letters"
          onClick={() => handleNav('offers')}
        />
        <StatCard
          title="Candidates Joined"
          value={kpis?.joined || 0}
          icon={UserCheck}
          color="teal"
          subtitle="Onboarded"
          change="+100%"
          isPositive={true}
          onClick={() => handleNav('offers')}
        />
      </div>

      {/* 3. STRATEGIC INTELLIGENCE HIGHLIGHTS: WHATSAPP OUTREACH & BENCH TALENT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* WhatsApp Outreach Speed Engine */}
        <div
          onClick={() => handleNav('whatsapp-dashboard')}
          className="group relative overflow-hidden bg-gradient-to-br from-emerald-950/50 via-slate-900/90 to-slate-900/90 dark:from-emerald-950/40 dark:via-slate-900/90 dark:to-slate-950 border border-emerald-500/30 hover:border-emerald-500/60 p-5 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 hover-lift cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform shadow-md">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-emerald-400">
                    WhatsApp Candidate Outreach
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Velocity
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">High-speed candidate engagement & automated broadcast</p>
              </div>
            </div>

            <ArrowRight className="w-5 h-5 text-emerald-400/60 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
          </div>

          <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-emerald-500/20 relative z-10">
            <div className="bg-slate-950/60 p-3 rounded-2xl border border-emerald-500/20">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Messages Sent</p>
              <p className="text-xl font-black text-white mt-0.5 tabular-nums">{waKpis?.messages_sent || 0}</p>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-2xl border border-emerald-500/20">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Response Rate</p>
              <p className="text-xl font-black text-emerald-400 mt-0.5 tabular-nums">{waKpis?.response_rate || 0}%</p>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-2xl border border-emerald-500/20">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Campaigns</p>
              <p className="text-xl font-black text-white mt-0.5 tabular-nums">{waKpis?.campaigns || 0}</p>
            </div>
          </div>
        </div>

        {/* Bench Talent Pool Deployment Engine */}
        <div
          onClick={() => handleNav('bench')}
          className="group relative overflow-hidden bg-gradient-to-br from-teal-950/50 via-slate-900/90 to-slate-900/90 dark:from-teal-950/40 dark:via-slate-900/90 dark:to-slate-950 border border-teal-500/30 hover:border-teal-500/60 p-5 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 hover-lift cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/15 border border-teal-500/40 flex items-center justify-center text-teal-400 group-hover:scale-110 transition-transform shadow-md">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-teal-400">
                    Bench Talent Availability
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    Immediate
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Deployment-ready consultants and tech resources</p>
              </div>
            </div>

            <ArrowRight className="w-5 h-5 text-teal-400/60 group-hover:text-teal-400 group-hover:translate-x-1 transition-all" />
          </div>

          <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-teal-500/20 relative z-10">
            <div className="bg-slate-950/60 p-3 rounded-2xl border border-teal-500/20">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Bench</p>
              <p className="text-xl font-black text-white mt-0.5 tabular-nums">{benchKpis?.total_bench || 0}</p>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-2xl border border-teal-500/20">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Available Now</p>
              <p className="text-xl font-black text-teal-400 mt-0.5 tabular-nums">{benchKpis?.available || 0}</p>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-2xl border border-teal-500/20">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Interviewing</p>
              <p className="text-xl font-black text-white mt-0.5 tabular-nums">{benchKpis?.interviewing || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. RECRUITMENT CONVERSION FUNNEL & 7-DAY VELOCITY TREND */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Conversion Funnel Donut & Breakdown (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 p-6 rounded-3xl shadow-sm dark:shadow-xl transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-500" />
                End-to-End Recruitment Conversion Funnel
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Stage progression yields, pass-through velocity, and candidate drop-off metrics.
              </p>
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1 bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 rounded-xl border border-brand-200 dark:border-brand-500/20 w-fit">
              {totalFunnelCount} Active Items
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Donut Chart with Center Metric */}
            <div className="md:col-span-5 flex flex-col items-center justify-center relative">
              <div className="h-64 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
                        borderColor: theme === 'dark' ? '#334155' : '#e2e8f0',
                        borderRadius: '16px',
                        fontSize: '12px',
                        color: theme === 'dark' ? '#ffffff' : '#0f172a',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)'
                      }}
                      formatter={(value: any, name: any) => [
                        `${value} (${totalFunnelCount ? Math.round((Number(value) / totalFunnelCount) * 100) : 0}%)`,
                        name
                      ]}
                    />
                    <Pie
                      data={activeFunnelPieData.length > 0 ? activeFunnelPieData : [{ name: 'Requirements', value: 1, color: '#0284c7' }]}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={3}
                      strokeWidth={2}
                      stroke={theme === 'dark' ? '#0f172a' : '#ffffff'}
                    >
                      {activeFunnelPieData.map((entry, index) => (
                        <Cell key={`cell-funnel-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>

                {/* Center Metric Text inside Donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Yield</span>
                  <span className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
                    {funnel.length > 0 ? `${funnel[funnel.length - 1]?.conversion_rate || 0}%` : '100%'}
                  </span>
                  <span className="text-[9px] text-slate-500 font-medium">Joined vs Reqs</span>
                </div>
              </div>
            </div>

            {/* Stage Progression Cards */}
            <div className="md:col-span-7 space-y-2">
              {funnelPieData.map((st) => (
                <div
                  key={st.name}
                  className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 px-3.5 py-2 rounded-xl transition-all flex items-center justify-between shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full shadow-sm shrink-0" style={{ backgroundColor: st.color }} />
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{st.name}</span>
                      <span className="text-[10px] text-slate-400 block">Stage #{st.stageIndex}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-brand-700 dark:text-brand-300 bg-brand-100/60 dark:bg-brand-950/80 px-2 py-0.5 rounded border border-brand-200 dark:border-brand-800/60">
                      {st.conversionRate}% Yield
                    </span>
                    <span className="text-sm font-black text-slate-900 dark:text-white font-mono min-w-[32px] text-right">
                      {st.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 7-Day Velocity & Activity Trend Area Chart (5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 p-6 rounded-3xl shadow-sm dark:shadow-xl transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500" />
                Activity Velocity Trend
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Daily candidate intake, CV submissions, & interview pipeline.
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 rounded-lg">
              7 Days
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeseries}>
                <defs>
                  <linearGradient id="colorCvs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorSubs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
                    borderColor: theme === 'dark' ? '#334155' : '#e2e8f0',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: theme === 'dark' ? '#ffffff' : '#0f172a'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Area type="monotone" dataKey="cvs_received" name="CVs Sourced" stroke="#6366f1" fillOpacity={1} fill="url(#colorCvs)" strokeWidth={2} />
                <Area type="monotone" dataKey="cvs_submitted" name="Submissions" stroke="#0284c7" fillOpacity={1} fill="url(#colorSubs)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Submissions moving at 1.8 days avg
            </span>
            <button
              onClick={() => handleNav('weekly-hr-report')}
              className="text-brand-600 dark:text-brand-400 font-bold hover:underline flex items-center gap-1"
            >
              Full HR Report <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. OPERATIONAL TRIFECTA: STATUS DISTRIBUTION, URGENT OPENINGS & RECENT ACTIVITY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Candidate Status Distribution */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 p-5 rounded-3xl shadow-sm dark:shadow-xl transition-colors">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/80">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-indigo-500" />
              Candidate Status Mix
            </h4>
            <span className="text-[10px] font-bold text-slate-400">All Talent</span>
          </div>

          <div className="space-y-3">
            {Object.entries(candDist).map(([status, count]) => {
              const val = Number(count) || 0;
              const pct = Math.round((val / totalCandDistCount) * 100);
              return (
                <div key={status} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{status}</span>
                    <span className="font-mono text-slate-900 dark:text-white font-bold">{val} <span className="text-[10px] text-slate-400 font-normal">({pct}%)</span></span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-brand-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Urgent Requirements / Hot Openings */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 p-5 rounded-3xl shadow-sm dark:shadow-xl transition-colors flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                Urgent Open Positions
              </h4>
              <button
                onClick={() => handleNav('requirements')}
                className="text-[10px] font-bold text-brand-600 dark:text-brand-400 hover:underline"
              >
                View All
              </button>
            </div>

            <div className="space-y-2.5">
              {urgentReqs.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No urgent positions currently pending.</p>
              ) : (
                urgentReqs.slice(0, 5).map((req) => (
                  <div
                    key={req.id}
                    onClick={() => handleNav('requirements')}
                    className="p-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/70 hover:border-brand-500/50 rounded-2xl transition-all cursor-pointer hover-lift"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate max-w-[170px]">
                        {req.title}
                      </span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
                        {req.priority || 'URGENT'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{req.client}</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{req.openings} Openings</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            onClick={() => handleNav('requirements')}
            className="w-full mt-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors text-center"
          >
            Manage Job Requirements →
          </button>
        </div>

        {/* 3. Live Recruitment Activity Feed */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 p-5 rounded-3xl shadow-sm dark:shadow-xl transition-colors flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-500" />
                Live Activity Audit
              </h4>
              <button
                onClick={() => handleNav('audit-logs')}
                className="text-[10px] font-bold text-brand-600 dark:text-brand-400 hover:underline"
              >
                Full Audit Log
              </button>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto custom-scrollbar pr-1">
              {recentActivities.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No recent recruiter activities recorded.</p>
              ) : (
                recentActivities.slice(0, 5).map((act) => (
                  <div
                    key={act.id}
                    className="p-2.5 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/70 rounded-xl text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px] truncate max-w-[150px]">
                        {act.action} • {act.entity}
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono">{act.created_at?.split(' ')[1] || 'Today'}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{act.remarks}</p>
                    <span className="text-[9px] text-brand-600 dark:text-brand-400 font-semibold block mt-1">
                      By {act.user}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            onClick={() => handleNav('audit-logs')}
            className="w-full mt-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors text-center"
          >
            Open Compliance Audit Trail →
          </button>
        </div>
      </div>

      {/* 6. EXECUTIVE PERFORMANCE STATS FOOTER */}
      <div className="p-4 bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 border border-brand-500/30 rounded-2xl flex flex-wrap items-center justify-between gap-4 text-xs shadow-lg">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-400" />
            <span className="text-slate-300">Avg Time-to-Submit:</span>
            <span className="font-bold text-white">1.8 Days</span>
          </div>

          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-300">Avg Time-to-Hire:</span>
            <span className="font-bold text-white">18.5 Days</span>
          </div>

          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-400" />
            <span className="text-slate-300">Active Clients:</span>
            <span className="font-bold text-white">{clients.length} Corporate Accounts</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-slate-400 text-[11px]">RecruitFlow Enterprise v2.0 • Secured</span>
        </div>
      </div>
    </div>
  );
};

