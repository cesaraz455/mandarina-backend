import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { SessionsService } from '../sessions/sessions.service';
import { UsersService } from '../users/users.service';
import { CryptoUtil } from '../../common/utils/crypto.util';
import { UserEntity } from '../users/entities/user.entity';
import { AuthTokens } from './auth-tokens.interface';

export interface IssueSessionContext {
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Shared by login, login-by-user-id, and google-login: mints a fresh sid +
 * access/refresh token pair for an already-resolved, already-authorized user,
 * persists the session, and stamps lastLoginAt. Callers own any credential or
 * identity checks; this service assumes the user is already vouched for.
 */
@Injectable()
export class SessionIssuerService {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async issue(
    user: UserEntity,
    ctx: IssueSessionContext = {},
  ): Promise<AuthTokens> {
    const sessionId = uuidv4();
    const expiresAt = this.sessionsService.getSessionExpiresAt();

    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, sid: sessionId },
      {
        secret: this.configService.getOrThrow<string>('jwt.accessSecret'),
        expiresIn: this.configService.get<string>('jwt.accessExpiresIn', '15m'),
      },
    );

    const refreshToken = this.jwtService.sign(
      { sub: user.id, sid: sessionId },
      {
        secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>(
          'jwt.refreshExpiresIn',
          '30d',
        ),
      },
    );

    const refreshTokenHash = CryptoUtil.hashToken(refreshToken);

    await this.sessionsService.create({
      id: sessionId,
      userId: user.id,
      refreshTokenHash,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      expiresAt,
    });

    await this.usersService.update(user.id, { lastLoginAt: new Date() });

    return { accessToken, refreshToken };
  }
}
