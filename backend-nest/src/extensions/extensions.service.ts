// 拡張機能サービス（Webhook・フィーチャーフラグ）/ 扩展功能服务（Webhook・功能开关）
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq, and, sql, SQL, desc } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { webhooks, webhookLogs, featureFlags, plugins, scripts, customFieldDefinitions, autoProcessingRules } from '../database/schema/extensions.js';
import type { CreateWebhookDto, UpdateWebhookDto } from './dto/create-webhook.dto.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';
import type { DrizzleDB } from '../database/database.types.js';

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
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

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
      .values({ tenantId, ...dto } as any)
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
      .values({ tenantId, ...dto } as any)
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
      .values({ tenantId, ...dto } as any)
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

  // ===== Webhookテスト・ログ / Webhook测试・日志 =====

  // Webhookテスト送信（テストペイロードを送信してログに記録）
  // 测试发送Webhook（发送测试payload并记录到日志）
  async testWebhook(tenantId: string, id: string) {
    const webhook = await this.findWebhookById(tenantId, id);

    const startTime = Date.now();
    let httpStatus = 0;
    let success = false;
    let error: string | undefined;

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'test', timestamp: new Date().toISOString(), webhookId: id }),
        signal: AbortSignal.timeout(10000),
      });
      httpStatus = response.status;
      success = response.ok;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }

    const responseTimeMs = Date.now() - startTime;

    // ログに記録 / 记录到日志
    const [log] = await this.db.insert(webhookLogs).values({
      tenantId,
      webhookId: id,
      event: 'test',
      url: webhook.url,
      httpStatus: httpStatus || null,
      responseTimeMs,
      success,
      error: error ?? null,
      payload: { event: 'test' },
    }).returning();

    return { success, httpStatus, responseTimeMs, error, log };
  }

  // Webhookログ取得 / 获取Webhook日志
  async getWebhookLogs(tenantId: string, webhookId: string, query: PaginationQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    const where = and(eq(webhookLogs.tenantId, tenantId), eq(webhookLogs.webhookId, webhookId));

    const [items, countResult] = await Promise.all([
      this.db.select().from(webhookLogs).where(where).limit(limit).offset(offset).orderBy(desc(webhookLogs.createdAt)),
      this.db.select({ count: sql<number>`count(*)::int` }).from(webhookLogs).where(where),
    ]);

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
  }

  // ===== フィーチャーフラグ拡張 / 功能开关扩展 =====

  // フィーチャーフラグキー検索 / 按key查找功能开关
  async findFlagByKey(key: string) {
    const rows = await this.db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.name, key))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('EXT_FLAG_NOT_FOUND', `Key: ${key}`);
    }
    return rows[0];
  }

  // フィーチャーフラグ作成 / 创建功能开关
  async createFlag(dto: Record<string, unknown>) {
    if (!dto.name) {
      throw new WmsException('VALIDATION_ERROR', 'name is required / nameは必須 / name必填');
    }

    const rows = await this.db
      .insert(featureFlags)
      .values(dto as any)
      .returning();

    return rows[0];
  }

  // フィーチャーフラグ更新（キーで検索して更新）/ 更新功能开关（按key搜索后更新）
  async updateFlag(key: string, dto: Record<string, unknown>) {
    // 存在確認 / 确认存在
    await this.findFlagByKey(key);

    const rows = await this.db
      .update(featureFlags)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(featureFlags.name, key))
      .returning();

    return rows[0];
  }

  // フィーチャーフラグ削除 / 删除功能开关
  async removeFlag(key: string) {
    // 存在確認 / 确认存在
    await this.findFlagByKey(key);

    const rows = await this.db
      .delete(featureFlags)
      .where(eq(featureFlags.name, key))
      .returning();

    return rows[0];
  }

  // ===== プラグイン拡張 / 插件扩展 =====

  // プラグインインストール（作成）/ 安装插件（创建）
  async installPlugin(tenantId: string, dto: Record<string, unknown>) {
    if (!dto.name) {
      throw new WmsException('VALIDATION_ERROR', 'name is required / nameは必須 / name必填');
    }

    const rows = await this.db
      .insert(plugins)
      .values({ tenantId, ...dto, enabled: false } as any)
      .returning();

    return rows[0];
  }

  // プラグイン設定更新 / 更新插件配置
  async updatePlugin(tenantId: string, id: string, dto: Record<string, unknown>) {
    // 存在確認 / 确认存在
    await this.findPluginById(tenantId, id);

    const rows = await this.db
      .update(plugins)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(plugins.id, id), eq(plugins.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // プラグインアンインストール（物理削除）/ 卸载插件（硬删除）
  async uninstallPlugin(tenantId: string, id: string) {
    // 存在確認 / 确认存在
    await this.findPluginById(tenantId, id);

    const rows = await this.db
      .delete(plugins)
      .where(and(eq(plugins.id, id), eq(plugins.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // ===== スクリプト拡張 / 脚本扩展 =====

  // スクリプト実行（lastRunAtとlastRunStatusを更新、実行結果を返す）
  // 执行脚本（更新lastRunAt和lastRunStatus，返回执行结果）
  async executeScript(tenantId: string, id: string) {
    const script = await this.findScriptById(tenantId, id);

    if (!script.enabled) {
      throw new WmsException('EXT_SCRIPT_DISABLED', `Script ${id} is disabled / スクリプト${id}は無効 / 脚本${id}已禁用`);
    }

    const now = new Date();

    // スクリプト実行のシミュレーション（実際のサンドボックス実行は将来実装）
    // 模拟脚本执行（实际沙箱执行将来实现）
    const rows = await this.db
      .update(scripts)
      .set({ lastRunAt: now, lastRunStatus: 'success', updatedAt: now })
      .where(and(eq(scripts.id, id), eq(scripts.tenantId, tenantId)))
      .returning();

    return {
      script: rows[0],
      execution: {
        executedAt: now,
        status: 'success',
        message: 'Script executed (sandbox not yet implemented) / スクリプト実行済み（サンドボックス未実装）/ 脚本已执行（沙箱尚未实现）',
      },
    };
  }

  // スクリプトログ取得（lastRunAt/lastRunStatusに基づく実行履歴）
  // 获取脚本日志（基于lastRunAt/lastRunStatus的执行历史）
  async getScriptLogs(tenantId: string, id: string) {
    const script = await this.findScriptById(tenantId, id);

    // スクリプト実行ログテーブルがないため、スクリプト自体の実行履歴を返す
    // 由于没有脚本执行日志表，返回脚本本身的执行历史
    return {
      scriptId: id,
      lastRunAt: script.lastRunAt,
      lastRunStatus: script.lastRunStatus,
      items: script.lastRunAt ? [{
        executedAt: script.lastRunAt,
        status: script.lastRunStatus,
      }] : [],
      total: script.lastRunAt ? 1 : 0,
    };
  }

  // ===== カスタムフィールド拡張 / 自定义字段扩展 =====

  // カスタムフィールドID検索 / 按ID查找自定义字段
  async findCustomFieldById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(customFieldDefinitions)
      .where(and(eq(customFieldDefinitions.id, id), eq(customFieldDefinitions.tenantId, tenantId)))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('EXT_CUSTOM_FIELD_NOT_FOUND', `ID: ${id}`);
    }
    return rows[0];
  }

  // ===== 自動処理ルール拡張 / 自动处理规则扩展 =====

  // 自動処理ルールID検索 / 按ID查找自动处理规则
  async findAutoProcessingRuleById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(autoProcessingRules)
      .where(and(eq(autoProcessingRules.id, id), eq(autoProcessingRules.tenantId, tenantId)))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('EXT_AUTO_RULE_NOT_FOUND', `ID: ${id}`);
    }
    return rows[0];
  }

  // 自動処理ルールログ取得（実行履歴は将来のログテーブルで管理）
  // 获取自动处理规则日志（执行历史将来通过日志表管理）
  async getAutoProcessingRuleLogs(tenantId: string, id: string) {
    // 存在確認 / 确认存在
    await this.findAutoProcessingRuleById(tenantId, id);

    return {
      ruleId: id,
      items: [],
      total: 0,
      message: 'Execution logs will be recorded here / 実行ログはここに記録される / 执行日志将记录在此',
    };
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
