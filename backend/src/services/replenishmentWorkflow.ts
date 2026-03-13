import { TaskEngine } from '@/services/taskEngine';
import { RuleEngine } from '@/services/ruleEngine';
import { StockQuant, IStockQuant } from '@/models/stockQuant';
import { Location, ILocation } from '@/models/location';
import {
  WarehouseTask,
  IWarehouseTask,
  WarehouseTaskPriority,
} from '@/models/warehouseTask';

interface ReplenishmentStatus {
  pending: number;
  inProgress: number;
  completed: number;
  total: number;
}

/**
 * 補充ワークフロー
 * ルール判定 → タスク自動生成 → 実行 → 確認
 */
export class ReplenishmentWorkflow {
  /**
   * Generate a replenishment reference number: RPL-{YYYYMMDD}-{random5}
   */
  private static generateReferenceNumber(): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
    return `RPL-${yyyy}${mm}${dd}-${random}`;
  }

  /**
   * Check picking-zone locations against replenishment rules and create tasks
   * for locations that fall below the minimum quantity threshold.
   */
  static async checkAndTrigger(
    warehouseId: string,
    executedBy?: string,
  ): Promise<IWarehouseTask[]> {
    // Find all picking-zone locations (bin or shelf) in the warehouse
    const pickingLocations = await Location.find({
      warehouseId,
      type: { $in: ['bin', 'shelf'] },
      isActive: true,
    }).lean<ILocation[]>();

    const createdTasks: IWarehouseTask[] = [];

    for (const location of pickingLocations) {
      const stockQuants = await StockQuant.find({
        locationId: location._id,
      }).lean<IStockQuant[]>();

      // Evaluate replenishment rules for each stock quant at this location
      for (const stockQuant of stockQuants) {
        const availableQuantity = stockQuant.quantity - stockQuant.reservedQuantity;

        const ruleResults = await RuleEngine.evaluate(
          'replenishment',
          { location, stockQuant, availableQuantity },
          { warehouseId },
        );

        for (const result of ruleResults) {
          const triggerActions = result.actions.filter(
            (action) => action.type === 'trigger_replenishment',
          );

          for (const action of triggerActions) {
            const params = action.params as {
              minQuantity?: number;
              replenishQuantity?: number;
              sourceZone?: string;
            };

            const minQuantity = params.minQuantity ?? 0;
            const replenishQuantity = params.replenishQuantity ?? 0;

            if (availableQuantity >= minQuantity) {
              continue;
            }

            // Find a source location in the storage zone with sufficient stock
            const sourceLocation = await ReplenishmentWorkflow.findSourceLocation(
              warehouseId,
              String(stockQuant.productId),
              replenishQuantity,
              params.sourceZone,
            );

            if (!sourceLocation) {
              continue;
            }

            const priority = (params as Record<string, unknown>).priority as
              | WarehouseTaskPriority
              | undefined;

            const task = await TaskEngine.createTask({
              type: 'replenishment',
              warehouseId,
              productId: String(stockQuant.productId),
              productSku: stockQuant.productSku,
              fromLocationId: String(sourceLocation._id),
              fromLocationCode: sourceLocation.code,
              toLocationId: String(location._id),
              toLocationCode: location.code,
              requiredQuantity: replenishQuantity,
              priority: priority ?? 'normal',
              referenceType: 'replenishment',
              referenceNumber: ReplenishmentWorkflow.generateReferenceNumber(),
              memo: executedBy ? `Triggered by ${executedBy}` : undefined,
            });

            createdTasks.push(task);
          }
        }
      }
    }

    return createdTasks;
  }

  /**
   * Find a source location in the storage zone that has sufficient stock
   * for the given product.
   */
  private static async findSourceLocation(
    warehouseId: string,
    productId: string,
    requiredQuantity: number,
    sourceZone?: string,
  ): Promise<ILocation | null> {
    // Build location filter for storage zone
    const locationFilter: Record<string, unknown> = {
      warehouseId,
      isActive: true,
    };

    if (sourceZone) {
      // If sourceZone is specified, find locations under that zone by code prefix
      locationFilter.code = { $regex: `^${sourceZone}` };
    }

    // Include zone-level locations as potential storage sources
    locationFilter.type = { $in: ['zone', 'shelf', 'bin'] };

    const storageLocations = await Location.find(locationFilter).lean<ILocation[]>();

    if (storageLocations.length === 0) {
      return null;
    }

    const locationIds = storageLocations.map((loc) => loc._id);

    // Find stock quants at those locations for the target product with enough available qty
    const candidateQuants = await StockQuant.find({
      locationId: { $in: locationIds },
      productId,
    }).lean<IStockQuant[]>();

    // Pick the first location that has sufficient available stock
    for (const quant of candidateQuants) {
      const available = quant.quantity - quant.reservedQuantity;
      if (available >= requiredQuantity) {
        const location = storageLocations.find(
          (loc) => String(loc._id) === String(quant.locationId),
        );
        if (location) {
          return location;
        }
      }
    }

    return null;
  }

  /**
   * Complete a replenishment task. TaskEngine.completeTask auto-writes
   * ledger entries for both source and destination locations.
   */
  static async completeReplenishment(
    taskId: string,
    movedQuantity: number,
    executedBy?: string,
  ): Promise<IWarehouseTask> {
    const completedTask = await TaskEngine.completeTask(taskId, movedQuantity, executedBy);
    return completedTask;
  }

  /**
   * Get replenishment task status summary for a warehouse,
   * grouped by status.
   */
  static async getReplenishmentStatus(
    warehouseId: string,
  ): Promise<ReplenishmentStatus> {
    const tasks = await WarehouseTask.find({
      warehouseId,
      type: 'replenishment',
      status: { $nin: ['cancelled'] },
    }).lean<IWarehouseTask[]>();

    const pending = tasks.filter(
      (t) => t.status === 'created' || t.status === 'assigned',
    ).length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const completed = tasks.filter((t) => t.status === 'completed').length;

    return {
      pending,
      inProgress,
      completed,
      total: tasks.length,
    };
  }
}
