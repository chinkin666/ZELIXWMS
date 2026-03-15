import type { Request, Response } from 'express';
import { FbaShipmentPlan } from '@/models/fbaShipmentPlan';
import type { FbaPlanStatus } from '@/models/fbaShipmentPlan';
import { getTenantId } from '@/api/helpers/tenantHelper';

/**
 * FBAプラン一覧取得 / 获取FBA计划列表
 * GET /api/fba/plans?status=draft&page=1&limit=20&search=xxx
 */
export const listFbaPlans = async (req: Request, res: Response): Promise<void> => {
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
        { amazonShipmentId: { $regex: escaped, $options: 'i' } },
        { destinationFc: { $regex: escaped, $options: 'i' } },
        { trackingNumber: { $regex: escaped, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await Promise.all([
      FbaShipmentPlan.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      FbaShipmentPlan.countDocuments(filter),
    ]);

    res.json({ data, total });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: 'FBAプランの取得に失敗しました / 获取FBA计划失败', error: message });
  }
};

/**
 * FBAプラン作成 / 创建FBA计划
 * POST /api/fba/plans
 */
export const createFbaPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const {
      destinationFc, amazonShipmentId, shipFromName, shipFromAddress,
      items, carrierId, boxCount, shipDate, estimatedArrival, memo,
    } = req.body;

    // バリデーション / 验证
    if (!destinationFc || typeof destinationFc !== 'string' || !destinationFc.trim()) {
      res.status(400).json({ message: '配送先FC（destinationFc）は必須です / 配送目的FC（destinationFc）为必填项' });
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: '明細（items）は1件以上必要です / 明细（items）至少需要1条' });
      return;
    }

    // プラン番号自動生成 / 自动生成计划编号
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await FbaShipmentPlan.countDocuments({
      tenantId,
      planNumber: { $regex: `^FBA-${today}-` },
    });
    const planNumber = `FBA-${today}-${String(count + 1).padStart(3, '0')}`;

    // 合計数量計算 / 计算总数量
    const totalQuantity = items.reduce(
      (sum: number, item: { quantity?: number }) => sum + (item.quantity || 0),
      0,
    );

    const created = await FbaShipmentPlan.create({
      tenantId,
      planNumber,
      status: 'draft',
      destinationFc: destinationFc.trim(),
      amazonShipmentId: amazonShipmentId?.trim() || undefined,
      shipFromName: shipFromName?.trim() || undefined,
      shipFromAddress: shipFromAddress?.trim() || undefined,
      items: items.map((item: Record<string, unknown>) => ({
        productId: item.productId,
        sku: item.sku,
        fnsku: item.fnsku || undefined,
        asin: item.asin || undefined,
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
    res.status(500).json({ message: 'FBAプランの作成に失敗しました / 创建FBA计划失败', error: message });
  }
};

/**
 * FBAプラン詳細取得 / 获取FBA计划详情
 * GET /api/fba/plans/:id
 */
export const getFbaPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const item = await FbaShipmentPlan.findOne({ _id: req.params.id, tenantId }).lean();
    if (!item) {
      res.status(404).json({ message: 'FBAプランが見つかりません / 未找到FBA计划' });
      return;
    }
    res.json(item);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: 'FBAプランの取得に失敗しました / 获取FBA计划失败', error: message });
  }
};

/**
 * FBAプラン更新 / 更新FBA计划
 * PUT /api/fba/plans/:id
 */
export const updateFbaPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const existing = await FbaShipmentPlan.findOne({ _id: req.params.id, tenantId }).lean();
    if (!existing) {
      res.status(404).json({ message: 'FBAプランが見つかりません / 未找到FBA计划' });
      return;
    }

    // confirmed以降は一部フィールドのみ更新可 / confirmed之后只能更新部分字段
    if (existing.status !== 'draft') {
      const allowedFields = ['amazonShipmentId', 'carrierId', 'trackingNumber', 'boxCount', 'memo', 'shipDate', 'estimatedArrival'];
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
      destinationFc, amazonShipmentId, shipFromName, shipFromAddress,
      items, carrierId, trackingNumber, boxCount, shipDate, estimatedArrival, memo,
    } = req.body;

    const updateData: Record<string, unknown> = {};

    if (destinationFc !== undefined) updateData.destinationFc = destinationFc?.trim();
    if (amazonShipmentId !== undefined) updateData.amazonShipmentId = amazonShipmentId?.trim() || undefined;
    if (shipFromName !== undefined) updateData.shipFromName = shipFromName?.trim() || undefined;
    if (shipFromAddress !== undefined) updateData.shipFromAddress = shipFromAddress?.trim() || undefined;
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
        fnsku: item.fnsku || undefined,
        asin: item.asin || undefined,
        quantity: item.quantity || 0,
        preparedQuantity: item.preparedQuantity || 0,
        shippedQuantity: item.shippedQuantity || 0,
      }));
      updateData.totalQuantity = items.reduce(
        (sum: number, item: { quantity?: number }) => sum + (item.quantity || 0),
        0,
      );
    }

    const updated = await FbaShipmentPlan.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      { $set: updateData },
      { new: true, runValidators: true },
    ).lean();

    if (!updated) {
      res.status(404).json({ message: 'FBAプランが見つかりません / 未找到FBA计划' });
      return;
    }

    res.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: 'FBAプランの更新に失敗しました / 更新FBA计划失败', error: message });
  }
};

/**
 * FBAプラン確認 / 确认FBA计划
 * POST /api/fba/plans/:id/confirm
 */
export const confirmFbaPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const existing = await FbaShipmentPlan.findOne({ _id: req.params.id, tenantId }).lean();
    if (!existing) {
      res.status(404).json({ message: 'FBAプランが見つかりません / 未找到FBA计划' });
      return;
    }

    if (existing.status !== 'draft') {
      res.status(400).json({
        message: `ステータスが「${existing.status}」のため確認できません。draftのみ確認可能です / 状态为「${existing.status}」无法确认，仅draft状态可确认`,
      });
      return;
    }

    const updated = await FbaShipmentPlan.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      { $set: { status: 'confirmed', confirmedAt: new Date() } },
      { new: true },
    ).lean();

    res.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: 'FBAプランの確認に失敗しました / 确认FBA计划失败', error: message });
  }
};

/**
 * FBAプラン出荷 / FBA计划出货
 * POST /api/fba/plans/:id/ship
 * body: { trackingNumber?, carrierId?, boxCount? }
 */
export const shipFbaPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const existing = await FbaShipmentPlan.findOne({ _id: req.params.id, tenantId }).lean();
    if (!existing) {
      res.status(404).json({ message: 'FBAプランが見つかりません / 未找到FBA计划' });
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
      status: 'shipped' as FbaPlanStatus,
      shippedAt: new Date(),
    };
    if (trackingNumber) updateData.trackingNumber = String(trackingNumber).trim();
    if (carrierId) updateData.carrierId = String(carrierId).trim();
    if (boxCount) updateData.boxCount = boxCount;

    const updated = await FbaShipmentPlan.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      { $set: updateData },
      { new: true },
    ).lean();

    res.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: 'FBAプランの出荷に失敗しました / FBA计划出货失败', error: message });
  }
};

/**
 * FBAプラン削除（draftのみ）/ 删除FBA计划（仅draft状态）
 * DELETE /api/fba/plans/:id
 */
export const deleteFbaPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const existing = await FbaShipmentPlan.findOne({ _id: req.params.id, tenantId }).lean();
    if (!existing) {
      res.status(404).json({ message: 'FBAプランが見つかりません / 未找到FBA计划' });
      return;
    }

    if (existing.status !== 'draft') {
      res.status(400).json({
        message: `ステータスが「${existing.status}」のため削除できません。draftのみ削除可能です / 状态为「${existing.status}」无法删除，仅draft状态可删除`,
      });
      return;
    }

    await FbaShipmentPlan.deleteOne({ _id: req.params.id, tenantId });
    res.json({ message: 'FBAプランを削除しました / 已删除FBA计划', id: req.params.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ message: 'FBAプランの削除に失敗しました / 删除FBA计划失败', error: message });
  }
};
