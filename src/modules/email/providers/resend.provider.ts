import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

/**
 * Injection token for the Resend client.
 * Use this token to inject the client in services without coupling to Resend directly.
 */
export const RESEND_CLIENT = Symbol('RESEND_CLIENT');

/**
 * ResendProvider creates a single Resend client instance for the process lifetime.
 *
 * Architecture decision: We register the SDK client as a NestJS provider rather
 * than instantiating it inside the service. This keeps the service testable
 * (mock RESEND_CLIENT in tests) and separates infrastructure wiring from logic.
 */
export const ResendProvider: Provider = {
  provide: RESEND_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): Resend => {
    const apiKey = configService.getOrThrow<string>('email.resendApiKey');
    return new Resend(apiKey);
  },
};
