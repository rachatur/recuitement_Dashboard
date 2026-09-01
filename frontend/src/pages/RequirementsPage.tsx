import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { JobRequirement, Client, User, RequirementStatus } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { StatusBadge, PriorityBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Drawer } from '../components/common/Drawer';
import {
  Briefcase, Plus, Search, MapPin, DollarSign, Users,
  Clock, Filter, Layers, ListFilter, Sparkles, RefreshCw,
  CheckCircle2, AlertCircle, Building2, Upload, FileText, X, Pencil,
  Calendar, Check, PauseCircle, XCircle, PlayCircle
} from 'lucide-react';
import { format, isValid } from 'date-fns';

export const RequirementsPage: React.FC = () => {
  const { hasRole } = useAuth();
  const { showToast } = useNotifications();

  const [requirements, setRequirements] = useState<JobRequirement[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [recruiters, setRecruiters] = useState<User[]>([]);
  const [selectedReq, setSelectedReq] = useState<JobRequirement | null>(null);
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isLoading, setIsLoading] = useState(true);

  // Add / Edit Requirement Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingReq, setEditingReq] = useState<JobRequirement | null>(null);
  const [clientId, setClientId] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [skillsStr, setSkillsStr] = useState('');
  const [expMin, setExpMin] = useState(0);
  const [expMax, setExpMax] = useState(0);
  const [location, setLocation] = useState('');
  const [workMode, setWorkMode] = useState<'REMOTE' | 'HYBRID' | 'ONSITE'>('REMOTE');
  const [salaryMin, setSalaryMin] = useState(0);
  const [salaryMax, setSalaryMax] = useState(0);
  const [openings, setOpenings] = useState(1);
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [requirementStatus, setRequirementStatus] = useState<RequirementStatus>('OPEN');
  const [openDate, setOpenDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [holdDate, setHoldDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [closedDate, setClosedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [targetClosingDate, setTargetClosingDate] = useState('');
  const [recruiterId, setRecruiterId] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [jobDescFile, setJobDescFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRequirements = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (clientFilter) params.append('client_id', clientFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (priorityFilter) params.append('priority', priorityFilter);

      const [reqRes, clientRes, recRes] = await Promise.all([
        api.get(`/requirements?${params.toString()}`),
        api.get('/clients'),
        api.get('/users/recruiters'),
      ]);

      setRequirements(reqRes.data);
      setClients(clientRes.data);
      setRecruiters(recRes.data);
      if (clientRes.data.length > 0 && !clientId) {
        setClientId(clientRes.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequirements();
  }, [search, clientFilter, statusFilter, priorityFilter]);

  const handleCreateRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      showToast('error', 'Validation Error', 'Please select a hiring client');
      return;
    }

    setIsSubmitting(true);
    try {
      const skillsArray = skillsStr.split(',').map((s) => s.trim()).filter(Boolean);
      const payload: any = {
        client_id: clientId,
        job_title: jobTitle,
        department,
        required_skills: skillsArray,
        experience_min: Number(expMin),
        experience_max: Number(expMax),
        location,
        work_mode: workMode,
        salary_min: Number(salaryMin),
        salary_max: Number(salaryMax),
        salary_currency: 'USD',
        openings_count: Number(openings),
        priority,
        assigned_recruiter_id: recruiterId || undefined,
        status: requirementStatus,
        open_date: openDate ? new Date(openDate).toISOString() : new Date().toISOString(),
        hold_date: requirementStatus === 'ON_HOLD' && holdDate ? new Date(holdDate).toISOString() : undefined,
        closed_date: (requirementStatus === 'CLOSED' || requirementStatus === 'CANCELLED') && closedDate ? new Date(closedDate).toISOString() : undefined,
        target_closing_date: targetClosingDate ? new Date(targetClosingDate).toISOString() : undefined,
        job_description: jobDesc,
      };

      const requirementRes = editingReq
        ? await api.put(`/requirements/${editingReq.id}`, payload)
        : await api.post('/requirements', payload);

      if (jobDescFile && !editingReq) {
        const fileData = new FormData();
        fileData.append('file', jobDescFile);
        await api.post(`/requirements/${requirementRes.data.id}/jd/upload`, fileData);
      }

      showToast(
        'success',
        editingReq ? 'Requirement Updated' : 'Requirement Published',
        editingReq
          ? `Updated job opening for ${jobTitle} (Status: ${requirementStatus})`
          : jobDescFile
          ? `Created job opening for ${jobTitle} with attachment`
          : `Created job opening for ${jobTitle}`
      );
      setIsAddOpen(false);
      setEditingReq(null);
      resetForm();
      fetchRequirements();
    } catch (err: any) {
      showToast('error', 'Creation Failed', err.response?.data?.detail || 'Could not save requirement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setJobTitle('');
    setDepartment('');
    setSalaryMin(0);
    setSalaryMax(0);
    setRequirementStatus('OPEN');
    setOpenDate(format(new Date(), 'yyyy-MM-dd'));
    setHoldDate(format(new Date(), 'yyyy-MM-dd'));
    setClosedDate(format(new Date(), 'yyyy-MM-dd'));
    setTargetClosingDate('');
    setJobDesc('');
    setJobDescFile(null);
  };

  const handleEditRequirement = (requirement: JobRequirement) => {
    setEditingReq(requirement);
    setClientId(requirement.client_id);
    setJobTitle(requirement.job_title);
    setDepartment(requirement.department || '');
    setSkillsStr(requirement.required_skills.join(', '));
    setExpMin(requirement.experience_min || 0);
    setExpMax(requirement.experience_max || 0);
    setLocation(requirement.location || '');
    setWorkMode(requirement.work_mode);
    setSalaryMin(requirement.salary_min || 0);
    setSalaryMax(requirement.salary_max || 0);
    setOpenings(requirement.openings_count || 1);
    setPriority(requirement.priority);
    setRecruiterId(requirement.assigned_recruiter_id || '');
    setRequirementStatus(requirement.status);
    setOpenDate(requirement.open_date ? format(new Date(requirement.open_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
    setHoldDate(requirement.hold_date ? format(new Date(requirement.hold_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
    setClosedDate(requirement.closed_date ? format(new Date(requirement.closed_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
    setTargetClosingDate(requirement.target_closing_date ? format(new Date(requirement.target_closing_date), 'yyyy-MM-dd') : '');
    setJobDesc(requirement.job_description || '');
    setJobDescFile(null);
    setIsAddOpen(true);
  };

  const handleQuickStatusChange = async (reqId: string, nextStatus: 'OPEN' | 'ON_HOLD' | 'CLOSED', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const posStatus = nextStatus === 'CLOSED' ? 'CLOSED' : nextStatus === 'ON_HOLD' ? 'ON_HOLD' : 'OPEN';
      await api.put(`/requirements/${reqId}/position-status`, {
        position_status: posStatus,
        remarks: `Position status updated to ${nextStatus}`
      });
      showToast('success', 'Status Updated', `Requirement status set to ${nextStatus}`);
      fetchRequirements();
      if (selectedReq && selectedReq.id === reqId) {
        setSelectedReq((prev) => prev ? { ...prev, status: nextStatus, position_status: posStatus } : null);
      }
    } catch (err: any) {
      showToast('error', 'Status Change Failed', err.response?.data?.detail || 'Could not update status');
    }
  };

  const formatDateDisplay = (dateStr?: string | null) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isValid(d) ? format(d, 'dd MMM yyyy') : null;
  };

  const canManage = hasRole(['SUPER_ADMIN', 'ADMIN', 'RECRUITER', 'TEAM_LEAD']);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-brand-400" />
            Job Requirements & Openings
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Active client mandates, required technical competencies, opening & lifecycle dates, and status tracking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex items-center">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'list' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'grid' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cards
            </button>
          </div>

          {canManage && (
            <button
              onClick={() => {
                setEditingReq(null);
                resetForm();
                setIsAddOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-900/40 transition-all"
            >
              <Plus className="w-4 h-4" />
              Post New Requirement
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-md">
        <div className="relative col-span-1 sm:col-span-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search job title, code, skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500"
          />
        </div>

        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
        >
          <option value="">All Clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
        >
          <option value="">All Priorities</option>
          <option value="URGENT">Urgent</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="ON_HOLD">On Hold</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      {/* Content: List or Grid view */}
      {isLoading ? (
        <div className="text-center py-16 bg-slate-900/90 border border-slate-800 rounded-2xl">
          <RefreshCw className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-400">Loading requirements...</p>
        </div>
      ) : requirements.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/90 border border-slate-800 rounded-2xl">
          <Briefcase className="w-10 h-10 text-slate-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-300">No Job Requirements Found</p>
          <p className="text-xs text-slate-400 mt-1">Try adjusting search filters or create a new requirement.</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">Req Code</th>
                  <th className="px-4 py-3.5">Job Title</th>
                  <th className="px-4 py-3.5">Client</th>
                  <th className="px-4 py-3.5">Location / Mode</th>
                  <th className="px-4 py-3.5">Required Skills</th>
                  <th className="px-4 py-3.5 text-center">Openings</th>
                  <th className="px-4 py-3.5">Priority</th>
                  <th className="px-4 py-3.5">Status & Dates</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {requirements.map((r) => {
                  const openDateDisplay = formatDateDisplay(r.open_date);
                  const holdDateDisplay = formatDateDisplay(r.hold_date || r.status_updated_at);
                  const closedDateDisplay = formatDateDisplay(r.closed_date || r.status_updated_at);
                  const targetDateDisplay = formatDateDisplay(r.target_closing_date);

                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-800/50 transition-colors group cursor-pointer"
                      onClick={() => setSelectedReq(r)}
                    >
                      <td className="px-4 py-3.5 font-mono text-slate-400 font-bold">{r.req_code}</td>
                      <td className="px-4 py-3.5 font-bold text-slate-100 group-hover:text-brand-300 transition-colors">
                        {r.job_title}
                      </td>
                      <td className="px-4 py-3.5 text-slate-300">{r.client_name}</td>
                      <td className="px-4 py-3.5 text-slate-300">
                        <div>{r.location || 'Remote'}</div>
                        <div className="text-[10px] font-mono text-slate-400">{r.work_mode}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {r.required_skills.slice(0, 3).map((sk) => (
                            <span
                              key={sk}
                              className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700 text-[10px]"
                            >
                              {sk}
                            </span>
                          ))}
                          {r.required_skills.length > 3 && (
                            <span className="text-[10px] text-slate-400 self-center">
                              +{r.required_skills.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono">
                        <span className="text-slate-100 font-bold">{r.filled_count}</span>
                        <span className="text-slate-400">/{r.openings_count}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <PriorityBadge priority={r.priority} />
                      </td>

                      {/* Status & Position Dates Column */}
                      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <select
                              value={r.status}
                              onChange={(e) => handleQuickStatusChange(r.id, e.target.value as any)}
                              className={`text-[11px] font-extrabold px-2 py-0.5 rounded-lg border focus:outline-none transition-all cursor-pointer ${
                                r.status === 'OPEN'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : r.status === 'ON_HOLD'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              }`}
                            >
                              <option value="OPEN" className="bg-slate-900 text-emerald-400">OPEN</option>
                              <option value="ON_HOLD" className="bg-slate-900 text-amber-400">ON HOLD</option>
                              <option value="CLOSED" className="bg-slate-900 text-rose-400">CLOSED</option>
                            </select>
                          </div>

                          {/* Specific date milestone */}
                          <div className="text-[10px] font-mono leading-tight space-y-0.5">
                            {r.status === 'OPEN' && openDateDisplay && (
                              <div className="text-emerald-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                                <span>Opened: {openDateDisplay}</span>
                              </div>
                            )}

                            {r.status === 'ON_HOLD' && (
                              <div className="text-amber-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                                <span>Hold: {holdDateDisplay || openDateDisplay}</span>
                              </div>
                            )}

                            {r.status === 'CLOSED' && (
                              <div className="text-rose-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block" />
                                <span>Closed: {closedDateDisplay || openDateDisplay}</span>
                              </div>
                            )}

                            {targetDateDisplay && (
                              <div className="text-slate-400 flex items-center gap-1">
                                <Calendar className="w-2.5 h-2.5" />
                                <span>Target: {targetDateDisplay}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditRequirement(r);
                          }}
                          className="px-3 py-1 bg-slate-800 hover:bg-brand-600 text-slate-300 hover:text-white rounded-lg text-[11px] font-semibold transition-all border border-slate-700"
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <Pencil className="w-3 h-3" /> Edit
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {requirements.map((r) => {
            const openDateDisplay = formatDateDisplay(r.open_date);
            const holdDateDisplay = formatDateDisplay(r.hold_date || r.status_updated_at);
            const closedDateDisplay = formatDateDisplay(r.closed_date || r.status_updated_at);
            const targetDateDisplay = formatDateDisplay(r.target_closing_date);

            return (
              <div
                key={r.id}
                onClick={() => setSelectedReq(r)}
                className="bg-slate-900/90 border border-slate-800 hover:border-brand-500/50 p-5 rounded-2xl shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-slate-400 font-bold">{r.req_code}</span>
                    <PriorityBadge priority={r.priority} />
                  </div>
                  <h4 className="text-base font-bold text-slate-100 mt-2 group-hover:text-brand-300 transition-colors">
                    {r.job_title}
                  </h4>
                  <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    {r.client_name}
                  </p>

                  {/* Dates Timeline Banner */}
                  <div className="mt-3 p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-1 text-[11px] font-mono">
                    {openDateDisplay && (
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Opened Date:
                        </span>
                        <span className="font-bold text-slate-200">{openDateDisplay}</span>
                      </div>
                    )}
                    {r.status === 'ON_HOLD' && holdDateDisplay && (
                      <div className="flex items-center justify-between text-amber-300">
                        <span className="text-amber-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> On Hold Date:
                        </span>
                        <span className="font-bold">{holdDateDisplay}</span>
                      </div>
                    )}
                    {r.status === 'CLOSED' && closedDateDisplay && (
                      <div className="flex items-center justify-between text-rose-300">
                        <span className="text-rose-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Closed Date:
                        </span>
                        <span className="font-bold">{closedDateDisplay}</span>
                      </div>
                    )}
                    {targetDateDisplay && (
                      <div className="flex items-center justify-between text-slate-400 border-t border-slate-800/60 pt-1 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" /> Target Close:
                        </span>
                        <span>{targetDateDisplay}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-3 pt-2 border-t border-slate-800">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {r.work_mode}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                      ${(r.salary_min || 120000) / 1000}k - ${(r.salary_max || 160000) / 1000}k
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {r.required_skills.slice(0, 4).map((sk) => (
                      <span
                        key={sk}
                        className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md border border-slate-700 text-[10px]"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800 text-xs">
                  <div className="font-mono text-slate-400">
                    Filled: <strong className="text-brand-400">{r.filled_count}</strong>/{r.openings_count}
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Post / Edit Requirement Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => {
          setIsAddOpen(false);
          setEditingReq(null);
        }}
        title={editingReq ? 'Edit Client Job Requirement & Dates' : 'Post New Client Job Requirement'}
        subtitle={
          editingReq
            ? 'Update the opening details, lifecycle dates (Open, Hold, Closed), and hiring status.'
            : 'Create an active recruitment mandate with opening date, salary targets, and required technical skills.'
        }
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateRequirement} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Client Organization *
              </label>
              <select
                required
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
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
                Job Title *
              </label>
              <input
                type="text"
                required
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Senior Full Stack Engineer"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Department
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Platform Eng"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Work Mode
              </label>
              <select
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              >
                <option value="REMOTE">Remote</option>
                <option value="HYBRID">Hybrid</option>
                <option value="ONSITE">Onsite</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              >
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Requirement Status
              </label>
              <select
                value={requirementStatus}
                onChange={(e) => setRequirementStatus(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500 font-bold"
              >
                <option value="OPEN">🟢 OPEN (Active)</option>
                <option value="ON_HOLD">⏸️ ON HOLD (Paused)</option>
                <option value="CLOSED">✕ CLOSED (Filled/Ended)</option>
              </select>
            </div>
          </div>

          {/* Lifecycle Dates Box */}
          <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-brand-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Position Lifecycle Dates
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-300 mb-1">
                  Opened Date *
                </label>
                <input
                  type="date"
                  required
                  value={openDate}
                  onChange={(e) => setOpenDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>

              {requirementStatus === 'ON_HOLD' ? (
                <div>
                  <label className="block text-[10px] font-bold text-amber-300 mb-1">
                    On-Hold Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={holdDate}
                    onChange={(e) => setHoldDate(e.target.value)}
                    className="w-full bg-slate-800 border border-amber-500/50 rounded-xl px-3 py-1.5 text-xs text-amber-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              ) : requirementStatus === 'CLOSED' ? (
                <div>
                  <label className="block text-[10px] font-bold text-rose-300 mb-1">
                    Closed Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={closedDate}
                    onChange={(e) => setClosedDate(e.target.value)}
                    className="w-full bg-slate-800 border border-rose-500/50 rounded-xl px-3 py-1.5 text-xs text-rose-200 focus:outline-none focus:border-rose-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">
                    Target Close Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={targetClosingDate}
                    onChange={(e) => setTargetClosingDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
                  />
                </div>
              )}

              {requirementStatus !== 'OPEN' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">
                    Target Close Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={targetClosingDate}
                    onChange={(e) => setTargetClosingDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Required Technical Skills (Comma separated)
            </label>
            <input
              type="text"
              required
              value={skillsStr}
              onChange={(e) => setSkillsStr(e.target.value)}
              placeholder="e.g. React, TypeScript, FastAPI, PostgreSQL, Docker"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Min Exp (Years)
              </label>
              <input
                type="number"
                step="0.5"
                value={expMin}
                onChange={(e) => setExpMin(parseFloat(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Salary Min ($ USD)
              </label>
              <input
                type="number"
                value={salaryMin}
                onChange={(e) => setSalaryMin(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Salary Max ($ USD)
              </label>
              <input
                type="number"
                min="0"
                value={salaryMax}
                onChange={(e) => setSalaryMax(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Openings Count
              </label>
              <input
                type="number"
                min="1"
                value={openings}
                onChange={(e) => setOpenings(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Job Description
            </label>
            <textarea
              rows={3}
              value={jobDesc}
              onChange={(e) => setJobDesc(e.target.value)}
              placeholder="Core responsibilities, project scope, team background..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Attach Job Description (PDF, TXT, DOC, DOCX)
            </label>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 border border-slate-700 hover:border-brand-500 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors">
                <Upload className="w-4 h-4" />
                Choose File
                <input
                  type="file"
                  accept=".pdf,.txt,.doc,.docx,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (file && file.size > 15 * 1024 * 1024) {
                      showToast('error', 'File Too Large', 'Job description must be 15 MB or smaller');
                      e.target.value = '';
                      return;
                    }
                    setJobDescFile(file);
                  }}
                />
              </label>
              {jobDescFile && (
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <FileText className="w-4 h-4 text-brand-400" />
                  <span className="max-w-[240px] truncate">{jobDescFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setJobDescFile(null)}
                    className="text-slate-400 hover:text-white"
                    aria-label="Remove job description attachment"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsAddOpen(false);
                setEditingReq(null);
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-900/40"
            >
              {isSubmitting ? 'Saving...' : editingReq ? 'Save Requirement Changes' : 'Publish Job Requirement'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Requirement Detail Drawer */}
      <Drawer
        isOpen={!!selectedReq}
        onClose={() => setSelectedReq(null)}
        title={selectedReq?.job_title || 'Requirement Detail'}
        subtitle={`Mandate ${selectedReq?.req_code} • Client: ${selectedReq?.client_name}`}
        width="2xl"
      >
        {selectedReq && (
          <div className="space-y-6">
            {/* Top Status & Quick Switch Actions */}
            <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Position Status</span>
                  <div className="mt-1 flex items-center gap-2">
                    <StatusBadge status={selectedReq.status} />
                    <PriorityBadge priority={selectedReq.priority} />
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Positions Filled</span>
                  <p className="text-xl font-black text-brand-400 font-mono">
                    {selectedReq.filled_count} / {selectedReq.openings_count}
                  </p>
                </div>
              </div>

              {/* 3 Quick Status Action Buttons */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Quick Set:</span>
                <button
                  onClick={() => handleQuickStatusChange(selectedReq.id, 'OPEN')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                    selectedReq.status === 'OPEN'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  <PlayCircle className="w-3 h-3" />
                  Open
                </button>
                <button
                  onClick={() => handleQuickStatusChange(selectedReq.id, 'ON_HOLD')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                    selectedReq.status === 'ON_HOLD'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  <PauseCircle className="w-3 h-3" />
                  Hold
                </button>
                <button
                  onClick={() => handleQuickStatusChange(selectedReq.id, 'CLOSED')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                    selectedReq.status === 'CLOSED'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  <XCircle className="w-3 h-3" />
                  Close
                </button>
              </div>
            </div>

            {/* Position Lifecycle Dates Timeline Card */}
            <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-brand-400" />
                Position Lifecycle Dates & Milestones
              </span>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800">
                  <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Position Opened Date
                  </span>
                  <p className="font-bold text-slate-100 mt-1 font-mono text-sm">
                    {formatDateDisplay(selectedReq.open_date) || 'N/A'}
                  </p>
                </div>

                <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800">
                  <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                    <Calendar className="w-3 h-3 text-brand-400" />
                    Target Close Date
                  </span>
                  <p className="font-bold text-slate-100 mt-1 font-mono text-sm">
                    {formatDateDisplay(selectedReq.target_closing_date) || 'Not specified'}
                  </p>
                </div>

                <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800">
                  <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    On-Hold Date
                  </span>
                  <p className="font-bold text-slate-100 mt-1 font-mono text-sm">
                    {formatDateDisplay(selectedReq.hold_date) || (selectedReq.status === 'ON_HOLD' ? formatDateDisplay(selectedReq.status_updated_at) : 'N/A')}
                  </p>
                </div>

                <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800">
                  <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    Closed Date
                  </span>
                  <p className="font-bold text-slate-100 mt-1 font-mono text-sm">
                    {formatDateDisplay(selectedReq.closed_date) || (selectedReq.status === 'CLOSED' ? formatDateDisplay(selectedReq.status_updated_at) : 'N/A')}
                  </p>
                </div>
              </div>
            </div>

            {/* Compensation & Work Mode */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-400">Offered Salary Range</span>
                <p className="font-bold text-slate-100 mt-1 font-mono">
                  ${selectedReq.salary_min?.toLocaleString()} - ${selectedReq.salary_max?.toLocaleString()} {selectedReq.salary_currency}
                </p>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-400">Experience Range</span>
                <p className="font-bold text-slate-100 mt-1">
                  {selectedReq.experience_min} - {selectedReq.experience_max} Years
                </p>
              </div>
            </div>

            {/* Required Skills */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Mandatory Skills & Technologies
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedReq.required_skills.map((sk) => (
                  <span
                    key={sk}
                    className="px-3 py-1 bg-brand-950/60 text-brand-300 border border-brand-800/60 rounded-lg text-xs font-medium"
                  >
                    {sk}
                  </span>
                ))}
              </div>
            </div>

            {/* Job Description */}
            {selectedReq.job_description && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Job Description & Scope
                </h4>
                <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {selectedReq.job_description}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};
