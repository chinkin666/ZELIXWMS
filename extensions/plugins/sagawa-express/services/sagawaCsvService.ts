/**
 * 佐川 CSV 生成服务 / 佐川 CSV 生成サービス
 *
 * e飛伝II/III 格式 CSV 导出。
 * e飛伝II/III フォーマット CSV 出力。
 */

/**
 * 导出配置 / エクスポート設定
 */
export interface SagawaExportConfig {
  billingCode?: string;
  defaultInvoiceType?: string;
  defaultSize?: string;
}

/**
 * CSV 行数据 / CSV 行データ
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
  請求先コード: string;
}

/**
 * 订单转 CSV 行 / 注文を CSV 行に変換
 */
export function orderToCsvRow(order: any, config: SagawaExportConfig): SagawaCsvRow {
  const recipient = order.recipient || {};
  const orderer = order.orderer || order.sender || {};
  const productName = getProductName(order);

  return {
    お客様管理番号: order.orderNumber || '',
    送り状種類: config.defaultInvoiceType || '0',
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
    品名1: productName,
    品名2: '',
    荷物個数: String(order._productsMeta?.totalQuantity || 1),
    荷物サイズ: config.defaultSize || '80',
    請求先コード: config.billingCode || '',
  };
}

/**
 * 批量生成 CSV 行 / CSV 行を一括生成
 */
export function generateCsvRows(orders: any[], config: SagawaExportConfig): SagawaCsvRow[] {
  return orders.map((order) => orderToCsvRow(order, config));
}

/**
 * CSV 字符串生成 / CSV 文字列生成
 */
export function generateCsvString(rows: SagawaCsvRow[]): string {
  if (rows.length === 0) return '';

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      headers.map((h) => {
        const val = String((row as unknown as Record<string, string>)[h] || '');
        return val.includes(',') || val.includes('"') || val.includes('\n')
          ? `"${val.replace(/"/g, '""')}"`
          : val;
      }).join(','),
    ),
  ];

  return lines.join('\r\n');
}

/**
 * 获取品名 / 品名を取得
 */
function getProductName(order: any): string {
  if (order._productsMeta?.skuCount === 1 && order.products?.[0]) {
    return order.products[0].productName || '商品';
  }
  if (order._productsMeta?.skuCount && order._productsMeta.skuCount > 1) {
    return `商品 ${order._productsMeta.skuCount}点`;
  }
  return '商品';
}
