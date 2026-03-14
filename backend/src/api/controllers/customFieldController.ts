/**
 * 自定义字段管理 Controller / カスタムフィールド管理コントローラー
 */

import type { Request, Response } from 'express';
import { extensionManager } from '@/core/extensions';

/**
 * 获取字段定义列表 / フィールド定義一覧取得
 * GET /api/extensions/custom-fields
 */
export async function listDefinitions(req: Request, res: Response) {
  try {
    const { entityType, tenantId } = req.query;
    const service = extensionManager.getCustomFieldService();
    const definitions = await service.getAllDefinitions({
      entityType: entityType as string | undefined,
      tenantId: tenantId as string | undefined,
    });
    res.json({ data: definitions });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/**
 * 获取指定实体的启用字段定义 / 指定エンティティの有効フィールド定義取得
 * GET /api/extensions/custom-fields/:entityType/active
 */
export async function getActiveDefinitions(req: Request, res: Response) {
  try {
    const { entityType } = req.params;
    const tenantId = req.query.tenantId as string | undefined;
    const service = extensionManager.getCustomFieldService();
    const definitions = await service.getDefinitions(
      entityType as 'order' | 'product' | 'inboundOrder' | 'returnOrder',
      tenantId,
    );
    res.json({ data: definitions });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/**
 * 创建字段定义 / フィールド定義作成
 * POST /api/extensions/custom-fields
 */
export async function createDefinition(req: Request, res: Response) {
  try {
    const service = extensionManager.getCustomFieldService();
    const definition = await service.createDefinition(req.body);
    res.status(201).json(definition);
  } catch (err) {
    const message = (err as Error).message;
    const status = message.includes('duplicate key') ? 409 : 400;
    res.status(status).json({ error: message });
  }
}

/**
 * 更新字段定义 / フィールド定義更新
 * PUT /api/extensions/custom-fields/:id
 */
export async function updateDefinition(req: Request, res: Response) {
  try {
    const service = extensionManager.getCustomFieldService();
    const definition = await service.updateDefinition(req.params.id, req.body);
    if (!definition) {
      return res.status(404).json({ error: 'フィールド定義が見つかりません' });
    }
    res.json(definition);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
}

/**
 * 删除字段定义 / フィールド定義削除
 * DELETE /api/extensions/custom-fields/:id
 */
export async function deleteDefinition(req: Request, res: Response) {
  try {
    const service = extensionManager.getCustomFieldService();
    const deleted = await service.deleteDefinition(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'フィールド定義が見つかりません' });
    }
    res.json({ message: 'フィールド定義を削除しました' });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/**
 * 校验自定义字段值 / カスタムフィールド値バリデーション
 * POST /api/extensions/custom-fields/:entityType/validate
 */
export async function validateValues(req: Request, res: Response) {
  try {
    const { entityType } = req.params;
    const { values, tenantId } = req.body;
    const service = extensionManager.getCustomFieldService();
    const result = await service.validateValues(
      entityType as 'order' | 'product' | 'inboundOrder' | 'returnOrder',
      values ?? {},
      tenantId,
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
