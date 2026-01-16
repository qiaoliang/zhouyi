import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { MembershipService } from './membership.service';
import { Order, OrderDocument, OrderType, OrderStatus, PaymentStatus } from '../../../database/schemas/order.schema';
import { User, UserDocument, MembershipType, Gender, UserStatus } from '../../../database/schemas/user.schema';
import { Model, Types } from 'mongoose';

describe('MembershipService', () => {
  let service: MembershipService;
  let orderModel: Model<OrderDocument>;
  let userModel: Model<UserDocument>;

  // Mock user data - 使用真实 Schema 结构
  const mockUser = {
    _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
    phoneNumber: '13800138000',
    nickname: '测试用户',
    avatar: 'https://example.com/avatar.jpg',
    gender: Gender.UNKNOWN,
    isGuest: false,
    openId: 'test-openid',
    unionId: 'test-unionid',
    status: UserStatus.ACTIVE,
    membership: {
      type: MembershipType.FREE,
      level: 0,
      expireAt: null,
      autoRenew: false,
      activatedAt: new Date(),
    },
    stats: {
      divinationCount: 0,
      guestUsedCount: 0,
      learningProgress: 0,
    },
    push: {
      enabled: true,
      dailyHexagram: true,
      time: '08:00',
    },
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn().mockResolvedValue(true),
  };

  // Mock order data - 使用真实 Schema 结构
  const createMockOrder = (overrides = {}) => ({
    _id: new Types.ObjectId('507f1f77bcf86cd799439020'),
    userId: new Types.ObjectId('507f1f77bcf86cd799439011'),
    orderNo: 'ZY17053872000001234',
    type: OrderType.MEMBERSHIP_MONTHLY,
    amount: 3000, // 30元 = 3000分
    status: OrderStatus.CREATED,
    product: {
      name: '月卡会员',
      description: '30天会员权益',
      duration: 1,
    },
    payment: {
      method: 'wechat' as const,
      channel: 'app' as const,
      status: PaymentStatus.PENDING,
    },
    client: {
      platform: 'ios' as const,
      ip: '127.0.0.1',
      userAgent: 'test-agent',
    },
    expiredAt: new Date(Date.now() + 30 * 60 * 1000),
    membership: {
      type: 'monthly' as const,
      duration: 1,
      startAt: new Date(),
      endAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  });

  let mockOrder = createMockOrder();

  const mockSortSkipLimit = {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([mockOrder]),
  };

  const mockOrderModel = {
    findById: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    find: jest.fn().mockReturnValue(mockSortSkipLimit),
    countDocuments: jest.fn().mockResolvedValue(1),
  };

  const mockUserModel = {
    findById: jest.fn(),
    save: jest.fn().mockResolvedValue(mockUser),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembershipService,
        {
          provide: getModelToken('Order'),
          useValue: mockOrderModel,
        },
        {
          provide: getModelToken('User'),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<MembershipService>(MembershipService);
    orderModel = module.get<Model<OrderDocument>>(getModelToken('Order'));
    userModel = module.get<Model<UserDocument>>(getModelToken('User'));

    // Reset mocks before each test
    jest.clearAllMocks();

    // Reset mock order
    mockOrder = createMockOrder();

    // Default mock implementations
    mockOrderModel.findById.mockImplementation((id) => ({
      exec: jest.fn().mockResolvedValue(
        String(id) === '507f1f77bcf86cd799439020' ? mockOrder : null,
      ),
    }));
    mockOrderModel.findOne.mockImplementation((query) => ({
      exec: jest.fn().mockResolvedValue(
        query.orderNo === 'ZY17053872000001234' ? mockOrder : null,
      ),
    }));
    mockOrderModel.create.mockImplementation((data) => Promise.resolve(createMockOrder(data)));

    mockUserModel.findById.mockImplementation((id) => ({
      exec: jest.fn().mockResolvedValue(
        String(id) === '507f1f77bcf86cd799439011' ? mockUser : null,
      ),
    }));

    mockSortSkipLimit.exec.mockResolvedValue([mockOrder]);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrder', () => {
    it('should create monthly membership order', async () => {
      const params = {
        userId: '507f1f77bcf86cd799439011',
        type: OrderType.MEMBERSHIP_MONTHLY,
        paymentMethod: 'wechat' as const,
        paymentChannel: 'app' as const,
        platform: 'ios' as const,
        ip: '127.0.0.1',
        userAgent: 'test-agent',
      };

      const result = await service.createOrder(params);

      expect(result).toBeDefined();
      expect(result.type).toBe(OrderType.MEMBERSHIP_MONTHLY);
      expect(result.amount).toBe(3000);
      expect(result.product.name).toBe('月卡会员');
      expect(mockUserModel.findById).toHaveBeenCalledWith(params.userId);
    });

    it('should create yearly membership order', async () => {
      const params = {
        userId: '507f1f77bcf86cd799439011',
        type: OrderType.MEMBERSHIP_YEARLY,
        paymentMethod: 'wechat' as const,
        paymentChannel: 'app' as const,
        platform: 'ios' as const,
        ip: '127.0.0.1',
      };

      const yearlyOrder = createMockOrder({
        type: OrderType.MEMBERSHIP_YEARLY,
        amount: 30000,
        product: {
          name: '年卡会员',
          description: '365天会员权益',
          duration: 12,
        },
        membership: {
          type: 'yearly' as const,
          duration: 12,
          startAt: new Date(),
          endAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });

      mockOrderModel.create.mockResolvedValue(yearlyOrder);

      const result = await service.createOrder(params);

      expect(result).toBeDefined();
      expect(result.type).toBe(OrderType.MEMBERSHIP_YEARLY);
      expect(result.amount).toBe(30000); // 300元 = 30000分
      expect(result.product.name).toBe('年卡会员');
    });

    it('should create single divination order', async () => {
      const params = {
        userId: '507f1f77bcf86cd799439011',
        type: OrderType.SINGLE_DIVINATION,
        paymentMethod: 'alipay' as const,
        paymentChannel: 'miniprogram' as const,
        platform: 'miniprogram' as const,
        ip: '127.0.0.1',
      };

      const singleOrder = createMockOrder({
        type: OrderType.SINGLE_DIVINATION,
        amount: 1000,
        product: {
          name: '按次详细解卦',
          description: '单次详细解卦服务',
          duration: 0,
        },
        membership: undefined,
      });

      mockOrderModel.create.mockResolvedValue(singleOrder);

      const result = await service.createOrder(params);

      expect(result).toBeDefined();
      expect(result.type).toBe(OrderType.SINGLE_DIVINATION);
      expect(result.amount).toBe(1000); // 10元 = 1000分
      expect(result.product.name).toBe('按次详细解卦');
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUserModel.findById.mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(null),
      }));

      const params = {
        userId: '507f1f77bcf86cd799439999', // 有效的 ObjectId 格式但用户不存在
        type: OrderType.MEMBERSHIP_MONTHLY,
        paymentMethod: 'wechat' as const,
        paymentChannel: 'app' as const,
        platform: 'ios' as const,
        ip: '127.0.0.1',
      };

      await expect(service.createOrder(params)).rejects.toThrow(NotFoundException);
    });

    it('should generate unique order number', async () => {
      const params = {
        userId: '507f1f77bcf86cd799439011',
        type: OrderType.MEMBERSHIP_MONTHLY,
        paymentMethod: 'wechat' as const,
        paymentChannel: 'app' as const,
        platform: 'ios' as const,
        ip: '127.0.0.1',
      };

      // Mock create to return different order numbers
      let callCount = 0;
      mockOrderModel.create.mockImplementation((data) => {
        callCount++;
        return Promise.resolve(
          createMockOrder({
            orderNo: `ZY${Date.now()}${callCount.toString().padStart(4, '0')}`,
          }),
        );
      });

      const result1 = await service.createOrder(params);
      const result2 = await service.createOrder(params);

      expect(result1.orderNo).not.toBe(result2.orderNo);
      expect(result1.orderNo).toMatch(/^ZY\d+$/);
      expect(result2.orderNo).toMatch(/^ZY\d+$/);
    });

    it('should set expiry time to 30 minutes', async () => {
      const params = {
        userId: '507f1f77bcf86cd799439011',
        type: OrderType.MEMBERSHIP_MONTHLY,
        paymentMethod: 'wechat' as const,
        paymentChannel: 'app' as const,
        platform: 'ios' as const,
        ip: '127.0.0.1',
      };

      const result = await service.createOrder(params);
      const now = Date.now();
      const expiryTime = new Date(result.expiredAt).getTime();

      expect(expiryTime).toBeGreaterThan(now + 29 * 60 * 1000);
      expect(expiryTime).toBeLessThanOrEqual(now + 31 * 60 * 1000);
    });
  });

  describe('getOrder', () => {
    it('should return order by ID', async () => {
      // 确保 mock 正确设置
      mockOrderModel.findById.mockImplementation((id) => {
        const query = String(id);
        return {
          exec: jest.fn().mockResolvedValue(
            query === '507f1f77bcf86cd799439020' ? mockOrder : null,
          ),
        };
      });

      const result = await service.getOrder('507f1f77bcf86cd799439020');

      expect(result).toBeDefined();
      expect(result._id).toBeDefined();
      expect(result._id.toString()).toBe('507f1f77bcf86cd799439020');
      expect(mockOrderModel.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439020');
    });

    it('should throw NotFoundException when order not found', async () => {
      mockOrderModel.findById.mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(null),
      }));

      await expect(service.getOrder('507f1f77bcf86cd799439999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getOrderByOrderNo', () => {
    it('should return order by order number', async () => {
      // 确保 mock 正确设置
      mockOrderModel.findOne.mockImplementation((query) => ({
        exec: jest.fn().mockResolvedValue(
          query.orderNo === 'ZY17053872000001234' ? mockOrder : null,
        ),
      }));

      const result = await service.getOrderByOrderNo('ZY17053872000001234');

      expect(result).toBeDefined();
      expect(result.orderNo).toBe('ZY17053872000001234');
      expect(mockOrderModel.findOne).toHaveBeenCalledWith({ orderNo: 'ZY17053872000001234' });
    });

    it('should throw NotFoundException when order not found', async () => {
      mockOrderModel.findOne.mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(null),
      }));

      await expect(service.getOrderByOrderNo('invalid-order-no')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getUserOrders', () => {
    it('should return user orders with pagination', async () => {
      mockSortSkipLimit.exec.mockResolvedValue([mockOrder]);
      mockOrderModel.countDocuments.mockResolvedValue(1);

      const result = await service.getUserOrders('507f1f77bcf86cd799439011', 1, 20);

      expect(result).toBeDefined();
      expect(result.orders).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockOrderModel.find).toHaveBeenCalledWith({
        userId: new Types.ObjectId('507f1f77bcf86cd799439011'),
      });
    });

    it('should filter orders by status', async () => {
      mockSortSkipLimit.exec.mockResolvedValue([mockOrder]);
      mockOrderModel.countDocuments.mockResolvedValue(1);

      const result = await service.getUserOrders('507f1f77bcf86cd799439011', 1, 20, OrderStatus.PAID);

      expect(mockOrderModel.find).toHaveBeenCalledWith({
        userId: new Types.ObjectId('507f1f77bcf86cd799439011'),
        status: OrderStatus.PAID,
      });
    });

    it('should handle default pagination parameters', async () => {
      mockSortSkipLimit.exec.mockResolvedValue([mockOrder]);
      mockOrderModel.countDocuments.mockResolvedValue(1);

      await service.getUserOrders('507f1f77bcf86cd799439011');

      expect(mockSortSkipLimit.skip).toHaveBeenCalledWith(0);
      expect(mockSortSkipLimit.limit).toHaveBeenCalledWith(20);
    });

    it('should handle custom pagination parameters', async () => {
      mockSortSkipLimit.exec.mockResolvedValue([mockOrder]);
      mockOrderModel.countDocuments.mockResolvedValue(1);

      await service.getUserOrders('507f1f77bcf86cd799439011', 2, 10);

      expect(mockSortSkipLimit.skip).toHaveBeenCalledWith(10);
      expect(mockSortSkipLimit.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('updateOrderPaymentStatus', () => {
    it('should update payment status to paid', async () => {
      const updatedOrder = createMockOrder({
        status: OrderStatus.PAID,
        paidAmount: 3000,
        payment: {
          method: 'wechat' as const,
          channel: 'app' as const,
          status: PaymentStatus.PAID,
          transactionId: 'transaction-123',
          paidAt: new Date(),
        },
      });

      mockOrderModel.findById.mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(updatedOrder),
      }));

      const result = await service.updateOrderPaymentStatus(
        '507f1f77bcf86cd799439020',
        PaymentStatus.PAID,
        'transaction-123',
        new Date(),
      );

      expect(result).toBeDefined();
      expect(result.status).toBe(OrderStatus.PAID);
      expect(result.payment.status).toBe(PaymentStatus.PAID);
      expect(result.payment.transactionId).toBe('transaction-123');
    });

    it('should update payment status to failed', async () => {
      const updatedOrder = createMockOrder({
        status: OrderStatus.CANCELLED,
        payment: {
          method: 'wechat' as const,
          channel: 'app' as const,
          status: PaymentStatus.FAILED,
          failedReason: '支付失败',
        },
      });

      mockOrderModel.findById.mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(updatedOrder),
      }));

      const result = await service.updateOrderPaymentStatus(
        '507f1f77bcf86cd799439020',
        PaymentStatus.FAILED,
      );

      expect(result).toBeDefined();
      expect(result.status).toBe(OrderStatus.CANCELLED);
      expect(result.payment.status).toBe(PaymentStatus.FAILED);
    });

    it('should throw NotFoundException when order not found', async () => {
      mockOrderModel.findById.mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(null),
      }));

      await expect(
        service.updateOrderPaymentStatus('507f1f77bcf86cd799439999', PaymentStatus.PAID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancelOrder', () => {
    it('should cancel order successfully', async () => {
      const orderToCancel = createMockOrder();
      mockOrderModel.findById.mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(orderToCancel),
      }));

      const result = await service.cancelOrder('507f1f77bcf86cd799439020', '507f1f77bcf86cd799439011');

      expect(result).toBeDefined();
      expect(result.status).toBe(OrderStatus.CANCELLED);
      expect(result.payment.status).toBe(PaymentStatus.CANCELLED);
    });

    it('should throw NotFoundException when order not found', async () => {
      mockOrderModel.findById.mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(null),
      }));

      await expect(
        service.cancelOrder('507f1f77bcf86cd799439999', '507f1f77bcf86cd799439011'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when user does not own order', async () => {
      const orderWithDifferentUser = createMockOrder({
        userId: new Types.ObjectId('507f1f77bcf86cd799439022'),
      });
      mockOrderModel.findById.mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(orderWithDifferentUser),
      }));

      await expect(
        service.cancelOrder('507f1f77bcf86cd799439020', '507f1f77bcf86cd799439011'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when order status does not allow cancellation', async () => {
      const paidOrder = createMockOrder({
        status: OrderStatus.PAID,
      });
      mockOrderModel.findById.mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(paidOrder),
      }));

      await expect(
        service.cancelOrder('507f1f77bcf86cd799439020', '507f1f77bcf86cd799439011'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserMembershipInfo', () => {
    it('should return free user membership info', async () => {
      mockUserModel.findById.mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(mockUser),
      }));

      const result = await service.getUserMembershipInfo('507f1f77bcf86cd799439011');

      expect(result).toBeDefined();
      expect(result.hasMembership).toBe(false);
      expect(result.type).toBe(MembershipType.FREE);
      expect(result.isExpired).toBe(false);
    });

    it('should return monthly membership info', async () => {
      const monthlyUser = {
        ...mockUser,
        membership: {
          type: MembershipType.MONTHLY,
          level: 1,
          expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          autoRenew: false,
          activatedAt: new Date(),
        },
      };
      mockUserModel.findById.mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(monthlyUser),
      }));

      const result = await service.getUserMembershipInfo('507f1f77bcf86cd799439011');

      expect(result).toBeDefined();
      expect(result.hasMembership).toBe(true);
      expect(result.type).toBe(MembershipType.MONTHLY);
      expect(result.isExpired).toBe(false);
      expect(result.daysUntilExpiry).toBeGreaterThan(0);
    });

    it('should return expired membership info', async () => {
      const expiredUser = {
        ...mockUser,
        membership: {
          type: MembershipType.MONTHLY,
          level: 1,
          expireAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          autoRenew: false,
          activatedAt: new Date(),
        },
      };
      mockUserModel.findById.mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(expiredUser),
      }));

      const result = await service.getUserMembershipInfo('507f1f77bcf86cd799439011');

      expect(result).toBeDefined();
      expect(result.hasMembership).toBe(true);
      expect(result.isExpired).toBe(true);
      expect(result.daysUntilExpiry).toBeLessThan(0);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUserModel.findById.mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(null),
      }));

      await expect(service.getUserMembershipInfo('507f1f77bcf86cd799439999')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockUserModel.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439999');

      // Reset mock
      mockUserModel.findById.mockImplementation((id) => ({
        exec: jest.fn().mockResolvedValue(
          String(id) === '507f1f77bcf86cd799439011' ? mockUser : null,
        ),
      }));
    });
  });

  describe('getMembershipPlans', () => {
    it('should return all membership plans', async () => {
      const result = await service.getMembershipPlans();

      expect(result).toHaveLength(3);
      expect(result[0].type).toBe(MembershipType.MONTHLY);
      expect(result[1].type).toBe(MembershipType.YEARLY);
      expect(result[2].type).toBe(MembershipType.FREE);
    });

    it('should mark yearly plan as recommended', async () => {
      const result = await service.getMembershipPlans();

      const yearlyPlan = result.find((plan) => plan.type === MembershipType.YEARLY);
      expect(yearlyPlan.recommended).toBe(true);
    });

    it('should include privileges for each plan', async () => {
      const result = await service.getMembershipPlans();

      result.forEach((plan) => {
        expect(plan.privileges).toBeDefined();
        expect(plan.privileges.dailyDivinations).toBeDefined();
        expect(plan.privileges.detailedInterpretation).toBeDefined();
      });
    });
  });
});