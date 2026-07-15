import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser = require('cookie-parser');
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port', 3000);
  const nodeEnv = configService.get<string>('nodeEnv', 'development');
  const appName = configService.get<string>('appName', 'Mandarina Auth');

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Parse cookies so the jwt-refresh strategy can read the httpOnly refresh cookie.
  app.use(cookieParser());

  // CORS: reflect the origin in development (Vite dev server); in production the PWA
  // is served same-site, so cross-origin is closed. credentials:true is required for
  // the refresh cookie to travel on same-site requests.
  app.enableCors({
    origin: nodeEnv === 'production' ? false : true,
    credentials: true,
  });

  // Swagger: only in non-production environments
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(appName)
      .setDescription(
        'Authentication API for the Mandarina personal finance application. ' +
          'Handles user registration, email verification, login, token refresh, ' +
          'logout, and password recovery.',
      )
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .addTag('Authentication', 'Auth endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });
  }

  await app.listen(port);

  console.log(`
  ███╗   ███╗ █████╗ ███╗   ██╗██████╗  █████╗ ██████╗ ██╗███╗   ██╗ █████╗
  ████╗ ████║██╔══██╗████╗  ██║██╔══██╗██╔══██╗██╔══██╗██║████╗  ██║██╔══██╗
  ██╔████╔██║███████║██╔██╗ ██║██║  ██║███████║██████╔╝██║██╔██╗ ██║███████║
  ██║╚██╔╝██║██╔══██║██║╚██╗██║██║  ██║██╔══██║██╔══██╗██║██║╚██╗██║██╔══██║
  ██║ ╚═╝ ██║██║  ██║██║ ╚████║██████╔╝██║  ██║██║  ██║██║██║ ╚████║██║  ██║
  ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝

  Auth Service running on: http://localhost:${port}/api/v1
  Swagger docs:           http://localhost:${port}/api/docs
  Environment:            ${nodeEnv}
  `);
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
