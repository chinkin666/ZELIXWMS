import type { Request, Response } from 'express';
import { RslShipmentPlan } from '@/models/rslShipmentPlan';
import type { RslPlanStatus } from '@/models/rslShipmentPlan';
import { getTenantId } from '@/api/helpers/tenantHelper';

/**
 * RSLプラン一覧取得 / 获取RSL计划列表
 * GET /api/rsl/plans?status=draft&page=1&limit=20&search=xxx
 */
export const listRslPlans = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const { status, search, page, limit } = req.query;

    const filter: Record<string, unknown> = { tenantId };

    // ステータスフィルター / 状态过滤
    if (typeof status === 'string' && status.trim()) {
      filter.status = status.trim();
    }

    // テキスト検索 / 文本搜索
    if (typeof search === 'string' && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { planNumber: { $regex: escaped, $options: 'i' } },
        { rakutenShipmentId: { $regex: escaped, $options: 'i' } },
        { destinationWarehouse: { $regex: escaped, $options: 'i' } },
        { trackingNumber: { $regex: escaped, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await Promise.all([
      RslShipmentPlan.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      RslShipmentPlan.countDocuments(filter),
    ]);

    res.json({ data, total });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: 'RSLプランの取得に失敗しました / 获取RSL计划失败', error: message });
  }
};

/**
 * RSLプラン作成 / 创建RSL计划
 * POST /api/rsl/plans
 */
export const createRslPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const {
      destinationWarehouse, rakutenShipmentId,
      items, carrierId, boxCount, shipDate, estimatedArrival, memo,
    } = req.body;

    // バリデーション / 验证
    if (!destinationWarehouse || typeof destinationWarehouse !== 'string' || !destinationWarehouse.trim()) {
      res.status(400).json({ message: '配送先倉庫（destinationWarehouse）は必須です / 配送目的仓库（destinationWarehouse）为必填项' });
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: '明細（items）は1件以上必要です / 明细（items）至少需要1条' });
      return;
    }

    // プラン番号自動生成 / 自动生成计划编号
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await RslShipmentPlan.countDocuments({
      tenantId,
      planNumber: { $regex: `^RSL-${today}-` },
    });
    const planNumber = `RSL-${today}-${String(count + 1).padStart(3, '0')}`;

    // 合計数量計算 / 计算总数量
    const totalQuantity = items.reduce(
      (sum: number, item: { quantity?: number }) => sum + (item.quantity || 0),
      0,
    );

    const created = await RslShipmentPlan.create({
      tenantId,
      planNumber,
      status: 'draft',
      destinationWarehouse: destinationWarehouse.trim(),
      rakutenShipmentId: rakutenShipmentId?.trim() || undefined,
      items: items.map((item: Record<string, unknown>) => ({
        productId: item.productId,
        sku: item.sku,
        rakutenSku: item.rakutenSku || undefined,
        quantity: item.quantity || 0,
        preparedQuantity: 0,
        shippedQuantity: 0,
      })),
      carrierId: carrierId?.trim() || undefined,
      boxCount: boxCount || undefined,
      totalQuantity,
      shipDate: shipDate ? new Date(shipDate as string) : undefined,
      estimatedArrival: estimatedArrival ? new Date(estimatedArrival as string) : undefined,
      memo: memo?.trim() || undefined,
    });

    res.status(201).json(created.toObject());
  } catch (error: unknown) {
    if ((error as any).code === 11000) {
      res.status(409).json({ message: 'プラン番号が重複しています / 计划编号重复' });
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: 'RSLプランの作成に失敗しました / 创建RSL计划失败', error: message });
  }
};

/**
 * RSLプラン詳細取得 / 获取RSL计划详情
 * GET /api/rsl/plans/:id
 */
export const getRslPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const item = await RslShipmentPlan.findOne({ _id: req.params.id, tenantId }).lean();
    if (!item) {
      res.status(404).json({ message: 'RSLプランが見つかりません / 未找到RSL计划' });
      return;
    }
    res.json(item);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: 'RSLプランの取得に失敗しました / 获取RSL计划失败', error: message });
  }
};

/**
 * RSLプラン更新 / 更新RSL计划
 * PUT /api/rsl/plans/:id
 */
export const updateRslPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const existing = await RslShipmentPlan.findOne({ _id: req.params.id, tenantId }).lean();
    if (!existing) {
      res.status(404).json({ message: 'RSLプランが見つかりません / 未找到RSL计划' });
      return;
    }

    // confirmed以降は一部フィールドのみ更新可 / confirmed之后只能更新部分字段
    if (existing.status !== 'draft') {
      const allowedFields = ['rakutenShipmentId', 'carrierId', 'trackingNumber', 'boxCount', 'memo', 'shipDate', 'estimatedArrival'];
      const updateKeys = Object.keys(req.body);
      const disallowed = updateKeys.filter((k) => !allowedFields.includes(k));
      if (disallowed.length > 0) {
        res.status(400).json({
          message: `ステータスが「${existing.status}」のため、以下のフィールドは更新できません: ${disallowed.join(', ')} / 状态为「${existing.status}」时不可更新以下字段: ${disallowed.join(', ')}`,
        });
        return;
      }
    }

    const {
      destinationWarehouse, rakutenShipmentId,
      items, carrierId, trackingNumber, boxCount, shipDate, estimatedArrival, memo,
    } = req.body;

    const updateData: Record<string, unknown> = {};

    if (destinationWarehouse !== undefined) updateData.destinationWarehouse = destinationWarehouse?.trim();
    if (rakutenShipmentId !== undefined) updateData.rakutenShipmentId = rakutenShipmentId?.trim() || undefined;
    if (carrierId !== undefined) updateData.carrierId = carrierId?.trim() || undefined;
    if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber?.trim() || undefined;
    if (boxCount !== undefined) updateData.boxCount = boxCount || undefined;
    if (shipDate !== undefined) updateData.shipDate = shipDate ? new Date(shipDate as string) : undefined;
    if (estimatedArrival !== undefined) updateData.estimatedArrival = estimatedArrival ? new Date(estimatedArrival as string) : undefined;
    if (memo !== undefined) updateData.memo = memo?.trim() || undefined;

    // 明細更新（draftのみ）/ 明细更新（仅draft状态）
    if (items !== undefined && existing.status === 'draft') {
      if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({ message: '明細（items）は1件以上必要です / 明细（items）至少需要1条' });
        return;
      }
      updateData.items = items.map((item: Record<string, unknown>) => ({
        productId: item.productId,
        sku: item.sku,
        rakutenSku: item.rakutenSku || undefined,
        quantity: item.quantity || 0,
        preparedQuantity: item.preparedQuantity || 0,
        shippedQuantity: item.shippedQuantity || 0,
      }));
      updateData.totalQuantity = items.reduce(
        (sum: number, item: { quantity?: number }) => sum + (item.quantity || 0),
        0,
      );
    }

    const updated = await RslShipmentPlan.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      { $set: updateData },
      { new: true, runValidators: true },
    ).lean();

    if (!updated) {
      res.status(404).json({ message: 'RSLプランが見つかりません / 未找到RSL计划' });
      return;
    }

    res.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: 'RSLプランの更新に失敗しました / 更新RSL计划失败', error: message });
  }
};

/**
 * RSLプラン確認 / 确认RSL计划
 * POST /api/rsl/plans/:id/confirm
 */
export const confirmRslPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const existing = await RslShipmentPlan.findOne({ _id: req.params.id, tenantId }).lean();
    if (!existing) {
      res.status(404).json({ message: 'RSLプランが見つかりません / 未找到RSL计划' });
      return;
    }

    if (existing.status !== 'draft') {
      res.status(400).json({
        message: `ステータスが「${existing.status}」のため確認できません。draftのみ確認可能です / 状态为「${existing.status}」无法确认，仅draft状态可确认`,
      });
      return;
    }

    const updated = await RslShipmentPlan.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      { $set: { status: 'confirmed', confirmedAt: new Date() } },
      { new: true },
    ).lean();

    res.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: 'RSLプランの確認に失敗しました / 确认RSL计划失败', error: message });
  }
};

/**
 * RSLプラン出荷 / RSL计划出货
 * POST /api/rsl/plans/:id/ship
 * body: { trackingNumber?, carrierId?, boxCount? }
 */
export const shipRslPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const existing = await RslShipmentPlan.findOne({ _id: req.params.id, tenantId }).lean();
    if (!existing) {
      res.status(404).json({ message: 'RSLプランが見つかりません / 未找到RSL计划' });
      return;
    }

    if (existing.status !== 'confirmed') {
      res.status(400).json({
        message: `ステータスが「${existing.status}」のため出荷できません。confirmedのみ出荷可能です / 状态为「${existing.status}」无法出货，仅confirmed状态可出货`,
      });
      return;
    }

    const { trackingNumber, carrierId, boxCount } = req.body;

    const updateData: Record<string, unknown> = {
      status: 'shipped' as RslPlanStatus,
      shippedAt: new Date(),
    };
    if (trackingNumber) updateData.trackingNumber = String(trackingNumber).trim();
    if (carrierId) updateData.carrierId = String(carrierId).trim();
    if (boxCount) updateData.boxCount = boxCount;

    const updated = await RslShipmentPlan.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      { $set: updateData },
      { new: true },
    ).lean();

    res.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: 'RSLプランの出荷に失敗しました / RSL计划出货失败', error: message });
  }
};

/**
 * RSLプラン削除（draftのみ）/ 删除RSL计划（仅draft状态）
 * DELETE /api/rsl/plans/:id
 */
export const deleteRslPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const existing = await RslShipmentPlan.findOne({ _id: req.params.id, tenantId }).lean();
    if (!existing) {
      res.status(404).json({ message: 'RSLプランが見つかりません / 未找到RSL计划' });
      return;
    }

    if (existing.status !== 'draft') {
      res.status(400).json({
        message: `ステータスが「${existing.status}」のため削除できません。draftのみ削除可能です / 状态为「${existing.status}」无法删除，仅draft状态可删除`,
      });
      return;
    }

    await RslShipmentPlan.deleteOne({ _id: req.params.id, tenantId });
    res.json({ message: 'RSLプランを削除しました / 已删除RSL计划', id: req.params.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: 'RSLプランの削除に失敗しました / 删除RSL计划失败', error: message });
  }
};
