import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { WhatsAppOptOut } from '../types';
import {
  Ban, Plus, Search, Trash2, ShieldCheck,
  RefreshCw, CheckCircle2, AlertCircle, Phone
} from 'lucide-react';

export const WhatsAppOptOutsPage: React.FC = () => {
  const { token } = useAuth();
  const [optOuts, setOptOuts] = useState<WhatsAppOptOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add Opt-Out Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState('Manual opt-out recorded by recruiter');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchOptOuts = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/v1/whatsapp/opt-outs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOptOuts(data);
      }
    } catch (err) {
      console.error('Failed to fetch opt-outs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptOuts();
  }, []);

  const handleAddOptOut = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await apiFetch('/api/v1/whatsapp/opt-outs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          whatsapp_number: phone,
          opt_out_source: 'MANUAL_ADMIN',
          reason: reason
        })
      });

      if (res.ok) {
        setShowAddModal(false);
        setPhone('');
        fetchOptOuts();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveOptOut = async (optOutId: string) => {
    try {
      const res = await fetch(`/api/v1/whatsapp/opt-outs/${optOutId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchOptOuts();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = optOuts.filter(o =>
    o.whatsapp_number.includes(search) ||
    (o.candidate_name && o.candidate_name.toLowerCase().includes(search.toLowerCase())) ||
    o.reason.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <Ban className="w-7 h-7 text-rose-400" />
            WhatsApp Opt-Out & Suppression List
          </h1>
          <p className="text-sm text-slate-400">
            Compliance suppression registry. Numbers in this list are automatically blocked from proactive outreach.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow-lg transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Number to Suppression List</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by phone number, candidate name, reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 text-[11px]">
              <tr>
                <th className="py-3.5 px-4">WhatsApp Number</th>
                <th className="py-3.5 px-4">Associated Candidate</th>
                <th className="py-3.5 px-4">Suppression Source</th>
                <th className="py-3.5 px-4">Reason</th>
                <th className="py-3.5 px-4">Recorded Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-400" />
                    Loading suppression registry...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-emerald-400/40" />
                    No opt-out numbers found.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-rose-300">
                      {item.whatsapp_number}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {item.candidate_name || 'Independent Number'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                        {item.opt_out_source}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {item.reason}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleRemoveOptOut(item.id)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition"
                        title="Remove from suppression list"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add to Suppression */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Ban className="w-5 h-5 text-rose-400" />
              Add Number to Suppression Registry
            </h3>

            <form onSubmit={handleAddOptOut} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">WhatsApp Mobile Number *</label>
                <input
                  type="text"
                  required
                  placeholder="+91 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Reason for Opt-Out *</label>
                <textarea
                  rows={3}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow"
                >
                  Add to Suppression
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
