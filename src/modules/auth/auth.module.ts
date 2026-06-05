import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { RegisterUseCase } from './use-cases/register.use-case';
import { VerifyEmailUseCase } from './use-cases/verify-email.use-case';
import { LoginUseCase } from './use-cases/login.use-case';
import { RefreshTokenUseCase } from './use-cases/refresh-token.use-case';
import { LogoutUseCase } from './use-cases/logout.use-case';
import { ForgotPasswordUseCase } from './use-cases/forgot-password.use-case';
import { ResetPasswordUseCase } from './use-cases/reset-password.use-case';
import { UsersModule } from '../users/users.module';
import { SessionsModule } from '../sessions/sessions.module';
import { OtpModule } from '../otp/otp.module';
import { EmailModule } from '../email/email.module';

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
  ],
  controllers: [AuthController],
  providers: [
    // Strategies
    JwtStrategy,
    JwtRefreshStrategy,
    // Facade
    AuthService,
    // Use Cases
    RegisterUseCase,
    VerifyEmailUseCase,
    LoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    ForgotPasswordUseCase,
    ResetPasswordUseCase,
  ],
})
export class AuthModule {}
