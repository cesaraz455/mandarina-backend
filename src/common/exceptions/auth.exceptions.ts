import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

export class EmailAlreadyExistsException extends ConflictException {
  constructor() {
    super('An account with this email already exists');
  }
}

export class UserNotFoundException extends NotFoundException {
  constructor() {
    super('User not found');
  }
}

export class InvalidCredentialsException extends UnauthorizedException {
  constructor() {
    super('Invalid email or password');
  }
}

export class AccountNotActiveException extends ForbiddenException {
  constructor() {
    super('Your account has been deactivated. Please contact support');
  }
}

export class EmailNotVerifiedException extends ForbiddenException {
  constructor() {
    super({
      message: 'Please verify your email address before logging in',
      code: 'EMAIL_NOT_VERIFIED',
    });
  }
}

export class OtpResendCooldownException extends BadRequestException {
  constructor(retryAfterSeconds: number) {
    super({
      message: `Please wait ${retryAfterSeconds} seconds before requesting a new verification code`,
      code: 'OTP_COOLDOWN',
    });
  }
}

export class InvalidOrExpiredOtpException extends BadRequestException {
  constructor() {
    super('The verification code is invalid or has expired');
  }
}

export class MaxOtpAttemptsException extends BadRequestException {
  constructor() {
    super('Maximum verification attempts exceeded. Please request a new code');
  }
}

export class InvalidRefreshTokenException extends UnauthorizedException {
  constructor() {
    super('Invalid or expired refresh token');
  }
}

export class SessionRevokedException extends UnauthorizedException {
  constructor() {
    super('Session has been revoked. Please log in again');
  }
}

export class SessionExpiredException extends UnauthorizedException {
  constructor() {
    super('Session has expired. Please log in again');
  }
}
