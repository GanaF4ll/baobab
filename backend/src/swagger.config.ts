import { DocumentBuilder, SwaggerCustomOptions } from '@nestjs/swagger';

export const AUTH_SWAGGER_TAG = 'Auth';
export const AUTH_SWAGGER_DESCRIPTION = 'Authentication related endpoints for users';

export const SWAGGER_OPTIONS: SwaggerCustomOptions = {
  swaggerOptions: { operationsSorter: 'method', tagsSorter: 'alpha' },
};

export function buildSwaggerDocument() {
  return new DocumentBuilder()
    .setTitle('Baobab API')
    .setDescription('API for the Baobab app')
    .setVersion('0.0.1')
    .addTag(AUTH_SWAGGER_TAG, AUTH_SWAGGER_DESCRIPTION)
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
