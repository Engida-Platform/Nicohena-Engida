'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { saveHostExperience, type EthiopianExperience } from '@/data/experiences';
import { showPlatformToast } from '@/context/ToastContext';
import {
  Compass,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  MapPin,
  Clock,
  Users,
  BadgeDollarSign,
  Image as ImageIcon,
  Check,
  Plus,
  Trash2,
} from 'lucide-react';

const CATEGORY_OPTIONS = [
  { value: 'coffee', label: 'Coffee & Culinary', desc: 'Roasting workshops, traditional ceremonies, street food tours' },
  { value: 'hiking', label: 'Hiking & Treks', desc: 'Mountain trails, forest walks, volcanic crater lakes' },
  { value: 'heritage', label: 'Heritage & History', desc: 'Ancient rock churches, imperial palaces, artisan quarters' },
  { value: 'water', label: 'Lakes & Water', desc: 'Boat excursions, island monasteries, lakeside birdwatching' },
  { value: 'wildlife', label: 'Wildlife & Safari', desc: 'Afro-alpine endemic fauna, baboons, birding expeditions' },
];

const PRESET_IMAGES = [
  {
    label: 'Traditional Coffee Roasting',
    url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: 'Entoto Eucalyptus Forest',
    url: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: 'Simien Alpine Ridge',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: 'Lake Tana Monastic Waters',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: 'Lalibela Rock Heritage',
    url: 'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: 'Bale Cloud Forest',
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80',
  },
];

export default function CreateExperiencePage() {
  const router = useRouter();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [category, setCategory] = useState<'coffee' | 'hiking' | 'heritage' | 'water' | 'wildlife'>('coffee');
  const [location, setLocation] = useState('Addis Ababa');
  const [region, setRegion] = useState('Addis Ababa');
  const [meetingPoint, setMeetingPoint] = useState('');
  const [meetingPointDirections, setMeetingPointDirections] = useState('');
  const [duration, setDuration] = useState('3 Hours');
  const [maxGuests, setMaxGuests] = useState(8);
  const [pricePerPerson, setPricePerPerson] = useState(2500);
  const [description, setDescription] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState(PRESET_IMAGES[0].url);
  const [includedItems, setIncludedItems] = useState<string[]>([
    'Professional local cultural guide',
    'Traditional coffee and snacks',
    'Escrow protection and local permits',
  ]);
  const [newIncluded, setNewIncluded] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAddIncluded = () => {
    if (newIncluded.trim()) {
      setIncludedItems([...includedItems, newIncluded.trim()]);
      setNewIncluded('');
    }
  };

  const handleRemoveIncluded = (index: number) => {
    setIncludedItems(includedItems.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      showPlatformToast('Please fill in title and description', 'error');
      return;
    }

    setSubmitting(true);

    const expId = `exp-host-${Date.now()}`;
    const selectedCatObj = CATEGORY_OPTIONS.find((c) => c.value === category);

    const newExperience: EthiopianExperience = {
      id: expId,
      title: title.trim(),
      tagline: tagline.trim() || `Authentic Ethiopian ${selectedCatObj?.label || 'experience'} hosted in ${location}`,
      category,
      categoryLabel: selectedCatObj?.label || 'Culture & Heritage',
      location: location.trim(),
      region: region.trim(),
      meetingPoint: meetingPoint.trim() || `${location} Central Landmark`,
      meetingPointDirections: meetingPointDirections.trim() || 'Meet at the main entrance. The host will meet you holding an ENGIDA guest sign.',
      duration: duration.trim(),
      groupSize: `Up to ${maxGuests} guests`,
      maxGuests: Number(maxGuests),
      languages: ['Amharic', 'English'],
      pricePerPerson: Number(pricePerPerson),
      rating: 5.0,
      reviewsCount: 1,
      hostName: user?.name || 'Verified Host',
      hostRole: 'Cultural Ambassador & Host',
      hostAvatar: (user as any)?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      hostBio: `Passionate about sharing the deep hospitality and unique traditions of ${location} with visitors.`,
      hostResponseRate: '100% response rate',
      images: [coverImageUrl],
      description: description.trim(),
      highlights: [
        `Intimate small group experience (max ${maxGuests} guests)`,
        'Hands-on interactive cultural participation',
        'Official ENGIDA Escrow Protected checkout via Chapa',
      ],
      itinerary: [
        {
          time: 'First 30 Mins',
          title: 'Welcome & Introduction',
          description: 'Gather at the meeting point for introductions and background on the experience.',
        },
        {
          time: 'Main Session',
          title: 'Core Activity & Immersion',
          description: description.slice(0, 150) + '...',
        },
        {
          time: 'Conclusion',
          title: 'Q&A & Farewell',
          description: 'Share reflections, answer questions, and conclude with warm farewells.',
        },
      ],
      included: includedItems,
      toBring: ['Comfortable footwear', 'Camera or smartphone', 'Weather-appropriate clothing'],
      timeSlots: [
        { id: 'morning', label: 'Morning Session', time: '09:00 AM – 12:00 PM' },
        { id: 'afternoon', label: 'Afternoon Session', time: '02:00 PM – 05:00 PM' },
      ],
      reviews: [
        {
          id: `rev-${Date.now()}`,
          author: 'Bereket T. (Addis Ababa)',
          date: 'Recently verified',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
          rating: 5,
          comment: 'Wonderful host! Everything was well organized and deeply authentic. Highly recommended!',
        },
      ],
    };

    saveHostExperience(newExperience);

    setTimeout(() => {
      setSubmitting(false);
      showPlatformToast('Your experience has been published live on ENGIDA!', 'success', 'Experience Published');
      router.push('/host/experiences');
    }, 600);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-body pb-16">
      {/* Back button & Title */}
      <div className="flex items-center justify-between pb-6 border-b border-[#E5E0D5]">
        <div className="flex items-center gap-3">
          <Link
            href="/host/experiences"
            className="p-2 rounded-xl border border-[#E5E0D5] bg-white text-[#252923] hover:bg-[#FAF8F2] transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-headline text-[#252923]">
              Host an Experience
            </h1>
            <p className="text-xs text-[#73776F]">
              Share your passion, cultural heritage, or local expertise with guests from across Ethiopia and the world
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full bg-[#EEF3EF] text-[#234B36] text-xs font-bold flex items-center gap-1.5 border border-[#234B36]/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Instant Live Publish</span>
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Core Identity */}
        <section className="bg-white rounded-3xl border border-[#E5E0D5] p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex items-center gap-2.5 pb-4 border-b border-[#E5E0D5]/70">
            <div className="p-2 rounded-xl bg-[#EEF3EF] text-[#234B36]">
              <Compass className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold font-headline text-[#252923]">1. Experience Overview</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#73776F] mb-1.5">
                Experience Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Traditional Addis Ababa Coffee Roasting & Bunna Ceremony"
                className="w-full px-4 py-3 rounded-xl bg-[#FAF8F2] border border-[#E5E0D5] text-sm text-[#252923] placeholder-[#73776F] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#73776F] mb-1.5">
                Catchy Tagline / Subtitle
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. Experience Ethiopia’s sacred coffee ritual from raw green bean to third cup"
                className="w-full px-4 py-3 rounded-xl bg-[#FAF8F2] border border-[#E5E0D5] text-sm text-[#252923] placeholder-[#73776F] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#73776F] mb-2">
                Category
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CATEGORY_OPTIONS.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value as any)}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      category === cat.value
                        ? 'border-[#234B36] bg-[#EEF3EF] ring-2 ring-[#234B36]/20'
                        : 'border-[#E5E0D5] bg-[#FAF8F2] hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[#252923]">{cat.label}</span>
                      {category === cat.value && <CheckCircle2 className="w-4 h-4 text-[#234B36]" />}
                    </div>
                    <p className="text-[11px] text-[#73776F] mt-1">{cat.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Step 2: Location & Meeting Point */}
        <section className="bg-white rounded-3xl border border-[#E5E0D5] p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex items-center gap-2.5 pb-4 border-b border-[#E5E0D5]/70">
            <div className="p-2 rounded-xl bg-[#EEF3EF] text-[#234B36]">
              <MapPin className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold font-headline text-[#252923]">2. Location & Meeting Instructions</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#73776F] mb-1.5">
                City / Town <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Addis Ababa (Bole & Piazza)"
                className="w-full px-4 py-3 rounded-xl bg-[#FAF8F2] border border-[#E5E0D5] text-sm text-[#252923] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#73776F] mb-1.5">
                Region
              </label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="e.g. Addis Ababa or Oromia"
                className="w-full px-4 py-3 rounded-xl bg-[#FAF8F2] border border-[#E5E0D5] text-sm text-[#252923] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#73776F] mb-1.5">
                Exact Meeting Point Landmark
              </label>
              <input
                type="text"
                value={meetingPoint}
                onChange={(e) => setMeetingPoint(e.target.value)}
                placeholder="e.g. St. George Cathedral Square (Piazza) or Bole Medhanialem Entrance"
                className="w-full px-4 py-3 rounded-xl bg-[#FAF8F2] border border-[#E5E0D5] text-sm text-[#252923] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#73776F] mb-1.5">
                Directions for Guests
              </label>
              <textarea
                rows={2}
                value={meetingPointDirections}
                onChange={(e) => setMeetingPointDirections(e.target.value)}
                placeholder="e.g. Taxis can drop off right in front of the cathedral. Look for the host wearing an ENGIDA badge."
                className="w-full p-3 rounded-xl bg-[#FAF8F2] border border-[#E5E0D5] text-sm text-[#252923] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36] resize-none"
              />
            </div>
          </div>
        </section>

        {/* Step 3: Pricing & Capacity */}
        <section className="bg-white rounded-3xl border border-[#E5E0D5] p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex items-center gap-2.5 pb-4 border-b border-[#E5E0D5]/70">
            <div className="p-2 rounded-xl bg-[#EEF3EF] text-[#234B36]">
              <BadgeDollarSign className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold font-headline text-[#252923]">3. Pricing & Group Logistics</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#73776F] mb-1.5">
                Price per Guest (ETB) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-xs font-bold text-[#73776F]">ETB</span>
                <input
                  type="number"
                  required
                  min={100}
                  step={50}
                  value={pricePerPerson}
                  onChange={(e) => setPricePerPerson(Number(e.target.value))}
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#FAF8F2] border border-[#E5E0D5] text-sm font-bold text-[#252923] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#73776F] mb-1.5">
                Duration <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 2.5 Hours or Half Day"
                className="w-full px-4 py-3 rounded-xl bg-[#FAF8F2] border border-[#E5E0D5] text-sm text-[#252923] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#73776F] mb-1.5">
                Max Group Capacity
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={maxGuests}
                onChange={(e) => setMaxGuests(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl bg-[#FAF8F2] border border-[#E5E0D5] text-sm text-[#252923] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36]"
              />
            </div>
          </div>
        </section>

        {/* Step 4: Description & Inclusions */}
        <section className="bg-white rounded-3xl border border-[#E5E0D5] p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex items-center gap-2.5 pb-4 border-b border-[#E5E0D5]/70">
            <div className="p-2 rounded-xl bg-[#EEF3EF] text-[#234B36]">
              <Clock className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold font-headline text-[#252923]">4. Experience Story & What’s Included</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#73776F] mb-1.5">
                Detailed Description <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what guests will do, feel, and see. What makes your experience special and authentically Ethiopian?"
                className="w-full p-4 rounded-xl bg-[#FAF8F2] border border-[#E5E0D5] text-sm text-[#252923] placeholder-[#73776F] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36] resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#73776F] mb-1.5">
                What’s Included for the Guest
              </label>
              <div className="space-y-2 mb-3">
                {includedItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF8F2] border border-[#E5E0D5] text-xs text-[#252923]"
                  >
                    <span className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[#234B36]" />
                      {item}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveIncluded(idx)}
                      className="text-rose-500 hover:text-rose-700 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newIncluded}
                  onChange={(e) => setNewIncluded(e.target.value)}
                  placeholder="e.g. Traditional tasting platter, entry tickets..."
                  className="flex-1 px-3 py-2 rounded-xl bg-[#FAF8F2] border border-[#E5E0D5] text-xs text-[#252923]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddIncluded();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddIncluded}
                  className="px-4 py-2 rounded-xl bg-[#234B36] text-white text-xs font-bold hover:bg-[#1a3828] transition"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Step 5: Photography & Cover Image */}
        <section className="bg-white rounded-3xl border border-[#E5E0D5] p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex items-center gap-2.5 pb-4 border-b border-[#E5E0D5]/70">
            <div className="p-2 rounded-xl bg-[#EEF3EF] text-[#234B36]">
              <ImageIcon className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold font-headline text-[#252923]">5. Cover Photo</h2>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#73776F] mb-2">
              Select High-Resolution Preset Cover or Enter Custom Image URL
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {PRESET_IMAGES.map((preset, idx) => (
                <div
                  key={idx}
                  onClick={() => setCoverImageUrl(preset.url)}
                  className={`group relative rounded-2xl overflow-hidden aspect-[4/3] cursor-pointer border-2 transition-all ${
                    coverImageUrl === preset.url
                      ? 'border-[#234B36] ring-3 ring-[#234B36]/20'
                      : 'border-transparent hover:border-[#234B36]/50'
                  }`}
                >
                  <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-2.5">
                    <span className="text-[11px] font-bold text-white leading-tight">{preset.label}</span>
                  </div>
                  {coverImageUrl === preset.url && (
                    <div className="absolute top-2 right-2 p-1 rounded-full bg-[#234B36] text-white">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#73776F] mb-1">
                Or Custom Image URL
              </label>
              <input
                type="url"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-4 py-2.5 rounded-xl bg-[#FAF8F2] border border-[#E5E0D5] text-xs text-[#252923] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36]"
              />
            </div>
          </div>
        </section>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-4 pt-4">
          <Link
            href="/host/experiences"
            className="px-6 py-3 rounded-2xl border border-[#E5E0D5] bg-white text-xs font-semibold text-[#73776F] hover:bg-[#FAF8F2] transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-8 py-3.5 rounded-2xl bg-[#234B36] hover:bg-[#1a3828] text-white text-xs font-bold uppercase tracking-wider transition shadow-lg shadow-[#234B36]/20 active:scale-98 cursor-pointer flex items-center gap-2"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Publishing Experience...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Publish Experience Now</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
