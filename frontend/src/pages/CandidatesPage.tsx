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
  Clock, ExternalLink, RefreshCw, FileText, Check, AlertTriangle, MessageSquare, Trash2,
  Folder, FolderUp, Layers, Send, Share2, Building, CheckSquare, Square
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
  const [experienceRangeFilter, setExperienceRangeFilter] = useState<string>('all');
  const [stabilityFilter, setStabilityFilter] = useState<string>('all');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  // Checkbox Selection & Submission State
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [selectedRequirementId, setSelectedRequirementId] = useState<string>('');
  const [submissionRemarks, setSubmissionRemarks] = useState<string>('');
  const [isSubmittingBatch, setIsSubmittingBatch] = useState<boolean>(false);
  const [candidateIdsToSubmit, setCandidateIdsToSubmit] = useState<string[]>([]);

  // Deletion States
  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isDeletingSingle, setIsDeletingSingle] = useState(false);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [currentBatchNum, setCurrentBatchNum] = useState(0);
  const [totalBatchCount, setTotalBatchCount] = useState(0);
  const [liveSuccessCount, setLiveSuccessCount] = useState(0);
  const [liveDupCount, setLiveDupCount] = useState(0);
  const [liveFailCount, setLiveFailCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);
  const bulkFolderInputRef = useRef<HTMLInputElement>(null);

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
      if (stabilityFilter && stabilityFilter !== 'all') params.append('stability_rating', stabilityFilter);
      
      if (experienceRangeFilter === '0-1') {
        params.append('min_experience', '0');
        params.append('max_experience', '1');
      } else if (experienceRangeFilter === '1-3') {
        params.append('min_experience', '1');
        params.append('max_experience', '3');
      } else if (experienceRangeFilter === '3-5') {
        params.append('min_experience', '3');
        params.append('max_experience', '5');
      } else if (experienceRangeFilter === '5-8') {
        params.append('min_experience', '5');
        params.append('max_experience', '8');
      } else if (experienceRangeFilter === '8-12') {
        params.append('min_experience', '8');
        params.append('max_experience', '12');
      } else if (experienceRangeFilter === '12+') {
        params.append('min_experience', '12');
      }
      
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

  const fetchRequirements = async () => {
    try {
      const res = await fetch('/api/v1/requirements?status=OPEN', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRequirements(data);
        if (data.length > 0 && !selectedRequirementId) {
          setSelectedRequirementId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch requirements:', err);
    }
  };

  const toggleSelectAll = () => {
    if (selectedCandidateIds.length === candidates.length && candidates.length > 0) {
      setSelectedCandidateIds([]);
    } else {
      setSelectedCandidateIds(candidates.map((c) => c.id));
    }
  };

  const toggleSelectCandidate = (id: string) => {
    setSelectedCandidateIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleOpenSubmitModal = (ids?: string[]) => {
    const targetIds = ids && ids.length > 0 ? ids : selectedCandidateIds;
    if (!targetIds.length) {
      alert('Please select at least one candidate to submit.');
      return;
    }
    setCandidateIdsToSubmit(targetIds);
    setShowSubmitModal(true);
    fetchRequirements();
  };

  const handleExecuteBatchSubmission = async () => {
    if (!selectedRequirementId || !candidateIdsToSubmit.length) {
      alert('Please select a target job requirement.');
      return;
    }

    try {
      setIsSubmittingBatch(true);
      const res = await apiFetch('/api/v1/submissions/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          candidate_ids: candidateIdsToSubmit,
          requirement_id: selectedRequirementId,
          remarks: submissionRemarks || undefined
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || 'Failed to submit candidates.');
        return;
      }

      const result = await res.json();
      alert(
        `Successfully submitted ${result.submitted_count} candidate(s) to client!` +
          (result.skipped_count > 0 ? ` (${result.skipped_count} skipped/already submitted)` : '')
      );

      setShowSubmitModal(false);
      setSelectedCandidateIds([]);
      setSubmissionRemarks('');
      fetchCandidates();
    } catch (err) {
      console.error('Submission error:', err);
      alert('Encountered an error submitting candidate(s).');
    } finally {
      setIsSubmittingBatch(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, [search, statusFilter, skillFilter, waEligibleFilter, experienceRangeFilter, stabilityFilter]);

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

  // Filter supported CV files
  const filterSupportedCVFiles = (filesList: FileList | File[]): File[] => {
    const validExts = ['.pdf', '.doc', '.docx', '.txt'];
    const arr = Array.from(filesList);
    return arr.filter((file) => {
      const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
      return validExts.includes(ext) && !file.name.startsWith('.');
    });
  };

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const valid = filterSupportedCVFiles(e.target.files);
      setBulkFiles(valid);
      setBulkSummary(null);
    }
  };

  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const valid = filterSupportedCVFiles(e.target.files);
      setBulkFiles(valid);
      setBulkSummary(null);
    }
  };

  // Chunked Batch Bulk Upload
  const handleBulkUpload = async () => {
    if (!bulkFiles.length) return;

    const BATCH_SIZE = 20; // Upload 20 files per chunk for fast, reliable parsing
    const totalFiles = bulkFiles.length;
    const totalBatches = Math.ceil(totalFiles / BATCH_SIZE);

    setIsBulkProcessing(true);
    setUploadProgress(0);
    setProcessedCount(0);
    setCurrentBatchNum(0);
    setTotalBatchCount(totalBatches);
    setLiveSuccessCount(0);
    setLiveDupCount(0);
    setLiveFailCount(0);

    const aggregatedSummary: BulkCVUploadSummaryResponse = {
      total_uploaded: totalFiles,
      successfully_processed: 0,
      failed_count: 0,
      duplicates_detected: 0,
      new_candidates_created: 0,
      whatsapp_eligible_count: 0,
      consent_required_count: 0,
      invalid_numbers_count: 0,
      items: []
    };

    try {
      for (let i = 0; i < totalBatches; i++) {
        setCurrentBatchNum(i + 1);
        const start = i * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, totalFiles);
        const chunk = bulkFiles.slice(start, end);

        const data = new FormData();
        chunk.forEach((f) => data.append('files', f));
        data.append('duplicate_action', duplicateAction);

        try {
          const res = await apiFetch('/api/v1/candidates/bulk-upload', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: data
          });

          if (res.ok) {
            const batchSummary: BulkCVUploadSummaryResponse = await res.json();
            aggregatedSummary.successfully_processed += (batchSummary.successfully_processed || 0);
            aggregatedSummary.duplicates_detected += (batchSummary.duplicates_detected || 0);
            aggregatedSummary.failed_count += (batchSummary.failed_count || 0);
            aggregatedSummary.new_candidates_created += (batchSummary.new_candidates_created || 0);
            aggregatedSummary.whatsapp_eligible_count += (batchSummary.whatsapp_eligible_count || 0);
            aggregatedSummary.consent_required_count += (batchSummary.consent_required_count || 0);
            aggregatedSummary.invalid_numbers_count += (batchSummary.invalid_numbers_count || 0);
            if (batchSummary.items && Array.isArray(batchSummary.items)) {
              aggregatedSummary.items.push(...batchSummary.items);
            }

            setLiveSuccessCount(aggregatedSummary.successfully_processed);
            setLiveDupCount(aggregatedSummary.duplicates_detected);
            setLiveFailCount(aggregatedSummary.failed_count);
          } else {
            aggregatedSummary.failed_count += chunk.length;
            setLiveFailCount(aggregatedSummary.failed_count);
          }
        } catch (chunkErr) {
          console.error(`Error processing batch ${i + 1}:`, chunkErr);
          aggregatedSummary.failed_count += chunk.length;
          setLiveFailCount(aggregatedSummary.failed_count);
        }

        const processedSoFar = end;
        setProcessedCount(processedSoFar);
        setUploadProgress(Math.round((processedSoFar / totalFiles) * 100));
      }

      setBulkSummary(aggregatedSummary);
      fetchCandidates();
    } catch (err) {
      console.error('Bulk upload error:', err);
      alert('Encountered an error during bulk resume upload.');
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

  // Single Candidate Deletion Handler
  const handleOpenSingleDeleteModal = (cand: Candidate) => {
    setCandidateToDelete(cand);
  };

  const handleConfirmSingleDelete = async () => {
    if (!candidateToDelete) return;

    try {
      setIsDeletingSingle(true);
      const res = await apiFetch(`/api/v1/candidates/${candidateToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const error = await res.json();
        alert(error.detail || 'Failed to delete candidate.');
        return;
      }
      setSelectedCandidateIds((prev) => prev.filter((id) => id !== candidateToDelete.id));
      setCandidateToDelete(null);
      fetchCandidates();
    } catch (err) {
      console.error('Delete candidate error:', err);
      alert('Failed to delete candidate.');
    } finally {
      setIsDeletingSingle(false);
    }
  };

  // Bulk Candidate Deletion Handler
  const handleConfirmBulkDelete = async () => {
    if (!selectedCandidateIds.length) return;

    try {
      setIsDeletingBulk(true);
      const res = await apiFetch('/api/v1/candidates/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          candidate_ids: selectedCandidateIds
        })
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.detail || 'Failed to delete selected candidates.');
        return;
      }

      const data = await res.json();
      setSelectedCandidateIds([]);
      setShowBulkDeleteModal(false);
      fetchCandidates();
      alert(data.message || `Successfully deleted ${data.deleted_count || selectedCandidateIds.length} candidate(s).`);
    } catch (err) {
      console.error('Bulk delete candidates error:', err);
      alert('Encountered an error while deleting candidates.');
    } finally {
      setIsDeletingBulk(false);
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
              placeholder="Search candidate by name, phone, skills, designation, experience (e.g. 5 yrs), company..."
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
            className="w-36 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 hidden sm:block"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Job Stability & Retention filter */}
          <select
            value={stabilityFilter}
            onChange={(e) => setStabilityFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-amber-500/30 rounded-lg text-xs text-amber-300 font-semibold focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Employment Stability</option>
            <option value="HIGH_RETENTION">🛡️ Long-Term Retention</option>
            <option value="STABLE">Standard Career Progression</option>
            <option value="MODERATE">Moderate Stability</option>
            <option value="FREQUENT_CHANGER">🔍 HR Review: Frequent Transitions (&lt; 12 mo)</option>
          </select>

          {/* Experience Year-wise filter */}
          <select
            value={experienceRangeFilter}
            onChange={(e) => setExperienceRangeFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-brand-500/30 rounded-lg text-xs text-brand-300 font-medium focus:outline-none focus:border-brand-500"
          >
            <option value="all">All Experience (Years)</option>
            <option value="0-1">0 - 1 Years (Fresher)</option>
            <option value="1-3">1 - 3 Years (Junior)</option>
            <option value="3-5">3 - 5 Years (Mid-Level)</option>
            <option value="5-8">5 - 8 Years (Senior)</option>
            <option value="8-12">8 - 12 Years (Lead / Staff)</option>
            <option value="12+">12+ Years (Principal / Exec)</option>
          </select>

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
            <option value="all">All WhatsApp</option>
            <option value="eligible">WhatsApp Ready</option>
            <option value="ineligible">Consent Required</option>
          </select>
        </div>
      </div>

      {/* Floating / Top Batch Action Bar */}
      {selectedCandidateIds.length > 0 && (
        <div className="bg-gradient-to-r from-brand-900/90 via-slate-900/95 to-slate-900/90 border border-brand-500/50 rounded-2xl p-4 shadow-2xl flex flex-wrap items-center justify-between gap-4 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/20 text-brand-300 border border-brand-500/40 flex items-center justify-center font-extrabold text-sm shadow-inner">
              {selectedCandidateIds.length}
            </div>
            <div>
              <p className="text-sm font-bold text-white flex items-center gap-2">
                {selectedCandidateIds.length} Candidate{selectedCandidateIds.length > 1 ? 's' : ''} Selected
                <span className="px-2 py-0.5 bg-brand-500/20 text-brand-300 text-[10px] font-bold rounded-full border border-brand-500/30">
                  Ready for Action
                </span>
              </p>
              <p className="text-[11px] text-slate-400">
                Submit directly to a client job requirement or execute batch outreach
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Submit to Client Requirement */}
            <button
              onClick={() => handleOpenSubmitModal()}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-brand-500/30 hover:scale-105 active:scale-95"
            >
              <Share2 className="w-4 h-4" />
              <span>Submit to Client</span>
            </button>

            {/* Delete Selected Candidates */}
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-rose-500/30 hover:scale-105 active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Selected ({selectedCandidateIds.length})</span>
            </button>

            <button
              onClick={() => setSelectedCandidateIds([])}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Candidate List Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 text-[11px]">
              <tr>
                <th className="py-3.5 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedCandidateIds.length === candidates.length && candidates.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-brand-600 focus:ring-brand-500 cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-4">Candidate</th>
                <th className="py-3.5 px-4">Contact & WhatsApp</th>
                <th className="py-3.5 px-4">Exp, Companies & Stability</th>
                <th className="py-3.5 px-4">Skills</th>
                <th className="py-3.5 px-4">Outreach Status</th>
                <th className="py-3.5 px-4">Bench Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-400" />
                    Loading candidates...
                  </td>
                </tr>
              ) : candidates.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No candidates found matching your criteria.
                  </td>
                </tr>
              ) : (
                candidates.map((cand) => {
                  const isEligible = cand.whatsapp_eligibility?.is_eligible;
                  const consentSt = cand.whatsapp_consent_status;
                  const isOptedOut = cand.whatsapp_opt_out_status;
                  const isChecked = selectedCandidateIds.includes(cand.id);

                  return (
                    <tr
                      key={cand.id}
                      className={`hover:bg-slate-800/40 transition ${
                        isChecked ? 'bg-brand-950/20 border-l-2 border-brand-500' : ''
                      }`}
                    >
                      {/* Checkbox Column */}
                      <td className="py-3.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectCandidate(cand.id)}
                          className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-brand-600 focus:ring-brand-500 cursor-pointer"
                        />
                      </td>

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
                            <span className="font-semibold text-slate-200">{cand.whatsapp_number || cand.phone || '—'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Experience, Companies & Retention Stability */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <p className="text-white font-semibold flex items-center gap-1.5">
                            {cand.current_designation || 'Software Engineer'}
                          </p>
                          <p className="text-[11px] text-slate-300">
                            <strong className="text-white">{cand.total_experience} yrs</strong> • {cand.companies_count || (cand.employment_history?.length || 1)} {(cand.companies_count || 1) === 1 ? 'co' : 'cos'} • <span className="text-slate-400">Avg {cand.stability_metrics?.average_tenure_months ? `${cand.stability_metrics.average_tenure_months}m` : `${Math.round((cand.average_tenure_years || cand.total_experience) * 12)}m`}/co</span>
                          </p>
                          <div className="pt-0.5">
                            {cand.stability_rating === 'FREQUENT_CHANGER' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40" title="HR Review Recommended: Short average tenures">
                                <AlertTriangle className="w-3 h-3 text-amber-400" />
                                HR Review: Frequent Transitions ({cand.companies_count || (cand.employment_history?.length || 1)} cos)
                              </span>
                            ) : cand.stability_rating === 'HIGH_RETENTION' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                Long-Term Retention (Avg {cand.average_tenure_years || cand.total_experience}y)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                                Standard Career Growth • {cand.companies_count || 1} cos
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Skills */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {(cand.skills || []).slice(0, 3).map((s: string, idx: number) => (
                            <span key={idx} className="px-1.5 py-0.5 bg-slate-800 text-slate-300 text-[10px] rounded border border-slate-700 font-medium">
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
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Submit to Client Button */}
                          <button
                            onClick={() => handleOpenSubmitModal([cand.id])}
                            title="Submit to Client / Requirement"
                            className="flex items-center gap-1 px-2 py-1 bg-emerald-950/40 hover:bg-emerald-900/80 text-emerald-300 hover:text-white rounded-lg border border-emerald-800/60 text-xs font-semibold transition"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            <span>Submit</span>
                          </button>

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

                          {/* Delete Candidate */}
                          <button
                            onClick={() => handleOpenSingleDeleteModal(cand)}
                            title="Delete candidate"
                            className="flex items-center gap-1 px-2 py-1 bg-rose-950/40 hover:bg-rose-900/80 text-rose-300 hover:text-white rounded-lg border border-rose-800/60 text-xs font-semibold transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
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
                {/* Hidden File Inputs */}
                <input
                  type="file"
                  ref={bulkFolderInputRef}
                  onChange={handleFolderSelect}
                  // @ts-ignore
                  webkitdirectory=""
                  directory=""
                  multiple
                  className="hidden"
                />
                <input
                  type="file"
                  ref={bulkFileInputRef}
                  onChange={handleFilesSelect}
                  multiple
                  accept=".pdf,.doc,.docx,.txt"
                  className="hidden"
                />

                {/* Upload Options Selector Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Select Entire Folder Option */}
                  <div
                    onClick={() => !isBulkProcessing && bulkFolderInputRef.current?.click()}
                    className={`border-2 border-dashed border-brand-500/50 hover:border-brand-400 bg-brand-950/20 hover:bg-brand-950/40 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center group ${
                      isBulkProcessing ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <FolderUp className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-white">Select Entire Folder</p>
                    <p className="text-[11px] text-slate-400 mt-1">Upload whole directory (up to 5,000+ CVs)</p>
                    <span className="mt-3 px-3 py-1 bg-brand-500/20 text-brand-300 text-[10px] font-bold rounded-full border border-brand-500/30">
                      📁 Recommended for Bulk Pool
                    </span>
                  </div>

                  {/* Select Multiple Files Option */}
                  <div
                    onClick={() => !isBulkProcessing && bulkFileInputRef.current?.click()}
                    className={`border-2 border-dashed border-slate-700 hover:border-slate-500 bg-slate-950/60 hover:bg-slate-900 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center group ${
                      isBulkProcessing ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <FileText className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-white">Select Multiple Files</p>
                    <p className="text-[11px] text-slate-400 mt-1">Choose individual PDF, DOC, DOCX files</p>
                    <span className="mt-3 px-3 py-1 bg-slate-800 text-slate-300 text-[10px] font-bold rounded-full border border-slate-700">
                      📄 Multi-Select Files
                    </span>
                  </div>
                </div>

                {/* Selected Files Count & Status */}
                {bulkFiles.length > 0 && (
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Layers className="w-4 h-4 text-brand-400" />
                      <div>
                        <p className="text-xs font-bold text-slate-100">
                          {bulkFiles.length.toLocaleString()} Resumes Ready to Process
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Will be parsed and uploaded in batches of 50 files for maximum reliability
                        </p>
                      </div>
                    </div>
                    {!isBulkProcessing && (
                      <button
                        type="button"
                        onClick={() => setBulkFiles([])}
                        className="text-[11px] text-rose-400 hover:text-rose-300 underline font-semibold"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}

                {/* Live Processing Progress Bar */}
                {isBulkProcessing && (
                  <div className="bg-slate-950 p-4 rounded-xl border border-brand-500/40 space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 text-brand-400 animate-spin" />
                        Batch {currentBatchNum} of {totalBatchCount}
                      </span>
                      <span className="font-extrabold text-brand-400">{uploadProgress}%</span>
                    </div>

                    {/* Progress Track */}
                    <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-brand-600 via-sky-400 to-emerald-400 h-full transition-all duration-300 rounded-full shadow-lg shadow-brand-500/50"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>{processedCount.toLocaleString()} of {bulkFiles.length.toLocaleString()} files processed</span>
                      <div className="flex items-center gap-3">
                        <span className="text-emerald-400 font-bold">✓ {liveSuccessCount} Success</span>
                        <span className="text-amber-400 font-bold">⚠️ {liveDupCount} Dup</span>
                        <span className="text-rose-400 font-bold">✕ {liveFailCount} Fail</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Duplicate Strategy Option */}
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-medium">Duplicate Resolution Strategy:</span>
                  <select
                    value={duplicateAction}
                    disabled={isBulkProcessing}
                    onChange={(e) => setDuplicateAction(e.target.value)}
                    className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 disabled:opacity-50"
                  >
                    <option value="skip">Skip duplicates (Recommended)</option>
                    <option value="update">Update existing candidate skills</option>
                    <option value="create_anyway">Create as new candidate anyway</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isBulkProcessing}
                    onClick={() => setShowBulkModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!bulkFiles.length || isBulkProcessing}
                    onClick={handleBulkUpload}
                    className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-500/25 flex items-center gap-2 transition"
                  >
                    {isBulkProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Uploading ({uploadProgress}%)...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Upload & Process All ({bulkFiles.length.toLocaleString()} CVs)</span>
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
                    onClick={() => {
                      setShowBulkModal(false);
                      setBulkFiles([]);
                      setBulkSummary(null);
                      fetchCandidates();
                    }}
                    className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-500/25 transition"
                  >
                    ✓ View Candidates in Talent Pool
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Submit Candidate(s) to Client / Requirement */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Submit to Client / Requirement</h3>
                  <p className="text-xs text-slate-400">Forward candidate profiles to active client positions</p>
                </div>
              </div>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Selected Candidates Summary */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-300 block uppercase tracking-wider">
                Selected Candidate{candidateIdsToSubmit.length > 1 ? 's' : ''} ({candidateIdsToSubmit.length}):
              </span>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1">
                {candidateIdsToSubmit.map((cid) => {
                  const cand = candidates.find((c) => c.id === cid);
                  return (
                    <div
                      key={cid}
                      className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 flex items-center gap-1.5"
                    >
                      <span className="font-semibold text-white">
                        {cand ? `${cand.first_name} ${cand.last_name}` : cid}
                      </span>
                      {cand?.total_experience ? (
                        <span className="text-[10px] text-slate-400">({cand.total_experience}y exp)</span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Target Job Requirement Picker */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>Select Target Job Requirement & Client *</span>
                {requirements.length === 0 && (
                  <span className="text-amber-400 text-[11px]">Loading active requirements...</span>
                )}
              </label>
              <select
                value={selectedRequirementId}
                onChange={(e) => setSelectedRequirementId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
              >
                {requirements.length === 0 ? (
                  <option value="">No open job requirements found</option>
                ) : (
                  requirements.map((r: any) => (
                    <option key={r.id} value={r.id}>
                      {r.req_code} — {r.job_title} ({r.client_name || 'Client'}) • {r.openings_count || 1} Opening(s)
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Selected Requirement Details Preview Card */}
            {selectedRequirementId && (
              (() => {
                const req = requirements.find((r: any) => r.id === selectedRequirementId);
                if (!req) return null;
                return (
                  <div className="bg-brand-950/20 border border-brand-500/30 rounded-xl p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-brand-300 text-sm">{req.job_title}</span>
                      <span className="px-2 py-0.5 bg-brand-500/20 text-brand-300 rounded text-[10px] font-bold uppercase">
                        {req.req_code}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                      <div>
                        <span className="text-slate-500 block">Client:</span>
                        <strong className="text-white">{req.client_name || '—'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Experience Required:</span>
                        <span>{req.experience_min} - {req.experience_max} Years</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Location & Mode:</span>
                        <span>{req.location || 'Remote'} ({req.work_mode || 'HYBRID'})</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Department:</span>
                        <span>{req.department || 'Engineering'}</span>
                      </div>
                    </div>
                    {req.required_skills && req.required_skills.length > 0 && (
                      <div className="pt-1">
                        <span className="text-slate-500 text-[10px] block mb-1">Required Skills:</span>
                        <div className="flex flex-wrap gap-1">
                          {req.required_skills.map((sk: string, i: number) => (
                            <span key={i} className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 text-slate-300 rounded text-[10px]">
                              {sk}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()
            )}

            {/* Recruiter Remarks / Pitch Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                Recruiter Remarks / Submission Notes (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="e.g., Screened candidates for technical fit and immediately available with required notice period..."
                value={submissionRemarks}
                onChange={(e) => setSubmissionRemarks(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Submission Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                disabled={isSubmittingBatch}
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingBatch || !selectedRequirementId}
                onClick={handleExecuteBatchSubmission}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/25 transition"
              >
                {isSubmittingBatch ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Submitting to Client...</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    <span>Submit {candidateIdsToSubmit.length} Candidate{candidateIdsToSubmit.length > 1 ? 's' : ''}</span>
                  </>
                )}
              </button>
            </div>
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

      {/* Modal: Single Candidate Deletion Confirmation */}
      {candidateToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-white">
                  Delete Candidate Profile
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Are you sure you want to delete candidate <strong className="text-white">{candidateToDelete.first_name} {candidateToDelete.last_name}</strong>?
                </p>
              </div>
            </div>

            {/* Candidate details preview card */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1.5 text-xs text-slate-300">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">{candidateToDelete.first_name} {candidateToDelete.last_name}</span>
                <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-[10px] font-mono">
                  {candidateToDelete.candidate_code}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {candidateToDelete.email} • {candidateToDelete.whatsapp_number || candidateToDelete.phone || 'No phone'}
              </p>
              <p className="text-[11px] text-slate-400">
                {candidateToDelete.current_designation || 'Software Engineer'} • {candidateToDelete.total_experience}y experience
              </p>
            </div>

            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-[11px] text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>This action is permanent and will remove this candidate along with their CV documents, interview evaluations, and submission records.</span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeletingSingle}
                onClick={() => setCandidateToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white disabled:opacity-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingSingle}
                onClick={handleConfirmSingleDelete}
                className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-500/30 transition cursor-pointer"
              >
                {isDeletingSingle ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Candidate</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Bulk Candidate Deletion Confirmation */}
      {showBulkDeleteModal && selectedCandidateIds.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-white">
                  Delete {selectedCandidateIds.length} Selected Candidates
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  You are about to delete <strong className="text-rose-300 font-bold">{selectedCandidateIds.length} candidate(s)</strong> at once.
                </p>
              </div>
            </div>

            {/* List of candidates to be deleted */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400">Candidates to be removed:</label>
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 max-h-40 overflow-y-auto custom-scrollbar flex flex-wrap gap-1.5">
                {selectedCandidateIds.map((cid) => {
                  const cand = candidates.find((c) => c.id === cid);
                  return (
                    <span
                      key={cid}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-200"
                    >
                      <span className="font-semibold text-white">
                        {cand ? `${cand.first_name} ${cand.last_name}` : cid}
                      </span>
                      {cand?.candidate_code && (
                        <span className="text-[10px] text-slate-400 font-mono">({cand.candidate_code})</span>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-[11px] text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>This operation cannot be undone. All selected candidate profiles, associated resume files, submission records, and interview histories will be permanently removed.</span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeletingBulk}
                onClick={() => setShowBulkDeleteModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white disabled:opacity-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingBulk}
                onClick={handleConfirmBulkDelete}
                className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-500/30 transition cursor-pointer"
              >
                {isDeletingBulk ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Deleting {selectedCandidateIds.length} Candidates...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete {selectedCandidateIds.length} Candidate{selectedCandidateIds.length > 1 ? 's' : ''}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
