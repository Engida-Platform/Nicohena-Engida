'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { apiFetch } from '@/lib/api';
import type {
  ConversationalSearchFilters,
  ConversationalSearchResponse,
  EnrichedPropertyCard,
} from '@/types/guest-ai';
import {
  Sparkles,
  Send,
  X,
  MapPin,
  Building2,
  Users,
  Bed,
  Star,
  CheckCircle2,
  ArrowRight,
  Filter,
} from 'lucide-react';

interface MessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  properties?: EnrichedPropertyCard[];
  filters?: ConversationalSearchFilters;
  suggestions?: string[];
}

export default function AiConversationalSearchModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeFilters, setActiveFilters] = useState<ConversationalSearchFilters>({});
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hello! Tell me what kind of stay you are looking for in your own words. For example:\n"Find me a modern 2-bedroom furnished apartment in Bole under 5,000 ETB with Wi-Fi and parking."',
      suggestions: [
        'Furnished apartment in Bole under 5,000 ETB',
        'Villa in Bahir Dar with lake views for 6 guests',
        'Quiet studio in Kazanchis with generator and Wi-Fi',
      ],
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

  if (!isOpen) return null;

  const handleSend = async (queryText?: string) => {
    const text = (queryText || inputQuery).trim();
    if (!text || loading) return;

    const userMsg: MessageItem = {
      id: String(Date.now()),
      role: 'user',
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      const res = await apiFetch<ConversationalSearchResponse>(
        '/ai/guest/conversational-search',
        {
          method: 'POST',
          body: JSON.stringify({
            message: text,
            currentFilters: activeFilters,
            conversationHistory: messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        },
      );

      setActiveFilters(res.parsedCriteria);

      const assistantMsg: MessageItem = {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: res.reply,
        properties: res.properties,
        filters: res.parsedCriteria,
        suggestions: res.suggestedFollowUps,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Search failed';
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          role: 'assistant',
          content: `I encountered an issue querying the database: ${msg}. Please try rephrasing your search.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div className="bg-[#FAF8F2] w-full max-w-4xl h-[90vh] max-h-[820px] rounded-3xl border border-[#E5E0D5] shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#E5E0D5] bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#234B36] text-white flex items-center justify-center shadow-xs">
              <Sparkles size={20} className="text-[#D87836]" />
            </div>
            <div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-[#252923]">
                AI Conversational Search
              </h2>
              <p className="text-xs text-[#73776F]">
                Describe your trip naturally — AI searches real properties in ENGIDA&apos;s database
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#FAF8F2] hover:bg-[#E5E0D5]/50 flex items-center justify-center text-[#73776F] hover:text-[#252923] transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Active Filters Bar (if any extracted) */}
        {Object.keys(activeFilters).length > 0 && (
          <div className="px-5 py-2.5 bg-white border-b border-[#E5E0D5] flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
            <span className="font-bold text-[#73776F] flex items-center gap-1 shrink-0">
              <Filter size={13} /> Active Filters:
            </span>
            {activeFilters.city && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#234B36]/10 text-[#234B36] font-semibold shrink-0">
                <MapPin size={11} /> {activeFilters.subCity ? `${activeFilters.subCity}, ` : ''}{activeFilters.city}
              </span>
            )}
            {activeFilters.maxPrice && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200 shrink-0">
                ≤ {activeFilters.maxPrice.toLocaleString()} ETB/night
              </span>
            )}
            {activeFilters.bedrooms && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#FAF8F2] text-[#252923] border border-[#E5E0D5] font-semibold shrink-0">
                {activeFilters.bedrooms} {activeFilters.bedrooms === 1 ? 'bed' : 'beds'}
              </span>
            )}
            {activeFilters.guests && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#FAF8F2] text-[#252923] border border-[#E5E0D5] font-semibold shrink-0">
                {activeFilters.guests} {activeFilters.guests === 1 ? 'guest' : 'guests'}
              </span>
            )}
            {activeFilters.amenities?.map((amenity) => (
              <span
                key={amenity}
                className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#FAF8F2] text-[#73776F] border border-[#E5E0D5] shrink-0"
              >
                ✓ {amenity}
              </span>
            ))}
          </div>
        )}

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              {/* Message Bubble */}
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#234B36] text-white rounded-br-xs shadow-xs'
                    : 'bg-white text-[#252923] border border-[#E5E0D5] rounded-bl-xs shadow-xs'
                }`}
              >
                <p className="whitespace-pre-line">{msg.content}</p>
              </div>

              {/* Rendered Property Matches if available */}
              {msg.properties && msg.properties.length > 0 && (
                <div className="mt-4 w-full grid grid-cols-1 sm:grid-cols-2 gap-3.5 animate-fade-in">
                  {msg.properties.map((prop) => (
                    <div
                      key={prop.id}
                      className="bg-white rounded-2xl border border-[#E5E0D5] p-3 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                    >
                      <div className="flex gap-3">
                        {/* Thumbnail */}
                        <div className="w-20 h-20 rounded-xl bg-[#FAF8F2] overflow-hidden shrink-0 relative">
                          {prop.coverImage ? (
                            <Image
                              src={prop.coverImage}
                              alt={prop.title}
                              fill
                              unoptimized
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#73776F]">
                              <Building2 size={24} />
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#D87836] bg-[#D87836]/10 px-2 py-0.5 rounded-full">
                              {prop.propertyType}
                            </span>
                            <span className="text-xs font-bold text-[#252923] flex items-center gap-0.5">
                              <Star size={12} className="fill-amber-400 text-amber-400" />
                              {prop.averageRating > 0 ? prop.averageRating : 'New'}
                            </span>
                          </div>

                          <h4 className="font-bold text-xs text-[#252923] truncate leading-tight group-hover:text-[#234B36] transition-colors">
                            {prop.title}
                          </h4>

                          <p className="text-[11px] text-[#73776F] truncate flex items-center gap-1 mt-0.5">
                            <MapPin size={11} className="shrink-0 text-[#234B36]" />
                            {prop.subCity ? `${prop.subCity}, ` : ''}{prop.city}
                          </p>

                          <p className="text-[11px] text-[#73776F] flex items-center gap-2 mt-1">
                            <span className="flex items-center gap-0.5">
                              <Bed size={11} /> {prop.bedrooms} bed
                            </span>
                            <span className="flex items-center gap-0.5">
                              <Users size={11} /> Up to {prop.maxGuests}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-[#E5E0D5]/60 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-sm text-[#252923]">
                            {prop.pricePerNight.toLocaleString()} ETB
                          </span>
                          <span className="text-[10px] text-[#73776F]"> / night</span>
                        </div>

                        <Link
                          href={`/properties/${prop.id}`}
                          onClick={onClose}
                          className="px-3 py-1.5 rounded-xl bg-[#234B36] hover:bg-[#1a3828] text-white text-xs font-semibold transition active:scale-95 flex items-center gap-1"
                        >
                          <span>View</span>
                          <ArrowRight size={12} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Suggestions Chips */}
              {msg.suggestions && msg.suggestions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {msg.suggestions.map((sug, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => void handleSend(sug)}
                      className="px-3 py-1 rounded-full bg-white hover:bg-[#234B36] hover:text-white border border-[#E5E0D5] text-xs text-[#252923] font-medium transition cursor-pointer shadow-2xs"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-[#73776F] p-3 bg-white rounded-2xl border border-[#E5E0D5] w-fit shadow-xs">
              <div className="w-4 h-4 border-2 border-[#234B36] border-t-transparent rounded-full animate-spin" />
              <span>Analyzing requirements and querying real properties...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 border-t border-[#E5E0D5] bg-white flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="E.g. 2-bedroom apartment in Bole with parking under 5,000 ETB..."
            className="flex-1 px-4 py-3 rounded-2xl bg-[#FAF8F2] border border-[#E5E0D5] text-xs sm:text-sm text-[#252923] placeholder-[#73776F] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36] transition-all"
          />

          <button
            type="button"
            disabled={!inputQuery.trim() || loading}
            onClick={() => void handleSend()}
            className="p-3 sm:px-5 sm:py-3 rounded-2xl bg-[#234B36] hover:bg-[#1a3828] disabled:opacity-40 text-white font-semibold text-xs sm:text-sm transition active:scale-95 shadow-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            <span className="hidden sm:inline">Search</span>
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

