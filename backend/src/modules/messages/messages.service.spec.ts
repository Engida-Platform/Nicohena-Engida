import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { Property } from '../properties/entities/property.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { User, UserRole } from '../../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';

describe('MessagesService', () => {
  let service: MessagesService;

  const mockConversationRepo = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockMessageRepo = {
    createQueryBuilder: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockPropertyRepo = {
    findOne: jest.fn(),
  };

  const mockBookingRepo = {
    findOne: jest.fn(),
  };

  const mockUserRepo = {
    findOne: jest.fn(),
  };

  const mockNotificationsService = {
    createNotification: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        {
          provide: getRepositoryToken(Conversation),
          useValue: mockConversationRepo,
        },
        {
          provide: getRepositoryToken(Message),
          useValue: mockMessageRepo,
        },
        {
          provide: getRepositoryToken(Property),
          useValue: mockPropertyRepo,
        },
        {
          provide: getRepositoryToken(Booking),
          useValue: mockBookingRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUnreadCount', () => {
    it('returns the total unread message count for a user', async () => {
      mockMessageRepo.count.mockResolvedValue(3);

      const result = await service.getUnreadCount('user-1');
      expect(result).toEqual({ unreadCount: 3 });
      expect(mockMessageRepo.count).toHaveBeenCalledWith({
        where: {
          receiverId: 'user-1',
          readAt: null,
        },
      });
    });
  });

  describe('getThread', () => {
    it('throws NotFoundException when conversation does not exist', async () => {
      mockConversationRepo.findOne.mockResolvedValue(null);

      await expect(service.getThread('nonexistent-id', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when user is not a participant and not admin', async () => {
      mockConversationRepo.findOne.mockResolvedValue({
        id: 'conv-1',
        guestId: 'user-guest',
        hostId: 'user-host',
      });
      mockUserRepo.findOne.mockResolvedValue({ id: 'user-other', role: UserRole.USER });

      await expect(service.getThread('conv-1', 'user-other')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('marks unread messages as read and returns conversation and messages', async () => {
      const mockConv = {
        id: 'conv-1',
        propertyId: 'prop-1',
        bookingId: 'bkg-1',
        guestId: 'user-guest',
        hostId: 'user-host',
        lastMessageText: 'Hello host',
        lastMessageAt: new Date(),
        createdAt: new Date(),
        guest: { id: 'user-guest', name: 'Guest Name', email: 'guest@example.com' },
        host: { id: 'user-host', name: 'Host Name', email: 'host@example.com' },
        property: { id: 'prop-1', title: 'Villa', city: 'Addis', coverImage: null, pricePerNight: 100 },
        booking: { id: 'bkg-1', reference: 'BKG-001', status: 'CONFIRMED', checkInDate: '2026-11-05', checkOutDate: '2026-11-10' },
      };
      mockConversationRepo.findOne.mockResolvedValue(mockConv);

      const updateQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      mockMessageRepo.createQueryBuilder.mockReturnValue(updateQueryBuilder);

      const mockMessages = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          senderId: 'user-guest',
          receiverId: 'user-host',
          content: 'Hello host',
          readAt: null,
          createdAt: new Date(),
          sender: { id: 'user-guest', name: 'Guest Name' },
        },
      ];
      mockMessageRepo.find.mockResolvedValue(mockMessages);

      const result = await service.getThread('conv-1', 'user-guest');
      expect(result.conversation.id).toBe('conv-1');
      expect(result.conversation.counterparty.name).toBe('Host Name');
      expect(result.conversation.counterparty.role).toBe('HOST');
      expect(result.messages).toHaveLength(1);
    });
  });

  describe('sendMessage', () => {
    it('throws BadRequestException when content is empty or only whitespace', async () => {
      await expect(
        service.sendMessage('user-1', { content: '   ' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when neither conversationId, bookingId, nor propertyId is provided', async () => {
      await expect(
        service.sendMessage('user-1', { content: 'Hello' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('sends message in existing conversation and creates notification', async () => {
      const mockConv = {
        id: 'conv-1',
        guestId: 'guest-1',
        hostId: 'host-1',
        propertyId: 'prop-1',
        bookingId: 'bkg-1',
        lastMessageText: null,
        lastMessageAt: null,
      };
      mockConversationRepo.findOne.mockResolvedValue(mockConv);
      mockConversationRepo.save.mockResolvedValue(mockConv);

      const savedMessage = {
        id: 'msg-new',
        conversationId: 'conv-1',
        senderId: 'guest-1',
        receiverId: 'host-1',
        content: 'Is check-in at 2 PM?',
        createdAt: new Date(),
        readAt: null,
      };
      mockMessageRepo.create.mockReturnValue(savedMessage);
      mockMessageRepo.save.mockResolvedValue(savedMessage);

      mockUserRepo.findOne.mockResolvedValue({ id: 'guest-1', name: 'Almaz' });
      mockNotificationsService.createNotification.mockResolvedValue(null);

      const result = await service.sendMessage('guest-1', {
        conversationId: 'conv-1',
        content: 'Is check-in at 2 PM?',
      });

      expect(result.id).toBe('msg-new');
      expect(result.content).toBe('Is check-in at 2 PM?');
      expect(mockConversationRepo.save).toHaveBeenCalled();
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'host-1',
          type: NotificationType.MESSAGE_RECEIVED,
          title: 'New message from Almaz',
        }),
      );
    });
  });

  describe('markAsRead', () => {
    it('updates readAt for incoming messages in conversation', async () => {
      const updateQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 2 }),
      };
      mockMessageRepo.createQueryBuilder.mockReturnValue(updateQueryBuilder);

      const result = await service.markAsRead('conv-1', 'user-1');
      expect(result).toEqual({ success: true });
      expect(mockMessageRepo.createQueryBuilder).toHaveBeenCalled();
    });
  });
});

