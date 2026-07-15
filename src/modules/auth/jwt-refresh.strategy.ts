import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, JwtFromRequestFunction } from 'passport-jwt';
import { Request } from 'express';
import { JwtRefreshPayload } from './jwt-payload.interface';
import { REFRESH_COOKIE_NAME } from './refresh-cookie.util';

/**
 * JWT strategy for refresh token validation.
 *
 * Architecture decision: the refresh token is read from an httpOnly cookie set at
 * login/refresh. This keeps it invisible to JavaScript (immune to XSS exfiltration)
 * and out of the Authorization header (which proxies and gateways tend to log).
 *
 * The raw token is passed through via `passReqToCallback` so the RefreshTokenUseCase
 * can verify it against the stored hash.
 */
export const refreshTokenCookieExtractor: JwtFromRequestFunction = (
  req: Request,
): string | null => {
  const cookies = (req as Request & { cookies?: Record<string, string> })
    .cookies;
  return cookies?.[REFRESH_COOKIE_NAME] ?? null;
};

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([refreshTokenCookieExtractor]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.refreshSecret'),
      passReqToCallback: true,
    });
  }

  validate(
    req: Request,
    payload: JwtRefreshPayload,
  ): JwtRefreshPayload & { rawToken: string } {
    const rawToken = refreshTokenCookieExtractor(req) ?? '';
    return { ...payload, rawToken };
  }
}
