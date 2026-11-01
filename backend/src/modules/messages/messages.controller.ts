import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
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
   * List all conversation threads for the current user
   */
  @Get('conversations')
  async getConversations(@GetUser() user: User) {
    return this.messagesService.getConversations(user.id);
  }

  /**
   * Get message history for a conversation or booking thread
   */
  @Get('thread/:id')
  async getThread(@Param('id') id: string, @GetUser() user: User) {
    return this.messagesService.getThread(id, user.id, user.role);
  }

  /**
   * Send a message in a conversation or initiate inquiry
   */
  @Post('send')
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(@Body() dto: SendMessageDto, @GetUser() user: User) {
    return this.messagesService.sendMessage(dto, user);
  }
}
