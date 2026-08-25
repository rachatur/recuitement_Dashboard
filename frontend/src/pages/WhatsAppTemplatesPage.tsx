import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { WhatsAppTemplate } from '../types';
import {
  FileText, Plus, Search, Filter, CheckCircle2,
  Clock, AlertCircle, RefreshCw, Smartphone, Eye, Sparkles
} from 'lucide-react';

export const WhatsAppTemplatesPage: React.FC = () => {
  const { token } = useAuth();
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);

  // New Template Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [category, setCategory] = useState<'RECRUITMENT_COMMUNICATION' | 'UTILITY' | 'MARKETING'>('RECRUITMENT_COMMUNICATION');
  const [bodyText, setBodyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/whatsapp/templates', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
        if (data.length > 0 && !selectedTemplate) {
          setSelectedTemplate(data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/v1/whatsapp/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          template_name: templateName,
          category: category,
          language: 'en_US',
          header_type: 'NONE',
          body_text: bodyText,
          status: 'APPROVED'
        })
      });

      if (res.ok) {
        setShowAddModal(false);
        setTemplateName('');
        setBodyText('');
        fetchTemplates();
      }
    } catch (err) {
      console.error('Create template error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sampleCandidate = {
    name: 'Priya Sharma',
    role: 'Lead Cloud Architect',
    client: 'Global FinTech Corp',
    recruiter: 'Recruitment Team'
  };

  const renderMockupText = (raw: string) => {
    return raw
      .replace(/{{candidate_name}}/g, sampleCandidate.name)
      .replace(/{{job_title}}/g, sampleCandidate.role)
      .replace(/{{client_name}}/g, sampleCandidate.client)
      .replace(/{{recruiter_name}}/g, sampleCandidate.recruiter)
      .replace(/{{date}}/g, 'Tomorrow at 3:00 PM')
      .replace(/{{link}}/g, 'https://careers.recruitflow.com/portal');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-emerald-400" />
            WhatsApp Message Templates
          </h1>
          <p className="text-sm text-slate-400">
            Approved HSM messaging templates with dynamic candidate personalization variables.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-500/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Template</span>
        </button>
      </div>

      {/* Main Content: Template List & Mobile Mockup Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Template Cards List */}
        <div className="lg:col-span-7 space-y-4">
          {loading ? (
            <div className="py-20 text-center text-slate-500 bg-slate-900/80 rounded-xl border border-slate-800">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-400" />
              Loading templates...
            </div>
          ) : templates.length === 0 ? (
            <div className="py-20 text-center text-slate-500 bg-slate-900/80 rounded-xl border border-slate-800">
              No templates available.
            </div>
          ) : (
            templates.map((tmpl) => {
              const isSelected = selectedTemplate?.id === tmpl.id;

              return (
                <div
                  key={tmpl.id}
                  onClick={() => setSelectedTemplate(tmpl)}
                  className={`p-5 rounded-xl border transition cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 border-emerald-500/50 shadow-lg ring-1 ring-emerald-500/30'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-white text-sm">{tmpl.template_name}</h3>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {tmpl.category.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> {tmpl.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2 mt-3 font-sans">
                    {tmpl.body_text}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-800/80">
                    {(tmpl.variables || []).map((v: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-slate-950 text-emerald-400 text-[10px] font-mono rounded border border-emerald-500/20">
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: WhatsApp Smartphone Mockup Preview */}
        <div className="lg:col-span-5">
          <div className="sticky top-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center">
              <div className="flex items-center gap-2 mb-4">
                <Smartphone className="w-5 h-5 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Live WhatsApp Preview
                </h3>
              </div>

              {/* Smartphone Container */}
              <div className="w-[320px] bg-slate-950 rounded-[36px] border-4 border-slate-700 p-3 shadow-2xl space-y-3">
                {/* Phone Notch Bar */}
                <div className="flex justify-center">
                  <div className="w-24 h-4 bg-slate-800 rounded-full" />
                </div>

                {/* WhatsApp Chat Header */}
                <div className="bg-[#075E54] text-white p-3 rounded-t-2xl flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-xs">
                    RF
                  </div>
                  <div>
                    <p className="font-bold text-xs">RecruitFlow Official</p>
                    <p className="text-[9px] text-emerald-200">Verified Business Account</p>
                  </div>
                </div>

                {/* Chat Bubble Area */}
                <div className="bg-[#ECE5DD]/10 p-3 rounded-b-2xl min-h-[300px] flex flex-col justify-end space-y-2 font-sans">
                  {selectedTemplate ? (
                    <div className="bg-[#054740] text-emerald-50 p-3.5 rounded-2xl rounded-tl-none text-xs shadow-md space-y-2 border border-emerald-500/30">
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {renderMockupText(selectedTemplate.body_text)}
                      </p>
                      <div className="flex justify-end text-[9px] text-emerald-300/70">
                        <span>10:45 AM • Sent</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-xs text-center my-auto">Select a template to preview</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Create Template */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Create WhatsApp Template</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-white font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Template Name (Snake Case) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. initial_interview_invite"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                >
                  <option value="RECRUITMENT_COMMUNICATION">Recruitment Communication</option>
                  <option value="UTILITY">Utility</option>
                  <option value="MARKETING">Marketing</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Message Body (Use {'{{candidate_name}}'}, {'{{job_title}}'}, {'{{client_name}}'}) *
                </label>
                <textarea
                  rows={6}
                  required
                  placeholder="Hi {{candidate_name}}, we came across your impressive background in software architecture..."
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-sans"
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
