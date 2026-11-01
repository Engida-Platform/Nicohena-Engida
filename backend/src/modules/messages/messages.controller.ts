import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { User } from '../../users/entities/user.entity';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  /**
   * List all conversation threads for the authenticated user (guest or host)
   */
  @Get('conversations')
  async getConversations(@GetUser() user: User) {
    return this.messagesService.getConversations(user.id);
  }

  /**
   * Get total unread message count for badge display
   */
  @Get('unread-count')
  async getUnreadCount(@GetUser() user: User) {
    return this.messagesService.getUnreadCount(user.id);
  }

  /**
   * Get thread history for a conversation by conversationId
   */
  @Get('thread/:conversationId')
  async getThread(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @GetUser() user: User,
  ) {
    return this.messagesService.getThread(conversationId, user.id);
  }

  /**
   * Get or initialize thread for a specific booking
   */
  @Get('booking/:bookingId')
  async getThreadByBooking(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @GetUser() user: User,
  ) {
    return this.messagesService.getThreadByBooking(bookingId, user.id);
  }

  /**
   * Get or initialize inquiry thread for a specific property
   */
  @Get('property/:propertyId')
  async getThreadByProperty(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @GetUser() user: User,
  ) {
    return this.messagesService.getThreadByProperty(propertyId, user.id);
  }

  /**
   * Send a message in a conversation thread or initiate a new one
   */
  @Post('send')
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(
    @Body() dto: SendMessageDto,
    @GetUser() user: User,
  ) {
    return this.messagesService.sendMessage(user.id, dto);
  }

  /**
   * Mark all messages in a conversation as read
   */
  @Patch(':conversationId/read')
  async markAsRead(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @GetUser() user: User,
  ) {
    return this.messagesService.markAsRead(conversationId, user.id);
  }
}

