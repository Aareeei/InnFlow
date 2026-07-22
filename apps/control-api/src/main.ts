import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { loadConfig } from '@innflow/config';
import { createLogger, initTracing, shutdownTracing } from '@innflow/telemetry';
import { AppModule } from './app.module';
import { RedisService } from './redis/redis.service';

async function bootstrap(): Promise<void> {
  initTracing('control-api');
  const config = loadConfig();
  const logger = createLogger('control-api');

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  app.use(helmet());
  app.enableCors({
    origin: config.CORS_ORIGINS.split(',').map((origin) => origin.trim()),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('InnFlow Control API')
    .setDescription('Operations control plane for autonomous hotel operations')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  app.enableShutdownHooks();

  const redis = app.get(RedisService);
  await redis.connect();

  const port = config.PORT_CONTROL_API;
  await app.listen(port);
  logger.info({ port }, 'Control API listening');

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down control API');
    await app.close();
    await shutdownTracing();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((error: unknown) => {
  console.error('Failed to start control API', error);
  process.exit(1);
});
