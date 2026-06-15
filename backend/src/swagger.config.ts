import { DocumentBuilder, SwaggerCustomOptions } from '@nestjs/swagger';

export const SWAGGER_OPTIONS: SwaggerCustomOptions = {
  swaggerOptions: { operationsSorter: 'method', tagsSorter: 'alpha' },
};

export function buildSwaggerDocument() {
  return new DocumentBuilder()
    .setTitle('Ludora API')
    .setDescription('API for the Ludora app')
    .setVersion('0.0.1')
    .addBearerAuth(
      {
        bearerFormat: 'JWT',
        description: 'Enter JWT token',
        scheme: 'bearer',
        type: 'http',
      },
      'JWT-auth',
    )
    .build();
}
