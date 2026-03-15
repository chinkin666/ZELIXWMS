import type { Request, Response } from 'express';
import { WorkCharge, REFERENCE_TYPES } from '@/models/workCharge';
import { CHARGE_TYPES } from '@/models/serviceRate';
import { logger } from '@/lib/logger';
import { getTenantId } from '@/api/helpers/tenantHelper';

/**
 * 作業チャージ一覧を取得
 * 获取作业费用列表
 * GET /api/work-charges?clientId=xxx&period=2026-03&isBilled=false&chargeType=xxx&page=1&limit=20
 */
export const listWorkCharges = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const { clientId, period, isBilled, chargeType, search, page, limit } = req.query;

    const filter: Record<string, unknown> = { tenantId };

    // 荷主フィルター / 货主过滤
    if (typeof clientId === 'string' && clientId.trim()) {
      filter.clientId = clientId.trim();
    }

    // 請求期間フィルター / 计费期间过滤
    if (typeof period === 'string' && period.trim()) {
      filter.billingPeriod = period.trim();
    }

    // 請求済みフィルター / 是否已计费过滤
    if (typeof isBilled === 'string') {
      if (isBilled === 'true') filter.isBilled = true;
      if (isBilled === 'false') filter.isBilled = false;
    }

    // チャージ種別フィルター / 费用类型过滤
    if (typeof chargeType === 'string' && chargeType.trim()) {
      filter.chargeType = chargeType.trim();
    }

    // テキスト検索 / 文本搜索
    if (typeof search === 'string' && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { description: { $regex: escaped, $options: 'i' } },
        { clientName: { $regex: escaped, $options: 'i' } },
        { referenceNumber: { $regex: escaped, $options: 'i' } },
        { memo: { $regex: escaped, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await Promise.all([
      WorkCharge.find(filter).sort({ chargeDate: -1, createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      WorkCharge.countDocuments(filter),
    ]);

    res.json({ data, total });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error({ error: message }, '作業チャージの取得に失敗しました / 获取作业费用失败');
    res.status(500).json({ message: '作業チャージの取得に失敗しました', error: message });
  }
};

/**
 * 作業チャージを1件取得
 * 获取单个作业费用
 * GET /api/work-charges/:id
 */
export const getWorkCharge = async (req: Request, res: Response): Promise<void> => {
  try {
    const item = await WorkCharge.findById(req.params.id).lean();
    if (!item) {
      res.status(404).json({ message: '作業チャージが見つかりません / 未找到作业费用' });
      return;
    }
    res.json(item);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error({ error: message }, '作業チャージの取得に失敗しました / 获取作业费用失败');
    res.status(500).json({ message: '作業チャージの取得に失敗しました', error: message });
  }
};

/**
 * 作業チャージを作成（手動登録）
 * 创建作业费用（手动登记）
 * POST /api/work-charges
 */
export const createWorkCharge = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const {
      clientId,
      clientName,
      chargeType,
      chargeDate,
      referenceType,
      referenceId,
      referenceNumber,
      quantity,
      unitPrice,
      description,
      billingPeriod,
      memo,
    } = req.body;

    // 必須フィールドバリデーション / 必填字段验证
    if (!chargeType || !CHARGE_TYPES.includes(chargeType)) {
      res.status(400).json({ message: 'チャージ種別が無効です / 费用类型无效' });
      return;
    }
    if (!chargeDate) {
      res.status(400).json({ message: 'チャージ発生日は必須です / 费用发生日为必填项' });
      return;
    }
    if (!description || typeof description !== 'string' || !description.trim()) {
      res.status(400).json({ message: '説明は必須です / 说明为必填项' });
      return;
    }
    if (quantity === undefined || quantity === null || typeof quantity !== 'number' || quantity < 0) {
      res.status(400).json({ message: '数量は0以上の数値で入力してください / 数量须为0以上的数值' });
      return;
    }
    if (unitPrice === undefined || unitPrice === null || typeof unitPrice !== 'number' || unitPrice < 0) {
      res.status(400).json({ message: '単価は0以上の数値で入力してください / 单价须为0以上的数值' });
      return;
    }

    // 参照種別のバリデーション / 引用类型验证
    const resolvedReferenceType = referenceType || 'manual';
    if (!REFERENCE_TYPES.includes(resolvedReferenceType)) {
      res.status(400).json({ message: '参照種別が無効です / 引用类型无效' });
      return;
    }

    // 合計金額を計算 / 计算总金额
    const amount = Number(quantity) * Number(unitPrice);

    const created = await WorkCharge.create({
      tenantId,
      clientId: clientId?.trim() || undefined,
      clientName: clientName?.trim() || undefined,
      chargeType,
      chargeDate: new Date(chargeDate),
      referenceType: resolvedReferenceType,
      referenceId: referenceId?.trim() || undefined,
      referenceNumber: referenceNumber?.trim() || undefined,
      quantity: Number(quantity),
      unitPrice: Number(unitPrice),
      amount,
      description: description.trim(),
      billingPeriod: billingPeriod?.trim() || undefined,
      isBilled: false,
      memo: memo?.trim() || undefined,
    });

    res.status(201).json(created.toObject());
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error({ error: message }, '作業チャージの作成に失敗しました / 创建作业费用失败');
    res.status(500).json({ message: '作業チャージの作成に失敗しました', error: message });
  }
};

/**
 * 作業チャージのサマリーを取得（荷主・種別ごとの集計）
 * 获取作业费用汇总（按货主・类型汇总）
 * GET /api/work-charges/summary?period=2026-03&clientId=xxx
 */
export const getWorkChargeSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const { period, clientId } = req.query;

    const matchStage: Record<string, unknown> = { tenantId };

    // 請求期間フィルター / 计费期间过滤
    if (typeof period === 'string' && period.trim()) {
      matchStage.billingPeriod = period.trim();
    }

    // 荷主フィルター / 货主过滤
    if (typeof clientId === 'string' && clientId.trim()) {
      matchStage.clientId = clientId.trim();
    }

    const summary = await WorkCharge.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            clientId: '$clientId',
            clientName: '$clientName',
            chargeType: '$chargeType',
          },
          totalQuantity: { $sum: '$quantity' },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
          billedCount: {
            $sum: { $cond: ['$isBilled', 1, 0] },
          },
          unbilledCount: {
            $sum: { $cond: ['$isBilled', 0, 1] },
          },
          unbilledAmount: {
            $sum: { $cond: ['$isBilled', 0, '$amount'] },
          },
        },
      },
      {
        $sort: {
          '_id.clientId': 1,
          '_id.chargeType': 1,
        },
      },
      {
        $project: {
          _id: 0,
          clientId: '$_id.clientId',
          clientName: '$_id.clientName',
          chargeType: '$_id.chargeType',
          totalQuantity: 1,
          totalAmount: 1,
          count: 1,
          billedCount: 1,
          unbilledCount: 1,
          unbilledAmount: 1,
        },
      },
    ]);

    res.json({ data: summary });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error({ error: message }, '作業チャージサマリーの取得に失敗しました / 获取作业费用汇总失败');
    res.status(500).json({ message: '作業チャージサマリーの取得に失敗しました', error: message });
  }
};

/**
 * 未請求の作業チャージを削除
 * 删除未计费的作业费用
 * DELETE /api/work-charges/:id
 */
export const deleteWorkCharge = async (req: Request, res: Response): Promise<void> => {
  try {
    const item = await WorkCharge.findById(req.params.id).lean();

    if (!item) {
      res.status(404).json({ message: '作業チャージが見つかりません / 未找到作业费用' });
      return;
    }

    // 請求済みのチャージは削除不可 / 已计费的费用不可删除
    if (item.isBilled) {
      res.status(400).json({
        message: '請求済みのチャージは削除できません / 已计费的费用不可删除',
      });
      return;
    }

    await WorkCharge.findByIdAndDelete(req.params.id);

    res.json({ message: '作業チャージを削除しました / 已删除作业费用', id: item._id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error({ error: message }, '作業チャージの削除に失敗しました / 删除作业费用失败');
    res.status(500).json({ message: '作業チャージの削除に失敗しました', error: message });
  }
};
