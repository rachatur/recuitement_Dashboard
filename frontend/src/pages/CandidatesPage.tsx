import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import {
  Candidate, CandidateStatus, WhatsAppConsentStatus,
  CVExtractionResponse, BulkCVUploadSummaryResponse
} from '../types';
import {
  Users, UserPlus, Upload, Search, Filter, Download,
  CheckCircle2, XCircle, AlertCircle, Phone, Mail,
  MapPin, Briefcase, Eye, ShieldCheck, ShieldAlert,
  Clock, ExternalLink, RefreshCw, FileText, Check, AlertTriangle, MessageSquare, Trash2
} from 'lucide-react';

interface CandidatesPageProps {
  onViewCandidateProfile?: (candidateId: string) => void;
  initialSearch?: string;
}

export const CandidatesPage: React.FC<CandidatesPageProps> = ({ onViewCandidateProfile, initialSearch = '' }) => {
  const { token, user } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [waEligibleFilter, setWaEligibleFilter] = useState<string>('all');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  // Single CV Extraction State
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedInfo, setExtractedInfo] = useState<CVExtractionResponse | null>(null);
  const [formData, setFormData] = useState<any>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    alternate_phone: '',
    whatsapp_number: '',
    country_code: '+91',
    location: '',
    preferred_location: '',
    total_experience: 0,
    relevant_experience: 0,
    current_company: '',
    current_designation: '',
    skills: [],
    education: '',
    highest_qualification: '',
    notice_period: '30 Days',
    current_ctc: '',
    expected_ctc: '',
    linkedin_url: '',
    github_url: '',
    source: 'Direct',
    status: 'RECEIVED',
    bench_status: 'NOT_ON_BENCH',
    whatsapp_consent_status: 'GRANTED'
  });

  // Bulk Upload State
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [duplicateAction, setDuplicateAction] = useState('skip');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkSummary, setBulkSummary] = useState<BulkCVUploadSummaryResponse | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      let url = '/api/v1/candidates?';
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (skillFilter) params.append('skill', skillFilter);
      if (waEligibleFilter === 'eligible') params.append('whatsapp_eligible', 'true');
      if (waEligibleFilter === 'ineligible') params.append('whatsapp_eligible', 'false');
      
      const res = await fetch(url + params.toString(), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCandidates(data);
      }
    } catch (err) {
      console.error('Failed to fetch candidates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, [search, statusFilter, skillFilter, waEligibleFilter]);

  useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);

  // Single CV Upload & Intelligent Extraction
  const handleSingleCVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsExtracting(true);
      const data = new FormData();
      data.append('file', file);

      const res = await apiFetch('/api/v1/candidates/extract-cv', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: data
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || 'Failed to extract CV information.');
        return;
      }

      const extracted: CVExtractionResponse = await res.json();
      setExtractedInfo(extracted);

      // Populate form data with extracted fields
      setFormData({
        first_name: extracted.first_name || '',
        last_name: extracted.last_name || '',
        email: extracted.email || '',
        phone: extracted.phone || '',
        alternate_phone: extracted.alternate_phone || '',
        whatsapp_number: extracted.whatsapp_number || extracted.phone || '',
        country_code: extracted.country_code || '+91',
        location: extracted.location || '',
        preferred_location: extracted.preferred_location || '',
        total_experience: extracted.total_experience || 0,
        relevant_experience: extracted.relevant_experience || 0,
        current_company: extracted.current_company || '',
        current_designation: extracted.current_designation || '',
        skills: extracted.skills || [],
        education: extracted.education || '',
        highest_qualification: extracted.highest_qualification || '',
        notice_period: extracted.notice_period || '30 Days',
        current_ctc: extracted.current_ctc || '',
        expected_ctc: extracted.expected_ctc || '',
        linkedin_url: extracted.linkedin_url || '',
        github_url: extracted.github_url || '',
        source: 'CV Upload & Auto Extraction',
        status: 'RECEIVED',
        bench_status: 'NOT_ON_BENCH',
        whatsapp_consent_status: 'GRANTED'
      });
    } catch (err) {
      console.error('Extraction error:', err);
      alert('Network error during CV extraction.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSaveCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        total_experience: parseFloat(formData.total_experience) || 0,
        relevant_experience: parseFloat(formData.relevant_experience) || 0,
        current_ctc: formData.current_ctc ? parseFloat(formData.current_ctc) : null,
        expected_ctc: formData.expected_ctc ? parseFloat(formData.expected_ctc) : null,
        skills: Array.isArray(formData.skills) ? formData.skills : formData.skills.split(',').map((s: string) => s.trim()).filter(Boolean)
      };

      const res = await apiFetch('/api/v1/candidates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || 'Failed to save candidate.');
        return;
      }

      setShowAddModal(false);
      setExtractedInfo(null);
      fetchCandidates();
    } catch (err) {
      console.error('Save error:', err);
      alert('Failed to save candidate.');
    }
  };

  // Bulk Upload
  const handleBulkUpload = async () => {
    if (!bulkFiles.length) return;

    try {
      setIsBulkProcessing(true);
      const data = new FormData();
      bulkFiles.forEach(f => data.append('files', f));
      data.append('duplicate_action', duplicateAction);

      const res = await apiFetch('/api/v1/candidates/bulk-upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: data
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || 'Failed to process bulk upload.');
        return;
      }

      const summary: BulkCVUploadSummaryResponse = await res.json();
      setBulkSummary(summary);
      fetchCandidates();
    } catch (err) {
      console.error('Bulk error:', err);
      alert('Failed to process bulk CV files.');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Record WhatsApp Consent
  const handleRecordConsent = async (cand: Candidate, consentStatus: WhatsAppConsentStatus) => {
    try {
      const res = await fetch(`/api/v1/candidates/${cand.id}/consent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          candidate_id: cand.id,
          consent_status: consentStatus,
          consent_source: 'Recruiter WhatsApp Outreach Panel',
          evidence_reference: 'Direct verbal/email verification'
        })
      });

      if (res.ok) {
        setShowConsentModal(false);
        fetchCandidates();
      }
    } catch (err) {
      console.error('Consent error:', err);
    }
  };

  // Download CV retaining original name
  const handleDownloadCV = (candId: string, filename?: string) => {
    const url = `/api/v1/candidates/${candId}/cv/download`;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'Candidate_Resume.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDeleteCandidate = async (candidate: Candidate) => {
    if (!window.confirm(`Delete candidate ${candidate.first_name} ${candidate.last_name}? This cannot be undone.`)) return;

    try {
      const res = await apiFetch(`/api/v1/candidates/${candidate.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const error = await res.json();
        alert(error.detail || 'Failed to delete candidate.');
        return;
      }
      fetchCandidates();
    } catch (err) {
      console.error('Delete candidate error:', err);
      alert('Failed to delete candidate.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <Users className="w-7 h-7 text-brand-400" />
            Candidates & Talent Pool
          </h1>
          <p className="text-sm text-slate-400">
            Intelligent resume extraction, compliance-ready WhatsApp outreach, and candidate lifecycle management.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              setBulkFiles([]);
              setBulkSummary(null);
              setShowBulkModal(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition shadow-sm"
          >
            <Upload className="w-4 h-4 text-slate-300" />
            <span>Bulk Upload CVs</span>
          </button>

          <button
            onClick={() => {
              setExtractedInfo(null);
              setFormData({
                first_name: '',
                last_name: '',
                email: '',
                phone: '',
                alternate_phone: '',
                whatsapp_number: '',
                country_code: '+91',
                location: '',
                preferred_location: '',
                total_experience: 0,
                relevant_experience: 0,
                current_company: '',
                current_designation: '',
                skills: [],
                education: '',
                highest_qualification: '',
                notice_period: '30 Days',
                current_ctc: '',
                expected_ctc: '',
                linkedin_url: '',
                github_url: '',
                source: 'Direct',
                status: 'RECEIVED',
                bench_status: 'NOT_ON_BENCH',
                whatsapp_consent_status: 'GRANTED'
              });
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-brand-600 to-sky-500 hover:from-brand-500 hover:to-sky-400 text-white shadow-lg shadow-brand-500/20 transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Candidate</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto flex-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search candidate by name, email, phone, skills, designation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <input
            type="text"
            placeholder="Filter by Skill..."
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            className="w-40 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 hidden sm:block"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Candidate Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-brand-500"
          >
            <option value="">All Lifecycle Statuses</option>
            <option value="RECEIVED">Received</option>
            <option value="SCREENED">Screened</option>
            <option value="SHORTLISTED">Shortlisted</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="INTERVIEW">Interview</option>
            <option value="SELECTED">Selected</option>
            <option value="OFFER">Offer</option>
            <option value="JOINED">Joined</option>
            <option value="REJECTED">Rejected</option>
            <option value="ON_HOLD">On Hold</option>
          </select>

          {/* WhatsApp Outreach Eligibility filter */}
          <select
            value={waEligibleFilter}
            onChange={(e) => setWaEligibleFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-emerald-500/30 rounded-lg text-xs text-emerald-300 font-medium focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All WhatsApp Statuses</option>
            <option value="eligible">WhatsApp Eligible Only (Ready)</option>
            <option value="ineligible">Consent Required / Ineligible</option>
          </select>
        </div>
      </div>

      {/* Candidate List Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Candidate</th>
                <th className="py-3.5 px-4">Contact & WhatsApp</th>
                <th className="py-3.5 px-4">Experience & Role</th>
                <th className="py-3.5 px-4">Skills</th>
                <th className="py-3.5 px-4">Outreach Status</th>
                <th className="py-3.5 px-4">Bench Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-400" />
                    Loading candidates...
                  </td>
                </tr>
              ) : candidates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No candidates found matching your criteria.
                  </td>
                </tr>
              ) : (
                candidates.map((cand) => {
                  const isEligible = cand.whatsapp_eligibility?.is_eligible;
                  const consentSt = cand.whatsapp_consent_status;
                  const isOptedOut = cand.whatsapp_opt_out_status;

                  return (
                    <tr key={cand.id} className="hover:bg-slate-800/40 transition">
                      {/* Candidate Column */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-300 font-bold shrink-0">
                            {cand.first_name?.[0] || 'C'}
                          </div>
                          <div>
                            <button
                              onClick={() => onViewCandidateProfile && onViewCandidateProfile(cand.id)}
                              className="font-bold text-white hover:text-brand-300 transition text-left flex items-center gap-1.5"
                            >
                              {cand.first_name} {cand.last_name}
                              <span className="text-[10px] font-normal text-slate-400">({cand.candidate_code})</span>
                            </button>
                            <p className="text-[11px] text-slate-400">{cand.current_company || 'Independent Candidate'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Contact & WhatsApp */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="truncate max-w-[170px]">{cand.email}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{cand.whatsapp_number || cand.phone || '—'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Experience & Role */}
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="text-white font-semibold">{cand.current_designation || 'Software Engineer'}</p>
                          <p className="text-[11px] text-slate-400">{cand.total_experience} Years Exp • {cand.location || 'Remote'}</p>
                        </div>
                      </td>

                      {/* Skills */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {(cand.skills || []).slice(0, 3).map((s: string, idx: number) => (
                            <span key={idx} className="px-1.5 py-0.5 bg-slate-800 text-slate-300 text-[10px] rounded border border-slate-700">
                              {s}
                            </span>
                          ))}
                          {(cand.skills || []).length > 3 && (
                            <span className="px-1 py-0.5 text-slate-500 text-[10px]">
                              +{(cand.skills || []).length - 3}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Outreach Eligibility */}
                      <td className="py-3.5 px-4">
                        {isOptedOut ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <XCircle className="w-3 h-3" /> Opted Out
                          </span>
                        ) : isEligible ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> WhatsApp Ready
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedCandidate(cand);
                              setShowConsentModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition cursor-pointer"
                          >
                            <AlertCircle className="w-3 h-3 text-amber-400" /> Consent Required
                          </button>
                        )}
                      </td>

                      {/* Bench Status */}
                      <td className="py-3.5 px-4">
                        {cand.bench_status && cand.bench_status !== 'NOT_ON_BENCH' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                            {cand.bench_status}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Regular Pool</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Download CV */}
                          <button
                            onClick={() => handleDownloadCV(cand.id, cand.latest_document?.file_name)}
                            title="Download CV"
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {/* Profile View */}
                          <button
                            onClick={() => onViewCandidateProfile && onViewCandidateProfile(cand.id)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/30 rounded-lg text-xs font-semibold transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Profile</span>
                          </button>

                          {user && ['SUPER_ADMIN', 'ADMIN'].includes(user.role) && (
                            <button
                              onClick={() => handleDeleteCandidate(cand)}
                              title="Delete candidate"
                              className="p-1.5 bg-rose-950/40 hover:bg-rose-900/70 text-rose-300 hover:text-white rounded-lg border border-rose-800/60 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Single CV Upload & Intelligent Extraction Form */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-brand-400" />
                  Add Candidate — Resume Extraction & Profile Setup
                </h2>
                <p className="text-xs text-slate-400">Upload candidate CV for intelligent extraction, or fill in the details manually.</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-500 hover:text-white transition text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Step 1: CV Upload Box */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Upload Candidate CV (PDF, DOC, DOCX)</h3>
                    <p className="text-[11px] text-slate-400">Auto-extracts name, phone, email, experience, skills, and verifies WhatsApp outreach eligibility.</p>
                  </div>
                </div>

                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleSingleCVUpload}
                    accept=".pdf,.doc,.docx,.txt"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isExtracting}
                    className="flex items-center gap-2 px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold transition shadow"
                  >
                    {isExtracting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Parsing CV...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Choose CV File</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Extraction Preview Badge Card */}
              {extractedInfo && (
                <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-emerald-300">CV Extracted: {extractedInfo.file_name}</p>
                      <p className="text-[10px] text-slate-400">
                        {extractedInfo.skills.length} skills identified • {extractedInfo.total_experience} yrs exp • WhatsApp: {extractedInfo.whatsapp_eligibility?.status}
                      </p>
                    </div>
                  </div>

                  {extractedInfo.is_duplicate && (
                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/40 rounded flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Duplicate Detected ({extractedInfo.duplicate_match_field})
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Step 2: Candidate Form */}
            <form onSubmit={handleSaveCandidate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Email ID *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Mobile / WhatsApp Number *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.country_code}
                      onChange={(e) => setFormData({ ...formData, country_code: e.target.value })}
                      className="w-16 px-2 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white text-center"
                    />
                    <input
                      type="text"
                      required
                      placeholder="+91 9876543210"
                      value={formData.whatsapp_number}
                      onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value, phone: e.target.value })}
                      className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Total Experience (Years)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.total_experience}
                    onChange={(e) => setFormData({ ...formData, total_experience: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Current Designation</label>
                  <input
                    type="text"
                    value={formData.current_designation}
                    onChange={(e) => setFormData({ ...formData, current_designation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Current Company</label>
                  <input
                    type="text"
                    value={formData.current_company}
                    onChange={(e) => setFormData({ ...formData, current_company: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Current Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Key Technical Skills (Comma separated)</label>
                <input
                  type="text"
                  value={Array.isArray(formData.skills) ? formData.skills.join(', ') : formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  placeholder="Python, FastAPI, React, PostgreSQL, Docker..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Notice Period</label>
                  <select
                    value={formData.notice_period}
                    onChange={(e) => setFormData({ ...formData, notice_period: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300"
                  >
                    <option value="Immediate">Immediate</option>
                    <option value="15 Days">15 Days</option>
                    <option value="30 Days">30 Days</option>
                    <option value="60 Days">60 Days</option>
                    <option value="90 Days">90 Days</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">WhatsApp Outreach Consent</label>
                  <select
                    value={formData.whatsapp_consent_status}
                    onChange={(e) => setFormData({ ...formData, whatsapp_consent_status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-emerald-500/30 rounded-lg text-xs text-emerald-300 font-bold"
                  >
                    <option value="GRANTED">Granted (Opted-in)</option>
                    <option value="PENDING">Pending Verification</option>
                    <option value="NOT_COLLECTED">Not Collected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Bench Status</label>
                  <select
                    value={formData.bench_status}
                    onChange={(e) => setFormData({ ...formData, bench_status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300"
                  >
                    <option value="NOT_ON_BENCH">Regular Talent Pool</option>
                    <option value="AVAILABLE">Available on Bench</option>
                    <option value="PARTIALLY_AVAILABLE">Partially Available</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/20 transition"
                >
                  Save Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Bulk CV Upload */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Upload className="w-5 h-5 text-brand-400" />
                  Bulk Upload Candidate Resumes
                </h2>
                <p className="text-xs text-slate-400">Upload multiple PDF, DOC, DOCX files. Each CV is independently parsed.</p>
              </div>
              <button onClick={() => setShowBulkModal(false)} className="text-slate-500 hover:text-white font-bold">✕</button>
            </div>

            {!bulkSummary ? (
              <div className="space-y-4">
                <div
                  onClick={() => bulkFileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-xl p-8 text-center cursor-pointer transition bg-slate-950/50"
                >
                  <input
                    type="file"
                    ref={bulkFileInputRef}
                    onChange={(e) => {
                      if (e.target.files) {
                        setBulkFiles(Array.from(e.target.files));
                      }
                    }}
                    multiple
                    accept=".pdf,.doc,.docx,.txt"
                    className="hidden"
                  />
                  <Upload className="w-8 h-8 text-brand-400 mx-auto mb-2 opacity-80" />
                  <p className="text-xs font-bold text-white">Click to select multiple resume files</p>
                  <p className="text-[11px] text-slate-500 mt-1">Supports PDF, DOC, DOCX (up to 50 files)</p>
                  {bulkFiles.length > 0 && (
                    <div className="mt-3 inline-block px-3 py-1 bg-brand-500/20 text-brand-300 text-xs font-bold border border-brand-500/40 rounded-full">
                      {bulkFiles.length} files selected
                    </div>
                  )}
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-medium">Duplicate Resolution Strategy:</span>
                  <select
                    value={duplicateAction}
                    onChange={(e) => setDuplicateAction(e.target.value)}
                    className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200"
                  >
                    <option value="skip">Skip duplicates (Recommended)</option>
                    <option value="update">Update existing candidate skills</option>
                    <option value="create_anyway">Create as new candidate anyway</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowBulkModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!bulkFiles.length || isBulkProcessing}
                    onClick={handleBulkUpload}
                    className="px-5 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-lg flex items-center gap-2"
                  >
                    {isBulkProcessing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Processing {bulkFiles.length} Resumes...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload & Process All</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Bulk Upload Summary & Breakdown */
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                    <p className="text-xl font-bold text-white">{bulkSummary.total_uploaded}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Total Uploaded</p>
                  </div>
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <p className="text-xl font-bold text-emerald-400">{bulkSummary.successfully_processed}</p>
                    <p className="text-[10px] text-emerald-400/80 uppercase font-semibold">Success</p>
                  </div>
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <p className="text-xl font-bold text-amber-400">{bulkSummary.duplicates_detected}</p>
                    <p className="text-[10px] text-amber-400/80 uppercase font-semibold">Duplicates</p>
                  </div>
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                    <p className="text-xl font-bold text-rose-400">{bulkSummary.failed_count}</p>
                    <p className="text-[10px] text-rose-400/80 uppercase font-semibold">Failed</p>
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto border border-slate-800 rounded-lg divide-y divide-slate-800 bg-slate-950 text-xs">
                  {bulkSummary.items.map((item: any, idx: number) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-white">{item.candidate_name || item.file_name}</p>
                        <p className="text-[10px] text-slate-400">{item.email} • {item.phone}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          item.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-300' :
                          item.status === 'Duplicate' ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setShowBulkModal(false)}
                    className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Quick WhatsApp Consent Recorder */}
      {showConsentModal && selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Record WhatsApp Outreach Consent
            </h3>
            <p className="text-xs text-slate-400">
              Update communication compliance consent for candidate <strong className="text-white">{selectedCandidate.first_name} {selectedCandidate.last_name}</strong> ({selectedCandidate.whatsapp_number || selectedCandidate.phone}).
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => handleRecordConsent(selectedCandidate, 'GRANTED')}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-300 font-bold text-xs transition"
              >
                <span>Grant Consent (Direct Application / Verbal)</span>
                <Check className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleRecordConsent(selectedCandidate, 'REVOKED')}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-300 font-bold text-xs transition"
              >
                <span>Revoke Consent / Block Outreach</span>
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowConsentModal(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
