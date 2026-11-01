'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { Send, X, MessageSquare, Building2, User, Clock, Check, CheckCheck, Loader2 } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

export interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId?: string;
  conversationId?: string;
  propertyId?: string;
  recipientName?: string;
  recipientAvatar?: string;
  propertyTitle?: string;
}

interface MessageItem {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
}

interface ThreadResponse {
  conversation: {
    id: string;
    bookingId?: string | null;
    propertyId: string;
    propertyTitle?: string;
    propertyImage?: string | null;
    guest?: { id: string; name: string; avatar?: string };
    host?: { id: string; name: string; avatar?: string };
  };
  messages: MessageItem[];
}

export default function ChatModal({
  isOpen,
  onClose,
  bookingId,
  conversationId,
  propertyId,
  recipientName,
  recipientAvatar,
  propertyTitle,
}: ChatModalProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(conversationId || null);
  const [partnerInfo, setPartnerInfo] = useState<{ name: string; avatar?: string; title?: string }>({
    name: recipientName || 'Host / Guest',
    avatar: recipientAvatar,
    title: propertyTitle,
  });
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  const loadThread = useCallback(async (isInitial = false) => {
    if (!isOpen) return;
    if (isInitial) setLoading(true);
    setError(null);

    try {
      const threadTarget = activeConversationId || bookingId;
      if (threadTarget) {
        const data = await apiFetch<ThreadResponse>(`/messages/thread/${threadTarget}`);
        setMessages(data.messages || []);
        if (data.conversation?.id) {
          setActiveConversationId(data.conversation.id);
        }

        // Determine partner info from thread
        if (data.conversation) {
          const isCurrentUserHost = user?.id === data.conversation.host?.id;
          const counterpart = isCurrentUserHost ? data.conversation.guest : data.conversation.host;
          setPartnerInfo({
            name: counterpart?.name || recipientName || 'User',
            avatar: counterpart?.avatar || recipientAvatar,
            title: data.conversation.propertyTitle || propertyTitle,
          });
        }
      } else if (propertyId) {
        // Find existing conversation for this property if any
        const convList = await apiFetch<Array<{ id: string; propertyId: string }>>('/messages/conversations');
        const match = convList.find((c) => c.propertyId === propertyId);
        if (match) {
          setActiveConversationId(match.id);
          const data = await apiFetch<ThreadResponse>(`/messages/thread/${match.id}`);
          setMessages(data.messages || []);
        } else {
          setMessages([]);
        }
      }
    } catch (err: unknown) {
      if (isInitial) {
        setError(err instanceof Error ? err.message : 'Failed to load message thread.');
      }
    } finally {
      if (isInitial) {
        setLoading(false);
        setTimeout(() => scrollToBottom(false), 100);
      }
    }
  }, [activeConversationId, bookingId, isOpen, propertyId, propertyTitle, recipientAvatar, recipientName, user?.id]);

  useEffect(() => {
    if (!isOpen) {
      setMessages([]);
      setActiveConversationId(conversationId || null);
      setDraft('');
      return;
    }

    void loadThread(true);

    // Poll for new messages every 4 seconds while open
    const interval = setInterval(() => {
      void loadThread(false);
    }, 4000);

    return () => clearInterval(interval);
  }, [isOpen, loadThread, conversationId]);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages.length]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;

    setSending(true);
    setError(null);

    try {
      const payload: {
        content: string;
        conversationId?: string;
        bookingId?: string;
        propertyId?: string;
      } = { content };

      if (activeConversationId) {
        payload.conversationId = activeConversationId;
      } else if (bookingId) {
        payload.bookingId = bookingId;
      } else if (propertyId) {
        payload.propertyId = propertyId;
      }

      const res = await apiFetch<MessageItem & { conversationId: string }>('/messages/send', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.conversationId && !activeConversationId) {
        setActiveConversationId(res.conversationId);
      }

      setMessages((prev) => [...prev, res]);
      setDraft('');
      setTimeout(() => scrollToBottom(true), 50);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleQuickPrompt = (text: string) => {
    setDraft((prev) => (prev ? `${prev} ${text}` : text));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in-up">
      <div className="flex flex-col w-full max-w-2xl h-[85vh] max-h-[720px] bg-white rounded-3xl border border-[#d8d0c8] shadow-2xl overflow-hidden font-body">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#F8F5ED] border-b border-[#E5E0D5]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-11 h-11 rounded-full overflow-hidden border-2 border-[#234B36]/20 bg-slate-100 shrink-0">
              {partnerInfo.avatar ? (
                <Image
                  src={partnerInfo.avatar}
                  alt={partnerInfo.name}
                  fill
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#234B36]/10 text-[#234B36]">
                  <User className="w-5 h-5" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black text-[#252923] truncate">
                {partnerInfo.name}
              </h3>
              <p className="text-xs text-[#73776F] truncate flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#234B36]" />
                <span className="truncate">{partnerInfo.title || 'In-Platform Direct Chat'}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white border border-[#E5E0D5] hover:bg-[#EEF3EF] flex items-center justify-center text-[#73776F] hover:text-[#252923] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#faf5ee]/40 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#234B36]" />
              <p className="text-xs font-semibold">Loading conversation…</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
              <div className="w-12 h-12 rounded-2xl bg-[#EEF3EF] flex items-center justify-center text-[#234B36] mb-3">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-[#252923]">No messages yet</h4>
              <p className="text-xs text-[#73776F] max-w-xs mt-1">
                Start the conversation with {partnerInfo.name}. Ask about check-in, amenities, or directions.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2 max-w-md">
                {[
                  'Hello, what time is check-in?',
                  'Can I arrange airport transfer?',
                  'Is early arrival possible?',
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleQuickPrompt(chip)}
                    className="px-3 py-1 rounded-full bg-white border border-[#d8d0c8] text-[11px] font-semibold text-[#252923] hover:border-[#234B36] hover:text-[#234B36] transition cursor-pointer shadow-2xs"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => {
              const isMine = m.senderId === user?.id;
              const formattedTime = new Date(m.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[80%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-xs ${
                      isMine
                        ? 'bg-[#234B36] text-white rounded-br-xs'
                        : 'bg-white text-[#252923] border border-[#E5E0D5] rounded-bl-xs'
                    }`}
                  >
                    <p className="break-words whitespace-pre-wrap">{m.content}</p>
                    <div
                      className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                        isMine ? 'text-white/70' : 'text-[#73776F]'
                      }`}
                    >
                      <span>{formattedTime}</span>
                      {isMine && (
                        <span>
                          {m.readAt ? (
                            <CheckCheck className="w-3 h-3 text-emerald-300 inline" />
                          ) : (
                            <Check className="w-3 h-3 inline opacity-70" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Error notification */}
        {error && (
          <div className="px-5 py-2 bg-red-50 border-t border-red-200 text-xs text-red-700 font-semibold flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-800"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Input & Quick Actions */}
        <form
          onSubmit={handleSendMessage}
          className="p-3 sm:p-4 bg-white border-t border-[#E5E0D5] space-y-2.5"
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type your message…"
              disabled={sending}
              className="flex-1 px-4 py-2.5 rounded-xl border border-[#d8d0c8] text-sm text-[#252923] placeholder-[#73776F] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36] transition"
            />
            <button
              type="submit"
              disabled={!draft.trim() || sending}
              className="px-5 py-2.5 rounded-xl bg-[#234B36] hover:bg-[#1A3828] disabled:opacity-40 text-white text-sm font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span className="hidden sm:inline">Send</span>
                  <Send className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
