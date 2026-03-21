// 価格カタログモジュール / 价格目录模块
import { Module } from '@nestjs/common';
import { PriceCatalogsController } from './price-catalogs.controller.js';
import { PriceCatalogsService } from './price-catalogs.service.js';

@Module({
  controllers: [PriceCatalogsController],
  providers: [PriceCatalogsService],
  exports: [PriceCatalogsService],
})
export class PriceCatalogsModule {}
