/**
 * OutboundWorkflow 单元测试 / OutboundWorkflow ユニットテスト
 *
 * TDD アプローチ: 出荷ワークフローのすべてのパブリックメソッドをカバーする
 * TDD方法论：覆盖出库工作流的所有公开方法
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
    find: vi.fn(),
    aggregate: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/models/warehouseTask', () => ({
  WarehouseTask: {
    create: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn().mockResolvedValue(0),
    insertMany: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/models/lot', () => ({
  Lot: {
    find: vi.fn().mockReturnValue({
      lean: () => Promise.resolve([]),
    }),
  },
}));

vi.mock('@/services/taskEngine', () => ({
  TaskEngine: {
    createTask: vi.fn(),
    completeTask: vi.fn(),
  },
}));

vi.mock('@/services/ruleEngine', () => ({
  RuleEngine: {
    evaluate: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/services/stockService', () => ({
  reserveStockForOrder: vi.fn().mockResolvedValue({ reservationCount: 1, errors: [] }),
  completeStockForOrder: vi.fn().mockResolvedValue({ movedCount: 1 }),
}));

vi.mock('@/core/extensions', () => ({
  extensionManager: {
    emit: vi.fn().mockReturnValue({ catch: vi.fn() }),
  },
}));

vi.mock('@/core/extensions/types', () => ({
  HOOK_EVENTS: {
    WAVE_CREATED: 'wave.created',
    WAVE_COMPLETED: 'wave.completed',
    TASK_CREATED: 'task.created',
    TASK_COMPLETED: 'task.completed',
  },
}));

vi.mock('@/utils/idGenerator', () => ({
  generateSequenceNumber: vi.fn().mockResolvedValue('WV-20260319-0001'),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ─── Import モデル / 导入模型 ────────────────────────────────────────────────

import { ShipmentOrder } from '@/models/shipmentOrder';
import { Wave } from '@/models/wave';
import { WarehouseTask } from '@/models/warehouseTask';
import { StockQuant } from '@/models/stockQuant';
import { TaskEngine } from '@/services/taskEngine';
import { RuleEngine } from '@/services/ruleEngine';
import { reserveStockForOrder, completeStockForOrder } from '@/services/stockService';
import { extensionManager } from '@/core/extensions';

// ─── テストデータファクトリー / 测试数据工厂 ──────────────────────────────────

/**
 * モック出荷オーダーを作成する / 创建mock出货订单
 */
function makeShipment(overrides: Partial<any> = {}) {
  return {
    _id: oid(),
    orderNumber: 'SH-001',
    products: [
      {
        productId: String(oid()),
        productSku: 'SKU-001',
        productName: '商品A / 商品A',
        inputSku: 'SKU-001',
        quantity: 5,
      },
    ],
    ...overrides,
  };
}

/**
 * モック Wave を作成する / 创建mock Wave
 */
function makeWave(overrides: Partial<any> = {}) {
  const waveId = oid();
  const warehouseId = oid();
  const shipmentId = oid();
  return {
    _id: waveId,
    waveNumber: 'WV-20260319-00001',
    status: 'draft',
    priority: 'normal',
    warehouseId,
    shipmentIds: [shipmentId],
    shipmentCount: 1,
    totalItems: 1,
    totalQuantity: 5,
    startedAt: undefined as Date | undefined,
    save: vi.fn().mockResolvedValue(undefined),
    toObject: vi.fn().mockReturnValue({}),
    ...overrides,
  };
}

// ─── テストスイート / 测试套件 ───────────────────────────────────────────────

describe('OutboundWorkflow / 出荷ワークフロー', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(extensionManager.emit).mockReturnValue({ catch: vi.fn() } as any);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // createWave / Wave 作成
  // ════════════════════════════════════════════════════════════════════════════

  describe('createWave / Wave 作成', () => {
    it('空の shipmentOrderIds でエラーをスローすること / shipmentOrderIdsが空の場合エラーをスローすること', async () => {
      const { OutboundWorkflow } = await import('../outboundWorkflow');
      await expect(
        OutboundWorkflow.createWave({
          warehouseId: String(oid()),
          shipmentOrderIds: [],
        }),
      ).rejects.toThrow(/shipmentOrderIds must contain at least one/);
    });

    it('存在しない出荷指示IDでエラーをスローすること / 不存在的出货ID时应抛出错误', async () => {
      // ShipmentOrder.find が空配列を返す（見つからない）/ ShipmentOrder.find返回空数组（未找到）
      vi.mocked(ShipmentOrder.find).mockReturnValue(chainLean([]) as any);

      const { OutboundWorkflow } = await import('../outboundWorkflow');
      await expect(
        OutboundWorkflow.createWave({
          warehouseId: String(oid()),
          shipmentOrderIds: [String(oid())],
        }),
      ).rejects.toThrow(/Shipment orders not found/);
    });

    it('一部の出荷指示が存在しない場合、不足しているIDを示すエラーをスローすること / 部分出货指示不存在时应显示缺失ID的错误', async () => {
      const o1 = oid();
      // 2つリクエストしたが1つしか見つからない / 请求2个但只找到1个
      vi.mocked(ShipmentOrder.find).mockReturnValue(
        chainLean([{ _id: o1, orderNumber: 'SH-001', products: [] }]) as any,
      );

      const { OutboundWorkflow } = await import('../outboundWorkflow');
      await expect(
        OutboundWorkflow.createWave({
          warehouseId: String(oid()),
          shipmentOrderIds: [String(o1), String(oid())],
        }),
      ).rejects.toThrow(/Shipment orders not found/);
    });

    it('単一出荷指示で Wave を正常に作成すること / 单个出货指示时应成功创建Wave', async () => {
      const o1 = oid();
      const warehouseId = oid();

      vi.mocked(ShipmentOrder.find).mockReturnValue(
        chainLean([
          {
            _id: o1,
            orderNumber: 'SH-001',
            products: [
              { productSku: 'SKU-001', quantity: 3 },
              { productSku: 'SKU-002', quantity: 7 },
            ],
          },
        ]) as any,
      );

      const createdWave = {
        _id: oid(),
        waveNumber: 'WV-20260319-00001',
        shipmentCount: 1,
        totalItems: 2,
        totalQuantity: 10,
      };
      vi.mocked(Wave.create).mockResolvedValue(createdWave as any);

      const { OutboundWorkflow } = await import('../outboundWorkflow');
      const wave = await OutboundWorkflow.createWave({
        warehouseId: String(warehouseId),
        shipmentOrderIds: [String(o1)],
        priority: 'high',
        memo: '急ぎ / 紧急',
      });

      expect(wave).toBeDefined();
      expect(Wave.create).toHaveBeenCalledWith(
        expect.objectContaining({
          shipmentCount: 1,
          totalQuantity: 10,
          totalItems: 2,
          priority: 'high',
          memo: '急ぎ / 紧急',
        }),
      );
    });

    it('複数出荷指示で Wave を正常に作成すること / 多个出货指示时应成功创建Wave', async () => {
      const o1 = oid();
      const o2 = oid();
      const o3 = oid();

      vi.mocked(ShipmentOrder.find).mockReturnValue(
        chainLean([
          {
            _id: o1,
            orderNumber: 'SH-001',
            products: [{ productSku: 'SKU-001', quantity: 2 }],
          },
          {
            _id: o2,
            orderNumber: 'SH-002',
            products: [{ productSku: 'SKU-002', quantity: 3 }],
          },
          {
            _id: o3,
            orderNumber: 'SH-003',
            products: [{ productSku: 'SKU-001', quantity: 1 }, { productSku: 'SKU-003', quantity: 4 }],
          },
        ]) as any,
      );

      const createdWave = {
        _id: oid(),
        waveNumber: 'WV-20260319-00002',
        shipmentCount: 3,
        totalItems: 3, // SKU-001, SKU-002, SKU-003 の3種 / 3种SKU
        totalQuantity: 10,
      };
      vi.mocked(Wave.create).mockResolvedValue(createdWave as any);

      const { OutboundWorkflow } = await import('../outboundWorkflow');
      const wave = await OutboundWorkflow.createWave({
        warehouseId: String(oid()),
        shipmentOrderIds: [String(o1), String(o2), String(o3)],
      });

      expect(wave).toBeDefined();
      // 3オーダー分の shipmentCount / 3个订单的shipmentCount
      expect(Wave.create).toHaveBeenCalledWith(
        expect.objectContaining({ shipmentCount: 3 }),
      );
    });

    it('Wave 作成後に WAVE_CREATED イベントを発行すること / 创建Wave后应发布WAVE_CREATED事件', async () => {
      const o1 = oid();
      vi.mocked(ShipmentOrder.find).mockReturnValue(
        chainLean([{ _id: o1, orderNumber: 'SH-001', products: [] }]) as any,
      );

      const waveId = oid();
      vi.mocked(Wave.create).mockResolvedValue({
        _id: waveId,
        waveNumber: 'WV-TEST',
        shipmentCount: 1,
      } as any);

      const { OutboundWorkflow } = await import('../outboundWorkflow');
      await OutboundWorkflow.createWave({
        warehouseId: String(oid()),
        shipmentOrderIds: [String(o1)],
      });

      expect(extensionManager.emit).toHaveBeenCalledWith(
        'wave.created',
        expect.objectContaining({
          waveId: String(waveId),
          waveNumber: 'WV-TEST',
          shipmentCount: 1,
        }),
      );
    });

    it('重複 SKU は totalItems に1回だけカウントされること / 重复SKU在totalItems中只计1次', async () => {
      const o1 = oid();
      // 同じ SKU が複数ラインにある / 多行使用同一SKU
      vi.mocked(ShipmentOrder.find).mockReturnValue(
        chainLean([
          {
            _id: o1,
            orderNumber: 'SH-001',
            products: [
              { productSku: 'SKU-DUPE', quantity: 3 },
              { productSku: 'SKU-DUPE', quantity: 2 }, // 重複 / 重复
            ],
          },
        ]) as any,
      );

      vi.mocked(Wave.create).mockResolvedValue({
        _id: oid(),
        waveNumber: 'WV-TEST',
      } as any);

      const { OutboundWorkflow } = await import('../outboundWorkflow');
      await OutboundWorkflow.createWave({
        warehouseId: String(oid()),
        shipmentOrderIds: [String(o1)],
      });

      // SKU が重複しているので totalItems は 1 / 由于SKU重复，totalItems应为1
      expect(Wave.create).toHaveBeenCalledWith(
        expect.objectContaining({ totalItems: 1, totalQuantity: 5 }),
      );
    });

    it('priority が未指定の場合は "normal" をデフォルトにすること / 未指定priority时应默认为"normal"', async () => {
      const o1 = oid();
      vi.mocked(ShipmentOrder.find).mockReturnValue(
        chainLean([{ _id: o1, orderNumber: 'SH-001', products: [] }]) as any,
      );
      vi.mocked(Wave.create).mockResolvedValue({ _id: oid(), waveNumber: 'WV-TEST' } as any);

      const { OutboundWorkflow } = await import('../outboundWorkflow');
      await OutboundWorkflow.createWave({
        warehouseId: String(oid()),
        shipmentOrderIds: [String(o1)],
      });

      expect(Wave.create).toHaveBeenCalledWith(
        expect.objectContaining({ priority: 'normal' }),
      );
    });

    it('inputSku のみある商品も totalItems にカウントされること / 只有inputSkuの商品もtotalItemsに計上', async () => {
      const o1 = oid();
      vi.mocked(ShipmentOrder.find).mockReturnValue(
        chainLean([
          {
            _id: o1,
            orderNumber: 'SH-001',
            products: [
              { inputSku: 'INPUT-SKU-001', quantity: 5 }, // productSku なし / 没有productSku
            ],
          },
        ]) as any,
      );
      vi.mocked(Wave.create).mockResolvedValue({ _id: oid(), waveNumber: 'WV-TEST' } as any);

      const { OutboundWorkflow } = await import('../outboundWorkflow');
      await OutboundWorkflow.createWave({
        warehouseId: String(oid()),
        shipmentOrderIds: [String(o1)],
      });

      expect(Wave.create).toHaveBeenCalledWith(
        expect.objectContaining({ totalItems: 1, totalQuantity: 5 }),
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // startPicking / ピッキング開始
  // ════════════════════════════════════════════════════════════════════════════

  describe('startPicking / ピッキング開始', () => {
    it('存在しない Wave でエラーをスローすること / Wave不存在时应抛出错误', async () => {
      vi.mocked(Wave.findById).mockResolvedValue(null as any);

      const { OutboundWorkflow } = await import('../outboundWorkflow');
      await expect(OutboundWorkflow.startPicking('nonexistent')).rejects.toThrow(
        /Wave not found/,
      );
    });

    it('draft 以外の Wave でエラーをスローすること / 非draft状态的Wave时应抛出错误', async () => {
      const wave = makeWave({ status: 'picking' });
      vi.mocked(Wave.findById).mockResolvedValue(wave as any);

      const { OutboundWorkflow } = await import('../outboundWorkflow');
      await expect(OutboundWorkflow.startPicking(String(wave._id))).rejects.toThrow(
        /Cannot start picking.*draft/,
      );
    });

    it('already completed Wave でエラーをスローすること / 已完成Wave时应抛出错误', async () => {
      const wave = makeWave({ status: 'completed' });
      vi.mocked(Wave.findById).mockResolvedValue(wave as any);

      const { OutboundWorkflow } = await import('../outboundWorkflow');
      await expect(OutboundWorkflow.startPicking(String(wave._id))).rejects.toThrow(
        /Cannot start picking/,
      );
    });

    it('Wave の status を picking に更新し startedAt を設定すること / 应将Wave状态更新为picking并设置startedAt', async () => {
      const shipmentId = oid();
      const wave = makeWave({ shipmentIds: [shipmentId] });

      vi.mocked(Wave.findById).mockResolvedValue(wave as any);
      vi.mocked(ShipmentOrder.findById).mockReturnValue(
        chainLean({
          _id: shipmentId,
          orderNumber: 'SH-001',
          products: [],
        }) as any,
      );
      vi.mocked(TaskEngine.createTask).mockResolvedValue({ _id: oid() } as any);

      const { OutboundWorkflow } = await import('../outboundWorkflow');
      await OutboundWorkflow.startPicking(String(wave._id), 'user-1');

      expect(wave.status).toBe('picking');
      expect(wave.startedAt).toBeInstanceOf(Date);
      expect(wave.save).toHaveBeenCalled();
    });

    it('各出荷指示の在庫をリザーブすること / 应为每个出货指示预留库存', async () => {
      const shipmentId = oid();
      const shipment = makeShipment({ _id: shipmentId });
      const wave = makeWave({ shipmentIds: [shipmentId] });

      vi.mocked(Wave.findById).mockResolvedValue(wave as any);
      vi.mocked(ShipmentOrder.findById).mockReturnValue(chainLean(shipment) as any);
      vi.mocked(StockQuant.find).mockReturnValue(chainLean([]) as any);
      vi.mocked(TaskEngine.createTask).mockResolvedValue({ _id: oid() } as any);

      const { OutboundWorkflow } = await import('../outboundWorkflow');
      await OutboundWorkflow.startPicking(String(wave._id));

      expect(reserveStockForOrder).toHaveBeenCalledWith(
        String(shipmentId),
        'SH-001',
        expect.any(Array),
      );
    });

    it('各商品に対してピッキングタスクを作成すること / 应为每个商品创建拣货任务', async () => {
      const shipmentId = oid();
      const shipment = makeShipment({
        _id: shipmentId,
        products: [
          { productId: String(oid()), productSku: 'SKU-001', productName: '商品A', quantity: 3 },
          { productId: String(oid()), productSku: 'SKU-002', productName: '商品B', quantity: 5 },
        ],
      });
      const wave = makeWave({ shipmentIds: [shipmentId] });

      vi.mocked(Wave.findById).mockResolvedValue(wave as any);
      vi.mocked(ShipmentOrder.findById).mockReturnValue(chainLean(shipment) as any);
      vi.mocked(StockQuant.find).mockReturnValue(chainLean([]) as any);
      vi.mocked(TaskEngine.createTask).mockResolvedValue({ _id: oid() } as any);

      const { OutboundWorkflow } = await import('../outboundWorkflow');
      const result = await OutboundWorkflow.startPicking(String(wave._id));

      // 商品数分のタスクが作成されること / 应创建与商品数量相同的任务
      expect(TaskEngine.createTask).toHaveBeenCalledTimes(2);
      expect(result.tasks).toHaveLength(2);
      expect(TaskEngine.createTask).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'picking', referenceType: 'shipment-order' }),
      );
    });

    it('RuleEngine.evaluate を picking ルールで呼び出すこと / 应以picking规则调用RuleEngine.evaluate', async () => {
      const shipmentId = oid();
      const shipment = makeShipment({ _id: shipmentId });
      const wave = makeWave({ shipmentIds: [shipmentId] });

      vi.mocked(Wave.findById).mockResolvedValue(wave as any);
      vi.mocked(ShipmentOrder.findById).mockReturnValue(chainLean(shipment) as any);
      vi.mocked(StockQuant.find).mockReturnValue(chainLean([]) as any);
      vi.mocked(TaskEngine.createTask).mockResolvedValue({ _id: oid() } as any);

      const { OutboundWorkflow } = await import('../outboundWorkflow');
      await OutboundWorkflow.startPicking(String(wave._id));

      expect(RuleEngine.evaluate).toHaveBeenCalledWith(
        'picking',
        expect.any(Object),
        expect.objectContaining({ warehouseId: String(wave.warehouseId) }),
      );
    });

    it('出荷指示が見つからない場合はスキップすること / 出货指示不存在时应跳过', async () => {
      const shipmentId = oid();
      const wave = makeWave({ shipmentIds: [shipmentId] });

      vi.mocked(Wave.findById).mockResolvedValue(wave as any);
      // 出荷指示が見つからない / 找不到出货指示
      vi.mocked(ShipmentOrder.findById).mockReturnValue(chainLean(null) as any);

      const { OutboundWorkflow } = await import('../outboundWorkflow');
      const result = await OutboundWorkflow.startPicking(String(wave._id));

      // タスクは作成されない / 不应创建任务
      expect(TaskEngine.createTask).not.toHaveBeenCalled();
      expect(result.tasks).toHaveLength(0);
    });

    it('在庫が存在する場合 FEFO で最良ロケーションを選択すること / 有库存时应按FEFO选择最佳位置', async () => {
      const shipmentId = oid();
      const locId = oid();
      const shipment = makeShipment({ _id: shipmentId });
      const wave = makeWave({ shipmentIds: [shipmentId] });

      vi.mocked(Wave.findById).mockResolvedValue(wave as any);
      vi.mocked(ShipmentOrder.findById).mockReturnValue(chainLean(shipment) as any);

      // 在庫が存在する / 库存存在
      vi.mocked(StockQuant.find).mockReturnValue(
        chainLean([
          {
            _id: oid(),
            locationId: locId,
            productId: oid(),
            quantity: 100,
            reservedQuantity: 0,
          },
        ]) as any,
      );

      vi.mocked(TaskEngine.createTask).mockResolvedValue({ _id: oid() } as any);

      const { OutboundWorkflow } = await import('../outboundWorkflow');
      await OutboundWorkflow.startPicking(String(wave._id));

      // fromLocationId が設定されること / 应设置fromLocationId
      expect(TaskEngine.createTask).toHaveBeenCalledWith(
        expect.objectContaining({ fromLocationId: String(locId) }),
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // completePickingTask / ピッキングタスク完了
  // ════════════════════════════════════════════════════════════════════════════

  describe('completePickingTask / ピッキングタスク完了', () => {
    it('タスクを完了し TaskEngine を呼び出すこと / 应完成任务并调用TaskEngine', async () => {
      const taskId = String(oid());
      const waveId = String(oid());
      const completedTask = {
        _id: taskId,
        waveId,
        type: 'picking',
        status: 'completed',
        actualQuantity: 5,
      };

      vi.mocked(TaskEngine.completeTask).mockResolvedValue(completedTask as any);
      vi.mocked(WarehouseTask.countDocuments).mockResolvedValue(0);
      vi.mocked(Wave.findByIdAndUpdate).mockResolvedValue({} as any);

      const { OutboundWorkflow } = await import('../outboundWorkflow');
      const result = await OutboundWorkflow.completePickingTask(taskId, 5, 'user-1');

      expect(TaskEngine.completeTask).toHaveBeenCalledWith(taskId, 5, 'user-1');
      expect(result).toBeDefined();
    });

    it('すべてのピッキングタスク完了時に Wave を sorting に進めること / 所有拣货任务完成时应将Wave推进到sorting状态', async () => {
      const waveId = String(oid());
      const completedTask = {
        _id: String(oid()),
        waveId,
        type: 'picking',
        status: 'completed',
      };

      vi.mocked(TaskEngine.completeTask).mockResolvedValue(completedTask as any);
      // 残りのピッキングタスクがゼロ / 剩余拣货任务为零
      vi.mocked(WarehouseTask.countDocuments).mockResolvedValue(0);
      vi.mocked(Wave.findByIdAndUpdate).mockResolvedValue({} as any);

      const { OutboundWorkflow } = await import('../outboundWorkflow');
      await OutboundWorkflow.completePickingTask(String(completedTask._id), 3);

      expect(Wave.findByIdAndUpdate).toHaveBeenCalledWith(
        waveId,
        expect.objectContaining({ $set: { status: 'sorting' } }),
      );
    });

    it('まだ残りタスクがある場合は Wave の status を変更しないこと / 还有剩余任务时不应更改Wave状态', async () => {
      const waveId = String(oid());
      const completedTask = {
        _id: String(oid()),
        waveId,
        type: 'picking',
        status: 'completed',
      };

      vi.mocked(TaskEngine.completeTask).mockResolvedValue(completedTask as any);
      // まだ残りタスクあり / 还有剩余任务
      vi.mocked(WarehouseTask.countDocuments).mockResolvedValue(3);

      const { OutboundWorkflow } = await import('../outboundWorkflow');
      await OutboundWorkflow.completePickingTask(String(completedTask._id), 3);

      expect(Wave.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('waveId がないタスクは Wave の status を変更しないこと / 没有waveId的任务不应更改Wave状态', async () => {
      const completedTask = {
        _id: String(oid()),
        waveId: undefined, // waveId なし / 无waveId
        type: 'picking',
        status: 'completed',
      };

      vi.mocked(TaskEngine.completeTask).mockResolvedValue(completedTask as any);

      const { OutboundWorkflow } = await import('../outboundWorkflow');
      await OutboundWorkflow.completePickingTask(String(completedTask._id), 3);

      expect(WarehouseTask.countDocuments).not.toHaveBeenCalled();
      expect(Wave.findByIdAndUpdate).not.toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // startSorting / 仕分け開始
  // ════════════════════════════════════════════════════════════════════════════

  describe('startSorting / 仕分け開始', () => {
    it('存在しない Wave でエラーをスローすること / Wave不存在时应抛出错误', async () => {
      vi.mocked(Wave.findById).mockResolvedValue(null as any);

      const { OutboundWorkflow } = await import('../outboundWorkflow');
      await expect(OutboundWorkflow.startSorting('nonexistent')).rejects.toThrow(
        /Wave not found/,
      );
    });

    it('sorting ステータスの Wave で仕分けタスクを作成すること / sorting状态的Wave时应创建仕分け任务', async () => {
      const shipmentId = oid();
      const wave = makeWave({ status: 'sorting', shipmentIds: [shipmentId] });
      const shipment = makeShipment({ _id: shipmentId });

      vi.mocked(Wave.findById).mockResolvedValue(wave as any);
      vi.mocked(ShipmentOrder.findById).mockReturnValue(chainLean(shipment) as any);
      vi.mocked(TaskEngine.createTask).mockResolvedValue({ _id: oid(), type: 'sorting' } as any);

      const { OutboundWorkflow } = await import('../outboundWorkflow');
      const tasks = await OutboundWorkflow.startSorting(String(wave._id));

      expect(tasks).toHaveLength(1);
      expect(TaskEngine.createTask).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'sorting' }),
      );
    });

    it('全ピッキング完了後なら picking ステータスから仕分けを開始できること / 全拣货完成后可从picking状态开始仕分け', async () => {
      const shipmentId = oid();
      const wave = makeWave({ status: 'picking', shipmentIds: [shipmentId] });
      const shipment = makeShipment({ _id: shipmentId });

      vi.mocked(Wave.findById).mockResolvedValue(wave as any);
      // ピッキングタスクが残っていない / 没有剩余拣货任务
      vi.mocked(WarehouseTask.countDocuments).mockResolvedValue(0);
      vi.mocked(ShipmentOrder.findById).mockReturnValue(chainLean(shipment) as any);
      vi.mocked(TaskEngine.createTask).mockResolvedValue({ _id: oid() } as any);

      const { OutboundWorkflow } = await import('../outboundWorkflow');
      const tasks = await OutboundWorkflow.startSorting(String(wave._id));

      // Wave status が sorting に更新されること / Wave状态应更新为sorting
      expect(wave.status).toBe('sorting');
      expect(wave.save).toHaveBeenCalled();
      expect(tasks).toHaveLength(1);
    });

    it('ピッキングが未完了の場合エラーをスローすること / 拣货未完成时应抛出错误', async () => {
      const wave = makeWave({ status: 'picking' });

      vi.mocked(Wave.findById).mockResolvedValue(wave as any);
      // ピッキングタスクがまだ残っている / 还有剩余拣货任务
      vi.mocked(WarehouseTask.countDocuments).mockResolvedValue(2);

      const { OutboundWorkflow } = await import('../outboundWorkflow');
      await expect(OutboundWorkflow.startSorting(String(wave._id))).rejects.toThrow(
        /Cannot start sorting/,
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // completeSorting / 仕分け完了
  // ════════════════════════════════════════════════════════════════════════════

  describe('completeSorting / 仕分け完了', () => {
    it('存在しない Wave でエラーをスローすること / Wave不存在时应抛出错误', async () => {
      vi.mocked(Wave.findById).mockResolvedValue(null as any);

      const { OutboundWorkflow } = await import('../outboundWorkflow');
      await expect(OutboundWorkflow.completeSorting('nonexistent')).rejects.toThrow(
        /Wave not found/,
      );
    });

    it('未完了の仕分けタスクがある場合エラーをスローすること / 有未完成仕分けタスク时应抛出错误', async () => {
      const wave = makeWave({ status: 'sorting' });
      vi.mocked(Wave.findById).mockResolvedValue(wave as any);
      // 残りの仕分けタスクあり / 有剩余仕分けタスク
      vi.mocked(WarehouseTask.countDocuments).mockResolvedValue(1);

      const { OutboundWorkflow } = await import('../outboundWorkflow');
      await expect(OutboundWorkflow.completeSorting(String(wave._id))).rejects.toThrow(
        /Cannot complete sorting/,
      );
    });

    it('全仕分け完了後に Wave を packing に進め梱包タスクを作成すること / 全仕分け完成后应将Wave推进到packing并创建梱包任务', async () => {
      const shipmentId = oid();
      const wave = makeWave({ status: 'sorting', shipmentIds: [shipmentId] });
      const shipment = makeShipment({ _id: shipmentId });

      vi.mocked(Wave.findById).mockResolvedValue(wave as any);
      vi.mocked(WarehouseTask.countDocuments).mockResolvedValue(0);
      vi.mocked(ShipmentOrder.findById).mockReturnValue(chainLean(shipment) as any);
      vi.mocked(TaskEngine.createTask).mockResolvedValue({ _id: oid(), type: 'packing' } as any);

      const { OutboundWorkflow } = await import('../outboundWorkflow');
      const tasks = await OutboundWorkflow.completeSorting(String(wave._id));

      expect(wave.status).toBe('packing');
      expect(wave.save).toHaveBeenCalled();
      expect(tasks).toHaveLength(1);
      expect(TaskEngine.createTask).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'packing' }),
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // completePacking / 梱包完了
  // ════════════════════════════════════════════════════════════════════════════

  describe('completePacking / 梱包完了', () => {
    it('タスクを完了し completeStockForOrder を呼び出すこと / 应完成任务并调用completeStockForOrder', async () => {
      const shipmentId = String(oid());
      const waveId = String(oid());
      const completedTask = {
        _id: String(oid()),
        waveId,
        shipmentId,
        type: 'packing',
        status: 'completed',
      };

      vi.mocked(TaskEngine.completeTask).mockResolvedValue(completedTask as any);
      vi.mocked(WarehouseTask.countDocuments).mockResolvedValue(0);
      vi.mocked(Wave.findByIdAndUpdate).mockResolvedValue({} as any);

      const { OutboundWorkflow } = await import('../outboundWorkflow');
      await OutboundWorkflow.completePacking(String(completedTask._id), 'user-1');

      expect(TaskEngine.completeTask).toHaveBeenCalledWith(
        String(completedTask._id),
        1,
        'user-1',
      );
      expect(completeStockForOrder).toHaveBeenCalledWith(shipmentId);
    });

    it('すべての梱包完了時に Wave を completed に更新すること / 所有梱包完成时应将Wave更新为completed', async () => {
      const waveId = String(oid());
      const completedTask = {
        _id: String(oid()),
        waveId,
        shipmentId: String(oid()),
        type: 'packing',
        status: 'completed',
      };

      vi.mocked(TaskEngine.completeTask).mockResolvedValue(completedTask as any);
      vi.mocked(WarehouseTask.countDocuments).mockResolvedValue(0);
      vi.mocked(Wave.findByIdAndUpdate).mockResolvedValue({} as any);

      const { OutboundWorkflow } = await import('../outboundWorkflow');
      await OutboundWorkflow.completePacking(String(completedTask._id));

      expect(Wave.findByIdAndUpdate).toHaveBeenCalledWith(
        waveId,
        expect.objectContaining({
          $set: expect.objectContaining({ status: 'completed' }),
        }),
      );
    });

    it('Wave 完了時に WAVE_COMPLETED イベントを発行すること / Wave完了时应发布WAVE_COMPLETED事件', async () => {
      const waveId = String(oid());
      const completedTask = {
        _id: String(oid()),
        waveId,
        shipmentId: String(oid()),
        type: 'packing',
        status: 'completed',
      };

      vi.mocked(TaskEngine.completeTask).mockResolvedValue(completedTask as any);
      vi.mocked(WarehouseTask.countDocuments).mockResolvedValue(0);
      vi.mocked(Wave.findByIdAndUpdate).mockResolvedValue({} as any);

      const { OutboundWorkflow } = await import('../outboundWorkflow');
      await OutboundWorkflow.completePacking(String(completedTask._id));

      expect(extensionManager.emit).toHaveBeenCalledWith(
        'wave.completed',
        expect.objectContaining({ waveId }),
      );
    });

    it('まだ残り梱包タスクがある場合は Wave の status を変更しないこと / 还有剩余梱包任务时不应更改Wave状态', async () => {
      const waveId = String(oid());
      const completedTask = {
        _id: String(oid()),
        waveId,
        shipmentId: String(oid()),
        type: 'packing',
        status: 'completed',
      };

      vi.mocked(TaskEngine.completeTask).mockResolvedValue(completedTask as any);
      // まだ残りタスクあり / 还有剩余任务
      vi.mocked(WarehouseTask.countDocuments).mockResolvedValue(2);

      const { OutboundWorkflow } = await import('../outboundWorkflow');
      await OutboundWorkflow.completePacking(String(completedTask._id));

      expect(Wave.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(extensionManager.emit).not.toHaveBeenCalled();
    });

    it('shipmentId がないタスクでも completeStockForOrder を呼ばないこと / 没有shipmentId的任务不应调用completeStockForOrder', async () => {
      const waveId = String(oid());
      const completedTask = {
        _id: String(oid()),
        waveId,
        shipmentId: undefined, // shipmentId なし / 无shipmentId
        type: 'packing',
        status: 'completed',
      };

      vi.mocked(TaskEngine.completeTask).mockResolvedValue(completedTask as any);
      vi.mocked(WarehouseTask.countDocuments).mockResolvedValue(0);
      vi.mocked(Wave.findByIdAndUpdate).mockResolvedValue({} as any);

      const { OutboundWorkflow } = await import('../outboundWorkflow');
      await OutboundWorkflow.completePacking(String(completedTask._id));

      expect(completeStockForOrder).not.toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // validateShipmentWeights / 重量チェック
  // ════════════════════════════════════════════════════════════════════════════

  describe('validateShipmentWeights / 出荷前重量チェック', () => {
    it('存在しない Wave でエラーをスローすること / Wave不存在时应抛出错误', async () => {
      vi.mocked(Wave.findById).mockReturnValue(chainLean(null) as any);

      const { OutboundWorkflow } = await import('../outboundWorkflow');
      await expect(
        OutboundWorkflow.validateShipmentWeights('nonexistent'),
      ).rejects.toThrow(/Wave not found/);
    });

    it('重量制限以内の出荷指示は valid に分類されること / 重量在限制内的出货指示应分类为valid', async () => {
      const shipmentId = oid();
      const wave = makeWave({ shipmentIds: [shipmentId] });
      const shipment = {
        _id: shipmentId,
        orderNumber: 'SH-001',
        products: [
          { productSku: 'SKU-001', quantity: 2, weight: 5 }, // 10kg
        ],
      };

      vi.mocked(Wave.findById).mockReturnValue(chainLean(wave) as any);
      vi.mocked(ShipmentOrder.findById).mockReturnValue(chainLean(shipment) as any);

      const { OutboundWorkflow } = await import('../outboundWorkflow');
      const result = await OutboundWorkflow.validateShipmentWeights(String(wave._id), 25);

      expect(result.valid).toContain(String(shipmentId));
      expect(result.overweight).toHaveLength(0);
    });

    it('重量制限超過の出荷指示は overweight に分類されること / 超重量限制的出货指示应分类为overweight', async () => {
      const shipmentId = oid();
      const wave = makeWave({ shipmentIds: [shipmentId] });
      const shipment = {
        _id: shipmentId,
        orderNumber: 'SH-HEAVY',
        products: [
          { productSku: 'SKU-HEAVY', quantity: 3, weight: 10 }, // 30kg > 25kg 制限
        ],
      };

      vi.mocked(Wave.findById).mockReturnValue(chainLean(wave) as any);
      vi.mocked(ShipmentOrder.findById).mockReturnValue(chainLean(shipment) as any);

      const { OutboundWorkflow } = await import('../outboundWorkflow');
      const result = await OutboundWorkflow.validateShipmentWeights(String(wave._id), 25);

      expect(result.overweight).toHaveLength(1);
      expect(result.overweight[0].orderNumber).toBe('SH-HEAVY');
      expect(result.overweight[0].totalWeightKg).toBe(30);
      expect(result.valid).toHaveLength(0);
    });

    it('デフォルト最大重量は 25kg であること / 默认最大重量应为25kg', async () => {
      const shipmentId = oid();
      const wave = makeWave({ shipmentIds: [shipmentId] });
      const shipment = {
        _id: shipmentId,
        orderNumber: 'SH-EDGE',
        products: [
          { productSku: 'SKU-001', quantity: 1, weight: 26 }, // 26kg > 25kg
        ],
      };

      vi.mocked(Wave.findById).mockReturnValue(chainLean(wave) as any);
      vi.mocked(ShipmentOrder.findById).mockReturnValue(chainLean(shipment) as any);

      const { OutboundWorkflow } = await import('../outboundWorkflow');
      const result = await OutboundWorkflow.validateShipmentWeights(String(wave._id));

      expect(result.overweight).toHaveLength(1);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // generatePackingList / 梱包リスト生成
  // ════════════════════════════════════════════════════════════════════════════

  describe('generatePackingList / 梱包リスト生成', () => {
    it('存在しない出荷指示でエラーをスローすること / 出货指示不存在时应抛出错误', async () => {
      vi.mocked(ShipmentOrder.findById).mockReturnValue(chainLean(null) as any);

      const { OutboundWorkflow } = await import('../outboundWorkflow');
      await expect(
        OutboundWorkflow.generatePackingList('nonexistent'),
      ).rejects.toThrow(/出荷指示が見つかりません/);
    });

    it('正しい梱包リストを生成すること / 应生成正确的梱包リスト', async () => {
      const shipmentId = oid();
      const shipment = {
        _id: shipmentId,
        orderNumber: 'SH-PL-001',
        products: [
          { productSku: 'SKU-001', productName: '商品A', quantity: 2 },
          { productSku: 'SKU-002', productName: '商品B', quantity: 3 },
        ],
        consignee: {
          name: '田中太郎',
          postalCode: '150-0001',
          prefecture: '東京都',
          city: '渋谷区',
          address1: '道玄坂1-2-3',
        },
      };

      vi.mocked(ShipmentOrder.findById).mockReturnValue(chainLean(shipment) as any);

      const { OutboundWorkflow } = await import('../outboundWorkflow');
      const packingList = await OutboundWorkflow.generatePackingList(String(shipmentId));

      expect(packingList.orderNumber).toBe('SH-PL-001');
      expect(packingList.customerName).toBe('田中太郎');
      expect(packingList.shippingAddress).toContain('150-0001');
      expect(packingList.shippingAddress).toContain('東京都');
      expect(packingList.items).toHaveLength(2);
      expect(packingList.totalItems).toBe(2);
      expect(packingList.totalQuantity).toBe(5);
      expect(packingList.generatedAt).toBeInstanceOf(Date);
    });

    it('consignee が未設定の場合でも空文字で梱包リストを生成すること / 即使consignee未设置也应生成带空字符串的梱包リスト', async () => {
      const shipmentId = oid();
      const shipment = {
        _id: shipmentId,
        orderNumber: 'SH-NO-CONSIGNEE',
        products: [{ productSku: 'SKU-001', quantity: 1 }],
        // consignee なし / 无consignee
      };

      vi.mocked(ShipmentOrder.findById).mockReturnValue(chainLean(shipment) as any);

      const { OutboundWorkflow } = await import('../outboundWorkflow');
      const packingList = await OutboundWorkflow.generatePackingList(String(shipmentId));

      expect(packingList.customerName).toBe('');
      expect(packingList.shippingAddress).toBe('');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // getWaveProgress / Wave 進捗取得
  // ════════════════════════════════════════════════════════════════════════════

  describe('getWaveProgress / Wave 進捗取得', () => {
    it('存在しない Wave でエラーをスローすること / Wave不存在时应抛出错误', async () => {
      vi.mocked(Wave.findById).mockReturnValue(chainLean(null) as any);

      const { OutboundWorkflow } = await import('../outboundWorkflow');
      await expect(OutboundWorkflow.getWaveProgress('nonexistent')).rejects.toThrow(
        /Wave not found/,
      );
    });

    it('タイプ別のタスク完了数を正確に返すこと / 应正确返回按类型分组的任务完成数', async () => {
      const wave = makeWave();
      const wId = String(wave._id);

      const mockTasks = [
        { _id: oid(), waveId: wId, type: 'picking', status: 'completed' },
        { _id: oid(), waveId: wId, type: 'picking', status: 'completed' },
        { _id: oid(), waveId: wId, type: 'picking', status: 'pending' },
        { _id: oid(), waveId: wId, type: 'sorting', status: 'completed' },
        { _id: oid(), waveId: wId, type: 'sorting', status: 'pending' },
        { _id: oid(), waveId: wId, type: 'packing', status: 'cancelled' }, // cancelled も完了扱い / cancelled也算完成
      ];

      vi.mocked(Wave.findById).mockReturnValue(chainLean(wave) as any);
      vi.mocked(WarehouseTask.find).mockReturnValue(chainLean(mockTasks) as any);

      const { OutboundWorkflow } = await import('../outboundWorkflow');
      const progress = await OutboundWorkflow.getWaveProgress(String(wave._id));

      expect(progress.wave).toBeDefined();
      expect(progress.picking.total).toBe(3);
      expect(progress.picking.completed).toBe(2);
      expect(progress.sorting.total).toBe(2);
      expect(progress.sorting.completed).toBe(1);
      expect(progress.packing.total).toBe(1);
      expect(progress.packing.completed).toBe(1); // cancelled も completed に含まれる / cancelled也包含在completed中
    });

    it('タスクが存在しない Wave はゼロの進捗を返すこと / 没有任务的Wave应返回零进度', async () => {
      const wave = makeWave();

      vi.mocked(Wave.findById).mockReturnValue(chainLean(wave) as any);
      vi.mocked(WarehouseTask.find).mockReturnValue(chainLean([]) as any);

      const { OutboundWorkflow } = await import('../outboundWorkflow');
      const progress = await OutboundWorkflow.getWaveProgress(String(wave._id));

      expect(progress.picking.total).toBe(0);
      expect(progress.picking.completed).toBe(0);
      expect(progress.sorting.total).toBe(0);
      expect(progress.packing.total).toBe(0);
    });

    it('WarehouseTask.find を waveId でフィルタすること / 应按waveId过滤WarehouseTask', async () => {
      const wave = makeWave();

      vi.mocked(Wave.findById).mockReturnValue(chainLean(wave) as any);
      vi.mocked(WarehouseTask.find).mockReturnValue(chainLean([]) as any);

      const { OutboundWorkflow } = await import('../outboundWorkflow');
      await OutboundWorkflow.getWaveProgress(String(wave._id));

      expect(WarehouseTask.find).toHaveBeenCalledWith({
        waveId: String(wave._id),
      });
    });
  });
});
