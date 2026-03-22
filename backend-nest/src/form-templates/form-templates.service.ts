// フォームテンプレートサービス / 表单模板服务
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq, and, sql } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { formTemplates } from '../database/schema/templates.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';
import type { DrizzleDB } from '../database/database.types.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
  targetType?: string;
  scope?: string;
  clientId?: string;
}

@Injectable()
export class FormTemplatesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // 一覧取得 / 获取列表
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    const conditions = [eq(formTemplates.tenantId, tenantId)];
    if (query.targetType) {
      conditions.push(eq(formTemplates.targetType, query.targetType));
    }
    // スコープフィルタ / 作用域过滤
    if (query.scope) {
      conditions.push(eq(formTemplates.scope, query.scope));
    }
    // クライアントフィルタ / 客户过滤
    if (query.clientId) {
      conditions.push(eq(formTemplates.clientId, query.clientId));
    }

    const where = and(...conditions);

    const [items, countResult] = await Promise.all([
      this.db.select().from(formTemplates).where(where).limit(limit).offset(offset).orderBy(formTemplates.createdAt),
      this.db.select({ count: sql<number>`count(*)::int` }).from(formTemplates).where(where),
    ]);

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
  }

  // ID検索 / 按ID查找
  async findById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(formTemplates)
      .where(and(eq(formTemplates.id, id), eq(formTemplates.tenantId, tenantId)))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('TEMPLATE_NOT_FOUND', `ID: ${id}`);
    }
    return rows[0];
  }

  // テンプレート解決（3階層継承）/ 模板解析（三层继承）
  // 優先順位: client → tenant → system
  // 优先级: client → tenant → system
  async resolveTemplate(tenantId: string, targetType: string, clientId?: string) {
    // 1. クライアント専用テンプレートを検索 / 搜索客户专用模板
    if (clientId) {
      const clientRows = await this.db
        .select()
        .from(formTemplates)
        .where(and(
          eq(formTemplates.tenantId, tenantId),
          eq(formTemplates.targetType, targetType),
          eq(formTemplates.scope, 'client'),
          eq(formTemplates.clientId, clientId),
          eq(formTemplates.isActive, true),
        ))
        .limit(1);

      if (clientRows.length > 0) {
        return clientRows[0];
      }
    }

    // 2. テナントカスタムテンプレートを検索 / 搜索租户自定义模板
    const tenantRows = await this.db
      .select()
      .from(formTemplates)
      .where(and(
        eq(formTemplates.tenantId, tenantId),
        eq(formTemplates.targetType, targetType),
        eq(formTemplates.scope, 'tenant'),
        eq(formTemplates.isActive, true),
      ))
      .limit(1);

    if (tenantRows.length > 0) {
      return tenantRows[0];
    }

    // 3. システムデフォルトテンプレートを検索 / 搜索系统默认模板
    const systemRows = await this.db
      .select()
      .from(formTemplates)
      .where(and(
        eq(formTemplates.tenantId, tenantId),
        eq(formTemplates.targetType, targetType),
        eq(formTemplates.scope, 'system'),
      ))
      .limit(1);

    if (systemRows.length > 0) {
      return systemRows[0];
    }

    throw new WmsException('TEMPLATE_NOT_FOUND', `targetType: ${targetType}, clientId: ${clientId ?? 'none'}`);
  }

  // 新バージョン作成 / 创建新版本
  // 既存テンプレートをコピーしてバージョンを上げる / 复制现有模板并提升版本号
  async createVersion(tenantId: string, templateId: string, changes: Record<string, unknown>) {
    const existing = await this.findById(tenantId, templateId);

    // 旧バージョンを非アクティブ化 / 将旧版本设为非激活
    await this.db
      .update(formTemplates)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(formTemplates.id, templateId), eq(formTemplates.tenantId, tenantId)));

    // 新バージョンを作成 / 创建新版本
    const newVersion = {
      tenantId: existing.tenantId,
      name: existing.name,
      targetType: existing.targetType,
      columns: existing.columns,
      styles: existing.styles,
      isDefault: existing.isDefault,
      scope: existing.scope,
      clientId: existing.clientId,
      parentId: existing.parentId ?? existing.id,
      isActive: true,
      version: existing.version + 1,
      description: existing.description,
      ...changes,
    };

    const rows = await this.db
      .insert(formTemplates)
      .values(newVersion as any)
      .returning();

    return rows[0];
  }

  // クライアント専用テンプレート作成 / 创建客户专用模板
  // 既存のtenant/systemテンプレートをクライアント用にコピー / 将现有tenant/system模板复制为客户专用
  async createClientTemplate(tenantId: string, templateId: string, clientId: string) {
    const existing = await this.findById(tenantId, templateId);

    const clientTemplate = {
      tenantId: existing.tenantId,
      name: existing.name,
      targetType: existing.targetType,
      columns: existing.columns,
      styles: existing.styles,
      isDefault: false,
      scope: 'client' as const,
      clientId,
      parentId: existing.id,
      isActive: true,
      version: 1,
      description: `Client copy from: ${existing.name}`,
    };

    const rows = await this.db
      .insert(formTemplates)
      .values(clientTemplate as any)
      .returning();

    return rows[0];
  }

  // 作成 / 创建
  async create(tenantId: string, dto: Record<string, unknown>) {
    const rows = await this.db
      .insert(formTemplates)
      .values({ tenantId, ...dto } as any)
      .returning();
    return rows[0];
  }

  // 更新 / 更新
  async update(tenantId: string, id: string, dto: Record<string, unknown>) {
    await this.findById(tenantId, id);

    const rows = await this.db
      .update(formTemplates)
      .set({ ...dto, updatedAt: new Date() } as any)
      .where(and(eq(formTemplates.id, id), eq(formTemplates.tenantId, tenantId)))
      .returning();
    return rows[0];
  }

  // 削除 / 删除
  async remove(tenantId: string, id: string) {
    const existing = await this.findById(tenantId, id);

    // システムテンプレートは削除不可 / 系统模板不可删除
    if (existing.scope === 'system') {
      throw new WmsException('TEMPLATE_NOT_FOUND', 'System templates cannot be deleted / システムテンプレートは削除できません');
    }

    const rows = await this.db
      .delete(formTemplates)
      .where(and(eq(formTemplates.id, id), eq(formTemplates.tenantId, tenantId)))
      .returning();
    return rows[0];
  }
}
