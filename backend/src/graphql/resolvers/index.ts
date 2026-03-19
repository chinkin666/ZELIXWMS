/**
 * GraphQL Resolvers / GraphQL リゾルバ
 *
 * Query（読み取り）+ Mutation（書き込み）。
 * Query（读取）+ Mutation（写入）。
 */

import { ShipmentOrder } from '@/models/shipmentOrder';
import { Product } from '@/models/product';
import { InboundOrder } from '@/models/inboundOrder';
import { Client } from '@/models/client';
import { Warehouse } from '@/models/warehouse';
import { Wave } from '@/models/wave';

// 延迟导入避免循环依赖 / 循環依存回避のため遅延インポート
let StockQuant: any = null;
let StockMove: any = null;

async function getStockQuant() {
  if (!StockQuant) {
    const mod = await import('@/models/stockQuant');
    StockQuant = mod.StockQuant;
  }
  return StockQuant;
}

async function getStockMove() {
  if (!StockMove) {
    const mod = await import('@/models/stockMove');
    StockMove = mod.StockMove;
  }
  return StockMove;
}

// ─── 分页辅助 / ページネーションヘルパー ───

interface PaginationInput {
  page?: number;
  limit?: number;
}

function paginate(input?: PaginationInput) {
  const page = Math.max(1, input?.page ?? 1);
  const limit = Math.min(100, Math.max(1, input?.limit ?? 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function pageInfo(total: number, page: number, limit: number) {
  return {
    total,
    page,
    limit,
    hasNext: page * limit < total,
  };
}

// ─── Resolvers ───

export const resolvers = {
  Query: {
    // 出荷指示 / 出荷指示
    shipmentOrder: async (_: unknown, { id }: { id: string }) => {
      return ShipmentOrder.findById(id).lean();
    },

    shipmentOrders: async (_: unknown, { filter, pagination }: {
      filter?: { status?: string; carrierId?: string; destinationType?: string; dateFrom?: string; dateTo?: string; search?: string };
      pagination?: PaginationInput;
    }) => {
      const { page, limit, skip } = paginate(pagination);
      const query: Record<string, unknown> = {};

      if (filter?.status) {
        // 状态映射: confirmed → status.confirm.isConfirmed = true 等
        // ステータスマッピング
        const statusMap: Record<string, Record<string, boolean>> = {
          confirmed: { 'status.confirm.isConfirmed': true },
          shipped: { 'status.shipped.isShipped': true },
          held: { 'status.held.isHeld': true },
        };
        Object.assign(query, statusMap[filter.status] || {});
      }
      if (filter?.carrierId) query.carrierId = filter.carrierId;
      if (filter?.destinationType) query.destinationType = filter.destinationType;
      if (filter?.dateFrom || filter?.dateTo) {
        const dateQuery: Record<string, string> = {};
        if (filter.dateFrom) dateQuery.$gte = filter.dateFrom;
        if (filter.dateTo) dateQuery.$lte = filter.dateTo;
        query.shipPlanDate = dateQuery;
      }
      if (filter?.search) {
        query.$or = [
          { orderNumber: { $regex: filter.search, $options: 'i' } },
          { customerManagementNumber: { $regex: filter.search, $options: 'i' } },
          { 'recipient.name': { $regex: filter.search, $options: 'i' } },
          { '_productsMeta.skus': { $regex: filter.search, $options: 'i' } },
        ];
      }

      const [data, total] = await Promise.all([
        ShipmentOrder.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        ShipmentOrder.countDocuments(query),
      ]);

      return {
        data: data.map(flattenShipmentStatus),
        pageInfo: pageInfo(total, page, limit),
      };
    },

    // 商品 / 商品
    product: async (_: unknown, { id }: { id: string }) => {
      return Product.findById(id).lean();
    },

    productBySku: async (_: unknown, { sku }: { sku: string }) => {
      return Product.findOne({ sku }).lean();
    },

    products: async (_: unknown, { filter, pagination }: {
      filter?: { category?: string; clientId?: string; search?: string };
      pagination?: PaginationInput;
    }) => {
      const { page, limit, skip } = paginate(pagination);
      const query: Record<string, unknown> = {};

      if (filter?.category) query.category = filter.category;
      if (filter?.clientId) query.clientId = filter.clientId;
      if (filter?.search) {
        query.$or = [
          { sku: { $regex: filter.search, $options: 'i' } },
          { name: { $regex: filter.search, $options: 'i' } },
          { barcode: { $regex: filter.search, $options: 'i' } },
        ];
      }

      const [data, total] = await Promise.all([
        Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        Product.countDocuments(query),
      ]);

      return { data, pageInfo: pageInfo(total, page, limit) };
    },

    // 在庫 / 在庫
    stockQuants: async (_: unknown, { filter, pagination }: {
      filter?: { productSku?: string; locationId?: string; belowSafety?: boolean };
      pagination?: PaginationInput;
    }) => {
      const { page, limit, skip } = paginate(pagination);
      const SQ = await getStockQuant();
      const query: Record<string, unknown> = {};

      if (filter?.productSku) query.productSku = filter.productSku;
      if (filter?.locationId) query.locationId = filter.locationId;

      const [data, total] = await Promise.all([
        SQ.find(query).sort({ productSku: 1 }).skip(skip).limit(limit).lean(),
        SQ.countDocuments(query),
      ]);

      // availableQuantity 计算 / availableQuantity 計算
      const enriched = data.map((q: any) => ({
        ...q,
        availableQuantity: (q.quantity || 0) - (q.reservedQuantity || 0),
      }));

      return { data: enriched, pageInfo: pageInfo(total, page, limit) };
    },

    stockSummary: async (_: unknown, { productSku }: { productSku?: string }) => {
      const SQ = await getStockQuant();
      const match: Record<string, unknown> = {};
      if (productSku) match.productSku = productSku;

      const results = await SQ.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$productSku',
            totalQuantity: { $sum: '$quantity' },
            totalReserved: { $sum: '$reservedQuantity' },
            locationCount: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 100 },
      ]);

      // 补充商品名 / 商品名を補足
      const skus = results.map((r: any) => r._id);
      const products = await Product.find({ sku: { $in: skus } }, { sku: 1, name: 1 }).lean();
      const nameMap = new Map(products.map((p: any) => [p.sku, p.name]));

      return results.map((r: any) => ({
        productSku: r._id,
        productName: nameMap.get(r._id) || null,
        totalQuantity: r.totalQuantity,
        totalReserved: r.totalReserved,
        totalAvailable: r.totalQuantity - r.totalReserved,
        locationCount: r.locationCount,
      }));
    },

    // 入庫 / 入庫
    inboundOrder: async (_: unknown, { id }: { id: string }) => {
      return InboundOrder.findById(id).lean();
    },

    inboundOrders: async (_: unknown, { filter, pagination }: {
      filter?: { status?: string; clientId?: string; flowType?: string; search?: string };
      pagination?: PaginationInput;
    }) => {
      const { page, limit, skip } = paginate(pagination);
      const query: Record<string, unknown> = {};

      if (filter?.status) query.status = filter.status;
      if (filter?.clientId) query.clientId = filter.clientId;
      if (filter?.flowType) query.flowType = filter.flowType;
      if (filter?.search) {
        query.$or = [
          { orderNumber: { $regex: filter.search, $options: 'i' } },
        ];
      }

      const [data, total] = await Promise.all([
        InboundOrder.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        InboundOrder.countDocuments(query),
      ]);

      return { data, pageInfo: pageInfo(total, page, limit) };
    },

    // 顧客 / 客户
    client: async (_: unknown, { id }: { id: string }) => {
      return Client.findById(id).lean();
    },

    clients: async (_: unknown, { pagination }: { pagination?: PaginationInput }) => {
      const { page, limit, skip } = paginate(pagination);
      const [data, total] = await Promise.all([
        Client.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        Client.countDocuments(),
      ]);
      return { data, pageInfo: pageInfo(total, page, limit) };
    },

    // 倉庫 / 仓库
    warehouses: async () => {
      return Warehouse.find({ isActive: true }).sort({ sortOrder: 1 }).lean();
    },

    // Wave / ウェーブ
    waves: async (_: unknown, { status, pagination }: { status?: string; pagination?: PaginationInput }) => {
      const { page, limit, skip } = paginate(pagination);
      const query: Record<string, unknown> = {};
      if (status) query.status = status;

      const [data, total] = await Promise.all([
        Wave.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        Wave.countDocuments(query),
      ]);
      return { data, pageInfo: pageInfo(total, page, limit) };
    },

    // 在庫移動 / 库存移动
    stockMoves: async (_: unknown, { moveType, pagination }: { moveType?: string; pagination?: PaginationInput }) => {
      const { page, limit, skip } = paginate(pagination);
      const SM = await getStockMove();
      const query: Record<string, unknown> = {};
      if (moveType) query.moveType = moveType;

      const [data, total] = await Promise.all([
        SM.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        SM.countDocuments(query),
      ]);
      return { data, pageInfo: pageInfo(total, page, limit) };
    },

    // ダッシュボード / 仪表板
    dashboardStats: async () => {
      const SQ = await getStockQuant();

      const [
        totalOrders, pendingOrders, shippedToday,
        totalProducts, totalStock, activeClients, activeWaves,
      ] = await Promise.all([
        ShipmentOrder.countDocuments(),
        ShipmentOrder.countDocuments({ 'status.confirm.isConfirmed': { $ne: true } }),
        ShipmentOrder.countDocuments({
          'status.shipped.isShipped': true,
          'status.shipped.shippedAt': { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        }),
        Product.countDocuments(),
        SQ.aggregate([{ $group: { _id: null, total: { $sum: '$quantity' } } }]).then(
          (r: any[]) => r[0]?.total ?? 0,
        ),
        Client.countDocuments({ isActive: true }),
        Wave.countDocuments({ status: { $in: ['draft', 'picking', 'sorting', 'packing'] } }),
      ]);

      // 安全在庫割れ / 安全在庫割れ
      const lowStockAgg = await SQ.aggregate([
        { $group: { _id: '$productSku', total: { $sum: '$quantity' } } },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: 'sku',
            as: 'product',
          },
        },
        { $unwind: '$product' },
        { $match: { $expr: { $lt: ['$total', '$product.safetyStock'] } } },
        { $count: 'count' },
      ]);

      return {
        totalOrders,
        pendingOrders,
        shippedToday,
        totalProducts,
        totalStock,
        lowStockCount: lowStockAgg[0]?.count ?? 0,
        activeClients,
        activeWaves,
      };
    },
  },

  // ─── Field resolvers ───

  StockQuant: {
    product: async (parent: any) => {
      if (!parent.productId) return null;
      return Product.findById(parent.productId).lean();
    },
  },
};

// 合并 Mutation resolvers / Mutation リゾルバをマージ
import { mutationResolvers } from './mutations';
Object.assign(resolvers, mutationResolvers);

// ─── 辅助函数 / ヘルパー関数 ───

/**
 * ShipmentOrder のネストされた status を展開 / ShipmentOrder 的嵌套 status 展开
 */
function flattenShipmentStatus(order: any) {
  const s = order.status || {};
  return {
    ...order,
    status: {
      confirmed: s.confirm?.isConfirmed ?? false,
      confirmedAt: s.confirm?.confirmedAt ?? null,
      printed: s.printed?.isPrinted ?? false,
      printedAt: s.printed?.printedAt ?? null,
      inspected: s.inspected?.isInspected ?? false,
      inspectedAt: s.inspected?.inspectedAt ?? null,
      shipped: s.shipped?.isShipped ?? false,
      shippedAt: s.shipped?.shippedAt ?? null,
      held: s.held?.isHeld ?? false,
      heldAt: s.held?.heldAt ?? null,
    },
  };
}
