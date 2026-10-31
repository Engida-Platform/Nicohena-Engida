'use client';

import React, { useEffect, useState, useRef, useCallback, type FormEvent, type ChangeEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiFetch, formatDate } from '@/lib/api';
import type { HostProfile, HostVerificationStatus } from '@/types/host';
import {
  User as UserIcon,
  ShieldCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Camera,
  Upload,
  Trash2,
  Landmark,
  Phone,
  Mail,
  Calendar,
  Building2,
  ExternalLink,
  Info,
  BadgeCheck,
  Sparkles,
  FileText,
  UploadCloud,
  Lock,
  Eye,
  CreditCard,
  Check,
} from 'lucide-react';

export type HostDocType =
  | 'ETHIOPIAN_FAYDA_ID'
  | 'ETHIOPIAN_KEBELE_ID'
  | 'ETHIOPIAN_PASSPORT'
  | 'ETHIOPIAN_DRIVERS_LICENSE';

export interface VerificationAuditInfo {
  transactionId?: string;
  documentType?: string;
  documentNumberMasked?: string;
  submittedAt?: string;
  status?: string;
  provider?: string;
  rejectionReason?: string;
  extractedDemographics?: {
    fullName?: string;
    fullNameAmharic?: string;
    dateOfBirth?: string;
    gender?: string;
    nationality?: string;
    region?: string;
    city?: string;
    subCity?: string;
    woreda?: string;
  };
}

interface FormState {
  displayName: string;
  phone: string;
  bio: string;
  avatar: string;
}

interface FormErrors {
  displayName?: string;
  phone?: string;
  bio?: string;
  avatar?: string;
}

const EMPTY_FORM: FormState = {
  displayName: '',
  phone: '',
  bio: '',
  avatar: '',
};

export default function HostProfilePage() {
  const { user: authUser, refreshUser } = useAuth();
  const [profile, setProfile] = useState<HostProfile | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [requestingVerification, setRequestingVerification] = useState(false);

  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [onboardingNotice, setOnboardingNotice] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const docFrontInputRef = useRef<HTMLInputElement>(null);
  const docBackInputRef = useRef<HTMLInputElement>(null);

  // Identity & KYC Verification State
  const [kycDocType, setKycDocType] = useState<HostDocType>('ETHIOPIAN_FAYDA_ID');
  const [kycDocNumber, setKycDocNumber] = useState('');
  const [kycIssuingAuthority, setKycIssuingAuthority] = useState('National ID Program (NIDP)');
  const [kycExpirationDate, setKycExpirationDate] = useState('');
  const [kycFrontUrl, setKycFrontUrl] = useState('');
  const [kycBackUrl, setKycBackUrl] = useState('');
  const [uploadingDocFront, setUploadingDocFront] = useState(false);
  const [uploadingDocBack, setUploadingDocBack] = useState(false);
  const [isLookingUpFayda, setIsLookingUpFayda] = useState(false);
  const [faydaResult, setFaydaResult] = useState<{
    fin: string;
    fan?: string;
    fullName?: string;
    fullNameAmharic?: string;
    dateOfBirth?: string;
    gender?: string;
    nationality?: string;
    region?: string;
    city?: string;
    subCity?: string;
    woreda?: string;
    status: string;
    verificationToken: string;
    verifiedAt: string;
    provider: string;
  } | null>(null);
  const [faydaError, setFaydaError] = useState<string | null>(null);
  const [verificationAudit, setVerificationAudit] = useState<VerificationAuditInfo | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('onboarded') === 'true') {
        queueMicrotask(() => {
          setOnboardingNotice(true);
        });
      }
    }
  }, []);

  // Sync loaded profile into form state
  const syncProfileToForm = useCallback((data: HostProfile) => {
    setProfile(data);
    setForm({
      displayName: data.displayName ?? '',
      phone: data.phone ?? '',
      bio: data.bio ?? '',
      avatar: data.user?.avatar ?? authUser?.avatar ?? '',
    });
    setErrors({});
  }, [authUser?.avatar]);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      try {
        const [data, auditData] = await Promise.all([
          apiFetch<HostProfile>('/host/profile'),
          apiFetch<VerificationAuditInfo>('/host/verification/audit').catch(() => null),
        ]);
        if (!active) return;
        syncProfileToForm(data);
        if (auditData) {
          setVerificationAudit(auditData);
        }
      } catch (err) {
        if (!active) return;
        setErrorBanner(
          err instanceof Error ? err.message : 'Unable to load your host profile.',
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    queueMicrotask(() => {
      if (active) {
        setLoading(true);
        setErrorBanner(null);
      }
    });

    void loadProfile();

    return () => {
      active = false;
    };
  }, [reloadKey, syncProfileToForm]);

  // Client-side validation
  const validateForm = (): boolean => {
    const nextErrors: FormErrors = {};

    const trimmedName = form.displayName.trim();
    if (!trimmedName) {
      nextErrors.displayName = 'Host display name is required.';
    } else if (trimmedName.length < 2) {
      nextErrors.displayName = 'Display name must be at least 2 characters.';
    } else if (trimmedName.length > 100) {
      nextErrors.displayName = 'Display name cannot exceed 100 characters.';
    }

    const trimmedPhone = form.phone.trim();
    if (trimmedPhone) {
      // Basic phone format check: allows international +251, digits, spaces, hyphens
      const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,20}$/;
      if (!phoneRegex.test(trimmedPhone)) {
        nextErrors.phone = 'Please enter a valid phone number (e.g., +251 91 123 4567).';
      } else if (trimmedPhone.length > 50) {
        nextErrors.phone = 'Phone number cannot exceed 50 characters.';
      }
    }

    if (form.bio.length > 500) {
      nextErrors.bio = 'Bio cannot exceed 500 characters.';
    }

    if (form.avatar.trim() && !form.avatar.startsWith('http://') && !form.avatar.startsWith('https://')) {
      nextErrors.avatar = 'Avatar must be a valid HTTP or HTTPS URL, or uploaded as an image file.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  // Handle avatar file upload via Cloudinary (/upload/image)
  const handleAvatarFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input value so same file can be selected again if needed
    e.target.value = '';

    // Validate mime type & size (max 5MB)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        avatar: 'Invalid file format. Please upload a JPEG, PNG, or WebP image.',
      }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        avatar: 'File size exceeds 5MB. Please choose a smaller image.',
      }));
      return;
    }

    setUploadingAvatar(true);
    setErrorBanner(null);
    setErrors((prev) => ({ ...prev, avatar: undefined }));

    try {
      const formData = new FormData();
      formData.append('file', file);

      const result = await apiFetch<{ secureUrl: string }>('/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (result?.secureUrl) {
        setForm((prev) => ({ ...prev, avatar: result.secureUrl }));
        setSuccessBanner('Photo uploaded successfully! Remember to save your profile changes.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to upload photo.';
      setErrors((prev) => ({ ...prev, avatar: msg }));
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Remove avatar photo
  const handleRemoveAvatar = () => {
    setForm((prev) => ({ ...prev, avatar: '' }));
    setErrors((prev) => ({ ...prev, avatar: undefined }));
  };

  // Submit profile settings
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile) return;

    if (!validateForm()) {
      setErrorBanner('Please resolve the errors highlighted below before saving.');
      return;
    }

    setSaving(true);
    setErrorBanner(null);
    setSuccessBanner(null);

    try {
      const updated = await apiFetch<HostProfile>('/host/profile', {
        method: 'PUT',
        body: JSON.stringify({
          displayName: form.displayName.trim(),
          phone: form.phone.trim() || null,
          bio: form.bio.trim() || null,
          avatar: form.avatar.trim() || null,
        }),
      });

      syncProfileToForm(updated);
      await refreshUser();
      setSuccessBanner('Your host profile has been updated successfully.');
    } catch (err) {
      setErrorBanner(
        err instanceof Error ? err.message : 'Unable to update your host profile.',
      );
    } finally {
      setSaving(false);
    }
  };

  // Handle changing document type
  const handleDocTypeChange = (type: HostDocType) => {
    setKycDocType(type);
    setFaydaError(null);
    setFaydaResult(null);
    if (type === 'ETHIOPIAN_FAYDA_ID') {
      setKycIssuingAuthority('National ID Program (NIDP)');
    } else if (type === 'ETHIOPIAN_KEBELE_ID') {
      setKycIssuingAuthority('Woreda Administration / Kebele Office');
    } else if (type === 'ETHIOPIAN_PASSPORT') {
      setKycIssuingAuthority('Immigration and Citizenship Service (ICS)');
    } else if (type === 'ETHIOPIAN_DRIVERS_LICENSE') {
      setKycIssuingAuthority('Federal Transport Authority');
    }
  };

  // Handle uploading document photo
  const handleDocFileUpload = async (file: File, side: 'front' | 'back') => {
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setErrorBanner('Document image must be a JPEG, PNG, or WebP file.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setErrorBanner('Document file size must be less than 8MB.');
      return;
    }
    if (side === 'front') setUploadingDocFront(true);
    else setUploadingDocBack(true);
    setErrorBanner(null);

    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiFetch<{ secureUrl: string }>('/upload/image', {
        method: 'POST',
        body: fd,
      });
      if (res?.secureUrl) {
        if (side === 'front') setKycFrontUrl(res.secureUrl);
        else setKycBackUrl(res.secureUrl);
        setSuccessBanner(`${side === 'front' ? 'Front side' : 'Back side'} document uploaded successfully.`);
      }
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : 'Failed to upload document image.');
    } finally {
      if (side === 'front') setUploadingDocFront(false);
      else setUploadingDocBack(false);
    }
  };

  // Instant Fayda digital lookup via NIDP
  const handleFaydaLookup = async () => {
    const cleanDigits = kycDocNumber.replace(/\D/g, '');
    if (cleanDigits.length !== 12 && cleanDigits.length !== 16) {
      setFaydaError('Please provide a valid 12-digit FIN (e.g. 1029 3847 5610) or 16-digit FAN.');
      return;
    }
    setIsLookingUpFayda(true);
    setFaydaError(null);
    try {
      const res = await apiFetch<{
        fin: string;
        fan?: string;
        fullName?: string;
        fullNameAmharic?: string;
        dateOfBirth?: string;
        gender?: string;
        nationality?: string;
        region?: string;
        city?: string;
        subCity?: string;
        woreda?: string;
        status: string;
        verificationToken: string;
        verifiedAt: string;
        provider: string;
      }>('/host/verification/fayda/lookup', {
        method: 'POST',
        body: JSON.stringify({
          faydaNumber: cleanDigits,
          fullName: form.displayName.trim() || undefined,
          phone: form.phone.trim() || undefined,
        }),
      });
      setFaydaResult(res);
      if (res.fullName && !form.displayName.trim()) {
        setForm((prev) => ({ ...prev, displayName: res.fullName! }));
      }
      setSuccessBanner('National Fayda digital record verified successfully!');
    } catch (err: unknown) {
      setFaydaError(err instanceof Error ? err.message : 'Fayda ID verification failed.');
    } finally {
      setIsLookingUpFayda(false);
    }
  };

  // Request verification transition (UNVERIFIED or REJECTED -> PENDING) with KYC payload
  const handleRequestVerification = async () => {
    if (!profile) return;

    // Pre-flight check
    const trimmedName = form.displayName.trim();
    const trimmedPhone = form.phone.trim();
    if (!trimmedName || !trimmedPhone) {
      setErrorBanner(
        'Both Display Name and Contact Phone are required before submitting for verification.',
      );
      setErrors((prev) => ({
        ...prev,
        displayName: !trimmedName ? 'Display name is required for verification.' : prev.displayName,
        phone: !trimmedPhone ? 'Contact phone is required for verification.' : prev.phone,
      }));
      return;
    }

    if (!kycDocNumber.trim()) {
      setErrorBanner('Please enter your identity document number.');
      return;
    }

    if (kycDocType === 'ETHIOPIAN_FAYDA_ID') {
      const clean = kycDocNumber.replace(/\D/g, '');
      if (clean.length !== 12 && clean.length !== 16) {
        setErrorBanner('Fayda ID must be a 12-digit FIN (e.g. 1029 3847 5610) or 16-digit FAN.');
        return;
      }
    }

    setRequestingVerification(true);
    setErrorBanner(null);
    setSuccessBanner(null);

    try {
      // First save any unsaved profile changes
      await apiFetch<HostProfile>('/host/profile', {
        method: 'PUT',
        body: JSON.stringify({
          displayName: trimmedName,
          phone: trimmedPhone || null,
          bio: form.bio.trim() || null,
          avatar: form.avatar.trim() || null,
        }),
      });

      // Submit verification request with compliant KYC DTO
      const kycPayload = {
        documentType: kycDocType,
        issuingCountry: 'Ethiopia',
        documentNumber: kycDocNumber.trim(),
        issuingAuthority:
          kycIssuingAuthority.trim() ||
          (kycDocType === 'ETHIOPIAN_FAYDA_ID'
            ? 'National ID Program (NIDP)'
            : kycDocType === 'ETHIOPIAN_KEBELE_ID'
            ? 'Kebele Administration'
            : 'Government of Ethiopia'),
        expirationDate: kycExpirationDate.trim() || undefined,
        verificationProvider:
          kycDocType === 'ETHIOPIAN_FAYDA_ID' ? 'FAYDA_NIDP' : 'MANUAL_ADMIN_REVIEW',
        documentFrontUrl: kycFrontUrl.trim() || undefined,
        documentBackUrl: kycBackUrl.trim() || undefined,
      };

      const updatedProfile = await apiFetch<HostProfile>('/host/profile/request-verification', {
        method: 'POST',
        body: JSON.stringify(kycPayload),
      });

      syncProfileToForm(updatedProfile);
      await refreshUser();
      apiFetch<VerificationAuditInfo>('/host/verification/audit')
        .then(setVerificationAudit)
        .catch(() => {});

      setSuccessBanner(
        'Identity verification request submitted successfully! Your credentials are now under review by the ENGIDA compliance team.',
      );
    } catch (err) {
      setErrorBanner(
        err instanceof Error ? err.message : 'Failed to submit verification request.',
      );
    } finally {
      setRequestingVerification(false);
    }
  };

  // Helper for status badge styling
  const getStatusBadge = (status: HostVerificationStatus) => {
    switch (status) {
      case 'VERIFIED':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          icon: <BadgeCheck className="w-4 h-4 text-emerald-600" />,
          label: 'Verified Host',
        };
      case 'PENDING':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          icon: <Clock className="w-4 h-4 text-amber-600" />,
          label: 'Verification Pending Review',
        };
      case 'REJECTED':
        return {
          bg: 'bg-rose-50 text-rose-800 border-rose-200',
          icon: <AlertTriangle className="w-4 h-4 text-rose-600" />,
          label: 'Verification Rejected',
        };
      case 'UNVERIFIED':
      default:
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: <ShieldCheck className="w-4 h-4 text-slate-500" />,
          label: 'Unverified Host',
        };
    }
  };

  // Initials for avatar fallback
  const getInitials = () => {
    const source = form.displayName.trim() || profile?.user?.name || authUser?.name || 'Host';
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return source.slice(0, 2).toUpperCase();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-5xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E0D5]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF3EF] text-[#234B36] border border-[#E5E0D5] text-xs font-black uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Host Account & Identity</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#252923] tracking-tight">
            Host Profile & Verification Settings
          </h1>
          <p className="text-xs sm:text-sm text-[#73776F] font-medium mt-1">
            Manage your public host identity, hospitality story, and check your trust & verification status.
          </p>
        </div>

        {profile && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {(() => {
              const badge = getStatusBadge(profile.verificationStatus);
              return (
                <div
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold border ${badge.bg}`}
                >
                  {badge.icon}
                  <span>{badge.label}</span>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Notifications */}
      {errorBanner && (
        <div
          role="alert"
          className="flex items-start gap-3 p-4 rounded-2xl border border-red-200 bg-red-50 text-red-800 text-xs sm:text-sm font-medium animate-in fade-in"
        >
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Error</p>
            <p className="mt-0.5">{errorBanner}</p>
          </div>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            className="text-red-500 hover:text-red-800 font-bold text-xs cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {successBanner && (
        <div
          role="status"
          className="flex items-start gap-3 p-4 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs sm:text-sm font-medium animate-in fade-in"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Success</p>
            <p className="mt-0.5">{successBanner}</p>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-600 hover:text-emerald-900 font-bold text-xs cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-[#E5E0D5] bg-white p-12 text-center text-[#73776F] text-sm">
          <RotateCcw className="w-6 h-6 animate-spin mx-auto text-[#234B36] mb-3" />
          Loading your host profile and verification details...
        </div>
      ) : profile ? (
        <div className="space-y-8">
          {/* Post-Onboarding Welcome & Continuity Notice */}
          {onboardingNotice && (
            <div
              role="region"
              aria-label="Host onboarding confirmation"
              className="flex items-start gap-3.5 p-4 sm:p-5 rounded-2xl border border-[#234B36]/30 bg-[#EEF3EF] text-[#252923] shadow-xs animate-in fade-in"
            >
              <div className="w-9 h-9 rounded-xl bg-[#234B36]/15 text-[#234B36] flex items-center justify-center shrink-0 mt-0.5 border border-[#234B36]/20">
                <Sparkles className="w-5 h-5 text-[#234B36]" />
              </div>
              <div className="flex-1 space-y-1">
                <h2 className="text-sm font-bold text-[#252923]">
                  Welcome to ENGIDA Hosting!
                </h2>
                <p className="text-xs text-[#73776F] leading-relaxed">
                  Your host profile has been created with initial status <span className="font-extrabold uppercase px-1.5 py-0.5 rounded bg-[#234B36]/10 text-[#234B36]">UNVERIFIED</span>. You can start drafting properties and setting your availability immediately. To display the official Verified Host badge on public listings, review your details below and click <strong>Submit for Verification Review</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOnboardingNotice(false)}
                className="text-[#234B36] hover:text-[#2D5E43] text-xs font-bold shrink-0 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Card 1: Identity & Business Verification Hub */}
          <section className="rounded-2xl border border-[#E5E0D5] bg-white p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#EEF3EF]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EEF3EF] text-[#234B36] flex items-center justify-center shrink-0 border border-[#E5E0D5]">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-[#252923] flex items-center gap-2">
                    <span>Identity & Trust Verification</span>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        getStatusBadge(profile.verificationStatus).bg
                      }`}
                    >
                      {profile.verificationStatus}
                    </span>
                  </h2>
                  <p className="text-xs text-[#73776F]">
                    Verified hosts gain prominent badges on published listings and increase guest reservation confidence.
                  </p>
                </div>
              </div>
            </div>

            {/* Dynamic Status Display & Actions */}
            {profile.verificationStatus === 'VERIFIED' && (
              <div className="p-6 rounded-2xl border border-emerald-200 bg-emerald-50/70 space-y-4">
                <div className="flex items-center gap-2.5">
                  <BadgeCheck className="w-6 h-6 text-emerald-600" />
                  <div>
                    <h3 className="text-sm font-black text-emerald-950">
                      Host Identity Fully Verified
                    </h3>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      Your identity credentials have been confirmed by ENGIDA trust &amp; safety. Your listings feature the official Verified Host badge.
                    </p>
                  </div>
                </div>

                {verificationAudit && (
                  <div className="bg-white/80 border border-emerald-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">
                        Verified Credential
                      </span>
                      <span className="font-extrabold text-[#252923]">
                        {verificationAudit.documentType?.replace(/_/g, ' ') || 'National Identity ID'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">
                        Document Number
                      </span>
                      <span className="font-mono font-bold text-[#252923]">
                        {verificationAudit.documentNumberMasked || '•••• •••• ••••'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">
                        Trust Score Impact
                      </span>
                      <span className="font-black text-emerald-700">
                        +35 pts (Maximum KYC Tier)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {profile.verificationStatus === 'PENDING' && (
              <div className="p-6 rounded-2xl border border-amber-200 bg-amber-50/80 space-y-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-6 h-6 text-amber-600 animate-pulse shrink-0" />
                  <div>
                    <h3 className="text-sm font-black text-amber-950">
                      Verification Request Under Administrative Review
                    </h3>
                    <p className="text-xs text-amber-800 mt-0.5">
                      Your identity dossier has been received and is queued for verification review by the ENGIDA compliance team.
                    </p>
                  </div>
                </div>

                {verificationAudit && (
                  <div className="bg-white border border-amber-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-[#73776F] uppercase tracking-wider block">
                        Submitted Document
                      </span>
                      <span className="font-bold text-[#252923]">
                        {verificationAudit.documentType?.replace(/_/g, ' ') || 'National ID'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-[#73776F] uppercase tracking-wider block">
                        Document Mask
                      </span>
                      <span className="font-mono font-bold text-[#252923]">
                        {verificationAudit.documentNumberMasked || '•••• •••• ••••'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-[#73776F] uppercase tracking-wider block">
                        Status
                      </span>
                      <span className="font-black text-amber-700 uppercase">
                        Queued for Approval
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {(profile.verificationStatus === 'UNVERIFIED' || profile.verificationStatus === 'REJECTED') && (
              <div className="space-y-6">
                {profile.verificationStatus === 'REJECTED' && (
                  <div className="p-5 rounded-2xl border border-rose-200 bg-rose-50/80 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <AlertTriangle className="w-5 h-5 text-rose-600" />
                      <h3 className="text-sm font-black text-rose-950">
                        Previous Verification Submission Was Not Approved
                      </h3>
                    </div>
                    {profile.rejectionReason && (
                      <div className="p-3 rounded-xl bg-white border border-rose-200 text-xs text-rose-900">
                        <span className="font-bold">Compliance Team Feedback: </span>
                        <span>{profile.rejectionReason}</span>
                      </div>
                    )}
                    <p className="text-xs text-rose-800">
                      Please update your identity document details below and submit a refreshed dossier for compliance re-evaluation.
                    </p>
                  </div>
                )}

                {/* KYC Interactive Submission Card */}
                <div className="p-6 sm:p-7 rounded-2xl border border-[#E5E0D5] bg-[#F8F5ED] space-y-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#234B36]/10 text-[#234B36] text-[10px] font-black uppercase tracking-wider mb-1.5">
                        <Sparkles className="w-3 h-3" />
                        <span>Proposal Section 3.2 Compliance</span>
                      </div>
                      <h3 className="text-base font-black text-[#252923]">
                        Submit National Identity Credentials for Host Verification
                      </h3>
                      <p className="text-xs text-[#73776F] mt-0.5">
                        Ethiopian regulatory and ENGIDA platform compliance requires host identity validation before listings can achieve highest trust ranking.
                      </p>
                    </div>
                  </div>

                  {/* 1. Document Type Selector */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-[#252923] uppercase tracking-wider">
                      1. Select Identity Credential Type <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                      {[
                        {
                          type: 'ETHIOPIAN_FAYDA_ID' as HostDocType,
                          label: 'Fayda National ID',
                          amharic: 'ዲጂታል ፋይዳ',
                          hint: '12-digit FIN / 16-digit FAN with instant digital lookup',
                          icon: Sparkles,
                        },
                        {
                          type: 'ETHIOPIAN_KEBELE_ID' as HostDocType,
                          label: 'Kebele Resident ID',
                          amharic: 'የነዋሪነት መታወቂያ',
                          hint: 'Woreda / Kebele issued resident card',
                          icon: CreditCard,
                        },
                        {
                          type: 'ETHIOPIAN_PASSPORT' as HostDocType,
                          label: 'Ethiopian Passport',
                          amharic: 'የኢትዮጵያ ፓስፖርት',
                          hint: 'Immigration & Citizenship Service (ICS)',
                          icon: FileText,
                        },
                        {
                          type: 'ETHIOPIAN_DRIVERS_LICENSE' as HostDocType,
                          label: "Driver's License",
                          amharic: 'የመንጃ ፍቃድ',
                          hint: 'Federal Transport Authority license',
                          icon: CreditCard,
                        },
                      ].map((item) => {
                        const Icon = item.icon;
                        const isSelected = kycDocType === item.type;
                        return (
                          <button
                            key={item.type}
                            type="button"
                            onClick={() => handleDocTypeChange(item.type)}
                            className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                              isSelected
                                ? 'border-[#234B36] bg-[#234B36]/5 ring-2 ring-[#234B36]/20'
                                : 'border-[#E5E0D5] bg-white hover:bg-[#EEF3EF]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="text-xs font-black text-[#252923]">{item.label}</span>
                              <Icon className={`w-4 h-4 ${isSelected ? 'text-[#234B36]' : 'text-[#73776F]'}`} />
                            </div>
                            <span className="text-[11px] font-bold text-[#234B36] block">{item.amharic}</span>
                            <span className="text-[10px] text-[#73776F] mt-1 block leading-snug">{item.hint}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Document Number & Fayda Live Verification */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="kycDocNumber" className="block text-xs font-bold text-[#252923]">
                        {kycDocType === 'ETHIOPIAN_FAYDA_ID'
                          ? 'Fayda Identification Number (FIN / FAN)'
                          : 'Document Number'}{' '}
                        <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="kycDocNumber"
                          type="text"
                          value={kycDocNumber}
                          onChange={(e) => setKycDocNumber(e.target.value)}
                          placeholder={
                            kycDocType === 'ETHIOPIAN_FAYDA_ID'
                              ? 'e.g. 1029 3847 5610'
                              : 'e.g. KB-2024-98471'
                          }
                          className="flex-1 px-4 py-2.5 rounded-xl border border-[#E5E0D5] text-sm font-semibold text-[#252923] bg-white focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36] transition"
                        />
                        {kycDocType === 'ETHIOPIAN_FAYDA_ID' && (
                          <button
                            type="button"
                            onClick={handleFaydaLookup}
                            disabled={isLookingUpFayda || !kycDocNumber.trim()}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#234B36] text-white text-xs font-bold hover:bg-[#2D5E43] disabled:opacity-50 transition cursor-pointer shrink-0"
                            title="Perform digital extraction via National ID Program"
                          >
                            {isLookingUpFayda ? (
                              <>
                                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                                <span>Verifying...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Verify Fayda</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      {faydaError && (
                        <p className="text-xs text-rose-600 font-semibold">{faydaError}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="kycIssuingAuthority" className="block text-xs font-bold text-[#252923]">
                        Issuing Authority
                      </label>
                      <input
                        id="kycIssuingAuthority"
                        type="text"
                        value={kycIssuingAuthority}
                        onChange={(e) => setKycIssuingAuthority(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-[#E5E0D5] text-sm font-medium text-[#252923] bg-white focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36] transition"
                      />
                    </div>
                  </div>

                  {/* Fayda Verified Demographics Display */}
                  {faydaResult && (
                    <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/90 space-y-2.5 text-xs animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span className="font-black text-emerald-950">
                            Fayda Digital Record Authenticated (NIDP Verified)
                          </span>
                        </div>
                        <span className="font-mono text-[10px] text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
                          {faydaResult.verificationToken}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[#252923]">
                        <div>
                          <span className="text-[10px] text-emerald-800 block">Full Legal Name</span>
                          <span className="font-bold">{faydaResult.fullName || 'Verified Citizen'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-emerald-800 block">Amharic Name</span>
                          <span className="font-bold">{faydaResult.fullNameAmharic || 'የተረጋገጠ ዜጋ'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-emerald-800 block">Registered Region</span>
                          <span className="font-bold">{faydaResult.region || 'Addis Ababa'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-emerald-800 block">Sub-city / Woreda</span>
                          <span className="font-bold">{[faydaResult.city, faydaResult.subCity].filter(Boolean).join(' · ')}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. Document Scan / Photo Uploads */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-[#252923] uppercase tracking-wider">
                      2. Document Image Scans <span className="text-xs font-normal text-[#73776F]">(Front &amp; Back)</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Front Side */}
                      <div className="p-4 rounded-xl border border-[#E5E0D5] bg-white space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#252923]">Front Side Scan</span>
                          {kycFrontUrl ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                              <Check className="w-3 h-3" /> Uploaded
                            </span>
                          ) : (
                            <span className="text-[10px] text-red-600 font-semibold">Required</span>
                          )}
                        </div>

                        {kycFrontUrl ? (
                          <div className="relative h-28 rounded-lg overflow-hidden border border-[#E5E0D5] bg-slate-50 group">
                            <img src={kycFrontUrl} alt="Doc Front" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => docFrontInputRef.current?.click()}
                                className="px-2.5 py-1 rounded bg-white text-xs font-bold text-[#252923] cursor-pointer"
                              >
                                Replace
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => docFrontInputRef.current?.click()}
                            disabled={uploadingDocFront}
                            className="w-full h-28 rounded-lg border-2 border-dashed border-[#E5E0D5] hover:border-[#234B36] bg-[#F8F5ED]/50 flex flex-col items-center justify-center gap-1.5 text-xs text-[#73776F] hover:text-[#234B36] transition cursor-pointer"
                          >
                            {uploadingDocFront ? (
                              <RotateCcw className="w-5 h-5 animate-spin text-[#234B36]" />
                            ) : (
                              <>
                                <UploadCloud className="w-5 h-5 text-[#234B36]" />
                                <span className="font-bold">Upload Front of ID</span>
                                <span className="text-[10px] text-[#73776F]">PNG, JPEG up to 8MB</span>
                              </>
                            )}
                          </button>
                        )}
                        <input
                          ref={docFrontInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleDocFileUpload(file, 'front');
                            e.target.value = '';
                          }}
                        />
                      </div>

                      {/* Back Side */}
                      <div className="p-4 rounded-xl border border-[#E5E0D5] bg-white space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#252923]">Back Side Scan</span>
                          {kycBackUrl ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                              <Check className="w-3 h-3" /> Uploaded
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#73776F]">Optional for Passport</span>
                          )}
                        </div>

                        {kycBackUrl ? (
                          <div className="relative h-28 rounded-lg overflow-hidden border border-[#E5E0D5] bg-slate-50 group">
                            <img src={kycBackUrl} alt="Doc Back" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => docBackInputRef.current?.click()}
                                className="px-2.5 py-1 rounded bg-white text-xs font-bold text-[#252923] cursor-pointer"
                              >
                                Replace
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => docBackInputRef.current?.click()}
                            disabled={uploadingDocBack}
                            className="w-full h-28 rounded-lg border-2 border-dashed border-[#E5E0D5] hover:border-[#234B36] bg-[#F8F5ED]/50 flex flex-col items-center justify-center gap-1.5 text-xs text-[#73776F] hover:text-[#234B36] transition cursor-pointer"
                          >
                            {uploadingDocBack ? (
                              <RotateCcw className="w-5 h-5 animate-spin text-[#234B36]" />
                            ) : (
                              <>
                                <UploadCloud className="w-5 h-5 text-[#234B36]" />
                                <span className="font-bold">Upload Back of ID</span>
                                <span className="text-[10px] text-[#73776F]">PNG, JPEG up to 8MB</span>
                              </>
                            )}
                          </button>
                        )}
                        <input
                          ref={docBackInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleDocFileUpload(file, 'back');
                            e.target.value = '';
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submission Action */}
                  <div className="pt-2 border-t border-[#E5E0D5] flex items-center justify-between gap-4">
                    <p className="text-[11px] text-[#73776F] max-w-md">
                      Submitting your document transitions your profile status to <strong>PENDING</strong> for administrator verification review.
                    </p>
                    <button
                      type="button"
                      disabled={requestingVerification || saving || !kycDocNumber.trim()}
                      onClick={handleRequestVerification}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#234B36] hover:bg-[#2D5E43] active:bg-[#1A3828] text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {requestingVerification ? (
                        <>
                          <RotateCcw className="w-4 h-4 animate-spin" />
                          <span>Submitting Credentials...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          <span>Submit Credentials for Review</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Truthful Infrastructure Disclosure (as requested in Step 5J prompt) */}
            <div className="flex items-start gap-3 p-4 rounded-xl border border-[#E5E0D5] bg-[#EEF3EF]/50 text-[11px] text-[#73776F]">
              <Info className="w-4 h-4 text-[#234B36] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-[#252923]">
                  Administrative Review Workflow &amp; Document Infrastructure Note
                </p>
                <p>
                  ENGIDA encrypts and stores national identity documents in restricted storage accessible only to compliance administrators. Host verification requests are reviewed and approved administratively in accordance with Ethiopian cybersecurity standards. Hosts cannot self-verify.
                </p>
              </div>
            </div>
          </section>

          {/* Card 2: Public Host Identity & Profile Settings */}
          <form onSubmit={handleSubmit} className="space-y-8">
            <section className="rounded-2xl border border-[#E5E0D5] bg-white p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-[#EEF3EF]">
                <div className="w-10 h-10 rounded-xl bg-[#EEF3EF] text-[#234B36] flex items-center justify-center shrink-0 border border-[#E5E0D5]">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-[#252923]">Public Host Profile</h2>
                  <p className="text-xs text-[#73776F]">
                    This information is displayed on your published listings and visible to prospective guests.
                  </p>
                </div>
              </div>

              {/* Profile Photo / Avatar Section */}
              <div className="p-5 rounded-2xl bg-[#F8F5ED] border border-[#E5E0D5] space-y-4">
                <label className="block text-xs font-bold text-[#252923] uppercase tracking-wider">
                  Host Profile Photo
                </label>

                <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                  {/* Avatar Visual Preview */}
                  <div className="relative shrink-0">
                    <div className="w-24 h-24 rounded-2xl border-2 border-[#E5E0D5] bg-gradient-to-br from-[#234B36] to-[#1A3828] text-white flex items-center justify-center text-2xl font-black shadow-inner overflow-hidden">
                      {form.avatar ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={form.avatar}
                          alt="Host Avatar"
                          className="w-full h-full object-cover"
                          onError={() => {
                            setErrors((prev) => ({
                              ...prev,
                              avatar: 'Failed to load avatar from URL. Image may be broken.',
                            }));
                          }}
                        />
                      ) : (
                        <span>{getInitials()}</span>
                      )}
                    </div>

                    {uploadingAvatar && (
                      <div className="absolute inset-0 rounded-2xl bg-black/50 backdrop-blur-xs flex items-center justify-center text-white">
                        <RotateCcw className="w-6 h-6 animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Avatar Actions */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleAvatarFileChange}
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                      />

                      <button
                        type="button"
                        disabled={uploadingAvatar || saving}
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#E5E0D5] hover:bg-[#EEF3EF] text-[#252923] text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50"
                      >
                        <Camera className="w-4 h-4 text-[#234B36]" />
                        <span>{uploadingAvatar ? 'Uploading...' : 'Upload Photo'}</span>
                      </button>

                      {form.avatar && (
                        <button
                          type="button"
                          disabled={uploadingAvatar || saving}
                          onClick={handleRemoveAvatar}
                          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    <p className="text-[11px] text-[#73776F]">
                      Upload a friendly photo of yourself (JPEG, PNG, or WebP up to 5MB). Direct image URLs are also supported.
                    </p>

                    {/* Direct URL input fallback */}
                    <div className="pt-1">
                      <input
                        type="url"
                        value={form.avatar}
                        onChange={(e) => {
                          setForm((prev) => ({ ...prev, avatar: e.target.value }));
                          setErrors((prev) => ({ ...prev, avatar: undefined }));
                        }}
                        placeholder="Or enter direct image URL (https://...)"
                        className={`w-full rounded-xl border bg-white px-3.5 py-2 text-xs text-[#252923] placeholder-[#73776F]/50 focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36] ${
                          errors.avatar ? 'border-red-300' : 'border-[#E5E0D5]'
                        }`}
                      />
                    </div>

                    {errors.avatar && (
                      <p className="text-xs text-red-600 font-semibold">{errors.avatar}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Read-only Legal Account Information */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-[#F8F5ED] border border-[#E5E0D5]/60 text-xs">
                <div className="flex items-center gap-2.5">
                  <UserIcon className="w-4 h-4 text-[#73776F] shrink-0" />
                  <div>
                    <span className="block text-[10px] font-bold text-[#73776F] uppercase">
                      Legal Account Name
                    </span>
                    <span className="font-bold text-[#252923]">
                      {profile.user?.name || authUser?.name || 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-[#73776F] shrink-0" />
                  <div>
                    <span className="block text-[10px] font-bold text-[#73776F] uppercase">
                      Account Email
                    </span>
                    <span className="font-bold text-[#252923] truncate max-w-[180px] block">
                      {profile.user?.email || authUser?.email || 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-[#73776F] shrink-0" />
                  <div>
                    <span className="block text-[10px] font-bold text-[#73776F] uppercase">
                      Host Since
                    </span>
                    <span className="font-bold text-[#252923]">
                      {profile.createdAt ? formatDate(profile.createdAt) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Editable Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Display Name */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label
                      htmlFor="displayName"
                      className="block text-xs font-bold text-[#252923] uppercase tracking-wider"
                    >
                      Host Display Name *
                    </label>
                    <span className="text-[10px] font-bold text-[#73776F]">
                      Public to guests
                    </span>
                  </div>
                  <input
                    id="displayName"
                    type="text"
                    required
                    minLength={2}
                    maxLength={100}
                    value={form.displayName}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, displayName: e.target.value }));
                      if (errors.displayName) {
                        setErrors((prev) => ({ ...prev, displayName: undefined }));
                      }
                    }}
                    placeholder="e.g. Almaz Hospitality"
                    className={`w-full rounded-xl border px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#252923] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 ${
                      errors.displayName
                        ? 'border-red-300 focus:border-red-500'
                        : 'border-[#E5E0D5] focus:border-[#234B36]'
                    }`}
                  />
                  {errors.displayName && (
                    <p className="mt-1 text-xs text-red-600 font-semibold">
                      {errors.displayName}
                    </p>
                  )}
                </div>

                {/* Phone Number */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label
                      htmlFor="phone"
                      className="block text-xs font-bold text-[#252923] uppercase tracking-wider"
                    >
                      Contact Phone Number
                    </label>
                    <span className="text-[10px] font-bold text-[#73776F]">
                      Required for verification
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      id="phone"
                      type="tel"
                      maxLength={50}
                      value={form.phone}
                      onChange={(e) => {
                        setForm((prev) => ({ ...prev, phone: e.target.value }));
                        if (errors.phone) {
                          setErrors((prev) => ({ ...prev, phone: undefined }));
                        }
                      }}
                      placeholder="+251 91 123 4567"
                      className={`w-full rounded-xl border pl-10 pr-4 py-2.5 text-xs sm:text-sm font-semibold text-[#252923] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 ${
                        errors.phone
                          ? 'border-red-300 focus:border-red-500'
                          : 'border-[#E5E0D5] focus:border-[#234B36]'
                      }`}
                    />
                    <Phone className="w-4 h-4 text-[#73776F] absolute left-3.5 top-3" />
                  </div>
                  {errors.phone && (
                    <p className="mt-1 text-xs text-red-600 font-semibold">{errors.phone}</p>
                  )}
                </div>

                {/* Host Bio */}
                <div className="md:col-span-2">
                  <div className="flex justify-between items-center mb-1.5">
                    <label
                      htmlFor="bio"
                      className="block text-xs font-bold text-[#252923] uppercase tracking-wider"
                    >
                      Host Biography &amp; Hospitality Story
                    </label>
                    <span
                      className={`text-[11px] font-bold ${
                        form.bio.length > 450 ? 'text-amber-600' : 'text-[#73776F]'
                      }`}
                    >
                      {form.bio.length} / 500 characters
                    </span>
                  </div>
                  <textarea
                    id="bio"
                    rows={4}
                    maxLength={500}
                    value={form.bio}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, bio: e.target.value }));
                      if (errors.bio) {
                        setErrors((prev) => ({ ...prev, bio: undefined }));
                      }
                    }}
                    placeholder="Tell guests about your background, hosting hospitality, neighborhood tips, and what makes your stays in Ethiopia special..."
                    className={`w-full rounded-xl border px-4 py-2.5 text-xs sm:text-sm text-[#252923] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 resize-y ${
                      errors.bio
                        ? 'border-red-300 focus:border-red-500'
                        : 'border-[#E5E0D5] focus:border-[#234B36]'
                    }`}
                  />
                  {errors.bio && (
                    <p className="mt-1 text-xs text-red-600 font-semibold">{errors.bio}</p>
                  )}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-[#EEF3EF]">
                <button
                  type="button"
                  disabled={saving || uploadingAvatar}
                  onClick={() => profile && syncProfileToForm(profile)}
                  className="px-5 py-2.5 rounded-xl border border-[#E5E0D5] bg-white hover:bg-[#EEF3EF] text-xs sm:text-sm font-bold text-[#252923] transition cursor-pointer disabled:opacity-50"
                >
                  Reset Changes
                </button>
                <button
                  type="submit"
                  disabled={saving || uploadingAvatar}
                  className="px-6 py-2.5 rounded-xl bg-[#234B36] hover:bg-[#2D5E43] active:bg-[#1A3828] text-white text-xs sm:text-sm font-bold transition shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Save Profile Changes</span>
                    </>
                  )}
                </button>
              </div>
            </section>
          </form>

          {/* Card 3: Payout & Financial Settlement Information (Truthful Status per Step 5J prompt) */}
          <section className="rounded-2xl border border-[#E5E0D5] bg-white p-6 sm:p-8 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#EEF3EF]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-50 to-teal-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-[#252923] flex items-center gap-2">
                    <span>Payout &amp; Settlement Information</span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#EEF3EF] text-[#73776F] border border-[#E5E0D5]">
                      Disbursement Policy
                    </span>
                  </h2>
                  <p className="text-xs text-[#73776F]">
                    How rental earnings are collected, secured, and disbursed for your properties.
                  </p>
                </div>
              </div>

              <Link
                href="/host/earnings"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#234B36] hover:text-[#2D5E43] hover:underline self-start sm:self-auto"
              >
                <span>View Earnings Summary</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-5 rounded-2xl bg-[#F8F5ED] border border-[#E5E0D5] space-y-3">
              <div className="flex items-center gap-2 text-xs font-black text-[#252923] uppercase tracking-wider">
                <Info className="w-4 h-4 text-[#234B36]" />
                <span>Automated Direct Payouts Currently Unsupported</span>
              </div>
              <p className="text-xs text-[#73776F] leading-relaxed">
                As detailed on the host earnings dashboard, automated bank transfers and direct mobile-money wallet payouts (Telebirr / CBE Birr) are currently unsupported in this release. All guest payments are safely collected and escrowed via Chapa according to platform reservation policies.
              </p>
              <p className="text-xs text-[#73776F] leading-relaxed">
                To protect your financial security, ENGIDA does not collect, store, or solicit unencrypted bank account numbers or mobile-money PINs on this page. Settlement schedules and administrative disbursements will be coordinated with verified hosts directly.
              </p>
            </div>
          </section>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#E5E0D5] bg-white p-10 text-center max-w-md mx-auto">
          <Building2 className="w-12 h-12 text-[#73776F]/60 mx-auto mb-4" />
          <h2 className="text-lg font-black text-[#252923]">Host Profile Unavailable</h2>
          <p className="mt-2 text-xs sm:text-sm text-[#73776F]">
            We could not load the host profile connected to your account.
          </p>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="mt-6 px-5 py-2.5 rounded-xl bg-[#234B36] hover:bg-[#2D5E43] active:bg-[#1A3828] text-white text-xs font-bold transition cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
