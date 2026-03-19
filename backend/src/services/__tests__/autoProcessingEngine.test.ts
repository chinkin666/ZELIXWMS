/**
 * autoProcessingEngine 单元测试 / autoProcessingEngine ユニットテスト
 *
 * 自動処理エンジンの条件評価・アクション実行をテストする。
 * 测试自动处理引擎的条件评估和动作执行。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';

const oid = () => new mongoose.Types.ObjectId();

vi.mock('@/models/autoProcessingRule', () => ({
  AutoProcessingRule: {
    find: vi.fn(),
  },
}));

vi.mock('@/models/autoProcessingLog', () => ({
  AutoProcessingLog: {
    findOne: vi.fn(),
    create: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/models/shipmentOrder', () => ({
  ShipmentOrder: {
    findById: vi.fn(),
    find: vi.fn(),
    findByIdAndUpdate: vi.fn().mockResolvedValue({}),
  },
  calculateProductsMeta: vi.fn().mockReturnValue({ totalQuantity: 1, skuCount: 1 }),
}));

vi.mock('@/models/product', () => ({
  Product: {
    findOne: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { AutoProcessingRule } from '@/models/autoProcessingRule';
import { AutoProcessingLog } from '@/models/autoProcessingLog';
import { ShipmentOrder } from '@/models/shipmentOrder';
import { Product } from '@/models/product';

const chainSort = (val: any) => ({ sort: () => ({ lean: () => Promise.resolve(val) }) });
const chainLean = (val: any) => ({ lean: () => Promise.resolve(val) });

const mockOrder = (overrides: any = {}) => ({
  _id: oid(),
  orderNumber: 'SH-001',
  status: 'confirmed',
  products: [],
  orderGroupId: 'G1',
  customer: { name: '田中太郎', prefecture: '東京都' },
  ...overrides,
});

const mockRule = (overrides: any = {}) => ({
  _id: oid(),
  name: 'テストルール',
  enabled: true,
  triggerMode: 'auto',
  triggerEvents: ['order.created'],
  conditions: [],
  actions: [],
  priority: 1,
  allowRerun: false,
  ...overrides,
});

describe('autoProcessingEngine / 自動処理エンジン', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('processOrderEvent / 注文イベント処理', () => {
    it('ルールなし→何もしない / 无规则不处理', async () => {
      vi.mocked(AutoProcessingRule.find).mockReturnValue(chainSort([]) as any);

      const { processOrderEvent } = await import('../autoProcessingEngine');
      await processOrderEvent('order-1', 'order.created' as any);

      expect(ShipmentOrder.findById).not.toHaveBeenCalled();
    });

    it('注文なし→何もしない / 无订单不处理', async () => {
      vi.mocked(AutoProcessingRule.find).mockReturnValue(
        chainSort([mockRule()]) as any,
      );
      vi.mocked(ShipmentOrder.findById).mockReturnValue(chainLean(null) as any);

      const { processOrderEvent } = await import('../autoProcessingEngine');
      await processOrderEvent('nonexistent', 'order.created' as any);

      expect(AutoProcessingLog.create).not.toHaveBeenCalled();
    });

    it('条件一致→アクション実行＆ログ記録 / 条件匹配时执行动作并记录日志', async () => {
      const rule = mockRule({
        conditions: [],
        actions: [{ type: 'setOrderGroup', orderGroupId: 'G2' }],
      });
      const order = mockOrder();

      vi.mocked(AutoProcessingRule.find).mockReturnValue(chainSort([rule]) as any);
      vi.mocked(ShipmentOrder.findById).mockReturnValue(chainLean(order) as any);
      vi.mocked(AutoProcessingLog.findOne).mockReturnValue(chainLean(null) as any);

      const { processOrderEvent } = await import('../autoProcessingEngine');
      await processOrderEvent(String(order._id), 'order.created' as any);

      expect(ShipmentOrder.findByIdAndUpdate).toHaveBeenCalled();
      expect(AutoProcessingLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });

    it('再実行禁止→既実行ルールをスキップ / 禁止重复执行时跳过已执行规则', async () => {
      const rule = mockRule({ allowRerun: false });
      const order = mockOrder();

      vi.mocked(AutoProcessingRule.find).mockReturnValue(chainSort([rule]) as any);
      vi.mocked(ShipmentOrder.findById).mockReturnValue(chainLean(order) as any);
      vi.mocked(AutoProcessingLog.findOne).mockReturnValue(
        chainLean({ success: true }) as any, // 既に実行済み
      );

      const { processOrderEvent } = await import('../autoProcessingEngine');
      await processOrderEvent(String(order._id), 'order.created' as any);

      // ログ作成されないこと（スキップされた）
      expect(AutoProcessingLog.create).not.toHaveBeenCalled();
    });
  });

  describe('processOrderEventBulk / 一括処理', () => {
    it('複数注文×複数ルールを処理すること / 处理多个订单x多个规则', async () => {
      const rules = [mockRule({ conditions: [], actions: [{ type: 'setOrderGroup', orderGroupId: 'G3' }] })];
      const orders = [mockOrder(), mockOrder({ orderNumber: 'SH-002' })];

      vi.mocked(AutoProcessingRule.find).mockReturnValue(chainSort(rules) as any);
      vi.mocked(ShipmentOrder.find).mockReturnValue(chainLean(orders) as any);
      vi.mocked(AutoProcessingLog.findOne).mockReturnValue(chainLean(null) as any);

      const { processOrderEventBulk } = await import('../autoProcessingEngine');
      await processOrderEventBulk(
        orders.map((o) => String(o._id)),
        'order.confirmed' as any,
      );

      // 2注文 × 1ルール = 2回実行
      expect(AutoProcessingLog.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('条件評価 / 条件评估', () => {
    // 以下のテストでは processOrderEvent を通じて条件評価を間接的にテストする

    it('orderFieldの「is」演算子 / orderField的"is"运算符', async () => {
      const rule = mockRule({
        conditions: [
          { type: 'orderField', fieldKey: 'status', operator: 'is', value: 'confirmed' },
        ],
        actions: [{ type: 'setOrderGroup', orderGroupId: 'MATCHED' }],
      });
      const order = mockOrder({ status: 'confirmed' });

      vi.mocked(AutoProcessingRule.find).mockReturnValue(chainSort([rule]) as any);
      vi.mocked(ShipmentOrder.findById).mockReturnValue(chainLean(order) as any);
      vi.mocked(AutoProcessingLog.findOne).mockReturnValue(chainLean(null) as any);

      const { processOrderEvent } = await import('../autoProcessingEngine');
      await processOrderEvent(String(order._id), 'order.created' as any);

      expect(AutoProcessingLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });

    it('ネスト値条件（customer.prefecture） / 嵌套值条件', async () => {
      const rule = mockRule({
        conditions: [
          { type: 'orderField', fieldKey: 'customer.prefecture', operator: 'is', value: '東京都' },
        ],
        actions: [{ type: 'setOrderGroup', orderGroupId: 'TOKYO' }],
      });
      const order = mockOrder();

      vi.mocked(AutoProcessingRule.find).mockReturnValue(chainSort([rule]) as any);
      vi.mocked(ShipmentOrder.findById).mockReturnValue(chainLean(order) as any);
      vi.mocked(AutoProcessingLog.findOne).mockReturnValue(chainLean(null) as any);

      const { processOrderEvent } = await import('../autoProcessingEngine');
      await processOrderEvent(String(order._id), 'order.created' as any);

      expect(AutoProcessingLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });

    it('条件不一致→スキップ / 条件不匹配时跳过', async () => {
      const rule = mockRule({
        conditions: [
          { type: 'orderField', fieldKey: 'status', operator: 'is', value: 'shipped' },
        ],
        actions: [{ type: 'setOrderGroup', orderGroupId: 'X' }],
      });
      const order = mockOrder({ status: 'confirmed' });

      vi.mocked(AutoProcessingRule.find).mockReturnValue(chainSort([rule]) as any);
      vi.mocked(ShipmentOrder.findById).mockReturnValue(chainLean(order) as any);
      vi.mocked(AutoProcessingLog.findOne).mockReturnValue(chainLean(null) as any);

      const { processOrderEvent } = await import('../autoProcessingEngine');
      await processOrderEvent(String(order._id), 'order.created' as any);

      // 条件不一致→アクション・ログなし
      expect(ShipmentOrder.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(AutoProcessingLog.create).not.toHaveBeenCalled();
    });

    it('orderGroup条件 / orderGroup条件', async () => {
      const rule = mockRule({
        conditions: [
          { type: 'orderGroup', orderGroupIds: ['G1', 'G2'] },
        ],
        actions: [{ type: 'setOrderGroup', orderGroupId: 'MATCHED' }],
      });
      const order = mockOrder({ orderGroupId: 'G1' });

      vi.mocked(AutoProcessingRule.find).mockReturnValue(chainSort([rule]) as any);
      vi.mocked(ShipmentOrder.findById).mockReturnValue(chainLean(order) as any);
      vi.mocked(AutoProcessingLog.findOne).mockReturnValue(chainLean(null) as any);

      const { processOrderEvent } = await import('../autoProcessingEngine');
      await processOrderEvent(String(order._id), 'order.created' as any);

      expect(AutoProcessingLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });

    it('carrierRawRow条件 / carrierRawRow条件', async () => {
      const rule = mockRule({
        conditions: [
          { type: 'carrierRawRow', carrierColumnName: 'deliveryType', carrierOperator: 'is', carrierValue: 'クール' },
        ],
        actions: [{ type: 'setOrderGroup', orderGroupId: 'COOL' }],
      });
      const order = mockOrder({
        carrierRawRow: { deliveryType: 'クール' },
      });

      vi.mocked(AutoProcessingRule.find).mockReturnValue(chainSort([rule]) as any);
      vi.mocked(ShipmentOrder.findById).mockReturnValue(chainLean(order) as any);
      vi.mocked(AutoProcessingLog.findOne).mockReturnValue(chainLean(null) as any);

      const { processOrderEvent } = await import('../autoProcessingEngine');
      await processOrderEvent(String(order._id), 'order.created' as any);

      expect(AutoProcessingLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });

    it('sourceRawRow条件（any行マッチ） / sourceRawRow条件（任意行匹配）', async () => {
      const rule = mockRule({
        conditions: [
          { type: 'sourceRawRow', sourceColumnName: 'memo', sourceOperator: 'contains', sourceValue: '急ぎ' },
        ],
        actions: [{ type: 'setOrderGroup', orderGroupId: 'URGENT' }],
      });
      const order = mockOrder({
        sourceRawRows: [
          { memo: '通常配送' },
          { memo: '急ぎ対応お願いします' },
        ],
      });

      vi.mocked(AutoProcessingRule.find).mockReturnValue(chainSort([rule]) as any);
      vi.mocked(ShipmentOrder.findById).mockReturnValue(chainLean(order) as any);
      vi.mocked(AutoProcessingLog.findOne).mockReturnValue(chainLean(null) as any);

      const { processOrderEvent } = await import('../autoProcessingEngine');
      await processOrderEvent(String(order._id), 'order.created' as any);

      expect(AutoProcessingLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });
  });

  describe('アクション実行 / 动作执行', () => {
    it('addProductアクション / 添加商品动作', async () => {
      const rule = mockRule({
        conditions: [],
        actions: [{ type: 'addProduct', productSku: 'GIFT-001', quantity: 1 }],
      });
      const order = mockOrder({ products: [] });
      const product = {
        _id: oid(),
        sku: 'GIFT-001',
        name: 'ギフトラッピング',
        price: 300,
        imageUrl: '',
        barcode: '',
        coolType: 'normal',
        subSkus: [],
      };

      vi.mocked(AutoProcessingRule.find).mockReturnValue(chainSort([rule]) as any);
      vi.mocked(ShipmentOrder.findById).mockReturnValue(chainLean(order) as any);
      vi.mocked(AutoProcessingLog.findOne).mockReturnValue(chainLean(null) as any);
      vi.mocked(Product.findOne)
        .mockReturnValueOnce(chainLean(product) as any);

      const { processOrderEvent } = await import('../autoProcessingEngine');
      await processOrderEvent(String(order._id), 'order.created' as any);

      expect(ShipmentOrder.findByIdAndUpdate).toHaveBeenCalledWith(
        order._id,
        expect.objectContaining({
          $push: expect.objectContaining({
            products: expect.objectContaining({ inputSku: 'GIFT-001' }),
          }),
        }),
      );
    });

    it('setOrderGroupアクション / 设置订单组动作', async () => {
      const rule = mockRule({
        conditions: [],
        actions: [{ type: 'setOrderGroup', orderGroupId: 'VIP' }],
      });
      const order = mockOrder();

      vi.mocked(AutoProcessingRule.find).mockReturnValue(chainSort([rule]) as any);
      vi.mocked(ShipmentOrder.findById).mockReturnValue(chainLean(order) as any);
      vi.mocked(AutoProcessingLog.findOne).mockReturnValue(chainLean(null) as any);

      const { processOrderEvent } = await import('../autoProcessingEngine');
      await processOrderEvent(String(order._id), 'order.created' as any);

      expect(ShipmentOrder.findByIdAndUpdate).toHaveBeenCalledWith(
        order._id,
        { $set: { orderGroupId: 'VIP' } },
      );
    });
  });

  // ─── 追加条件演算子テスト / 追加条件运算符测试 ─────────────

  describe('条件演算子の網羅テスト / 条件运算符全覆盖', () => {
    it('notContains演算子 / notContains运算符', async () => {
      const rule = mockRule({
        conditions: [
          { type: 'orderField', fieldKey: 'memo', operator: 'notContains', value: 'ギフト' },
        ],
        actions: [{ type: 'setOrderGroup', orderGroupId: 'NORMAL' }],
      });
      const order = mockOrder({ memo: '通常配送' });

      vi.mocked(AutoProcessingRule.find).mockReturnValue(chainSort([rule]) as any);
      vi.mocked(ShipmentOrder.findById).mockReturnValue(chainLean(order) as any);
      vi.mocked(AutoProcessingLog.findOne).mockReturnValue(chainLean(null) as any);

      const { processOrderEvent } = await import('../autoProcessingEngine');
      await processOrderEvent(String(order._id), 'order.created' as any);

      expect(AutoProcessingLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });

    it('isEmpty演算子（空値マッチ）/ isEmpty运算符（空值匹配）', async () => {
      const rule = mockRule({
        conditions: [
          { type: 'orderField', fieldKey: 'memo', operator: 'isEmpty', value: '' },
        ],
        actions: [{ type: 'setOrderGroup', orderGroupId: 'NO-MEMO' }],
      });
      const order = mockOrder({ memo: '' });

      vi.mocked(AutoProcessingRule.find).mockReturnValue(chainSort([rule]) as any);
      vi.mocked(ShipmentOrder.findById).mockReturnValue(chainLean(order) as any);
      vi.mocked(AutoProcessingLog.findOne).mockReturnValue(chainLean(null) as any);

      const { processOrderEvent } = await import('../autoProcessingEngine');
      await processOrderEvent(String(order._id), 'order.created' as any);

      expect(AutoProcessingLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });

    it('hasAnyValue演算子（値あり）/ hasAnyValue运算符（有值）', async () => {
      const rule = mockRule({
        conditions: [
          { type: 'orderField', fieldKey: 'memo', operator: 'hasAnyValue', value: '' },
        ],
        actions: [{ type: 'setOrderGroup', orderGroupId: 'HAS-MEMO' }],
      });
      const order = mockOrder({ memo: 'テストメモ' });

      vi.mocked(AutoProcessingRule.find).mockReturnValue(chainSort([rule]) as any);
      vi.mocked(ShipmentOrder.findById).mockReturnValue(chainLean(order) as any);
      vi.mocked(AutoProcessingLog.findOne).mockReturnValue(chainLean(null) as any);

      const { processOrderEvent } = await import('../autoProcessingEngine');
      await processOrderEvent(String(order._id), 'order.created' as any);

      expect(AutoProcessingLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });

    it('isNot演算子 / isNot运算符', async () => {
      const rule = mockRule({
        conditions: [
          { type: 'orderField', fieldKey: 'coolType', operator: 'isNot', value: 'frozen' },
        ],
        actions: [{ type: 'setOrderGroup', orderGroupId: 'NON-FROZEN' }],
      });
      const order = mockOrder({ coolType: 'normal' });

      vi.mocked(AutoProcessingRule.find).mockReturnValue(chainSort([rule]) as any);
      vi.mocked(ShipmentOrder.findById).mockReturnValue(chainLean(order) as any);
      vi.mocked(AutoProcessingLog.findOne).mockReturnValue(chainLean(null) as any);

      const { processOrderEvent } = await import('../autoProcessingEngine');
      await processOrderEvent(String(order._id), 'order.created' as any);

      expect(AutoProcessingLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });
  });

  // ─── processOrderEventBulk テスト / 批量处理测试 ───────────

  describe('processOrderEventBulk / 一括イベント処理', () => {
    it('複数注文IDを順次処理すること / 按顺序处理多个订单ID', async () => {
      const rule = mockRule({
        conditions: [],
        actions: [{ type: 'setOrderGroup', orderGroupId: 'BULK' }],
      });
      const o1 = mockOrder();
      const o2 = mockOrder();

      vi.mocked(AutoProcessingRule.find).mockReturnValue(chainSort([rule]) as any);
      vi.mocked(ShipmentOrder.findById)
        .mockReturnValueOnce(chainLean(o1) as any)
        .mockReturnValueOnce(chainLean(o2) as any);
      vi.mocked(AutoProcessingLog.findOne).mockReturnValue(chainLean(null) as any);

      const { processOrderEventBulk } = await import('../autoProcessingEngine');
      await processOrderEventBulk([String(o1._id), String(o2._id)], 'order.created' as any);

      // 2回呼ばれること / 被调用2次
      expect(ShipmentOrder.findByIdAndUpdate).toHaveBeenCalledTimes(2);
    });
  });

  // ─── addProduct サブSKUテスト / addProduct 子SKU测试 ────────

  describe('addProduct サブSKU / addProduct 子SKU', () => {
    it('メインSKUが見つからない場合はサブSKUで検索すること / 主SKU未找到时搜索子SKU', async () => {
      const rule = mockRule({
        conditions: [],
        actions: [{ type: 'addProduct', productSku: 'SUB-001', quantity: 2 }],
      });
      const order = mockOrder({ products: [] });
      const product = {
        _id: oid(),
        sku: 'MAIN-001',
        name: 'メイン商品',
        price: 500,
        imageUrl: '',
        barcode: '',
        coolType: 'normal',
        subSkus: [
          { subSku: 'SUB-001', price: 300, description: 'サブSKU', isActive: true },
        ],
      };

      vi.mocked(AutoProcessingRule.find).mockReturnValue(chainSort([rule]) as any);
      vi.mocked(ShipmentOrder.findById).mockReturnValue(chainLean(order) as any);
      vi.mocked(AutoProcessingLog.findOne).mockReturnValue(chainLean(null) as any);
      vi.mocked(Product.findOne)
        .mockReturnValueOnce(chainLean(null) as any)    // メインSKU なし
        .mockReturnValueOnce(chainLean(product) as any); // サブSKU 検索

      const { processOrderEvent } = await import('../autoProcessingEngine');
      await processOrderEvent(String(order._id), 'order.created' as any);

      // findByIdAndUpdate が $push で呼ばれること / findByIdAndUpdate 被以 $push 调用
      expect(ShipmentOrder.findByIdAndUpdate).toHaveBeenCalled();
      const callArgs = vi.mocked(ShipmentOrder.findByIdAndUpdate).mock.calls[0];
      expect(callArgs[1]).toHaveProperty('$push');
      expect((callArgs[1] as any).$push.products).toMatchObject({
        inputSku: 'SUB-001',
        quantity: 2,
      });
    });

    it('productSkuがない場合はスキップ / productSku不存在时跳过', async () => {
      const rule = mockRule({
        conditions: [],
        actions: [{ type: 'addProduct', productSku: '', quantity: 1 }],
      });
      const order = mockOrder();

      vi.mocked(AutoProcessingRule.find).mockReturnValue(chainSort([rule]) as any);
      vi.mocked(ShipmentOrder.findById).mockReturnValue(chainLean(order) as any);
      vi.mocked(AutoProcessingLog.findOne).mockReturnValue(chainLean(null) as any);

      const { processOrderEvent } = await import('../autoProcessingEngine');
      await processOrderEvent(String(order._id), 'order.created' as any);

      // addProduct がスキップされるので findByIdAndUpdate は setOrderGroup のみ（呼ばれない）
      expect(ShipmentOrder.findByIdAndUpdate).not.toHaveBeenCalled();
    });
  });

  describe('runRuleManually / 手動実行', () => {
    it('全注文に対してルールを実行し統計を返すこと / 对所有订单执行规则并返回统计', async () => {
      const rule = mockRule({
        conditions: [
          { type: 'orderField', fieldKey: 'status', operator: 'is', value: 'confirmed' },
        ],
        actions: [{ type: 'setOrderGroup', orderGroupId: 'PROCESSED' }],
        allowRerun: true,
      });

      const orders = [
        mockOrder({ status: 'confirmed' }),
        mockOrder({ status: 'shipped' }),   // 条件不一致
        mockOrder({ status: 'confirmed' }),
      ];

      vi.mocked(ShipmentOrder.find).mockReturnValue(chainLean(orders) as any);

      const { runRuleManually } = await import('../autoProcessingEngine');
      const result = await runRuleManually(rule as any);

      expect(result.processed).toBe(3);
      expect(result.matched).toBe(2);
      expect(result.executed).toBe(2);
      expect(result.errors).toBe(0);
    });
  });
});
