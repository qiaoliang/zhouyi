import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserService } from '../../../services/user/user.service';

/**
 * 是否需要订阅的装饰器标记
 */
export const REQUIRE_SUBSCRIPTION = 'requireSubscription';

/**
 * 需要会员订阅的装饰器
 */
import { SetMetadata } from '@nestjs/common';
export const RequireSubscription = (require: boolean = true) =>
  SetMetadata(REQUIRE_SUBSCRIPTION, require);

/**
 * 会员订阅守卫
 * 检查用户是否有有效的会员订阅
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 检查是否需要订阅
    const requireSubscription = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_SUBSCRIPTION,
      [context.getHandler(), context.getClass()],
    );

    // 如果不需要订阅，直接通过
    if (!requireSubscription) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 如果没有用户信息，抛出未授权异常
    if (!user || !user.userId) {
      throw new ForbiddenException({
        code: 'SUBSCRIPTION_REQUIRED',
        message: '此功能需要会员订阅',
        requireAction: 'subscribe',
      });
    }

    // 检查用户是否有有效订阅
    const hasSubscription = await this.checkUserSubscription(user.userId);

    if (!hasSubscription) {
      throw new ForbiddenException({
        code: 'SUBSCRIPTION_REQUIRED',
        message: '此功能需要会员订阅，请先订阅',
        requireAction: 'subscribe',
      });
    }

    return true;
  }

  /**
   * 检查用户订阅状态
   */
  private async checkUserSubscription(userId: string): Promise<boolean> {
    try {
      const user = await this.userService.findById(userId);

      if (!user) {
        return false;
      }

      // 检查是否有有效的会员订阅
      if (user.membership && user.membership.type !== 'free') {
        // 检查订阅是否过期
        if (user.membership.expireAt && new Date(user.membership.expireAt) > new Date()) {
          return true;
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }
}
