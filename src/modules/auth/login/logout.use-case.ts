import { Injectable } from '@nestjs/common';
import { SessionsService } from '../../sessions/sessions.service';

export interface LogoutResult {
  message: string;
}

@Injectable()
export class LogoutUseCase {
  constructor(private readonly sessionsService: SessionsService) {}

  async execute(sessionId: string): Promise<LogoutResult> {
    const session = await this.sessionsService.findById(sessionId);

    // Idempotent: if already revoked or not found, still return success
    if (session && !session.isRevoked) {
      await this.sessionsService.revoke(sessionId);
    }

    return { message: 'Logged out successfully.' };
  }
}
