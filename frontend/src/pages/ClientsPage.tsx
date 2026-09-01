import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Client, Role } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { StatusBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Drawer } from '../components/common/Drawer';
import {
  Building2, Plus, Search, MapPin, Mail, Phone, User,
  Briefcase, Send, ExternalLink, Calendar, CheckCircle2, RefreshCw,
  Edit2, Power, AlertTriangle, ShieldCheck, Check, X, ChevronDown, CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';

export const ClientsPage: React.FC = () => {
  const { hasRole } = useAuth();
  const { showToast } = useNotifications();

  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [updatingClientId, setUpdatingClientId] = useState<string | null>(null);

  // Add Client Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIndustry, setNewIndustry] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newContactPerson, setNewContactPerson] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newStatus, setNewStatus] = useState<'ACTIVE' | 'INACTIVE' | 'ON_HOLD'>('ACTIVE');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Client Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editName, setEditName] = useState('');
  const [editIndustry, setEditIndustry] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editContactPerson, setEditContactPerson] = useState('');
  const [editContactEmail, setEditContactEmail] = useState('');
  const [editContactPhone, setEditContactPhone] = useState('');
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'INACTIVE' | 'ON_HOLD'>('ACTIVE');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const res = await api.get(`/clients?${params.toString()}`);
      setClients(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [search, statusFilter]);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/clients', {
        name: newName,
        industry: newIndustry,
        location: newLocation,
        contact_person: newContactPerson,
        contact_email: newContactEmail,
        contact_phone: newContactPhone,
        status: newStatus,
      });
      showToast('success', 'Client Created', `Successfully added client organization ${newName}`);
      setIsAddOpen(false);
      setNewName('');
      setNewIndustry('');
      setNewLocation('');
      setNewContactPerson('');
      setNewContactEmail('');
      setNewContactPhone('');
      setNewStatus('ACTIVE');
      fetchClients();
    } catch (err: any) {
      showToast('error', 'Error Creating Client', err.response?.data?.detail || 'Could not create client');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (client: Client, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingClient(client);
    setEditName(client.name);
    setEditIndustry(client.industry || '');
    setEditLocation(client.location || '');
    setEditContactPerson(client.contact_person || '');
    setEditContactEmail(client.contact_email || '');
    setEditContactPhone(client.contact_phone || '');
    setEditStatus((client.status as any) || 'ACTIVE');
    setIsEditOpen(true);
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;

    setIsUpdating(true);
    try {
      const res = await api.put(`/clients/${editingClient.id}`, {
        name: editName,
        industry: editIndustry,
        location: editLocation,
        contact_person: editContactPerson,
        contact_email: editContactEmail,
        contact_phone: editContactPhone,
        status: editStatus,
      });

      showToast('success', 'Client Updated', `Updated client ${editName} (Status: ${editStatus})`);
      setIsEditOpen(false);
      
      // Update local state
      setClients((prev) =>
        prev.map((c) => (c.id === editingClient.id ? { ...c, ...res.data } : c))
      );
      if (selectedClient && selectedClient.id === editingClient.id) {
        setSelectedClient((prev) => (prev ? { ...prev, ...res.data } : null));
      }
    } catch (err: any) {
      showToast('error', 'Update Failed', err.response?.data?.detail || 'Could not update client');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleQuickStatusChange = async (clientId: string, clientName: string, newStat: 'ACTIVE' | 'INACTIVE' | 'ON_HOLD', e?: React.ChangeEvent<HTMLSelectElement> | React.MouseEvent) => {
    if (e) e.stopPropagation();
    setUpdatingClientId(clientId);

    try {
      const res = await api.put(`/clients/${clientId}`, {
        status: newStat,
      });

      setClients((prev) =>
        prev.map((c) => (c.id === clientId ? { ...c, status: newStat } : c))
      );

      if (selectedClient && selectedClient.id === clientId) {
        setSelectedClient((prev) => (prev ? { ...prev, status: newStat } : null));
      }

      showToast(
        'success',
        'Status Changed',
        `${clientName} is now marked as ${newStat === 'ACTIVE' ? 'Active' : newStat === 'INACTIVE' ? 'Inactive' : 'On Hold'}`
      );
    } catch (err: any) {
      showToast('error', 'Status Update Failed', err.response?.data?.detail || 'Could not update status');
    } finally {
      setUpdatingClientId(null);
    }
  };

  const handleOpenClientDetail = async (clientId: string) => {
    try {
      const res = await api.get(`/clients/${clientId}`);
      setSelectedClient(res.data);
    } catch (err: any) {
      showToast('error', 'Error', 'Could not load client details');
    }
  };

  const canManage = hasRole(['SUPER_ADMIN', 'ADMIN', 'RECRUITER']);

  const activeCount = clients.filter((c) => c.status === 'ACTIVE').length;
  const inactiveCount = clients.filter((c) => c.status === 'INACTIVE').length;
  const totalOpenJobs = clients.reduce((sum, c) => sum + (c.open_requirements_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-brand-400" />
            Client Accounts & Organizations
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage enterprise hiring clients, account managers, and open requirement portfolios.
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-900/40 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Add New Client
          </button>
        )}
      </div>

      {/* Quick Stat Counter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Total Clients</span>
          <p className="text-xl font-black text-slate-100 font-mono mt-0.5">{clients.length}</p>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-emerald-400 text-[10px] uppercase font-bold tracking-wider">Active Clients</span>
          <p className="text-xl font-black text-emerald-400 font-mono mt-0.5">{activeCount}</p>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-rose-400 text-[10px] uppercase font-bold tracking-wider">Inactive Clients</span>
          <p className="text-xl font-black text-rose-400 font-mono mt-0.5">{inactiveCount}</p>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-brand-400 text-[10px] uppercase font-bold tracking-wider">Total Open Jobs</span>
          <p className="text-xl font-black text-brand-400 font-mono mt-0.5">{totalOpenJobs}</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-md">
        <div className="flex-1 w-full relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by client name, code, or industry..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="w-full sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ON_HOLD">On Hold</option>
          </select>
        </div>
      </div>

      {/* Client Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Client Code</th>
                <th className="px-5 py-3.5">Company Name</th>
                <th className="px-5 py-3.5">Industry</th>
                <th className="px-5 py-3.5">Location</th>
                <th className="px-5 py-3.5">Contact Person</th>
                <th className="px-5 py-3.5 text-center">Open Jobs</th>
                <th className="px-5 py-3.5 text-center">Submissions</th>
                <th className="px-5 py-3.5">Status (Click to Change)</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-400">
                    <RefreshCw className="w-6 h-6 text-brand-500 animate-spin mx-auto mb-2" />
                    Loading clients...
                  </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-400">
                    No clients found matching filter.
                  </td>
                </tr>
              ) : (
                clients.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-800/50 transition-colors group cursor-pointer"
                    onClick={() => handleOpenClientDetail(c.id)}
                  >
                    <td className="px-5 py-3.5 font-mono text-slate-400 font-bold">{c.client_code}</td>
                    <td className="px-5 py-3.5 font-bold text-slate-100 group-hover:text-brand-300 transition-colors">
                      {c.name}
                    </td>
                    <td className="px-5 py-3.5 text-slate-300">{c.industry || '—'}</td>
                    <td className="px-5 py-3.5 text-slate-300">{c.location || '—'}</td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-200">{c.contact_person || '—'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{c.contact_email}</div>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="font-bold text-brand-400 px-2 py-0.5 bg-brand-950/80 rounded-full border border-brand-800/60">
                        {c.open_requirements_count}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center font-mono text-slate-300">
                      {c.total_submissions_count}
                    </td>

                    {/* Status Column with Interactive Dropdown/Toggle */}
                    <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                      {canManage ? (
                        <div className="relative inline-block">
                          <select
                            value={c.status}
                            disabled={updatingClientId === c.id}
                            onChange={(e) =>
                              handleQuickStatusChange(
                                c.id,
                                c.name,
                                e.target.value as 'ACTIVE' | 'INACTIVE' | 'ON_HOLD',
                                e
                              )
                            }
                            className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer focus:outline-none appearance-none pr-6 ${
                              c.status === 'ACTIVE'
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80 hover:bg-emerald-900/60'
                                : c.status === 'INACTIVE'
                                ? 'bg-rose-950/80 text-rose-300 border-rose-700/80 hover:bg-rose-900/60'
                                : 'bg-amber-950/80 text-amber-300 border-amber-700/80 hover:bg-amber-900/60'
                            }`}
                          >
                            <option value="ACTIVE" className="bg-slate-900 text-emerald-300">
                              ● ACTIVE
                            </option>
                            <option value="INACTIVE" className="bg-slate-900 text-rose-300">
                              ✕ INACTIVE
                            </option>
                            <option value="ON_HOLD" className="bg-slate-900 text-amber-300">
                              ⏸ ON HOLD
                            </option>
                          </select>
                          <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      ) : (
                        <StatusBadge status={c.status} />
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {canManage && (
                          <button
                            onClick={(e) => handleOpenEdit(c, e)}
                            title="Edit Client & Status"
                            className="p-1.5 bg-slate-800 hover:bg-brand-600 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-all border border-slate-700"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenClientDetail(c.id);
                          }}
                          className="px-3 py-1 bg-slate-800 hover:bg-brand-600 text-slate-300 hover:text-white rounded-lg text-[11px] font-semibold transition-all border border-slate-700"
                        >
                          View Profile
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

      {/* Add Client Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add New Enterprise Client"
        subtitle="Create an organization profile, set status, and primary hiring contact."
      >
        <form onSubmit={handleCreateClient} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Company Name *
            </label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Acme Cloud Corp"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Industry Domain
              </label>
              <input
                type="text"
                value={newIndustry}
                onChange={(e) => setNewIndustry(e.target.value)}
                placeholder="e.g. FinTech / SaaS"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Headquarters Location
              </label>
              <input
                type="text"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="e.g. San Francisco, CA"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Client Account Status
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as any)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-brand-500"
            >
              <option value="ACTIVE">Active (Can receive submissions & create requirements)</option>
              <option value="INACTIVE">Inactive (Suspended account)</option>
              <option value="ON_HOLD">On Hold (Temporarily paused)</option>
            </select>
          </div>

          <div className="pt-2 border-t border-slate-800">
            <h5 className="font-bold text-slate-300 mb-2">Primary Contact Details</h5>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Contact Full Name</label>
                <input
                  type="text"
                  value={newContactPerson}
                  onChange={(e) => setNewContactPerson(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Work Email</label>
                  <input
                    type="email"
                    value={newContactEmail}
                    onChange={(e) => setNewContactEmail(e.target.value)}
                    placeholder="jane@company.com"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl shadow-lg shadow-brand-900/40"
            >
              {isSubmitting ? 'Creating...' : 'Create Client'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Client Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit Client: ${editingClient?.name || ''}`}
        subtitle="Modify organization details, contact information, and active/inactive status."
      >
        <form onSubmit={handleUpdateClient} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Company Name *
            </label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Industry Domain
              </label>
              <input
                type="text"
                value={editIndustry}
                onChange={(e) => setEditIndustry(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Location
              </label>
              <input
                type="text"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Status Selection */}
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
            <label className="block font-bold uppercase tracking-wider text-slate-300">
              Client Status Setting
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setEditStatus('ACTIVE')}
                className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all border ${
                  editStatus === 'ACTIVE'
                    ? 'bg-emerald-950 border-emerald-600 text-emerald-300 shadow-md shadow-emerald-950'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                Active
              </button>

              <button
                type="button"
                onClick={() => setEditStatus('INACTIVE')}
                className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all border ${
                  editStatus === 'INACTIVE'
                    ? 'bg-rose-950 border-rose-600 text-rose-300 shadow-md shadow-rose-950'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <X className="w-3.5 h-3.5 text-rose-400" />
                Inactive
              </button>

              <button
                type="button"
                onClick={() => setEditStatus('ON_HOLD')}
                className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all border ${
                  editStatus === 'ON_HOLD'
                    ? 'bg-amber-950 border-amber-600 text-amber-300 shadow-md shadow-amber-950'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                On Hold
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800">
            <h5 className="font-bold text-slate-300 mb-2">Primary Contact Details</h5>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Contact Person</label>
                <input
                  type="text"
                  value={editContactPerson}
                  onChange={(e) => setEditContactPerson(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={editContactEmail}
                    onChange={(e) => setEditContactEmail(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={editContactPhone}
                    onChange={(e) => setEditContactPhone(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdating}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl shadow-lg shadow-brand-900/40"
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Client Detail Drawer */}
      <Drawer
        isOpen={!!selectedClient}
        onClose={() => setSelectedClient(null)}
        title={selectedClient?.name || 'Client Details'}
        subtitle={`Client Code: ${selectedClient?.client_code} • ${selectedClient?.industry || 'General'}`}
        width="2xl"
      >
        {selectedClient && (
          <div className="space-y-6">
            {/* Status Switcher Banner inside Drawer */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Account Status</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <StatusBadge status={selectedClient.status} />
                  <span className="text-xs text-slate-300 font-medium">
                    {selectedClient.status === 'ACTIVE'
                      ? 'Active Client Account'
                      : selectedClient.status === 'INACTIVE'
                      ? 'Inactive / Suspended Account'
                      : 'On Hold'}
                  </span>
                </div>
              </div>

              {canManage && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      handleQuickStatusChange(
                        selectedClient.id,
                        selectedClient.name,
                        selectedClient.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
                      )
                    }
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                      selectedClient.status === 'ACTIVE'
                        ? 'bg-rose-950/80 hover:bg-rose-900/80 text-rose-300 border-rose-800'
                        : 'bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 border-emerald-800'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    {selectedClient.status === 'ACTIVE' ? 'Set Inactive' : 'Set Active'}
                  </button>

                  <button
                    onClick={() => handleOpenEdit(selectedClient)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-all flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                </div>
              )}
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400">Open Requirements</span>
                <p className="text-xl font-black text-brand-400 mt-1">{selectedClient.open_requirements_count || 0}</p>
              </div>
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Submissions</span>
                <p className="text-xl font-black text-purple-400 mt-1">{selectedClient.total_submissions_count || 0}</p>
              </div>
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400">Hires Made</span>
                <p className="text-xl font-black text-emerald-400 mt-1">{selectedClient.hired_count ?? 0}</p>
              </div>
            </div>

            {/* Organization Info */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
              <h4 className="font-bold text-slate-200 mb-2">Company Information</h4>
              <div className="flex items-center gap-2 text-slate-300">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>{selectedClient.location || 'Headquarters Location Unspecified'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <User className="w-4 h-4 text-slate-400" />
                <span>Primary Contact: <strong>{selectedClient.contact_person || 'N/A'}</strong> ({selectedClient.contact_email || 'No email'})</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Phone className="w-4 h-4 text-slate-400" />
                <span>Phone: {selectedClient.contact_phone || 'N/A'}</span>
              </div>
            </div>

            {/* Contacts Table */}
            {selectedClient.contacts && selectedClient.contacts.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Registered Client Contacts
                </h4>
                <div className="space-y-2">
                  {selectedClient.contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100">{contact.name}</span>
                          {contact.is_primary && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-brand-500/20 text-brand-300 border border-brand-500/40 rounded">
                              PRIMARY
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{contact.designation || 'Stakeholder'}</p>
                      </div>
                      <div className="text-right font-mono text-[11px] text-slate-400">
                        <p>{contact.email}</p>
                        <p>{contact.phone}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};

