import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { REFRESH_COOKIE_NAME } from './refresh-cookie.util';
import { JwtAccessPayload, JwtRefreshPayload } from './jwt-payload.interface';
import { LoginDto } from './login/login.dto';

type MockedRes = Response & { cookie: jest.Mock; clearCookie: jest.Mock };

const buildRes = (): MockedRes =>
  ({ cookie: jest.fn(), clearCookie: jest.fn() }) as unknown as MockedRes;

const fakeUser = {
  id: 'u1',
  email: 'a@b.com',
  firstName: null,
  lastName: null,
  profilePictureUrl: null,
  isEmailVerified: true,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('AuthController (cookie-based auth)', () => {
  let controller: AuthController;
  let authService: {
    login: jest.Mock;
    refreshToken: jest.Mock;
    logout: jest.Mock;
  };

  beforeEach(() => {
    authService = {
      login: jest.fn(),
      refreshToken: jest.fn(),
      logout: jest.fn(),
    };
    const configService = {
      get: jest.fn((key: string, def?: unknown) => {
        if (key === 'nodeEnv') return 'development';
        if (key === 'session.expiresInDays') return 30;
        return def;
      }),
    };
    controller = new AuthController(
      authService as unknown as AuthService,
      {} as UsersService,
      configService as unknown as ConfigService,
    );
  });

  it('login sets an httpOnly refresh cookie and omits refreshToken from the body', async () => {
    authService.login.mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'refresh',
      user: fakeUser,
    });
    const res = buildRes();
    const req = {
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as Request;

    const body = await controller.login(
      { email: 'a@b.com', password: 'x', rememberMe: true } as LoginDto,
      req,
      res,
    );

    expect(res.cookie).toHaveBeenCalledWith(
      REFRESH_COOKIE_NAME,
      'refresh',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'strict',
        path: '/api/v1/auth',
        secure: false,
        maxAge: 30 * 24 * 60 * 60 * 1000,
      }),
    );
    expect(body).toEqual({ accessToken: 'access', user: fakeUser });
    expect((body as Record<string, unknown>).refreshToken).toBeUndefined();
  });

  it('login without rememberMe sets a session cookie (no maxAge)', async () => {
    authService.login.mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'refresh',
      user: fakeUser,
    });
    const res = buildRes();
    const req = { headers: {}, socket: {} } as unknown as Request;

    await controller.login(
      { email: 'a@b.com', password: 'x' } as LoginDto,
      req,
      res,
    );

    const options = res.cookie.mock.calls[0][2] as { maxAge?: number };
    expect(options.maxAge).toBeUndefined();
  });

  it('refresh rotates the cookie and returns only the access token', async () => {
    authService.refreshToken.mockResolvedValue({
      accessToken: 'newAccess',
      refreshToken: 'newRefresh',
    });
    const res = buildRes();
    const req = {
      user: { sub: 'u1', sid: 's1', rawToken: 'raw' },
    } as unknown as Request & {
      user: JwtRefreshPayload & { rawToken: string };
    };

    const body = await controller.refresh(req, res);

    expect(res.cookie).toHaveBeenCalledWith(
      REFRESH_COOKIE_NAME,
      'newRefresh',
      expect.objectContaining({ httpOnly: true, path: '/api/v1/auth' }),
    );
    expect(body).toEqual({ accessToken: 'newAccess' });
  });

  it('logout revokes the session and clears the refresh cookie', async () => {
    authService.logout.mockResolvedValue({ message: 'Logged out' });
    const res = buildRes();
    const user = { sub: 'u1', sid: 's1', email: 'a@b.com' } as JwtAccessPayload;

    const body = await controller.logout(user, res);

    expect(authService.logout).toHaveBeenCalledWith('s1');
    expect(res.clearCookie).toHaveBeenCalledWith(
      REFRESH_COOKIE_NAME,
      expect.objectContaining({ path: '/api/v1/auth', httpOnly: true }),
    );
    expect(body).toEqual({ message: 'Logged out' });
  });
});
