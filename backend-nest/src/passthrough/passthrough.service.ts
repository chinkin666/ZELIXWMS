// パススルーサービス / 直通服务
import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq, and, sql, lt, ne, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import type { DrizzleDB } from '../database/database.types.js';
import { passthroughOrders } from '../database/schema/passthrough.js';
import { shipmentOrders } from '../database/schema/shipments.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';
import { WmsException } from '../common/exceptions/wms.exception.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
  status?: string;
}

// パススルーのステータス遷移定義 / 直通状态迁移定义
// draft → confirmed → receiving → completed
// draft → cancelled
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['confirmed', 'cancelled'],
  confirmed: ['receiving', 'cancelled'],
  receiving: ['completed'],
  completed: [],
  cancelled: [],
};

// 保管料無料期間（日数）/ 免费保管期（天数）
const FREE_STORAGE_DAYS = 7;

// 超過保管料（1日あたり）/ 超期保管费（每天）
const DAILY_STORAGE_FEE = 100;

@Injectable()
export class PassthroughService {
  private readonly logger = new Logger(PassthroughService.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // ステータス遷移バリデーション / 状态迁移校验
  private validateStatusTransition(currentStatus: string, targetStatus: string): void {
    const allowed = VALID_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(targetStatus)) {
      throw new WmsException(
        'PASSTHROUGH_INVALID_STATUS',
        `Cannot transition from '${currentStatus}' to '${targetStatus}' / ` +
        `「${currentStatus}」から「${targetStatus}」への遷移は不可 / ` +
        `不能从「${currentStatus}」迁移到「${targetStatus}」`,
      );
    }
  }

  // 通過型完了時に出荷指示を自動生成 / 通过型完成时自动生成出货指示
  private async autoGenerateShipmentOrder(tenantId: string, passthroughOrder: any): Promise<void> {
    try {
      const shipmentData = {
        tenantId,
        orderNumber: `PT-${passthroughOrder.orderNumber}`,
        recipientName: passthroughOrder.destinationName ?? '',
        recipientPostalCode: passthroughOrder.destinationPostalCode ?? '',
        recipientPrefecture: passthroughOrder.destinationPrefecture ?? '',
        recipientCity: passthroughOrder.destinationCity ?? '',
        recipientStreet: passthroughOrder.destinationAddress ?? '',
        recipientBuilding: passthroughOrder.destinationBuilding ?? '',
        recipientPhone: passthroughOrder.destinationPhone ?? '',
        customFields: {
          source: 'passthrough',
          passthroughOrderId: passthroughOrder.id,
          passthroughOrderNumber: passthroughOrder.orderNumber,
          memo: `通過型入庫から自動生成 / 通过型自动生成 (${passthroughOrder.orderNumber})`,
        },
      } satisfies typeof shipmentOrders.$inferInsert;

      const rows = await this.db
        .insert(shipmentOrders)
        .values(shipmentData)
        .returning();

      this.logger.log(
        `出荷指示自動生成完了 / 出货指示自动生成完成: passthrough=${passthroughOrder.orderNumber} → shipment=${rows[0]?.orderNumber}`,
      );
    } catch (error) {
      // 出荷指示生成失敗でもパススルー完了は取り消さない / 出货指示生成失败也不回滚通过型完成
      this.logger.error(
        `出荷指示自動生成失敗 / 出货指示自动生成失败: passthrough=${passthroughOrder.orderNumber}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  // 保管超過チェック — 7日間無料保管を超過した注文一覧
  // 保管超期检查 — 超过7天免费保管期的订单列表
  async checkStorageOverdue(tenantId: string) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - FREE_STORAGE_DAYS);

    // 未完了かつ作成日が7日以上前の注文を取得 / 获取未完成且创建日超过7天的订单
    const overdueOrders = await this.db
      .select()
      .from(passthroughOrders)
      .where(
        and(
          eq(passthroughOrders.tenantId, tenantId),
          ne(passthroughOrders.status, 'completed'),
          ne(passthroughOrders.status, 'cancelled'),
          lt(passthroughOrders.createdAt, cutoffDate),
        ),
      )
      .orderBy(passthroughOrders.createdAt);

    const now = new Date();
    const items = overdueOrders.map((order) => {
      const createdAt = new Date(order.createdAt);
      const totalDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      const overdueDays = totalDays - FREE_STORAGE_DAYS;
      const estimatedStorageFee = overdueDays * DAILY_STORAGE_FEE;

      return {
        ...order,
        totalDays,
        overdueDays,
        estimatedStorageFee,
      };
    });

    return {
      tenantId,
      freeStorageDays: FREE_STORAGE_DAYS,
      dailyStorageFee: DAILY_STORAGE_FEE,
      overdueCount: items.length,
      items,
    };
  }

  // パススルー注文一覧取得（テナント分離・ページネーション・ステータスフィルタ）
  // 获取直通订单列表（租户隔离・分页・状态过滤）
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // 検索条件構築 / 构建查询条件
    const conditions: SQL[] = [eq(passthroughOrders.tenantId, tenantId)];

    if (query.status) {
      conditions.push(eq(passthroughOrders.status, query.status));
    }

    const where = and(...conditions);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db
        .select()
        .from(passthroughOrders)
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(passthroughOrders.createdAt),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(passthroughOrders)
        .where(where),
    ]);

    const total = countResult[0]?.count ?? 0;
    return createPaginatedResult(items, total, page, limit);
  }

  // パススルー注文詳細取得 / 获取直通订单详情
  async findById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(passthroughOrders)
      .where(and(eq(passthroughOrders.id, id), eq(passthroughOrders.tenantId, tenantId)))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('PASSTHROUGH_NOT_FOUND', `id=${id}`);
    }
    return rows[0];
  }

  // パススルー注文作成（ステータスは draft で初期化）/ 创建直通订单（状态初始化为 draft）
  async create(tenantId: string, dto: Record<string, any>) {
    const rows = await this.db
      .insert(passthroughOrders)
      .values({
        tenantId,
        orderNumber: dto.orderNumber ?? `PT-${Date.now()}`,
        clientId: dto.clientId ?? null,
        items: dto.items ?? null,
        notes: dto.notes ?? null,
        destinationName: dto.destinationName ?? null,
        destinationPostalCode: dto.destinationPostalCode ?? null,
        destinationPrefecture: dto.destinationPrefecture ?? null,
        destinationCity: dto.destinationCity ?? null,
        destinationAddress: dto.destinationAddress ?? null,
        destinationBuilding: dto.destinationBuilding ?? null,
        destinationPhone: dto.destinationPhone ?? null,
        status: 'draft',
      } satisfies typeof passthroughOrders.$inferInsert)
      .returning();

    return rows[0];
  }

  // パススルー注文ステータス更新（遷移バリデーション付き）
  // 更新直通订单状态（带迁移校验）
  async update(tenantId: string, id: string, dto: Record<string, any>) {
    // 現在のレコード取得 / 获取当前记录
    const current = await this.findById(tenantId, id);

    // ステータス変更がある場合はバリデーション / 如果有状态变更则进行校验
    if (dto.status && dto.status !== current.status) {
      this.validateStatusTransition(current.status, dto.status);

      // ステータスに応じたタイムスタンプ設定 / 根据状态设置时间戳
      const now = new Date();
      const statusTimestamps: Record<string, Record<string, Date>> = {
        confirmed: { confirmedAt: now },
        receiving: { receivedAt: now },
        completed: { completedAt: now },
        cancelled: { cancelledAt: now },
      };

      const timestamps = statusTimestamps[dto.status] ?? {};
      const rows = await this.db
        .update(passthroughOrders)
        .set({ ...dto, ...timestamps, updatedAt: now })
        .where(and(eq(passthroughOrders.id, id), eq(passthroughOrders.tenantId, tenantId)))
        .returning();

      const updated = rows[0];

      // 完了時に出荷指示を自動生成 / 完成时自动生成出货指示
      if (dto.status === 'completed' && updated) {
        await this.autoGenerateShipmentOrder(tenantId, updated);
      }

      return updated;
    }

    // ステータス変更なしの通常更新 / 无状态变更的普通更新
    const rows = await this.db
      .update(passthroughOrders)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(passthroughOrders.id, id), eq(passthroughOrders.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // パススルー注文到着処理（draft→confirmed 遷移のショートカット）
  // 直通订单到货处理（draft→confirmed 迁移的快捷方式）
  async arrive(tenantId: string, id: string) {
    return this.update(tenantId, id, { status: 'confirmed' });
  }

  // パススルー注文出荷処理（confirmed→receiving 遷移のショートカット）
  // 直通订单发货处理（confirmed→receiving 迁移的快捷方式）
  async ship(tenantId: string, id: string) {
    return this.update(tenantId, id, { status: 'receiving' });
  }

  // パススルー注文削除（draftのみ削除可能）/ 删除直通订单（仅draft可删除）
  async remove(tenantId: string, id: string) {
    const current = await this.findById(tenantId, id);
    if (current.status !== 'draft') {
      throw new WmsException(
        'PASSTHROUGH_INVALID_STATUS',
        `Cannot delete: status is '${current.status}', only 'draft' can be deleted / ` +
        `ステータス「${current.status}」は削除不可。draftのみ削除可能 / ` +
        `状态「${current.status}」不可删除，仅draft可删除`,
      );
    }

    const rows = await this.db
      .delete(passthroughOrders)
      .where(and(eq(passthroughOrders.id, id), eq(passthroughOrders.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // パススルー注文確認（draft → confirmed ショートカット）/ 确认直通订单（draft → confirmed 快捷方式）
  async confirm(tenantId: string, id: string) {
    return this.update(tenantId, id, { status: 'confirmed' });
  }

  // パススルー注文受領（confirmed → receiving ショートカット）/ 接收直通订单（confirmed → receiving 快捷方式）
  async receive(tenantId: string, id: string) {
    return this.update(tenantId, id, { status: 'receiving' });
  }

  // パススルー注文完了（receiving → completed ショートカット）/ 完成直通订单（receiving → completed 快捷方式）
  async complete(tenantId: string, id: string) {
    return this.update(tenantId, id, { status: 'completed' });
  }

  // パススルー注文キャンセル（draft/confirmed → cancelled ショートカット）/ 取消直通订单
  async cancel(tenantId: string, id: string) {
    return this.update(tenantId, id, { status: 'cancelled' });
  }

  // パススルー注文一括インポート（CSV/JSONボディをパースして一括挿入）
  // 直通订单批量导入（解析CSV/JSON body后批量插入）
  async importOrders(tenantId: string, body: { orders: Record<string, any>[] }) {
    const { orders } = body;
    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      throw new WmsException('VALIDATION_ERROR', 'orders array is required and must not be empty / orders配列は必須 / orders数组必填且不能为空');
    }

    const results = [];
    for (const dto of orders) {
      const created = await this.create(tenantId, dto);
      results.push(created);
    }

    return { imported: results.length, items: results };
  }

  // ステージングダッシュボード（ステータス別集計）/ 暂存仪表板（按状态汇总）
  async getDashboard(tenantId: string) {
    // ステータス別カウント取得 / 获取各状态计数
    const counts = await this.db
      .select({
        status: passthroughOrders.status,
        count: sql<number>`count(*)::int`,
      })
      .from(passthroughOrders)
      .where(eq(passthroughOrders.tenantId, tenantId))
      .groupBy(passthroughOrders.status);

    const summary: Record<string, number> = {
      draft: 0,
      confirmed: 0,
      receiving: 0,
      completed: 0,
      cancelled: 0,
      total: 0,
    };

    for (const row of counts) {
      summary[row.status] = row.count;
      summary.total += row.count;
    }

    // 最近の注文取得（降順で最新10件）/ 获取最近的订单（降序取最新10条）
    const recentOrders = await this.db
      .select()
      .from(passthroughOrders)
      .where(eq(passthroughOrders.tenantId, tenantId))
      .orderBy(sql`${passthroughOrders.createdAt} DESC`)
      .limit(10);

    return { tenantId, summary, recentOrders };
  }
}
