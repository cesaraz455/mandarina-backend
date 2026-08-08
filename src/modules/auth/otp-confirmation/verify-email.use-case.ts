import { Injectable } from '@nestjs/common';
import { OtpType } from '@prisma/client';
import { VerifyEmailDto } from './verify-email.dto';
import { UsersService } from '../../users/users.service';
import { OtpService } from '../../otp/otp.service';
import { InvalidOrExpiredOtpException } from '../../../common/exceptions/auth.exceptions';

export interface VerifyEmailResult {
  message: string;
  // Present only when this call just verified the email (not when it was
  // already verified beforehand). The controller uses it to trigger a
  // separate auto-login step; it is not this use case's responsibility.
  userId?: string;
}

@Injectable()
export class VerifyEmailUseCase {
  constructor(
    private readonly usersService: UsersService,
    private readonly otpService: OtpService,
  ) {}

  async execute(dto: VerifyEmailDto): Promise<VerifyEmailResult> {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      // Throw the same exception as an invalid OTP to prevent user enumeration
      throw new InvalidOrExpiredOtpException();
    }

    if (user.isEmailVerified) {
      // No OTP is checked on this branch (the original one may already be used
      // or expired), so we must not report a fresh verification here: that
      // would let the controller auto-login anyone who posts an already
      // verified email with a throwaway OTP. The client falls back to a
      // normal login for this case.
      return { message: 'Email is already verified.' };
    }

    // Validates OTP, increments attempts on failure, marks as used on success
    await this.otpService.validateOtp(
      user.id,
      OtpType.EMAIL_VERIFICATION,
      dto.otp,
    );

    const verifiedUser = await this.usersService.update(user.id, {
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    });

    return {
      message: 'Email verified successfully.',
      userId: verifiedUser.id,
    };
  }
}
