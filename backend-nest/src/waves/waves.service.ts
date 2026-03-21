// ウェーブサービス / 波次服务
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq, and, sql, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { waves } from '../database/schema/warehouse-ops.js';
import type { CreateWaveDto, UpdateWaveDto } from './dto/create-wave.dto.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
  warehouseId?: string;
  status?: string;
}

@Injectable()
export class WavesService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  // ウェーブ一覧取得（テナント分離・ページネーション・フィルタ）/ 获取波次列表（租户隔离・分页・筛选）
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // 検索条件構築 / 构建查询条件
    const conditions: SQL[] = [
      eq(waves.tenantId, tenantId),
    ];

    if (query.warehouseId) {
      conditions.push(eq(waves.warehouseId, query.warehouseId));
    }
    if (query.status) {
      conditions.push(eq(waves.status, query.status));
    }

    const where = and(...conditions);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db.select().from(waves).where(where).limit(limit).offset(offset).orderBy(waves.createdAt),
      this.db.select({ count: sql<number>`count(*)::int` }).from(waves).where(where),
    ]);

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
  }

  // ウェーブID検索 / 按ID查找波次
  async findById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(waves)
      .where(and(
        eq(waves.id, id),
        eq(waves.tenantId, tenantId),
      ))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('WAVE_NOT_FOUND', `ID: ${id}`);
    }
    return rows[0];
  }

  // ウェーブ作成 / 创建波次
  async create(tenantId: string, dto: CreateWaveDto) {
    // ウェーブ番号重複チェック / 波次编号重复检查
    const existing = await this.db
      .select({ id: waves.id })
      .from(waves)
      .where(and(
        eq(waves.tenantId, tenantId),
        eq(waves.waveNumber, dto.waveNumber),
      ))
      .limit(1);

    if (existing.length > 0) {
      throw new WmsException('DUPLICATE_RESOURCE', `Wave number: ${dto.waveNumber}`);
    }

    const rows = await this.db.insert(waves).values({
      tenantId,
      ...dto,
    }).returning();

    return rows[0];
  }

  // ウェーブ更新 / 更新波次
  async update(tenantId: string, id: string, dto: UpdateWaveDto) {
    // 存在確認 / 确认存在
    await this.findById(tenantId, id);

    // ウェーブ番号変更時の重複チェック / 波次编号变更时的重复检查
    if (dto.waveNumber) {
      const existing = await this.db
        .select({ id: waves.id })
        .from(waves)
        .where(and(
          eq(waves.tenantId, tenantId),
          eq(waves.waveNumber, dto.waveNumber),
        ))
        .limit(1);

      if (existing.length > 0 && existing[0].id !== id) {
        throw new WmsException('DUPLICATE_RESOURCE', `Wave number: ${dto.waveNumber}`);
      }
    }

    const rows = await this.db
      .update(waves)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(waves.id, id), eq(waves.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // ウェーブ削除（物理削除）/ 删除波次（物理删除）
  async remove(tenantId: string, id: string) {
    // 存在確認 / 确认存在
    await this.findById(tenantId, id);

    const rows = await this.db
      .delete(waves)
      .where(and(eq(waves.id, id), eq(waves.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // ========== ワークフロー / 工作流 ==========

  // ウェーブリリース（pending → in_progress）/ 波次释放（pending → in_progress）
  async release(tenantId: string, id: string) {
    const wave = await this.findById(tenantId, id);

    if (wave.status !== 'pending') {
      throw new WmsException('WAVE_INVALID_STATUS', `Cannot release: current status is ${wave.status}`);
    }

    const rows = await this.db
      .update(waves)
      .set({ status: 'in_progress', updatedAt: new Date() })
      .where(and(eq(waves.id, id), eq(waves.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // ウェーブ完了（in_progress → completed）/ 波次完成（in_progress → completed）
  async complete(tenantId: string, id: string) {
    const wave = await this.findById(tenantId, id);

    if (wave.status !== 'in_progress') {
      throw new WmsException('WAVE_INVALID_STATUS', `Cannot complete: current status is ${wave.status}`);
    }

    const rows = await this.db
      .update(waves)
      .set({ status: 'completed', updatedAt: new Date() })
      .where(and(eq(waves.id, id), eq(waves.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // ウェーブキャンセル（→ cancelled）/ 波次取消（→ cancelled）
  async cancel(tenantId: string, id: string) {
    const wave = await this.findById(tenantId, id);

    if (wave.status === 'completed' || wave.status === 'cancelled') {
      throw new WmsException('WAVE_INVALID_STATUS', `Cannot cancel: current status is ${wave.status}`);
    }

    const rows = await this.db
      .update(waves)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(and(eq(waves.id, id), eq(waves.tenantId, tenantId)))
      .returning();

    return rows[0];
  }
}
