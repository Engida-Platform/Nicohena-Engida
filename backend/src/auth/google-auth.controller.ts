import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Logger,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { GoogleAuthService } from './google-auth.service';
import { setRefreshCookie } from './refresh-cookie';

const STATE_COOKIE = 'google_oauth_state';
const STATE_COOKIE_TTL_MS = 10 * 60 * 1000;

@ApiTags('Authentication')
@Controller('auth/google')
export class GoogleAuthController {
  private readonly logger = new Logger(GoogleAuthController.name);

  constructor(
    private readonly googleAuthService: GoogleAuthService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Start the Google Sign-In flow: the user is redirected to Google's consent
   * screen with a short-lived, signed state parameter.
   */
  @Get()
  @ApiOperation({
    summary: 'Initiate Google OAuth 2.0 flow',
    description: 'Generates CSRF state and redirects browser to Google OAuth consent screen.',
  })
  @ApiQuery({
    name: 'next',
    required: false,
    description: 'Destination URL on frontend after successful sign-in (default: /dashboard)',
  })
  @ApiResponse({ status: 302, description: 'Redirects to Google OAuth authorization consent screen' })
  async startGoogleAuth(
    @Query('next') next: string | undefined,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    if (!this.googleAuthService.isEnabled()) {
      this.logger.warn('Google sign-in requested but the server is not configured for it');
      return this.redirectToClient(res, '/login?error=google_not_configured', req);
    }

    const { state, nonce } = await this.googleAuthService.createState(next ?? '/dashboard');

    // Double-submit cookie: the callback only accepts a state that matches this
    // browser session, which blocks CSRF attempts against the callback.
    res.cookie(STATE_COOKIE, nonce, {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: STATE_COOKIE_TTL_MS,
    });

    return res.redirect(this.googleAuthService.getAuthorizationUrl(state, req));
  }

  /**
   * Google redirects back here with the authorization code.
   */
  @Get('callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Google OAuth callback handler',
    description: 'Internal callback endpoint where Google redirects with auth code. Validates CSRF state, exchanges code for user profile, and establishes session.',
  })
  @ApiQuery({ name: 'code', required: false, description: 'Google OAuth authorization code' })
  @ApiQuery({ name: 'state', required: false, description: 'State verification token' })
  @ApiQuery({ name: 'error', required: false, description: 'Google OAuth error code if rejected' })
  @ApiResponse({ status: 302, description: 'Redirects user back to frontend callback handler' })
  async googleCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (error) {
      this.logger.warn(`Google sign-in was not completed: ${error}`);
      return this.redirectToClient(res, `/login?error=${encodeURIComponent(error)}`, req);
    }

    if (!code || !state) {
      return this.redirectToClient(res, '/login?error=google_invalid_response', req);
    }

    // The intended destination is only trusted once the signed state verified.
    let resolvedNext: string | null = null;

    try {
      const nonce = req.cookies?.[STATE_COOKIE];
      const statePayload = await this.googleAuthService.verifyState(state, nonce);
      resolvedNext = statePayload.next;
      const profile = await this.googleAuthService.verifyCode(code, req);

      // A browser that is already signed in may link this Google identity to
      // the account it owns. Without a session, an existing local account with
      // the same email is never linked automatically.
      const sessionUser = await this.authService.findUserByRefreshToken(
        req.cookies?.refreshToken,
      );

      const result = await this.authService.loginWithGoogle(
        profile,
        req.headers['user-agent'],
        req.ip,
        sessionUser?.id,
      );

      setRefreshCookie(res, result.refreshToken, this.configService);

      // Clear OAuth state cookie
      res.clearCookie(STATE_COOKIE, {
        httpOnly: true,
        secure: this.configService.get<string>('NODE_ENV') === 'production',
        sameSite: 'lax',
        path: '/',
      });

      return this.redirectToClient(
        res,
        `/auth/google/callback?next=${encodeURIComponent(statePayload.next)}&token=${encodeURIComponent(result.accessToken)}&refresh=${encodeURIComponent(result.refreshToken)}`,
        req,
      );
    } catch (err) {
      this.logger.warn(`Google sign-in failed: ${(err as Error).message}`);

      const reason =
        err instanceof UnauthorizedException || err instanceof ConflictException
          ? err.message
          : 'google_failed';

      const target = resolvedNext ?? '/login';
      return this.redirectToClient(res, withQueryParam(target, 'error', reason), req);
    }
  }

  private redirectToClient(res: Response, path: string, req?: Request) {
    let frontendUrl = this.configService.get<string>('FRONTEND_URL');
    if (!frontendUrl || frontendUrl.includes('localhost')) {
      if (req) {
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        const proto = req.headers['x-forwarded-proto'] || 'https';
        if (host && !String(host).includes('localhost')) {
          frontendUrl = `${proto}://${host}`;
        }
      }
      if (!frontendUrl || frontendUrl.includes('localhost')) {
        frontendUrl = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'https://nicohena-engida.vercel.app';
      }
    }
    const target = `${frontendUrl.replace(/\/$/, '')}${path}`;
    return res.redirect(target);
  }
}

/**
 * Append a query parameter to an internal path, keeping existing parameters.
 */
function withQueryParam(path: string, key: string, value: string): string {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}${key}=${encodeURIComponent(value)}`;
}
