import { SetMetadata } from '@nestjs/common';

/**
 * 公开路由装饰器
 * 标记路由为公开（不需要认证）
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
