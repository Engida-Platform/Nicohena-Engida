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
import { BookingsService } from './bookings.service';
import { PricingService } from './pricing.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { QuoteBookingDto } from './dto/quote-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SuperAdminBypassGuard } from '../admin/rbac/super-admin-bypass.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { User } from '../../users/entities/user.entity';

@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly pricingService: PricingService,
  ) {}

  /**
   * PRICE-01: Public authoritative server-side price quote
   */
  @Post('quote')
  @HttpCode(HttpStatus.OK)
  async getQuote(@Body() dto: QuoteBookingDto) {
    return this.pricingService.quote(dto);
  }

  /**
   * Create a new booking (authenticated users)
   */
  @Post()
  @UseGuards(JwtAuthGuard, SuperAdminBypassGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createBookingDto: CreateBookingDto,
    @GetUser() user: User,
  ) {
    return this.bookingsService.create(createBookingDto, user.id);
  }

  /**
   * Get the current user's bookings as a tenant
   */
  @Get('my-bookings')
  @UseGuards(JwtAuthGuard, SuperAdminBypassGuard)
  async getMyBookings(@GetUser() user: User) {
    return this.bookingsService.findMyBookings(user.id);
  }

  /**
   * Get incoming reservations for properties the current user hosts
   */
  @Get('host-reservations')
  @UseGuards(JwtAuthGuard, SuperAdminBypassGuard)
  async getHostReservations(@GetUser() user: User) {
    return this.bookingsService.findHostReservations(user.id);
  }

  /**
   * Get a single booking by ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, SuperAdminBypassGuard)
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
    return this.bookingsService.findOne(id, user.id, user.role);
  }

  /**
   * Update booking status (confirm, cancel, complete)
   */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, SuperAdminBypassGuard)
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateBookingStatusDto,
    @GetUser() user: User,
  ) {
    return this.bookingsService.updateStatus(id, updateDto, user.id, user.role);
  }

  /**
   * BOOK-03: Guest cancellation request with policy evaluation
   */
  @Post(':id/cancellation-requests')
  @UseGuards(JwtAuthGuard, SuperAdminBypassGuard)
  @HttpCode(HttpStatus.OK)
  async requestCancellation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason?: string },
    @GetUser() user: User,
  ) {
    return this.bookingsService.requestCancellation(id, user.id, body?.reason || '');
  }
}
