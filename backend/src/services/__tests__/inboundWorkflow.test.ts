/**
 * InboundWorkflow 单元测试 / InboundWorkflow ユニットテスト
 *
 * TDD アプローチ: 入荷ワークフローのすべてのパブリックメソッドをカバーする
 * TDD方法论：覆盖入库工作流的所有公开方法
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';

// ─── ヘルパー / 辅助工具 ───────────────────────────────────────────────────────

/**
 * チェーンable lean モックを生成する / 生成可链式调用的lean mock
 */
const chainLean = (val: any) => ({ lean: () => Promise.resolve(val) });

/**
 * テスト用 ObjectId を生成する / 生成测试用ObjectId
 */
const oid = () => new mongoose.Types.ObjectId();

// ─── Mocks / モック ──────────────────────────────────────────────────────────

vi.mock('@/models/inboundOrder', () => ({
  InboundOrder: {
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('@/models/inventoryLedger', () => ({
  InventoryLedger: { create: vi.fn().mockResolvedValue({}) },
}));

vi.mock('@/models/location', () => ({
  Location: {
    findById: vi.fn(),
    findOne: vi.fn(),
  },
}));

vi.mock('@/models/warehouseTask', () => ({
  WarehouseTask: {
    create: vi.fn(),
    find: vi.fn(),
    insertMany: vi.fn(),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
}));

vi.mock('@/services/taskEngine', () => ({
  TaskEngine: {
    createTask: vi.fn().mockResolvedValue({ _id: 't1', taskNumber: 'WT-001' }),
    completeTask: vi.fn(),
  },
}));

vi.mock('@/services/ruleEngine', () => ({
  RuleEngine: { evaluate: vi.fn().mockResolvedValue([]) },
}));

vi.mock('@/core/extensions', () => ({
  extensionManager: {
    emit: vi.fn().mockReturnValue({ catch: vi.fn() }),
  },
}));

vi.mock('@/core/extensions/types', () => ({
  HOOK_EVENTS: {
    INBOUND_RECEIVED: 'inbound.received',
    INBOUND_PUTAWAY_COMPLETED: 'inbound.putaway.completed',
    INBOUND_DAMAGE_REPORTED: 'inbound.damage.reported',
    TASK_CREATED: 'task.created',
  },
}));

vi.mock('@/utils/idGenerator', () => ({
  generateSequenceNumber: vi.fn().mockResolvedValue('WT-20260319-0001'),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ─── Import モデル / 导入模型 ────────────────────────────────────────────────

import { InboundOrder } from '@/models/inboundOrder';
import { InventoryLedger } from '@/models/inventoryLedger';
import { Location } from '@/models/location';
import { WarehouseTask } from '@/models/warehouseTask';
import { TaskEngine } from '@/services/taskEngine';
import { RuleEngine } from '@/services/ruleEngine';
import { extensionManager } from '@/core/extensions';

// ─── テストデータファクトリー / 测试数据工厂 ──────────────────────────────────

/**
 * モック入荷オーダーを作成する / 创建mock入库订单
 */
function makeOrder(overrides: Partial<any> = {}) {
  const orderId = oid();
  const destLocId = oid();
  const productId = oid();

  return {
    _id: orderId,
    orderNumber: 'IN-001',
    status: 'confirmed',
    completedAt: undefined as Date | undefined,
    destinationLocationId: destLocId,
    lines: [
      {
        lineNumber: 1,
        productId,
        productSku: 'SKU-001',
        productName: 'テスト商品A / 测试商品A',
        expectedQuantity: 10,
        receivedQuantity: 0,
        putawayQuantity: 0,
        memo: undefined as string | undefined,
      },
    ],
    save: vi.fn().mockResolvedValue(undefined),
    toObject: vi.fn().mockReturnValue({}),
    ...overrides,
  };
}

/**
 * モックロケーションを作成する / 创建mock位置
 */
function makeLocation(overrides: Partial<any> = {}) {
  const locId = oid();
  const warehouseId = oid();
  return {
    _id: locId,
    warehouseId,
    name: 'RECV-01',
    ...overrides,
  };
}

// ─── テストスイート / 测试套件 ───────────────────────────────────────────────

describe('InboundWorkflow / 入荷ワークフロー', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルトで extensionManager.emit はキャッチ可能な Promise を返す
    // 默认情况下 extensionManager.emit 返回可捕获的Promise
    vi.mocked(extensionManager.emit).mockReturnValue({ catch: vi.fn() } as any);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // startReceiving / 入荷開始
  // ════════════════════════════════════════════════════════════════════════════

  describe('startReceiving / 入荷開始', () => {
    it('存在しない注文IDでエラーをスローすること / 订单不存在时应抛出错误', async () => {
      // 準備: findById が null を返す / 准备：findById返回null
      vi.mocked(InboundOrder.findById).mockResolvedValue(null as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      await expect(InboundWorkflow.startReceiving('nonexistent-id')).rejects.toThrow(
        /入荷指示が見つかりません|入荷開始に失敗/,
      );
    });

    it('confirmed 以外のステータスでエラーをスローすること / 非confirmed状态时应抛出错误', async () => {
      // 準備: status が 'draft' の注文 / 准备：status为'draft'的订单
      const order = makeOrder({ status: 'draft' });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      await expect(InboundWorkflow.startReceiving(String(order._id))).rejects.toThrow(
        /入荷開始できません|入荷開始に失敗/,
      );
    });

    it('receiving ステータス中でもエラーをスローすること / receiving状态时也应抛出错误', async () => {
      const order = makeOrder({ status: 'receiving' });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      await expect(InboundWorkflow.startReceiving(String(order._id))).rejects.toThrow();
    });

    it('ロケーションが見つからない場合エラーをスローすること / 位置不存在时应抛出错误', async () => {
      // 準備: confirmed 注文だが destinationLocation が存在しない
      // 准备：confirmed订单但destinationLocation不存在
      const order = makeOrder({ status: 'confirmed' });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);
      vi.mocked(Location.findById).mockReturnValue(chainLean(null) as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      await expect(InboundWorkflow.startReceiving(String(order._id))).rejects.toThrow(
        /入荷先ロケーションが見つかりません|入荷開始に失敗/,
      );
    });

    it('confirmed 注文で receiving タスクを作成し status を更新すること / confirmed订单时应创建接收任务并更新状态', async () => {
      // 準備: 2ライン注文と有効なロケーション
      // 准备：2行订单和有效位置
      const loc = makeLocation();
      const productId2 = oid();
      const order = makeOrder({
        status: 'confirmed',
        lines: [
          {
            lineNumber: 1,
            productId: oid(),
            productSku: 'SKU-001',
            productName: 'テスト商品A',
            expectedQuantity: 10,
            receivedQuantity: 0,
            putawayQuantity: 0,
          },
          {
            lineNumber: 2,
            productId: productId2,
            productSku: 'SKU-002',
            productName: 'テスト商品B',
            expectedQuantity: 5,
            receivedQuantity: 0,
            putawayQuantity: 0,
          },
        ],
      });

      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);
      vi.mocked(Location.findById).mockReturnValue(chainLean(loc) as any);

      const createdTask = { _id: oid(), taskNumber: 'WT-001', type: 'receiving' };
      vi.mocked(TaskEngine.createTask).mockResolvedValue(createdTask as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      const tasks = await InboundWorkflow.startReceiving(String(order._id), 'user-1');

      // ステータスが receiving に変更されること / 状态应变更为receiving
      expect(order.status).toBe('receiving');
      expect(order.save).toHaveBeenCalled();

      // ライン数分のタスクが作成されること / 应创建与行数相同数量的任务
      expect(tasks).toHaveLength(2);
      expect(TaskEngine.createTask).toHaveBeenCalledTimes(2);

      // タスクに正しいタイプが設定されること / 任务应设置正确的类型
      expect(TaskEngine.createTask).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'receiving', productSku: 'SKU-001' }),
      );
    });

    it('warehouseId は destinationLocation の warehouseId から取得すること / warehouseIdは目的地ロケーションから取得', async () => {
      // ロケーションに warehouseId がある場合 / 位置有warehouseId的情况
      const warehouseId = oid();
      const loc = makeLocation({ warehouseId });
      const order = makeOrder({ status: 'confirmed' });

      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);
      vi.mocked(Location.findById).mockReturnValue(chainLean(loc) as any);
      vi.mocked(TaskEngine.createTask).mockResolvedValue({ _id: oid() } as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      await InboundWorkflow.startReceiving(String(order._id));

      expect(TaskEngine.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          warehouseId: String(warehouseId),
          referenceType: 'inbound-order',
        }),
      );
    });

    it('ロット情報がある場合タスクに引き継がれること / 有批次信息时应传递给任务', async () => {
      const loc = makeLocation();
      const lotId = oid();
      const order = makeOrder({
        status: 'confirmed',
        lines: [
          {
            lineNumber: 1,
            productId: oid(),
            productSku: 'SKU-LOT',
            productName: 'ロット商品',
            expectedQuantity: 20,
            receivedQuantity: 0,
            putawayQuantity: 0,
            lotId,
            lotNumber: 'LOT-2026-001',
          },
        ],
      });

      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);
      vi.mocked(Location.findById).mockReturnValue(chainLean(loc) as any);
      vi.mocked(TaskEngine.createTask).mockResolvedValue({ _id: oid() } as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      await InboundWorkflow.startReceiving(String(order._id));

      expect(TaskEngine.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          lotId: String(lotId),
          lotNumber: 'LOT-2026-001',
        }),
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // confirmReceiveLine / 検品確認
  // ════════════════════════════════════════════════════════════════════════════

  describe('confirmReceiveLine / 検品確認', () => {
    it('存在しない注文でエラーをスローすること / 订单不存在时应抛出错误', async () => {
      vi.mocked(InboundOrder.findById).mockResolvedValue(null as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      await expect(
        InboundWorkflow.confirmReceiveLine('nonexistent', 1, 10),
      ).rejects.toThrow(/入荷指示が見つかりません|検品確認に失敗/);
    });

    it('存在しないライン番号でエラーをスローすること / 行号不存在时应抛出错误', async () => {
      const order = makeOrder();
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      await expect(
        InboundWorkflow.confirmReceiveLine(String(order._id), 999, 5),
      ).rejects.toThrow(/ライン番号|検品確認に失敗/);
    });

    it('ラインの receivedQuantity を更新すること / 应更新行的receivedQuantity', async () => {
      const order = makeOrder();
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      const result = await InboundWorkflow.confirmReceiveLine(
        String(order._id),
        1,
        10,
        'user-1',
      );

      expect(order.lines[0].receivedQuantity).toBe(10);
      expect(order.save).toHaveBeenCalled();
    });

    it('在庫台帳に入荷記帳すること / 应在库存台账中记录入库', async () => {
      const order = makeOrder();
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      await InboundWorkflow.confirmReceiveLine(String(order._id), 1, 10, 'user-1');

      expect(InventoryLedger.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'inbound',
          quantity: 10,
          referenceType: 'inbound-order',
          executedBy: 'user-1',
        }),
      );
    });

    it('全ライン受入完了時に status を received に更新すること / 全行接收完成时应将状态更新为received', async () => {
      // 準備: expectedQuantity と同数受け取る / 准备：接收与预期数量相同的数量
      const order = makeOrder();
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      await InboundWorkflow.confirmReceiveLine(String(order._id), 1, 10);

      expect(order.status).toBe('received');
    });

    it('全ライン未完了の場合は status を変更しないこと / 行未全部完成时不应更改状态', async () => {
      // 準備: 2ラインで1ラインのみ受取 / 准备：2行中只接收1行
      const order = makeOrder({
        status: 'receiving',
        lines: [
          {
            lineNumber: 1,
            productId: oid(),
            productSku: 'SKU-001',
            productName: '商品A',
            expectedQuantity: 10,
            receivedQuantity: 0,
            putawayQuantity: 0,
          },
          {
            lineNumber: 2,
            productId: oid(),
            productSku: 'SKU-002',
            productName: '商品B',
            expectedQuantity: 5,
            receivedQuantity: 0,
            putawayQuantity: 0,
          },
        ],
      });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      await InboundWorkflow.confirmReceiveLine(String(order._id), 1, 10);

      // ライン2が未完了なので status は変わらない / 行2未完成，状态不变
      expect(order.status).toBe('receiving');
    });

    it('全ライン完了時に INBOUND_RECEIVED イベントを発行すること / 全行完成时应发布INBOUND_RECEIVED事件', async () => {
      const order = makeOrder();
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      await InboundWorkflow.confirmReceiveLine(String(order._id), 1, 10);

      expect(extensionManager.emit).toHaveBeenCalledWith(
        'inbound.received',
        expect.objectContaining({ orderId: String(order._id) }),
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // startPutaway / 棚入れ開始
  // ════════════════════════════════════════════════════════════════════════════

  describe('startPutaway / 棚入れ開始', () => {
    it('存在しない注文でエラーをスローすること / 订单不存在时应抛出错误', async () => {
      vi.mocked(InboundOrder.findById).mockResolvedValue(null as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      await expect(InboundWorkflow.startPutaway('nonexistent')).rejects.toThrow(
        /入荷指示が見つかりません|棚入れ開始に失敗/,
      );
    });

    it('received 以外のステータスでエラーをスローすること / 非received状态时应抛出错误', async () => {
      const order = makeOrder({ status: 'confirmed' });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      await expect(InboundWorkflow.startPutaway(String(order._id))).rejects.toThrow(
        /棚入れ開始できません|棚入れ開始に失敗/,
      );
    });

    it('ロケーションが見つからない場合エラーをスローすること / 位置不存在时应抛出错误', async () => {
      const order = makeOrder({ status: 'received' });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);
      vi.mocked(Location.findById).mockReturnValue(chainLean(null) as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      await expect(InboundWorkflow.startPutaway(String(order._id))).rejects.toThrow(
        /入荷先ロケーションが見つかりません|棚入れ開始に失敗/,
      );
    });

    it('received 注文でルールエンジンを呼び出し putaway タスクを作成すること / received订单时应调用规则引擎并创建putaway任务', async () => {
      const loc = makeLocation();
      const order = makeOrder({
        status: 'received',
        lines: [
          {
            lineNumber: 1,
            productId: oid(),
            productSku: 'SKU-001',
            productName: '商品A',
            expectedQuantity: 10,
            receivedQuantity: 10,
            putawayQuantity: 0,
          },
        ],
      });

      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);
      vi.mocked(Location.findById).mockReturnValue(chainLean(loc) as any);
      vi.mocked(RuleEngine.evaluate).mockResolvedValue([]);
      vi.mocked(TaskEngine.createTask).mockResolvedValue({ _id: oid(), type: 'putaway' } as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      const tasks = await InboundWorkflow.startPutaway(String(order._id), 'user-1');

      expect(RuleEngine.evaluate).toHaveBeenCalledWith(
        'putaway',
        expect.any(Object),
        expect.objectContaining({ warehouseId: expect.any(String) }),
      );
      expect(tasks).toHaveLength(1);
      expect(TaskEngine.createTask).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'putaway' }),
      );
    });

    it('ルールエンジンが assign_location を返す場合そのロケーションを使うこと / 规则引擎返回assign_location时应使用该位置', async () => {
      // ルールエンジンが特定ロケーションを指定する / 规则引擎指定特定位置
      const ruleLocationId = String(oid());
      const loc = makeLocation();
      const order = makeOrder({
        status: 'received',
        lines: [
          {
            lineNumber: 1,
            productId: oid(),
            productSku: 'SKU-001',
            productName: '商品A',
            expectedQuantity: 10,
            receivedQuantity: 10,
            putawayQuantity: 0,
          },
        ],
      });

      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);
      vi.mocked(Location.findById).mockReturnValue(chainLean(loc) as any);
      vi.mocked(RuleEngine.evaluate).mockResolvedValue([
        {
          ruleId: 'rule-1',
          matched: true,
          actions: [
            { type: 'assign_location', params: { locationId: ruleLocationId } },
          ],
        },
      ] as any);
      vi.mocked(TaskEngine.createTask).mockResolvedValue({ _id: oid() } as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      await InboundWorkflow.startPutaway(String(order._id));

      expect(TaskEngine.createTask).toHaveBeenCalledWith(
        expect.objectContaining({ toLocationId: ruleLocationId }),
      );
    });

    it('ルールなし・ライン putawayLocationId あり: ラインのロケーションを使うこと / 无规则但行有putawayLocationId时应使用行的位置', async () => {
      const linePutawayLoc = oid();
      const loc = makeLocation();
      const order = makeOrder({
        status: 'received',
        lines: [
          {
            lineNumber: 1,
            productId: oid(),
            productSku: 'SKU-001',
            productName: '商品A',
            expectedQuantity: 10,
            receivedQuantity: 10,
            putawayQuantity: 0,
            putawayLocationId: linePutawayLoc,
          },
        ],
      });

      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);
      vi.mocked(Location.findById).mockReturnValue(chainLean(loc) as any);
      vi.mocked(RuleEngine.evaluate).mockResolvedValue([]);
      vi.mocked(TaskEngine.createTask).mockResolvedValue({ _id: oid() } as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      await InboundWorkflow.startPutaway(String(order._id));

      expect(TaskEngine.createTask).toHaveBeenCalledWith(
        expect.objectContaining({ toLocationId: String(linePutawayLoc) }),
      );
    });

    it('ルールもラインロケーションも無い場合 destinationLocationId を使うこと / 无规则也无行位置时应使用目标位置', async () => {
      const loc = makeLocation();
      const order = makeOrder({ status: 'received' });

      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);
      vi.mocked(Location.findById).mockReturnValue(chainLean(loc) as any);
      vi.mocked(RuleEngine.evaluate).mockResolvedValue([]);
      vi.mocked(TaskEngine.createTask).mockResolvedValue({ _id: oid() } as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      await InboundWorkflow.startPutaway(String(order._id));

      expect(TaskEngine.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          toLocationId: String(order.destinationLocationId),
        }),
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // completePutaway / 棚入れ完了
  // ════════════════════════════════════════════════════════════════════════════

  describe('completePutaway / 棚入れ完了', () => {
    it('存在しない注文でエラーをスローすること / 订单不存在时应抛出错误', async () => {
      vi.mocked(InboundOrder.findById).mockResolvedValue(null as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      await expect(
        InboundWorkflow.completePutaway('nonexistent', 1, String(oid()), 10),
      ).rejects.toThrow(/入荷指示が見つかりません|棚入れ完了に失敗/);
    });

    it('存在しないライン番号でエラーをスローすること / 行号不存在时应抛出错误', async () => {
      const order = makeOrder();
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      await expect(
        InboundWorkflow.completePutaway(String(order._id), 999, String(oid()), 10),
      ).rejects.toThrow(/ライン番号|棚入れ完了に失敗/);
    });

    it('ラインの putawayLocationId と putawayQuantity を更新すること / 应更新行的putawayLocationId和putawayQuantity', async () => {
      const putawayLocId = String(oid());
      const order = makeOrder({
        lines: [
          {
            lineNumber: 1,
            productId: oid(),
            productSku: 'SKU-001',
            productName: '商品A',
            expectedQuantity: 10,
            receivedQuantity: 10,
            putawayQuantity: 0,
          },
        ],
      });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      await InboundWorkflow.completePutaway(String(order._id), 1, putawayLocId, 10);

      expect(order.lines[0].putawayQuantity).toBe(10);
      expect(order.save).toHaveBeenCalled();
    });

    it('棚入れ台帳に記帳すること / 应在台账中记录上架操作', async () => {
      const putawayLocId = String(oid());
      const order = makeOrder({
        lines: [
          {
            lineNumber: 1,
            productId: oid(),
            productSku: 'SKU-001',
            productName: '商品A',
            expectedQuantity: 10,
            receivedQuantity: 10,
            putawayQuantity: 0,
          },
        ],
      });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      await InboundWorkflow.completePutaway(
        String(order._id),
        1,
        putawayLocId,
        10,
        'user-1',
      );

      expect(InventoryLedger.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'inbound',
          quantity: 10,
          locationId: putawayLocId,
          reason: '棚入れ',
          executedBy: 'user-1',
        }),
      );
    });

    it('全ライン棚入れ完了時に status を done に更新すること / 全行完成上架时应将状态更新为done', async () => {
      const putawayLocId = String(oid());
      const order = makeOrder({
        lines: [
          {
            lineNumber: 1,
            productId: oid(),
            productSku: 'SKU-001',
            productName: '商品A',
            expectedQuantity: 10,
            receivedQuantity: 10,
            putawayQuantity: 0,
          },
        ],
      });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      await InboundWorkflow.completePutaway(String(order._id), 1, putawayLocId, 10);

      expect(order.status).toBe('done');
      expect(order.completedAt).toBeInstanceOf(Date);
    });

    it('全ライン未完了の場合は status を変更しないこと / 行未全部完成时不应更改状态', async () => {
      // 2ラインのうち1ラインのみ棚入れ完了 / 2行中只完成1行的上架
      const putawayLocId = String(oid());
      const order = makeOrder({
        status: 'received',
        lines: [
          {
            lineNumber: 1,
            productId: oid(),
            productSku: 'SKU-001',
            productName: '商品A',
            expectedQuantity: 10,
            receivedQuantity: 10,
            putawayQuantity: 0,
          },
          {
            lineNumber: 2,
            productId: oid(),
            productSku: 'SKU-002',
            productName: '商品B',
            expectedQuantity: 5,
            receivedQuantity: 5,
            putawayQuantity: 0,
          },
        ],
      });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      await InboundWorkflow.completePutaway(String(order._id), 1, putawayLocId, 10);

      // ライン2が未完了なので status は 'done' にならない / 行2未完成，状态不为done
      expect(order.status).toBe('received');
    });

    it('全ライン完了時に INBOUND_PUTAWAY_COMPLETED イベントを発行すること / 全行完成时应发布INBOUND_PUTAWAY_COMPLETED事件', async () => {
      const putawayLocId = String(oid());
      const order = makeOrder({
        lines: [
          {
            lineNumber: 1,
            productId: oid(),
            productSku: 'SKU-001',
            productName: '商品A',
            expectedQuantity: 10,
            receivedQuantity: 10,
            putawayQuantity: 0,
          },
        ],
      });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      await InboundWorkflow.completePutaway(String(order._id), 1, putawayLocId, 10);

      expect(extensionManager.emit).toHaveBeenCalledWith(
        'inbound.putaway.completed',
        expect.objectContaining({ orderId: String(order._id) }),
      );
    });

    it('receivedQuantity が 0 のラインは putaway 完了とみなさないこと / receivedQuantity为0的行不应被视为完成上架', async () => {
      // 受け取っていないラインがある場合 / 有未接收的行时
      const putawayLocId = String(oid());
      const order = makeOrder({
        status: 'received',
        lines: [
          {
            lineNumber: 1,
            productId: oid(),
            productSku: 'SKU-001',
            productName: '商品A',
            expectedQuantity: 10,
            receivedQuantity: 0, // 受け取っていない / 未接收
            putawayQuantity: 0,
          },
        ],
      });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      await InboundWorkflow.completePutaway(String(order._id), 1, putawayLocId, 0);

      // receivedQuantity が 0 なので done にならない / receivedQuantity为0，不变为done
      expect(order.status).toBe('received');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // partialReceive / 部分入荷
  // ════════════════════════════════════════════════════════════════════════════

  describe('partialReceive / 部分入荷', () => {
    it('存在しない注文でエラーをスローすること / 订单不存在时应抛出错误', async () => {
      vi.mocked(InboundOrder.findById).mockResolvedValue(null as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      await expect(
        InboundWorkflow.partialReceive('nonexistent', 1, 5),
      ).rejects.toThrow(/入荷指示が見つかりません|部分入荷に失敗/);
    });

    it('存在しないライン番号でエラーをスローすること / 行号不存在时应抛出错误', async () => {
      const order = makeOrder();
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      await expect(
        InboundWorkflow.partialReceive(String(order._id), 999, 5),
      ).rejects.toThrow(/ライン番号|部分入荷に失敗/);
    });

    it('過受入（expectedQuantity 超過）でエラーをスローすること / 超量接收时应抛出错误', async () => {
      const order = makeOrder({
        lines: [
          {
            lineNumber: 1,
            productId: oid(),
            productSku: 'SKU-001',
            productName: '商品A',
            expectedQuantity: 10,
            receivedQuantity: 8, // すでに8受取 / 已接收8
            putawayQuantity: 0,
          },
        ],
      });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      // 残り2なのに5受取ろうとする = 合計13 > 10 / 剩余2但尝试接收5=合计13>10
      await expect(
        InboundWorkflow.partialReceive(String(order._id), 1, 5),
      ).rejects.toThrow(/予定数量を超えて|部分入荷に失敗/);
    });

    it('部分入荷で既存受入数に加算すること / 应在现有接收数量基础上累加', async () => {
      const order = makeOrder({
        lines: [
          {
            lineNumber: 1,
            productId: oid(),
            productSku: 'SKU-001',
            productName: '商品A',
            expectedQuantity: 10,
            receivedQuantity: 3, // 既存の受取 / 已接收3
            putawayQuantity: 0,
          },
        ],
      });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      await InboundWorkflow.partialReceive(String(order._id), 1, 4, 'user-1');

      // 3 + 4 = 7 に更新されること / 应更新为3+4=7
      expect(order.lines[0].receivedQuantity).toBe(7);
      expect(order.save).toHaveBeenCalled();
    });

    it('部分入荷で増分のみ在庫台帳に記帳すること / 部分接收时应只在台账中记录增量', async () => {
      const order = makeOrder({
        lines: [
          {
            lineNumber: 1,
            productId: oid(),
            productSku: 'SKU-001',
            productName: '商品A',
            expectedQuantity: 10,
            receivedQuantity: 3,
            putawayQuantity: 0,
          },
        ],
      });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      await InboundWorkflow.partialReceive(String(order._id), 1, 4);

      // 増分 4 だけ記帳 / 只记录增量4
      expect(InventoryLedger.create).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: 4 }),
      );
    });

    it('全ライン完了時に status を received に更新すること / 全行完成时应将状态更新为received', async () => {
      const order = makeOrder({
        lines: [
          {
            lineNumber: 1,
            productId: oid(),
            productSku: 'SKU-001',
            productName: '商品A',
            expectedQuantity: 10,
            receivedQuantity: 6,
            putawayQuantity: 0,
          },
        ],
      });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      // 残り4を受け取って合計10にする / 接收剩余4使合计达到10
      await InboundWorkflow.partialReceive(String(order._id), 1, 4);

      expect(order.status).toBe('received');
    });

    it('予定数ちょうどの受取は許可されること（境界値）/ 恰好等于预期数量时应被允许（边界值）', async () => {
      const order = makeOrder({
        lines: [
          {
            lineNumber: 1,
            productId: oid(),
            productSku: 'SKU-001',
            productName: '商品A',
            expectedQuantity: 10,
            receivedQuantity: 0,
            putawayQuantity: 0,
          },
        ],
      });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      await expect(
        InboundWorkflow.partialReceive(String(order._id), 1, 10),
      ).resolves.toBeDefined();
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // reportDamage / 損傷報告
  // ════════════════════════════════════════════════════════════════════════════

  describe('reportDamage / 損傷報告', () => {
    it('存在しない注文でエラーをスローすること / 订单不存在时应抛出错误', async () => {
      vi.mocked(InboundOrder.findById).mockResolvedValue(null as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      await expect(
        InboundWorkflow.reportDamage('nonexistent', 1, 2, '落下による破損'),
      ).rejects.toThrow(/入荷指示が見つかりません|損傷報告に失敗/);
    });

    it('損傷数が予定数を超える場合エラーをスローすること / 损坏数量超过预期数量时应抛出错误', async () => {
      const order = makeOrder();
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      // expectedQuantity は 10 なのに 15 の損傷を報告 / 预期数量为10但报告15的损坏
      await expect(
        InboundWorkflow.reportDamage(String(order._id), 1, 15, '破損'),
      ).rejects.toThrow(/損傷数|損傷報告に失敗/);
    });

    it('損傷メモをラインに記録すること / 应在行中记录损坏备注', async () => {
      const order = makeOrder();
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      await InboundWorkflow.reportDamage(String(order._id), 1, 2, '落下による破損', 'user-1');

      expect(order.lines[0].memo).toContain('損傷報告');
      expect(order.lines[0].memo).toContain('2');
      expect(order.lines[0].memo).toContain('落下による破損');
    });

    it('既存メモに損傷メモを追記すること / 应在已有备注中追加损坏备注', async () => {
      const order = makeOrder({
        lines: [
          {
            lineNumber: 1,
            productId: oid(),
            productSku: 'SKU-001',
            productName: '商品A',
            expectedQuantity: 10,
            receivedQuantity: 0,
            putawayQuantity: 0,
            memo: '既存メモ / 既有备注',
          },
        ],
      });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      await InboundWorkflow.reportDamage(String(order._id), 1, 1, '水濡れ');

      // 既存メモが保持され、追記されること / 应保留原有备注并追加新备注
      expect(order.lines[0].memo).toContain('既存メモ');
      expect(order.lines[0].memo).toContain('損傷報告');
    });

    it('在庫台帳にマイナス adjustment を記帳すること / 应在台账中记录负调整', async () => {
      const order = makeOrder();
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      await InboundWorkflow.reportDamage(String(order._id), 1, 3, '破損', 'user-1');

      expect(InventoryLedger.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'adjustment',
          quantity: -3,
          executedBy: 'user-1',
        }),
      );
    });

    it('INBOUND_DAMAGE_REPORTED イベントを発行すること / 应发布INBOUND_DAMAGE_REPORTED事件', async () => {
      const order = makeOrder();
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      await InboundWorkflow.reportDamage(String(order._id), 1, 2, '破損', 'user-1');

      expect(extensionManager.emit).toHaveBeenCalledWith(
        'inbound.damage.reported',
        expect.objectContaining({
          lineNumber: 1,
          damagedQuantity: 2,
          reason: '破損',
        }),
      );
    });

    it('損傷数 0 の境界値でも成功すること / 损坏数量为0时也应成功', async () => {
      const order = makeOrder();
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      await expect(
        InboundWorkflow.reportDamage(String(order._id), 1, 0, '念のため報告'),
      ).resolves.toBeDefined();
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // getWorkflowStatus / ワークフロー進捗取得
  // ════════════════════════════════════════════════════════════════════════════

  describe('getWorkflowStatus / ワークフロー進捗取得', () => {
    it('存在しない注文でエラーをスローすること / 订单不存在时应抛出错误', async () => {
      vi.mocked(InboundOrder.findById).mockResolvedValue(null as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      await expect(InboundWorkflow.getWorkflowStatus('nonexistent')).rejects.toThrow(
        /入荷指示が見つかりません|ワークフロー状態の取得に失敗/,
      );
    });

    it('order・tasks・progress を返すこと / 应返回order、tasks、progress', async () => {
      const order = makeOrder({
        lines: [
          {
            lineNumber: 1,
            productId: oid(),
            productSku: 'SKU-001',
            productName: '商品A',
            expectedQuantity: 10,
            receivedQuantity: 10, // 受入完了 / 接收完成
            putawayQuantity: 10, // 棚入れ完了 / 上架完成
          },
          {
            lineNumber: 2,
            productId: oid(),
            productSku: 'SKU-002',
            productName: '商品B',
            expectedQuantity: 5,
            receivedQuantity: 5, // 受入完了 / 接收完成
            putawayQuantity: 0, // 棚入れ未完了 / 上架未完成
          },
        ],
      });

      const mockTasks = [
        { _id: oid(), type: 'receiving', status: 'completed' },
        { _id: oid(), type: 'putaway', status: 'pending' },
      ];

      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);
      vi.mocked(WarehouseTask.find).mockReturnValue(chainLean(mockTasks) as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      const result = await InboundWorkflow.getWorkflowStatus(String(order._id));

      expect(result.order).toBeDefined();
      expect(result.tasks).toHaveLength(2);
      expect(result.progress.totalLines).toBe(2);
      expect(result.progress.receivedLines).toBe(2); // 2ライン受入完了 / 2行接收完成
      expect(result.progress.putawayLines).toBe(1); // 1ラインのみ棚入れ完了 / 只有1行上架完成
    });

    it('ラインが存在しない場合はゼロの進捗を返すこと / 没有行时应返回零进度', async () => {
      const order = makeOrder({ lines: [] });
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);
      vi.mocked(WarehouseTask.find).mockReturnValue(chainLean([]) as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      const result = await InboundWorkflow.getWorkflowStatus(String(order._id));

      expect(result.progress.totalLines).toBe(0);
      expect(result.progress.receivedLines).toBe(0);
      expect(result.progress.putawayLines).toBe(0);
    });

    it('部分受入の場合は receivedLines が部分的になること / 部分接收时receivedLines应为部分值', async () => {
      const order = makeOrder({
        lines: [
          {
            lineNumber: 1,
            productId: oid(),
            productSku: 'SKU-001',
            productName: '商品A',
            expectedQuantity: 10,
            receivedQuantity: 5, // 半分のみ受取 / 只接收一半
            putawayQuantity: 0,
          },
        ],
      });

      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);
      vi.mocked(WarehouseTask.find).mockReturnValue(chainLean([]) as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      const result = await InboundWorkflow.getWorkflowStatus(String(order._id));

      // receivedQuantity(5) < expectedQuantity(10) なので receivedLines は 0
      // receivedQuantity(5) < expectedQuantity(10)，所以receivedLines为0
      expect(result.progress.receivedLines).toBe(0);
    });

    it('WarehouseTask を referenceType と referenceId でフィルタすること / 应按referenceType和referenceId过滤WarehouseTask', async () => {
      const order = makeOrder();
      vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);
      vi.mocked(WarehouseTask.find).mockReturnValue(chainLean([]) as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');
      await InboundWorkflow.getWorkflowStatus(String(order._id));

      expect(WarehouseTask.find).toHaveBeenCalledWith({
        referenceType: 'inbound-order',
        referenceId: String(order._id),
      });
    });
  });
});
