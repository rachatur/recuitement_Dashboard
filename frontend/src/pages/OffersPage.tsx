import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Offer, CVSubmission } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { StatusBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import {
  FileCheck2, Plus, Search, DollarSign, Calendar,
  UserCheck, CheckCircle2, XCircle, AlertCircle, RefreshCw,
  Building2, Briefcase, User
} from 'lucide-react';
import { format } from 'date-fns';

export const OffersPage: React.FC = () => {
  const { hasRole } = useAuth();
  const { showToast } = useNotifications();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [submissions, setSubmissions] = useState<CVSubmission[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Create Offer Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedSubId, setSelectedSubId] = useState('');
  const [offeredCtc, setOfferedCtc] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [targetJoinDate, setTargetJoinDate] = useState('');
  const [validityDate, setValidityDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Record Joining Modal State
  const [isJoiningOpen, setIsJoiningOpen] = useState(false);
  const [joiningStatus, setJoiningStatus] = useState<'JOINED' | 'DID_NOT_JOIN'>('JOINED');
  const [employeeCode, setEmployeeCode] = useState('');
  const [actualDate, setActualDate] = useState(new Date().toISOString().split('T')[0]);
  const [joiningRemarks, setJoiningRemarks] = useState('');
  const [isRecordingJoining, setIsRecordingJoining] = useState(false);

  const fetchOffers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);

      const [offersRes, subsRes] = await Promise.all([
        api.get(`/offers?${params.toString()}`),
        api.get('/submissions'),
      ]);

      setOffers(offersRes.data);
      setSubmissions(subsRes.data);
      if (subsRes.data.length > 0 && !selectedSubId) {
        setSelectedSubId(subsRes.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, [statusFilter]);

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    const sub = submissions.find((s) => s.id === selectedSubId);
    if (!sub) {
      showToast('error', 'Validation Error', 'Please select a valid candidate submission');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/offers', {
        candidate_id: sub.candidate_id,
        requirement_id: sub.requirement_id,
        client_id: sub.client_id,
        submission_id: sub.id,
        offered_ctc: Number(offeredCtc),
        joining_bonus: Number(bonus),
        currency: 'USD',
        target_joining_date: new Date(targetJoinDate).toISOString(),
        validity_date: validityDate ? new Date(validityDate).toISOString() : undefined,
        status: 'RELEASED',
      });

      showToast('success', 'Offer Released', `Offer released for ${sub.candidate_name}`);
      setIsCreateOpen(false);
      fetchOffers();
    } catch (err: any) {
      showToast('error', 'Offer Creation Failed', err.response?.data?.detail || 'Could not release offer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordJoining = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOffer) return;

    setIsRecordingJoining(true);
    try {
      await api.put(`/offers/${selectedOffer.id}/joining`, {
        offer_id: selectedOffer.id,
        candidate_id: selectedOffer.candidate_id,
        actual_joining_date: actualDate ? new Date(actualDate).toISOString() : undefined,
        status: joiningStatus,
        employee_code: employeeCode,
        remarks: joiningRemarks,
      });

      showToast('success', 'Joining Recorded', `Recorded joining status for ${selectedOffer.candidate_name}`);
      setIsJoiningOpen(false);
      setSelectedOffer(null);
      fetchOffers();
    } catch (err: any) {
      showToast('error', 'Update Failed', err.response?.data?.detail || 'Could not record joining status');
    } finally {
      setIsRecordingJoining(false);
    }
  };

  const canManageOffers = hasRole(['SUPER_ADMIN', 'ADMIN', 'RECRUITER', 'TEAM_LEAD']);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-brand-400" />
            Offer Letters & Joining Management
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage offered compensation packages, target onboarding schedules, and verified employee joinings.
          </p>
        </div>

        {canManageOffers && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-900/40 transition-all"
          >
            <Plus className="w-4 h-4" />
            Release Offer Letter
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
            <option value="">All Offer Statuses</option>
            <option value="RELEASED">Released</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="DECLINED">Declined</option>
            <option value="DRAFT">Draft</option>
          </select>
        </div>
      </div>

      {/* Offers Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Candidate</th>
                <th className="px-5 py-3.5">Client & Job Requirement</th>
                <th className="px-5 py-3.5">Offered Annual CTC</th>
                <th className="px-5 py-3.5">Joining Bonus</th>
                <th className="px-5 py-3.5">Target Joining Date</th>
                <th className="px-5 py-3.5">Offer Status</th>
                <th className="px-5 py-3.5">Joining Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    <RefreshCw className="w-6 h-6 text-brand-500 animate-spin mx-auto mb-2" />
                    Loading offers...
                  </td>
                </tr>
              ) : offers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    No offer records found.
                  </td>
                </tr>
              ) : (
                offers.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-100">{o.candidate_name}</td>
                    <td className="px-5 py-3.5">
                      <div className="text-slate-200 font-medium">{o.requirement_title}</div>
                      <div className="text-[10px] text-slate-400">{o.client_name}</div>
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-brand-400">
                      ${(o.offered_ctc || o.annual_ctc || 0).toLocaleString()} {o.currency}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-300">
                      +${o.joining_bonus.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-300">
                      {format(new Date(o.target_joining_date), 'dd MMM yyyy')}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-5 py-3.5">
                      {o.joining_detail ? (
                        <div>
                          <StatusBadge status={o.joining_detail.status} />
                          {o.joining_detail.employee_code && (
                            <span className="block text-[10px] font-mono text-slate-400 mt-0.5">
                              #{o.joining_detail.employee_code}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500 font-mono text-[10px]">Pending</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {canManageOffers && (
                        <button
                          onClick={() => {
                            setSelectedOffer(o);
                            setEmployeeCode(o.joining_detail?.employee_code || `EMP-${Math.floor(1000 + Math.random() * 9000)}`);
                            setIsJoiningOpen(true);
                          }}
                          className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-lg text-[11px] font-semibold border border-emerald-500/40 transition-colors"
                        >
                          Record Joining
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

      {/* Release Offer Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Release Candidate Offer Letter"
        subtitle="Specify offered compensation package and target joining milestone."
      >
        <form onSubmit={handleCreateOffer} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Select Candidate Submission *
            </label>
            <select
              required
              value={selectedSubId}
              onChange={(e) => setSelectedSubId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
            >
              {submissions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.candidate_name} → {s.client_name} ({s.requirement_title})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Offered Base CTC ($ USD) *
              </label>
              <input
                type="number"
                required
                value={offeredCtc}
                onChange={(e) => setOfferedCtc(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Joining / Sign-on Bonus ($ USD)
              </label>
              <input
                type="number"
                value={bonus}
                onChange={(e) => setBonus(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Target Joining Date *
              </label>
              <input
                type="date"
                required
                value={targetJoinDate}
                onChange={(e) => setTargetJoinDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Offer Acceptance Deadline
              </label>
              <input
                type="date"
                value={validityDate}
                onChange={(e) => setValidityDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-900/40"
            >
              {isSubmitting ? 'Releasing...' : 'Release Offer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Record Joining Modal */}
      <Modal
        isOpen={isJoiningOpen}
        onClose={() => {
          setIsJoiningOpen(false);
          setSelectedOffer(null);
        }}
        title="Record Candidate Joining & Onboarding"
        subtitle={`Candidate: ${selectedOffer?.candidate_name} • Client: ${selectedOffer?.client_name}`}
      >
        <form onSubmit={handleRecordJoining} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Joining Status *
            </label>
            <select
              value={joiningStatus}
              onChange={(e) => setJoiningStatus(e.target.value as any)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
            >
              <option value="JOINED">Successfully Joined (Onboarded)</option>
              <option value="PLANNED">Planned (Future Joining)</option>
              <option value="DID_NOT_JOIN">Did Not Join (Offer Backout)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Allocated Employee ID Code
              </label>
              <input
                type="text"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                placeholder="e.g. NT-4402"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Actual Joining Date
              </label>
              <input
                type="date"
                value={actualDate}
                onChange={(e) => setActualDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Verification Notes & Remarks
            </label>
            <textarea
              rows={3}
              value={joiningRemarks}
              onChange={(e) => setJoiningRemarks(e.target.value)}
              placeholder="e.g. Candidate attended day 1 orientation, signed IT compliance NDA, and was assigned company laptop."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsJoiningOpen(false);
                setSelectedOffer(null);
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isRecordingJoining}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-900/40"
            >
              {isRecordingJoining ? 'Updating...' : 'Confirm Joining'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
