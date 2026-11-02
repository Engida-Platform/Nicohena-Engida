import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Ip,
  Headers,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SendOtpDto, VerifyOtpDto } from './dto/otp.dto';
import { OtpService } from './otp.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GetUser } from './decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { getAdminPermissions } from '../modules/admin/rbac/permissions';
import { setRefreshCookie, clearRefreshCookie } from './refresh-cookie';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
    private readonly configService: ConfigService,
  ) {}

  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send phone/email verification OTP',
    description: 'Generates and sends a 6-digit one-time password to the specified email or phone number.',
  })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid phone/email target or delivery channel' })
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.otpService.sendOtp(dto);
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify phone/email OTP code',
    description: 'Validates the 6-digit OTP code against the target phone number or email address.',
  })
  @ApiResponse({ status: 200, description: 'OTP verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP code' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.otpService.verifyOtp(dto);
  }

  @Get('otp/status')
  @ApiOperation({
    summary: 'Check OTP provider status',
    description: 'Returns health status and configured gateway for the SMS/email OTP service.',
  })
  @ApiResponse({ status: 200, description: 'Provider status returned' })
  getOtpProviderStatus() {
    return this.otpService.getProviderStatus();
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register new user account',
    description: 'Creates a new user with GUEST role. Requires email, password, and full name.',
  })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate and receive tokens',
    description: 'Validates credentials and returns a short-lived JWT access token while setting an HttpOnly refreshToken cookie.',
  })
  @ApiResponse({ status: 200, description: 'Authenticated successfully; sets refreshToken HttpOnly cookie' })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Headers('user-agent') userAgent: string,
    @Ip() ipAddress: string,
  ) {
    const result = await this.authService.login(loginDto, userAgent, ipAddress);

    setRefreshCookie(res, result.refreshToken, this.configService);

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Exchanges a valid HttpOnly refreshToken cookie for a new JWT access token and rotates the refresh token.',
  })
  @ApiResponse({ status: 200, description: 'Access token successfully refreshed' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Headers('user-agent') userAgent: string,
    @Ip() ipAddress: string,
  ) {
    const refreshToken = req.cookies?.refreshToken;
    const result = await this.authService.refreshTokens(refreshToken, userAgent, ipAddress);

    setRefreshCookie(res, result.refreshToken, this.configService);

    return {
      accessToken: result.accessToken,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout user session',
    description: 'Revokes the current refresh token session and clears the HttpOnly refreshToken cookie.',
  })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refreshToken;
    await this.authService.logout(refreshToken);

    clearRefreshCookie(res, this.configService);

    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Returns profile details, role, administrative permissions, and host profile of the currently authenticated user.',
  })
  @ApiResponse({ status: 200, description: 'Current user profile returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing Bearer token' })
  getProfile(@GetUser() user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      adminRole: user.adminRole || null,
      permissions: getAdminPermissions(user),
      avatar: user.avatar || null,
      createdAt: user.createdAt,
      hostProfile: user.hostProfile || null,
    };
  }
}
