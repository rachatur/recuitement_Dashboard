import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { TimeSeriesPoint, TimeMetrics, RecruiterPerformanceItem, ClientPerformanceItem } from '../types';
import {
  BarChart3, TrendingUp, Clock, Calendar, Users, Building2,
  Download, RefreshCw, ArrowUpRight, ArrowDownRight, Layers
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

export const AnalyticsPage: React.FC = () => {
  const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [days, setDays] = useState(30);
  const [timeseries, setTimeseries] = useState<TimeSeriesPoint[]>([]);
  const [timeMetrics, setTimeMetrics] = useState<TimeMetrics | null>(null);
  const [recruiters, setRecruiters] = useState<RecruiterPerformanceItem[]>([]);
  const [clients, setClients] = useState<ClientPerformanceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const [tsRes, tmRes, recRes, cliRes] = await Promise.all([
        api.get(`/analytics/time-series?granularity=${granularity}&days=${days}`),
        api.get('/analytics/time-metrics'),
        api.get('/analytics/recruiter-scorecard'),
        api.get('/analytics/client-efficiency'),
      ]);

      setTimeseries(tsRes.data);
      setTimeMetrics(tmRes.data);
      setRecruiters(recRes.data);
      setClients(cliRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [granularity, days]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-lg">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-brand-400" />
            Time-Series Analytics & Performance Reports
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Analyze historical recruitment event series, stage latency distributions, and recruiter throughput.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Granularity Toggle */}
          <div className="bg-slate-850 border border-slate-700 p-1 rounded-xl flex items-center">
            {(['daily', 'weekly', 'monthly'] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                  granularity === g
                    ? 'bg-brand-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
          >
            <option value={14}>Last 14 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
            <option value={180}>Last 6 Months</option>
          </select>
        </div>
      </div>

      {/* Time Metrics Benchmarks Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-lg">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Time to Screen</span>
          <h3 className="text-2xl font-black text-slate-100 mt-1 font-mono">{timeMetrics?.time_to_screen_hours ?? 0}h</h3>
          <span className="text-[10px] text-slate-400 mt-1 block">From candidate creation</span>
        </div>

        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-lg">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Time to Submit</span>
          <h3 className="text-2xl font-black text-brand-400 mt-1 font-mono">{timeMetrics?.time_to_submit_hours ?? 0}h</h3>
          <span className="text-[10px] text-slate-400 mt-1 block">Average screening speed</span>
        </div>

        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-lg">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Client Response</span>
          <h3 className="text-2xl font-black text-amber-400 mt-1 font-mono">{timeMetrics?.client_response_time_days ?? 0}d</h3>
          <span className="text-[10px] text-slate-400 mt-1 block">Across all clients</span>
        </div>

        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-lg">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Time to Offer</span>
          <h3 className="text-2xl font-black text-purple-400 mt-1 font-mono">{timeMetrics?.time_to_offer_days ?? 0}d</h3>
          <span className="text-[10px] text-slate-400 mt-1 block">From initial screening</span>
        </div>

        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-lg">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Time to Fill Job</span>
          <h3 className="text-2xl font-black text-emerald-400 mt-1 font-mono">{timeMetrics?.time_to_fill_requirement_days ?? 0}d</h3>
          <span className="text-[10px] text-slate-400 mt-1 block">Mandate closure duration</span>
        </div>
      </div>

      {/* Main Multi-Metric Time Series Chart */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-100">End-to-End Candidate Progression Trends</h3>
            <p className="text-xs text-slate-400 mt-0.5">Sourcing, CV submissions, evaluations, and joinings over time</p>
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeseries}>
              <defs>
                <linearGradient id="anCands" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="anSubs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="anJoins" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Area type="monotone" dataKey="candidates_added" name="Candidates Sourced" stroke="#38bdf8" fillOpacity={1} fill="url(#anCands)" />
              <Area type="monotone" dataKey="cvs_submitted" name="CVs Submitted" stroke="#818cf8" fillOpacity={1} fill="url(#anSubs)" />
              <Area type="monotone" dataKey="interviews_held" name="Interviews Held" stroke="#f59e0b" fillOpacity={0} />
              <Area type="monotone" dataKey="joined" name="Joined" stroke="#34d399" fillOpacity={1} fill="url(#anJoins)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recruiter Throughput & Client Latency Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recruiter Scorecard */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Recruiter Scorecard</h4>
              <p className="text-[11px] text-slate-400">Total sourcing, submissions, and placements</p>
            </div>
            <Users className="w-4 h-4 text-brand-400" />
          </div>

          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
              <tr>
                <th className="px-4 py-2.5">Recruiter</th>
                <th className="px-3 py-2.5 text-center">Sourced</th>
                <th className="px-3 py-2.5 text-center">Submitted</th>
                <th className="px-3 py-2.5 text-center">Interviews</th>
                <th className="px-3 py-2.5 text-center">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {recruiters.map((r) => (
                <tr key={r.recruiter_id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-sans font-semibold text-slate-100">{r.recruiter_name}</td>
                  <td className="px-3 py-3 text-center text-slate-300">{r.candidates_added}</td>
                  <td className="px-3 py-3 text-center text-brand-300 font-bold">{r.cvs_submitted}</td>
                  <td className="px-3 py-3 text-center text-slate-300">{r.interviews}</td>
                  <td className="px-3 py-3 text-center text-emerald-400 font-bold">{r.joining_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Client Efficiency */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Client Engagement & Latency</h4>
              <p className="text-[11px] text-slate-400">Response speed & conversion to interview</p>
            </div>
            <Building2 className="w-4 h-4 text-brand-400" />
          </div>

          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
              <tr>
                <th className="px-4 py-2.5">Client Organization</th>
                <th className="px-3 py-2.5 text-center">Submissions</th>
                <th className="px-3 py-2.5 text-center">Responses</th>
                <th className="px-3 py-2.5 text-center">Avg Response</th>
                <th className="px-3 py-2.5 text-center">Hired</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {clients.map((c) => (
                <tr key={c.client_id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-sans font-semibold text-slate-100">{c.client_name}</td>
                  <td className="px-3 py-3 text-center text-slate-300">{c.cvs_submitted}</td>
                  <td className="px-3 py-3 text-center text-slate-300">{c.client_responses}</td>
                  <td className="px-3 py-3 text-center text-amber-300 font-bold">{c.avg_response_time_days} days</td>
                  <td className="px-3 py-3 text-center text-emerald-400 font-bold">{c.selections}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
