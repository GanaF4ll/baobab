import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { users } from 'src/drizzle/schema';

export const CurrentUser = createParamDecorator(
  (data: keyof typeof users | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: typeof users.$inferSelect = request.user;
    return data ? user[data] : user;
  },
);
