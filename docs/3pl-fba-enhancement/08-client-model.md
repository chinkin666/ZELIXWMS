# 08 客户体系与计费模型 / 顧客体系・課金モデル

> 客户层级、多店铺、子客户/分公司、价格目录、信用额度、费用明细
> 顧客階層、複数店舗、サブ顧客/支社、価格カタログ、与信枠、費用明細

## 1. 客户层级结构 / 顧客階層構造

```
Client（顶层客户 / トップ顧客）
  │
  │  身份: 跨境物流公司 / 日本商社 / 日本本土公司
  │  关系: 与仓库（我们）签合同、结算
  │  价格: 拥有独立价格目录
  │  账单: 所有费用归到这一层结算
  │
  ├─ SubClient（子客户/分公司 / サブ顧客・支社）
  │    │
  │    │  身份: 物流公司的客户 / 总公司的分公司
  │    │  关系: 属于顶层客户，不直接跟仓库结算
  │    │  费用: 有明细可查，不出独立账单
  │    │
  │    ├─ Shop（店铺 / 店舗）
  │    │    身份: Amazon.co.jp / 楽天 / 自社 EC / B2B
  │    │    关联: FNSKU 体系、纳品计划、商品主数据
  │    │    费用: 有明细可查
  │    │
  │    └─ Shop
  │
  └─ SubClient
       └─ Shop
```

### 1.1 实际场景 / 実際のシナリオ

**场景 1: 中国跨境物流公司**
```
深圳 XX 国际物流（Client）
  ├─ 卖家张三（SubClient）
  │    ├─ Amazon.co.jp 店铺 A（Shop）
  │    └─ 楽天店铺 B（Shop）
  ├─ 卖家李四（SubClient）
  │    └─ Amazon.co.jp 店铺 C（Shop）
  └─ 卖家王五（SubClient）— 直接挂 Client 下，没有独立店铺
```

**场景 2: 日本本土公司**
```
株式会社 XX（Client）
  ├─ 東京支社（SubClient）
  │    └─ Amazon.co.jp 店铺（Shop）
  ├─ 大阪支社（SubClient）
  │    └─ 楽天店铺（Shop）
  └─ 福岡支社（SubClient）
```

**场景 3: 独立小卖家（无子层级）**
```
个人卖家 A（Client）
  └─ Amazon.co.jp 店铺（Shop）— 直接挂 Client 下
```

## 2. 数据模型 / データモデル

### 2.1 Client（顶层客户）

```
Client {
  _id: ObjectId
  tenantId: string
  clientCode: string (unique)          // 客户编号
  name: string                         // 客户名称
  name2: string                        // 别名/英文名
  clientType: enum[
    'logistics_company',               // 跨境物流公司
    'domestic_company',                // 日本本土公司
    'individual_seller'                // 独立卖家
  ]

  // 联系信息 / 連絡先
  contact: {
    postalCode: string
    prefecture: string
    city: string
    address1: string
    address2: string
    phone: string
    email: string
    contactPerson: string              // 负责人
  }

  // 信用额度 / 与信枠
  creditTier: enum['vip', 'standard', 'new', 'custom']
  creditLimit: number                  // 允许欠款上限（円）
  currentBalance: number               // 当前未结余额
  paymentTermDays: number              // 结算周期（天）如 30/60

  // 价格目录 / 価格カタログ
  priceCatalogId: ObjectId             // 关联 PriceCatalog

  // 门户登录 / ポータルログイン
  portalEnabled: boolean
  portalLanguage: enum['zh', 'ja', 'en']

  // 状态 / ステータス
  isActive: boolean
  plan: enum['free', 'standard', 'pro', 'enterprise']
  memo: string

  createdAt: Date
  updatedAt: Date
}
```

### 2.2 SubClient（子客户/分公司）

```
SubClient {
  _id: ObjectId
  tenantId: string
  clientId: ObjectId                   // ★ 归属顶层客户
  subClientCode: string                // 子客户编号
  name: string
  name2: string
  subClientType: enum[
    'end_customer',                    // 物流公司的客户（卖家）
    'branch_office'                    // 总公司的分公司/支社
  ]

  // 联系信息 / 連絡先
  contact: {
    contactPerson: string
    phone: string
    email: string
  }

  // 门户登录 / ポータルログイン（可选：子客户也能登录查看自己的数据）
  portalEnabled: boolean
  portalUserId: ObjectId               // 关联 User（如果子客户有独立登录）

  isActive: boolean
  memo: string

  createdAt: Date
  updatedAt: Date
}

索引:
- { tenantId: 1, clientId: 1 }
- { tenantId: 1, subClientCode: 1 } unique
```

### 2.3 Shop（店铺）

```
Shop {
  _id: ObjectId
  tenantId: string
  clientId: ObjectId                   // ★ 归属顶层客户
  subClientId: ObjectId                // 归属子客户（可选，独立卖家直接挂 Client）

  shopCode: string                     // 店铺编号
  shopName: string
  platform: enum[
    'amazon_jp',                       // Amazon.co.jp
    'rakuten',                         // 楽天
    'yahoo_shopping',                  // Yahoo!ショッピング
    'shopify',                         // 自社 EC
    'b2b',                             // B2B 批发
    'other'
  ]

  // 平台信息 / プラットフォーム情報
  platformAccountId: string            // 平台店铺 ID（如 Amazon Seller ID）
  platformStoreName: string            // 平台上的店铺名

  // FNSKU 等平台特有数据挂在商品级别，不在店铺级别
  // 但店铺决定了商品属于哪个平台体系

  isActive: boolean
  memo: string

  createdAt: Date
  updatedAt: Date
}

索引:
- { tenantId: 1, clientId: 1 }
- { tenantId: 1, subClientId: 1 }
- { tenantId: 1, shopCode: 1 } unique
```

### 2.4 PriceCatalog（价格目录）

```
PriceCatalog {
  _id: ObjectId
  tenantId: string
  catalogName: string                  // 如 "深圳XX物流 专属价格"
  clientId: ObjectId                   // 关联客户（一对一）
  description: string

  // 价格项 / 価格項目
  items: [{
    serviceCode: string                // 作业项编码 如 'fnsku_labeling'
    serviceName: string                // '贴 FNSKU / FNSKU 貼付'
    unit: enum['per_item', 'per_case', 'per_order', 'per_pallet',
               'per_location_day', 'per_sheet', 'per_set', 'flat']
    unitPrice: number                  // 单价（円）
    minCharge: number                  // 最低收费（可选）
    notes: string                      // 备注
    isActive: boolean
  }]

  // 生效 / 有効期間
  effectiveFrom: Date
  effectiveTo: Date                    // null = 无限期

  createdAt: Date
  updatedAt: Date
}

索引:
- { tenantId: 1, clientId: 1 }
```

### 2.5 关联关系图 / リレーション図

```
Client (1) ──── (1) PriceCatalog        价格一对一
  │
  ├── (N) SubClient                     一个客户多个子客户/分公司
  │     │
  │     └── (N) Shop                    一个子客户多个店铺
  │
  ├── (N) Shop                          独立卖家：店铺直接挂客户
  │
  ├── (N) InboundOrder                  入库预定挂 clientId + subClientId + shopId
  │
  └── (1) BillingRecord                 账单只出到客户级别
           │
           └── (N) WorkCharge           费用明细挂 clientId + subClientId + shopId
                                        可按任意层级筛选查看
```

## 3. 计费体系 / 課金体系

### 3.1 价格目录管理 / 価格カタログ管理

```
仓库管理员操作:

1. 创建客户时，自动生成空的价格目录
2. 进入价格目录页面，逐项设定单价
3. 可以从其他客户的目录复制（快速设定）
4. 可以设定生效日期（用于调价：新目录未来生效，旧目录自动失效）

界面:
┌──────────────────────────────────────────┐
│ 价格目录: 深圳XX物流 専属价格             │
│ 客户: 深圳XX物流  生效: 2026-04-01 ~     │
├──────────┬──────┬────────┬───────────────┤
│ 作业项    │ 单位 │ 单价   │ 最低收费       │
├──────────┼──────┼────────┼───────────────┤
│ 数量点数  │ 件   │ ¥5    │ ¥500          │
│ 贴 FNSKU │ 件   │ ¥15   │ —             │
│ 套 OPP 袋│ 件   │ ¥10   │ —             │
│ 开箱全检  │ 件   │ ¥20   │ ¥1,000        │
│ 分箱      │ 箱   │ ¥200  │ —             │
│ 换箱      │ 箱   │ ¥300  │ —             │
│ 拍照留档  │ 次   │ ¥100  │ —             │
│ 保管费    │ 坪/日│ ¥50   │ —             │
│ 入库费    │ 箱   │ ¥150  │ —             │
│ FBA 出库  │ 箱   │ ¥200  │ —             │
│ ...       │      │       │               │
└──────────┴──────┴────────┴───────────────┘
```

### 3.2 费用流转 / 費用フロー

```
客户预定入库（选了作业项）
  ↓
系统预估费用 = Σ(作业项数量 × 客户价格目录单价)
  ↓ 显示给客户确认
  ↓
仓库执行作业，记录实际数量
  ↓
实际费用 = Σ(实际作业数量 × 客户价格目录单价)
  ↓
WorkCharge 记录:
  - clientId: 顶层客户
  - subClientId: 子客户（可选）
  - shopId: 店铺（可选）
  - chargeType: 'fnsku_labeling'
  - quantity: 500
  - unitPrice: ¥15
  - amount: ¥7,500
  - referenceType: 'inbound_order'
  - referenceId: xxx
  ↓
月末汇总 → BillingRecord（只对顶层客户）
  ↓
生成 Invoice（只对顶层客户）
  附: 费用明细可按 子客户/店铺 拆分查看
```

### 3.3 信用额度控制 / 与信枠管理

```
客户等级:
  VIP     → creditLimit: ¥5,000,000  paymentTerm: 60 天
  标准    → creditLimit: ¥1,000,000  paymentTerm: 30 天
  新客户  → creditLimit: ¥100,000   paymentTerm: 预付/保证金
  自定义  → 仓库自由设定

控制逻辑:
  客户创建入库预定时:
    if (currentBalance + estimatedCost > creditLimit) {
      // 阻止提交，提示"超出信用额度，请先结算"
      // 提出をブロックし「与信枠超過、先に精算してください」と表示
    }

  currentBalance 更新时机:
    + 作业完成时（实际费用累加）
    - 客户付款时（减少余额）
```

### 3.4 客户门户费用查看 / 顧客ポータル費用閲覧

```
客户登录门户看到:

┌─────────────────────────────────────────────┐
│ 费用总览                                     │
│ 本月累计: ¥1,234,567                         │
│ 信用额度: ¥5,000,000  已用: 24.7%            │
├─────────────────────────────────────────────┤
│ 按子客户/分公司:                              │
│  卖家张三    ¥456,000   (36.9%)              │
│  卖家李四    ¥378,567   (30.7%)              │
│  卖家王五    ¥400,000   (32.4%)              │
├─────────────────────────────────────────────┤
│ 按店铺:                                      │
│  张三 Amazon  ¥300,000                       │
│  张三 楽天    ¥156,000                        │
│  李四 Amazon  ¥378,567                       │
│  王五 Amazon  ¥400,000                       │
├─────────────────────────────────────────────┤
│ 费用明细 (可导出 CSV):                        │
│ 日期    | 预定号  | 店铺      | 作业   | 金额  │
│ 03-15  | IN-001 | 张三Amazon | 贴标   | ¥7500 │
│ 03-15  | IN-001 | 张三Amazon | 点数   | ¥2500 │
│ ...                                          │
└─────────────────────────────────────────────┘
```

## 4. 多语言 / 多言語対応

### 4.1 支持语言 / 対応言語

| 语言 | 使用场景 |
|------|---------|
| 中文（zh-CN）| 中国客户门户、中国物流公司操作 |
| 日文（ja）| 仓库端操作、日本本土客户门户 |
| 英文（en）| 备用、国际客户 |

### 4.2 实现方案 / 実装方案

```
前端: vue-i18n（已有 i18n 基础 — frontend/src/i18n/wms.ts）
  - 客户门户: 按客户 portalLanguage 设定默认语言
  - 仓库端: 按用户设置
  - 右上角语言切换器

后端: 错误信息 / 通知模板多语言
  - 通知模板按语言存储多份
  - API 响应的 message 按 Accept-Language header 返回

需要翻译的内容:
  - 客户门户全部页面
  - 作业选项名称（ServiceOption.optionName 存多语言）
  - 通知模板（异常通知、出货通知等）
  - 导出文档（账单、纳品书）
  - 打印模板（标签上的文字）

不需要翻译:
  - 仓库内部管理页面（保持现有中日双语注释即可）
  - API 字段名（保持英文）
  - 数据库字段（保持英文）
```

## 5. 门户权限 / ポータル権限

```
顶层客户管理员:
  - 看到所有子客户、所有店铺的数据
  - 可以创建/管理子客户和店铺
  - 可以查看汇总账单和全部明细
  - 可以给子客户创建门户账号

子客户用户（可选开放）:
  - 只看到自己的数据（自己的店铺、预定、费用）
  - 可以创建入库预定
  - 可以上传商品和 FBA 标
  - 不能看到其他子客户的数据
  - 不能看到汇总账单（只看自己的明细）
```

## 6. 对现有模型的影响 / 既存モデルへの影響

```
需要修改:
  - Client 模型: 增加 clientType, creditTier, creditLimit, currentBalance,
                 paymentTermDays, priceCatalogId, portalLanguage
  - WorkCharge 模型: 增加 subClientId, shopId 字段
  - BillingRecord 模型: 不变（本来就只到 clientId 级别）
  - InboundOrder 模型: 增加 subClientId, shopId 字段
  - User 模型: 增加 subClientId（子客户用户关联）

需要新建:
  - SubClient 模型
  - Shop 模型
  - PriceCatalog 模型

需要修改的查询:
  - 所有按 clientId 筛选的地方，增加 subClientId / shopId 可选筛选
  - 费用汇总增加按 subClient / shop 分组能力
```

## 7. 参考文档 / 参考文書

- [通过型流程](./07-passthrough-flow.md)
- [需求文档](./01-requirements.md)
- [设计文档](./02-design.md)
- [技术方案](./03-technical.md)
