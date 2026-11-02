'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Building2,
  Castle,
  Check,
  ChevronRight,
  Flame,
  Globe2,
  Home,
  Layers,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  Trash2,
  Trees,
  Waves,
  Wifi,
  Coffee,
  Tv,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { apiFetch } from '../../../lib/api';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import AdminDialog from '../../../components/admin/AdminDialog';
import AdminNoAccess from '../../../components/admin/AdminNoAccess';
import { useAuth } from '../../../context/AuthContext';
import { can, ADMIN_PERMISSIONS } from '../../../types/admin';
import {
  AmenityCategory,
  AmenityItem,
  Destination,
  PropertyCategory,
} from '../../../types/admin-growth';

type ActiveTab = 'categories' | 'destinations' | 'amenities';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Building2,
  Home,
  Trees,
  Castle,
  Flame,
  Sparkles,
  Layers,
  MapPin,
  Globe2,
  Wifi,
  Waves,
  Tag,
  Coffee,
  Tv,
  ShieldCheck,
};

const COMMON_CATEGORY_ICONS = [
  'Building2',
  'Home',
  'Trees',
  'Castle',
  'Flame',
  'Sparkles',
  'Layers',
  'Tag',
];

const COMMON_AMENITY_ICONS = [
  'Wifi',
  'Sparkles',
  'Waves',
  'Coffee',
  'Tv',
  'ShieldCheck',
  'Check',
];

function renderCatalogIcon(
  iconName?: string | null,
  fallback: React.ComponentType<{ className?: string }> = Sparkles,
  className = 'w-5 h-5',
) {
  if (!iconName) {
    const Fallback = fallback;
    return <Fallback className={className} />;
  }
  const Icon = ICON_MAP[iconName] || fallback;
  return <Icon className={className} />;
}

export default function AdminCategoriesPage() {
  const { user } = useAuth();
  const canManage = can(user?.permissions, ADMIN_PERMISSIONS.CATALOG_MANAGE);

  const [activeTab, setActiveTab] = useState<ActiveTab>('categories');
  const [categories, setCategories] = useState<PropertyCategory[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [amenities, setAmenities] = useState<AmenityItem[]>([]);
  const [amenityCategories, setAmenityCategories] = useState<AmenityCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAmenityCategory, setSelectedAmenityCategory] = useState<string>('ALL');

  // Modals & In-flight state
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<PropertyCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    slug: '',
    name: '',
    nameAmharic: '',
    description: '',
    icon: 'Building2',
    displayOrder: 0,
    isActive: true,
  });

  const [destinationModalOpen, setDestinationModalOpen] = useState(false);
  const [editingDestination, setEditingDestination] = useState<Destination | null>(null);
  const [destinationForm, setDestinationForm] = useState({
    slug: '',
    name: '',
    nameAmharic: '',
    region: '',
    tagline: '',
    imageUrl: '',
    latitude: 9.03,
    longitude: 38.74,
    isFeatured: true,
    displayOrder: 0,
    isActive: true,
  });

  const [amenityModalOpen, setAmenityModalOpen] = useState(false);
  const [editingAmenity, setEditingAmenity] = useState<AmenityItem | null>(null);
  const [amenityForm, setAmenityForm] = useState({
    name: '',
    nameAmharic: '',
    category: 'ESSENTIALS' as AmenityCategory,
    icon: 'Wifi',
    displayOrder: 0,
    isActive: true,
  });

  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'category' | 'destination' | 'amenity';
    id: string;
    name: string;
  } | null>(null);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!canManage) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const [cats, dests, amens, amenityCats] = await Promise.all([
        apiFetch<PropertyCategory[]>('/admin/catalog/categories'),
        apiFetch<Destination[]>('/admin/catalog/destinations'),
        apiFetch<AmenityItem[]>('/admin/catalog/amenities'),
        apiFetch<AmenityCategory[]>('/admin/catalog/amenities/categories').catch(() => [
          'ESSENTIALS' as AmenityCategory,
          'SAFETY' as AmenityCategory,
          'OUTDOORS' as AmenityCategory,
        ]),
      ]);
      setCategories(cats || []);
      setDestinations(dests || []);
      setAmenities(amens || []);
      setAmenityCategories(amenityCats || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load catalog data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Save Category
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setDialogError(null);
    try {
      if (editingCategory) {
        // Strip slug from update payload to satisfy backend DTO whitelist
        const { slug, ...payload } = categoryForm;
        await apiFetch(`/admin/catalog/categories/${editingCategory.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            ...payload,
            nameAmharic: payload.nameAmharic.trim() || undefined,
            description: payload.description.trim() || undefined,
            icon: payload.icon.trim() || undefined,
            displayOrder: Number(payload.displayOrder) || 0,
          }),
        });
      } else {
        await apiFetch('/admin/catalog/categories', {
          method: 'POST',
          body: JSON.stringify({
            ...categoryForm,
            slug: categoryForm.slug.trim().toLowerCase(),
            nameAmharic: categoryForm.nameAmharic.trim() || undefined,
            description: categoryForm.description.trim() || undefined,
            icon: categoryForm.icon.trim() || undefined,
            displayOrder: Number(categoryForm.displayOrder) || 0,
          }),
        });
      }
      setCategoryModalOpen(false);
      setEditingCategory(null);
      await loadData();
    } catch (err: unknown) {
      setDialogError(err instanceof Error ? err.message : 'Error saving category');
    } finally {
      setSaving(false);
    }
  };

  // Save Destination
  const handleSaveDestination = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setDialogError(null);
    try {
      const latVal = Number(destinationForm.latitude);
      const lngVal = Number(destinationForm.longitude);

      if (editingDestination) {
        // Strip slug from update payload
        const { slug, ...payload } = destinationForm;
        await apiFetch(`/admin/catalog/destinations/${editingDestination.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            ...payload,
            nameAmharic: payload.nameAmharic.trim() || undefined,
            tagline: payload.tagline.trim() || undefined,
            imageUrl: payload.imageUrl.trim() || undefined,
            latitude: !isNaN(latVal) ? latVal : undefined,
            longitude: !isNaN(lngVal) ? lngVal : undefined,
            displayOrder: Number(payload.displayOrder) || 0,
          }),
        });
      } else {
        await apiFetch('/admin/catalog/destinations', {
          method: 'POST',
          body: JSON.stringify({
            ...destinationForm,
            slug: destinationForm.slug.trim().toLowerCase(),
            nameAmharic: destinationForm.nameAmharic.trim() || undefined,
            tagline: destinationForm.tagline.trim() || undefined,
            imageUrl: destinationForm.imageUrl.trim() || undefined,
            latitude: !isNaN(latVal) ? latVal : undefined,
            longitude: !isNaN(lngVal) ? lngVal : undefined,
            displayOrder: Number(destinationForm.displayOrder) || 0,
          }),
        });
      }
      setDestinationModalOpen(false);
      setEditingDestination(null);
      await loadData();
    } catch (err: unknown) {
      setDialogError(err instanceof Error ? err.message : 'Error saving destination');
    } finally {
      setSaving(false);
    }
  };

  // Save Amenity
  const handleSaveAmenity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setDialogError(null);
    try {
      const payload = {
        ...amenityForm,
        nameAmharic: amenityForm.nameAmharic.trim() || undefined,
        icon: amenityForm.icon.trim() || undefined,
        displayOrder: Number(amenityForm.displayOrder) || 0,
      };

      if (editingAmenity) {
        await apiFetch(`/admin/catalog/amenities/${editingAmenity.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/admin/catalog/amenities', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setAmenityModalOpen(false);
      setEditingAmenity(null);
      await loadData();
    } catch (err: unknown) {
      setDialogError(err instanceof Error ? err.message : 'Error saving amenity');
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
      if (deleteTarget.type === 'category') {
        await apiFetch(`/admin/catalog/categories/${deleteTarget.id}`, { method: 'DELETE' });
      } else if (deleteTarget.type === 'destination') {
        await apiFetch(`/admin/catalog/destinations/${deleteTarget.id}`, { method: 'DELETE' });
      } else if (deleteTarget.type === 'amenity') {
        await apiFetch(`/admin/catalog/amenities/${deleteTarget.id}`, { method: 'DELETE' });
      }
      setDeleteTarget(null);
      await loadData();
    } catch (err: unknown) {
      setDialogError(err instanceof Error ? err.message : 'Failed to delete item');
    } finally {
      setDeleting(false);
    }
  };

  if (!canManage) {
    return (
      <AdminNoAccess
        area="Categories & Locations"
        required={[ADMIN_PERMISSIONS.CATALOG_MANAGE]}
        backHref="/admin"
        backLabel="Back to overview"
      />
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Categories & Locations"
        description="Curate dynamic property categories, featured Ethiopian destination regions, and categorized amenities."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#605850] bg-white border border-[#d8d0c8] rounded-lg hover:text-[#3a302a] hover:bg-[#faf5ee] transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {canManage && activeTab === 'categories' && (
              <button
                onClick={() => {
                  setEditingCategory(null);
                  setDialogError(null);
                  setCategoryForm({
                    slug: '',
                    name: '',
                    nameAmharic: '',
                    description: '',
                    icon: 'Building2',
                    displayOrder: categories.length + 1,
                    isActive: true,
                  });
                  setCategoryModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#b3541e] rounded-lg hover:bg-[#964215] shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Category
              </button>
            )}
            {canManage && activeTab === 'destinations' && (
              <button
                onClick={() => {
                  setEditingDestination(null);
                  setDialogError(null);
                  setDestinationForm({
                    slug: '',
                    name: '',
                    nameAmharic: '',
                    region: '',
                    tagline: '',
                    imageUrl: '',
                    latitude: 9.03,
                    longitude: 38.74,
                    isFeatured: true,
                    displayOrder: destinations.length + 1,
                    isActive: true,
                  });
                  setDestinationModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#b3541e] rounded-lg hover:bg-[#964215] shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Destination
              </button>
            )}
            {canManage && activeTab === 'amenities' && (
              <button
                onClick={() => {
                  setEditingAmenity(null);
                  setDialogError(null);
                  setAmenityForm({
                    name: '',
                    nameAmharic: '',
                    category: amenityCategories[0] || ('ESSENTIALS' as AmenityCategory),
                    icon: 'Wifi',
                    displayOrder: amenities.length + 1,
                    isActive: true,
                  });
                  setAmenityModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#b3541e] rounded-lg hover:bg-[#964215] shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Amenity
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

      {/* Tabs Bar */}
      <div className="flex items-center justify-between border-b border-[#d8d0c8]">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab('categories')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'categories'
                ? 'border-[#b3541e] text-[#b3541e]'
                : 'border-transparent text-[#605850] hover:text-[#3a302a]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Property Categories ({categories.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('destinations')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'destinations'
                ? 'border-[#b3541e] text-[#b3541e]'
                : 'border-transparent text-[#605850] hover:text-[#3a302a]'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Destinations ({destinations.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('amenities')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'amenities'
                ? 'border-[#b3541e] text-[#b3541e]'
                : 'border-transparent text-[#605850] hover:text-[#3a302a]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Amenities ({amenities.length})</span>
          </button>
        </div>

        {/* Global Search within active tab */}
        <div className="relative w-64 pb-2">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#605850]" />
          <input
            type="text"
            placeholder={`Filter ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#d8d0c8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
          />
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && categories.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-white border border-[#d8d0c8] rounded-xl p-5 shadow-xs animate-pulse space-y-3"
            >
              <div className="h-6 w-1/3 bg-[#f2ece4] rounded" />
              <div className="h-4 w-2/3 bg-[#f2ece4] rounded" />
              <div className="h-12 w-full bg-[#f2ece4] rounded" />
            </div>
          ))}
        </div>
      )}

      {/* TAB 1: CATEGORIES */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories
              .filter(
                (c) =>
                  c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  c.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (c.nameAmharic && c.nameAmharic.includes(searchQuery)),
              )
              .map((cat) => (
                <div
                  key={cat.id}
                  className="bg-white border border-[#d8d0c8] rounded-xl p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#faf5ee] border border-[#d8d0c8] flex items-center justify-center text-[#b3541e]">
                          {renderCatalogIcon(cat.icon, Building2, 'w-5 h-5')}
                        </div>
                        <div>
                          <h3 className="font-serif text-lg font-bold text-[#3a302a]">
                            {cat.name}
                          </h3>
                          {cat.nameAmharic && (
                            <span className="text-xs font-medium text-[#b3541e]">
                              {cat.nameAmharic}
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                          cat.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                        }`}
                      >
                        {cat.isActive ? 'Active' : 'Hidden'}
                      </span>
                    </div>

                    {cat.description && (
                      <p className="mt-3 text-xs text-[#605850] line-clamp-2">
                        {cat.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#f2ece4] flex items-center justify-between text-xs text-[#605850]">
                    <span className="font-mono text-[11px] bg-[#faf5ee] px-2 py-0.5 rounded border border-[#d8d0c8]">
                      /{cat.slug}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#73776f]">Order: {cat.displayOrder}</span>
                      {canManage && (
                        <>
                          <button
                            onClick={() => {
                              setEditingCategory(cat);
                              setDialogError(null);
                              setCategoryForm({
                                slug: cat.slug,
                                name: cat.name,
                                nameAmharic: cat.nameAmharic || '',
                                description: cat.description || '',
                                icon: cat.icon || 'Building2',
                                displayOrder: cat.displayOrder,
                                isActive: cat.isActive,
                              });
                              setCategoryModalOpen(true);
                            }}
                            className="p-1 hover:text-[#b3541e] text-[#605850] transition-colors"
                            title="Edit Category"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteTarget({
                                type: 'category',
                                id: cat.id,
                                name: cat.name,
                              })
                            }
                            className="p-1 hover:text-red-600 text-[#605850] transition-colors"
                            title="Delete Category"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {!loading && categories.length === 0 && (
            <div className="bg-white border border-[#d8d0c8] rounded-2xl p-12 text-center max-w-md mx-auto my-8">
              <Layers className="w-10 h-10 text-[#605850] mx-auto mb-3" />
              <h3 className="font-serif text-lg font-bold text-[#3a302a]">No Categories Registered</h3>
              <p className="text-xs text-[#73776f] mt-1">
                No marketplace property categories are configured yet.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DESTINATIONS */}
      {activeTab === 'destinations' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {destinations
              .filter(
                (d) =>
                  d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  d.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (d.nameAmharic && d.nameAmharic.includes(searchQuery)),
              )
              .map((dest) => {
                const lat = dest.latitude != null ? Number(dest.latitude) : null;
                const lng = dest.longitude != null ? Number(dest.longitude) : null;

                return (
                  <div
                    key={dest.id}
                    className="bg-white border border-[#d8d0c8] rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
                  >
                    <div>
                      {/* Image header */}
                      <div className="h-36 bg-[#f2ece4] relative overflow-hidden">
                        {dest.imageUrl ? (
                          <img
                            src={dest.imageUrl}
                            alt={dest.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#605850]">
                            <Globe2 className="w-8 h-8 opacity-40" />
                          </div>
                        )}
                        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                          {dest.isFeatured && (
                            <span className="bg-[#b3541e] text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-xs flex items-center gap-1">
                              <Flame className="w-3 h-3" /> Featured
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full shadow-xs ${
                              dest.isActive
                                ? 'bg-emerald-600 text-white'
                                : 'bg-zinc-600 text-white'
                            }`}
                          >
                            {dest.isActive ? 'Active' : 'Draft'}
                          </span>
                        </div>
                        <div className="absolute bottom-2 left-2.5">
                          <span className="bg-black/60 backdrop-blur-xs text-white text-[11px] font-medium px-2 py-0.5 rounded">
                            {dest.region}
                          </span>
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-serif text-xl font-bold text-[#3a302a]">
                            {dest.name}
                          </h3>
                          {dest.nameAmharic && (
                            <span className="text-sm font-semibold text-[#b3541e]">
                              {dest.nameAmharic}
                            </span>
                          )}
                        </div>
                        {dest.tagline && (
                          <p className="mt-2 text-xs text-[#605850] leading-relaxed line-clamp-2">
                            {dest.tagline}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="p-4 pt-3 border-t border-[#f2ece4] flex items-center justify-between text-xs text-[#605850]">
                      <span className="font-mono text-[11px] text-[#605850]">
                        {lat != null && !isNaN(lat) ? `${lat.toFixed(2)}°N` : '—'},{' '}
                        {lng != null && !isNaN(lng) ? `${lng.toFixed(2)}°E` : '—'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#73776f]">Order: {dest.displayOrder}</span>
                        {canManage && (
                          <>
                            <button
                              onClick={() => {
                                setEditingDestination(dest);
                                setDialogError(null);
                                setDestinationForm({
                                  slug: dest.slug,
                                  name: dest.name,
                                  nameAmharic: dest.nameAmharic || '',
                                  region: dest.region,
                                  tagline: dest.tagline || '',
                                  imageUrl: dest.imageUrl || '',
                                  latitude: lat != null && !isNaN(lat) ? lat : 9.03,
                                  longitude: lng != null && !isNaN(lng) ? lng : 38.74,
                                  isFeatured: dest.isFeatured,
                                  displayOrder: dest.displayOrder,
                                  isActive: dest.isActive,
                                });
                                setDestinationModalOpen(true);
                              }}
                              className="p-1 hover:text-[#b3541e] text-[#605850] transition-colors"
                              title="Edit Destination"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                setDeleteTarget({
                                  type: 'destination',
                                  id: dest.id,
                                  name: dest.name,
                                })
                              }
                              className="p-1 hover:text-red-600 text-[#605850] transition-colors"
                              title="Delete Destination"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {!loading && destinations.length === 0 && (
            <div className="bg-white border border-[#d8d0c8] rounded-2xl p-12 text-center max-w-md mx-auto my-8">
              <MapPin className="w-10 h-10 text-[#605850] mx-auto mb-3" />
              <h3 className="font-serif text-lg font-bold text-[#3a302a]">No Destinations Found</h3>
              <p className="text-xs text-[#73776f] mt-1">
                No Ethiopian destination regions or cities have been registered yet.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: AMENITIES */}
      {activeTab === 'amenities' && (
        <div className="space-y-4">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedAmenityCategory('ALL')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedAmenityCategory === 'ALL'
                  ? 'bg-[#3a302a] text-white'
                  : 'bg-white border border-[#d8d0c8] text-[#605850] hover:bg-[#faf5ee]'
              }`}
            >
              All Groups ({amenities.length})
            </button>
            {amenityCategories.map((group) => (
              <button
                key={group}
                onClick={() => setSelectedAmenityCategory(group)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedAmenityCategory === group
                    ? 'bg-[#3a302a] text-white'
                    : 'bg-white border border-[#d8d0c8] text-[#605850] hover:bg-[#faf5ee]'
                }`}
              >
                {group} ({amenities.filter((a) => a.category === group).length})
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {amenities
              .filter((a) => {
                const matchesSearch =
                  a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (a.nameAmharic && a.nameAmharic.includes(searchQuery));
                const matchesCat =
                  selectedAmenityCategory === 'ALL' || a.category === selectedAmenityCategory;
                return matchesSearch && matchesCat;
              })
              .map((amenity) => (
                <div
                  key={amenity.id}
                  className="bg-white border border-[#d8d0c8] rounded-xl p-4 shadow-2xs hover:shadow-xs transition-shadow flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#faf5ee] border border-[#d8d0c8] flex items-center justify-center text-[#b3541e]">
                      {renderCatalogIcon(amenity.icon, Wifi, 'w-4 h-4')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-[#3a302a]">
                          {amenity.name}
                        </h4>
                        {!amenity.isActive && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600 border border-zinc-200">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold text-[#b3541e] uppercase tracking-wider">
                          {amenity.category}
                        </span>
                        {amenity.nameAmharic && (
                          <span className="text-xs text-[#605850]">
                            • {amenity.nameAmharic}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {canManage && (
                      <>
                        <button
                          onClick={() => {
                            setEditingAmenity(amenity);
                            setDialogError(null);
                            setAmenityForm({
                              name: amenity.name,
                              nameAmharic: amenity.nameAmharic || '',
                              category: amenity.category,
                              icon: amenity.icon || 'Wifi',
                              displayOrder: amenity.displayOrder ?? 0,
                              isActive: amenity.isActive !== false,
                            });
                            setAmenityModalOpen(true);
                          }}
                          className="p-1 hover:text-[#b3541e] text-[#605850] transition-colors"
                          title="Edit Amenity"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteTarget({
                              type: 'amenity',
                              id: amenity.id,
                              name: amenity.name,
                            })
                          }
                          className="p-1 hover:text-red-600 text-[#605850] transition-colors"
                          title="Delete Amenity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
          </div>

          {!loading && amenities.length === 0 && (
            <div className="bg-white border border-[#d8d0c8] rounded-2xl p-12 text-center max-w-md mx-auto my-8">
              <Sparkles className="w-10 h-10 text-[#605850] mx-auto mb-3" />
              <h3 className="font-serif text-lg font-bold text-[#3a302a]">No Amenities Registered</h3>
              <p className="text-xs text-[#73776f] mt-1">
                Configure features like Wi-Fi, Generator backup, or Hot water for properties.
              </p>
            </div>
          )}
        </div>
      )}

      {/* DIALOG 1: CATEGORY MODAL */}
      <AdminDialog
        open={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        title={editingCategory ? 'Edit Property Category' : 'Create Property Category'}
        description="Categories organize listings on the marketplace discovery grid."
        width="md"
      >
        <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
          {dialogError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg font-medium">
              {dialogError}
            </div>
          )}

          <div>
            <label className="font-semibold text-[#3a302a] block mb-1">
              Unique Slug (immutable identifier)
            </label>
            <input
              type="text"
              required
              disabled={!!editingCategory}
              value={categoryForm.slug}
              onChange={(e) =>
                setCategoryForm({ ...categoryForm, slug: e.target.value })
              }
              placeholder="e.g. villas, eco-lodges"
              className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e] disabled:opacity-60 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-[#3a302a] block mb-1">
                Name (English)
              </label>
              <input
                type="text"
                required
                value={categoryForm.name}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
              />
            </div>
            <div>
              <label className="font-semibold text-[#3a302a] block mb-1">
                Name (Amharic)
              </label>
              <input
                type="text"
                placeholder="e.g. ቪላዎች"
                value={categoryForm.nameAmharic}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, nameAmharic: e.target.value })
                }
                className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-[#3a302a] block mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={categoryForm.description}
              onChange={(e) =>
                setCategoryForm({ ...categoryForm, description: e.target.value })
              }
              placeholder="Describe the architectural style and property types..."
              className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
            />
          </div>

          {/* Icon Selection & Display Order */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-[#3a302a] block mb-1">
                Category Icon
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={categoryForm.icon}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, icon: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
                />
                <div className="w-9 h-9 rounded-lg border border-[#d8d0c8] bg-white flex items-center justify-center text-[#b3541e] shrink-0">
                  {renderCatalogIcon(categoryForm.icon, Building2, 'w-4 h-4')}
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {COMMON_CATEGORY_ICONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setCategoryForm({ ...categoryForm, icon: ic })}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                      categoryForm.icon === ic
                        ? 'bg-[#b3541e] text-white border-[#b3541e]'
                        : 'bg-white border-[#d8d0c8] text-[#605850]'
                    }`}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="font-semibold text-[#3a302a] block mb-1">
                Display Order
              </label>
              <input
                type="number"
                min="0"
                value={categoryForm.displayOrder}
                onChange={(e) =>
                  setCategoryForm({
                    ...categoryForm,
                    displayOrder: parseInt(e.target.value, 10) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
              />
              <p className="text-[10px] text-[#73776f] mt-1">Lower numbers appear first.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={categoryForm.isActive}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, isActive: e.target.checked })
                }
                className="accent-[#b3541e]"
              />
              <span className="font-semibold text-[#3a302a]">
                Active on Marketplace Navigation
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[#f2ece4]">
            <button
              type="button"
              onClick={() => setCategoryModalOpen(false)}
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
              {editingCategory ? 'Update Category' : 'Save Category'}
            </button>
          </div>
        </form>
      </AdminDialog>

      {/* DIALOG 2: DESTINATION MODAL */}
      <AdminDialog
        open={destinationModalOpen}
        onClose={() => setDestinationModalOpen(false)}
        title={editingDestination ? 'Edit Destination' : 'Add Destination'}
        description="Featured Ethiopian destinations for travel discovery and regional landing pages."
        width="md"
      >
        <form onSubmit={handleSaveDestination} className="space-y-4 text-xs">
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
                disabled={!!editingDestination}
                value={destinationForm.slug}
                onChange={(e) =>
                  setDestinationForm({ ...destinationForm, slug: e.target.value })
                }
                placeholder="e.g. bishoftu, lalibela"
                className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e] disabled:opacity-60 font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-[#3a302a] block mb-1">
                City Name (English)
              </label>
              <input
                type="text"
                required
                value={destinationForm.name}
                onChange={(e) =>
                  setDestinationForm({ ...destinationForm, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-[#3a302a] block mb-1">
                Name (Amharic)
              </label>
              <input
                type="text"
                placeholder="e.g. ቢሾፍቱ"
                value={destinationForm.nameAmharic}
                onChange={(e) =>
                  setDestinationForm({
                    ...destinationForm,
                    nameAmharic: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
              />
            </div>
            <div>
              <label className="font-semibold text-[#3a302a] block mb-1">
                Region / Province
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Oromia / Rift Valley"
                value={destinationForm.region}
                onChange={(e) =>
                  setDestinationForm({
                    ...destinationForm,
                    region: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-[#3a302a] block mb-1">
              Tagline / Highlights
            </label>
            <input
              type="text"
              placeholder="e.g. Volcanic crater lakes and tranquil resorts"
              value={destinationForm.tagline}
              onChange={(e) =>
                setDestinationForm({ ...destinationForm, tagline: e.target.value })
              }
              className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
            />
          </div>

          <div>
            <label className="font-semibold text-[#3a302a] block mb-1">
              High-Resolution Image URL
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={destinationForm.imageUrl}
              onChange={(e) =>
                setDestinationForm({ ...destinationForm, imageUrl: e.target.value })
              }
              className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
            />
          </div>

          {/* Coordinates & Order */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-[#3a302a] block mb-1">
                Latitude (°N)
              </label>
              <input
                type="number"
                step="0.0001"
                value={destinationForm.latitude}
                onChange={(e) =>
                  setDestinationForm({
                    ...destinationForm,
                    latitude: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e] font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-[#3a302a] block mb-1">
                Longitude (°E)
              </label>
              <input
                type="number"
                step="0.0001"
                value={destinationForm.longitude}
                onChange={(e) =>
                  setDestinationForm({
                    ...destinationForm,
                    longitude: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e] font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-[#3a302a] block mb-1">
                Display Order
              </label>
              <input
                type="number"
                min="0"
                value={destinationForm.displayOrder}
                onChange={(e) =>
                  setDestinationForm({
                    ...destinationForm,
                    displayOrder: parseInt(e.target.value, 10) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={destinationForm.isFeatured}
                onChange={(e) =>
                  setDestinationForm({
                    ...destinationForm,
                    isFeatured: e.target.checked,
                  })
                }
                className="accent-[#b3541e]"
              />
              <span className="font-semibold text-[#3a302a]">
                Feature on Homepage
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={destinationForm.isActive}
                onChange={(e) =>
                  setDestinationForm({
                    ...destinationForm,
                    isActive: e.target.checked,
                  })
                }
                className="accent-[#b3541e]"
              />
              <span className="font-semibold text-[#3a302a]">
                Published & Searchable
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[#f2ece4]">
            <button
              type="button"
              onClick={() => setDestinationModalOpen(false)}
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
              {editingDestination ? 'Update Destination' : 'Save Destination'}
            </button>
          </div>
        </form>
      </AdminDialog>

      {/* DIALOG 3: AMENITY MODAL */}
      <AdminDialog
        open={amenityModalOpen}
        onClose={() => setAmenityModalOpen(false)}
        title={editingAmenity ? 'Edit Amenity' : 'Add Amenity'}
        description="Standardized amenities available for host listing descriptions."
        width="md"
      >
        <form onSubmit={handleSaveAmenity} className="space-y-4 text-xs">
          {dialogError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg font-medium">
              {dialogError}
            </div>
          )}

          <div>
            <label className="font-semibold text-[#3a302a] block mb-1">
              Amenity Name (English)
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Dedicated Workspace"
              value={amenityForm.name}
              onChange={(e) =>
                setAmenityForm({ ...amenityForm, name: e.target.value })
              }
              className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
            />
          </div>

          <div>
            <label className="font-semibold text-[#3a302a] block mb-1">
              Amenity Name (Amharic)
            </label>
            <input
              type="text"
              placeholder="e.g. የሥራ ጠረጴዛ"
              value={amenityForm.nameAmharic}
              onChange={(e) =>
                setAmenityForm({ ...amenityForm, nameAmharic: e.target.value })
              }
              className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-[#3a302a] block mb-1">
                Category Group
              </label>
              <select
                value={amenityForm.category}
                onChange={(e) =>
                  setAmenityForm({
                    ...amenityForm,
                    category: e.target.value as AmenityCategory,
                  })
                }
                className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
              >
                {amenityCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
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
                value={amenityForm.displayOrder}
                onChange={(e) =>
                  setAmenityForm({
                    ...amenityForm,
                    displayOrder: parseInt(e.target.value, 10) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
              />
            </div>
          </div>

          {/* Icon Selection */}
          <div>
            <label className="font-semibold text-[#3a302a] block mb-1">
              Icon Key
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={amenityForm.icon}
                onChange={(e) =>
                  setAmenityForm({ ...amenityForm, icon: e.target.value })
                }
                className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
              />
              <div className="w-9 h-9 rounded-lg border border-[#d8d0c8] bg-white flex items-center justify-center text-[#b3541e] shrink-0">
                {renderCatalogIcon(amenityForm.icon, Wifi, 'w-4 h-4')}
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {COMMON_AMENITY_ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setAmenityForm({ ...amenityForm, icon: ic })}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                    amenityForm.icon === ic
                      ? 'bg-[#b3541e] text-white border-[#b3541e]'
                      : 'bg-white border-[#d8d0c8] text-[#605850]'
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={amenityForm.isActive}
                onChange={(e) =>
                  setAmenityForm({ ...amenityForm, isActive: e.target.checked })
                }
                className="accent-[#b3541e]"
              />
              <span className="font-semibold text-[#3a302a]">
                Active (Available for host selection)
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[#f2ece4]">
            <button
              type="button"
              onClick={() => setAmenityModalOpen(false)}
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
              {editingAmenity ? 'Update Amenity' : 'Save Amenity'}
            </button>
          </div>
        </form>
      </AdminDialog>

      {/* DIALOG 4: CONFIRM DELETE */}
      <AdminDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.type === 'category' ? 'Category' : deleteTarget?.type === 'destination' ? 'Destination' : 'Amenity'}`}
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
            You are removing <strong className="font-bold">{deleteTarget?.name}</strong>. If this entity is actively referenced by live marketplace properties, related amenity tags or category mappings may be removed.
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
