// WMSスケジュールモジュール / WMS排程模块
import { Module } from '@nestjs/common';
import { WmsSchedulesController } from './wms-schedules.controller.js';
import { WmsSchedulesService } from './wms-schedules.service.js';

@Module({
  controllers: [WmsSchedulesController],
  providers: [WmsSchedulesService],
  exports: [WmsSchedulesService],
})
export class WmsSchedulesModule {}
