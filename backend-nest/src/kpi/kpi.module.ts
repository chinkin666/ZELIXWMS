// KPIモジュール（読み取り専用分析）/ KPI模块（只读分析）
import { Module } from '@nestjs/common';
import { KpiController } from './kpi.controller.js';
import { KpiService } from './kpi.service.js';

@Module({
  controllers: [KpiController],
  providers: [KpiService],
  exports: [KpiService],
})
export class KpiModule {}
