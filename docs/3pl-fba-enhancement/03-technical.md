# 03 技术方案 / 技術方案

> 3PL + FBA 通过型业务系统增强 / 3PL + FBA 通過型業務システム強化
> API 设计、集成方案、存储、性能、安全 / API 設計・統合方案・ストレージ・パフォーマンス・セキュリティ

## 1. API 设计 / API 設計

### 1.1 新增 API 端点 / 新規 API エンドポイント

#### 检品 / 検品

```
POST   /api/inspections                    # 创建检品记录 / 検品記録作成
GET    /api/inspections                    # 检品记录列表 / 検品記録一覧
GET    /api/inspections/:id                # 检品记录详情 / 検品記録詳細
PUT    /api/inspections/:id                # 更新检品记录 / 検品記録更新
POST   /api/inspections/:id/verify         # 复核确认 / 確認者承認
```

#### 贴标任务 / ラベル貼付タスク

```
POST   /api/labeling-tasks                 # 创建贴标任务 / タスク作成
GET    /api/labeling-tasks                 # 任务列表 / タスク一覧
GET    /api/labeling-tasks/:id             # 任务详情 / タスク詳細
POST   /api/labeling-tasks/:id/start-print # 开始打印 / 印刷開始
POST   /api/labeling-tasks/:id/start-label # 开始贴标 / 貼付開始
POST   /api/labeling-tasks/:id/verify      # 复核 / 確認
POST   /api/labeling-tasks/:id/complete    # 完成 / 完了

POST   /api/labeling-tasks/batch-create    # 从 FBA plan 批量生成 / FBA プランから一括生成
```

#### FBA 箱管理 / FBA 箱管理

```
POST   /api/fba/plans/:planId/boxes        # 创建箱 / 箱作成
GET    /api/fba/plans/:planId/boxes        # 箱列表 / 箱一覧
PUT    /api/fba/boxes/:boxId               # 更新箱 / 箱更新
DELETE /api/fba/boxes/:boxId               # 删除箱 / 箱削除
POST   /api/fba/boxes/:boxId/seal          # 封箱 / 封箱
POST   /api/fba/plans/:planId/validate-boxes  # 箱规校验 / 箱規格検証

POST   /api/fba/plans/:planId/split        # 多仓拆分 / 複数FC分割
```

#### 异常报告 / 異常報告

```
POST   /api/exceptions                     # 创建异常报告 / 異常報告作成
GET    /api/exceptions                     # 报告列表 / 報告一覧
GET    /api/exceptions/:id                 # 报告详情 / 報告詳細
PUT    /api/exceptions/:id                 # 更新报告 / 報告更新
POST   /api/exceptions/:id/notify          # 通知客户 / 顧客通知
POST   /api/exceptions/:id/acknowledge     # 客户确认 / 顧客確認
POST   /api/exceptions/:id/resolve         # 处理完成 / 処理完了

GET    /api/exceptions/sla-status          # SLA 达成状况 / SLA 達成状況
```

#### 循环盘点 / 循環棚卸し

```
POST   /api/cycle-counts                   # 创建盘点计划 / 棚卸計画作成
GET    /api/cycle-counts                   # 计划列表 / 計画一覧
GET    /api/cycle-counts/:id               # 计划详情 / 計画詳細
POST   /api/cycle-counts/:id/generate      # 自动生成盘点项 / 棚卸項目自動生成
POST   /api/cycle-counts/:id/count         # 提交盘点结果 / 棚卸結果提出
POST   /api/cycle-counts/:id/complete      # 完成盘点 / 棚卸完了

GET    /api/cycle-counts/coverage           # 盘点覆盖率 / 棚卸カバー率
```

#### FBA 移除订单 / FBA 返送注文

```
POST   /api/fba/removals                   # 创建移除订单 / 返送注文作成
GET    /api/fba/removals                   # 列表 / 一覧
GET    /api/fba/removals/:id               # 详情 / 詳細
POST   /api/fba/removals/:id/receive       # 确认收货 / 受領確認
POST   /api/fba/removals/:id/inspect       # 检品分类 / 検品分類
POST   /api/fba/removals/:id/execute       # 执行处理指令 / 処理指示実行
```

#### 照片上传 / 写真アップロード

```
POST   /api/uploads/photos                 # 上传照片（multipart/form-data）
GET    /api/uploads/photos/:key            # 获取照片（或直接 CDN/S3 URL）
DELETE /api/uploads/photos/:key            # 删除照片
```

#### 入库预报导入 / 入庫予報インポート

```
POST   /api/inbound-orders/import          # Excel 导入 / Excel インポート
POST   /api/inbound-orders/import/preview  # 导入预览（校验结果）/ インポートプレビュー
```

#### KPI 与报告 / KPI・レポート

```
GET    /api/kpi/dashboard                  # KPI 仪表板数据 / KPI ダッシュボードデータ
GET    /api/kpi/targets                    # KPI 目标配置 / KPI 目標設定
PUT    /api/kpi/targets                    # 更新 KPI 目标 / KPI 目標更新

POST   /api/reports/daily                  # 生成日报 / 日報生成
POST   /api/reports/weekly                 # 生成周报 / 週報生成
POST   /api/reports/monthly                # 生成月报 / 月報生成
GET    /api/reports/:id                    # 报告详情 / レポート詳細
```

### 1.2 现有 API 扩展 / 既存 API 拡張

```
# InboundOrder 扩展
PUT    /api/inbound-orders/:id/supervisor-confirm  # 主管复核 / 責任者確認
POST   /api/inbound-orders/:id/lock                # 差异超限锁定 / 差異超過ロック
POST   /api/inbound-orders/:id/unlock              # 解锁 / ロック解除

# StockQuant 扩展
PUT    /api/inventory/stock/:id/status              # 更新库存状态 / 在庫ステータス更新
GET    /api/inventory/aging-alerts                  # 库龄预警列表 / エイジング警告一覧

# Webhook 扩展
POST   /api/webhooks/:id/retry                     # 手动重试 / 手動リトライ
GET    /api/webhooks/delivery-log                   # 送达日志 / 配信ログ
```

## 2. 集成方案 / 統合方案

### 2.1 与现有模块的集成点 / 既存モジュールとの統合ポイント

```
┌─────────────────────────────────────────────────────────────┐
│                        新增模块 / 新規モジュール               │
│                                                              │
│  InspectionRecord  LabelingTask  FbaBox  ExceptionReport    │
│  CycleCountPlan    FbaRemovalOrder                          │
│                                                              │
├──────────────────────┬──────────────────────────────────────┤
│                      │                                       │
│  ┌───────────────────▼───────────────────────┐              │
│  │            TaskEngine (扩展)                │              │
│  │  新增 task type:                           │              │
│  │  - inspection (检品任务)                    │              │
│  │  - labeling (贴标任务)                      │              │
│  │  - box_packing (装箱任务)                   │              │
│  │  - cycle_count (盘点任务)                   │              │
│  └───────────┬───────────────────────────────┘              │
│              │                                               │
│  ┌───────────▼───────────────────────────────┐              │
│  │          ChargeService (扩展)               │              │
│  │  新增自动计费触发点:                         │              │
│  │  - 检品完成 → inspection 费                 │              │
│  │  - 贴标完成 → labeling 费                   │              │
│  │  - 分箱/合箱/换箱 → box_splitting 费        │              │
│  │  - 拍照 → photo_documentation 费           │              │
│  │  - 库龄 >90天 → overdue_storage 费          │              │
│  │  - 多仓纳品 → multi_fc_surcharge            │              │
│  └───────────┬───────────────────────────────┘              │
│              │                                               │
│  ┌───────────▼───────────────────────────────┐              │
│  │         Webhook / 通知系统 (增强)            │              │
│  │  事件 → 可靠投递（重试 + 确认）               │              │
│  │  - exception.created (异常创建)              │              │
│  │  - exception.sla_breach (SLA 超时)          │              │
│  │  - fba.shipped (FBA 发运)                   │              │
│  │  - removal.received (移除订单到货)           │              │
│  │  - cycle_count.variance_alert (盘点差异)    │              │
│  └───────────────────────────────────────────┘              │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                  不可修改 / 変更不可                           │
│                                                              │
│  yamatoB2Service.ts (认证/验证/导出 - 稳定运行)               │
│  yamatoB2Format.ts (日文键映射)                               │
│                                                              │
│  注意: FBA 出货使用独立的配送流程,                              │
│  不经过 Yamato B2 Cloud                                       │
│  FBA 出荷は独立した配送フローを使用し、                          │
│  ヤマト B2 Cloud を経由しない                                  │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 打印集成 / 印刷統合

```
现有打印系统 / 既存印刷システム:
- printBridgeApi.ts   → 出荷单打印
- printConfig.ts      → 打印机配置
- renderTemplateToPng  → 模板渲染

新增需求 / 追加要件:
┌──────────────────────────────────────┐
│ 标签打印通道 / ラベル印刷チャネル      │
│                                       │
│ 1. FNSKU 标签 (30mm x 50mm 热敏)     │
│    - 条码 + SKU 文字                   │
│    - 单件打印 + 批量打印               │
│                                       │
│ 2. 箱唛标签 (100mm x 150mm)           │
│    - Amazon 箱唛内容                   │
│    - FBA Shipment ID + 箱号            │
│                                       │
│ 3. 配送标签 (100mm x 150mm)           │
│    - 承运商格式（佐川/ヤマト等）        │
│    - 追踪号条码                        │
│                                       │
│ 实现方案:                              │
│ - 扩展 printConfig 增加标签打印机配置    │
│ - 新增 labelTemplate 模板类型           │
│ - 复用 renderBarcodeDataUrl 生成条码    │
│ - 热敏打印使用 ESC/POS 或 ZPL 指令     │
└──────────────────────────────────────┘
```

### 2.3 数据访问层租户隔离 / データアクセス層テナント分離

```typescript
// 方案: Mongoose middleware 统一注入 tenantId
// 方案: Mongoose ミドルウェアでの tenantId 統一注入

// 当前问题: 各 controller 手动添加 { tenantId: req.tenantId }
// 現状の問題: 各 controller が手動で tenantId フィルタを追加

// 改进方案: 在 model 层添加 pre-find/pre-save hook
// 改善方案: モデル層に pre-find/pre-save フックを追加

// 伪代码 / 疑似コード:
schema.pre(['find', 'findOne', 'countDocuments', ...], function() {
  if (this.getOptions().tenantId) {
    this.where({ tenantId: this.getOptions().tenantId })
  }
})

// 优先级: P1 — 在新模块开发前完成
// 優先度: P1 — 新モジュール開発前に完了
// 回退方案: 如果全局 hook 影响面太大，先只在新模块使用
// フォールバック: グローバルフックの影響が大きい場合、新モジュールのみ先行適用
```

## 3. 存储方案 / ストレージ方案

### 3.1 照片存储 / 写真ストレージ

```
评估对比 / 評価比較:

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| 本地文件系统 | 简单、无额外成本 | 不可扩展、无 CDN、备份麻烦 | ✗ |
| MinIO (self-hosted S3) | S3 兼容、可本地部署、Docker 一行启动 | 需维护 | ★★★ |
| AWS S3 | 成熟、CDN、无需维护 | 成本、网络延迟（日本→US） | ★★ |
| AWS S3 Tokyo (ap-northeast-1) | S3 + 低延迟 | 成本 | ★★★ |

推荐方案 / 推奨方案:
- 开发/测试: MinIO (Docker 容器，S3 兼容 API)
- 生产: AWS S3 Tokyo 或 MinIO 独立部署

存储结构 / ストレージ構造:
bucket: zelix-wms-photos
  /{tenantId}/
    /inspections/{recordId}/{timestamp}_{index}.jpg
    /exceptions/{reportId}/{timestamp}_{index}.jpg
    /fba-boxes/{boxId}/{timestamp}_sealed.jpg
    /inbound/{orderId}/{timestamp}_{index}.jpg

照片处理流水线 / 写真処理パイプライン:
1. 客户端拍照 → 压缩到 1200px 宽 (JPEG quality 80)
2. 上传到 /api/uploads/photos (multipart, max 5MB/张)
3. 服务端生成缩略图 (300px) + 原图存储
4. 返回 {key, url, thumbnailUrl}
5. 业务模型存储 key 数组，展示时拼接 URL

容量估算 / 容量見積:
- 每张照片: 压缩后约 200KB
- 日均: 200 张 = 40MB/天
- 月均: 1.2GB
- 年均: 14.4GB
- 3 年: ~50GB（可控）
```

### 3.2 Excel 导入处理 / Excel インポート処理

```
使用库 / 使用ライブラリ: xlsx (SheetJS) — 已在项目依赖中
処理フロー:

1. 上传 Excel → 服务端解析
2. 模板识别（按列头匹配预定义模板）
3. 数据清洗:
   - 空行过滤
   - 字段 trim
   - SKU 标准化（去空格、统一大小写）
4. SKU 匹配:
   - 精确匹配 product.sku
   - 模糊匹配 product.name / product.janCode
   - 未匹配项标红，人工确认
5. 预览结果（含匹配率、差异项）
6. 用户确认后创建 InboundOrder

支持模板 / 対応テンプレート:
- 标准模板（自定义列头映射）
- 客户自定义模板（存储 mappingConfig）
- 已有 mapping_configs collection 可复用
```

## 4. 性能考量 / パフォーマンス考慮

### 4.1 批量操作 / バッチ操作

```
关注点 / 注意点:

1. 循环盘点生成
   - 月度生成可能涉及数千 SKU × 数百库位
   - 方案: 后台异步任务（WMS Schedule），分批插入
   - 预期耗时: < 30s (5000 SKU)

2. 库龄预警扫描
   - 全量扫描 StockQuant 的 lastMovedAt
   - 方案: 定时任务（每日凌晨），索引 { lastMovedAt: 1 }
   - 预期耗时: < 10s (10000 quants)

3. 自动报告生成
   - 聚合当日/周/月数据
   - 方案: MongoDB aggregation pipeline，预计算摘要
   - 预期耗时: < 5s (日报)

4. 照片上传并发
   - 现场多人同时拍照上传
   - 方案: 客户端压缩 + 队列上传（最多 3 并发）
   - 服务端: multer + 流式写入 S3
```

### 4.2 索引策略 / インデックス戦略

```
新模型必须索引 / 新モデル必須インデックス:

ExceptionReport:
- { tenantId: 1, status: 1, level: 1 }          // 列表筛选
- { tenantId: 1, createdAt: -1 }                 // 时间排序
- { tenantId: 1, reportedAt: 1, status: 1 }      // SLA 监控

InspectionRecord:
- { tenantId: 1, inboundOrderId: 1 }             // 按入库单查检品
- { tenantId: 1, createdAt: -1 }                 // 时间排序

LabelingTask:
- { tenantId: 1, fbaShipmentPlanId: 1 }          // 按 FBA plan 查
- { tenantId: 1, status: 1, createdAt: -1 }      // 任务队列

FbaBox:
- { tenantId: 1, fbaShipmentPlanId: 1 }          // 按 plan 查
- { tenantId: 1, boxNumber: 1 } unique            // 箱号唯一

CycleCountPlan:
- { tenantId: 1, period: 1, warehouseId: 1 }     // 按月/仓库查

FbaRemovalOrder:
- { tenantId: 1, status: 1, createdAt: -1 }      // 列表筛选

StockQuant (新增):
- { lastMovedAt: 1, quantity: { $gt: 0 } }       // 库龄扫描
```

### 4.3 定时任务 / 定時タスク

```
复用现有 WMS Schedule 系统 / 既存 WMS Schedule を再利用:

| 任务名 | 频率 | 描述 |
|--------|------|------|
| aging-alert-scan | 每日 02:00 | 扫描库龄 60/90/180 天，生成预警 |
| overdue-storage-charge | 每日 03:00 | 库龄 >90 天自动计费 |
| exception-sla-check | 每 15 分钟 | 检查异常报告 SLA 超时，触发升级通知 |
| cycle-count-generate | 每月 1 日 00:00 | 自动生成月度循环盘点计划 |
| daily-report-generate | 每日 22:00 | 生成当日日报 |
| weekly-report-generate | 每周日 22:00 | 生成本周周报 |
| monthly-report-generate | 每月最后一天 22:00 | 生成月报 |
| certification-expiry-check | 每日 09:00 | 检查员工资格到期 |
```

## 5. 安全考量 / セキュリティ考慮

### 5.1 照片上传安全 / 写真アップロードセキュリティ

```
- 文件类型白名单: image/jpeg, image/png, image/webp
- 文件大小限制: 5MB/张
- 文件名清洗: UUID 重命名，禁止原文件名
- 病毒扫描: 可选（ClamAV 集成）
- 访问控制: 签名 URL（有效期 1h）或 token 验证
- 存储隔离: 按 tenantId 隔离 bucket 路径
```

### 5.2 操作审计增强 / 操作監査強化

```
方案: Express middleware 层统一拦截
方案: Express ミドルウェア層での統一インターセプト

// 对所有 POST/PUT/DELETE 请求自动记录:
// 全 POST/PUT/DELETE リクエストを自動記録:
{
  timestamp: Date
  tenantId: string
  userId: string
  method: string
  path: string
  statusCode: number
  requestBody: object (脱敏 / マスキング済)
  responseStatus: number
  duration: number
  ip: string
}

// 脱敏规则: password, token, secret 字段自动替换为 '***'
// マスキング: password, token, secret フィールドを '***' に自動置換
```

### 5.3 多客户作业隔离 / マルチクライアント作業分離

```
// TaskEngine 增强: 贴标、检品任务强制绑定 clientId
// TaskEngine 強化: ラベル・検品タスクに clientId を必須化

// 创建任务时:
if (['labeling', 'inspection'].includes(taskType) && !clientId) {
  throw new ValidationError('clientId required for labeling/inspection tasks')
}

// 完成任务时验证:
// タスク完了時の検証:
if (task.clientId !== product.clientId) {
  throw new ValidationError('Client mismatch: task belongs to different client')
}
```

## 6. 参考文档 / 参考文書

- [需求文档](./01-requirements.md)
- [设计文档](./02-design.md)
- [开发实现](./04-development.md)
- [开发计划](./05-plan.md)
- [决策记录](./06-decisions.md)
