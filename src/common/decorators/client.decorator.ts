import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const Client = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    if (data) {
      // If specific client data is requested
      return request.clientContext?.[data];
    }

    // Return clientId by default
    return request.clientId;
  },
);
