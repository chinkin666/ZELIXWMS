// WMSスケジュールサービス / WMS排程服务
// systemSettings テーブルを settingsKey='wms_schedule:*' で使用 / 使用systemSettings表并按settingsKey='wms_schedule:*'管理
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq, and, sql, SQL, ilike } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { systemSettings } from '../database/schema/settings.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';
import type { DrizzleDB } from '../database/database.types.js';

// スケジュール設定キーのプレフィックス / 排程设置键前缀
const SCHEDULE_KEY_PREFIX = 'wms_schedule';

interface FindAllQuery {
  page?: number;
  limit?: number;
}

@Injectable()
export class WmsSchedulesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // スケジュール一覧取得 / 获取排程列表
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // settingsKey が 'wms_schedule%' に一致するレコードを検索 / 搜索settingsKey匹配'wms_schedule%'的记录
    const conditions: SQL[] = [
      eq(systemSettings.tenantId, tenantId),
      ilike(systemSettings.settingsKey, `${SCHEDULE_KEY_PREFIX}%`),
    ];

    const where = and(...conditions);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db.select().from(systemSettings).where(where).limit(limit).offset(offset).orderBy(systemSettings.createdAt),
      this.db.select({ count: sql<number>`count(*)::int` }).from(systemSettings).where(where),
    ]);

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
  }

  // スケジュールID検索 / 按ID查找排程
  async findById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(systemSettings)
      .where(and(
        eq(systemSettings.id, id),
        eq(systemSettings.tenantId, tenantId),
        ilike(systemSettings.settingsKey, `${SCHEDULE_KEY_PREFIX}%`),
      ))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('WMS_SCHEDULE_NOT_FOUND', `ID: ${id}`);
    }
    return rows[0];
  }

  // スケジュール作成 / 创建排程
  async create(tenantId: string, dto: Record<string, unknown>) {
    const scheduleName = (dto.name as string) || `schedule-${Date.now()}`;
    const settingsKey = `${SCHEDULE_KEY_PREFIX}:${scheduleName}`;

    const rows = await this.db.insert(systemSettings).values({
      tenantId,
      settingsKey,
      settings: {
        name: scheduleName,
        description: dto.description,
        cronExpression: dto.cronExpression,
        taskType: dto.taskType,
        enabled: dto.enabled ?? true,
        config: dto.config || {},
      },
    }).returning();

    return rows[0];
  }

  // スケジュール更新 / 更新排程
  async update(tenantId: string, id: string, dto: Record<string, unknown>) {
    // 存在確認 / 确认存在
    const existing = await this.findById(tenantId, id);

    // 既存の設定とマージ / 与现有设置合并
    const currentSettings = (existing.settings || {}) as Record<string, unknown>;
    const updatedSettings = {
      ...currentSettings,
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.cronExpression !== undefined && { cronExpression: dto.cronExpression }),
      ...(dto.taskType !== undefined && { taskType: dto.taskType }),
      ...(dto.enabled !== undefined && { enabled: dto.enabled }),
      ...(dto.config !== undefined && { config: dto.config }),
    };

    const rows = await this.db
      .update(systemSettings)
      .set({ settings: updatedSettings, updatedAt: new Date() })
      .where(and(eq(systemSettings.id, id), eq(systemSettings.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // スケジュール削除（物理削除）/ 删除排程（物理删除）
  async remove(tenantId: string, id: string) {
    // 存在確認 / 确认存在
    await this.findById(tenantId, id);

    const rows = await this.db
      .delete(systemSettings)
      .where(and(eq(systemSettings.id, id), eq(systemSettings.tenantId, tenantId)))
      .returning();

    return rows[0];
  }
}
