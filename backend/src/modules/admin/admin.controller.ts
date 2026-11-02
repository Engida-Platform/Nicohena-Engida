import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { User, UserRole } from '../../users/entities/user.entity';
import { PermissionsGuard } from './rbac/permissions.guard';
import {
  RequirePermissions,
  RequireAnyPermissions,
} from './rbac/permissions.decorator';
import { Permission } from './rbac/permissions';
import { ListingModerationService } from '../properties/listing-moderation.service';
import { HostService } from '../host/host.service';
import {
  QueryReviewsDto,
  RejectReviewDto,
  HideListingDto,
  RestoreListingDto,
} from '../properties/dto/moderation-review.dto';
import {
  QueryHostVerificationsDto,
  RejectHostVerificationDto,
} from '../host/dto/admin-host-verification.dto';

@ApiTags('Admin - Listings & Moderation')
@ApiBearerAuth('JWT-auth')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    private readonly listingModerationService: ListingModerationService,
    private readonly hostService: HostService,
  ) {}

  /**
   * GET /admin/reviews
   * Unified listing review queue (new listings and important edit proposals).
   */
  @Get('reviews')
  @RequirePermissions(Permission.LISTINGS_REVIEW)
  @ApiOperation({
    summary: 'Get listing moderation queue',
    description: 'Returns listing submissions awaiting moderator review (draft publishings and major content edits).',
  })
  @ApiResponse({ status: 200, description: 'Paginated review submissions' })
  async getReviewQueue(@Query() query: QueryReviewsDto) {
    return this.listingModerationService.getAdminReviewQueue(query);
  }

  /**
   * GET /admin/reviews/stats
   * Aggregate queue counts for the moderation summary cards.
   */
  @Get('reviews/stats')
  @RequirePermissions(Permission.LISTINGS_REVIEW)
  @ApiOperation({ summary: 'Get moderation queue metrics' })
  @ApiResponse({ status: 200, description: 'Moderation queue counts' })
  async getReviewStats() {
    return this.listingModerationService.getAdminReviewStats();
  }

  /**
   * GET /admin/reviews/:id
   * Detailed view of a submission including proposed changes diff against live values.
   */
  @Get('reviews/:id')
  @RequirePermissions(Permission.LISTINGS_REVIEW)
  @ApiOperation({ summary: 'Get review detail with live diff' })
  @ApiParam({ name: 'id', description: 'Review UUID' })
  @ApiResponse({ status: 200, description: 'Review detail object' })
  async getReviewDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.listingModerationService.getAdminReviewDetail(id);
  }

  /**
   * POST /admin/reviews/:id/approve
   * Concurrency-safe approval of initial publish or important edit proposal.
   */
  @Post('reviews/:id/approve')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.LISTINGS_REVIEW)
  @ApiOperation({ summary: 'Approve listing review' })
  @ApiParam({ name: 'id', description: 'Review UUID' })
  @ApiResponse({ status: 200, description: 'Review approved and changes merged to live listing' })
  async approveReview(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() admin: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.listingModerationService.approveReview(id, admin, {
      ipAddress,
      userAgent,
    });
  }

  /**
   * POST /admin/reviews/:id/reject
   * Concurrency-safe rejection requiring an explanation.
   */
  @Post('reviews/:id/reject')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.LISTINGS_REVIEW)
  @ApiOperation({ summary: 'Reject listing review' })
  @ApiParam({ name: 'id', description: 'Review UUID' })
  @ApiResponse({ status: 200, description: 'Review rejected with feedback' })
  async rejectReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectReviewDto,
    @GetUser() admin: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.listingModerationService.rejectReview(
      id,
      dto.rejectionReason,
      admin,
      { ipAddress, userAgent },
    );
  }

  /**
   * POST /admin/listings/:id/hide
   * Immediately hides an already-published listing when there is a safety, fraud, or policy concern.
   */
  @Post('listings/:id/hide')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.LISTINGS_HIDE)
  @ApiOperation({ summary: 'Hide listing from public search' })
  @ApiParam({ name: 'id', description: 'Property UUID' })
  @ApiResponse({ status: 200, description: 'Listing hidden from public discovery' })
  async hideListing(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: HideListingDto,
    @GetUser() admin: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.listingModerationService.hideListing(id, dto.reason, admin, {
      ipAddress,
      userAgent,
    });
  }

  /**
   * GET /admin/listings/:id
   * Admin inspection of any listing (regardless of whether it is draft, hidden, or published).
   */
  @Get('listings/:id')
  @RequireAnyPermissions(Permission.LISTINGS_HIDE, Permission.LISTINGS_VIEW)
  @ApiOperation({ summary: 'Inspect listing detail (Admin view)' })
  @ApiParam({ name: 'id', description: 'Property UUID' })
  @ApiResponse({ status: 200, description: 'Comprehensive listing record' })
  async getAdminListingDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.listingModerationService.getAdminListingDetail(id);
  }

  /**
   * POST /admin/listings/:id/restore
   * Restores a previously hidden listing to public discovery and bookings.
   */
  @Post('listings/:id/restore')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.LISTINGS_HIDE)
  @ApiOperation({ summary: 'Restore hidden listing' })
  @ApiParam({ name: 'id', description: 'Property UUID' })
  @ApiResponse({ status: 200, description: 'Listing restored to active search' })
  async restoreListing(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RestoreListingDto,
    @GetUser() admin: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.listingModerationService.restoreListing(
      id,
      admin,
      {
        ipAddress,
        userAgent,
      },
      dto?.reason,
    );
  }

  // ─────────────────────────────────────────
  // HOST IDENTITY VERIFICATION WORKFLOW
  // ─────────────────────────────────────────

  /**
   * GET /admin/host-verifications
   * List pending (or filtered) host identity verification requests.
   */
  @Get('host-verifications')
  @RequirePermissions(Permission.HOSTS_VIEW)
  @ApiOperation({ summary: 'List pending host verifications' })
  @ApiResponse({ status: 200, description: 'Host verification list' })
  async getHostVerifications(@Query() query: QueryHostVerificationsDto) {
    return this.hostService.getHostVerifications(query);
  }

  /**
   * POST /admin/host-verifications/:id/approve
   * Approves a host's pending identity verification request.
   */
  @Post('host-verifications/:id/approve')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.HOSTS_VERIFY)
  @ApiOperation({ summary: 'Approve host identity verification' })
  @ApiParam({ name: 'id', description: 'Host Profile UUID' })
  @ApiResponse({ status: 200, description: 'Host verified' })
  async approveHostVerification(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() admin: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.hostService.approveHostVerification(id, admin, {
      ipAddress,
      userAgent,
    });
  }

  /**
   * POST /admin/host-verifications/:id/reject
   * Rejects a host's pending identity verification request with required explanation.
   */
  @Post('host-verifications/:id/reject')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.HOSTS_VERIFY)
  @ApiOperation({ summary: 'Reject host identity verification' })
  @ApiParam({ name: 'id', description: 'Host Profile UUID' })
  @ApiResponse({ status: 200, description: 'Verification rejected' })
  async rejectHostVerification(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectHostVerificationDto,
    @GetUser() admin: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    const explanation = dto.explanation || dto.rejectionReason;
    return this.hostService.rejectHostVerification(id, explanation!, admin, {
      ipAddress,
      userAgent,
    });
  }

  /**
   * POST /admin/host-verifications/:id/revoke
   * Revokes an active host verification with required explanation.
   */
  @Post('host-verifications/:id/revoke')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.HOSTS_VERIFY)
  @ApiOperation({ summary: 'Revoke active host verification' })
  @ApiParam({ name: 'id', description: 'Host Profile UUID' })
  @ApiResponse({ status: 200, description: 'Verification revoked' })
  async revokeHostVerification(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectHostVerificationDto,
    @GetUser() admin: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    const explanation = dto.explanation || dto.rejectionReason;
    return this.hostService.revokeHostVerification(id, explanation!, admin, {
      ipAddress,
      userAgent,
    });
  }

  /**
   * GET /admin/host-verifications/:id/audit-trail
   * Retrieves full audit records, masked document numbers, provider transaction IDs, and liveness/face-match scores for compliance inspection.
   */
  @Get('host-verifications/:id/audit-trail')
  @RequirePermissions(Permission.HOSTS_VERIFY)
  @ApiOperation({ summary: 'Get host verification audit trail' })
  @ApiParam({ name: 'id', description: 'Host Profile UUID' })
  @ApiResponse({ status: 200, description: 'Full verification audit trail' })
  async getHostVerificationAuditTrail(@Param('id', ParseUUIDPipe) id: string) {
    const profile = await this.hostService.getHostProfileById(id);
    return this.hostService.getVerificationAudit(profile.userId);
  }
}
