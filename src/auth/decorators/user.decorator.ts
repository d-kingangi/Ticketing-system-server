import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const User = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (data) {
      // If specific user data is requested
      return user?.[data];
    }

    // Return the whole user object by default
    return user;
  },
);
