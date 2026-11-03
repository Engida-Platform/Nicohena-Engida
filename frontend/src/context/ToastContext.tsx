'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toast: {
    info: (message: string, title?: string) => void;
    success: (message: string, title?: string) => void;
    warning: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
  };
  showToast: (message: string, type?: ToastType, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Standalone global trigger so any function can show toasts safely
let globalShowToast: ((message: string, type?: ToastType, title?: string) => void) | null = null;

export function showPlatformToast(message: string, type: ToastType = 'info', title?: string) {
  if (globalShowToast) {
    globalShowToast(message, type, title);
  } else {
    // Fallback if rendered outside provider
    console.log(`[Toast ${type}]: ${message}`);
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', title?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const duration = type === 'error' ? 5000 : 3500;

      const defaultTitles: Record<ToastType, string> = {
        info: 'ENGIDA Notice',
        warning: 'Comparison Limit',
        success: 'Completed',
        error: 'System Alert',
      };

      const newToast: ToastItem = {
        id,
        type,
        title: title || defaultTitles[type],
        message,
        duration,
      };

      // Deduplicate to avoid stacking identical toasts
      setToasts((prev) => {
        const deduplicated = prev.filter((t) => t.message !== message);
        return [...deduplicated.slice(-3), newToast];
      });

      setTimeout(() => {
        removeToast(id);
      }, duration);
    },
    [removeToast]
  );

  // Bind global helper
  globalShowToast = showToast;

  const toast = {
    info: (message: string, title?: string) => showToast(message, 'info', title),
    success: (message: string, title?: string) => showToast(message, 'success', title),
    warning: (message: string, title?: string) => showToast(message, 'warning', title),
    error: (message: string, title?: string) => showToast(message, 'error', title),
  };

  return (
    <ToastContext.Provider value={{ toast, showToast }}>
      {children}

      {/* Floating Enterprise Toast Portal */}
      <div
        aria-live="polite"
        className="fixed top-5 right-4 sm:right-6 z-[999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((item) => {
          const typeConfig = {
            info: {
              icon: 'info',
              badgeBg: 'bg-[#D87836]/15',
              iconColor: 'text-[#D87836]',
              borderColor: 'border-[#3E433C]',
              titleColor: 'text-[#D87836]',
            },
            warning: {
              icon: 'balance',
              badgeBg: 'bg-[#D87836]/15',
              iconColor: 'text-[#D87836]',
              borderColor: 'border-[#D87836]/40',
              titleColor: 'text-[#D87836]',
            },
            success: {
              icon: 'check_circle',
              badgeBg: 'bg-emerald-500/15',
              iconColor: 'text-emerald-400',
              borderColor: 'border-emerald-600/40',
              titleColor: 'text-emerald-400',
            },
            error: {
              icon: 'error',
              badgeBg: 'bg-red-500/15',
              iconColor: 'text-red-400',
              borderColor: 'border-red-600/40',
              titleColor: 'text-red-400',
            },
          }[item.type];

          return (
            <div
              key={item.id}
              className={`pointer-events-auto bg-[#252923]/95 backdrop-blur-md text-white border ${typeConfig.borderColor} rounded-2xl p-4 shadow-[0_12px_36px_rgba(0,0,0,0.45)] flex items-start gap-3.5 transition-all duration-300 animate-fade-in-up`}
            >
              {/* Luxury Icon Badge */}
              <div
                className={`w-9 h-9 rounded-xl ${typeConfig.badgeBg} flex items-center justify-center shrink-0 mt-0.5 shadow-2xs`}
              >
                <span className={`material-symbols-outlined text-lg ${typeConfig.iconColor}`}>
                  {typeConfig.icon}
                </span>
              </div>

              {/* Toast Text Content */}
              <div className="flex-1 min-w-0 pr-1">
                {item.title && (
                  <p
                    className={`text-[10px] font-bold uppercase tracking-wider ${typeConfig.titleColor} mb-0.5`}
                  >
                    {item.title}
                  </p>
                )}
                <p className="text-xs sm:text-sm font-medium text-[#FAF8F2] leading-snug">
                  {item.message}
                </p>
              </div>

              {/* Close Button */}
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => removeToast(item.id)}
                className="text-white/40 hover:text-white p-1 rounded-full transition-transform active:scale-90 cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
