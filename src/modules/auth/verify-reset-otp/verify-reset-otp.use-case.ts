import { Injectable } from '@nestjs/common';
import { OtpType } from '@prisma/client';
import { VerifyResetOtpDto } from './verify-reset-otp.dto';
import { UsersService } from '../../users/users.service';
import { OtpService } from '../../otp/otp.service';
import { InvalidOrExpiredOtpException } from '../../../common/exceptions/auth.exceptions';

export interface VerifyResetOtpResult {
  message: string;
}

@Injectable()
export class VerifyResetOtpUseCase {
  constructor(
    private readonly usersService: UsersService,
    private readonly otpService: OtpService,
  ) {}

  async execute(dto: VerifyResetOtpDto): Promise<VerifyResetOtpResult> {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      // Throw the same exception as an invalid OTP to prevent user enumeration
      throw new InvalidOrExpiredOtpException();
    }

    // Validates the reset OTP WITHOUT consuming it, so the subsequent reset-password
    // call can still use it. Increments attempts on failure.
    await this.otpService.verifyOtpWithoutConsuming(
      user.id,
      OtpType.PASSWORD_RESET,
      dto.otp,
    );

    return { message: 'Code verified. You can now set a new password.' };
  }
}
