import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import {
  JwtRefreshStrategy,
  refreshTokenCookieExtractor,
} from './jwt-refresh.strategy';
import { REFRESH_COOKIE_NAME } from './refresh-cookie.util';
import { JwtRefreshPayload } from './jwt-payload.interface';

describe('refreshTokenCookieExtractor', () => {
  it('reads the refresh token from the cookie', () => {
    const req = {
      cookies: { [REFRESH_COOKIE_NAME]: 'tok' },
    } as unknown as Request;
    expect(refreshTokenCookieExtractor(req)).toBe('tok');
  });

  it('returns null when the cookie is absent', () => {
    expect(
      refreshTokenCookieExtractor({ cookies: {} } as unknown as Request),
    ).toBeNull();
    expect(refreshTokenCookieExtractor({} as unknown as Request)).toBeNull();
  });
});

describe('JwtRefreshStrategy.validate', () => {
  it('attaches the raw token read from the cookie to the payload', () => {
    const configService = {
      getOrThrow: () => 'a'.repeat(32),
    } as unknown as ConfigService;
    const strategy = new JwtRefreshStrategy(configService);

    const req = {
      cookies: { [REFRESH_COOKIE_NAME]: 'tok' },
    } as unknown as Request;
    const payload: JwtRefreshPayload = { sub: 'u1', sid: 's1' };

    expect(strategy.validate(req, payload)).toEqual({
      sub: 'u1',
      sid: 's1',
      rawToken: 'tok',
    });
  });
});
