import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpType } from '@prisma/client';
import { OtpEntity } from './entities/otp.entity';
import { OtpRepository } from './repositories/otp.repository';
import { CryptoUtil } from '../../common/utils/crypto.util';
import {
  InvalidOrExpiredOtpException,
  MaxOtpAttemptsException,
} from '../../common/exceptions/auth.exceptions';

@Injectable()
export class OtpService {
  private readonly expiresInMinutes: number;
  private readonly maxAttempts: number;

  constructor(
    private readonly otpRepository: OtpRepository,
    private readonly configService: ConfigService,
  ) {
    this.expiresInMinutes = this.configService.get<number>(
      'otp.expiresInMinutes',
      10,
    );
    this.maxAttempts = this.configService.get<number>('otp.maxAttempts', 3);
  }

  /**
   * Creates a new OTP for the given user and type.
   * Invalidates any pending OTPs of the same type first.
   * Returns the plain-text OTP (to be sent to the user).
   */
  async createOtp(userId: string, type: OtpType): Promise<string> {
    await this.otpRepository.invalidatePending(userId, type);

    const otp = CryptoUtil.generateOtp();
    const otpHash = await CryptoUtil.hashOtp(otp);
    const expiresAt = new Date(
      Date.now() + this.expiresInMinutes * 60 * 1000,
    );

    await this.otpRepository.create({ userId, type, otpHash, expiresAt });

    return otp;
  }

  /**
   * Validates an OTP. Throws descriptive exceptions on failure.
   * Marks the OTP as used on success.
   */
  async validateOtp(
    userId: string,
    type: OtpType,
    plainOtp: string,
  ): Promise<void> {
    const otpRecord = await this.otpRepository.findLatestAvailable(userId, type);

    if (!otpRecord) {
      throw new InvalidOrExpiredOtpException();
    }

    // Check max attempts BEFORE verifying to prevent timing attacks leaking count
    if (otpRecord.attemptsCount >= this.maxAttempts) {
      throw new MaxOtpAttemptsException();
    }

    const isValid = await CryptoUtil.compareOtp(plainOtp, otpRecord.otpHash);

    if (!isValid) {
      const updated = await this.otpRepository.incrementAttempts(otpRecord.id);

      if (updated.attemptsCount >= this.maxAttempts) {
        throw new MaxOtpAttemptsException();
      }

      throw new InvalidOrExpiredOtpException();
    }

    await this.otpRepository.markAsUsed(otpRecord.id);
  }
}
