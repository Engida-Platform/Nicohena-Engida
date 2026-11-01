import React from 'react';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

interface AdminNoAccessProps {
  /** What the admin tried to open, e.g. "Finance & Escrow". */
  area?: string;
  /** Permission keys that would grant access. Shown to help request access. */
  required?: readonly string[];
  /** Where the "back" link goes. Defaults to the console overview. */
  backHref?: string;
  backLabel?: string;
}

/** Friendly "your role cannot open this page" panel for admin routes. */
export default function AdminNoAccess({
  area,
  required,
  backHref = '/admin',
  backLabel = 'Back to overview',
}: AdminNoAccessProps) {
  return (
    <div className="mx-auto mt-6 w-full max-w-lg rounded-2xl border border-[#ecd9c2] bg-[#f7ebda] p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 text-[#9a6a1f]">
        <ShieldAlert className="h-6 w-6" strokeWidth={1.8} />
      </div>
      <h1 className="font-headline text-xl font-semibold tracking-[-0.01em] text-[#3a302a]">
        {area ? `You can’t open ${area}` : 'You can’t open this page'}
      </h1>
      <p className="mt-2 text-sm leading-6 text-[#7a531c]">
        Your administrator role does not include access to this area. Ask a Super
        Admin to change your role if you need it.
      </p>
      {required && required.length > 0 ? (
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9a6a1f]">
          Requires {required.length > 1 ? 'one of: ' : ''}
          {required.join(', ')}
        </p>
      ) : null}
      <Link href={backHref} className="admin-btn admin-btn-primary mt-6">
        {backLabel}
      </Link>
    </div>
  );
}

