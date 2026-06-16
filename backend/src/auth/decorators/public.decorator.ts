import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator to mark a route as public
 * - Disables the authentication guard
 * - No lock will appear in Swagger (don't use @ApiBearerAuth on the route)
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
