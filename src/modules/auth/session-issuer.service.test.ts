import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SessionIssuerService } from './session-issuer.service';
import { SessionsService } from '../sessions/sessions.service';
import { UsersService } from '../users/users.service';
import { UserEntity } from '../users/entities/user.entity';

const buildUser = (overrides: Partial<UserEntity> = {}): UserEntity =>
  ({
    id: 'u1',
    email: 'a@b.com',
    passwordHash: 'hashed',
    firstName: null,
    lastName: null,
    profilePictureUrl: null,
    isEmailVerified: true,
    isActive: true,
    lastLoginAt: null,
    emailVerifiedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }) as UserEntity;

describe('SessionIssuerService', () => {
  let sessionsService: {
    create: jest.Mock;
    getSessionExpiresAt: jest.Mock;
  };
  let usersService: { update: jest.Mock };
  let jwtService: { sign: jest.Mock<(...args: any[]) => string> };
  let configService: {
    getOrThrow: jest.Mock;
    get: jest.Mock<(...args: any[]) => unknown>;
  };
  let service: SessionIssuerService;

  beforeEach(() => {
    sessionsService = {
      create: jest.fn(),
      getSessionExpiresAt: jest.fn(() => new Date('2026-02-01T00:00:00.000Z')),
    };
    usersService = { update: jest.fn() };
    jwtService = {
      sign: jest.fn<(...args: any[]) => string>(() => 'signed.jwt.token'),
    };
    configService = {
      getOrThrow: jest.fn(() => 'a'.repeat(32)),
      get: jest.fn<(...args: any[]) => unknown>(
        (_key: string, def?: unknown) => def,
      ),
    };

    service = new SessionIssuerService(
      sessionsService as unknown as SessionsService,
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
    );
  });

  it('mints an access/refresh token pair sharing a single sid', async () => {
    const user = buildUser();

    const result = await service.issue(user, {
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
    });

    expect(result).toEqual({
      accessToken: 'signed.jwt.token',
      refreshToken: 'signed.jwt.token',
    });

    const [accessPayload] = jwtService.sign.mock.calls[0];
    const [refreshPayload] = jwtService.sign.mock.calls[1];
    expect(accessPayload).toEqual({
      sub: user.id,
      email: user.email,
      sid: refreshPayload.sid,
    });
    expect(refreshPayload).toEqual({ sub: user.id, sid: refreshPayload.sid });
  });

  it('persists the session with the caller-provided ip/user-agent', async () => {
    const user = buildUser();

    await service.issue(user, { ipAddress: '127.0.0.1', userAgent: 'jest' });

    expect(sessionsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: user.id,
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
        expiresAt: new Date('2026-02-01T00:00:00.000Z'),
      }),
    );
  });

  it('never stores the raw refresh token, only its SHA-256 hash', async () => {
    const user = buildUser();

    await service.issue(user);

    const sessionArg = sessionsService.create.mock.calls[0][0] as {
      refreshTokenHash: string;
    };
    expect(sessionArg.refreshTokenHash).not.toBe('signed.jwt.token');
    expect(sessionArg.refreshTokenHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('stamps lastLoginAt on the user', async () => {
    const user = buildUser();

    await service.issue(user);

    expect(usersService.update).toHaveBeenCalledWith(
      user.id,
      expect.objectContaining({ lastLoginAt: expect.any(Date) }),
    );
  });

  it('defaults ip/user-agent to undefined when no context is given', async () => {
    const user = buildUser();

    await service.issue(user);

    expect(sessionsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ipAddress: undefined,
        userAgent: undefined,
      }),
    );
  });
});
