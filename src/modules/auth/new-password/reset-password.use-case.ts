import { Injectable } from '@nestjs/common';
import { OtpType } from '@prisma/client';
import { ResetPasswordDto } from './reset-password.dto';
import { UsersService } from '../../users/users.service';
import { OtpService } from '../../otp/otp.service';
import { SessionsService } from '../../sessions/sessions.service';
import { CryptoUtil } from '../../../common/utils/crypto.util';
import { InvalidOrExpiredOtpException } from '../../../common/exceptions/auth.exceptions';

export interface ResetPasswordResult {
  message: string;
}

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    private readonly usersService: UsersService,
    private readonly otpService: OtpService,
    private readonly sessionsService: SessionsService,
  ) {}

  async execute(dto: ResetPasswordDto): Promise<ResetPasswordResult> {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      // Prevent enumeration: throw same OTP exception
      throw new InvalidOrExpiredOtpException();
    }

    // Validate OTP (marks as used on success, increments attempts on failure)
    await this.otpService.validateOtp(user.id, OtpType.PASSWORD_RESET, dto.otp);

    // Update password
    const passwordHash = await CryptoUtil.hashPassword(dto.newPassword);
    await this.usersService.update(user.id, { passwordHash });

    // Invalidate all active sessions to force re-authentication with new password
    await this.sessionsService.revokeAllForUser(user.id);

    return {
      message:
        'Password reset successfully. Please log in with your new password.',
    };
  }
}
