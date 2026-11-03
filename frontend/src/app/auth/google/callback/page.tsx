'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, AlertCircle } from 'lucide-react';
import { getSafeReturnPath } from '@/lib/navigation';
import { useAuth } from '@/context/AuthContext';
import { setAccessToken, setRefreshToken } from '@/lib/api';

/**
 * Landing page for the Google Sign-In callback.
 *
 * The backend has verified the Google identity and passes tokens both via
 * secure parameters and HttpOnly cookie for resilient cross-origin support.
 */
export default function GoogleCallbackPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState<'working' | 'error'>('working');

  useEffect(() => {
    let active = true;

    async function processCallback() {
      if (typeof window === 'undefined') return;

      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      const refresh = params.get('refresh');
      const rawNext = params.get('next');

      if (token) {
        setAccessToken(token);
      }
      if (refresh) {
        setRefreshToken(refresh);
      }

      try {
        const freshUser = await refreshUser();
        if (!active) return;

        if (freshUser) {
          if (freshUser.role === 'ADMIN') {
            const adminDest =
              rawNext && rawNext.startsWith('/admin')
                ? getSafeReturnPath(rawNext, '/admin')
                : '/admin';
            router.replace(adminDest);
          } else {
            const defaultFallback = freshUser.hostProfile ? '/host/dashboard' : '/';
            const nextPath = getSafeReturnPath(rawNext, defaultFallback);
            router.replace(nextPath);
          }
          return;
        }
      } catch (err) {
        console.error('Failed to restore session after Google callback:', err);
      }

      if (!active) return;
      setStatus('error');
      setTimeout(() => {
        router.replace('/login?error=google_failed');
      }, 1200);
    }

    processCallback();

    return () => {
      active = false;
    };
  }, [refreshUser, router]);

  return (
    <div className="min-h-screen bg-[#F8F5ED] flex items-center justify-center px-4 font-body">
      <div className="max-w-sm w-full bg-white border border-[#E5E0D5] p-8 rounded-3xl shadow-lg text-center">
        <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-[#234B36] flex items-center justify-center text-white shadow-sm">
          {status === 'error' ? (
            <AlertCircle className="w-7 h-7 text-rose-300" />
          ) : (
            <Building2 className="w-7 h-7" />
          )}
        </div>

        {status === 'error' ? (
          <>
            <h1 className="text-2xl font-black text-[#252923] mb-2 tracking-tight">Sign-in failed</h1>
            <p className="text-sm font-medium text-[#73776F]">
              We could not complete your Google sign-in. Redirecting you to the login page...
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-black text-[#252923] mb-2 tracking-tight">Signing you in</h1>
            <p className="text-sm font-medium text-[#73776F] mb-5">
              Completing your Google sign-in...
            </p>
            <div className="w-6 h-6 mx-auto border-2 border-[#E5E0D5] border-t-[#234B36] rounded-full animate-spin" />
          </>
        )}
      </div>
    </div>
  );
}
