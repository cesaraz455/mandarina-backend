import { Injectable } from '@nestjs/common';
import { UserSession } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { SessionEntity } from '../entities/session.entity';

export interface CreateSessionData {
  id?: string;
  userId: string;
  refreshTokenHash: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
}

@Injectable()
export class SessionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toEntity(session: UserSession): SessionEntity {
    return new SessionEntity({
      id: session.id,
      userId: session.userId,
      refreshTokenHash: session.refreshTokenHash,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      isRevoked: session.isRevoked,
      revokedAt: session.revokedAt,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
    });
  }

  async findById(id: string): Promise<SessionEntity | null> {
    const session = await this.prisma.userSession.findUnique({ where: { id } });
    return session ? this.toEntity(session) : null;
  }

  async create(data: CreateSessionData): Promise<SessionEntity> {
    const session = await this.prisma.userSession.create({
      data: {
        ...(data.id ? { id: data.id } : {}),
        userId: data.userId,
        refreshTokenHash: data.refreshTokenHash,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        expiresAt: data.expiresAt,
      },
    });
    return this.toEntity(session);
  }

  async updateRefreshTokenHash(id: string, refreshTokenHash: string): Promise<void> {
    await this.prisma.userSession.update({
      where: { id },
      data: { refreshTokenHash },
    });
  }

  async revoke(id: string): Promise<void> {
    await this.prisma.userSession.update({
      where: { id },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: { userId, isRevoked: false },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });
  }

  async countActiveForUser(userId: string): Promise<number> {
    return this.prisma.userSession.count({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
    });
  }
}
