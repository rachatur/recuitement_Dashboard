import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { AuditLog } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { RoleBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import {
  ShieldAlert, Search, Filter, Clock, User,
  FileCode2, Shield, RefreshCw, Eye
} from 'lucide-react';
import { format } from 'date-fns';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (entityFilter) params.append('entity', entityFilter);
      if (actionFilter) params.append('action', actionFilter);
      params.append('limit', '150');

      const res = await api.get(`/audit-logs?${params.toString()}`);
      setLogs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [search, entityFilter, actionFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-purple-400" />
            Global Immutable Audit Trail Explorer
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable regulatory audit records capturing every entity change, user action, IP address, and JSON diff.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Audit Trail
        </button>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-md">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search action, user email, entity ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500"
          />
        </div>

        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
        >
          <option value="">All Entities</option>
          <option value="USER">USER</option>
          <option value="CLIENT">CLIENT</option>
          <option value="JOB_REQUIREMENT">JOB_REQUIREMENT</option>
          <option value="CANDIDATE">CANDIDATE</option>
          <option value="CANDIDATE_DOCUMENT">CANDIDATE_DOCUMENT</option>
          <option value="CV_SUBMISSION">CV_SUBMISSION</option>
          <option value="INTERVIEW">INTERVIEW</option>
          <option value="INTERVIEW_FEEDBACK">INTERVIEW_FEEDBACK</option>
          <option value="OFFER">OFFER</option>
          <option value="JOINING_DETAIL">JOINING_DETAIL</option>
        </select>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
        >
          <option value="">All Actions</option>
          <option value="USER_CREATED">USER_CREATED</option>
          <option value="USER_LOGIN">USER_LOGIN</option>
          <option value="CLIENT_CREATED">CLIENT_CREATED</option>
          <option value="REQUIREMENT_CREATED">REQUIREMENT_CREATED</option>
          <option value="CANDIDATE_CREATED">CANDIDATE_CREATED</option>
          <option value="CV_UPLOADED">CV_UPLOADED</option>
          <option value="CV_SUBMITTED">CV_SUBMITTED</option>
          <option value="STATUS_CHANGED">STATUS_CHANGED</option>
          <option value="INTERVIEW_SCHEDULED">INTERVIEW_SCHEDULED</option>
          <option value="OFFER_RELEASED">OFFER_RELEASED</option>
          <option value="CANDIDATE_JOINED">CANDIDATE_JOINED</option>
        </select>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Timestamp (UTC)</th>
                <th className="px-5 py-3.5">Action Event</th>
                <th className="px-5 py-3.5">Entity</th>
                <th className="px-5 py-3.5">User & Role</th>
                <th className="px-5 py-3.5">Client IP</th>
                <th className="px-5 py-3.5 text-right">JSON Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400 font-sans">
                    <RefreshCw className="w-6 h-6 text-purple-400 animate-spin mx-auto mb-2" />
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400 font-sans">
                    No audit records matching query.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-5 py-3.5 text-slate-400 font-mono text-[11px]">
                      {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-bold text-slate-100 font-sans px-2 py-0.5 bg-slate-800 rounded border border-slate-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-300 font-sans">
                      <span className="font-semibold text-brand-300">{log.entity}</span>
                      {log.entity_id && (
                        <span className="block text-[10px] text-slate-500 font-mono truncate max-w-[120px]">
                          ID: {log.entity_id}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-sans">
                      <div className="text-slate-200 font-medium text-xs">{log.user_email || 'SYSTEM'}</div>
                      <div className="mt-0.5">
                        <RoleBadge role={log.user_role || 'SUPER_ADMIN'} />
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 text-[11px] font-mono">{log.ip_address}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-purple-600 text-slate-300 hover:text-white rounded-lg text-[11px] font-sans font-semibold border border-slate-700 transition-colors inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Inspect Diff
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON Diff Inspector Modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={`Audit Event: ${selectedLog?.action}`}
        subtitle={`Logged at ${selectedLog ? format(new Date(selectedLog.created_at), 'yyyy-MM-dd HH:mm:ss') : ''} • IP: ${selectedLog?.ip_address}`}
        maxWidth="2xl"
      >
        {selectedLog && (
          <div className="space-y-4 text-xs font-mono">
            <div className="grid grid-cols-2 gap-3 text-slate-300 font-sans">
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400">Target Entity</span>
                <p className="font-bold text-slate-100 mt-1">{selectedLog.entity} (ID: {selectedLog.entity_id || 'N/A'})</p>
              </div>
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400">Actor Identity</span>
                <p className="font-bold text-slate-100 mt-1">{selectedLog.user_email} ({selectedLog.user_role})</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Old State */}
              <div>
                <h5 className="font-sans font-bold text-slate-300 mb-1.5 flex items-center gap-1 text-xs">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Previous State (Old Value)
                </h5>
                <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-rose-300 overflow-x-auto max-h-64 whitespace-pre-wrap">
                  {selectedLog.old_value
                    ? JSON.stringify(selectedLog.old_value, null, 2)
                    : '// No prior state recorded'}
                </pre>
              </div>

              {/* New State */}
              <div>
                <h5 className="font-sans font-bold text-slate-300 mb-1.5 flex items-center gap-1 text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Updated State (New Value)
                </h5>
                <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-emerald-300 overflow-x-auto max-h-64 whitespace-pre-wrap">
                  {selectedLog.new_value
                    ? JSON.stringify(selectedLog.new_value, null, 2)
                    : '// No state delta recorded'}
                </pre>
              </div>
            </div>

            <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 text-[11px] text-slate-400 font-sans">
              <strong>User Agent:</strong> {selectedLog.user_agent}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
