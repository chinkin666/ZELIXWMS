# MongoDB Schema - Nexand 出荷管理システム

## Collection 総覧

| Collection | Model ファイル | 用途 |
|------------|---------------|------|
| `orders` | `shipmentOrder.ts` | 出荷注文主データ |
| `products` | `product.ts` | 商品マスタ（子SKU対応） |
| `ec_companies` | `ecCompany.ts` | ECモール設定 |
| `carriers` | `carrier.ts` | 配送会社設定 |
| `order_source_companies` | `orderSourceCompany.ts` | 依頼主マスタ |
| `mapping_configs` | `mappingConfig.ts` | CSV/Excel映射規則 |
| `form_templates` | `formTemplate.ts` | 帳票テンプレート |
| `print_templates` | `printTemplate.ts` | 印刷テンプレート |
| `carrier_automation_configs` | `carrierAutomationConfig.ts` | 配送会社自動化設定 |

---

## 1. orders Collection

出荷注文の主データを保存するコレクション。

### Schema Definition

```typescript
interface IShipmentOrder {
  _id: ObjectId;
  tenantId?: string;

  // === ステータス管理 ===
  status?: {
    carrierReceipt?: {
      isReceived: boolean;      // 配送会社からの回执取得済み
      receivedAt?: Date;
    };
    confirm?: {
      isConfirmed: boolean;     // 確認済み
      confirmedAt?: Date;
    };
    printed?: {
      isPrinted: boolean;       // 印刷済み
      printedAt?: Date;
    };
    shipped?: {
      isShipped: boolean;       // 出荷完了
      shippedAt?: Date;
    };
  };

  // === 注文基本情報 ===
  orderNumber: string;          // 出荷管理No（必須・システム自動生成、unique）
  sourceOrderAt?: Date;         // 注文元からの注文日時
  ecCompanyId: ObjectId;        // ECモールID（必須）
  carrierId: ObjectId | string; // 配送会社ID（ObjectId または内蔵配送会社の文字列ID）
  customerManagementNumber: string; // お客様管理番号（必須）
  trackingId?: string;          // 伝票番号（配送会社から取得）

  // === 注文者（全フィールド optional）===
  orderer?: Partial<IAddress>;

  // === 送付先（必須）===
  recipient: IAddress;
  honorific?: string;           // 敬称（デフォルト: "様"）

  // === 商品情報 ===
  products: IShipmentOrderProduct[];

  // === 商品聚合フィールド（検索・索引用）===
  _productsMeta?: {
    skus: string[];             // 全SKU（重複なし）
    names: string[];            // 全商品名（重複なし）
    skuCount: number;           // SKU種類数
    totalQuantity: number;      // 商品総数量
    totalPrice: number;         // 合計金額
  };

  // === 配送希望 ===
  shipPlanDate: string;         // 出荷予定日（YYYY/MM/DD、必須）
  invoiceType: string;          // 送り状種類（必須）
  coolType?: string;            // クール区分
  deliveryTimeSlot?: string;    // お届け時間帯
  deliveryDatePreference?: string; // お届け日指定

  // === 依頼主 ===
  orderSourceCompanyId?: string;
  sender: IAddress;             // 依頼主住所（必須）

  // === 配送会社固有データ ===
  carrierData?: {
    yamato?: {
      sortingCode?: string;     // 6桁仕分けコード
      hatsuBaseNo1?: string;    // 3桁発店コード1
      hatsuBaseNo2?: string;    // 3桁発店コード2
    };
  };

  // === 荷扱い ===
  handlingTags: string[];

  // === 元データ保持 ===
  sourceRawRows?: Array<Record<string, unknown>>;  // CSV/Excel取込時の元行データ
  carrierRawRow?: Record<string, unknown>;          // 配送会社回执の元行データ

  // === 内部記録 ===
  internalRecord?: Array<{
    user: string;
    timestamp: Date;
    content: string;
  }>;

  createdAt: Date;
  updatedAt: Date;
}
```

### 住所インターフェース

```typescript
interface IAddress {
  postalCode: string;   // 郵便番号
  prefecture: string;   // 都道府県
  city: string;         // 郡市区
  street: string;       // それ以降の住所
  name: string;         // 氏名
  phone: string;        // 電話番号
}
```

### 商品インターフェース

```typescript
interface IShipmentOrderProduct {
  // ユーザー入力
  inputSku: string;              // ユーザー入力の原始値（主SKUまたは子SKU）
  quantity: number;              // 数量

  // auto-fill解析結果
  productId?: string;            // 親商品の_id
  productSku?: string;           // 親商品の主SKU
  productName?: string;          // 商品名

  // 子SKU情報（inputSkuが子SKUの場合）
  matchedSubSku?: {
    code: string;                // 子SKUコード
    price?: number;              // 子SKU価格
    description?: string;        // 子SKU備考
  };

  // 親商品からスナップショット
  barcode?: string[];            // 検品コード
  coolType?: '0' | '1' | '2';    // クール区分

  // メール便計算設定
  mailCalcEnabled?: boolean;
  mailCalcMaxQuantity?: number;

  // 価格情報
  unitPrice?: number;            // 単価
  subtotal?: number;             // 小計
}
```

### インデックス

```javascript
{ orderNumber: 1 }              // unique
{ carrierId: 1 }
{ shipPlanDate: 1 }
{ ecCompanyId: 1 }
{ '_productsMeta.skus': 1 }
{ '_productsMeta.names': 1 }
{ '_productsMeta.totalQuantity': 1 }
{ '_productsMeta.skuCount': 1 }
{ '_productsMeta.totalPrice': 1 }
```

---

## 2. products Collection

商品マスタデータ。子SKU機能により、1つの親商品に複数の子SKU（バリエーション）を登録可能。

### Schema Definition

```typescript
interface IProduct {
  _id: ObjectId;
  sku: string;                    // 主SKU（必須、unique）
  name: string;                   // 商品名（必須）
  nameFull?: string;              // 商品名（フル）
  barcode?: string[];             // 検品コード（複数可）
  coolType?: '0' | '1' | '2';     // クール区分（0:通常/1:冷凍/2:冷蔵）

  // メール便計算設定
  mailCalcEnabled: boolean;       // メール便計算有効（必須、デフォルト: false）
  mailCalcMaxQuantity?: number;   // メール便最大数量

  // 商品分類
  category: '商品' | '同梱物' | '作業' | 'おまけ' | '資材';

  // スペック情報
  spec1?: string;
  spec2?: string;

  // 管理設定
  inventoryManaged?: boolean;     // 在庫管理対象
  returnManaged?: boolean;        // 返品管理対象

  // サイズ・重量
  dimensions?: {
    width?: number;               // 幅 (cm)
    depth?: number;               // 奥行き (cm)
    height?: number;              // 高さ (cm)
    weight?: number;              // 重さ (kg)
  };

  // 在庫管理
  reorderPoint?: number;          // 発注点
  unitsPerLocation?: number;      // ロケーションあたりの数量
  minReplenishment?: number;      // 最小補充数

  // その他
  memo?: string;
  countryOfOrigin?: string;       // 原産国
  price?: number;                 // 価格
  handlingTypes?: string[];       // 荷扱いタイプ

  // 子SKU（バリエーション）
  subSkus?: ISubSku[];

  createdAt: Date;
  updatedAt: Date;
}

interface ISubSku {
  subSku: string;                 // 子SKUコード（必須、全体で一意）
  price?: number;                 // 価格（親商品の価格を上書き）
  description?: string;           // 説明
  isActive?: boolean;             // 有効フラグ（デフォルト: true）
}
```

### インデックス

```javascript
{ sku: 1 }                       // unique
{ category: 1 }
{ inventoryManaged: 1 }
{ 'subSkus.subSku': 1 }          // sparse
```

---

## 3. ec_companies Collection

ECモール（注文来源）の設定。CSV/TSV形式の列定義を含む。

### Schema Definition

```typescript
interface IECCompany {
  _id: ObjectId;
  name: string;                   // ECモール名称（必須、unique）
  description?: string;           // 説明
  enabled: boolean;               // 有効フラグ（デフォルト: true）
  formatDefinition: {
    columns: IColumnConfig[];     // 列設定リスト
  };
  createdAt: Date;
  updatedAt: Date;
}

interface IColumnConfig {
  name: string;                   // 列名
  description?: string;           // 説明
  type: 'string' | 'number' | 'date' | 'boolean';
  maxWidth?: number;              // 最大文字数（全角=2、半角=1）
  required: boolean;              // 必須フラグ
  userUploadable: boolean;        // ユーザーアップロード可能
}
```

### インデックス

```javascript
{ name: 1 }
{ enabled: 1 }
```

---

## 4. carriers Collection

配送会社の設定。CSV/TSV形式の列定義を含む。

### Schema Definition

```typescript
interface ICarrier {
  _id: ObjectId;
  code: string;                   // 配送会社コード（必須、unique）
  name: string;                   // 配送会社名称（必須）
  description?: string;
  enabled: boolean;               // 有効フラグ（デフォルト: true）
  trackingIdColumnName?: string;  // 伝票番号列名
  formatDefinition: {
    columns: IColumnConfig[];
  };
  isBuiltIn: boolean;             // 内蔵配送会社フラグ（編集・削除不可）
  automationType?: 'yamato-b2' | 'sagawa-api' | 'seino-api';
  createdAt: Date;
  updatedAt: Date;
}
```

### インデックス

```javascript
{ code: 1 }                      // unique
{ enabled: 1 }
```

---

## 5. order_source_companies Collection

依頼主（送り主）マスタ。

### Schema Definition

```typescript
interface IOrderSourceCompany {
  _id: ObjectId;
  senderName: string;             // 依頼主名（必須）
  senderPostalCode?: string;      // 郵便番号（7桁数字）
  senderAddressPrefecture?: string; // 都道府県
  senderAddressCity?: string;     // 郡市区
  senderAddressStreet?: string;   // それ以降の住所
  senderPhone?: string;           // 電話番号（数字のみ）
  hatsuBaseNo1?: string;          // 発店コード1（3桁数字）
  hatsuBaseNo2?: string;          // 発店コード2（3桁数字）
  createdAt: Date;
  updatedAt: Date;
}
```

### インデックス

```javascript
{ senderName: 1 }
{ senderPostalCode: 1 }
```

---

## 6. mapping_configs Collection

CSV/Excel列映射規則。TransformPipelineベースの柔軟なデータ変換を実現。

### Schema Definition

```typescript
interface IMappingConfig {
  _id: ObjectId;
  schemaVersion: number;          // スキーマバージョン（現在: 2）
  tenantId: string;               // テナントID
  configType: ConfigType;         // 設定タイプ
  name: string;                   // 設定名
  description?: string;
  isDefault?: boolean;            // デフォルト設定フラグ

  // 関連エンティティ
  orderSourceCompanyId?: string;
  orderSourceCompanyName?: string;
  ecCompanyId?: string;
  ecCompanyName?: string;
  carrierId?: string;
  carrierCode?: string;
  carrierName?: string;

  // 映射規則
  mappings: TransformMapping[];

  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

type ConfigType =
  | 'ec-company-to-order'   // ECモール → 注文
  | 'order-to-carrier'      // 注文 → 配送会社
  | 'customer'
  | 'product'
  | 'inventory'
  | string;
```

### インデックス

```javascript
{ tenantId: 1, configType: 1 }
{ tenantId: 1, configType: 1, isDefault: 1 }
{ tenantId: 1, name: 1 }
{ orderSourceCompanyId: 1 }
{ ecCompanyId: 1 }
{ carrierId: 1 }
```

---

## 7. form_templates Collection

帳票テンプレート（ピッキングリスト、出荷明細リストなど）。

### Schema Definition

```typescript
interface IFormTemplate {
  _id: ObjectId;
  tenantId: string;
  name: string;                   // テンプレート名
  targetType: string;             // 対象タイプ（例: shipment-list-picking）

  columns: FormTemplateColumn[];  // 列設定
  styles: FormTemplateStyles;     // スタイル設定

  pageSize: 'A4' | 'A3' | 'B4' | 'LETTER';
  pageOrientation: 'portrait' | 'landscape';
  pageMargins: [number, number, number, number];  // [left, top, right, bottom]

  headerFooterItems: HeaderFooterItem[];  // ヘッダー・フッター

  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface FormTemplateColumn {
  id: string;
  type: 'single' | 'multi';       // single: 1内容、multi: 複数内容
  label: string;                  // ヘッダーラベル
  width?: number | string;        // 列幅（pt または 'auto'）
  order: number;

  // single タイプ用
  field?: string;
  renderType?: 'text' | 'qrcode' | 'barcode' | 'date';
  barcodeConfig?: BarcodeConfig;
  dateFormat?: string;
  previewData?: string;

  // multi タイプ用
  children?: FormTemplateColumnChild[];
}
```

### インデックス

```javascript
{ tenantId: 1, targetType: 1 }
```

---

## 8. print_templates Collection

印刷テンプレート（送り状ラベルなど）。ビジュアルエディタ用のキャンバス設定を含む。

### Schema Definition

```typescript
interface IPrintTemplate {
  _id: ObjectId;
  tenantId: string;
  schemaVersion: number;          // スキーマバージョン（現在: 1）
  name: string;                   // テンプレート名
  carrierId: string;              // 配送会社ID
  invoiceType: string;            // 送り状種類

  canvas: {
    widthMm: number;              // 幅 (mm)
    heightMm: number;             // 高さ (mm)
    pxPerMm: number;              // 解像度
  };

  elements: PrintTemplateElement[];  // 要素リスト
  bindings?: PrintTemplateBinding[]; // データバインディング
  meta?: Record<string, any>;

  sampleData?: Record<string, any>[]; // サンプルデータ
  requiresYamatoSortCode?: boolean;   // ヤマト仕分けコード必須
  referenceImageData?: string;        // 参照画像（base64）
  isDefault?: boolean;

  createdAt: Date;
  updatedAt: Date;
}
```

### インデックス

```javascript
{ tenantId: 1, carrierId: 1, invoiceType: 1 }
{ name: 1 }
```

---

## 9. carrier_automation_configs Collection

配送会社API連携の自動化設定。

### Schema Definition

```typescript
interface ICarrierAutomationConfig {
  _id: ObjectId;
  tenantId: string;
  automationType: 'yamato-b2' | 'sagawa-api' | 'seino-api';
  enabled: boolean;               // 有効フラグ

  yamatoB2?: {
    apiEndpoint: string;          // APIエンドポイント
    apiKey: string;               // APIキー
    customerCode: string;         // お客様コード
    customerPassword: string;     // パスワード（暗号化保存）
    customerClsCode?: string;     // お届け先分類コード
    loginUserId?: string;         // ログインユーザーID
    serviceType: string;          // サービス種類
    coolType: string;             // 温度区分
    invoiceCode?: string;         // 請求先顧客コード
    invoiceFreightNo?: string;    // 運賃管理番号
  };

  createdAt: Date;
  updatedAt: Date;
}
```

### インデックス

```javascript
{ tenantId: 1, automationType: 1 }  // unique
```

---

## 値の定義

### クール区分 (CoolType)

| 値 | 意味 |
|----|------|
| `'0'` | 通常（常温） |
| `'1'` | クール冷凍 |
| `'2'` | クール冷蔵 |

### 送り状種類 (InvoiceType)

| 値 | 意味 |
|----|------|
| `'0'` | 発払い宅急便 |
| `'8'` | 宅急便コンパクト |
| `'A'` | ネコポス |

### 商品カテゴリ (ProductCategory)

| 値 | 意味 |
|----|------|
| `'商品'` | 通常商品 |
| `'同梱物'` | 同梱物 |
| `'作業'` | 作業 |
| `'おまけ'` | おまけ |
| `'資材'` | 資材 |

---

## パフォーマンス考慮事項

1. **tenantId スコープ**: 全てのクエリは `tenantId` を含めた複合インデックスを使用
2. **_productsMeta**: 商品情報の集計フィールドにより、商品検索・フィルタリングの効率化
3. **pre-save/pre-update フック**: `_productsMeta` は自動計算され、データ一貫性を保証
4. **sparse インデックス**: `subSkus.subSku` は空配列を持つドキュメントを効率的に処理
