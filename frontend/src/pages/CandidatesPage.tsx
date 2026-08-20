import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Candidate, Role } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { StatusBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Drawer } from '../components/common/Drawer';
import { CandidateTimeline } from '../components/candidates/CandidateTimeline';
import { DocumentManager } from '../components/candidates/DocumentManager';
import {
  Users, Plus, Search, MapPin, DollarSign, Clock,
  Briefcase, Mail, Phone, ExternalLink, RefreshCw,
  FileText, History, CheckCircle2, UserCheck, Sparkles, Filter, Trash2
} from 'lucide-react';
import { format } from 'date-fns';

export const CandidatesPage: React.FC = () => {
  const { hasRole } = useAuth();
  const { showToast } = useNotifications();

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [search, setSearch] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [minExp, setMinExp] = useState<string>('');
  const [activeDrawerTab, setActiveDrawerTab] = useState<'profile' | 'documents' | 'timeline'>('timeline');
  const [isLoading, setIsLoading] = useState(true);

  // Status Change Modal
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('SCREENED');
  const [statusRemarks, setStatusRemarks] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Add Candidate Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [totalExp, setTotalExp] = useState(0);
  const [relExp, setRelExp] = useState(0);
  const [currentCompany, setCurrentCompany] = useState('');
  const [currentCtc, setCurrentCtc] = useState(0);
  const [expectedCtc, setExpectedCtc] = useState(0);
  const [noticeDays, setNoticeDays] = useState(0);
  const [skillsStr, setSkillsStr] = useState('');
  const [education, setEducation] = useState('');
  const [source, setSource] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCandidates = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (skillFilter) params.append('skill', skillFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (minExp) params.append('min_experience', minExp);

      const res = await api.get(`/candidates?${params.toString()}`);
      setCandidates(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, [search, skillFilter, statusFilter, minExp]);

  const handleOpenCandidateDetail = async (candidateId: string) => {
    try {
      const res = await api.get(`/candidates/${candidateId}`);
      setSelectedCandidate(res.data);
    } catch (err: any) {
      showToast('error', 'Error', 'Could not load candidate details');
    }
  };

  const handleCreateCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const skillsArray = skillsStr.split(',').map((s) => s.trim()).filter(Boolean);
      await api.post('/candidates', {
        first_name: firstName,
        last_name: lastName,
        email: email.trim(),
        phone,
        location,
        preferred_location: location,
        total_experience: Number(totalExp),
        relevant_experience: Number(relExp),
        current_company: currentCompany,
        current_ctc: Number(currentCtc),
        expected_ctc: Number(expectedCtc),
        notice_period_days: Number(noticeDays),
        skills: skillsArray,
        education,
        source,
        status: 'RECEIVED',
      });

      showToast('success', 'Candidate Added', `Added ${firstName} ${lastName} to the recruitment database`);
      setIsAddOpen(false);
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      fetchCandidates();
    } catch (err: any) {
      showToast('error', 'Error Creating Candidate', err.response?.data?.detail || 'Could not create candidate');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return;

    setIsUpdatingStatus(true);
    try {
      await api.put(`/candidates/${selectedCandidate.id}`, {
        status: newStatus,
        remarks: statusRemarks,
      });

      showToast('success', 'Status Updated', `Updated status to ${newStatus} and recorded in timeline`);
      setIsStatusModalOpen(false);
      setStatusRemarks('');
      // Refresh candidate detail
      handleOpenCandidateDetail(selectedCandidate.id);
      fetchCandidates();
    } catch (err: any) {
      showToast('error', 'Update Failed', err.response?.data?.detail || 'Could not update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeleteCandidate = async (candidateId: string, candidateName: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete candidate "${candidateName}" and all associated documents/history?`)) {
      return;
    }

    try {
      await api.delete(`/candidates/${candidateId}`);
      showToast('success', 'Candidate Deleted', `Successfully deleted candidate ${candidateName}`);
      if (selectedCandidate && selectedCandidate.id === candidateId) {
        setSelectedCandidate(null);
      }
      fetchCandidates();
    } catch (err: any) {
      showToast('error', 'Delete Failed', err.response?.data?.detail || 'Could not delete candidate');
    }
  };

  const canManage = hasRole(['SUPER_ADMIN', 'ADMIN', 'RECRUITER', 'TEAM_LEAD']);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-400" />
            Candidate Talent Pool & CV Management
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Centralized talent database with multi-version CV storage and complete sequential activity audit history.
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-900/40 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Candidate
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-md">
        <div className="relative col-span-1 sm:col-span-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search name, code, email, company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500"
          />
        </div>

        <input
          type="text"
          placeholder="Filter by skill (e.g. React, Python)..."
          value={skillFilter}
          onChange={(e) => setSkillFilter(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
        >
          <option value="">All Statuses</option>
          <option value="RECEIVED">Received</option>
          <option value="SCREENED">Screened</option>
          <option value="SHORTLISTED">Shortlisted</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="CLIENT_REVIEW">Client Review</option>
          <option value="INTERVIEW">Interview</option>
          <option value="SELECTED">Selected</option>
          <option value="OFFER">Offer</option>
          <option value="JOINED">Joined</option>
          <option value="REJECTED">Rejected</option>
        </select>

        <select
          value={minExp}
          onChange={(e) => setMinExp(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
        >
          <option value="">Any Experience</option>
          <option value="3">3+ Years</option>
          <option value="5">5+ Years</option>
          <option value="7">7+ Years</option>
        </select>
      </div>

      {/* Candidate Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Candidate ID</th>
                <th className="px-5 py-3.5">Candidate Name</th>
                <th className="px-5 py-3.5">Experience</th>
                <th className="px-5 py-3.5">Current Company</th>
                <th className="px-5 py-3.5">Expected CTC</th>
                <th className="px-5 py-3.5">Notice</th>
                <th className="px-5 py-3.5">Primary Skills</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-400">
                    <RefreshCw className="w-6 h-6 text-brand-500 animate-spin mx-auto mb-2" />
                    Loading candidates...
                  </td>
                </tr>
              ) : candidates.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-400">
                    No candidates found matching filter criteria.
                  </td>
                </tr>
              ) : (
                candidates.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-800/50 transition-colors group cursor-pointer"
                    onClick={() => handleOpenCandidateDetail(c.id)}
                  >
                    <td className="px-5 py-3.5 font-mono text-slate-400 font-bold">{c.candidate_code}</td>
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-100 group-hover:text-brand-300 transition-colors">
                        {c.first_name} {c.last_name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{c.email}</div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-300">
                      <strong>{c.total_experience}</strong> yrs (rel: {c.relevant_experience}y)
                    </td>
                    <td className="px-5 py-3.5 text-slate-300">{c.current_company || '—'}</td>
                    <td className="px-5 py-3.5 font-mono text-slate-300">
                      ${c.expected_ctc?.toLocaleString() || '—'}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-300">{c.notice_period_days} days</td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {c.skills.slice(0, 3).map((sk) => (
                          <span
                            key={sk}
                            className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700 text-[10px]"
                          >
                            {sk}
                          </span>
                        ))}
                        {c.skills.length > 3 && (
                          <span className="text-[10px] text-slate-400 self-center">
                            +{c.skills.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenCandidateDetail(c.id);
                        }}
                        className="px-3 py-1 bg-slate-800 hover:bg-brand-600 text-slate-300 hover:text-white rounded-lg text-[11px] font-semibold transition-all border border-slate-700"
                      >
                        Timeline & CV
                      </button>

                      {canManage && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCandidate(c.id, `${c.first_name} ${c.last_name}`);
                          }}
                          className="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-white rounded-lg text-[11px] font-semibold transition-all border border-rose-900/50"
                          title="Delete Candidate"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Add Candidate Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add New Candidate Profile"
        subtitle="Register candidate in the centralized talent pool."
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateCandidate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                First Name *
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Jordan"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Miller"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="candidate@example.com"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Total Exp (Yrs)
              </label>
              <input
                type="number"
                step="0.5"
                value={totalExp}
                onChange={(e) => setTotalExp(parseFloat(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Current Company
              </label>
              <input
                type="text"
                value={currentCompany}
                onChange={(e) => setCurrentCompany(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Notice (Days)
              </label>
              <input
                type="number"
                value={noticeDays}
                onChange={(e) => setNoticeDays(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Current CTC ($)
              </label>
              <input
                type="number"
                value={currentCtc}
                onChange={(e) => setCurrentCtc(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Expected CTC ($)
              </label>
              <input
                type="number"
                value={expectedCtc}
                onChange={(e) => setExpectedCtc(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Skills (Comma separated)
            </label>
            <input
              type="text"
              required
              value={skillsStr}
              onChange={(e) => setSkillsStr(e.target.value)}
              placeholder="e.g. React, TypeScript, FastAPI, PostgreSQL"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-900/40"
            >
              {isSubmitting ? 'Saving Profile...' : 'Save Candidate'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Candidate Detail Drawer with Multi-Version CVs and Immutable Timeline */}
      <Drawer
        isOpen={!!selectedCandidate}
        onClose={() => setSelectedCandidate(null)}
        title={`${selectedCandidate?.first_name} ${selectedCandidate?.last_name}`}
        subtitle={`Candidate ID: ${selectedCandidate?.candidate_code} • ${selectedCandidate?.current_company || 'Independent'}`}
        width="3xl"
      >
        {selectedCandidate && (
          <div className="space-y-6">
            {/* Status Header Banner */}
            <div className="flex items-center justify-between p-4 bg-slate-950/80 rounded-2xl border border-slate-800">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Current Lifecycle Status</span>
                <div className="mt-1 flex items-center gap-2">
                  <StatusBadge status={selectedCandidate.status} />
                  <span className="text-xs text-slate-400 font-mono">
                    Updated: {format(new Date(selectedCandidate.updated_at), 'dd MMM yyyy')}
                  </span>
                </div>
              </div>

              {canManage && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsStatusModalOpen(true)}
                    className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
                  >
                    <History className="w-3.5 h-3.5" />
                    Advance Status
                  </button>
                  <button
                    onClick={() => handleDeleteCandidate(selectedCandidate.id, `${selectedCandidate.first_name} ${selectedCandidate.last_name}`)}
                    className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-white text-xs font-semibold rounded-xl border border-rose-900/50 transition-all flex items-center gap-1.5"
                    title="Delete Candidate"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              )}
            </div>

            {/* Navigation Tabs inside Drawer */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <button
                onClick={() => setActiveDrawerTab('timeline')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeDrawerTab === 'timeline'
                    ? 'bg-brand-600/20 text-brand-300 border border-brand-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                Audit Timeline ({selectedCandidate.status_history?.length || 0})
              </button>

              <button
                onClick={() => setActiveDrawerTab('documents')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeDrawerTab === 'documents'
                    ? 'bg-brand-600/20 text-brand-300 border border-brand-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                CV Versions ({selectedCandidate.documents?.length || 0})
              </button>

              <button
                onClick={() => setActiveDrawerTab('profile')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeDrawerTab === 'profile'
                    ? 'bg-brand-600/20 text-brand-300 border border-brand-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Profile Information
              </button>
            </div>

            {/* Tab 1: Timeline */}
            {activeDrawerTab === 'timeline' && (
              <CandidateTimeline
                history={selectedCandidate.status_history || []}
                candidateName={`${selectedCandidate.first_name} ${selectedCandidate.last_name}`}
              />
            )}

            {/* Tab 2: Document Versions */}
            {activeDrawerTab === 'documents' && (
              <DocumentManager
                candidateId={selectedCandidate.id}
                documents={selectedCandidate.documents || []}
                onDocumentUploaded={() => handleOpenCandidateDetail(selectedCandidate.id)}
                canUpload={canManage}
              />
            )}

            {/* Tab 3: Profile Info */}
            {activeDrawerTab === 'profile' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                    <span className="text-slate-400">Total Experience</span>
                    <p className="font-bold text-slate-100 mt-1">{selectedCandidate.total_experience} Years</p>
                  </div>
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                    <span className="text-slate-400">Relevant Experience</span>
                    <p className="font-bold text-slate-100 mt-1">{selectedCandidate.relevant_experience} Years</p>
                  </div>
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                    <span className="text-slate-400">Current Compensation</span>
                    <p className="font-bold text-slate-100 mt-1 font-mono">${selectedCandidate.current_ctc?.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                    <span className="text-slate-400">Expected Compensation</span>
                    <p className="font-bold text-slate-100 mt-1 font-mono">${selectedCandidate.expected_ctc?.toLocaleString()}</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                  <h5 className="font-bold text-slate-200">Contact & Education</h5>
                  <p className="text-slate-300">Email: {selectedCandidate.email}</p>
                  <p className="text-slate-300">Phone: {selectedCandidate.phone || 'N/A'}</p>
                  <p className="text-slate-300">Location: {selectedCandidate.location}</p>
                  <p className="text-slate-300">Education: {selectedCandidate.education || 'N/A'}</p>
                  <p className="text-slate-300">Notice Period: {selectedCandidate.notice_period_days} Days</p>
                  <p className="text-slate-300">Recruiter Owner: {selectedCandidate.recruiter_name || 'Unassigned'}</p>
                </div>

                <div>
                  <h5 className="font-bold text-slate-200 mb-2">Technical Skills</h5>
                  <div className="flex flex-wrap gap-2">
                    {selectedCandidate.skills.map((sk) => (
                      <span key={sk} className="px-2.5 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg">
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Advance Status Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Advance Candidate Status"
        subtitle="This action will generate a permanent, immutable entry on the candidate timeline."
      >
        <form onSubmit={handleUpdateStatus} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Select New Lifecycle Stage *
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
            >
              <option value="SCREENED">Screened</option>
              <option value="SHORTLISTED">Shortlisted</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="CLIENT_REVIEW">Client Review</option>
              <option value="INTERVIEW">Interview</option>
              <option value="SELECTED">Selected</option>
              <option value="OFFER">Offer</option>
              <option value="JOINED">Joined</option>
              <option value="REJECTED">Rejected</option>
              <option value="ON_HOLD">On Hold</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Remarks & Rationale for Timeline *
            </label>
            <textarea
              required
              rows={3}
              value={statusRemarks}
              onChange={(e) => setStatusRemarks(e.target.value)}
              placeholder="e.g. Candidate completed tech phone screening; passed data structure questions with high confidence."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsStatusModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdatingStatus}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-900/40"
            >
              {isUpdatingStatus ? 'Recording...' : 'Record History Event'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
