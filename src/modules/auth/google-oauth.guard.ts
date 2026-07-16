import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

/**
 * Guards both Google OAuth endpoints (`/auth/google` and `/auth/google/callback`).
 *
 * Architecture decision: overrides handleRequest to redirect back to the PWA
 * callback route with ?error=access_denied instead of throwing when consent is
 * denied or the strategy fails. Throwing here would surface a bare JSON error
 * response mid-redirect-flow, which the browser has no clean way to recover
 * from; a redirect keeps the user inside the PWA's own error screen.
 */
@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser,
    info: unknown,
    context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      const response = context.switchToHttp().getResponse<Response>();
      const frontendUrl = this.configService.getOrThrow<string>('frontendUrl');
      response.redirect(
        `${frontendUrl}/auth/google/callback?error=access_denied`,
      );
      return undefined as unknown as TUser;
    }
    return user;
  }
}
