// 西濃運輸コントローラ / 西浓运输控制器
import { Controller, Get, Post, Body } from '@nestjs/common';
import { SeinoService } from './seino.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';

@Controller('api/seino')
export class SeinoController {
  constructor(private readonly seinoService: SeinoService) {}

  // CSV エクスポート（西濃フォーマット） / CSV导出（西浓格式）
  @Post('export')
  exportCsv(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.seinoService.exportCsv(tenantId, dto);
  }

  // 追跡番号インポート（西濃CSVパース） / 追踪号导入（西浓CSV解析）
  @Post('import-tracking')
  importTracking(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.seinoService.importTracking(tenantId, dto);
  }

  // 送り状種類取得（静的参照データ） / 获取送状类型（静态参考数据）
  @Get('invoice-types')
  getInvoiceTypes() {
    return this.seinoService.getInvoiceTypes();
  }

  // 西濃バリデーション（出荷注文の必須フィールド検証）/ 西浓校验（出货订单必填字段验证）
  @Post('validate')
  validate(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.seinoService.validateShipments(tenantId, dto);
  }

  // 西濃印刷ステータス更新（送り状印刷済みマーク）/ 西浓打印状态更新（标记送状已打印）
  @Post('print')
  print(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.seinoService.markAsPrinted(tenantId, dto);
  }
}
