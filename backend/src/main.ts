import { NestFactory } from '@nestjs/core';
import contentParser from '@fastify/multipart';

import { AppModule } from './app.module';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { buildSwaggerDocument, SWAGGER_OPTIONS } from './swagger.config';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    rawBody: true,
  });
  await app.register(contentParser, { limits: { fileSize: 10 * 1024 * 1024 } });

  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );

  const document = SwaggerModule.createDocument(app, buildSwaggerDocument());
  SwaggerModule.setup('swagger', app, document, SWAGGER_OPTIONS);
  app.enableCors();

  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? '0.0.0.0';
  await app.listen({ host, port });
}
bootstrap();
