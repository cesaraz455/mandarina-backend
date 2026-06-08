import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OtpType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { LoginDto } from './login.dto';
import { UsersService } from '../../users/users.service';
import { SessionsService } from '../../sessions/sessions.service';
import { OtpService } from '../../otp/otp.service';
import { EmailService } from '../../email/email.service';
import { CryptoUtil } from '../../../common/utils/crypto.util';
import { PublicUserProfile } from '../../users/entities/user.entity';
import {
  AccountNotActiveException,
  EmailNotVerifiedException,
  InvalidCredentialsException,
} from '../../../common/exceptions/auth.exceptions';

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: PublicUserProfile;
}

@Injectable()
export class LoginUseCase {
  private readonly logger = new Logger(LoginUseCase.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
    private readonly otpService: OtpService,
    private readonly emailService: EmailService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async execute(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<LoginResult> {
    // 1. Resolve user — use identical exception for missing/wrong password (no enumeration)
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new InvalidCredentialsException();
    }

    // 2. Verify password — run even if no hash to keep constant-time behaviour
    if (!user.passwordHash) {
      // OAuth-only account — no local password
      throw new InvalidCredentialsException();
    }

    const passwordValid = await CryptoUtil.comparePassword(
      dto.password,
      user.passwordHash,
    );
    if (!passwordValid) {
      throw new InvalidCredentialsException();
    }

    // 3. Account status checks (after password validation to prevent enumeration)
    if (!user.isActive) {
      throw new AccountNotActiveException();
    }

    if (!user.isEmailVerified) {
      const otp = await this.otpService.createOtp(user.id, OtpType.EMAIL_VERIFICATION);
      try {
        await this.emailService.sendEmailVerification(user.email, otp);
      } catch (error) {
        this.logger.error(`Failed to send verification email to ${user.email}`, error);
      }
      throw new EmailNotVerifiedException();
    }

    // 4. Pre-generate sessionId so it can be embedded in both tokens
    const sessionId = uuidv4();
    const expiresAt = this.sessionsService.getSessionExpiresAt();

    // 5. Generate tokens
    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, sid: sessionId },
      {
        secret: this.configService.getOrThrow<string>('jwt.accessSecret'),
        expiresIn: this.configService.get<string>('jwt.accessExpiresIn', '15m'),
      },
    );

    const refreshToken = this.jwtService.sign(
      { sub: user.id, sid: sessionId },
      {
        secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('jwt.refreshExpiresIn', '30d'),
      },
    );

    // 6. Persist session with pre-generated ID and hashed refresh token
    const refreshTokenHash = CryptoUtil.hashToken(refreshToken);

    await this.sessionsService.create({
      id: sessionId,
      userId: user.id,
      refreshTokenHash,
      ipAddress,
      userAgent,
      expiresAt,
    });

    // 7. Track last login (fire-and-forget — non-critical)
    await this.usersService.update(user.id, { lastLoginAt: new Date() });

    return {
      accessToken,
      refreshToken,
      user: user.toPublicProfile(),
    };
  }
}
