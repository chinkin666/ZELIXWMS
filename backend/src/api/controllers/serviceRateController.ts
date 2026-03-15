import type { Request, Response } from 'express';
import { ServiceRate, CHARGE_TYPES, CHARGE_UNITS } from '@/models/serviceRate';
import { logger } from '@/lib/logger';

/**
 * テナントIDを取得（将来的にはJWTなどから取得）
 * 获取租户ID（将来从JWT等获取）
 */
function getTenantId(_req: Request): string {
  // TODO: 認証ミドルウェアからテナントIDを取得
  return 'default';
}

/**
 * サービス料金一覧を取得
 * 获取服务费率列表
 * GET /api/service-rates?clientId=xxx&chargeType=xxx&isActive=true&search=xxx&page=1&limit=20
 */
export const listServiceRates = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const { clientId, chargeType, isActive, search, page, limit } = req.query;

    const filter: Record<string, unknown> = { tenantId };

    // 荷主フィルター / 货主过滤
    if (typeof clientId === 'string' && clientId.trim()) {
      filter.clientId = clientId.trim();
    }

    // チャージ種別フィルター / 费用类型过滤
    if (typeof chargeType === 'string' && chargeType.trim()) {
      filter.chargeType = chargeType.trim();
    }

    // 有効フラグフィルター / 有效标志过滤
    if (typeof isActive === 'string') {
      if (isActive === 'true') filter.isActive = true;
      if (isActive === 'false') filter.isActive = false;
    }

    // テキスト検索 / 文本搜索
    if (typeof search === 'string' && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { clientName: { $regex: escaped, $options: 'i' } },
        { memo: { $regex: escaped, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await Promise.all([
      ServiceRate.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      ServiceRate.countDocuments(filter),
    ]);

    res.json({ data, total });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error({ error: message }, 'サービス料金の取得に失敗しました / 获取服务费率失败');
    res.status(500).json({ message: 'サービス料金の取得に失敗しました', error: message });
  }
};

/**
 * サービス料金を1件取得
 * 获取单个服务费率
 * GET /api/service-rates/:id
 */
export const getServiceRate = async (req: Request, res: Response): Promise<void> => {
  try {
    const item = await ServiceRate.findById(req.params.id).lean();
    if (!item) {
      res.status(404).json({ message: 'サービス料金が見つかりません / 未找到服务费率' });
      return;
    }
    res.json(item);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error({ error: message }, 'サービス料金の取得に失敗しました / 获取服务费率失败');
    res.status(500).json({ message: 'サービス料金の取得に失敗しました', error: message });
  }
};

/**
 * サービス料金を作成
 * 创建服务费率
 * POST /api/service-rates
 */
export const createServiceRate = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const {
      clientId,
      clientName,
      chargeType,
      name,
      unit,
      unitPrice,
      conditions,
      isActive,
      validFrom,
      validTo,
      memo,
    } = req.body;

    // 必須フィールドバリデーション / 必填字段验证
    if (!chargeType || !CHARGE_TYPES.includes(chargeType)) {
      res.status(400).json({ message: 'チャージ種別が無効です / 费用类型无效' });
      return;
    }
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ message: '料金名称は必須です / 费率名称为必填项' });
      return;
    }
    if (!unit || !CHARGE_UNITS.includes(unit)) {
      res.status(400).json({ message: 'チャージ単位が無効です / 费用单位无效' });
      return;
    }
    if (unitPrice === undefined || unitPrice === null || typeof unitPrice !== 'number' || unitPrice < 0) {
      res.status(400).json({ message: '単価は0以上の数値で入力してください / 单价须为0以上的数值' });
      return;
    }

    const created = await ServiceRate.create({
      tenantId,
      clientId: clientId?.trim() || undefined,
      clientName: clientName?.trim() || undefined,
      chargeType,
      name: name.trim(),
      unit,
      unitPrice: Number(unitPrice),
      conditions: conditions || undefined,
      isActive: isActive !== false,
      validFrom: validFrom ? new Date(validFrom) : undefined,
      validTo: validTo ? new Date(validTo) : undefined,
      memo: memo?.trim() || undefined,
    });

    res.status(201).json(created.toObject());
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error({ error: message }, 'サービス料金の作成に失敗しました / 创建服务费率失败');
    res.status(500).json({ message: 'サービス料金の作成に失敗しました', error: message });
  }
};

/**
 * サービス料金を更新
 * 更新服务费率
 * PUT /api/service-rates/:id
 */
export const updateServiceRate = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      clientId,
      clientName,
      chargeType,
      name,
      unit,
      unitPrice,
      conditions,
      isActive,
      validFrom,
      validTo,
      memo,
    } = req.body;

    const updateData: Record<string, unknown> = {};

    if (clientId !== undefined) updateData.clientId = clientId?.trim() || undefined;
    if (clientName !== undefined) updateData.clientName = clientName?.trim() || undefined;
    if (chargeType !== undefined) {
      if (!CHARGE_TYPES.includes(chargeType)) {
        res.status(400).json({ message: 'チャージ種別が無効です / 费用类型无效' });
        return;
      }
      updateData.chargeType = chargeType;
    }
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ message: '料金名称は必須です / 费率名称为必填项' });
        return;
      }
      updateData.name = name.trim();
    }
    if (unit !== undefined) {
      if (!CHARGE_UNITS.includes(unit)) {
        res.status(400).json({ message: 'チャージ単位が無効です / 费用单位无效' });
        return;
      }
      updateData.unit = unit;
    }
    if (unitPrice !== undefined) updateData.unitPrice = Number(unitPrice);
    if (conditions !== undefined) updateData.conditions = conditions || undefined;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (validFrom !== undefined) updateData.validFrom = validFrom ? new Date(validFrom) : undefined;
    if (validTo !== undefined) updateData.validTo = validTo ? new Date(validTo) : undefined;
    if (memo !== undefined) updateData.memo = memo?.trim() || undefined;

    const updated = await ServiceRate.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updated) {
      res.status(404).json({ message: 'サービス料金が見つかりません / 未找到服务费率' });
      return;
    }

    res.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error({ error: message }, 'サービス料金の更新に失敗しました / 更新服务费率失败');
    res.status(500).json({ message: 'サービス料金の更新に失敗しました', error: message });
  }
};

/**
 * サービス料金を削除（論理削除：isActive=false）
 * 删除服务费率（逻辑删除：isActive=false）
 * DELETE /api/service-rates/:id
 */
export const deleteServiceRate = async (req: Request, res: Response): Promise<void> => {
  try {
    const updated = await ServiceRate.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true },
    ).lean();

    if (!updated) {
      res.status(404).json({ message: 'サービス料金が見つかりません / 未找到服务费率' });
      return;
    }

    res.json({ message: 'サービス料金を無効にしました / 已停用服务费率', id: updated._id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error({ error: message }, 'サービス料金の削除に失敗しました / 删除服务费率失败');
    res.status(500).json({ message: 'サービス料金の削除に失敗しました', error: message });
  }
};
