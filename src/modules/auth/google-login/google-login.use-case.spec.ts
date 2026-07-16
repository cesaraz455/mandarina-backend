import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { GoogleLoginUseCase } from './google-login.use-case';
import { UsersService } from '../../users/users.service';
import { SessionsService } from '../../sessions/sessions.service';
import { UserAuthAccountsService } from '../../user-auth-accounts/user-auth-accounts.service';
import { UserEntity } from '../../users/entities/user.entity';
import { UserAuthAccountEntity } from '../../user-auth-accounts/entities/user-auth-account.entity';
import { GoogleProfile } from '../google.strategy';
import {
  AccountInactiveException,
  GoogleEmailNotVerifiedException,
} from '../../../common/exceptions/auth.exceptions';

const buildUser = (overrides: Partial<UserEntity> = {}): UserEntity =>
  ({
    id: 'u1',
    email: 'a@b.com',
    passwordHash: null,
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

const buildAccount = (
  overrides: Partial<UserAuthAccountEntity> = {},
): UserAuthAccountEntity =>
  ({
    id: 'acc1',
    userId: 'u1',
    provider: 'google',
    providerUserId: 'google-sub-1',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }) as UserAuthAccountEntity;

const googleProfile: GoogleProfile = {
  googleId: 'google-sub-1',
  email: 'a@b.com',
  emailVerified: true,
  firstName: 'Ada',
  lastName: 'Lovelace',
  picture: 'https://example.com/pic.jpg',
};

describe('GoogleLoginUseCase', () => {
  let usersService: {
    findById: jest.Mock;
    findByEmail: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  let sessionsService: {
    create: jest.Mock;
    getSessionExpiresAt: jest.Mock;
  };
  let userAuthAccountsService: {
    findByProvider: jest.Mock;
    link: jest.Mock;
  };
  let jwtService: { sign: jest.Mock };
  let configService: { getOrThrow: jest.Mock; get: jest.Mock };
  let useCase: GoogleLoginUseCase;

  beforeEach(() => {
    usersService = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    sessionsService = {
      create: jest.fn(),
      getSessionExpiresAt: jest.fn(() => new Date('2026-02-01T00:00:00.000Z')),
    };
    userAuthAccountsService = {
      findByProvider: jest.fn(),
      link: jest.fn(),
    };
    jwtService = { sign: jest.fn(() => 'signed.jwt.token') };
    configService = {
      getOrThrow: jest.fn(() => 'a'.repeat(32)),
      get: jest.fn((_key: string, def?: unknown) => def),
    };

    useCase = new GoogleLoginUseCase(
      usersService as unknown as UsersService,
      sessionsService as unknown as SessionsService,
      userAuthAccountsService as unknown as UserAuthAccountsService,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
    );
  });

  it('logs in directly when a linked account already exists', async () => {
    const account = buildAccount();
    const user = buildUser();
    userAuthAccountsService.findByProvider.mockResolvedValue(account);
    usersService.findById.mockResolvedValue(user);
    usersService.update.mockResolvedValue(user);

    const result = await useCase.execute(googleProfile, {
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
    });

    expect(result.status).toBe('login');
    expect(result.refreshToken).toBe('signed.jwt.token');
    expect(userAuthAccountsService.findByProvider).toHaveBeenCalledWith(
      'google',
      googleProfile.googleId,
    );
    expect(userAuthAccountsService.link).not.toHaveBeenCalled();
    expect(usersService.create).not.toHaveBeenCalled();

    expect(sessionsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      }),
    );
    // The refresh token must never be stored raw: assert a SHA-256 hex digest, not the token.
    const sessionArg = sessionsService.create.mock.calls[0][0] as {
      refreshTokenHash: string;
    };
    expect(sessionArg.refreshTokenHash).not.toBe('signed.jwt.token');
    expect(sessionArg.refreshTokenHash).toMatch(/^[a-f0-9]{64}$/);

    expect(usersService.update).toHaveBeenCalledWith(
      user.id,
      expect.objectContaining({ lastLoginAt: expect.any(Date) }),
    );
  });

  it('links the Google account to an existing unverified user and marks it verified', async () => {
    userAuthAccountsService.findByProvider.mockResolvedValue(null);
    const existingUser = buildUser({ isEmailVerified: false });
    const verifiedUser = buildUser({ isEmailVerified: true });
    usersService.findByEmail.mockResolvedValue(existingUser);
    usersService.update.mockResolvedValue(verifiedUser);

    const result = await useCase.execute(googleProfile, {});

    expect(result.status).toBe('linked');
    expect(userAuthAccountsService.link).toHaveBeenCalledWith({
      userId: existingUser.id,
      provider: 'google',
      providerUserId: googleProfile.googleId,
    });
    expect(usersService.update).toHaveBeenCalledWith(
      existingUser.id,
      expect.objectContaining({
        isEmailVerified: true,
        emailVerifiedAt: expect.any(Date),
      }),
    );
    expect(usersService.create).not.toHaveBeenCalled();
    expect(sessionsService.create).toHaveBeenCalled();
  });

  it('links an already-verified existing user without re-verifying it', async () => {
    userAuthAccountsService.findByProvider.mockResolvedValue(null);
    const existingUser = buildUser({ isEmailVerified: true });
    usersService.findByEmail.mockResolvedValue(existingUser);
    usersService.update.mockResolvedValue(existingUser);

    const result = await useCase.execute(googleProfile, {});

    expect(result.status).toBe('linked');
    expect(usersService.update).not.toHaveBeenCalledWith(
      existingUser.id,
      expect.objectContaining({ isEmailVerified: true }),
    );
    // Still called once, for lastLoginAt.
    expect(usersService.update).toHaveBeenCalledTimes(1);
  });

  it('creates a new user and links it when no account or email match exists', async () => {
    userAuthAccountsService.findByProvider.mockResolvedValue(null);
    usersService.findByEmail.mockResolvedValue(null);
    const newUser = buildUser({ id: 'u2' });
    usersService.create.mockResolvedValue(newUser);
    usersService.update.mockResolvedValue(newUser);

    const result = await useCase.execute(googleProfile, {});

    expect(result.status).toBe('created');
    expect(usersService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: googleProfile.email,
        isEmailVerified: true,
        emailVerifiedAt: expect.any(Date),
        firstName: googleProfile.firstName,
        lastName: googleProfile.lastName,
        profilePictureUrl: googleProfile.picture,
      }),
    );
    expect(userAuthAccountsService.link).toHaveBeenCalledWith({
      userId: newUser.id,
      provider: 'google',
      providerUserId: googleProfile.googleId,
    });
    expect(sessionsService.create).toHaveBeenCalled();
  });

  it('rejects an unverified Google email before touching the database', async () => {
    const unverifiedProfile: GoogleProfile = {
      ...googleProfile,
      emailVerified: false,
    };

    await expect(useCase.execute(unverifiedProfile, {})).rejects.toThrow(
      GoogleEmailNotVerifiedException,
    );
    expect(userAuthAccountsService.findByProvider).not.toHaveBeenCalled();
  });

  it('rejects a linked but inactive account', async () => {
    const account = buildAccount();
    const inactiveUser = buildUser({ isActive: false });
    userAuthAccountsService.findByProvider.mockResolvedValue(account);
    usersService.findById.mockResolvedValue(inactiveUser);

    await expect(useCase.execute(googleProfile, {})).rejects.toThrow(
      AccountInactiveException,
    );
    expect(sessionsService.create).not.toHaveBeenCalled();
  });
});
