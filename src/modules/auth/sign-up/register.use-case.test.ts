import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { OtpType } from '@prisma/client';
import { RegisterUseCase } from './register.use-case';
import { UsersService } from '../../users/users.service';
import { OtpService } from '../../otp/otp.service';
import { EmailService } from '../../email/email.service';
import { CategoriesService } from '../../categories/categories.service';
import { UserEntity } from '../../users/entities/user.entity';
import { EmailAlreadyExistsException } from '../../../common/exceptions/auth.exceptions';

const dto = {
  email: 'a@b.com',
  password: 'SecureP@ssw0rd',
  firstName: 'Ada',
  lastName: 'Lovelace',
};

const buildUser = (overrides: Partial<UserEntity> = {}): UserEntity =>
  ({
    id: 'u1',
    email: 'a@b.com',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }) as unknown as UserEntity;

describe('RegisterUseCase', () => {
  let usersService: {
    existsByEmail: jest.Mock<UsersService['existsByEmail']>;
    create: jest.Mock<UsersService['create']>;
  };
  let otpService: { createOtp: jest.Mock };
  let emailService: {
    sendEmailVerification: jest.Mock<EmailService['sendEmailVerification']>;
  };
  let categoriesService: {
    seedDefaults: jest.Mock<CategoriesService['seedDefaults']>;
  };
  let useCase: RegisterUseCase;

  beforeEach(() => {
    usersService = {
      existsByEmail: jest.fn<UsersService['existsByEmail']>(),
      create: jest.fn<UsersService['create']>(),
    };
    otpService = { createOtp: jest.fn(() => '1234') };
    emailService = {
      sendEmailVerification: jest.fn<EmailService['sendEmailVerification']>(),
    };
    categoriesService = {
      seedDefaults: jest.fn<CategoriesService['seedDefaults']>(),
    };

    useCase = new RegisterUseCase(
      usersService as unknown as UsersService,
      otpService as unknown as OtpService,
      emailService as unknown as EmailService,
      categoriesService as unknown as CategoriesService,
    );
  });

  it('seeds default categories for the new user after creating the account', async () => {
    usersService.existsByEmail.mockResolvedValue(false);
    const user = buildUser();
    usersService.create.mockResolvedValue(user);

    await useCase.execute(dto);

    expect(categoriesService.seedDefaults).toHaveBeenCalledWith('u1');
  });

  it('does not fail registration when seeding default categories throws', async () => {
    usersService.existsByEmail.mockResolvedValue(false);
    usersService.create.mockResolvedValue(buildUser());
    categoriesService.seedDefaults.mockRejectedValue(new Error('seed failed'));

    await expect(useCase.execute(dto)).resolves.toEqual({
      message:
        'Registration successful. Please check your email for the verification code.',
    });
    expect(otpService.createOtp).toHaveBeenCalledWith(
      'u1',
      OtpType.EMAIL_VERIFICATION,
    );
  });

  it('throws EmailAlreadyExistsException when the email is already registered', async () => {
    usersService.existsByEmail.mockResolvedValue(true);

    await expect(useCase.execute(dto)).rejects.toThrow(
      EmailAlreadyExistsException,
    );
    expect(usersService.create).not.toHaveBeenCalled();
    expect(categoriesService.seedDefaults).not.toHaveBeenCalled();
  });
});
