import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  CandidateHistoryPageResponse,
  CandidateStatusHistoryFeedItem,
  CandidateHistoryLifecycleItem
} from '../types';
import {
  History, CheckCircle2, XCircle, PauseCircle, CalendarCheck2, Clock,
  Users, ArrowRight, Search, Filter, Download, RefreshCw,
  Building2, Briefcase, Mail, Phone, ExternalLink,
  ChevronDown, ChevronUp, AlertCircle, FileText, ArrowUpRight,
  TrendingUp, Sparkles, Plus, Check, Eye
} from 'lucide-react';

interface CandidateHistoryPageProps {
  onViewCandidateProfile?: (candidateId: string) => void;
}

export const CandidateHistoryPage: React.FC<CandidateHistoryPageProps> = ({
  onViewCandidateProfile
}) => {
  const { token } = useAuth();
  const [data, setData] = useState<CandidateHistoryPageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusCategory, setStatusCategory] = useState<string>('all');
  const [specificStatus, setSpecificStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'feed' | 'candidates'>('feed');

  // Expanded candidate lifecycles
  const [expandedCandidates, setExpandedCandidates] = useState<Record<string, boolean>>({});

  // Quick Status Update Modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<{ id: string; name: string; currentStatus: string } | null>(null);
  const [newStatus, setNewStatus] = useState('INTERVIEW');
  const [statusRemarks, setStatusRemarks] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchHistoryFeed = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      else setRefreshing(true);

      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (statusCategory !== 'all') params.append('status_category', statusCategory);
      if (specificStatus !== 'all') params.append('status', specificStatus);
      if (dateRange !== 'all') params.append('date_range', dateRange);

      const res = await fetch(`/api/v1/candidates/history-feed?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch candidate history analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistoryFeed(true);
  }, [search, statusCategory, specificStatus, dateRange]);

  const toggleCandidateExpand = (candidateId: string) => {
    setExpandedCandidates(prev => ({
      ...prev,
      [candidateId]: !prev[candidateId]
    }));
  };

  const handleOpenStatusModal = (candidateId: string, candidateName: string, currentStatus: string) => {
    setSelectedCandidate({ id: candidateId, name: candidateName, currentStatus });
    setNewStatus(currentStatus);
    setStatusRemarks('');
    setStatusModalOpen(true);
  };

  const handleUpdateStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return;

    try {
      setUpdatingStatus(true);
      const res = await fetch(`/api/v1/candidates/${selectedCandidate.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: newStatus,
          remarks: statusRemarks.trim() || `Status updated to ${newStatus}`
        })
      });

      if (res.ok) {
        setStatusModalOpen(false);
        fetchHistoryFeed(false);
      } else {
        const errJson = await res.json().catch(() => ({}));
        alert(errJson.detail || 'Failed to update candidate status');
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Network error while updating status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleExportCSV = () => {
    if (!data || !data.feed || data.feed.length === 0) {
      alert('No history records available to export.');
      return;
    }

    const headers = [
      'Date & Time',
      'Candidate Code',
      'Candidate Name',
      'Email',
      'Phone',
      'Current Company',
      'Previous Status',
      'New Status',
      'Stage Duration (Hours)',
      'Changed By',
      'Requirement',
      'Client',
      'Remarks'
    ];

    const rows = data.feed.map(item => [
      `"${item.created_at_formatted || item.created_at}"`,
      `"${item.candidate_code}"`,
      `"${item.candidate_name}"`,
      `"${item.candidate_email}"`,
      `"${item.candidate_phone || ''}"`,
      `"${item.candidate_current_company || ''}"`,
      `"${item.old_status || 'INITIAL'}"`,
      `"${item.new_status}"`,
      `"${item.stage_duration_hours}"`,
      `"${item.changed_by_name || 'System'}"`,
      `"${item.requirement_title || ''}"`,
      `"${item.client_name || ''}"`,
      `"${(item.remarks || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Candidate_Status_History_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (statusStr: string | null | undefined) => {
    if (!statusStr) return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">None</span>;
    const st = statusStr.toUpperCase();

    if (['SELECTED', 'OFFER', 'JOINED', 'OFFERED', 'HIRED'].includes(st)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          {st}
        </span>
      );
    }
    if (['REJECTED', 'DECLINED', 'DROPPED'].includes(st)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
          <XCircle className="w-3.5 h-3.5 text-rose-400" />
          {st}
        </span>
      );
    }
    if (['ON_HOLD', 'HOLD', 'PAUSED'].includes(st)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
          <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
          {st}
        </span>
      );
    }
    if (st.includes('INTERVIEW')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
          <CalendarCheck2 className="w-3.5 h-3.5 text-purple-400" />
          {st}
        </span>
      );
    }
    if (['SHORTLISTED', 'SUBMITTED', 'SCREENED'].includes(st)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          {st}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
        {st}
      </span>
    );
  };

  const summary = data?.summary || {
    selected: 0,
    rejected: 0,
    on_hold: 0,
    in_interview: 0,
    pending: 0,
    other: 0,
    total_candidates: 0,
    total_transitions: 0,
    by_status: {}
  };

  const totalCandidates = summary.total_candidates || 1;
  const getPercentage = (count: number) => Math.round((count / totalCandidates) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 backdrop-blur-sm shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <History className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                Candidate History & Status Tracking
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Live Audit Trail
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Track candidate transitions, stage durations, and pipeline status changes across the hiring workflow.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchHistoryFeed(false)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition disabled:opacity-50"
            title="Refresh history feed"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/20 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 6 Top KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* 1. Selected */}
        <div
          onClick={() => setStatusCategory(statusCategory === 'SELECTED' ? 'all' : 'SELECTED')}
          className={`cursor-pointer bg-slate-900/80 rounded-xl p-4 border transition-all hover:scale-[1.02] ${
            statusCategory === 'SELECTED'
              ? 'border-emerald-500 bg-emerald-950/20 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/50'
              : 'border-emerald-500/30 hover:border-emerald-500/60'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Selected</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{summary.selected}</span>
            <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              {getPercentage(summary.selected)}%
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 truncate">Offer / Joined / Selected</p>
        </div>

        {/* 2. Rejected */}
        <div
          onClick={() => setStatusCategory(statusCategory === 'REJECTED' ? 'all' : 'REJECTED')}
          className={`cursor-pointer bg-slate-900/80 rounded-xl p-4 border transition-all hover:scale-[1.02] ${
            statusCategory === 'REJECTED'
              ? 'border-rose-500 bg-rose-950/20 shadow-lg shadow-rose-500/10 ring-1 ring-rose-500/50'
              : 'border-rose-500/30 hover:border-rose-500/60'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">Rejected</span>
            <div className="w-6 h-6 rounded-lg bg-rose-500/20 flex items-center justify-center">
              <XCircle className="w-3.5 h-3.5 text-rose-400" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{summary.rejected}</span>
            <span className="text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">
              {getPercentage(summary.rejected)}%
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 truncate">Screening / Client / Interview</p>
        </div>

        {/* 3. On Hold */}
        <div
          onClick={() => setStatusCategory(statusCategory === 'ON_HOLD' ? 'all' : 'ON_HOLD')}
          className={`cursor-pointer bg-slate-900/80 rounded-xl p-4 border transition-all hover:scale-[1.02] ${
            statusCategory === 'ON_HOLD'
              ? 'border-amber-500 bg-amber-950/20 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/50'
              : 'border-amber-500/30 hover:border-amber-500/60'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">On Hold</span>
            <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{summary.on_hold}</span>
            <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
              {getPercentage(summary.on_hold)}%
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 truncate">Client Hold / Paused</p>
        </div>

        {/* 4. In Interview */}
        <div
          onClick={() => setStatusCategory(statusCategory === 'IN_INTERVIEW' ? 'all' : 'IN_INTERVIEW')}
          className={`cursor-pointer bg-slate-900/80 rounded-xl p-4 border transition-all hover:scale-[1.02] ${
            statusCategory === 'IN_INTERVIEW'
              ? 'border-purple-500 bg-purple-950/20 shadow-lg shadow-purple-500/10 ring-1 ring-purple-500/50'
              : 'border-purple-500/30 hover:border-purple-500/60'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">In Interview</span>
            <div className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <CalendarCheck2 className="w-3.5 h-3.5 text-purple-400" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{summary.in_interview}</span>
            <span className="text-[11px] font-semibold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
              {getPercentage(summary.in_interview)}%
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 truncate">Rounds 1-3 In Progress</p>
        </div>

        {/* 5. Pending / In Review */}
        <div
          onClick={() => setStatusCategory(statusCategory === 'PENDING' ? 'all' : 'PENDING')}
          className={`cursor-pointer bg-slate-900/80 rounded-xl p-4 border transition-all hover:scale-[1.02] ${
            statusCategory === 'PENDING'
              ? 'border-cyan-500 bg-cyan-950/20 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/50'
              : 'border-cyan-500/30 hover:border-cyan-500/60'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">Pending</span>
            <div className="w-6 h-6 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{summary.pending}</span>
            <span className="text-[11px] font-semibold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">
              {getPercentage(summary.pending)}%
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 truncate">Received / Screened / Submitted</p>
        </div>

        {/* 6. Total Pipeline */}
        <div
          onClick={() => setStatusCategory('all')}
          className={`cursor-pointer bg-slate-900/80 rounded-xl p-4 border transition-all hover:scale-[1.02] ${
            statusCategory === 'all'
              ? 'border-indigo-500 bg-indigo-950/20 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/50'
              : 'border-slate-800 hover:border-indigo-500/50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">All Candidates</span>
            <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{summary.total_candidates}</span>
            <span className="text-[11px] font-semibold text-indigo-300 bg-indigo-500/20 px-1.5 py-0.5 rounded">
              {summary.total_transitions} Events
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 truncate">Active Talent Pool</p>
        </div>
      </div>

      {/* Filter & View Mode Toolbar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3.5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search candidate name, code, email, remarks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Controls Right */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Specific Status Selector */}
            <select
              value={specificStatus}
              onChange={(e) => setSpecificStatus(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Stage Statuses</option>
              <option value="RECEIVED">RECEIVED</option>
              <option value="SCREENED">SCREENED</option>
              <option value="SHORTLISTED">SHORTLISTED</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="INTERVIEW">INTERVIEW</option>
              <option value="SELECTED">SELECTED</option>
              <option value="OFFER">OFFER</option>
              <option value="JOINED">JOINED</option>
              <option value="ON_HOLD">ON_HOLD</option>
              <option value="REJECTED">REJECTED</option>
            </select>

            {/* Date Range Selector */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="quarter">Last 90 Days</option>
            </select>

            {/* View Mode Buttons */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1">
              <button
                onClick={() => setViewMode('feed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  viewMode === 'feed'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                📜 Status Feed
              </button>
              <button
                onClick={() => setViewMode('candidates')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  viewMode === 'candidates'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                👥 Candidate Journeys
              </button>
            </div>
          </div>
        </div>

        {/* Status Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/80">
          <span className="text-[11px] font-semibold text-slate-500 mr-1.5">Category:</span>
          {[
            { id: 'all', label: 'All Statuses', count: summary.total_candidates },
            { id: 'SELECTED', label: '🟢 Selected', count: summary.selected },
            { id: 'REJECTED', label: '🔴 Rejected', count: summary.rejected },
            { id: 'ON_HOLD', label: '🟡 On Hold', count: summary.on_hold },
            { id: 'IN_INTERVIEW', label: '🟣 In Interview', count: summary.in_interview },
            { id: 'PENDING', label: '🔵 Pending', count: summary.pending }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setStatusCategory(cat.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                statusCategory === cat.id
                  ? 'bg-slate-800 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {cat.label} ({cat.count})
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin mb-3" />
          <p className="text-sm font-semibold text-white">Loading Candidate Status History...</p>
          <p className="text-xs text-slate-400 mt-1">Aggregating date-wise transition events & candidate lifecycle records</p>
        </div>
      ) : viewMode === 'feed' ? (
        /* MODE 1: Chronological Status Feed */
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span>Date-Wise Candidate Status Changes</span>
              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[10px]">
                {data?.feed?.length || 0} Events
              </span>
            </h2>
          </div>

          {(!data?.feed || data.feed.length === 0) ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center">
              <History className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">No status history events match your criteria</h3>
              <p className="text-xs text-slate-400 mt-1">Try resetting your search filters or status selectors.</p>
              <button
                onClick={() => { setSearch(''); setStatusCategory('all'); setSpecificStatus('all'); setDateRange('all'); }}
                className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl text-xs font-bold border border-slate-700 transition"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {data.feed.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 rounded-xl p-4 transition-all hover:bg-slate-900 shadow-md space-y-3"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* Candidate identity */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 border border-slate-700 flex items-center justify-center font-bold text-sm text-cyan-300 shrink-0">
                        {item.candidate_name.charAt(0)}
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => onViewCandidateProfile && onViewCandidateProfile(item.candidate_id)}
                            className="text-sm font-bold text-white hover:text-cyan-300 flex items-center gap-1 group transition"
                          >
                            {item.candidate_name}
                            <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition" />
                          </button>
                          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                            {item.candidate_code}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                          {item.candidate_email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-500" />
                              {item.candidate_email}
                            </span>
                          )}
                          {item.candidate_current_company && (
                            <span className="flex items-center gap-1 text-slate-300">
                              <Building2 className="w-3 h-3 text-slate-500" />
                              {item.candidate_current_company}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Change Flow */}
                    <div className="flex items-center gap-2 bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800/80 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block uppercase font-medium">From</span>
                        {item.old_status ? getStatusBadge(item.old_status) : <span className="text-xs text-slate-500 font-medium italic">New Candidate</span>}
                      </div>

                      <ArrowRight className="w-4 h-4 text-cyan-400 mx-1 shrink-0" />

                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-medium">To</span>
                        {getStatusBadge(item.new_status)}
                      </div>
                    </div>
                  </div>

                  {/* Details Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-xs text-slate-400">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      {/* Date */}
                      <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        {item.created_at_formatted || new Date(item.created_at).toLocaleString()}
                      </span>

                      {/* Stage duration */}
                      {item.stage_duration_display && (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px] font-medium border border-slate-700">
                          Stage tenure: <strong className="text-white">{item.stage_duration_display}</strong>
                        </span>
                      )}

                      {/* Changed By */}
                      <span className="text-slate-400">
                        Updated by: <strong className="text-slate-200">{item.changed_by_name || 'System Automated'}</strong>
                      </span>

                      {/* Linked Requirement */}
                      {item.requirement_title && (
                        <span className="flex items-center gap-1 text-slate-300">
                          <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                          {item.requirement_title} {item.client_name ? `(${item.client_name})` : ''}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenStatusModal(item.candidate_id, item.candidate_name, item.new_status)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Update Status
                      </button>
                      {onViewCandidateProfile && (
                        <button
                          onClick={() => onViewCandidateProfile(item.candidate_id)}
                          className="px-2.5 py-1 bg-slate-800/60 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-medium transition flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          Profile
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Remarks Quote Box */}
                  {item.remarks && (
                    <div className="bg-slate-950/60 rounded-lg p-2.5 border-l-2 border-cyan-500 text-xs text-slate-300">
                      <strong className="text-cyan-400 mr-1.5 font-semibold">Notes / Feedback:</strong>
                      {item.remarks}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* MODE 2: Candidate Lifecycle Explorer */
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span>Candidate Lifecycle Progress & Journeys</span>
              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[10px]">
                {data?.candidates?.length || 0} Candidates
              </span>
            </h2>
          </div>

          {(!data?.candidates || data.candidates.length === 0) ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">No candidate lifecycle records found</h3>
              <p className="text-xs text-slate-400 mt-1">Adjust your filters to see candidate career pipelines.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.candidates.map((cand) => {
                const isExpanded = !!expandedCandidates[cand.candidate_id];
                return (
                  <div
                    key={cand.candidate_id}
                    className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md"
                  >
                    {/* Header Row */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md">
                          {cand.candidate_name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3
                              onClick={() => onViewCandidateProfile && onViewCandidateProfile(cand.candidate_id)}
                              className="text-base font-bold text-white hover:text-cyan-300 cursor-pointer transition flex items-center gap-1"
                            >
                              {cand.candidate_name}
                            </h3>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-950 text-slate-400 border border-slate-800 rounded">
                              {cand.candidate_code}
                            </span>
                            {getStatusBadge(cand.current_status)}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-0.5">
                            <span>{cand.candidate_email}</span>
                            {cand.candidate_phone && <span>• {cand.candidate_phone}</span>}
                            {cand.candidate_current_company && <span>• <strong className="text-slate-300">{cand.candidate_current_company}</strong></span>}
                          </div>
                        </div>
                      </div>

                      {/* Pipeline Metrics & Expand Button */}
                      <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Stage Events</span>
                          <span className="text-xs font-bold text-white">{cand.transitions_count} transitions</span>
                        </div>
                        <div className="text-right hidden sm:block pl-3 border-l border-slate-800">
                          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Pipeline Duration</span>
                          <span className="text-xs font-bold text-cyan-300">{cand.total_pipeline_days} days</span>
                        </div>

                        <button
                          onClick={() => handleOpenStatusModal(cand.candidate_id, cand.candidate_name, cand.current_status)}
                          className="px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold transition"
                        >
                          Change Status
                        </button>

                        <button
                          onClick={() => toggleCandidateExpand(cand.candidate_id)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                        >
                          <span>{isExpanded ? 'Hide Steps' : 'View Timeline'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Step-by-Step Chronological Journey */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-slate-800/80 space-y-3 bg-slate-950/60 p-4 rounded-xl">
                        <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5" />
                          Complete Status Journey ({cand.history_events.length} Steps)
                        </h4>

                        <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                          {cand.history_events.map((ev, idx) => (
                            <div key={ev.id} className="relative group">
                              {/* Dot */}
                              <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-slate-900 border-2 border-cyan-500 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                              </div>

                              <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl space-y-1.5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-white">Step {cand.history_events.length - idx}:</span>
                                    {getStatusBadge(ev.new_status)}
                                    {ev.old_status && (
                                      <span className="text-[11px] text-slate-500">
                                        (from {ev.old_status})
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-slate-400 font-medium">
                                    {ev.created_at_formatted || new Date(ev.created_at).toLocaleString()}
                                  </span>
                                </div>

                                {ev.remarks && (
                                  <p className="text-xs text-slate-300 italic bg-slate-950/60 px-2.5 py-1.5 rounded-lg border border-slate-800">
                                    "{ev.remarks}"
                                  </p>
                                )}

                                <div className="flex flex-wrap items-center gap-x-4 text-[11px] text-slate-500 pt-0.5">
                                  <span>By: <strong className="text-slate-300">{ev.changed_by_name || 'System'}</strong></span>
                                  {ev.stage_duration_display && (
                                    <span>Duration: <strong className="text-slate-300">{ev.stage_duration_display}</strong></span>
                                  )}
                                  {ev.requirement_title && (
                                    <span>Req: <strong className="text-indigo-400">{ev.requirement_title}</strong></span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Quick Status Update Modal */}
      {statusModalOpen && selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scaleIn">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <History className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Update Candidate Status</h3>
                  <p className="text-xs text-slate-400">Record a new transition and log stage duration</p>
                </div>
              </div>
              <button
                onClick={() => setStatusModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateStatusSubmit} className="p-6 space-y-4">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Candidate</span>
                <p className="text-sm font-bold text-white">{selectedCandidate.name}</p>
                <div className="flex items-center gap-1.5 pt-1 text-xs text-slate-400">
                  <span>Current Status:</span>
                  {getStatusBadge(selectedCandidate.currentStatus)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Select New Status *
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 font-semibold"
                  required
                >
                  <option value="RECEIVED">RECEIVED (Initial Sourcing)</option>
                  <option value="SCREENED">SCREENED (HR Preliminary Passed)</option>
                  <option value="SHORTLISTED">SHORTLISTED (Manager Review)</option>
                  <option value="SUBMITTED">SUBMITTED (Sent to Client)</option>
                  <option value="INTERVIEW">INTERVIEW (Interview Scheduled / Rounds)</option>
                  <option value="SELECTED">SELECTED (Interview Passed / Offer Prep)</option>
                  <option value="OFFER">OFFER (Offer Extended)</option>
                  <option value="JOINED">JOINED (Candidate Onboarded)</option>
                  <option value="ON_HOLD">ON_HOLD (Position / Client Hold)</option>
                  <option value="REJECTED">REJECTED (Disqualified / Declined)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Status Change Remarks / Feedback
                </label>
                <textarea
                  value={statusRemarks}
                  onChange={(e) => setStatusRemarks(e.target.value)}
                  placeholder="Provide interview notes, client feedback, or transition justification..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStatusModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingStatus}
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-600/30 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {updatingStatus ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{updatingStatus ? 'Updating...' : 'Confirm Status Change'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
