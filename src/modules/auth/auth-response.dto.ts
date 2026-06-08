import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserProfileDto {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiPropertyOptional() firstName: string | null;
  @ApiPropertyOptional() lastName: string | null;
  @ApiPropertyOptional() profilePictureUrl: string | null;
  @ApiProperty() isEmailVerified: boolean;
  @ApiProperty() isActive: boolean;
  @ApiProperty() createdAt: Date;
}

export class AuthResponseDto {
  @ApiProperty() accessToken: string;
  @ApiProperty() refreshToken: string;
  @ApiProperty({ type: UserProfileDto }) user: UserProfileDto;
}

export class TokensResponseDto {
  @ApiProperty() accessToken: string;
  @ApiProperty() refreshToken: string;
}

export class MessageResponseDto {
  @ApiProperty() message: string;
}
