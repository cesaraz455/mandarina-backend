import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { GoogleLoginUseCase } from './google-login.use-case';
import { UsersService } from '../../users/users.service';
import { UserAuthAccountsService } from '../../user-auth-accounts/user-auth-accounts.service';
import { SessionIssuerService } from '../session-issuer.service';
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
    findById: jest.Mock<UsersService['findById']>;
    findByEmail: jest.Mock<UsersService['findByEmail']>;
    create: jest.Mock<UsersService['create']>;
    update: jest.Mock<UsersService['update']>;
  };
  let userAuthAccountsService: {
    findByProvider: jest.Mock<UserAuthAccountsService['findByProvider']>;
    link: jest.Mock;
  };
  let sessionIssuer: { issue: jest.Mock };
  let useCase: GoogleLoginUseCase;

  beforeEach(() => {
    usersService = {
      findById: jest.fn<UsersService['findById']>(),
      findByEmail: jest.fn<UsersService['findByEmail']>(),
      create: jest.fn<UsersService['create']>(),
      update: jest.fn<UsersService['update']>(),
    };
    userAuthAccountsService = {
      findByProvider: jest.fn<UserAuthAccountsService['findByProvider']>(),
      link: jest.fn(),
    };
    sessionIssuer = {
      issue: jest.fn(() => ({
        accessToken: 'signed.jwt.token',
        refreshToken: 'signed.jwt.token',
      })),
    };

    useCase = new GoogleLoginUseCase(
      usersService as unknown as UsersService,
      userAuthAccountsService as unknown as UserAuthAccountsService,
      sessionIssuer as unknown as SessionIssuerService,
    );
  });

  it('logs in directly when a linked account already exists', async () => {
    const account = buildAccount();
    const user = buildUser();
    userAuthAccountsService.findByProvider.mockResolvedValue(account);
    usersService.findById.mockResolvedValue(user);

    const ctx = { ipAddress: '127.0.0.1', userAgent: 'jest' };
    const result = await useCase.execute(googleProfile, ctx);

    expect(result.status).toBe('login');
    expect(result.refreshToken).toBe('signed.jwt.token');
    expect(userAuthAccountsService.findByProvider).toHaveBeenCalledWith(
      'google',
      googleProfile.googleId,
    );
    expect(userAuthAccountsService.link).not.toHaveBeenCalled();
    expect(usersService.create).not.toHaveBeenCalled();
    expect(sessionIssuer.issue).toHaveBeenCalledWith(user, ctx);
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
    expect(sessionIssuer.issue).toHaveBeenCalledWith(verifiedUser, {});
  });

  it('links an already-verified existing user without re-verifying it', async () => {
    userAuthAccountsService.findByProvider.mockResolvedValue(null);
    const existingUser = buildUser({ isEmailVerified: true });
    usersService.findByEmail.mockResolvedValue(existingUser);

    const result = await useCase.execute(googleProfile, {});

    expect(result.status).toBe('linked');
    expect(usersService.update).not.toHaveBeenCalled();
    expect(sessionIssuer.issue).toHaveBeenCalledWith(existingUser, {});
  });

  it('creates a new user and links it when no account or email match exists', async () => {
    userAuthAccountsService.findByProvider.mockResolvedValue(null);
    usersService.findByEmail.mockResolvedValue(null);
    const newUser = buildUser({ id: 'u2' });
    usersService.create.mockResolvedValue(newUser);

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
    expect(sessionIssuer.issue).toHaveBeenCalledWith(newUser, {});
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
    expect(sessionIssuer.issue).not.toHaveBeenCalled();
  });
});
