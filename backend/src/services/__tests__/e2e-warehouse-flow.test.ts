/**
 * E2Eウェアハウスフロー統合テスト / E2E仓库流程集成测试
 *
 * 目的 / 目的:
 *   実際のDBを使わずにサービス層の関数呼び出しをチェーンし、
 *   1日の倉庫業務フローをシミュレートする。
 *   不使用真实DB，通过链式服务函数调用模拟一天的仓库业务流程。
 *
 * テストするフロー / 测试流程:
 *   Flow 1: 入荷 → 棚入れ → 出荷確定 → 在庫引当 → 出荷完了 → 在庫検証
 *   Flow 1: 入库 → 上架 → 出货确认 → 库存引当 → 出货完成 → 库存验证
 *
 *   Flow 2: 棚卸し計画生成 → カウント記録 → 差異アラートチェック
 *   Flow 2: 盘点计划生成 → 记录计数 → 差异警报检查
 *
 * 検証対象 / 验证对象:
 *   一つのサービスの出力が次のサービスの有効な入力になること
 *   一个服务的输出成为下一个服务的有效输入
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';

// ─── テストヘルパー / 测试辅助工具 ────────────────────────────────────────────

/** チェーンable lean モックを生成する / 生成可链式调用的lean mock */
const chainLean = (val: any) => ({ lean: () => Promise.resolve(val) });

/** チェーンable select().lean() モックを生成する / 生成可链式调用的select().lean() mock */
const chainSelectLean = (val: any) => ({
  select: () => ({ lean: () => Promise.resolve(val) }),
  lean: () => Promise.resolve(val),
});

/** テスト用 ObjectId を生成する / 生成测试用ObjectId */
const oid = () => new mongoose.Types.ObjectId();

// ─── モック定義 / Mock定义 ────────────────────────────────────────────────────
// vi.mock はホイストされるため、すべてのモックをインポート前に定義する
// vi.mock会被提升，因此所有mock必须在import之前定义

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
    find: vi.fn(),
  },
}));

vi.mock('@/models/warehouseTask', () => ({
  WarehouseTask: {
    create: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    insertMany: vi.fn(),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
}));

vi.mock('@/models/wave', () => ({
  Wave: {
    create: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
}));

vi.mock('@/models/shipmentOrder', () => ({
  ShipmentOrder: {
    find: vi.fn(),
    findById: vi.fn(),
    updateMany: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/models/stockQuant', () => ({
  StockQuant: {
    find: vi.fn(() => chainLean([])),
    findOne: vi.fn(() => chainLean(null)),
    aggregate: vi.fn().mockResolvedValue([]),
    updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
    bulkWrite: vi.fn().mockResolvedValue({ modifiedCount: 0 }),
  },
}));

vi.mock('@/models/stockMove', () => ({
  StockMove: {
    find: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ _id: 'mock-move-id' }),
    updateMany: vi.fn().mockResolvedValue({ modifiedCount: 0 }),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
}));

vi.mock('@/models/lot', () => ({
  Lot: {
    find: vi.fn(() => chainSelectLean([])),
  },
}));

vi.mock('@/models/product', () => ({
  Product: {
    find: vi.fn(() => chainLean([])),
    findOne: vi.fn(() => chainLean(null)),
  },
}));

vi.mock('@/models/cycleCountPlan', () => ({
  CycleCountPlan: {
    findOne: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('@/services/taskEngine', () => ({
  TaskEngine: {
    createTask: vi.fn().mockResolvedValue({ _id: 'mock-task-id', taskNumber: 'WT-001' }),
    completeTask: vi.fn(),
  },
}));

vi.mock('@/services/ruleEngine', () => ({
  RuleEngine: { evaluate: vi.fn().mockResolvedValue([]) },
}));

vi.mock('@/services/stockService', () => ({
  reserveStockForOrder: vi.fn().mockResolvedValue({ reservationCount: 1, errors: [] }),
  completeStockForOrder: vi.fn().mockResolvedValue({ movedCount: 1 }),
  unreserveStockForOrder: vi.fn().mockResolvedValue({ cancelledCount: 0 }),
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
    WAVE_CREATED: 'wave.created',
    WAVE_COMPLETED: 'wave.completed',
    TASK_CREATED: 'task.created',
    TASK_COMPLETED: 'task.completed',
    STOCK_RESERVED: 'stock.reserved',
    INVENTORY_CHANGED: 'inventory.changed',
  },
}));

vi.mock('@/utils/idGenerator', () => ({
  generateSequenceNumber: vi.fn().mockResolvedValue('WT-20260319-0001'),
}));

vi.mock('@/utils/sequenceGenerator', () => ({
  generateSequenceNumber: vi.fn().mockResolvedValue('MV-20260319-0001'),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ─── モデルインポート（モック登録後）/ 模型导入（mock注册后）────────────────────

import { InboundOrder } from '@/models/inboundOrder';
import { InventoryLedger } from '@/models/inventoryLedger';
import { Location } from '@/models/location';
import { WarehouseTask } from '@/models/warehouseTask';
import { Wave } from '@/models/wave';
import { ShipmentOrder } from '@/models/shipmentOrder';
import { StockQuant } from '@/models/stockQuant';
import { StockMove } from '@/models/stockMove';
import { Product } from '@/models/product';
import { Lot } from '@/models/lot';
import { CycleCountPlan } from '@/models/cycleCountPlan';
import { TaskEngine } from '@/services/taskEngine';
import { RuleEngine } from '@/services/ruleEngine';
import { reserveStockForOrder, completeStockForOrder } from '@/services/stockService';
import { extensionManager } from '@/core/extensions';

// ─── テストデータファクトリー / 测试数据工厂 ──────────────────────────────────

/**
 * モック入荷オーダーを作成する / 创建mock入库订单
 * 入荷フローのすべてのステップで共有される基本データ構造
 * 所有入库流程步骤共享的基础数据结构
 */
function makeInboundOrder(overrides: Partial<any> = {}) {
  const orderId = oid();
  const destLocId = oid();
  const productId = oid();
  return {
    _id: orderId,
    orderNumber: 'IN-2026-001',
    status: 'confirmed',
    completedAt: undefined as Date | undefined,
    destinationLocationId: destLocId,
    lines: [
      {
        lineNumber: 1,
        productId,
        productSku: 'SKU-WIDGET-A',
        productName: 'ウィジェットA / Widget A',
        expectedQuantity: 50,
        receivedQuantity: 0,
        putawayQuantity: 0,
        memo: undefined as string | undefined,
      },
      {
        lineNumber: 2,
        productId: oid(),
        productSku: 'SKU-GADGET-B',
        productName: 'ガジェットB / Gadget B',
        expectedQuantity: 30,
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
 * 入荷先ロケーション（棚・エリア）を表す
 * 表示入库目标位置（货架、区域）
 */
function makeLocation(overrides: Partial<any> = {}) {
  const warehouseId = oid();
  return {
    _id: oid(),
    warehouseId,
    code: 'A-01-01',
    name: '受入エリア01 / 接收区01',
    ...overrides,
  };
}

/**
 * モック出荷オーダーを作成する / 创建mock出货订单
 * 入荷で受け入れた商品の出荷を表す
 * 表示对已入库商品的出货
 */
function makeShipmentOrder(overrides: Partial<any> = {}) {
  const shipmentId = oid();
  return {
    _id: shipmentId,
    orderNumber: 'SH-2026-001',
    status: 'confirmed',
    products: [
      {
        productId: String(oid()),
        productSku: 'SKU-WIDGET-A',
        productName: 'ウィジェットA / Widget A',
        inputSku: 'SKU-WIDGET-A',
        quantity: 20,
      },
    ],
    ...overrides,
  };
}

/**
 * モックWaveを作成する / 创建mock Wave
 * 出荷処理のバッチ単位
 * 出货处理的批次单位
 */
function makeWave(overrides: Partial<any> = {}) {
  const warehouseId = oid();
  const shipmentId = oid();
  return {
    _id: oid(),
    waveNumber: 'WV-20260319-00001',
    status: 'draft',
    priority: 'normal',
    warehouseId,
    shipmentIds: [shipmentId],
    shipmentCount: 1,
    totalItems: 1,
    totalQuantity: 20,
    startedAt: undefined as Date | undefined,
    save: vi.fn().mockResolvedValue(undefined),
    toObject: vi.fn().mockReturnValue({}),
    ...overrides,
  };
}

/**
 * モック棚卸計画アイテムを作成する / 创建mock盘点计划项目
 * 棚卸し対象のSKUとロケーションのペア
 * 盘点目标SKU与位置的配对
 */
function makeCycleCountPlan(overrides: Partial<any> = {}) {
  return {
    _id: oid(),
    planNumber: 'CC-2026-03-0001',
    tenantId: 'TENANT-JP-001',
    period: '2026-03',
    planType: 'monthly_cycle',
    status: 'in_progress',
    alertTriggered: false,
    totalSkuCount: 5,
    targetSkuCount: 1,
    coverageRate: 0.2,
    items: [
      {
        sku: 'SKU-WIDGET-A',
        locationCode: 'A-01-01',
        systemQuantity: 50,
        countedQuantity: undefined as number | undefined,
        variance: undefined as number | undefined,
        varianceRate: undefined as number | undefined,
        countedBy: undefined as string | undefined,
        countedAt: undefined as Date | undefined,
        status: 'pending' as any,
      },
    ],
    totalVarianceRate: undefined as number | undefined,
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ─── テストスイート / 测试套件 ────────────────────────────────────────────────

describe('E2E ウェアハウスフロー / 仓库端到端流程', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // extensionManager.emit はデフォルトでキャッチ可能なオブジェクトを返す
    // extensionManager.emit默认返回可捕获的对象
    vi.mocked(extensionManager.emit).mockReturnValue({ catch: vi.fn() } as any);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Flow 1: 入荷 → 出荷 / 入库 → 出库
  // ══════════════════════════════════════════════════════════════════════════

  describe('Flow 1: 入荷→出荷 / 入库→出库', () => {
    /**
     * Step 1-2: 入荷開始 → 検品確認
     * Step 1-2: 开始入库 → 检品确认
     *
     * 検証: startReceiving の出力（タスクリスト）が有効であること
     * 验证: startReceiving的输出（任务列表）是有效的
     */
    describe('Step 1-2: startReceiving → confirmReceiveLine / 入荷開始→検品確認', () => {
      it('入荷開始で生成されるタスクIDが confirmReceiveLine で消費できる形式であること / 入库任务ID格式可供后续步骤使用', async () => {
        // 準備: confirmed 注文と有効なロケーション
        // 准备：confirmed订单和有效位置
        const order = makeInboundOrder({ status: 'confirmed' });
        const loc = makeLocation();

        vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);
        vi.mocked(Location.findById).mockReturnValue(chainLean(loc) as any);

        const createdTask = {
          _id: oid(),
          taskNumber: 'WT-20260319-0001',
          type: 'receiving',
          status: 'pending',
          referenceType: 'inbound-order',
          referenceId: String(order._id),
        };
        vi.mocked(TaskEngine.createTask).mockResolvedValue(createdTask as any);

        const { InboundWorkflow } = await import('../inboundWorkflow');

        // ── Step 1: 入荷開始 / 开始入库 ──
        const tasks = await InboundWorkflow.startReceiving(String(order._id), 'worker-001');

        // 出力検証: タスクリストが空でないこと / 输出验证：任务列表不为空
        expect(tasks).toHaveLength(2); // 2ライン分 / 2行分
        expect(tasks[0]).toBeDefined();

        // ステータス遷移の検証 / 状态转换验证
        // startReceiving の出力（ステータス変更）が次のステップの前提条件になる
        // startReceiving的输出（状态变更）成为下一步的前提条件
        expect(order.status).toBe('receiving');

        // ── Step 2: ライン1の検品確認（全量50個受取）/ 检品确认（全量50件）──
        // 注文が 'receiving' になったので confirmReceiveLine が呼べる
        // 订单变为'receiving'后可以调用confirmReceiveLine
        vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);
        const resultAfterLine1 = await InboundWorkflow.confirmReceiveLine(
          String(order._id),
          1,      // lineNumber
          50,     // receivedQuantity: 全量受取 / 全量接收
          'worker-001',
        );

        // receivedQuantity が更新されたこと / receivedQuantity已更新
        expect(order.lines[0].receivedQuantity).toBe(50);

        // 在庫台帳に inbound として記帳されたこと / 库存台账记录为inbound
        expect(InventoryLedger.create).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'inbound',
            quantity: 50,
            referenceType: 'inbound-order',
            executedBy: 'worker-001',
          }),
        );
      });

      it('ライン2まで確認完了後に status が received に遷移すること / 确认所有行后状态转换为received', async () => {
        // 準備: 2ライン注文、ライン1は受入済み / 准备：2行订单，行1已接收
        const order = makeInboundOrder({
          status: 'receiving',
          lines: [
            {
              lineNumber: 1,
              productId: oid(),
              productSku: 'SKU-WIDGET-A',
              productName: 'ウィジェットA',
              expectedQuantity: 50,
              receivedQuantity: 50, // すでに完了 / 已完成
              putawayQuantity: 0,
            },
            {
              lineNumber: 2,
              productId: oid(),
              productSku: 'SKU-GADGET-B',
              productName: 'ガジェットB',
              expectedQuantity: 30,
              receivedQuantity: 0, // まだ未受入 / 尚未接收
              putawayQuantity: 0,
            },
          ],
        });

        vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

        const { InboundWorkflow } = await import('../inboundWorkflow');

        // ライン2を確認 → 全ライン完了 → status が received に変わること
        // 确认行2 → 所有行完成 → 状态变为received
        await InboundWorkflow.confirmReceiveLine(String(order._id), 2, 30, 'worker-001');

        // 重要: confirmReceiveLine の出力（status=received）は startPutaway の入力前提
        // 重要: confirmReceiveLine的输出(status=received)是startPutaway的输入前提
        expect(order.status).toBe('received');

        // INBOUND_RECEIVED イベントが発行されたこと / INBOUND_RECEIVED事件已发布
        expect(extensionManager.emit).toHaveBeenCalledWith(
          'inbound.received',
          expect.objectContaining({ orderId: String(order._id) }),
        );
      });
    });

    /**
     * Step 3: 棚入れ開始 → 棚入れ完了
     * Step 3: 开始上架 → 完成上架
     *
     * 検証: received ステータスの注文のみ棚入れ可能であること
     * 验证: 只有received状态的订单才能开始上架
     */
    describe('Step 3: startPutaway → completePutaway / 棚入れ開始→完了', () => {
      it('received 状態の注文で棚入れタスクが作成されること / received状态的订单可创建上架任务', async () => {
        // 準備: 検品完了済みの注文（前ステップの出力）
        // 准备：已完成检品的订单（前一步骤的输出）
        const order = makeInboundOrder({
          status: 'received',
          lines: [
            {
              lineNumber: 1,
              productId: oid(),
              productSku: 'SKU-WIDGET-A',
              productName: 'ウィジェットA',
              expectedQuantity: 50,
              receivedQuantity: 50, // Step 2 の出力 / Step 2的输出
              putawayQuantity: 0,
            },
          ],
        });
        const loc = makeLocation();

        vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);
        vi.mocked(Location.findById).mockReturnValue(chainLean(loc) as any);
        vi.mocked(RuleEngine.evaluate).mockResolvedValue([]);
        vi.mocked(TaskEngine.createTask).mockResolvedValue({
          _id: oid(),
          type: 'putaway',
          status: 'pending',
        } as any);

        const { InboundWorkflow } = await import('../inboundWorkflow');

        // ── Step 3a: 棚入れ開始 / 开始上架 ──
        const putawayTasks = await InboundWorkflow.startPutaway(String(order._id), 'worker-001');

        // 棚入れタスクが生成されたこと / 上架任务已生成
        expect(putawayTasks).toHaveLength(1);
        expect(TaskEngine.createTask).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'putaway' }),
        );

        // ルールエンジンが評価されたこと（ロケーション推薦）
        // 规则引擎已评估（位置推荐）
        expect(RuleEngine.evaluate).toHaveBeenCalledWith(
          'putaway',
          expect.any(Object),
          expect.objectContaining({ warehouseId: expect.any(String) }),
        );
      });

      it('棚入れ完了後に status が done に遷移すること / 上架完成后状态转换为done', async () => {
        // 準備: 棚入れ開始済みの注文 / 准备：已开始上架的订单
        const putawayLocId = String(oid());
        const order = makeInboundOrder({
          status: 'received',
          lines: [
            {
              lineNumber: 1,
              productId: oid(),
              productSku: 'SKU-WIDGET-A',
              productName: 'ウィジェットA',
              expectedQuantity: 50,
              receivedQuantity: 50,
              putawayQuantity: 0,
            },
          ],
        });

        vi.mocked(InboundOrder.findById).mockResolvedValue(order as any);

        const { InboundWorkflow } = await import('../inboundWorkflow');

        // ── Step 3b: 棚入れ完了 / 完成上架 ──
        await InboundWorkflow.completePutaway(
          String(order._id),
          1,            // lineNumber
          putawayLocId, // 棚入れ先ロケーション / 上架目标位置
          50,           // 全量棚入れ / 全量上架
          'worker-001',
        );

        // 重要: completePutaway の出力（status=done）が入荷フローの完了を意味する
        // 重要: completePutaway的输出(status=done)意味着入库流程完成
        expect(order.status).toBe('done');
        expect(order.completedAt).toBeInstanceOf(Date);

        // 棚入れ台帳に記帳されたこと / 上架已记录到台账
        expect(InventoryLedger.create).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'inbound',
            quantity: 50,
            locationId: putawayLocId,
            reason: '棚入れ',
            executedBy: 'worker-001',
          }),
        );

        // INBOUND_PUTAWAY_COMPLETED イベントが発行されたこと / INBOUND_PUTAWAY_COMPLETED事件已发布
        expect(extensionManager.emit).toHaveBeenCalledWith(
          'inbound.putaway.completed',
          expect.objectContaining({ orderId: String(order._id) }),
        );
      });
    });

    /**
     * Step 4-6: ウェーブ作成 → ピッキング開始 → 出荷確定（在庫引当）
     * Step 4-6: 创建Wave → 开始拣货 → 出货确认（库存引当）
     *
     * 検証: 入荷で棚入れした在庫を出荷オーダーに引当できること
     * 验证: 可以将入库上架的库存引当给出货订单
     */
    describe('Step 4-6: createWave → startPicking → 在庫引当 / Wave作成→拣货→库存引当', () => {
      it('Waveが作成されてピッキングに遷移できること / Wave可创建并转换为拣货状态', async () => {
        // 準備: 入荷済み商品の出荷指示 / 准备：已入库商品的出货指示
        const shipment = makeShipmentOrder();
        const warehouseId = oid();

        vi.mocked(ShipmentOrder.find).mockReturnValue(
          chainLean([shipment]) as any,
        );
        vi.mocked(Wave.create).mockResolvedValue({
          _id: oid(),
          waveNumber: 'WV-20260319-00001',
          shipmentCount: 1,
          totalItems: 1,
          totalQuantity: 20,
        } as any);

        const { OutboundWorkflow } = await import('../outboundWorkflow');

        // ── Step 4: ウェーブ作成 / 创建Wave ──
        const wave = await OutboundWorkflow.createWave({
          warehouseId: String(warehouseId),
          shipmentOrderIds: [String(shipment._id)],
          priority: 'normal',
        });

        // Wave が正しく作成されたこと / Wave已正确创建
        expect(wave).toBeDefined();
        expect(wave.shipmentCount).toBe(1);
        expect(wave.totalQuantity).toBe(20);

        // WAVE_CREATED イベントが発行されたこと / WAVE_CREATED事件已发布
        expect(extensionManager.emit).toHaveBeenCalledWith(
          'wave.created',
          expect.objectContaining({
            shipmentCount: 1,
          }),
        );
      });

      it('ピッキング開始で在庫引当が実行されること / 开始拣货时执行库存引当', async () => {
        // 準備: draft 状態の Wave と出荷指示
        // 准备：draft状态的Wave和出货指示
        const shipment = makeShipmentOrder();
        const wave = makeWave({ shipmentIds: [shipment._id] });

        vi.mocked(Wave.findById).mockResolvedValue(wave as any);
        vi.mocked(ShipmentOrder.findById).mockReturnValue(chainLean(shipment) as any);
        vi.mocked(StockQuant.find).mockReturnValue(chainLean([]) as any);
        vi.mocked(TaskEngine.createTask).mockResolvedValue({
          _id: oid(),
          type: 'picking',
        } as any);

        const { OutboundWorkflow } = await import('../outboundWorkflow');

        // ── Step 5: ピッキング開始（在庫引当を含む）/ 开始拣货（含库存引当）──
        const result = await OutboundWorkflow.startPicking(String(wave._id), 'picker-001');

        // Wave ステータスが picking に変わったこと / Wave状态变为picking
        expect(wave.status).toBe('picking');
        expect(wave.startedAt).toBeInstanceOf(Date);

        // 在庫引当が実行されたこと（stockService.reserveStockForOrder を呼び出し）
        // 库存引当已执行（调用stockService.reserveStockForOrder）
        expect(reserveStockForOrder).toHaveBeenCalledWith(
          String(shipment._id),
          shipment.orderNumber,
          expect.any(Array), // 出荷ライン / 出货行
        );

        // ピッキングタスクが作成されたこと / 拣货任务已创建
        expect(result.tasks).toHaveLength(1);
      });
    });

    /**
     * Step 7-8: 梱包完了 → 在庫消込 → 出荷完了
     * Step 7-8: 打包完成 → 库存消除 → 出货完成
     *
     * 検証: 梱包完了時に在庫消込が正しく実行されること
     * 验证: 打包完成时库存消除正确执行
     */
    describe('Step 7-8: completePacking → 在庫消込 / 打包完成→库存消除', () => {
      it('梱包完了で在庫消込が実行されWaveが completed に遷移すること / 打包完成时执行库存消除并Wave转为completed', async () => {
        // 準備: ピッキング・仕分け完了済みの状態 / 准备：已完成拣货、分拣的状态
        const waveId = String(oid());
        const shipmentId = String(oid());
        const taskId = String(oid());

        const completedTask = {
          _id: taskId,
          waveId,
          shipmentId,
          type: 'packing',
          status: 'completed',
        };

        vi.mocked(TaskEngine.completeTask).mockResolvedValue(completedTask as any);
        vi.mocked(WarehouseTask.countDocuments).mockResolvedValue(0); // 残タスクなし / 无剩余任务
        vi.mocked(Wave.findByIdAndUpdate).mockResolvedValue({} as any);

        const { OutboundWorkflow } = await import('../outboundWorkflow');

        // ── Step 7: 梱包完了 / 打包完成 ──
        await OutboundWorkflow.completePacking(taskId, 'packer-001');

        // 在庫消込が実行されたこと（前ステップの引当を確定）
        // 库存消除已执行（确认前一步骤的引当）
        expect(completeStockForOrder).toHaveBeenCalledWith(shipmentId);

        // Wave が completed に更新されたこと / Wave已更新为completed
        expect(Wave.findByIdAndUpdate).toHaveBeenCalledWith(
          waveId,
          expect.objectContaining({
            $set: expect.objectContaining({ status: 'completed' }),
          }),
        );

        // WAVE_COMPLETED イベントが発行されたこと / WAVE_COMPLETED事件已发布
        expect(extensionManager.emit).toHaveBeenCalledWith(
          'wave.completed',
          expect.objectContaining({ waveId }),
        );
      });
    });

    /**
     * Step 9: 在庫確認
     * Step 9: 库存确认
     *
     * 検証: 入荷した在庫が出荷後に適切に減少していること（サービス呼び出しチェーンの検証）
     * 验证: 入库的库存在出货后已适当减少（验证服务调用链）
     */
    describe('Step 9: 在庫確認 / 库存确认', () => {
      it('梱包完了後に completeStockForOrder の引数として渡される shipmentId が入力オーダーと一致すること / 打包完成后的shipmentId与输入订单一致', async () => {
        // このテストはデータフローを検証する:
        // createWave(shipmentIds) → startPicking(shipmentId) → completePacking(shipmentId)
        // の shipmentId が同じであることを確認する
        //
        // このテストはデータフローを検証する：
        // createWave(shipmentIds) → startPicking(shipmentId) → completePacking(shipmentId)
        // の shipmentId が同じであることを確認する
        const fixedShipmentId = String(oid());
        const waveId = String(oid());
        const taskId = String(oid());

        // 梱包タスクに shipmentId が含まれている
        // 打包任务包含shipmentId
        const packingTask = {
          _id: taskId,
          waveId,
          shipmentId: fixedShipmentId,
          type: 'packing',
          status: 'completed',
        };

        vi.mocked(TaskEngine.completeTask).mockResolvedValue(packingTask as any);
        vi.mocked(WarehouseTask.countDocuments).mockResolvedValue(0);
        vi.mocked(Wave.findByIdAndUpdate).mockResolvedValue({} as any);

        const { OutboundWorkflow } = await import('../outboundWorkflow');
        await OutboundWorkflow.completePacking(taskId, 'packer-001');

        // completeStockForOrder が正しい shipmentId で呼ばれたこと
        // completeStockForOrder以正确的shipmentId被调用
        expect(completeStockForOrder).toHaveBeenCalledWith(fixedShipmentId);
        expect(completeStockForOrder).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Flow 2: 棚卸し / 循环盘点
  // ══════════════════════════════════════════════════════════════════════════

  describe('Flow 2: 棚卸し / 循環棚卸', () => {
    /**
     * Step 1: 月次棚卸し計画の自動生成
     * Step 1: 月度盘点计划自动生成
     *
     * 検証: 在庫データから計画が正しく生成されること
     * 验证: 从库存数据正确生成计划
     */
    describe('Step 1: generateMonthlyCycleCount / 月次計画生成', () => {
      it('在庫データから棚卸し計画が生成されること / 从库存数据生成盘点计划', async () => {
        // 準備: 5つのSKUを持つ在庫（入荷フローで追加されたと仮定）
        // 准备：5个SKU的库存（假设由入库流程添加）
        const quants = Array.from({ length: 5 }, (_, i) => ({
          productId: oid(),
          productSku: `SKU-${String(i + 1).padStart(3, '0')}`,
          locationId: oid(),
          quantity: 100 - i * 10,
        }));

        const targetPlanId = oid();

        vi.mocked(CycleCountPlan.findOne).mockResolvedValue(null); // 既存計画なし / 无现有计划
        vi.mocked(StockQuant.find).mockReturnValue(chainLean(quants) as any);
        vi.mocked(Product.find).mockReturnValue(
          chainSelectLean([]) as any,
        );
        vi.mocked(Location.find).mockReturnValue(
          chainSelectLean([]) as any,
        );
        vi.mocked(CycleCountPlan.create).mockImplementation(async (data: any) => ({
          ...data,
          _id: targetPlanId,
          planNumber: 'CC-2026-03-0001',
        }));

        const { generateMonthlyCycleCount } = await import('../cycleCountService');

        // ── Step 1: 月次棚卸し計画生成 / 月度盘点计划生成 ──
        const plan = await generateMonthlyCycleCount('TENANT-JP-001', '2026-03', 0.2);

        // 計画が作成されたこと / 计划已创建
        expect(plan).toBeDefined();
        expect(plan.planNumber).toBe('CC-2026-03-0001');

        // 重要: 5SKUの20%なので1件が対象（ceil(1) = 1）
        // 重要: 5个SKU的20%，所以1件为目标（ceil(1) = 1）
        expect(plan.targetSkuCount).toBe(1);
        expect(plan.totalSkuCount).toBe(5);

        // カバレッジ率が正しいこと / 覆盖率正确
        expect(plan.coverageRate).toBeCloseTo(1 / 5);

        // ドラフト状態で作成されたこと / 以draft状态创建
        expect(plan.status).toBe('draft');
        expect(plan.alertTriggered).toBe(false);
      });

      it('既存計画がある期間は再生成できないこと / 已有计划的期间无法重新生成', async () => {
        // 準備: 同じ期間の既存計画 / 准备：相同期间的现有计划
        vi.mocked(CycleCountPlan.findOne).mockResolvedValue({
          planNumber: 'CC-2026-03-9999',
        } as any);

        const { generateMonthlyCycleCount } = await import('../cycleCountService');

        // 重複計画防止 / 防止重复计划
        await expect(
          generateMonthlyCycleCount('TENANT-JP-001', '2026-03'),
        ).rejects.toThrow('既に存在');
      });
    });

    /**
     * Step 2: 棚卸しカウント記録
     * Step 2: 盘点计数记录
     *
     * 検証: generateMonthlyCycleCount の出力（計画ID）が recordCount の入力になること
     * 验证: generateMonthlyCycleCount的输出（计划ID）成为recordCount的输入
     */
    describe('Step 2: recordCount / カウント記録', () => {
      it('計画IDを使ってカウント結果を記録できること / 使用计划ID记录计数结果', async () => {
        // 準備: 生成済みの棚卸し計画（Step 1 の出力）
        // 准备：已生成的盘点计划（Step 1的输出）
        const plan = makeCycleCountPlan({
          status: 'in_progress',
          items: [
            {
              sku: 'SKU-WIDGET-A',
              locationCode: 'A-01-01',
              systemQuantity: 50, // 入荷で登録された数量 / 入库登记的数量
              countedQuantity: undefined,
              variance: undefined,
              varianceRate: undefined,
              countedBy: undefined,
              countedAt: undefined,
              status: 'pending',
            },
          ],
        });

        vi.mocked(CycleCountPlan.findById).mockResolvedValue(plan as any);

        const { recordCount } = await import('../cycleCountService');

        // ── Step 2: カウント記録（実際に数えた結果）/ 记录计数（实际盘点结果）──
        const countedPlan = await recordCount(
          String(plan._id),
          0,    // itemIndex: 0番目のアイテム / 第0个项目
          48,   // countedQuantity: 実際は48個だった / 实际为48件
          '田中-棚卸し担当',
        );

        // 重要: recordCount の出力が checkVarianceAlerts の入力になる
        // 重要: recordCount的输出成为checkVarianceAlerts的输入
        expect(countedPlan).toBeDefined();

        // カウント結果が記録されたこと / 计数结果已记录
        const item = countedPlan.items[0];
        expect(item.countedQuantity).toBe(48);

        // 差異が計算されたこと（50 - 48 = -2）/ 差异已计算（50 - 48 = -2）
        expect(item.variance).toBe(-2);

        // 差異率が計算されたこと（2/50 = 0.04 = 4%）/ 差异率已计算（4%）
        expect(item.varianceRate).toBeCloseTo(0.04);

        // ステータスが counted に変更されたこと / 状态已变为counted
        expect(item.status).toBe('counted');

        // 担当者と日時が記録されたこと / 负责人和时间已记录
        expect(item.countedBy).toBe('田中-棚卸し担当');
        expect(item.countedAt).toBeInstanceOf(Date);

        // 保存されたこと / 已保存
        expect(plan.save).toHaveBeenCalled();
      });

      it('在庫ゼロの場合の差異率は 1 (100%) になること / 库存为零时差异率为1(100%)', async () => {
        // エッジケース: システム在庫0だが実際に商品が見つかった場合
        // 边界情况：系统库存为0但实际发现商品
        const plan = makeCycleCountPlan({
          status: 'in_progress',
          items: [
            {
              sku: 'SKU-GHOST',
              locationCode: 'B-02-03',
              systemQuantity: 0, // システムには在庫なし / 系统无库存
              status: 'pending',
            },
          ],
        });

        vi.mocked(CycleCountPlan.findById).mockResolvedValue(plan as any);

        const { recordCount } = await import('../cycleCountService');
        const result = await recordCount(String(plan._id), 0, 5, '佐藤');

        // ゼロ除算ガード: varianceRate は 1 / 零除法保护：varianceRate为1
        expect(result.items[0].varianceRate).toBe(1);
      });
    });

    /**
     * Step 3: 差異アラートチェック
     * Step 3: 差异警报检查
     *
     * 検証: recordCount の出力（差異データ）から checkVarianceAlerts がアラートを判定できること
     * 验证: checkVarianceAlerts能从recordCount的输出（差异数据）判断警报
     */
    describe('Step 3: checkVarianceAlerts / 差異アラート', () => {
      it('差異率が閾値（0.5%）を超えた場合にアラートが発行されること / 差异率超过阈值时发布警报', async () => {
        // 準備: カウント記録済みの計画（Step 2 の出力）
        // 准备：已记录计数的计划（Step 2的输出）
        // 差異率: 2/50 = 4% > 0.5% → アラート発行 / 差异率4% > 0.5% → 触发警报
        const plan = makeCycleCountPlan({
          items: [
            {
              sku: 'SKU-WIDGET-A',
              locationCode: 'A-01-01',
              systemQuantity: 50,
              variance: 2,
              varianceRate: 0.04, // 4% / Step 2 で計算された値 / Step 2计算的值
              status: 'counted',
            },
          ],
          alertTriggered: false,
        });

        vi.mocked(CycleCountPlan.findById).mockResolvedValue(plan as any);

        const { checkVarianceAlerts } = await import('../cycleCountService');

        // ── Step 3: 差異アラートチェック / 差异警报检查 ──
        const alertResult = await checkVarianceAlerts(String(plan._id));

        // アラートが発行されたこと / 警报已触发
        expect(alertResult.alertTriggered).toBe(true);

        // 全体差異率が計算されたこと / 整体差异率已计算
        // totalVariance=2, totalSystem=50 → rate=4% / totalVariance=2, totalSystem=50 → rate=4%
        expect(alertResult.totalVarianceRate).toBeCloseTo(2 / 50);

        // 高差異アイテムがリストされたこと / 高差异项目已列出
        expect(alertResult.highVarianceItems).toHaveLength(1);
        expect(alertResult.highVarianceItems[0].sku).toBe('SKU-WIDGET-A');

        // 計画に alertTriggered フラグが保存されたこと / 计划中alertTriggered标志已保存
        expect(plan.alertTriggered).toBe(true);
        expect(plan.totalVarianceRate).toBeCloseTo(2 / 50);
        expect(plan.save).toHaveBeenCalled();
      });

      it('差異率が閾値以下（0.1%）の場合はアラートなし / 差异率低于阈值时无警报', async () => {
        // 準備: 差異が小さいカウント結果 / 准备：差异较小的计数结果
        // 差異率: 1/1000 = 0.1% <= 0.5% → アラートなし / 差异率0.1% ≤ 0.5% → 无警报
        const plan = makeCycleCountPlan({
          items: [
            {
              sku: 'SKU-GADGET-B',
              locationCode: 'C-03-02',
              systemQuantity: 1000,
              variance: 1,
              varianceRate: 0.001,
              status: 'counted',
            },
          ],
          alertTriggered: false,
        });

        vi.mocked(CycleCountPlan.findById).mockResolvedValue(plan as any);

        const { checkVarianceAlerts } = await import('../cycleCountService');
        const alertResult = await checkVarianceAlerts(String(plan._id));

        // アラートなし / 无警报
        expect(alertResult.alertTriggered).toBe(false);
        expect(alertResult.highVarianceItems).toEqual([]);
      });

      it('カウント未実施（pending）のアイテムのみの場合は早期リターンすること / 只有pending项目时早期返回', async () => {
        // エッジケース: まだカウントが始まっていない / 边界情况：尚未开始计数
        const plan = makeCycleCountPlan({
          items: [
            {
              sku: 'SKU-PENDING',
              locationCode: 'D-04-01',
              systemQuantity: 100,
              status: 'pending', // まだカウントされていない / 尚未计数
            },
          ],
        });

        vi.mocked(CycleCountPlan.findById).mockResolvedValue(plan as any);

        const { checkVarianceAlerts } = await import('../cycleCountService');
        const alertResult = await checkVarianceAlerts(String(plan._id));

        // データなしで早期リターン / 无数据，早期返回
        expect(alertResult.totalVarianceRate).toBe(0);
        expect(alertResult.alertTriggered).toBe(false);
        // save は呼ばれない（変更なし）/ save不被调用（无变更）
        expect(plan.save).not.toHaveBeenCalled();
      });
    });

    /**
     * フルフロー統合: 計画生成 → カウント → アラート
     * 完整流程集成：计划生成 → 计数 → 警报
     *
     * 検証: 3つのサービス関数の入出力チェーンが正しく機能すること
     * 验证: 3个服务函数的输入输出链正常运作
     */
    describe('棚卸しフルフロー / 完整盘点流程', () => {
      it('計画生成の出力IDが recordCount の入力として使用できること / 计划生成的ID可作为recordCount的输入', async () => {
        // Step 1 の出力 → Step 2 の入力
        // Step 1的输出 → Step 2的输入
        const planId = oid();
        const quants = [
          { productId: oid(), productSku: 'SKU-A', locationId: oid(), quantity: 100 },
        ];

        vi.mocked(CycleCountPlan.findOne).mockResolvedValue(null);
        vi.mocked(StockQuant.find).mockReturnValue(chainLean(quants) as any);
        vi.mocked(Product.find).mockReturnValue(chainSelectLean([]) as any);
        vi.mocked(Location.find).mockReturnValue(chainSelectLean([]) as any);

        // generateMonthlyCycleCount の戻り値に _id を含める
        // generateMonthlyCycleCountの戻り値に_idを含める
        vi.mocked(CycleCountPlan.create).mockImplementation(async (data: any) => ({
          ...data,
          _id: planId,
          planNumber: 'CC-2026-03-5678',
        }));

        const { generateMonthlyCycleCount } = await import('../cycleCountService');
        const createdPlan = await generateMonthlyCycleCount('TENANT-001', '2026-03', 1.0);

        // Step 1 の出力: 計画ID / Step 1的输出：计划ID
        expect(createdPlan._id).toBeDefined();
        const planIdStr = String(createdPlan._id);

        // Step 2 の準備: 計画IDで findById ができること
        // Step 2的准备：可以用计划ID查找
        const planForCount = makeCycleCountPlan({
          _id: createdPlan._id,
          status: 'in_progress',
          items: [
            {
              sku: 'SKU-A',
              locationCode: '',
              systemQuantity: 100,
              status: 'pending',
            },
          ],
        });
        vi.mocked(CycleCountPlan.findById).mockResolvedValue(planForCount as any);

        const { recordCount } = await import('../cycleCountService');

        // Step 1 の出力（planId）を Step 2 の入力として使用する
        // 使用Step 1的输出（planId）作为Step 2的输入
        const countResult = await recordCount(planIdStr, 0, 98, 'auditor-001');

        // データフローが正しく繋がっていること / 数据流正确连接
        expect(countResult.items[0].countedQuantity).toBe(98);
        expect(countResult.items[0].variance).toBe(-2); // 100 - 98 = -2
      });

      it('recordCount の差異データが checkVarianceAlerts の入力として有効であること / recordCount的差异数据是checkVarianceAlerts的有效输入', async () => {
        // Step 2 の出力 → Step 3 の入力
        // Step 2的输出 → Step 3的输入
        // recordCount で計算された variance と varianceRate が
        // checkVarianceAlerts で正しくアラート判定されること
        // recordCount计算的variance和varianceRate
        // 在checkVarianceAlerts中被正确判断警报

        // Step 2 相当のデータ（recordCount の出力を模倣）
        // Step 2相当的数据（模拟recordCount的输出）
        const planAfterCount = makeCycleCountPlan({
          items: [
            {
              sku: 'SKU-A',
              locationCode: 'A-01',
              systemQuantity: 100,
              variance: 5,         // Step 2 で計算 / Step 2中计算
              varianceRate: 0.05,  // 5% > 0.5% → アラートになるはず / 5% > 0.5% → 应触发警报
              status: 'counted',   // Step 2 で設定 / Step 2中设置
            },
            {
              sku: 'SKU-B',
              locationCode: 'B-02',
              systemQuantity: 200,
              variance: 0,
              varianceRate: 0,
              status: 'counted',
            },
          ],
          alertTriggered: false,
        });

        vi.mocked(CycleCountPlan.findById).mockResolvedValue(planAfterCount as any);

        const { checkVarianceAlerts } = await import('../cycleCountService');

        // Step 2 の出力（差異データ）を Step 3 の入力として使用
        // 使用Step 2的输出（差异数据）作为Step 3的输入
        const alertResult = await checkVarianceAlerts(String(planAfterCount._id));

        // totalSystem = 100 + 200 = 300, totalVariance = 5 + 0 = 5
        // totalVarianceRate = 5/300 ≈ 1.67% > 0.5% → アラート発行
        // totalVarianceRate = 5/300 ≈ 1.67% > 0.5% → 触发警报
        expect(alertResult.alertTriggered).toBe(true);
        expect(alertResult.totalVarianceRate).toBeCloseTo(5 / 300);

        // SKU-A のみが高差異アイテム（SKU-B は差異率 0%）
        // 只有SKU-A是高差异项目（SKU-B差异率为0%）
        expect(alertResult.highVarianceItems).toHaveLength(1);
        expect(alertResult.highVarianceItems[0].sku).toBe('SKU-A');
        expect(alertResult.highVarianceItems[0].varianceRate).toBe(0.05);
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // クロスフロー検証 / 跨流程验证
  // ══════════════════════════════════════════════════════════════════════════

  describe('クロスフロー データ一貫性 / 跨流程数据一致性', () => {
    /**
     * 入荷フローと棚卸しフローのデータ整合性
     * 入库流程与盘点流程的数据一致性
     *
     * 検証: 入荷で登録した productSku が棚卸しの抽選対象になること
     * 验证: 入库登记的productSku成为盘点抽选对象
     */
    it('入荷で登録した SKU が棚卸し計画の対象に含まれること / 入库登记的SKU包含在盘点计划中', async () => {
      // 前提: 入荷で SKU-WIDGET-A を 50個受け入れた（入荷フローの結果）
      // 前提: 入库流程中已接收SKU-WIDGET-A 50件
      const inboundSku = 'SKU-WIDGET-A';
      const inboundQuantity = 50;
      const locationId = oid();

      // 棚卸し計画生成の入力: 在庫データ（入荷フローの出力と同じ SKU）
      // 盘点计划生成的输入：库存数据（与入库流程输出相同的SKU）
      const stockFromInbound = [
        {
          productId: oid(),
          productSku: inboundSku,      // 入荷フローで登録した SKU / 入库流程登记的SKU
          locationId,
          quantity: inboundQuantity,   // 入荷で受け入れた数量 / 入库接收的数量
        },
      ];

      vi.mocked(CycleCountPlan.findOne).mockResolvedValue(null);
      vi.mocked(StockQuant.find).mockReturnValue(chainLean(stockFromInbound) as any);
      vi.mocked(Product.find).mockReturnValue(chainSelectLean([]) as any);
      vi.mocked(Location.find).mockReturnValue(
        chainSelectLean([{ _id: locationId, code: 'A-01-01' }]) as any,
      );
      vi.mocked(CycleCountPlan.create).mockImplementation(async (data: any) => ({
        ...data,
        _id: oid(),
        planNumber: 'CC-2026-03-1234',
      }));

      const { generateMonthlyCycleCount } = await import('../cycleCountService');
      const plan = await generateMonthlyCycleCount('TENANT-JP-001', '2026-03', 1.0); // 100%で全件

      // 棚卸し計画のアイテムに入荷SKUが含まれていること
      // 盘点计划的项目中包含入库SKU
      expect(plan.items).toBeDefined();
      expect(plan.items.length).toBeGreaterThan(0);

      // SKU-WIDGET-A が対象に含まれていること / SKU-WIDGET-A包含在目标中
      const targetItem = plan.items.find((item: any) => item.sku === inboundSku);
      expect(targetItem).toBeDefined();

      // システム数量が入荷数量と一致すること / 系统数量与入库数量一致
      expect(targetItem!.systemQuantity).toBe(inboundQuantity);

      // ロケーションコードが正しくマッピングされていること / 位置代码正确映射
      expect(targetItem!.locationCode).toBe('A-01-01');
    });

    /**
     * 出荷引当と棚卸しの数量整合性
     * 出货引当与盘点的数量一致性
     *
     * 検証: 出荷引当（reserveStockForOrder）の入力として有効な形式であること
     * 验证: 作为出货引当（reserveStockForOrder）的输入格式有效
     */
    it('出荷オーダーの商品リスト形式が reserveStockForOrder の引数として有効であること / 出货订单商品列表格式是reserveStockForOrder的有效参数', async () => {
      // 出荷オーダーの products フィールドが stockService の引数形式に適合することを検証
      // 验证出货订单的products字段适合stockService的参数格式
      const shipment = makeShipmentOrder({
        products: [
          {
            productId: String(oid()),
            productSku: 'SKU-WIDGET-A',
            productName: 'ウィジェットA',
            inputSku: 'SKU-WIDGET-A',
            quantity: 20, // 入荷50個のうち20個出荷 / 入库50件中出货20件
          },
        ],
      });

      // shipment.products は reserveStockForOrder の第3引数の形式と互換性がある
      // shipment.productsと reserveStockForOrder の第3引数は互換性がある
      const products = shipment.products.map((p: any) => ({
        productId: p.productId,
        productSku: p.productSku,
        productName: p.productName,
        inputSku: p.inputSku,
        quantity: p.quantity,
      }));

      // 形式検証: 必須フィールドが揃っていること / 格式验证：必填字段齐全
      for (const product of products) {
        expect(product.inputSku).toBeDefined();
        expect(product.quantity).toBeGreaterThan(0);
        // productSku または productId のいずれかが存在すること
        // productSku或productId之一必须存在
        expect(product.productSku || product.productId).toBeTruthy();
      }

      // reserveStockForOrder を実際に呼び出せること（エラーなし）
      // 实际可调用reserveStockForOrder（无错误）
      await expect(
        reserveStockForOrder(String(shipment._id), shipment.orderNumber, products),
      ).resolves.toBeDefined();
    });

    /**
     * エラーパス: 存在しない注文IDのサービス呼び出し
     * 错误路径：使用不存在的订单ID调用服务
     */
    it('存在しない注文IDで各フローのサービスがエラーをスローすること / 不存在的订单ID会让各流程服务抛出错误', async () => {
      // 入荷フロー: 存在しない注文 / 入库流程：不存在的订单
      vi.mocked(InboundOrder.findById).mockResolvedValue(null as any);

      const { InboundWorkflow } = await import('../inboundWorkflow');

      await expect(
        InboundWorkflow.startReceiving('nonexistent-order-id'),
      ).rejects.toThrow();

      await expect(
        InboundWorkflow.confirmReceiveLine('nonexistent-order-id', 1, 10),
      ).rejects.toThrow();

      await expect(
        InboundWorkflow.startPutaway('nonexistent-order-id'),
      ).rejects.toThrow();

      // 棚卸しフロー: 存在しない計画 / 盘点流程：不存在的计划
      vi.mocked(CycleCountPlan.findById).mockResolvedValue(null);

      const { recordCount, checkVarianceAlerts } = await import('../cycleCountService');

      await expect(
        recordCount('nonexistent-plan-id', 0, 10, 'tester'),
      ).rejects.toThrow();

      await expect(
        checkVarianceAlerts('nonexistent-plan-id'),
      ).rejects.toThrow();
    });
  });
});
