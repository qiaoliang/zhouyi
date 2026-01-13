import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserService } from './user.service';
import { UserSchema } from '../../database/schemas/user.schema';
import { DivinationRecordSchema } from '../../database/schemas/divination-record.schema';
import { LearningProgressSchema } from '../../database/schemas/learning-progress.schema';
import { DailyHexagramSchema } from '../../database/schemas/daily-hexagram.schema';

/**
 * 用户服务模块
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: 'DivinationRecord', schema: DivinationRecordSchema },
      { name: 'LearningProgress', schema: LearningProgressSchema },
      { name: 'DailyHexagram', schema: DailyHexagramSchema },
    ]),
  ],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
