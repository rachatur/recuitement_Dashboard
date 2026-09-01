import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import {
  BenchCandidate, BenchStatus, JobRequirement, RequirementMatchResult, RequirementMatchCandidate
} from '../types';
import {
  Award, Search, Filter, Download, MessageSquare,
  CheckCircle2, XCircle, AlertCircle, Phone, Mail,
  MapPin, Calendar, RefreshCw, Send, Check, Sparkles,
  ArrowRight, Users, Upload, FileText, CheckCircle,
  Briefcase, UserPlus, Eye, Layers, ShieldCheck
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
  const [resourceTypeFilter, setResourceTypeFilter] = useState('');
  const [waEligibleOnly, setWaEligibleOnly] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<string>('all');

  // Single Upload CV Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadResourceType, setUploadResourceType] = useState<'Employee' | 'Contract Based' | 'Freelancer/Other'>('Employee');
  const [uploadAvailabilityDate, setUploadAvailabilityDate] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Bulk Upload CV Modal
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [bulkFiles, setBulkFiles] = useState<FileList | null>(null);
  const [bulkResourceType, setBulkResourceType] = useState<'Employee' | 'Contract Based' | 'Freelancer/Other'>('Employee');
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<any>(null);

  // Status Change Modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<BenchCandidate | null>(null);
  const [newStatus, setNewStatus] = useState<BenchStatus>('AVAILABLE');
  const [newResourceType, setNewResourceType] = useState<string>('Employee');
  const [statusNotes, setStatusNotes] = useState('');

  // Requirement Matcher Modal
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [requirements, setRequirements] = useState<JobRequirement[]>([]);
  const [selectedRequirementId, setSelectedRequirementId] = useState<string>('');
  const [matchResult, setMatchResult] = useState<RequirementMatchResult | null>(null);
  const [isMatching, setIsMatching] = useState(false);

  // View Match / Submit CV Drawer/Modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submittingCandidate, setSubmittingCandidate] = useState<RequirementMatchCandidate | null>(null);
  const [isSubmittingCV, setIsSubmittingCV] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<string | null>(null);

  const fetchBenchCandidates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (skillFilter) params.append('skill', skillFilter);
      if (statusFilter) params.append('bench_status', statusFilter);
      if (resourceTypeFilter) params.append('resource_type', resourceTypeFilter);
      if (waEligibleOnly) params.append('whatsapp_eligible_only', 'true');

      const res = await apiFetch(`/api/v1/bench?${params.toString()}`, {
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
  }, [search, skillFilter, statusFilter, resourceTypeFilter, waEligibleOnly]);

  useEffect(() => {
    fetchRequirements();
  }, []);

  const handleSingleUploadCV = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('resource_type', uploadResourceType);
      if (uploadAvailabilityDate) formData.append('availability_date', uploadAvailabilityDate);
      if (uploadNotes) formData.append('notes', uploadNotes);

      const res = await fetch('/api/v1/bench/upload-cv', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setUploadSuccess(`Successfully extracted & added ${data.full_name} (${data.position || data.designation}) to Bench Resource Pool.`);
        setUploadFile(null);
        setUploadNotes('');
        fetchBenchCandidates();
        setTimeout(() => {
          setUploadSuccess(null);
          setShowUploadModal(false);
        }, 2000);
      } else {
        const err = await res.json();
        alert(err.detail || 'Failed to upload and extract CV.');
      }
    } catch (err) {
      console.error('Upload CV error:', err);
      alert('Encountered an error while uploading CV.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleBulkUploadCVs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkFiles || bulkFiles.length === 0) return;

    try {
      setIsBulkUploading(true);
      const formData = new FormData();
      for (let i = 0; i < bulkFiles.length; i++) {
        formData.append('files', bulkFiles[i]);
      }
      formData.append('resource_type', bulkResourceType);

      const res = await fetch('/api/v1/bench/bulk-upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setBulkResult(data);
        fetchBenchCandidates();
      } else {
        const err = await res.json();
        alert(err.detail || 'Failed to bulk upload CVs.');
      }
    } catch (err) {
      console.error('Bulk upload CV error:', err);
      alert('Encountered an error during bulk CV upload.');
    } finally {
      setIsBulkUploading(false);
    }
  };

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
          resource_type: newResourceType,
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

  const handleSubmitCVToRequirement = async () => {
    if (!submittingCandidate || !matchResult) return;

    try {
      setIsSubmittingCV(true);
      const targetReq = requirements.find(r => r.id === matchResult.requirement_id);
      
      const payload = {
        candidate_id: submittingCandidate.candidate.candidate_id,
        requirement_id: matchResult.requirement_id,
        client_id: targetReq?.client_id || '',
        notes: `Submitted from Bench Resource Pool (${submittingCandidate.match_percentage}% Match Score).`
      };

      const res = await fetch('/api/v1/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSubmissionFeedback(`CV successfully submitted for ${submittingCandidate.candidate.full_name} against ${matchResult.job_title}!`);
        setTimeout(() => {
          setSubmissionFeedback(null);
          setShowSubmitModal(false);
        }, 2200);
      } else {
        const err = await res.json();
        alert(err.detail || 'Could not submit CV.');
      }
    } catch (err) {
      console.error('Submission error:', err);
      alert('Error submitting CV.');
    } finally {
      setIsSubmittingCV(false);
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

  const positionGroups = useMemo(() => {
    const map: Record<string, number> = {};
    candidates.forEach((c) => {
      const pos = c.position || c.designation || 'Software Engineer';
      map[pos] = (map[pos] || 0) + 1;
    });
    return Object.entries(map).map(([position, count]) => ({ position, count }));
  }, [candidates]);

  const displayedCandidates = useMemo(() => {
    if (selectedPosition === 'all') return candidates;
    return candidates.filter((c) => {
      const pos = c.position || c.designation || 'Software Engineer';
      return pos.toLowerCase() === selectedPosition.toLowerCase();
    });
  }, [candidates, selectedPosition]);

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2.5">
            <Award className="w-7 h-7 text-emerald-500" />
            Bench Resource Pool
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Maintain available employees and contract resources, auto-match against client positions, and submit CVs with 1-click.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Upload Single CV */}
          <button
            onClick={() => {
              setUploadFile(null);
              setUploadSuccess(null);
              setShowUploadModal(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold border border-gray-300 dark:border-gray-700 shadow-sm transition"
          >
            <Upload className="w-4 h-4 text-emerald-500" />
            <span>Upload CV</span>
          </button>

          {/* Bulk Upload CVs */}
          <button
            onClick={() => {
              setBulkFiles(null);
              setBulkResult(null);
              setShowBulkUploadModal(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold border border-gray-300 dark:border-gray-700 shadow-sm transition"
          >
            <FileText className="w-4 h-4 text-blue-500" />
            <span>Bulk Upload CVs</span>
          </button>

          {/* Match to Job Requirement */}
          <button
            onClick={() => {
              setMatchResult(null);
              setShowMatchModal(true);
              if (selectedRequirementId) handleRunRequirementMatch();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 transition"
          >
            <Sparkles className="w-4 h-4" />
            <span>Match to Client Requirement</span>
          </button>
        </div>
      </div>

      {/* Position-Wise Bench Summary Pills */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Bench Resources by Extracted Position ({candidates.length} Total)
            </h2>
          </div>
          <span className="text-[11px] text-gray-400">Filter by exact job title from CV</span>
        </div>

        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => setSelectedPosition('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              selectedPosition === 'all'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <span>All Bench Resources</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${selectedPosition === 'all' ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-gray-700 text-emerald-600 dark:text-emerald-400'}`}>
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
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-emerald-500/50'
                }`}
              >
                <span>{p.position}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${isSel ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-gray-700 text-emerald-600 dark:text-emerald-400'}`}>
                  {p.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3 w-full md:w-auto flex-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search bench resources by name, skills, designation, location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <input
            type="text"
            placeholder="Skill (e.g. Oracle, Java)..."
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            className="w-44 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 hidden sm:block"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Resource Type Filter */}
          <select
            value={resourceTypeFilter}
            onChange={(e) => setResourceTypeFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Resource Types</option>
            <option value="Employee">Employee</option>
            <option value="Contract Based">Contract Based</option>
            <option value="Freelancer/Other">Freelancer/Other</option>
          </select>

          {/* Bench Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Bench Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="PARTIALLY_AVAILABLE">Partially Available</option>
            <option value="ALLOCATED">Allocated</option>
            <option value="INTERVIEWING">Interviewing</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="RELEASED">Released</option>
          </select>

          <label className="flex items-center gap-2 cursor-pointer text-xs text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800">
            <input
              type="checkbox"
              checked={waEligibleOnly}
              onChange={(e) => setWaEligibleOnly(e.target.checked)}
              className="rounded bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-emerald-600 focus:ring-0"
            />
            <span>WhatsApp Ready Only</span>
          </label>
        </div>
      </div>

      {/* Bench Resource Cards Grid */}
      {loading ? (
        <div className="py-20 text-center text-gray-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-500" />
          Loading bench resources...
        </div>
      ) : displayedCandidates.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl p-12 text-center text-gray-400 shadow-sm">
          <Award className="w-10 h-10 mx-auto mb-2 opacity-30 text-emerald-500" />
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No bench candidates found</p>
          <p className="text-xs text-gray-400 mt-1">Try adjusting your position, skill, resource type, or status filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedCandidates.map((c) => {
            const isEligible = c.whatsapp_eligibility?.is_eligible;
            const exactPos = c.position || c.designation || 'Software Engineer';
            const primSkills = c.primary_skills || [];
            const secSkills = c.secondary_skills || [];
            const resType = c.resource_type || 'Employee';

            return (
              <div
                key={c.candidate_id}
                className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 hover:border-emerald-500/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
              >
                <div>
                  {/* Top Bar: Name & Badges */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <button
                        onClick={() => onViewCandidateProfile && onViewCandidateProfile(c.candidate_id)}
                        className="font-bold text-base text-gray-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition text-left"
                      >
                        {c.full_name}
                      </button>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="inline-block px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-md text-[11px] font-bold">
                          {exactPos}
                        </span>
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                          resType === 'Employee'
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                            : resType === 'Contract Based'
                            ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                            : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                        }`}>
                          {resType}
                        </span>
                      </div>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase shrink-0 ${
                      c.bench_status === 'AVAILABLE' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' :
                      c.bench_status === 'PARTIALLY_AVAILABLE' ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800' :
                      c.bench_status === 'INTERVIEWING' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' :
                      'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700'
                    }`}>
                      {c.bench_status}
                    </span>
                  </div>

                  {/* Contact & Meta */}
                  <div className="mt-3 space-y-1.5 text-xs text-gray-600 dark:text-gray-300 border-t border-gray-100 dark:border-gray-800 pt-3">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{c.whatsapp_number || c.phone || '—'}</span>
                      {isEligible ? (
                        <span className="px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold rounded">
                          WA Ready
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[9px] font-bold rounded">
                          Consent Req
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>{c.location || 'Remote'} • <strong>{c.total_experience} Years Exp</strong></span>
                    </div>

                    {c.availability_date && (
                      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>Available From: {new Date(c.availability_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Primary & Secondary Skills Classification */}
                  <div className="mt-3 space-y-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                        ★ Primary Skills
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {primSkills.map((s: string, idx: number) => (
                          <span key={idx} className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded border border-emerald-200 dark:border-emerald-800">
                            ★ {s}
                          </span>
                        ))}
                        {primSkills.length === 0 && (
                          <span className="text-[10px] text-gray-400 italic">—</span>
                        )}
                      </div>
                    </div>

                    {secSkills.length > 0 && (
                      <div>
                        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 block mb-1">
                          Secondary Skills
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {secSkills.slice(0, 4).map((s: string, idx: number) => (
                            <span key={idx} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-[10px] rounded border border-gray-200 dark:border-gray-700">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setSelectedCandidate(c);
                      setNewStatus(c.bench_status);
                      setNewResourceType(c.resource_type || 'Employee');
                      setStatusNotes('');
                      setShowStatusModal(true);
                    }}
                    className="px-2.5 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-semibold border border-gray-300 dark:border-gray-700 transition"
                  >
                    Change Status
                  </button>

                  <div className="flex items-center gap-2">
                    {/* Working Download CV Button */}
                    <button
                      onClick={() => handleDownloadCV(c.candidate_id, c.resume_file_name || undefined)}
                      title="Download Verified CV"
                      className="p-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-300 dark:border-gray-700 transition"
                    >
                      <Download className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    </button>

                    <button
                      onClick={() => onNavigateToCampaigns && onNavigateToCampaigns([c.candidate_id])}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
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

      {/* Modal: Single CV Upload */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-emerald-500" />
                Upload Bench Resource CV
              </h3>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            {uploadSuccess ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center space-y-2">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">{uploadSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleSingleUploadCV} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Select Resume File (PDF / DOCX / DOC / TXT)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    required
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Position, primary/secondary skills, and experience are auto-extracted.</p>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Resource Type Classification</label>
                  <select
                    value={uploadResourceType}
                    onChange={(e) => setUploadResourceType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200 font-semibold"
                  >
                    <option value="Employee">Employee (Internal Permanent)</option>
                    <option value="Contract Based">Contract Based</option>
                    <option value="Freelancer/Other">Freelancer / Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Deployment Availability Date</label>
                  <input
                    type="date"
                    value={uploadAvailabilityDate}
                    onChange={(e) => setUploadAvailabilityDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Notes / Project Readiness</label>
                  <textarea
                    rows={2}
                    placeholder="Bench resource notes, client preferences..."
                    value={uploadNotes}
                    onChange={(e) => setUploadNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200 placeholder-gray-400"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 font-semibold text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading || !uploadFile}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md flex items-center gap-2"
                  >
                    {isUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    <span>{isUploading ? 'Extracting & Saving...' : 'Upload & Add to Bench'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: Bulk Upload CVs */}
      {showBulkUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                Bulk Upload Bench Resource Resumes
              </h3>
              <button onClick={() => setShowBulkUploadModal(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            {bulkResult ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl">
                  <p className="font-bold text-blue-900 dark:text-blue-200">
                    Bulk Processing Complete: {bulkResult.successfully_processed} of {bulkResult.total_uploaded} CVs processed successfully.
                  </p>
                  <p className="text-gray-500 mt-1">
                    New Created: {bulkResult.new_candidates_created} | Duplicates: {bulkResult.duplicates_detected}
                  </p>
                </div>

                <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 border border-gray-200 dark:border-gray-800 rounded-xl">
                  {bulkResult.items?.map((item: any, idx: number) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{item.file_name}</span>
                        {item.candidate_name && (
                          <span className="text-gray-500 block text-[11px]">{item.candidate_name} ({item.email})</span>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setShowBulkUploadModal(false)}
                  className="w-full py-2 bg-gray-900 text-white font-bold rounded-xl"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleBulkUploadCVs} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Select Multiple Resume Files
                  </label>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.txt"
                    required
                    onChange={(e) => setBulkFiles(e.target.files)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Batch extracts candidate names, positions, primary skills, and experience.</p>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Classify Resource Type</label>
                  <select
                    value={bulkResourceType}
                    onChange={(e) => setBulkResourceType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200 font-semibold"
                  >
                    <option value="Employee">Employee (Internal Permanent)</option>
                    <option value="Contract Based">Contract Based</option>
                    <option value="Freelancer/Other">Freelancer / Other</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowBulkUploadModal(false)}
                    className="px-4 py-2 font-semibold text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isBulkUploading || !bulkFiles || bulkFiles.length === 0}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md flex items-center gap-2"
                  >
                    {isBulkUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    <span>{isBulkUploading ? 'Processing Resumes...' : `Upload ${bulkFiles?.length || 0} Files`}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: Update Bench Status & Resource Type */}
      {showStatusModal && selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Update Bench Resource — {selectedCandidate.full_name}
            </h3>

            <div className="text-xs space-y-3">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Bench Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as BenchStatus)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200 font-semibold"
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
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Resource Type</label>
                <select
                  value={newResourceType}
                  onChange={(e) => setNewResourceType(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200 font-semibold"
                >
                  <option value="Employee">Employee</option>
                  <option value="Contract Based">Contract Based</option>
                  <option value="Freelancer/Other">Freelancer/Other</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Notes / Remarks</label>
                <textarea
                  rows={3}
                  placeholder="Reason for status transition, client allocation details..."
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200 placeholder-gray-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStatus}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Match Bench Candidates to Job Requirement */}
      {showMatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar my-8">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-500" />
                  Client Position & Bench Matching Engine
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Compares client position requirements against bench resources based on Position Title, Primary Skills, Secondary Skills, Experience, and Availability.
                </p>
              </div>
              <button onClick={() => setShowMatchModal(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            {/* Requirement Selector */}
            <div className="bg-gray-50 dark:bg-gray-800/60 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="w-full sm:w-2/3">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Target Client Position / Requirement:</label>
                <select
                  value={selectedRequirementId}
                  onChange={(e) => setSelectedRequirementId(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl text-xs text-gray-900 dark:text-white font-semibold"
                >
                  {requirements.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.req_code} — {r.job_title} ({r.client_name || 'Client'}) • {r.experience_min}+ Yrs • Required: {(r.required_skills || []).join(', ')}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleRunRequirementMatch}
                disabled={isMatching || !selectedRequirementId}
                className="w-full sm:w-auto px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-lg flex items-center justify-center gap-2"
              >
                {isMatching ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Scoring Candidates...</span>
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
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                    Matching Bench Candidates ({matchResult.matched_candidates.length} Profiles Evaluated)
                  </h3>
                </div>

                <div className="border border-gray-200 dark:border-gray-800 rounded-xl divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900 text-xs">
                  {matchResult.matched_candidates.map((mc: RequirementMatchCandidate, idx: number) => {
                    const c = mc.candidate;
                    const resType = c.resource_type || 'Employee';
                    const primSkills = c.primary_skills || [];
                    const exactPos = c.position || c.designation || 'Software Engineer';

                    return (
                      <div key={idx} className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-gray-900 dark:text-white text-sm">
                              Candidate: {c.full_name}
                            </span>
                            <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded font-bold text-[11px] border border-emerald-200 dark:border-emerald-800">
                              Position: {exactPos}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              resType === 'Employee'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}>
                              Resource Type: {resType}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                              mc.match_percentage >= 80 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                              mc.match_percentage >= 60 ? 'bg-teal-100 text-teal-800 border border-teal-300' :
                              'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}>
                              Match: {mc.match_percentage}%
                            </span>
                          </div>

                          <div className="text-[11px] text-gray-600 dark:text-gray-300 flex flex-wrap gap-2">
                            <span><strong>Experience:</strong> {c.total_experience} Years</span>
                            <span>•</span>
                            <span><strong>Primary Skills:</strong> {primSkills.join(', ') || '—'}</span>
                          </div>

                          <p className="text-[11px] text-gray-500 dark:text-gray-400">{mc.recommendation}</p>

                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {mc.matched_skills.map((ms: string, i: number) => (
                              <span key={i} className="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-medium rounded border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                                <Check className="w-2.5 h-2.5" /> {ms}
                              </span>
                            ))}
                            {mc.missing_skills.map((ms: string, i: number) => (
                              <span key={i} className="px-1.5 py-0.5 bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 text-[10px] font-medium rounded border border-rose-200 dark:border-rose-800 line-through">
                                {ms}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* CV Download */}
                          <button
                            onClick={() => handleDownloadCV(c.candidate_id, c.resume_file_name || undefined)}
                            title="Download CV"
                            className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl border border-gray-300 dark:border-gray-700"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {/* View Match / Submit CV Button */}
                          <button
                            onClick={() => {
                              setSubmittingCandidate(mc);
                              setSubmissionFeedback(null);
                              setShowSubmitModal(true);
                            }}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Match / Submit CV</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: View Match & 1-Click Submit CV */}
      {showSubmitModal && submittingCandidate && matchResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  Submit Candidate CV Against Position
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Review match fit score and send CV directly to client requirement.</p>
              </div>
              <button onClick={() => setShowSubmitModal(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            {submissionFeedback ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center space-y-2">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">{submissionFeedback}</p>
              </div>
            ) : (
              <div className="space-y-3.5 text-xs">
                {/* Match Summary Box */}
                <div className="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900 dark:text-white text-sm">
                      {submittingCandidate.candidate.full_name}
                    </span>
                    <span className="px-3 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Match: {submittingCandidate.match_percentage}%
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600 dark:text-gray-300">
                    <div>
                      <strong>Extracted Position:</strong> {submittingCandidate.candidate.position || submittingCandidate.candidate.designation}
                    </div>
                    <div>
                      <strong>Resource Type:</strong> {submittingCandidate.candidate.resource_type || 'Employee'}
                    </div>
                    <div>
                      <strong>Experience:</strong> {submittingCandidate.candidate.total_experience} Years
                    </div>
                    <div>
                      <strong>Target Position:</strong> {matchResult.job_title}
                    </div>
                  </div>

                  <div>
                    <strong className="block text-[11px] text-gray-700 dark:text-gray-300 mb-1">Primary Core Skills:</strong>
                    <div className="flex flex-wrap gap-1">
                      {submittingCandidate.candidate.primary_skills?.map((s, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-semibold">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    onClick={() => handleDownloadCV(submittingCandidate.candidate.candidate_id, submittingCandidate.candidate.resume_file_name || undefined)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold rounded-xl border border-gray-300 dark:border-gray-700"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download CV</span>
                  </button>

                  <button
                    onClick={handleSubmitCVToRequirement}
                    disabled={isSubmittingCV}
                    className="flex-1 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow flex items-center justify-center gap-2"
                  >
                    {isSubmittingCV ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>{isSubmittingCV ? 'Submitting...' : 'Submit CV Against Client Position'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
