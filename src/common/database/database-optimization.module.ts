/**
 * 数据库优化模块
 * 导出所有数据库优化相关的服务和工具
 */

import { Module, Global } from '@nestjs/common';
import { QueryOptimizerService } from './query-optimizer.service';
import { IndexManagerService } from './index-manager.service';

@Global()
@Module({
  providers: [QueryOptimizerService, IndexManagerService],
  exports: [QueryOptimizerService, IndexManagerService],
})
export class DatabaseOptimizationModule {}
