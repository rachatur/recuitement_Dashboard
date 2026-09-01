import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { WeeklyHRReportResponse, User } from '../types';
import {
  Calendar, FileText, Download, Printer, RefreshCw, Filter,
  Users, Send, CheckCircle2, XCircle, Clock, CalendarDays,
  Award, UserCheck, PauseCircle, TrendingUp, BarChart3,
  Layers, ChevronLeft, ChevronRight, Briefcase, Building,
  ArrowUpRight, PieChart, Sparkles, Check, UserPlus, Shield
} from 'lucide-react';

interface WeeklyHRReportPageProps {
  onViewCandidateProfile?: (candidateId: string) => void;
}

export const WeeklyHRReportPage: React.FC<WeeklyHRReportPageProps> = ({
  onViewCandidateProfile
}) => {
  const { token, user } = useAuth();
  const [report, setReport] = useState<WeeklyHRReportResponse | null>(null);
  const [recruiters, setRecruiters] = useState<User[]>([]);
  const [selectedRecruiterId, setSelectedRecruiterId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchRecruiters = async () => {
    try {
      const res = await apiFetch('/api/v1/users/recruiters', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRecruiters(data);
      }
    } catch (e) {
      console.error('Failed to fetch recruiters list', e);
    }
  };

  const fetchWeeklyReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (useCustomRange && startDate && endDate) {
        params.append('start_date', startDate);
        params.append('end_date', endDate);
      } else {
        params.append('week_offset', weekOffset.toString());
      }
      if (selectedRecruiterId) {
        params.append('recruiter_id', selectedRecruiterId);
      }

      const res = await apiFetch(`/api/v1/analytics/weekly-hr-report?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data: WeeklyHRReportResponse = await res.json();
        setReport(data);
        if (!useCustomRange) {
          setStartDate(data.start_date);
          setEndDate(data.end_date);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.detail || 'Failed to load Weekly HR Report data.');
      }
    } catch (err: any) {
      console.error('Failed to fetch weekly HR report:', err);
      setError(err?.message || 'Network error fetching Weekly HR Report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecruiters();
  }, []);

  useEffect(() => {
    fetchWeeklyReport();
  }, [weekOffset, useCustomRange, selectedRecruiterId]);

  const handleApplyCustomDate = (e: React.FormEvent) => {
    e.preventDefault();
    if (startDate && endDate) {
      setUseCustomRange(true);
      fetchWeeklyReport();
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12 print:p-0 print:m-0">
      {/* Top Banner & Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 backdrop-blur-sm shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                Weekly HR Recruitment Report
                <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
                  {report?.week_label || 'Weekly Analytics'}
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Track weekly sourcing, submissions, interviews, selection rates, and HR recruiter activity updates.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 print:hidden">
          <button
            onClick={() => fetchWeeklyReport()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button
            onClick={handlePrintReport}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/20 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Export PDF</span>
          </button>
        </div>
      </div>

      {/* Week & HR Filter Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg print:hidden space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Quick Week Select Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => { setUseCustomRange(false); setWeekOffset(0); }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                !useCustomRange && weekOffset === 0
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 border border-blue-400/40'
                  : 'bg-slate-950 text-slate-300 border border-slate-800 hover:bg-slate-800 hover:text-white'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => { setUseCustomRange(false); setWeekOffset(-1); }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                !useCustomRange && weekOffset === -1
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 border border-blue-400/40'
                  : 'bg-slate-950 text-slate-300 border border-slate-800 hover:bg-slate-800 hover:text-white'
              }`}
            >
              Last Week
            </button>
            <button
              onClick={() => { setUseCustomRange(false); setWeekOffset(-2); }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                !useCustomRange && weekOffset === -2
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 border border-blue-400/40'
                  : 'bg-slate-950 text-slate-300 border border-slate-800 hover:bg-slate-800 hover:text-white'
              }`}
            >
              2 Weeks Ago
            </button>
            <button
              onClick={() => { setUseCustomRange(false); setWeekOffset(-3); }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                !useCustomRange && weekOffset === -3
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 border border-blue-400/40'
                  : 'bg-slate-950 text-slate-300 border border-slate-800 hover:bg-slate-800 hover:text-white'
              }`}
            >
              3 Weeks Ago
            </button>

            {/* Stepper Navigation */}
            <div className="flex items-center ml-2 border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
              <button
                onClick={() => { setUseCustomRange(false); setWeekOffset(prev => prev - 1); }}
                className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Previous Week"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-xs font-semibold text-slate-300 border-x border-slate-800 py-1.5 bg-slate-900/80">
                {!useCustomRange
                  ? (weekOffset === 0 ? 'Current' : weekOffset === -1 ? 'Last Wk' : `${Math.abs(weekOffset)}w Ago`)
                  : 'Custom'}
              </span>
              <button
                onClick={() => { setUseCustomRange(false); setWeekOffset(prev => Math.min(0, prev + 1)); }}
                disabled={weekOffset >= 0}
                className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                title="Next Week"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* HR Recruiter Selector & Custom Date */}
          <div className="flex flex-wrap items-center gap-3">
            {/* HR / Recruiter Filter */}
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-slate-400 font-medium">HR:</span>
              <select
                value={selectedRecruiterId}
                onChange={(e) => setSelectedRecruiterId(e.target.value)}
                className="bg-transparent text-slate-200 focus:outline-none font-semibold text-xs cursor-pointer"
              >
                <option value="" className="bg-slate-900 text-slate-200">All HRs & Recruiters</option>
                {recruiters.map((r) => (
                  <option key={r.id} value={r.id} className="bg-slate-900 text-slate-200">
                    {r.full_name || r.email} ({r.role?.replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Date Range Picker */}
            <form onSubmit={handleApplyCustomDate} className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
              <span className="text-slate-500 text-xs font-semibold">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow transition"
              >
                Apply
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/80 rounded-2xl flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <p className="font-bold text-rose-200">Failed to load Weekly Report</p>
              <p className="text-rose-400">{error}</p>
            </div>
          </div>
          <button
            onClick={() => fetchWeeklyReport()}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold shrink-0 shadow-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state indicator */}
      {loading && !report && (
        <div className="py-24 text-center bg-slate-900/60 rounded-2xl border border-slate-800 shadow-xl">
          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-200">Loading Weekly HR Recruitment Analytics...</p>
          <p className="text-xs text-slate-500 mt-1">Aggregating sourcing, submissions, interviews, and offers for this period.</p>
        </div>
      )}

      {/* 9 Highlight Metric KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* 1. Total Candidates */}
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-blue-500/30 hover:border-blue-500/60 shadow-lg relative overflow-hidden group transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
              Total Candidates
            </span>
            <div className="p-1.5 bg-blue-500/20 text-blue-300 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">
            {report?.total_candidates ?? 0}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Sourced this period</p>
        </div>

        {/* 2. CVs Submitted */}
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-indigo-500/30 hover:border-indigo-500/60 shadow-lg relative overflow-hidden group transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
              CVs Submitted
            </span>
            <div className="p-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">
            {report?.cvs_submitted ?? 0}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Sent to client roles</p>
        </div>

        {/* 3. Candidates Selected */}
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-emerald-500/30 hover:border-emerald-500/60 shadow-lg relative overflow-hidden group transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              Selected
            </span>
            <div className="p-1.5 bg-emerald-500/20 text-emerald-300 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {report?.candidates_selected ?? 0}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Shortlisted / Chosen</p>
        </div>

        {/* 4. Candidates Rejected */}
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-rose-500/30 hover:border-rose-500/60 shadow-lg relative overflow-hidden group transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
              Rejected
            </span>
            <div className="p-1.5 bg-rose-500/20 text-rose-300 rounded-lg">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-400">
            {report?.candidates_rejected ?? 0}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Not shortlisted</p>
        </div>

        {/* 5. Interviews Scheduled */}
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-violet-500/30 hover:border-violet-500/60 shadow-lg relative overflow-hidden group transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-violet-400">
              Scheduled
            </span>
            <div className="p-1.5 bg-violet-500/20 text-violet-300 rounded-lg">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">
            {report?.interviews_scheduled ?? 0}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Interviews lined up</p>
        </div>

        {/* 6. Interviews Completed */}
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-teal-500/30 hover:border-teal-500/60 shadow-lg relative overflow-hidden group transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400">
              Completed
            </span>
            <div className="p-1.5 bg-teal-500/20 text-teal-300 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-teal-400">
            {report?.interviews_completed ?? 0}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Rounds finished</p>
        </div>

        {/* 7. Candidates Hired */}
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-green-500/30 hover:border-green-500/60 shadow-lg relative overflow-hidden group transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-green-400">
              Hired
            </span>
            <div className="p-1.5 bg-green-500/20 text-green-300 rounded-lg">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-green-400">
            {report?.candidates_hired ?? 0}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Offers accepted</p>
        </div>

        {/* 8. Candidates On Hold */}
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-amber-500/30 hover:border-amber-500/60 shadow-lg relative overflow-hidden group transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              On Hold
            </span>
            <div className="p-1.5 bg-amber-500/20 text-amber-300 rounded-lg">
              <PauseCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-400">
            {report?.candidates_on_hold ?? 0}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Pending client decision</p>
        </div>

        {/* 9. Candidates Joined */}
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-cyan-500/30 hover:border-cyan-500/60 shadow-lg relative overflow-hidden col-span-2 sm:col-span-1 group transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
              Joined
            </span>
            <div className="p-1.5 bg-cyan-500/20 text-cyan-300 rounded-lg">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-cyan-400">
            {report?.candidates_joined ?? 0}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Onboarded employees</p>
        </div>
      </div>

      {/* HR Recruiter Weekly Performance & Activity Breakdown Section */}
      <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                HR Recruiter Weekly Updates & Sourcing Breakdown
              </h3>
              <p className="text-xs text-slate-400">
                Performance throughput and weekly candidate updates by each HR team member.
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-400">
            {report?.top_recruiters?.length || 0} HR Recruiters Tracked
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
          {report?.top_recruiters && report.top_recruiters.length > 0 ? (
            report.top_recruiters.map((rec, idx) => {
              const isCurrentFilter = selectedRecruiterId === rec.recruiter_id;
              return (
                <div
                  key={idx}
                  onClick={() => setSelectedRecruiterId(isCurrentFilter ? '' : rec.recruiter_id)}
                  className={`cursor-pointer bg-slate-950 p-4 rounded-xl border transition-all ${
                    isCurrentFilter
                      ? 'border-indigo-500 bg-indigo-950/20 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/40'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white font-bold text-xs">
                        {rec.recruiter_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-white truncate max-w-[140px]">
                          {rec.recruiter_name}
                        </h4>
                        <span className="text-[10px] text-indigo-400 block font-medium">
                          HR Recruiter
                        </span>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] font-bold rounded border border-slate-700">
                      Rank #{idx + 1}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-800/80">
                    <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/60">
                      <span className="text-[10px] text-slate-400 block">Sourced</span>
                      <span className="text-sm font-black text-blue-400">{rec.candidates_sourced}</span>
                    </div>
                    <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/60">
                      <span className="text-[10px] text-slate-400 block">Submitted</span>
                      <span className="text-sm font-black text-indigo-400">{rec.cvs_submitted}</span>
                    </div>
                    <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/60">
                      <span className="text-[10px] text-slate-400 block">Selected</span>
                      <span className="text-sm font-black text-emerald-400">{rec.selected}</span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-3 text-center py-6 text-slate-500 text-xs">
              No recruiter activity recorded in this date range.
            </div>
          )}
        </div>
      </div>

      {/* Visual Charts & Funnel Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Day-by-Day Activity Chart */}
        <div className="lg:col-span-2 bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                Day-by-Day Weekly Activity Distribution
              </h3>
              <p className="text-xs text-slate-400">
                Daily breakdown of candidates sourced, CVs submitted, interviews, and selections.
              </p>
            </div>
            <div className="flex items-center gap-2.5 text-xs">
              <span className="flex items-center gap-1 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Sourced
              </span>
              <span className="flex items-center gap-1 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Submissions
              </span>
              <span className="flex items-center gap-1 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-500" /> Interviews
              </span>
              <span className="flex items-center gap-1 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Selected
              </span>
            </div>
          </div>

          <div className="pt-6">
            {report?.daily_breakdown && report.daily_breakdown.length > 0 ? (
              <div className="grid grid-cols-7 gap-2.5">
                {report.daily_breakdown.map((day, idx) => {
                  const maxVal = Math.max(
                    ...report.daily_breakdown.map(d => Math.max(d.candidates_added, d.cvs_submitted, d.interviews_scheduled, d.selected)),
                    5
                  );
                  return (
                    <div key={idx} className="flex flex-col items-center">
                      <div className="h-44 w-full bg-slate-950/80 border border-slate-800 rounded-xl p-1.5 flex items-end justify-center gap-1 relative group">
                        {/* Candidates added bar */}
                        <div
                          style={{ height: `${Math.min(100, (day.candidates_added / maxVal) * 100)}%` }}
                          className="w-2 bg-blue-500 rounded-t-sm transition-all group-hover:brightness-125 min-h-[4px]"
                          title={`Sourced: ${day.candidates_added}`}
                        />
                        {/* Submissions bar */}
                        <div
                          style={{ height: `${Math.min(100, (day.cvs_submitted / maxVal) * 100)}%` }}
                          className="w-2 bg-indigo-500 rounded-t-sm transition-all group-hover:brightness-125 min-h-[4px]"
                          title={`Submissions: ${day.cvs_submitted}`}
                        />
                        {/* Interviews scheduled bar */}
                        <div
                          style={{ height: `${Math.min(100, (day.interviews_scheduled / maxVal) * 100)}%` }}
                          className="w-2 bg-violet-500 rounded-t-sm transition-all group-hover:brightness-125 min-h-[4px]"
                          title={`Interviews: ${day.interviews_scheduled}`}
                        />
                        {/* Selections bar */}
                        <div
                          style={{ height: `${Math.min(100, (day.selected / maxVal) * 100)}%` }}
                          className="w-2 bg-emerald-500 rounded-t-sm transition-all group-hover:brightness-125 min-h-[4px]"
                          title={`Selected: ${day.selected}`}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-slate-200 mt-2">
                        {day.day_name.split(' ')[0]}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {day.day_name.split(' ')[1] || ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-44 flex items-center justify-center text-slate-500 text-xs">
                No activity recorded for this period.
              </div>
            )}
          </div>
        </div>

        {/* Recruitment Pipeline Funnel */}
        <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-lg flex flex-col justify-between">
          <div>
            <div className="pb-4 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                Pipeline Conversion Funnel
              </h3>
              <p className="text-xs text-slate-400">
                Conversion rate through each recruitment milestone.
              </p>
            </div>

            <div className="space-y-3.5 pt-4">
              {report?.pipeline_funnel?.map((step, idx) => {
                const colors = [
                  'bg-blue-500',
                  'bg-indigo-500',
                  'bg-violet-500',
                  'bg-emerald-500',
                  'bg-green-500',
                  'bg-cyan-500'
                ];
                const color = colors[idx % colors.length];

                return (
                  <div key={idx}>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-300">{step.stage}</span>
                      <span className="text-white font-bold">
                        {step.count} <span className="text-slate-400 font-normal text-[11px]">({step.conversion_rate}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                      <div
                        style={{ width: `${Math.min(100, Math.max(6, step.conversion_rate))}%` }}
                        className={`h-full ${color} rounded-full transition-all duration-500`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 mt-4">
            <div className="bg-blue-950/30 p-3 rounded-xl border border-blue-800/40 flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-blue-400 shrink-0" />
              <p className="text-xs text-blue-300">
                <strong>Weekly Throughput:</strong> {report?.total_candidates ? ((report.candidates_joined / report.total_candidates) * 100).toFixed(1) : 0}% candidate-to-join ratio this period.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Positions & Submissions Log with HR Recruiter Tracking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Demanded Job Titles */}
        <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-lg">
          <h3 className="font-bold text-sm text-white flex items-center gap-2 pb-3 border-b border-slate-800">
            <Briefcase className="w-4 h-4 text-blue-400" />
            Top Sourced Positions
          </h3>

          <div className="space-y-2.5 pt-4">
            {report?.top_positions && report.top_positions.length > 0 ? (
              report.top_positions.map((pos, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-blue-500/40 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-300 font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-slate-200 line-clamp-1">
                      {pos.position}
                    </span>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-blue-500/10 text-blue-300 border border-blue-500/30">
                    {pos.count} candidates
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500 text-xs">
                No position data for this period.
              </div>
            )}
          </div>
        </div>

        {/* Weekly Submissions Log */}
        <div className="lg:col-span-2 bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Building className="w-4 h-4 text-indigo-400" />
              Weekly Client Submissions & HR Activity Log
            </h3>
            <span className="text-xs text-slate-400">
              Showing latest {report?.recent_submissions?.length || 0} submissions
            </span>
          </div>

          <div className="overflow-x-auto pt-3">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 rounded-l-lg">Code</th>
                  <th className="py-2.5 px-3">Candidate</th>
                  <th className="py-2.5 px-3">Position</th>
                  <th className="py-2.5 px-3">Client</th>
                  <th className="py-2.5 px-3">Submitted By (HR)</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 rounded-r-lg text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {report?.recent_submissions && report.recent_submissions.length > 0 ? (
                  report.recent_submissions.map((sub, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-blue-400">
                        {sub.submission_code}
                      </td>
                      <td className="py-3 px-3 font-medium text-white">
                        {sub.candidate_name}
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {sub.position}
                      </td>
                      <td className="py-3 px-3 text-slate-400">
                        {sub.client_name}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px] font-semibold">
                          <Users className="w-3 h-3 text-indigo-400" />
                          {sub.recruiter_name || 'HR Recruiter'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          sub.status === 'SELECTED' || sub.status === 'JOINED' || sub.status === 'OFFER'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : sub.status === 'REJECTED'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : sub.status === 'INTERVIEW' || sub.status === 'SHORTLISTED'
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                            : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        }`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-slate-400">
                        {sub.date}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                      No submissions logged in this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
