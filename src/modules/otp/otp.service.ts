import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpType } from '@prisma/client';
import { OtpRepository } from './repositories/otp.repository';
import { OtpEntity } from './entities/otp.entity';
import { CryptoUtil } from '../../common/utils/crypto.util';
import {
  InvalidOrExpiredOtpException,
  MaxOtpAttemptsException,
} from '../../common/exceptions/auth.exceptions';

@Injectable()
export class OtpService {
  private readonly expiresInMinutes: number;
  private readonly maxAttempts: number;
  private readonly resendCooldownSeconds: number;

  constructor(
    private readonly otpRepository: OtpRepository,
    private readonly configService: ConfigService,
  ) {
    this.expiresInMinutes = this.configService.getOrThrow<number>(
      'otp.expiresInMinutes',
    );
    this.maxAttempts = this.configService.getOrThrow<number>('otp.maxAttempts');
    this.resendCooldownSeconds = this.configService.getOrThrow<number>(
      'otp.resendCooldownSeconds',
    );
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
    const expiresAt = new Date(Date.now() + this.expiresInMinutes * 60 * 1000);

    await this.otpRepository.create({ userId, type, otpHash, expiresAt });

    return otp;
  }

  /**
   * Seconds the user must wait before a new OTP of this type can be issued.
   * Returns 0 when a resend is allowed now (no active code, or cooldown elapsed).
   */
  async getResendCooldownRemaining(
    userId: string,
    type: OtpType,
  ): Promise<number> {
    const latest = await this.otpRepository.findLatestAvailable(userId, type);
    if (!latest) return 0;

    const elapsedMs = Date.now() - latest.createdAt.getTime();
    const remainingMs = this.resendCooldownSeconds * 1000 - elapsedMs;
    return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
  }

  /**
   * Validates an OTP and marks it as used on success (single-use).
   */
  async validateOtp(
    userId: string,
    type: OtpType,
    plainOtp: string,
  ): Promise<void> {
    const otpRecord = await this.assertValidOtp(userId, type, plainOtp);
    await this.otpRepository.markAsUsed(otpRecord.id);
  }

  /**
   * Validates an OTP WITHOUT consuming it, so a later step can still use it
   * (e.g. verifying the reset code before collecting the new password).
   */
  async verifyOtpWithoutConsuming(
    userId: string,
    type: OtpType,
    plainOtp: string,
  ): Promise<void> {
    await this.assertValidOtp(userId, type, plainOtp);
  }

  /**
   * Shared validation: throws on a missing/expired/invalid OTP and increments the
   * attempts counter on a wrong code. Returns the record on success without consuming it.
   */
  private async assertValidOtp(
    userId: string,
    type: OtpType,
    plainOtp: string,
  ): Promise<OtpEntity> {
    const otpRecord = await this.otpRepository.findLatestAvailable(
      userId,
      type,
    );

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

    return otpRecord;
  }
}
