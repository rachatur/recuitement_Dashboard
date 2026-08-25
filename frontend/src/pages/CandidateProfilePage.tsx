import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Candidate, CandidateDocument, CandidateStatusHistory } from '../types';
import {
  User, Mail, Phone, MapPin, Briefcase, Calendar,
  ShieldCheck, ShieldAlert, Download, Upload, CheckCircle2,
  XCircle, Clock, ExternalLink, ArrowLeft, RefreshCw, MessageSquare,
  Award, FileText, Check, AlertTriangle, Send
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

  useEffect(() => {
    fetchCandidateDetail();
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
            onClick={() => handleDownloadCV(candidate.latest_document?.file_name)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold border border-slate-700 transition shadow"
          >
            <Download className="w-4 h-4 text-slate-300" />
            <span>Download Verified CV</span>
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

      {/* Tab 2: Recruitment Lifecycle */}
      {activeTab === 'lifecycle' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-6">
          <h3 className="text-sm font-bold text-white">Application & Pipeline Funnel Stages</h3>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
              <p className="text-2xl font-bold text-brand-400">{candidate.submissions_count || 0}</p>
              <p className="text-xs text-slate-400 font-semibold uppercase mt-1">Submissions</p>
            </div>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
              <p className="text-2xl font-bold text-sky-400">{candidate.interviews_count || 0}</p>
              <p className="text-xs text-slate-400 font-semibold uppercase mt-1">Interviews</p>
            </div>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
              <p className="text-2xl font-bold text-emerald-400">{candidate.offers_count || 0}</p>
              <p className="text-xs text-slate-400 font-semibold uppercase mt-1">Offers</p>
            </div>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
              <p className="text-2xl font-bold text-indigo-400">{candidate.status}</p>
              <p className="text-xs text-slate-400 font-semibold uppercase mt-1">Current Stage</p>
            </div>
          </div>
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
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Consent Management Actions</h4>
              <div className="flex flex-wrap gap-3">
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
    </div>
  );
};
