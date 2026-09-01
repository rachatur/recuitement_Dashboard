import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { DashboardSummary, Client, User } from '../types';
import { StatCard } from '../components/common/StatCard';
import {
  Briefcase, Users, FileText, CheckSquare, Send,
  MessageSquare, Calendar, Award, FileCheck2, UserCheck,
  TrendingUp, Clock, Filter, Sparkles, ArrowRight, RefreshCw,
  Radio, Layers, CheckCircle2, ShieldCheck, Zap, PieChart as PieIcon
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

export const DashboardPage: React.FC = () => {
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
  const candDist = data?.candidate_status_distribution || {};

  // Candidate Status Pie Data
  const candStatusColors: Record<string, string> = {
    'Available': '#0ea5e9',      // Sky blue
    'Shortlisted': '#6366f1',    // Indigo
    'Interviewing': '#8b5cf6',   // Violet
    'Selected': '#10b981',       // Emerald
    'Joined': '#06b6d4',         // Cyan
    'On Hold': '#f59e0b',        // Amber
    'Rejected': '#f43f5e',       // Rose
    'Submitted': '#3b82f6',      // Blue
  };

  const candPieData = Object.entries(candDist)
    .filter(([_, val]) => (val as number) > 0)
    .map(([key, val]) => ({
      name: key,
      value: val as number,
      color: candStatusColors[key] || '#94a3b8'
    }));

  const totalCandPieCount = candPieData.reduce((sum, item) => sum + item.value, 0) || kpis?.total_candidates || 0;

  // Position Status Pie Data
  const posStatusColors: Record<string, string> = {
    'Open': '#10b981',        // Emerald
    'On Hold': '#f59e0b',     // Amber
    'Closed': '#64748b',      // Slate
    'Partially Filled': '#06b6d4'
  };

  const posPieData = Object.entries(posDist)
    .filter(([_, val]) => (val as number) > 0)
    .map(([key, val]) => ({
      name: key,
      value: val as number,
      color: posStatusColors[key] || '#38bdf8'
    }));

  const totalPosPieCount = posPieData.reduce((sum, item) => sum + item.value, 0) || kpis?.open_requirements || 0;

  // Bench Pool Pie Data
  const benchPieData = [
    { name: 'Available', value: benchKpis?.available || 0, color: '#10b981' },
    { name: 'Interviewing', value: benchKpis?.interviewing || 0, color: '#8b5cf6' },
    { name: 'Allocated', value: benchKpis?.allocated || 0, color: '#0ea5e9' },
  ].filter(item => item.value > 0);

  const totalBenchCount = benchKpis?.total_bench || benchPieData.reduce((sum, item) => sum + item.value, 0) || 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-lg">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand-400" />
            Recruitment Command Center & WhatsApp Intelligence
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time pipeline progression, bench talent availability, and candidate WhatsApp outreach velocity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Client Filter */}
          <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none text-xs cursor-pointer"
            >
              <option value="" className="bg-slate-900 text-slate-200">All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-slate-200">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* HR Recruiter Filter */}
          <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl text-xs">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <select
              value={selectedRecruiter}
              onChange={(e) => setSelectedRecruiter(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none text-xs cursor-pointer"
            >
              <option value="" className="bg-slate-900 text-slate-200">All Recruiters</option>
              {recruiters.map((r) => (
                <option key={r.id} value={r.id} className="bg-slate-900 text-slate-200">
                  {r.full_name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchDashboardData}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors border border-slate-700"
            title="Refresh metrics"
          >
            <RefreshCw className="w-3.5 h-3.5" />
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
          change={`${posDist['OPEN'] || posDist['Open'] || 0} active reqs`}
          isPositive={true}
        />
        <StatCard
          title="Total Talent"
          value={kpis?.total_candidates || 0}
          icon={Users}
          color="sky"
          change="+18%"
          isPositive={true}
        />
        <StatCard
          title="CVs Received"
          value={kpis?.cvs_received || 0}
          icon={FileText}
          color="purple"
          subtitle="Direct & Sourced"
        />
        <StatCard
          title="CVs Screened"
          value={kpis?.cvs_screened || 0}
          icon={CheckSquare}
          color="indigo"
          subtitle="Screening Done"
        />
        <StatCard
          title="CVs Submitted"
          value={kpis?.cvs_submitted || 0}
          icon={Send}
          color="brand"
          change="+12% MoM"
          isPositive={true}
        />
        <StatCard
          title="Client Feedback"
          value={kpis?.client_responses || 0}
          icon={MessageSquare}
          color="amber"
          subtitle="Avg 1.6d latency"
        />
        <StatCard
          title="Interviews"
          value={kpis?.interviews || 0}
          icon={Calendar}
          color="sky"
          subtitle="Rounds 1-3"
        />
        <StatCard
          title="Selected"
          value={kpis?.selected || 0}
          icon={Award}
          color="emerald"
          change="84% pass rate"
          isPositive={true}
        />
        <StatCard
          title="Offers Released"
          value={kpis?.offers || 0}
          icon={FileCheck2}
          color="purple"
          subtitle="Active / Accepted"
        />
        <StatCard
          title="Candidates Joined"
          value={kpis?.joined || 0}
          icon={UserCheck}
          color="emerald"
          change="100% target"
          isPositive={true}
        />
      </div>

      {/* WhatsApp Outreach & Bench Performance Highlight Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* WhatsApp Outreach Snapshot */}
        <div className="p-4 bg-gradient-to-r from-emerald-950/40 to-slate-900/90 border border-emerald-500/30 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-emerald-400">WhatsApp Candidate Outreach</p>
              <p className="text-sm font-semibold text-white mt-0.5">
                {waKpis?.total_messages_sent || 0} Messages Sent • {waKpis?.response_rate_percent || 0}% Response Rate
              </p>
            </div>
          </div>
          <div className="text-right font-mono text-xs">
            <span className="text-emerald-300 font-bold">{waKpis?.total_campaigns || 0} Campaigns</span>
            <span className="text-slate-400 block text-[10px]">{waKpis?.opted_out_count || 0} Opt-Outs</span>
          </div>
        </div>

        {/* Bench Talent Snapshot */}
        <div className="p-4 bg-gradient-to-r from-teal-950/40 to-slate-900/90 border border-teal-500/30 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-teal-400">Bench Talent Pool</p>
              <p className="text-sm font-semibold text-white mt-0.5">
                {benchKpis?.total_bench || 0} Total Bench • {benchKpis?.available || 0} Available for Deployment
              </p>
            </div>
          </div>
          <div className="text-right font-mono text-xs">
            <span className="text-teal-300 font-bold">{benchKpis?.interviewing || 0} Interviewing</span>
            <span className="text-slate-400 block text-[10px]">{benchKpis?.allocated || 0} Allocated</span>
          </div>
        </div>
      </div>

      {/* Visual Pipeline Funnel & Stage Drop-off */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-400" />
              Recruitment Conversion Funnel
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Stage-by-stage candidate progression and percentage pass-through rates.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-9 gap-2.5">
          {funnel.map((st, idx) => {
            return (
              <div
                key={st.stage}
                className="relative bg-slate-950/80 border border-slate-800 hover:border-brand-500/50 p-3 rounded-xl transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      #{idx + 1}
                    </span>
                    <span className="text-[10px] font-mono font-semibold text-brand-300 bg-brand-950/80 px-1.5 py-0.5 rounded border border-brand-800/60">
                      {st.conversion_rate}%
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-100 mt-1 truncate">{st.stage}</h4>
                  <p className="text-xl font-black text-brand-400 mt-1.5">{st.count}</p>
                </div>

                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-3">
                  <div
                    className="bg-gradient-to-r from-brand-500 to-sky-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(8, st.conversion_rate))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Pie Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Pie Chart 1: Candidate Status Distribution */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold text-slate-100">Candidate Pipeline Status</h3>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 bg-sky-500/20 text-sky-300 rounded border border-sky-500/30">
                {totalCandPieCount} Total
              </span>
            </div>

            <div className="h-60 w-full relative my-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#fff'
                    }}
                    formatter={(value: any, name: any) => [
                      `${value} Candidates (${totalCandPieCount ? Math.round((Number(value) / totalCandPieCount) * 100) : 0}%)`,
                      name
                    ]}
                  />
                  <Pie
                    data={candPieData.length > 0 ? candPieData : [{ name: 'Available', value: 1, color: '#38bdf8' }]}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {candPieData.map((entry, index) => (
                      <Cell key={`cell-cand-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-black text-white">{totalCandPieCount}</span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Candidates</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800/80">
            {candPieData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-xs bg-slate-950 px-2 py-1 rounded-lg border border-slate-800/80">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-slate-300 font-medium">{item.name}:</span>
                <span className="text-white font-bold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pie Chart 2: Job Requirements Status */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100">Job Positions Status</h3>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                {totalPosPieCount} Jobs
              </span>
            </div>

            <div className="h-60 w-full relative my-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#fff'
                    }}
                    formatter={(value: any, name: any) => [
                      `${value} Positions (${totalPosPieCount ? Math.round((Number(value) / totalPosPieCount) * 100) : 0}%)`,
                      name
                    ]}
                  />
                  <Pie
                    data={posPieData.length > 0 ? posPieData : [{ name: 'Open', value: 1, color: '#10b981' }]}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {posPieData.map((entry, index) => (
                      <Cell key={`cell-pos-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-black text-emerald-400">{totalPosPieCount}</span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Positions</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800/80">
            {posPieData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-xs bg-slate-950 px-2 py-1 rounded-lg border border-slate-800/80">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-slate-300 font-medium">{item.name}:</span>
                <span className="text-white font-bold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pie Chart 3: Bench Talent Distribution */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-teal-400" />
                <h3 className="text-sm font-bold text-slate-100">Bench Talent Deployment</h3>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 bg-teal-500/20 text-teal-300 rounded border border-teal-500/30">
                {totalBenchCount} Bench
              </span>
            </div>

            <div className="h-60 w-full relative my-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#fff'
                    }}
                    formatter={(value: any, name: any) => [
                      `${value} Resources (${totalBenchCount ? Math.round((Number(value) / totalBenchCount) * 100) : 0}%)`,
                      name
                    ]}
                  />
                  <Pie
                    data={benchPieData.length > 0 ? benchPieData : [{ name: 'Available', value: 1, color: '#10b981' }]}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {benchPieData.map((entry, index) => (
                      <Cell key={`cell-bench-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-black text-teal-400">{totalBenchCount}</span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Bench Pool</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800/80">
            {benchPieData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-xs bg-slate-950 px-2 py-1 rounded-lg border border-slate-800/80">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-slate-300 font-medium">{item.name}:</span>
                <span className="text-white font-bold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
