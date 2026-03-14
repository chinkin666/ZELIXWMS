/**
 * 扩展系统类型定义 / 拡張システム型定義
 *
 * Extension Architecture v1 の基盤型。
 * 所有扩展模块共用此类型文件。
 * すべての拡張モジュールがこの型ファイルを共有する。
 */

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

// ─── Hook 处理器 / Hook ハンドラ ───

export interface HookContext {
  /** 事件名 / イベント名 */
  event: HookEventName;
  /** 事件载荷 / イベントペイロード */
  payload: Record<string, unknown>;
  /** 租户ID / テナントID（存在する場合） */
  tenantId?: string;
  /** 事件发生时间 / イベント発生時刻 */
  timestamp: Date;
}

export interface HookHandlerOptions {
  /** 优先级: 0=最高, 100=最低 / 優先度: 0=最高, 100=最低 */
  priority?: number;
  /**
   * 异步模式: true=fire-and-forget, false=await 结果
   * 非同期モード: true=fire-and-forget, false=結果をawait
   */
  async?: boolean;
}

export type HookHandlerFn = (ctx: HookContext) => Promise<void>;

export interface HookHandler {
  /** 处理器名称 / ハンドラ名 */
  name: string;
  /** 所属插件名（可选）/ 所属プラグイン名（任意） */
  pluginName?: string;
  /** 优先级 / 優先度 */
  priority: number;
  /** 异步模式 / 非同期モード */
  async: boolean;
  /** 处理函数 / ハンドラ関数 */
  handler: HookHandlerFn;
}

// ─── 事件发射选项 / イベント発行オプション ───

export interface EmitOptions {
  /** 租户ID / テナントID */
  tenantId?: string;
  /**
   * 是否同步等待所有handler完成 / すべてのhandlerの完了を同期的に待つか
   * 默认 false（异步分发）/ デフォルト false（非同期配信）
   */
  awaitAll?: boolean;
}

// ─── 事件日志 / イベントログ ───

export type EventLogSource = 'engine' | 'plugin' | 'script' | 'webhook';
export type EventLogStatus = 'emitted' | 'processed' | 'error';

export interface IEventLog {
  event: string;
  source: EventLogSource;
  sourceName?: string;
  tenantId?: string;
  payload?: Record<string, unknown>;
  status: EventLogStatus;
  error?: string;
  duration: number;
  createdAt: Date;
}
