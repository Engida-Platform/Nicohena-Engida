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
  ArrowRight,
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
  Coffee,
  Mountain,
  Castle,
  Waves,
  Trees,
  ShieldCheck,
  Calendar,
  Eye,
  Star,
  Layers,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Wizard Step Definitions
// ─────────────────────────────────────────────────────────────
const STEPS = [
  { number: 1, title: 'Category & Identity', shortTitle: 'Identity', icon: Compass, desc: 'What kind of experience are you hosting?' },
  { number: 2, title: 'Location & Meeting Point', shortTitle: 'Location', icon: MapPin, desc: 'Where do you meet your guests?' },
  { number: 3, title: 'Pricing & Schedule', shortTitle: 'Pricing', icon: BadgeDollarSign, desc: 'Set your ETB rate and group capacity' },
  { number: 4, title: 'Story & What’s Included', shortTitle: 'Itinerary', icon: Layers, desc: 'Craft your narrative and inclusions' },
  { number: 5, title: 'Photos & Final Review', shortTitle: 'Review', icon: ImageIcon, desc: 'Preview your live card and publish' },
];

const CATEGORY_OPTIONS = [
  {
    value: 'coffee',
    label: 'Coffee & Culinary',
    desc: 'Roasting workshops, traditional bunna ceremonies, and authentic street food',
    icon: Coffee,
  },
  {
    value: 'hiking',
    label: 'Hiking & Treks',
    desc: 'Alpine trails, eucalyptus forest walks, volcanic crater lakes, and summits',
    icon: Mountain,
  },
  {
    value: 'heritage',
    label: 'Heritage & History',
    desc: 'Monolithic rock churches, imperial castles, museums, and artisan quarters',
    icon: Castle,
  },
  {
    value: 'water',
    label: 'Lakes & Water',
    desc: 'Island monasteries, boat expeditions, thermal hot springs, and birding',
    icon: Waves,
  },
  {
    value: 'wildlife',
    label: 'Wildlife & Safari',
    desc: 'Endemic Ethiopian wolves, gelada baboons, and national park safaris',
    icon: Trees,
  },
];

const PRESET_IMAGES = [
  {
    label: 'Traditional Coffee Ceremony',
    url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: 'Entoto Mountain Forest',
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
    label: 'Lalibela Rock Churches',
    url: 'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: 'Bale Harenna Cloud Forest',
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80',
  },
];

export default function CreateExperiencePage() {
  const router = useRouter();
  const { user } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Step 1: Identity & Category
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [category, setCategory] = useState<'coffee' | 'hiking' | 'heritage' | 'water' | 'wildlife'>('coffee');

  // Step 2: Location & Meeting
  const [location, setLocation] = useState('Addis Ababa');
  const [region, setRegion] = useState('Addis Ababa');
  const [meetingPoint, setMeetingPoint] = useState('');
  const [meetingPointDirections, setMeetingPointDirections] = useState('');

  // Step 3: Pricing & Capacity
  const [pricePerPerson, setPricePerPerson] = useState(2500);
  const [duration, setDuration] = useState('3 Hours');
  const [maxGuests, setMaxGuests] = useState(8);
  const [selectedSlot, setSelectedSlot] = useState('morning');

  // Step 4: Story & Inclusions
  const [description, setDescription] = useState('');
  const [includedItems, setIncludedItems] = useState<string[]>([
    'Professional local cultural guide',
    'Traditional coffee & Ethiopian snacks',
    'Platform escrow safety protection',
  ]);
  const [newIncluded, setNewIncluded] = useState('');
  const [toBring, setToBring] = useState('Comfortable walking shoes, camera or smartphone, light jacket');

  // Step 5: Photography & Review
  const [coverImageUrl, setCoverImageUrl] = useState(PRESET_IMAGES[0].url);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep = (step: number): boolean => {
    const errs: Record<string, string> = {};

    if (step === 1) {
      if (!title.trim()) errs.title = 'Please enter an experience title';
      else if (title.trim().length < 5) errs.title = 'Title must be at least 5 characters';
    }

    if (step === 2) {
      if (!location.trim()) errs.location = 'Please enter city or destination';
      if (!meetingPoint.trim()) errs.meetingPoint = 'Please specify a meeting landmark';
    }

    if (step === 3) {
      if (!pricePerPerson || pricePerPerson < 100) errs.price = 'Price must be at least ETB 100 per guest';
      if (!duration.trim()) errs.duration = 'Please specify estimated duration';
      if (!maxGuests || maxGuests < 1) errs.maxGuests = 'Capacity must be at least 1 guest';
    }

    if (step === 4) {
      if (!description.trim()) errs.description = 'Please describe what guests will do and experience';
      else if (description.trim().length < 20) errs.description = 'Please provide a more detailed description (at least 20 characters)';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNextStep = () => {
    if (!validateStep(currentStep)) return;
    setCompletedSteps((prev) => (prev.includes(currentStep) ? prev : [...prev, currentStep]));
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStepClick = (stepNum: number) => {
    if (stepNum < currentStep || completedSteps.includes(stepNum) || stepNum === currentStep + 1) {
      if (stepNum > currentStep && !validateStep(currentStep)) return;
      setCompletedSteps((prev) => (prev.includes(currentStep) ? prev : [...prev, currentStep]));
      setCurrentStep(stepNum);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleAddIncluded = () => {
    if (newIncluded.trim()) {
      setIncludedItems([...includedItems, newIncluded.trim()]);
      setNewIncluded('');
    }
  };

  const handleRemoveIncluded = (index: number) => {
    setIncludedItems(includedItems.filter((_, i) => i !== index));
  };

  const handlePublish = () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3) || !validateStep(4)) {
      showPlatformToast('Please verify all required steps before publishing', 'error');
      return;
    }

    setSubmitting(true);
    const expId = `exp-host-${Date.now()}`;
    const selectedCatObj = CATEGORY_OPTIONS.find((c) => c.value === category);

    const newExperience: EthiopianExperience = {
      id: expId,
      title: title.trim(),
      tagline: tagline.trim() || `Authentic ${selectedCatObj?.label || 'experience'} hosted in ${location}`,
      category,
      categoryLabel: selectedCatObj?.label || 'Culture & Heritage',
      location: location.trim(),
      region: region.trim(),
      meetingPoint: meetingPoint.trim(),
      meetingPointDirections: meetingPointDirections.trim() || 'Meet at the landmark. The host will greet you wearing an ENGIDA guest badge.',
      duration: duration.trim(),
      groupSize: `Up to ${maxGuests} guests`,
      maxGuests: Number(maxGuests),
      languages: ['Amharic', 'English'],
      pricePerPerson: Number(pricePerPerson),
      rating: 5.0,
      reviewsCount: 1,
      hostName: user?.name || 'Verified Host',
      hostRole: 'Host & Local Guide',
      hostAvatar: (user as any)?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      hostBio: `Passionate about sharing the deep hospitality and unique traditions of ${location} with visitors.`,
      hostResponseRate: '100% response rate',
      images: [coverImageUrl],
      description: description.trim(),
      highlights: [
        `Intimate small group experience (max ${maxGuests} guests)`,
        'Hands-on authentic Ethiopian cultural participation',
        'Official ENGIDA Escrow Protected checkout via Chapa',
      ],
      itinerary: [
        {
          time: 'First 30 Mins',
          title: 'Welcome & Gathering',
          description: `Meet at ${meetingPoint} for introductions and an overview of what we will discover together.`,
        },
        {
          time: 'Main Journey',
          title: 'Core Activity & Immersion',
          description: description.slice(0, 180) + '...',
        },
        {
          time: 'Conclusion',
          title: 'Questions, Photos & Farewell',
          description: 'Share reflections, take memorable photos, and conclude with warm farewells.',
        },
      ],
      included: includedItems,
      toBring: toBring.split(',').map((s) => s.trim()).filter(Boolean),
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
          comment: 'Outstanding host! Everything was deeply authentic, punctual, and well organized. 10/10!',
        },
      ],
    };

    saveHostExperience(newExperience);

    setTimeout(() => {
      setSubmitting(false);
      showPlatformToast('Your experience has been published live on ENGIDA!', 'success', 'Experience Published');
      router.push('/host/experiences');
    }, 700);
  };

  const progressPercent = Math.round((currentStep / STEPS.length) * 100);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 max-w-5xl mx-auto text-[#252923] font-body">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E0D5]">
        <div className="flex items-center gap-3">
          <Link
            href="/host/experiences"
            className="p-2 rounded-xl border border-[#E5E0D5] bg-white text-[#252923] hover:bg-[#FAF8F2] transition cursor-pointer shadow-2xs"
            title="Return to Experiences"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight font-headline text-[#252923]">
                Create an Experience
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#234B36]/10 text-[#234B36] border border-[#234B36]/20">
                Step-by-Step Wizard
              </span>
            </div>
            <p className="text-xs text-[#73776F] mt-0.5">
              Publish authentic tours, workshops, and outdoor journeys for travelers across Ethiopia
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-[#234B36] bg-[#EEF3EF] px-3 py-1.5 rounded-full border border-[#234B36]/20 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#D87836]" />
            <span>Instant Live Publish</span>
          </span>
        </div>
      </div>

      {/* ── Sleek Multi-Step Progress Tracker ── */}
      <div className="bg-white rounded-2xl border border-[#E5E0D5] p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[#252923] flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-[#234B36] text-white flex items-center justify-center text-[11px] font-black">
              {currentStep}
            </span>
            <span>Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].title}</span>
          </span>
          <span className="font-mono text-xs text-[#73776F] font-semibold">{progressPercent}% Completed</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-[#EEF3EF] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#234B36] transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Step Buttons (Desktop / Tablet) */}
        <div className="hidden sm:grid grid-cols-5 gap-2 pt-1">
          {STEPS.map((s) => {
            const isCurrent = s.number === currentStep;
            const isCompleted = completedSteps.includes(s.number) || s.number < currentStep;
            const Icon = s.icon;
            return (
              <button
                key={s.number}
                type="button"
                onClick={() => handleStepClick(s.number)}
                className={`p-2 rounded-xl text-left transition cursor-pointer flex items-center gap-2 border ${
                  isCurrent
                    ? 'border-[#234B36] bg-[#EEF3EF] ring-2 ring-[#234B36]/20'
                    : isCompleted
                    ? 'border-[#E5E0D5] bg-white hover:bg-[#FAF8F2]'
                    : 'border-transparent text-[#73776F]/60'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                    isCurrent
                      ? 'bg-[#234B36] text-white'
                      : isCompleted
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-[#EEF3EF] text-[#73776F]'
                  }`}
                >
                  {isCompleted && !isCurrent ? <Check className="w-3.5 h-3.5" /> : s.number}
                </div>
                <div className="min-w-0">
                  <p className={`text-[11px] font-bold truncate ${isCurrent ? 'text-[#252923]' : 'text-[#73776F]'}`}>
                    {s.shortTitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Active Wizard Step Content ── */}
      <div className="bg-white rounded-3xl border border-[#E5E0D5] p-6 sm:p-8 shadow-xs min-h-[420px] flex flex-col justify-between">
        <div>
          {/* STEP 1: Category & Identity */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="pb-4 border-b border-[#E5E0D5]/70">
                <h2 className="text-xl font-bold font-headline text-[#252923]">1. Category & Experience Identity</h2>
                <p className="text-xs text-[#73776F] mt-1">
                  Choose the category that best represents your experience and give it an engaging title
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#73776F] mb-2">
                    Experience Category <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {CATEGORY_OPTIONS.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = category === cat.value;
                      return (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setCategory(cat.value as any)}
                          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'border-[#234B36] bg-[#EEF3EF] ring-2 ring-[#234B36]/20 shadow-xs'
                              : 'border-[#E5E0D5] bg-[#FAF8F2] hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className={`p-2 rounded-xl ${isSelected ? 'bg-[#234B36] text-white' : 'bg-white text-[#234B36] border border-[#E5E0D5]'}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-[#234B36]" />}
                          </div>
                          <div>
                            <p className="font-bold text-xs text-[#252923]">{cat.label}</p>
                            <p className="text-[11px] text-[#73776F] mt-1 line-clamp-2">{cat.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

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
                  {errors.title && <p className="text-xs text-rose-600 font-semibold mt-1">{errors.title}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#73776F] mb-1.5">
                    Catchy Tagline / Subtitle
                  </label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="e.g. Discover the ritual from green coffee bean to third fragrant cup"
                    className="w-full px-4 py-3 rounded-xl bg-[#FAF8F2] border border-[#E5E0D5] text-sm text-[#252923] placeholder-[#73776F] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Location & Meeting Point */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="pb-4 border-b border-[#E5E0D5]/70">
                <h2 className="text-xl font-bold font-headline text-[#252923]">2. Location & Meeting Instructions</h2>
                <p className="text-xs text-[#73776F] mt-1">
                  Specify the destination and where your guests should meet you on the day of the journey
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#73776F] mb-1.5">
                    City / Destination <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Addis Ababa (Bole & Piazza)"
                    className="w-full px-4 py-3 rounded-xl bg-[#FAF8F2] border border-[#E5E0D5] text-sm text-[#252923] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36]"
                  />
                  {errors.location && <p className="text-xs text-rose-600 font-semibold mt-1">{errors.location}</p>}
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
                    Exact Meeting Point Landmark <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={meetingPoint}
                    onChange={(e) => setMeetingPoint(e.target.value)}
                    placeholder="e.g. St. George Cathedral Square (Piazza) or Bole Medhanialem Cathedral Entrance"
                    className="w-full px-4 py-3 rounded-xl bg-[#FAF8F2] border border-[#E5E0D5] text-sm text-[#252923] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36]"
                  />
                  {errors.meetingPoint && <p className="text-xs text-rose-600 font-semibold mt-1">{errors.meetingPoint}</p>}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#73776F] mb-1.5">
                    Directions & Host Identification
                  </label>
                  <textarea
                    rows={3}
                    value={meetingPointDirections}
                    onChange={(e) => setMeetingPointDirections(e.target.value)}
                    placeholder="e.g. Taxis can drop off right in front of the cathedral. Look for the host holding an ENGIDA guest badge."
                    className="w-full p-3.5 rounded-xl bg-[#FAF8F2] border border-[#E5E0D5] text-sm text-[#252923] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36] resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Pricing & Capacity */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="pb-4 border-b border-[#E5E0D5]/70">
                <h2 className="text-xl font-bold font-headline text-[#252923]">3. Pricing & Group Logistics</h2>
                <p className="text-xs text-[#73776F] mt-1">
                  Establish your price in Ethiopian Birr (ETB), guest capacity, and duration
                </p>
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
                      className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#FAF8F2] border border-[#E5E0D5] text-base font-bold text-[#252923] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36]"
                    />
                  </div>
                  {errors.price && <p className="text-xs text-rose-600 font-semibold mt-1">{errors.price}</p>}
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
                    placeholder="e.g. 2.5 Hours, Half Day, Full Day"
                    className="w-full px-4 py-3 rounded-xl bg-[#FAF8F2] border border-[#E5E0D5] text-sm text-[#252923] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36]"
                  />
                  {errors.duration && <p className="text-xs text-rose-600 font-semibold mt-1">{errors.duration}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#73776F] mb-1.5">
                    Max Group Capacity <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={maxGuests}
                    onChange={(e) => setMaxGuests(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl bg-[#FAF8F2] border border-[#E5E0D5] text-sm text-[#252923] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36]"
                  />
                  {errors.maxGuests && <p className="text-xs text-rose-600 font-semibold mt-1">{errors.maxGuests}</p>}
                </div>
              </div>

              {/* Chapa Escrow Guarantee Note */}
              <div className="p-4 rounded-2xl bg-[#EEF3EF] border border-[#234B36]/20 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#234B36] shrink-0 mt-0.5" />
                <div className="text-xs text-[#234B36] leading-relaxed">
                  <span className="font-bold">Guaranteed Ethiopian Escrow Settlement:</span> Guests pay securely through Chapa via Telebirr, CBE Birr, or cards. Payouts are safely held in escrow and released to you directly upon completion of the tour.
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Story & Inclusions */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="pb-4 border-b border-[#E5E0D5]/70">
                <h2 className="text-xl font-bold font-headline text-[#252923]">4. Experience Story & What’s Included</h2>
                <p className="text-xs text-[#73776F] mt-1">
                  Describe the itinerary and detail the hospitality, equipment, and tastings provided to guests
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#73776F] mb-1.5">
                    Detailed Experience Story <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what guests will experience, taste, learn, and see. What makes your session distinctively authentic?"
                    className="w-full p-4 rounded-xl bg-[#FAF8F2] border border-[#E5E0D5] text-sm text-[#252923] placeholder-[#73776F] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36] resize-none"
                  />
                  {errors.description && <p className="text-xs text-rose-600 font-semibold mt-1">{errors.description}</p>}
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
                          className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
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
                      placeholder="e.g. Fresh coffee tasting, entrance fees, transportation..."
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
                      className="px-4 py-2 rounded-xl bg-[#234B36] text-white text-xs font-bold hover:bg-[#1a3828] transition cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#73776F] mb-1.5">
                    What Guests Should Bring (Comma Separated)
                  </label>
                  <input
                    type="text"
                    value={toBring}
                    onChange={(e) => setToBring(e.target.value)}
                    placeholder="e.g. Walking shoes, rain jacket, camera"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#FAF8F2] border border-[#E5E0D5] text-xs text-[#252923]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Photos & Live Review */}
          {currentStep === 5 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="pb-4 border-b border-[#E5E0D5]/70">
                <h2 className="text-xl font-bold font-headline text-[#252923]">5. Cover Photography & Final Review</h2>
                <p className="text-xs text-[#73776F] mt-1">
                  Choose your high-resolution cover photo and verify your experience before instant publishing
                </p>
              </div>

              {/* Photo Presets */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#73776F] mb-2">
                  Select Preset Photography or Paste Custom Image URL
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

                <input
                  type="url"
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FAF8F2] border border-[#E5E0D5] text-xs text-[#252923]"
                />
              </div>

              {/* Live Preview Card */}
              <div className="pt-4 border-t border-[#E5E0D5]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#73776F] mb-3">
                  Live Public Feed Card Preview
                </h3>
                <div className="max-w-md bg-white rounded-3xl border border-[#E5E0D5] overflow-hidden shadow-md">
                  <div className="relative h-44 w-full bg-[#E5E0D5]/50 overflow-hidden">
                    <img src={coverImageUrl} alt={title} className="w-full h-full object-cover" />
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#234B36] text-white shadow-xs">
                      {CATEGORY_OPTIONS.find((c) => c.value === category)?.label}
                    </span>
                    <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500 text-white shadow-xs">
                      Ready to Publish
                    </span>
                  </div>
                  <div className="p-4 space-y-2">
                    <h4 className="font-bold text-sm text-[#252923]">{title || 'Untitled Experience'}</h4>
                    <p className="text-xs text-[#73776F] line-clamp-1">{tagline || 'Experience Ethiopia’s authentic hospitality'}</p>
                    <div className="flex items-center gap-3 text-xs text-[#73776F] pt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#234B36]" />
                        {location}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#234B36]" />
                        {duration}
                      </span>
                      <span>•</span>
                      <span>Up to {maxGuests} guests</span>
                    </div>
                    <div className="pt-2 border-t border-[#E5E0D5] flex items-center justify-between">
                      <span className="text-base font-black text-[#234B36]">
                        ETB {pricePerPerson.toLocaleString()} <span className="text-xs text-[#73776F] font-normal">/ guest</span>
                      </span>
                      <span className="text-xs font-bold text-[#234B36]">Hosted by {user?.name || 'You'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Wizard Sticky Footer Actions ── */}
        <div className="flex items-center justify-between pt-8 border-t border-[#E5E0D5] mt-8">
          <div>
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-[#E5E0D5] bg-white text-xs font-semibold text-[#252923] hover:bg-[#FAF8F2] transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <Link
                href="/host/experiences"
                className="px-5 py-2.5 rounded-xl border border-[#E5E0D5] bg-white text-xs font-semibold text-[#73776F] hover:bg-[#FAF8F2] transition"
              >
                Cancel
              </Link>
            )}
          </div>

          <div>
            {currentStep < STEPS.length ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-[#234B36] hover:bg-[#1a3828] text-white text-xs font-bold transition shadow-md shadow-[#234B36]/20 active:scale-98 cursor-pointer"
              >
                <span>Continue: {STEPS[currentStep].shortTitle}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePublish}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-[#234B36] hover:bg-[#1a3828] text-white text-xs font-bold uppercase tracking-wider transition shadow-lg shadow-[#234B36]/25 active:scale-98 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Publishing Live...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Publish Experience Now</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
