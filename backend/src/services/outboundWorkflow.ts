import mongoose from 'mongoose';
import { Wave, IWave, WaveStatus } from '@/models/wave';
import { ShipmentOrder, IShipmentOrder } from '@/models/shipmentOrder';
import { StockQuant } from '@/models/stockQuant';
import { WarehouseTask, IWarehouseTask } from '@/models/warehouseTask';
import { Lot } from '@/models/lot';
import { TaskEngine } from '@/services/taskEngine';
import { RuleEngine } from '@/services/ruleEngine';
import {
  reserveStockForOrder,
  completeStockForOrder,
} from '@/services/stockService';
import { extensionManager } from '@/core/extensions';
import { HOOK_EVENTS } from '@/core/extensions/types';

/**
 * Generate a wave number in format: WV-{YYYYMMDD}-{random5digits}
 */
function generateWaveNumber(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
  return `WV-${yyyy}${mm}${dd}-${random}`;
}

/**
 * OutboundWorkflow orchestrates the complete outbound process:
 * 受注 → ウェーブ → ピッキング → 仕分け → 梱包 → 出荷
 */
export class OutboundWorkflow {
  /**
   * Create a new wave from shipment order IDs.
   */
  static async createWave(params: {
    warehouseId: string;
    shipmentOrderIds: string[];
    priority?: string;
    assignedTo?: string;
    memo?: string;
  }): Promise<IWave> {
    if (!params.shipmentOrderIds || params.shipmentOrderIds.length === 0) {
      throw new Error('shipmentOrderIds must contain at least one shipment order.');
    }

    // Validate all shipment orders exist
    const shipments = await ShipmentOrder.find({
      _id: { $in: params.shipmentOrderIds.map((id) => new mongoose.Types.ObjectId(id)) },
    }).lean<IShipmentOrder[]>();

    if (shipments.length !== params.shipmentOrderIds.length) {
      const foundIds = new Set(shipments.map((s) => String(s._id)));
      const missing = params.shipmentOrderIds.filter((id) => !foundIds.has(id));
      throw new Error(`Shipment orders not found: ${missing.join(', ')}`);
    }

    // Calculate totalItems (unique SKU count) and totalQuantity across all orders
    const allSkus = new Set<string>();
    let totalQuantity = 0;

    for (const shipment of shipments) {
      for (const product of shipment.products) {
        const sku = product.productSku || product.inputSku;
        if (sku) {
          allSkus.add(sku);
        }
        totalQuantity += product.quantity || 0;
      }
    }

    const wave = await Wave.create({
      waveNumber: generateWaveNumber(),
      warehouseId: new mongoose.Types.ObjectId(params.warehouseId),
      status: 'draft' as WaveStatus,
      priority: params.priority || 'normal',
      shipmentIds: params.shipmentOrderIds.map((id) => new mongoose.Types.ObjectId(id)),
      shipmentCount: shipments.length,
      totalItems: allSkus.size,
      totalQuantity,
      assignedTo: params.assignedTo,
      memo: params.memo,
    });

    // 扩展系统事件 / 拡張システムイベント
    extensionManager.emit(HOOK_EVENTS.WAVE_CREATED, {
      waveId: String(wave._id),
      waveNumber: wave.waveNumber,
      shipmentCount: shipments.length,
    }).catch(() => {/* サイレント */});

    return wave;
  }

  /**
   * Start picking for a wave. Reserves stock and creates picking tasks.
   */
  static async startPicking(
    waveId: string,
    executedBy?: string,
  ): Promise<{ wave: IWave; tasks: IWarehouseTask[] }> {
    const wave = await Wave.findById(waveId);
    if (!wave) {
      throw new Error(`Wave not found: ${waveId}`);
    }
    if (wave.status !== 'draft') {
      throw new Error(
        `Cannot start picking for wave in status '${wave.status}'. Wave must be 'draft'.`,
      );
    }

    // Update wave status
    wave.status = 'picking' as WaveStatus;
    wave.startedAt = new Date();
    await wave.save();

    const createdTasks: IWarehouseTask[] = [];

    for (const shipmentId of wave.shipmentIds) {
      const shipment = await ShipmentOrder.findById(shipmentId).lean<IShipmentOrder>();
      if (!shipment) {
        continue;
      }

      // Reserve stock for this shipment
      await reserveStockForOrder(
        String(shipment._id),
        shipment.orderNumber,
        shipment.products.map((p) => ({
          productId: p.productId,
          productSku: p.productSku,
          productName: p.productName,
          inputSku: p.inputSku,
          quantity: p.quantity,
        })),
      );

      // Evaluate picking rules
      await RuleEngine.evaluate('picking', {
        shipment,
        products: shipment.products,
      }, {
        warehouseId: String(wave.warehouseId),
      });

      // Create picking task for each product
      for (const product of shipment.products) {
        const sku = product.productSku || product.inputSku;

        // Find stock location using FEFO (First Expired, First Out)
        const fromLocationId = await OutboundWorkflow.findStockLocation(
          product.productId,
          sku,
        );

        const task = await TaskEngine.createTask({
          type: 'picking',
          warehouseId: String(wave.warehouseId),
          productId: product.productId,
          productSku: sku,
          productName: product.productName,
          fromLocationId,
          requiredQuantity: product.quantity,
          priority: wave.priority as any,
          waveId: String(wave._id),
          shipmentId: String(shipment._id),
          referenceType: 'shipment-order',
          referenceId: String(shipment._id),
          referenceNumber: shipment.orderNumber,
        });

        createdTasks.push(task);
      }
    }

    return { wave, tasks: createdTasks };
  }

  /**
   * Find the best stock location for a product using FEFO strategy.
   * Returns the locationId of the quant with the earliest expiry date.
   */
  private static async findStockLocation(
    productId?: string,
    productSku?: string,
  ): Promise<string | undefined> {
    if (!productId && !productSku) {
      return undefined;
    }

    const filter: Record<string, unknown> = {
      $expr: { $gt: [{ $subtract: ['$quantity', '$reservedQuantity'] }, 0] },
    };

    if (productId) {
      filter.productId = new mongoose.Types.ObjectId(productId);
    } else if (productSku) {
      filter.productSku = productSku;
    }

    const quants = await StockQuant.find(filter).lean();
    if (quants.length === 0) {
      return undefined;
    }

    // Build lot expiry map for FEFO sorting
    const lotIds = quants
      .map((q) => q.lotId)
      .filter((id): id is mongoose.Types.ObjectId => !!id);

    const lotsMap = new Map<string, Date | null>();
    if (lotIds.length > 0) {
      const lots = await Lot.find({ _id: { $in: lotIds }, status: 'active' }).lean();
      for (const lot of lots) {
        lotsMap.set(String(lot._id), (lot as any).expiryDate || null);
      }
    }

    // FEFO sort: earliest expiry first, then no-expiry, then no-lot
    const sorted = [...quants].sort((a, b) => {
      const aExpiry = a.lotId ? lotsMap.get(String(a.lotId)) : null;
      const bExpiry = b.lotId ? lotsMap.get(String(b.lotId)) : null;

      if (a.lotId && !lotsMap.has(String(a.lotId))) return 1;
      if (b.lotId && !lotsMap.has(String(b.lotId))) return -1;

      if (aExpiry && bExpiry) return aExpiry.getTime() - bExpiry.getTime();
      if (aExpiry && !bExpiry) return -1;
      if (!aExpiry && bExpiry) return 1;
      return (a.lastMovedAt?.getTime() || 0) - (b.lastMovedAt?.getTime() || 0);
    });

    return String(sorted[0].locationId);
  }

  /**
   * Complete a picking task. Auto-advances wave to 'sorting' when all picks are done.
   */
  static async completePickingTask(
    taskId: string,
    pickedQuantity: number,
    executedBy?: string,
  ): Promise<IWarehouseTask> {
    const task = await TaskEngine.completeTask(taskId, pickedQuantity, executedBy);

    if (!task.waveId) {
      return task;
    }

    // Check if all picking tasks for this wave are completed
    const remainingPicks = await WarehouseTask.countDocuments({
      waveId: task.waveId,
      type: 'picking',
      status: { $nin: ['completed', 'cancelled'] },
    });

    if (remainingPicks === 0) {
      await Wave.findByIdAndUpdate(task.waveId, {
        $set: { status: 'sorting' as WaveStatus },
      });
    }

    return task;
  }

  /**
   * Start sorting for a wave. Creates sorting tasks for each shipment.
   */
  static async startSorting(
    waveId: string,
    executedBy?: string,
  ): Promise<IWarehouseTask[]> {
    const wave = await Wave.findById(waveId);
    if (!wave) {
      throw new Error(`Wave not found: ${waveId}`);
    }

    // Allow starting sorting if status is 'sorting' (auto-advanced) or if all picks are done
    if (wave.status !== 'sorting') {
      // Check if all picks are done and we can advance
      const remainingPicks = await WarehouseTask.countDocuments({
        waveId: String(wave._id),
        type: 'picking',
        status: { $nin: ['completed', 'cancelled'] },
      });

      if (remainingPicks > 0) {
        throw new Error(
          `Cannot start sorting for wave in status '${wave.status}'. All picking tasks must be completed first.`,
        );
      }

      wave.status = 'sorting' as WaveStatus;
      await wave.save();
    }

    const createdTasks: IWarehouseTask[] = [];

    for (const shipmentId of wave.shipmentIds) {
      const shipment = await ShipmentOrder.findById(shipmentId).lean<IShipmentOrder>();
      if (!shipment) {
        continue;
      }

      const task = await TaskEngine.createTask({
        type: 'sorting',
        warehouseId: String(wave.warehouseId),
        waveId: String(wave._id),
        shipmentId: String(shipment._id),
        referenceType: 'shipment-order',
        referenceId: String(shipment._id),
        referenceNumber: shipment.orderNumber,
        priority: wave.priority as any,
      });

      createdTasks.push(task);
    }

    return createdTasks;
  }

  /**
   * Complete sorting for a wave. Validates all sorting tasks are done,
   * advances wave to 'packing', and creates packing tasks.
   */
  static async completeSorting(
    waveId: string,
    executedBy?: string,
  ): Promise<IWarehouseTask[]> {
    const wave = await Wave.findById(waveId);
    if (!wave) {
      throw new Error(`Wave not found: ${waveId}`);
    }

    // Validate all sorting tasks are completed
    const remainingSorts = await WarehouseTask.countDocuments({
      waveId: String(wave._id),
      type: 'sorting',
      status: { $nin: ['completed', 'cancelled'] },
    });

    if (remainingSorts > 0) {
      throw new Error(
        `Cannot complete sorting: ${remainingSorts} sorting task(s) still pending.`,
      );
    }

    // Advance wave status to packing
    wave.status = 'packing' as WaveStatus;
    await wave.save();

    // Create packing tasks for each shipment
    const createdTasks: IWarehouseTask[] = [];

    for (const shipmentId of wave.shipmentIds) {
      const shipment = await ShipmentOrder.findById(shipmentId).lean<IShipmentOrder>();
      if (!shipment) {
        continue;
      }

      const task = await TaskEngine.createTask({
        type: 'packing',
        warehouseId: String(wave.warehouseId),
        waveId: String(wave._id),
        shipmentId: String(shipment._id),
        referenceType: 'shipment-order',
        referenceId: String(shipment._id),
        referenceNumber: shipment.orderNumber,
        priority: wave.priority as any,
      });

      createdTasks.push(task);
    }

    return createdTasks;
  }

  /**
   * Complete a packing task. Finalizes stock for the shipment.
   * Auto-completes the wave when all packing tasks are done.
   */
  static async completePacking(
    taskId: string,
    executedBy?: string,
  ): Promise<IWarehouseTask> {
    const task = await TaskEngine.completeTask(taskId, 1, executedBy);

    // Complete stock for the associated shipment
    if (task.shipmentId) {
      await completeStockForOrder(String(task.shipmentId));
    }

    if (!task.waveId) {
      return task;
    }

    // Check if all packing tasks for this wave are completed
    const remainingPacks = await WarehouseTask.countDocuments({
      waveId: task.waveId,
      type: 'packing',
      status: { $nin: ['completed', 'cancelled'] },
    });

    if (remainingPacks === 0) {
      await Wave.findByIdAndUpdate(task.waveId, {
        $set: {
          status: 'completed' as WaveStatus,
          completedAt: new Date(),
        },
      });

      // 扩展系统事件: Wave 完成 / 拡張システムイベント: Wave 完了
      extensionManager.emit(HOOK_EVENTS.WAVE_COMPLETED, {
        waveId: String(task.waveId),
      }).catch(() => {/* サイレント */});
    }

    return task;
  }

  /**
   * 出荷前の重量チェック / 出货前重量检查
   *
   * 日本の宅配業者（ヤマト・佐川）には重量制限がある。
   * 日本快递公司（大和/佐川）有重量限制。
   * ヤマト：25kg以内、佐川：30kg以内（通常）
   *
   * @returns 超過した出荷指示のリスト / 超重的出货指示列表
   */
  static async validateShipmentWeights(
    waveId: string,
    maxWeightKg: number = 25,
  ): Promise<{
    valid: string[];
    overweight: Array<{ shipmentId: string; orderNumber: string; totalWeightKg: number }>;
  }> {
    const wave = await Wave.findById(waveId).lean<IWave>();
    if (!wave) {
      throw new Error(`Wave not found: ${waveId}`);
    }

    const valid: string[] = [];
    const overweight: Array<{ shipmentId: string; orderNumber: string; totalWeightKg: number }> = [];

    for (const shipmentId of wave.shipmentIds) {
      const shipment = await ShipmentOrder.findById(shipmentId).lean<IShipmentOrder>();
      if (!shipment) continue;

      // 重量計算（商品の weight フィールドから）/ 重量计算（从商品weight字段）
      let totalWeightKg = 0;
      for (const product of shipment.products) {
        const weight = (product as any).weight || 0;
        totalWeightKg += weight * (product.quantity || 1);
      }

      if (totalWeightKg > maxWeightKg) {
        overweight.push({
          shipmentId: String(shipment._id),
          orderNumber: shipment.orderNumber,
          totalWeightKg,
        });
      } else {
        valid.push(String(shipment._id));
      }
    }

    return { valid, overweight };
  }

  /**
   * 装箱単（パッキングリスト）データ生成 / 装箱单（Packing List）数据生成
   *
   * 日本の3PL倉庫では、出荷時にパッキングリストを同梱するのが標準。
   * 日本3PL仓库出货时，随箱附装箱单是标准做法。
   */
  static async generatePackingList(shipmentId: string): Promise<{
    orderNumber: string;
    customerName: string;
    shippingAddress: string;
    items: Array<{
      sku: string;
      productName: string;
      quantity: number;
    }>;
    totalItems: number;
    totalQuantity: number;
    generatedAt: Date;
  }> {
    const shipment = await ShipmentOrder.findById(shipmentId).lean<IShipmentOrder>();
    if (!shipment) {
      throw new Error(`出荷指示が見つかりません: ${shipmentId}`);
    }

    const items = shipment.products.map((p) => ({
      sku: p.productSku || p.inputSku || '',
      productName: p.productName || '',
      quantity: p.quantity || 0,
    }));

    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

    // 配送先住所の組み立て / 组装配送地址
    const addr = (shipment as any).consignee || {};
    const shippingAddress = [
      addr.postalCode ? `〒${addr.postalCode}` : '',
      addr.prefecture || '',
      addr.city || '',
      addr.address1 || '',
      addr.address2 || '',
    ].filter(Boolean).join(' ');

    return {
      orderNumber: shipment.orderNumber,
      customerName: addr.name || (shipment as any).customerName || '',
      shippingAddress,
      items,
      totalItems: items.length,
      totalQuantity,
      generatedAt: new Date(),
    };
  }

  /**
   * Get wave progress with task completion counts by type.
   */
  static async getWaveProgress(waveId: string): Promise<{
    wave: IWave;
    picking: { total: number; completed: number };
    sorting: { total: number; completed: number };
    packing: { total: number; completed: number };
  }> {
    const wave = await Wave.findById(waveId).lean<IWave>();
    if (!wave) {
      throw new Error(`Wave not found: ${waveId}`);
    }

    const tasks = await WarehouseTask.find({
      waveId: String(wave._id),
    }).lean<IWarehouseTask[]>();

    const countByType = (type: string) => {
      const typeTasks = tasks.filter((t) => t.type === type);
      const completed = typeTasks.filter(
        (t) => t.status === 'completed' || t.status === 'cancelled',
      ).length;
      return { total: typeTasks.length, completed };
    };

    return {
      wave,
      picking: countByType('picking'),
      sorting: countByType('sorting'),
      packing: countByType('packing'),
    };
  }
}
