import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  WhatsAppCampaign, WhatsAppTemplate, JobRequirement,
  WhatsAppCampaignAnalytics, WhatsAppCampaignType, WhatsAppCampaignRecipient
} from '../types';
import {
  Radio, Plus, Search, Filter, Play, Pause,
  RotateCcw, Eye, Clock, CheckCircle2, AlertCircle,
  XCircle, Send, Users, Sparkles, RefreshCw, BarChart2, ShieldCheck, Ban
} from 'lucide-react';

interface WhatsAppCampaignsPageProps {
  initialCandidateIds?: string[];
  initialRequirementId?: string;
  onClearInitialParams?: () => void;
}

export const WhatsAppCampaignsPage: React.FC<WhatsAppCampaignsPageProps> = ({
  initialCandidateIds,
  initialRequirementId,
  onClearInitialParams
}) => {
  const { token } = useAuth();
  const [campaigns, setCampaigns] = useState<WhatsAppCampaign[]>([]);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [requirements, setRequirements] = useState<JobRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Creation Wizard Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [campaignName, setCampaignName] = useState('');
  const [campaignType, setCampaignType] = useState<WhatsAppCampaignType>('NEW_JOB_OPPORTUNITY');
  const [selectedReqId, setSelectedReqId] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [audienceFilter, setAudienceFilter] = useState<'bench' | 'all' | 'selected'>('bench');
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation Info
  const [validationSummary, setValidationSummary] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Analytics Modal
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [selectedAnalytics, setSelectedAnalytics] = useState<WhatsAppCampaignAnalytics | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/whatsapp/campaigns', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
      }
    } catch (err) {
      console.error('Failed to fetch campaigns:', err);
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
        if (data.length > 0 && !selectedTemplateId) {
          setSelectedTemplateId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    }
  };

  const fetchRequirements = async () => {
    try {
      const res = await fetch('/api/v1/requirements?position_status=OPEN', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRequirements(data);
        if (data.length > 0 && !selectedReqId) {
          setSelectedReqId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch requirements:', err);
    }
  };

  useEffect(() => {
    fetchCampaigns();
    fetchTemplates();
    fetchRequirements();
  }, []);

  // Handle incoming quick-launch from Bench / Requirements
  useEffect(() => {
    if (initialCandidateIds && initialCandidateIds.length > 0) {
      setSelectedCandidateIds(initialCandidateIds);
      setAudienceFilter('selected');
      if (initialRequirementId) setSelectedReqId(initialRequirementId);
      setCampaignName(`Targeted Outreach — ${new Date().toLocaleDateString()}`);
      setShowCreateModal(true);
      if (onClearInitialParams) onClearInitialParams();
    } else if (initialRequirementId) {
      setSelectedReqId(initialRequirementId);
      setCampaignName(`Role Outreach — Req ${initialRequirementId.substring(0, 6)}`);
      setShowCreateModal(true);
      if (onClearInitialParams) onClearInitialParams();
    }
  }, [initialCandidateIds, initialRequirementId]);

  // Validate recipients
  const handleValidateRecipients = async () => {
    if (!selectedTemplateId) return;

    try {
      setIsValidating(true);
      const res = await fetch('/api/v1/whatsapp/campaigns/validate-recipients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          candidate_ids: audienceFilter === 'selected' ? selectedCandidateIds : [],
          bench_only: audienceFilter === 'bench',
          requirement_id: selectedReqId || null,
          template_id: selectedTemplateId
        })
      });

      if (res.ok) {
        const summary = await res.json();
        setValidationSummary(summary);
        setStep(2);
      }
    } catch (err) {
      console.error('Validation error:', err);
    } finally {
      setIsValidating(false);
    }
  };

  // Create Campaign
  const handleCreateCampaign = async (launchImmediately: boolean) => {
    if (!campaignName || !selectedTemplateId) return;

    try {
      setIsSubmitting(true);
      const payload = {
        campaign_name: campaignName,
        campaign_type: campaignType,
        requirement_id: selectedReqId || null,
        template_id: selectedTemplateId,
        candidate_ids: audienceFilter === 'selected' ? selectedCandidateIds : [],
        bench_only: audienceFilter === 'bench',
        send_immediately: launchImmediately,
        scheduled_date: isScheduled && scheduledDate ? new Date(scheduledDate).toISOString() : null
      };

      const res = await fetch('/api/v1/whatsapp/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || 'Failed to create campaign.');
        return;
      }

      setShowCreateModal(false);
      setStep(1);
      setValidationSummary(null);
      fetchCampaigns();
    } catch (err) {
      console.error('Campaign creation error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLaunchCampaign = async (campaignId: string) => {
    try {
      const res = await fetch(`/api/v1/whatsapp/campaigns/${campaignId}/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchCampaigns();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePauseCampaign = async (campaignId: string) => {
    try {
      const res = await fetch(`/api/v1/whatsapp/campaigns/${campaignId}/pause`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchCampaigns();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResumeCampaign = async (campaignId: string) => {
    try {
      const res = await fetch(`/api/v1/whatsapp/campaigns/${campaignId}/resume`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchCampaigns();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRetryCampaign = async (campaignId: string) => {
    try {
      const res = await fetch(`/api/v1/whatsapp/campaigns/${campaignId}/retry-failed`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchCampaigns();
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenAnalytics = async (campaignId: string) => {
    try {
      setIsLoadingAnalytics(true);
      setShowAnalyticsModal(true);
      const res = await fetch(`/api/v1/whatsapp/campaigns/${campaignId}/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedAnalytics(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
  const selectedReq = requirements.find(r => r.id === selectedReqId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <Radio className="w-7 h-7 text-emerald-400" />
            WhatsApp Outreach Campaigns
          </h1>
          <p className="text-sm text-slate-400">
            Automate personalized candidate outreach with consent filtering, template personalization, and live delivery tracking.
          </p>
        </div>

        <button
          onClick={() => {
            setStep(1);
            setValidationSummary(null);
            setCampaignName(`Campaign — ${new Date().toLocaleDateString()}`);
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-500/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Outreach Campaign</span>
        </button>
      </div>

      {/* Campaigns Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Campaign Name & Type</th>
                <th className="py-3.5 px-4">Target Requirement</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Audience Progress</th>
                <th className="py-3.5 px-4">Delivery & Response</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
                    Loading campaigns...
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <Radio className="w-8 h-8 mx-auto mb-2 opacity-30 text-emerald-400" />
                    No outreach campaigns created yet. Click "New Outreach Campaign" to get started.
                  </td>
                </tr>
              ) : (
                campaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-slate-800/40 transition">
                    {/* Name & Type */}
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-bold text-white text-sm">{camp.campaign_name}</p>
                        <p className="text-[10px] text-emerald-400 font-medium uppercase">{camp.campaign_type.replace(/_/g, ' ')}</p>
                      </div>
                    </td>

                    {/* Requirement */}
                    <td className="py-3.5 px-4">
                      {camp.job_title ? (
                        <div>
                          <p className="text-white font-semibold">{camp.job_title}</p>
                          <p className="text-[10px] text-slate-400">{camp.client_name || 'Client'} ({camp.requirement_code})</p>
                        </div>
                      ) : (
                        <span className="text-slate-500">General Talent Outreach</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        camp.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' :
                        camp.status === 'SENDING' ? 'bg-sky-500/10 text-sky-300 border-sky-500/30 animate-pulse' :
                        camp.status === 'SCHEDULED' ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30' :
                        camp.status === 'PAUSED' ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' :
                        'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        {camp.status === 'COMPLETED' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                        {camp.status === 'SENDING' && <RefreshCw className="w-3 h-3 animate-spin text-sky-400" />}
                        {camp.status}
                      </span>
                    </td>

                    {/* Progress */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">{camp.sent_count} / {camp.eligible_count} sent</span>
                          <span className="text-white font-bold">
                            {camp.eligible_count > 0 ? Math.round((camp.sent_count / camp.eligible_count) * 100) : 0}%
                          </span>
                        </div>
                        <div className="w-28 h-1.5 bg-slate-950 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${camp.eligible_count > 0 ? (camp.sent_count / camp.eligible_count) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Delivery & Reply */}
                    <td className="py-3.5 px-4">
                      <div className="text-[11px] space-y-0.5">
                        <p className="text-emerald-400 font-semibold">{camp.delivery_rate}% Delivered</p>
                        <p className="text-sky-400">{camp.replied_count} Candidate Replies ({camp.response_rate}%)</p>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Launch Action */}
                        {camp.status === 'DRAFT' && (
                          <button
                            onClick={() => handleLaunchCampaign(camp.id)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow transition"
                          >
                            <Play className="w-3 h-3" />
                            <span>Launch</span>
                          </button>
                        )}

                        {camp.status === 'SENDING' && (
                          <button
                            onClick={() => handlePauseCampaign(camp.id)}
                            className="p-1.5 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 rounded-lg border border-amber-500/40"
                          >
                            <Pause className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {camp.status === 'PAUSED' && (
                          <button
                            onClick={() => handleResumeCampaign(camp.id)}
                            className="p-1.5 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 rounded-lg border border-emerald-500/40"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {camp.failed_count > 0 && (
                          <button
                            onClick={() => handleRetryCampaign(camp.id)}
                            title="Retry Failed Messages"
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenAnalytics(camp.id)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition"
                        >
                          <BarChart2 className="w-3.5 h-3.5" />
                          <span>Analytics</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Campaign Wizard */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Radio className="w-5 h-5 text-emerald-400" />
                  Create WhatsApp Candidate Outreach Campaign
                </h2>
                <p className="text-xs text-slate-400">Step {step} of 2 — Configure audience, template, and compliance filters.</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-500 hover:text-white font-bold">✕</button>
            </div>

            {/* Step 1: Configuration Form */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Campaign Name *</label>
                    <input
                      type="text"
                      required
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      placeholder="e.g. Senior Backend Engineers — Q3 Drive"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Campaign Type</label>
                    <select
                      value={campaignType}
                      onChange={(e) => setCampaignType(e.target.value as WhatsAppCampaignType)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                    >
                      <option value="NEW_JOB_OPPORTUNITY">New Job Opportunity</option>
                      <option value="BENCH_OUTREACH">Bench Resource Outreach</option>
                      <option value="INTERVIEW_SCHEDULE">Interview Schedule Follow-Up</option>
                      <option value="DOCUMENT_COLLECTION">Document Collection</option>
                      <option value="OFFER_FOLLOW_UP">Offer Follow-Up</option>
                      <option value="RE_ENGAGEMENT">Candidate Re-Engagement</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Associated Job Requirement (Optional)</label>
                    <select
                      value={selectedReqId}
                      onChange={(e) => setSelectedReqId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                    >
                      <option value="">No specific requirement (General Pool)</option>
                      {requirements.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.req_code} — {r.job_title} ({r.client_name || 'Client'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Target Audience</label>
                    <select
                      value={audienceFilter}
                      onChange={(e) => setAudienceFilter(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                    >
                      <option value="bench">Bench Pool Candidates Only (Available & Deployable)</option>
                      <option value="all">All Qualified Candidates in Database</option>
                      {selectedCandidateIds.length > 0 && (
                        <option value="selected">Pre-Selected Candidates ({selectedCandidateIds.length} profiles)</option>
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Select WhatsApp Message Template *</label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-emerald-300 font-semibold"
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.template_name} ({t.category.replace(/_/g, ' ')}) — {t.status}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Template Preview Snippet */}
                {selectedTemplate && (
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Template Preview with Sample Personalization:</p>
                    <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-lg text-xs text-emerald-200 leading-relaxed font-sans whitespace-pre-wrap">
                      {selectedTemplate.body_text
                        .replace(/{{candidate_name}}/g, 'Alex')
                        .replace(/{{job_title}}/g, selectedReq?.job_title || 'Software Architect')
                        .replace(/{{client_name}}/g, selectedReq?.client_name || 'Innovatech Corp')
                        .replace(/{{recruiter_name}}/g, 'Recruiter Team')
                      }
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleValidateRecipients}
                    disabled={isValidating || !selectedTemplateId}
                    className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-lg transition"
                  >
                    {isValidating ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Validating Compliance...</span>
                      </>
                    ) : (
                      <>
                        <span>Next: Compliance & Validation</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Compliance Validation Summary & Launch */}
            {step === 2 && validationSummary && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                    <p className="text-2xl font-bold text-white">{validationSummary.total_candidates_evaluated}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold mt-1">Evaluated</p>
                  </div>
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                    <p className="text-2xl font-bold text-emerald-400">{validationSummary.eligible_recipients_count}</p>
                    <p className="text-[10px] text-emerald-400 uppercase font-semibold mt-1">Eligible (Ready)</p>
                  </div>
                  <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl">
                    <p className="text-2xl font-bold text-rose-400">{validationSummary.excluded_recipients_count}</p>
                    <p className="text-[10px] text-rose-400 uppercase font-semibold mt-1">Filtered / Excluded</p>
                  </div>
                </div>

                {validationSummary.exclusion_breakdown && Object.keys(validationSummary.exclusion_breakdown).length > 0 && (
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Exclusion Reasons (Filtered by System):</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(validationSummary.exclusion_breakdown).map(([reason, cnt]: any) => (
                        <span key={reason} className="px-2.5 py-1 bg-slate-900 border border-slate-700 text-slate-300 rounded text-xs">
                          {reason}: <strong className="text-rose-400">{cnt}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Back to Config
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={isSubmitting || validationSummary.eligible_recipients_count === 0}
                      onClick={() => handleCreateCampaign(false)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold border border-slate-700"
                    >
                      Save as Draft
                    </button>

                    <button
                      type="button"
                      disabled={isSubmitting || validationSummary.eligible_recipients_count === 0}
                      onClick={() => handleCreateCampaign(true)}
                      className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-500/20"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Campaign Now ({validationSummary.eligible_recipients_count} Messages)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Detailed Analytics */}
      {showAnalyticsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-emerald-400" />
                  Campaign Analytics & Recipient Delivery Log
                </h2>
                <p className="text-xs text-slate-400">{selectedAnalytics?.campaign.campaign_name}</p>
              </div>
              <button onClick={() => setShowAnalyticsModal(false)} className="text-slate-500 hover:text-white font-bold">✕</button>
            </div>

            {isLoadingAnalytics || !selectedAnalytics ? (
              <div className="py-12 text-center text-slate-500">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-400" />
                Loading detailed metrics...
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <p className="text-xl font-bold text-white">{selectedAnalytics.campaign.sent_count}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Sent</p>
                  </div>
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                    <p className="text-xl font-bold text-emerald-400">{selectedAnalytics.delivery_rate_percent}%</p>
                    <p className="text-[10px] text-emerald-400 uppercase font-semibold">Delivered</p>
                  </div>
                  <div className="p-3 bg-sky-500/10 border border-sky-500/30 rounded-xl">
                    <p className="text-xl font-bold text-sky-400">{selectedAnalytics.read_rate_percent}%</p>
                    <p className="text-[10px] text-sky-400 uppercase font-semibold">Read</p>
                  </div>
                  <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
                    <p className="text-xl font-bold text-indigo-400">{selectedAnalytics.response_rate_percent}%</p>
                    <p className="text-[10px] text-indigo-400 uppercase font-semibold">Candidate Replies</p>
                  </div>
                </div>

                {/* Recipient breakdown list */}
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
                    Recipient Delivery & Response Details ({selectedAnalytics.recipients.length})
                  </h3>
                  <div className="border border-slate-800 rounded-xl divide-y divide-slate-800 bg-slate-950 max-h-64 overflow-y-auto text-xs">
                    {selectedAnalytics.recipients.map((rec: WhatsAppCampaignRecipient) => (
                      <div key={rec.id} className="p-3 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-white">{rec.candidate_name}</p>
                          <p className="text-[10px] text-slate-400">{rec.whatsapp_number}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          rec.message_status === 'REPLIED' ? 'bg-indigo-500/20 text-indigo-300' :
                          rec.message_status === 'READ' ? 'bg-sky-500/20 text-sky-300' :
                          rec.message_status === 'DELIVERED' ? 'bg-emerald-500/20 text-emerald-300' :
                          rec.message_status === 'FAILED' ? 'bg-rose-500/20 text-rose-300' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {rec.message_status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
