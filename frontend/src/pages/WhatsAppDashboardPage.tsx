import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { WhatsAppDashboardSummary } from '../types';
import {
  MessageSquare, Radio, Send, CheckCircle2,
  Clock, AlertCircle, Ban, TrendingUp, RefreshCw,
  Users, Eye, ArrowUpRight, BarChart2, ShieldCheck
} from 'lucide-react';

interface WhatsAppDashboardPageProps {
  onNavigateToCampaigns?: () => void;
  onNavigateToConversations?: () => void;
}

export const WhatsAppDashboardPage: React.FC<WhatsAppDashboardPageProps> = ({
  onNavigateToCampaigns,
  onNavigateToConversations
}) => {
  const { token } = useAuth();
  const [data, setData] = useState<WhatsAppDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOutreachDashboard = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/v1/whatsapp/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch WhatsApp dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutreachDashboard();
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-400" />
        Loading WhatsApp Outreach Analytics...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-20 text-center text-slate-500">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-400" />
        Failed to load WhatsApp dashboard data.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Quick Launch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <MessageSquare className="w-7 h-7 text-emerald-400" />
            WhatsApp Candidate Outreach Dashboard
          </h1>
          <p className="text-sm text-slate-400">
            Real-time campaign delivery metrics, response intelligence, compliance rates, and talent engagement insights.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchOutreachDashboard}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={onNavigateToCampaigns}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-500/20 transition"
          >
            <Radio className="w-4 h-4" />
            <span>Launch Outreach Campaign</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3.5">
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Campaigns</p>
          <p className="text-xl font-extrabold text-white">{data.total_campaigns}</p>
          <span className="text-[10px] text-emerald-400 font-semibold">{data.active_campaigns} active</span>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Messages Sent</p>
          <p className="text-xl font-extrabold text-white">{data.messages_sent}</p>
          <span className="text-[10px] text-slate-400 font-medium">{data.total_recipients} evaluated</span>
        </div>

        <div className="p-4 bg-slate-900/80 border border-emerald-500/20 rounded-xl space-y-1 bg-emerald-500/5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Delivery Rate</p>
          <p className="text-xl font-extrabold text-emerald-300">{data.delivery_rate_percent}%</p>
          <span className="text-[10px] text-emerald-400/80 font-medium">{data.messages_delivered} delivered</span>
        </div>

        <div className="p-4 bg-slate-900/80 border border-sky-500/20 rounded-xl space-y-1 bg-sky-500/5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-sky-400">Read Rate</p>
          <p className="text-xl font-extrabold text-sky-300">{data.read_rate_percent}%</p>
          <span className="text-[10px] text-sky-400/80 font-medium">{data.messages_read} opened</span>
        </div>

        <div className="p-4 bg-slate-900/80 border border-indigo-500/20 rounded-xl space-y-1 bg-indigo-500/5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Candidate Replies</p>
          <p className="text-xl font-extrabold text-indigo-300">{data.messages_replied}</p>
          <span className="text-[10px] text-indigo-400/80 font-medium">{data.response_rate_percent}% reply rate</span>
        </div>

        <div className="p-4 bg-slate-900/80 border border-rose-500/20 rounded-xl space-y-1 bg-rose-500/5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Opted Out</p>
          <p className="text-xl font-extrabold text-rose-300">{data.opted_out_count}</p>
          <span className="text-[10px] text-rose-400/80 font-medium">Auto-suppressed</span>
        </div>

        <div className="p-4 bg-slate-900/80 border border-amber-500/20 rounded-xl space-y-1 bg-amber-500/5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Failed / Invalid</p>
          <p className="text-xl font-extrabold text-amber-300">{data.messages_failed + data.invalid_numbers_count}</p>
          <span className="text-[10px] text-amber-400/80 font-medium">Delivery issues</span>
        </div>
      </div>

      {/* Main Visuals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Candidate Response Categorization */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Candidate Intent & Response Categories
            </h3>
          </div>

          <div className="space-y-2.5 text-xs">
            {Object.entries(data.response_categories || {}).length === 0 ? (
              <p className="text-slate-500 py-6 text-center">No categorized responses yet.</p>
            ) : (
              Object.entries(data.response_categories || {}).map(([cat, count]: [string, any]) => {
                const numCount = Number(count) || 0;
                const isPositive = ['INTERESTED', 'AVAILABLE_FOR_INTERVIEW', 'CALL_ME'].includes(cat);
                const isNegative = ['NOT_INTERESTED', 'OPT_OUT'].includes(cat);

                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-300 capitalize">{cat.replace(/_/g, ' ').toLowerCase()}</span>
                      <span className="font-bold text-white">{numCount}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isPositive ? 'bg-emerald-500' : isNegative ? 'bg-rose-500' : 'bg-brand-500'
                        }`}
                        style={{ width: `${Math.min(100, (numCount / Math.max(1, data.messages_replied)) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Delivery Status Breakdown */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-brand-400" />
            Message Status Breakdown
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-slate-400 block mb-1">Delivered</span>
              <span className="text-lg font-bold text-emerald-400">{data.messages_delivered}</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-slate-400 block mb-1">Read (Opened)</span>
              <span className="text-lg font-bold text-sky-400">{data.messages_read}</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-slate-400 block mb-1">Candidate Replied</span>
              <span className="text-lg font-bold text-indigo-400">{data.messages_replied}</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-slate-400 block mb-1">Failed / Undelivered</span>
              <span className="text-lg font-bold text-rose-400">{data.messages_failed}</span>
            </div>
          </div>

          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <p className="text-[11px] text-emerald-300">
              Automated compliance filter active: 100% of messages checked against consent records and suppression list.
            </p>
          </div>
        </div>

        {/* Quick Action Navigation */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              WhatsApp Quick Actions
            </h3>
            <p className="text-xs text-slate-400 mt-1">Jump directly into conversations or manage outreach campaigns.</p>
          </div>

          <div className="space-y-2.5">
            <button
              onClick={onNavigateToConversations}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-white font-bold transition"
            >
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>Open Two-Way Chat Inbox</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={onNavigateToCampaigns}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-white font-bold transition"
            >
              <div className="flex items-center gap-2.5">
                <Radio className="w-4 h-4 text-brand-400" />
                <span>Manage Outreach Campaigns</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
            Tip: Candidates replying with <strong className="text-white">"STOP"</strong> or <strong className="text-white">"UNSUBSCRIBE"</strong> are automatically added to the suppression list.
          </div>
        </div>
      </div>
    </div>
  );
};
