export class SessionEntity {
  readonly id: string;
  readonly userId: string;
  readonly refreshTokenHash: string;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  readonly isRevoked: boolean;
  readonly revokedAt: Date | null;
  readonly expiresAt: Date;
  readonly createdAt: Date;

  constructor(data: {
    id: string;
    userId: string;
    refreshTokenHash: string;
    ipAddress: string | null;
    userAgent: string | null;
    isRevoked: boolean;
    revokedAt: Date | null;
    expiresAt: Date;
    createdAt: Date;
  }) {
    Object.assign(this, data);
  }

  get isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  get isValid(): boolean {
    return !this.isRevoked && !this.isExpired;
  }
}
