// オーダーグループサービス / 订单分组服务
import { Inject, Injectable, Logger } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq, and, ilike, sql, SQL, isNull, inArray } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { orderGroups, shipmentOrders, shipmentOrderProducts } from '../database/schema/shipments.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';
import type { DrizzleDB } from '../database/database.types.js';

// 分組条件の型定義 / 分组条件类型定义
export interface SortCriteria {
  type: 'prefecture' | 'customer' | 'sku_count' | 'business_type' | 'sla';
  prefecture?: { regions: string[] };
  customer?: { clientIds: string[] };
  skuCount?: { single: boolean; multi: boolean };
  businessType?: { types: ('btoc' | 'btob' | 'btob_afc' | 'fba' | 'rsl')[] };
  sla?: { maxHours: number };
}

// 自動振り分け結果の型 / 自动分配结果类型
export interface AutoAssignResult {
  groupId: string;
  groupName: string;
  orderIds: string[];
}

interface FindAllQuery {
  page?: number;
  limit?: number;
  name?: string;
  enabled?: boolean;
}

@Injectable()
export class OrderGroupsService {
  private readonly logger = new Logger(OrderGroupsService.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // グループ別注文数取得 / 获取各分组订单数
  async getCounts(tenantId: string) {
    const groups = await this.db
      .select({
        id: orderGroups.id,
        name: orderGroups.name,
      })
      .from(orderGroups)
      .where(eq(orderGroups.tenantId, tenantId));

    const counts: Record<string, number> = {};
    let uncategorized = 0;

    // 各グループの注文数を取得 / 获取各分组的订单数
    for (const group of groups) {
      const result = await this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(shipmentOrders)
        .where(
          and(
            eq(shipmentOrders.tenantId, tenantId),
            eq(shipmentOrders.orderGroupId, group.id),
            isNull(shipmentOrders.deletedAt),
          ),
        );
      counts[group.id] = result[0]?.count ?? 0;
    }

    // 未分類の注文数 / 未分类的订单数
    const uncatResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(shipmentOrders)
      .where(
        and(
          eq(shipmentOrders.tenantId, tenantId),
          isNull(shipmentOrders.orderGroupId),
          isNull(shipmentOrders.deletedAt),
        ),
      );
    uncategorized = uncatResult[0]?.count ?? 0;

    const total = Object.values(counts).reduce((a, b) => a + b, 0) + uncategorized;

    return { total, groups: counts, uncategorized };
  }

  // 並び替え / 排序
  async reorder(tenantId: string, orderedIds: string[]) {
    for (let i = 0; i < orderedIds.length; i++) {
      await this.db
        .update(orderGroups)
        .set({ priority: i + 1 })
        .where(
          and(
            eq(orderGroups.tenantId, tenantId),
            eq(orderGroups.id, orderedIds[i]),
          ),
        );
    }
    return { message: '並び替えを保存しました / 排序已保存' };
  }

  // オーダーグループ一覧取得 / 获取订单分组列表
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // 検索条件構築 / 构建查询条件
    const conditions: SQL[] = [
      eq(orderGroups.tenantId, tenantId),
    ];

    if (query.name) {
      conditions.push(ilike(orderGroups.name, `%${query.name}%`));
    }
    if (query.enabled !== undefined) {
      conditions.push(eq(orderGroups.enabled, query.enabled));
    }

    const where = and(...conditions);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db.select().from(orderGroups).where(where).limit(limit).offset(offset).orderBy(orderGroups.createdAt),
      this.db.select({ count: sql<number>`count(*)::int` }).from(orderGroups).where(where),
    ]);

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
  }

  // オーダーグループID検索 / 按ID查找订单分组
  async findById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(orderGroups)
      .where(and(
        eq(orderGroups.id, id),
        eq(orderGroups.tenantId, tenantId),
      ))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('ORDER_GROUP_NOT_FOUND', `ID: ${id}`);
    }
    return rows[0];
  }

  // オーダーグループ作成 / 创建订单分组
  async create(tenantId: string, dto: Record<string, unknown>) {
    const sortCriteria = dto.sortCriteria as SortCriteria | undefined;
    if (sortCriteria) {
      this.validateSortCriteria(sortCriteria);
    }

    const rows = await this.db.insert(orderGroups).values({
      tenantId,
      name: dto.name as string,
      priority: (dto.priority as number) ?? 0,
      enabled: (dto.enabled as boolean) ?? true,
      description: dto.description as string,
      sortCriteria: sortCriteria ?? null,
    }).returning();

    return rows[0];
  }

  // オーダーグループ更新 / 更新订单分组
  async update(tenantId: string, id: string, dto: Record<string, unknown>) {
    // 存在確認 / 确认存在
    await this.findById(tenantId, id);

    const sortCriteria = dto.sortCriteria as SortCriteria | undefined;
    if (sortCriteria) {
      this.validateSortCriteria(sortCriteria);
    }

    const rows = await this.db
      .update(orderGroups)
      .set({
        ...(dto.name !== undefined && { name: dto.name as string }),
        ...(dto.priority !== undefined && { priority: dto.priority as number }),
        ...(dto.enabled !== undefined && { enabled: dto.enabled as boolean }),
        ...(dto.description !== undefined && { description: dto.description as string }),
        ...(dto.sortCriteria !== undefined && { sortCriteria: (dto.sortCriteria as SortCriteria | null) }),
        updatedAt: new Date(),
      })
      .where(and(eq(orderGroups.id, id), eq(orderGroups.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // オーダーグループ削除（物理削除）/ 删除订单分组（物理删除）
  async remove(tenantId: string, id: string) {
    // 存在確認 / 确认存在
    await this.findById(tenantId, id);

    const rows = await this.db
      .delete(orderGroups)
      .where(and(eq(orderGroups.id, id), eq(orderGroups.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // 自動振り分け実行 / 执行自动分配
  async assignOrdersToGroups(tenantId: string): Promise<AutoAssignResult[]> {
    // 1. 有効なグループ（優先度順）を取得 / 获取有效的分组（按优先级排序）
    const activeGroups = await this.db
      .select()
      .from(orderGroups)
      .where(and(
        eq(orderGroups.tenantId, tenantId),
        eq(orderGroups.enabled, true),
      ))
      .orderBy(orderGroups.priority);

    // 分組条件がないグループをスキップ / 跳过没有分组条件的组
    const groupsWithCriteria = activeGroups.filter(
      (g) => g.sortCriteria !== null && g.sortCriteria !== undefined,
    );

    if (groupsWithCriteria.length === 0) {
      this.logger.warn(`テナント ${tenantId} に分組条件付きグループがありません / 租户 ${tenantId} 没有带分组条件的组`);
      return [];
    }

    // 2. 未割当の出荷注文を取得 / 获取未分配的出货订单
    const unassignedOrders = await this.db
      .select({
        id: shipmentOrders.id,
        recipientPrefecture: shipmentOrders.recipientPrefecture,
        destinationType: shipmentOrders.destinationType,
        shipPlanDate: shipmentOrders.shipPlanDate,
        orderSourceCompanyId: shipmentOrders.orderSourceCompanyId,
        productsMeta: shipmentOrders._productsMeta,
        createdAt: shipmentOrders.createdAt,
      })
      .from(shipmentOrders)
      .where(and(
        eq(shipmentOrders.tenantId, tenantId),
        isNull(shipmentOrders.orderGroupId),
        isNull(shipmentOrders.deletedAt),
        eq(shipmentOrders.statusShipped, false),
      ));

    if (unassignedOrders.length === 0) {
      this.logger.log(`テナント ${tenantId} に未割当の注文がありません / 租户 ${tenantId} 没有未分配的订单`);
      return [];
    }

    // 3. SKU数を取得するため商品数をカウント / 为了获取SKU数，统计商品数量
    const orderProductCounts = await this.db
      .select({
        shipmentOrderId: shipmentOrderProducts.shipmentOrderId,
        count: sql<number>`count(*)::int`,
      })
      .from(shipmentOrderProducts)
      .where(eq(shipmentOrderProducts.tenantId, tenantId))
      .groupBy(shipmentOrderProducts.shipmentOrderId);

    const productCountMap = new Map<string, number>();
    for (const row of orderProductCounts) {
      productCountMap.set(row.shipmentOrderId, row.count);
    }

    // 4. 各注文をグループにマッチング / 将每个订单匹配到分组
    const assignments = new Map<string, string[]>();
    const assignedOrderIds = new Set<string>();

    for (const group of groupsWithCriteria) {
      const criteria = group.sortCriteria as SortCriteria;
      const matchedIds: string[] = [];

      for (const order of unassignedOrders) {
        if (assignedOrderIds.has(order.id)) continue;

        const matched = this.matchOrderToCriteria(order, criteria, productCountMap.get(order.id) ?? 0);
        if (matched) {
          matchedIds.push(order.id);
          assignedOrderIds.add(order.id);
        }
      }

      if (matchedIds.length > 0) {
        assignments.set(group.id, matchedIds);
      }
    }

    // 5. DBに一括更新 / 批量更新数据库
    const results: AutoAssignResult[] = [];

    for (const [groupId, orderIds] of assignments.entries()) {
      const group = groupsWithCriteria.find((g) => g.id === groupId)!;

      await this.db
        .update(shipmentOrders)
        .set({
          orderGroupId: groupId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(shipmentOrders.tenantId, tenantId),
            inArray(shipmentOrders.id, orderIds),
          ),
        );

      results.push({
        groupId,
        groupName: group.name,
        orderIds,
      });
    }

    this.logger.log(
      `テナント ${tenantId}: ${assignedOrderIds.size}件の注文を${results.length}グループに振り分けました / ` +
      `租户 ${tenantId}: 将${assignedOrderIds.size}个订单分配到${results.length}个分组`,
    );

    return results;
  }

  // 注文が分組条件にマッチするか判定 / 判断订单是否匹配分组条件
  private matchOrderToCriteria(
    order: {
      id: string;
      recipientPrefecture: string | null;
      destinationType: string | null;
      shipPlanDate: string | null;
      orderSourceCompanyId: string | null;
      productsMeta: unknown;
      createdAt: Date;
    },
    criteria: SortCriteria,
    skuCount: number,
  ): boolean {
    switch (criteria.type) {
      case 'prefecture': {
        if (!criteria.prefecture?.regions?.length) return false;
        const prefecture = order.recipientPrefecture ?? '';
        return criteria.prefecture.regions.some((region) =>
          prefecture.includes(region),
        );
      }

      case 'customer': {
        if (!criteria.customer?.clientIds?.length) return false;
        const companyId = order.orderSourceCompanyId ?? '';
        return criteria.customer.clientIds.includes(companyId);
      }

      case 'sku_count': {
        if (!criteria.skuCount) return false;
        // _productsMeta からSKU数を取得、fallback は商品テーブルのカウント /
        // 从 _productsMeta 获取SKU数，回退使用商品表计数
        const meta = order.productsMeta as { skuCount?: number } | null;
        const count = meta?.skuCount ?? skuCount;
        if (criteria.skuCount.single && count === 1) return true;
        if (criteria.skuCount.multi && count > 1) return true;
        return false;
      }

      case 'business_type': {
        if (!criteria.businessType?.types?.length) return false;
        const destType = (order.destinationType ?? '').toLowerCase();
        // マッピング: B2C→btoc, B2B→btob, FBA→fba, RSL→rsl /
        // 映射: B2C→btoc, B2B→btob, FBA→fba, RSL→rsl
        const typeMap: Record<string, string> = {
          b2c: 'btoc',
          b2b: 'btob',
          'b2b-afc': 'btob_afc',
          b2b_afc: 'btob_afc',
          fba: 'fba',
          rsl: 'rsl',
        };
        const normalized = typeMap[destType] ?? destType;
        return criteria.businessType.types.includes(normalized as typeof criteria.businessType.types[number]);
      }

      case 'sla': {
        if (!criteria.sla?.maxHours) return false;
        // shipPlanDate が設定されている場合、残り時間を計算 /
        // 如果设置了shipPlanDate，计算剩余时间
        if (!order.shipPlanDate) return false;
        const planDate = new Date(order.shipPlanDate);
        const now = new Date();
        const hoursRemaining = (planDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        return hoursRemaining <= criteria.sla.maxHours && hoursRemaining > 0;
      }

      default:
        return false;
    }
  }

  // 分組条件のバリデーション / 分组条件验证
  private validateSortCriteria(criteria: SortCriteria): void {
    const validTypes = ['prefecture', 'customer', 'sku_count', 'business_type', 'sla'] as const;
    if (!validTypes.includes(criteria.type)) {
      throw new WmsException(
        'VALIDATION_ERROR',
        `無効な分組条件タイプ: ${criteria.type} / 无效的分组条件类型: ${criteria.type}`,
      );
    }

    switch (criteria.type) {
      case 'prefecture':
        if (!criteria.prefecture?.regions?.length) {
          throw new WmsException('VALIDATION_ERROR', '都道府県リージョンを指定してください / 请指定都道府县区域');
        }
        break;
      case 'customer':
        if (!criteria.customer?.clientIds?.length) {
          throw new WmsException('VALIDATION_ERROR', '荷主IDを指定してください / 请指定货主ID');
        }
        break;
      case 'sku_count':
        if (!criteria.skuCount || (!criteria.skuCount.single && !criteria.skuCount.multi)) {
          throw new WmsException('VALIDATION_ERROR', '単品または複数品のいずれかを選択してください / 请选择单品或多品中的至少一个');
        }
        break;
      case 'business_type':
        if (!criteria.businessType?.types?.length) {
          throw new WmsException('VALIDATION_ERROR', 'ビジネスタイプを指定してください / 请指定业务类型');
        }
        break;
      case 'sla':
        if (!criteria.sla?.maxHours || criteria.sla.maxHours <= 0) {
          throw new WmsException('VALIDATION_ERROR', '有効なSLA時間を指定してください / 请指定有效的SLA时间');
        }
        break;
    }
  }
}
