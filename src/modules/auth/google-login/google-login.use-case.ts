import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../../users/users.service';
import { SessionsService } from '../../sessions/sessions.service';
import { UserAuthAccountsService } from '../../user-auth-accounts/user-auth-accounts.service';
import { CryptoUtil } from '../../../common/utils/crypto.util';
import { UserEntity } from '../../users/entities/user.entity';
import { GoogleProfile } from '../google.strategy';
import {
  GoogleEmailNotVerifiedException,
  AccountInactiveException,
} from '../../../common/exceptions/auth.exceptions';

const GOOGLE_PROVIDER = 'google';

export type GoogleLoginStatus = 'linked' | 'created' | 'login';

export interface GoogleLoginResult {
  refreshToken: string;
  status: GoogleLoginStatus;
}

export interface GoogleLoginContext {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class GoogleLoginUseCase {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
    private readonly userAuthAccountsService: UserAuthAccountsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async execute(
    profile: GoogleProfile,
    ctx: GoogleLoginContext,
  ): Promise<GoogleLoginResult> {
    // 1. Google is the identity source of truth here: an unverified email could
    // let someone claim an inbox they don't control.
    if (!profile.emailVerified) {
      throw new GoogleEmailNotVerifiedException();
    }

    // 2. Find-or-create-link: reuse the linked account, or link/create by email.
    let user: UserEntity;
    let status: GoogleLoginStatus;

    const account = await this.userAuthAccountsService.findByProvider(
      GOOGLE_PROVIDER,
      profile.googleId,
    );

    if (account) {
      user = await this.usersService.findById(account.userId);
      if (!user.isActive) {
        throw new AccountInactiveException();
      }
      status = 'login';
    } else {
      const existingUser = await this.usersService.findByEmail(profile.email);

      if (existingUser) {
        await this.userAuthAccountsService.link({
          userId: existingUser.id,
          provider: GOOGLE_PROVIDER,
          providerUserId: profile.googleId,
        });
        // Google already verified this email; reflect that on the account being linked.
        user = existingUser.isEmailVerified
          ? existingUser
          : await this.usersService.update(existingUser.id, {
              isEmailVerified: true,
              emailVerifiedAt: new Date(),
            });
        status = 'linked';
      } else {
        user = await this.usersService.create({
          email: profile.email,
          isEmailVerified: true,
          emailVerifiedAt: new Date(),
          firstName: profile.firstName ?? undefined,
          lastName: profile.lastName ?? undefined,
          profilePictureUrl: profile.picture ?? undefined,
        });
        await this.userAuthAccountsService.link({
          userId: user.id,
          provider: GOOGLE_PROVIDER,
          providerUserId: profile.googleId,
        });
        status = 'created';
      }
    }

    // 3. Pre-generate sessionId, exactly like login.use-case.ts. Only the refresh
    // token is minted: this flow always ends in a redirect (no JSON body to carry
    // an access token), the PWA rehydrates via the existing refresh + me flow.
    const sessionId = uuidv4();
    const expiresAt = this.sessionsService.getSessionExpiresAt();

    const refreshToken = this.jwtService.sign(
      { sub: user.id, sid: sessionId },
      {
        secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>(
          'jwt.refreshExpiresIn',
          '30d',
        ),
      },
    );

    // 4. Persist session with pre-generated ID and hashed refresh token
    const refreshTokenHash = CryptoUtil.hashToken(refreshToken);

    await this.sessionsService.create({
      id: sessionId,
      userId: user.id,
      refreshTokenHash,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      expiresAt,
    });

    // 5. Track last login
    await this.usersService.update(user.id, { lastLoginAt: new Date() });

    return { refreshToken, status };
  }
}
