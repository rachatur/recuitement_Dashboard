import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { HistoryLog } from '../types';
import {
  History, Search, Filter, Download, Calendar,
  User, ShieldCheck, RefreshCw, Clock, ExternalLink
} from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const { token } = useAuth();
  const [logs, setLogs] = useState<HistoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Detail Modal
  const [selectedLog, setSelectedLog] = useState<HistoryLog | null>(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (entityFilter) params.append('entity_type', entityFilter);
      if (actionFilter) params.append('action', actionFilter);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const res = await fetch(`/api/v1/history?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Failed to fetch history audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [search, entityFilter, actionFilter, startDate, endDate]);

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (entityFilter) params.append('entity_type', entityFilter);
    if (actionFilter) params.append('action', actionFilter);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const url = `/api/v1/history/export?${params.toString()}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `RecruitFlow_Audit_History_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <History className="w-7 h-7 text-indigo-400" />
            Date-Wise Activity & Compliance History
          </h1>
          <p className="text-sm text-slate-400">
            Immutable chronological audit trail covering candidates, requirements, bench changes, and WhatsApp campaigns.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-lg transition"
        >
          <Download className="w-4 h-4" />
          <span>Export History to CSV</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by action, user, or remarks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Entity Modules</option>
            <option value="CANDIDATE">Candidate</option>
            <option value="REQUIREMENT">Job Requirement</option>
            <option value="BENCH">Bench Resource</option>
            <option value="WHATSAPP_CAMPAIGN">WhatsApp Campaign</option>
            <option value="WHATSAPP_CONSENT">WhatsApp Consent</option>
            <option value="WHATSAPP_OPT_OUT">WhatsApp Opt-Out</option>
          </select>

          <input
            type="date"
            placeholder="Start Date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
          />

          <input
            type="date"
            placeholder="End Date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
          />
        </div>
      </div>

      {/* History Log Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Entity Type</th>
                <th className="py-3.5 px-4">Performed By</th>
                <th className="py-3.5 px-4">Remarks / Summary</th>
                <th className="py-3.5 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    Loading audit history...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <History className="w-8 h-8 mx-auto mb-2 opacity-30 text-indigo-400" />
                    No activity logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-white font-mono text-[11px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.entity_type.includes('WHATSAPP') ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' :
                        log.entity_type.includes('BENCH') ? 'bg-teal-500/10 text-teal-300 border border-teal-500/20' :
                        'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                      }`}>
                        {log.entity_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {log.user_name || log.user_email || 'System Action'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate">
                      {log.remarks || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Inspect Log Payload */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-400" />
              Audit Entry Inspection — {selectedLog.action}
            </h3>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                <p><span className="text-slate-400">Timestamp:</span> <strong className="text-white">{new Date(selectedLog.created_at).toLocaleString()}</strong></p>
                <p><span className="text-slate-400">User:</span> <strong className="text-white">{selectedLog.user_name} ({selectedLog.user_email})</strong></p>
                <p><span className="text-slate-400">IP Address:</span> <strong className="text-white">{selectedLog.ip_address}</strong></p>
                <p><span className="text-slate-400">Remarks:</span> <strong className="text-white">{selectedLog.remarks}</strong></p>
              </div>

              {selectedLog.new_value && (
                <div>
                  <p className="font-bold text-slate-400 mb-1">State Payload (JSON):</p>
                  <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] font-mono text-indigo-300 overflow-x-auto">
                    {JSON.stringify(selectedLog.new_value, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
