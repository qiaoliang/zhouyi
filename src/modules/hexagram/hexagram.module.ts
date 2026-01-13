import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HexagramController } from './hexagram.controller';
import { HexagramService } from './hexagram.service';
import { Hexagram, HexagramSchema } from '../../database/schemas/hexagram.schema';

/**
 * 卦象模块
 * 提供六十四卦数据查询功能
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Hexagram', schema: HexagramSchema },
    ]),
  ],
  controllers: [HexagramController],
  providers: [HexagramService],
  exports: [HexagramService],
})
export class HexagramModule {}
