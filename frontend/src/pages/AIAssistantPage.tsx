import React, { useState, useEffect, useRef } from 'react';
import api from '../api/client';
import { Candidate, JobRequirement, AIAssistantMessage, AIAssistantCategory } from '../types';
import { useNotifications } from '../contexts/NotificationContext';
import {
  Bot, Send, Sparkles, User, Search, MessageSquare, FileText,
  CalendarCheck, BarChart3, RefreshCw, Trash2, Copy, Check,
  Briefcase, Users, ArrowRight, Zap, Code, ShieldCheck, ChevronRight,
  Download, Plus
} from 'lucide-react';
import { format } from 'date-fns';

interface AIAssistantPageProps {
  initialPrompt?: string;
  initialCandidateId?: string;
  initialRequirementId?: string;
}

export const AIAssistantPage: React.FC<AIAssistantPageProps> = ({
  initialPrompt,
  initialCandidateId,
  initialRequirementId,
}) => {
  const { showToast } = useNotifications();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<AIAssistantMessage[]>([]);
  const [input, setInput] = useState(initialPrompt || '');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  // Context Selection
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [requirements, setRequirements] = useState<JobRequirement[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(initialCandidateId || '');
  const [selectedRequirementId, setSelectedRequirementId] = useState<string>(initialRequirementId || '');
  const [selectedMode, setSelectedMode] = useState<string>('general');

  // Starter Categories
  const [categories, setCategories] = useState<AIAssistantCategory[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [candRes, reqRes, promptsRes] = await Promise.all([
        api.get('/candidates?limit=50'),
        api.get('/requirements?status=OPEN'),
        api.get('/ai-assistant/quick-prompts'),
      ]);
      setCandidates(candRes.data);
      setRequirements(reqRes.data);
      setCategories(promptsRes.data);

      // Add default welcome message
      if (messages.length === 0) {
        setMessages([
          {
            id: 'welcome-1',
            role: 'assistant',
            content: `### 👋 Hello! I am your RecruitFlow AI Copilot.

I am connected to your live talent database, active job requirements, and candidate bench pool.

**Here is what I can do for you:**
- **🔍 Talent Search:** Ask me to *"Find Python developers with 3+ years experience"* or *"Show candidates on Bench"*.
- **📱 Outreach Generator:** Say *"Draft a high-converting WhatsApp message for an immediate joiner"*.
- **📄 Job Description Creator:** Request *"Write a JD for a Lead Cloud DevOps Engineer"*.
- **🎯 Interview Scorecards:** Ask *"Generate 5 technical interview questions for React & TypeScript"*.
- **📊 Pipeline Analytics:** Ask *"Give me a recruitment pipeline summary"*.

Select a quick starter prompt below or type your custom request to begin!`,
            timestamp: new Date().toISOString(),
            suggested_prompts: [
              'Find Python & FastAPI developers with 3+ years experience',
              'Show all candidates currently on Bench Pool',
              'Give me a recruitment pipeline summary',
              'Write a JD for Senior Cloud DevOps Engineer'
            ]
          }
        ]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || input).trim();
    if (!prompt || isLoading) return;

    const userMessage: AIAssistantMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await api.post('/ai-assistant/chat', {
        message: prompt,
        candidate_id: selectedCandidateId || undefined,
        requirement_id: selectedRequirementId || undefined,
        mode: selectedMode,
        conversation_history: messages.slice(-6).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      const assistantMessage: AIAssistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: res.data.reply,
        intent: res.data.intent,
        suggested_prompts: res.data.suggested_prompts || [],
        data: res.data.data,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      showToast('error', 'AI Assistant Error', err.response?.data?.detail || 'Could not process query');
      const errorMessage: AIAssistantMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: '⚠️ *I encountered an issue retrieving that data. Please verify your connection or try rephrasing your query.*',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    showToast('success', 'Copied to Clipboard', 'Message text copied.');
    setTimeout(() => setCopiedMessageId(null), 2500);
  };

  const handleClearHistory = () => {
    setMessages([]);
    fetchInitialData();
    showToast('info', 'Chat Cleared', 'Conversation history reset.');
  };

  const handleExportTranscript = () => {
    if (messages.length === 0) return;
    const text = messages
      .map((m) => `[${m.role.toUpperCase()} - ${format(new Date(m.timestamp), 'yyyy-MM-dd HH:mm')}]\n${m.content}\n\n`)
      .join('---\n\n');
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RecruitFlow_AI_Transcript_${format(new Date(), 'yyyyMMdd_HHmm')}.md`;
    a.click();
    showToast('success', 'Transcript Exported', 'Downloaded markdown transcript.');
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Talent Sourcing':
        return <Search className="w-4 h-4 text-emerald-400" />;
      case 'Candidate Outreach':
        return <MessageSquare className="w-4 h-4 text-sky-400" />;
      case 'Job Descriptions':
        return <FileText className="w-4 h-4 text-purple-400" />;
      case 'Interview Preparation':
        return <CalendarCheck className="w-4 h-4 text-amber-400" />;
      default:
        return <BarChart3 className="w-4 h-4 text-brand-400" />;
    }
  };

  const renderFormattedMarkdown = (content: string) => {
    // Basic rich formatting for tables, headers, and code blocks
    return (
      <div className="space-y-2 text-xs leading-relaxed break-words text-slate-200">
        {content.split('\n\n').map((block, idx) => {
          if (block.startsWith('```')) {
            const code = block.replace(/```[a-z]*\n?|```/g, '');
            return (
              <div key={idx} className="my-2 bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 relative group">
                <button
                  onClick={() => handleCopyMessage(`code-${idx}`, code)}
                  className="absolute right-2.5 top-2.5 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1 border border-slate-700"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
                <pre className="overflow-x-auto whitespace-pre-wrap">{code}</pre>
              </div>
            );
          }
          if (block.startsWith('### ')) {
            return (
              <h3 key={idx} className="text-sm font-black text-slate-100 mt-2 mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                {block.replace('### ', '')}
              </h3>
            );
          }
          if (block.startsWith('#### ')) {
            return (
              <h4 key={idx} className="text-xs font-bold text-slate-200 mt-1.5 mb-0.5">
                {block.replace('#### ', '')}
              </h4>
            );
          }
          if (block.startsWith('|')) {
            return (
              <div key={idx} className="overflow-x-auto my-2">
                <table className="w-full text-left text-[11px] border border-slate-800 rounded-lg overflow-hidden">
                  <tbody>
                    {block.split('\n').map((row, rIdx) => {
                      const cells = row.split('|').filter((c) => c.trim().length > 0);
                      if (cells.length === 0 || row.includes('---')) return null;
                      return (
                        <tr key={rIdx} className={rIdx === 0 ? 'bg-slate-950 font-bold text-slate-200 border-b border-slate-800' : 'border-b border-slate-800/60 hover:bg-slate-800/40'}>
                          {cells.map((cell, cIdx) => (
                            <td key={cIdx} className="px-3 py-1.5 text-slate-300">
                              {cell.trim().replace(/\*\*(.*?)\*\*/g, '$1')}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          }
          if (block.startsWith('- ')) {
            return (
              <ul key={idx} className="space-y-1 my-1 pl-4 list-disc marker:text-brand-400">
                {block.split('\n').map((item, iIdx) => (
                  <li key={iIdx} className="text-slate-300 text-xs">
                    <span dangerouslySetInnerHTML={{
                      __html: item.replace(/^- /, '')
                        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-100 font-bold">$1</strong>')
                        .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-slate-800 rounded text-brand-300 font-mono text-[10px]">$1</code>')
                    }} />
                  </li>
                ))}
              </ul>
            );
          }

          return (
            <p
              key={idx}
              className="text-slate-300"
              dangerouslySetInnerHTML={{
                __html: block
                  .replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-100 font-bold">$1</strong>')
                  .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-brand-300 font-mono text-[11px]">$1</code>')
                  .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-brand-400 underline font-semibold hover:text-brand-300">$1</a>')
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white shadow-lg shadow-brand-900/40">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
                RecruitFlow AI Assistant & Copilot
                <span className="text-[10px] font-bold px-2 py-0.5 bg-gradient-to-r from-emerald-500/20 to-brand-500/20 border border-emerald-500/40 text-emerald-300 rounded-full flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  Live Platform Sync
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                AI talent search, personalized outreach generator, job descriptions, interview scorecards & hiring intelligence.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportTranscript}
            disabled={messages.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Export Chat
          </button>
          <button
            onClick={handleClearHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-300 rounded-xl text-xs font-semibold border border-slate-700 transition-all shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </div>

      {/* Context Attachment & Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-md space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
            <Zap className="w-3.5 h-3.5 text-brand-400" />
            Optional Context Attachments:
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 max-w-2xl">
            {/* Candidate Context Selector */}
            <div className="relative">
              <Users className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={selectedCandidateId}
                onChange={(e) => setSelectedCandidateId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              >
                <option value="">Attach Candidate (Optional Context)</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name} ({c.current_designation || 'Engineer'} - {c.total_experience || 0} yrs)
                  </option>
                ))}
              </select>
            </div>

            {/* Requirement Context Selector */}
            <div className="relative">
              <Briefcase className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={selectedRequirementId}
                onChange={(e) => setSelectedRequirementId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              >
                <option value="">Attach Job Requirement (Optional Context)</option>
                {requirements.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.job_title} ({r.req_code} - {r.client_name || 'Client'})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Feed */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl flex flex-col h-[600px] overflow-hidden">
        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 text-xs ${
                m.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {m.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-brand-900/40">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-2xl p-4 transition-all relative group ${
                  m.role === 'user'
                    ? 'bg-brand-600 text-white rounded-br-none shadow-md shadow-brand-900/30'
                    : 'bg-slate-950/80 border border-slate-800/80 text-slate-200 rounded-bl-none shadow-md'
                }`}
              >
                <div className="flex items-center justify-between gap-4 mb-2 pb-1 border-b border-white/10">
                  <span className="font-bold text-[10px] uppercase tracking-wider text-slate-300">
                    {m.role === 'user' ? 'You (Recruiter)' : 'RecruitFlow AI'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-slate-400 font-mono">
                      {format(new Date(m.timestamp), 'HH:mm')}
                    </span>
                    <button
                      onClick={() => handleCopyMessage(m.id, m.content)}
                      title="Copy response"
                      className="p-1 text-slate-400 hover:text-white rounded transition-colors"
                    >
                      {copiedMessageId === m.id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>

                {m.role === 'user' ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                ) : (
                  <div>{renderFormattedMarkdown(m.content)}</div>
                )}

                {/* Suggested Follow-up Prompt Chips */}
                {m.suggested_prompts && m.suggested_prompts.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-brand-400" />
                      Suggested Follow-Ups:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {m.suggested_prompts.map((s, sIdx) => (
                        <button
                          key={sIdx}
                          onClick={() => handleSendMessage(s)}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-brand-600/30 text-brand-300 hover:text-brand-200 border border-brand-800/50 hover:border-brand-500 rounded-lg text-[11px] font-medium transition-all text-left flex items-center gap-1"
                        >
                          <ChevronRight className="w-3 h-3 text-brand-400 shrink-0" />
                          <span>{s}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {m.role === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 text-xs justify-start">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shrink-0 animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl rounded-bl-none flex items-center gap-2 text-slate-300">
                <RefreshCw className="w-4 h-4 text-brand-400 animate-spin" />
                <span>Thinking & querying talent intelligence...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything (e.g. 'Find React engineers with 4+ yrs exp', 'Draft WhatsApp message for candidate', 'Give pipeline summary')..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500 shadow-inner"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-5 py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-900/40 transition-all flex items-center gap-2 shrink-0"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>

      {/* Starter Prompts Categories Accordion / Grid */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-400" />
          Quick Intelligence Prompts by Recruiting Workflow
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {categories.map((cat, idx) => (
            <div key={idx} className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2.5 shadow-md">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-200">
                {getCategoryIcon(cat.category)}
                <span>{cat.category}</span>
              </div>
              <div className="space-y-1.5">
                {cat.prompts.slice(0, 2).map((p, pIdx) => (
                  <button
                    key={pIdx}
                    onClick={() => handleSendMessage(p)}
                    className="w-full text-left p-2 bg-slate-950/80 hover:bg-brand-600/20 text-slate-300 hover:text-brand-300 rounded-lg text-[11px] border border-slate-800 transition-all block"
                  >
                    "{p}"
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
