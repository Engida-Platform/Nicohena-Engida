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
  ApiBody,
} from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { PricingService } from './pricing.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { QuoteBookingDto } from './dto/quote-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SuperAdminBypassGuard } from '../admin/rbac/super-admin-bypass.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { User } from '../../users/entities/user.entity';

@ApiTags('Bookings')
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
  @ApiOperation({
    summary: 'Calculate booking price quote',
    description: 'Calculates authoritative pricing breakdown including base nights, cleaning fees, service charges, and applied coupons.',
  })
  @ApiResponse({ status: 200, description: 'Detailed pricing quote' })
  @ApiResponse({ status: 400, description: 'Invalid date range or property' })
  async getQuote(@Body() dto: QuoteBookingDto) {
    return this.pricingService.quote(dto);
  }

  /**
   * Create a new booking (authenticated users)
   */
  @Post()
  @UseGuards(JwtAuthGuard, SuperAdminBypassGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a new reservation',
    description: 'Creates a pending reservation after verifying calendar availability and calculating server-side pricing.',
  })
  @ApiResponse({ status: 201, description: 'Reservation created in PENDING status' })
  @ApiResponse({ status: 400, description: 'Dates unavailable or invalid guest count' })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user guest reservations',
    description: 'Returns all bookings made by the authenticated user with status and payment details.',
  })
  @ApiResponse({ status: 200, description: 'List of guest bookings' })
  async getMyBookings(@GetUser() user: User) {
    return this.bookingsService.findMyBookings(user.id);
  }

  /**
   * Get incoming reservations for properties the current user hosts
   */
  @Get('host-reservations')
  @UseGuards(JwtAuthGuard, SuperAdminBypassGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get host incoming reservations',
    description: 'Returns all reservations booked for properties owned by the authenticated host.',
  })
  @ApiResponse({ status: 200, description: 'List of host reservations' })
  async getHostReservations(@GetUser() user: User) {
    return this.bookingsService.findHostReservations(user.id);
  }

  /**
   * Get a single booking by ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, SuperAdminBypassGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get booking details by ID',
    description: 'Retrieves comprehensive reservation record. Permitted for booking guest, property host, or platform admin.',
  })
  @ApiParam({ name: 'id', description: 'Booking UUID' })
  @ApiResponse({ status: 200, description: 'Booking details object' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
    return this.bookingsService.findOne(id, user.id, user.role);
  }

  /**
   * Update booking status (confirm, cancel, complete)
   */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, SuperAdminBypassGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update booking status',
    description: 'Transitions booking through CONFIRMED, COMPLETED, or CANCELLED with lifecycle state checks.',
  })
  @ApiParam({ name: 'id', description: 'Booking UUID' })
  @ApiResponse({ status: 200, description: 'Booking status updated successfully' })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Request booking cancellation',
    description: 'Initiates a guest cancellation request and calculates refund eligibility according to listing cancellation policy.',
  })
  @ApiParam({ name: 'id', description: 'Booking UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', example: 'Travel plan changes' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Cancellation request processed' })
  async requestCancellation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason?: string },
    @GetUser() user: User,
  ) {
    return this.bookingsService.requestCancellation(id, user.id, body?.reason || '');
  }
}
