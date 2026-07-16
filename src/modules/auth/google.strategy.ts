import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';

/**
 * Normalized shape handed to GoogleLoginUseCase. Keeps the use-case decoupled
 * from the raw passport-google-oauth20 Profile shape.
 */
export interface GoogleProfile {
  googleId: string;
  email: string;
  emailVerified: boolean;
  firstName: string | null;
  lastName: string | null;
  picture: string | null;
}

/**
 * Google OAuth2 strategy for the server-side redirect (Authorization Code) flow.
 *
 * Architecture decision: validate() only normalizes the raw passport profile into
 * GoogleProfile; it does not touch the database. All find/create/link logic lives
 * in GoogleLoginUseCase (mirrors how JwtStrategy stays a thin adapter).
 *
 * validate() must return the mapped profile rather than calling the passport
 * `done` callback itself: the @nestjs/passport mixin already wraps our return
 * value and forwards it to `done` internally. Calling `done` here too would
 * invoke it twice for the same request.
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.getOrThrow<string>('google.clientId'),
      clientSecret: configService.getOrThrow<string>('google.clientSecret'),
      callbackURL: configService.getOrThrow<string>('google.callbackUrl'),
      scope: ['email', 'profile'],
    });
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ): GoogleProfile {
    const email = profile.emails?.[0];
    return {
      googleId: profile.id,
      email: email?.value ?? '',
      emailVerified: email?.verified ?? false,
      firstName: profile.name?.givenName ?? null,
      lastName: profile.name?.familyName ?? null,
      picture: profile.photos?.[0]?.value ?? null,
    };
  }
}
