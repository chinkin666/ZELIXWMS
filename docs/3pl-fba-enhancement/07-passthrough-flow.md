# 07 通过型实际业务流程（FBA / RSL / B2B）/ 通過型実務フロー（FBA / RSL / B2B）

> 本文档是通过型业务的核心设计，基于实际运营流程编写，优先级高于 01-04 中的通用设计。
> 本書は通過型業務のコア設計であり、実務フローに基づく。01-04 の汎用設計より優先する。
>
> 同一套通过型流程适用于三种出货目的地：
> 同一の通過型フローが 3 種の出荷先に適用される：
> - **FBA** → Amazon Fulfillment Center（贴 FBA 外箱标）
> - **RSL** → 楽天スーパーロジスティクス倉庫（贴 RSL 标）
> - **B2B** → 客户指定地址：门店/批发商/其他仓库（贴配送标签）

## 1. 角色定义 / ロール定義

| 角色 | 操作端 | 职责 |
|------|--------|------|
| 客户（中国卖家）| 客户门户（Web）| 上传商品、FBA 标、选择作业项、创建入库预定 |
| 仓库（日本 3PL）| 仓库端（Web/PDA）| 受付、暂存、执行作业、匹配快递单、出货 |

## 2. 客户门户流程 / 顧客ポータルフロー

### 2.1 商品登录 / 商品登録

客户在门户上传商品信息，两种情况：

顧客がポータルで商品情報をアップロードする。2 パターンあり：

**完整上传 / 完全アップロード:**
- SKU
- FNSKU
- 商品名称 / 商品名
- JAN/EAN（可选）
- 商品图片（可选）

**简易上传 / 簡易アップロード:**
- 只传商品名称 + 数量
- SKU/FNSKU 后续补充

系统自动创建/更新商品主数据。已存在的 SKU 自动匹配，不重复创建。

### 2.2 入库预定 / 入庫予約

客户创建入库预定时需要填写：

顧客が入庫予約を作成する際に入力する内容：

**基本信息 / 基本情報:**
- 预定到达日 / 予定到着日
- 总箱数 / 総箱数
- 备注 / 備考

**商品明细 / 商品明細:**
- 每个 SKU 的数量
- 所在箱号（可选，客户知道就填）

**FBA 信息 / FBA 情報:**
- FBA 纳品计划编号（Amazon Shipment ID）
- 目的 FC（如 NRT5、KIX2 等）
- FBA 外箱标 PDF 上传（★ 核心）

**作业选项（收费点）/ 作業オプション（課金ポイント）:**

客户勾选需要仓库执行的作业，每项对应一个收费标准：

顧客が倉庫に依頼する作業を選択する。各項目に料金が紐づく：

| 选项 | 说明 | 费率单位 |
|------|------|---------|
| ☑ 数量点数（必选）| 清点箱数与商品数量 | 件/箱 |
| ☐ 开箱全检 | 每件商品外观/配件检查 | 件 |
| ☐ 开箱抽检 | 按比例抽检 | 件 |
| ☐ 贴 FNSKU | 贴 Amazon FNSKU 标签 | 件 |
| ☐ 套 OPP 袋 | 商品套防窒息袋 | 件 |
| ☐ 贴防窒息标 | 窒息警告标签 | 件 |
| ☐ 贴易碎标 | Fragile 标签 | 件 |
| ☐ 气泡膜包装 | 缓冲包装 | 件 |
| ☐ 组合套装 | 多 SKU 合成套装 | 套 |
| ☐ 分箱 | 重新分箱 | 箱 |
| ☐ 换箱 | 更换外箱 | 箱 |
| ☐ 拍照留档 | 商品/外箱拍照 | 次 |

> 费率从 ServiceRate 取，客户端显示单价。客户提交前能看到预估费用。
> 料金は ServiceRate から取得し、顧客側に単価を表示。提出前に概算費用を確認可能。

### 2.3 提交后系统生成 / 提出後のシステム生成物

客户点击「入库预定确定」后，系统自动生成：

顧客が「入庫予約確定」を押すと、システムが自動生成：

1. **入库预定表** — 可打印的预定单，包含预定编号、客户名、商品明细、作业要求
2. **入库外箱标** — 系统生成的内部箱标（用于仓库受付扫码，不是 Amazon 的标）
3. **商品登录** — 自动注册/更新商品主数据
4. **商品标签** — 客户可在门户直接打印 FNSKU 等商品标签（如果客户自己贴）

### 2.4 客户自助功能 / 顧客セルフサービス

客户门户还能看到：

- **差异明细** — 到货后如有差异，仓库提交差异数据，客户自己查看确认
- **作业进度** — 当前预定的状态（待到货/已受付/作业中/已出货）
- **费用预览** — 基于选的作业项 × 数量，预估费用
- **历史记录** — 过往入库/出货记录
- **FBA 标补传** — 如果预定时没传 FBA 标，后续补传入口

## 3. 仓库端流程 / 倉庫側フロー

### 3.1 受付（到货接收）/ 受付（到着受領）

```
货到了
  ↓
扫描入库外箱标（系统内部标，不是 Amazon 标）
  ↓
系统自动匹配入库预定单
  ↓
逐箱扫描，记录实到箱数
  ↓
实到 ≠ 预定 → 自动生成差异明细，客户门户可见
  ↓
点击「受付完了」
  ↓
状态变更: 待到货 → 已受付
  ↓
放入暂存区（通过型不上架）
```

### 3.2 作业执行 / 作業実行

根据客户选择的作业项，生成作业任务清单：

顧客が選択した作業オプションに基づき、作業タスクリストを生成：

```
入库预定（作业选项: 数量点数 + 贴 FNSKU + 套 OPP 袋）
  ↓
系统自动生成 3 个作业任务:
  Task 1: 数量点数 — 核对每箱 SKU 与数量
  Task 2: 贴 FNSKU — 打印 FNSKU 标签 + 逐件贴标
  Task 3: 套 OPP 袋 — 逐件套袋
  ↓
仓库人员按任务清单执行
  ↓
每个任务完成时:
  - 记录实际作业数量
  - 自动计费（作业数量 × 费率）
  - 发现异常 → 生成差异/异常记录 → 客户门户可见
```

### 3.3 检品出货（通过型核心）/ 検品出荷（通過型コア）

通过型的关键：**入库检品 = 出荷准备**。检完就发，不做保管。

通過型のポイント：**入庫検品 = 出荷準備**。検品完了即出荷、保管なし。

```
作业全部完成
  ↓
匹配 FBA 外箱标 ↔ 快递单
  │
  ├─ 客户已上传 FBA 外箱标 PDF
  │    ↓
  │  系统拆分 PDF（4-up/6-up → 单张）
  │    ↓
  │  热敏打印单张外箱标
  │    ↓
  │  贴到对应箱上
  │
  └─ 客户未上传 FBA 外箱标
       ↓
     状态卡住:「FBA 标未上传」
       ↓
     客户门户显示提醒，等待补传
       ↓
     客户补传后继续
  ↓
配送方式:
  ├─ 整票约车 → 所有箱一起发，一个运单
  └─ 逐箱发快递 → 每箱一个快递单号
  ↓
录入快递单号（追踪号）
  ↓
点击「出荷完了」
  ↓
状态变更: 作业中 → 已出货
  ↓
客户门户可查看追踪号
```

## 4. FBA 外箱标 PDF 处理 / FBA 外箱ラベル PDF 処理

### 4.1 问题 / 課題

Amazon Seller Central 生成的外箱标 PDF 格式不统一：
- **6-up**: 一页 6 个标签（2列 × 3行）
- **4-up**: 一页 4 个标签（2列 × 2行）
- 每个标签对应一个箱

仓库需要单张热敏打印（100mm × 150mm 或类似），不能直接打整页。

### 4.2 处理方案 / 処理方案

```
客户上传 PDF
  ↓
[PDF 解析服务]
  ↓
1. 检测布局（4-up / 6-up / 单张）
   - 分析 PDF 页面尺寸与内容分布
   - 或让客户上传时选择格式
  ↓
2. 按网格切割
   - 6-up: 每页切成 6 个区域
   - 4-up: 每页切成 4 个区域
   - 单张: 不切
  ↓
3. 每个区域导出为单独图片（PNG/PDF）
   - 分辨率: 300dpi（热敏打印清晰）
   - 尺寸: 适配热敏标签纸
  ↓
4. 自动编号关联
   - 提取每张标签上的箱号（FBA 箱编号 U001, U002...）
   - 关联到入库预定的对应箱
  ↓
5. 存储到照片服务（S3/MinIO）
  ↓
6. 仓库端逐张预览 + 热敏打印
```

### 4.3 技术实现 / 技術実装

```
后端:
- 使用 pdf-lib 或 pdf-parse + sharp 处理 PDF
- pdf-lib: 读取 PDF 页面，按坐标裁切
- sharp: 图片处理（缩放、格式转换）
- 可选 pdftoppm (poppler-utils): PDF → 高分辨率图片，再按网格切

API:
POST /api/fba-labels/upload          # 上传原始 PDF
POST /api/fba-labels/split           # 拆分（自动检测或指定布局）
GET  /api/fba-labels/:planId         # 获取拆分后的单张标签列表
GET  /api/fba-labels/:planId/:index  # 获取单张标签图片
POST /api/fba-labels/:planId/print   # 触发热敏打印

前端:
- 上传 PDF 后预览拆分结果
- 拖拽调整标签 ↔ 箱号对应关系（如果自动识别不准）
- 单张打印 / 全部打印 按钮
```

### 4.4 降级方案 / フォールバック

如果 PDF 自动拆分太复杂或识别不准：

- 客户上传时选择「4-up」或「6-up」（下拉框）
- 按固定网格切割，不做智能识别
- 如果还不行，客户自己切成单张再上传

## 5. 状态机 / ステートマシン

### 5.1 入库预定状态 / 入庫予約ステータス

```
draft (草稿)
  │ 客户填写中
  ↓
confirmed (已确认)
  │ 客户点击「入库预定确定」
  │ 系统生成预定表、外箱标、商品登录
  ↓
arrived (已受付)
  │ 仓库扫码受付
  │ 如有差异 → 差异明细自动生成
  ↓
processing (作业中)
  │ 按作业选项执行任务
  │ 每个任务完成自动计费
  ↓
awaiting_label (等待 FBA 标)     ← 仅当客户未上传 FBA 标时
  │ 客户补传后自动跳转
  ↓
ready_to_ship (待出货)
  │ 所有作业完成 + FBA 标就绪
  │ 匹配快递单
  ↓
shipped (已出货)
  │ 录入追踪号，出货完成
  ↓
completed (完结)
  │ 客户确认 / 自动完结
```

### 5.2 与现有模型的关系 / 既存モデルとの関係

```
通过型入库预定 ≠ 现有 InboundOrder

现有 InboundOrder 是保管型的：receive → putaway → storage
通过型需要一个新的流程: arrive → process → ship

方案:
- 扩展 InboundOrder 增加 flowType: 'passthrough' | 'storage'
- passthrough 模式跳过 putaway，直接进入作业 → 出货
- 或者新建 PassthroughOrder 独立模型

推荐: 扩展 InboundOrder + flowType
理由: 复用现有的客户关联、商品明细、收货逻辑，只是后半段流程不同
```

## 6. 数据模型补充 / データモデル補足

### 6.1 入库预定扩展（通过型）/ 入庫予約拡張（通過型）

```diff
InboundOrder 扩展:
+ flowType: enum['storage', 'passthrough']    // 保管型 / 通过型
+ serviceOptions: [{                           // 客户选择的作业项
    optionCode: string                         // 如 'fnsku_labeling'
    optionName: string                         // 如 '贴 FNSKU'
    quantity: number                           // 预计数量
    unitPrice: number                          // 从 ServiceRate 取
    estimatedCost: number                      // 预估费用
    actualQuantity: number                     // 实际作业数量（仓库填）
    actualCost: number                         // 实际费用
    status: enum['pending', 'in_progress', 'completed']
  }]
+ fbaInfo: {
    shipmentId: string                         // Amazon Shipment ID
    destinationFc: string                      // 目的 FC
    labelPdfUrl: string                        // 原始 PDF URL
    labelSplitStatus: enum['pending', 'split', 'failed']
    splitLabels: [{                            // 拆分后的单张标签
      index: number
      boxNumber: string                        // U001, U002...
      imageUrl: string
      printed: boolean
    }]
  }
+ shippingMethod: enum['truck', 'parcel']      // 约车 / 逐箱快递
+ trackingNumbers: [{                          // 可能多个（逐箱发时）
    boxNumber: string
    trackingNumber: string
    carrier: string
  }]
+ varianceReport: {                            // 差异明细
    hasVariance: boolean
    details: [{
      sku: string
      expectedQuantity: number
      actualQuantity: number
      variance: number
      note: string
    }]
    reportedAt: Date
    clientViewedAt: Date                       // 客户查看时间
  }
```

### 6.2 作业选项配置 / 作業オプション設定

```
ServiceOption {
  _id: ObjectId
  tenantId: string
  optionCode: string                           // 'fnsku_labeling'
  optionName: string                           // '贴 FNSKU / FNSKU 貼付'
  category: enum['inspection', 'labeling', 'packaging', 'processing', 'other']
  isRequired: boolean                          // 是否必选（如数量点数）
  chargeType: string                           // 对应 ServiceRate 的 chargeType
  unit: string                                 // 件/箱/套/次
  description: string                          // 说明
  sortOrder: number
  isActive: boolean
}
```

## 7. 客户门户改造要点 / 顧客ポータル改修ポイント

```
现有 ClientPortal 功能:
- 出货统计 ✓
- 库存查询 ✓
- 追踪号查询 ✓

需要新增:
1. 【商品管理】上传/编辑 SKU、FNSKU、商品图片
2. 【入库预定】创建预定 + 选择作业选项 + 上传 FBA 标 + 费用预估
3. 【入库状态】实时查看预定进度（受付/作业中/已出货）
4. 【差异明细】到货差异自动展示，客户确认
5. 【FBA 标补传】未上传时的提醒 + 补传入口
6. 【费用明细】每次入库的作业费用明细
7. 【商品标签打印】在线打印 FNSKU 等标签
```

## 8. 多目的地适配 / 複数出荷先対応

### 8.1 流程差异 / フロー差異

核心流程完全一样（客户上传 → 预定 → 受付 → 作业 → 出货），只有最后出货环节不同：

コアフローは完全に同一（顧客アップロード → 予約 → 受付 → 作業 → 出荷）、出荷段階のみ異なる：

| | FBA | RSL | B2B |
|---|---|---|---|
| 外箱标来源 | Amazon Seller Central PDF | 楽天 RSL 管理画面 PDF | 不需要平台标，用配送标签 |
| 外箱标处理 | PDF 拆分（4-up/6-up）→ 热敏打印 | PDF 拆分（格式类似 FBA）→ 热敏打印 | 无需拆分 |
| 配送标签 | FBA 承运商（佐川等）| RSL 指定承运商 | 客户指定承运商或仓库安排 |
| 配送方式 | 整票约车 / 逐箱快递 | 整票约车 / 逐箱快递 | 整票 / 逐箱 / 混载 |
| 追踪 | 送达 Amazon FC | 送达楽天仓库 | 送达客户指定地址 |
| 特殊要求 | FNSKU 必须、箱规限制 | RSL 标签规格、入库规则 | 客户个性化要求（纳品书等）|

### 8.2 数据模型适配 / データモデル対応

```diff
InboundOrder 扩展:
+ destinationType: enum['fba', 'rsl', 'b2b']     // 出货目的地类型

+ fbaInfo: { ... }                                 // FBA 专用（同 §6.1）

+ rslInfo: {                                       // RSL 专用
    rslPlanId: string                              // 楽天纳品计划 ID
    destinationWarehouse: string                   // RSL 仓库编号
    labelPdfUrl: string                            // RSL 外箱标 PDF
    labelSplitStatus: enum['pending', 'split', 'failed']
    splitLabels: [{ index, boxNumber, imageUrl, printed }]
  }

+ b2bInfo: {                                       // B2B 专用
    deliveryAddress: {                             // 配送地址
      postalCode: string
      prefecture: string
      city: string
      address1: string
      address2: string
      recipientName: string
      phone: string
    }
    deliveryNote: string                           // 纳品备注
    requireDeliverySlip: boolean                   // 是否需要纳品书
    deliverySlipTemplateId: ObjectId               // 纳品书模板
  }
```

### 8.3 客户门户适配 / 顧客ポータル対応

客户创建入库预定时，第一步选择出货目的地类型：

顧客が入庫予約を作成する際、最初に出荷先タイプを選択：

```
[ FBA ]  [ RSL ]  [ B2B ]
   ↓        ↓        ↓
FBA 信息   RSL 信息   配送地址
上传外箱标  上传外箱标  纳品书设置
```

作业选项部分通用（贴标、检品、包装等），不随目的地变化。

### 8.4 仓库端适配 / 倉庫側対応

仓库端流程完全一样，只是出货时：

| 操作 | FBA | RSL | B2B |
|------|-----|-----|-----|
| 匹配标签 | FBA 外箱标 ↔ 快递单 | RSL 外箱标 ↔ 快递单 | 直接贴快递单 |
| 打印标签 | 热敏拆分打印 | 热敏拆分打印 | 普通配送标签 |
| 纳品书 | 不需要 | 不需要 | B2B 可能需要 |

## 9. 与原文档的关系 / 元ドキュメントとの関係

```
本文档 (07) 描述通过型实际流程，是最优先的设计依据。

01-requirements.md  → 通过型相关需求以本文档为准
02-design.md        → 通过型数据模型以本文档 §6 为准
03-technical.md     → PDF 拆分 API 见本文档 §4.3，其余通用部分仍有效
04-development.md   → 通过型开发任务以本文档为准，文件结构仍参考 04
05-plan.md          → Phase 排期需根据本文档调整
06-decisions.md     → 新增 ADR: 通过型扩展 InboundOrder 而非新建模型
```

## 9. 参考文档 / 参考文書

- [SOP 管理版](../japan-3pl-fba-sop-management.md)
- [SOP 仓库作业版](../japan-3pl-fba-sop-warehouse.md)
- [需求文档](./01-requirements.md)
- [设计文档](./02-design.md)
- [技术方案](./03-technical.md)
- [开发实现](./04-development.md)
- [开发计划](./05-plan.md)
- [决策记录](./06-decisions.md)
