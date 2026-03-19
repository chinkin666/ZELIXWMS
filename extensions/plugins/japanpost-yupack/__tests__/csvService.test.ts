/**
 * ゆうプリR CSV 生成サービステスト / Yu-Pri R CSV 生成服务测试
 */

import { describe, it, expect } from 'vitest';
import { orderToCsvRow, generateCsvRows, generateCsvString } from '../services/yupackCsvService';

const defaultConfig = {
  customerCode: 'CUST001',
  defaultSize: '80',
  defaultDeliveryType: '0',
  senderName: 'テスト倉庫',
  senderPostalCode: '1600022',
  senderAddress: '東京都新宿区新宿1-1-1',
  senderPhone: '03-1234-5678',
};

const sampleOrder = {
  orderNumber: 'SH20260316-001',
  recipient: {
    name: '田中太郎',
    postalCode: '5300001',
    prefecture: '大阪府',
    city: '大阪市北区',
    street: '梅田1-2-3',
    building: 'テストビル5F',
    phone: '06-9876-5432',
  },
  orderer: {},
  products: [
    { productName: 'テスト商品A', quantity: 2 },
    { productName: 'テスト商品B', quantity: 1 },
  ],
  _productsMeta: { totalQuantity: 3 },
  deliveryDatePreference: '2026-03-20',
  deliveryTimeSlot: 'AM',
  memo: 'ワレモノ注意',
};

describe('orderToCsvRow', () => {
  it('should convert order to CSV row / 注文を CSV 行に変換すること', () => {
    const row = orderToCsvRow(sampleOrder, defaultConfig);

    expect(row.お客様コード).toBe('CUST001');
    expect(row.送り状種別).toBe('0');
    expect(row.お届け先郵便番号).toBe('530-0001');
    expect(row.お届け先住所1).toBe('大阪府大阪市北区');
    expect(row.お届け先住所2).toBe('梅田1-2-3');
    expect(row.お届け先住所3).toBe('テストビル5F');
    expect(row.お届け先名称).toBe('田中太郎');
    expect(row.お届け先敬称).toBe('様');
    expect(row.お届け先電話番号).toBe('06-9876-5432');
    expect(row.ご依頼主名称).toBe('テスト倉庫');
    expect(row.ご依頼主郵便番号).toBe('160-0022');
    expect(row.品名1).toBe('テスト商品A x2');
    expect(row.品名2).toBe('テスト商品B');
    expect(row.荷物個数).toBe('3');
    expect(row.サイズ).toBe('80');
    expect(row.配達希望日).toBe('2026-03-20');
    expect(row.配達時間帯).toBe('0812');
    expect(row.記事).toBe('ワレモノ注意');
    expect(row.お客様管理番号).toBe('SH20260316-001');
  });

  it('should use order sender over config defaults / 注文の差出人がデフォルト設定より優先すること', () => {
    const orderWithSender = {
      ...sampleOrder,
      orderer: {
        name: '注文者A',
        postalCode: '1500001',
        phone: '090-0000-0000',
      },
    };
    const row = orderToCsvRow(orderWithSender, defaultConfig);
    expect(row.ご依頼主名称).toBe('注文者A');
    expect(row.ご依頼主電話番号).toBe('090-0000-0000');
  });

  it('should handle empty order / 空の注文を処理すること', () => {
    const row = orderToCsvRow({}, defaultConfig);
    expect(row.お届け先名称).toBe('');
    expect(row.お客様管理番号).toBe('');
    expect(row.ご依頼主名称).toBe('テスト倉庫');
  });
});

describe('generateCsvRows', () => {
  it('should generate rows for multiple orders / 複数注文の行を生成すること', () => {
    const rows = generateCsvRows([sampleOrder, sampleOrder], defaultConfig);
    expect(rows).toHaveLength(2);
  });
});

describe('generateCsvString', () => {
  it('should generate valid CSV string / 有効な CSV 文字列を生成すること', () => {
    const rows = generateCsvRows([sampleOrder], defaultConfig);
    const csv = generateCsvString(rows);

    expect(csv).toContain('お客様コード');
    expect(csv).toContain('SH20260316-001');
    expect(csv).toContain('田中太郎');
    // ヘッダー行 + データ行 / 标题行 + 数据行
    expect(csv.split('\r\n')).toHaveLength(2);
  });

  it('should escape commas and quotes / カンマと引用符をエスケープすること', () => {
    const order = {
      ...sampleOrder,
      memo: 'メモ, "特殊"文字',
    };
    const rows = generateCsvRows([order], defaultConfig);
    const csv = generateCsvString(rows);
    expect(csv).toContain('"メモ, ""特殊""文字"');
  });

  it('should return empty for no rows / 行がない場合は空文字を返すこと', () => {
    expect(generateCsvString([])).toBe('');
  });
});
