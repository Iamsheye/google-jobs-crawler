import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CurrentUser } from 'src/types/user';

export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: CurrentUser & {
      hashedPassword: string;
    } = request.user;

    delete user.hashedPassword;

    return data ? user?.[data] : (user as CurrentUser);
  },
);
