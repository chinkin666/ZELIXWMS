import { Router } from 'express';
import {
  listMaterials,
  getMaterial,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  adjustMaterialStock,
} from '@/api/controllers/materialController';

export const materialRouter = Router();

// 耗材一覧 / 耗材列表
materialRouter.get('/', listMaterials);

// 耗材作成 / 创建耗材
materialRouter.post('/', createMaterial);

// 耗材在庫調整（:id より前に定義）/ 耗材库存调整（在 :id 之前定义）
materialRouter.post('/:id/adjust-stock', adjustMaterialStock);

// 耗材詳細 / 耗材详情
materialRouter.get('/:id', getMaterial);

// 耗材更新 / 更新耗材
materialRouter.put('/:id', updateMaterial);

// 耗材削除（論理削除）/ 删除耗材（逻辑删除）
materialRouter.delete('/:id', deleteMaterial);
