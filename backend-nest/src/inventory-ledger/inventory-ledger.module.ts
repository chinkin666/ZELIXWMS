// 在庫台帳モジュール / 库存台账模块
import { Module } from '@nestjs/common';
import { InventoryLedgerController } from './inventory-ledger.controller.js';
import { InventoryLedgerService } from './inventory-ledger.service.js';

@Module({
  controllers: [InventoryLedgerController],
  providers: [InventoryLedgerService],
  exports: [InventoryLedgerService],
})
export class InventoryLedgerModule {}
