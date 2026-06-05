import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { OtpModule } from './modules/otp/otp.module';
import { EmailModule } from './modules/email/email.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    // Configuration — global so all modules can inject ConfigService
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: false,
        abortEarly: false,
      },
    }),

    // Rate limiting — global guard applied below
    ThrottlerModule.forRoot([
      {
        ttl: 60000,  // 1 minute
        limit: 10,
      },
    ]),

    // Infrastructure
    PrismaModule,

    // Feature modules
    UsersModule,
    SessionsModule,
    OtpModule,
    EmailModule,
    AuthModule,
  ],
  providers: [
    // Apply JWT guard globally; use @Public() to opt-out on specific routes
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Apply rate limiting globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Centralised exception formatting
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    // Global validation pipe — ensures all DTOs are validated before handlers run
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,        // strip unknown properties
        forbidNonWhitelisted: true, // throw on unknown properties
        transform: true,        // auto-transform payloads to DTO instances
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    },
  ],
})
export class AppModule {}
