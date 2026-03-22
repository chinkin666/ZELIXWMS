// 佐川急便コントローラ / 佐川急便控制器
import { Controller, Get, Post, Put, Body } from '@nestjs/common';
import { SagawaService } from './sagawa.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';

@Controller('api/sagawa')
export class SagawaController {
  constructor(private readonly sagawaService: SagawaService) {}

  // プラグイン設定取得 / 获取插件配置
  @Get('config')
  getConfig() {
    return { billingCode: '', defaultInvoiceType: '0', defaultSize: '80' };
  }

  // プラグイン設定保存 / 保存插件配置
  @Put('config')
  saveConfig(@Body() _dto: Record<string, any>) {
    // 将来的にDB保存を実装 / 将来实装DB保存
    return { message: '設定を保存しました / 设置已保存' };
  }

  // CSV エクスポート（佐川フォーマット） / CSV导出（佐川格式）
  @Post('export')
  exportCsv(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.sagawaService.exportCsv(tenantId, dto);
  }

  // 追跡番号インポート（佐川CSVパース） / 追踪号导入（佐川CSV解析）
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

  // 佐川バリデーション（出荷注文の必須フィールド検証）/ 佐川校验（出货订单必填字段验证）
  @Post('validate')
  validate(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.sagawaService.validateShipments(tenantId, dto);
  }

  // 佐川印刷ステータス更新（送り状印刷済みマーク）/ 佐川打印状态更新（标记送状已打印）
  @Post('print')
  print(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.sagawaService.markAsPrinted(tenantId, dto);
  }
}
