import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import {
  BenchCandidate, BenchStatus, JobRequirement, RequirementMatchResult, RequirementMatchCandidate
} from '../types';
import {
  Award, Search, Filter, Download, MessageSquare,
  CheckCircle2, XCircle, AlertCircle, Phone, Mail,
  MapPin, Calendar, RefreshCw, Send, Check, Sparkles,
  ArrowRight, Users
} from 'lucide-react';

interface BenchPageProps {
  onNavigateToCampaigns?: (candidateIds: string[], requirementId?: string) => void;
  onViewCandidateProfile?: (candidateId: string) => void;
}

export const BenchPage: React.FC<BenchPageProps> = ({
  onNavigateToCampaigns,
  onViewCandidateProfile
}) => {
  const { token } = useAuth();
  const [candidates, setCandidates] = useState<BenchCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [waEligibleOnly, setWaEligibleOnly] = useState(false);

  // Status Modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<BenchCandidate | null>(null);
  const [newStatus, setNewStatus] = useState<BenchStatus>('AVAILABLE');
  const [statusNotes, setStatusNotes] = useState('');

  // Requirement Matcher Modal
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [requirements, setRequirements] = useState<JobRequirement[]>([]);
  const [selectedRequirementId, setSelectedRequirementId] = useState<string>('');
  const [matchResult, setMatchResult] = useState<RequirementMatchResult | null>(null);
  const [isMatching, setIsMatching] = useState(false);

  const fetchBenchCandidates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (skillFilter) params.append('skill', skillFilter);
      if (statusFilter) params.append('bench_status', statusFilter);
      if (waEligibleOnly) params.append('whatsapp_eligible_only', 'true');

      const res = await fetch(`/api/v1/bench?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCandidates(data);
      }
    } catch (err) {
      console.error('Failed to fetch bench candidates:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequirements = async () => {
    try {
      const res = await apiFetch('/api/v1/requirements?position_status=OPEN', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRequirements(data);
        if (data.length > 0) setSelectedRequirementId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch requirements:', err);
    }
  };

  useEffect(() => {
    fetchBenchCandidates();
  }, [search, skillFilter, statusFilter, waEligibleOnly]);

  useEffect(() => {
    fetchRequirements();
  }, []);

  const handleUpdateStatus = async () => {
    if (!selectedCandidate) return;

    try {
      const res = await fetch(`/api/v1/bench/${selectedCandidate.candidate_id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          bench_status: newStatus,
          notes: statusNotes
        })
      });

      if (res.ok) {
        setShowStatusModal(false);
        fetchBenchCandidates();
      }
    } catch (err) {
      console.error('Failed to update bench status:', err);
    }
  };

  const handleRunRequirementMatch = async () => {
    if (!selectedRequirementId) return;

    try {
      setIsMatching(true);
      const res = await fetch(`/api/v1/bench/match-requirement?requirement_id=${selectedRequirementId}&bench_only=true`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setMatchResult(data);
      }
    } catch (err) {
      console.error('Match error:', err);
    } finally {
      setIsMatching(false);
    }
  };

  const handleDownloadCV = async (candId: string, filename?: string) => {
    try {
      const res = await apiFetch(`/api/v1/candidates/${candId}/cv/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        alert('Could not download candidate CV.');
        return;
      }
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename || 'Candidate_Resume.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download CV error:', err);
      alert('Encountered an error downloading CV.');
    }
  };

  const [selectedPosition, setSelectedPosition] = useState<string>('all');

  const positionGroups = React.useMemo(() => {
    const map: Record<string, number> = {};
    candidates.forEach((c) => {
      const pos = c.position || c.designation || 'Software Engineer';
      map[pos] = (map[pos] || 0) + 1;
    });
    return Object.entries(map).map(([position, count]) => ({ position, count }));
  }, [candidates]);

  const displayedCandidates = React.useMemo(() => {
    if (selectedPosition === 'all') return candidates;
    return candidates.filter((c) => {
      const pos = c.position || c.designation || 'Software Engineer';
      return pos.toLowerCase() === selectedPosition.toLowerCase();
    });
  }, [candidates, selectedPosition]);

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <Award className="w-7 h-7 text-emerald-400" />
            Bench Resource Pool
          </h1>
          <p className="text-sm text-slate-400">
            Deployable internal talent, position groupings, requirement matching, and instant WhatsApp campaign outreach.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setMatchResult(null);
              setShowMatchModal(true);
              if (selectedRequirementId) handleRunRequirementMatch();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 transition"
          >
            <Sparkles className="w-4 h-4" />
            <span>Match to Job Requirement</span>
          </button>
        </div>
      </div>

      {/* Position-Wise Bench Summary Cards */}
      <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800/80 shadow-lg space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Bench Resources by Position ({candidates.length} Total)
            </h2>
          </div>
          <span className="text-[11px] text-slate-400">Filter bench pool by role</span>
        </div>

        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => setSelectedPosition('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              selectedPosition === 'all'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-1 ring-emerald-400'
                : 'bg-slate-950/80 text-slate-300 border border-slate-800 hover:border-slate-700'
            }`}
          >
            <span>All Bench Resources</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${selectedPosition === 'all' ? 'bg-white/20 text-white' : 'bg-slate-800 text-emerald-300'}`}>
              {candidates.length}
            </span>
          </button>

          {positionGroups.map((p) => {
            const isSel = selectedPosition.toLowerCase() === p.position.toLowerCase();
            return (
              <button
                key={p.position}
                onClick={() => setSelectedPosition(isSel ? 'all' : p.position)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
                  isSel
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30 ring-1 ring-emerald-400'
                    : 'bg-slate-950/80 text-slate-300 border border-slate-800 hover:border-emerald-500/50'
                }`}
              >
                <span>{p.position}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${isSel ? 'bg-white/20 text-white' : 'bg-slate-800 text-emerald-300 border border-emerald-500/30'}`}>
                  {p.count} Candidates
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto flex-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search bench resources by name, skills, designation, location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <input
            type="text"
            placeholder="Skill (e.g. Python, Oracle)..."
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            className="w-44 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 hidden sm:block"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Bench Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="PARTIALLY_AVAILABLE">Partially Available</option>
            <option value="ALLOCATED">Allocated</option>
            <option value="INTERVIEWING">Interviewing</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="RELEASED">Released</option>
          </select>

          <label className="flex items-center gap-2 cursor-pointer text-xs text-emerald-300 font-semibold bg-slate-950 px-3 py-2 rounded-xl border border-emerald-500/30">
            <input
              type="checkbox"
              checked={waEligibleOnly}
              onChange={(e) => setWaEligibleOnly(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
            />
            <span>WhatsApp Ready Only</span>
          </label>
        </div>
      </div>

      {/* Bench Resource Cards Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-400" />
          Loading bench resources...
        </div>
      ) : displayedCandidates.length === 0 ? (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
          <Award className="w-10 h-10 mx-auto mb-2 opacity-30 text-emerald-400" />
          <p className="text-sm font-semibold text-slate-300">No bench candidates found</p>
          <p className="text-xs text-slate-500 mt-1">Try adjusting your position, skill, or status filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedCandidates.map((c) => {
            const isEligible = c.whatsapp_eligibility?.is_eligible;
            const exactPos = c.position || c.designation || 'Software Engineer';
            const primSkills = c.primary_skills || [];
            const secSkills = c.secondary_skills || [];

            return (
              <div
                key={c.candidate_id}
                className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-5 shadow-lg hover:shadow-emerald-500/5 transition flex flex-col justify-between space-y-4"
              >
                <div>
                  {/* Top Bar: Name & Bench Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <button
                        onClick={() => onViewCandidateProfile && onViewCandidateProfile(c.candidate_id)}
                        className="font-bold text-base text-white hover:text-emerald-300 transition text-left"
                      >
                        {c.full_name}
                      </button>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 rounded-md text-[11px] font-bold">
                        {exactPos}
                      </span>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase shrink-0 ${
                      c.bench_status === 'AVAILABLE' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' :
                      c.bench_status === 'PARTIALLY_AVAILABLE' ? 'bg-teal-500/10 text-teal-300 border-teal-500/30' :
                      c.bench_status === 'INTERVIEWING' ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' :
                      'bg-slate-800 text-slate-300 border-slate-700'
                    }`}>
                      {c.bench_status}
                    </span>
                  </div>

                  {/* Contact & Meta */}
                  <div className="mt-3 space-y-1.5 text-xs text-slate-300 border-t border-slate-800/80 pt-3">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{c.whatsapp_number || c.phone || '—'}</span>
                      {isEligible ? (
                        <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 text-[9px] font-bold rounded">
                          WA Ready
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 text-[9px] font-bold rounded">
                          Consent Req
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{c.location || 'Remote'} • {c.total_experience} Yrs Exp</span>
                    </div>

                    {c.availability_date && (
                      <div className="flex items-center gap-2 text-slate-400">
                        <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>Available From: {new Date(c.availability_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Primary & Secondary Skills Classification */}
                  <div className="mt-3 space-y-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                        ★ Primary Core Skills
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {primSkills.map((s: string, idx: number) => (
                          <span key={idx} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-300 text-[10px] font-bold rounded border border-emerald-500/30">
                            ★ {s}
                          </span>
                        ))}
                        {primSkills.length === 0 && (
                          <span className="text-[10px] text-slate-500 italic">—</span>
                        )}
                      </div>
                    </div>

                    {secSkills.length > 0 && (
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 block mb-1">
                          Supporting Skills
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {secSkills.slice(0, 4).map((s: string, idx: number) => (
                            <span key={idx} className="px-1.5 py-0.5 bg-slate-950 text-slate-300 text-[10px] rounded border border-slate-800">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setSelectedCandidate(c);
                      setNewStatus(c.bench_status);
                      setStatusNotes('');
                      setShowStatusModal(true);
                    }}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition"
                  >
                    Change Status
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownloadCV(c.candidate_id, c.resume_file_name || undefined)}
                      title="Download Verified CV"
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onNavigateToCampaigns && onNavigateToCampaigns([c.candidate_id])}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Outreach</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Update Bench Status */}
      {showStatusModal && selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">
              Update Bench Status — {selectedCandidate.full_name}
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Bench Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as BenchStatus)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
              >
                <option value="AVAILABLE">AVAILABLE (Ready for Deployment)</option>
                <option value="PARTIALLY_AVAILABLE">PARTIALLY_AVAILABLE</option>
                <option value="ALLOCATED">ALLOCATED (Assigned to Client)</option>
                <option value="INTERVIEWING">INTERVIEWING (In Pipeline)</option>
                <option value="ON_HOLD">ON_HOLD</option>
                <option value="RELEASED">RELEASED (Off Bench)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Notes / Remarks</label>
              <textarea
                rows={3}
                placeholder="Reason for status transition, client allocation details..."
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStatus}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow"
              >
                Save Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Match Bench Candidates to Job Requirement */}
      {showMatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  Candidate-to-Requirement Matching Engine
                </h2>
                <p className="text-xs text-slate-400">Score bench talent against active positions and initiate 1-click WhatsApp outreach campaigns.</p>
              </div>
              <button onClick={() => setShowMatchModal(false)} className="text-slate-500 hover:text-white font-bold">✕</button>
            </div>

            {/* Requirement Selector */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="w-full sm:w-2/3">
                <label className="block text-xs font-bold text-slate-300 mb-1">Target Open Job Requirement:</label>
                <select
                  value={selectedRequirementId}
                  onChange={(e) => setSelectedRequirementId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-semibold"
                >
                  {requirements.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.req_code} — {r.job_title} ({r.client_name || 'Client'}) • {r.openings_count} Openings
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleRunRequirementMatch}
                disabled={isMatching || !selectedRequirementId}
                className="w-full sm:w-auto px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-lg flex items-center justify-center gap-2"
              >
                {isMatching ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Evaluating Candidates...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Run Match Analysis</span>
                  </>
                )}
              </button>
            </div>

            {/* Match Results */}
            {matchResult && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Matched Bench Candidates ({matchResult.matched_candidates.length} Profiles Evaluated)
                  </h3>

                  {matchResult.matched_candidates.filter((m: RequirementMatchCandidate) => m.match_percentage >= 60).length > 0 && (
                    <button
                      onClick={() => {
                        const topCandIds = matchResult.matched_candidates
                          .filter((m: RequirementMatchCandidate) => m.match_percentage >= 60)
                          .map((m: RequirementMatchCandidate) => m.candidate.candidate_id);
                        setShowMatchModal(false);
                        if (onNavigateToCampaigns) {
                          onNavigateToCampaigns(topCandIds, matchResult.requirement_id);
                        }
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow transition"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Outreach All Top Matches ({matchResult.matched_candidates.filter((m: RequirementMatchCandidate) => m.match_percentage >= 60).length})</span>
                    </button>
                  )}
                </div>

                <div className="border border-slate-800 rounded-xl divide-y divide-slate-800 bg-slate-950 text-xs">
                  {matchResult.matched_candidates.map((mc: RequirementMatchCandidate, idx: number) => (
                    <div key={idx} className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-900/60 transition">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{mc.candidate.full_name}</span>
                          <span className="text-slate-500">({mc.candidate.designation || 'Software Engineer'})</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            mc.match_percentage >= 80 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                            mc.match_percentage >= 60 ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' :
                            'bg-slate-800 text-slate-300'
                          }`}>
                            {mc.match_percentage}% Match Fit
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-400">{mc.recommendation}</p>

                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {mc.matched_skills.map((ms: string, i: number) => (
                            <span key={i} className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-300 text-[10px] font-medium rounded border border-emerald-500/20 flex items-center gap-1">
                              <Check className="w-2.5 h-2.5" /> {ms}
                            </span>
                          ))}
                          {mc.missing_skills.map((ms: string, i: number) => (
                            <span key={i} className="px-1.5 py-0.5 bg-rose-500/10 text-rose-300 text-[10px] font-medium rounded border border-rose-500/20 line-through">
                              {ms}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleDownloadCV(mc.candidate.candidate_id, mc.candidate.resume_file_name || undefined)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700"
                        >
                          CV
                        </button>

                        <button
                          onClick={() => {
                            setShowMatchModal(false);
                            if (onNavigateToCampaigns) {
                              onNavigateToCampaigns([mc.candidate.candidate_id], matchResult.requirement_id);
                            }
                          }}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>WhatsApp Outreach</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
