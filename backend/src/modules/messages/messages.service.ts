import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { Property } from '../properties/entities/property.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { User, UserRole } from '../../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { SendMessageDto } from './dto/send-message.dto';

export interface ConversationSummaryItem {
  id: string;
  propertyId: string;
  bookingId: string | null;
  lastMessageText: string | null;
  lastMessageAt: Date | null;
  createdAt: Date;
  unreadCount: number;
  counterparty: {
    id: string;
    name: string;
    email: string;
    role: 'HOST' | 'GUEST';
  };
  property: {
    id: string;
    title: string;
    city: string;
    coverImage: string | null;
    pricePerNight: number;
  } | null;
  booking: {
    id: string;
    reference: string;
    status: string;
    checkInDate: string;
    checkOutDate: string;
  } | null;
}

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(Property)
    private readonly propertyRepo: Repository<Property>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Get all conversation threads for an authenticated user (guest or host),
   * enriched with property details, counterparty info, and unread counts.
   */
  async getConversations(userId: string): Promise<ConversationSummaryItem[]> {
    const conversations = await this.conversationRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.property', 'property')
      .leftJoinAndSelect('c.booking', 'booking')
      .leftJoinAndSelect('c.guest', 'guest')
      .leftJoinAndSelect('c.host', 'host')
      .where('c.guestId = :userId OR c.hostId = :userId', { userId })
      .orderBy('c.lastMessageAt', 'DESC', 'NULLS LAST')
      .addOrderBy('c.createdAt', 'DESC')
      .getMany();

    if (conversations.length === 0) {
      return [];
    }

    const convIds = conversations.map((c) => c.id);

    // Compute unread message count per conversation for this receiver
    const unreadRaw = await this.messageRepo
      .createQueryBuilder('m')
      .select('m.conversationId', 'conversationId')
      .addSelect('COUNT(m.id)', 'count')
      .where('m.conversationId IN (:...convIds)', { convIds })
      .andWhere('m.receiverId = :userId', { userId })
      .andWhere('m.readAt IS NULL')
      .groupBy('m.conversationId')
      .getRawMany<{ conversationId: string; count: string }>();

    const unreadMap = new Map<string, number>();
    for (const row of unreadRaw) {
      unreadMap.set(row.conversationId, parseInt(row.count, 10) || 0);
    }

    return conversations.map((c) => {
      const isGuest = c.guestId === userId;
      const counterpartyUser = isGuest ? c.host : c.guest;

      return {
        id: c.id,
        propertyId: c.propertyId,
        bookingId: c.bookingId,
        lastMessageText: c.lastMessageText,
        lastMessageAt: c.lastMessageAt,
        createdAt: c.createdAt,
        unreadCount: unreadMap.get(c.id) || 0,
        counterparty: {
          id: counterpartyUser?.id || '',
          name: counterpartyUser?.name || 'Verified User',
          email: counterpartyUser?.email || '',
          role: isGuest ? 'HOST' : 'GUEST',
        },
        property: c.property
          ? {
              id: c.property.id,
              title: c.property.title,
              city: c.property.city,
              coverImage: c.property.coverImage,
              pricePerNight: Number(c.property.pricePerNight),
            }
          : null,
        booking: c.booking
          ? {
              id: c.booking.id,
              reference: c.booking.reference,
              status: c.booking.status,
              checkInDate: c.booking.checkInDate,
              checkOutDate: c.booking.checkOutDate,
            }
          : null,
      };
    });
  }

  /**
   * Total unread messages across all conversations for a user
   */
  async getUnreadCount(userId: string): Promise<{ unreadCount: number }> {
    const unreadCount = await this.messageRepo.count({
      where: {
        receiverId: userId,
        readAt: null as unknown as Date,
      },
    });
    return { unreadCount };
  }

  /**
   * Get full thread history for a conversation, and automatically mark incoming unread messages as read.
   */
  async getThread(conversationId: string, userId: string) {
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId },
      relations: ['property', 'booking', 'guest', 'host'],
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation "${conversationId}" not found`);
    }

    // Permission check
    const isParticipant =
      conversation.guestId === userId || conversation.hostId === userId;
    if (!isParticipant) {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (user?.role !== UserRole.ADMIN) {
        throw new ForbiddenException(
          'You are not authorized to view this conversation',
        );
      }
    }

    // Mark unread messages addressed to this user as read
    await this.messageRepo
      .createQueryBuilder()
      .update(Message)
      .set({ readAt: new Date() })
      .where('conversationId = :conversationId', { conversationId })
      .andWhere('receiverId = :userId', { userId })
      .andWhere('readAt IS NULL')
      .execute();

    // Fetch messages in chronological order
    const messages = await this.messageRepo.find({
      where: { conversationId },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
      select: {
        id: true,
        conversationId: true,
        senderId: true,
        receiverId: true,
        content: true,
        readAt: true,
        createdAt: true,
        sender: {
          id: true,
          name: true,
        },
      },
    });

    const isGuest = conversation.guestId === userId;
    const counterparty = isGuest ? conversation.host : conversation.guest;

    return {
      conversation: {
        id: conversation.id,
        propertyId: conversation.propertyId,
        bookingId: conversation.bookingId,
        lastMessageText: conversation.lastMessageText,
        lastMessageAt: conversation.lastMessageAt,
        createdAt: conversation.createdAt,
        counterparty: {
          id: counterparty?.id || '',
          name: counterparty?.name || 'Verified User',
          email: counterparty?.email || '',
          role: isGuest ? 'HOST' : 'GUEST',
        },
        property: conversation.property
          ? {
              id: conversation.property.id,
              title: conversation.property.title,
              city: conversation.property.city,
              coverImage: conversation.property.coverImage,
              pricePerNight: Number(conversation.property.pricePerNight),
            }
          : null,
        booking: conversation.booking
          ? {
              id: conversation.booking.id,
              reference: conversation.booking.reference,
              status: conversation.booking.status,
              checkInDate: conversation.booking.checkInDate,
              checkOutDate: conversation.booking.checkOutDate,
            }
          : null,
      },
      messages,
    };
  }

  /**
   * Find or create conversation for a specific booking and return its thread
   */
  async getThreadByBooking(bookingId: string, userId: string) {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
      relations: ['property'],
    });

    if (!booking) {
      throw new NotFoundException(`Booking "${bookingId}" not found`);
    }

    const hostId = booking.property?.hostId;
    const isParticipant = booking.guestId === userId || hostId === userId;
    if (!isParticipant) {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (user?.role !== UserRole.ADMIN) {
        throw new ForbiddenException(
          'You are not authorized to view messages for this booking',
        );
      }
    }

    let conversation = await this.conversationRepo.findOne({
      where: { bookingId },
    });

    if (!conversation) {
      conversation = this.conversationRepo.create({
        bookingId: booking.id,
        propertyId: booking.propertyId,
        guestId: booking.guestId,
        hostId: hostId || '',
        lastMessageText: null,
        lastMessageAt: new Date(),
      });
      conversation = await this.conversationRepo.save(conversation);
    }

    return this.getThread(conversation.id, userId);
  }

  /**
   * Find or create an inquiry conversation for a property between current user and property host
   */
  async getThreadByProperty(propertyId: string, userId: string) {
    const property = await this.propertyRepo.findOne({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException(`Property "${propertyId}" not found`);
    }

    let conversation = await this.conversationRepo.findOne({
      where: {
        propertyId,
        guestId: userId,
        bookingId: null as unknown as string,
      },
    });

    if (!conversation) {
      conversation = this.conversationRepo.create({
        propertyId: property.id,
        guestId: userId,
        hostId: property.hostId,
        bookingId: null,
        lastMessageText: null,
        lastMessageAt: new Date(),
      });
      conversation = await this.conversationRepo.save(conversation);
    }

    return this.getThread(conversation.id, userId);
  }

  /**
   * Authoritative message sending engine:
   * 1. Resolves or creates conversation thread
   * 2. Authorizes sender participation
   * 3. Inserts message
   * 4. Updates thread last_message_at and last_message_text
   * 5. Dispatches in-app notification to receiver
   */
  async sendMessage(senderId: string, dto: SendMessageDto) {
    const content = dto.content?.trim();
    if (!content) {
      throw new BadRequestException('Message content cannot be empty');
    }

    let conversation: Conversation | null = null;

    if (dto.conversationId) {
      conversation = await this.conversationRepo.findOne({
        where: { id: dto.conversationId },
        relations: ['property', 'booking'],
      });
      if (!conversation) {
        throw new NotFoundException(
          `Conversation "${dto.conversationId}" not found`,
        );
      }
    } else if (dto.bookingId) {
      const booking = await this.bookingRepo.findOne({
        where: { id: dto.bookingId },
        relations: ['property'],
      });
      if (!booking) {
        throw new NotFoundException(`Booking "${dto.bookingId}" not found`);
      }

      conversation = await this.conversationRepo.findOne({
        where: { bookingId: booking.id },
        relations: ['property', 'booking'],
      });

      if (!conversation) {
        conversation = this.conversationRepo.create({
          bookingId: booking.id,
          propertyId: booking.propertyId,
          guestId: booking.guestId,
          hostId: booking.property?.hostId || '',
          lastMessageText: null,
          lastMessageAt: new Date(),
        });
        conversation = await this.conversationRepo.save(conversation);
      }
    } else if (dto.propertyId) {
      const property = await this.propertyRepo.findOne({
        where: { id: dto.propertyId },
      });
      if (!property) {
        throw new NotFoundException(`Property "${dto.propertyId}" not found`);
      }

      // If guest sending inquiry
      const guestId = senderId === property.hostId ? (dto.receiverId || '') : senderId;
      const hostId = property.hostId;

      if (!guestId) {
        throw new BadRequestException('Receiver ID must be specified for property messages by host');
      }

      conversation = await this.conversationRepo.findOne({
        where: {
          propertyId: property.id,
          guestId,
          hostId,
          bookingId: null as unknown as string,
        },
        relations: ['property', 'booking'],
      });

      if (!conversation) {
        conversation = this.conversationRepo.create({
          propertyId: property.id,
          guestId,
          hostId,
          bookingId: null,
          lastMessageText: null,
          lastMessageAt: new Date(),
        });
        conversation = await this.conversationRepo.save(conversation);
      }
    } else {
      throw new BadRequestException(
        'Must provide conversationId, bookingId, or propertyId to send a message',
      );
    }

    // Authorization check: sender must be guest, host, or admin
    const isParticipant =
      conversation.guestId === senderId || conversation.hostId === senderId;
    if (!isParticipant) {
      const user = await this.userRepo.findOne({ where: { id: senderId } });
      if (user?.role !== UserRole.ADMIN) {
        throw new ForbiddenException(
          'You are not authorized to participate in this conversation',
        );
      }
    }

    // Determine receiver
    let receiverId = dto.receiverId;
    if (!receiverId) {
      receiverId =
        senderId === conversation.guestId
          ? conversation.hostId
          : conversation.guestId;
    }

    if (receiverId === senderId) {
      throw new BadRequestException('Sender and receiver cannot be the same user');
    }

    // Save Message
    const message = this.messageRepo.create({
      conversationId: conversation.id,
      senderId,
      receiverId,
      content,
      readAt: null,
    });

    const savedMessage = await this.messageRepo.save(message);

    // Update conversation summary
    conversation.lastMessageText =
      content.length > 200 ? content.slice(0, 197) + '...' : content;
    conversation.lastMessageAt = savedMessage.createdAt;
    await this.conversationRepo.save(conversation);

    // Dispatch real-time in-app notification
    try {
      const sender = await this.userRepo.findOne({
        where: { id: senderId },
        select: ['id', 'name'],
      });
      const senderName = sender?.name || 'A user';

      await this.notificationsService.createNotification({
        userId: receiverId,
        type: NotificationType.MESSAGE_RECEIVED,
        title: `New message from ${senderName}`,
        message:
          content.length > 120 ? content.slice(0, 117) + '...' : content,
        link: `/messages?conversationId=${conversation.id}`,
        metadata: {
          conversationId: conversation.id,
          messageId: savedMessage.id,
          propertyId: conversation.propertyId,
          bookingId: conversation.bookingId,
          senderId,
        },
      });
    } catch (notifErr: unknown) {
      const err = notifErr as Error;
      this.logger.warn(`Could not send message notification: ${err?.message}`);
    }

    return {
      id: savedMessage.id,
      conversationId: conversation.id,
      senderId: savedMessage.senderId,
      receiverId: savedMessage.receiverId,
      content: savedMessage.content,
      createdAt: savedMessage.createdAt,
      readAt: savedMessage.readAt,
    };
  }

  /**
   * Mark all unread messages in a conversation as read for a given user
   */
  async markAsRead(conversationId: string, userId: string) {
    await this.messageRepo
      .createQueryBuilder()
      .update(Message)
      .set({ readAt: new Date() })
      .where('conversationId = :conversationId', { conversationId })
      .andWhere('receiverId = :userId', { userId })
      .andWhere('readAt IS NULL')
      .execute();

    return { success: true };
  }
}

