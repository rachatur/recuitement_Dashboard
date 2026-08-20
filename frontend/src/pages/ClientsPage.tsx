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
  Briefcase, Send, ExternalLink, Calendar, CheckCircle2, RefreshCw
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

  // Add Client Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIndustry, setNewIndustry] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newContactPerson, setNewContactPerson] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        status: 'ACTIVE',
      });
      showToast('success', 'Client Created', `Successfully added client organization ${newName}`);
      setIsAddOpen(false);
      setNewName('');
      setNewIndustry('');
      setNewLocation('');
      setNewContactPerson('');
      setNewContactEmail('');
      setNewContactPhone('');
      fetchClients();
    } catch (err: any) {
      showToast('error', 'Error Creating Client', err.response?.data?.detail || 'Could not create client');
    } finally {
      setIsSubmitting(false);
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
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-900/40 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add New Client
          </button>
        )}
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
            <option value="ON_HOLD">On Hold</option>
            <option value="INACTIVE">Inactive</option>
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
                <th className="px-5 py-3.5">Status</th>
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
                    <td className="px-5 py-3.5">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenClientDetail(c.id);
                        }}
                        className="px-3 py-1 bg-slate-800 hover:bg-brand-600 text-slate-300 hover:text-white rounded-lg text-[11px] font-semibold transition-all border border-slate-700"
                      >
                        View Profile
                      </button>
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
        subtitle="Create an organization profile and primary hiring contact."
      >
        <form onSubmit={handleCreateClient} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Company Name *
            </label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Acme Cloud Corp"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Industry Domain
              </label>
              <input
                type="text"
                value={newIndustry}
                onChange={(e) => setNewIndustry(e.target.value)}
                placeholder="e.g. FinTech / SaaS"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Headquarters Location
              </label>
              <input
                type="text"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="e.g. San Francisco, CA"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800">
            <h5 className="text-xs font-bold text-slate-300 mb-2">Primary Contact Details</h5>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Contact Full Name</label>
                <input
                  type="text"
                  value={newContactPerson}
                  onChange={(e) => setNewContactPerson(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
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
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            </div>
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
              {isSubmitting ? 'Creating...' : 'Create Client'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Client Detail Drawer */}
      <Drawer
        isOpen={!!selectedClient}
        onClose={() => setSelectedClient(null)}
        title={selectedClient?.name || 'Client Details'}
        subtitle={`Client Code: ${selectedClient?.client_code} • ${selectedClient?.industry}`}
        width="2xl"
      >
        {selectedClient && (
          <div className="space-y-6">
            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400">Open Requirements</span>
                <p className="text-xl font-black text-brand-400 mt-1">{selectedClient.open_requirements_count}</p>
              </div>
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Submissions</span>
                <p className="text-xl font-black text-purple-400 mt-1">{selectedClient.total_submissions_count}</p>
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
                <span>Primary Contact: <strong>{selectedClient.contact_person}</strong> ({selectedClient.contact_email})</span>
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
