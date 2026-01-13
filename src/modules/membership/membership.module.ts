import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { SubscriptionGuard, RequireSubscription } from './guards/subscription.guard';
import { UserModule } from '../../services/user/user.module';
import { MembershipService } from './services/membership.service';
import { MockPaymentService } from './services/mock-payment.service';
import { PaymentRetryService } from './services/payment-retry.service';
import { MembershipController } from './membership.controller';
import { OrderSchema } from '../../database/schemas/order.schema';
import { UserSchema } from '../../database/schemas/user.schema';

/**
 * 会员模块
 * 提供会员和订阅相关功能
 */
@Module({
  imports: [
    UserModule,
    MongooseModule.forFeature([
      { name: 'Order', schema: OrderSchema },
      { name: 'User', schema: UserSchema },
    ]),
    ScheduleModule.forRoot(),
  ],
  controllers: [MembershipController],
  providers: [
    SubscriptionGuard,
    MembershipService,
    MockPaymentService,
    PaymentRetryService,
  ],
  exports: [SubscriptionGuard, MembershipService, PaymentRetryService],
})
export class MembershipModule {}
