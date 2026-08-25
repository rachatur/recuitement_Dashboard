import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import {
  WhatsAppConversation, WhatsAppMessage, WhatsAppResponseCategory
} from '../types';
import {
  MessagesSquare, Search, Send, CheckCheck, Check,
  Clock, AlertCircle, Ban, RefreshCw, User, Sparkles,
  Phone, Calendar, FileText, Lock, MessageSquare, Play
} from 'lucide-react';

export const WhatsAppConversationsPage: React.FC = () => {
  const { token } = useAuth();
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<WhatsAppConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Active Chat Message Input
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Recruiter Side Notes & Controls
  const [internalNotes, setInternalNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<WhatsAppResponseCategory>('INTERESTED');

  // Candidate Reply Simulator Bar
  const [simText, setSimText] = useState('YES, I am interested in exploring this role!');
  const [isSimulating, setIsSimulating] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/v1/whatsapp/conversations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
        if (data.length > 0) {
          if (!selectedConv) {
            setSelectedConv(data[0]);
            setInternalNotes(data[0].internal_notes || '');
            setSelectedCategory(data[0].response_category || 'INTERESTED');
            setFollowUpDate(data[0].follow_up_date ? data[0].follow_up_date.split('T')[0] : '');
          } else {
            const updated = data.find((c: WhatsAppConversation) => c.id === selectedConv.id);
            if (updated) setSelectedConv(updated);
          }
        }
      }
    } catch (err) {
      console.error('Fetch conversations error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConv?.messages]);

  const handleSelectConversation = (conv: WhatsAppConversation) => {
    setSelectedConv(conv);
    setInternalNotes(conv.internal_notes || '');
    setSelectedCategory(conv.response_category || 'INTERESTED');
    setFollowUpDate(conv.follow_up_date ? conv.follow_up_date.split('T')[0] : '');
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConv || !replyText.trim()) return;

    try {
      setIsSending(true);
      const res = await fetch(`/api/v1/whatsapp/conversations/${selectedConv.id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message_text: replyText })
      });

      if (res.ok) {
        setReplyText('');
        fetchConversations();
      }
    } catch (err) {
      console.error('Send message error:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Recruiter Controls Update (Notes, Category, Follow-up)
  const handleUpdateConversationMeta = async () => {
    if (!selectedConv) return;

    try {
      const res = await fetch(`/api/v1/whatsapp/conversations/${selectedConv.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          response_category: selectedCategory,
          internal_notes: internalNotes,
          follow_up_date: followUpDate ? new Date(followUpDate).toISOString() : null
        })
      });

      if (res.ok) {
        fetchConversations();
      }
    } catch (err) {
      console.error('Update conversation meta error:', err);
    }
  };

  // Simulate Candidate Reply for interactive verification
  const handleSimulateCandidateReply = async () => {
    if (!selectedConv || !simText.trim()) return;

    try {
      setIsSimulating(true);
      const res = await apiFetch('/api/v1/whatsapp/conversations/simulate-reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          candidate_id: selectedConv.candidate_id,
          message_text: simText
        })
      });

      if (res.ok) {
        fetchConversations();
      }
    } catch (err) {
      console.error('Simulator error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const filteredConversations = conversations.filter(c => {
    const matchesSearch = c.candidate_name.toLowerCase().includes(search.toLowerCase()) ||
                          c.whatsapp_number.includes(search);
    const matchesCategory = categoryFilter === 'all' || c.response_category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-4 h-[calc(100vh-6rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <MessagesSquare className="w-6 h-6 text-emerald-400" />
            Two-Way WhatsApp Candidate Conversations
          </h1>
          <p className="text-xs text-slate-400">
            Real-time candidate messaging, intent categorizer, follow-up scheduling, and live testing simulator.
          </p>
        </div>

        <button
          onClick={fetchConversations}
          className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Main Chat Layout */}
      <div className="flex-1 bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex">
        {/* Left Column: Conversation Thread Selector */}
        <div className="w-80 border-r border-slate-800 flex flex-col bg-slate-950/60">
          {/* Search and filter */}
          <div className="p-3 border-b border-slate-800 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search chats..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-[11px] text-slate-300"
            >
              <option value="all">All Intent Categories</option>
              <option value="INTERESTED">Interested</option>
              <option value="AVAILABLE_FOR_INTERVIEW">Available for Interview</option>
              <option value="NEED_MORE_INFORMATION">Need More Info</option>
              <option value="NOT_INTERESTED">Not Interested</option>
              <option value="OPT_OUT">Opted Out</option>
            </select>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 custom-scrollbar">
            {loading ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400" />
                Loading conversations...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No conversations found.
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = selectedConv?.id === conv.id;

                return (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`p-3.5 cursor-pointer transition flex items-start gap-3 ${
                      isSelected ? 'bg-emerald-950/20 border-l-4 border-emerald-400' : 'hover:bg-slate-900/80'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-300 font-bold shrink-0 text-xs">
                      {conv.candidate_name?.[0] || 'C'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-white text-xs truncate">{conv.candidate_name}</p>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {conv.last_message_date ? new Date(conv.last_message_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {conv.last_message_text || 'No messages yet'}
                      </p>

                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          conv.response_category === 'INTERESTED' || conv.response_category === 'AVAILABLE_FOR_INTERVIEW'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : conv.response_category === 'OPT_OUT' || conv.response_category === 'NOT_INTERESTED'
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-slate-800 text-slate-300'
                        }`}>
                          {conv.response_category?.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Center Column: Live Chat Canvas */}
        <div className="flex-1 flex flex-col bg-slate-950/40">
          {selectedConv ? (
            <>
              {/* Chat Canvas Top Bar */}
              <div className="h-14 px-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
                    {selectedConv.candidate_name?.[0] || 'C'}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-xs">{selectedConv.candidate_name}</h3>
                    <p className="text-[10px] text-emerald-400">{selectedConv.whatsapp_number} • {selectedConv.requirement_title || 'General'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                    {selectedConv.status}
                  </span>
                </div>
              </div>

              {/* Chat Message Bubble Stream */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
                {(selectedConv.messages || []).map((msg: WhatsAppMessage) => {
                  const isOutbound = msg.direction === 'OUTBOUND';

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl p-3.5 text-xs shadow-md space-y-1 ${
                          isOutbound
                            ? 'bg-[#005c4b] text-emerald-50 rounded-tr-none border border-emerald-500/30'
                            : 'bg-slate-900 text-slate-200 rounded-tl-none border border-slate-800'
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed font-sans">{msg.content}</p>
                        <div className="flex items-center justify-end gap-1 text-[10px] text-emerald-200/70 pt-0.5">
                          <span>{msg.sent_at ? new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                          {isOutbound && (
                            msg.status === 'READ' ? <CheckCheck className="w-3.5 h-3.5 text-sky-300" /> :
                            msg.status === 'DELIVERED' ? <CheckCheck className="w-3.5 h-3.5 text-slate-300" /> :
                            <Check className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Candidate Reply Simulator Bar */}
              <div className="bg-slate-900/90 border-t border-slate-800 p-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold shrink-0 text-[11px]">
                  <Sparkles className="w-4 h-4" />
                  <span>Reply Simulator:</span>
                </div>

                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={simText}
                    onChange={(e) => setSimText(e.target.value)}
                    placeholder="Candidate simulated reply (e.g. YES, STOP, MORE INFO)..."
                    className="flex-1 px-3 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                  />
                  <button
                    onClick={handleSimulateCandidateReply}
                    disabled={isSimulating}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded text-xs transition shrink-0"
                  >
                    Simulate Reply
                  </button>
                </div>
              </div>

              {/* Outbound Message Input Box */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 bg-slate-900 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type a WhatsApp message to candidate..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-sans"
                />

                <button
                  type="submit"
                  disabled={!replyText.trim() || isSending}
                  className="p-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl transition shadow"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
              Select a conversation from the left to start messaging.
            </div>
          )}
        </div>

        {/* Right Column: Recruiter Notes & Controls Drawer */}
        {selectedConv && (
          <div className="w-72 border-l border-slate-800 p-4 space-y-4 bg-slate-950/60 overflow-y-auto custom-scrollbar text-xs">
            <h3 className="font-bold text-white text-xs uppercase tracking-wider">Recruiter Controls</h3>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Candidate Intent Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as WhatsAppResponseCategory)}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
              >
                <option value="INTERESTED">INTERESTED (Ready for Next Round)</option>
                <option value="AVAILABLE_FOR_INTERVIEW">AVAILABLE_FOR_INTERVIEW</option>
                <option value="NEED_MORE_INFORMATION">NEED_MORE_INFORMATION</option>
                <option value="SALARY_EXPECTATION_MISMATCH">SALARY_MISMATCH</option>
                <option value="LOCATION_UNSUITABLE">LOCATION_UNSUITABLE</option>
                <option value="NOT_INTERESTED">NOT_INTERESTED</option>
                <option value="OPT_OUT">OPT_OUT</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Follow-Up Date Reminder</label>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Internal Recruiter Notes</label>
              <textarea
                rows={4}
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Interview availability notes, candidate salary demands..."
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600"
              />
            </div>

            <button
              onClick={handleUpdateConversationMeta}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow"
            >
              Save Recruiter Notes
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
