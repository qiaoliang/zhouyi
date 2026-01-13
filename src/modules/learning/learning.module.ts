import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LearningController } from './learning.controller';
import { LearningService } from './learning.service';
import { Course, CourseSchema } from '../../database/schemas/course.schema';
import { LearningProgress, LearningProgressSchema } from '../../database/schemas/learning-progress.schema';

/**
 * 学习模块
 * 提供课程内容和学习进度管理功能
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Course.name, schema: CourseSchema },
      { name: LearningProgress.name, schema: LearningProgressSchema },
    ]),
  ],
  controllers: [LearningController],
  providers: [LearningService],
  exports: [LearningService],
})
export class LearningModule {}
