# ZELIXWMS 事件驱动架构设计
# ZELIXWMS イベント駆動アーキテクチャ設計

> 版本 / バージョン: 1.0
> 日期 / 日付: 2026-03-21
> 状态 / ステータス: Accepted

---

## 目录 / 目次

1. [事件架构总览 / イベントアーキテクチャ概要](#1-事件架构总览--イベントアーキテクチャ概要)
2. [领域事件定义 / ドメインイベント定義](#2-领域事件定义--ドメインイベント定義)
3. [BullMQ 队列设计 / BullMQ キュー設計](#3-bullmq-队列设计--bullmq-キュー設計)
4. [事件订阅矩阵 / イベント購読マトリクス](#4-事件订阅矩阵--イベント購読マトリクス)
5. [Saga / 编排模式 / Saga / オーケストレーションパターン](#5-saga--编排模式--saga--オーケストレーションパターン)
6. [幂等性设计 / 冪等性設計](#6-幂等性设计--冪等性設計)
7. [监控与可观测性 / 監視・可観測性](#7-监控与可观测性--監視可観測性)

---

## 1. 事件架构总览 / イベントアーキテクチャ概要

### 1.1 三层事件体系 / 3層イベント体系

ZELIXWMS 采用三层事件体系，各层职责分明：
ZELIXWMS は3層イベント体系を採用し、各層の責務を明確に分離する：

| 层 / レイヤー | 技术 / 技術 | 用途 / 用途 | 延迟 / レイテンシ |
|---|---|---|---|
| **In-Process Events** | NestJS EventEmitter2 | 同步领域事件、模块间解耦 / 同期ドメインイベント・モジュール間デカップリング | < 1ms |
| **Async Jobs** | BullMQ + Redis | 后台任务、重试、延迟执行 / バックグラウンドジョブ・リトライ・遅延実行 | 10ms ~ 分钟级 / 分単位 |
| **External Events** | Webhooks (HTTP POST) | 外部系统通知、第三方集成 / 外部システム通知・サードパーティ連携 | 100ms ~ 秒级 / 秒単位 |

### 1.2 事件流全局图 / イベントフロー全体図

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ZELIXWMS Application                         │
│                                                                     │
│  ┌──────────┐   emit()    ┌──────────────────────┐                  │
│  │ Service  │────────────▶│  EventEmitter2       │                  │
│  │  Layer   │             │  (In-Process Bus)    │                  │
│  └──────────┘             └──────┬───────────────┘                  │
│                                  │                                   │
│                    ┌─────────────┼─────────────┐                    │
│                    │             │             │                     │
│                    ▼             ▼             ▼                     │
│  ┌──────────────┐ ┌──────────┐ ┌────────────────┐                  │
│  │ Sync         │ │ Queue    │ │ Notification   │                  │
│  │ Handlers     │ │ Dispatch │ │ Dispatch       │                  │
│  │ (validation, │ │          │ │                │                  │
│  │  cache bust) │ │          │ │                │                  │
│  └──────────────┘ └────┬─────┘ └───────┬────────┘                  │
│                        │               │                            │
│                        ▼               ▼                            │
│  ┌─────────────────────────────────────────────────┐               │
│  │              BullMQ (Redis-backed)               │               │
│  │                                                  │               │
│  │  ┌───────────┐ ┌──────────┐ ┌────────────────┐  │               │
│  │  │wms-webhook│ │wms-email │ │ wms-report     │  │               │
│  │  ├───────────┤ ├──────────┤ ├────────────────┤  │               │
│  │  │wms-import │ │wms-export│ │ wms-audit      │  │               │
│  │  ├───────────┤ ├──────────┤ ├────────────────┤  │               │
│  │  │wms-script │ │wms-notif │ │ wms-scheduled  │  │               │
│  │  └───────────┘ └──────────┘ └────────────────┘  │               │
│  └──────────────────────┬──────────────────────────┘               │
│                         │                                           │
└─────────────────────────┼───────────────────────────────────────────┘
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
     ┌──────────┐  ┌──────────┐  ┌──────────┐
     │ External │  │  Email   │  │ Carrier  │
     │ Webhooks │  │ Provider │  │ APIs     │
     │ (HTTP)   │  │ (SMTP)   │  │ (B2 etc) │
     └──────────┘  └──────────┘  └──────────┘
```

### 1.3 事件生命周期 / イベントライフサイクル

```
 Service 操作完成
        │
        ▼
 EventEmitter2.emit('domain.event', payload)
        │
        ├──▶ [同步 Handler] 验证、缓存失效、聚合更新
        │    / [同期 Handler] バリデーション・キャッシュ無効化・集計更新
        │
        ├──▶ [Queue Dispatcher] → BullMQ Job → Worker → 外部调用
        │    / [キューディスパッチ] → BullMQ ジョブ → Worker → 外部呼出
        │
        └──▶ [Audit Logger] → wms-audit queue → 审计记录持久化
             / [監査ロガー] → wms-audit キュー → 監査記録永続化
```

### 1.4 现行系统与迁移对照 / 現行システムとの対照

现行 Express 系统使用 `HookManager`（自定义 EventBus），迁移到 NestJS 后：
現行 Express システムは `HookManager`（カスタム EventBus）を使用、NestJS 移行後：

| 现行 / 現行 | 迁移后 / 移行後 | 说明 / 説明 |
|---|---|---|
| `HookManager.emit()` | `EventEmitter2.emit()` | NestJS 标准化 / NestJS 標準化 |
| `HookManager.register()` | `@OnEvent()` decorator | 声明式注册 / 宣言的登録 |
| `extensionManager.emit()` | `EventEmitter2` + `QueueModule` | 统一事件入口 / 統一イベントエントリ |
| `queueManager.addJob()` | `@InjectQueue()` + `queue.add()` | NestJS DI 集成 / NestJS DI 統合 |
| `HOOK_EVENTS` 常量 | `DomainEvents` enum | 类型安全增强 / 型安全性強化 |

---

## 2. 领域事件定义 / ドメインイベント定義

### 2.1 事件命名规则 / イベント命名規則

```
{bounded-context}.{entity}.{action}
```

- 全部小写，点号分隔 / すべて小文字、ドット区切り
- 过去时态表示已发生 / 過去形で発生済みを表す
- 例 / 例: `product.created`, `shipment.picking.started`

### 2.2 基础事件接口 / ベースイベントインタフェース

```typescript
/**
 * 所有领域事件的基础接口 / すべてのドメインイベントのベースインタフェース
 */
export interface BaseDomainEvent {
  /** 事件唯一ID（用于幂等性）/ イベント一意ID（冪等性用） */
  readonly eventId: string;
  /** 事件名称 / イベント名 */
  readonly eventName: string;
  /** 租户ID / テナントID */
  readonly tenantId: string;
  /** 事件发生时间 / イベント発生時刻 */
  readonly occurredAt: Date;
  /** 触发用户ID（可选）/ トリガーユーザID（任意） */
  readonly triggeredBy?: string;
  /** 相关ID（聚合根ID）/ 関連ID（集約ルートID） */
  readonly aggregateId: string;
  /** 元数据 / メタデータ */
  readonly metadata?: Record<string, unknown>;
}
```

### 2.3 Product Events — 商品事件 / 商品イベント

```typescript
// ─── product.created ───
export interface ProductCreatedEvent extends BaseDomainEvent {
  eventName: 'product.created';
  payload: {
    productId: string;
    sku: string;
    name: string;
    tenantId: string;
    clientId?: string;
    barcode?: string;
  };
}

// ─── product.updated ───
export interface ProductUpdatedEvent extends BaseDomainEvent {
  eventName: 'product.updated';
  payload: {
    productId: string;
    sku: string;
    tenantId: string;
    changes: Record<string, { from: unknown; to: unknown }>;
  };
}

// ─── product.deleted ───
export interface ProductDeletedEvent extends BaseDomainEvent {
  eventName: 'product.deleted';
  payload: {
    productId: string;
    sku: string;
    tenantId: string;
    deletedAt: Date;
  };
}

// ─── product.imported ───
export interface ProductImportedEvent extends BaseDomainEvent {
  eventName: 'product.imported';
  payload: {
    tenantId: string;
    totalCount: number;
    successCount: number;
    errorCount: number;
    errors: Array<{ row: number; message: string }>;
    importedBy: string;
  };
}
```

### 2.4 Inbound Events — 入库事件 / 入庫イベント

```typescript
// ─── inbound.created ───
export interface InboundCreatedEvent extends BaseDomainEvent {
  eventName: 'inbound.created';
  payload: {
    inboundOrderId: string;
    orderNumber: string;
    tenantId: string;
    clientId: string;
    expectedDate?: Date;
    lineCount: number;
  };
}

// ─── inbound.confirmed ───
export interface InboundConfirmedEvent extends BaseDomainEvent {
  eventName: 'inbound.confirmed';
  payload: {
    inboundOrderId: string;
    orderNumber: string;
    tenantId: string;
    confirmedBy: string;
    confirmedAt: Date;
  };
}

// ─── inbound.line.received ───
export interface InboundLineReceivedEvent extends BaseDomainEvent {
  eventName: 'inbound.line.received';
  payload: {
    inboundOrderId: string;
    lineId: string;
    tenantId: string;
    productId: string;
    sku: string;
    expectedQuantity: number;
    receivedQuantity: number;
    damagedQuantity: number;
    lotNumber?: string;
    receivedBy: string;
  };
}

// ─── inbound.completed ───
export interface InboundCompletedEvent extends BaseDomainEvent {
  eventName: 'inbound.completed';
  payload: {
    inboundOrderId: string;
    orderNumber: string;
    tenantId: string;
    totalReceived: number;
    totalDamaged: number;
    completedAt: Date;
  };
}

// ─── inbound.line.putaway ───
export interface InboundLinePutawayEvent extends BaseDomainEvent {
  eventName: 'inbound.line.putaway';
  payload: {
    inboundOrderId: string;
    lineId: string;
    tenantId: string;
    productId: string;
    locationId: string;
    locationCode: string;
    quantity: number;
    lotNumber?: string;
    putawayBy: string;
  };
}

// ─── inbound.cancelled ───
export interface InboundCancelledEvent extends BaseDomainEvent {
  eventName: 'inbound.cancelled';
  payload: {
    inboundOrderId: string;
    orderNumber: string;
    tenantId: string;
    reason: string;
    cancelledBy: string;
  };
}
```

### 2.5 Inventory Events — 库存事件 / 在庫イベント

```typescript
// ─── stock.reserved ───
export interface StockReservedEvent extends BaseDomainEvent {
  eventName: 'stock.reserved';
  payload: {
    tenantId: string;
    productId: string;
    sku: string;
    locationId: string;
    quantity: number;
    referenceType: 'shipment_order' | 'return_order';
    referenceId: string;
    lotNumber?: string;
  };
}

// ─── stock.released ───
export interface StockReleasedEvent extends BaseDomainEvent {
  eventName: 'stock.released';
  payload: {
    tenantId: string;
    productId: string;
    sku: string;
    locationId: string;
    quantity: number;
    referenceType: string;
    referenceId: string;
    reason: 'cancel' | 'adjustment' | 'expiry';
  };
}

// ─── stock.adjusted ───
export interface StockAdjustedEvent extends BaseDomainEvent {
  eventName: 'stock.adjusted';
  payload: {
    tenantId: string;
    productId: string;
    sku: string;
    locationId: string;
    previousQuantity: number;
    newQuantity: number;
    adjustmentType: 'increase' | 'decrease' | 'correction';
    reason: string;
    adjustedBy: string;
  };
}

// ─── stock.transferred ───
export interface StockTransferredEvent extends BaseDomainEvent {
  eventName: 'stock.transferred';
  payload: {
    tenantId: string;
    productId: string;
    sku: string;
    fromLocationId: string;
    toLocationId: string;
    quantity: number;
    lotNumber?: string;
    transferredBy: string;
  };
}

// ─── stock.low_alert ───
export interface StockLowAlertEvent extends BaseDomainEvent {
  eventName: 'stock.low_alert';
  payload: {
    tenantId: string;
    productId: string;
    sku: string;
    productName: string;
    currentQuantity: number;
    minimumThreshold: number;
    locationId?: string;
  };
}

// ─── stock.lot.expired ───
export interface StockLotExpiredEvent extends BaseDomainEvent {
  eventName: 'stock.lot.expired';
  payload: {
    tenantId: string;
    productId: string;
    sku: string;
    lotNumber: string;
    lotId: string;
    expirationDate: Date;
    affectedQuantity: number;
    locationId: string;
  };
}
```

### 2.6 Shipment Events — 出库事件 / 出庫イベント

```typescript
// ─── shipment.created ───
export interface ShipmentCreatedEvent extends BaseDomainEvent {
  eventName: 'shipment.created';
  payload: {
    shipmentOrderId: string;
    orderNumber: string;
    tenantId: string;
    clientId: string;
    lineCount: number;
    totalQuantity: number;
    priority: 'normal' | 'high' | 'urgent';
  };
}

// ─── shipment.confirmed ───
export interface ShipmentConfirmedEvent extends BaseDomainEvent {
  eventName: 'shipment.confirmed';
  payload: {
    shipmentOrderId: string;
    orderNumber: string;
    tenantId: string;
    confirmedBy: string;
    confirmedAt: Date;
  };
}

// ─── shipment.picking.started ───
export interface ShipmentPickingStartedEvent extends BaseDomainEvent {
  eventName: 'shipment.picking.started';
  payload: {
    shipmentOrderId: string;
    orderNumber: string;
    tenantId: string;
    waveId?: string;
    taskId: string;
    pickerUserId: string;
  };
}

// ─── shipment.packed ───
export interface ShipmentPackedEvent extends BaseDomainEvent {
  eventName: 'shipment.packed';
  payload: {
    shipmentOrderId: string;
    orderNumber: string;
    tenantId: string;
    packageCount: number;
    totalWeight: number;
    packedBy: string;
  };
}

// ─── shipment.shipped ───
export interface ShipmentShippedEvent extends BaseDomainEvent {
  eventName: 'shipment.shipped';
  payload: {
    shipmentOrderId: string;
    orderNumber: string;
    tenantId: string;
    carrierId: string;
    carrierName: string;
    trackingNumber: string;
    shippedAt: Date;
  };
}

// ─── shipment.delivered ───
export interface ShipmentDeliveredEvent extends BaseDomainEvent {
  eventName: 'shipment.delivered';
  payload: {
    shipmentOrderId: string;
    orderNumber: string;
    tenantId: string;
    deliveredAt: Date;
    signedBy?: string;
  };
}

// ─── shipment.cancelled ───
export interface ShipmentCancelledEvent extends BaseDomainEvent {
  eventName: 'shipment.cancelled';
  payload: {
    shipmentOrderId: string;
    orderNumber: string;
    tenantId: string;
    reason: string;
    cancelledBy: string;
    stockReleased: boolean;
  };
}

// ─── shipment.carrier.assigned ───
export interface ShipmentCarrierAssignedEvent extends BaseDomainEvent {
  eventName: 'shipment.carrier.assigned';
  payload: {
    shipmentOrderId: string;
    orderNumber: string;
    tenantId: string;
    carrierId: string;
    carrierName: string;
    serviceType: string;
    assignedBy: string;
  };
}

// ─── shipment.tracking.updated ───
export interface ShipmentTrackingUpdatedEvent extends BaseDomainEvent {
  eventName: 'shipment.tracking.updated';
  payload: {
    shipmentOrderId: string;
    orderNumber: string;
    tenantId: string;
    trackingNumber: string;
    carrierStatus: string;
    statusDetail?: string;
    estimatedDelivery?: Date;
    updatedAt: Date;
  };
}
```

### 2.7 Billing Events — 计费事件 / 請求イベント

```typescript
// ─── billing.calculated ───
export interface BillingCalculatedEvent extends BaseDomainEvent {
  eventName: 'billing.calculated';
  payload: {
    tenantId: string;
    clientId: string;
    periodStart: Date;
    periodEnd: Date;
    totalAmount: number;
    currency: string;
    lineItemCount: number;
  };
}

// ─── billing.invoice.generated ───
export interface BillingInvoiceGeneratedEvent extends BaseDomainEvent {
  eventName: 'billing.invoice.generated';
  payload: {
    tenantId: string;
    invoiceId: string;
    invoiceNumber: string;
    clientId: string;
    totalAmount: number;
    currency: string;
    dueDate: Date;
    pdfUrl?: string;
  };
}

// ─── billing.charge.created ───
export interface BillingChargeCreatedEvent extends BaseDomainEvent {
  eventName: 'billing.charge.created';
  payload: {
    tenantId: string;
    chargeId: string;
    clientId: string;
    chargeType: 'storage' | 'handling' | 'shipping' | 'work' | 'other';
    amount: number;
    currency: string;
    referenceType: string;
    referenceId: string;
    description: string;
  };
}
```

### 2.8 Return Events — 退货事件 / 返品イベント

```typescript
// ─── return.created ───
export interface ReturnCreatedEvent extends BaseDomainEvent {
  eventName: 'return.created';
  payload: {
    returnOrderId: string;
    returnNumber: string;
    tenantId: string;
    originalShipmentId?: string;
    clientId: string;
    lineCount: number;
    reason: string;
  };
}

// ─── return.inspected ───
export interface ReturnInspectedEvent extends BaseDomainEvent {
  eventName: 'return.inspected';
  payload: {
    returnOrderId: string;
    returnNumber: string;
    tenantId: string;
    lineId: string;
    productId: string;
    condition: 'good' | 'damaged' | 'defective' | 'expired';
    quantity: number;
    inspectedBy: string;
    disposition: 'restock' | 'dispose' | 'quarantine';
  };
}

// ─── return.restocked ───
export interface ReturnRestockedEvent extends BaseDomainEvent {
  eventName: 'return.restocked';
  payload: {
    returnOrderId: string;
    tenantId: string;
    productId: string;
    sku: string;
    locationId: string;
    quantity: number;
    lotNumber?: string;
  };
}

// ─── return.disposed ───
export interface ReturnDisposedEvent extends BaseDomainEvent {
  eventName: 'return.disposed';
  payload: {
    returnOrderId: string;
    tenantId: string;
    productId: string;
    sku: string;
    quantity: number;
    disposalMethod: 'destroy' | 'return_to_vendor' | 'donate';
    disposedBy: string;
  };
}
```

### 2.9 System Events — 系统事件 / システムイベント

```typescript
// ─── user.logged_in ───
export interface UserLoggedInEvent extends BaseDomainEvent {
  eventName: 'user.logged_in';
  payload: {
    userId: string;
    tenantId: string;
    ipAddress: string;
    userAgent: string;
    loginMethod: 'password' | 'sso' | 'api_key';
  };
}

// ─── user.created ───
export interface UserCreatedEvent extends BaseDomainEvent {
  eventName: 'user.created';
  payload: {
    userId: string;
    tenantId: string;
    email: string;
    role: string;
    createdBy: string;
  };
}

// ─── settings.updated ───
export interface SettingsUpdatedEvent extends BaseDomainEvent {
  eventName: 'settings.updated';
  payload: {
    tenantId: string;
    section: string;
    changes: Record<string, { from: unknown; to: unknown }>;
    updatedBy: string;
  };
}

// ─── webhook.delivered ───
export interface WebhookDeliveredEvent extends BaseDomainEvent {
  eventName: 'webhook.delivered';
  payload: {
    webhookId: string;
    tenantId: string;
    url: string;
    event: string;
    httpStatus: number;
    responseTimeMs: number;
    success: boolean;
  };
}
```

### 2.10 事件名称常量枚举 / イベント名定数 Enum

```typescript
/**
 * 所有领域事件名称常量 / すべてのドメインイベント名定数
 * 现行 HOOK_EVENTS 的超集 / 現行 HOOK_EVENTS のスーパーセット
 */
export const DOMAIN_EVENTS = {
  // ── Product / 商品 ──
  PRODUCT_CREATED:           'product.created',
  PRODUCT_UPDATED:           'product.updated',
  PRODUCT_DELETED:           'product.deleted',
  PRODUCT_IMPORTED:          'product.imported',

  // ── Inbound / 入庫 ──
  INBOUND_CREATED:           'inbound.created',
  INBOUND_CONFIRMED:         'inbound.confirmed',
  INBOUND_LINE_RECEIVED:     'inbound.line.received',
  INBOUND_COMPLETED:         'inbound.completed',
  INBOUND_LINE_PUTAWAY:      'inbound.line.putaway',
  INBOUND_CANCELLED:         'inbound.cancelled',

  // ── Inventory / 在庫 ──
  STOCK_RESERVED:            'stock.reserved',
  STOCK_RELEASED:            'stock.released',
  STOCK_ADJUSTED:            'stock.adjusted',
  STOCK_TRANSFERRED:         'stock.transferred',
  STOCK_LOW_ALERT:           'stock.low_alert',
  STOCK_LOT_EXPIRED:         'stock.lot.expired',

  // ── Shipment / 出庫 ──
  SHIPMENT_CREATED:          'shipment.created',
  SHIPMENT_CONFIRMED:        'shipment.confirmed',
  SHIPMENT_PICKING_STARTED:  'shipment.picking.started',
  SHIPMENT_PACKED:           'shipment.packed',
  SHIPMENT_SHIPPED:          'shipment.shipped',
  SHIPMENT_DELIVERED:        'shipment.delivered',
  SHIPMENT_CANCELLED:        'shipment.cancelled',
  SHIPMENT_CARRIER_ASSIGNED: 'shipment.carrier.assigned',
  SHIPMENT_TRACKING_UPDATED: 'shipment.tracking.updated',

  // ── Billing / 請求 ──
  BILLING_CALCULATED:        'billing.calculated',
  BILLING_INVOICE_GENERATED: 'billing.invoice.generated',
  BILLING_CHARGE_CREATED:    'billing.charge.created',

  // ── Return / 返品 ──
  RETURN_CREATED:            'return.created',
  RETURN_INSPECTED:          'return.inspected',
  RETURN_RESTOCKED:          'return.restocked',
  RETURN_DISPOSED:           'return.disposed',

  // ── System / システム ──
  USER_LOGGED_IN:            'user.logged_in',
  USER_CREATED:              'user.created',
  SETTINGS_UPDATED:          'settings.updated',
  WEBHOOK_DELIVERED:         'webhook.delivered',

  // ── Warehouse Ops / 倉庫オペレーション ──
  WAVE_CREATED:              'wave.created',
  WAVE_COMPLETED:            'wave.completed',
  TASK_CREATED:              'task.created',
  TASK_COMPLETED:            'task.completed',
  STOCKTAKING_COMPLETED:     'stocktaking.completed',
} as const;

export type DomainEventName = (typeof DOMAIN_EVENTS)[keyof typeof DOMAIN_EVENTS];
```

---

## 3. BullMQ 队列设计 / BullMQ キュー設計

### 3.1 队列总览 / キュー一覧

现行系统有 3 个队列（webhook, script, audit），迁移后扩展到 9 个：
現行システムは3キュー（webhook, script, audit）、移行後は9キューに拡張：

| # | 队列名 / キュー名 | 用途 / 用途 | 并发 / 並行数 | 优先级 / 優先度 |
|---|---|---|---|---|
| 1 | `wms-webhook` | Webhook 投递 / Webhook 配信 | 10 | 支持 / 対応 |
| 2 | `wms-email` | 邮件发送 / メール送信 | 5 | 支持 / 対応 |
| 3 | `wms-report` | 报表生成 / レポート生成 | 2 | 支持 / 対応 |
| 4 | `wms-import` | CSV/Excel 批量导入 / 一括インポート | 3 | 不支持 / 非対応 |
| 5 | `wms-export` | B2 Cloud / 运输商 API 调用 / 配送業者API呼出 | 5 | 支持 / 対応 |
| 6 | `wms-audit` | 审计日志写入 / 監査ログ書込 | 10 | 不支持 / 非対応 |
| 7 | `wms-script` | 自动化脚本执行 / 自動化スクリプト実行 | 3 | 不支持 / 非対応 |
| 8 | `wms-notification` | 推送通知投递 / プッシュ通知配信 | 5 | 支持 / 対応 |
| 9 | `wms-scheduled` | 定时任务 / スケジュールタスク | 2 | 不支持 / 非対応 |

### 3.2 各队列详细设计 / 各キュー詳細設計

#### (1) wms-webhook — Webhook 投递 / Webhook 配信

```typescript
export interface WebhookJobData {
  /** 触发事件名 / トリガーイベント名 */
  event: string;
  /** 事件载荷 / イベントペイロード */
  payload: Record<string, unknown>;
  /** Webhook 配置ID / Webhook 設定ID */
  webhookId: string;
  /** 目标URL / ターゲットURL */
  url: string;
  /** HMAC 签名密钥 / HMAC 署名シークレット */
  secret: string;
  /** 幂等键 / 冪等キー */
  idempotencyKey: string;
  /** 租户ID / テナントID */
  tenantId: string;
}
```

| 配置项 / 設定 | 值 / 値 | 说明 / 説明 |
|---|---|---|
| attempts | 5 | 最大重试次数 / 最大リトライ回数 |
| backoff | exponential, 2000ms | 指数退避：2s → 4s → 8s → 16s → 32s |
| concurrency | 10 | 并行处理数 / 並行処理数 |
| removeOnComplete | { count: 1000 } | 保留最近1000条 / 直近1000件保持 |
| removeOnFail | { count: 5000 } | 保留最近5000条失败记录 / 直近5000件失敗記録保持 |
| priority | 1-10 | 1=最高优先 / 1=最高優先 |
| Dead Letter | `wms-webhook-dlq` | 5次失败后进入DLQ / 5回失敗後DLQへ |

#### (2) wms-email — 邮件发送 / メール送信

```typescript
export interface EmailJobData {
  /** 收件人 / 宛先 */
  to: string[];
  /** 抄送 / CC */
  cc?: string[];
  /** 主题 / 件名 */
  subject: string;
  /** HTML 内容 / HTML コンテンツ */
  html: string;
  /** 纯文本回退 / プレーンテキストフォールバック */
  text?: string;
  /** 附件 / 添付ファイル */
  attachments?: Array<{ filename: string; path: string }>;
  /** 关联事件 / 関連イベント */
  sourceEvent?: string;
  /** 租户ID / テナントID */
  tenantId: string;
  /** 幂等键 / 冪等キー */
  idempotencyKey: string;
}
```

| 配置项 / 設定 | 值 / 値 |
|---|---|
| attempts | 3 |
| backoff | exponential, 5000ms (5s → 10s → 20s) |
| concurrency | 5 |
| removeOnComplete | { count: 500 } |
| Dead Letter | `wms-email-dlq` |

#### (3) wms-report — 报表生成 / レポート生成

```typescript
export interface ReportJobData {
  /** 报表类型 / レポート種別 */
  reportType: 'daily_summary' | 'billing_calculation' | 'inventory_snapshot'
    | 'shipment_summary' | 'kpi_report' | 'custom';
  /** 参数 / パラメータ */
  params: {
    tenantId: string;
    clientId?: string;
    periodStart: Date;
    periodEnd: Date;
    format: 'pdf' | 'csv' | 'xlsx';
  };
  /** 请求用户 / リクエストユーザ */
  requestedBy: string;
  /** 完成后通知 / 完了後通知 */
  notifyOnComplete?: boolean;
}
```

| 配置项 / 設定 | 值 / 値 |
|---|---|
| attempts | 2 |
| backoff | fixed, 30000ms |
| concurrency | 2 (CPU密集型 / CPU集約型) |
| timeout | 300000ms (5分钟 / 5分) |
| Dead Letter | `wms-report-dlq` |

#### (4) wms-import — CSV/Excel 批量导入 / 一括インポート

```typescript
export interface ImportJobData {
  /** 导入类型 / インポート種別 */
  importType: 'products' | 'shipment_orders' | 'inbound_orders' | 'customers' | 'locations';
  /** 文件路径或URL / ファイルパスまたはURL */
  fileUrl: string;
  /** 文件格式 / ファイル形式 */
  fileFormat: 'csv' | 'xlsx';
  /** 列映射配置ID / カラムマッピング設定ID */
  mappingConfigId?: string;
  /** 租户ID / テナントID */
  tenantId: string;
  /** 导入用户 / インポートユーザ */
  importedBy: string;
  /** 重复策略 / 重複戦略 */
  duplicateStrategy: 'skip' | 'update' | 'error';
}
```

| 配置项 / 設定 | 值 / 値 |
|---|---|
| attempts | 1 (不重试 / リトライなし) |
| concurrency | 3 |
| timeout | 600000ms (10分钟 / 10分) |
| Dead Letter | `wms-import-dlq` |

#### (5) wms-export — 运输商 API / 配送業者API

```typescript
export interface ExportJobData {
  /** 导出类型 / エクスポート種別 */
  exportType: 'b2cloud_shipment' | 'sagawa_shipment' | 'carrier_label'
    | 'tracking_update' | 'fba_submission';
  /** 载荷 / ペイロード */
  payload: Record<string, unknown>;
  /** 运输商ID / 配送業者ID */
  carrierId: string;
  /** 关联出库单ID / 関連出庫指示ID */
  shipmentOrderId?: string;
  /** 租户ID / テナントID */
  tenantId: string;
  /** 幂等键 / 冪等キー */
  idempotencyKey: string;
}
```

| 配置项 / 設定 | 值 / 値 | 说明 / 説明 |
|---|---|---|
| attempts | 3 | B2 Cloud 有 session 超时重试 / B2 Cloud はセッションタイムアウトリトライあり |
| backoff | exponential, 3000ms | 3s → 6s → 12s |
| concurrency | 5 | 运输商 API 限流 / 配送業者APIレート制限 |
| priority | 支持 / 対応 | 紧急出库优先 / 緊急出庫優先 |
| Dead Letter | `wms-export-dlq` | |

#### (6) wms-audit — 审计日志 / 監査ログ

```typescript
export interface AuditJobData {
  /** 事件名 / イベント名 */
  event: string;
  /** 来源 / ソース */
  source: 'engine' | 'plugin' | 'script' | 'webhook' | 'api';
  /** 载荷 / ペイロード */
  payload: Record<string, unknown>;
  /** 租户ID / テナントID */
  tenantId?: string;
  /** 处理耗时ms / 処理時間ms */
  duration: number;
  /** 处理器数量 / ハンドラ数 */
  handlerCount: number;
  /** 错误信息 / エラー情報 */
  error?: string;
  /** 操作用户 / 操作ユーザ */
  userId?: string;
  /** IP地址 / IPアドレス */
  ipAddress?: string;
}
```

| 配置项 / 設定 | 值 / 値 |
|---|---|
| attempts | 2 |
| backoff | fixed, 1000ms |
| concurrency | 10 (高吞吐 / 高スループット) |
| removeOnComplete | { count: 500 } |
| Dead Letter | 无 / なし（审计丢失可容忍 / 監査損失許容） |

#### (7) wms-script — 自动化脚本 / 自動化スクリプト

```typescript
export interface ScriptJobData {
  /** 触发事件 / トリガーイベント */
  event: string;
  /** 事件载荷 / イベントペイロード */
  payload: Record<string, unknown>;
  /** 脚本ID / スクリプトID */
  scriptId: string;
  /** 脚本名称 / スクリプト名 */
  scriptName: string;
  /** 租户ID / テナントID */
  tenantId: string;
  /** 超时ms / タイムアウトms */
  timeoutMs?: number;
}
```

| 配置项 / 設定 | 值 / 値 |
|---|---|
| attempts | 1 (脚本不重试 / スクリプトはリトライなし) |
| concurrency | 3 (沙箱隔离 / サンドボックス分離) |
| timeout | 30000ms (30秒) |
| Dead Letter | `wms-script-dlq` |

#### (8) wms-notification — 推送通知 / プッシュ通知

```typescript
export interface NotificationJobData {
  /** 通知渠道 / 通知チャネル */
  channel: 'in_app' | 'push' | 'sms';
  /** 收件人用户ID列表 / 宛先ユーザIDリスト */
  recipientUserIds: string[];
  /** 标题 / タイトル */
  title: string;
  /** 内容 / 内容 */
  body: string;
  /** 优先级 / 優先度 */
  priority: 'low' | 'normal' | 'high' | 'urgent';
  /** 关联类型 / 関連タイプ */
  referenceType?: string;
  /** 关联ID / 関連ID */
  referenceId?: string;
  /** 源事件 / ソースイベント */
  sourceEvent: string;
  /** 租户ID / テナントID */
  tenantId: string;
}
```

| 配置项 / 設定 | 值 / 値 |
|---|---|
| attempts | 3 |
| backoff | exponential, 2000ms |
| concurrency | 5 |
| priority | 支持 / 対応（urgent=1, high=3, normal=5, low=8） |

#### (9) wms-scheduled — 定时任务 / スケジュールタスク

```typescript
export interface ScheduledJobData {
  /** 任务类型 / タスク種別 */
  taskType: 'lot_expiry_check' | 'daily_report_generation' | 'billing_period_close'
    | 'stale_order_cleanup' | 'cache_warmup' | 'tracking_sync';
  /** 参数 / パラメータ */
  params: Record<string, unknown>;
  /** Cron 表达式（仅记录）/ Cron 式（記録のみ） */
  cronExpression: string;
  /** 租户ID（空=全局）/ テナントID（空=グローバル） */
  tenantId?: string;
}
```

| 配置项 / 設定 | 值 / 値 |
|---|---|
| attempts | 2 |
| backoff | fixed, 60000ms |
| concurrency | 2 |
| repeat | BullMQ repeat 配置 (cron) |

### 3.3 Dead Letter Queue (DLQ) 处理策略 / DLQ 処理戦略

```
失败 Job → 超过 max attempts → 移入 DLQ
失敗ジョブ → 最大リトライ超過 → DLQ へ移動

DLQ 处理 / DLQ 処理:
1. 管理画面通知（in_app notification to admin）
2. 定期人工审查 / 定期手動レビュー
3. 重放机制 / リプレイ機構（手動リトライ）
4. 7天后自动删除 / 7日後自動削除
```

---

## 4. 事件订阅矩阵 / イベント購読マトリクス

### 4.1 谁监听什么 / 誰が何を聴くか

下表展示各模块对领域事件的监听关系。S = 同步处理, A = 异步（通过队列）。
各モジュールのドメインイベント購読関係を示す。S = 同期処理, A = 非同期（キュー経由）。

| 事件 / イベント | Inventory | Billing | Notification | Webhook | Audit | Reporting | Extension |
|---|---|---|---|---|---|---|---|
| `product.created` | — | — | — | A | A | — | A |
| `product.updated` | S (cache) | — | — | A | A | — | A |
| `product.deleted` | S (cleanup) | — | — | A | A | — | A |
| `product.imported` | — | — | A | A | A | — | — |
| `inbound.created` | — | — | A | A | A | — | A |
| `inbound.confirmed` | — | — | A | A | A | — | A |
| `inbound.line.received` | S (ledger) | S (charge) | A | A | A | — | A |
| `inbound.completed` | — | S (charge) | A | A | A | S (KPI) | A |
| `inbound.line.putaway` | S (quant) | — | — | A | A | — | A |
| `inbound.cancelled` | S (release) | — | A | A | A | — | A |
| `stock.reserved` | — | — | — | A | A | — | — |
| `stock.released` | — | — | — | A | A | — | — |
| `stock.adjusted` | S (ledger) | — | — | A | A | S (KPI) | A |
| `stock.transferred` | S (ledger) | S (charge) | — | A | A | — | A |
| `stock.low_alert` | — | — | A (urgent) | A | A | — | A |
| `stock.lot.expired` | S (quarantine) | — | A (urgent) | A | A | — | A |
| `shipment.created` | S (reserve) | — | A | A | A | — | A |
| `shipment.confirmed` | — | — | A | A | A | — | A |
| `shipment.picking.started` | — | — | — | A | A | — | — |
| `shipment.packed` | — | S (charge) | A | A | A | — | A |
| `shipment.shipped` | S (deduct) | S (charge) | A (high) | A | A | S (KPI) | A |
| `shipment.delivered` | — | — | A | A | A | S (KPI) | A |
| `shipment.cancelled` | S (release) | S (reverse) | A (high) | A | A | — | A |
| `shipment.carrier.assigned` | — | — | — | A | A | — | A |
| `shipment.tracking.updated` | — | — | A | A | A | — | — |
| `billing.calculated` | — | — | A | A | A | — | — |
| `billing.invoice.generated` | — | — | A (email) | A | A | — | — |
| `billing.charge.created` | — | — | — | — | A | — | — |
| `return.created` | — | — | A | A | A | — | A |
| `return.inspected` | — | — | — | A | A | — | A |
| `return.restocked` | S (quant) | S (credit) | A | A | A | — | A |
| `return.disposed` | — | S (charge) | A | A | A | — | A |
| `user.logged_in` | — | — | — | — | A | — | — |
| `user.created` | — | — | A (welcome) | — | A | — | — |
| `settings.updated` | S (cache) | — | — | — | A | — | — |

### 4.2 Handler 方法命名规则 / Handler メソッド命名規則

```typescript
// NestJS @OnEvent 方式 / NestJS @OnEvent パターン
@Injectable()
export class InventoryEventHandler {
  @OnEvent('shipment.created', { async: false })
  async handleShipmentCreatedReserveStock(event: ShipmentCreatedEvent): Promise<void> {
    // 同步预留库存 / 同期で在庫引当
  }

  @OnEvent('shipment.cancelled', { async: false })
  async handleShipmentCancelledReleaseStock(event: ShipmentCancelledEvent): Promise<void> {
    // 同步释放库存 / 同期で在庫解放
  }
}

@Injectable()
export class WebhookEventDispatcher {
  @OnEvent('**')  // 监听所有事件 / すべてのイベントを監視
  async dispatchToWebhookQueue(event: BaseDomainEvent): Promise<void> {
    // 查找匹配的 webhook 配置，入队 / マッチする webhook 設定を検索しキューへ
  }
}

@Injectable()
export class AuditEventLogger {
  @OnEvent('**')  // 监听所有事件 / すべてのイベントを監視
  async logToAuditQueue(event: BaseDomainEvent): Promise<void> {
    // 全事件记录审计 / 全イベントを監査記録
  }
}
```

---

## 5. Saga / 编排模式 / Saga / オーケストレーションパターン

### 5.1 设计原则 / 設計原則

Saga 用于协调跨多个服务/聚合的复杂业务流程。每个步骤都有对应的补偿操作。
Saga は複数サービス/集約にまたがる複雑なビジネスプロセスを調整する。各ステップには補償操作が対応する。

```
正向流程 / 正常フロー:    Step1 → Step2 → Step3 → Step4 → 完成 / 完了
补偿流程 / 補償フロー:    Step3失敗 → Compensate2 → Compensate1 → 异常处理 / 異常処理
```

### 5.2 Outbound Saga — 出库流程 / 出庫フロー

```
shipment.confirmed
        │
        ▼
┌─ Step 1: 库存预留 / 在庫引当 ──────────────────────────────┐
│  Action:  StockService.reserveForOrder(orderId)             │
│  Event:   stock.reserved                                     │
│  Compensate: StockService.releaseReservation(orderId)       │
│              → stock.released                                │
└──────────────────────────────────────────────────┬──────────┘
                                                   │ OK
                                                   ▼
┌─ Step 2: 运输商分配 / 配送業者割当 ────────────────────────┐
│  Action:  CarrierService.assignCarrier(orderId, rules)      │
│  Event:   shipment.carrier.assigned                          │
│  Compensate: CarrierService.unassign(orderId)               │
│              → (no event, internal rollback)                 │
└──────────────────────────────────────────────────┬──────────┘
                                                   │ OK
                                                   ▼
┌─ Step 3: 送り状生成 / ラベル生成 ──────────────────────────┐
│  Action:  ExportQueue.add('carrier_label', payload)         │
│  Event:   shipment.tracking.updated (with tracking number)  │
│  Compensate: CarrierService.voidLabel(trackingNumber)       │
│              → (void API call to carrier)                    │
└──────────────────────────────────────────────────┬──────────┘
                                                   │ OK
                                                   ▼
┌─ Step 4: ピッキング → 梱包 → 出荷 / Picking → Pack → Ship ┐
│  Action:  TaskService.createPickingTasks(orderId)           │
│  Events:  shipment.picking.started → shipment.packed        │
│           → shipment.shipped                                 │
│  Compensate: TaskService.cancelTasks(orderId)               │
│              → StockService.releaseReservation(orderId)     │
└─────────────────────────────────────────────────────────────┘
```

**Saga 状态机 / Saga ステートマシン:**

```typescript
export type OutboundSagaState =
  | 'initiated'
  | 'stock_reserved'
  | 'carrier_assigned'
  | 'label_generated'
  | 'picking_started'
  | 'packed'
  | 'shipped'
  | 'failed'
  | 'compensating'
  | 'compensated';

export interface OutboundSagaRecord {
  sagaId: string;
  shipmentOrderId: string;
  tenantId: string;
  state: OutboundSagaState;
  steps: Array<{
    step: string;
    status: 'pending' | 'completed' | 'failed' | 'compensated';
    startedAt?: Date;
    completedAt?: Date;
    error?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}
```

### 5.3 Inbound Saga — 入库流程 / 入庫フロー

```
inbound.confirmed
        │
        ▼
┌─ Step 1: 开始验收 / 検品開始 ──────────────────────────────┐
│  Action:  InboundWorkflow.startReceiving(orderId)           │
│  Events:  inbound.line.received (per line)                   │
│  Compensate: InboundService.revertToConfirmed(orderId)      │
└──────────────────────────────────────────────────┬──────────┘
                                                   │ OK
                                                   ▼
┌─ Step 2: 品质检查 / 品質検査 ──────────────────────────────┐
│  Action:  InspectionService.inspect(orderId, results)       │
│  Result:  标记破损品 / 破損品マーク                           │
│  Compensate: InspectionService.resetInspection(orderId)     │
└──────────────────────────────────────────────────┬──────────┘
                                                   │ OK
                                                   ▼
┌─ Step 3: 上架 / 棚入れ ───────────────────────────────────┐
│  Action:  InboundWorkflow.putaway(orderId, locationMap)     │
│  Events:  inbound.line.putaway (per line)                    │
│  Compensate: StockService.reverseMovements(orderId)         │
│              → 从上架位置移回待检区 / 棚入先から検品エリアへ戻す │
└──────────────────────────────────────────────────┬──────────┘
                                                   │ OK
                                                   ▼
┌─ Step 4: 库存更新 / 在庫更新 ──────────────────────────────┐
│  Action:  InventoryLedgerService.record(movements)          │
│  Events:  inbound.completed                                  │
│  Side:    stock.adjusted (if discrepancy)                    │
│  Compensate: InventoryLedgerService.reverseEntries(orderId) │
└─────────────────────────────────────────────────────────────┘
```

### 5.4 Return Saga — 退货流程 / 返品フロー

```
return.created
        │
        ▼
┌─ Step 1: 收货 / 返品受領 ─────────────────────────────────┐
│  Action:  ReturnsService.receiveReturn(returnId)            │
│  Result:  物理的に受け取る / 物理受領                         │
│  Compensate: ReturnsService.revertReceiving(returnId)       │
└──────────────────────────────────────────────────┬──────────┘
                                                   │ OK
                                                   ▼
┌─ Step 2: 检品 / 検品 ────────────────────────────────────┐
│  Action:  ReturnsService.inspectReturn(returnId, results)  │
│  Events:  return.inspected (per line)                       │
│  Result:  disposition = restock | dispose | quarantine      │
│  Compensate: ReturnsService.resetInspection(returnId)      │
└──────────────────────────────────────────────────┬──────────┘
                                                   │
                    ┌──────────────┴──────────────┐
                    ▼                              ▼
        ┌─ Step 3a: 再入库 ─┐         ┌─ Step 3b: 废弃 ─────┐
        │ / 再入庫           │         │ / 廃棄               │
        │ StockService       │         │ ReturnsService       │
        │  .restockReturn()  │         │  .disposeReturn()    │
        │ → return.restocked │         │ → return.disposed    │
        │ Comp: reverse      │         │ Comp: N/A (物理破壊) │
        │   stock move       │         │ / N/A (物理破壊)     │
        └────────┬───────────┘         └────────┬────────────┘
                 │                              │
                 └──────────────┬───────────────┘
                                ▼
        ┌─ Step 4: 请求处理 / 請求処理 ─────────────────────┐
        │  Action:  BillingService.processReturnCharges()     │
        │  Events:  billing.charge.created (credit or charge) │
        │  Compensate: BillingService.reverseCharges()        │
        └─────────────────────────────────────────────────────┘
```

### 5.5 Saga 实现模式 / Saga 実装パターン

```typescript
/**
 * 基础 Saga 编排器 / ベース Saga オーケストレータ
 */
@Injectable()
export abstract class BaseSagaOrchestrator<TState extends string> {
  protected abstract readonly steps: SagaStep<TState>[];

  async execute(context: SagaContext): Promise<SagaResult> {
    const completedSteps: SagaStep<TState>[] = [];

    for (const step of this.steps) {
      try {
        await step.execute(context);
        completedSteps.push(step);
        context.state = step.completedState;
      } catch (error) {
        // 执行补偿（逆序）/ 補償実行（逆順）
        for (const completed of completedSteps.reverse()) {
          try {
            await completed.compensate(context);
          } catch (compError) {
            // 补偿失败记录并继续 / 補償失敗を記録し続行
            this.logger.error({ step: completed.name, compError },
              'Compensation failed / 補償失敗');
          }
        }
        return { success: false, error, state: 'compensated' };
      }
    }

    return { success: true, state: context.state };
  }
}

interface SagaStep<TState> {
  name: string;
  completedState: TState;
  execute(context: SagaContext): Promise<void>;
  compensate(context: SagaContext): Promise<void>;
}
```

---

## 6. 幂等性设计 / 冪等性設計

### 6.1 为什么需要幂等性 / なぜ冪等性が必要か

分布式系统中，网络故障、重试、队列重投递都可能导致同一操作被执行多次。
分散システムではネットワーク障害・リトライ・キュー再配信により同一操作が複数回実行される可能性がある。

**必须幂等的场景 / 冪等が必須な場面:**
- Webhook 投递（HTTP 超时重试）/ Webhook 配信（HTTPタイムアウトリトライ）
- 运输商 API 调用（避免重复出货）/ 配送業者API呼出（重複出荷防止）
- 库存操作（避免重复扣减）/ 在庫操作（重複減算防止）
- 计费（避免重复计费）/ 請求（重複課金防止）

### 6.2 幂等键生成策略 / 冪等キー生成戦略

```typescript
/**
 * 幂等键生成工具 / 冪等キー生成ユーティリティ
 */
export class IdempotencyKeyGenerator {
  /**
   * 基于事件的幂等键 / イベントベースの冪等キー
   * 格式 / フォーマット: {eventName}:{aggregateId}:{timestamp_bucket}
   */
  static fromEvent(event: BaseDomainEvent): string {
    return `${event.eventName}:${event.aggregateId}:${event.eventId}`;
  }

  /**
   * 基于操作的幂等键 / 操作ベースの冪等キー
   * 格式 / フォーマット: {operation}:{resourceId}:{nonce}
   */
  static fromOperation(operation: string, resourceId: string, nonce: string): string {
    return `op:${operation}:${resourceId}:${nonce}`;
  }

  /**
   * 基于请求的幂等键（API 层）/ リクエストベースの冪等キー（APIレイヤー）
   * 从 HTTP header X-Idempotency-Key 获取
   * HTTP ヘッダ X-Idempotency-Key から取得
   */
  static fromRequest(req: FastifyRequest): string | undefined {
    return req.headers['x-idempotency-key'] as string | undefined;
  }
}
```

### 6.3 BullMQ Job 去重 / BullMQ ジョブ重複排除

```typescript
/**
 * BullMQ 原生 jobId 去重机制 / BullMQ ネイティブ jobId 重複排除メカニズム
 *
 * 同一 jobId 的 Job 不会被重复添加到队列中。
 * 同一 jobId のジョブはキューに重複追加されない。
 */
async addIdempotentJob<T extends Record<string, unknown>>(
  queueName: QueueName,
  data: T,
  idempotencyKey: string,
  options?: { priority?: number; delay?: number },
): Promise<string | null> {
  const queue = this.queues.get(queueName);
  if (!queue) return null;

  try {
    const job = await queue.add(queueName, data, {
      jobId: idempotencyKey,  // BullMQ 使用 jobId 去重 / BullMQ は jobId で重複排除
      priority: options?.priority,
      delay: options?.delay,
    });
    return job.id ?? null;
  } catch (err) {
    // jobId 已存在时 BullMQ 不会重复添加 / jobId 存在時は追加されない
    if ((err as Error).message?.includes('already exists')) {
      return idempotencyKey; // 返回已有 jobId / 既存 jobId を返却
    }
    throw err;
  }
}
```

### 6.4 数据库层幂等 / データベースレイヤー冪等性

```typescript
/**
 * 幂等操作记录表 / 冪等操作記録テーブル
 *
 * PostgreSQL schema (Drizzle)
 */
export const idempotencyRecords = pgTable('idempotency_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  idempotencyKey: varchar('idempotency_key', { length: 255 }).notNull().unique(),
  operationType: varchar('operation_type', { length: 100 }).notNull(),
  resultStatus: varchar('result_status', { length: 20 }).notNull(),  // 'success' | 'error'
  resultData: jsonb('result_data'),
  tenantId: uuid('tenant_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),  // 过期后可重试 / 期限切れ後はリトライ可
});

// 索引 / インデックス
// CREATE UNIQUE INDEX idx_idempotency_key ON idempotency_records(idempotency_key);
// CREATE INDEX idx_idempotency_expires ON idempotency_records(expires_at);
```

```typescript
/**
 * 幂等操作装饰器 / 冪等操作デコレータ
 */
export function Idempotent(options: {
  keyExtractor: (args: unknown[]) => string;
  ttlSeconds?: number;
}) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const key = options.keyExtractor(args);
      const ttl = options.ttlSeconds ?? 86400; // 默认24小时 / デフォルト24時間

      // 检查是否已执行 / 実行済みかチェック
      const existing = await idempotencyRepository.findByKey(key);
      if (existing && existing.expiresAt > new Date()) {
        return existing.resultData; // 返回缓存结果 / キャッシュ結果を返却
      }

      // 执行并记录 / 実行し記録
      const result = await originalMethod.apply(this, args);
      await idempotencyRepository.save({
        idempotencyKey: key,
        operationType: propertyKey,
        resultStatus: 'success',
        resultData: result,
        expiresAt: new Date(Date.now() + ttl * 1000),
      });
      return result;
    };
  };
}
```

### 6.5 Webhook 接收端幂等指南 / Webhook 受信側冪等ガイド

ZELIXWMS Webhook 配信时在 Header 中包含幂等信息：
ZELIXWMS Webhook 配信時にヘッダに冪等情報を含める：

```
POST /your-webhook-endpoint
Headers:
  X-ZELIXWMS-Event: shipment.shipped
  X-ZELIXWMS-Delivery-ID: evt_abc123def456    ← 幂等键 / 冪等キー
  X-ZELIXWMS-Signature: sha256=xxxxxx         ← HMAC 签名 / HMAC 署名
  X-ZELIXWMS-Timestamp: 1711036800
```

接收方应使用 `X-ZELIXWMS-Delivery-ID` 进行幂等去重。
受信側は `X-ZELIXWMS-Delivery-ID` を用いて冪等性を確保すること。

---

## 7. 监控与可观测性 / 監視・可観測性

### 7.1 事件指标 / イベントメトリクス

| 指标 / メトリクス | 说明 / 説明 | 告警阈值 / アラート閾値 |
|---|---|---|
| `event.emit.count` | 事件发射总数（按事件名）/ イベント発行総数 | — |
| `event.handler.duration_ms` | Handler 处理耗时 / Handler 処理時間 | p99 > 500ms |
| `event.handler.error_count` | Handler 错误数 / Handler エラー数 | > 10/min |
| `queue.job.waiting` | 队列等待任务数 / キュー待機ジョブ数 | > 1000 |
| `queue.job.active` | 队列活跃任务数 / キューアクティブジョブ数 | — |
| `queue.job.failed` | 队列失败任务数 / キュー失敗ジョブ数 | > 50/hour |
| `queue.job.duration_ms` | Job 处理耗时 / ジョブ処理時間 | p99 > 30s |
| `queue.dlq.size` | DLQ 大小 / DLQ サイズ | > 0 (通知) |
| `webhook.delivery.success_rate` | Webhook 投递成功率 / Webhook 配信成功率 | < 95% |
| `saga.completion_rate` | Saga 完了率 / Saga 完了率 | < 99% |
| `saga.compensation_count` | Saga 补偿次数 / Saga 補償回数 | > 5/hour |

### 7.2 队列健康检查端点 / キューヘルスチェックエンドポイント

```
GET /api/admin/queues/stats
```

返回现行 `queueManager.getStats()` 的数据（waiting, active, completed, failed, delayed）。
現行 `queueManager.getStats()` のデータを返却する。

### 7.3 事件追踪 / イベントトレーシング

每个事件通过 `eventId`（UUID v7，含时间戳）实现端到端追踪：
各イベントは `eventId`（UUID v7、タイムスタンプ含む）でエンドツーエンドトレーシングを実現：

```
Service emit → eventId: evt_01HXY...
    ├── Sync handler log: { eventId, handler, duration }
    ├── Queue job: { jobId: evt_01HXY..., eventId }
    ├── Webhook delivery: { deliveryId: evt_01HXY..., httpStatus }
    └── Audit record: { eventId, source, status }
```

---

## 附录A: 从现行系统迁移路径 / 付録A: 現行システムからの移行パス

### Phase 1: 事件枚举统一 / イベント Enum 統一

将现行 `HOOK_EVENTS`（18个事件）扩展为 `DOMAIN_EVENTS`（40+ 个事件）。
現行 `HOOK_EVENTS`（18イベント）を `DOMAIN_EVENTS`（40+ イベント）に拡張する。

### Phase 2: HookManager → EventEmitter2

| 现行 / 現行 | NestJS |
|---|---|
| `hookManager.register(event, name, fn, opts)` | `@OnEvent(event, { async })` |
| `hookManager.emit(event, payload, tenantId)` | `eventEmitter.emit(event, eventObj)` |
| `hookManager.unregisterByPlugin(name)` | Module lifecycle (onModuleDestroy) |

### Phase 3: 队列扩展 / キュー拡張

现行 3 队列 → 9 队列。`@nestjs/bullmq` の `registerQueue` / `registerFlowProducer` を活用。
現行3キューから9キューへ拡張。

### Phase 4: Saga 导入 / Saga 導入

出库/入库/退货の3つの Saga パターンを段階的に導入。
出库/入库/退货の3 Saga を段階的に導入する。

---

## 附录B: 事件名称完整一览 / 付録B: イベント名完全一覧

```
product.created          product.updated          product.deleted
product.imported

inbound.created          inbound.confirmed        inbound.line.received
inbound.completed        inbound.line.putaway     inbound.cancelled

stock.reserved           stock.released           stock.adjusted
stock.transferred        stock.low_alert          stock.lot.expired

shipment.created         shipment.confirmed       shipment.picking.started
shipment.packed          shipment.shipped          shipment.delivered
shipment.cancelled       shipment.carrier.assigned shipment.tracking.updated

billing.calculated       billing.invoice.generated billing.charge.created

return.created           return.inspected          return.restocked
return.disposed

user.logged_in           user.created              settings.updated
webhook.delivered

wave.created             wave.completed
task.created             task.completed
stocktaking.completed
```

**合计 / 合計: 40 events**
```

---

I was unable to write the file directly because I do not have a file-write tool available in this session. The complete document content is provided above (approximately 780 lines). You can save it by creating the directory and file:

```bash
mkdir -p /Users/kin/Documents/GitHub/ZELIXWMS/docs/architecture
# Then paste the content into:
# /Users/kin/Documents/GitHub/ZELIXWMS/docs/architecture/06-event-driven-design.md
```

**Key files referenced during design:**

- `/Users/kin/Documents/GitHub/ZELIXWMS/backend/src/core/queue/queueManager.ts` -- Current 3-queue BullMQ setup (webhook, script, audit) with singleton pattern, exponential backoff, and graceful degradation when Redis is unavailable
- `/Users/kin/Documents/GitHub/ZELIXWMS/backend/src/core/extensions/types.ts` -- Current `HOOK_EVENTS` constant (18 events) and `HookContext` / `HookHandler` interfaces
- `/Users/kin/Documents/GitHub/ZELIXWMS/backend/src/core/extensions/hookManager.ts` -- Current custom event bus with priority-ordered handlers, async fire-and-forget support, and per-handler error isolation
- `/Users/kin/Documents/GitHub/ZELIXWMS/backend/src/services/notificationService.ts` -- Current notification templates mapping events to in-app/email notifications with bilingual content
- `/Users/kin/Documents/GitHub/ZELIXWMS/docs/migration/03-backend-architecture.md` -- NestJS migration architecture showing planned 16 modules, EventEmitter2 adoption, and 7+ BullMQ queues

**Summary of architectural decisions in the document:**

1. **Three-layer event system**: In-process EventEmitter2 for synchronous domain events, BullMQ for async background jobs, Webhooks for external notifications. This replaces the current single-layer `HookManager`.

2. **40 domain events** organized across 7 bounded contexts (Product, Inbound, Inventory, Shipment, Billing, Return, System), expanding from the current 18 `HOOK_EVENTS`.

3. **9 BullMQ queues** (up from 3), each with specific retry strategies, concurrency limits, and DLQ handling tuned to their workload characteristics.

4. **Subscription matrix** showing exactly which module handles which event synchronously vs asynchronously, preventing hidden coupling.

5. **Three Saga patterns** (Outbound, Inbound, Return) with explicit compensation steps for rollback on failure.

6. **Idempotency** via BullMQ native `jobId` deduplication, a PostgreSQL `idempotency_records` table, and a `@Idempotent()` decorator pattern.
