import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { DivinationService } from './divination.service';
import { DivinationController } from './divination.controller';
import { HexagramAnalysisService } from './hexagram-analysis.service';
import { InterpretationService } from './interpretation.service';
import { GLMService } from './glm.service';
import { DivinationRecordSchema, DivinationRecord } from '../../database/schemas/divination-record.schema';
import { HexagramSchema } from '../../database/schemas/hexagram.schema';
import { GuestDivinationSchema, GuestDivination } from '../../database/schemas/guest-divination.schema';
import { MembershipModule } from '../membership/membership.module';
import { UserModule } from '../../services/user/user.module';

/**
 * 卜卦模块
 * 提供金钱课起卦、历史记录和详细解卦功能
 */
@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      {
        name: DivinationRecord.name,
        schema: DivinationRecordSchema,
      },
      {
        name: 'Hexagram',
        schema: HexagramSchema,
      },
      {
        name: GuestDivination.name,
        schema: GuestDivinationSchema,
      },
    ]),
    MembershipModule,
    UserModule,
  ],
  controllers: [DivinationController],
  providers: [DivinationService, HexagramAnalysisService, InterpretationService, GLMService],
  exports: [DivinationService, HexagramAnalysisService, InterpretationService, GLMService],
})
export class DivinationModule {}
