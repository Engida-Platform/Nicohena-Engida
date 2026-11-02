import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, SelectQueryBuilder } from 'typeorm';
import { Property, ListingStatus, ListingType, PropertyType } from '../properties/entities/property.entity';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { Review, ReviewModerationStatus } from '../reviews/entities/review.entity';
import { Amenity } from '../amenities/entities/amenity.entity';
import { User } from '../../users/entities/user.entity';
import {
  ConversationalSearchDto,
  ConversationalSearchFilters,
  GuestRecommendationsDto,
  ComparePropertiesDto,
  BookingAssistantDto,
} from './guest-ai.dto';

export interface EnrichedPropertyCard {
  id: string;
  title: string;
  description: string;
  city: string;
  subCity: string | null;
  neighborhood: string | null;
  propertyType: string;
  pricePerNight: number;
  currency: string;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  areaSqm: number;
  coverImage: string | null;
  images: string[];
  amenities: string[];
  averageRating: number;
  reviewCount: number;
  isAvailable: boolean;
  cancellationPolicy?: string;
}

@Injectable()
export class GuestAiService {
  private readonly logger = new Logger(GuestAiService.name);

  // Common Ethiopian locations dictionary for entity resolution
  private readonly ethiopianLocations: {
    cities: string[];
    subCities: Record<string, string>; // subCity -> canonical city
  } = {
    cities: [
      'addis ababa',
      'hawassa',
      'bahir dar',
      'bishoftu',
      'gondar',
      'jimma',
      'arba minch',
      'debre birhan',
      'debre berhan',
      'mekelle',
      'dire dawa',
      'adama',
    ],
    subCities: {
      bole: 'Addis Ababa',
      kazanchis: 'Addis Ababa',
      kirkos: 'Addis Ababa',
      yeka: 'Addis Ababa',
      'sar bet': 'Addis Ababa',
      sarbet: 'Addis Ababa',
      cmc: 'Addis Ababa',
      saris: 'Addis Ababa',
      gerji: 'Addis Ababa',
      'old airport': 'Addis Ababa',
      piassa: 'Addis Ababa',
      arada: 'Addis Ababa',
      gullele: 'Addis Ababa',
      kolfe: 'Addis Ababa',
      akaky: 'Addis Ababa',
      'nifas silk': 'Addis Ababa',
      hayahulet: 'Addis Ababa',
      lebu: 'Addis Ababa',
      gotera: 'Addis Ababa',
      mexico: 'Addis Ababa',
    },
  };

  constructor(
    @InjectRepository(Property)
    private readonly propertyRepo: Repository<Property>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    @InjectRepository(Amenity)
    private readonly amenityRepo: Repository<Amenity>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // =========================================================================
  // 1. CONVERSATIONAL PROPERTY SEARCH
  // =========================================================================

  /**
   * Interprets natural language queries, extracts search intent, combines criteria
   * with conversation history, and queries real properties from PostgreSQL.
   */
  async conversationalSearch(dto: ConversationalSearchDto) {
    const rawMessage = dto.message.toLowerCase();
    const existing = dto.currentFilters || {};
    const parsed: ConversationalSearchFilters = { ...existing };

    // A. Location extraction
    for (const [subCity, canonicalCity] of Object.entries(this.ethiopianLocations.subCities)) {
      if (rawMessage.includes(subCity)) {
        parsed.subCity = subCity.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        parsed.city = canonicalCity;
        break;
      }
    }
    if (!parsed.city) {
      for (const city of this.ethiopianLocations.cities) {
        if (rawMessage.includes(city)) {
          parsed.city = city.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          break;
        }
      }
    }

    // B. Budget parsing (handles "under 5,000", "below 4000 ETB", "budget of 3500", "5k")
    const budgetMatch = rawMessage.match(/(?:under|below|max|up to|budget of|less than|around)?\s*([0-9]{1,3}(?:,[0-9]{3})*|[0-9]+)k?\s*(?:etb|birr|\$)?/i);
    const budgetMatchExact = rawMessage.match(/(?:under|below|max|up to|budget of)\s*([0-9,]+)/i);
    const budgetValue = budgetMatchExact || budgetMatch;
    if (budgetValue && budgetValue[1]) {
      const numStr = budgetValue[1].replace(/,/g, '');
      let amount = parseInt(numStr, 10);
      if (rawMessage.includes(`${numStr}k`)) {
        amount *= 1000;
      }
      if (amount > 100) {
        // If query mentions "monthly", convert roughly to nightly budget
        if (rawMessage.includes('month') && amount >= 15000) {
          parsed.maxPrice = Math.round(amount / 30);
        } else {
          parsed.maxPrice = amount;
        }
      }
    }

    // C. Guest count parsing ("for 3 people", "3 guests", "family of 4", "solo", "couple")
    const guestMatch = rawMessage.match(/(\d+)\s*(?:people|persons|guests|adults)/i);
    if (guestMatch) {
      parsed.guests = parseInt(guestMatch[1], 10);
    } else if (rawMessage.includes('family of')) {
      const familyMatch = rawMessage.match(/family of\s*(\d+)/i);
      if (familyMatch) parsed.guests = parseInt(familyMatch[1], 10);
    } else if (rawMessage.includes('solo') || rawMessage.includes('alone') || rawMessage.includes('1 person')) {
      parsed.guests = 1;
    } else if (rawMessage.includes('couple') || rawMessage.includes('2 people') || rawMessage.includes('two people')) {
      parsed.guests = 2;
    }

    // D. Bedrooms parsing ("2 bedroom", "two-bedroom", "3 bed", "studio")
    const bedMatch = rawMessage.match(/(\d+)\s*(?:bedroom|bedrooms|bed|beds)/i);
    if (bedMatch) {
      parsed.bedrooms = parseInt(bedMatch[1], 10);
    } else if (rawMessage.includes('one bedroom') || rawMessage.includes('1 bedroom')) {
      parsed.bedrooms = 1;
    } else if (rawMessage.includes('two bedroom') || rawMessage.includes('2 bedroom')) {
      parsed.bedrooms = 2;
    } else if (rawMessage.includes('three bedroom') || rawMessage.includes('3 bedroom')) {
      parsed.bedrooms = 3;
    } else if (rawMessage.includes('studio')) {
      parsed.propertyType = 'STUDIO';
      parsed.bedrooms = 1;
    }

    // E. Property Type parsing
    if (rawMessage.includes('apartment') || rawMessage.includes('flat')) {
      parsed.propertyType = 'APARTMENT';
    } else if (rawMessage.includes('villa')) {
      parsed.propertyType = 'VILLA';
    } else if (rawMessage.includes('house') || rawMessage.includes('home')) {
      parsed.propertyType = 'HOUSE';
    } else if (rawMessage.includes('bedroom') && !parsed.propertyType) {
      parsed.propertyType = 'BEDROOM';
    }

    // F. Amenities extraction
    const currentAmenities = new Set(parsed.amenities || []);
    if (rawMessage.includes('wifi') || rawMessage.includes('wi-fi') || rawMessage.includes('internet')) {
      currentAmenities.add('Wi-Fi');
    }
    if (rawMessage.includes('parking') || rawMessage.includes('garage') || rawMessage.includes('car park')) {
      currentAmenities.add('Free Parking');
    }
    if (rawMessage.includes('kitchen') || rawMessage.includes('cook')) {
      currentAmenities.add('Kitchen');
    }
    if (rawMessage.includes('pool') || rawMessage.includes('swimming')) {
      currentAmenities.add('Swimming Pool');
    }
    if (rawMessage.includes('generator') || rawMessage.includes('backup power') || rawMessage.includes('electricity backup')) {
      currentAmenities.add('Backup Generator');
    }
    if (rawMessage.includes('ac') || rawMessage.includes('air conditioning')) {
      currentAmenities.add('Air Conditioning');
    }
    if (rawMessage.includes('tv') || rawMessage.includes('television')) {
      currentAmenities.add('TV');
    }
    if (rawMessage.includes('hot water') || rawMessage.includes('geyser')) {
      currentAmenities.add('Hot Water');
    }
    parsed.amenities = Array.from(currentAmenities);

    // G. Database Query Execution
    const qb = this.propertyRepo
      .createQueryBuilder('property')
      .leftJoinAndSelect('property.amenities', 'amenity')
      .where('property.status = :status', { status: ListingStatus.PUBLISHED })
      .andWhere('property.isAvailable = :avail', { avail: true })
      .andWhere('property.adminHidden = :hidden', { hidden: false });

    if (parsed.city) {
      qb.andWhere('LOWER(property.city) = LOWER(:city)', { city: parsed.city });
    }
    if (parsed.subCity) {
      qb.andWhere(
        '(LOWER(property.subCity) = LOWER(:subCity) OR LOWER(property.neighborhood) LIKE LOWER(:subCityLike) OR LOWER(property.title) LIKE LOWER(:subCityLike))',
        { subCity: parsed.subCity, subCityLike: `%${parsed.subCity}%` },
      );
    }
    if (parsed.propertyType) {
      qb.andWhere('property.propertyType = :ptype', { ptype: parsed.propertyType });
    }
    if (parsed.maxPrice) {
      qb.andWhere('property.pricePerNight <= :maxPrice', { maxPrice: parsed.maxPrice });
    }
    if (parsed.minPrice) {
      qb.andWhere('property.pricePerNight >= :minPrice', { minPrice: parsed.minPrice });
    }
    if (parsed.guests) {
      qb.andWhere('property.maxGuests >= :guests', { guests: parsed.guests });
    }
    if (parsed.bedrooms) {
      qb.andWhere('property.bedrooms >= :bedrooms', { bedrooms: parsed.bedrooms });
    }

    qb.orderBy('property.pricePerNight', 'ASC');
    qb.take(12);

    const properties = await qb.getMany();
    const enrichedProperties = await this.enrichPropertiesWithRatings(properties);

    // Filter by amenities in memory if required
    let finalProperties = enrichedProperties;
    if (parsed.amenities && parsed.amenities.length > 0) {
      finalProperties = enrichedProperties.filter((p) => {
        const propAmenityNames = p.amenities.map((a) => a.toLowerCase());
        return parsed.amenities?.every((reqAmenity) =>
          propAmenityNames.some((a) => a.includes(reqAmenity.toLowerCase())),
        );
      });
      // Fallback: if exact amenity filter returned 0, keep results with partial match
      if (finalProperties.length === 0 && enrichedProperties.length > 0) {
        finalProperties = enrichedProperties;
      }
    }

    // H. Formulate Grounded Assistant Response
    const reply = this.generateConversationalSearchReply(parsed, finalProperties.length, finalProperties[0]);
    const suggestions = this.generateSearchFollowUps(parsed, finalProperties.length);

    return {
      reply,
      parsedCriteria: parsed,
      properties: finalProperties,
      total: finalProperties.length,
      suggestedFollowUps: suggestions,
    };
  }

  // =========================================================================
  // 2. PERSONALIZED PROPERTY RECOMMENDATIONS
  // =========================================================================

  /**
   * Recommends properties using guest past bookings, preferences, and verified stay ratings.
   * Works for authenticated users, new users (cold start), and session preferences.
   */
  async getPersonalizedRecommendations(userId?: string, guestContext?: GuestRecommendationsDto) {
    let preferredCity = guestContext?.preferredCity;
    let preferredType: string | undefined;
    let targetBudget = guestContext?.maxBudget;
    let preferredAmenities = new Set<string>(guestContext?.amenityPreferences || []);

    // 1. Analyze authenticated guest profile if userId is provided
    if (userId) {
      const pastBookings = await this.bookingRepo.find({
        where: { guestId: userId },
        relations: ['property', 'property.amenities'],
        order: { createdAt: 'DESC' },
        take: 10,
      });

      if (pastBookings.length > 0) {
        // Derive preferred city from most frequent booking
        const cityCounts: Record<string, number> = {};
        const typeCounts: Record<string, number> = {};
        let totalNightlyPrice = 0;
        let priceCount = 0;

        for (const b of pastBookings) {
          if (b.property) {
            const c = b.property.city;
            cityCounts[c] = (cityCounts[c] || 0) + 1;
            const t = b.property.propertyType;
            typeCounts[t] = (typeCounts[t] || 0) + 1;
            if (b.property.pricePerNight) {
              totalNightlyPrice += Number(b.property.pricePerNight);
              priceCount++;
            }
            if (b.property.amenities) {
              b.property.amenities.forEach((a) => preferredAmenities.add(a.name));
            }
          }
        }

        if (!preferredCity && Object.keys(cityCounts).length > 0) {
          preferredCity = Object.entries(cityCounts).sort((a, b) => b[1] - a[1])[0][0];
        }
        if (Object.keys(typeCounts).length > 0) {
          preferredType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0][0];
        }
        if (!targetBudget && priceCount > 0) {
          targetBudget = Math.round(totalNightlyPrice / priceCount);
        }
      }
    }

    // Default cold-start fallbacks
    preferredCity = preferredCity || 'Addis Ababa';
    targetBudget = targetBudget || 4500;

    // 2. Fetch candidate published properties
    const candidates = await this.propertyRepo
      .createQueryBuilder('property')
      .leftJoinAndSelect('property.amenities', 'amenity')
      .where('property.status = :status', { status: ListingStatus.PUBLISHED })
      .andWhere('property.isAvailable = :avail', { avail: true })
      .andWhere('property.adminHidden = :hidden', { hidden: false })
      .take(30)
      .getMany();

    const enriched = await this.enrichPropertiesWithRatings(candidates);

    // 3. Score candidate properties deterministically
    const scoredList = enriched.map((prop) => {
      let score = 50; // base score
      const matchTags: string[] = [];

      // Location match (+25 pts)
      if (prop.city.toLowerCase() === preferredCity?.toLowerCase()) {
        score += 25;
        matchTags.push(`Location: ${prop.city}`);
      }
      if (prop.subCity && ['Bole', 'Kazanchis', 'Sar Bet', 'CMC'].includes(prop.subCity)) {
        score += 10;
        matchTags.push(`Prime Area: ${prop.subCity}`);
      }

      // Budget fit (+20 pts)
      const priceDiff = Math.abs(prop.pricePerNight - (targetBudget || 4000));
      if (priceDiff <= 1000) {
        score += 20;
        matchTags.push('Within Target Budget');
      } else if (priceDiff <= 2500) {
        score += 10;
      }

      // Property type match (+15 pts)
      if (preferredType && prop.propertyType === preferredType) {
        score += 15;
        matchTags.push(`Type: ${prop.propertyType}`);
      }

      // Amenities overlap (+15 pts)
      const propAmenitySet = new Set(prop.amenities.map((a) => a.toLowerCase()));
      let amenityMatches = 0;
      for (const a of preferredAmenities) {
        if (propAmenitySet.has(a.toLowerCase())) amenityMatches++;
      }
      if (amenityMatches > 0) {
        score += Math.min(amenityMatches * 5, 15);
        matchTags.push(`${amenityMatches} Preferred Amenities`);
      }

      // Rating boost (+15 pts)
      if (prop.averageRating >= 4.7) {
        score += 15;
        matchTags.push('Top Verified Rating');
      } else if (prop.averageRating >= 4.0) {
        score += 8;
      }

      // Grounded explanation
      let reason = `Recommended for its prime location in ${prop.city}${prop.subCity ? ` (${prop.subCity})` : ''} and strong verified review score.`;
      if (matchTags.includes('Within Target Budget')) {
        reason = `Matches your preferred price tier in ${prop.city} (${prop.pricePerNight.toLocaleString()} ETB/night) with key amenities.`;
      } else if (matchTags.includes('Top Verified Rating')) {
        reason = `Highly rated ${prop.propertyType.toLowerCase()} in ${prop.city} with outstanding guest satisfaction.`;
      }

      return {
        property: prop,
        score,
        reason,
        matchTags,
      };
    });

    // 4. Sort and select top recommendations with diversity
    scoredList.sort((a, b) => b.score - a.score);
    const limit = guestContext?.limit || 6;
    const finalRecommendations = scoredList.slice(0, limit);

    return {
      recommendations: finalRecommendations,
      profileSummary: {
        preferredCity,
        preferredType: preferredType || 'APARTMENT',
        averageBudgetEtb: targetBudget,
      },
    };
  }

  // =========================================================================
  // 3. AI PROPERTY COMPARISON
  // =========================================================================

  /**
   * Compares 2-4 real properties side-by-side using actual database attributes,
   * highlights tradeoffs, and produces a grounded decision recommendation.
   */
  async compareProperties(dto: ComparePropertiesDto) {
    if (!dto.propertyIds || dto.propertyIds.length < 2 || dto.propertyIds.length > 3) {
      throw new BadRequestException('Please provide between 2 and 3 properties to compare');
    }

    const properties = await this.propertyRepo
      .createQueryBuilder('property')
      .leftJoinAndSelect('property.amenities', 'amenity')
      .leftJoinAndSelect('property.host', 'host')
      .leftJoinAndSelect('host.hostProfile', 'hostProfile')
      .where('property.id IN (:...ids)', { ids: dto.propertyIds })
      .getMany();

    if (properties.length < 2) {
      throw new NotFoundException('Could not find enough matching properties to compare');
    }

    const enriched = await this.enrichPropertiesWithRatings(properties);

    // Calculate nights if dates provided
    let nightsCount = 1;
    if (dto.checkInDate && dto.checkOutDate) {
      const inDate = new Date(dto.checkInDate);
      const outDate = new Date(dto.checkOutDate);
      const diffTime = outDate.getTime() - inDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 0) nightsCount = diffDays;
    }

    // Build side-by-side attribute matrix
    const matrix = [
      {
        attribute: 'Nightly Rate',
        category: 'Pricing',
        values: enriched.map((p) => `${p.pricePerNight.toLocaleString()} ETB`),
      },
      {
        attribute: `Estimated Total (${nightsCount} ${nightsCount === 1 ? 'night' : 'nights'})`,
        category: 'Pricing',
        values: enriched.map((p) => `${(p.pricePerNight * nightsCount).toLocaleString()} ETB`),
      },
      {
        attribute: 'Location',
        category: 'Location',
        values: enriched.map((p) => `${p.city}${p.subCity ? ` · ${p.subCity}` : ''}`),
      },
      {
        attribute: 'Property Type',
        category: 'Capacity',
        values: enriched.map((p) => p.propertyType),
      },
      {
        attribute: 'Bedrooms / Capacity',
        category: 'Capacity',
        values: enriched.map((p) => `${p.bedrooms} bed${p.bedrooms > 1 ? 's' : ''} · Up to ${p.maxGuests} guests`),
      },
      {
        attribute: 'Living Area',
        category: 'Capacity',
        values: enriched.map((p) => (p.areaSqm > 0 ? `${p.areaSqm} m²` : 'Not specified')),
      },
      {
        attribute: 'Verified Rating',
        category: 'Trust & Reviews',
        values: enriched.map((p) => (p.reviewCount > 0 ? `★ ${p.averageRating} (${p.reviewCount} reviews)` : 'New listing')),
      },
      {
        attribute: 'Wi-Fi',
        category: 'Amenities',
        values: enriched.map((p) => (p.amenities.some((a) => a.toLowerCase().includes('wi-fi') || a.toLowerCase().includes('wifi')) ? 'Included' : 'Not provided')),
      },
      {
        attribute: 'Parking',
        category: 'Amenities',
        values: enriched.map((p) => (p.amenities.some((a) => a.toLowerCase().includes('parking')) ? 'Free on-site' : 'Not provided')),
      },
      {
        attribute: 'Kitchen',
        category: 'Amenities',
        values: enriched.map((p) => (p.amenities.some((a) => a.toLowerCase().includes('kitchen')) ? 'Fully equipped' : 'Not provided')),
      },
      {
        attribute: 'Backup Power',
        category: 'Amenities',
        values: enriched.map((p) => (p.amenities.some((a) => a.toLowerCase().includes('generator')) ? 'Automatic Standby' : 'Standard Grid')),
      },
      {
        attribute: 'Cancellation Policy',
        category: 'Policies',
        values: enriched.map((p) => p.cancellationPolicy || 'MODERATE'),
      },
    ];

    // Identify Best Value property
    const sortedByPrice = [...enriched].sort((a, b) => a.pricePerNight - b.pricePerNight);
    const sortedByRating = [...enriched].sort((a, b) => b.averageRating - a.averageRating);
    const bestValueProp = sortedByPrice[0];
    const topRatedProp = sortedByRating[0];

    // Compute concrete pros & cons for each property
    const tradeoffs = enriched.map((p) => {
      const pros: string[] = [];
      const cons: string[] = [];

      if (p.id === bestValueProp.id) {
        pros.push(`Most competitive price at ${p.pricePerNight.toLocaleString()} ETB/night`);
      }
      if (p.averageRating >= 4.7 && p.reviewCount > 0) {
        pros.push(`High guest satisfaction rating of ${p.averageRating} stars`);
      }
      if (p.bedrooms >= 2) {
        pros.push(`Spacious with ${p.bedrooms} separate bedrooms`);
      }
      if (p.amenities.some((a) => a.toLowerCase().includes('parking'))) {
        pros.push('Dedicated parking space');
      }
      if (p.amenities.some((a) => a.toLowerCase().includes('generator'))) {
        pros.push('Backup generator protection');
      }

      // Cons
      if (p.pricePerNight > bestValueProp.pricePerNight * 1.3) {
        cons.push(`Priced ${(p.pricePerNight - bestValueProp.pricePerNight).toLocaleString()} ETB higher than lowest option`);
      }
      if (!p.amenities.some((a) => a.toLowerCase().includes('parking'))) {
        cons.push('Does not list dedicated on-site parking');
      }
      if (!p.amenities.some((a) => a.toLowerCase().includes('kitchen'))) {
        cons.push('No private kitchen facilities listed');
      }
      if (p.reviewCount === 0) {
        cons.push('New property with no guest reviews yet');
      }

      return {
        propertyId: p.id,
        pros: pros.length > 0 ? pros : ['Clean architectural design'],
        cons: cons.length > 0 ? cons : ['Standard house rules apply'],
      };
    });

    // Summary recommendation
    const recommendationSummary =
      bestValueProp.id === topRatedProp.id
        ? `${bestValueProp.title} stands out as both the most economical and highest-rated option among the compared listings.`
        : `${bestValueProp.title} provides the best nightly value at ${bestValueProp.pricePerNight.toLocaleString()} ETB, while ${topRatedProp.title} offers higher guest ratings and premium amenities.`;

    return {
      properties: enriched,
      matrix,
      aiAnalysis: {
        bestOverall: {
          propertyId: topRatedProp.id,
          title: topRatedProp.title,
          rationale: `Offers superior guest ratings (${topRatedProp.averageRating}★) and comprehensive amenities in ${topRatedProp.city}.`,
        },
        bestValue: {
          propertyId: bestValueProp.id,
          title: bestValueProp.title,
          rationale: `Lowest nightly rate at ${bestValueProp.pricePerNight.toLocaleString()} ETB with balanced capacity.`,
        },
        tradeoffs,
        recommendationSummary,
      },
    };
  }

  // =========================================================================
  // 4. AI BOOKING ASSISTANT
  // =========================================================================

  /**
   * Conversational assistant answering questions about properties, live availability,
   * verified guest reservations, payment records, and cancellation rules.
   * Strictly enforces data privacy for logged-in users.
   */
  async bookingAssistantChat(userId: string | undefined, dto: BookingAssistantDto) {
    const raw = dto.message.toLowerCase();

    // 1. Check if user is asking about personal bookings/reservations
    const isPersonalBookingQuery =
      raw.includes('my booking') ||
      raw.includes('my reservation') ||
      raw.includes('status of my') ||
      raw.includes('when is my check') ||
      raw.includes('did my payment') ||
      raw.includes('have i paid') ||
      raw.includes('how much did i pay') ||
      raw.includes('my trips') ||
      raw.includes('cancel my');

    if (isPersonalBookingQuery) {
      if (!userId) {
        return {
          answer: 'To view your private booking and payment details, please sign in to your ENGIDA account.',
          category: 'RESERVATION',
          actionSuggestions: [
            { label: 'Sign In', href: '/login' },
          ],
        };
      }

      // Query real bookings for this authenticated user only
      const userBookings = await this.bookingRepo.find({
        where: { guestId: userId },
        relations: ['property'],
        order: { createdAt: 'DESC' },
        take: 3,
      });

      if (userBookings.length === 0) {
        return {
          answer: 'You currently have no active or past reservations on ENGIDA. When you book a stay, your confirmed dates, payment status, and check-in instructions will appear here.',
          category: 'RESERVATION',
          actionSuggestions: [
            { label: 'Explore Stays', href: '/stays' },
          ],
        };
      }

      const latestBooking = dto.bookingId
        ? userBookings.find((b) => b.id === dto.bookingId) || userBookings[0]
        : userBookings[0];

      // Answer specific status questions
      if (raw.includes('payment') || raw.includes('paid')) {
        const paymentState = (latestBooking as any).paymentStatus || 'PENDING';
        const method = (latestBooking as any).paymentMethod?.replace(/_/g, ' ') || 'Cash on Arrival';
        const price = Number(latestBooking.totalPrice).toLocaleString();

        return {
          answer: `For reservation ${latestBooking.reference} (${latestBooking.property?.title}), your payment status is currently "${paymentState}". Total amount: ${price} ETB via ${method}.`,
          category: 'PAYMENT',
          dataContext: {
            reference: latestBooking.reference,
            totalPrice: price,
            paymentStatus: paymentState,
            paymentMethod: method,
          },
          actionSuggestions: [
            { label: 'View in Dashboard', href: '/dashboard' },
            { label: 'Message Host', href: `/messages?bookingId=${latestBooking.id}` },
          ],
        };
      }

      if (raw.includes('cancel')) {
        const policy = (latestBooking as any).cancellationPolicy || 'MODERATE';
        return {
          answer: `Your reservation ${latestBooking.reference} has a "${policy}" cancellation policy. You can cancel requests pending host approval without fee, or request cancellation directly from your Dashboard.`,
          category: 'POLICY',
          actionSuggestions: [
            { label: 'Manage Reservation', href: '/dashboard' },
          ],
        };
      }

      // General reservation overview
      return {
        answer: `Your reservation for "${latestBooking.property?.title}" (Ref: ${latestBooking.reference}) is currently ${latestBooking.status}. Check-in is scheduled for ${latestBooking.checkInDate} and check-out is on ${latestBooking.checkOutDate} (${latestBooking.guestCount} guests).`,
        category: 'RESERVATION',
        dataContext: {
          reference: latestBooking.reference,
          status: latestBooking.status,
          checkInDate: latestBooking.checkInDate,
          checkOutDate: latestBooking.checkOutDate,
          guestCount: latestBooking.guestCount,
        },
        actionSuggestions: [
          { label: 'Open in Dashboard', href: '/dashboard' },
          { label: 'Chat with Host', href: `/messages?bookingId=${latestBooking.id}` },
        ],
      };
    }

    // 2. Query target property if propertyId is provided or referenced
    let targetProperty: Property | null = null;
    if (dto.propertyId) {
      targetProperty = await this.propertyRepo.findOne({
        where: { id: dto.propertyId },
        relations: ['amenities', 'host', 'host.hostProfile'],
      });
    }

    if (targetProperty) {
      const amenitiesList = targetProperty.amenities?.map((a) => a.name) || [];
      const amenitiesText = amenitiesList.join(', ');

      if (raw.includes('park') || raw.includes('car')) {
        const hasParking = amenitiesList.some((a) => a.toLowerCase().includes('parking'));
        return {
          answer: hasParking
            ? `Yes, ${targetProperty.title} includes dedicated on-site parking for guests.`
            : `Dedicated on-site parking is not listed for ${targetProperty.title}. Please check with the host if street parking is available.`,
          category: 'PROPERTY',
          actionSuggestions: [
            { label: 'Message Host', href: `/messages?propertyId=${targetProperty.id}` },
          ],
        };
      }

      if (raw.includes('wifi') || raw.includes('internet')) {
        const hasWifi = amenitiesList.some((a) => a.toLowerCase().includes('wifi') || a.toLowerCase().includes('wi-fi'));
        return {
          answer: hasWifi
            ? `Yes, ${targetProperty.title} provides high-speed Wi-Fi included in the stay.`
            : `Wi-Fi is not listed among the amenities for this property.`,
          category: 'PROPERTY',
        };
      }

      if (raw.includes('kitchen') || raw.includes('cook')) {
        const hasKitchen = amenitiesList.some((a) => a.toLowerCase().includes('kitchen'));
        return {
          answer: hasKitchen
            ? `Yes, ${targetProperty.title} features a kitchen where guests can prepare meals.`
            : `A private kitchen is not specified for this property listing.`,
          category: 'PROPERTY',
        };
      }

      if (raw.includes('cancel') || raw.includes('policy')) {
        return {
          answer: `${targetProperty.title} adheres to ENGIDA's standard cancellation terms. Check-in is typically at 15:00 and check-out at 11:00.`,
          category: 'POLICY',
        };
      }

      if (raw.includes('price') || raw.includes('cost') || raw.includes('how much')) {
        return {
          answer: `The nightly rate for ${targetProperty.title} is ${Number(targetProperty.pricePerNight).toLocaleString()} ETB. Maximum occupancy is ${targetProperty.maxGuests} guests with ${targetProperty.bedrooms} bedrooms.`,
          category: 'PROPERTY',
          actionSuggestions: [
            { label: 'View & Reserve Stay', href: `/properties/${targetProperty.id}` },
            { label: 'Chat with Host', href: `/messages?propertyId=${targetProperty.id}` },
          ],
        };
      }

      // Default property answer
      return {
        answer: `${targetProperty.title} is a ${targetProperty.propertyType.toLowerCase()} located in ${targetProperty.city}${targetProperty.subCity ? ` (${targetProperty.subCity})` : ''}. Accommodates up to ${targetProperty.maxGuests} guests. Amenities include: ${amenitiesText || 'Standard essentials'}.`,
        category: 'PROPERTY',
        actionSuggestions: [
          { label: 'View Details', href: `/properties/${targetProperty.id}` },
          { label: 'Chat with Host', href: `/messages?propertyId=${targetProperty.id}` },
        ],
      };
    }

    // 3. General platform assistance
    return {
      answer: 'Hello! I am your ENGIDA Booking Assistant. You can ask me about property amenities (WiFi, parking, kitchen), availability, payment procedures, cancellation policies, or your existing reservations.',
      category: 'GENERAL',
      actionSuggestions: [
        { label: 'Search Properties', href: '/stays' },
        { label: 'My Trips', href: '/dashboard' },
      ],
    };
  }

  // =========================================================================
  // HELPER METHODS
  // =========================================================================

  private async enrichPropertiesWithRatings(properties: Property[]): Promise<EnrichedPropertyCard[]> {
    if (properties.length === 0) return [];

    const propIds = properties.map((p) => p.id);

    // Fetch review averages
    const reviewStats = await this.reviewRepo
      .createQueryBuilder('r')
      .select('r.propertyId', 'propertyId')
      .addSelect('AVG(r.rating)', 'avgRating')
      .addSelect('COUNT(r.id)', 'count')
      .where('r.propertyId IN (:...propIds)', { propIds })
      .andWhere('r.moderationStatus = :status', { status: ReviewModerationStatus.VISIBLE })
      .groupBy('r.propertyId')
      .getRawMany<{ propertyId: string; avgRating: string; count: string }>();

    const statsMap = new Map<string, { avg: number; count: number }>();
    reviewStats.forEach((row) => {
      statsMap.set(row.propertyId, {
        avg: Math.round(parseFloat(row.avgRating) * 10) / 10 || 0,
        count: parseInt(row.count, 10) || 0,
      });
    });

    return properties.map((p) => {
      const stats = statsMap.get(p.id) || { avg: 5.0, count: 0 };
      return {
        id: p.id,
        title: p.title,
        description: p.description,
        city: p.city,
        subCity: p.subCity,
        neighborhood: p.neighborhood,
        propertyType: p.propertyType,
        pricePerNight: Number(p.pricePerNight),
        currency: 'ETB',
        maxGuests: p.maxGuests,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        areaSqm: p.areaSqm,
        coverImage: p.coverImage,
        images: p.images || [],
        amenities: p.amenities?.map((a) => a.name) || [],
        averageRating: stats.avg,
        reviewCount: stats.count,
        isAvailable: p.isAvailable,
        cancellationPolicy: (p as any).cancellationPolicy || 'MODERATE',
      };
    });
  }

  private generateConversationalSearchReply(
    filters: ConversationalSearchFilters,
    count: number,
    topMatch?: EnrichedPropertyCard,
  ): string {
    const loc = filters.subCity ? `${filters.subCity}, ${filters.city}` : filters.city || 'Ethiopia';
    const type = filters.propertyType ? `${filters.propertyType.toLowerCase()}s` : 'properties';
    const budget = filters.maxPrice ? ` under ${filters.maxPrice.toLocaleString()} ETB/night` : '';
    const guests = filters.guests ? ` for ${filters.guests} ${filters.guests === 1 ? 'guest' : 'guests'}` : '';

    if (count === 0) {
      return `I searched for ${type} in ${loc}${budget}${guests}, but didn't find any exact matches right now. Would you like to expand the search radius or increase the budget slightly?`;
    }

    if (count === 1 && topMatch) {
      return `I found 1 great match in ${loc}: "${topMatch.title}" at ${topMatch.pricePerNight.toLocaleString()} ETB per night.`;
    }

    return `I found ${count} verified ${type} in ${loc}${budget}${guests}. Here are the top available options matching your requirements:`;
  }

  private generateSearchFollowUps(filters: ConversationalSearchFilters, count: number): string[] {
    const suggestions: string[] = [];

    if (!filters.bedrooms && count > 1) {
      suggestions.push('2 bedrooms only');
    }
    if (!filters.amenities?.includes('Free Parking')) {
      suggestions.push('Must have parking');
    }
    if (!filters.amenities?.includes('Wi-Fi')) {
      suggestions.push('Include high-speed Wi-Fi');
    }
    if (filters.maxPrice && filters.maxPrice > 3000) {
      suggestions.push(`Under ${(filters.maxPrice - 1000).toLocaleString()} ETB`);
    } else if (!filters.maxPrice) {
      suggestions.push('Under 4,000 ETB per night');
    }

    return suggestions.slice(0, 3);
  }
}

