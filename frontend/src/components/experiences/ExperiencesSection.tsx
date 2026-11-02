'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { showPlatformToast } from '@/context/ToastContext';
import {
  Sparkles,
  MapPin,
  Clock,
  Users,
  Star,
  CheckCircle2,
  Calendar,
  X,
  Compass,
} from 'lucide-react';

export interface EthiopianExperience {
  id: string;
  title: string;
  category: 'coffee' | 'hiking' | 'heritage' | 'water' | 'wildlife';
  categoryLabel: string;
  location: string;
  region: string;
  duration: string;
  groupSize: string;
  pricePerPerson: number;
  rating: number;
  reviewsCount: number;
  hostName: string;
  hostRole: string;
  hostAvatar: string;
  images: string[];
  description: string;
  highlights: string[];
  included: string[];
}

export const CURATED_ETHIOPIAN_EXPERIENCES: EthiopianExperience[] = [
  {
    id: 'exp-coffee-ceremony',
    title: 'Traditional Addis Ababa Coffee Ceremony & Roasting Workshop',
    category: 'coffee',
    categoryLabel: 'Coffee & Culinary',
    location: 'Bole & Piazza, Addis Ababa',
    region: 'Addis Ababa',
    duration: '2.5 Hours',
    groupSize: 'Up to 6 guests',
    pricePerPerson: 1200,
    rating: 4.98,
    reviewsCount: 64,
    hostName: 'Almaz Tadesse',
    hostRole: 'Master Coffee Roaster & Cultural Host',
    hostAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    images: [
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80',
    ],
    description:
      'Immerse yourself in Ethiopia’s centuries-old coffee ceremony ritual. Wash raw green Arabica beans, hand-roast them over charcoal on a menkeskesha pan, savor the aromatic frankincense, and taste three traditional rounds: Abol, Tona, and Baraka served with fresh popcorn.',
    highlights: [
      'Hand-roast green Ethiopian Yirgacheffe & Sidama beans',
      'Learn the ancient Ethiopian 3-cup cultural progression',
      'Served with traditional freshly popped corn & rue herb (tena adam)',
      'Take home a hand-stamped bag of freshly roasted beans',
    ],
    included: ['Fresh roast coffee', 'Snacks & popcorn', 'Roasting ingredients', 'Cultural booklet'],
  },
  {
    id: 'exp-entoto-sunrise',
    title: 'Entoto Mountain Sunrise Hike & Eucalyptus Forest Picnic',
    category: 'hiking',
    categoryLabel: 'Hiking & Nature',
    location: 'Entoto Park & Mountain Ridge',
    region: 'Addis Ababa',
    duration: '4 Hours',
    groupSize: 'Up to 8 guests',
    pricePerPerson: 1800,
    rating: 4.96,
    reviewsCount: 42,
    hostName: 'Dawit Mengistu',
    hostRole: 'Certified High-Altitude Mountain Guide',
    hostAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    images: [
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
    ],
    description:
      'Rise early to ascend Entoto Ridge (3,000m above sea level) before dawn. Breathe fragrant eucalyptus forest air and watch the sunrise illuminate the entire Addis Ababa skyline. Concludes with a traditional organic mountain breakfast.',
    highlights: [
      'Spectacular 360-degree panoramic sunrise overlooking Addis Ababa',
      'Guided eucalyptus trail walk with endemic bird watching',
      'Traditional Ethiopian breakfast with honey, injera, and spiced tea',
      'Complimentary hotel pickup and drop-off included',
    ],
    included: ['Guided hike', 'Transport', 'Mountain breakfast', 'Trekking poles'],
  },
  {
    id: 'exp-lalibela-churches',
    title: 'Lalibela Rock-Hewn Churches Architectural Masterclass',
    category: 'heritage',
    categoryLabel: 'Heritage & History',
    location: 'Lalibela Sacred Complex',
    region: 'Amhara',
    duration: 'Full Day (6 Hours)',
    groupSize: 'Up to 6 guests',
    pricePerPerson: 3500,
    rating: 4.99,
    reviewsCount: 88,
    hostName: 'Deacon Yohannes',
    hostRole: 'Heritage Historian & Cleric Guide',
    hostAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    images: [
      'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1200&q=80',
    ],
    description:
      'A deep architectural and theological exploration of the 12th-century monolithic rock churches of King Lalibela. Navigate underground tunnels, examine ancient Ge’ez manuscripts, and stand before the cross-shaped Bet Giyorgis.',
    highlights: [
      'Comprehensive access to Northern, Eastern, and Western church clusters',
      'Walk through the dark subterranean "trench of heaven and hell"',
      'Historical narration on ancient medieval carving techniques',
      'Traditional clergy blessing and sacred acoustic chant demonstration',
    ],
    included: ['Certified expert guide', 'Church entry pass assistance', 'Shoe covers', 'Bottled water'],
  },
  {
    id: 'exp-wenchi-crater',
    title: 'Lake Wenchi Volcanic Crater Horseback & Traditional Canoe Trek',
    category: 'water',
    categoryLabel: 'Lakes & Adventure',
    location: 'Wenchi Crater Caldera, Ambo',
    region: 'Oromia',
    duration: '5 Hours',
    groupSize: 'Up to 8 guests',
    pricePerPerson: 2800,
    rating: 4.94,
    reviewsCount: 36,
    hostName: 'Tsegaye Kebede',
    hostRole: 'Wenchi Eco-Tourism Community Leader',
    hostAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80',
    images: [
      'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    ],
    description:
      'Descend 1,000 meters into the volcanic crater of Wenchi on horseback. Cruise across emerald waters on a handmade canoe to explore the 15th-century island monastery of Cherkos, followed by natural bubbling mineral springs.',
    highlights: [
      'Caldera rim horseback descent through alpine bamboo and waterfalls',
      'Canoe crossing of the pristine high-altitude crater lake',
      'Visit the historic St. Kirkos monastery island',
      'Bathe in the natural warm sulfur mineral springs',
    ],
    included: ['Horse rental & handler', 'Canoe voyage', 'Local guide fees', 'Picnic lunch'],
  },
  {
    id: 'exp-simien-wildlife',
    title: 'Simien Mountains Gelada Baboon Escort & Cliffside Trek',
    category: 'wildlife',
    categoryLabel: 'Wildlife & Safari',
    location: 'Debark & Sankaber Escarpment',
    region: 'Amhara',
    duration: '6 Hours',
    groupSize: 'Up to 6 guests',
    pricePerPerson: 4500,
    rating: 4.97,
    reviewsCount: 53,
    hostName: 'Mulugeta Assefa',
    hostRole: 'Senior Wildlife Scout',
    hostAvatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80',
    images: [
      'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80',
    ],
    description:
      'Venture into the UNESCO World Heritage Simien Mountains. Sit among hundreds of wild, peaceful "Bleeding Heart" Gelada baboons as they groom and forage on dramatic vertical cliff edges 3,200m above the Ethiopian plateau.',
    highlights: [
      'Sit safely within 2-3 meters of peaceful wild Gelada primate troops',
      'Hike the dramatic escarpment over Jinbar Waterfall canyon',
      'Spotting chance for Walia Ibex and Lammergeier bearded vultures',
      'Accompanied by an armed national park wildlife scout',
    ],
    included: ['Park scout & wildlife guide', '4WD escort from Debark', 'Picnic refreshments'],
  },
  {
    id: 'exp-tana-monasteries',
    title: 'Lake Tana Historic Island Monasteries Boat Voyage',
    category: 'water',
    categoryLabel: 'Lakes & Adventure',
    location: 'Bahir Dar, Lake Tana',
    region: 'Amhara',
    duration: '4 Hours',
    groupSize: 'Up to 10 guests',
    pricePerPerson: 2200,
    rating: 4.92,
    reviewsCount: 39,
    hostName: 'Captain Solomon & Abba Gebre',
    hostRole: 'Licensed Lake Captain & Monastic Guide',
    hostAvatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=300&q=80',
    images: [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1200&q=80',
    ],
    description:
      'Cruise across Africa’s most historic lake, the source of the Blue Nile. Disembark on Zege Peninsula to visit Ura Kidane Mehret, famous for its 16th-century ecclesiastical wall paintings and ancient royal crowns.',
    highlights: [
      'Private speedboat crossing on the Blue Nile headwaters',
      'Walk through ancient coffee forests to Ura Kidane Mehret',
      'Marvel at biblical murals painted with natural mineral pigments',
      'Witness traditional papyrus "tankwa" boats in action',
    ],
    included: ['Private boat charter', 'All island docking fees', 'Monastic museum entry', 'Bottled water'],
  },
  {
    id: 'exp-gondar-castles',
    title: 'Fasil Ghebbi Imperial Gondar Royal Enclosure Guided Walk',
    category: 'heritage',
    categoryLabel: 'Heritage & History',
    location: 'Royal Castle Enclosure, Gondar',
    region: 'Amhara',
    duration: '3.5 Hours',
    groupSize: 'Up to 8 guests',
    pricePerPerson: 1600,
    rating: 4.95,
    reviewsCount: 47,
    hostName: 'Selamawit Berhanu',
    hostRole: 'Gondar Native & Historic Preservationist',
    hostAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
    images: [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80',
    ],
    description:
      'Known as the "Camelot of Africa," explore the 17th-century stone fortresses built by Emperor Fasilides and his successors. Concludes at Debre Berhan Selassie church, home to the iconic painted ceiling of winged Ethiopian angels.',
    highlights: [
      'Comprehensive walking tour through 6 stone imperial castles',
      'Exclusive access to Emperor Fasilides Bath compound',
      'Detailed narration of medieval Portuguese and Moorish architectural fusion',
      'Examine the iconic 135 winged angel heads of Debre Berhan Selassie',
    ],
    included: ['Heritage guide', 'Castle compound entry', 'Bottled water'],
  },
  {
    id: 'exp-bale-foraging',
    title: 'Bale Mountains Harenna Forest Wild Coffee Exploration',
    category: 'coffee',
    categoryLabel: 'Coffee & Culinary',
    location: 'Harenna Forest & Sanetti Plateau, Bale',
    region: 'Oromia',
    duration: 'Full Day (7 Hours)',
    groupSize: 'Up to 5 guests',
    pricePerPerson: 3800,
    rating: 4.96,
    reviewsCount: 28,
    hostName: 'Jemal Hassen',
    hostRole: 'Bale Forest Forager & Conservationist',
    hostAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80',
    images: [
      'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
    ],
    description:
      'Drive across the highest all-weather road in Africa (Sanetti Plateau at 4,000m) with high chances of spotting the endangered Ethiopian Wolf, then descend into the mystical moss-draped Harenna Forest to forage wild forest coffee.',
    highlights: [
      'Scenic traverse across the alpine Sanetti Plateau afro-alpine roof',
      'Spot rare Ethiopian wolves and giant mole rats in their natural habitat',
      'Trek through moss-covered giant heather trees in Harenna Forest',
      'Harvest wild Arabica coffee berries directly from ancient forest trees',
    ],
    included: ['4WD vehicle & driver', 'Wildlife scout', 'Forest picnic lunch', 'Coffee sample kit'],
  },
];

export default function ExperiencesSection() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [bookingModalExp, setBookingModalExp] = useState<EthiopianExperience | null>(null);
  const [guestCount, setGuestCount] = useState(2);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [contactPhone, setContactPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const categories = [
    { id: 'all', label: 'All Experiences', icon: 'auto_awesome' },
    { id: 'coffee', label: 'Coffee & Culinary', icon: 'coffee' },
    { id: 'hiking', label: 'Hiking & Treks', icon: 'hiking' },
    { id: 'heritage', label: 'Heritage & History', icon: 'castle' },
    { id: 'water', label: 'Lakes & Water', icon: 'water' },
    { id: 'wildlife', label: 'Wildlife & Safari', icon: 'pets' },
  ];

  const filteredExperiences = CURATED_ETHIOPIAN_EXPERIENCES.filter((exp) => {
    if (selectedCategory === 'all') return true;
    return exp.category === selectedCategory;
  });

  const handleBookExperience = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingModalExp) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setBookingSuccess(true);
      showPlatformToast(
        `Experience reserved! ${bookingModalExp.hostName} will confirm your schedule.`,
        'success',
        'Experience Reserved'
      );
      setTimeout(() => {
        setBookingModalExp(null);
        setBookingSuccess(false);
      }, 1800);
    }, 900);
  };

  return (
    <div className="w-full">
      {/* Category Pills Scroller */}
      <div className="bg-[#FAF8F2] border-b border-[#E5E0D5]/70 py-4 px-4 sm:px-6 lg:px-12 sticky top-0 z-30">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-3">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#234B36] text-white shadow-sm'
                      : 'bg-white border border-[#E5E0D5] text-[#252923] hover:text-[#234B36] hover:border-[#234B36]/40'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          <div className="hidden lg:flex items-center gap-2 text-xs font-bold text-[#73776F] shrink-0">
            <Sparkles className="w-4 h-4 text-[#D87836]" />
            <span>Hosted by verified Ethiopian cultural experts</span>
          </div>
        </div>
      </div>

      {/* Main Experience Grid */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 border-b border-[#E5E0D5]/60 pb-5">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#D87836] bg-[#D87836]/15 px-3 py-1 rounded-full">
              Ethiopian Heritage &amp; Adventure
            </span>
            <h2 className="text-2xl sm:text-3xl font-black font-headline text-[#252923] mt-2">
              Unforgettable Cultural Experiences
            </h2>
            <p className="text-xs sm:text-sm text-[#73776F] mt-1">
              Immersive coffee rituals, sacred cliffside treks, high-altitude wildlife encounters, and crater lake expeditions.
            </p>
          </div>

          <span className="text-xs font-bold text-[#234B36] bg-[#234B36]/10 px-3 py-1.5 rounded-full shrink-0">
            {filteredExperiences.length} Curated Experiences Available
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredExperiences.map((exp) => (
            <article
              key={exp.id}
              className="group flex flex-col bg-white rounded-2xl border border-[#E5E0D5] overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              {/* Image & Host Badge */}
              <div className="relative aspect-[4/3] w-full bg-[#FAF8F2] overflow-hidden">
                <img
                  src={exp.images[0]}
                  alt={exp.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#234B36]/90 backdrop-blur-xs text-white shadow-xs">
                  {exp.categoryLabel}
                </span>

                {/* Host Avatar on bottom right of image */}
                <div
                  className="absolute bottom-3 right-3 flex items-center gap-2 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-full shadow-md"
                  title={`Hosted by ${exp.hostName}`}
                >
                  <img
                    src={exp.hostAvatar}
                    alt={exp.hostName}
                    className="w-5 h-5 rounded-full object-cover border border-[#E5E0D5]"
                  />
                  <span className="text-[11px] font-bold text-[#252923] truncate max-w-[90px]">
                    {exp.hostName.split(' ')[0]}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex flex-col flex-1 justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs text-[#73776F] flex items-center gap-1 truncate">
                      <MapPin className="w-3.5 h-3.5 text-[#234B36] shrink-0" />
                      <span className="truncate">{exp.location}</span>
                    </span>
                    <div className="flex items-center gap-1 text-xs font-bold text-[#252923] shrink-0">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{exp.rating.toFixed(2)}</span>
                      <span className="text-[#73776F] font-normal">({exp.reviewsCount})</span>
                    </div>
                  </div>

                  <h3
                    className="text-base font-bold text-[#252923] line-clamp-2 leading-snug group-hover:text-[#234B36] transition-colors"
                    title={exp.title}
                  >
                    {exp.title}
                  </h3>

                  <div className="mt-3 flex items-center gap-3 text-xs text-[#73776F]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#D87836]" />
                      {exp.duration}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-[#D87836]" />
                      {exp.groupSize}
                    </span>
                  </div>

                  <p className="mt-2.5 text-xs text-[#73776F] line-clamp-2 leading-relaxed">
                    {exp.description}
                  </p>
                </div>

                {/* Price & Action */}
                <div className="mt-5 pt-3.5 border-t border-[#E5E0D5]/70 flex items-center justify-between">
                  <div>
                    <span className="text-base font-bold text-[#252923]">
                      ETB {exp.pricePerPerson.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-[#73776F]"> / person</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setBookingModalExp(exp)}
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-[#234B36] text-white text-xs font-bold hover:bg-[#1a3828] transition active:scale-95 shadow-xs cursor-pointer"
                  >
                    <span>Reserve</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Experience Booking Modal */}
      {bookingModalExp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#252923]/60 p-4 backdrop-blur-xs overflow-y-auto animate-fade-in-up">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-[#E5E0D5] my-8">
            <div className="flex items-start justify-between border-b border-[#E5E0D5] pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#D87836] bg-[#D87836]/15 px-2.5 py-0.5 rounded-full">
                  {bookingModalExp.categoryLabel}
                </span>
                <h3 className="text-lg font-bold text-[#252923] mt-1 font-headline">
                  {bookingModalExp.title}
                </h3>
                <p className="text-xs text-[#73776F] mt-0.5">
                  Hosted by {bookingModalExp.hostName} ({bookingModalExp.hostRole})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBookingModalExp(null)}
                className="rounded-full p-1.5 text-[#73776F] hover:bg-[#FAF8F2] hover:text-[#252923] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {bookingSuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-bold text-[#252923]">Experience Confirmed!</h4>
                <p className="text-xs text-[#73776F] max-w-xs mx-auto">
                  Your reservation has been sent directly to {bookingModalExp.hostName}. You will receive a coordination message shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleBookExperience} className="mt-5 space-y-4 text-xs">
                {/* Highlights */}
                <div className="rounded-2xl bg-[#FAF8F2] p-4 border border-[#E5E0D5]">
                  <p className="font-bold text-[#252923] mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#D87836]" />
                    <span>Included in this experience:</span>
                  </p>
                  <ul className="space-y-1 text-[#73776F]">
                    {bookingModalExp.included.map((inc) => (
                      <li key={inc} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{inc}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#252923] mb-1">Date</label>
                    <input
                      type="date"
                      required
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full rounded-xl border border-[#E5E0D5] p-2.5 text-xs text-[#252923] bg-white focus:border-[#234B36] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#252923] mb-1">Guests</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={guestCount <= 1}
                        onClick={() => setGuestCount((c) => Math.max(1, c - 1))}
                        className="w-9 h-9 rounded-xl border border-[#E5E0D5] flex items-center justify-center font-bold text-sm disabled:opacity-30 hover:border-[#234B36]"
                      >
                        -
                      </button>
                      <span className="font-bold text-sm w-6 text-center">{guestCount}</span>
                      <button
                        type="button"
                        onClick={() => setGuestCount((c) => c + 1)}
                        className="w-9 h-9 rounded-xl border border-[#E5E0D5] flex items-center justify-center font-bold text-sm hover:border-[#234B36]"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#252923] mb-1">
                    Contact Phone (Telebirr / WhatsApp)
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+251 9... or 09..."
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full rounded-xl border border-[#E5E0D5] p-2.5 text-xs text-[#252923] bg-white focus:border-[#234B36] focus:outline-none"
                  />
                </div>

                {/* Total breakdown */}
                <div className="border-t border-[#E5E0D5] pt-3 flex items-center justify-between text-sm">
                  <span className="font-medium text-[#73776F]">
                    ETB {bookingModalExp.pricePerPerson.toLocaleString()} × {guestCount} {guestCount === 1 ? 'guest' : 'guests'}
                  </span>
                  <span className="font-bold text-base text-[#234B36]">
                    Total: ETB {(bookingModalExp.pricePerPerson * guestCount).toLocaleString()}
                  </span>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setBookingModalExp(null)}
                    className="px-4 py-2.5 rounded-xl border border-[#E5E0D5] text-xs font-bold text-[#252923] hover:bg-[#FAF8F2]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-[#234B36] text-white text-xs font-bold hover:bg-[#1a3828] shadow-sm disabled:opacity-50"
                  >
                    {isSubmitting ? 'Confirming...' : 'Reserve with Escrow Guarantee'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

