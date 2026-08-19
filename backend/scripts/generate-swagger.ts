import * as fs from 'node:fs';
import * as path from 'node:path';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import { buildSwaggerDocument } from '../src/swagger.config';

async function generateSwagger() {
  // Create the app without initializing providers (lazyInit = true)
  // This avoids needing database connections or external services
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    logger: false,
    preview: true,
  });

  // init() scans controllers/decorators for Swagger metadata without connecting to DB
  await app.init();

  const document = SwaggerModule.createDocument(app, buildSwaggerDocument());

  const outputPath = path.resolve(__dirname, '..', 'swagger.json');
  fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));

  console.log(`✅ swagger.json generated at ${outputPath}`);

  await app.close();
  process.exit(0);
}

generateSwagger();
