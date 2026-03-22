// 棚卸差異モジュール / 盘点差异管理模块
import { Module } from '@nestjs/common';
import { StocktakingDiscrepanciesController } from './stocktaking-discrepancies.controller.js';
import { StocktakingDiscrepanciesService } from './stocktaking-discrepancies.service.js';

@Module({
  controllers: [StocktakingDiscrepanciesController],
  providers: [StocktakingDiscrepanciesService],
  exports: [StocktakingDiscrepanciesService],
})
export class StocktakingDiscrepanciesModule {}
