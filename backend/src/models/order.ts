/**
 * お届け時間帯（時間帯レンジ）:
 * - 4桁の数字文字列で「開始時刻(時) + 終了時刻(時)」を表す
 * - 例: "1012" => 10時〜12時
 * - 空/未指定の場合は undefined
 */
export type DeliveryTimeSlot = string;

/**
 * クール区分:
 * 0: 通常, 1: クール冷凍, 2: クール冷蔵
 */
export type CoolType = '0' | '1' | '2';

/**
 * 送り状種類
 */
export type InvoiceType = '0' | '8' | 'A';

/**
 * 子SKU匹配情報（inputSkuが子SKUの場合に設定）
 */
export interface MatchedSubSku {
  code: string;            // 子SKUコード
  price?: number;          // 子SKU価格（親商品の価格を上書き）
  description?: string;    // 子SKU備考
}

/**
 * 注文商品項目インターフェース（新スキーマ）
 *
 * 設計方針:
 * - inputSku: ユーザーが入力した原始値（主SKUまたは子SKU）
 * - auto-fill時に親商品情報を解析して各フィールドを設定
 * - matchedSubSku: 入力が子SKUの場合、価格/備考情報を保持
 * - データ自包含: 表示に必要な情報をすべて含む
 */
export interface OrderProduct {
  // === ユーザー入力 ===
  inputSku: string;           // ユーザー入力の原始値（主SKUまたは子SKU）
  quantity: number;           // 数量

  // === auto-fill時に解析して設定 ===
  productId?: string;         // 親商品の_id（関連付け用）
  productSku?: string;        // 親商品の主SKU
  productName?: string;       // 商品名（親商品から取得）

  // === 子SKU情報（inputSkuが子SKUの場合） ===
  matchedSubSku?: MatchedSubSku;

  // === 親商品からスナップショットした表示情報（auto-fill時に設定） ===
  barcode?: string[];                 // 検品コード
  deliverySizeIndex?: number;         // 配送サイズ指数
  coolType?: CoolType;                // クール区分
  invoiceType?: InvoiceType;          // 送り状種類
}

/**
 * 住所インターフェース
 */
export interface Address {
  postalCode: string;
  prefecture: string;  // 都道府県
  city: string;        // 郡市区
  street: string;      // それ以降の住所
  name: string;
  phone: string;
}

/**
 * 注文ドキュメント（新スキーマ）
 */
export interface OrderDocument {
  _id: string;
  tenantId: string;

  status?: {
    /** 配送業者へデータ送信し、回执（受付/レスポンス）を取得済みかどうか */
    carrierReceipt?: {
      isReceived: boolean;
      receivedAt?: string;
    };
    /** 印刷準備が完了し、確認済みかどうか */
    confirm?: {
      isConfirmed: boolean;
      confirmedAt?: string;
    };
    printed?: {
      isPrinted: boolean;
      printedAt?: string;
    };
    /** 出荷作業が完了したかどうか */
    shipped?: {
      isShipped: boolean;
      shippedAt?: string;
    };
  };

  // 注文情報（非ユーザー入力項目を含む）
  orderNumber: string; // 出荷管理No（必須・システム自動生成）
  sourceOrderAt?: string; // 注文元からの注文日時（ISO 8601文字列、任意）
  /** ECモールID（必須・非ユーザー入力・mapping-configから設定） */
  ecCompanyId: string;
  carrierId: string; // 配送業者（単一選択、必須）
  customerManagementNumber: string; // お客様管理番号（必須・ユーザー入力）
  /** 配送業者から取得した伝票番号（trackingId） */
  trackingId?: string;

  // 注文者（全フィールド optional）
  orderer?: Partial<Address>;

  // 送付先
  recipient: Address;
  honorific?: string; // 敬称（デフォルト: "様"）

  // 商品
  products: OrderProduct[]; // 商品リスト（新スキーマ）

  // 商品聚合字段（用于搜索、过滤、索引优化）
  _productsMeta?: {
    skus: string[]; // 所有SKU的数组（去重）
    names: string[]; // 所有商品名的数组（去重，过滤空值）
    skuCount: number; // SKU种类数量
    totalQuantity: number; // 商品总数量（所有quantity之和）
  };

  // 配送希望
  shipPlanDate: string; // 出荷予定日（YYYY/MM/DD、必須）
  invoiceType: string; // 送り状種類（必須: 0:発払い宅急便, 8:宅急便コンパクト, A:ネコポス）
  coolType?: CoolType; // クール区分（0:通常/1:冷凍/2:冷蔵）
  deliveryTimeSlot?: DeliveryTimeSlot; // お届け時間帯（例: "1012"）
  deliveryDatePreference?: string; // お届け日指定（YYYY/MM/DD）

  // 依頼主住所
  sender: Address;

  // 荷扱い
  handlingTags: string[]; // 荷扱いタグ（任意の文字列配列）

  // 追跡用：CSV/Excel 取込時の元行データ（ヘッダー->値）を保持
  sourceRawRows?: Array<Record<string, unknown>>;
  // 配送業者側ファイル（回执/実績）から取り込んだ元行データ
  carrierRawRow?: Record<string, unknown>;

  // メタ
  createdAt: string;
  updatedAt: string;
}
