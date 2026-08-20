import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Interview, Candidate, JobRequirement, Client } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { StatusBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import {
  CalendarCheck2, Plus, Search, Video, Clock, User,
  Building2, Briefcase, ExternalLink, RefreshCw, Star,
  CheckCircle2, AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

export const InterviewsPage: React.FC = () => {
  const { hasRole } = useAuth();
  const { showToast } = useNotifications();

  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [requirements, setRequirements] = useState<JobRequirement[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Schedule Interview Modal State
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [intCandId, setIntCandId] = useState('');
  const [intReqId, setIntReqId] = useState('');
  const [intClientId, setIntClientId] = useState('');
  const [intRoundNumber, setIntRoundNumber] = useState(1);
  const [intRoundName, setIntRoundName] = useState('');
  const [intType, setIntType] = useState<'VIRTUAL' | 'IN_PERSON' | 'PHONE'>('VIRTUAL');
  const [intDate, setIntDate] = useState('');
  const [intDuration, setIntDuration] = useState(60);
  const [intName, setIntName] = useState('');
  const [intEmail, setIntEmail] = useState('');
  const [intLink, setIntLink] = useState('');
  const [intNotes, setIntNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Record Feedback Modal State
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [rating, setRating] = useState(5.0);
  const [techScore, setTechScore] = useState(5.0);
  const [commScore, setCommScore] = useState(5.0);
  const [cultScore, setCultScore] = useState(5.0);
  const [recommendation, setRecommendation] = useState('Yes');
  const [detailedFb, setDetailedFb] = useState('');
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);

  const fetchInterviews = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);

      const [intsRes, candsRes, reqsRes, clientsRes] = await Promise.all([
        api.get(`/interviews?${params.toString()}`),
        api.get('/candidates'),
        api.get('/requirements'),
        api.get('/clients'),
      ]);

      setInterviews(intsRes.data);
      setCandidates(candsRes.data);
      setRequirements(reqsRes.data);
      setClients(clientsRes.data);

      if (clientsRes.data.length > 0 && !intClientId) {
        setIntClientId(clientsRes.data[0].id);
      }
      if (candsRes.data.length > 0 && !intCandId) {
        setIntCandId(candsRes.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
  }, [statusFilter]);

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intCandId || !intReqId || !intClientId) {
      showToast('error', 'Validation Error', 'Please select candidate, client, and job requirement');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/interviews', {
        candidate_id: intCandId,
        requirement_id: intReqId,
        client_id: intClientId,
        round_number: Number(intRoundNumber),
        round_name: intRoundName,
        interview_type: intType,
        interview_date: new Date(intDate).toISOString(),
        duration_minutes: Number(intDuration),
        interviewer_name: intName,
        interviewer_email: intEmail,
        meeting_link: intLink,
        notes: intNotes,
        status: 'SCHEDULED',
      });

      showToast('success', 'Interview Scheduled', `Scheduled ${intRoundName} for candidate`);
      setIsScheduleOpen(false);
      fetchInterviews();
    } catch (err: any) {
      showToast('error', 'Scheduling Failed', err.response?.data?.detail || 'Could not schedule interview');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInterview) return;

    setIsSavingFeedback(true);
    try {
      await api.post(`/interviews/${selectedInterview.id}/feedback`, {
        interview_id: selectedInterview.id,
        rating: Number(rating),
        technical_score: Number(techScore),
        communication_score: Number(commScore),
        cultural_fit_score: Number(cultScore),
        recommendation,
        detailed_feedback: detailedFb,
      });

      showToast('success', 'Feedback Recorded', 'Interview evaluation and ratings saved successfully');
      setIsFeedbackOpen(false);
      setSelectedInterview(null);
      setDetailedFb('');
      fetchInterviews();
    } catch (err: any) {
      showToast('error', 'Feedback Failed', err.response?.data?.detail || 'Could not save feedback');
    } finally {
      setIsSavingFeedback(false);
    }
  };

  const canSchedule = hasRole(['SUPER_ADMIN', 'ADMIN', 'RECRUITER', 'TEAM_LEAD', 'CLIENT', 'HIRING_MANAGER']);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <CalendarCheck2 className="w-5 h-5 text-brand-400" />
            Interview Coordination & Candidate Evaluation
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Track interview rounds, meeting links, assessor scorecards, and hiring recommendations.
          </p>
        </div>

        {canSchedule && (
          <button
            onClick={() => setIsScheduleOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-900/40 transition-all"
          >
            <Plus className="w-4 h-4" />
            Schedule Interview Round
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-md">
        <div className="w-64">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
          >
            <option value="">All Interview Statuses</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="COMPLETED">Completed</option>
            <option value="RESCHEDULED">Rescheduled</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Interviews Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Code</th>
                <th className="px-5 py-3.5">Candidate</th>
                <th className="px-5 py-3.5">Requirement / Client</th>
                <th className="px-5 py-3.5">Round Name</th>
                <th className="px-5 py-3.5">Interview Date & Time</th>
                <th className="px-5 py-3.5">Interviewer</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    <RefreshCw className="w-6 h-6 text-brand-500 animate-spin mx-auto mb-2" />
                    Loading interviews...
                  </td>
                </tr>
              ) : interviews.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    No scheduled interviews found.
                  </td>
                </tr>
              ) : (
                interviews.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-slate-400 font-bold">{item.interview_code}</td>
                    <td className="px-5 py-3.5 font-bold text-slate-100">{item.candidate_name}</td>
                    <td className="px-5 py-3.5">
                      <div className="text-slate-200 font-medium">{item.requirement_title}</div>
                      <div className="text-[10px] text-slate-400">{item.client_name}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700 font-medium">
                        {item.round_name} (Round {item.round_number})
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-300">
                      {format(new Date(item.interview_date), 'dd MMM yyyy, HH:mm')}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-slate-200">{item.interviewer_name || 'Hiring Panel'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{item.interviewer_email}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-2">
                      {item.meeting_link && (
                        <a
                          href={item.meeting_link}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-semibold border border-slate-700 inline-flex items-center gap-1"
                        >
                          <Video className="w-3 h-3 text-brand-400" />
                          Join
                        </a>
                      )}
                      <button
                        onClick={() => {
                          setSelectedInterview(item);
                          setIsFeedbackOpen(true);
                        }}
                        className="px-2.5 py-1 bg-brand-600/20 hover:bg-brand-600 text-brand-300 hover:text-white rounded-lg text-[11px] font-semibold border border-brand-500/40 transition-colors"
                      >
                        {item.feedbacks && item.feedbacks.length > 0 ? 'View Feedback' : 'Add Feedback'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Interview Modal */}
      <Modal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        title="Schedule Interview Round"
        subtitle="Set up evaluation session, assign interviewer, and provide meeting coordinates."
        maxWidth="2xl"
      >
        <form onSubmit={handleSchedule} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Candidate *
              </label>
              <select
                required
                value={intCandId}
                onChange={(e) => setIntCandId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              >
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name} ({c.candidate_code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Client Organization *
              </label>
              <select
                required
                value={intClientId}
                onChange={(e) => {
                  setIntClientId(e.target.value);
                  setIntReqId('');
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
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Position / Requirement *
            </label>
            <select
              required
              value={intReqId}
              onChange={(e) => setIntReqId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
            >
              <option value="">-- Choose Job Requirement --</option>
              {requirements.filter((r) => r.client_id === intClientId).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.job_title} ({r.req_code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Round Name
              </label>
              <input
                type="text"
                value={intRoundName}
                onChange={(e) => setIntRoundName(e.target.value)}
                placeholder="e.g. Technical Round 1"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Round Number
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={intRoundNumber}
                onChange={(e) => setIntRoundNumber(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Interview Date & Time
              </label>
              <input
                type="datetime-local"
                value={intDate}
                onChange={(e) => setIntDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Interviewer Name
              </label>
              <input
                type="text"
                value={intName}
                onChange={(e) => setIntName(e.target.value)}
                placeholder="e.g. Rachel Kim"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Meeting Link
              </label>
              <input
                type="url"
                value={intLink}
                onChange={(e) => setIntLink(e.target.value)}
                placeholder="https://meet.google.com/..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsScheduleOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-900/40"
            >
              {isSubmitting ? 'Scheduling...' : 'Confirm Schedule'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Record Interview Feedback Modal */}
      <Modal
        isOpen={isFeedbackOpen}
        onClose={() => {
          setIsFeedbackOpen(false);
          setSelectedInterview(null);
        }}
        title="Interviewer Scorecard & Recommendation"
        subtitle={`Candidate: ${selectedInterview?.candidate_name} • ${selectedInterview?.round_name}`}
        maxWidth="xl"
      >
        <form onSubmit={handleSaveFeedback} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Technical (1-5)</label>
              <input
                type="number"
                min="1"
                max="5"
                step="0.5"
                value={techScore}
                onChange={(e) => setTechScore(parseFloat(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Communication</label>
              <input
                type="number"
                min="1"
                max="5"
                step="0.5"
                value={commScore}
                onChange={(e) => setCommScore(parseFloat(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Cultural Fit</label>
              <input
                type="number"
                min="1"
                max="5"
                step="0.5"
                value={cultScore}
                onChange={(e) => setCultScore(parseFloat(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Final Recommendation *
            </label>
            <select
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
            >
              <option value="Strong Yes">Strong Yes (Proceed to Next Round / Offer)</option>
              <option value="Yes">Yes (Meets Standard)</option>
              <option value="Neutral">Neutral (Borderline)</option>
              <option value="No">No (Does Not Meet Standard)</option>
              <option value="Strong No">Strong No (Reject Immediately)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Detailed Assessment Notes *
            </label>
            <textarea
              required
              rows={4}
              value={detailedFb}
              onChange={(e) => setDetailedFb(e.target.value)}
              placeholder="Detailed feedback covering architectural reasoning, problem-solving ability, coding competency, and leadership signals..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsFeedbackOpen(false);
                setSelectedInterview(null);
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
              {isSavingFeedback ? 'Saving...' : 'Submit Evaluation'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
