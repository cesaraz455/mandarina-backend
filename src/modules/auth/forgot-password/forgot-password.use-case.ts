import { Injectable, Logger } from '@nestjs/common';
import { OtpType } from '@prisma/client';
import { ForgotPasswordDto } from './forgot-password.dto';
import { UsersService } from '../../users/users.service';
import { OtpService } from '../../otp/otp.service';
import { EmailService } from '../../email/email.service';

export interface ForgotPasswordResult {
  message: string;
}

/**
 * Architecture decision: We return the same message regardless of whether the
 * email exists in our system. This prevents user enumeration attacks where an
 * attacker could determine which emails are registered.
 */
@Injectable()
export class ForgotPasswordUseCase {
  private readonly logger = new Logger(ForgotPasswordUseCase.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly otpService: OtpService,
    private readonly emailService: EmailService,
  ) {}

  async execute(dto: ForgotPasswordDto): Promise<ForgotPasswordResult> {
    const GENERIC_MESSAGE =
      'If an account with that email exists, you will receive a password reset code shortly.';

    const user = await this.usersService.findByEmail(dto.email);

    if (!user || !user.isActive) {
      // Return generic message to prevent enumeration
      return { message: GENERIC_MESSAGE };
    }

    try {
      const otp = await this.otpService.createOtp(
        user.id,
        OtpType.PASSWORD_RESET,
      );
      await this.emailService.sendPasswordReset(user.email, otp);
    } catch (error) {
      this.logger.error(
        `Failed to process password reset for email ${user.email}`,
        error,
      );
    }

    return { message: GENERIC_MESSAGE };
  }
}
