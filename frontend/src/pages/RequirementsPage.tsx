import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { JobRequirement, Client, User } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { StatusBadge, PriorityBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Drawer } from '../components/common/Drawer';
import {
  Briefcase, Plus, Search, MapPin, DollarSign, Users,
  Clock, Filter, Layers, ListFilter, Sparkles, RefreshCw,
  CheckCircle2, AlertCircle, Building2, Upload, FileText, X, Pencil
} from 'lucide-react';
import { format } from 'date-fns';

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

  // Add Requirement Modal State
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
  const [requirementStatus, setRequirementStatus] = useState<'OPEN' | 'CLOSED'>('OPEN');
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
      const payload = {
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

      showToast('success', editingReq ? 'Requirement Updated' : 'Requirement Published',
        editingReq ? `Updated job opening for ${jobTitle}` : jobDescFile
          ? `Created job opening for ${jobTitle} with attachment`
          : `Created job opening for ${jobTitle}`);
      setIsAddOpen(false);
      setEditingReq(null);
      setJobTitle('');
      setDepartment('');
      setSalaryMin(0);
      setSalaryMax(0);
      setRequirementStatus('OPEN');
      setJobDesc('');
      setJobDescFile(null);
      fetchRequirements();
    } catch (err: any) {
      showToast('error', 'Creation Failed', err.response?.data?.detail || 'Could not create requirement');
    } finally {
      setIsSubmitting(false);
    }
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
    setRequirementStatus(requirement.status === 'CLOSED' ? 'CLOSED' : 'OPEN');
    setJobDesc(requirement.job_description || '');
    setJobDescFile(null);
    setIsAddOpen(true);
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
            Active client mandates, required technical competencies, salary ranges, and opening status.
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
              onClick={() => setIsAddOpen(true)}
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
                  <th className="px-5 py-3.5">Req Code</th>
                  <th className="px-5 py-3.5">Job Title</th>
                  <th className="px-5 py-3.5">Client</th>
                  <th className="px-5 py-3.5">Location / Mode</th>
                  <th className="px-5 py-3.5">Required Skills</th>
                  <th className="px-5 py-3.5 text-center">Openings</th>
                  <th className="px-5 py-3.5">Priority</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {requirements.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-800/50 transition-colors group cursor-pointer"
                    onClick={() => setSelectedReq(r)}
                  >
                    <td className="px-5 py-3.5 font-mono text-slate-400 font-bold">{r.req_code}</td>
                    <td className="px-5 py-3.5 font-bold text-slate-100 group-hover:text-brand-300 transition-colors">
                      {r.job_title}
                    </td>
                    <td className="px-5 py-3.5 text-slate-300">{r.client_name}</td>
                    <td className="px-5 py-3.5 text-slate-300">
                      <div>{r.location || 'Remote'}</div>
                      <div className="text-[10px] font-mono text-slate-400">{r.work_mode}</div>
                    </td>
                    <td className="px-5 py-3.5">
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
                    <td className="px-5 py-3.5 text-center font-mono">
                      <span className="text-slate-100 font-bold">{r.filled_count}</span>
                      <span className="text-slate-400">/{r.openings_count}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <PriorityBadge priority={r.priority} />
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {requirements.map((r) => (
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

                <div className="flex items-center gap-3 text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800">
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
          ))}
        </div>
      )}

      {/* Post Requirement Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => {
          setIsAddOpen(false);
          setEditingReq(null);
        }}
        title={editingReq ? 'Edit Client Job Requirement' : 'Post New Client Job Requirement'}
        subtitle={editingReq ? 'Update the opening, salary range, and status.' : 'Create an active recruitment mandate with salary targets and required technical skills.'}
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
              Requirement Status
            </label>
            <select
              value={requirementStatus}
              onChange={(e) => setRequirementStatus(e.target.value as 'OPEN' | 'CLOSED')}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
            >
              <option value="OPEN">Open - accepting candidates</option>
              <option value="CLOSED">Closed - stop accepting candidates</option>
            </select>
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
            <div className="flex items-center justify-between p-4 bg-slate-950/80 rounded-xl border border-slate-800">
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
