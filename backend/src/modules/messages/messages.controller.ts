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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { User } from '../../users/entities/user.entity';

@ApiTags('Messages & Notifications')
@ApiBearerAuth('JWT-auth')
@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  /**
   * List all conversation threads for the authenticated user (guest or host)
   */
  @Get('conversations')
  @ApiOperation({
    summary: 'List user conversation threads',
    description: 'Retrieves all active message threads where user is guest or host, sorted by latest activity.',
  })
  @ApiResponse({ status: 200, description: 'List of conversations with last message snippet' })
  async getConversations(@GetUser() user: User) {
    return this.messagesService.getConversations(user.id);
  }

  /**
   * Alias for threads matching frontend host messages expectations
   */
  @Get('threads')
  @ApiOperation({
    summary: 'List user conversation threads (host/guest alias)',
    description: 'Retrieves all active message threads wrapped in a conversations object.',
  })
  @ApiResponse({ status: 200, description: 'Conversations container object' })
  async getThreads(@GetUser() user: User) {
    const conversations = await this.messagesService.getConversations(user.id);
    return { conversations };
  }

  /**
   * Get total unread message count for badge display
   */
  @Get('unread-count')
  @ApiOperation({
    summary: 'Get unread message count',
    description: 'Returns total number of unread incoming messages across all conversation threads.',
  })
  @ApiResponse({ status: 200, description: 'Unread message count' })
  async getUnreadCount(@GetUser() user: User) {
    return this.messagesService.getUnreadCount(user.id);
  }

  /**
   * Get thread history for a conversation by conversationId
   */
  @Get('thread/:conversationId')
  @ApiOperation({
    summary: 'Get conversation thread history',
    description: 'Fetches message history for a conversation with participant info and booking context.',
  })
  @ApiParam({ name: 'conversationId', description: 'Conversation UUID' })
  @ApiResponse({ status: 200, description: 'Thread history object' })
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
  @ApiOperation({
    summary: 'Get thread by booking ID',
    description: 'Retrieves or initializes a message thread directly linked to a reservation.',
  })
  @ApiParam({ name: 'bookingId', description: 'Booking UUID' })
  @ApiResponse({ status: 200, description: 'Conversation thread' })
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
  @ApiOperation({
    summary: 'Get or initialize property inquiry thread',
    description: 'Retrieves or begins an inquiry thread with the host of a specific property.',
  })
  @ApiParam({ name: 'propertyId', description: 'Property UUID' })
  @ApiResponse({ status: 200, description: 'Inquiry thread' })
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
  @ApiOperation({
    summary: 'Send message in conversation',
    description: 'Posts a new message to an existing or new conversation thread.',
  })
  @ApiResponse({ status: 201, description: 'Message sent' })
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
  @ApiOperation({
    summary: 'Mark conversation as read',
    description: 'Marks all incoming messages in the specified thread as read.',
  })
  @ApiParam({ name: 'conversationId', description: 'Conversation UUID' })
  @ApiResponse({ status: 200, description: 'Messages marked as read' })
  async markAsRead(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @GetUser() user: User,
  ) {
    return this.messagesService.markAsRead(conversationId, user.id);
  }
}
