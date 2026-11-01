import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { DisputesService } from './disputes.service';
import { CreateDisputeDto, AddDisputeMessageDto } from './dto/create-dispute.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { User } from '../../users/entities/user.entity';

@Controller('disputes')
@UseGuards(JwtAuthGuard)
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  /**
   * File a dispute on a reservation and freeze escrow payout
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createDispute(@Body() dto: CreateDisputeDto, @GetUser() user: User) {
    return this.disputesService.createDispute(dto, user);
  }

  /**
   * List all disputes for the authenticated user
   */
  @Get('mine')
  async getMyDisputes(@GetUser() user: User) {
    return this.disputesService.getMyDisputes(user);
  }

  /**
   * Get dispute details for a specific reservation
   */
  @Get('booking/:bookingId')
  async getDisputeForBooking(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @GetUser() user: User,
  ) {
    return this.disputesService.getDisputeForBooking(bookingId, user);
  }

  /**
   * Get dispute details and discussion thread
   */
  @Get(':id')
  async getDisputeDetail(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ) {
    return this.disputesService.getDisputeDetail(id, user);
  }

  /**
   * Reply / add note or evidence to a dispute thread
   */
  @Post(':id/messages')
  @HttpCode(HttpStatus.CREATED)
  async addDisputeMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddDisputeMessageDto,
    @GetUser() user: User,
  ) {
    return this.disputesService.addDisputeMessage(id, dto, user);
  }

  /**
   * Accept compensation proposed by resolution desk
   */
  @Post(':id/accept-compensation')
  @HttpCode(HttpStatus.OK)
  async acceptCompensation(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ) {
    return this.disputesService.acceptCompensation(id, user);
  }
}

