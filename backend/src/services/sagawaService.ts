/**
 * 佐川急便 Service / 佐川急便サービス
 *
 * e飛伝Ⅲ CSV 出力与追跡連携。
 * e飛伝Ⅲ CSV 出力と追跡連携。
 *
 * Phase 1: CSV 导出（e飛伝取込用）
 * Phase 2: 追跡番号反映
 * Phase 3: API 連携（将来拡張）
 */

import type { IShipmentOrder, IAddress } from '@/models/shipmentOrder';
import { logger } from '@/lib/logger';
import { SAGAWA_INVOICE_TYPES } from '@/data/sagawaCarrier';
import { formatProductNameSplit, type ProductNameRule } from '@/utils/productNameFormatter';

/**
 * 佐川 CSV 导出配置 / 佐川 CSV 出力設定
 */
export interface ISagawaExportConfig {
  /** 請求先コード / 請求先コード */
  billingCode?: string;
  /** 默认送り状種類 / デフォルト送り状種類 */
  defaultInvoiceType?: string;
  /** 默认荷物サイズ / デフォルト荷物サイズ */
  defaultSize?: string;
  /** 品名印字规则 / 品名印字ルール */
  productNameRule?: ProductNameRule;
}

/**
 * 佐川 CSV 行数据 / 佐川 CSV 行データ
 */
export interface SagawaCsvRow {
  お客様管理番号: string;
  送り状種類: string;
  出荷日: string;
  お届け指定日: string;
  配達時間帯: string;
  お届け先電話番号: string;
  お届け先郵便番号: string;
  お届け先住所1: string;
  お届け先住所2: string;
  お届け先住所3: string;
  お届け先名称1: string;
  お届け先名称2: string;
  ご依頼主電話番号: string;
  ご依頼主郵便番号: string;
  ご依頼主住所1: string;
  ご依頼主住所2: string;
  ご依頼主名称1: string;
  ご依頼主名称2: string;
  品名1: string;
  品名2: string;
  荷物個数: string;
  荷物サイズ: string;
}

/**
 * 佐川急便サービスクラス / 佐川急便サービスクラス
 */
export class SagawaService {
  private config: ISagawaExportConfig;

  constructor(config: ISagawaExportConfig = {}) {
    this.config = config;
  }

  /**
   * 生成 e飛伝用 CSV 数据 / e飛伝用 CSV データを生成
   */
  generateCsvRows(orders: IShipmentOrder[]): SagawaCsvRow[] {
    return orders.map((order) => this.orderToCsvRow(order));
  }

  /**
   * 将订单转为 CSV 行 / 注文を CSV 行に変換
   */
  private orderToCsvRow(order: IShipmentOrder): SagawaCsvRow {
    const recipient = order.recipient || {} as Partial<IAddress>;
    const orderer = order.orderer || {} as Partial<IAddress>;

    // 品名印字規則適用 / 品名印字ルール適用
    const [productName1, productName2] = formatProductNameSplit(
      order.products || [],
      { rule: this.config.productNameRule, maxChars: 16 },
      16,
    );

    return {
      お客様管理番号: order.orderNumber || '',
      送り状種類: this.config.defaultInvoiceType || '0',
      出荷日: order.shipPlanDate || '',
      お届け指定日: '',
      配達時間帯: '',
      お届け先電話番号: recipient.phone || '',
      お届け先郵便番号: recipient.postalCode || '',
      お届け先住所1: `${recipient.prefecture || ''}${recipient.city || ''}`,
      お届け先住所2: recipient.street || '',
      お届け先住所3: recipient.building || '',
      お届け先名称1: recipient.name || '',
      お届け先名称2: '',
      ご依頼主電話番号: orderer.phone || '',
      ご依頼主郵便番号: orderer.postalCode || '',
      ご依頼主住所1: `${orderer.prefecture || ''}${orderer.city || ''}`,
      ご依頼主住所2: orderer.street || '',
      ご依頼主名称1: orderer.name || '',
      ご依頼主名称2: '',
      品名1: productName1,
      品名2: productName2,
      荷物個数: String(order._productsMeta?.totalQuantity || 1),
      荷物サイズ: this.config.defaultSize || '80',
    };
  }


  /**
   * CSV 文件生成（Shift_JIS BOM 付き）/ CSV ファイル生成（Shift_JIS BOM 付き）
   */
  generateCsvString(rows: SagawaCsvRow[]): string {
    if (rows.length === 0) return '';

    const headers = Object.keys(rows[0]);
    const lines = [
      headers.join(','),
      ...rows.map((row) =>
        headers.map((h) => {
          const val = String((row as unknown as Record<string, string>)[h] || '');
          // CSV 转义 / CSV エスケープ
          return val.includes(',') || val.includes('"') || val.includes('\n')
            ? `"${val.replace(/"/g, '""')}"`
            : val;
        }).join(','),
      ),
    ];

    return lines.join('\r\n');
  }

  /**
   * 获取可用送り状種類 / 利用可能な送り状種類を取得
   */
  static getInvoiceTypes() {
    return SAGAWA_INVOICE_TYPES;
  }
}

/**
 * 追跡番号をインポート / 追跡番号をインポート
 *
 * e飛伝から出力された CSV（追跡番号付き）を解析し、
 * 注文に追跡番号を紐付ける。
 *
 * @param csvContent CSV 内容
 * @returns 追跡番号マッピング { orderNumber → trackingNumber }
 */
export function parseSagawaTrackingCsv(csvContent: string): Map<string, string> {
  const result = new Map<string, string>();
  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim());

  if (lines.length < 2) return result;

  const headers = lines[0].split(',');
  const orderIdx = headers.findIndex((h) => h.includes('お客様管理番号'));
  const trackIdx = headers.findIndex((h) => h.includes('お問い合せ送り状No'));

  if (orderIdx === -1 || trackIdx === -1) {
    logger.warn('Sagawa CSV: cannot find required columns / 佐川CSV: 必要なカラムが見つかりません');
    return result;
  }

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const orderNumber = cols[orderIdx]?.trim();
    const trackingNumber = cols[trackIdx]?.trim();
    if (orderNumber && trackingNumber) {
      result.set(orderNumber, trackingNumber);
    }
  }

  logger.info({ count: result.size }, 'Sagawa tracking numbers parsed / 佐川追跡番号を解析');
  return result;
}
