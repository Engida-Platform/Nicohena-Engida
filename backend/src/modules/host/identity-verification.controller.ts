import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiHeader,
} from '@nestjs/swagger';
import { IdentityVerificationService } from './identity-verification.service';
import { HostService } from './host.service';
import { LookupFaydaDto } from './dto/lookup-fayda.dto';

@ApiTags('Host Management')
@Controller('host/verification')
export class IdentityVerificationController {
  constructor(
    private readonly identityVerificationService: IdentityVerificationService,
    private readonly hostService: HostService,
  ) {}

  /**
   * GET /host/verification/config
   * Public discovery endpoint for supported identity document types, issuing countries, and providers.
   */
  @Get('config')
  @ApiOperation({
    summary: 'Get verification provider config',
    description: 'Returns supported ID document types, issuing countries, and digital verification options (e.g. Ethiopian Fayda ID, passport).',
  })
  @ApiResponse({ status: 200, description: 'Configuration payload returned' })
  getVerificationConfig() {
    return this.identityVerificationService.getVerificationConfig();
  }

  /**
   * POST /host/verification/fayda/lookup
   * Instant digital identity verification & demographic extraction via Ethiopian National ID Program (FIN / FAN).
   */
  @Post('fayda/lookup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lookup Ethiopian Fayda National ID',
    description: 'Validates demographic details against the Ethiopian National ID Program (FIN / FAN) for instant host verification.',
  })
  @ApiResponse({ status: 200, description: 'Demographic match result returned' })
  @ApiResponse({ status: 400, description: 'Invalid Fayda ID or demographic discrepancy' })
  async lookupFayda(@Body() dto: LookupFaydaDto) {
    return this.identityVerificationService.lookupFaydaRecord(dto);
  }

  /**
   * POST /host/verification/webhook/:provider
   * Authoritative identity verification provider webhook.
   */
  @Post('webhook/:provider')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Identity verification provider webhook',
    description: 'Receives signed verification results from third-party identity providers with HMAC-SHA256 signature verification.',
  })
  @ApiParam({ name: 'provider', description: 'Provider identifier (e.g. smile_id, onfido, fayda)' })
  @ApiHeader({ name: 'x-signature', description: 'HMAC signature of payload' })
  @ApiHeader({ name: 'x-timestamp', description: 'Unix timestamp of webhook request' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid signature or missing transactionId' })
  async handleProviderWebhook(
    @Param('provider') providerParam: string,
    @Headers('x-signature') signature: string,
    @Headers('x-timestamp') timestampStr: string,
    @Body() body: any,
  ) {
    const timestamp = parseInt(timestampStr, 10);
    const rawBody = typeof body === 'string' ? body : JSON.stringify(body);

    // Cryptographic validation of provider response
    this.identityVerificationService.validateProviderWebhookSignature(
      rawBody,
      signature,
      timestamp,
    );

    if (!body?.transactionId) {
      throw new BadRequestException('Webhook payload missing transactionId.');
    }

    return this.hostService.processProviderVerificationResult({
      transactionId: body.transactionId,
      documentAuthentic: Boolean(body.documentAuthentic),
      faceMatchScore: body.faceMatchScore,
      faceMatchPassed: body.faceMatchPassed,
      livenessVerified: body.livenessVerified,
      failureReason: body.failureReason,
      confidenceScore: body.confidenceScore,
    });
  }
}
