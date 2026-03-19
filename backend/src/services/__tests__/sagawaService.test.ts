/**
 * sagawaService 单元测试 / sagawaService ユニットテスト
 *
 * 佐川急便 e飛伝Ⅲ CSV出力・追跡番号インポートのテスト
 * 佐川急便 e飞传Ⅲ CSV输出、追踪号导入的测试
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/data/sagawaCarrier', () => ({
  SAGAWA_INVOICE_TYPES: [
    { invoiceType: '0', name: '元払い' },
    { invoiceType: '1', name: '着払い' },
    { invoiceType: '2', name: 'e-コレクト（代引き）' },
  ],
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { SagawaService, parseSagawaTrackingCsv } from '../sagawaService';

describe('SagawaService / 佐川急便サービス', () => {

  describe('generateCsvRows / CSV行生成', () => {
    it('注文をCSV行に変換すること / 将订单转换为CSV行', () => {
      const service = new SagawaService({ defaultInvoiceType: '0', defaultSize: '80' });
      const orders = [{
        orderNumber: 'SH-001',
        shipPlanDate: '2026/03/19',
        recipient: {
          name: '田中太郎',
          phone: '09012345678',
          postalCode: '1600023',
          prefecture: '東京都',
          city: '新宿区',
          street: '西新宿1-2-3',
          building: 'ABCビル5F',
        },
        orderer: {
          name: '株式会社テスト',
          phone: '0312345678',
          postalCode: '1000001',
          prefecture: '東京都',
          city: '千代田区',
          street: '丸の内1-1',
        },
        products: [{ productName: 'Tシャツ', quantity: 2 }],
        _productsMeta: { totalQuantity: 2 },
      }] as any;

      const rows = service.generateCsvRows(orders);

      expect(rows).toHaveLength(1);
      expect(rows[0].お客様管理番号).toBe('SH-001');
      expect(rows[0].お届け先名称1).toBe('田中太郎');
      expect(rows[0].お届け先郵便番号).toBe('1600023');
      expect(rows[0].お届け先住所1).toBe('東京都新宿区');
      expect(rows[0].お届け先住所2).toBe('西新宿1-2-3');
      expect(rows[0].お届け先住所3).toBe('ABCビル5F');
      expect(rows[0].ご依頼主名称1).toBe('株式会社テスト');
      expect(rows[0].送り状種類).toBe('0');
      expect(rows[0].荷物サイズ).toBe('80');
      expect(rows[0].荷物個数).toBe('2');
    });

    it('recipientなしの場合は空文字列 / recipient为空时返回空字符串', () => {
      const service = new SagawaService();
      const rows = service.generateCsvRows([{ orderNumber: 'SH-002' } as any]);
      expect(rows[0].お届け先名称1).toBe('');
      expect(rows[0].お届け先電話番号).toBe('');
    });

    it('デフォルト設定で動作すること / 使用默认设置', () => {
      const service = new SagawaService();
      const rows = service.generateCsvRows([{ orderNumber: 'SH-003' } as any]);
      expect(rows[0].送り状種類).toBe('0');
      expect(rows[0].荷物サイズ).toBe('80');
    });

    it('複数注文を変換できること / 可以转换多个订单', () => {
      const service = new SagawaService();
      const orders = [
        { orderNumber: 'SH-001' },
        { orderNumber: 'SH-002' },
        { orderNumber: 'SH-003' },
      ] as any[];
      const rows = service.generateCsvRows(orders);
      expect(rows).toHaveLength(3);
    });
  });

  describe('generateCsvString / CSV文字列生成', () => {
    it('ヘッダー+データ行を生成すること / 生成表头+数据行', () => {
      const service = new SagawaService();
      const rows = service.generateCsvRows([{
        orderNumber: 'SH-001',
        recipient: { name: '田中' },
      } as any]);
      const csv = service.generateCsvString(rows);

      expect(csv).toContain('お客様管理番号');
      expect(csv).toContain('SH-001');
      expect(csv).toContain('田中');
    });

    it('空配列は空文字列を返す / 空数组返回空字符串', () => {
      const service = new SagawaService();
      expect(service.generateCsvString([])).toBe('');
    });

    it('カンマを含む値はダブルクォートで囲む / 含逗号的值用双引号包裹', () => {
      const service = new SagawaService();
      const rows = service.generateCsvRows([{
        orderNumber: 'SH-001',
        recipient: { street: '1丁目,2番地' },
      } as any]);
      const csv = service.generateCsvString(rows);

      expect(csv).toContain('"1丁目,2番地"');
    });

    it('CRLFで改行すること / 使用CRLF换行', () => {
      const service = new SagawaService();
      const rows = service.generateCsvRows([{ orderNumber: 'SH-001' } as any]);
      const csv = service.generateCsvString(rows);
      expect(csv).toContain('\r\n');
    });
  });

  describe('getInvoiceTypes / 送り状種類取得', () => {
    it('送り状種類リストを返すこと / 返回发货单类型列表', () => {
      const types = SagawaService.getInvoiceTypes();
      expect(types).toHaveLength(3);
      expect(types[0].invoiceType).toBe('0');
    });
  });

  describe('parseSagawaTrackingCsv / 追跡番号解析', () => {
    it('追跡番号をパースすること / 解析追踪号', () => {
      const csv = [
        'お客様管理番号,お問い合せ送り状No,その他',
        'SH-001,123456789012,other',
        'SH-002,987654321098,other',
      ].join('\n');

      const result = parseSagawaTrackingCsv(csv);
      expect(result.size).toBe(2);
      expect(result.get('SH-001')).toBe('123456789012');
      expect(result.get('SH-002')).toBe('987654321098');
    });

    it('ヘッダーが見つからない場合は空を返す / 找不到表头返回空', () => {
      const csv = 'col1,col2\nval1,val2';
      const result = parseSagawaTrackingCsv(csv);
      expect(result.size).toBe(0);
    });

    it('1行以下は空を返す / 1行以下返回空', () => {
      expect(parseSagawaTrackingCsv('').size).toBe(0);
      expect(parseSagawaTrackingCsv('header').size).toBe(0);
    });

    it('空行をスキップすること / 跳过空行', () => {
      const csv = [
        'お客様管理番号,お問い合せ送り状No',
        'SH-001,12345',
        '',
        'SH-002,67890',
        '',
      ].join('\n');
      const result = parseSagawaTrackingCsv(csv);
      expect(result.size).toBe(2);
    });

    it('追跡番号が空の行はスキップ / 追踪号为空的行跳过', () => {
      const csv = [
        'お客様管理番号,お問い合せ送り状No',
        'SH-001,',
        'SH-002,12345',
      ].join('\n');
      const result = parseSagawaTrackingCsv(csv);
      expect(result.size).toBe(1);
    });
  });
});
