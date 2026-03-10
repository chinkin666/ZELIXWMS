# Nexand 出荷管理システム - Backend

Node.js + Express + MongoDB ベースの出荷管理バックエンド。

## 技術スタック

- **Node.js 20** + **TypeScript 5**
- **Express** - Webフレームワーク
- **MongoDB** + **Mongoose** - データベース
- **Pino** - ロギング
- **Multer** - ファイルアップロード

---

## ディレクトリ構造

```
backend/
├── src/
│   ├── api/
│   │   ├── routes/           # Express ルーター
│   │   │   ├── index.ts      # ルート登録
│   │   │   ├── shipmentOrders.ts
│   │   │   ├── mappingConfigs.ts
│   │   │   ├── products.ts
│   │   │   ├── carriers.ts
│   │   │   ├── ecCompanies.ts
│   │   │   ├── orderSourceCompanies.ts
│   │   │   ├── printTemplates.ts
│   │   │   ├── formTemplates.ts
│   │   │   └── carrierAutomation.ts
│   │   │
│   │   └── controllers/      # コントローラー
│   │       ├── shipmentOrderController.ts
│   │       ├── mappingConfigController.ts
│   │       ├── productController.ts
│   │       ├── carrierController.ts
│   │       ├── ecCompanyController.ts
│   │       ├── orderSourceCompanyController.ts
│   │       ├── printTemplateController.ts
│   │       ├── formTemplateController.ts
│   │       └── carrierAutomationController.ts
│   │
│   ├── models/               # Mongoose モデル
│   │   ├── shipmentOrder.ts  # 出荷注文
│   │   ├── order.ts          # 注文型定義
│   │   ├── product.ts        # 商品
│   │   ├── carrier.ts        # 配送会社
│   │   ├── ecCompany.ts      # ECモール
│   │   ├── orderSourceCompany.ts  # 依頼主
│   │   ├── mappingConfig.ts  # 映射設定
│   │   ├── printTemplate.ts  # 印刷テンプレート
│   │   ├── formTemplate.ts   # 帳票テンプレート
│   │   └── carrierAutomationConfig.ts  # 自動化設定
│   │
│   ├── services/             # ビジネスロジック
│   ├── transforms/           # データ変換パイプライン
│   ├── schemas/              # バリデーションスキーマ
│   ├── config/               # 環境設定
│   ├── lib/                  # 共通ライブラリ
│   └── utils/                # ユーティリティ
│
├── docs/                     # ドキュメント
│   ├── db-schema.md          # データベーススキーマ
│   ├── api-design.md         # API設計
│   └── mapping-config-api.md # 映射設定API詳細
│
├── tests/                    # テスト
├── tmp/                      # 一時ファイル
└── logs/                     # ログファイル
```

---

## API モジュール

| モジュール | 路由前缀 | 用途 |
|-----------|---------|------|
| Shipment Orders | `/api/shipment-orders` | 出荷注文管理 |
| Mapping Configs | `/api/mapping-configs` | CSV/Excel映射設定 |
| Products | `/api/products` | 商品マスタ管理 |
| Carriers | `/api/carriers` | 配送会社管理 |
| EC Companies | `/api/ec-companies` | ECモール管理 |
| Order Source Companies | `/api/order-source-companies` | 依頼主管理 |
| Print Templates | `/api/print-templates` | 印刷テンプレート |
| Form Templates | `/api/form-templates` | 帳票テンプレート |
| Carrier Automation | `/api/carrier-automation` | 配送会社自動化 |

詳細な API 設計は `docs/api-design.md` を参照。

---

## データモデル

### 主要コレクション

| コレクション | 用途 |
|-------------|------|
| `orders` | 出荷注文データ |
| `products` | 商品マスタ（子SKU対応） |
| `carriers` | 配送会社設定 |
| `ec_companies` | ECモール設定 |
| `order_source_companies` | 依頼主マスタ |
| `mapping_configs` | 映射規則 |
| `print_templates` | 印刷テンプレート |
| `form_templates` | 帳票テンプレート |
| `carrier_automation_configs` | 自動化設定 |

詳細なスキーマ定義は `docs/db-schema.md` を参照。

### 注文データ構造

```typescript
{
  // 基本情報
  orderNumber: string;           // 出荷管理No（unique）
  ecCompanyId: ObjectId;         // ECモールID
  carrierId: ObjectId | string;  // 配送会社ID
  customerManagementNumber: string;  // お客様管理番号
  trackingId?: string;           // 伝票番号

  // 住所情報
  recipient: Address;            // 送付先（必須）
  sender: Address;               // 依頼主（必須）
  orderer?: Partial<Address>;    // 注文者

  // 商品
  products: OrderProduct[];      // 商品リスト
  _productsMeta: {               // 集計情報（自動計算）
    skus: string[];
    names: string[];
    skuCount: number;
    totalQuantity: number;
    totalPrice: number;
  };

  // 配送
  shipPlanDate: string;          // 出荷予定日
  invoiceType: string;           // 送り状種類
  coolType?: string;             // クール区分
  deliveryTimeSlot?: string;     // お届け時間帯

  // ステータス
  status: {
    carrierReceipt: { isReceived: boolean; receivedAt?: Date };
    confirm: { isConfirmed: boolean; confirmedAt?: Date };
    printed: { isPrinted: boolean; printedAt?: Date };
    shipped: { isShipped: boolean; shippedAt?: Date };
  };

  // 配送会社固有データ
  carrierData?: {
    yamato?: {
      sortingCode?: string;      // 仕分けコード
      hatsuBaseNo1?: string;     // 発店コード1
      hatsuBaseNo2?: string;     // 発店コード2
    };
  };
}
```

---

## 開発

### セットアップ

```bash
cd backend
npm install
cp env.example .env
```

### 環境変数

`.env` ファイルで設定:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/nexand-shipment
NODE_ENV=development
```

### 開発サーバー起動

```bash
npm run dev
```

### ビルド

```bash
npm run build
```

### 本番起動

```bash
npm start
```

### Lint

```bash
npm run lint
npm run lint:fix
```

### フォーマット

```bash
npm run format
```

---

## ツール

- **ESLint** - `@typescript-eslint` ルールセット
- **Prettier** - コードフォーマット
- **nodemon** + **ts-node** - 開発時ホットリロード
- **tsconfig-paths** - パスエイリアス解決

### パスエイリアス

`@/*` → `src/*` として解決:

```typescript
import { ShipmentOrder } from '@/models/shipmentOrder';
```

---

## セキュリティ

- **Helmet** - HTTPヘッダーセキュリティ
- **テナントスコープ** - 全APIはテナントIDでアクセス制御
- **入力バリデーション** - Mongoose スキーマ + カスタムバリデーション

---

## ロギング

- **Pino** - JSON形式ログ
- **Morgan** - HTTPリクエストログ
- 開発環境では `pino-pretty` で整形表示

---

## 関連ドキュメント

- [データベーススキーマ](docs/db-schema.md)
- [API設計](docs/api-design.md)
- [映射設定API詳細](docs/mapping-config-api.md)
