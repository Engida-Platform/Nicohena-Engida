'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  FileText,
  HelpCircle,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  AlertCircle,
  Check,
} from 'lucide-react';
import { apiFetch } from '../../../lib/api';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import AdminDialog from '../../../components/admin/AdminDialog';
import AdminNoAccess from '../../../components/admin/AdminNoAccess';
import { useAuth } from '../../../context/AuthContext';
import { can, ADMIN_PERMISSIONS } from '../../../types/admin';
import {
  ContentBlockRecord,
  FaqCategory,
  FaqItemRecord,
} from '../../../types/admin-growth';

type ContentTab = 'faqs' | 'policies';

export default function AdminContentPage() {
  const { user } = useAuth();
  const canManage = can(user?.permissions, ADMIN_PERMISSIONS.CONTENT_MANAGE);

  const [activeTab, setActiveTab] = useState<ContentTab>('faqs');
  const [faqs, setFaqs] = useState<FaqItemRecord[]>([]);
  const [blocks, setBlocks] = useState<ContentBlockRecord[]>([]);
  const [faqCategories, setFaqCategories] = useState<FaqCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // FAQ Modal
  const [faqModalOpen, setFaqModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FaqItemRecord | null>(null);
  const [faqForm, setFaqForm] = useState({
    category: 'GENERAL' as FaqCategory,
    question: '',
    questionAmharic: '',
    answer: '',
    answerAmharic: '',
    displayOrder: 0,
    isPublished: true,
  });

  // Content Block Modal
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<ContentBlockRecord | null>(null);
  const [blockForm, setBlockForm] = useState({
    slug: '',
    title: '',
    content: '',
    metaDescription: '',
    isPublished: true,
  });

  // Delete Confirmation Dialog
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'faq' | 'block';
    id: string;
    title: string;
  } | null>(null);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const loadContent = useCallback(async () => {
    if (!canManage) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const [faqData, blockData, categoryData] = await Promise.all([
        apiFetch<FaqItemRecord[]>('/admin/content/faqs'),
        apiFetch<ContentBlockRecord[]>('/admin/content/blocks'),
        apiFetch<FaqCategory[]>('/admin/content/faqs/categories').catch(() => [
          'GENERAL' as FaqCategory,
          'BOOKINGS' as FaqCategory,
          'HOSTING' as FaqCategory,
          'PAYMENTS' as FaqCategory,
          'LEGAL' as FaqCategory,
        ]),
      ]);
      setFaqs(faqData || []);
      setBlocks(blockData || []);
      setFaqCategories(categoryData || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load content items');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  // Save FAQ
  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setDialogError(null);
    try {
      const payload = {
        ...faqForm,
        question: faqForm.question.trim(),
        questionAmharic: faqForm.questionAmharic.trim() || undefined,
        answer: faqForm.answer.trim(),
        answerAmharic: faqForm.answerAmharic.trim() || undefined,
        displayOrder: Number(faqForm.displayOrder) || 0,
      };

      if (editingFaq) {
        await apiFetch(`/admin/content/faqs/${editingFaq.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/admin/content/faqs', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setFaqModalOpen(false);
      setEditingFaq(null);
      await loadContent();
    } catch (err: unknown) {
      setDialogError(err instanceof Error ? err.message : 'Error saving FAQ item');
    } finally {
      setSaving(false);
    }
  };

  // Save Content Block
  const handleSaveBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setDialogError(null);
    try {
      if (editingBlock) {
        // Strip slug from update payload so it satisfies backend DTO whitelist
        const { slug, ...payload } = blockForm;
        await apiFetch(`/admin/content/blocks/${editingBlock.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            ...payload,
            title: payload.title.trim(),
            content: payload.content.trim(),
            metaDescription: payload.metaDescription?.trim() || undefined,
          }),
        });
      } else {
        await apiFetch('/admin/content/blocks', {
          method: 'POST',
          body: JSON.stringify({
            ...blockForm,
            slug: blockForm.slug.trim().toLowerCase(),
            title: blockForm.title.trim(),
            content: blockForm.content.trim(),
            metaDescription: blockForm.metaDescription?.trim() || undefined,
          }),
        });
      }
      setBlockModalOpen(false);
      setEditingBlock(null);
      await loadContent();
    } catch (err: unknown) {
      setDialogError(err instanceof Error ? err.message : 'Failed to save content block');
    } finally {
      setSaving(false);
    }
  };

  // Delete Action Execution
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDialogError(null);
    try {
      if (deleteTarget.type === 'faq') {
        await apiFetch(`/admin/content/faqs/${deleteTarget.id}`, { method: 'DELETE' });
      } else {
        await apiFetch(`/admin/content/blocks/${deleteTarget.id}`, { method: 'DELETE' });
      }
      setDeleteTarget(null);
      await loadContent();
    } catch (err: unknown) {
      setDialogError(err instanceof Error ? err.message : 'Failed to delete item');
    } finally {
      setDeleting(false);
    }
  };

  if (!canManage) {
    return (
      <AdminNoAccess
        area="Content & CMS"
        required={[ADMIN_PERMISSIONS.CONTENT_MANAGE]}
        backHref="/admin"
        backLabel="Back to overview"
      />
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Content Management & Policies"
        description="Edit platform FAQs with bilingual support, publish legal policies, and manage public terms and disclaimers."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadContent()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#605850] bg-white border border-[#d8d0c8] rounded-lg hover:text-[#3a302a] hover:bg-[#faf5ee] transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {canManage && activeTab === 'faqs' && (
              <button
                onClick={() => {
                  setEditingFaq(null);
                  setDialogError(null);
                  setFaqForm({
                    category: faqCategories[0] || ('GENERAL' as FaqCategory),
                    question: '',
                    questionAmharic: '',
                    answer: '',
                    answerAmharic: '',
                    displayOrder: faqs.length + 1,
                    isPublished: true,
                  });
                  setFaqModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#b3541e] rounded-lg hover:bg-[#964215] transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Add FAQ Item
              </button>
            )}
            {canManage && activeTab === 'policies' && (
              <button
                onClick={() => {
                  setEditingBlock(null);
                  setDialogError(null);
                  setBlockForm({
                    slug: '',
                    title: '',
                    content: '',
                    metaDescription: '',
                    isPublished: true,
                  });
                  setBlockModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#b3541e] rounded-lg hover:bg-[#964215] transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Policy Document
              </button>
            )}
          </div>
        }
      />

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-[#d47070] bg-[#fdf2f2] p-4 text-xs font-semibold text-[#8c3c3c]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[#d8d0c8] gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('faqs')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'faqs'
              ? 'border-[#b3541e] text-[#b3541e]'
              : 'border-transparent text-[#605850] hover:text-[#3a302a]'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          Bilingual FAQs ({faqs.length})
        </button>
        <button
          onClick={() => setActiveTab('policies')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'policies'
              ? 'border-[#b3541e] text-[#b3541e]'
              : 'border-transparent text-[#605850] hover:text-[#3a302a]'
          }`}
        >
          <FileText className="w-4 h-4" />
          CMS Policies & Terms ({blocks.length})
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading && faqs.length === 0 && blocks.length === 0 && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-white border border-[#d8d0c8] rounded-xl p-5 shadow-xs animate-pulse space-y-2"
            >
              <div className="h-5 w-1/4 bg-[#f2ece4] rounded" />
              <div className="h-4 w-1/2 bg-[#f2ece4] rounded" />
              <div className="h-10 w-full bg-[#f2ece4] rounded" />
            </div>
          ))}
        </div>
      )}

      {/* ================= TAB 1: FAQS ================= */}
      {activeTab === 'faqs' && (
        <div className="space-y-6">
          {faqCategories.map((category) => {
            const categoryFaqs = faqs.filter((f) => f.category === category);
            if (categoryFaqs.length === 0) return null;

            return (
              <div key={category} className="space-y-3">
                <div className="flex items-center gap-2 border-b border-[#f2ece4] pb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-[#b3541e] bg-[#faf5ee] px-2.5 py-0.5 rounded border border-[#d8d0c8]">
                    {category}
                  </span>
                  <span className="text-xs font-semibold text-[#605850]">
                    ({categoryFaqs.length} {categoryFaqs.length === 1 ? 'item' : 'items'})
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categoryFaqs.map((faq) => (
                    <div
                      key={faq.id}
                      className="bg-white border border-[#d8d0c8] rounded-xl p-5 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="font-serif text-base font-bold text-[#3a302a] leading-snug">
                            {faq.question}
                          </h4>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full shrink-0 ${
                              faq.isPublished
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                            }`}
                          >
                            {faq.isPublished ? 'Published' : 'Draft'}
                          </span>
                        </div>

                        {faq.questionAmharic && (
                          <p className="mt-1 text-xs font-medium text-[#b3541e]">
                            {faq.questionAmharic}
                          </p>
                        )}

                        <p className="mt-3 text-xs text-[#605850] leading-relaxed line-clamp-3">
                          {faq.answer}
                        </p>

                        {faq.answerAmharic && (
                          <p className="mt-2 text-xs text-[#78706a] italic line-clamp-2">
                            {faq.answerAmharic}
                          </p>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#f2ece4] flex items-center justify-between text-xs text-[#605850]">
                        <span className="text-[10px] text-[#73776f]">
                          Order: {faq.displayOrder}
                        </span>
                        {canManage && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditingFaq(faq);
                                setDialogError(null);
                                setFaqForm({
                                  category: faq.category,
                                  question: faq.question,
                                  questionAmharic: faq.questionAmharic || '',
                                  answer: faq.answer,
                                  answerAmharic: faq.answerAmharic || '',
                                  displayOrder: faq.displayOrder,
                                  isPublished: faq.isPublished,
                                });
                                setFaqModalOpen(true);
                              }}
                              className="p-1 hover:text-[#b3541e] text-[#605850] transition-colors"
                              title="Edit FAQ"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                setDeleteTarget({
                                  type: 'faq',
                                  id: faq.id,
                                  title: faq.question,
                                })
                              }
                              className="p-1 hover:text-red-600 text-[#605850] transition-colors"
                              title="Delete FAQ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {!loading && faqs.length === 0 && (
            <div className="bg-white border border-[#d8d0c8] rounded-2xl p-12 text-center max-w-md mx-auto my-8">
              <HelpCircle className="w-10 h-10 text-[#605850] mx-auto mb-3" />
              <h3 className="font-serif text-lg font-bold text-[#3a302a]">No FAQ Items</h3>
              <p className="text-xs text-[#73776f] mt-1">
                Frequently asked questions for guests and hosts will be displayed here.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: POLICIES & TERMS ================= */}
      {activeTab === 'policies' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {blocks.map((block) => (
              <div
                key={block.id}
                className="bg-white border border-[#d8d0c8] rounded-xl p-5 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-[#605850] bg-[#faf5ee] border border-[#d8d0c8] px-2 py-0.5 rounded">
                      /{block.slug}
                    </span>
                    <span className="text-[10px] font-semibold text-[#605850]">
                      v{block.version}
                    </span>
                  </div>

                  <h3 className="font-serif text-lg font-bold text-[#3a302a] mt-3">
                    {block.title}
                  </h3>
                  {block.metaDescription && (
                    <p className="mt-1 text-xs text-[#605850] line-clamp-2">
                      {block.metaDescription}
                    </p>
                  )}

                  <div className="mt-3 p-3 bg-[#faf5ee] rounded-lg border border-[#f2ece4] text-[11px] font-mono text-[#605850] max-h-24 overflow-hidden">
                    {block.content.length > 160
                      ? `${block.content.slice(0, 160)}…`
                      : block.content}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#f2ece4] flex items-center justify-between text-xs text-[#605850]">
                  <span className="text-[11px]">
                    {block.isPublished && block.publishedAt
                      ? `Published ${new Date(block.publishedAt).toLocaleDateString()}`
                      : 'Draft (Unpublished)'}
                  </span>
                  <div className="flex items-center gap-2">
                    {canManage && (
                      <>
                        <button
                          onClick={() => {
                            setEditingBlock(block);
                            setDialogError(null);
                            setBlockForm({
                              slug: block.slug,
                              title: block.title,
                              content: block.content,
                              metaDescription: block.metaDescription || '',
                              isPublished: block.isPublished,
                            });
                            setBlockModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#b3541e] hover:underline"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() =>
                            setDeleteTarget({
                              type: 'block',
                              id: block.id,
                              title: block.title,
                            })
                          }
                          className="p-1 hover:text-red-600 text-[#605850] transition-colors"
                          title="Delete Document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!loading && blocks.length === 0 && (
            <div className="bg-white border border-[#d8d0c8] rounded-2xl p-12 text-center max-w-md mx-auto my-8">
              <FileText className="w-10 h-10 text-[#605850] mx-auto mb-3" />
              <h3 className="font-serif text-lg font-bold text-[#3a302a]">No Policy Documents</h3>
              <p className="text-xs text-[#73776f] mt-1">
                Create Terms of Service, Privacy Policies, or Guest Cancellation Guidelines.
              </p>
            </div>
          )}
        </div>
      )}

      {/* DIALOG 1: FAQ FORM */}
      <AdminDialog
        open={faqModalOpen}
        onClose={() => setFaqModalOpen(false)}
        title={editingFaq ? 'Edit FAQ Item' : 'Create FAQ Item'}
        description="Frequently asked questions with English and Amharic localizations."
        width="md"
      >
        <form onSubmit={handleSaveFaq} className="space-y-4 text-xs">
          {dialogError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg font-medium">
              {dialogError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-[#3a302a] block mb-1">
                Category
              </label>
              <select
                value={faqForm.category}
                onChange={(e) =>
                  setFaqForm({ ...faqForm, category: e.target.value as FaqCategory })
                }
                className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
              >
                {faqCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-semibold text-[#3a302a] block mb-1">
                Display Order
              </label>
              <input
                type="number"
                min="0"
                value={faqForm.displayOrder}
                onChange={(e) =>
                  setFaqForm({
                    ...faqForm,
                    displayOrder: parseInt(e.target.value, 10) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-[#3a302a] block mb-1">
              Question (English)
            </label>
            <input
              type="text"
              required
              value={faqForm.question}
              onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
              className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
            />
          </div>

          <div>
            <label className="font-semibold text-[#3a302a] block mb-1">
              Question (Amharic)
            </label>
            <input
              type="text"
              placeholder="ጥያቄውን በአማርኛ ያስገቡ..."
              value={faqForm.questionAmharic}
              onChange={(e) =>
                setFaqForm({ ...faqForm, questionAmharic: e.target.value })
              }
              className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
            />
          </div>

          <div>
            <label className="font-semibold text-[#3a302a] block mb-1">
              Answer (English)
            </label>
            <textarea
              rows={3}
              required
              value={faqForm.answer}
              onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
              className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
            />
          </div>

          <div>
            <label className="font-semibold text-[#3a302a] block mb-1">
              Answer (Amharic)
            </label>
            <textarea
              rows={3}
              placeholder="መልሱን በአማርኛ ያስገቡ..."
              value={faqForm.answerAmharic}
              onChange={(e) =>
                setFaqForm({ ...faqForm, answerAmharic: e.target.value })
              }
              className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={faqForm.isPublished}
                onChange={(e) =>
                  setFaqForm({ ...faqForm, isPublished: e.target.checked })
                }
                className="accent-[#b3541e]"
              />
              <span className="font-semibold text-[#3a302a]">
                Published & Visible to Public
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[#f2ece4]">
            <button
              type="button"
              onClick={() => setFaqModalOpen(false)}
              disabled={saving}
              className="px-4 py-2 border border-[#d8d0c8] rounded-lg text-[#605850] hover:bg-[#faf5ee]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-[#b3541e] text-white rounded-lg hover:bg-[#964215] font-semibold flex items-center gap-1.5"
            >
              {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              {editingFaq ? 'Update FAQ' : 'Save FAQ'}
            </button>
          </div>
        </form>
      </AdminDialog>

      {/* DIALOG 2: CONTENT BLOCK FORM */}
      <AdminDialog
        open={blockModalOpen}
        onClose={() => setBlockModalOpen(false)}
        title={editingBlock ? 'Edit Policy Document' : 'Create Policy Document'}
        description="Markdown or rich text document for legal policies, terms, and guidelines."
        width="lg"
      >
        <form onSubmit={handleSaveBlock} className="space-y-4 text-xs">
          {dialogError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg font-medium">
              {dialogError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-[#3a302a] block mb-1">
                Unique Slug
              </label>
              <input
                type="text"
                required
                disabled={!!editingBlock}
                value={blockForm.slug}
                onChange={(e) => setBlockForm({ ...blockForm, slug: e.target.value })}
                placeholder="e.g. terms-of-service, privacy-policy"
                className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e] disabled:opacity-60 font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-[#3a302a] block mb-1">
                Document Title
              </label>
              <input
                type="text"
                required
                value={blockForm.title}
                onChange={(e) => setBlockForm({ ...blockForm, title: e.target.value })}
                placeholder="e.g. Terms of Service"
                className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-[#3a302a] block mb-1">
              Meta Description (for SEO)
            </label>
            <input
              type="text"
              value={blockForm.metaDescription}
              onChange={(e) =>
                setBlockForm({ ...blockForm, metaDescription: e.target.value })
              }
              placeholder="Brief summary of policy contents..."
              className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
            />
          </div>

          <div>
            <label className="font-semibold text-[#3a302a] block mb-1">
              Document Content (Markdown / Text)
            </label>
            <textarea
              rows={10}
              required
              value={blockForm.content}
              onChange={(e) => setBlockForm({ ...blockForm, content: e.target.value })}
              placeholder="Write the full policy text here..."
              className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e] font-mono text-[11px] leading-relaxed"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={blockForm.isPublished}
                onChange={(e) =>
                  setBlockForm({ ...blockForm, isPublished: e.target.checked })
                }
                className="accent-[#b3541e]"
              />
              <span className="font-semibold text-[#3a302a]">
                Published & Publicly Accessible
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[#f2ece4]">
            <button
              type="button"
              onClick={() => setBlockModalOpen(false)}
              disabled={saving}
              className="px-4 py-2 border border-[#d8d0c8] rounded-lg text-[#605850] hover:bg-[#faf5ee]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-[#b3541e] text-white rounded-lg hover:bg-[#964215] font-semibold flex items-center gap-1.5"
            >
              {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              {editingBlock ? 'Update Document' : 'Save Document'}
            </button>
          </div>
        </form>
      </AdminDialog>

      {/* DIALOG 3: CONFIRM DELETE */}
      <AdminDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.type === 'faq' ? 'FAQ Item' : 'Policy Document'}`}
        description="Are you sure you want to proceed with this deletion? This action cannot be reversed."
        width="md"
      >
        <div className="space-y-4 text-xs">
          {dialogError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg font-medium">
              {dialogError}
            </div>
          )}

          <p className="text-[#3a302a] leading-relaxed">
            You are deleting <strong className="font-bold">{deleteTarget?.title}</strong>. If this document is referenced in public footer links, users will receive a 404 until a replacement is configured.
          </p>

          <div className="flex justify-end gap-2 pt-4 border-t border-[#f2ece4]">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
              className="px-4 py-2 border border-[#d8d0c8] rounded-lg text-[#605850] hover:bg-[#faf5ee]"
            >
              Keep Item
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold flex items-center gap-1.5"
            >
              {deleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              Confirm Deletion
            </button>
          </div>
        </div>
      </AdminDialog>
    </div>
  );
}
