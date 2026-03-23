// 在庫台帳コントローラ / 库存台账控制器
import { Controller, Get, Post, Query } from '@nestjs/common';
import { InventoryLedgerService } from './inventory-ledger.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { RequireRole } from '../common/decorators/require-role.decorator.js';

@Controller('api/inventory-ledger')
@RequireRole('admin', 'manager', 'operator', 'viewer')
export class InventoryLedgerController {
  constructor(private readonly inventoryLedgerService: InventoryLedgerService) {}

  // 在庫台帳一覧取得（ページネーション・フィルタ対応）/ 获取库存台账列表（支持分页・筛选）
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('productId') productId?: string,
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.inventoryLedgerService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      productId,
      type,
      startDate,
      endDate,
    });
  }

  // 在庫台帳サマリー取得 / 获取库存台账汇总
  @Get('summary')
  getSummary(
    @TenantId() tenantId: string,
    @Query('productId') productId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.inventoryLedgerService.getSummary(tenantId, { productId, startDate, endDate });
  }

  // 在庫台帳エクスポート / 库存台账导出
  @Post('export')
  exportLedger(@TenantId() tenantId: string) {
    return this.inventoryLedgerService.exportLedger(tenantId);
  }
}
