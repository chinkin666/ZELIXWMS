// 倉庫タスク作成・更新DTO（Zodバリデーション）/ 仓库任务创建・更新DTO（Zod验证）
import { z } from 'zod';

export const createWarehouseTaskSchema = z.object({
  // タスク番号（必須）/ 任务编号（必填）
  taskNumber: z.string().trim().min(1, 'Task number is required'),
  // タスク種別（必須）/ 任务类型（必填）
  type: z.enum(['picking', 'packing', 'shipping', 'receiving', 'putaway', 'count']),
  // 倉庫ID（必須）/ 仓库ID（必填）
  warehouseId: z.string().uuid('Invalid warehouse ID'),
  // ステータス / 状态
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional().default('pending'),
  // 関連オーダーID / 关联订单ID
  orderId: z.string().uuid().optional(),
  // 関連ウェーブID / 关联波次ID
  waveId: z.string().uuid().optional(),
  // 作業者ID / 操作员ID
  assigneeId: z.string().uuid().optional(),
  // 作業者名 / 操作员名
  assigneeName: z.string().trim().optional(),
  // 優先度 / 优先级
  priority: z.number().int().optional(),
  // タスク明細 / 任务明细
  items: z.array(z.record(z.string(), z.unknown())).optional().default([]),
});

export const updateWarehouseTaskSchema = createWarehouseTaskSchema.partial();

export type CreateWarehouseTaskDto = z.infer<typeof createWarehouseTaskSchema>;
export type UpdateWarehouseTaskDto = z.infer<typeof updateWarehouseTaskSchema>;
