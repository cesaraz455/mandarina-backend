import { Injectable } from '@nestjs/common';
import { OtpType } from '@prisma/client';
import { VerifyEmailDto } from './verify-email.dto';
import { UsersService } from '../../users/users.service';
import { OtpService } from '../../otp/otp.service';
import { InvalidOrExpiredOtpException } from '../../../common/exceptions/auth.exceptions';

export interface VerifyEmailResult {
  message: string;
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
      return { message: 'Email is already verified.' };
    }

    // Validates OTP, increments attempts on failure, marks as used on success
    await this.otpService.validateOtp(
      user.id,
      OtpType.EMAIL_VERIFICATION,
      dto.otp,
    );

    // Mark user as verified
    await this.usersService.update(user.id, {
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    });

    return { message: 'Email verified successfully. You can now log in.' };
  }
}
