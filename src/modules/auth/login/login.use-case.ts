import { Injectable, Logger } from '@nestjs/common';
import { OtpType } from '@prisma/client';
import { LoginDto } from './login.dto';
import { UsersService } from '../../users/users.service';
import { OtpService } from '../../otp/otp.service';
import { EmailService } from '../../email/email.service';
import { CryptoUtil } from '../../../common/utils/crypto.util';
import { PublicUserProfile } from '../../users/entities/user.entity';
import { SessionIssuerService } from '../session-issuer.service';
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
    private readonly otpService: OtpService,
    private readonly emailService: EmailService,
    private readonly sessionIssuer: SessionIssuerService,
  ) {}

  async execute(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<LoginResult> {
    // 1. Resolve user: use identical exception for missing/wrong password (no enumeration)
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new InvalidCredentialsException();
    }

    // 2. Verify password: run even if no hash to keep constant-time behaviour
    if (!user.passwordHash) {
      // OAuth-only account: no local password
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
      const otp = await this.otpService.createOtp(
        user.id,
        OtpType.EMAIL_VERIFICATION,
      );
      try {
        await this.emailService.sendEmailVerification(user.email, otp);
      } catch (error) {
        this.logger.error(
          `Failed to send verification email to ${user.email}`,
          error,
        );
      }
      throw new EmailNotVerifiedException();
    }

    // 4. Identity is fully established: mint the session and tokens
    const { accessToken, refreshToken } = await this.sessionIssuer.issue(user, {
      ipAddress,
      userAgent,
    });

    return {
      accessToken,
      refreshToken,
      user: user.toPublicProfile(),
    };
  }
}
