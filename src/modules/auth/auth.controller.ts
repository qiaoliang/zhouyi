import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { SendCodeDto } from './dto/send-code.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { WechatMiniLoginDto } from './dto/wechat-mini-login.dto';
import { WechatAppLoginDto } from './dto/wechat-app-login.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * 认证控制器
 * 处理登录、注册、Token刷新等API
 */
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * 发送验证码
   * POST /api/v1/auth/send-code
   */
  @Public()
  @Post('send-code')
  @UseGuards(ThrottlerGuard)
  async sendCode(@Body() dto: SendCodeDto) {
    const result = await this.authService.sendVerificationCode(dto.phoneNumber);
    return {
      message: '验证码发送成功',
      data: result,
    };
  }

  /**
   * 验证码登录
   * POST /api/v1/auth/login
   */
  @Public()
  @Post('login')
  async login(@Body() dto: VerifyCodeDto) {
    const result = await this.authService.loginWithCode(dto.phoneNumber, dto.code);
    return {
      message: '登录成功',
      data: result,
    };
  }

  /**
   * 刷新Token
   * POST /api/v1/auth/refresh
   */
  @Public()
  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto) {
    const result = await this.authService.refreshToken(dto.refreshToken);
    return {
      message: 'Token刷新成功',
      data: result,
    };
  }

  /**
   * 微信小程序登录
   * POST /api/v1/auth/wechat/mini-login
   */
  @Public()
  @Post('wechat/mini-login')
  async wechatMiniLogin(@Body() dto: WechatMiniLoginDto) {
    const result = await this.authService.loginWithWechatMiniProgram(
      dto.code,
      dto.userInfo,
    );
    return {
      message: '微信登录成功',
      data: result,
    };
  }

  /**
   * 微信APP登录
   * POST /api/v1/auth/wechat/app-login
   */
  @Public()
  @Post('wechat/app-login')
  async wechatAppLogin(@Body() dto: WechatAppLoginDto) {
    const result = await this.authService.loginWithWechatApp(
      dto.code,
      dto.userInfo,
    );
    return {
      message: '微信登录成功',
      data: result,
    };
  }

  /**
   * 登出
   * POST /api/v1/auth/logout
   */
  @Post('logout')
  async logout(@CurrentUser() user: any) {
    // TODO: 实现登出逻辑（Token黑名单）
    return {
      message: '登出成功',
    };
  }
}
