import { writeFileSync } from 'node:fs';
import * as path from 'node:path';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import { buildSwaggerDocument } from '../src/swagger.config';

async function generateSwagger() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    logger: false,
    preview: true,
  });

  const document = SwaggerModule.createDocument(app, buildSwaggerDocument());
  const outputPath = path.resolve(__dirname, '..', 'swagger.json');
  writeFileSync(outputPath, JSON.stringify(document, null, 2));

  await app.close();
  console.log(`✅ swagger.json generated successfully at ${outputPath}`);
}

generateSwagger().catch((err) => {
  console.error('❌ Failed to generate swagger.json:', err);
  process.exit(1);
});
