import { DocumentBuilder, SwaggerCustomOptions } from '@nestjs/swagger';

export const AUTH_SWAGGER_TAG = 'Auth';
export const AUTH_SWAGGER_DESCRIPTION = 'Authentication related endpoints for users';

export const DOCUMENTS_SWAGGER_TAG = 'Documents';
export const DOCUMENTS_SWAGGER_DESCRIPTION =
  'Endpoints for documents management for a user, including uploads, retrieval, and deletion of documents';

export const CONVERSATIONS_SWAGGER_TAG = 'Conversations';
export const CONVERSATIONS_SWAGGER_DESCRIPTION =
  'Endpoints for conversations management for a user, including creation, retrieval, and deletion of conversations';

export const WORKSPACES_SWAGGER_TAG = 'Workspaces';
export const WORKSPACES_SWAGGER_DESCRIPTION =
  'Endpoints for workspaces management for a user, including creation, retrieval, and deletion of workspaces';

export const SWAGGER_OPTIONS: SwaggerCustomOptions = {
  swaggerOptions: { operationsSorter: 'method', tagsSorter: 'alpha' },
};

export function buildSwaggerDocument() {
  return new DocumentBuilder()
    .setTitle('Baobab API')
    .setDescription('API for the Baobab app')
    .setVersion('0.0.1')
    .addTag(AUTH_SWAGGER_TAG, AUTH_SWAGGER_DESCRIPTION)
    .addTag(DOCUMENTS_SWAGGER_TAG, DOCUMENTS_SWAGGER_DESCRIPTION)
    .addTag(CONVERSATIONS_SWAGGER_TAG, CONVERSATIONS_SWAGGER_DESCRIPTION)
    .addTag(WORKSPACES_SWAGGER_TAG, WORKSPACES_SWAGGER_DESCRIPTION)
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
