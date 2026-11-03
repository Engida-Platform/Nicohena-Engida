export interface ExperienceItineraryStep {
  time?: string;
  title: string;
  description: string;
}

export interface ExperienceReviewItem {
  id: string;
  author: string;
  date: string;
  avatar: string;
  rating: number;
  comment: string;
}

export interface EthiopianExperience {
  id: string;
  title: string;
  tagline: string;
  category: 'coffee' | 'hiking' | 'heritage' | 'water' | 'wildlife';
  categoryLabel: string;
  location: string;
  region: string;
  meetingPoint: string;
  meetingPointDirections: string;
  duration: string;
  groupSize: string;
  maxGuests: number;
  languages: string[];
  pricePerPerson: number;
  rating: number;
  reviewsCount: number;
  hostName: string;
  hostRole: string;
  hostAvatar: string;
  hostBio: string;
  hostResponseRate: string;
  images: string[];
  description: string;
  highlights: string[];
  itinerary: ExperienceItineraryStep[];
  included: string[];
  toBring: string[];
  timeSlots: { id: string; label: string; time: string }[];
  reviews: ExperienceReviewItem[];
}

export const CURATED_ETHIOPIAN_EXPERIENCES: EthiopianExperience[] = [
  {
    id: 'exp-coffee-ceremony',
    title: 'Traditional Addis Ababa Coffee Ceremony & Roasting Workshop',
    tagline: 'Experience Ethiopia’s sacred coffee ritual from raw green bean to third cup',
    category: 'coffee',
    categoryLabel: 'Coffee & Culinary',
    location: 'Bole & Piazza, Addis Ababa',
    region: 'Addis Ababa',
    meetingPoint: 'St. George Cathedral Square (Piazza) or Bole Medhanialem Entrance',
    meetingPointDirections: 'Meet in front of the historic Piazza monument. Taxis can drop off directly at St. George roundabout. Private hotel pickup available on request.',
    duration: '2.5 Hours',
    groupSize: 'Up to 6 guests',
    maxGuests: 6,
    languages: ['English', 'Amharic (አማርኛ)'],
    pricePerPerson: 1200,
    rating: 4.98,
    reviewsCount: 64,
    hostName: 'Almaz Tadesse',
    hostRole: 'Master Coffee Roaster & Cultural Host',
    hostAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    hostBio: 'Born and raised in the heart of Addis Ababa, Almaz has practiced the traditional coffee ceremony for over 22 years. She sources single-origin beans directly from smallholder farmers in Yirgacheffe and Sidama.',
    hostResponseRate: '100% within an hour',
    images: [
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1200&q=80',
    ],
    description:
      'Immerse yourself in Ethiopia’s centuries-old coffee ceremony ritual. Wash raw green Arabica beans, hand-roast them over charcoal on a menkeskesha pan, savor the aromatic frankincense smoke, and taste three traditional rounds: Abol, Tona, and Baraka served with fresh popcorn.',
    highlights: [
      'Hand-roast green Ethiopian Yirgacheffe & Sidama Arabica beans',
      'Learn the ancient spiritual significance of the three cups: Abol, Tona, Baraka',
      'Experience traditional frankincense burning and clay jebena brewing',
      'Take home a complimentary 250g bag of freshly roasted Ethiopian beans',
    ],
    itinerary: [
      {
        time: '00:00 - 00:30',
        title: 'Welcome & Green Bean Varietal Tasting',
        description: 'Gather around the grass-strewn floor, taste raw washed vs natural beans, and learn why Ethiopia is the biological birthplace of Coffea Arabica.',
      },
      {
        time: '00:30 - 01:15',
        title: 'Washing & Charcoal Roasting on the Menkeskesha',
        description: 'Wash the beans in cold water, shake over flaming charcoal embers on a perforated iron pan, and watch them transition from green to deep aromatic chestnut.',
      },
      {
        time: '01:15 - 01:45',
        title: 'The Frankincense Smoke & Mortar Grinding',
        description: 'Pass the smoking pan around so guests can waft and inhale the rich aromatic aroma. Crush the beans in a traditional wooden mukecha mortar with heavy iron pestle.',
      },
      {
        time: '01:45 - 02:30',
        title: 'The Three Rounds of Jebena Serving',
        description: 'Brew in the black clay jebena pot, pouring from height into handleless sini cups. Savor Abol (strongest), Tona (second blessing), and Baraka (peace blessing) served with salted popcorn and traditional dabo.',
      },
    ],
    included: [
      'All single-origin coffee beans & brewing equipment',
      'Traditional snacks: popcorn, roasted barley (kolo), and local bread (dabo)',
      '250g bag of freshly roasted Ethiopian beans to take home',
      'Mineral bottled water and traditional herbal tea',
    ],
    toBring: [
      'Comfortable casual clothing',
      'Camera or smartphone for photos',
      'Appetite for rich authentic coffee',
    ],
    timeSlots: [
      { id: 'morning', label: 'Morning Session', time: '09:30 AM – 12:00 PM' },
      { id: 'afternoon', label: 'Afternoon Session', time: '03:00 PM – 05:30 PM' },
    ],
    reviews: [
      {
        id: 'rev-1',
        author: 'Michael R. (London, UK)',
        date: '2 weeks ago',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
        rating: 5,
        comment: 'The highlight of our Addis trip! Almaz is an incredible host and storyteller. Learning the difference between Abol and Baraka made me appreciate Ethiopian coffee culture on a completely new level.',
      },
      {
        id: 'rev-2',
        author: 'Bethlehem K. (Addis Ababa)',
        date: '1 month ago',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        rating: 5,
        comment: 'I brought visiting colleagues here and they were blown away. The frankincense and fresh roasted aroma inside the traditional room was unforgettable.',
      },
    ],
  },
  {
    id: 'exp-entoto-sunrise',
    title: 'Entoto Mountain Sunrise Hike & Eucalyptus Forest Picnic',
    tagline: 'Trek the panoramic ridge of Addis Ababa and enjoy an open-air mountain breakfast',
    category: 'hiking',
    categoryLabel: 'Hiking & Treks',
    location: 'Mount Entoto, Addis Ababa',
    region: 'Addis Ababa',
    meetingPoint: 'Entoto Park Main Gate (Upper Parking Lot)',
    meetingPointDirections: 'Accessible via taxi or RIDE directly along the Entoto asphalt highway. Guide will hold an ENGIDA banner at the ticket pavilion.',
    duration: '4 Hours',
    groupSize: 'Up to 8 guests',
    maxGuests: 8,
    languages: ['English', 'Amharic (አማርኛ)'],
    pricePerPerson: 1800,
    rating: 4.95,
    reviewsCount: 52,
    hostName: 'Dawit Mengistu',
    hostRole: 'Certified High-Altitude Trekking Guide',
    hostAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    hostBio: 'Dawit has guided hiking and endurance groups across Mount Entoto, Simien, and Bale for 9 years. He is first-aid certified and deeply passionate about native afro-montane flora.',
    hostResponseRate: '98% response rate',
    images: [
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80',
    ],
    description:
      'Ascend 3,200 meters above sea level to catch the sunrise breaking over the Addis Ababa skyline. Hike through aromatic eucalyptus trails, visit the historic Menelik II palace compound, and relish an outdoor Ethiopian breakfast with freshly brewed spiced tea.',
    highlights: [
      'Sunrise viewpoint capturing the entire expanse of Addis Ababa from 3,200m',
      'Historical narration of Emperor Menelik II & Empress Taitu’s founding of the capital',
      'Scenic eucalyptus and native juniper forest walking trail',
      'Outdoor Ethiopian mountain breakfast with kinche, chechebsa, and hot spiced tea',
    ],
    itinerary: [
      {
        time: '06:00 - 06:45',
        title: 'Morning Ascent & Sunrise Viewing',
        description: 'Meet before dawn and hike to the crest of the ridge to watch the first golden light illuminate Addis Ababa below.',
      },
      {
        time: '06:45 - 08:00',
        title: 'Menelik II Palace & Historic Maryam Church Compound',
        description: 'Explore the 19th-century royal enclosure and learn how the capital was planned from this mountain vantage.',
      },
      {
        time: '08:00 - 09:30',
        title: 'Forest Trail Trek to Hidden Valley',
        description: 'A moderate descent through ancient eucalyptus groves, listening to native highland birds and mountain breezes.',
      },
      {
        time: '09:30 - 10:00',
        title: 'Traditional Ethiopian Mountain Breakfast',
        description: 'Sit on picnic blankets overlooking the valley and enjoy hot spiced tea, fresh injera firfir, kinche, and chechebsa.',
      },
    ],
    included: [
      'Certified trekking guide & park permits',
      'Full outdoor breakfast and hot spiced tea',
      'Walking sticks and rain ponchos (if needed)',
      'First-aid support kit & bottled mineral water',
    ],
    toBring: [
      'Warm fleece jacket or hoodie (morning can be chilly at 3,200m)',
      'Comfortable hiking shoes with good grip',
      'Sunglasses and sun hat',
    ],
    timeSlots: [
      { id: 'early-bird', label: 'Sunrise Trek', time: '06:00 AM – 10:00 AM' },
      { id: 'mid-morning', label: 'Forest Day Hike', time: '09:00 AM – 01:00 PM' },
    ],
    reviews: [
      {
        id: 'rev-entoto-1',
        author: 'Elena S. (Madrid, Spain)',
        date: '3 weeks ago',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
        rating: 5,
        comment: 'Watching the sunrise over Addis Ababa while breathing in the eucalyptus air was breathtaking. Dawit is a top guide!',
      },
    ],
  },
  {
    id: 'exp-lalibela-churches',
    title: 'Lalibela Rock-Hewn Churches Architectural Masterclass',
    tagline: 'Private guided architectural walkthrough of the 12th-century monolithic wonders',
    category: 'heritage',
    categoryLabel: 'Heritage & History',
    location: 'Lalibela, Amhara Region',
    region: 'Amhara',
    meetingPoint: 'Bete Giyorgis (Church of St. George) Main Ticket Office',
    meetingPointDirections: 'Located at the northern cluster gate. The guide will meet you inside the verified reception pavilion.',
    duration: 'Full Day (6 Hours)',
    groupSize: 'Up to 6 guests',
    maxGuests: 6,
    languages: ['English', 'Amharic (አማርኛ)', 'French'],
    pricePerPerson: 3500,
    rating: 5.0,
    reviewsCount: 88,
    hostName: 'Yohannes Fikre',
    hostRole: 'Lalibela Cleric & Heritage Historian',
    hostAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    hostBio: 'Born in Lalibela, Yohannes was educated in the liturgical traditions of the Ethiopian Orthodox Tewahedo Church and holds a Master’s degree in Medieval Ethiopian Architecture.',
    hostResponseRate: '100% within an hour',
    images: [
      'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1200&q=80',
    ],
    description:
      'Unravel the engineering marvels of King Lalibela’s 11 monolithic rock-cut churches, carved entirely out of solid volcanic basalt. Walk through subterranean passageways, examine 800-year-old parchment manuscripts, and stand before the world-renowned cruciform Bete Giyorgis.',
    highlights: [
      'Private access to both Northern and Western church clusters',
      'Traverse the narrow underground trenches and the pitch-black "Tunnel of Hell & Purgatory"',
      'Witness the iconic Greek-cross Bete Giyorgis carved 12 meters into the bedrock',
      'Private audience with senior church clerics blessing with 800-year-old brass Lalibela crosses',
    ],
    itinerary: [
      {
        time: '08:30 - 11:30',
        title: 'Northern Cluster: Bete Medhane Alem & Bete Maryam',
        description: 'Explore the world’s largest monolithic church with 72 external columns and the elaborately painted frescoes of Bete Maryam.',
      },
      {
        time: '11:30 - 13:00',
        title: 'Traditional Fasting Buffet Lunch in Town',
        description: 'Rest and enjoy authentic Ethiopian shiro, gomen, and misir with fresh teff injera at a scenic cliffside restaurant.',
      },
      {
        time: '13:00 - 15:30',
        title: 'The Western Cluster & Cruciform Bete Giyorgis',
        description: 'Walk through the basalt trenches and stand before St. George’s church, sculpted seamlessly from a single piece of volcanic tufa.',
      },
    ],
    included: [
      'Full-day private licensed heritage historian',
      'Traditional cliffside lunch & drinks',
      'Shoe handler fees at all church entrances',
      'Flashlights for underground tunnels',
    ],
    toBring: [
      'Easy slip-on shoes (shoes are removed when entering churches)',
      'Modest attire covering shoulders and knees; white scarves (netela) provided if requested',
      'Sun hat and sunglasses',
    ],
    timeSlots: [
      { id: 'full-day', label: 'Full Day Masterclass', time: '08:30 AM – 03:30 PM' },
    ],
    reviews: [
      {
        id: 'rev-lalibela-1',
        author: 'Dr. Arthur C. (Boston, USA)',
        date: '1 week ago',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
        rating: 5,
        comment: 'Yohannes is a living encyclopedia. Understanding the drainage channels and biblical symbolism brought this UNESCO wonder to life.',
      },
    ],
  },
  {
    id: 'exp-wenchi-crater',
    title: 'Lake Wenchi Volcanic Crater Horseback & Traditional Canoe Trek',
    tagline: 'Descend into an extinct volcanic caldera featuring mineral hot springs and island chapels',
    category: 'water',
    categoryLabel: 'Lakes & Water',
    location: 'Wenchi Crater Lake, Oromia',
    region: 'Oromia',
    meetingPoint: 'Wenchi Ecotourism Association Visitor Center',
    meetingPointDirections: 'Located 155 km west of Addis Ababa near Ambo. 4WD recommended for the scenic gravel road.',
    duration: 'Full Day (8 Hours)',
    groupSize: 'Up to 10 guests',
    maxGuests: 10,
    languages: ['English', 'Amharic (አማርኛ)', 'Afaan Oromoo'],
    pricePerPerson: 2800,
    rating: 4.97,
    reviewsCount: 73,
    hostName: 'Tolessa Gemeda',
    hostRole: 'Wenchi Community Ecotourism Leader',
    hostAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80',
    hostBio: 'A native of the Wenchi rim, Tolessa has led community-based ecotourism projects protecting the lake watershed for 12 years. All proceeds directly support local farmers and horse guides.',
    hostResponseRate: '95% response rate',
    images: [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80',
    ],
    description:
      'Descend 3,000 meters into the lush crater basin of an extinct volcano. Ride sturdy Ethiopian highland horses down forested switchbacks, glide across crystal turquoise caldera waters in handcrafted wooden canoes, and visit the serene 15th-century island monastery of Cherkos.',
    highlights: [
      'Horseback descent through cascading waterfalls and natural bubbling mineral springs',
      'Traditional wooden dugout canoe voyage across emerald crater lake waters',
      'Visit the secluded island monastery of Kirkos (Cherkos)',
      'Organic lakeside lunch cooked by local Wenchi cooperative women',
    ],
    itinerary: [
      {
        time: '08:30 - 09:30',
        title: 'Caldera Rim Briefing & Horse Mount',
        description: 'Meet at the crater rim (3,450m), meet your gentle horse and guide, and begin the scenic descent through flowering highland meadows.',
      },
      {
        time: '09:30 - 11:30',
        title: 'Valley Waterfall Walk & Mineral Springs',
        description: 'Dismount and walk alongside natural bubbling soda springs and hidden valley waterfalls.',
      },
      {
        time: '11:30 - 13:00',
        title: 'Wooden Canoe Crossing to Cherkos Island',
        description: 'Paddle across the pristine crater waters to the peaceful 15th-century island sanctuary.',
      },
      {
        time: '13:00 - 14:30',
        title: 'Lakeside Organic Village Lunch',
        description: 'Savor traditional roasted local potatoes, fresh bread, butter, and honey harvested directly from crater beehives.',
      },
    ],
    included: [
      'Highland horse & dedicated horse handler',
      'Canoe crossing & island entry fees',
      'Traditional organic village lunch & bottled water',
      'Community tourism conservation levy',
    ],
    toBring: [
      'Long trousers suitable for horse riding',
      'Sunscreen and insect repellent',
      'Light waterproof windbreaker',
    ],
    timeSlots: [
      { id: 'full-day', label: 'Full Day Expedition', time: '08:30 AM – 04:30 PM' },
    ],
    reviews: [
      {
        id: 'rev-wenchi-1',
        author: 'Sara & Daniel M. (Toronto, Canada)',
        date: '2 weeks ago',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
        rating: 5,
        comment: 'Lake Wenchi is heaven on earth! Gliding across the lake in the wooden canoe with the misty crater walls rising all around is something we will never forget.',
      },
    ],
  },
  {
    id: 'exp-simien-wildlife',
    title: 'Simien Mountains Gelada Baboon Escort & Cliffside Trek',
    tagline: 'Walk alongside thousands of peaceful "Bleeding Heart" primates on the edge of the abyss',
    category: 'wildlife',
    categoryLabel: 'Wildlife & Safari',
    location: 'Sankaber & Jinbar, Simien Mountains',
    region: 'Amhara',
    meetingPoint: 'Debark Park Headquarters (Simien Mountains National Park)',
    meetingPointDirections: 'Located in Debark town. Registered scout and 4WD departure point.',
    duration: 'Full Day (7 Hours)',
    groupSize: 'Up to 6 guests',
    maxGuests: 6,
    languages: ['English', 'Amharic (አማርኛ)'],
    pricePerPerson: 4200,
    rating: 4.99,
    reviewsCount: 91,
    hostName: 'Bereket Assefa',
    hostRole: 'Senior Simien Wildlife Tracker & Scout',
    hostAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    hostBio: 'Bereket has tracked wildlife in the Simien range for over 15 years. He specializes in primate ethology and birding photography along the great African escarpment.',
    hostResponseRate: '99% response rate',
    images: [
      'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80',
    ],
    description:
      'Trek along dramatic cliff edges plunging 1,500 meters into deep river valleys. Sit peacefully amidst wild families of Gelada baboons as they groom and forage grass, watch majestic Lammergeier bearded vultures soar on thermal drafts, and witness the roaring Jinbar waterfall.',
    highlights: [
      'Get within arm’s reach of wild, docile Gelada baboons in their natural alpine meadow',
      'Breathtaking escarpment views dropping 1,500m straight down into deep gorges',
      'Spot the dramatic 500-meter drop of Jinbar Waterfall',
      'Photography guidance for mountain raptors and endemic afro-alpine wildflowers',
    ],
    itinerary: [
      {
        time: '08:00 - 09:30',
        title: 'Debark to Sankaber Scenic Drive',
        description: 'Drive through alpine heather forests into the UNESCO World Heritage park.',
      },
      {
        time: '09:30 - 12:30',
        title: 'Gelada Primate Encounter & Meadow Walk',
        description: 'Walk slowly into the large foraging troop of Geladas. Observe their vocalizations, grooming hierarchy, and unique grass-eating behavior.',
      },
      {
        time: '12:30 - 13:30',
        title: 'Cliffside Escarpment Picnic',
        description: 'Enjoy a warm packed meal perched high above the vast northern Ethiopian plains.',
      },
      {
        time: '13:30 - 15:00',
        title: 'Jinbar Waterfall Abyss Lookout',
        description: 'Trek to the spectacular viewpoint overlooking one of Africa’s deepest waterfalls plunging into the gorge.',
      },
    ],
    included: [
      'Government park entry permit & armed eco-scout',
      'Certified senior wildlife tracker',
      'High-altitude packed lunch & hot thermos beverages',
      'Telescope & binoculars for raptor spotting',
    ],
    toBring: [
      'Sturdy hiking boots with ankle support',
      'Warm layers (wind can be brisk along the 3,300m cliffs)',
      'Telephoto camera lens or binoculars',
    ],
    timeSlots: [
      { id: 'full-day', label: 'Full Day Safari', time: '08:00 AM – 03:30 PM' },
    ],
    reviews: [
      {
        id: 'rev-simien-1',
        author: 'Charlotte W. (Sydney, Australia)',
        date: '1 month ago',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        rating: 5,
        comment: 'Sitting in a meadow surrounded by 100 wild Geladas was one of the most magical experiences of my life. Bereket kept us safe and took fantastic photos for us!',
      },
    ],
  },
  {
    id: 'exp-tana-monasteries',
    title: 'Lake Tana Historic Island Monasteries Boat Voyage',
    tagline: 'Private motorboat voyage to medieval painted churches on Ethiopia’s largest lake',
    category: 'water',
    categoryLabel: 'Lakes & Water',
    location: 'Lake Tana & Zege Peninsula, Bahir Dar',
    region: 'Amhara',
    meetingPoint: 'Bahir Dar Marine Port (Lake Tana Marina)',
    meetingPointDirections: 'Located near Kuriftu Resort Bahir Dar along the lakefront boulevard.',
    duration: '5 Hours',
    groupSize: 'Up to 8 guests',
    maxGuests: 8,
    languages: ['English', 'Amharic (አማርኛ)'],
    pricePerPerson: 2200,
    rating: 4.94,
    reviewsCount: 56,
    hostName: 'Addisu Tilahun',
    hostRole: 'Bahir Dar Maritime Captain & Guide',
    hostAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    hostBio: 'Captain Addisu has navigated Lake Tana waters for 18 years. He holds deep relationships with the monastics on Zege Peninsula and Kebran Gabriel.',
    hostResponseRate: '100% within an hour',
    images: [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80',
    ],
    description:
      'Cruise across the source of the Blue Nile to explore hidden 14th-century circular monasteries concealed inside lush coffee and orange groves. Marvel at vivid biblical frescoes painted on cloth and canvas using natural stone pigments at Ura Kidane Mehret.',
    highlights: [
      'Private motorboat charter across Ethiopia’s largest lake',
      'Visit Ura Kidane Mehret monastery with museum of ancient crowns and robes',
      'Walk through the dense wild coffee forests of Zege Peninsula',
      'Look for Nile monitor lizards, pelicans, and hippos near the Blue Nile river outlet',
    ],
    itinerary: [
      {
        time: '08:30 - 09:30',
        title: 'Boat Cruise to Zege Peninsula',
        description: 'Board our covered private motorboat and cruise 1 hour across Lake Tana.',
      },
      {
        time: '09:30 - 11:30',
        title: 'Ura Kidane Mehret & Church Treasury',
        description: 'Walk through the coffee groves to the circular thatched-roof church. Examine 600-year-old frescoes depicting Ethiopian saints.',
      },
      {
        time: '11:30 - 13:30',
        title: 'Hippo Sanctuary & Nile River Outlet Cruise',
        description: 'Slow cruise past papyrus reed tankwa boats and spot resident hippo pods near the lake outlet.',
      },
    ],
    included: [
      'Private motorized boat & fuel',
      'Licensed maritime guide & island entry fees',
      'Coast guard-approved life jackets',
      'Fresh tropical fruits and bottled water',
    ],
    toBring: [
      'Sun hat and UV protection sunglasses',
      'Slip-on shoes for church entry',
      'Camera with zoom lens for birds and wildlife',
    ],
    timeSlots: [
      { id: 'morning', label: 'Morning Cruise', time: '08:30 AM – 01:30 PM' },
    ],
    reviews: [
      {
        id: 'rev-tana-1',
        author: 'Fasika T. (Addis Ababa)',
        date: '2 weeks ago',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        rating: 5,
        comment: 'The paintings inside Ura Kidane Mehret are mindblowing. Addisu was a great captain and made sure we spotted hippos on our return!',
      },
    ],
  },
  {
    id: 'exp-gondar-castles',
    title: 'Fasil Ghebbi Imperial Gondar Royal Enclosure Guided Walk',
    tagline: 'Discover the "Camelot of Africa" with a master historian of 17th-century imperial Ethiopia',
    category: 'heritage',
    categoryLabel: 'Heritage & History',
    location: 'Royal Enclosure & Debre Berhan, Gondar',
    region: 'Amhara',
    meetingPoint: 'Fasil Ghebbi Main Royal Gate (Piazza, Gondar)',
    meetingPointDirections: 'Opposite Gondar Piazza commercial center. Guide meets you beside the ticket office.',
    duration: '3.5 Hours',
    groupSize: 'Up to 8 guests',
    maxGuests: 8,
    languages: ['English', 'Amharic (አማርኛ)'],
    pricePerPerson: 1600,
    rating: 4.95,
    reviewsCount: 47,
    hostName: 'Selamawit Berhanu',
    hostRole: 'Gondar Native & Historic Preservationist',
    hostAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
    hostBio: 'Selamawit studied archaeology and has curated exhibits on Gondarine architecture. She is recognized for her research on Emperor Fasilides’ medieval construction techniques.',
    hostResponseRate: '98% response rate',
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
    itinerary: [
      {
        time: '09:00 - 11:00',
        title: 'Fasilides Castle & Imperial Compound',
        description: 'Explore the 3-story fortified castle of Emperor Fasilides, the palace of Empress Mentewab, and royal library ruins.',
      },
      {
        time: '11:00 - 11:45',
        title: 'Fasilides Bath (Timkat Sacred Pool)',
        description: 'Visit the sunken palace pool surrounded by massive banyan-like sycamore roots where the annual Timkat baptism ritual occurs.',
      },
      {
        time: '11:45 - 12:30',
        title: 'Debre Berhan Selassie Winged Angels',
        description: 'Stand beneath the famous painted ceiling featuring 135 unique faces of winged angels gazing downward.',
      },
    ],
    included: [
      'Licensed Gondar heritage guide',
      'Royal compound & Debre Berhan admission fees',
      'Bottled water & historical booklet',
    ],
    toBring: ['Comfortable walking shoes', 'Camera with low-light capability', 'Sunhat'],
    timeSlots: [
      { id: 'morning', label: 'Morning Heritage Walk', time: '09:00 AM – 12:30 PM' },
      { id: 'afternoon', label: 'Afternoon Heritage Walk', time: '02:30 PM – 06:00 PM' },
    ],
    reviews: [
      {
        id: 'rev-gondar-1',
        author: 'Lucas B. (Frankfurt, Germany)',
        date: '3 weeks ago',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
        rating: 5,
        comment: 'The winged angel ceiling at Debre Berhan Selassie is spellbinding. Selamawit’s explanations gave every stone meaning.',
      },
    ],
  },
  {
    id: 'exp-bale-foraging',
    title: 'Bale Mountains Harenna Forest Wild Coffee Exploration',
    tagline: 'Spot endangered Ethiopian wolves on Sanetti Plateau and harvest wild coffee in ancient moss forests',
    category: 'coffee',
    categoryLabel: 'Coffee & Culinary',
    location: 'Harenna Forest & Sanetti Plateau, Bale',
    region: 'Oromia',
    meetingPoint: 'Dinsho Park Headquarters or Goba Wabe Shebelle Hotel',
    meetingPointDirections: '4WD departure from Goba town early morning.',
    duration: 'Full Day (7 Hours)',
    groupSize: 'Up to 5 guests',
    maxGuests: 5,
    languages: ['English', 'Amharic (አማርኛ)', 'Afaan Oromoo'],
    pricePerPerson: 3800,
    rating: 4.96,
    reviewsCount: 28,
    hostName: 'Jemal Hassen',
    hostRole: 'Bale Forest Forager & Conservationist',
    hostAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80',
    hostBio: 'Jemal grew up on the edge of the Harenna cloud forest. He works with local beekeepers and forest coffee gatherers to preserve the pristine biosphere.',
    hostResponseRate: '96% response rate',
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
    itinerary: [
      {
        time: '07:30 - 10:00',
        title: 'Sanetti Plateau Safari (4,000m)',
        description: 'Cross the afro-alpine moorland, watching for the red silhouette of the endangered Ethiopian wolf stalking giant mole rats.',
      },
      {
        time: '10:00 - 13:00',
        title: 'Harenna Cloud Forest Descent & Coffee Foraging',
        description: 'Descend through dense bamboo into the mossy rainforest. Identify wild heirloom coffee trees and taste red cherries from the branch.',
      },
      {
        time: '13:00 - 14:30',
        title: 'Harenna Forest Picnic & Wild Honey Tasting',
        description: 'Rest by a rushing mountain stream and sample local wild smoked forest honey and fresh forest coffee roasted on site.',
      },
    ],
    included: [
      '4WD expedition vehicle with professional driver',
      'Certified wildlife scout & forest guide',
      'Warm picnic lunch, local forest honey tasting, and coffee sample pack',
      'Park admission and conservation contribution',
    ],
    toBring: [
      'Warm layers for the freezing plateau and light clothing for the warm forest',
      'Waterproof hiking boots',
      'Binoculars and camera',
    ],
    timeSlots: [
      { id: 'full-day', label: 'Full Day Expedition', time: '07:30 AM – 03:30 PM' },
    ],
    reviews: [
      {
        id: 'rev-bale-1',
        author: 'Thomas V. (Geneva, Switzerland)',
        date: '1 month ago',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
        rating: 5,
        comment: 'We saw three Ethiopian wolves within an hour on Sanetti, and the coffee in Harenna forest was unforgettable. Outstanding experience!',
      },
    ],
  },
];



// ─────────────────────────────────────────────────────────────────────────────
// Host Experience Storage & Synchronization Helpers
// ─────────────────────────────────────────────────────────────────────────────

const HOST_EXPERIENCES_STORAGE_KEY = 'engida_host_experiences';

/**
 * Returns user-created experiences from browser local storage (if running client-side).
 */
export function getHostExperiences(): EthiopianExperience[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HOST_EXPERIENCES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Saves or updates a host experience in persistent local storage.
 */
export function saveHostExperience(experience: EthiopianExperience): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getHostExperiences();
    const existingIndex = current.findIndex((e) => e.id === experience.id);
    let updated: EthiopianExperience[];
    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = experience;
    } else {
      updated = [experience, ...current];
    }
    localStorage.setItem(HOST_EXPERIENCES_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save host experience to storage', err);
  }
}

/**
 * Deletes a host experience from local storage.
 */
export function deleteHostExperience(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getHostExperiences();
    const filtered = current.filter((e) => e.id !== id);
    localStorage.setItem(HOST_EXPERIENCES_STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to delete host experience', err);
  }
}

/**
 * Returns all experiences: curated library combined with host-created experiences.
 */
export function getAllExperiences(): EthiopianExperience[] {
  const hostExps = getHostExperiences();
  // Filter out any duplicates if IDs match
  const hostIds = new Set(hostExps.map((e) => e.id));
  const curatedFiltered = CURATED_ETHIOPIAN_EXPERIENCES.filter((e) => !hostIds.has(e.id));
  return [...hostExps, ...curatedFiltered];
}

/**
 * Finds an experience by ID from both host-created and curated collections.
 */
export function getExperienceById(id: string): EthiopianExperience | undefined {
  const all = getAllExperiences();
  return all.find((e) => e.id === id);
}
