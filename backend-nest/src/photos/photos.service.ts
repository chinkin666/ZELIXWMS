// 写真管理サービス / 照片管理服务
import { Inject, Injectable } from '@nestjs/common';
import { eq, and, sql, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import type { DrizzleDB } from '../database/database.types.js';
import { photos } from '../database/schema/photos.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';
import { WmsException } from '../common/exceptions/wms.exception.js';

// 最大ファイルサイズ（5MB）/ 最大文件大小（5MB）
const MAX_FILE_SIZE = 5 * 1024 * 1024;

interface FindAllQuery {
  page?: number;
  limit?: number;
  entityType?: string;
  entityId?: string;
}

@Injectable()
export class PhotosService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // 写真一覧取得（テナント分離・ページネーション・フィルタ）
  // 获取照片列表（租户隔离・分页・过滤）
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // 検索条件構築 / 构建查询条件
    const conditions: SQL[] = [eq(photos.tenantId, tenantId)];

    if (query.entityType) {
      conditions.push(eq(photos.entityType, query.entityType));
    }
    if (query.entityId) {
      conditions.push(eq(photos.entityId, query.entityId));
    }

    const where = and(...conditions);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db
        .select()
        .from(photos)
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(photos.createdAt),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(photos)
        .where(where),
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    return createPaginatedResult(items, total, page, limit);
  }

  // 写真詳細取得 / 获取照片详情
  async findById(tenantId: string, id: string) {
    const [photo] = await this.db
      .select()
      .from(photos)
      .where(and(eq(photos.id, id), eq(photos.tenantId, tenantId)))
      .limit(1);

    if (!photo) {
      throw new WmsException('PHOTO_NOT_FOUND', `Photo ${id} not found`);
    }

    return photo;
  }

  // 写真アップロード（メタデータ保存）/ 上传照片（保存元数据）
  async upload(tenantId: string, dto: Record<string, any>) {
    // ファイルサイズバリデーション / 文件大小验证
    if (dto.size && dto.size > MAX_FILE_SIZE) {
      throw new WmsException('PHOTO_TOO_LARGE', `File size: ${dto.size} bytes`);
    }

    // MIMEタイプバリデーション / MIME类型验证
    if (dto.mimeType && !dto.mimeType.startsWith('image/')) {
      throw new WmsException('PHOTO_INVALID_TYPE', `MIME type: ${dto.mimeType}`);
    }

    // ファイル名サニタイズ（パストラバーサル防止）/ 文件名消毒（防止路径遍历）
    const safeFilename = (dto.filename || 'unnamed').replace(/[\/\\\.\.]+/g, '_').replace(/^_+|_+$/g, '');

    // URLプレースホルダー生成 / 生成URL占位符
    const url = dto.url || `/storage/${tenantId}/photos/${Date.now()}-${safeFilename}`;

    const [created] = await this.db
      .insert(photos)
      .values({
        tenantId,
        entityType: dto.entityType,
        entityId: dto.entityId,
        filename: dto.filename || 'unnamed',
        originalFilename: dto.originalFilename,
        mimeType: dto.mimeType,
        size: dto.size,
        url,
        thumbnailUrl: dto.thumbnailUrl,
        uploadedBy: dto.uploadedBy,
      })
      .returning();

    return created;
  }

  // 写真削除 / 删除照片
  async remove(tenantId: string, id: string) {
    // 存在確認 / 存在确认
    const [photo] = await this.db
      .select()
      .from(photos)
      .where(and(eq(photos.id, id), eq(photos.tenantId, tenantId)))
      .limit(1);

    if (!photo) {
      throw new WmsException('PHOTO_NOT_FOUND', `Photo ${id} not found`);
    }

    await this.db
      .delete(photos)
      .where(and(eq(photos.id, id), eq(photos.tenantId, tenantId)));

    return { success: true, id };
  }

  // 写真一括アップロード / 批量上传照片
  async bulkUpload(tenantId: string, photoDtos: Record<string, any>[]) {
    const results: any[] = [];

    for (const dto of photoDtos) {
      // 各写真のバリデーション / 每张照片的验证
      if (dto.size && dto.size > MAX_FILE_SIZE) {
        throw new WmsException('PHOTO_TOO_LARGE', `File "${dto.filename}" size: ${dto.size} bytes`);
      }
      if (dto.mimeType && !dto.mimeType.startsWith('image/')) {
        throw new WmsException('PHOTO_INVALID_TYPE', `File "${dto.filename}" MIME type: ${dto.mimeType}`);
      }
    }

    // 全バリデーション通過後に一括挿入 / 全部验证通过后批量插入
    const values = photoDtos.map((dto) => ({
      tenantId,
      entityType: dto.entityType,
      entityId: dto.entityId,
      filename: dto.filename || 'unnamed',
      originalFilename: dto.originalFilename,
      mimeType: dto.mimeType,
      size: dto.size,
      url: dto.url || `/storage/${tenantId}/photos/${Date.now()}-${(dto.filename || 'unnamed').replace(/[\/\\\.\.]+/g, '_').replace(/^_+|_+$/g, '')}`,
      thumbnailUrl: dto.thumbnailUrl,
      uploadedBy: dto.uploadedBy,
    }));

    const created = await this.db
      .insert(photos)
      .values(values)
      .returning();

    return created;
  }
}
