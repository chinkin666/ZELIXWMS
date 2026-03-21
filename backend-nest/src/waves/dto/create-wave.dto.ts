// ウェーブ作成・更新DTO（Zodバリデーション）/ 波次创建・更新DTO（Zod验证）
import { z } from 'zod';

export const createWaveSchema = z.object({
  // ウェーブ番号（必須）/ 波次编号（必填）
  waveNumber: z.string().trim().min(1, 'Wave number is required'),
  // 倉庫ID（必須）/ 仓库ID（必填）
  warehouseId: z.string().uuid('Invalid warehouse ID'),
  // ステータス / 状态
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional().default('pending'),
  // 優先度 / 优先级
  priority: z.number().int().optional(),
  // 対象出荷ID / 关联出库ID
  shipmentIds: z.array(z.string().uuid()).optional().default([]),
  // 担当者ID / 负责人ID
  assignedTo: z.string().uuid().optional(),
  // 担当者名 / 负责人名
  assignedName: z.string().trim().optional(),
});

export const updateWaveSchema = createWaveSchema.partial();

export type CreateWaveDto = z.infer<typeof createWaveSchema>;
export type UpdateWaveDto = z.infer<typeof updateWaveSchema>;
