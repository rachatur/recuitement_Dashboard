import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { CVSubmission, Client, JobRequirement, Candidate } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { StatusBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Drawer } from '../components/common/Drawer';
import {
  Send, Plus, Search, Building2, Briefcase, User,
  FileText, Clock, CheckCircle2, MessageSquare, AlertCircle,
  ExternalLink, RefreshCw, Star
} from 'lucide-react';
import { format } from 'date-fns';

export const SubmissionsPage: React.FC = () => {
  const { hasRole, user } = useAuth();
  const { showToast } = useNotifications();

  const [submissions, setSubmissions] = useState<CVSubmission[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [requirements, setRequirements] = useState<JobRequirement[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedSub, setSelectedSub] = useState<CVSubmission | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // New Submission Modal State
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [subClientId, setSubClientId] = useState('');
  const [subReqId, setSubReqId] = useState('');
  const [subCandId, setSubCandId] = useState('');
  const [subRemarks, setSubRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Client Feedback Modal State
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [fbDecision, setFbDecision] = useState<'SHORTLISTED' | 'REJECTED' | 'ON_HOLD' | 'NEED_MORE_INFORMATION' | 'SCHEDULE_INTERVIEW'>('SHORTLISTED');
  const [fbRating, setFbRating] = useState(5.0);
  const [fbComments, setFbComments] = useState('');
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);

  const fetchSubmissions = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);

      const [subsRes, clientRes, reqRes, candRes] = await Promise.all([
        api.get(`/submissions?${params.toString()}`),
        api.get('/clients'),
        api.get('/requirements'),
        api.get('/candidates'),
      ]);

      setSubmissions(subsRes.data);
      setClients(clientRes.data);
      setRequirements(reqRes.data);
      setCandidates(candRes.data);

      if (clientRes.data.length > 0 && !subClientId) {
        setSubClientId(clientRes.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [statusFilter]);

  // Requirements filtered by selected client in modal
  const filteredReqs = requirements.filter((r) => r.client_id === subClientId);

  const handleCreateSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subClientId || !subReqId || !subCandId) {
      showToast('error', 'Validation Error', 'Please select client, job requirement, and candidate');
      return;
    }

    // Find candidate's latest document
    const cand = candidates.find((c) => c.id === subCandId);
    if (!cand || !cand.latest_document) {
      showToast('error', 'Missing Document', 'Selected candidate has no CV uploaded. Please upload a CV first.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/submissions', {
        client_id: subClientId,
        requirement_id: subReqId,
        candidate_id: subCandId,
        document_id: cand.latest_document.id,
        remarks: subRemarks,
      });

      showToast('success', 'CV Submitted', 'Candidate profile and CV submitted to client successfully');
      setIsSubmitOpen(false);
      setSubRemarks('');
      fetchSubmissions();
    } catch (err: any) {
      showToast('error', 'Submission Failed', err.response?.data?.detail || 'Could not submit candidate');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (submissionId: string, status: string) => {
    try {
      await api.put(`/submissions/${submissionId}/status`, {
        status,
        remarks: `Status updated to ${status} via submission board`,
      });
      showToast('success', 'Status Updated', `Submission moved to ${status}`);
      fetchSubmissions();
    } catch (err: any) {
      showToast('error', 'Transition Error', err.response?.data?.detail || 'Invalid status transition');
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;

    setIsSavingFeedback(true);
    try {
      await api.post('/client-feedback', {
        submission_id: selectedSub.id,
        decision: fbDecision,
        rating: Number(fbRating),
        comments: fbComments,
      });

      showToast('success', 'Feedback Recorded', `Client decision (${fbDecision}) recorded and history updated`);
      setIsFeedbackOpen(false);
      setSelectedSub(null);
      setFbComments('');
      fetchSubmissions();
    } catch (err: any) {
      showToast('error', 'Feedback Failed', err.response?.data?.detail || 'Could not record feedback');
    } finally {
      setIsSavingFeedback(false);
    }
  };

  const canSubmit = hasRole(['SUPER_ADMIN', 'ADMIN', 'RECRUITER', 'TEAM_LEAD']);
  const canProvideFeedback = hasRole(['SUPER_ADMIN', 'ADMIN', 'CLIENT', 'HIRING_MANAGER']);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <Send className="w-5 h-5 text-brand-400" />
            CV Submission Pipeline & Tracking
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor client submissions, CV review timestamps, client responses, and interview conversions.
          </p>
        </div>

        {canSubmit && (
          <button
            onClick={() => setIsSubmitOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-900/40 transition-all"
          >
            <Plus className="w-4 h-4" />
            Submit CV to Client
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-md">
        <div className="flex-1 w-full relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by candidate, client, requirement, or submission ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="w-full sm:w-56">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
          >
            <option value="">All Submission Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="CLIENT_VIEWED">Client Viewed</option>
            <option value="SHORTLISTED">Shortlisted</option>
            <option value="INTERVIEW">Interview</option>
            <option value="SELECTED">Selected</option>
            <option value="OFFER">Offer</option>
            <option value="JOINED">Joined</option>
            <option value="REJECTED">Rejected</option>
            <option value="ON_HOLD">On Hold</option>
          </select>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Submission Code</th>
                <th className="px-5 py-3.5">Candidate</th>
                <th className="px-5 py-3.5">Client Organization</th>
                <th className="px-5 py-3.5">Job Position</th>
                <th className="px-5 py-3.5">CV Version</th>
                <th className="px-5 py-3.5">Recruiter</th>
                <th className="px-5 py-3.5">Submitted On</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-400">
                    <RefreshCw className="w-6 h-6 text-brand-500 animate-spin mx-auto mb-2" />
                    Loading submission pipeline...
                  </td>
                </tr>
              ) : submissions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-400">
                    No CV submissions found.
                  </td>
                </tr>
              ) : (
                submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-slate-400 font-bold">{sub.submission_code}</td>
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-100">{sub.candidate_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{sub.candidate_email}</div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-300 font-medium">{sub.client_name}</td>
                    <td className="px-5 py-3.5 text-slate-300">{sub.requirement_title}</td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded-md font-mono text-[10px]">
                        v{sub.document_version || 1}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-300">{sub.recruiter_name || 'System'}</td>
                    <td className="px-5 py-3.5 text-slate-400 font-mono text-[11px]">
                      {format(new Date(sub.submission_date), 'dd MMM yyyy')}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={sub.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-2">
                      {canProvideFeedback && (
                        <button
                          onClick={() => {
                            setSelectedSub(sub);
                            setIsFeedbackOpen(true);
                          }}
                          className="px-2.5 py-1 bg-brand-600/20 hover:bg-brand-600 text-brand-300 hover:text-white rounded-lg text-[11px] font-semibold border border-brand-500/40 transition-colors"
                        >
                          Feedback
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submit CV Modal */}
      <Modal
        isOpen={isSubmitOpen}
        onClose={() => setIsSubmitOpen(false)}
        title="Submit Candidate CV to Client"
        subtitle="Select client requirement and verify candidate CV version before submission."
        maxWidth="xl"
      >
        <form onSubmit={handleCreateSubmission} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Select Client Organization *
            </label>
            <select
              required
              value={subClientId}
              onChange={(e) => {
                setSubClientId(e.target.value);
                setSubReqId('');
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.client_code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Select Active Job Requirement *
            </label>
            <select
              required
              value={subReqId}
              onChange={(e) => setSubReqId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
            >
              <option value="">-- Choose Job Requirement --</option>
              {filteredReqs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.job_title} ({r.req_code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Select Candidate *
            </label>
            <select
              required
              value={subCandId}
              onChange={(e) => setSubCandId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
            >
              <option value="">-- Choose Candidate --</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name} ({c.candidate_code}) • {c.total_experience}y exp • {c.skills.slice(0, 3).join(', ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Recruiter Submission Remarks
            </label>
            <textarea
              rows={3}
              value={subRemarks}
              onChange={(e) => setSubRemarks(e.target.value)}
              placeholder="Candidate highlights, why they are a strong fit for this client..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsSubmitOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-900/40"
            >
              {isSubmitting ? 'Submitting...' : 'Confirm Submission'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Client Feedback Modal */}
      <Modal
        isOpen={isFeedbackOpen}
        onClose={() => {
          setIsFeedbackOpen(false);
          setSelectedSub(null);
        }}
        title="Record Client Decision & Feedback"
        subtitle={`Submission: ${selectedSub?.submission_code} • Candidate: ${selectedSub?.candidate_name}`}
      >
        <form onSubmit={handleSubmitFeedback} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Client Feedback Decision *
            </label>
            <select
              value={fbDecision}
              onChange={(e) => setFbDecision(e.target.value as any)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
            >
              <option value="SHORTLISTED">Shortlisted for Interview</option>
              <option value="SCHEDULE_INTERVIEW">Schedule Interview Directly</option>
              <option value="ON_HOLD">Put On Hold</option>
              <option value="NEED_MORE_INFORMATION">Need More Information</option>
              <option value="REJECTED">Reject Candidate</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Candidate Rating (1.0 to 5.0)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="5"
                step="0.5"
                value={fbRating}
                onChange={(e) => setFbRating(parseFloat(e.target.value))}
                className="w-full accent-brand-500"
              />
              <span className="font-mono font-bold text-sm text-brand-400 min-w-[3rem] text-right">
                {fbRating.toFixed(1)} / 5.0
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Client Notes & Comments
            </label>
            <textarea
              rows={3}
              value={fbComments}
              onChange={(e) => setFbComments(e.target.value)}
              placeholder="Candidate profile strengths, areas of concern, or specific topics to assess in technical rounds..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsFeedbackOpen(false);
                setSelectedSub(null);
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingFeedback}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-900/40"
            >
              {isSavingFeedback ? 'Saving...' : 'Submit Feedback'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
