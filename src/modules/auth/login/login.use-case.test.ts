import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { OtpType } from '@prisma/client';
import { LoginUseCase } from './login.use-case';
import { UsersService } from '../../users/users.service';
import { OtpService } from '../../otp/otp.service';
import { EmailService } from '../../email/email.service';
import { SessionIssuerService } from '../session-issuer.service';
import { CryptoUtil } from '../../../common/utils/crypto.util';
import { UserEntity } from '../../users/entities/user.entity';
import {
  AccountNotActiveException,
  EmailNotVerifiedException,
  InvalidCredentialsException,
} from '../../../common/exceptions/auth.exceptions';

const buildUser = (overrides: Partial<UserEntity> = {}): UserEntity =>
  ({
    id: 'u1',
    email: 'a@b.com',
    passwordHash: 'hashed-password',
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

describe('LoginUseCase', () => {
  let usersService: { findByEmail: jest.Mock<UsersService['findByEmail']> };
  let otpService: { createOtp: jest.Mock };
  let emailService: {
    sendEmailVerification: jest.Mock<EmailService['sendEmailVerification']>;
  };
  let sessionIssuer: { issue: jest.Mock };
  let useCase: LoginUseCase;

  beforeEach(() => {
    usersService = { findByEmail: jest.fn<UsersService['findByEmail']>() };
    otpService = { createOtp: jest.fn(() => '1234') };
    emailService = {
      sendEmailVerification: jest.fn<EmailService['sendEmailVerification']>(),
    };
    sessionIssuer = {
      issue: jest.fn(() => ({
        accessToken: 'access.jwt',
        refreshToken: 'refresh.jwt',
      })),
    };

    useCase = new LoginUseCase(
      usersService as unknown as UsersService,
      otpService as unknown as OtpService,
      emailService as unknown as EmailService,
      sessionIssuer as unknown as SessionIssuerService,
    );

    jest.spyOn(CryptoUtil, 'comparePassword').mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('delegates session/token minting to SessionIssuerService on valid credentials', async () => {
    const user = buildUser();
    usersService.findByEmail.mockResolvedValue(user);

    const result = await useCase.execute(
      { email: 'a@b.com', password: 'secret' },
      '127.0.0.1',
      'jest',
    );

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

  it('throws InvalidCredentialsException when the user does not exist', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute({ email: 'nobody@b.com', password: 'secret' }),
    ).rejects.toThrow(InvalidCredentialsException);
    expect(sessionIssuer.issue).not.toHaveBeenCalled();
  });

  it('throws InvalidCredentialsException for an OAuth-only account with no password hash', async () => {
    usersService.findByEmail.mockResolvedValue(
      buildUser({ passwordHash: null }),
    );

    await expect(
      useCase.execute({ email: 'a@b.com', password: 'secret' }),
    ).rejects.toThrow(InvalidCredentialsException);
    expect(sessionIssuer.issue).not.toHaveBeenCalled();
  });

  it('throws InvalidCredentialsException on a wrong password', async () => {
    usersService.findByEmail.mockResolvedValue(buildUser());
    jest.spyOn(CryptoUtil, 'comparePassword').mockResolvedValue(false);

    await expect(
      useCase.execute({ email: 'a@b.com', password: 'wrong' }),
    ).rejects.toThrow(InvalidCredentialsException);
    expect(sessionIssuer.issue).not.toHaveBeenCalled();
  });

  it('throws AccountNotActiveException for a deactivated account', async () => {
    usersService.findByEmail.mockResolvedValue(buildUser({ isActive: false }));

    await expect(
      useCase.execute({ email: 'a@b.com', password: 'secret' }),
    ).rejects.toThrow(AccountNotActiveException);
    expect(sessionIssuer.issue).not.toHaveBeenCalled();
  });

  it('resends a verification OTP and throws EmailNotVerifiedException for an unverified email', async () => {
    usersService.findByEmail.mockResolvedValue(
      buildUser({ isEmailVerified: false }),
    );

    await expect(
      useCase.execute({ email: 'a@b.com', password: 'secret' }),
    ).rejects.toThrow(EmailNotVerifiedException);

    expect(otpService.createOtp).toHaveBeenCalledWith(
      'u1',
      OtpType.EMAIL_VERIFICATION,
    );
    expect(emailService.sendEmailVerification).toHaveBeenCalledWith(
      'a@b.com',
      '1234',
    );
    expect(sessionIssuer.issue).not.toHaveBeenCalled();
  });

  it('still rejects with EmailNotVerifiedException even if sending the OTP email fails', async () => {
    usersService.findByEmail.mockResolvedValue(
      buildUser({ isEmailVerified: false }),
    );
    emailService.sendEmailVerification.mockRejectedValue(
      new Error('smtp down'),
    );

    await expect(
      useCase.execute({ email: 'a@b.com', password: 'secret' }),
    ).rejects.toThrow(EmailNotVerifiedException);
  });
});
