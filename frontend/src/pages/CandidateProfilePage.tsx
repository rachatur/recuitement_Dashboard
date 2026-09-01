import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Candidate, CandidateDocument, CandidateStatusHistory, EmploymentHistoryItem } from '../types';
import {
  User, Mail, Phone, MapPin, Briefcase, Calendar,
  ShieldCheck, ShieldAlert, Download, Upload, CheckCircle2,
  XCircle, Clock, ExternalLink, ArrowLeft, RefreshCw, MessageSquare,
  Award, FileText, Check, AlertTriangle, Send, Trash2, Share2, Building,
  History, TrendingUp, Edit2, Plus, Layers
} from 'lucide-react';

interface CandidateProfilePageProps {
  candidateId: string;
  onBack: () => void;
}

export const CandidateProfilePage: React.FC<CandidateProfilePageProps> = ({
  candidateId,
  onBack
}) => {
  const { token } = useAuth();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'employment' | 'lifecycle' | 'whatsapp' | 'documents' | 'history'>('profile');
  const [templates, setTemplates] = useState<any[]>([]);
  const [showSendMessageModal, setShowSendMessageModal] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [customMessageText, setCustomMessageText] = useState<string>('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Submit to Client Modal State
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [selectedRequirementId, setSelectedRequirementId] = useState<string>('');
  const [submissionRemarks, setSubmissionRemarks] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Employment History Management State
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [editingCompanyIndex, setEditingCompanyIndex] = useState<number | null>(null);
  const [isSavingHistory, setIsSavingHistory] = useState(false);
  const [companyFormData, setCompanyFormData] = useState<EmploymentHistoryItem>({
    company_name: '',
    designation: '',
    start_date: '',
    end_date: '',
    duration_years: 1.0,
    duration_months: 12,
    is_current: false,
    location: '',
    description: '',
    reason_for_leaving: ''
  });

  const fetchCandidateDetail = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/candidates/${candidateId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCandidate(data);
      }
    } catch (err) {
      console.error('Failed to fetch candidate details:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/v1/whatsapp/templates', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
        if (data.length > 0) setSelectedTemplateId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err);
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

  const handleExecuteSingleSubmission = async () => {
    if (!selectedRequirementId || !candidate) {
      alert('Please select a target job requirement.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/v1/submissions/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          candidate_ids: [candidate.id],
          requirement_id: selectedRequirementId,
          remarks: submissionRemarks || undefined
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || 'Failed to submit candidate.');
        return;
      }

      const result = await res.json();
      if (result.submitted_count > 0) {
        alert('Candidate successfully submitted to client!');
        setShowSubmitModal(false);
        setSubmissionRemarks('');
        fetchCandidateDetail();
      } else if (result.skipped_count > 0 && result.skipped[0]) {
        alert(result.skipped[0].reason || 'Candidate was already submitted to this requirement.');
      }
    } catch (err) {
      console.error('Submission error:', err);
      alert('Encountered an error submitting candidate to client.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchCandidateDetail();
    fetchTemplates();
  }, [candidateId]);

  const handleDownloadCV = async (filename?: string) => {
    try {
      const res = await fetch(`/api/v1/candidates/${candidateId}/cv/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        // Fallback to latest document url if present
        if (candidate?.latest_document?.file_url) {
          const docRes = await fetch(candidate.latest_document.file_url, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (docRes.ok) {
            const blob = await docRes.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename || candidate.latest_document.file_name || `${candidate.first_name}_${candidate.last_name}_Resume.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
            return;
          }
        }
        alert('Could not download candidate CV.');
        return;
      }
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename || candidate?.latest_document?.file_name || `${candidate?.first_name || 'Candidate'}_Resume.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download error:', err);
      alert('Encountered an error downloading CV.');
    }
  };

  const handleGrantConsent = async () => {
    try {
      const res = await fetch(`/api/v1/candidates/${candidateId}/consent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          candidate_id: candidateId,
          consent_status: 'GRANTED',
          consent_source: 'Candidate Profile Admin Panel',
          evidence_reference: 'Direct Recruiter Verification'
        })
      });
      if (res.ok) fetchCandidateDetail();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRevokeConsent = async () => {
    try {
      const res = await fetch(`/api/v1/candidates/${candidateId}/revoke-consent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          candidate_id: candidateId,
          reason: 'Consent revoked manually in candidate profile'
        })
      });
      if (res.ok) fetchCandidateDetail();
    } catch (err) {
      console.error(err);
    }
  };

  const handleOptOut = async () => {
    try {
      const res = await fetch(`/api/v1/candidates/${candidateId}/opt-out`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchCandidateDetail();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendDirectWhatsApp = async () => {
    try {
      setIsSendingMessage(true);
      const res = await fetch(`/api/v1/whatsapp/candidates/${candidateId}/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          template_id: selectedTemplateId || undefined,
          content: customMessageText || undefined
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || 'Failed to send WhatsApp message.');
        return;
      }

      setShowSendMessageModal(false);
      setCustomMessageText('');
      fetchCandidateDetail();
      alert('WhatsApp message successfully dispatched!');
    } catch (err) {
      console.error('Send WhatsApp error:', err);
      alert('Failed to dispatch WhatsApp message.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleDeleteCurrentCandidate = async () => {
    if (!candidate) return;
    if (!window.confirm(`Are you sure you want to delete ${candidate.first_name} ${candidate.last_name}? This action cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/v1/candidates/${candidateId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || 'Failed to delete candidate.');
        return;
      }
      alert('Candidate deleted successfully.');
      onBack();
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete candidate.');
    }
  };

  const handleOpenAddCompany = () => {
    setEditingCompanyIndex(null);
    setCompanyFormData({
      company_name: '',
      designation: '',
      start_date: '',
      end_date: '',
      duration_years: 1.0,
      duration_months: 12,
      is_current: false,
      location: '',
      description: '',
      reason_for_leaving: ''
    });
    setShowCompanyModal(true);
  };

  const handleOpenEditCompany = (index: number) => {
    const item = (candidate?.employment_history || [])[index];
    if (!item) return;
    setEditingCompanyIndex(index);
    setCompanyFormData({
      company_name: item.company_name || '',
      designation: item.designation || '',
      start_date: item.start_date || '',
      end_date: item.end_date || '',
      duration_years: item.duration_years ?? 1.0,
      duration_months: item.duration_months ?? 12,
      is_current: !!item.is_current,
      location: item.location || '',
      description: item.description || '',
      reason_for_leaving: item.reason_for_leaving || ''
    });
    setShowCompanyModal(true);
  };

  const handleSaveCompanyEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidate || !companyFormData.company_name.trim()) {
      alert('Please enter the company name.');
      return;
    }

    try {
      setIsSavingHistory(true);
      const currentList = [...(candidate.employment_history || [])];
      const entry: EmploymentHistoryItem = {
        ...companyFormData,
        company_name: companyFormData.company_name.trim(),
        duration_years: parseFloat(String(companyFormData.duration_years)) || 1.0,
        duration_months: parseInt(String(companyFormData.duration_months)) || Math.round((parseFloat(String(companyFormData.duration_years)) || 1.0) * 12)
      };

      if (editingCompanyIndex !== null && editingCompanyIndex >= 0) {
        currentList[editingCompanyIndex] = entry;
      } else {
        currentList.unshift(entry);
      }

      const res = await fetch(`/api/v1/candidates/${candidateId}/employment-history`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(currentList)
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || 'Failed to update employment history.');
        return;
      }

      const updated = await res.json();
      setCandidate(updated);
      setShowCompanyModal(false);
    } catch (err) {
      console.error('Error saving company history:', err);
      alert('Failed to save company history.');
    } finally {
      setIsSavingHistory(false);
    }
  };

  const handleDeleteCompanyEntry = async (index: number) => {
    if (!candidate) return;
    const item = (candidate.employment_history || [])[index];
    if (!item) return;

    if (!window.confirm(`Remove "${item.company_name}" from candidate's employment history?`)) return;

    try {
      setIsSavingHistory(true);
      const updatedList = (candidate.employment_history || []).filter((_, idx) => idx !== index);
      const res = await fetch(`/api/v1/candidates/${candidateId}/employment-history`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updatedList)
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || 'Failed to remove employment record.');
        return;
      }

      const updated = await res.json();
      setCandidate(updated);
    } catch (err) {
      console.error('Error removing company history:', err);
      alert('Failed to remove company history.');
    } finally {
      setIsSavingHistory(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-brand-400" />
        Loading candidate profile...
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="py-20 text-center text-slate-400 space-y-4">
        <AlertTriangle className="w-10 h-10 mx-auto text-amber-400" />
        <p>Candidate not found.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg"
        >
          Return to Candidates List
        </button>
      </div>
    );
  }

  const isEligible = candidate.whatsapp_eligibility?.is_eligible;

  return (
    <div className="space-y-6">
      {/* Header & Back Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-extrabold text-white">
                {candidate.first_name} {candidate.last_name}
              </h1>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                {candidate.candidate_code}
              </span>
              {candidate.bench_status && candidate.bench_status !== 'NOT_ON_BENCH' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
                  Bench • {candidate.bench_status}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {candidate.current_designation || 'Software Engineer'} • {candidate.current_company || 'Independent'} • {candidate.location || 'Remote'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchRequirements();
              setShowSubmitModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold transition shadow-lg shadow-brand-500/25"
          >
            <Share2 className="w-4 h-4" />
            <span>Submit to Client / Requirement</span>
          </button>

          <button
            onClick={() => handleDownloadCV(candidate.latest_document?.file_name)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold border border-slate-700 transition shadow"
          >
            <Download className="w-4 h-4 text-slate-300" />
            <span>Download Verified CV</span>
          </button>

          <button
            onClick={handleDeleteCurrentCandidate}
            className="flex items-center gap-2 px-4 py-2 bg-rose-950/50 hover:bg-rose-900/80 text-rose-300 hover:text-white rounded-lg text-xs font-bold border border-rose-800/60 transition shadow"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Candidate</span>
          </button>
        </div>
      </div>

      {/* 6-Tab Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-bold transition border-b-2 ${
            activeTab === 'profile'
              ? 'border-brand-500 text-brand-300 bg-slate-900/80'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Personal & Professional</span>
        </button>

        <button
          onClick={() => setActiveTab('employment')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-bold transition border-b-2 ${
            activeTab === 'employment'
              ? 'border-brand-500 text-brand-300 bg-slate-900/80'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4 text-brand-400" />
          <span>Employment History & Retention</span>
          {candidate.stability_rating === 'FREQUENT_CHANGER' ? (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              ⚠️ Frequent Changer
            </span>
          ) : candidate.stability_rating === 'HIGH_RETENTION' ? (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              🛡️ High Retention
            </span>
          ) : null}
        </button>

        <button
          onClick={() => setActiveTab('lifecycle')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-bold transition border-b-2 ${
            activeTab === 'lifecycle'
              ? 'border-brand-500 text-brand-300 bg-slate-900/80'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Recruitment Lifecycle</span>
        </button>

        <button
          onClick={() => setActiveTab('whatsapp')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-bold transition border-b-2 ${
            activeTab === 'whatsapp'
              ? 'border-emerald-500 text-emerald-300 bg-slate-900/80'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-emerald-400" />
          <span>WhatsApp & Compliance</span>
          {isEligible && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('documents')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-bold transition border-b-2 ${
            activeTab === 'documents'
              ? 'border-brand-500 text-brand-300 bg-slate-900/80'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Documents & Resumes ({candidate.documents?.length || 1})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-bold transition border-b-2 ${
            activeTab === 'history'
              ? 'border-brand-500 text-brand-300 bg-slate-900/80'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Timeline & Audit</span>
        </button>
      </div>

      {/* Tab 1: Personal & Professional */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* Quick Job Stability Snapshot Banner */}
            <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              candidate.stability_rating === 'FREQUENT_CHANGER'
                ? 'bg-amber-950/20 border-amber-500/40 text-amber-200'
                : candidate.stability_rating === 'HIGH_RETENTION'
                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                : 'bg-slate-900/90 border-slate-800 text-slate-200'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  candidate.stability_rating === 'FREQUENT_CHANGER'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {candidate.stability_rating === 'FREQUENT_CHANGER' ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <ShieldCheck className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
                      Job Stability & Retention Analysis
                    </h4>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      candidate.stability_rating === 'FREQUENT_CHANGER'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : candidate.stability_rating === 'HIGH_RETENTION'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}>
                      {candidate.stability_label || candidate.stability_rating || 'Stable Retention'}
                    </span>
                  </div>
                  <p className="text-xs mt-1 text-slate-300">
                    <strong>Total Exp:</strong> {candidate.total_experience} yrs • <strong>Previous Companies:</strong> {candidate.companies_count || (candidate.employment_history?.length || 1)} • <strong>Avg Tenure:</strong> {candidate.average_tenure_years || candidate.total_experience} yr/company
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('employment')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold border border-slate-700 transition shrink-0 flex items-center gap-1.5"
              >
                <History className="w-3.5 h-3.5 text-brand-400" />
                <span>View Full Employment History</span>
              </button>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white">Professional Experience & Background</h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block mb-1">Total Experience</span>
                  <span className="text-white font-bold">{candidate.total_experience} Years</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Relevant Experience</span>
                  <span className="text-white font-bold">{candidate.relevant_experience} Years</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Position / Job Title</span>
                  <span className="text-cyan-300 font-bold flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
                    {candidate.position || candidate.current_designation || 'Software Engineer'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Current Company</span>
                  <span className="text-white font-bold">{candidate.current_company || 'Not Specified'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Notice Period</span>
                  <span className="text-white font-bold">{candidate.notice_period || `${candidate.notice_period_days} Days`}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Highest Qualification</span>
                  <span className="text-white font-bold">{candidate.highest_qualification || candidate.education || "Bachelor's Degree"}</span>
                </div>
              </div>
            </div>

            {/* Primary & Secondary Skills Classification */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Skills & Technical Classification
              </h3>

              {/* Primary Skills */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  ★ Primary Skills (Core Competencies)
                </h4>
                <div className="flex flex-wrap gap-2">
                  {(candidate.primary_skills || candidate.bench_primary_skills || (candidate.skills ? candidate.skills.slice(0, 3) : [])).map((s: string, idx: number) => (
                    <span key={idx} className="px-3 py-1 bg-emerald-500/10 text-emerald-300 text-xs font-bold rounded-lg border border-emerald-500/30 shadow-sm flex items-center gap-1">
                      ★ {s}
                    </span>
                  ))}
                  {!(candidate.primary_skills || candidate.bench_primary_skills || candidate.skills)?.length && (
                    <span className="text-xs text-slate-500 italic">No primary skills listed</span>
                  )}
                </div>
              </div>

              {/* Secondary Skills */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Secondary Skills (Supporting & Domain)
                </h4>
                <div className="flex flex-wrap gap-2">
                  {(candidate.secondary_skills || candidate.bench_secondary_skills || (candidate.skills ? candidate.skills.slice(3) : [])).map((s: string, idx: number) => (
                    <span key={idx} className="px-2.5 py-1 bg-slate-800/80 text-slate-300 text-xs font-medium rounded-lg border border-slate-700">
                      {s}
                    </span>
                  ))}
                  {!(candidate.secondary_skills || candidate.bench_secondary_skills || (candidate.skills && candidate.skills.length > 3)) && (
                    <span className="text-xs text-slate-500 italic">No secondary skills</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4 text-xs">
              <h3 className="text-sm font-bold text-white">Contact & Verification</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-300">
                  <Mail className="w-4 h-4 text-brand-400 shrink-0" />
                  <span className="truncate">{candidate.email}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{candidate.whatsapp_number || candidate.phone || '—'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{candidate.location || 'Remote / Unspecified'}</span>
                </div>
              </div>

              {candidate.linkedin_url && (
                <div className="pt-2 border-t border-slate-800">
                  <a
                    href={candidate.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-brand-400 hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>LinkedIn Profile</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Employment History & Retention Analysis (HR-20 Specification) */}
      {activeTab === 'employment' && (
        <div className="space-y-6">
          {/* HR-20 Summary Headline Banner */}
          <div className="p-5 bg-gradient-to-r from-slate-900 via-brand-950/40 to-slate-900 border border-brand-500/40 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 bg-brand-500/20 text-brand-300 text-[11px] font-extrabold rounded-md uppercase tracking-wider border border-brand-500/30">
                  HR-20 Employment Stability Breakdown
                </span>
                {candidate.stability_metrics?.hr_review_required ? (
                  <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 text-[11px] font-bold rounded-md border border-amber-500/40 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    HR / Manager Review Recommended
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[11px] font-bold rounded-md border border-emerald-500/40 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Standard Career Progression
                  </span>
                )}
              </div>

              {/* Exact HR-20 Headline Format */}
              <p className="text-base sm:text-lg font-extrabold text-white tracking-tight pt-1">
                {candidate.stability_metrics?.summary_headline || (
                  `${candidate.total_experience} years of experience | ${candidate.companies_count || (candidate.employment_history?.length || 1)} companies | Average tenure: ${Math.round((candidate.average_tenure_years || candidate.total_experience) * 12)} months | ${Math.max(0, (candidate.companies_count || candidate.employment_history?.length || 1) - 1)} job changes in ${Math.round(candidate.total_experience) || 1} years`
                )}
              </p>

              <p className="text-xs text-slate-400 leading-relaxed">
                ℹ️ <em>Factual employment record provided as supporting evidence during human interview evaluation without automated bias.</em>
              </p>
            </div>

            <button
              onClick={handleOpenAddCompany}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-brand-500/25 shrink-0 hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Previous Company</span>
            </button>
          </div>

          {/* Top 4 KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Total Experience */}
            <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span className="font-semibold uppercase tracking-wider">Total Experience</span>
                <Clock className="w-4 h-4 text-brand-400" />
              </div>
              <p className="text-2xl font-extrabold text-white">
                {candidate.total_experience} <span className="text-sm font-semibold text-slate-400">Years</span>
              </p>
              <p className="text-[11px] text-slate-400">
                {candidate.relevant_experience} yrs relevant domain exp
              </p>
            </div>

            {/* KPI 2: Number of Companies Worked For */}
            <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span className="font-semibold uppercase tracking-wider">Companies Worked For</span>
                <Building className="w-4 h-4 text-sky-400" />
              </div>
              <p className="text-2xl font-extrabold text-white">
                {candidate.companies_count || (candidate.employment_history?.length || 1)} <span className="text-sm font-semibold text-slate-400">Companies</span>
              </p>
              <p className="text-[11px] text-slate-400">
                Total organizations in career history
              </p>
            </div>

            {/* KPI 3: Average Duration per Company */}
            <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span className="font-semibold uppercase tracking-wider">Average Tenure</span>
                <TrendingUp className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-2xl font-extrabold text-white">
                {candidate.stability_metrics?.average_tenure_months ? `${candidate.stability_metrics.average_tenure_months} Mos` : `${Math.round((candidate.average_tenure_years || candidate.total_experience) * 12)} Mos`}
              </p>
              <p className="text-[11px] text-slate-400">
                ~{candidate.average_tenure_years || candidate.total_experience} yrs / company on average
              </p>
            </div>

            {/* KPI 4: Job Changes in 3-5 Years */}
            <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span className="font-semibold uppercase tracking-wider">Recent Job Changes</span>
                <History className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-extrabold text-white">
                {candidate.stability_metrics?.job_changes_recent_years ?? Math.max(0, (candidate.companies_count || candidate.employment_history?.length || 1) - 1)}{' '}
                <span className="text-sm font-semibold text-slate-400">Changes</span>
              </p>
              <p className="text-[11px] text-slate-400">
                {candidate.stability_metrics?.job_changes_summary || `Transitions across ${Math.round(candidate.total_experience) || 1} years`}
              </p>
            </div>
          </div>

          {/* Employment Gaps & Career Breaks Section (If any detected) */}
          {candidate.stability_metrics?.employment_gaps && candidate.stability_metrics.employment_gaps.length > 0 && (
            <div className="p-5 rounded-xl border bg-amber-950/20 border-amber-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-amber-200 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Identified Career Gaps & Employment Breaks ({candidate.stability_metrics.total_gaps_count || candidate.stability_metrics.employment_gaps.length})
                </h3>
                <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 text-xs font-bold rounded-full border border-amber-500/30">
                  Total Gap: {candidate.stability_metrics.total_gap_months || 0} Months
                </span>
              </div>
              <p className="text-xs text-slate-300">
                The following employment gaps were identified between recorded career tenures for recruiter review:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {candidate.stability_metrics.employment_gaps.map((gap, gIdx) => (
                  <div key={gIdx} className="p-3 bg-slate-950/80 rounded-lg border border-amber-500/30 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
                      {gap.gap_months}m
                    </div>
                    <div className="text-xs space-y-0.5">
                      <p className="text-white font-bold">
                        {gap.gap_months} Months Gap ({gap.start_date} → {gap.end_date})
                      </p>
                      <p className="text-slate-400 text-[11px]">
                        Between <span className="text-slate-200 font-semibold">{gap.previous_company || 'Previous Role'}</span> and{' '}
                        <span className="text-slate-200 font-semibold">{gap.next_company || 'Next Role'}</span>
                      </p>
                      {gap.gap_reason && (
                        <p className="text-amber-300/90 text-[11px] italic">
                          Candidate Reason: {gap.gap_reason}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Job Stability & Factual HR Review Details */}
          <div className="p-5 rounded-xl border bg-slate-900/80 border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-brand-400" />
                Factual Employment & Retention Observations
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                candidate.stability_metrics?.hr_review_required
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}>
                {candidate.stability_label || 'Standard Career Progression'}
              </span>
            </div>

            {candidate.stability_metrics?.factual_observations && candidate.stability_metrics.factual_observations.length > 0 ? (
              <ul className="space-y-1.5 pt-1">
                {candidate.stability_metrics.factual_observations.map((obs: string, idx: number) => (
                  <li key={idx} className="text-xs text-slate-300 flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 shrink-0" />
                    <span>{obs}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">
                Candidate has {candidate.total_experience} years of experience across {candidate.companies_count || 1} companies with an average tenure of {candidate.average_tenure_years || candidate.total_experience} years per organization.
              </p>
            )}
          </div>

          {/* Previous Companies Timeline with Reason for Leaving & Gaps */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Building className="w-4 h-4 text-brand-400" />
                  Chronological Employment Timeline ({candidate.employment_history?.length || 0} Companies)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Complete sequence of joining dates, leaving dates, roles, durations, and reasons for leaving
                </p>
              </div>

              <button
                onClick={handleOpenAddCompany}
                className="flex items-center gap-2 px-3.5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold transition shadow-md shadow-brand-500/20 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Previous Company</span>
              </button>
            </div>

            {(!candidate.employment_history || candidate.employment_history.length === 0) ? (
              <div className="p-8 text-center bg-slate-950 rounded-xl border border-slate-800 text-slate-500 text-xs space-y-2">
                <Building className="w-8 h-8 mx-auto mb-1 opacity-30 text-brand-400" />
                <p className="text-slate-300 font-semibold">No detailed previous company breakdown recorded yet.</p>
                <p className="text-slate-500 text-[11px]">Click "+ Add Previous Company" to build out the candidate's career timeline.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {candidate.employment_history.map((comp: EmploymentHistoryItem, idx: number) => {
                  const isShort = (comp.duration_years ?? 1) < 1.0 && !comp.is_current;
                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border transition bg-slate-950 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        isShort
                          ? 'border-amber-500/30 bg-amber-950/10'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                          comp.is_current
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : isShort
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}>
                          {idx + 1}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-white">{comp.company_name}</h4>
                            {comp.is_current && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                Current Employer
                              </span>
                            )}
                            {isShort && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Short Stint (&lt; 1 yr)
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-brand-300 font-semibold">
                            {comp.designation || 'Software Engineer'}
                            {comp.location ? ` • ${comp.location}` : ''}
                          </p>

                          {/* Reason for Leaving Badge */}
                          {comp.reason_for_leaving && (
                            <div className="pt-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800/90 text-slate-300 border border-slate-700">
                                <span className="text-slate-400 font-normal">Reason for Leaving:</span> {comp.reason_for_leaving}
                              </span>
                            </div>
                          )}

                          {comp.description && (
                            <p className="text-[11px] text-slate-400 mt-1 max-w-xl">
                              {comp.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-slate-800">
                        <div className="text-right">
                          <p className="text-xs font-bold text-white">
                            {comp.duration_years ? `${comp.duration_years} Years` : `${comp.duration_months || 12} Months`}
                            <span className="text-slate-400 font-normal text-[11px] ml-1">
                              ({comp.duration_months ? `${comp.duration_months} mos` : `${Math.round((comp.duration_years || 1) * 12)} mos`})
                            </span>
                          </p>
                          <p className="text-[11px] text-slate-400">
                            <strong>{comp.start_date || '—'}</strong> to <strong>{comp.end_date || (comp.is_current ? 'Present' : '—')}</strong>
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditCompany(idx)}
                            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition"
                            title="Edit Company Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCompanyEntry(idx)}
                            className="p-2 bg-rose-950/40 hover:bg-rose-900/80 text-rose-300 hover:text-white rounded-lg border border-rose-800/60 transition"
                            title="Delete Company Entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* HR / Interviewer Qualitative Review Guidance Box */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-400" />
              Interviewer & HR Hiring Decision Guide
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Review previous employment tenures, contract durations, and reasons for leaving during the technical and behavioral interview stages. Ensure to probe on role achievements, growth motivations, and candidate long-term alignment before making the final hiring decision.
            </p>
          </div>
        </div>
      )}

      {/* Tab 2: Recruitment Lifecycle & Client Submissions History */}
      {activeTab === 'lifecycle' && (
        <div className="space-y-6">
          {/* Top Metrics Cards */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
            <h3 className="text-sm font-bold text-white mb-4">Application & Pipeline Funnel Stages</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                <p className="text-2xl font-bold text-brand-400">{candidate.submissions?.length || candidate.submissions_count || 0}</p>
                <p className="text-xs text-slate-400 font-semibold uppercase mt-1">Total Submissions</p>
              </div>
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                <p className="text-2xl font-bold text-sky-400">{candidate.interviews?.length || candidate.interviews_count || 0}</p>
                <p className="text-xs text-slate-400 font-semibold uppercase mt-1">Interviews Scheduled</p>
              </div>
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                <p className="text-2xl font-bold text-emerald-400">{candidate.offers_count || 0}</p>
                <p className="text-xs text-slate-400 font-semibold uppercase mt-1">Offers Extended</p>
              </div>
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                <p className="text-xl font-bold text-indigo-400">{candidate.status}</p>
                <p className="text-xs text-slate-400 font-semibold uppercase mt-1">Current Lifecycle Status</p>
              </div>
            </div>
          </div>

          {/* Client Submissions History Table */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Building className="w-4 h-4 text-brand-400" />
                  Client Submissions & Requirements History
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Date-wise submission records across all client positions</p>
              </div>

              <button
                onClick={() => {
                  fetchRequirements();
                  setShowSubmitModal(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold transition shadow"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>+ New Client Submission</span>
              </button>
            </div>

            {(!candidate.submissions || candidate.submissions.length === 0) ? (
              <div className="p-8 text-center bg-slate-950 rounded-xl border border-slate-800 text-slate-500 text-xs">
                <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-30 text-brand-400" />
                No client submissions recorded yet for this candidate.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase font-bold text-[11px] border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Client Name</th>
                      <th className="py-3 px-4">Role / Job Title</th>
                      <th className="py-3 px-4">Submission Date</th>
                      <th className="py-3 px-4">Submission Code</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Submitted By</th>
                      <th className="py-3 px-4">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {candidate.submissions.map((sub: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-brand-500/20 text-brand-300 flex items-center justify-center text-[10px] font-bold">
                            {sub.client_name?.[0] || 'C'}
                          </div>
                          <span>{sub.client_name || 'Client'}</span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-200">
                          {sub.requirement_title || 'Software Position'}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {new Date(sub.submission_date || sub.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                          {sub.submission_code}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            sub.status === 'SHORTLISTED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                            sub.status === 'INTERVIEW' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' :
                            sub.status === 'SELECTED' || sub.status === 'OFFER' || sub.status === 'JOINED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                            sub.status === 'REJECTED' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                            'bg-brand-500/20 text-brand-300 border border-brand-500/40'
                          }`}>
                            {sub.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {sub.recruiter_name || 'Recruiter'}
                        </td>
                        <td className="py-3 px-4 text-slate-400 max-w-[200px] truncate" title={sub.remarks}>
                          {sub.remarks || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Interviews & Feedbacks Table */}
          {candidate.interviews && candidate.interviews.length > 0 && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-400" />
                Interviews & Evaluation Feedback
              </h3>
              <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase font-bold text-[11px] border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Client</th>
                      <th className="py-3 px-4">Position</th>
                      <th className="py-3 px-4">Round</th>
                      <th className="py-3 px-4">Interview Date</th>
                      <th className="py-3 px-4">Interviewer</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Feedback / Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {candidate.interviews.map((inv: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-bold text-white">{inv.client_name || 'Client'}</td>
                        <td className="py-3 px-4 text-slate-200">{inv.requirement_title || 'Position'}</td>
                        <td className="py-3 px-4 font-semibold text-slate-300">{inv.round_name}</td>
                        <td className="py-3 px-4 text-slate-400">{new Date(inv.interview_date).toLocaleString()}</td>
                        <td className="py-3 px-4 text-slate-400">{inv.interviewer_name || 'Panel'}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40 uppercase">
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 max-w-[200px] truncate" title={inv.notes}>
                          {inv.notes || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: WhatsApp & Compliance */}
      {activeTab === 'whatsapp' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
                WhatsApp Communication Profile & Verification
              </h3>
              <p className="text-xs text-slate-400 mt-1">Compliance tracking, opt-in consent records, and outreach history.</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-400 block mb-1">WhatsApp Number</span>
                <span className="text-emerald-300 font-bold text-sm">{candidate.whatsapp_number || candidate.phone || 'Not Configured'}</span>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Consent Status</span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                  candidate.whatsapp_consent_status === 'GRANTED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                  candidate.whatsapp_consent_status === 'OPTED_OUT' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                  'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}>
                  {candidate.whatsapp_consent_status === 'GRANTED' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                  {candidate.whatsapp_consent_status}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Consent Source</span>
                <span className="text-white">{candidate.whatsapp_consent_source || 'Direct Application'}</span>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Last WhatsApp Contact</span>
                <span className="text-white">{candidate.last_whatsapp_contact_date ? new Date(candidate.last_whatsapp_contact_date).toLocaleDateString() : 'Never'}</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Direct Outreach & Consent Actions</h4>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setShowSendMessageModal(true)}
                  disabled={candidate.whatsapp_consent_status === 'OPTED_OUT'}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition shadow-lg shadow-brand-500/25"
                >
                  <Send className="w-4 h-4" />
                  <span>Send WhatsApp Message</span>
                </button>

                <button
                  onClick={handleGrantConsent}
                  className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow"
                >
                  <Check className="w-4 h-4" />
                  <span>Grant / Verify Consent</span>
                </button>

                <button
                  onClick={handleRevokeConsent}
                  className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition border border-slate-700"
                >
                  <XCircle className="w-4 h-4 text-rose-400" />
                  <span>Revoke Consent</span>
                </button>

                <button
                  onClick={handleOptOut}
                  className="flex items-center gap-2 px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 rounded-lg text-xs font-bold transition border border-rose-500/30"
                >
                  <span>Add to Global Opt-Out</span>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-white">Outreach Eligibility Summary</h3>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Proactive Campaigns:</span>
                <span className={`font-bold ${isEligible ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isEligible ? 'Eligible' : 'Blocked'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                {candidate.whatsapp_eligibility?.reason || 'Compliance validated.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Documents */}
      {activeTab === 'documents' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Uploaded Candidate CV Files</h3>
          </div>

          <div className="border border-slate-800 rounded-xl divide-y divide-slate-800 bg-slate-950 text-xs">
            {(candidate.documents || [candidate.latest_document]).filter(Boolean).map((doc: any, idx: number) => (
              <div key={idx} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-brand-400" />
                  <div>
                    <p className="text-white font-bold">{doc?.file_name || 'Resume.pdf'}</p>
                    <p className="text-[10px] text-slate-400">
                      Version {doc?.version_number || 1} • {doc?.document_type || 'Resume'} • Uploaded {doc?.created_at ? new Date(doc.created_at).toLocaleDateString() : ''}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleDownloadCV(doc?.file_name)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-xs border border-slate-700 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Timeline & History */}
      {activeTab === 'history' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white">Status Timeline & Lifecycle History</h3>
          <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-800">
            {(candidate.status_history || []).map((hist: CandidateStatusHistory, idx: number) => (
              <div key={idx} className="flex items-start gap-4 relative pl-8">
                <div className="w-3 h-3 rounded-full bg-brand-500 absolute left-2 top-1.5 ring-4 ring-slate-900" />
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-brand-300">{hist.new_status}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(hist.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-300 mt-1">{hist.remarks || 'Status updated.'}</p>
                  <p className="text-[10px] text-slate-400 mt-1">By {hist.changed_by_name || 'System'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Modal: Send Direct WhatsApp Message */}
      {showSendMessageModal && candidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Send Direct WhatsApp Message</h3>
                  <p className="text-[11px] text-slate-400">To: {candidate.first_name} {candidate.last_name} ({candidate.whatsapp_number || candidate.phone})</p>
                </div>
              </div>
              <button
                onClick={() => setShowSendMessageModal(false)}
                className="text-slate-400 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1.5">Select Approved Template</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-brand-500"
                >
                  <option value="">Custom Free-Text Message</option>
                  {templates.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.template_name} ({t.category || 'General'})
                    </option>
                  ))}
                </select>
              </div>

              {selectedTemplateId && (
                <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold uppercase text-emerald-400">Template Preview</span>
                  <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {templates.find((t: any) => t.id === selectedTemplateId)?.body_text
                      ?.replace('{{candidate_name}}', `${candidate.first_name} ${candidate.last_name}`)
                      ?.replace('{{experience}}', `${candidate.total_experience || 2} years`)
                      ?.replace('{{job_title}}', candidate.current_designation || 'Software Engineer')
                      ?.replace('{{client_name}}', 'RecruitFlow Enterprise Client')}
                  </p>
                </div>
              )}

              {!selectedTemplateId && (
                <div>
                  <label className="block font-bold text-slate-300 mb-1.5">Message Content</label>
                  <textarea
                    rows={4}
                    value={customMessageText}
                    onChange={(e) => setCustomMessageText(e.target.value)}
                    placeholder="Type your WhatsApp message..."
                    className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowSendMessageModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSendingMessage || (!selectedTemplateId && !customMessageText.trim())}
                onClick={handleSendDirectWhatsApp}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-900/30 flex items-center gap-2 transition"
              >
                {isSendingMessage ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Dispatching...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Message Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal: Submit Candidate to Client / Requirement */}
      {showSubmitModal && candidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Submit to Client / Requirement</h3>
                  <p className="text-xs text-slate-400">Forward {candidate.first_name} {candidate.last_name} to active client position</p>
                </div>
              </div>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
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
                placeholder="e.g., Highly experienced candidate, screened for technical skills and available immediately..."
                value={submissionRemarks}
                onChange={(e) => setSubmissionRemarks(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Submission Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting || !selectedRequirementId}
                onClick={handleExecuteSingleSubmission}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/25 transition"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Submitting to Client...</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    <span>Submit Candidate to Client</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add / Edit Previous Company Employment Record */}
      {showCompanyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-500/20 text-brand-300 flex items-center justify-center">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {editingCompanyIndex !== null ? 'Edit Employment Record' : 'Add Previous Company'}
                  </h3>
                  <p className="text-[11px] text-slate-400">Record company name, role, dates, and employment duration</p>
                </div>
              </div>
              <button
                onClick={() => setShowCompanyModal(false)}
                className="text-slate-400 hover:text-white font-bold text-base p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCompanyEntry} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Company / Organization Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Infosys, Wipro, Google, Tech Global"
                  value={companyFormData.company_name}
                  onChange={(e) => setCompanyFormData({ ...companyFormData, company_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Designation / Role</label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Software Engineer"
                    value={companyFormData.designation || ''}
                    onChange={(e) => setCompanyFormData({ ...companyFormData, designation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Gurgaon / Remote"
                    value={companyFormData.location || ''}
                    onChange={(e) => setCompanyFormData({ ...companyFormData, location: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Start Date</label>
                  <input
                    type="text"
                    placeholder="e.g. 2021-01 or Jan 2021"
                    value={companyFormData.start_date || ''}
                    onChange={(e) => setCompanyFormData({ ...companyFormData, start_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">End Date</label>
                  <input
                    type="text"
                    disabled={companyFormData.is_current}
                    placeholder={companyFormData.is_current ? 'Present' : 'e.g. 2022-06 or Jun 2022'}
                    value={companyFormData.is_current ? 'Present' : (companyFormData.end_date || '')}
                    onChange={(e) => setCompanyFormData({ ...companyFormData, end_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-brand-500 disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="is_current_employer"
                  checked={!!companyFormData.is_current}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setCompanyFormData({
                      ...companyFormData,
                      is_current: checked,
                      end_date: checked ? 'Present' : ''
                    });
                  }}
                  className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-brand-500"
                />
                <label htmlFor="is_current_employer" className="text-slate-300 cursor-pointer font-medium">
                  This is the candidate's current employer
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Duration (Years)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={companyFormData.duration_years ?? 1.0}
                    onChange={(e) => {
                      const yrs = parseFloat(e.target.value) || 1.0;
                      setCompanyFormData({
                        ...companyFormData,
                        duration_years: yrs,
                        duration_months: Math.round(yrs * 12)
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Duration (Months)</label>
                  <input
                    type="number"
                    min="1"
                    value={companyFormData.duration_months ?? 12}
                    onChange={(e) => {
                      const mos = parseInt(e.target.value) || 12;
                      setCompanyFormData({
                        ...companyFormData,
                        duration_months: mos,
                        duration_years: Math.round((mos / 12) * 10) / 10
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Reason for Leaving (Optional / Provided by Candidate)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Career Advancement, Role Completed, Better Compensation, Relocation..."
                  value={companyFormData.reason_for_leaving || ''}
                  onChange={(e) => setCompanyFormData({ ...companyFormData, reason_for_leaving: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Role Description / Key Achievements (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Led cloud backend infrastructure and integrated high-scale payment microservices..."
                  value={companyFormData.description || ''}
                  onChange={(e) => setCompanyFormData({ ...companyFormData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCompanyModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingHistory}
                  className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-brand-500/20 disabled:opacity-50"
                >
                  {isSavingHistory ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Record...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Company Record</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
