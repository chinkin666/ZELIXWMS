// 佐川急便サービス / 佐川急便服务
// プレースホルダー実装 / 占位符实现
import { Injectable } from '@nestjs/common';

// 佐川急便の送り状種類（静的参照データ） / 佐川急便送状类型（静态参考数据）
const INVOICE_TYPES = [
  { code: '0', name: '元払い / 到付', description: '通常の元払い発送 / 普通到付发货' },
  { code: '2', name: '着払い / 货到付款', description: '着払い発送 / 货到付款发货' },
  { code: '3', name: 'ネコポス / 飞脚宅配便', description: '飛脚宅配便 / 飞脚宅配便' },
  { code: '4', name: '飛脚メール便 / 飞脚邮件便', description: '飛脚メール便 / 飞脚邮件便' },
];

@Injectable()
export class SagawaService {
  // CSVエクスポート（プレースホルダー） / CSV导出（占位符）
  async exportCsv(tenantId: string, dto: Record<string, any>) {
    // TODO: 佐川CSV出力実装 / 佐川CSV输出实现
    return {
      message: 'CSV export placeholder / CSVエクスポートプレースホルダー / CSV导出占位符',
      tenantId,
      shipmentIds: dto.shipmentIds ?? [],
      exportedAt: new Date(),
    };
  }

  // 追跡番号インポート（プレースホルダー） / 追踪号导入（占位符）
  async importTracking(tenantId: string, dto: Record<string, any>) {
    // TODO: 佐川追跡番号インポート実装 / 佐川追踪号导入实现
    return {
      message: 'Tracking import placeholder / 追跡番号インポートプレースホルダー / 追踪号导入占位符',
      tenantId,
      importedCount: 0,
      importedAt: new Date(),
    };
  }

  // 送り状種類取得（静的参照データ） / 获取送状类型（静态参考数据）
  getInvoiceTypes() {
    return { items: INVOICE_TYPES };
  }
}
