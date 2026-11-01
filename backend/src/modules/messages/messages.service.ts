import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { Property } from '../properties/entities/property.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { User, UserRole } from '../../users/entities/user.entity';
import { SendMessageDto } from './dto/send-message.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';

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
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * List all conversations for the user (guest or host)
   */
  async getConversations(userId: string) {
    const list = await this.conversationRepo
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.property', 'property')
      .leftJoin('conversation.guest', 'guest')
      .addSelect(['guest.id', 'guest.name', 'guest.avatar'])
      .leftJoin('conversation.host', 'host')
      .addSelect(['host.id', 'host.name', 'host.avatar'])
      .where('conversation.guestId = :userId OR conversation.hostId = :userId', { userId })
      .orderBy('conversation.lastMessageAt', 'DESC')
      .getMany();

    // Compute unread counts for each conversation
    const result = await Promise.all(
      list.map(async (conv) => {
        const unreadCount = await this.messageRepo.count({
          where: {
            conversationId: conv.id,
            receiverId: userId,
            readAt: null as any,
          },
        });
        return {
          id: conv.id,
          propertyId: conv.propertyId,
          propertyName: conv.property?.title || 'Property',
          propertyImage: conv.property?.coverImage || (conv.property?.images && conv.property.images[0]) || null,
          city: conv.property?.city || '',
          bookingId: conv.bookingId,
          guest: conv.guest,
          host: conv.host,
          lastMessageText: conv.lastMessageText,
          lastMessageAt: conv.lastMessageAt,
          unreadCount,
        };
      }),
    );

    return result;
  }

  /**
   * Get chronological message thread for a conversation or booking
   */
  async getThread(idOrBookingId: string, userId: string, userRole: UserRole = UserRole.USER) {
    let conversation = await this.conversationRepo.findOne({
      where: [{ id: idOrBookingId }, { bookingId: idOrBookingId }],
      relations: ['property', 'guest', 'host'],
    });

    if (!conversation) {
      // If bookingId was given, check if a booking exists and create conversation
      const booking = await this.bookingRepo.findOne({
        where: { id: idOrBookingId },
        relations: ['property'],
      });
      if (booking) {
        conversation = await this.conversationRepo.save(
          this.conversationRepo.create({
            propertyId: booking.propertyId,
            bookingId: booking.id,
            guestId: booking.guestId,
            hostId: booking.property.hostId,
            lastMessageText: 'Conversation started',
            lastMessageAt: new Date(),
          }),
        );
      } else {
        throw new NotFoundException(`Conversation ${idOrBookingId} not found`);
      }
    }

    const isGuest = conversation.guestId === userId;
    const isHost = conversation.hostId === userId;
    const isAdmin = userRole === UserRole.ADMIN;

    if (!isGuest && !isHost && !isAdmin) {
      throw new ForbiddenException('You do not have access to this conversation');
    }

    // Mark unread incoming messages as read
    await this.messageRepo
      .createQueryBuilder()
      .update(Message)
      .set({ readAt: new Date() })
      .where('conversationId = :convId AND receiverId = :userId AND readAt IS NULL', {
        convId: conversation.id,
        userId,
      })
      .execute();

    const messages = await this.messageRepo.find({
      where: { conversationId: conversation.id },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
    });

    return {
      conversation: {
        id: conversation.id,
        bookingId: conversation.bookingId,
        propertyId: conversation.propertyId,
        propertyTitle: conversation.property?.title,
        propertyImage: conversation.property?.coverImage || (conversation.property?.images && conversation.property.images[0]) || null,
        guest: { id: conversation.guest?.id, name: conversation.guest?.name, avatar: conversation.guest?.avatar },
        host: { id: conversation.host?.id, name: conversation.host?.name, avatar: conversation.host?.avatar },
      },
      messages: messages.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        senderName: m.sender?.name || 'User',
        receiverId: m.receiverId,
        content: m.content,
        readAt: m.readAt,
        createdAt: m.createdAt,
      })),
    };
  }

  /**
   * Send a message
   */
  async sendMessage(dto: SendMessageDto, sender: User) {
    if (!dto.content?.trim()) {
      throw new BadRequestException('Message content cannot be empty');
    }

    let conversation: Conversation | null = null;

    if (dto.conversationId) {
      conversation = await this.conversationRepo.findOne({
        where: { id: dto.conversationId },
        relations: ['property'],
      });
      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }
    } else if (dto.bookingId) {
      conversation = await this.conversationRepo.findOne({
        where: { bookingId: dto.bookingId },
        relations: ['property'],
      });
      if (!conversation) {
        const booking = await this.bookingRepo.findOne({
          where: { id: dto.bookingId },
          relations: ['property'],
        });
        if (!booking) {
          throw new NotFoundException('Booking not found');
        }
        conversation = await this.conversationRepo.save(
          this.conversationRepo.create({
            propertyId: booking.propertyId,
            bookingId: booking.id,
            guestId: booking.guestId,
            hostId: booking.property.hostId,
          }),
        );
      }
    } else if (dto.propertyId) {
      const property = await this.propertyRepo.findOne({ where: { id: dto.propertyId } });
      if (!property) {
        throw new NotFoundException('Property not found');
      }
      conversation = await this.conversationRepo.findOne({
        where: {
          propertyId: dto.propertyId,
          guestId: sender.id,
          hostId: property.hostId,
        },
      });
      if (!conversation) {
        conversation = await this.conversationRepo.save(
          this.conversationRepo.create({
            propertyId: property.id,
            guestId: sender.id,
            hostId: property.hostId,
          }),
        );
      }
    } else {
      throw new BadRequestException('Must provide conversationId, bookingId, or propertyId');
    }

    // Determine receiver: if sender is guest, receiver is host, and vice-versa
    const receiverId =
      sender.id === conversation.guestId
        ? conversation.hostId
        : conversation.guestId;

    const message = await this.messageRepo.save(
      this.messageRepo.create({
        conversationId: conversation.id,
        senderId: sender.id,
        receiverId,
        content: dto.content.trim(),
      }),
    );

    // Update conversation last message timestamp & text
    conversation.lastMessageText = dto.content.trim().slice(0, 100);
    conversation.lastMessageAt = new Date();
    await this.conversationRepo.save(conversation);

    // Dispatch real-time in-app notification
    try {
      await this.notificationsService.createNotification({
        userId: receiverId,
        type: NotificationType.MESSAGE_RECEIVED,
        title: `New message from ${sender.name || 'Guest'}`,
        message: dto.content.trim().slice(0, 100),
        link: conversation.bookingId ? `/dashboard` : `/host/reservations`,
        metadata: {
          conversationId: conversation.id,
          bookingId: conversation.bookingId,
          propertyId: conversation.propertyId,
        },
      });
    } catch (notifErr) {
      this.logger.warn(`Could not send notification for message ${message.id}: ${notifErr}`);
    }

    return {
      id: message.id,
      conversationId: conversation.id,
      senderId: message.senderId,
      senderName: sender.name,
      receiverId: message.receiverId,
      content: message.content,
      readAt: message.readAt,
      createdAt: message.createdAt,
    };
  }
}
