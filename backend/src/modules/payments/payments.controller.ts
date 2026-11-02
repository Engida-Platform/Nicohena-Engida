import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiHeader,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import {
  CreatePaymentSessionDto,
  InitializePaymentDto,
  VerifyPaymentDto,
  CompleteSandboxPaymentDto,
} from './dto/payment.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { User } from '../../users/entities/user.entity';
import { PaymentsCaptureService } from '../finance/services/payments-capture.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly captureService: PaymentsCaptureService,
  ) {}

  /**
   * Public list of supported Ethiopian & International payment methods
   */
  @Get('methods')
  @ApiOperation({
    summary: 'Get supported payment methods',
    description: 'Returns available payment options (Telebirr, CBE Birr, Chapa card/mobile) with currencies and capabilities.',
  })
  @ApiResponse({ status: 200, description: 'List of supported payment methods' })
  getMethods() {
    return this.paymentsService.getPaymentMethods();
  }

  /**
   * Phase 3 authoritative session creation bound to server-side booking quote
   */
  @Post('sessions')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create payment session',
    description: 'Generates an authoritative payment checkout session with redirect URL and checkout token.',
  })
  @ApiResponse({ status: 201, description: 'Payment session created' })
  @ApiResponse({ status: 400, description: 'Invalid booking or expired quote' })
  createSession(
    @Body() dto: CreatePaymentSessionDto,
    @GetUser() user: User,
  ) {
    return this.captureService.createPaymentSession(dto, user);
  }

  /**
   * Phase 3 public/guest session status check (no sensitive secrets or PAN)
   */
  @Get('sessions/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get payment session status',
    description: 'Retrieves payment session state (PENDING, PAID, FAILED) without exposing sensitive provider tokens.',
  })
  @ApiParam({ name: 'id', description: 'Session UUID' })
  @ApiResponse({ status: 200, description: 'Session status object' })
  getSession(
    @Param('id') id: string,
    @GetUser() user: User,
  ) {
    return this.captureService.getPaymentSession(id, user);
  }

  /**
   * Verified provider webhook ingestion with raw body and signature verification
   */
  @Post('sandbox/complete')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Complete sandbox payment (Development)',
    description: 'Simulates instantaneous payment capture in sandbox mode without external gateway roundtrips.',
  })
  @ApiResponse({ status: 200, description: 'Sandbox payment completed' })
  async completeSandboxPayment(
    @Body() dto: CompleteSandboxPaymentDto,
    @GetUser() user: User,
  ) {
    return this.captureService.completeSandboxPayment(dto, user);
  }

  /**
   * Verified provider webhook ingestion with raw body and signature verification
   */
  @Post('webhook/:provider')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Provider payment webhook endpoint',
    description: 'Authoritative webhook receiver for Telebirr, CBE Birr, and Chapa with HMAC signature verification.',
  })
  @ApiParam({ name: 'provider', description: 'Payment provider (TELEBIRR, CBE, CHAPA)' })
  @ApiHeader({ name: 'x-chapa-signature', required: false, description: 'Chapa HMAC signature header' })
  @ApiResponse({ status: 200, description: 'Webhook accepted and processed' })
  async handleWebhook(
    @Param('provider') provider: string,
    @Req() req: any,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: any,
  ) {
    const rawBody = req.rawBody || JSON.stringify(body || {});
    return this.captureService.handleWebhook(provider, rawBody, headers);
  }

  /**
   * Legacy checkout compatibility: initialized via client
   */
  @Post('initialize')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Initialize payment (Legacy compatibility)',
    description: 'Initializes a transaction directly with Chapa or Telebirr and returns checkout URL.',
  })
  @ApiResponse({ status: 200, description: 'Payment initialized with checkout URL' })
  async initializePayment(
    @Body() dto: InitializePaymentDto,
    @GetUser() user: User,
  ) {
    if (dto.bookingId) {
      return this.captureService.createPaymentSession(
        {
          bookingId: dto.bookingId,
          paymentMethod: dto.paymentMethod,
          currency: dto.currency,
          customerPhone: dto.customerPhone,
          returnUrl: dto.returnUrl,
        },
        user,
      );
    }
    return this.paymentsService.initializePayment(dto, user.id);
  }

  /**
   * Status check endpoint (does not mark bookings paid)
   */
  @Post('verify')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Verify payment status',
    description: 'Checks the latest transaction status from payment provider without mutating escrow state.',
  })
  @ApiResponse({ status: 200, description: 'Payment verification result' })
  async verifyPayment(
    @Body() dto: VerifyPaymentDto,
    @GetUser() user: User,
  ) {
    return this.paymentsService.verifyPayment(dto, user.id);
  }

  /**
   * Legacy Chapa Webhook route redirected to verified handler
   */
  @Post('webhook/chapa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Legacy Chapa webhook route',
    description: 'Delegates Chapa notifications to the verified webhook capture service.',
  })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async chapaWebhook(
    @Req() req: any,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: any,
  ) {
    const rawBody = req.rawBody || JSON.stringify(body || {});
    return this.captureService.handleWebhook('CHAPA', rawBody, headers);
  }
}
