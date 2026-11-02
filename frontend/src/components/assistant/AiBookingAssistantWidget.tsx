'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import type { BookingAssistantResponse } from '@/types/guest-ai';
import {
  Sparkles,
  MessageCircle,
  X,
  Send,
  HelpCircle,
  Calendar,
  CreditCard,
  Building2,
  ShieldAlert,
  ArrowRight,
  Bot,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  category?: string;
  actions?: { label: string; href: string }[];
}

export default function AiBookingAssistantWidget({
  propertyId,
  bookingId,
}: {
  propertyId?: string;
  bookingId?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: propertyId
        ? 'Hello! I am your ENGIDA Booking Assistant. Ask me anything about this property (amenities, parking, Wi-Fi, house rules) or the booking process.'
        : 'Hello! I am your ENGIDA Assistant. Ask me questions about verified properties, check-in rules, cancellation policies, or your reservation status.',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (messageText?: string) => {
    const text = (messageText || inputMessage).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const res = await apiFetch<BookingAssistantResponse>(
        '/ai/guest/booking-assistant',
        {
          method: 'POST',
          body: JSON.stringify({
            message: text,
            propertyId,
            bookingId,
          }),
        },
      );

      const assistantMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: res.answer,
        category: res.category,
        actions: res.actionSuggestions,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Assistant error';
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'assistant',
          text: `I encountered an issue verifying the platform details: ${msg}. Please try again or check directly on the listing page.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = propertyId
    ? [
        'Does this place have parking?',
        'Is high-speed Wi-Fi included?',
        'What is the cancellation policy?',
        'What are the check-in and check-out times?',
      ]
    : [
        'What is the status of my booking?',
        'Have I completed the payment?',
        'What are the cancellation policies?',
        'How do I contact my host?',
      ];

  return (
    <>
      {/* Floating Assistant Launcher Button */}
      <div className="fixed bottom-6 right-6 z-40">
        {!isOpen && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label="Open AI Booking Assistant"
            className="flex items-center gap-2.5 px-4 py-3 rounded-full bg-[#234B36] hover:bg-[#1a3828] text-white shadow-xl hover:shadow-2xl transition-all duration-200 active:scale-95 cursor-pointer border border-white/20 group"
          >
            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
              <Bot size={16} className="text-[#D87836]" />
            </div>
            <span className="text-xs font-bold tracking-tight">AI Assistant</span>
          </button>
        )}
      </div>

      {/* Floating Chat Drawer */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[92vw] sm:w-[380px] h-[540px] max-h-[85vh] bg-white rounded-3xl border border-[#E5E0D5] shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
          {/* Header */}
          <div className="p-4 bg-[#FAF8F2] border-b border-[#E5E0D5] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#234B36] text-white flex items-center justify-center shadow-xs">
                <Bot size={18} className="text-[#D87836]" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-sm text-[#252923] flex items-center gap-1.5">
                  ENGIDA Assistant
                </h3>
                <p className="text-[10px] text-[#73776F]">
                  Real-time answers from verified platform records
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-full bg-white border border-[#E5E0D5] hover:bg-[#FAF8F2] flex items-center justify-center text-[#73776F] hover:text-[#252923] transition cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-gradient-to-b from-[#FAF8F2]/30 to-white text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-[#234B36] text-white rounded-br-xs shadow-2xs'
                      : 'bg-[#FAF8F2] text-[#252923] border border-[#E5E0D5] rounded-bl-xs shadow-2xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {/* Actions suggestions if provided */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-[#E5E0D5]/60 flex flex-wrap gap-1.5">
                      {msg.actions.map((act, i) => (
                        <Link
                          key={i}
                          href={act.href}
                          onClick={() => setIsOpen(false)}
                          className="px-2.5 py-1 rounded-xl bg-[#234B36] text-white hover:bg-[#1a3828] text-[10px] font-semibold transition flex items-center gap-1"
                        >
                          <span>{act.label}</span>
                          <ArrowRight size={10} />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-1.5 text-[11px] text-[#73776F] p-2.5 bg-[#FAF8F2] rounded-2xl border border-[#E5E0D5] w-fit">
                <div className="w-3.5 h-3.5 border-2 border-[#234B36] border-t-transparent rounded-full animate-spin" />
                <span>Checking verified records...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Chips */}
          <div className="px-3 py-2 bg-[#FAF8F2] border-t border-[#E5E0D5] flex items-center gap-1 overflow-x-auto no-scrollbar">
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => void handleSend(prompt)}
                className="px-2.5 py-1 rounded-full bg-white hover:bg-[#234B36] hover:text-white border border-[#E5E0D5] text-[10px] text-[#252923] whitespace-nowrap transition cursor-pointer font-medium shadow-2xs"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="p-3 border-t border-[#E5E0D5] bg-white flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder="Ask a question..."
              className="flex-1 px-3 py-2 rounded-xl bg-[#FAF8F2] border border-[#E5E0D5] text-xs text-[#252923] placeholder-[#73776F] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36]"
            />

            <button
              type="button"
              disabled={!inputMessage.trim() || loading}
              onClick={() => void handleSend()}
              className="p-2 rounded-xl bg-[#234B36] hover:bg-[#1a3828] disabled:opacity-40 text-white transition cursor-pointer"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

