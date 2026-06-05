import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { SessionsService } from '../../sessions/sessions.service';
import { UsersService } from '../../users/users.service';
import { CryptoUtil } from '../../../common/utils/crypto.util';
import { AuthTokens } from '../interfaces/auth-tokens.interface';
import {
  InvalidRefreshTokenException,
  SessionExpiredException,
  SessionRevokedException,
  AccountNotActiveException,
} from '../../../common/exceptions/auth.exceptions';

interface RefreshTokenInput {
  userId: string;
  sessionId: string;
  rawRefreshToken: string;
}

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async execute(input: RefreshTokenInput): Promise<AuthTokens> {
    const { userId, sessionId, rawRefreshToken } = input;

    // 1. Fetch the session
    const session = await this.sessionsService.findById(sessionId);

    if (!session) {
      throw new InvalidRefreshTokenException();
    }

    if (session.isRevoked) {
      // Possible token reuse attack — revoke all sessions for this user
      await this.sessionsService.revokeAllForUser(userId);
      throw new SessionRevokedException();
    }

    if (session.isExpired) {
      await this.sessionsService.revoke(sessionId);
      throw new SessionExpiredException();
    }

    // 2. Verify token hash matches what's stored
    const incomingHash = CryptoUtil.hashToken(rawRefreshToken);
    if (incomingHash !== session.refreshTokenHash) {
      // Token mismatch — possible reuse of rotated token; revoke all
      await this.sessionsService.revokeAllForUser(userId);
      throw new InvalidRefreshTokenException();
    }

    // 3. Ensure user is still active
    const user = await this.usersService.findById(userId);
    if (!user.isActive) {
      throw new AccountNotActiveException();
    }

    // 4. Revoke old session
    await this.sessionsService.revoke(sessionId);

    // 5. Issue new tokens with a new sessionId (rotation)
    const newSessionId = uuidv4();
    const expiresAt = this.sessionsService.getSessionExpiresAt();

    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, sid: newSessionId },
      {
        secret: this.configService.getOrThrow<string>('jwt.accessSecret'),
        expiresIn: this.configService.get<string>('jwt.accessExpiresIn', '15m'),
      },
    );

    const refreshToken = this.jwtService.sign(
      { sub: user.id, sid: newSessionId },
      {
        secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('jwt.refreshExpiresIn', '30d'),
      },
    );

    const newRefreshTokenHash = CryptoUtil.hashToken(refreshToken);

    await this.sessionsService.create({
      id: newSessionId,
      userId: user.id,
      refreshTokenHash: newRefreshTokenHash,
      ipAddress: session.ipAddress ?? undefined,
      userAgent: session.userAgent ?? undefined,
      expiresAt,
    });

    return { accessToken, refreshToken };
  }
}
