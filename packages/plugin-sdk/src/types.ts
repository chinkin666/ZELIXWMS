/**
 * @zelix/plugin-sdk 核心类型定义 / コア型定義
 *
 * 所有插件开发共用此类型文件。
 * すべてのプラグイン開発がこの型ファイルを共有する。
 */

import type { Router, Request, Response, NextFunction } from 'express';

// ─── Hook 事件名称 / Hook イベント名 ───

export const HOOK_EVENTS = {
  // 出库订单 / 出荷指示
  ORDER_CREATED: 'order.created',
  ORDER_CONFIRMED: 'order.confirmed',
  ORDER_SHIPPED: 'order.shipped',
  ORDER_CANCELLED: 'order.cancelled',
  ORDER_HELD: 'order.held',
  ORDER_UNHELD: 'order.unheld',

  // 库存 / 在庫
  INVENTORY_CHANGED: 'inventory.changed',
  STOCK_RESERVED: 'stock.reserved',
  STOCK_RELEASED: 'stock.released',

  // Wave / ウェーブ
  WAVE_CREATED: 'wave.created',
  WAVE_COMPLETED: 'wave.completed',

  // 仓库任务 / 倉庫タスク
  TASK_CREATED: 'task.created',
  TASK_COMPLETED: 'task.completed',

  // 入库 / 入庫
  INBOUND_RECEIVED: 'inbound.received',
  INBOUND_PUTAWAY_COMPLETED: 'inbound.putaway.completed',

  // 退货 / 返品
  RETURN_COMPLETED: 'return.completed',

  // 盘点 / 棚卸
  STOCKTAKING_COMPLETED: 'stocktaking.completed',
} as const;

export type HookEventName = (typeof HOOK_EVENTS)[keyof typeof HOOK_EVENTS];

// ─── Hook 上下文 / Hook コンテキスト ───

export interface HookContext<T = Record<string, unknown>> {
  /** 事件名 / イベント名 */
  event: HookEventName;
  /** 事件载荷 / イベントペイロード */
  payload: T;
  /** 租户ID / テナントID */
  tenantId?: string;
  /** 事件发生时间 / イベント発生時刻 */
  timestamp: Date;
}

// ─── Hook 处理器选项 / Hook ハンドラオプション ───

export interface HookHandlerOptions {
  /** 优先级: 0=最高, 100=最低（默认50）/ 優先度: 0=最高, 100=最低（デフォルト50） */
  priority?: number;
  /**
   * 异步模式: true=fire-and-forget, false=await 结果（默认true）
   * 非同期モード: true=fire-and-forget, false=結果をawait（デフォルト true）
   */
  async?: boolean;
}

export type HookHandlerFn<T = Record<string, unknown>> = (ctx: HookContext<T>) => Promise<void>;

// ─── 事件载荷类型 / イベントペイロード型 ───

/** 出荷指示相关载荷 / 出荷指示関連ペイロード */
export interface OrderPayload {
  orderId: string;
  orderNumber?: string;
  order?: {
    _id: string;
    orderNumber: string;
    status: string;
    carrierId?: string;
    trackingId?: string;
    consignee?: Record<string, unknown>;
    shipper?: Record<string, unknown>;
    items?: Array<{
      productSku: string;
      productName: string;
      quantity: number;
    }>;
    [key: string]: unknown;
  };
  reason?: string;
}

/** 库存变化载荷 / 在庫変動ペイロード */
export interface InventoryPayload {
  orderId?: string;
  type?: 'inbound' | 'outbound' | 'adjustment' | 'return';
  movedCount?: number;
  sku?: string;
  currentStock?: number;
}

/** 库存保留载荷 / 在庫引当ペイロード */
export interface StockReservedPayload {
  orderId: string;
  orderNumber: string;
  reservationCount: number;
  errors: Array<{ sku: string; message: string }>;
}

/** 库存释放载荷 / 在庫リリースペイロード */
export interface StockReleasedPayload {
  orderId: string;
  cancelledCount: number;
  remainingStock?: number;
  sku?: string;
}

/** Wave 载荷 / Wave ペイロード */
export interface WavePayload {
  waveId: string;
  waveNumber: string;
  shipmentCount?: number;
}

/** 仓库任务载荷 / 倉庫タスクペイロード */
export interface TaskPayload {
  taskId: string;
  taskNumber: string;
  type: 'picking' | 'packing' | 'putaway' | 'replenishment' | 'relocation' | 'inspection';
  productSku?: string;
  referenceNumber?: string;
  completedQuantity?: number;
  durationMs?: number;
}

/** 入库载荷 / 入庫ペイロード */
export interface InboundPayload {
  orderId: string;
  orderNumber: string;
}

/** 退货载荷 / 返品ペイロード */
export interface ReturnPayload {
  returnOrderId: string;
  returnNumber: string;
  restockedTotal: number;
  disposedTotal: number;
}

/** 盘点载荷 / 棚卸ペイロード */
export interface StocktakingPayload {
  orderId: string;
  orderNumber: string;
  adjustedCount: number;
  errorCount: number;
}

/** 事件→载荷类型映射 / イベント→ペイロード型マッピング */
export interface HookEventPayloadMap {
  'order.created': OrderPayload;
  'order.confirmed': OrderPayload;
  'order.shipped': OrderPayload;
  'order.cancelled': OrderPayload;
  'order.held': OrderPayload;
  'order.unheld': OrderPayload;
  'inventory.changed': InventoryPayload;
  'stock.reserved': StockReservedPayload;
  'stock.released': StockReleasedPayload;
  'wave.created': WavePayload;
  'wave.completed': WavePayload;
  'task.created': TaskPayload;
  'task.completed': TaskPayload;
  'inbound.received': InboundPayload;
  'inbound.putaway.completed': InboundPayload;
  'return.completed': ReturnPayload;
  'stocktaking.completed': StocktakingPayload;
}

// ─── 插件清单 / プラグインマニフェスト ───

/** 配置项类型 / 設定項目タイプ */
export type ConfigFieldType = 'string' | 'number' | 'boolean' | 'select';

/** 配置项定义 / 設定項目定義 */
export interface ConfigFieldDefinition<T = unknown> {
  type: ConfigFieldType;
  default?: T;
  description?: string;
  /** select 类型的选项 / select タイプのオプション */
  options?: string[];
  /** 是否必填 / 必須かどうか */
  required?: boolean;
}

export interface PluginManifest<TConfig extends Record<string, ConfigFieldDefinition> = Record<string, ConfigFieldDefinition>> {
  /** 插件唯一名称（kebab-case）/ プラグイン一意名称（kebab-case） */
  name: string;
  /** 语义化版本号 / セマンティックバージョン */
  version: string;
  /** 描述 / 説明 */
  description: string;
  /** 作者 / 作者 */
  author: string;
  /** 订阅的 Hook 事件 / サブスクライブする Hook イベント */
  hooks: HookEventName[];
  /** 所需权限 / 必要な権限 */
  permissions: string[];
  /** 可配置项定义 / 設定項目定義 */
  config?: TConfig;
  /** 最低 SDK 版本要求 / 最低 SDK バージョン要件 */
  sdkVersion?: string;
  /** 标签 / タグ */
  tags?: string[];
}

// ─── 插件上下文 / プラグインコンテキスト ───

/** 类型安全的 Logger / 型安全なロガー */
export interface PluginLogger {
  info(obj: Record<string, unknown>, msg?: string): void;
  warn(obj: Record<string, unknown>, msg?: string): void;
  error(obj: Record<string, unknown>, msg?: string): void;
  debug(obj: Record<string, unknown>, msg?: string): void;
}

/** 模型代理 — 安全访问宿主模型 / モデルプロキシ — ホストモデルへの安全なアクセス */
export interface ModelProxy {
  /**
   * 获取模型实例（延迟加载，避免循环依赖）
   * モデルインスタンスを取得（遅延ロード、循環依存回避）
   *
   * @param name 模型名称 / モデル名 (e.g. 'ShipmentOrder', 'Product', 'Stock')
   * @returns Mongoose Model 实例 / Mongoose Model インスタンス
   */
  getModel(name: string): unknown;

  /**
   * 获取可用模型名称列表 / 使用可能なモデル名一覧を取得
   */
  getAvailableModels(): string[];
}

export interface PluginContext<TConfig = Record<string, unknown>> {
  /**
   * 注册 Hook 处理器（类型安全版本）
   * Hook ハンドラを登録（型安全バージョン）
   */
  registerHook<E extends HookEventName>(
    event: E,
    handler: HookHandlerFn<E extends keyof HookEventPayloadMap ? HookEventPayloadMap[E] : Record<string, unknown>>,
    options?: HookHandlerOptions,
  ): void;

  /**
   * 注册自定义 API 路由（挂载到 /api/plugins/<pluginName>/*）
   * カスタム API ルートを登録（/api/plugins/<pluginName>/* にマウント）
   */
  registerAPI(router: Router): void;

  /**
   * 注册中间件 / ミドルウェアを登録
   */
  registerMiddleware?(middleware: (req: Request, res: Response, next: NextFunction) => void): void;

  /**
   * 获取当前租户配置 / テナント設定を取得
   */
  getConfig(tenantId?: string): Promise<TConfig>;

  /**
   * 插件 Logger / プラグインロガー
   */
  logger: PluginLogger;

  /**
   * 模型代理 — 安全访问宿主数据模型 / モデルプロキシ — ホストデータモデルへの安全なアクセス
   */
  models: ModelProxy;

  /**
   * 宿主 SDK 版本 / ホスト SDK バージョン
   */
  sdkVersion: string;
}

// ─── 插件定义 / プラグイン定義 ───

export interface PluginDefinition<TConfig = Record<string, unknown>> {
  /** 插件清单 / プラグインマニフェスト */
  manifest: PluginManifest;

  /**
   * 安装回调 — 注册 Hook、API、初始化资源
   * インストールコールバック — Hook・API を登録、リソースを初期化
   */
  install(ctx: PluginContext<TConfig>): Promise<void>;

  /**
   * 卸载回调 — 清理资源
   * アンインストールコールバック — リソースをクリーンアップ
   */
  uninstall?(): Promise<void>;

  /**
   * 健康检查 — 插件自诊断
   * ヘルスチェック — プラグインの自己診断
   */
  healthCheck?(): Promise<{ healthy: boolean; message?: string }>;
}

// ─── 插件信息（运行时）/ プラグイン情報（ランタイム）───

export interface PluginInfo {
  name: string;
  version: string;
  description: string;
  author: string;
  status: 'enabled' | 'disabled' | 'error';
  hooks: string[];
  permissions: string[];
  config?: PluginManifest['config'];
  errorMessage?: string;
  installedAt?: Date;
  enabledAt?: Date;
}
