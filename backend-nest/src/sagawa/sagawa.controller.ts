// 佐川急便コントローラ / 佐川急便控制器
import { Controller, Get, Post, Body } from '@nestjs/common';
import { SagawaService } from './sagawa.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';

@Controller('api/sagawa')
export class SagawaController {
  constructor(private readonly sagawaService: SagawaService) {}

  // CSV エクスポート（プレースホルダー） / CSV导出（占位符）
  @Post('export')
  exportCsv(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.sagawaService.exportCsv(tenantId, dto);
  }

  // 追跡番号インポート（プレースホルダー） / 追踪号导入（占位符）
  @Post('import-tracking')
  importTracking(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.sagawaService.importTracking(tenantId, dto);
  }

  // 送り状種類取得（静的参照データ） / 获取送状类型（静态参考数据）
  @Get('invoice-types')
  getInvoiceTypes() {
    return this.sagawaService.getInvoiceTypes();
  }

  // 佐川バリデーション（プレースホルダー）/ 佐川校验（占位符）
  @Post('validate')
  validate(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, any>,
  ) {
    return { message: 'Not implemented yet / 未実装 / 尚未实现', status: 'placeholder' };
  }

  // 佐川印刷（プレースホルダー）/ 佐川打印（占位符）
  @Post('print')
  print(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, any>,
  ) {
    return { message: 'Not implemented yet / 未実装 / 尚未实现', status: 'placeholder' };
  }
}
