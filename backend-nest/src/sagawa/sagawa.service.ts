// 佐川急便サービス / 佐川急便服务
import { Inject, Injectable } from '@nestjs/common';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import type { DrizzleDB } from '../database/database.types.js';
import { shipmentOrders } from '../database/schema/shipments.js';

// 佐川急便の送り状種類（静的参照データ） / 佐川急便送状类型（静态参考数据）
const INVOICE_TYPES = [
  { code: '0', name: '元払い / 到付', description: '通常の元払い発送 / 普通到付发货' },
  { code: '2', name: '着払い / 货到付款', description: '着払い発送 / 货到付款发货' },
  { code: '3', name: 'ネコポス / 飞脚宅配便', description: '飛脚宅配便 / 飞脚宅配便' },
  { code: '4', name: '飛脚メール便 / 飞脚邮件便', description: '飛脚メール便 / 飞脚邮件便' },
];

// 佐川CSVヘッダー定義 / 佐川CSV头定义
const SAGAWA_CSV_HEADERS = [
  'お客様管理番号',      // 客户管理编号
  'お届け先電話番号',    // 收件人电话
  'お届け先郵便番号',    // 收件人邮编
  'お届け先住所1',       // 收件人地址1
  'お届け先住所2',       // 收件人地址2
  'お届け先住所3',       // 收件人地址3
  'お届け先名称1',       // 收件人名称1
  'ご依頼主電話番号',    // 发件人电话
  'ご依頼主郵便番号',    // 发件人邮编
  'ご依頼主住所1',       // 发件人地址1
  'ご依頼主住所2',       // 发件人地址2
  'ご依頼主名称1',       // 发件人名称1
  '荷姿',                // 包装形态
  '出荷日',              // 出货日
  '配達指定日',          // 指定配达日
  '配達指定時間帯',      // 指定配达时间段
  '送り状種類',          // 送状种类
];

// 佐川追跡CSVカラムインデックス / 佐川追踪CSV列索引
const TRACKING_CSV_COLUMNS = {
  customerManagementNumber: 0,  // お客様管理番号 / 客户管理编号
  trackingNumber: 1,            // 送り状番号 / 送状编号
};

@Injectable()
export class SagawaService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // CSVエクスポート（佐川フォーマット）/ CSV导出（佐川格式）
  async exportCsv(tenantId: string, dto: Record<string, any>) {
    const shipmentIds: string[] = dto.shipmentIds ?? [];

    // 出荷注文データ取得 / 获取出货订单数据
    const orders = await (this.db as any)
      .select()
      .from(shipmentOrders)
      .where(
        shipmentIds.length > 0
          ? and(
              eq(shipmentOrders.tenantId, tenantId),
              inArray(shipmentOrders.id, shipmentIds),
            )
          : eq(shipmentOrders.tenantId, tenantId),
      );

    if (orders.length === 0) {
      return {
        csv: '',
        exportedCount: 0,
        exportedAt: new Date(),
        message: 'No shipment orders found / 出荷注文が見つかりません / 未找到出货订单',
      };
    }

    // CSVヘッダー行 / CSV头行
    const headerRow = SAGAWA_CSV_HEADERS.join(',');

    // データ行生成 / 生成数据行
    const dataRows = orders.map((order: any) => {
      const fields = [
        this.escapeCsvField(order.customerManagementNumber ?? order.orderNumber ?? ''),
        this.escapeCsvField(order.recipientPhone ?? ''),
        this.escapeCsvField(order.recipientPostalCode ?? ''),
        this.escapeCsvField(order.recipientPrefecture ?? ''),
        this.escapeCsvField(order.recipientCity ?? ''),
        this.escapeCsvField(`${order.recipientStreet ?? ''}${order.recipientBuilding ?? ''}`),
        this.escapeCsvField(order.recipientName ?? ''),
        this.escapeCsvField(order.senderPhone ?? ''),
        this.escapeCsvField(order.senderPostalCode ?? ''),
        this.escapeCsvField(order.senderPrefecture ?? ''),
        this.escapeCsvField(order.senderCity ?? ''),
        this.escapeCsvField(order.senderName ?? ''),
        '0',  // 荷姿デフォルト / 包装形态默认值
        this.escapeCsvField(order.shipPlanDate ?? ''),
        this.escapeCsvField(order.deliveryDatePreference ?? ''),
        this.escapeCsvField(order.deliveryTimeSlot ?? ''),
        this.escapeCsvField(order.invoiceType ?? '0'),
      ];
      return fields.join(',');
    });

    const csv = [headerRow, ...dataRows].join('\n');

    return {
      csv,
      exportedCount: orders.length,
      exportedAt: new Date(),
      message: `Exported ${orders.length} orders / ${orders.length}件エクスポート完了 / 已导出${orders.length}条订单`,
    };
  }

  // 追跡番号インポート（佐川CSVパース）/ 追踪号导入（佐川CSV解析）
  async importTracking(tenantId: string, dto: Record<string, any>) {
    const csvData: string = dto.csvData ?? '';
    const errors: string[] = [];
    let importedCount = 0;

    if (!csvData || csvData.trim() === '') {
      return {
        importedCount: 0,
        errors: ['No CSV data provided / CSVデータがありません / 没有提供CSV数据'],
        importedAt: new Date(),
      };
    }

    // CSV行パース / 解析CSV行
    const lines = csvData.trim().split('\n');
    // ヘッダー行スキップ / 跳过头行
    const dataLines = lines.length > 1 ? lines.slice(1) : lines;

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i].trim();
      if (!line) continue;

      const columns = this.parseCsvLine(line);
      const rowNum = i + 1;

      const customerManagementNumber = columns[TRACKING_CSV_COLUMNS.customerManagementNumber]?.trim();
      const trackingNumber = columns[TRACKING_CSV_COLUMNS.trackingNumber]?.trim();

      if (!customerManagementNumber || !trackingNumber) {
        errors.push(
          `Row ${rowNum}: Missing management number or tracking number / 行${rowNum}: 管理番号または追跡番号が不足 / 第${rowNum}行: 缺少管理编号或追踪号`,
        );
        continue;
      }

      try {
        // 出荷注文を追跡番号で更新 / 用追踪号更新出货订单
        const updated = await (this.db as any)
          .update(shipmentOrders)
          .set({
            trackingId: trackingNumber,
            statusCarrierReceived: true,
            statusCarrierReceivedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(shipmentOrders.tenantId, tenantId),
              sql`(${shipmentOrders.customerManagementNumber} = ${customerManagementNumber} OR ${shipmentOrders.orderNumber} = ${customerManagementNumber})`,
            ),
          )
          .returning();

        if (updated.length > 0) {
          importedCount++;
        } else {
          errors.push(
            `Row ${rowNum}: Order "${customerManagementNumber}" not found / 行${rowNum}: 注文 "${customerManagementNumber}" が見つかりません / 第${rowNum}行: 订单 "${customerManagementNumber}" 未找到`,
          );
        }
      } catch (err: any) {
        errors.push(
          `Row ${rowNum}: ${err.message ?? 'Unknown error'} / 行${rowNum}: 更新失敗 / 第${rowNum}行: 更新失败`,
        );
      }
    }

    return {
      importedCount,
      errors,
      importedAt: new Date(),
      message: `Imported ${importedCount} tracking numbers / ${importedCount}件の追跡番号をインポート / 已导入${importedCount}个追踪号`,
    };
  }

  // 送り状種類取得（静的参照データ） / 获取送状类型（静态参考数据）
  getInvoiceTypes() {
    return { items: INVOICE_TYPES };
  }

  // CSVフィールドエスケープ / CSV字段转义
  private escapeCsvField(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  // CSV行パース（ダブルクォート対応）/ 解析CSV行（支持双引号）
  private parseCsvLine(line: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"' && line[i + 1] === '"') {
          current += '"';
          i++; // エスケープされたクォートスキップ / 跳过转义引号
        } else if (char === '"') {
          inQuotes = false;
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          fields.push(current);
          current = '';
        } else {
          current += char;
        }
      }
    }
    fields.push(current);
    return fields;
  }
}
