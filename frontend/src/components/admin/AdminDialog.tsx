'use client';

import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

interface AdminDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: 'md' | 'lg';
}

const FOCUSABLE_SELECTOR =
  'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

// Dialogs can be stacked (e.g. a confirm on top of a detail view). Only the
// top-most one should react to Escape.
const openDialogs: symbol[] = [];

export default function AdminDialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 'md',
}: AdminDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Callers pass inline arrow functions. Keeping the latest handler in a ref
  // means the effect below runs only when the dialog opens or closes, instead
  // of on every parent render (which used to steal focus while typing).
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const token = Symbol('admin-dialog');
    openDialogs.push(token);
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    const focusables = () =>
      Array.from(panel?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []);

    // Prefer the first field in the body over the header close button.
    const body = panel?.querySelector<HTMLElement>('[data-dialog-body]');
    const firstField = body?.querySelector<HTMLElement>(
      'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])',
    );
    (firstField ?? focusables()[0] ?? panel)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (openDialogs[openDialogs.length - 1] !== token) return;

      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (event.key === 'Tab') {
        const items = focusables();
        if (items.length === 0) {
          event.preventDefault();
          return;
        }
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        if (event.shiftKey && (active === first || !panel?.contains(active))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (active === last || !panel?.contains(active))) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const index = openDialogs.indexOf(token);
      if (index >= 0) openDialogs.splice(index, 1);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="admin-sheet-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCloseRef.current();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`admin-sheet ${width === 'lg' ? 'sm:max-w-[52rem]' : ''}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#d8d0c8] pb-4">
          <div className="min-w-0">
            <h2 id={titleId} className="admin-sheet-title">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-xs leading-5 text-[#605850]">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onCloseRef.current()}
            className="admin-btn admin-btn-ghost -mr-2 -mt-1 h-9 w-9 shrink-0 p-0"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </div>
        <div data-dialog-body className="py-4">
          {children}
        </div>
        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#d8d0c8] pt-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
