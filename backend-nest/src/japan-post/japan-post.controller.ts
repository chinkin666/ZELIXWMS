// 日本郵便コントローラ / 日本邮便控制器
import { Controller, Get, Post, Body } from '@nestjs/common';
import { JapanPostService } from './japan-post.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';

@Controller('api/japan-post')
export class JapanPostController {
  constructor(private readonly japanPostService: JapanPostService) {}

  // CSV エクスポート（日本郵便フォーマット） / CSV导出（日本邮便格式）
  @Post('export')
  exportCsv(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.japanPostService.exportCsv(tenantId, dto);
  }

  // 追跡番号インポート（日本郵便CSVパース） / 追踪号导入（日本邮便CSV解析）
  @Post('import-tracking')
  importTracking(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.japanPostService.importTracking(tenantId, dto);
  }

  // 送り状種類取得（静的参照データ） / 获取送状类型（静态参考数据）
  @Get('invoice-types')
  getInvoiceTypes() {
    return this.japanPostService.getInvoiceTypes();
  }

  // 日本郵便バリデーション（出荷注文の必須フィールド検証）/ 日本邮便校验（出货订单必填字段验证）
  @Post('validate')
  validate(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.japanPostService.validateShipments(tenantId, dto);
  }

  // 日本郵便印刷ステータス更新（送り状印刷済みマーク）/ 日本邮便打印状态更新（标记送状已打印）
  @Post('print')
  print(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.japanPostService.markAsPrinted(tenantId, dto);
  }
}
