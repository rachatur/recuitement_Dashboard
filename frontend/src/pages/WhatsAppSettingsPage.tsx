import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { WhatsAppIntegrationSettings } from '../types';
import {
  Settings, CheckCircle2, AlertCircle, RefreshCw,
  ShieldCheck, Smartphone, Zap, Server
} from 'lucide-react';

export const WhatsAppSettingsPage: React.FC = () => {
  const { token } = useAuth();
  const [settings, setSettings] = useState<WhatsAppIntegrationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Test Connection
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/whatsapp/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error('Failed to fetch WhatsApp settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      setIsSaving(true);
      const res = await fetch('/api/v1/whatsapp/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });

      if (res.ok) {
        const updated = await res.json();
        setSettings(updated);
        alert('WhatsApp Integration settings saved successfully.');
      }
    } catch (err) {
      console.error('Save settings error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);
      const res = await fetch('/api/v1/whatsapp/test-connection', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      console.error('Test connection error:', err);
    } finally {
      setIsTesting(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="py-20 text-center text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-400" />
        Loading WhatsApp Configuration...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <Settings className="w-7 h-7 text-emerald-400" />
            WhatsApp Business Integration Settings
          </h1>
          <p className="text-sm text-slate-400">
            Configure Meta Cloud API, Twilio, or high-fidelity enterprise mock simulator for candidate messaging.
          </p>
        </div>

        <button
          onClick={handleTestConnection}
          disabled={isTesting}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-lg transition"
        >
          {isTesting ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Pinging Gateway...</span>
            </>
          ) : (
            <>
              <Zap className="w-3.5 h-3.5" />
              <span>Test Connection</span>
            </>
          )}
        </button>
      </div>

      {/* Test Connection Output Alert */}
      {testResult && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 ${
          testResult.success
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          {testResult.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="text-xs space-y-1">
            <p className="font-bold text-sm">{testResult.message}</p>
            <p className="text-[11px] opacity-80">
              Provider: <strong className="text-white">{testResult.provider}</strong> • Latency: <strong className="text-white">{testResult.latency_ms}ms</strong> • Status: <strong className="text-white">{testResult.status}</strong>
            </p>
          </div>
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSaveSettings} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-2">
            Gateway Provider & Account Credentials
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Integration Provider *</label>
              <select
                value={settings.provider}
                onChange={(e) => setSettings({ ...settings, provider: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-emerald-300 font-bold"
              >
                <option value="MOCK_SIMULATOR">MOCK_SIMULATOR (Interactive Simulator - Instant Delivery)</option>
                <option value="OFFICIAL_CLOUD_API">OFFICIAL_CLOUD_API (Meta WhatsApp Cloud API v19.0)</option>
                <option value="TWILIO">TWILIO (Twilio Programmable Messaging API)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">WhatsApp Business Account ID (WABA ID)</label>
              <input
                type="text"
                value={settings.business_account_id}
                onChange={(e) => setSettings({ ...settings, business_account_id: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Phone Number ID</label>
              <input
                type="text"
                value={settings.phone_number_id}
                onChange={(e) => setSettings({ ...settings, phone_number_id: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Default Country Code</label>
              <input
                type="text"
                value={settings.default_country_code}
                onChange={(e) => setSettings({ ...settings, default_country_code: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
              />
            </div>
          </div>
        </div>

        {/* Rate Limiting & Business Hours */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-2">
            Outreach Rate Limits & Business Hours
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Daily Outreach Limit (Messages)</label>
              <input
                type="number"
                value={settings.message_limit_per_day}
                onChange={(e) => setSettings({ ...settings, message_limit_per_day: parseInt(e.target.value) || 1000 })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Dispatch Rate (Msg / Sec)</label>
              <input
                type="number"
                value={settings.rate_limit_per_second}
                onChange={(e) => setSettings({ ...settings, rate_limit_per_second: parseInt(e.target.value) || 20 })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Auto Retry Limit</label>
              <input
                type="number"
                value={settings.retry_policy_max_retries}
                onChange={(e) => setSettings({ ...settings, retry_policy_max_retries: parseInt(e.target.value) || 3 })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Business Hours Start</label>
              <input
                type="text"
                value={settings.business_hours_start}
                onChange={(e) => setSettings({ ...settings, business_hours_start: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Business Hours End</label>
              <input
                type="text"
                value={settings.business_hours_end}
                onChange={(e) => setSettings({ ...settings, business_hours_end: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
              />
            </div>
          </div>
        </div>

        {/* Webhooks Info */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-2">
            Incoming Webhook Configuration
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Webhook Callback URL</label>
              <input
                type="text"
                readOnly
                value={settings.webhook_url}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-400 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Webhook Verify Token</label>
              <input
                type="text"
                readOnly
                value={settings.webhook_verify_token}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-400 font-mono"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-800">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-lg transition"
          >
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
};
