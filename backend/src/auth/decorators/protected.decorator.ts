import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

/**
 * Decorator to mark a route as protected
 * - Explicitly applies authentication
 * - Shows the lock in Swagger documentation
 */
export const Protected = () =>
  applyDecorators(
    ApiBearerAuth('JWT-auth'), // Shows lock in Swagger
  );
