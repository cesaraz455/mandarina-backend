import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { LoginByUserIdUseCase } from './login-by-user-id.use-case';
import { UsersService } from '../../users/users.service';
import { SessionIssuerService } from '../session-issuer.service';
import { UserEntity } from '../../users/entities/user.entity';

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
    toPublicProfile: jest.fn(() => ({ id: 'u1', email: 'a@b.com' })),
    ...overrides,
  }) as unknown as UserEntity;

describe('LoginByUserIdUseCase', () => {
  let usersService: { findById: jest.Mock<UsersService['findById']> };
  let sessionIssuer: { issue: jest.Mock };
  let useCase: LoginByUserIdUseCase;

  beforeEach(() => {
    usersService = { findById: jest.fn<UsersService['findById']>() };
    sessionIssuer = {
      issue: jest.fn(() => ({
        accessToken: 'access.jwt',
        refreshToken: 'refresh.jwt',
      })),
    };

    useCase = new LoginByUserIdUseCase(
      usersService as unknown as UsersService,
      sessionIssuer as unknown as SessionIssuerService,
    );
  });

  it('resolves the user by id and delegates session/token minting to SessionIssuerService', async () => {
    const user = buildUser();
    usersService.findById.mockResolvedValue(user);

    const result = await useCase.execute('u1', {
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
    });

    expect(usersService.findById).toHaveBeenCalledWith('u1');
    expect(sessionIssuer.issue).toHaveBeenCalledWith(user, {
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
    });
    expect(result).toEqual({
      accessToken: 'access.jwt',
      refreshToken: 'refresh.jwt',
      user: { id: 'u1', email: 'a@b.com' },
    });
  });

  it('defaults to an empty context when none is given', async () => {
    const user = buildUser();
    usersService.findById.mockResolvedValue(user);

    await useCase.execute('u1');

    expect(sessionIssuer.issue).toHaveBeenCalledWith(user, {});
  });
});
