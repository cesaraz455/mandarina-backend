import { Injectable, Logger } from '@nestjs/common';
import { OtpType } from '@prisma/client';
import { ResendVerificationDto } from './resend-verification.dto';
import { UsersService } from '../../users/users.service';
import { OtpService } from '../../otp/otp.service';
import { EmailService } from '../../email/email.service';
import { PendingOtpException } from '../../../common/exceptions/auth.exceptions';

@Injectable()
export class ResendVerificationUseCase {
  private readonly logger = new Logger(ResendVerificationUseCase.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly otpService: OtpService,
    private readonly emailService: EmailService,
  ) {}

  async execute(dto: ResendVerificationDto): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(dto.email);

    // Always return the same message regardless of whether the user exists
    // to prevent email enumeration
    if (!user || user.isEmailVerified) {
      return { message: 'If this email is registered and unverified, a new code has been sent.' };
    }

    const hasPending = await this.otpService.hasPendingOtp(user.id, OtpType.EMAIL_VERIFICATION);
    if (hasPending) {
      throw new PendingOtpException();
    }

    const otp = await this.otpService.createOtp(user.id, OtpType.EMAIL_VERIFICATION);

    try {
      await this.emailService.sendEmailVerification(user.email, otp);
    } catch (error) {
      this.logger.error(`Failed to resend verification email to ${user.email}`, error);
    }

    return { message: 'If this email is registered and unverified, a new code has been sent.' };
  }
}
