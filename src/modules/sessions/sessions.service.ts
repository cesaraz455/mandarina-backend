import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SessionEntity } from './entities/session.entity';
import {
  SessionsRepository,
  CreateSessionData,
} from './repositories/sessions.repository';

@Injectable()
export class SessionsService {
  constructor(
    private readonly sessionsRepository: SessionsRepository,
    private readonly configService: ConfigService,
  ) {}

  async findById(id: string): Promise<SessionEntity | null> {
    return this.sessionsRepository.findById(id);
  }

  async create(data: CreateSessionData): Promise<SessionEntity> {
    return this.sessionsRepository.create(data);
  }

  async updateRefreshTokenHash(id: string, hash: string): Promise<void> {
    return this.sessionsRepository.updateRefreshTokenHash(id, hash);
  }

  async revoke(id: string): Promise<void> {
    return this.sessionsRepository.revoke(id);
  }

  async revokeAllForUser(userId: string): Promise<void> {
    return this.sessionsRepository.revokeAllForUser(userId);
  }

  getSessionExpiresAt(): Date {
    const days = this.configService.get<number>('session.expiresInDays', 30);
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
}
