'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import type { ConversationSummary, ChatMessage } from '@/types/message';
import {
  MessageSquare,
  Search,
  Send,
  Building2,
  Calendar,
  Check,
  CheckCheck,
  Sparkles,
  Info,
  Clock,
  ShieldCheck,
  User,
} from 'lucide-react';

function formatMessageTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export default function HostMessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversation, setActiveConversation] = useState<ConversationSummary | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch threads
  const fetchThreads = async () => {
    try {
      const data = await apiFetch<{ conversations: ConversationSummary[] }>('/messages/threads');
      const list = data.conversations || [];
      setConversations(list);
      if (list.length > 0 && !activeConversation) {
        setActiveConversation(list[0]);
      }
    } catch {
      // Offline or empty
    } finally {
      setLoadingThreads(false);
    }
  };

  useEffect(() => {
    fetchThreads();
    const interval = setInterval(fetchThreads, 15000);
    return () => clearInterval(interval);
  }, []);

  // Fetch messages for active thread
  useEffect(() => {
    if (!activeConversation) return;

    setLoadingMessages(true);
    apiFetch<{ messages: ChatMessage[] }>(`/messages/thread/${activeConversation.id}`)
      .then((data) => {
        setMessages(data.messages || []);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load messages');
      })
      .finally(() => {
        setLoadingMessages(false);
      });
  }, [activeConversation?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const content = draft.trim();
    if (!content || sending || !activeConversation) return;

    setSending(true);
    try {
      const sent = await apiFetch<ChatMessage>('/messages/send', {
        method: 'POST',
        body: JSON.stringify({
          conversationId: activeConversation.id,
          content,
        }),
      });

      setMessages((prev) => [...prev, sent]);
      setDraft('');

      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send message';
      setError(msg);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const filteredConversations = conversations.filter((c) => {
    if (unreadOnly && c.unreadCount === 0) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchName = c.counterparty?.name?.toLowerCase().includes(q);
    const matchProp = c.property?.title?.toLowerCase().includes(q);
    return matchName || matchProp;
  });

  const quickReplies = [
    'Yes, the property is fully available for those dates!',
    'Check-in starts at 2:00 PM. We can arrange early luggage drop-off.',
    'Standby generator and high-speed fiber internet are verified and active.',
    'Would you like an in-person viewing of the property beforehand?',
  ];

  return (
    <div className="space-y-6 font-body">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E0D5]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[#234B36] text-white shadow-xs">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-headline text-[#252923]">
              Host Messages & Inquiries
            </h1>
            <p className="text-xs text-[#73776F]">
              Direct communication with guests, viewing requests, and reservation logistics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#EEF3EF] text-[#234B36] border border-[#234B36]/20">
            <ShieldCheck size={14} /> Protected In-Platform Chat
          </span>
        </div>
      </div>

      {/* Main Messaging Container */}
      <div className="bg-white rounded-3xl border border-[#E5E0D5] shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[620px]">
        {/* Left Column: Conversations List (4 cols) */}
        <div className="md:col-span-4 border-r border-[#E5E0D5] flex flex-col bg-[#FAF8F2]">
          {/* Search & Filter */}
          <div className="p-4 border-b border-[#E5E0D5] bg-white space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-[#73776F] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search guest name or property..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FAF8F2] border border-[#E5E0D5] text-xs text-[#252923] placeholder-[#73776F] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setUnreadOnly(!unreadOnly)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                  unreadOnly
                    ? 'bg-[#234B36] text-white'
                    : 'bg-[#FAF8F2] text-[#73776F] hover:bg-[#EEF3EF] hover:text-[#252923]'
                }`}
              >
                Unread Only
              </button>
            </div>
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#E5E0D5]/50">
            {loadingThreads ? (
              <div className="p-8 text-center text-xs text-[#73776F]">Loading conversations...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <p className="text-xs font-bold text-[#252923]">No messages found</p>
                <p className="text-[11px] text-[#73776F]">
                  When guests inquire about your listings or request viewings, they will appear here.
                </p>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = activeConversation?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setActiveConversation(c)}
                    className={`p-4 transition cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? 'bg-white border-l-4 border-[#234B36] shadow-xs'
                        : 'hover:bg-white/60'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-[#234B36]/10 text-[#234B36] flex items-center justify-center font-bold text-sm shrink-0">
                      {c.counterparty?.name?.charAt(0) || 'G'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#252923] truncate">
                          {c.counterparty?.name || 'Guest'}
                        </span>
                        <span className="text-[10px] text-[#73776F]">
                          {formatRelativeTime(c.lastMessageAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#234B36] font-medium truncate mt-0.5">
                        {c.property?.title || 'Listing inquiry'}
                      </p>
                      <p className="text-[11px] text-[#73776F] truncate mt-0.5">
                        {c.lastMessageText || 'Conversation started'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Thread & Composer (8 cols) */}
        <div className="md:col-span-8 flex flex-col bg-white">
          {activeConversation ? (
            <>
              {/* Thread Header */}
              <div className="px-6 py-4 border-b border-[#E5E0D5] flex items-center justify-between bg-[#FAF8F2]/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#234B36] text-white flex items-center justify-center font-bold text-sm">
                    {activeConversation.counterparty?.name?.charAt(0) || 'G'}
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#252923]">
                      {activeConversation.counterparty?.name || 'Guest'}
                    </h2>
                    <p className="text-[11px] text-[#73776F] flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-[#234B36]" />
                      <span>{activeConversation.property?.title || 'ENGIDA Stay'}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Verified Guest
                  </span>
                </div>
              </div>

              {/* Messages Feed */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-[#FAF8F2]/30">
                {loadingMessages ? (
                  <div className="text-center py-10 text-xs text-[#73776F]">Loading thread...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 space-y-2">
                    <p className="text-xs font-bold text-[#252923]">Start of conversation</p>
                    <p className="text-[11px] text-[#73776F]">
                      Reply to this inquiry to discuss availability, pricing, or viewing dates.
                    </p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.senderId === user?.id;
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                            isMe
                              ? 'bg-[#234B36] text-white rounded-br-xs shadow-xs'
                              : 'bg-white border border-[#E5E0D5] text-[#252923] rounded-bl-xs shadow-2xs'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{m.content}</p>
                        </div>
                        <span className="text-[10px] text-[#73776F] mt-1 px-1">
                          {formatMessageTime(m.createdAt)}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Replies */}
              <div className="px-6 py-2 border-t border-[#E5E0D5]/60 bg-white flex items-center gap-2 overflow-x-auto">
                <span className="text-[10px] uppercase font-bold text-[#73776F] shrink-0">Quick Reply:</span>
                {quickReplies.map((qr, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setDraft(qr)}
                    className="px-2.5 py-1 rounded-full bg-[#FAF8F2] hover:bg-[#EEF3EF] border border-[#E5E0D5] text-[10px] text-[#252923] shrink-0 transition cursor-pointer"
                  >
                    {qr}
                  </button>
                ))}
              </div>

              {/* Message Composer */}
              <div className="p-4 border-t border-[#E5E0D5] bg-white">
                <form onSubmit={handleSend} className="flex items-end gap-2">
                  <textarea
                    ref={textareaRef}
                    rows={2}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message as host... (Press Enter to send)"
                    className="flex-1 p-3 rounded-2xl bg-[#FAF8F2] border border-[#E5E0D5] text-xs text-[#252923] placeholder-[#73776F] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 resize-none"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || sending}
                    className="p-3.5 rounded-2xl bg-[#234B36] hover:bg-[#1a3828] disabled:opacity-50 text-white transition cursor-pointer shadow-xs active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#73776F]">
              <MessageSquare className="w-12 h-12 text-[#234B36]/30 mb-3" />
              <p className="text-sm font-bold text-[#252923]">Select a conversation to reply</p>
              <p className="text-xs text-[#73776F] mt-1">
                Your direct guest chat history will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
