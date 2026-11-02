import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
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
import { HostService } from './host.service';
import { CreateHostProfileDto } from './dto/create-host-profile.dto';
import { UpdateHostProfileDto } from './dto/update-host-profile.dto';
import { RequestHostVerificationDto } from './dto/request-verification.dto';
import { CreateHostListingDto } from './dto/create-host-listing.dto';
import { UpdateHostListingDto } from './dto/update-host-listing.dto';
import { QueryHostListingsDto, QueryHostReservationsDto } from './dto/query-host.dto';
import {
  QueryHostEarningsSummaryDto,
  QueryHostTransactionsDto,
} from './dto/query-host-earnings.dto';
import {
  QueryHostReviewsDto,
  QueryHostReviewsSummaryDto,
} from './dto/query-host-reviews.dto';
import { CreateAvailabilityBlockDto } from './dto/create-host-availability-block.dto';
import { CreateRoomDto } from '../properties/dto/create-room.dto';
import { UpdateHostRoomDto } from './dto/update-host-room.dto';
import { SubmitReviewDto } from '../properties/dto/moderation-review.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SuperAdminBypassGuard } from '../admin/rbac/super-admin-bypass.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { User } from '../../users/entities/user.entity';

/**
 * Host management API - all endpoints require authentication.
 * Ownership is enforced at the service layer for every mutation.
 */
@ApiTags('Host Management')
@ApiBearerAuth('JWT-auth')
@Controller('host')
@UseGuards(JwtAuthGuard, SuperAdminBypassGuard)
export class HostController {
  constructor(private readonly hostService: HostService) {}

  // ─────────────────────────────────────────
  // 1. HOST PROFILE
  // ─────────────────────────────────────────

  /**
   * GET /host/profile
   * Get the authenticated user's host profile (404 if they have not onboarded).
   */
  @Get('profile')
  @ApiOperation({ summary: 'Get current host profile' })
  @ApiResponse({ status: 200, description: 'Host profile returned' })
  @ApiResponse({ status: 404, description: 'Host profile not found' })
  async getProfile(@GetUser() user: User) {
    return this.hostService.getHostProfile(user.id);
  }

  /**
   * POST /host/profile
   * Create a host profile for the authenticated user (Become a Host).
   */
  @Post('profile')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create host profile (Become a Host)' })
  @ApiResponse({ status: 201, description: 'Host profile created' })
  async createProfile(
    @GetUser() user: User,
    @Body() dto: CreateHostProfileDto,
  ) {
    return this.hostService.createHostProfile(user.id, dto);
  }

  /**
   * PUT /host/profile
   * Update displayName, bio, phone, or avatar. verificationStatus is read-only for hosts.
   */
  @Put('profile')
  @ApiOperation({ summary: 'Update host profile' })
  @ApiResponse({ status: 200, description: 'Host profile updated' })
  async updateProfile(
    @GetUser() user: User,
    @Body() dto: UpdateHostProfileDto,
  ) {
    return this.hostService.updateHostProfile(user.id, dto);
  }

  /**
   * POST /host/profile/request-verification
   * Request host identity verification (transitions UNVERIFIED/REJECTED -> PENDING).
   * Host cannot approve or set VERIFIED.
   */
  @Post('profile/request-verification')
  @ApiOperation({ summary: 'Request identity verification for host' })
  @ApiResponse({ status: 200, description: 'Verification requested' })
  async requestVerification(
    @GetUser() user: User,
    @Body() dto?: RequestHostVerificationDto,
  ) {
    return this.hostService.requestVerification(user.id, dto);
  }

  /**
   * GET /host/verification/audit
   * View active identity verification audit metadata for the authenticated host.
   */
  @Get('verification/audit')
  @ApiOperation({ summary: 'Get host verification audit log' })
  @ApiResponse({ status: 200, description: 'Verification audit metadata' })
  async getMyVerificationAudit(@GetUser() user: User) {
    return this.hostService.getVerificationAudit(user.id);
  }

  // ─────────────────────────────────────────
  // 2. MY LISTINGS
  // ─────────────────────────────────────────

  /**
   * GET /host/listings
   * Returns paginated list of listings owned by the authenticated host.
   */
  @Get('listings')
  @ApiOperation({ summary: 'List host properties with status filter' })
  @ApiResponse({ status: 200, description: 'Paginated list of host listings' })
  async getMyListings(
    @GetUser() user: User,
    @Query() query: QueryHostListingsDto,
  ) {
    return this.hostService.getMyListings(user.id, query, user.role);
  }

  // ─────────────────────────────────────────
  // 3. CREATE LISTING
  // ─────────────────────────────────────────

  /**
   * POST /host/listings
   * Creates a new listing starting in DRAFT status.
   */
  @Post('listings')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new property listing (starts in DRAFT)' })
  @ApiResponse({ status: 201, description: 'Listing created' })
  async createListing(
    @GetUser() user: User,
    @Body() dto: CreateHostListingDto,
  ) {
    return this.hostService.createListing(user.id, dto, user.role);
  }

  // ─────────────────────────────────────────
  // 4. LISTING DETAIL (owner only)
  // ─────────────────────────────────────────

  /**
   * GET /host/listings/:id
   * Full detail view for the owner. Another host cannot access this.
   */
  @Get('listings/:id')
  @ApiOperation({ summary: 'Get full listing detail for owner host' })
  @ApiParam({ name: 'id', description: 'Property UUID' })
  @ApiResponse({ status: 200, description: 'Detailed property object' })
  async getListingDetail(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ) {
    return this.hostService.getListingDetail(id, user.id, user.role);
  }

  // ─────────────────────────────────────────
  // 5. UPDATE LISTING
  // ─────────────────────────────────────────

  /**
   * PUT /host/listings/:id
   * Update listing content. Status changes use dedicated endpoints below.
   */
  @Put('listings/:id')
  @ApiOperation({ summary: 'Update listing content' })
  @ApiParam({ name: 'id', description: 'Property UUID' })
  @ApiResponse({ status: 200, description: 'Listing updated' })
  async updateListing(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
    @Body() dto: UpdateHostListingDto,
  ) {
    return this.hostService.updateListing(id, dto, user.id, user.role);
  }

  @Post('listings/:id/rooms')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a room to listing' })
  @ApiParam({ name: 'id', description: 'Property UUID' })
  @ApiResponse({ status: 201, description: 'Room added' })
  async addListingRoom(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
    @Body() dto: CreateRoomDto,
  ) {
    return this.hostService.addListingRoom(id, dto, user.id, user.role);
  }

  @Patch('listings/:id/rooms/:roomId')
  @ApiOperation({ summary: 'Update a room in listing' })
  @ApiParam({ name: 'id', description: 'Property UUID' })
  @ApiParam({ name: 'roomId', description: 'Room UUID' })
  @ApiResponse({ status: 200, description: 'Room updated' })
  async updateListingRoom(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @GetUser() user: User,
    @Body() dto: UpdateHostRoomDto,
  ) {
    return this.hostService.updateListingRoom(id, roomId, dto, user.id, user.role);
  }

  @Delete('listings/:id/rooms/:roomId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a room from listing' })
  @ApiParam({ name: 'id', description: 'Property UUID' })
  @ApiParam({ name: 'roomId', description: 'Room UUID' })
  @ApiResponse({ status: 204, description: 'Room removed' })
  async removeListingRoom(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @GetUser() user: User,
  ) {
    return this.hostService.removeListingRoom(id, roomId, user.id, user.role);
  }

  // ─────────────────────────────────────────
  // 6. STATUS WORKFLOW
  // ─────────────────────────────────────────

  /**
   * POST /host/listings/:id/submit-review
   * Submits a draft or changes for admin review after automated validation checks.
   */
  @Post('listings/:id/submit-review')
  @ApiOperation({ summary: 'Submit listing for admin moderation review' })
  @ApiParam({ name: 'id', description: 'Property UUID' })
  @ApiResponse({ status: 200, description: 'Listing submitted for review' })
  async submitForReview(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
    @Body() dto?: SubmitReviewDto,
  ) {
    return this.hostService.submitListingForReview(id, user.id, user.role, dto?.notes);
  }

  /**
   * POST /host/listings/:id/withdraw-review
   * Withdraws a pending review proposal; live listing stays unchanged.
   */
  @Post('listings/:id/withdraw-review')
  @ApiOperation({ summary: 'Withdraw pending listing review submission' })
  @ApiParam({ name: 'id', description: 'Property UUID' })
  @ApiResponse({ status: 200, description: 'Review submission withdrawn' })
  async withdrawReview(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ) {
    return this.hostService.withdrawListingReview(id, user.id, user.role);
  }

  /**
   * GET /host/listings/:id/reviews
   * View active review status and history for this listing.
   */
  @Get('listings/:id/reviews')
  @ApiOperation({ summary: 'Get listing moderation review history' })
  @ApiParam({ name: 'id', description: 'Property UUID' })
  @ApiResponse({ status: 200, description: 'Moderation review history' })
  async getListingReviews(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ) {
    return this.hostService.getListingReviews(id, user.id, user.role);
  }

  /**
   * PATCH /host/listings/:id/publish
   * Submits listing for admin review under the mandatory moderation policy.
   */
  @Patch('listings/:id/publish')
  @ApiOperation({ summary: 'Publish listing' })
  @ApiParam({ name: 'id', description: 'Property UUID' })
  @ApiResponse({ status: 200, description: 'Listing published or queued for moderation' })
  async publishListing(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ) {
    return this.hostService.publishListing(id, user.id, user.role);
  }

  /**
   * PATCH /host/listings/:id/pause
   * PUBLISHED → PAUSED.
   */
  @Patch('listings/:id/pause')
  @ApiOperation({ summary: 'Pause published listing' })
  @ApiParam({ name: 'id', description: 'Property UUID' })
  @ApiResponse({ status: 200, description: 'Listing paused' })
  async pauseListing(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ) {
    return this.hostService.pauseListing(id, user.id, user.role);
  }

  /**
   * PATCH /host/listings/:id/archive
   * PUBLISHED/PAUSED → ARCHIVED.
   */
  @Patch('listings/:id/archive')
  @ApiOperation({ summary: 'Archive listing' })
  @ApiParam({ name: 'id', description: 'Property UUID' })
  @ApiResponse({ status: 200, description: 'Listing archived' })
  async archiveListing(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ) {
    return this.hostService.archiveListing(id, user.id, user.role);
  }

  /**
   * PATCH /host/listings/:id/mark-sold
   * For SALE listings only. Marks the listing as SOLD.
   */
  @Patch('listings/:id/mark-sold')
  @ApiOperation({ summary: 'Mark sale listing as sold' })
  @ApiParam({ name: 'id', description: 'Property UUID' })
  @ApiResponse({ status: 200, description: 'Listing marked as sold' })
  async markSold(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ) {
    return this.hostService.markSold(id, user.id, user.role);
  }

  // ─────────────────────────────────────────
  // 7. AVAILABILITY
  // ─────────────────────────────────────────

  /**
   * GET /host/listings/:id/availability
   */
  @Get('listings/:id/availability')
  @ApiOperation({ summary: 'Get listing calendar availability' })
  @ApiParam({ name: 'id', description: 'Property UUID' })
  @ApiResponse({ status: 200, description: 'Availability calendar intervals' })
  async getAvailability(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ) {
    return this.hostService.getAvailability(id, user.id, user.role);
  }

  /**
   * POST /host/listings/:id/availability
   * Only for RENTAL listings.
   */
  @Post('listings/:id/availability')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add availability block' })
  @ApiParam({ name: 'id', description: 'Property UUID' })
  @ApiResponse({ status: 201, description: 'Availability block added' })
  async addAvailabilityBlock(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
    @Body() dto: CreateAvailabilityBlockDto,
  ) {
    return this.hostService.addAvailabilityBlock(
      id,
      dto.startDate,
      dto.endDate,
      dto.reason || null,
      user.id,
      user.role,
    );
  }

  /**
   * DELETE /host/listings/:id/availability/:blockId
   */
  @Delete('listings/:id/availability/:blockId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove availability block' })
  @ApiParam({ name: 'id', description: 'Property UUID' })
  @ApiParam({ name: 'blockId', description: 'Block UUID' })
  @ApiResponse({ status: 204, description: 'Availability block deleted' })
  async removeAvailabilityBlock(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('blockId', ParseUUIDPipe) blockId: string,
    @GetUser() user: User,
  ) {
    return this.hostService.removeAvailabilityBlock(id, blockId, user.id, user.role);
  }

  // ─────────────────────────────────────────
  // 8. RESERVATIONS
  // ─────────────────────────────────────────

  /**
   * GET /host/reservations
   * Returns bookings for properties owned by the authenticated host.
   */
  @Get('reservations')
  @ApiOperation({ summary: 'List bookings for host properties' })
  @ApiResponse({ status: 200, description: 'Paginated reservations list' })
  async getHostReservations(
    @GetUser() user: User,
    @Query() query: QueryHostReservationsDto,
  ) {
    return this.hostService.getHostReservations(user.id, query, user.role);
  }

  // ─────────────────────────────────────────
  // 9. RESERVATION ACTIONS
  // ─────────────────────────────────────────

  /**
   * PATCH /host/reservations/:id/confirm
   */
  @Patch('reservations/:id/confirm')
  @ApiOperation({ summary: 'Confirm a reservation' })
  @ApiParam({ name: 'id', description: 'Booking UUID' })
  @ApiResponse({ status: 200, description: 'Reservation confirmed' })
  async confirmReservation(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ) {
    return this.hostService.confirmReservation(id, user.id);
  }

  /**
   * PATCH /host/reservations/:id/complete
   */
  @Patch('reservations/:id/complete')
  @ApiOperation({ summary: 'Complete a reservation' })
  @ApiParam({ name: 'id', description: 'Booking UUID' })
  @ApiResponse({ status: 200, description: 'Reservation completed' })
  async completeReservation(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ) {
    return this.hostService.completeReservation(id, user.id);
  }

  /**
   * PATCH /host/reservations/:id/cancel
   */
  @Patch('reservations/:id/cancel')
  @ApiOperation({ summary: 'Cancel a reservation (host initiated)' })
  @ApiParam({ name: 'id', description: 'Booking UUID' })
  @ApiResponse({ status: 200, description: 'Reservation cancelled' })
  async cancelReservation(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ) {
    return this.hostService.cancelReservation(id, user.id);
  }

  // ─────────────────────────────────────────
  // 10. DASHBOARD
  // ─────────────────────────────────────────

  /**
   * GET /host/dashboard
   * Returns lightweight summary metrics for the host's dashboard.
   */
  @Get(['dashboard', 'dashboard/summary'])
  @ApiOperation({ summary: 'Get host dashboard metrics overview' })
  @ApiResponse({ status: 200, description: 'Dashboard metrics summary' })
  async getDashboard(@GetUser() user: User) {
    return this.hostService.getDashboardSummary(user.id, user.role);
  }

  // ─────────────────────────────────────────
  // 11. EARNINGS & FINANCIAL REPORTING
  // ─────────────────────────────────────────

  /**
   * GET /host/earnings/summary
   * Aggregates real stored financial metrics for host properties.
   */
  @Get('earnings/summary')
  @ApiOperation({ summary: 'Get host earnings summary' })
  @ApiResponse({ status: 200, description: 'Financial metrics summary' })
  async getEarningsSummary(
    @GetUser() user: User,
    @Query() query: QueryHostEarningsSummaryDto,
  ) {
    return this.hostService.getEarningsSummary(user.id, query, user.role);
  }

  /**
   * GET /host/earnings/transactions
   * Returns paginated financial transaction records for host properties.
   */
  @Get('earnings/transactions')
  @ApiOperation({ summary: 'Get host transaction history ledger' })
  @ApiResponse({ status: 200, description: 'Paginated transactions list' })
  async getFinancialTransactions(
    @GetUser() user: User,
    @Query() query: QueryHostTransactionsDto,
  ) {
    return this.hostService.getFinancialTransactions(user.id, query, user.role);
  }

  // ─────────────────────────────────────────
  // 12. REVIEWS & REPUTATION MANAGEMENT
  // ─────────────────────────────────────────

  /**
   * GET /host/reviews/summary
   * Returns overall rating average, total review count, rating distribution,
   * and per-property review summaries for host listings.
   */
  @Get('reviews/summary')
  @ApiOperation({ summary: 'Get host review ratings breakdown' })
  @ApiResponse({ status: 200, description: 'Reviews summary metrics' })
  async getHostReviewsSummary(
    @GetUser() user: User,
    @Query() query: QueryHostReviewsSummaryDto,
  ) {
    return this.hostService.getHostReviewsSummary(user.id, query, user.role);
  }

  /**
   * GET /host/reviews
   * Returns paginated reviews for properties owned by the authenticated host.
   */
  @Get('reviews')
  @ApiOperation({ summary: 'Get host property guest reviews' })
  @ApiResponse({ status: 200, description: 'Paginated reviews' })
  async getHostReviews(
    @GetUser() user: User,
    @Query() query: QueryHostReviewsDto,
  ) {
    return this.hostService.getHostReviews(user.id, query, user.role);
  }

  // ─────────────────────────────────────────
  // 13. PAYOUTS & BANKING ACCOUNTS
  // ─────────────────────────────────────────

  /**
   * GET /host/payouts
   * List payouts disbursed or pending for the authenticated host.
   */
  @Get('payouts')
  @ApiOperation({ summary: 'List host payouts' })
  @ApiResponse({ status: 200, description: 'Payouts list' })
  async getHostPayouts(@GetUser() user: User) {
    return this.hostService.getHostPayouts(user.id);
  }

  /**
   * GET /host/payouts/:id
   * Get detailed statement & line items for a single payout.
   */
  @Get('payouts/:id')
  @ApiOperation({ summary: 'Get payout statement details' })
  @ApiParam({ name: 'id', description: 'Payout UUID' })
  @ApiResponse({ status: 200, description: 'Detailed payout breakdown' })
  async getHostPayoutDetail(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ) {
    return this.hostService.getHostPayoutDetail(user.id, id);
  }

  /**
   * GET /host/payouts/:id/statement
   * Download / view payout remittance statement.
   */
  @Get('payouts/:id/statement')
  @ApiOperation({ summary: 'Get payout remittance statement' })
  @ApiParam({ name: 'id', description: 'Payout UUID' })
  @ApiResponse({ status: 200, description: 'Remittance statement document' })
  async getHostPayoutStatement(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ) {
    return this.hostService.getHostPayoutStatement(user.id, id);
  }

  /**
   * GET /host/payout-accounts
   * Returns list of configured payout accounts with masked numbers.
   */
  @Get('payout-accounts')
  @ApiOperation({ summary: 'List host payout banking/telebirr accounts' })
  @ApiResponse({ status: 200, description: 'List of configured payout accounts' })
  async getHostPayoutAccounts(@GetUser() user: User) {
    return this.hostService.getHostPayoutAccounts(user.id);
  }

  /**
   * POST /host/payout-accounts
   * Register a new payout account (bank / telebirr).
   */
  @Post('payout-accounts')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a new payout account' })
  @ApiResponse({ status: 201, description: 'Payout account added' })
  async createHostPayoutAccount(
    @GetUser() user: User,
    @Body() dto: any,
  ) {
    return this.hostService.createHostPayoutAccount(user.id, dto, user);
  }

  /**
   * PATCH /host/payout-accounts/:id
   * Update payout account (e.g. disable).
   */
  @Patch('payout-accounts/:id')
  @ApiOperation({ summary: 'Update or disable payout account' })
  @ApiParam({ name: 'id', description: 'Payout Account UUID' })
  @ApiResponse({ status: 200, description: 'Payout account updated' })
  async updateHostPayoutAccount(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
    @Body() dto: any,
  ) {
    return this.hostService.updateHostPayoutAccount(user.id, id, dto);
  }
}
