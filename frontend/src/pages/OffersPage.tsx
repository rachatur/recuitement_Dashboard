import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Offer, CVSubmission, Candidate } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { StatusBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import {
  FileCheck2, Plus, Search, DollarSign, Calendar,
  UserCheck, CheckCircle2, XCircle, AlertCircle, RefreshCw,
  Building2, Briefcase, User, Printer, Send, MessageSquare,
  Sparkles, CheckSquare, Clock, ShieldCheck, ArrowRight,
  FileText, Download, Award, Check
} from 'lucide-react';
import { format } from 'date-fns';

interface OffersPageProps {
  onNavigateToCampaigns?: (candidateIds: string[], requirementId?: string) => void;
  onViewCandidateProfile?: (candidateId: string) => void;
}

export const OffersPage: React.FC<OffersPageProps> = ({
  onNavigateToCampaigns,
  onViewCandidateProfile
}) => {
  const { hasRole, user } = useAuth();
  const { showToast } = useNotifications();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [submissions, setSubmissions] = useState<CVSubmission[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [activeWorkflowTab, setActiveWorkflowTab] = useState<'ALL' | 'SELECTED_READY' | 'OFFER_RELEASED' | 'OFFER_ACCEPTED' | 'JOINED'>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Create Offer Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedSubId, setSelectedSubId] = useState('');
  const [offeredCtc, setOfferedCtc] = useState<number>(85000);
  const [bonus, setBonus] = useState<number>(5000);
  const [currency, setCurrency] = useState('USD');
  const [targetJoinDate, setTargetJoinDate] = useState('');
  const [validityDate, setValidityDate] = useState('');
  const [workMode, setWorkMode] = useState('Hybrid');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formal Offer Letter View/Print Modal State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewOffer, setPreviewOffer] = useState<Offer | null>(null);

  // Record Joining Modal State
  const [isJoiningOpen, setIsJoiningOpen] = useState(false);
  const [joiningStatus, setJoiningStatus] = useState<'JOINED' | 'PLANNED' | 'DID_NOT_JOIN'>('JOINED');
  const [employeeCode, setEmployeeCode] = useState('');
  const [actualDate, setActualDate] = useState(new Date().toISOString().split('T')[0]);
  const [joiningRemarks, setJoiningRemarks] = useState('');
  const [docsVerified, setDocsVerified] = useState({
    id_proof: true,
    education: true,
    relieving_letter: true,
    signed_offer: true
  });
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
      console.error('Error fetching offers data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, [statusFilter]);

  // Candidates whose submissions are marked as SELECTED / SHORTLISTED and ready for Offer
  const selectedCandidatesReadyForOffer = submissions.filter(
    (s) => (s.status === 'SELECTED' || s.status === 'SHORTLISTED') && !offers.some(o => o.submission_id === s.id)
  );

  const releasedOffers = offers.filter(o => o.status === 'RELEASED');
  const acceptedOffers = offers.filter(o => o.status === 'ACCEPTED' && o.joining_detail?.status !== 'JOINED');
  const joinedCandidates = offers.filter(o => o.joining_detail?.status === 'JOINED');

  const filteredOffers = offers.filter(o => {
    if (activeWorkflowTab === 'OFFER_RELEASED') return o.status === 'RELEASED';
    if (activeWorkflowTab === 'OFFER_ACCEPTED') return o.status === 'ACCEPTED' && o.joining_detail?.status !== 'JOINED';
    if (activeWorkflowTab === 'JOINED') return o.joining_detail?.status === 'JOINED';
    return true;
  });

  const handleOpenCreateForSubmission = (sub: CVSubmission) => {
    setSelectedSubId(sub.id);
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30);
    setTargetJoinDate(defaultDate.toISOString().split('T')[0]);

    const validity = new Date();
    validity.setDate(validity.getDate() + 7);
    setValidityDate(validity.toISOString().split('T')[0]);

    setIsCreateOpen(true);
  };

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
        currency: currency,
        target_joining_date: new Date(targetJoinDate).toISOString(),
        validity_date: validityDate ? new Date(validityDate).toISOString() : undefined,
        status: 'RELEASED',
      });

      showToast('success', 'Offer Letter Released', `Official offer released for ${sub.candidate_name}!`);
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
      const verifiedDocsList = Object.entries(docsVerified)
        .filter(([_, v]) => v)
        .map(([k]) => k)
        .join(', ');

      const combinedRemarks = `${joiningRemarks ? joiningRemarks + ' • ' : ''}Verified Documents: [${verifiedDocsList}]`;

      await api.put(`/offers/${selectedOffer.id}/joining`, {
        offer_id: selectedOffer.id,
        candidate_id: selectedOffer.candidate_id,
        actual_joining_date: actualDate ? new Date(actualDate).toISOString() : undefined,
        status: joiningStatus,
        employee_code: employeeCode,
        remarks: combinedRemarks,
      });

      showToast('success', 'Candidate Joined', `Successfully recorded candidate joining & onboarding for ${selectedOffer.candidate_name}!`);
      setIsJoiningOpen(false);
      setSelectedOffer(null);
      fetchOffers();
    } catch (err: any) {
      showToast('error', 'Update Failed', err.response?.data?.detail || 'Could not record joining status');
    } finally {
      setIsRecordingJoining(false);
    }
  };

  const handlePrintOfferLetter = () => {
    window.print();
  };

  const canManageOffers = hasRole(['SUPER_ADMIN', 'ADMIN', 'HR_RECRUITER', 'RECRUITER', 'TEAM_LEAD']);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 backdrop-blur-sm shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <FileCheck2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                Candidate Selection → Offer Letter → Joining Workflow
                <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Full Pipeline
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Manage candidate selection, formal offer release, acceptance verification, and day-1 joining onboarding.
              </p>
            </div>
          </div>
        </div>

        {canManageOffers && (
          <button
            onClick={() => {
              const defaultDate = new Date();
              defaultDate.setDate(defaultDate.getDate() + 30);
              setTargetJoinDate(defaultDate.toISOString().split('T')[0]);
              setIsCreateOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Release New Offer Letter</span>
          </button>
        )}
      </div>

      {/* 4-Stage Visual Workflow Pipeline Tracker */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Step 1: Candidate Selection */}
        <div
          onClick={() => setActiveWorkflowTab('SELECTED_READY')}
          className={`cursor-pointer bg-slate-900/90 p-4 rounded-2xl border transition-all ${
            activeWorkflowTab === 'SELECTED_READY'
              ? 'border-indigo-500 bg-indigo-950/20 shadow-lg ring-1 ring-indigo-500/50'
              : 'border-indigo-500/30 hover:border-indigo-500/60'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-black flex items-center justify-center">1</span>
              Selected Candidates
            </span>
            <div className="p-1 bg-indigo-500/20 text-indigo-300 rounded-lg">
              <Award className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{selectedCandidatesReadyForOffer.length}</span>
            <span className="text-[10px] font-semibold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded">
              Ready for Offer
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Interviews passed / Client shortlisted</p>
        </div>

        {/* Step 2: Offer Released */}
        <div
          onClick={() => setActiveWorkflowTab('OFFER_RELEASED')}
          className={`cursor-pointer bg-slate-900/90 p-4 rounded-2xl border transition-all ${
            activeWorkflowTab === 'OFFER_RELEASED'
              ? 'border-blue-500 bg-blue-950/20 shadow-lg ring-1 ring-blue-500/50'
              : 'border-blue-500/30 hover:border-blue-500/60'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-black flex items-center justify-center">2</span>
              Offers Released
            </span>
            <div className="p-1 bg-blue-500/20 text-blue-300 rounded-lg">
              <FileText className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{releasedOffers.length}</span>
            <span className="text-[10px] font-semibold text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded">
              In Consideration
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Offer package sent to candidate</p>
        </div>

        {/* Step 3: Offer Accepted */}
        <div
          onClick={() => setActiveWorkflowTab('OFFER_ACCEPTED')}
          className={`cursor-pointer bg-slate-900/90 p-4 rounded-2xl border transition-all ${
            activeWorkflowTab === 'OFFER_ACCEPTED'
              ? 'border-amber-500 bg-amber-950/20 shadow-lg ring-1 ring-amber-500/50'
              : 'border-amber-500/30 hover:border-amber-500/60'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black flex items-center justify-center">3</span>
              Offers Accepted
            </span>
            <div className="p-1 bg-amber-500/20 text-amber-300 rounded-lg">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{acceptedOffers.length}</span>
            <span className="text-[10px] font-semibold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded">
              Joining Planned
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Confirmed start date & notice period</p>
        </div>

        {/* Step 4: Joined & Onboarded */}
        <div
          onClick={() => setActiveWorkflowTab('JOINED')}
          className={`cursor-pointer bg-slate-900/90 p-4 rounded-2xl border transition-all ${
            activeWorkflowTab === 'JOINED'
              ? 'border-emerald-500 bg-emerald-950/20 shadow-lg ring-1 ring-emerald-500/50'
              : 'border-emerald-500/30 hover:border-emerald-500/60'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black flex items-center justify-center">4</span>
              Joined & Onboarded
            </span>
            <div className="p-1 bg-emerald-500/20 text-emerald-300 rounded-lg">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-400">{joinedCandidates.length}</span>
            <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded">
              Completed
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Verified employee code & orientation</p>
        </div>
      </div>

      {/* Workflow Navigation Pills & Filter */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-lg">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveWorkflowTab('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeWorkflowTab === 'ALL'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                : 'bg-slate-950 text-slate-300 border border-slate-800 hover:bg-slate-800 hover:text-white'
            }`}
          >
            All Workflow Records ({offers.length})
          </button>
          <button
            onClick={() => setActiveWorkflowTab('SELECTED_READY')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeWorkflowTab === 'SELECTED_READY'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-950 text-slate-300 border border-slate-800 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span>Ready for Offer</span>
            <span className="px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 rounded text-[10px]">
              {selectedCandidatesReadyForOffer.length}
            </span>
          </button>
          <button
            onClick={() => setActiveWorkflowTab('OFFER_RELEASED')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeWorkflowTab === 'OFFER_RELEASED'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-950 text-slate-300 border border-slate-800 hover:bg-slate-800 hover:text-white'
            }`}
          >
            Offers Released ({releasedOffers.length})
          </button>
          <button
            onClick={() => setActiveWorkflowTab('OFFER_ACCEPTED')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeWorkflowTab === 'OFFER_ACCEPTED'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-slate-950 text-slate-300 border border-slate-800 hover:bg-slate-800 hover:text-white'
            }`}
          >
            Offers Accepted ({acceptedOffers.length})
          </button>
          <button
            onClick={() => setActiveWorkflowTab('JOINED')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeWorkflowTab === 'JOINED'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-950 text-slate-300 border border-slate-800 hover:bg-slate-800 hover:text-white'
            }`}
          >
            Joined ({joinedCandidates.length})
          </button>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="">All Status Filter</option>
            <option value="RELEASED">Released</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="DECLINED">Declined</option>
            <option value="DRAFT">Draft</option>
          </select>

          <button
            onClick={fetchOffers}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition border border-slate-700"
            title="Refresh Offers"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* If "Ready for Offer" tab is active, show Selected Candidates List */}
      {activeWorkflowTab === 'SELECTED_READY' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="font-bold text-sm text-white">Selected Candidates Awaiting Offer Release</h3>
                <p className="text-xs text-slate-400">These candidates have passed interview rounds and are ready for official offer letters.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedCandidatesReadyForOffer.length === 0 ? (
              <div className="col-span-3 text-center py-10 text-slate-500 text-xs">
                No new selected candidates awaiting offer release.
              </div>
            ) : (
              selectedCandidatesReadyForOffer.map((sub) => (
                <div key={sub.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 flex flex-col justify-between hover:border-indigo-500/40 transition">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-sm text-white">{sub.candidate_name}</h4>
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[10px] font-bold border border-emerald-500/30">
                        {sub.status}
                      </span>
                    </div>
                    <p className="text-xs text-indigo-300 font-semibold">{sub.requirement_title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{sub.client_name}</p>
                  </div>

                  <button
                    onClick={() => handleOpenCreateForSubmission(sub)}
                    className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow"
                  >
                    <FileCheck2 className="w-4 h-4" />
                    <span>Generate & Release Offer</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Offers & Joining Workflow Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[11px] font-bold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Candidate</th>
                <th className="px-5 py-3.5">Client & Position</th>
                <th className="px-5 py-3.5">Offered Compensation</th>
                <th className="px-5 py-3.5">Target Joining Date</th>
                <th className="px-5 py-3.5">Offer Status</th>
                <th className="px-5 py-3.5">Joining / Onboarding</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin mx-auto mb-2" />
                    Loading recruitment offer records...
                  </td>
                </tr>
              ) : filteredOffers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    No offer records found matching your workflow filter.
                  </td>
                </tr>
              ) : (
                filteredOffers.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-white text-sm">{o.candidate_name}</div>
                      <span className="text-[10px] text-slate-400 font-mono">Offer ID: {o.id.slice(0, 8)}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-slate-200 font-medium">{o.requirement_title}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3 text-slate-500" />
                        {o.client_name}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono">
                      <div className="font-bold text-emerald-400 text-sm">
                        ${(o.offered_ctc || o.annual_ctc || 0).toLocaleString()} {o.currency}
                      </div>
                      {o.joining_bonus > 0 && (
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          +${o.joining_bonus.toLocaleString()} Sign-on Bonus
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                        {format(new Date(o.target_joining_date), 'dd MMM yyyy')}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        o.status === 'ACCEPTED'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : o.status === 'RELEASED'
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          : o.status === 'DECLINED'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {o.joining_detail ? (
                        <div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            o.joining_detail.status === 'JOINED'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          }`}>
                            {o.joining_detail.status}
                          </span>
                          {o.joining_detail.employee_code && (
                            <span className="block text-[11px] font-mono font-bold text-slate-300 mt-1">
                              Emp Code: #{o.joining_detail.employee_code}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500 font-mono text-[11px]">Awaiting Joining</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Formal Letter Preview & Print */}
                        <button
                          onClick={() => {
                            setPreviewOffer(o);
                            setIsPreviewOpen(true);
                          }}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition flex items-center gap-1"
                          title="View & Print Official Offer Letter"
                        >
                          <Printer className="w-3.5 h-3.5 text-blue-400" />
                          <span>Letter</span>
                        </button>

                        {canManageOffers && (
                          <button
                            onClick={() => {
                              setSelectedOffer(o);
                              setEmployeeCode(o.joining_detail?.employee_code || `EMP-${Math.floor(1000 + Math.random() * 9000)}`);
                              setIsJoiningOpen(true);
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Record Joining</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Release New Offer Letter */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Release Candidate Offer Letter"
        subtitle="Specify offered compensation package and target joining milestone."
      >
        <form onSubmit={handleCreateOffer} className="space-y-4 text-xs text-white">
          <div>
            <label className="block font-bold text-slate-300 mb-1">
              Select Candidate Submission *
            </label>
            <select
              required
              value={selectedSubId}
              onChange={(e) => setSelectedSubId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-semibold"
            >
              {submissions.map((s) => (
                <option key={s.id} value={s.id} className="bg-slate-900">
                  {s.candidate_name} → {s.client_name} ({s.requirement_title}) [{s.status}]
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-300 mb-1">
                Offered Annual CTC *
              </label>
              <div className="relative">
                <input
                  type="number"
                  required
                  value={offeredCtc}
                  onChange={(e) => setOfferedCtc(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="block font-bold text-slate-300 mb-1">
                Joining / Sign-on Bonus
              </label>
              <input
                type="number"
                value={bonus}
                onChange={(e) => setBonus(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-300 mb-1">
                Target Joining Date *
              </label>
              <input
                type="date"
                required
                value={targetJoinDate}
                onChange={(e) => setTargetJoinDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-300 mb-1">
                Offer Acceptance Deadline
              </label>
              <input
                type="date"
                value={validityDate}
                onChange={(e) => setValidityDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
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
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-2"
            >
              {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileCheck2 className="w-4 h-4" />}
              <span>{isSubmitting ? 'Releasing...' : 'Release Official Offer Letter'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Official Offer Letter View & Print Preview */}
      {isPreviewOpen && previewOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 text-white max-h-[90vh] overflow-y-auto my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base text-white">Official Employment Offer Letter</h3>
              </div>
              <button onClick={() => setIsPreviewOpen(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            {/* Formatted Letter Body */}
            <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 text-slate-200 text-xs space-y-4 font-sans leading-relaxed">
              <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-base font-black text-emerald-400">RecruitFlow Talent Management</h2>
                  <p className="text-[11px] text-slate-400">HR Operations & Enterprise Recruitment</p>
                </div>
                <div className="text-right text-[11px] text-slate-400">
                  <p>Date: {format(new Date(previewOffer.created_at || new Date()), 'dd MMMM yyyy')}</p>
                  <p className="font-mono">Ref: OFR-{previewOffer.id.slice(0, 8).toUpperCase()}</p>
                </div>
              </div>

              <div>
                <p className="font-bold text-white text-sm">Dear {previewOffer.candidate_name},</p>
                <p className="mt-2 text-slate-300">
                  Following your successful interview evaluation with <strong>{previewOffer.client_name}</strong>, we are delighted to extend this formal offer of employment for the position of <strong>{previewOffer.requirement_title}</strong>.
                </p>
              </div>

              {/* Compensation Breakdown Card */}
              <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-xs text-white uppercase tracking-wider">Offer Compensation & Terms:</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">Annual Base Compensation (CTC):</span>
                    <strong className="text-emerald-400 text-sm font-mono">${(previewOffer.offered_ctc || 0).toLocaleString()} {previewOffer.currency}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Joining / Sign-on Bonus:</span>
                    <strong className="text-white text-sm font-mono">+${(previewOffer.joining_bonus || 0).toLocaleString()}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Target Joining Date:</span>
                    <strong className="text-white">{format(new Date(previewOffer.target_joining_date), 'dd MMMM yyyy')}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Reporting Client:</span>
                    <strong className="text-white">{previewOffer.client_name}</strong>
                  </div>
                </div>
              </div>

              <p className="text-slate-400 text-[11px]">
                Please review and accept this offer prior to the validity deadline of <strong>{previewOffer.validity_date ? format(new Date(previewOffer.validity_date), 'dd MMMM yyyy') : '7 days from issue'}</strong>.
              </p>

              <div className="pt-4 border-t border-slate-800 flex justify-between items-end text-[11px] text-slate-400">
                <div>
                  <p className="font-bold text-slate-200">Authorized HR Signatory</p>
                  <p>RecruitFlow Talent Acquisition Team</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-200">Candidate Acceptance</p>
                  <p className="italic">Sign & Acknowledge</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={() => onNavigateToCampaigns && onNavigateToCampaigns([previewOffer.candidate_id])}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-300 rounded-xl text-xs font-bold border border-emerald-800"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Send Offer on WhatsApp</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Close
                </button>
                <button
                  onClick={handlePrintOfferLetter}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Offer Letter</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Record Joining & Onboarding */}
      <Modal
        isOpen={isJoiningOpen}
        onClose={() => {
          setIsJoiningOpen(false);
          setSelectedOffer(null);
        }}
        title="Record Candidate Joining & Day-1 Onboarding"
        subtitle={`Candidate: ${selectedOffer?.candidate_name} • Client: ${selectedOffer?.client_name}`}
      >
        <form onSubmit={handleRecordJoining} className="space-y-4 text-xs text-white">
          <div>
            <label className="block font-bold text-slate-300 mb-1">
              Joining Status *
            </label>
            <select
              value={joiningStatus}
              onChange={(e) => setJoiningStatus(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-semibold"
            >
              <option value="JOINED" className="bg-slate-900">Successfully Joined (Onboarded & Active)</option>
              <option value="PLANNED" className="bg-slate-900">Planned (Future Joining Scheduled)</option>
              <option value="DID_NOT_JOIN" className="bg-slate-900">Did Not Join (Offer Backout / Declined)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-300 mb-1">
                Allocated Employee ID Code *
              </label>
              <input
                type="text"
                required
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                placeholder="e.g. EMP-1048"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-300 mb-1">
                Actual Joining Date *
              </label>
              <input
                type="date"
                required
                value={actualDate}
                onChange={(e) => setActualDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Document Verification Checklist */}
          <div>
            <label className="block font-bold text-slate-300 mb-2">
              Day-1 Document Verification Checklist:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 p-2 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={docsVerified.id_proof}
                  onChange={(e) => setDocsVerified({ ...docsVerified, id_proof: e.target.checked })}
                  className="rounded text-emerald-600 bg-slate-900 border-slate-700"
                />
                <span className="text-slate-300">Identity & Address Proof</span>
              </label>
              <label className="flex items-center gap-2 p-2 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={docsVerified.education}
                  onChange={(e) => setDocsVerified({ ...docsVerified, education: e.target.checked })}
                  className="rounded text-emerald-600 bg-slate-900 border-slate-700"
                />
                <span className="text-slate-300">Degree / Certifications</span>
              </label>
              <label className="flex items-center gap-2 p-2 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={docsVerified.relieving_letter}
                  onChange={(e) => setDocsVerified({ ...docsVerified, relieving_letter: e.target.checked })}
                  className="rounded text-emerald-600 bg-slate-900 border-slate-700"
                />
                <span className="text-slate-300">Prior Relieving Letter</span>
              </label>
              <label className="flex items-center gap-2 p-2 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={docsVerified.signed_offer}
                  onChange={(e) => setDocsVerified({ ...docsVerified, signed_offer: e.target.checked })}
                  className="rounded text-emerald-600 bg-slate-900 border-slate-700"
                />
                <span className="text-slate-300">Signed Offer Letter</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">
              Verification Notes & Remarks
            </label>
            <textarea
              rows={2}
              value={joiningRemarks}
              onChange={(e) => setJoiningRemarks(e.target.value)}
              placeholder="e.g. Candidate attended day 1 orientation and completed onboarding formalities."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 placeholder-slate-500"
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
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-2"
            >
              {isRecordingJoining ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
              <span>{isRecordingJoining ? 'Updating...' : 'Confirm Candidate Joining'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
