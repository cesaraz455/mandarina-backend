import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserProfileDto {
  @ApiProperty() id!: string;
  @ApiProperty() email!: string;
  @ApiPropertyOptional() firstName!: string | null;
  @ApiPropertyOptional() lastName!: string | null;
  @ApiPropertyOptional() profilePictureUrl!: string | null;
  @ApiProperty() isEmailVerified!: boolean;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() createdAt!: Date;
}

export class AuthResponseDto {
  @ApiProperty() accessToken!: string;
  @ApiProperty({ type: UserProfileDto }) user!: UserProfileDto;
}

export class TokensResponseDto {
  @ApiProperty() accessToken!: string;
}

export class MessageResponseDto {
  @ApiProperty() message!: string;
}

export class VerifyEmailResponseDto {
  @ApiProperty() message!: string;
  @ApiPropertyOptional({
    description:
      'Present when the OTP was just verified: the account is now logged in, exactly ' +
      'like POST /auth/login (refresh token is set as the httpOnly cookie). Absent when ' +
      'the email was already verified beforehand, since no OTP was checked on that path.',
  })
  accessToken?: string;
  @ApiPropertyOptional({ type: UserProfileDto })
  user?: UserProfileDto;
}
