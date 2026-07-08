import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { EnvironmentVariables } from './config/env.validation';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService<EnvironmentVariables>);
  const nodeEnv = configService.getOrThrow('NODE_ENV');
  const isProduction = nodeEnv === 'production';
  const allowedOrigins = configService.get('ALLOWED_ORIGINS');
  const enableSwagger = configService.get('ENABLE_SWAGGER') === 'true';

  const corsOrigin =
    allowedOrigins && allowedOrigins.length > 0
      ? allowedOrigins.split(',').map((origin) => origin.trim())
      : !isProduction;

  app.enableCors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  if (!isProduction || enableSwagger) {
    const config = new DocumentBuilder()
      .addBearerAuth()
      .setTitle('Google Jobs Scraper')
      .setDescription('Scrape Google Jobs')
      .setVersion('1.1')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      // forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = configService.getOrThrow('PORT');
  await app.listen(port);
}
bootstrap();
