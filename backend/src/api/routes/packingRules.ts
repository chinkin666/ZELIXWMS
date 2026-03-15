import { Router } from 'express';
import {
  listPackingRules,
  createPackingRule,
  updatePackingRule,
  deletePackingRule,
  evaluatePackingRules,
} from '@/api/controllers/packingRuleController';

export const packingRuleRouter = Router();

// 梱包ルール一覧 / 梱包规则列表
packingRuleRouter.get('/', listPackingRules);

// 梱包ルール評価（:id より前に定義）/ 梱包规则评估（在 :id 之前定义）
packingRuleRouter.post('/evaluate', evaluatePackingRules);

// 梱包ルール作成 / 创建梱包规则
packingRuleRouter.post('/', createPackingRule);

// 梱包ルール更新 / 更新梱包规则
packingRuleRouter.put('/:id', updatePackingRule);

// 梱包ルール削除 / 删除梱包规则
packingRuleRouter.delete('/:id', deletePackingRule);
