import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Candidate, CandidateDocument, CandidateStatusHistory } from '../types';
import {
  User, Mail, Phone, MapPin, Briefcase, Calendar,
  ShieldCheck, ShieldAlert, Download, Upload, CheckCircle2,
  XCircle, Clock, ExternalLink, ArrowLeft, RefreshCw, MessageSquare,
  Award, FileText, Check, AlertTriangle, Send, Trash2, Share2, Building
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
  const [activeTab, setActiveTab] = useState<'profile' | 'lifecycle' | 'whatsapp' | 'documents' | 'history'>('profile');
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

  const handleDownloadCV = (filename?: string) => {
    const url = `/api/v1/candidates/${candidateId}/cv/download`;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'Candidate_Resume.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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

      {/* 5-Tab Navigation Bar */}
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
          <span>Timeline & History</span>
        </button>
      </div>

      {/* Tab 1: Personal & Professional */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
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
                  <span className="text-slate-400 block mb-1">Current Designation</span>
                  <span className="text-white font-bold">{candidate.current_designation || 'Software Engineer'}</span>
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

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-white">Skills & Core Competencies</h3>
              <div className="flex flex-wrap gap-2">
                {(candidate.skills || []).map((s: string, idx: number) => (
                  <span key={idx} className="px-3 py-1 bg-slate-800 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700">
                    {s}
                  </span>
                ))}
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
    </div>
  );
};
