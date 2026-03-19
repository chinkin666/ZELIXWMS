/**
 * ゆうプリR CSV 生成サービス / Yu-Pri R CSV 生成服务
 *
 * ゆうプリR（日本郵便ラベル印刷ソフト）用の CSV を生成。
 * 为日本邮政标签打印软件（ゆうプリR）生成 CSV。
 *
 * フォーマット仕様 / 格式规范:
 * - Shift_JIS エンコーディング（CSV ヘッダー行あり）
 * - ゆうプリR v6+ 対応
 */

/**
 * 导出配置 / エクスポート設定
 */
export interface YupackExportConfig {
  customerCode?: string;
  defaultSize?: string;
  defaultDeliveryType?: string;
  senderName?: string;
  senderPostalCode?: string;
  senderAddress?: string;
  senderPhone?: string;
}

/**
 * ゆうプリR CSV 行データ / Yu-Pri R CSV 行数据
 *
 * ゆうプリR の標準取込フォーマットに準拠。
 * 遵循 ゆうプリR 标准导入格式。
 */
export interface YupackCsvRow {
  お客様コード: string;
  送り状種別: string;
  お届け先郵便番号: string;
  お届け先住所1: string;
  お届け先住所2: string;
  お届け先住所3: string;
  お届け先名称: string;
  お届け先敬称: string;
  お届け先電話番号: string;
  ご依頼主郵便番号: string;
  ご依頼主住所1: string;
  ご依頼主住所2: string;
  ご依頼主名称: string;
  ご依頼主電話番号: string;
  品名1: string;
  品名2: string;
  品名3: string;
  品名4: string;
  荷物個数: string;
  サイズ: string;
  配達希望日: string;
  配達時間帯: string;
  お届け通知メール: string;
  お届け通知メールアドレス: string;
  記事: string;
  お客様管理番号: string;
}

/**
 * 注文を CSV 行に変換 / 将订单转换为 CSV 行
 */
export function orderToCsvRow(order: any, config: YupackExportConfig): YupackCsvRow {
  const recipient = order.recipient || {};
  const orderer = order.orderer || order.sender || {};
  const items = order.products || order.items || [];

  // 品名生成（最大4行、各16文字） / 品名生成（最多4行，每行16字）
  const productNames = generateProductNames(items);

  // 寄件人信息：订单 > 插件配置 / 差出人情報：注文 > プラグイン設定
  const senderName = orderer.name || config.senderName || '';
  const senderPostal = orderer.postalCode || config.senderPostalCode || '';
  const senderAddr = orderer.address
    || `${orderer.prefecture || ''}${orderer.city || ''}${orderer.street || ''}`
    || config.senderAddress || '';
  const senderPhone = orderer.phone || config.senderPhone || '';

  return {
    お客様コード: config.customerCode || '',
    送り状種別: config.defaultDeliveryType || '0',
    お届け先郵便番号: formatPostalCode(recipient.postalCode || ''),
    お届け先住所1: `${recipient.prefecture || ''}${recipient.city || ''}`,
    お届け先住所2: recipient.street || '',
    お届け先住所3: recipient.building || '',
    お届け先名称: recipient.name || '',
    お届け先敬称: '様',
    お届け先電話番号: recipient.phone || '',
    ご依頼主郵便番号: formatPostalCode(senderPostal),
    ご依頼主住所1: senderAddr,
    ご依頼主住所2: '',
    ご依頼主名称: senderName,
    ご依頼主電話番号: senderPhone,
    品名1: productNames[0] || '',
    品名2: productNames[1] || '',
    品名3: productNames[2] || '',
    品名4: productNames[3] || '',
    荷物個数: String(order._productsMeta?.totalQuantity || 1),
    サイズ: config.defaultSize || '80',
    配達希望日: order.deliveryDatePreference || '',
    配達時間帯: mapTimeSlot(order.deliveryTimeSlot),
    お届け通知メール: '',
    お届け通知メールアドレス: '',
    記事: order.memo || '',
    お客様管理番号: order.orderNumber || '',
  };
}

/**
 * 批量生成 CSV 行 / CSV 行を一括生成
 */
export function generateCsvRows(orders: any[], config: YupackExportConfig): YupackCsvRow[] {
  return orders.map((order) => orderToCsvRow(order, config));
}

/**
 * CSV 文字列生成 / CSV 字符串生成
 *
 * ゆうプリR はヘッダー行ありの CSV を期待。
 * ゆうプリR 期望有标题行的 CSV。
 */
export function generateCsvString(rows: YupackCsvRow[]): string {
  if (rows.length === 0) return '';

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      headers.map((h) => {
        const val = String((row as unknown as Record<string, string>)[h] || '');
        // CSV エスケープ / CSV 转义
        return val.includes(',') || val.includes('"') || val.includes('\n')
          ? `"${val.replace(/"/g, '""')}"`
          : val;
      }).join(','),
    ),
  ];

  return lines.join('\r\n');
}

// ─── 内部ヘルパー / 内部辅助函数 ───

/**
 * 品名リスト生成（最大4行、各16文字） / 品名列表生成（最多4行，每行16字）
 */
function generateProductNames(items: any[]): string[] {
  if (!items || items.length === 0) return [''];

  const names: string[] = [];

  for (const item of items) {
    const name = item.productName || item.name || item.sku || '';
    const qty = item.quantity || 1;
    const entry = qty > 1 ? `${name} x${qty}` : name;

    // 16文字で分割 / 16字符分割
    if (entry.length <= 16) {
      names.push(entry);
    } else {
      names.push(entry.slice(0, 16));
      if (names.length < 4) {
        names.push(entry.slice(16, 32));
      }
    }

    if (names.length >= 4) break;
  }

  // 4個以上なら「他N点」を付加 / 超过4个则附加「其他N件」
  if (items.length > names.length && names.length === 4) {
    const remaining = items.length - 3;
    names[3] = `他${remaining}点`;
  }

  return names.slice(0, 4);
}

/**
 * 郵便番号フォーマット / 邮编格式化
 * "1234567" → "123-4567"
 */
function formatPostalCode(code: string): string {
  const digits = code.replace(/[^0-9]/g, '');
  if (digits.length === 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  return code;
}

/**
 * 時間帯マッピング / 时间段映射
 * WMS の時間帯 → ゆうプリR コード
 */
function mapTimeSlot(slot: string | undefined): string {
  if (!slot) return '';
  const map: Record<string, string> = {
    'AM': '0812',
    '午前中': '0812',
    '08-12': '0812',
    '12-14': '1214',
    '14-16': '1416',
    '16-18': '1618',
    '18-20': '1820',
    '19-21': '1921',
    '20-21': '2021',
  };
  return map[slot] || slot;
}
