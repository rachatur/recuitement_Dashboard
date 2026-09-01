import React, { useState, useEffect, useRef } from 'react';
import api from '../../api/client';
import { AIAssistantMessage } from '../../types';
import {
  Bot, X, Send, Sparkles, RefreshCw, Copy, Check,
  Minimize2, Maximize2, ChevronRight, Zap
} from 'lucide-react';
import { format } from 'date-fns';

export const AIAssistantDrawer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<AIAssistantMessage[]>([
    {
      id: 'drawer-welcome',
      role: 'assistant',
      content: '👋 **Hi! Need quick recruiting help?**\n\nAsk me to find candidates, draft WhatsApp outreach messages, write JDs, or check pipeline stats from anywhere in the app!',
      timestamp: new Date().toISOString(),
      suggested_prompts: [
        'Show candidates on Bench',
        'Find Python developers with 3+ yrs exp',
        'Pipeline summary stats'
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  const handleSend = async (customPrompt?: string) => {
    const prompt = (customPrompt || input).trim();
    if (!prompt || isLoading) return;

    const userMsg: AIAssistantMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await api.post('/ai-assistant/chat', {
        message: prompt,
        mode: 'general',
        conversation_history: messages.slice(-4).map((m) => ({
          role: m.role,
          content: m.content
        }))
      });

      const assistantMsg: AIAssistantMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: res.data.reply,
        intent: res.data.intent,
        suggested_prompts: res.data.suggested_prompts || [],
        timestamp: new Date().toISOString()
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: '⚠️ *Could not process query. Please check your network and try again.*',
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
      {/* Floating Trigger Button (Bottom Right) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 p-3.5 bg-gradient-to-tr from-brand-600 via-indigo-600 to-emerald-500 hover:scale-105 active:scale-95 text-white rounded-2xl shadow-2xl shadow-brand-900/60 transition-all group flex items-center gap-2.5 border border-brand-400/30"
          title="Open AI Recruiting Assistant"
        >
          <div className="relative">
            <Bot className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full" />
          </div>
          <span className="text-xs font-black tracking-wide pr-1 hidden sm:inline">AI Copilot</span>
        </button>
      )}

      {/* Slide-out / Popover Assistant Drawer */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/80 flex flex-col overflow-hidden transition-all duration-200 ${
            isExpanded ? 'w-[680px] h-[750px] max-w-[95vw] max-h-[90vh]' : 'w-[400px] h-[540px] max-w-[95vw] max-h-[85vh]'
          }`}
        >
          {/* Drawer Header */}
          <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                  RecruitFlow AI Assistant
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </h4>
                <p className="text-[10px] text-slate-400">Live Recruiting Copilot</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
                title={isExpanded ? 'Minimize' : 'Maximize'}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 custom-scrollbar text-xs bg-slate-950/40">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-lg bg-brand-600/30 border border-brand-500/40 text-brand-300 flex items-center justify-center shrink-0">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`p-3 rounded-xl max-w-[85%] relative group ${
                    m.role === 'user'
                      ? 'bg-brand-600 text-white rounded-br-none'
                      : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1 opacity-70 text-[9px]">
                    <span>{m.role === 'user' ? 'You' : 'AI'}</span>
                    <button
                      onClick={() => handleCopy(m.id, m.content)}
                      className="hover:text-white"
                      title="Copy"
                    >
                      {copiedId === m.id ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                    </button>
                  </div>

                  <p className="whitespace-pre-wrap leading-relaxed text-[11px]">{m.content}</p>

                  {/* Suggestion Chips */}
                  {m.suggested_prompts && m.suggested_prompts.length > 0 && (
                    <div className="mt-2 pt-1.5 border-t border-slate-800 space-y-1">
                      {m.suggested_prompts.slice(0, 2).map((s, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSend(s)}
                          className="w-full text-left px-2 py-1 bg-slate-950 hover:bg-brand-600/30 text-brand-300 rounded text-[10px] truncate border border-slate-800 flex items-center gap-1"
                        >
                          <ChevronRight className="w-2.5 h-2.5 text-brand-400 shrink-0" />
                          <span className="truncate">{s}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2 items-center text-slate-400 text-[11px]">
                <RefreshCw className="w-3.5 h-3.5 text-brand-400 animate-spin" />
                <span>AI is analyzing...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-slate-950 border-t border-slate-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask AI Copilot..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="p-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl transition-all shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
