import { Injectable } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { PublicUserProfile } from '../../users/entities/user.entity';
import {
  SessionIssuerService,
  IssueSessionContext,
} from '../session-issuer.service';

export interface LoginByUserIdResult {
  accessToken: string;
  refreshToken: string;
  user: PublicUserProfile;
}

export type LoginByUserIdContext = IssueSessionContext;

/**
 * Mints a session for a user whose identity was already established by the
 * caller (no credential check here), e.g. right after email verification.
 */
@Injectable()
export class LoginByUserIdUseCase {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionIssuer: SessionIssuerService,
  ) {}

  async execute(
    userId: string,
    ctx: LoginByUserIdContext = {},
  ): Promise<LoginByUserIdResult> {
    const user = await this.usersService.findById(userId);

    const { accessToken, refreshToken } = await this.sessionIssuer.issue(
      user,
      ctx,
    );

    return {
      accessToken,
      refreshToken,
      user: user.toPublicProfile(),
    };
  }
}
