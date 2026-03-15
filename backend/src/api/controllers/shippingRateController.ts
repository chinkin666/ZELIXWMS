import type { Request, Response } from 'express';
import { ShippingRate } from '@/models/shippingRate';
import type { IShippingRate } from '@/models/shippingRate';
import { logger } from '@/lib/logger';
import { getTenantId } from '@/api/helpers/tenantHelper';

/**
 * 运费率表一覧を取得
 * 获取运费率表列表
 * GET /api/shipping-rates?carrierId=xxx&isActive=true&search=xxx&page=1&limit=20
 */
export const listShippingRates = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const { carrierId, isActive, search, page, limit } = req.query;

    const filter: Record<string, unknown> = { tenantId };

    // 配送業者フィルター / 配送业者过滤
    if (typeof carrierId === 'string' && carrierId.trim()) {
      filter.carrierId = carrierId.trim();
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
        { carrierName: { $regex: escaped, $options: 'i' } },
        { memo: { $regex: escaped, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await Promise.all([
      ShippingRate.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      ShippingRate.countDocuments(filter),
    ]);

    res.json({ data, total });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error({ error: message }, '运费率表の取得に失敗しました / 获取运费率表失败');
    res.status(500).json({ message: '运费率表の取得に失敗しました', error: message });
  }
};

/**
 * 运费率表を1件取得
 * 获取单个运费率表
 * GET /api/shipping-rates/:id
 */
export const getShippingRate = async (req: Request, res: Response): Promise<void> => {
  try {
    const item = await ShippingRate.findById(req.params.id).lean();
    if (!item) {
      res.status(404).json({ message: '运费率表が見つかりません / 未找到运费率表' });
      return;
    }
    res.json(item);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error({ error: message }, '运费率表の取得に失敗しました / 获取运费率表失败');
    res.status(500).json({ message: '运费率表の取得に失敗しました', error: message });
  }
};

/**
 * 运费率表を作成
 * 创建运费率表
 * POST /api/shipping-rates
 */
export const createShippingRate = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const {
      carrierId,
      carrierName,
      name,
      sizeType,
      sizeMin,
      sizeMax,
      fromPrefectures,
      toPrefectures,
      basePrice,
      coolSurcharge,
      codSurcharge,
      fuelSurcharge,
      validFrom,
      validTo,
      isActive,
      memo,
    } = req.body;

    // 必須フィールドバリデーション / 必填字段验证
    if (!carrierId || typeof carrierId !== 'string' || !carrierId.trim()) {
      res.status(400).json({ message: '配送業者IDは必須です / 配送业者ID为必填项' });
      return;
    }
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ message: 'プラン名は必須です / 方案名为必填项' });
      return;
    }
    if (basePrice === undefined || basePrice === null || typeof basePrice !== 'number' || basePrice < 0) {
      res.status(400).json({ message: '基本料金は0以上の数値で入力してください / 基本费用须为0以上的数值' });
      return;
    }

    const created = await ShippingRate.create({
      tenantId,
      carrierId: carrierId.trim(),
      carrierName: carrierName?.trim() || undefined,
      name: name.trim(),
      sizeType: sizeType || 'flat',
      sizeMin: sizeMin !== undefined ? Number(sizeMin) : undefined,
      sizeMax: sizeMax !== undefined ? Number(sizeMax) : undefined,
      fromPrefectures: Array.isArray(fromPrefectures) ? fromPrefectures : undefined,
      toPrefectures: Array.isArray(toPrefectures) ? toPrefectures : undefined,
      basePrice: Number(basePrice),
      coolSurcharge: Number(coolSurcharge) || 0,
      codSurcharge: Number(codSurcharge) || 0,
      fuelSurcharge: Number(fuelSurcharge) || 0,
      validFrom: validFrom ? new Date(validFrom) : undefined,
      validTo: validTo ? new Date(validTo) : undefined,
      isActive: isActive !== false,
      memo: memo?.trim() || undefined,
    });

    res.status(201).json(created.toObject());
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error({ error: message }, '运费率表の作成に失敗しました / 创建运费率表失败');
    res.status(500).json({ message: '运费率表の作成に失敗しました', error: message });
  }
};

/**
 * 运费率表を更新
 * 更新运费率表
 * PUT /api/shipping-rates/:id
 */
export const updateShippingRate = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      carrierId,
      carrierName,
      name,
      sizeType,
      sizeMin,
      sizeMax,
      fromPrefectures,
      toPrefectures,
      basePrice,
      coolSurcharge,
      codSurcharge,
      fuelSurcharge,
      validFrom,
      validTo,
      isActive,
      memo,
    } = req.body;

    const updateData: Record<string, unknown> = {};

    if (carrierId !== undefined) {
      if (typeof carrierId !== 'string' || !carrierId.trim()) {
        res.status(400).json({ message: '配送業者IDは必須です / 配送业者ID为必填项' });
        return;
      }
      updateData.carrierId = carrierId.trim();
    }
    if (carrierName !== undefined) updateData.carrierName = carrierName?.trim() || undefined;
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ message: 'プラン名は必須です / 方案名为必填项' });
        return;
      }
      updateData.name = name.trim();
    }
    if (sizeType !== undefined) updateData.sizeType = sizeType;
    if (sizeMin !== undefined) updateData.sizeMin = sizeMin === null ? undefined : Number(sizeMin);
    if (sizeMax !== undefined) updateData.sizeMax = sizeMax === null ? undefined : Number(sizeMax);
    if (fromPrefectures !== undefined) updateData.fromPrefectures = Array.isArray(fromPrefectures) ? fromPrefectures : undefined;
    if (toPrefectures !== undefined) updateData.toPrefectures = Array.isArray(toPrefectures) ? toPrefectures : undefined;
    if (basePrice !== undefined) updateData.basePrice = Number(basePrice);
    if (coolSurcharge !== undefined) updateData.coolSurcharge = Number(coolSurcharge);
    if (codSurcharge !== undefined) updateData.codSurcharge = Number(codSurcharge);
    if (fuelSurcharge !== undefined) updateData.fuelSurcharge = Number(fuelSurcharge);
    if (validFrom !== undefined) updateData.validFrom = validFrom ? new Date(validFrom) : undefined;
    if (validTo !== undefined) updateData.validTo = validTo ? new Date(validTo) : undefined;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (memo !== undefined) updateData.memo = memo?.trim() || undefined;

    const updated = await ShippingRate.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updated) {
      res.status(404).json({ message: '运费率表が見つかりません / 未找到运费率表' });
      return;
    }

    res.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error({ error: message }, '运费率表の更新に失敗しました / 更新运费率表失败');
    res.status(500).json({ message: '运费率表の更新に失敗しました', error: message });
  }
};

/**
 * 运费率表を削除（論理削除：isActive=false）
 * 删除运费率表（逻辑删除：isActive=false）
 * DELETE /api/shipping-rates/:id
 */
export const deleteShippingRate = async (req: Request, res: Response): Promise<void> => {
  try {
    const updated = await ShippingRate.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true },
    ).lean();

    if (!updated) {
      res.status(404).json({ message: '运费率表が見つかりません / 未找到运费率表' });
      return;
    }

    res.json({ message: '运费率表を無効にしました / 已停用运费率表', id: updated._id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error({ error: message }, '运费率表の削除に失敗しました / 删除运费率表失败');
    res.status(500).json({ message: '运费率表の削除に失敗しました', error: message });
  }
};

/**
 * 配送料金を自動計算
 * 自动计算配送费用
 * POST /api/shipping-rates/calculate
 *
 * リクエストボディ / 请求体:
 * {
 *   carrierId: string,           // 配送業者ID / 配送业者ID
 *   fromPrefecture?: string,     // 発送元都道府県 / 发货地都道府县
 *   toPrefecture?: string,       // 配送先都道府県 / 收货地都道府县
 *   weight?: number,             // 重量（kg）
 *   dimension?: number,          // 才数（cm3）
 *   isCool?: boolean,            // クール便かどうか / 是否冷藏
 *   isCod?: boolean,             // 代金引換かどうか / 是否货到付款
 * }
 */
export const calculateShippingCost = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req);
    const {
      carrierId,
      fromPrefecture,
      toPrefecture,
      weight,
      dimension,
      isCool,
      isCod,
    } = req.body;

    if (!carrierId) {
      res.status(400).json({ message: '配送業者IDは必須です / 配送业者ID为必填项' });
      return;
    }

    const now = new Date();

    // マッチする料金プランを検索 / 搜索匹配的费率方案
    const filter: Record<string, unknown> = {
      tenantId,
      carrierId,
      isActive: true,
    };

    const rates = await ShippingRate.find(filter)
      .sort({ basePrice: 1 })
      .lean();

    // 条件に合致するレートを絞り込む / 筛选符合条件的费率
    const matchedRate = rates.find((rate) => {
      // 有効期間チェック / 有效期间检查
      if (rate.validFrom && new Date(rate.validFrom) > now) return false;
      if (rate.validTo && new Date(rate.validTo) < now) return false;

      // サイズ条件チェック / 尺寸条件检查
      if (rate.sizeType === 'weight' && weight !== undefined) {
        if (rate.sizeMin !== undefined && weight < rate.sizeMin) return false;
        if (rate.sizeMax !== undefined && weight > rate.sizeMax) return false;
      } else if (rate.sizeType === 'dimension' && dimension !== undefined) {
        if (rate.sizeMin !== undefined && dimension < rate.sizeMin) return false;
        if (rate.sizeMax !== undefined && dimension > rate.sizeMax) return false;
      }
      // flat タイプはサイズ条件なし / flat类型无尺寸条件

      // 地区条件チェック / 地区条件检查
      if (rate.fromPrefectures && rate.fromPrefectures.length > 0 && fromPrefecture) {
        if (!rate.fromPrefectures.includes(fromPrefecture)) return false;
      }
      if (rate.toPrefectures && rate.toPrefectures.length > 0 && toPrefecture) {
        if (!rate.toPrefectures.includes(toPrefecture)) return false;
      }

      return true;
    });

    if (!matchedRate) {
      res.json({
        matched: false,
        message: '条件に合致する料金プランが見つかりません / 未找到符合条件的费率方案',
      });
      return;
    }

    // 料金計算 / 费用计算
    const breakdown = {
      base: matchedRate.basePrice,
      cool: isCool ? matchedRate.coolSurcharge : 0,
      cod: isCod ? matchedRate.codSurcharge : 0,
      fuel: matchedRate.fuelSurcharge,
      other: 0,
    };

    const totalCost = breakdown.base + breakdown.cool + breakdown.cod + breakdown.fuel + breakdown.other;

    res.json({
      matched: true,
      rateId: matchedRate._id,
      rateName: matchedRate.name,
      totalCost,
      breakdown,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error({ error: message }, '配送料金の計算に失敗しました / 计算配送费用失败');
    res.status(500).json({ message: '配送料金の計算に失敗しました', error: message });
  }
};
