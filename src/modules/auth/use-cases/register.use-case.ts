import { Injectable, Logger } from '@nestjs/common';
import { RegisterDto } from '../dto/register.dto';
import { UsersService } from '../../users/users.service';
import { OtpService } from '../../otp/otp.service';
import { EmailService } from '../../email/email.service';
import { CryptoUtil } from '../../../common/utils/crypto.util';
import { EmailAlreadyExistsException } from '../../../common/exceptions/auth.exceptions';
import { OtpType } from '@prisma/client';

export interface RegisterResult {
  message: string;
}

@Injectable()
export class RegisterUseCase {
  private readonly logger = new Logger(RegisterUseCase.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly otpService: OtpService,
    private readonly emailService: EmailService,
  ) {}

  async execute(dto: RegisterDto): Promise<RegisterResult> {
    // 1. Enforce email uniqueness before hashing to fail fast
    const exists = await this.usersService.existsByEmail(dto.email);
    if (exists) {
      throw new EmailAlreadyExistsException();
    }

    // 2. Hash password
    const passwordHash = await CryptoUtil.hashPassword(dto.password);

    // 3. Persist user
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });

    // 4. Generate and store OTP
    const otp = await this.otpService.createOtp(
      user.id,
      OtpType.EMAIL_VERIFICATION,
    );

    // 5. Send verification email (best-effort — log on failure, don't fail registration)
    try {
      await this.emailService.sendEmailVerification(user.email, otp);
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to ${user.email}`,
        error,
      );
    }

    return {
      message:
        'Registration successful. Please check your email for the verification code.',
    };
  }
}
