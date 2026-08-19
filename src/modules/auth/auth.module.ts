import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';
import { GoogleStrategy } from './google.strategy';
import { RegisterUseCase } from './sign-up/register.use-case';
import { VerifyEmailUseCase } from './otp-confirmation/verify-email.use-case';
import { LoginUseCase } from './login/login.use-case';
import { LoginByUserIdUseCase } from './login/login-by-user-id.use-case';
import { RefreshTokenUseCase } from './login/refresh-token.use-case';
import { LogoutUseCase } from './login/logout.use-case';
import { ForgotPasswordUseCase } from './forgot-password/forgot-password.use-case';
import { ResetPasswordUseCase } from './new-password/reset-password.use-case';
import { ResendVerificationUseCase } from './resend-verification/resend-verification.use-case';
import { VerifyResetOtpUseCase } from './verify-reset-otp/verify-reset-otp.use-case';
import { GoogleLoginUseCase } from './google-login/google-login.use-case';
import { SessionIssuerService } from './session-issuer.service';
import { UsersModule } from '../users/users.module';
import { SessionsModule } from '../sessions/sessions.module';
import { OtpModule } from '../otp/otp.module';
import { EmailModule } from '../email/email.module';
import { UserAuthAccountsModule } from '../user-auth-accounts/user-auth-accounts.module';
import { CategoriesModule } from '../categories/categories.module';

/**
 * Architecture decision: JwtModule is configured without a default secret here.
 * Each use-case injects ConfigService and passes the appropriate secret per
 * sign/verify call. This allows using different secrets for access vs refresh
 * tokens while still relying on the module for the JwtService instance.
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    UsersModule,
    SessionsModule,
    OtpModule,
    EmailModule,
    UserAuthAccountsModule,
    CategoriesModule,
  ],
  controllers: [AuthController],
  providers: [
    // Strategies
    JwtStrategy,
    JwtRefreshStrategy,
    GoogleStrategy,
    // Facade
    AuthService,
    // Shared helper
    SessionIssuerService,
    // Use Cases
    RegisterUseCase,
    VerifyEmailUseCase,
    LoginUseCase,
    LoginByUserIdUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    ForgotPasswordUseCase,
    ResetPasswordUseCase,
    ResendVerificationUseCase,
    VerifyResetOtpUseCase,
    GoogleLoginUseCase,
  ],
})
export class AuthModule {}
