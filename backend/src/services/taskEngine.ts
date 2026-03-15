import {
  IWarehouseTask,
  WarehouseTask,
  WarehouseTaskType,
  WarehouseTaskStatus,
  WarehouseTaskPriority,
} from '../models/warehouseTask';
import { InventoryLedger, LedgerType } from '../models/inventoryLedger';
import { extensionManager } from '@/core/extensions';
import { HOOK_EVENTS } from '@/core/extensions/types';
import { logger } from '@/lib/logger';

const PRIORITY_ORDER: Record<WarehouseTaskPriority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

function sortByPriorityThenCreatedAt(tasks: IWarehouseTask[]): IWarehouseTask[] {
  return [...tasks].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority ?? 'normal'];
    const pb = PRIORITY_ORDER[b.priority ?? 'normal'];
    if (pa !== pb) return pa - pb;
    const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return ca - cb;
  });
}

export class TaskEngine {
  /**
   * Generate a task number in format: WT-{YYYYMMDD}-{random5digits}
   */
  private static generateTaskNumber(): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
    return `WT-${yyyy}${mm}${dd}-${random}`;
  }

  /**
   * Create a new warehouse task.
   */
  static async createTask(params: {
    type: WarehouseTaskType;
    warehouseId: string;
    clientId?: string;
    productId?: string;
    productSku?: string;
    productName?: string;
    fromLocationId?: string;
    fromLocationCode?: string;
    toLocationId?: string;
    toLocationCode?: string;
    lotId?: string;
    lotNumber?: string;
    requiredQuantity?: number;
    priority?: WarehouseTaskPriority;
    referenceType?: string;
    referenceId?: string;
    referenceNumber?: string;
    waveId?: string;
    shipmentId?: string;
    instructions?: string;
    memo?: string;
  }): Promise<IWarehouseTask> {
    const task = await WarehouseTask.create({
      ...params,
      taskNumber: TaskEngine.generateTaskNumber(),
      status: 'created' as WarehouseTaskStatus,
    });

    // タスク作成イベント / 任务创建事件 (fire-and-forget)
    extensionManager.emit(HOOK_EVENTS.TASK_CREATED, {
      taskId: String(task._id),
      taskNumber: task.taskNumber,
      type: task.type,
      productSku: task.productSku,
      referenceNumber: task.referenceNumber,
    }).catch((err: unknown) => logger.warn({ err }, 'TASK_CREATED hook failed'));

    return task;
  }

  /**
   * Assign a task to a worker.
   */
  static async assignTask(
    taskId: string,
    assignedTo: string,
    assignedName?: string,
  ): Promise<IWarehouseTask> {
    const task = await WarehouseTask.findById(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }
    if (task.status !== 'created' && task.status !== 'on_hold') {
      throw new Error(
        `Cannot assign task in status '${task.status}'. Task must be 'created' or 'on_hold'.`,
      );
    }

    task.status = 'assigned' as WarehouseTaskStatus;
    task.assignedTo = assignedTo;
    if (assignedName !== undefined) {
      task.assignedName = assignedName;
    }
    await task.save();
    return task;
  }

  /**
   * Start a task (worker begins work).
   */
  static async startTask(taskId: string): Promise<IWarehouseTask> {
    const task = await WarehouseTask.findById(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }
    if (task.status !== 'assigned') {
      throw new Error(
        `Cannot start task in status '${task.status}'. Task must be 'assigned'.`,
      );
    }

    task.status = 'in_progress' as WarehouseTaskStatus;
    task.startedAt = new Date();
    await task.save();
    return task;
  }

  /**
   * Complete a task with quantity. Writes InventoryLedger entries based on task type.
   */
  static async completeTask(
    taskId: string,
    completedQuantity: number,
    executedBy?: string,
  ): Promise<IWarehouseTask> {
    const task = await WarehouseTask.findById(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }
    if (task.status !== 'in_progress') {
      throw new Error(
        `Cannot complete task in status '${task.status}'. Task must be 'in_progress'.`,
      );
    }

    const now = new Date();
    task.status = 'completed' as WarehouseTaskStatus;
    task.completedQuantity = completedQuantity;
    task.completedAt = now;

    if (task.startedAt) {
      task.durationMs = now.getTime() - new Date(task.startedAt).getTime();
    }

    await task.save();

    // Write InventoryLedger entries based on task type
    await TaskEngine.writeLedgerEntries(task, completedQuantity, executedBy);

    // タスク完了イベント / 任务完成事件 (fire-and-forget)
    extensionManager.emit(HOOK_EVENTS.TASK_COMPLETED, {
      taskId: String(task._id),
      taskNumber: task.taskNumber,
      type: task.type,
      completedQuantity,
      durationMs: task.durationMs,
      productSku: task.productSku,
      referenceNumber: task.referenceNumber,
    }).catch((err: unknown) => logger.warn({ err }, 'TASK_COMPLETED hook failed'));

    return task;
  }

  /**
   * Write ledger entries for a completed task.
   */
  private static async writeLedgerEntries(
    task: IWarehouseTask,
    quantity: number,
    executedBy?: string,
  ): Promise<void> {
    if (!task.productId || !task.productSku) return;

    const baseLedger = {
      clientId: task.clientId,
      productId: task.productId,
      productSku: task.productSku,
      warehouseId: task.warehouseId,
      lotId: task.lotId,
      lotNumber: task.lotNumber,
      referenceType: task.referenceType,
      referenceId: task.referenceId,
      referenceNumber: task.referenceNumber,
      executedBy,
      executedAt: new Date(),
    };

    const taskType = task.type as WarehouseTaskType;

    if (taskType === 'picking') {
      await InventoryLedger.create({
        ...baseLedger,
        locationId: task.fromLocationId,
        type: 'outbound' as LedgerType,
        quantity: -Math.abs(quantity),
      });
    } else if (taskType === 'putaway' || taskType === 'receiving') {
      await InventoryLedger.create({
        ...baseLedger,
        locationId: task.toLocationId,
        type: 'inbound' as LedgerType,
        quantity: Math.abs(quantity),
      });
    } else if (taskType === 'replenishment') {
      // Outbound from source location
      await InventoryLedger.create({
        ...baseLedger,
        locationId: task.fromLocationId,
        type: 'outbound' as LedgerType,
        quantity: -Math.abs(quantity),
      });
      // Inbound to destination location
      await InventoryLedger.create({
        ...baseLedger,
        locationId: task.toLocationId,
        type: 'inbound' as LedgerType,
        quantity: Math.abs(quantity),
      });
    }
  }

  /**
   * Cancel a task.
   */
  static async cancelTask(taskId: string, reason?: string): Promise<IWarehouseTask> {
    const task = await WarehouseTask.findById(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }
    if (task.status === 'completed' || task.status === 'cancelled') {
      throw new Error(
        `Cannot cancel task in status '${task.status}'.`,
      );
    }

    task.status = 'cancelled' as WarehouseTaskStatus;
    if (reason !== undefined) {
      task.memo = reason;
    }
    await task.save();
    return task;
  }

  /**
   * Put a task on hold.
   */
  static async holdTask(taskId: string, reason?: string): Promise<IWarehouseTask> {
    const task = await WarehouseTask.findById(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }
    if (task.status === 'completed' || task.status === 'cancelled') {
      throw new Error(
        `Cannot hold task in status '${task.status}'.`,
      );
    }

    task.status = 'on_hold' as WarehouseTaskStatus;
    if (reason !== undefined) {
      task.memo = reason;
    }
    await task.save();
    return task;
  }

  /**
   * Get the next task for a worker, ordered by priority (urgent>high>normal>low)
   * then by createdAt ascending.
   */
  static async getNextTask(
    warehouseId: string,
    assignedTo: string,
  ): Promise<IWarehouseTask | null> {
    const tasks = await WarehouseTask.find({
      warehouseId,
      assignedTo,
      status: 'assigned',
    }).lean<IWarehouseTask[]>();

    if (tasks.length === 0) return null;

    const sorted = sortByPriorityThenCreatedAt(tasks);
    return sorted[0];
  }

  /**
   * Get the task queue for a warehouse with optional filters.
   */
  static async getTaskQueue(
    warehouseId: string,
    options?: {
      type?: WarehouseTaskType;
      status?: WarehouseTaskStatus;
      assignedTo?: string;
      limit?: number;
    },
  ): Promise<IWarehouseTask[]> {
    const limit = options?.limit ?? 100;

    const filter: Record<string, unknown> = { warehouseId };
    if (options?.type) filter.type = options.type;
    if (options?.status) filter.status = options.status;
    if (options?.assignedTo) filter.assignedTo = options.assignedTo;

    const tasks = await WarehouseTask.find(filter)
      .limit(limit)
      .lean<IWarehouseTask[]>();

    return sortByPriorityThenCreatedAt(tasks);
  }
}
