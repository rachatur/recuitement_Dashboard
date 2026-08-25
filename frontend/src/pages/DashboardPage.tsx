import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { DashboardSummary, Client, User } from '../types';
import { StatCard } from '../components/common/StatCard';
import {
  Briefcase, Users, FileText, CheckSquare, Send,
  MessageSquare, Calendar, Award, FileCheck2, UserCheck,
  TrendingUp, Clock, Filter, Sparkles, ArrowRight, RefreshCw,
  Radio, Layers, CheckCircle2, ShieldCheck, Zap
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
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
  const timeseries = data?.timeseries || [];
  const timeMetrics = data?.time_metrics;
  const clientPerf = data?.client_performance || [];
  const recruiterPerf = data?.recruiter_performance || [];
  const benchKpis = data?.bench_kpis;
  const waKpis = data?.whatsapp_kpis;
  const posDist = data?.position_status_distribution || {};
  const candDist = data?.candidate_status_distribution || {};

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
              className="bg-transparent text-slate-200 focus:outline-none text-xs"
            >
              <option value="" className="bg-slate-900 text-slate-200">All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-slate-200">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Recruiter Filter */}
          <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl text-xs">
            <select
              value={selectedRecruiter}
              onChange={(e) => setSelectedRecruiter(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none text-xs"
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
          change={`${posDist['OPEN'] || 0} active reqs`}
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

      {/* Time-Series Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Candidate Inflow vs. WhatsApp Outreach Volume */}
        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-100">Candidate Inflow vs. Outreach Activity</h3>
              <p className="text-xs text-slate-400 mt-0.5">Daily talent added & WhatsApp outreach dispatches</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeseries}>
                <defs>
                  <linearGradient id="colorCands" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorSubs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Area type="monotone" dataKey="candidates_added" name="Candidates Added" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorCands)" />
                <Area type="monotone" dataKey="cvs_submitted" name="CVs Submitted" stroke="#10b981" fillOpacity={1} fill="url(#colorSubs)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Interviews & Hiring Trends */}
        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-100">Interviews Held & Offers Extended</h3>
              <p className="text-xs text-slate-400 mt-0.5">Evaluation stages and conversion over time</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeseries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Bar dataKey="interviews_held" name="Interviews" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="offers" name="Offers" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="joined" name="Joined" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Time Metrics Benchmarks & Leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Time Metrics Card */}
        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-400" />
              Recruitment Velocity & Time Metrics
            </h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <span className="text-xs text-slate-300">Time to Screen</span>
              <strong className="text-xs font-mono text-brand-300">{timeMetrics?.time_to_screen_hours ?? 0} hrs</strong>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <span className="text-xs text-slate-300">Time to Shortlist</span>
              <strong className="text-xs font-mono text-brand-300">{timeMetrics?.time_to_shortlist_hours ?? 0} hrs</strong>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <span className="text-xs text-slate-300">Time to Submit CV</span>
              <strong className="text-xs font-mono text-brand-300">{timeMetrics?.time_to_submit_hours ?? 0} hrs</strong>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <span className="text-xs text-slate-300">Client Response Latency</span>
              <strong className="text-xs font-mono text-amber-300">{timeMetrics?.client_response_time_days ?? 0} days</strong>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <span className="text-xs text-slate-300">Time to Hire (End-to-End)</span>
              <strong className="text-xs font-mono text-emerald-300">{timeMetrics?.time_to_hire_days ?? 0} days</strong>
            </div>
          </div>
        </div>

        {/* Client Performance Scorecard */}
        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-100">Client Engagement & Latency</h3>
            <p className="text-xs text-slate-400 mt-0.5 mb-4">Response speed & submission outcomes</p>
            <div className="space-y-3">
              {clientPerf.slice(0, 4).map((c) => (
                <div key={c.client_id} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <h5 className="font-semibold text-xs text-slate-200">{c.client_name}</h5>
                    <span className="text-[10px] font-mono text-amber-300 bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-800/50">
                      {c.avg_response_time_days}d avg response
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 font-mono">
                    <span>{c.open_requirements} open reqs</span>
                    <span>{c.cvs_submitted} submitted</span>
                    <span className="text-emerald-400">{c.selections} hired</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recruiter Performance Leaderboard */}
        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-100">Recruiter Activity Leaderboard</h3>
            <p className="text-xs text-slate-400 mt-0.5 mb-4">Top sourcing and candidate placement</p>
            <div className="space-y-3">
              {recruiterPerf.slice(0, 4).map((r) => (
                <div key={r.recruiter_id} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <h5 className="font-semibold text-xs text-slate-200">{r.recruiter_name}</h5>
                    <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-800/50">
                      {r.joining_count} joined
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 font-mono">
                    <span>{r.candidates_added} sourced</span>
                    <span>{r.cvs_submitted} submitted</span>
                    <span>{r.interviews} interviewed</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
