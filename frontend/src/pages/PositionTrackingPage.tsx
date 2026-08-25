import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { JobRequirement, PositionStatus } from '../types';
import {
  Layers, Search, Filter, Download, Upload,
  CheckCircle2, AlertCircle, XCircle, Briefcase, Building2,
  RefreshCw, Radio, Send, FileText, Check, AlertTriangle, ArrowRight
} from 'lucide-react';

interface PositionTrackingPageProps {
  onNavigateToCampaigns?: (candidateIds: string[], requirementId?: string) => void;
}

export const PositionTrackingPage: React.FC<PositionTrackingPageProps> = ({
  onNavigateToCampaigns
}) => {
  const { token } = useAuth();
  const [requirements, setRequirements] = useState<JobRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState<string>('all');

  // Status Change Modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedReq, setSelectedReq] = useState<JobRequirement | null>(null);
  const [newPositionStatus, setNewPositionStatus] = useState<PositionStatus>('OPEN');
  const [statusRemarks, setStatusRemarks] = useState('');

  // JD Upload File ref
  const jdInputRef = useRef<HTMLInputElement>(null);
  const [uploadingReqId, setUploadingReqId] = useState<string | null>(null);

  const fetchRequirements = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (posFilter && posFilter !== 'all') params.append('position_status', posFilter);

      const res = await fetch(`/api/v1/requirements?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRequirements(data);
      }
    } catch (err) {
      console.error('Failed to fetch positions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequirements();
  }, [search, posFilter]);

  const handleUpdatePositionStatus = async () => {
    if (!selectedReq) return;

    try {
      const res = await fetch(`/api/v1/requirements/${selectedReq.id}/position-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          position_status: newPositionStatus,
          remarks: statusRemarks || `Position status updated to ${newPositionStatus}`
        })
      });

      if (res.ok) {
        setShowStatusModal(false);
        fetchRequirements();
      }
    } catch (err) {
      console.error('Position status update error:', err);
    }
  };

  const handleJDUpload = async (reqId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingReqId(reqId);
      const data = new FormData();
      data.append('file', file);

      const res = await fetch(`/api/v1/requirements/${reqId}/jd/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: data
      });

      if (res.ok) {
        fetchRequirements();
      } else {
        const err = await res.json();
        alert(err.detail || 'Failed to upload JD.');
      }
    } catch (err) {
      console.error('JD upload error:', err);
    } finally {
      setUploadingReqId(null);
    }
  };

  const handleDownloadJD = (reqId: string, filename?: string) => {
    const url = `/api/v1/requirements/${reqId}/jd/download`;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'Job_Description.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const openCount = requirements.filter(r => r.position_status === 'OPEN').length;
  const onHoldCount = requirements.filter(r => r.position_status === 'ON_HOLD').length;
  const closedCount = requirements.filter(r => r.position_status === 'CLOSED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <Layers className="w-7 h-7 text-brand-400" />
            Position Status & Requirement Tracking
          </h1>
          <p className="text-sm text-slate-400">
            Lifecycle monitoring for open, on-hold, and closed hiring requisitions with JD document management.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-emerald-400">Open Positions</p>
            <p className="text-2xl font-extrabold text-white mt-1">{openCount}</p>
          </div>
          <CheckCircle2 className="w-8 h-8 text-emerald-400/50" />
        </div>

        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-amber-400">On Hold Positions</p>
            <p className="text-2xl font-extrabold text-white mt-1">{onHoldCount}</p>
          </div>
          <AlertCircle className="w-8 h-8 text-amber-400/50" />
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">Closed Positions</p>
            <p className="text-2xl font-extrabold text-white mt-1">{closedCount}</p>
          </div>
          <XCircle className="w-8 h-8 text-slate-600" />
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search positions by code, title, client, department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>

        <select
          value={posFilter}
          onChange={(e) => setPosFilter(e.target.value)}
          className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-brand-500 w-full sm:w-auto"
        >
          <option value="all">All Position Statuses</option>
          <option value="OPEN">Open Only</option>
          <option value="ON_HOLD">On Hold Only</option>
          <option value="CLOSED">Closed Only</option>
        </select>
      </div>

      {/* Positions Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Position / Code</th>
                <th className="py-3.5 px-4">Client Organization</th>
                <th className="py-3.5 px-4">Position Status</th>
                <th className="py-3.5 px-4">Openings</th>
                <th className="py-3.5 px-4">Job Description (JD)</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-400" />
                    Loading positions...
                  </td>
                </tr>
              ) : requirements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <Layers className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No positions found.
                  </td>
                </tr>
              ) : (
                requirements.map((req) => {
                  const isClosed = req.position_status === 'CLOSED';
                  const isOnHold = req.position_status === 'ON_HOLD';

                  return (
                    <tr key={req.id} className="hover:bg-slate-800/40 transition">
                      {/* Code & Title */}
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-bold text-white text-sm">{req.job_title}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{req.req_code}</p>
                        </div>
                      </td>

                      {/* Client */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-200">
                          <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{req.client_name || 'Enterprise Client'}</span>
                        </div>
                      </td>

                      {/* Position Status Badge */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          req.position_status === 'OPEN' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' :
                          req.position_status === 'ON_HOLD' ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' :
                          'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {req.position_status === 'OPEN' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                          {req.position_status === 'ON_HOLD' && <AlertCircle className="w-3 h-3 text-amber-400" />}
                          {req.position_status === 'CLOSED' && <XCircle className="w-3 h-3 text-slate-500" />}
                          {req.position_status}
                        </span>
                      </td>

                      {/* Openings */}
                      <td className="py-3.5 px-4">
                        <span className="text-white font-semibold">{req.filled_count} / {req.openings_count} Filled</span>
                      </td>

                      {/* JD File Attachment */}
                      <td className="py-3.5 px-4">
                        {req.jd_attachment_name ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDownloadJD(req.id, req.jd_attachment_name || undefined)}
                              className="flex items-center gap-1.5 text-brand-300 hover:text-brand-200 text-xs font-semibold underline"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span className="truncate max-w-[130px]">{req.jd_attachment_name}</span>
                            </button>
                          </div>
                        ) : (
                          <div>
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx"
                              className="hidden"
                              id={`jd-upload-${req.id}`}
                              onChange={(e) => handleJDUpload(req.id, e)}
                            />
                            <label
                              htmlFor={`jd-upload-${req.id}`}
                              className="cursor-pointer text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                            >
                              <Upload className="w-3 h-3" />
                              <span>Attach JD</span>
                            </label>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedReq(req);
                              setNewPositionStatus(req.position_status);
                              setStatusRemarks('');
                              setShowStatusModal(true);
                            }}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-lg border border-slate-700 transition"
                          >
                            Update Status
                          </button>

                          {/* 1-Click WhatsApp Campaign creation */}
                          <button
                            onClick={() => onNavigateToCampaigns && onNavigateToCampaigns([], req.id)}
                            disabled={isClosed}
                            title={isClosed ? 'Cannot launch outreach on a closed position' : 'Create WhatsApp Campaign'}
                            className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white rounded-lg text-xs font-bold transition shadow"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Outreach</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Position Status Change */}
      {showStatusModal && selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">
              Change Position Status — {selectedReq.job_title}
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Position Status</label>
              <select
                value={newPositionStatus}
                onChange={(e) => setNewPositionStatus(e.target.value as PositionStatus)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
              >
                <option value="OPEN">OPEN (Actively Sourcing & Interviewing)</option>
                <option value="ON_HOLD">ON_HOLD (Hiring Temporarily Paused)</option>
                <option value="CLOSED">CLOSED (Position Filled or Cancelled)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Status Change Remarks *</label>
              <textarea
                rows={3}
                placeholder="Document the reason for opening, putting on-hold, or closing this position..."
                value={statusRemarks}
                onChange={(e) => setStatusRemarks(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdatePositionStatus}
                className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-lg shadow"
              >
                Save Position Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
