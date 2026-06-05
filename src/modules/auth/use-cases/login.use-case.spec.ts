import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginUseCase } from './login.use-case';
import { UsersService } from '../../users/users.service';
import { SessionsService } from '../../sessions/sessions.service';
import { UserEntity } from '../../users/entities/user.entity';
import { SessionEntity } from '../../sessions/entities/session.entity';
import * as bcrypt from 'bcrypt';
import {
  AccountNotActiveException,
  EmailNotVerifiedException,
  InvalidCredentialsException,
} from '../../../common/exceptions/auth.exceptions';

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let usersService: jest.Mocked<UsersService>;
  let sessionsService: jest.Mocked<SessionsService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const password = 'SecureP@ssw0rd';
  let passwordHash: string;

  const buildUser = (overrides: Partial<ConstructorParameters<typeof UserEntity>[0]> = {}) =>
    new UserEntity({
      id: 'user-id',
      email: 'user@example.com',
      passwordHash,
      firstName: 'John',
      lastName: 'Doe',
      profilePictureUrl: null,
      isEmailVerified: true,
      isActive: true,
      lastLoginAt: null,
      emailVerifiedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });

  const mockSession = new SessionEntity({
    id: 'session-id',
    userId: 'user-id',
    refreshTokenHash: 'hash',
    ipAddress: null,
    userAgent: null,
    isRevoked: false,
    revokedAt: null,
    expiresAt: new Date(Date.now() + 86400000),
    createdAt: new Date(),
  });

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(password, 10);
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginUseCase,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: SessionsService,
          useValue: {
            create: jest.fn(),
            getSessionExpiresAt: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mocked.jwt.token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('test-secret'),
            get: jest.fn().mockReturnValue('15m'),
          },
        },
      ],
    }).compile();

    useCase = module.get<LoginUseCase>(LoginUseCase);
    usersService = module.get(UsersService);
    sessionsService = module.get(SessionsService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);

    sessionsService.create.mockResolvedValue(mockSession);
    sessionsService.getSessionExpiresAt.mockReturnValue(
      new Date(Date.now() + 86400000),
    );
    usersService.update.mockResolvedValue(buildUser());
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should return tokens and user profile on successful login', async () => {
      usersService.findByEmail.mockResolvedValue(buildUser());

      const result = await useCase.execute({
        email: 'user@example.com',
        password,
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe('user@example.com');
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
    });

    it('should throw InvalidCredentialsException when user not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        useCase.execute({ email: 'noone@example.com', password }),
      ).rejects.toThrow(InvalidCredentialsException);
    });

    it('should throw InvalidCredentialsException when password is wrong', async () => {
      usersService.findByEmail.mockResolvedValue(buildUser());

      await expect(
        useCase.execute({ email: 'user@example.com', password: 'wrongPassword1!' }),
      ).rejects.toThrow(InvalidCredentialsException);
    });

    it('should throw InvalidCredentialsException for OAuth-only account', async () => {
      usersService.findByEmail.mockResolvedValue(buildUser({ passwordHash: null }));

      await expect(
        useCase.execute({ email: 'user@example.com', password }),
      ).rejects.toThrow(InvalidCredentialsException);
    });

    it('should throw AccountNotActiveException when account is inactive', async () => {
      usersService.findByEmail.mockResolvedValue(buildUser({ isActive: false }));

      await expect(
        useCase.execute({ email: 'user@example.com', password }),
      ).rejects.toThrow(AccountNotActiveException);
    });

    it('should throw EmailNotVerifiedException when email is not verified', async () => {
      usersService.findByEmail.mockResolvedValue(
        buildUser({ isEmailVerified: false }),
      );

      await expect(
        useCase.execute({ email: 'user@example.com', password }),
      ).rejects.toThrow(EmailNotVerifiedException);
    });

    it('should update lastLoginAt on successful login', async () => {
      usersService.findByEmail.mockResolvedValue(buildUser());

      await useCase.execute({ email: 'user@example.com', password });

      expect(usersService.update).toHaveBeenCalledWith(
        'user-id',
        expect.objectContaining({ lastLoginAt: expect.any(Date) }),
      );
    });
  });
});
