import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { JwtRefreshPayload } from './jwt-payload.interface';

/**
 * JWT strategy for refresh token validation.
 *
 * Architecture decision: The refresh token is sent in the request body
 * (not as a bearer header) to prevent it from being inadvertently logged
 * by proxies or API gateways that typically log Authorization headers.
 *
 * The raw token is passed through via `passReqToCallback` so the
 * RefreshTokenUseCase can verify the stored hash.
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.refreshSecret'),
      passReqToCallback: true,
    });
  }

  validate(
    req: Request,
    payload: JwtRefreshPayload,
  ): JwtRefreshPayload & { rawToken: string } {
    const rawToken = (req.body as { refreshToken?: string }).refreshToken ?? '';
    return { ...payload, rawToken };
  }
}
