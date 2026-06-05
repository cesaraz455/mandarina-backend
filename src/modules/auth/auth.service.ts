import { Injectable } from '@nestjs/common';
import { RegisterUseCase } from './use-cases/register.use-case';
import { VerifyEmailUseCase } from './use-cases/verify-email.use-case';
import { LoginUseCase } from './use-cases/login.use-case';
import { RefreshTokenUseCase } from './use-cases/refresh-token.use-case';
import { LogoutUseCase } from './use-cases/logout.use-case';
import { ForgotPasswordUseCase } from './use-cases/forgot-password.use-case';
import { ResetPasswordUseCase } from './use-cases/reset-password.use-case';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

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
}
