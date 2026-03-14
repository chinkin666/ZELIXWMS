import { z } from 'zod';

/**
 * ルール対象モジュール / 规则目标模块
 */
const ruleModuleEnum = z.enum([
  'putaway', 'picking', 'wave', 'replenishment',
  'carrier_selection', 'order_routing', 'packing', 'custom',
]);

/**
 * ルール作成スキーマ / 规则创建验证模式
 */
export const createRuleSchema = z.object({
  name: z.string().min(1, 'ルール名は必須です'),
  description: z.string().optional(),
  module: ruleModuleEnum,
  warehouseId: z.string().optional(),
  clientId: z.string().optional(),
  priority: z.number().int().min(0).max(100).optional().default(0),
  conditionGroups: z.array(z.any()).optional().default([]),
  actions: z.array(z.any()).min(1, 'アクションは最低1つ必要です'),
  stopOnMatch: z.boolean().optional().default(true),
  isActive: z.boolean().optional().default(true),
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().optional(),
  memo: z.string().optional(),
  createdBy: z.string().optional(),
});

/**
 * ルール更新スキーマ / 规则更新验证模式
 * すべてのフィールドが任意 / 所有字段均为可选
 */
export const updateRuleSchema = z.object({
  name: z.string().min(1, 'ルール名は必須です').optional(),
  description: z.string().optional(),
  module: ruleModuleEnum.optional(),
  warehouseId: z.string().nullable().optional(),
  clientId: z.string().nullable().optional(),
  priority: z.number().int().min(0).max(100).optional(),
  conditionGroups: z.array(z.any()).optional(),
  actions: z.array(z.any()).min(1, 'アクションは最低1つ必要です').optional(),
  stopOnMatch: z.boolean().optional(),
  isActive: z.boolean().optional(),
  validFrom: z.string().datetime().nullable().optional(),
  validTo: z.string().datetime().nullable().optional(),
  memo: z.string().optional(),
  createdBy: z.string().optional(),
});
