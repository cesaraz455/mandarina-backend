import { Injectable } from '@nestjs/common';
import { RegisterUseCase } from './sign-up/register.use-case';
import { VerifyEmailUseCase } from './otp-confirmation/verify-email.use-case';
import { LoginUseCase } from './login/login.use-case';
import { RefreshTokenUseCase } from './login/refresh-token.use-case';
import { LogoutUseCase } from './login/logout.use-case';
import { ForgotPasswordUseCase } from './forgot-password/forgot-password.use-case';
import { ResetPasswordUseCase } from './new-password/reset-password.use-case';
import { ResendVerificationUseCase } from './resend-verification/resend-verification.use-case';
import { RegisterDto } from './sign-up/register.dto';
import { LoginDto } from './login/login.dto';
import { VerifyEmailDto } from './otp-confirmation/verify-email.dto';
import { ForgotPasswordDto } from './forgot-password/forgot-password.dto';
import { ResetPasswordDto } from './new-password/reset-password.dto';
import { ResendVerificationDto } from './resend-verification/resend-verification.dto';

/**
 * AuthService acts as a facade over the use-case layer.
 *
 * Architecture decision: The controller talks only to AuthService, not to
 * individual use cases. This keeps the controller thin and makes it easy to
 * compose or reorder logic without changing the HTTP layer.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly resendVerificationUseCase: ResendVerificationUseCase,
  ) {}

  register(dto: RegisterDto) {
    return this.registerUseCase.execute(dto);
  }

  verifyEmail(dto: VerifyEmailDto) {
    return this.verifyEmailUseCase.execute(dto);
  }

  login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    return this.loginUseCase.execute(dto, ipAddress, userAgent);
  }

  refreshToken(input: {
    userId: string;
    sessionId: string;
    rawRefreshToken: string;
  }) {
    return this.refreshTokenUseCase.execute(input);
  }

  logout(sessionId: string) {
    return this.logoutUseCase.execute(sessionId);
  }

  forgotPassword(dto: ForgotPasswordDto) {
    return this.forgotPasswordUseCase.execute(dto);
  }

  resetPassword(dto: ResetPasswordDto) {
    return this.resetPasswordUseCase.execute(dto);
  }

  resendVerification(dto: ResendVerificationDto) {
    return this.resendVerificationUseCase.execute(dto);
  }
}
