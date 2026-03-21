// 拡張機能サービス（Webhook・フィーチャーフラグ）/ 扩展功能服务（Webhook・功能开关）
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq, and, sql, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { webhooks, featureFlags, plugins, scripts, customFieldDefinitions, autoProcessingRules } from '../database/schema/extensions.js';
import type { CreateWebhookDto, UpdateWebhookDto } from './dto/create-webhook.dto.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';

interface FindAllWebhooksQuery {
  page?: number;
  limit?: number;
}

// ページネーション共通パラメータ / 分页通用参数
interface PaginationQuery {
  page?: number;
  limit?: number;
}

// カスタムフィールド検索パラメータ / 自定义字段查询参数
interface FindAllCustomFieldsQuery extends PaginationQuery {
  entityType?: string;
}

@Injectable()
export class ExtensionsService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  // ===== Webhook CRUD / Webhook 增删改查 =====

  // Webhook一覧取得（テナント分離・ページネーション）/ 获取Webhook列表（租户隔离・分页）
  async findAllWebhooks(tenantId: string, query: FindAllWebhooksQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    const where = eq(webhooks.tenantId, tenantId);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db.select().from(webhooks).where(where).limit(limit).offset(offset).orderBy(webhooks.createdAt),
      this.db.select({ count: sql<number>`count(*)::int` }).from(webhooks).where(where),
    ]);

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
  }

  // WebhookID検索 / 按ID查找Webhook
  async findWebhookById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(webhooks)
      .where(and(
        eq(webhooks.id, id),
        eq(webhooks.tenantId, tenantId),
      ))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('EXT_WEBHOOK_NOT_FOUND', `ID: ${id}`);
    }
    return rows[0];
  }

  // Webhook作成 / 创建Webhook
  async createWebhook(tenantId: string, dto: CreateWebhookDto) {
    const rows = await this.db
      .insert(webhooks)
      .values({ tenantId, ...dto })
      .returning();

    return rows[0];
  }

  // Webhook更新 / 更新Webhook
  async updateWebhook(tenantId: string, id: string, dto: UpdateWebhookDto) {
    // 存在確認 / 确认存在
    await this.findWebhookById(tenantId, id);

    const rows = await this.db
      .update(webhooks)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(webhooks.id, id), eq(webhooks.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // Webhook削除（物理削除）/ 删除Webhook（硬删除）
  async removeWebhook(tenantId: string, id: string) {
    // 存在確認 / 确认存在
    await this.findWebhookById(tenantId, id);

    const rows = await this.db
      .delete(webhooks)
      .where(and(eq(webhooks.id, id), eq(webhooks.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // ===== フィーチャーフラグ / 功能开关 =====

  // フィーチャーフラグ一覧取得（グローバル設定）/ 获取功能开关列表（全局设置）
  async findAllFlags() {
    const items = await this.db
      .select()
      .from(featureFlags)
      .orderBy(featureFlags.name);

    return { items };
  }

  // フィーチャーフラグ切替 / 切换功能开关
  async toggleFlag(id: string) {
    const existing = await this.db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.id, id))
      .limit(1);

    if (existing.length === 0) {
      throw new WmsException('EXT_FLAG_NOT_FOUND', `ID: ${id}`);
    }

    const rows = await this.db
      .update(featureFlags)
      .set({
        enabled: !existing[0].enabled,
        updatedAt: new Date(),
      })
      .where(eq(featureFlags.id, id))
      .returning();

    return rows[0];
  }

  // ===== プラグイン CRUD / 插件 CRUD =====

  // プラグイン一覧取得（テナント分離・ページネーション）/ 获取插件列表（租户隔离・分页）
  async findAllPlugins(tenantId: string, query: PaginationQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    const where = eq(plugins.tenantId, tenantId);

    const [items, countResult] = await Promise.all([
      this.db.select().from(plugins).where(where).limit(limit).offset(offset).orderBy(plugins.createdAt),
      this.db.select({ count: sql<number>`count(*)::int` }).from(plugins).where(where),
    ]);

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
  }

  // プラグインID検索 / 按ID查找插件
  async findPluginById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(plugins)
      .where(and(eq(plugins.id, id), eq(plugins.tenantId, tenantId)))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('EXT_PLUGIN_NOT_FOUND', `ID: ${id}`);
    }
    return rows[0];
  }

  // プラグイン有効/無効切替 / 启用/禁用插件
  async setPluginEnabled(tenantId: string, id: string, enabled: boolean) {
    // 存在確認 / 确认存在
    await this.findPluginById(tenantId, id);

    const rows = await this.db
      .update(plugins)
      .set({ enabled, updatedAt: new Date() })
      .where(and(eq(plugins.id, id), eq(plugins.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // ===== スクリプト CRUD / 脚本 CRUD =====

  // スクリプト一覧取得（テナント分離・ページネーション）/ 获取脚本列表（租户隔离・分页）
  async findAllScripts(tenantId: string, query: PaginationQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    const where = eq(scripts.tenantId, tenantId);

    const [items, countResult] = await Promise.all([
      this.db.select().from(scripts).where(where).limit(limit).offset(offset).orderBy(scripts.createdAt),
      this.db.select({ count: sql<number>`count(*)::int` }).from(scripts).where(where),
    ]);

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
  }

  // スクリプトID検索 / 按ID查找脚本
  async findScriptById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(scripts)
      .where(and(eq(scripts.id, id), eq(scripts.tenantId, tenantId)))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('EXT_SCRIPT_NOT_FOUND', `ID: ${id}`);
    }
    return rows[0];
  }

  // スクリプト作成 / 创建脚本
  async createScript(tenantId: string, dto: Record<string, unknown>) {
    const rows = await this.db
      .insert(scripts)
      .values({ tenantId, ...dto })
      .returning();

    return rows[0];
  }

  // スクリプト更新 / 更新脚本
  async updateScript(tenantId: string, id: string, dto: Record<string, unknown>) {
    // 存在確認 / 确认存在
    await this.findScriptById(tenantId, id);

    const rows = await this.db
      .update(scripts)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(scripts.id, id), eq(scripts.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // スクリプト削除（物理削除）/ 删除脚本（硬删除）
  async removeScript(tenantId: string, id: string) {
    // 存在確認 / 确认存在
    await this.findScriptById(tenantId, id);

    const rows = await this.db
      .delete(scripts)
      .where(and(eq(scripts.id, id), eq(scripts.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // ===== カスタムフィールド CRUD / 自定义字段 CRUD =====

  // カスタムフィールド一覧取得（テナント分離・ページネーション）/ 获取自定义字段列表（租户隔离・分页）
  async findAllCustomFields(tenantId: string, query: FindAllCustomFieldsQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [eq(customFieldDefinitions.tenantId, tenantId)];

    if (query.entityType) {
      conditions.push(eq(customFieldDefinitions.entityType, query.entityType));
    }

    const where = and(...conditions);

    const [items, countResult] = await Promise.all([
      this.db.select().from(customFieldDefinitions).where(where).limit(limit).offset(offset).orderBy(customFieldDefinitions.sortOrder),
      this.db.select({ count: sql<number>`count(*)::int` }).from(customFieldDefinitions).where(where),
    ]);

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
  }

  // カスタムフィールド作成 / 创建自定义字段
  async createCustomField(tenantId: string, dto: Record<string, unknown>) {
    const rows = await this.db
      .insert(customFieldDefinitions)
      .values({ tenantId, ...dto })
      .returning();

    return rows[0];
  }

  // カスタムフィールド更新 / 更新自定义字段
  async updateCustomField(tenantId: string, id: string, dto: Record<string, unknown>) {
    // 存在確認 / 确认存在
    const existing = await this.db
      .select()
      .from(customFieldDefinitions)
      .where(and(eq(customFieldDefinitions.id, id), eq(customFieldDefinitions.tenantId, tenantId)))
      .limit(1);

    if (existing.length === 0) {
      throw new WmsException('EXT_CUSTOM_FIELD_NOT_FOUND', `ID: ${id}`);
    }

    const rows = await this.db
      .update(customFieldDefinitions)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(customFieldDefinitions.id, id), eq(customFieldDefinitions.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // カスタムフィールド削除（物理削除）/ 删除自定义字段（硬删除）
  async removeCustomField(tenantId: string, id: string) {
    const existing = await this.db
      .select()
      .from(customFieldDefinitions)
      .where(and(eq(customFieldDefinitions.id, id), eq(customFieldDefinitions.tenantId, tenantId)))
      .limit(1);

    if (existing.length === 0) {
      throw new WmsException('EXT_CUSTOM_FIELD_NOT_FOUND', `ID: ${id}`);
    }

    const rows = await this.db
      .delete(customFieldDefinitions)
      .where(and(eq(customFieldDefinitions.id, id), eq(customFieldDefinitions.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // ===== 自動処理ルール CRUD / 自动处理规则 CRUD =====

  // 自動処理ルール一覧取得（テナント分離・ページネーション）/ 获取自动处理规则列表（租户隔离・分页）
  async findAllAutoProcessingRules(tenantId: string, query: PaginationQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    const where = eq(autoProcessingRules.tenantId, tenantId);

    const [items, countResult] = await Promise.all([
      this.db.select().from(autoProcessingRules).where(where).limit(limit).offset(offset).orderBy(autoProcessingRules.priority),
      this.db.select({ count: sql<number>`count(*)::int` }).from(autoProcessingRules).where(where),
    ]);

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
  }

  // 自動処理ルール作成 / 创建自动处理规则
  async createAutoProcessingRule(tenantId: string, dto: Record<string, unknown>) {
    const rows = await this.db
      .insert(autoProcessingRules)
      .values({ tenantId, ...dto })
      .returning();

    return rows[0];
  }

  // 自動処理ルール更新 / 更新自动处理规则
  async updateAutoProcessingRule(tenantId: string, id: string, dto: Record<string, unknown>) {
    // 存在確認 / 确认存在
    const existing = await this.db
      .select()
      .from(autoProcessingRules)
      .where(and(eq(autoProcessingRules.id, id), eq(autoProcessingRules.tenantId, tenantId)))
      .limit(1);

    if (existing.length === 0) {
      throw new WmsException('EXT_AUTO_RULE_NOT_FOUND', `ID: ${id}`);
    }

    const rows = await this.db
      .update(autoProcessingRules)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(autoProcessingRules.id, id), eq(autoProcessingRules.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // 自動処理ルール削除（物理削除）/ 删除自动处理规则（硬删除）
  async removeAutoProcessingRule(tenantId: string, id: string) {
    const existing = await this.db
      .select()
      .from(autoProcessingRules)
      .where(and(eq(autoProcessingRules.id, id), eq(autoProcessingRules.tenantId, tenantId)))
      .limit(1);

    if (existing.length === 0) {
      throw new WmsException('EXT_AUTO_RULE_NOT_FOUND', `ID: ${id}`);
    }

    const rows = await this.db
      .delete(autoProcessingRules)
      .where(and(eq(autoProcessingRules.id, id), eq(autoProcessingRules.tenantId, tenantId)))
      .returning();

    return rows[0];
  }
}
