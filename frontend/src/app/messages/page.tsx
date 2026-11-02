'use client';

import React, { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import AppHeader from '@/components/layout/AppHeader';
import AppFooter from '@/components/layout/AppFooter';
import type {
  ConversationSummary,
  ChatMessage,
  ConversationThread,
} from '@/types/message';
import {
  MessageSquare,
  Search,
  Send,
  Building2,
  Calendar,
  Check,
  CheckCheck,
  ArrowLeft,
  Sparkles,
  Info,
  Clock,
  ShieldCheck,
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
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function getInitials(name: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function MessagesContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const conversationIdParam = searchParams.get('conversationId');
  const bookingIdParam = searchParams.get('bookingId');
  const propertyIdParam = searchParams.get('propertyId');

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversation, setActiveConversation] = useState<ConversationSummary | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Fetch conversations list
  const loadConversations = useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiFetch<ConversationSummary[]>('/messages/conversations');
      setConversations(data);
      return data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load conversations';
      console.warn('Could not load conversations:', msg);
      return [];
    } finally {
      setLoadingConversations(false);
    }
  }, [user]);

  // 2. Load specific thread
  const loadThread = useCallback(async (conversationId: string) => {
    setLoadingThread(true);
    setError(null);
    try {
      const data = await apiFetch<ConversationThread>(`/messages/thread/${conversationId}`);
      setActiveConversation(data.conversation);
      setMessages(data.messages);
      setMobileThreadOpen(true);

      // Decrement unread count locally in list
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId ? { ...c, unreadCount: 0 } : c
        )
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load message thread';
      setError(msg);
    } finally {
      setLoadingThread(false);
    }
  }, []);

  // 3. Initial load & routing params resolution
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login?next=/messages');
      return;
    }

    const init = async () => {
      const convs = await loadConversations();

      if (conversationIdParam) {
        await loadThread(conversationIdParam);
      } else if (bookingIdParam) {
        setLoadingThread(true);
        try {
          const data = await apiFetch<ConversationThread>(`/messages/booking/${bookingIdParam}`);
          setActiveConversation(data.conversation);
          setMessages(data.messages);
          setMobileThreadOpen(true);
          await loadConversations();
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : 'Could not open booking thread');
        } finally {
          setLoadingThread(false);
        }
      } else if (propertyIdParam) {
        setLoadingThread(true);
        try {
          const data = await apiFetch<ConversationThread>(`/messages/property/${propertyIdParam}`);
          setActiveConversation(data.conversation);
          setMessages(data.messages);
          setMobileThreadOpen(true);
          await loadConversations();
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : 'Could not open inquiry thread');
        } finally {
          setLoadingThread(false);
        }
      } else if (convs && convs.length > 0) {
        // Automatically select top conversation on desktop
        if (window.innerWidth >= 768) {
          await loadThread(convs[0].id);
        }
      }
    };

    void init();
  }, [user, authLoading, conversationIdParam, bookingIdParam, propertyIdParam, loadConversations, loadThread, router]);

  // 4. Scroll to bottom when messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 5. Periodic polling for active conversation (every 6 seconds)
  useEffect(() => {
    if (!activeConversation?.id || !user) return;

    const interval = setInterval(async () => {
      try {
        const data = await apiFetch<ConversationThread>(`/messages/thread/${activeConversation.id}`);
        setMessages((prev) => {
          if (data.messages.length !== prev.length) {
            return data.messages;
          }
          return prev;
        });
      } catch {
        // Silent poll error
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [activeConversation?.id, user]);

  // Handle message sending
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

      // Update active conversation preview
      setActiveConversation((prev) =>
        prev
          ? {
              ...prev,
              lastMessageText: content,
              lastMessageAt: new Date().toISOString(),
            }
          : null
      );

      // Update sidebar conversations list
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id
            ? {
                ...c,
                lastMessageText: content,
                lastMessageAt: new Date().toISOString(),
              }
            : c
        )
      );

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

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    if (unreadOnly && c.unreadCount === 0) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchName = c.counterparty?.name?.toLowerCase().includes(q);
    const matchProp = c.property?.title?.toLowerCase().includes(q);
    const matchCity = c.property?.city?.toLowerCase().includes(q);
    return matchName || matchProp || matchCity;
  });

  const promptSuggestions = [
    'What is the best route from Bole Airport?',
    'Is high-speed WiFi available for remote video calls?',
    'What are the check-in and luggage drop-off instructions?',
    'Is parking on-premises secure and reserved?',
  ];

  return (
    <div className="min-h-screen bg-[#F8F5ED] text-[#252923] flex flex-col font-sans">
      <AppHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col">
        {/* Page Title & Navigation Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#234B36] text-white flex items-center justify-center shadow-xs">
              <MessageSquare size={20} />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold tracking-tight text-[#252923]">
                Messages & Inquiries
              </h1>
              <p className="text-xs text-[#73776F]">
                Direct, verified communication between ENGIDA guests and property hosts
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#234B36]/10 text-[#234B36]">
              <ShieldCheck size={14} /> Protected In-Platform Chat
            </span>
          </div>
        </div>

        {/* Messaging Container */}
        <div className="flex-1 min-h-[640px] bg-white rounded-3xl border border-[#E5E0D5] shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12">
          {/* LEFT COLUMN: Conversations List */}
          <div
            className={`md:col-span-4 lg:col-span-4 border-r border-[#E5E0D5] flex flex-col bg-[#FAF8F2] ${
              mobileThreadOpen ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Search and Filters */}
            <div className="p-4 border-b border-[#E5E0D5] bg-white space-y-3">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#73776F]"
                />
                <input
                  type="text"
                  placeholder="Search guests, hosts, or properties..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-[#F8F5ED] border border-[#E5E0D5] placeholder-[#73776F] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36] transition-all"
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setUnreadOnly(false)}
                  className={`px-3 py-1 rounded-full font-medium transition cursor-pointer ${
                    !unreadOnly
                      ? 'bg-[#234B36] text-white shadow-xs'
                      : 'text-[#73776F] hover:text-[#252923] hover:bg-[#E5E0D5]/50'
                  }`}
                >
                  All ({conversations.length})
                </button>
                <button
                  type="button"
                  onClick={() => setUnreadOnly(true)}
                  className={`px-3 py-1 rounded-full font-medium transition cursor-pointer ${
                    unreadOnly
                      ? 'bg-[#234B36] text-white shadow-xs'
                      : 'text-[#73776F] hover:text-[#252923] hover:bg-[#E5E0D5]/50'
                  }`}
                >
                  Unread ({conversations.reduce((sum, c) => sum + (c.unreadCount > 0 ? 1 : 0), 0)})
                </button>
              </div>
            </div>

            {/* Conversation Items Feed */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#E5E0D5]/50">
              {loadingConversations ? (
                <div className="p-8 text-center text-xs text-[#73776F] flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-[#234B36] border-t-transparent rounded-full animate-spin" />
                  <span>Loading conversations...</span>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-[#E5E0D5]/40 text-[#73776F] flex items-center justify-center">
                    <MessageSquare size={22} />
                  </div>
                  <h3 className="font-semibold text-sm text-[#252923]">No messages found</h3>
                  <p className="text-xs text-[#73776F] max-w-xs">
                    {searchQuery
                      ? 'No conversations match your search terms.'
                      : 'When you inquire about a property or complete a booking, conversation threads appear here.'}
                  </p>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isSelected = activeConversation?.id === conv.id;
                  const hasUnread = conv.unreadCount > 0;

                  return (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => void loadThread(conv.id)}
                      className={`w-full p-4 text-left transition-all flex items-start gap-3 cursor-pointer relative ${
                        isSelected
                          ? 'bg-white border-l-4 border-l-[#234B36] shadow-xs'
                          : 'hover:bg-white/80'
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div className="w-12 h-12 rounded-full bg-[#234B36]/10 text-[#234B36] border border-[#234B36]/20 font-bold text-sm flex items-center justify-center shadow-xs">
                          {getInitials(conv.counterparty.name)}
                        </div>
                        {hasUnread && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#B2531B] border-2 border-white rounded-full animate-pulse" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-1 mb-0.5">
                          <p
                            className={`truncate text-sm ${
                              hasUnread ? 'font-bold text-[#252923]' : 'font-semibold text-[#252923]'
                            }`}
                          >
                            {conv.counterparty.name}
                          </p>
                          <span className="text-[10px] text-[#73776F] shrink-0 font-medium">
                            {formatRelativeTime(conv.lastMessageAt || conv.createdAt)}
                          </span>
                        </div>

                        {/* Property summary */}
                        {conv.property && (
                          <p className="truncate text-xs text-[#73776F] flex items-center gap-1 mb-1 font-medium">
                            <Building2 size={12} className="shrink-0 text-[#234B36]" />
                            <span className="truncate">{conv.property.title}</span>
                          </p>
                        )}

                        {/* Last message text */}
                        <p
                          className={`truncate text-xs leading-relaxed ${
                            hasUnread ? 'font-semibold text-[#252923]' : 'text-[#73776F]'
                          }`}
                        >
                          {conv.lastMessageText || 'Conversation started'}
                        </p>
                      </div>

                      {/* Unread badge count */}
                      {hasUnread && (
                        <div className="shrink-0 self-center">
                          <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-[#234B36] text-white text-[10px] font-bold">
                            {conv.unreadCount}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Active Thread Chat Window */}
          <div
            className={`md:col-span-8 lg:col-span-8 flex flex-col bg-white h-full ${
              mobileThreadOpen ? 'flex' : 'hidden md:flex'
            }`}
          >
            {activeConversation ? (
              <>
                {/* Thread Header */}
                <div className="p-4 border-b border-[#E5E0D5] flex items-center justify-between bg-[#FAF8F2]">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => setMobileThreadOpen(false)}
                      className="md:hidden p-1.5 rounded-xl hover:bg-[#E5E0D5]/50 text-[#73776F] cursor-pointer"
                    >
                      <ArrowLeft size={18} />
                    </button>

                    <div className="w-10 h-10 rounded-full bg-[#234B36] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                      {getInitials(activeConversation.counterparty.name)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-[#252923] truncate">
                          {activeConversation.counterparty.name}
                        </h2>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#234B36]/10 text-[#234B36]">
                          {activeConversation.counterparty.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#73776F] truncate">
                        {activeConversation.property?.title} · {activeConversation.property?.city}
                      </p>
                    </div>
                  </div>

                  {/* Header Actions & Context */}
                  <div className="flex items-center gap-2 shrink-0">
                    {activeConversation.booking && (
                      <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                        <Calendar size={13} /> {activeConversation.booking.reference}
                      </span>
                    )}

                    {activeConversation.property && (
                      <Link
                        href={`/properties/${activeConversation.property.id}`}
                        target="_blank"
                        className="px-3 py-1.5 rounded-xl border border-[#E5E0D5] hover:bg-[#F8F5ED] text-xs font-medium text-[#252923] transition flex items-center gap-1"
                      >
                        <Building2 size={13} /> View Listing
                      </Link>
                    )}
                  </div>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="p-3 bg-red-50 border-b border-red-200 text-red-800 text-xs flex items-center justify-between">
                    <span>{error}</span>
                    <button
                      type="button"
                      onClick={() => setError(null)}
                      className="font-bold underline cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Message History Feed */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gradient-to-b from-[#FAF8F2]/30 to-white">
                  {loadingThread ? (
                    <div className="h-full flex flex-col items-center justify-center text-xs text-[#73776F] gap-2">
                      <div className="w-6 h-6 border-2 border-[#234B36] border-t-transparent rounded-full animate-spin" />
                      <span>Loading conversation history...</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8">
                      <div className="w-14 h-14 rounded-2xl bg-[#F8F5ED] border border-[#E5E0D5] text-[#234B36] flex items-center justify-center mb-3">
                        <Sparkles size={24} />
                      </div>
                      <h3 className="font-serif font-bold text-base text-[#252923]">
                        Start your conversation
                      </h3>
                      <p className="text-xs text-[#73776F] mt-1 max-w-sm">
                        Ask questions about amenities, check-in instructions, arrival times, or special requests.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.senderId === user?.id;

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-3 shadow-xs text-xs sm:text-sm leading-relaxed ${
                              isMe
                                ? 'bg-[#234B36] text-white rounded-br-xs'
                                : 'bg-[#FAF8F2] text-[#252923] border border-[#E5E0D5] rounded-bl-xs'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          </div>

                          <div
                            className={`flex items-center gap-1 mt-1 text-[10px] text-[#73776F] px-1 ${
                              isMe ? 'flex-row-reverse' : ''
                            }`}
                          >
                            <span>{formatMessageTime(msg.createdAt)}</span>
                            {isMe && (
                              <span title={msg.readAt ? 'Read' : 'Sent'} className="inline-flex items-center">
                                {msg.readAt ? (
                                  <CheckCheck size={12} className="text-[#234B36]" />
                                ) : (
                                  <Check size={12} className="text-[#73776F]" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Prompt Suggestions Bar */}
                <div className="px-4 py-2 bg-[#FAF8F2]/60 border-t border-[#E5E0D5] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <span className="text-[11px] font-semibold text-[#73776F] shrink-0 flex items-center gap-1">
                    <Sparkles size={12} className="text-[#B2531B]" /> Quick suggestions:
                  </span>
                  {promptSuggestions.map((prompt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setDraft((prev) => (prev ? `${prev} ${prompt}` : prompt))}
                      className="px-2.5 py-1 rounded-full bg-white hover:bg-[#234B36] hover:text-white border border-[#E5E0D5] text-[11px] text-[#252923] whitespace-nowrap transition cursor-pointer"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>

                {/* Chat Input Bar */}
                <form
                  onSubmit={handleSend}
                  className="p-4 border-t border-[#E5E0D5] bg-white flex items-end gap-3"
                >
                  <div className="flex-1 relative">
                    <textarea
                      ref={textareaRef}
                      rows={2}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={`Message ${activeConversation.counterparty.name}... (Press Enter to send, Shift+Enter for new line)`}
                      maxLength={2000}
                      className="w-full p-3 text-xs sm:text-sm rounded-2xl bg-[#F8F5ED] border border-[#E5E0D5] text-[#252923] placeholder-[#73776F] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36] transition-all resize-none"
                    />
                    <div className="absolute right-3 bottom-2 text-[10px] text-[#73776F]">
                      {draft.length}/2000
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!draft.trim() || sending}
                    className="p-3.5 rounded-2xl bg-[#234B36] hover:bg-[#1a3828] disabled:opacity-40 text-white font-semibold transition active:scale-95 shadow-xs cursor-pointer flex items-center justify-center shrink-0"
                    title="Send message"
                  >
                    {sending ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send size={18} />
                    )}
                  </button>
                </form>
              </>
            ) : (
              /* No Conversation Selected Placeholder */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#FAF8F2]/30">
                <div className="w-16 h-16 rounded-3xl bg-[#234B36]/10 text-[#234B36] flex items-center justify-center mb-4 shadow-xs">
                  <MessageSquare size={32} />
                </div>
                <h3 className="font-serif font-bold text-xl text-[#252923]">
                  Select a Conversation
                </h3>
                <p className="text-xs text-[#73776F] max-w-sm mt-1.5 leading-relaxed">
                  Choose a conversation from the sidebar or click &ldquo;Message Host&rdquo; on any property or reservation to start chatting.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}


export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8F5ED] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#234B36] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <MessagesContent />
    </Suspense>
  );
}
