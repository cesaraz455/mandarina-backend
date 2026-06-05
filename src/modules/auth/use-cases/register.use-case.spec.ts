import { Test, TestingModule } from '@nestjs/testing';
import { RegisterUseCase } from './register.use-case';
import { UsersService } from '../../users/users.service';
import { OtpService } from '../../otp/otp.service';
import { EmailService } from '../../email/email.service';
import { EmailAlreadyExistsException } from '../../../common/exceptions/auth.exceptions';
import { UserEntity } from '../../users/entities/user.entity';
import { OtpType } from '@prisma/client';

describe('RegisterUseCase', () => {
  let useCase: RegisterUseCase;
  let usersService: jest.Mocked<UsersService>;
  let otpService: jest.Mocked<OtpService>;
  let emailService: jest.Mocked<EmailService>;

  const mockUser = new UserEntity({
    id: 'user-uuid-123',
    email: 'test@example.com',
    passwordHash: 'hashed_password',
    firstName: 'John',
    lastName: 'Doe',
    profilePictureUrl: null,
    isEmailVerified: false,
    isActive: true,
    lastLoginAt: null,
    emailVerifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterUseCase,
        {
          provide: UsersService,
          useValue: {
            existsByEmail: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: OtpService,
          useValue: {
            createOtp: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendEmailVerification: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get<RegisterUseCase>(RegisterUseCase);
    usersService = module.get(UsersService);
    otpService = module.get(OtpService);
    emailService = module.get(EmailService);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    const dto = {
      email: 'test@example.com',
      password: 'SecureP@ssw0rd',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should register a new user and send verification email', async () => {
      usersService.existsByEmail.mockResolvedValue(false);
      usersService.create.mockResolvedValue(mockUser);
      otpService.createOtp.mockResolvedValue('123456');
      emailService.sendEmailVerification.mockResolvedValue(undefined);

      const result = await useCase.execute(dto);

      expect(result.message).toContain('Registration successful');
      expect(usersService.existsByEmail).toHaveBeenCalledWith(dto.email);
      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: dto.email }),
      );
      expect(otpService.createOtp).toHaveBeenCalledWith(
        mockUser.id,
        OtpType.EMAIL_VERIFICATION,
      );
      expect(emailService.sendEmailVerification).toHaveBeenCalledWith(
        mockUser.email,
        '123456',
      );
    });

    it('should throw EmailAlreadyExistsException when email is taken', async () => {
      usersService.existsByEmail.mockResolvedValue(true);

      await expect(useCase.execute(dto)).rejects.toThrow(
        EmailAlreadyExistsException,
      );

      expect(usersService.create).not.toHaveBeenCalled();
      expect(otpService.createOtp).not.toHaveBeenCalled();
    });

    it('should succeed even if email sending fails', async () => {
      usersService.existsByEmail.mockResolvedValue(false);
      usersService.create.mockResolvedValue(mockUser);
      otpService.createOtp.mockResolvedValue('123456');
      emailService.sendEmailVerification.mockRejectedValue(
        new Error('SMTP error'),
      );

      // Should NOT throw — email failure is best-effort
      const result = await useCase.execute(dto);
      expect(result.message).toBeDefined();
    });

    it('should hash the password before storing', async () => {
      usersService.existsByEmail.mockResolvedValue(false);
      usersService.create.mockResolvedValue(mockUser);
      otpService.createOtp.mockResolvedValue('123456');
      emailService.sendEmailVerification.mockResolvedValue(undefined);

      await useCase.execute(dto);

      const createCall = usersService.create.mock.calls[0][0];
      // Verify the stored hash is not the plain password
      expect(createCall.passwordHash).not.toBe(dto.password);
      // And is a bcrypt hash (starts with $2b$)
      expect(createCall.passwordHash).toMatch(/^\$2b\$/);
    });
  });
});
