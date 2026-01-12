import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * 当前用户装饰器
 * 从请求中提取当前登录用户信息
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
