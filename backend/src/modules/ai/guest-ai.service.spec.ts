import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { GuestAiService } from './guest-ai.service';
import { Property, ListingStatus, PropertyType } from '../properties/entities/property.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { Review } from '../reviews/entities/review.entity';
import { Amenity } from '../amenities/entities/amenity.entity';
import { User } from '../../users/entities/user.entity';

describe('GuestAiService', () => {
  let service: GuestAiService;

  const mockPropertyRepo = {
    createQueryBuilder: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockBookingRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockReviewRepo = {
    createQueryBuilder: jest.fn(),
  };

  const mockAmenityRepo = {
    find: jest.fn(),
  };

  const mockUserRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuestAiService,
        {
          provide: getRepositoryToken(Property),
          useValue: mockPropertyRepo,
        },
        {
          provide: getRepositoryToken(Booking),
          useValue: mockBookingRepo,
        },
        {
          provide: getRepositoryToken(Review),
          useValue: mockReviewRepo,
        },
        {
          provide: getRepositoryToken(Amenity),
          useValue: mockAmenityRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
      ],
    }).compile();

    service = module.get<GuestAiService>(GuestAiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('conversationalSearch', () => {
    it('extracts Bole location, budget, bedrooms, and parking amenity', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            id: 'prop-1',
            title: 'Modern Bole Luxury Apartment',
            description: 'Spacious apartment in Bole',
            city: 'Addis Ababa',
            subCity: 'Bole',
            propertyType: PropertyType.APARTMENT,
            pricePerNight: 4500,
            maxGuests: 4,
            bedrooms: 2,
            bathrooms: 2,
            areaSqm: 110,
            coverImage: null,
            images: [],
            amenities: [{ name: 'Free Parking' }, { name: 'Wi-Fi' }],
            isAvailable: true,
          },
        ]),
      };
      mockPropertyRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const reviewQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { propertyId: 'prop-1', avgRating: '4.9', count: '12' },
        ]),
      };
      mockReviewRepo.createQueryBuilder.mockReturnValue(reviewQb);

      const result = await service.conversationalSearch({
        message: 'Find me a 2 bedroom apartment in Bole under 5,000 ETB with parking',
      });

      expect(result.parsedCriteria.city).toBe('Addis Ababa');
      expect(result.parsedCriteria.subCity).toBe('Bole');
      expect(result.parsedCriteria.maxPrice).toBe(5000);
      expect(result.parsedCriteria.bedrooms).toBe(2);
      expect(result.parsedCriteria.propertyType).toBe('APARTMENT');
      expect(result.parsedCriteria.amenities).toContain('Free Parking');
      expect(result.properties).toHaveLength(1);
      expect(result.properties[0].averageRating).toBe(4.9);
      expect(result.reply).toContain('Bole, Addis Ababa');
    });
  });

  describe('getPersonalizedRecommendations', () => {
    it('ranks properties and provides grounded explanations', async () => {
      mockBookingRepo.find.mockResolvedValue([
        {
          property: {
            city: 'Addis Ababa',
            propertyType: PropertyType.APARTMENT,
            pricePerNight: 4000,
            amenities: [{ name: 'Wi-Fi' }, { name: 'Free Parking' }],
          },
        },
      ]);

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            id: 'prop-1',
            title: 'Bole Studio',
            city: 'Addis Ababa',
            subCity: 'Bole',
            propertyType: PropertyType.APARTMENT,
            pricePerNight: 4200,
            amenities: [{ name: 'Wi-Fi' }, { name: 'Free Parking' }],
            isAvailable: true,
          },
        ]),
      };
      mockPropertyRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const reviewQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      mockReviewRepo.createQueryBuilder.mockReturnValue(reviewQb);

      const result = await service.getPersonalizedRecommendations('user-1');
      expect(result.recommendations).toHaveLength(1);
      expect(result.recommendations[0].score).toBeGreaterThan(60);
      expect(result.recommendations[0].reason).toBeDefined();
    });
  });

  describe('compareProperties', () => {
    it('throws BadRequestException if less than 2 properties are provided', async () => {
      await expect(
        service.compareProperties({ propertyIds: ['prop-1'] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('generates comparison matrix, best value, and tradeoffs', async () => {
      const mockProps = [
        {
          id: '00000000-0000-0000-0000-000000000001',
          title: 'Kazanchis Apartment',
          city: 'Addis Ababa',
          subCity: 'Kazanchis',
          propertyType: PropertyType.APARTMENT,
          pricePerNight: 3500,
          maxGuests: 3,
          bedrooms: 1,
          amenities: [{ name: 'Wi-Fi' }, { name: 'Free Parking' }],
          isAvailable: true,
        },
        {
          id: '00000000-0000-0000-0000-000000000002',
          title: 'Bole Luxury Villa',
          city: 'Addis Ababa',
          subCity: 'Bole',
          propertyType: PropertyType.VILLA,
          pricePerNight: 8000,
          maxGuests: 6,
          bedrooms: 3,
          amenities: [{ name: 'Wi-Fi' }, { name: 'Swimming Pool' }],
          isAvailable: true,
        },
      ];

      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockProps),
      };
      mockPropertyRepo.createQueryBuilder.mockReturnValue(qb);

      const reviewQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { propertyId: mockProps[0].id, avgRating: '4.8', count: '5' },
          { propertyId: mockProps[1].id, avgRating: '4.9', count: '10' },
        ]),
      };
      mockReviewRepo.createQueryBuilder.mockReturnValue(reviewQb);

      const result = await service.compareProperties({
        propertyIds: [mockProps[0].id, mockProps[1].id],
      });

      expect(result.properties).toHaveLength(2);
      expect(result.matrix.length).toBeGreaterThan(5);
      expect(result.aiAnalysis.bestValue.propertyId).toBe(mockProps[0].id);
      expect(result.aiAnalysis.tradeoffs).toHaveLength(2);
    });
  });

  describe('bookingAssistantChat', () => {
    it('answers property amenity questions using verified attributes', async () => {
      mockPropertyRepo.findOne.mockResolvedValue({
        id: 'prop-1',
        title: 'Bole Executive Suite',
        city: 'Addis Ababa',
        pricePerNight: 5000,
        maxGuests: 2,
        amenities: [{ name: 'Free Parking' }, { name: 'Wi-Fi' }],
      });

      const result = await service.bookingAssistantChat(undefined, {
        propertyId: 'prop-1',
        message: 'Is parking available at this property?',
      });

      expect(result.category).toBe('PROPERTY');
      expect(result.answer).toContain('Yes, Bole Executive Suite includes dedicated on-site parking');
    });

    it('requires sign in for unauthenticated reservation questions', async () => {
      const result = await service.bookingAssistantChat(undefined, {
        message: 'What is the status of my booking?',
      });

      expect(result.answer).toContain('please sign in');
    });

    it('returns authentic reservation details for logged in guest', async () => {
      mockBookingRepo.find.mockResolvedValue([
        {
          id: 'bkg-1',
          reference: 'BKG-2026-000042',
          status: 'CONFIRMED',
          checkInDate: '2026-11-10',
          checkOutDate: '2026-11-15',
          guestCount: 2,
          totalPrice: 20000,
          paymentStatus: 'PAID',
          paymentMethod: 'TELEBIRR',
          property: {
            title: 'Sar Bet Villa',
          },
        },
      ]);

      const result = await service.bookingAssistantChat('user-1', {
        message: 'What is the status of my booking and payment?',
      });

      expect(result.answer).toContain('BKG-2026-000042');
      expect(result.answer).toContain('20,000 ETB');
    });
  });
});

