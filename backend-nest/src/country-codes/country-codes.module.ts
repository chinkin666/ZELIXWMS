// 国コード管理モジュール / 国家代码管理模块
import { Module } from '@nestjs/common';
import { CountryCodesController } from './country-codes.controller.js';
import { CountryCodesService } from './country-codes.service.js';

@Module({
  controllers: [CountryCodesController],
  providers: [CountryCodesService],
  exports: [CountryCodesService],
})
export class CountryCodesModule {}
