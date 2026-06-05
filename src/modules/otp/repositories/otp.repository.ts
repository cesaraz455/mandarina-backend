import { Injectable } from '@nestjs/common';
import { OtpType, UserOtp } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { OtpEntity } from '../entities/otp.entity';

export interface CreateOtpData {
  userId: string;
  type: OtpType;
  otpHash: string;
  expiresAt: Date;
}

@Injectable()
export class OtpRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toEntity(otp: UserOtp): OtpEntity {
    return new OtpEntity({
      id: otp.id,
      userId: otp.userId,
      type: otp.type,
      otpHash: otp.otpHash,
      attemptsCount: otp.attemptsCount,
      expiresAt: otp.expiresAt,
      usedAt: otp.usedAt,
      createdAt: otp.createdAt ?? new Date(),
    });
  }

  async create(data: CreateOtpData): Promise<OtpEntity> {
    const otp = await this.prisma.userOtp.create({
      data: {
        userId: data.userId,
        type: data.type,
        otpHash: data.otpHash,
        expiresAt: data.expiresAt,
      },
    });
    return this.toEntity(otp);
  }

  /**
   * Finds the most recent available (not used, not expired) OTP for a user.
   */
  async findLatestAvailable(
    userId: string,
    type: OtpType,
  ): Promise<OtpEntity | null> {
    const otp = await this.prisma.userOtp.findFirst({
      where: {
        userId,
        type,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    return otp ? this.toEntity(otp) : null;
  }

  async incrementAttempts(id: string): Promise<OtpEntity> {
    const otp = await this.prisma.userOtp.update({
      where: { id },
      data: { attemptsCount: { increment: 1 } },
    });
    return this.toEntity(otp);
  }

  async markAsUsed(id: string): Promise<void> {
    await this.prisma.userOtp.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  /**
   * Invalidates all pending OTPs of a given type for a user.
   * Called before creating a new OTP to prevent OTP farming.
   */
  async invalidatePending(userId: string, type: OtpType): Promise<void> {
    await this.prisma.userOtp.updateMany({
      where: {
        userId,
        type,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });
  }
}
