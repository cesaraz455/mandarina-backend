import { OtpType } from '@prisma/client';

export { OtpType };

export class OtpEntity {
  readonly id: string;
  readonly userId: string;
  readonly type: OtpType;
  readonly otpHash: string;
  readonly attemptsCount: number;
  readonly expiresAt: Date;
  readonly usedAt: Date | null;
  readonly createdAt: Date;

  constructor(data: {
    id: string;
    userId: string;
    type: OtpType;
    otpHash: string;
    attemptsCount: number;
    expiresAt: Date;
    usedAt: Date | null;
    createdAt: Date;
  }) {
    Object.assign(this, data);
  }

  get isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  get isUsed(): boolean {
    return this.usedAt !== null;
  }

  get isAvailable(): boolean {
    return !this.isExpired && !this.isUsed;
  }
}
