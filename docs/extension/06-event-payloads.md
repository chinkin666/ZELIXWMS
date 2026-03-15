# イベントペイロード仕様 / 事件载荷规范

> 各フックイベントが配信するペイロードの構造を記載する。
> 记录每个 Hook 事件传递的 payload 结构。

---

## 出荷指示 / 出货指示

### `order.created`
```json
{ "orderId": "string", "orderNumber": "string" }
```

### `order.confirmed`
```json
{ "orderId": "string", "order": { ...OrderDocument } }
```

### `order.shipped`
```json
{ "orderId": "string", "order": { ...OrderDocument } }
```

### `order.cancelled`
```json
{ "orderId": "string", "reason": "deleted | unconfirm", "orderNumber": "string" }
```

### `order.held`
```json
{ "orderId": "string", "order": { ...OrderDocument } }
```

### `order.unheld`
```json
{ "orderId": "string", "order": { ...OrderDocument } }
```

---

## 在庫 / 库存

### `inventory.changed`
```json
{ "orderId": "string", "type": "outbound", "movedCount": 5 }
```

### `stock.reserved`
```json
{
  "orderId": "string",
  "orderNumber": "string",
  "reservationCount": 3,
  "errors": ["SKU-001: 在庫不足（2個不足）"]
}
```

### `stock.released`
```json
{ "orderId": "string", "cancelledCount": 3 }
```

---

## Wave / ウェーブ

### `wave.created`
```json
{ "waveId": "string", "waveNumber": "string", "shipmentCount": 10 }
```

### `wave.completed`
```json
{ "waveId": "string", "waveNumber": "string" }
```

---

## 倉庫タスク / 仓库任务

### `task.created`
```json
{
  "taskId": "string",
  "taskNumber": "WT-20260315-xxxxx",
  "type": "picking | receiving | putaway | packing | sorting | ...",
  "productSku": "string",
  "referenceNumber": "string"
}
```

### `task.completed`
```json
{
  "taskId": "string",
  "taskNumber": "string",
  "type": "string",
  "completedQuantity": 10,
  "durationMs": 45000,
  "productSku": "string",
  "referenceNumber": "string"
}
```

---

## 入庫 / 入库

### `inbound.received`
```json
{ "orderId": "string", "orderNumber": "string" }
```

### `inbound.putaway.completed`
```json
{ "orderId": "string", "orderNumber": "string" }
```

---

## 返品 / 退货

### `return.completed`
```json
{
  "returnOrderId": "string",
  "returnNumber": "string",
  "restockedTotal": 5,
  "disposedTotal": 2
}
```

---

## 棚卸 / 盘点

### `stocktaking.completed`
```json
{
  "orderId": "string",
  "orderNumber": "ST20260315-xxxxx",
  "adjustedCount": 3,
  "errorCount": 0
}
```

---

## スクリプトで利用可能な変数 / 脚本中可用的变量

```javascript
// 読み取り専用 / 只读
order        // 出荷指示データ（存在する場合）
product      // 商品データ（存在する場合）
inventory    // 在庫データ（存在する場合）
inbound      // 入庫データ（存在する場合）
return       // 返品データ（存在する場合）
wave         // ウェーブデータ（存在する場合）
task         // タスクデータ（存在する場合）
stocktaking  // 棚卸データ（存在する場合）
event        // イベント名
payload      // 完全なペイロード

// 書き込み可能 / 可写入
setField('order.invoiceType', '0')         // 送り状種類変更
setField('order.coolType', '1')            // クール区分変更
setField('order.handlingTags', ['ワレモノ']) // 荷扱い変更
setField('order.customFields', { key: 'value' })
setField('order.memo', 'メモ')
setField('order.deliveryTimeSlot', '14-16')
setField('order.shipPlanDate', '2026-03-16')
setField('product.category', 'カテゴリ名')
setField('inbound.memo', 'メモ')
setField('return.memo', 'メモ')

// ユーティリティ / 工具
console.log('debug message')
JSON.parse('{}')
JSON.stringify({})
Math, Date, parseInt, parseFloat, String, Number, Boolean, Array, Object
```
