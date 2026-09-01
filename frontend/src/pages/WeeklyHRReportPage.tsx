import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { WeeklyHRReportResponse } from '../types';
import {
  Calendar, FileText, Download, Printer, RefreshCw, Filter,
  Users, Send, CheckCircle2, XCircle, Clock, CalendarDays,
  Award, UserCheck, PauseCircle, TrendingUp, BarChart3,
  Layers, ChevronLeft, ChevronRight, Briefcase, Building,
  ArrowUpRight, PieChart, Sparkles
} from 'lucide-react';

interface WeeklyHRReportPageProps {
  onViewCandidateProfile?: (candidateId: string) => void;
}

export const WeeklyHRReportPage: React.FC<WeeklyHRReportPageProps> = ({
  onViewCandidateProfile
}) => {
  const { token, user } = useAuth();
  const [report, setReport] = useState<WeeklyHRReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchWeeklyReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (useCustomRange && startDate && endDate) {
        params.append('start_date', startDate);
        params.append('end_date', endDate);
      } else {
        params.append('week_offset', weekOffset.toString());
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
      }
    } catch (err) {
      console.error('Failed to fetch weekly HR report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeeklyReport();
  }, [weekOffset, useCustomRange]);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-xl shadow-md shadow-blue-500/20">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                Weekly HR Report
                <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {report?.week_label || 'Recruitment Analytics'}
                </span>
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Weekly recruitment velocity, candidate progression, interview throughput, and hiring outcomes.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 print:hidden">
          <button
            onClick={() => fetchWeeklyReport()}
            disabled={loading}
            className="p-2.5 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-700 dark:text-gray-300 transition-colors shadow-sm"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handlePrintReport}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Export PDF</span>
          </button>
        </div>
      </div>

      {/* Week Selector Toolbar */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-200/80 dark:border-gray-800 shadow-sm print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Quick Week Select Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => { setUseCustomRange(false); setWeekOffset(0); }}
              className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                !useCustomRange && weekOffset === 0
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => { setUseCustomRange(false); setWeekOffset(-1); }}
              className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                !useCustomRange && weekOffset === -1
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Last Week
            </button>
            <button
              onClick={() => { setUseCustomRange(false); setWeekOffset(-2); }}
              className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                !useCustomRange && weekOffset === -2
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              2 Weeks Ago
            </button>
            <button
              onClick={() => { setUseCustomRange(false); setWeekOffset(-3); }}
              className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                !useCustomRange && weekOffset === -3
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              3 Weeks Ago
            </button>

            {/* Stepper Navigation */}
            <div className="flex items-center ml-2 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <button
                onClick={() => { setUseCustomRange(false); setWeekOffset(prev => prev - 1); }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
                title="Previous Week"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-xs font-semibold text-gray-600 dark:text-gray-400 border-x border-gray-200 dark:border-gray-700 py-2 bg-gray-50 dark:bg-gray-800/50">
                {!useCustomRange
                  ? (weekOffset === 0 ? 'Current Week' : weekOffset === -1 ? 'Last Week' : `${Math.abs(weekOffset)}w Ago`)
                  : 'Custom Range'}
              </span>
              <button
                onClick={() => { setUseCustomRange(false); setWeekOffset(prev => Math.min(0, prev + 1)); }}
                disabled={weekOffset >= 0}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 disabled:opacity-30 transition-colors"
                title="Next Week"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Custom Date Range Picker */}
          <form onSubmit={handleApplyCustomDate} className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium">
              <Calendar className="w-3.5 h-3.5" />
              <span>Custom Date:</span>
            </div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-400 text-xs font-semibold">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              Apply
            </button>
          </form>
        </div>
      </div>

      {/* 9 Highlight Metric KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* 1. Total Candidates */}
        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-blue-200/60 dark:border-blue-900/30 shadow-sm relative overflow-hidden group hover:border-blue-400 transition-all">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-bl-full pointer-events-none transition-all group-hover:scale-110" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Total Candidates
            </span>
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {report?.total_candidates ?? 0}
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Sourced this period</p>
        </div>

        {/* 2. CVs Submitted */}
        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-indigo-200/60 dark:border-indigo-900/30 shadow-sm relative overflow-hidden group hover:border-indigo-400 transition-all">
          <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/10 rounded-bl-full pointer-events-none transition-all group-hover:scale-110" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              CVs Submitted
            </span>
            <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {report?.cvs_submitted ?? 0}
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Sent to client roles</p>
        </div>

        {/* 3. Candidates Selected */}
        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/30 shadow-sm relative overflow-hidden group hover:border-emerald-400 transition-all">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-bl-full pointer-events-none transition-all group-hover:scale-110" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Selected
            </span>
            <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {report?.candidates_selected ?? 0}
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Shortlisted / Chosen</p>
        </div>

        {/* 4. Candidates Rejected */}
        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-rose-200/60 dark:border-rose-900/30 shadow-sm relative overflow-hidden group hover:border-rose-400 transition-all">
          <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/10 rounded-bl-full pointer-events-none transition-all group-hover:scale-110" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Rejected
            </span>
            <div className="p-1.5 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-lg">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
            {report?.candidates_rejected ?? 0}
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Not shortlisted</p>
        </div>

        {/* 5. Interviews Scheduled */}
        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-violet-200/60 dark:border-violet-900/30 shadow-sm relative overflow-hidden group hover:border-violet-400 transition-all">
          <div className="absolute top-0 right-0 w-16 h-16 bg-violet-500/10 rounded-bl-full pointer-events-none transition-all group-hover:scale-110" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
              Scheduled
            </span>
            <div className="p-1.5 bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 rounded-lg">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {report?.interviews_scheduled ?? 0}
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Interviews lined up</p>
        </div>

        {/* 6. Interviews Completed */}
        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-teal-200/60 dark:border-teal-900/30 shadow-sm relative overflow-hidden group hover:border-teal-400 transition-all">
          <div className="absolute top-0 right-0 w-16 h-16 bg-teal-500/10 rounded-bl-full pointer-events-none transition-all group-hover:scale-110" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Completed
            </span>
            <div className="p-1.5 bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {report?.interviews_completed ?? 0}
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Rounds finished</p>
        </div>

        {/* 7. Candidates Hired */}
        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-green-200/60 dark:border-green-900/30 shadow-sm relative overflow-hidden group hover:border-green-400 transition-all">
          <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/10 rounded-bl-full pointer-events-none transition-all group-hover:scale-110" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-green-600 dark:text-green-400">
              Hired
            </span>
            <div className="p-1.5 bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 rounded-lg">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {report?.candidates_hired ?? 0}
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Offers accepted</p>
        </div>

        {/* 8. Candidates On Hold */}
        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-amber-200/60 dark:border-amber-900/30 shadow-sm relative overflow-hidden group hover:border-amber-400 transition-all">
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-bl-full pointer-events-none transition-all group-hover:scale-110" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              On Hold
            </span>
            <div className="p-1.5 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-lg">
              <PauseCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {report?.candidates_on_hold ?? 0}
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Pending client decision</p>
        </div>

        {/* 9. Candidates Joined */}
        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-cyan-200/60 dark:border-cyan-900/30 shadow-sm relative overflow-hidden col-span-2 sm:col-span-1 group hover:border-cyan-400 transition-all">
          <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/10 rounded-bl-full pointer-events-none transition-all group-hover:scale-110" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
              Joined
            </span>
            <div className="p-1.5 bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400 rounded-lg">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
            {report?.candidates_joined ?? 0}
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Onboarded employees</p>
        </div>
      </div>

      {/* Visual Charts & Funnel Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Day-by-Day Activity Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800 gap-2">
            <div>
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Day-by-Day Weekly Activity Distribution
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Daily breakdown of candidates sourced, CVs submitted, interviews, and selections.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Sourced
              </span>
              <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Submissions
              </span>
              <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-500" /> Interviews
              </span>
              <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
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
                      <div className="h-44 w-full bg-gray-50 dark:bg-gray-800/40 rounded-xl p-1.5 flex items-end justify-center gap-1 relative group">
                        {/* Candidates added bar */}
                        <div
                          style={{ height: `${Math.min(100, (day.candidates_added / maxVal) * 100)}%` }}
                          className="w-2 bg-blue-500 rounded-t-sm transition-all group-hover:brightness-110 min-h-[4px]"
                          title={`Sourced: ${day.candidates_added}`}
                        />
                        {/* Submissions bar */}
                        <div
                          style={{ height: `${Math.min(100, (day.cvs_submitted / maxVal) * 100)}%` }}
                          className="w-2 bg-indigo-500 rounded-t-sm transition-all group-hover:brightness-110 min-h-[4px]"
                          title={`Submissions: ${day.cvs_submitted}`}
                        />
                        {/* Interviews scheduled bar */}
                        <div
                          style={{ height: `${Math.min(100, (day.interviews_scheduled / maxVal) * 100)}%` }}
                          className="w-2 bg-violet-500 rounded-t-sm transition-all group-hover:brightness-110 min-h-[4px]"
                          title={`Interviews: ${day.interviews_scheduled}`}
                        />
                        {/* Selections bar */}
                        <div
                          style={{ height: `${Math.min(100, (day.selected / maxVal) * 100)}%` }}
                          className="w-2 bg-emerald-500 rounded-t-sm transition-all group-hover:brightness-110 min-h-[4px]"
                          title={`Selected: ${day.selected}`}
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-2">
                        {day.day_name.split(' ')[0]}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {day.day_name.split(' ')[1] || ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-44 flex items-center justify-center text-gray-400 text-sm">
                No activity recorded for this period.
              </div>
            )}
          </div>
        </div>

        {/* Recruitment Pipeline Funnel */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="pb-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                Pipeline Conversion Funnel
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Conversion rate through each recruitment milestone.
              </p>
            </div>

            <div className="space-y-3.5 pt-4">
              {report?.pipeline_funnel?.map((step, idx) => {
                const colors = [
                  'bg-blue-500 text-blue-600',
                  'bg-indigo-500 text-indigo-600',
                  'bg-violet-500 text-violet-600',
                  'bg-emerald-500 text-emerald-600',
                  'bg-green-500 text-green-600',
                  'bg-cyan-500 text-cyan-600'
                ];
                const color = colors[idx % colors.length];

                return (
                  <div key={idx}>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-gray-700 dark:text-gray-300">{step.stage}</span>
                      <span className="text-gray-900 dark:text-white font-bold">
                        {step.count} <span className="text-gray-400 font-normal text-[11px]">({step.conversion_rate}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${Math.min(100, Math.max(6, step.conversion_rate))}%` }}
                        className={`h-full ${color.split(' ')[0]} rounded-full transition-all duration-500`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 mt-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30 flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
              <p className="text-xs text-blue-800 dark:text-blue-300">
                <strong>Overall Conversion:</strong> {report?.total_candidates ? ((report.candidates_joined / report.total_candidates) * 100).toFixed(1) : 0}% candidate-to-join ratio this week.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Positions & Recent Submissions Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Demanded Job Titles */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm">
          <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-800">
            <Briefcase className="w-5 h-5 text-blue-600" />
            Top Sourced Positions
          </h3>

          <div className="space-y-3 pt-4">
            {report?.top_positions && report.top_positions.length > 0 ? (
              report.top_positions.map((pos, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 line-clamp-1">
                      {pos.position}
                    </span>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    {pos.count} candidates
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400 text-xs">
                No position data for this period.
              </div>
            )}
          </div>
        </div>

        {/* Weekly Submissions Log */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
              <Building className="w-5 h-5 text-indigo-600" />
              Weekly Client Submissions & Outreaches
            </h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Showing latest {report?.recent_submissions?.length || 0} submissions
            </span>
          </div>

          <div className="overflow-x-auto pt-3">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3 rounded-l-lg">Code</th>
                  <th className="py-2.5 px-3">Candidate</th>
                  <th className="py-2.5 px-3">Position</th>
                  <th className="py-2.5 px-3">Client</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 rounded-r-lg text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {report?.recent_submissions && report.recent_submissions.length > 0 ? (
                  report.recent_submissions.map((sub, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {sub.submission_code}
                      </td>
                      <td className="py-3 px-3 font-medium text-gray-900 dark:text-white">
                        {sub.candidate_name}
                      </td>
                      <td className="py-3 px-3 text-gray-700 dark:text-gray-300">
                        {sub.position}
                      </td>
                      <td className="py-3 px-3 text-gray-600 dark:text-gray-400">
                        {sub.client_name}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          sub.status === 'SELECTED' || sub.status === 'JOINED' || sub.status === 'OFFER'
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                            : sub.status === 'REJECTED'
                            ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'
                            : sub.status === 'INTERVIEW' || sub.status === 'SHORTLISTED'
                            ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        }`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-gray-400">
                        {sub.date}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400 text-xs">
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
