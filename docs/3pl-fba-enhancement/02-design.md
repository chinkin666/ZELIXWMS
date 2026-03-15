# 02 设计文档 / 設計書

> 3PL + FBA 通过型业务系统增强 / 3PL + FBA 通過型業務システム強化
> 数据模型、流程设计、UI 设计 / データモデル・フロー設計・UI 設計

## 1. 数据模型设计 / データモデル設計

### 1.1 新建模型 / 新規モデル

#### FbaBox（FBA 箱级管理）

```
FbaBox {
  _id: ObjectId
  tenantId: string
  fbaShipmentPlanId: ObjectId        // 关联 FBA 纳品计划 / FBA 納品プランへの参照
  boxNumber: string                   // 箱号（连续编号）/ 箱番号（連番）
  destinationFc: string               // 目的 FC（多仓拆分时可与 plan 不同）

  // 箱内容 / 箱内容
  items: [{
    productId: ObjectId
    sku: string
    fnsku: string
    quantity: number
  }]

  // 物理属性 / 物理属性
  weight: number                      // kg
  length: number                      // cm
  width: number                       // cm
  height: number                      // cm

  // 状态 / ステータス
  status: enum['packing', 'labeled', 'sealed', 'shipped']
  boxLabelPrinted: boolean
  shippingLabelPrinted: boolean
  photoUrl: string                    // 封箱照片 / 封箱写真

  // 追踪 / 追跡
  trackingNumber: string
  sealedAt: Date
  sealedBy: string

  createdAt: Date
  updatedAt: Date
}

索引 / インデックス:
- { tenantId: 1, fbaShipmentPlanId: 1 }
- { tenantId: 1, boxNumber: 1 } unique
```

#### ExceptionReport（异常报告）

```
ExceptionReport {
  _id: ObjectId
  tenantId: string
  reportNumber: string                // EXC-YYYYMMDD-XXX 自动生成

  // 关联 / 関連
  referenceType: enum['inbound_order', 'fba_plan', 'return_order', 'task', 'other']
  referenceId: ObjectId
  clientId: ObjectId
  clientName: string

  // 异常信息 / 異常情報
  level: enum['A', 'B', 'C']         // A=轻微 B=重要 C=紧急
  category: enum[
    'quantity_variance',               // 数量异常 / 数量差異
    'label_error',                     // 标签异常 / ラベル異常
    'appearance_defect',               // 外观不良 / 外観不良
    'packaging_issue',                 // 包装异常 / 包装異常
    'mixed_shipment',                  // 混装异常 / 混載異常
    'documentation_error',             // 单证异常 / 書類異常
    'other'
  ]

  // 详情 / 詳細
  boxNumber: string                   // 相关箱号 / 関連箱番号
  sku: string
  affectedQuantity: number
  description: string                 // 异常描述 / 異常内容
  photos: [string]                    // 照片 URL 数组 / 写真 URL 配列
  suggestedAction: string             // 建议处理方案 / 推奨対応案

  // 处理流程 / 処理フロー
  status: enum['open', 'notified', 'acknowledged', 'resolved', 'closed']
  reportedBy: string
  reportedAt: Date
  notifiedAt: Date                    // 通知客户时间 / 顧客通知時刻
  acknowledgedAt: Date                // 客户确认时间 / 顧客確認時刻
  resolvedBy: string
  resolvedAt: Date
  resolution: string                  // 最终处理结果 / 最終処理結果

  createdAt: Date
  updatedAt: Date
}

索引 / インデックス:
- { tenantId: 1, reportNumber: 1 } unique
- { tenantId: 1, status: 1, level: 1 }
- { tenantId: 1, clientId: 1, createdAt: -1 }
- { tenantId: 1, referenceType: 1, referenceId: 1 }
```

#### InspectionRecord（检品记录）

```
InspectionRecord {
  _id: ObjectId
  tenantId: string
  recordNumber: string                // INS-YYYYMMDD-XXX

  // 关联 / 関連
  inboundOrderId: ObjectId
  inboundLineNumber: number
  productId: ObjectId
  sku: string

  // 检品方式 / 検品方式
  inspectionMode: enum['full', 'sampling']
  samplingRate: number                // 抽检比例，如 0.1 = 10%

  // 检品维度 / 検品項目
  checks: {
    skuMatch: enum['pass', 'fail', 'na']
    barcodeMatch: enum['pass', 'fail', 'na']
    quantityMatch: enum['pass', 'fail', 'na']
    appearanceOk: enum['pass', 'fail', 'na']
    accessoriesOk: enum['pass', 'fail', 'na']
    packagingOk: enum['pass', 'fail', 'na']
  }

  // 数量 / 数量
  expectedQuantity: number
  inspectedQuantity: number
  passedQuantity: number
  failedQuantity: number

  // 异常 / 異常
  exceptions: [{
    category: string                  // 同 ExceptionReport.category
    quantity: number
    description: string
    photoUrls: [string]
  }]

  // 人员 / 担当者
  inspectedBy: string
  verifiedBy: string                  // 复核人 / 確認者
  photos: [string]                    // 全局检品照片 / 全体検品写真
  memo: string

  createdAt: Date
  updatedAt: Date
}
```

#### LabelingTask（贴标任务）

```
LabelingTask {
  _id: ObjectId
  tenantId: string
  taskNumber: string                  // LBL-YYYYMMDD-XXX

  // 关联 / 関連
  fbaShipmentPlanId: ObjectId
  fbaBoxId: ObjectId                  // 可选，箱级贴标 / オプション、箱レベル
  productId: ObjectId
  sku: string
  fnsku: string

  // 贴标类型 / ラベル種別
  labelTypes: [enum[
    'fnsku',                          // FNSKU 商品标签
    'product_barcode',                // 商品条码
    'warning_label',                  // 警示贴（防窒息等）
    'box_label',                      // 箱唛
    'shipping_label',                 // 配送标签
    'compliance_label'                // 合规标签（食品表示等）
  ]]

  // 数量 / 数量
  requiredQuantity: number
  completedQuantity: number
  printBatch: string                  // 打印批次号 / 印刷ロット番号

  // 状态 / ステータス
  status: enum['pending', 'printing', 'labeling', 'verifying', 'completed', 'cancelled']

  // 人员 / 担当者
  labeledBy: string                   // 贴标员 / 貼付担当
  verifiedBy: string                  // 复核员 / 確認担当
  verifiedAt: Date

  // 质量 / 品質
  verificationResult: enum['pass', 'fail', 'partial']
  failedQuantity: number
  failureReason: string

  createdAt: Date
  updatedAt: Date
}
```

#### CycleCountPlan（循环盘点计划）

```
CycleCountPlan {
  _id: ObjectId
  tenantId: string
  planNumber: string                  // CC-YYYYMM-XXX

  // 计划信息 / 計画情報
  planType: enum['monthly_cycle', 'annual_full', 'spot']
  warehouseId: ObjectId
  period: string                      // YYYY-MM

  // 目标 / 対象
  targetSkuCount: number              // 本期目标 SKU 数
  totalSkuCount: number               // 总 SKU 数
  coverageRate: number                // 覆盖率 targetSkuCount / totalSkuCount

  // 盘点项 / 棚卸し項目
  items: [{
    productId: ObjectId
    sku: string
    locationId: ObjectId
    locationCode: string
    systemQuantity: number            // 系统库存 / システム在庫
    countedQuantity: number           // 实盘数量 / 実数
    variance: number                  // 差异 = counted - system
    varianceRate: number              // 差异率 / 差異率
    countedBy: string
    countedAt: Date
    status: enum['pending', 'counted', 'recounted', 'confirmed']
  }]

  // 汇总 / 集計
  status: enum['draft', 'in_progress', 'completed', 'cancelled']
  totalVarianceRate: number           // 总差异率 / 総差異率
  alertTriggered: boolean             // 是否触发 >0.5% 预警

  completedAt: Date
  createdAt: Date
  updatedAt: Date
}
```

#### FbaRemovalOrder（FBA 移除订单）

```
FbaRemovalOrder {
  _id: ObjectId
  tenantId: string
  orderNumber: string                 // RMV-YYYYMMDD-XXX

  // Amazon 信息 / Amazon 情報
  removalOrderId: string              // Amazon Removal Order ID
  clientId: ObjectId
  clientName: string

  // 状态 / ステータス
  status: enum['pending', 'received', 'inspecting', 'awaiting_instruction', 'processing', 'completed', 'cancelled']

  // 接收信息 / 受領情報
  expectedArrivalDate: Date
  receivedDate: Date
  receivedBoxCount: number
  receivedBy: string

  // 明细 / 明細
  items: [{
    productId: ObjectId
    sku: string
    fnsku: string
    expectedQuantity: number
    receivedQuantity: number
    inspectedQuantity: number

    // 分类结果 / 分類結果
    classification: enum['fba_restock', 'needs_refurbish', 'fbm_stock', 'return_to_china', 'dispose']
    classifiedQuantity: number

    // 客户指令 / 顧客指示
    disposition: enum['resend_fba', 'stock_fbm', 'return', 'dispose', 'pending']
    dispositionQuantity: number

    locationId: ObjectId              // 上架库位（FBM stock 时使用）
    memo: string
  }]

  photos: [string]
  memo: string
  completedAt: Date
  createdAt: Date
  updatedAt: Date
}
```

### 1.2 现有模型扩展 / 既存モデル拡張

#### InboundOrder 扩展

```diff
+ actualArrivalDate: Date             // 实际到货日期 / 実到着日
+ totalBoxCount: number               // 总箱数 / 総箱数
+ totalWeight: number                 // 总重量 kg / 総重量 kg
+ totalVolume: number                 // 总体积 m³ / 総容積 m³
+ varianceThreshold: number           // 差异阈值（默认 0.05 = 5%）/ 差異閾値
+ isLocked: boolean                   // 差异超限自动锁定 / 差異超過自動ロック
+ supervisorConfirmedBy: string       // 主管复核人 / 責任者確認者
+ supervisorConfirmedAt: Date
+ photos: [string]                    // 收货照片 / 受領写真
+ externalPackingList: {              // 外部装箱单信息 / 外部梱包明細情報
    fileUrl: string
    importedAt: Date
    matchRate: number                 // SKU 匹配率 / SKU マッチ率
  }
```

#### InboundOrderLine 扩展

```diff
+ boxNumbers: [string]                // 所在箱号 / 所在箱番号
+ inspectionMode: enum['full', 'sampling']
+ inspectionRecordId: ObjectId        // 关联检品记录 / 検品記録参照
+ appearanceStatus: enum['good', 'damaged', 'wet', 'deformed', 'resealed']
```

#### StockQuant 扩展

```diff
+ inventoryStatus: enum['available', 'inspection_pending', 'frozen', 'pending_return']
+ frozenReason: string
+ frozenAt: Date
+ frozenBy: string
```

#### FbaShipmentPlan 扩展

```diff
+ isMultiFc: boolean                  // 是否多仓纳品 / 複数 FC 納品フラグ
+ splitPlans: [{                      // 拆分子计划 / 分割サブプラン
    destinationFc: string
    boxCount: number
    trackingNumber: string
    status: string
    shippedAt: Date
  }]
+ boxValidationPassed: boolean        // 箱规校验通过 / 箱規格検証合格
+ boxValidationErrors: [string]       // 校验失败原因 / 検証失敗理由
```

#### User 扩展

```diff
+ certifications: [{                  // 岗位认证 / 職位認定
    role: enum['receiver', 'inspector', 'labeler', 'shipper']
    certifiedAt: Date
    certifiedBy: string
    expiresAt: Date                   // 复训到期日 / 再研修期限
    score: number                     // 考核分数 / 評価スコア
  }]
```

#### ServiceRate 扩展（新增费率类型）

```diff
// 新增 chargeType 枚举值:
+ 'box_splitting'                     // 分箱费 / 分箱費
+ 'box_merging'                       // 合箱费 / 合箱費
+ 'box_replacement'                   // 换箱费 / 箱替え費
+ 'photo_documentation'               // 拍照费 / 撮影費
+ 'rush_processing'                   // 加急处理费 / 特急対応費
+ 'multi_fc_surcharge'                // 多仓纳品附加费 / 複数FC納品追加費
+ 'overdue_storage'                   // 超期仓储费 / 長期保管費
```

## 2. 流程设计 / フロー設計

### 2.1 FBA 通过型全流程 / FBA 通過型フルフロー

```
客户提供数据                    系统处理                        仓库执行
顧客データ提供                  システム処理                    倉庫実行
─────────────────────────────────────────────────────────────────────

装箱单 Excel ──→ [入库预报导入] ──→ InboundOrder (draft)
                  ↓ SKU 自动匹配
                  ↓ 差异预警

                    ──→ InboundOrder (confirmed) ──→ [收货]
                                                      ↓ 逐箱点数
                                                      ↓ 外观检查
                                                      ↓ 异常拍照
                                                      ↓ 主管复核

                    ──→ InboundOrder (receiving) ──→ [检品]
                                                      ↓ 抽检/全检
                                                      ↓ 6 维度核对
                                                      ↓ 异常分类
                                                      ↓ InspectionRecord
                                                      ↓ ExceptionReport (如有)

                    ──→ InboundOrder (received) ──→ [贴标]
                                                      ↓ LabelingTask 创建
                                                      ↓ FNSKU 打印
                                                      ↓ 贴标执行
                                                      ↓ 双人复核

FBA 纳品计划 ──→ [FBA Plan 创建] ──→ [分箱/合箱]
                  ↓ 多仓拆分                          ↓ FbaBox 创建
                                                      ↓ 箱内容分配
                                                      ↓ 称重测量
                                                      ↓ 箱规校验

                    ──→ FBA Plan (confirmed) ──→ [FBA 出货]
                                                      ↓ 四项一致核对
                                                      ↓ 箱唛 + 配送标签
                                                      ↓ 封箱拍照
                                                      ↓ 交运 + 追踪号

                    ──→ FBA Plan (shipped) ──→ 追踪签收
```

### 2.2 检品流程详细设计 / 検品フロー詳細設計

```
                    ┌─────────────┐
                    │  开始检品    │
                    │  検品開始    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ 确认检品模式  │
                    │ 抽检 or 全检  │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │                         │
       ┌──────▼──────┐          ┌──────▼──────┐
       │   全检模式   │          │   抽检模式   │
       │   全数検品   │          │   抜取検品   │
       └──────┬──────┘          └──────┬──────┘
              │                         │
              └────────────┬────────────┘
                           │
                    ┌──────▼──────┐
                    │  逐项核对    │
                    │ SKU ✓       │
                    │ 条码 ✓      │
                    │ 数量 ✓      │
                    │ 外观 ✓      │
                    │ 配件 ✓      │
                    │ 包装 ✓      │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │                         │
       ┌──────▼──────┐          ┌──────▼──────┐
       │   全部通过   │          │   发现异常   │
       │   全件合格   │          │   異常発見   │
       └──────┬──────┘          └──────┬──────┘
              │                         │
              │                  ┌──────▼──────┐
              │                  │  异常分类    │
              │                  │ A / B / C    │
              │                  └──────┬──────┘
              │                         │
              │                  ┌──────▼──────┐
              │                  │  拍照记录    │
              │                  │  写真記録    │
              │                  └──────┬──────┘
              │                         │
              │                  ┌──────▼──────┐
              │                  │ ExceptionReport │
              │                  │  自动通知客户   │
              │                  └──────┬──────┘
              │                         │
              └────────────┬────────────┘
                           │
                    ┌──────▼──────┐
                    │ InspectionRecord │
                    │  保存检品记录     │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  复核人确认   │
                    │  確認者承認   │
                    └─────────────┘
```

### 2.3 异常处理流程 / 異常処理フロー

```
异常发现 ──→ [创建 ExceptionReport]
               ↓ 自动判定级别
               ↓ C 类: 30min 内通知
               ↓ B 类: 2h 内通知
               ↓ A 类: 4h 内通知

          ──→ [通知客户] (webhook + 系统通知)
               ↓ 记录 notifiedAt

          ──→ [客户确认] (客户门户操作)
               ↓ 记录 acknowledgedAt
               ↓ 客户提供处理指令

          ──→ [执行处理]
               ↓ 记录处理结果
               ↓ resolution

          ──→ [关闭]
               ↓ 自动计费（如适用）
               ↓ 更新 KPI 统计

超时未响应 ──→ [自动升级]
               ↓ 通知仓库主管
               ↓ 通知业务负责人
```

### 2.4 贴标任务流程 / ラベル貼付タスクフロー

```
FBA Plan confirmed
       │
       ▼
[自动生成 LabelingTask]
  │ 按 plan.items 拆分
  │ 每个 SKU 一个任务
  │
  ▼
[printing] 打印 FNSKU 标签
  │ 贴标员扫码确认打印批次
  │ 核对打印内容与 SKU
  │
  ▼
[labeling] 执行贴标
  │ 扫商品条码 → 匹配 SKU
  │ 贴 FNSKU → 覆盖原条码
  │ 逐件计数
  │ 同时处理：套袋/警示贴/合规标签
  │
  ▼
[verifying] 第二人复核
  │ 随机抽取 N 件
  │ 扫 FNSKU 验证与 SKU 对应关系
  │ 确认覆盖完整性
  │
  ▼
[completed]
  │ 记录 completedQuantity
  │ 自动计费（贴标费）
  │ 如有 fail → 生成 ExceptionReport
```

## 3. UI 设计要点 / UI 設計ポイント

### 3.1 移动端优先页面 / モバイル優先ページ

以下页面必须移动端可用（仓库现场 PDA/手机操作）：

以下のページはモバイル対応必須（倉庫現場 PDA/スマホ操作）：

| 页面 | 核心交互 | 设计要点 |
|---|---|---|
| 收货扫码 | 扫箱号条码 → 自动匹配入库单 | 大按钮、扫码输入框自动聚焦 |
| 检品操作 | 扫 SKU → 显示检品项 → 逐项确认 | 通过/失败切换、拍照按钮、异常快捷分类 |
| 贴标操作 | 扫商品 → 确认 FNSKU → 标记完成 | 计数器大字体、声音反馈（已有 scanBeep）|
| FBA 出货核对 | 扫箱号 → 显示箱内容 → 确认四项一致 | 核对清单逐项打勾、拍照 |
| 异常上报 | 选类型 → 拍照 → 描述 → 提交 | 一页完成、最少点击 |
| 盘点操作 | 扫库位 → 扫商品 → 输入数量 | 连续扫码模式、差异高亮 |

### 3.2 PC 管理端页面 / PC 管理画面

| 页面 | 功能 | 设计要点 |
|---|---|---|
| 异常报告列表 | 按级别/状态筛选、响应时效倒计时 | C 类红色高亮、超时闪烁 |
| FBA 箱管理 | 箱列表 + 箱内容编辑 + 箱规校验 | 拖拽分箱、实时校验反馈 |
| 检品记录列表 | 按入库单/日期/检品员筛选 | 照片缩略图预览 |
| 贴标任务看板 | 按状态分栏（待打印/贴标中/复核中/完成）| 看板式布局 |
| 循环盘点计划 | 月度计划生成 + 进度监控 + 差异报告 | 进度条、差异率颜色编码 |
| KPI 仪表板 | 目标值 vs 实际值对比 | 仪表盘 + 趋势图 |
| 客户报告 | 日报/周报/月报预览与发送 | 模板化 + 一键生成 |

### 3.3 照片组件设计 / 写真コンポーネント設計

统一的照片上传/查看组件，复用于检品、异常、出货等场景：

検品、異常、出荷など共通で使用する写真アップロード/閲覧コンポーネント：

```
PhotoCapture 组件:
- 拍照按钮（调用摄像头 API）
- 相册选择（备用）
- 即时压缩（客户端 resize 到 1200px 宽）
- 上传进度显示
- 缩略图预览 + 全屏查看
- 最多 10 张/次
- 自动标注时间戳 + 操作人
```

## 4. 参考文档 / 参考文書

- [需求文档](./01-requirements.md)
- [技术方案](./03-technical.md)
- [开发实现](./04-development.md)
- [开发计划](./05-plan.md)
- [决策记录](./06-decisions.md)
