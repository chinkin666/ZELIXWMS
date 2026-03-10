# Nexand 出荷管理システム - Frontend

Vue 3 + Element Plus ベースの出荷管理フロントエンド。

## 技術スタック

- **Vue 3** - Composition API
- **TypeScript** - 型安全な開発
- **Element Plus** - UIコンポーネント
- **Vue Router** - ルーティング
- **Pinia** - 状態管理
- **Vite** - ビルドツール

---

## ディレクトリ構造

```
src/
├── api/                    # API モジュール（10モジュール）
│   ├── base.ts             # axios インスタンス・共通設定
│   ├── shipmentOrders.ts   # 出荷注文 API
│   ├── product.ts          # 商品 API
│   ├── carrier.ts          # 配送会社 API
│   ├── carrierAutomation.ts # 配送会社自動化 API
│   ├── ecCompany.ts        # ECモール API
│   ├── orderSourceCompany.ts # 依頼主 API
│   ├── mappingConfig.ts    # 映射設定 API
│   ├── printTemplates.ts   # 印刷テンプレート API
│   └── formTemplate.ts     # 帳票テンプレート API
│
├── components/             # 共通コンポーネント
│   ├── SidebarMenu.vue     # サイドバーメニュー
│   │
│   ├── carrier-automation/ # 配送会社自動化関連
│   │   ├── YamatoB2ValidateResultDialog.vue
│   │   ├── YamatoB2ExportResultDialog.vue
│   │   └── YamatoB2ApiErrorDialog.vue
│   │
│   ├── mapping/            # 映射関連ダイアログ
│   │   ├── BarcodeMappingDialog.vue
│   │   ├── ProductMappingDialog.vue
│   │   ├── HandlingTagsMappingDialog.vue
│   │   ├── HandlingTagsIndexDialog.vue
│   │   └── MappingDetailDialog.vue
│   │
│   ├── print/              # 印刷関連
│   │   ├── PrintPreviewDialog.vue
│   │   └── MultiPagePrintPreviewDialog.vue
│   │
│   ├── table/              # テーブル関連
│   │   ├── Table.vue
│   │   ├── OrderTable.vue
│   │   ├── TableHeaderGroup.vue
│   │   ├── BulkEditDialog.vue
│   │   └── InfoTag.vue
│   │
│   ├── search/             # 検索関連
│   │   ├── SearchForm.vue
│   │   └── CarrierSelector.vue
│   │
│   ├── shipment-orders/    # 出荷注文関連
│   │   ├── OrderViewDialog.vue
│   │   └── AutoFillProductsDialog.vue
│   │
│   ├── shipment-operations/ # 出荷作業関連
│   │   └── PrintTemplateSelectDialog.vue
│   │
│   ├── waybill-management/ # 送り状関連
│   │   └── CarrierExportResultDialog.vue
│   │
│   ├── form-export/        # 帳票出力
│   │   └── FormExportDialog.vue
│   │
│   ├── import/             # インポート
│   │   └── ImportDialog.vue
│   │
│   ├── input/              # 入力関連
│   │   └── InputErrorDialog.vue
│   │
│   ├── bundle/             # バンドル
│   │   └── BundleFilterDialog.vue
│   │
│   └── form/               # フォーム
│       └── FormDialog.vue
│
├── data/                   # 静的データ・定数
│
├── layouts/                # レイアウト
│   └── MainLayout.vue      # メインレイアウト
│
├── router/                 # ルーティング
│   └── index.ts
│
├── stores/                 # Pinia ストア
│
├── theme/                  # テーマ設定
│   ├── config.ts           # 色定数
│   └── element.ts          # Element Plus テーマ
│
├── types/                  # 型定義（11ファイル）
│   ├── order.ts            # 注文型
│   ├── orderRow.ts         # 注文行型
│   ├── product.ts          # 商品型
│   ├── carrier.ts          # 配送会社型
│   ├── carrierAutomation.ts # 配送会社自動化型
│   ├── ecCompany.ts        # ECモール型
│   ├── orderSourceCompany.ts # 依頼主型
│   ├── printTemplate.ts    # 印刷テンプレート型
│   ├── formTemplate.ts     # 帳票テンプレート型
│   ├── table.ts            # テーブル型
│   └── xlsx.d.ts           # xlsx型定義
│
├── utils/                  # ユーティリティ
│   ├── print/              # 印刷ユーティリティ
│   ├── form-export/        # 帳票出力ユーティリティ
│   └── transforms/         # データ変換
│
├── views/                  # ページコンポーネント
│   ├── Welcome.vue         # ホーム画面
│   │
│   ├── shipment-orders/    # 出庫予定管理
│   │   ├── ShipmentOrderCreate.vue  # 出荷予定作成
│   │   ├── ShipmentOrderConfirm.vue # 出荷予定確定
│   │   └── ShipmentOrderHistory.vue # 出荷実績一覧
│   │
│   ├── waybill-management/ # 送り状管理
│   │   ├── CarrierExport.vue        # 配送会社データ出力
│   │   └── CarrierImport.vue        # 配送会社データ取込
│   │
│   ├── shipment-operations/ # 出荷作業
│   │   ├── ShipmentList.vue         # 出荷作業一覧
│   │   ├── ShipmentOperationsList.vue # 出荷一覧
│   │   ├── OneByOneInspection.vue   # 1-1検品出荷
│   │   ├── OneByOneScan.vue         # 1-1検品スキャン
│   │   ├── OrderItemScan.vue        # 商品スキャン検品
│   │   └── LookupAndPrint.vue       # 検索・印刷
│   │
│   └── settings/           # 設定
│       ├── BasicSettings.vue        # 基本設定
│       ├── OrderSourceCompany.vue   # 依頼主設定
│       ├── ProductSettings.vue      # 商品設定
│       ├── CarrierSettings.vue      # 配送会社設定
│       ├── ECCompanySettings.vue    # ECモール設定
│       ├── MappingPatterns.vue      # レイアウト管理
│       ├── MappingPatternNew.vue    # レイアウト作成/編集
│       ├── PrintTemplateSettings.vue # 印刷テンプレート一覧
│       ├── PrintTemplateEditor.vue   # 印刷テンプレート編集
│       ├── PrinterSettings.vue       # プリンター設定
│       ├── FormTemplateSettings.vue  # 帳票テンプレート一覧
│       ├── FormTemplateEditor.vue    # 帳票テンプレート編集
│       ├── CarrierAutomationSettings.vue # 配送会社自動化設定
│       ├── DependencySettings.vue    # 依存関係設定
│       └── UserAndPreferences.vue    # ユーザー設定
│
├── App.vue
└── main.ts
```

---

## ルート構成

```
/                           → /home へリダイレクト
├── /home                   # ホーム（Welcome）
│
├── /shipment-orders        # 出庫予定管理
│   ├── /create             # 出荷予定作成
│   ├── /confirm            # 出荷予定確定
│   └── /history            # 出荷実績一覧
│
├── /waybill-management     # 送り状管理
│   ├── /export             # 配送会社データ出力
│   └── /import             # 配送会社データ取込
│
├── /shipment-operations    # 出荷作業
│   ├── /list               # 出荷一覧
│   ├── /tasks              # 出荷作業一覧
│   ├── /one-by-one/scan    # 1-1検品出荷 スキャン入力
│   └── /one-by-one/scan/:orderId  # 1-1検品出荷 商品スキャン検品
│
└── /settings               # 設定
    ├── /basic              # 基本設定
    ├── /orderSourceCompany # 依頼主設定
    ├── /products           # 商品設定
    ├── /carrier            # 配送会社設定
    ├── /ec-company         # ECモール設定
    ├── /mapping-patterns   # レイアウト管理
    ├── /mapping-patterns/new       # レイアウト作成
    ├── /mapping-patterns/edit/:id  # レイアウト編集
    ├── /print-templates    # 印刷テンプレート
    ├── /print-templates/:id        # 印刷テンプレート編集
    ├── /printer            # プリンター設定
    ├── /form-templates     # 帳票テンプレート
    ├── /form-templates/:id         # 帳票テンプレート編集
    └── /carrier-automation # 配送会社自動化設定
```

---

## テーマ設定

### 色定数 (`theme/config.ts`)

```typescript
export const PRIMARY_COLOR = '#243B66'    // メインカラー
export const PRIMARY_LIGHT = '#5766C1'    // ライトバリエーション
export const PRIMARY_DARK = '#102040'     // ダークバリエーション
export const LINK_COLOR = '#00798F'       // リンクカラー
```

---

## API モジュール

### shipmentOrders.ts

| 関数 | 説明 |
|------|------|
| `listOrders(params)` | 注文一覧取得 |
| `getOrder(id)` | 注文詳細取得 |
| `createManualOrdersBulk(orders)` | 手動注文一括作成 |
| `updateOrder(id, data)` | 注文更新 |
| `deleteOrder(id)` | 注文削除 |
| `deleteOrdersBulk(ids)` | 注文一括削除 |
| `handleStatus(id, action)` | ステータス更新 |
| `handleStatusBulk(ids, action)` | ステータス一括更新 |
| `importCarrierReceipts(carrierId, rows)` | 回执取込 |
| `bulkUpdateOrders(updates)` | 一括更新 |

### product.ts

| 関数 | 説明 |
|------|------|
| `listProducts(params)` | 商品一覧取得 |
| `getProduct(id)` | 商品詳細取得 |
| `resolveSku(sku)` | SKU解決（子SKU対応） |
| `createProduct(data)` | 商品作成 |
| `updateProduct(id, data)` | 商品更新 |
| `deleteProduct(id)` | 商品削除 |
| `batchGetProducts(skus)` | 一括取得 |
| `validateImportProducts(data)` | インポート検証 |
| `importProductsBulk(data, mode)` | 一括インポート |

### carrierAutomation.ts

| 関数 | 説明 |
|------|------|
| `listConfigs()` | 設定一覧取得 |
| `getConfig(type)` | 設定詳細取得 |
| `upsertConfig(type, data)` | 設定作成/更新 |
| `deleteConfig(type)` | 設定削除 |
| `testConnection(type)` | 接続テスト |
| `yamatoB2Validate(orderIds)` | B2検証 |
| `yamatoB2Export(orderIds)` | B2出力 |
| `yamatoB2Print(orderIds)` | B2印刷 |
| `yamatoB2Import(orderIds)` | B2取込 |
| `yamatoB2History()` | 履歴取得 |
| `yamatoB2Unconfirm(orderIds)` | 確認取消 |

---

## 主要コンポーネント

### テーブル系

- **`Table.vue`** - 汎用テーブルコンポーネント
- **`OrderTable.vue`** - 注文専用テーブル（ステータス表示、一括操作対応）
- **`BulkEditDialog.vue`** - 一括編集ダイアログ

### 印刷系

- **`PrintPreviewDialog.vue`** - 送り状プレビュー
- **`MultiPagePrintPreviewDialog.vue`** - 複数ページプレビュー
- **`PrintTemplateSelectDialog.vue`** - テンプレート選択

### 映射系

- **`BarcodeMappingDialog.vue`** - バーコード映射設定
- **`ProductMappingDialog.vue`** - 商品映射設定
- **`HandlingTagsMappingDialog.vue`** - 荷扱いタグ映射

### 自動化系

- **`YamatoB2ValidateResultDialog.vue`** - B2検証結果表示
- **`YamatoB2ExportResultDialog.vue`** - B2出力結果表示
- **`YamatoB2ApiErrorDialog.vue`** - B2 APIエラー表示

---

## 開発

### セットアップ

```bash
cd frontend
npm install
```

### 開発サーバー起動

```bash
npm run dev
```

### ビルド

```bash
npm run build
```

### 型チェック

```bash
npm run type-check
```

### Lint

```bash
npm run lint
```

---

## 環境変数

`.env` ファイルで設定:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```
