import contentParser from '@fastify/multipart';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
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
  const frontendUrl = process.env.FRONTEND_URL;
  const allowedOrigins = ['http://localhost:3000', 'http://localhost:4200', frontendUrl ?? ''];

  const document = SwaggerModule.createDocument(app, buildSwaggerDocument());
  SwaggerModule.setup('swagger', app, document, SWAGGER_OPTIONS);
  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });

  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? '0.0.0.0';
  await app.listen({ host, port });
}
bootstrap();
