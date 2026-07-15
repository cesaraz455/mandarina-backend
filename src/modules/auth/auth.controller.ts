import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './sign-up/register.dto';
import { LoginDto } from './login/login.dto';
import { VerifyEmailDto } from './otp-confirmation/verify-email.dto';
import { ForgotPasswordDto } from './forgot-password/forgot-password.dto';
import { ResetPasswordDto } from './new-password/reset-password.dto';
import { ResendVerificationDto } from './resend-verification/resend-verification.dto';
import { VerifyResetOtpDto } from './verify-reset-otp/verify-reset-otp.dto';
import {
  AuthResponseDto,
  MessageResponseDto,
  TokensResponseDto,
  UserProfileDto,
} from './auth-response.dto';
import {
  REFRESH_COOKIE_NAME,
  clearRefreshCookieOptions,
  refreshCookieOptions,
} from './refresh-cookie.util';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAccessPayload, JwtRefreshPayload } from './jwt-payload.interface';
import { UsersService } from '../users/users.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  private isProduction(): boolean {
    return this.configService.get<string>('nodeEnv') === 'production';
  }

  /** Sets the rotating refresh token as an httpOnly cookie (the only place it lives on web). */
  private setRefreshCookie(
    res: Response,
    refreshToken: string,
    rememberMe: boolean,
  ): void {
    const days = this.configService.get<number>('session.expiresInDays', 30);
    res.cookie(
      REFRESH_COOKIE_NAME,
      refreshToken,
      refreshCookieOptions(this.isProduction(), days, rememberMe),
    );
  }

  // ─── Register ────────────────────────────────────────────────────────────────

  @Public()
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user account',
    description:
      'Creates the account and sends a 6-digit OTP to the given email for verification. ' +
      'If email delivery fails the account is still created (best-effort email); the client ' +
      'should fall back to POST /auth/resend-verification. Rate limit: 5 requests/min.',
  })
  @ApiResponse({ status: 201, type: MessageResponseDto })
  @ApiResponse({ status: 400, description: 'DTO validation failed' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  register(@Body() dto: RegisterDto): Promise<MessageResponseDto> {
    return this.authService.register(dto);
  }

  // ─── Verify Email ─────────────────────────────────────────────────────────

  @Public()
  @Post('verify-email')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify email address with OTP',
    description:
      'Confirms the OTP sent during registration or resend-verification and activates ' +
      'the account. Rate limit: 10 requests/min.',
  })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({
    status: 400,
    description:
      'OTP is invalid, expired, or the maximum number of attempts was exceeded',
  })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  verifyEmail(@Body() dto: VerifyEmailDto): Promise<MessageResponseDto> {
    return this.authService.verifyEmail(dto);
  }

  // ─── Login ────────────────────────────────────────────────────────────────

  @Public()
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login with email and password',
    description:
      'Creates a session tracked by IP and user agent. The access token is returned in the ' +
      'response body (15 min lifetime); the refresh token is set as an httpOnly, ' +
      'sameSite=strict cookie scoped to /api/v1/auth (30 day lifetime, session-only unless ' +
      '"rememberMe" is true) and never appears in the body. Rate limit: 5 requests/min.',
  })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 400, description: 'DTO validation failed' })
  @ApiResponse({
    status: 401,
    description:
      'Email or password is incorrect. Message is intentionally generic to prevent user enumeration.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Credentials are valid but access is blocked: email not verified ' +
      '(includes "code": "EMAIL_NOT_VERIFIED" so the client can prompt for OTP) ' +
      'or the account has been deactivated.',
  })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string | undefined) ??
      req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const result = await this.authService.login(dto, ipAddress, userAgent);
    this.setRefreshCookie(res, result.refreshToken, dto.rememberMe ?? false);
    return {
      accessToken: result.accessToken,
      user: result.user,
    } as AuthResponseDto;
  }

  // ─── Refresh Token ────────────────────────────────────────────────────────

  @Public()
  @Post('refresh')
  @UseGuards(AuthGuard('jwt-refresh'))
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotate access and refresh tokens',
    description:
      'Reads the refresh token from the httpOnly cookie (not from the body or an ' +
      'Authorization header). The old refresh token is invalidated immediately (rotation) ' +
      'and the new one is written back to the same cookie; only the new access token is ' +
      'returned in the body. Rate limit: 10 requests/min.',
  })
  @ApiResponse({ status: 200, type: TokensResponseDto })
  @ApiResponse({
    status: 401,
    description:
      'The refresh cookie is missing, the token is invalid/expired, or the session has been revoked',
  })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async refresh(
    @Req() req: Request & { user: JwtRefreshPayload & { rawToken: string } },
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokensResponseDto> {
    const tokens = await this.authService.refreshToken({
      userId: req.user.sub,
      sessionId: req.user.sid,
      rawRefreshToken: req.user.rawToken,
    });
    // On rotation we keep the cookie persistent for the remaining session lifetime.
    this.setRefreshCookie(res, tokens.refreshToken, true);
    return { accessToken: tokens.accessToken };
  }

  // ─── Logout ───────────────────────────────────────────────────────────────

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Revoke the current session',
    description:
      'The session is identified from the access token used to authenticate this request. ' +
      'Revokes the refresh token server-side and clears the refresh cookie.',
  })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  async logout(
    @CurrentUser() user: JwtAccessPayload,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MessageResponseDto> {
    const result = await this.authService.logout(user.sid);
    res.clearCookie(
      REFRESH_COOKIE_NAME,
      clearRefreshCookieOptions(this.isProduction()),
    );
    return result;
  }

  // ─── Forgot Password ──────────────────────────────────────────────────────

  @Public()
  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request a password reset OTP',
    description:
      'Always returns 200 regardless of whether the email exists, to prevent user ' +
      'enumeration attacks. Rate limit: 3 requests/min.',
  })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({ status: 400, description: 'DTO validation failed' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  forgotPassword(@Body() dto: ForgotPasswordDto): Promise<MessageResponseDto> {
    return this.authService.forgotPassword(dto);
  }

  // ─── Reset Password ───────────────────────────────────────────────────────

  @Public()
  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password using OTP',
    description:
      'Sets a new password using the OTP obtained from /auth/forgot-password. On success, ' +
      'all active sessions for the user are invalidated, requiring a fresh login. ' +
      'Rate limit: 5 requests/min.',
  })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({
    status: 400,
    description:
      'OTP is invalid, expired, or the maximum number of attempts was exceeded',
  })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  resetPassword(@Body() dto: ResetPasswordDto): Promise<MessageResponseDto> {
    return this.authService.resetPassword(dto);
  }

  // ─── Verify Reset OTP ─────────────────────────────────────────────────────

  @Public()
  @Post('verify-reset-otp')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify a password reset OTP without consuming it',
    description:
      'Validates the reset code so the client can proceed to the new-password step. ' +
      'The code is not consumed and stays valid for the subsequent reset-password call. ' +
      'Rate limit: 10 requests/min.',
  })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({
    status: 400,
    description:
      'OTP is invalid, expired, or the maximum number of attempts was exceeded',
  })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  verifyResetOtp(@Body() dto: VerifyResetOtpDto): Promise<MessageResponseDto> {
    return this.authService.verifyResetOtp(dto);
  }

  // ─── Resend Verification ─────────────────────────────────────────────────

  @Public()
  @Post('resend-verification')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend email verification OTP',
    description:
      'Only allowed once the current OTP has expired or does not exist; sending a new one ' +
      'invalidates the previous code. Rate limit: 3 requests/min.',
  })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({
    status: 400,
    description:
      'A valid OTP is still active; the client must wait for it to expire before requesting another',
  })
  @ApiResponse({
    status: 404,
    description: 'No account found for the given email',
  })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  resendVerification(
    @Body() dto: ResendVerificationDto,
  ): Promise<MessageResponseDto> {
    return this.authService.resendVerification(dto);
  }

  // ─── Me ───────────────────────────────────────────────────────────────────

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, type: UserProfileDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async me(@CurrentUser() user: JwtAccessPayload): Promise<UserProfileDto> {
    return this.usersService.getProfile(user.sub) as Promise<UserProfileDto>;
  }
}
