import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MembershipService } from './services/membership.service';
import { MockPaymentService, MockPaymentScenario } from './services/mock-payment.service';
import {
  CreateOrderDto,
  OrderResponseDto,
  QueryOrdersDto,
  UserMembershipResponseDto,
  MembershipPlanDto,
} from './dto/membership.dto';

@ApiTags('会员管理')
@Controller('membership')
export class MembershipController {
  constructor(
    private readonly membershipService: MembershipService,
    private readonly mockPaymentService: MockPaymentService,
  ) {}

  /**
   * 获取会员套餐列表
   */
  @Get('plans')
  @ApiOperation({ summary: '获取会员套餐列表' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: [MembershipPlanDto],
  })
  async getPlans(): Promise<MembershipPlanDto[]> {
    return await this.membershipService.getMembershipPlans();
  }

  /**
   * 创建会员订单
   */
  @Post('orders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建会员订单' })
  @ApiResponse({
    status: 201,
    description: '订单创建成功',
    type: OrderResponseDto,
  })
  async createOrder(
    @Request() req,
    @Body() createOrderDto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    const order = await this.membershipService.createOrder({
      userId: req.user.userId,
      type: createOrderDto.type,
      paymentMethod: createOrderDto.paymentMethod || 'wechat',
      paymentChannel: 'app',
      platform: 'ios',
      ip: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'],
    });

    return this.mapOrderToResponse(order);
  }

  /**
   * 获取订单详情
   */
  @Get('orders/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取订单详情' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: OrderResponseDto,
  })
  async getOrder(@Param('orderId') orderId: string): Promise<OrderResponseDto> {
    const order = await this.membershipService.getOrder(orderId);
    return this.mapOrderToResponse(order);
  }

  /**
   * 获取用户订单列表
   */
  @Get('orders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取用户订单列表' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: [OrderResponseDto],
  })
  async getUserOrders(
    @Request() req,
    @Query() query: QueryOrdersDto,
  ): Promise<{ orders: OrderResponseDto[]; total: number }> {
    const { orders, total } = await this.membershipService.getUserOrders(
      req.user.userId,
      query.page || 1,
      query.limit || 20,
      query.status as any,
    );

    return {
      orders: orders.map(order => this.mapOrderToResponse(order)),
      total,
    };
  }

  /**
   * 取消订单
   */
  @Post('orders/:orderId/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '取消订单' })
  @ApiResponse({
    status: 200,
    description: '订单取消成功',
    type: OrderResponseDto,
  })
  async cancelOrder(@Request() req, @Param('orderId') orderId: string): Promise<OrderResponseDto> {
    const order = await this.membershipService.cancelOrder(orderId, req.user.userId);
    return this.mapOrderToResponse(order);
  }

  /**
   * 获取用户会员信息
   */
  @Get('info')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取用户会员信息' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: UserMembershipResponseDto,
  })
  async getUserMembership(@Request() req): Promise<UserMembershipResponseDto> {
    const info = await this.membershipService.getUserMembershipInfo(req.user.userId);

    return {
      hasMembership: info.hasMembership,
      type: info.type,
      expireAt: info.expireAt,
      privileges: info.privileges,
      isExpired: info.isExpired,
      daysUntilExpiry: info.daysUntilExpiry,
      autoRenew: false, // TODO: 从用户数据中获取
    };
  }

  /**
   * 发起模拟支付
   */
  @Post('payments/mock')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '发起模拟支付（仅开发环境）' })
  @ApiResponse({
    status: 200,
    description: '支付发起成功',
  })
  async initiateMockPayment(
    @Body() body: {
      orderId: string;
      scenario?: MockPaymentScenario;
      delay?: number;
      autoConfirm?: boolean;
    },
  ) {
    const result = await this.mockPaymentService.initiatePayment({
      orderId: body.orderId,
      scenario: body.scenario,
      delay: body.delay,
      autoConfirm: body.autoConfirm ?? true,
    });

    return {
      paymentId: result.paymentId,
      scenario: result.scenario,
      estimatedDelay: result.estimatedDelay,
      message: result.message,
      note: '这是模拟支付，仅用于开发测试',
    };
  }

  /**
   * 确认模拟支付
   */
  @Post('payments/mock/:paymentId/confirm')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '确认模拟支付（仅开发环境）' })
  @ApiResponse({
    status: 200,
    description: '支付确认成功',
  })
  async confirmMockPayment(@Param('paymentId') paymentId: string) {
    const result = await this.mockPaymentService.confirmPayment(paymentId);

    return {
      success: result.success,
      orderId: result.orderId,
      transactionId: result.transactionId,
      status: result.status,
      message: result.message,
      paidAt: result.paidAt,
    };
  }

  /**
   * 取消模拟支付
   */
  @Post('payments/mock/:paymentId/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '取消模拟支付（仅开发环境）' })
  @ApiResponse({
    status: 200,
    description: '支付取消成功',
  })
  async cancelMockPayment(@Param('paymentId') paymentId: string) {
    const result = await this.mockPaymentService.cancelPayment(paymentId);

    return {
      success: result.success,
      orderId: result.orderId,
      status: result.status,
      message: result.message,
    };
  }

  /**
   * 获取模拟支付状态（仅用于开发调试）
   */
  @Get('payments/mock/:paymentId/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取模拟支付状态（仅开发环境）' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
  })
  getMockPaymentStatus(@Param('paymentId') paymentId: string) {
    return this.mockPaymentService.getPaymentStatus(paymentId);
  }

  /**
   * 获取待处理支付列表（仅用于开发调试）
   */
  @Get('payments/mock/pending')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取待处理支付列表（仅开发环境）' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
  })
  getPendingMockPayments() {
    return this.mockPaymentService.getPendingPayments();
  }

  /**
   * 设置开发者模式（仅用于开发调试）
   */
  @Post('payments/mock/developer-mode')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '设置开发者模式（仅开发环境）' })
  @ApiResponse({
    status: 200,
    description: '设置成功',
  })
  setDeveloperMode(@Body() body: { enabled: boolean; scenario?: MockPaymentScenario }) {
    this.mockPaymentService.setDeveloperMode(body.enabled, body.scenario);

    return {
      message: '开发者模式设置成功',
      enabled: body.enabled,
      scenario: body.scenario,
    };
  }

  /**
   * 将订单实体映射为响应DTO
   */
  private mapOrderToResponse(order: any): OrderResponseDto {
    return {
      id: order._id?.toString() || order.id,
      userId: order.userId?.toString() || order.userId,
      type: order.type,
      amount: order.amount / 100, // 转换为元
      status: order.status,
      createdAt: order.createdAt,
      paidAt: order.paidAt,
      expiresAt: order.expiredAt,
      paymentMethod: order.payment?.method,
      transactionId: order.payment?.transactionId,
    };
  }
}
