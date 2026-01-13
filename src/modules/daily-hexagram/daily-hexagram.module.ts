import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { DailyHexagramController } from './daily-hexagram.controller';
import { DailyHexagramService } from './daily-hexagram.service';
import { DailyHexagramJob } from '../jobs/daily-hexagram.job';
import { DailyHexagram, DailyHexagramSchema } from '../../database/schemas/daily-hexagram.schema';
import { Hexagram, HexagramSchema } from '../../database/schemas/hexagram.schema';

/**
 * 每日一卦模块
 * 提供每日卦象生成和查询功能
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DailyHexagram.name, schema: DailyHexagramSchema },
      { name: Hexagram.name, schema: HexagramSchema },
    ]),
    ScheduleModule.forRoot(), // 启用定时任务
  ],
  controllers: [DailyHexagramController],
  providers: [DailyHexagramService, DailyHexagramJob],
  exports: [DailyHexagramService, DailyHexagramJob],
})
export class DailyHexagramModule {}
