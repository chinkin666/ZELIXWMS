import mongoose from 'mongoose';

// ============================================
// 共通: 住所インターフェース
// ============================================
export interface IAddress {
  postalCode: string;
  prefecture: string;  // 都道府県
  city: string;        // 郡市区
  street: string;      // それ以降の住所
  name: string;
  phone: string;
}

// 住所サブドキュメント用 Mongoose Schema
const addressSchema = new mongoose.Schema<IAddress>(
  {
    postalCode: { type: String, required: true, trim: true },
    prefecture: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    street: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
  },
  { _id: false },
);

// 注文者用（全フィールド optional）
const optionalAddressSchema = new mongoose.Schema<IAddress>(
  {
    postalCode: { type: String, trim: true },
    prefecture: { type: String, trim: true },
    city: { type: String, trim: true },
    street: { type: String, trim: true },
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
  },
  { _id: false },
);

// ============================================
// 商品インターフェース（新スキーマ）
// ============================================

/**
 * 子SKU匹配情報
 */
export interface IMatchedSubSku {
  code: string;            // 子SKUコード
  price?: number;          // 子SKU価格
  description?: string;    // 子SKU備考
}

/**
 * 注文商品項目インターフェース
 */
export interface IShipmentOrderProduct {
  // ユーザー入力
  inputSku: string;           // ユーザー入力の原始値（主SKUまたは子SKU）
  quantity: number;           // 数量

  // auto-fill解析結果
  productId?: string;         // 親商品の_id
  productSku?: string;        // 親商品の主SKU
  productName?: string;       // 商品名

  // 子SKU情報
  matchedSubSku?: IMatchedSubSku;

  // 親商品からスナップショット
  imageUrl?: string;          // 商品画像URL
  barcode?: string[];         // 検品コード
  coolType?: '0' | '1' | '2'; // クール区分
  // メール便計算設定
  mailCalcEnabled?: boolean;          // メール便計算（true: 自動計算する, false: 自動計算しない）
  mailCalcMaxQuantity?: number;       // メール便最大数量（mailCalcEnabled が true の時のみ有効）

  // 価格情報
  unitPrice?: number;         // 単価（子SKU価格 > 親商品価格）
  subtotal?: number;          // 小計（unitPrice × quantity）
}

// ============================================
// キャリアデータインターフェース（配送会社固有データ）
// ============================================
export interface IYamatoCarrierData {
  sortingCode?: string;    // 6位仕分けコード
  hatsuBaseNo1?: string;   // 3位発店コード1
  hatsuBaseNo2?: string;   // 3位発店コード2
}

export interface ICarrierData {
  yamato?: IYamatoCarrierData;
  // 未来扩展:
  // sagawa?: ISagawaCarrierData;
  // yupack?: IYupackCarrierData;
}

export interface IShipmentOrder {
  _id: mongoose.Types.ObjectId;
  tenantId?: string;

  status?: {
    /**
     * 配送会社へデータ送信し、回执（受付/レスポンス）を取得済みかどうか
     */
    carrierReceipt?: {
      isReceived: boolean;
      receivedAt?: Date;
    };
    /** 印刷準備が完了し、確認済みかどうか */
    confirm?: {
      isConfirmed: boolean;
      confirmedAt?: Date;
    };
    printed?: {
      isPrinted: boolean;
      printedAt?: Date;
    };
    /** 検品が完了したかどうか */
    inspected?: {
      isInspected: boolean;
      inspectedAt?: Date;
    };
    /** 出荷作業が完了したかどうか */
    shipped?: {
      isShipped: boolean;
      shippedAt?: Date;
    };
    /** EC連携済みかどうか */
    ecExported?: {
      isExported: boolean;
      exportedAt?: Date;
    };
  };

  // 注文情報
  orderNumber: string;
  sourceOrderAt?: Date;
  /** 配送会社ID（ObjectIdまたは内蔵配送会社の文字列ID） */
  carrierId: mongoose.Types.ObjectId | string;
  customerManagementNumber: string;
  /** 配送会社から取得した伝票番号（trackingId） */
  trackingId?: string;

  // 注文者（全フィールド optional）
  orderer?: Partial<IAddress>;

  // 送付先
  recipient: IAddress;
  honorific?: string; // 敬称（デフォルト: "様"）

  // 商品
  products: IShipmentOrderProduct[];

  // 商品聚合字段（用于搜索、过滤、索引优化）
  _productsMeta?: {
    skus: string[]; // 所有SKU的数组（去重）
    names: string[]; // 所有商品名的数组（去重，过滤空值）
    skuCount: number; // SKU种类数量
    totalQuantity: number; // 商品总数量（所有quantity之和）
    totalPrice: number; // 合計金額（所有subtotalの合計）
  };

  // 配送希望
  shipPlanDate: string;
  invoiceType: string;
  coolType?: string;
  deliveryTimeSlot?: string;
  deliveryDatePreference?: string;

  // 依頼主
  /** 依頼主ID（OrderSourceCompany._id）。UIでは非表示で、選択時に自動設定される */
  orderSourceCompanyId?: string;

  /**
   * 配送会社固有データ（キャリアごとにネストされた構造）
   */
  carrierData?: ICarrierData;

  // 依頼主住所
  sender: IAddress;

  // 荷扱い
  handlingTags: string[]; // 任意の文字列配列

  // 追跡用：元データ
  sourceRawRows?: Array<Record<string, unknown>>;

  /**
   * 配送会社側ファイル（回执/実績）から取り込んだ「元の1行」を保持（ヘッダー -> 値）。
   */
  carrierRawRow?: Record<string, unknown>;

  /**
   * 内部データ：操作記録（確認取消等のイベントログ）
   */
  internalRecord?: Array<{
    user: string;      // 発起者（将来的にはユーザーシステムから取得）
    timestamp: Date;   // 発生日時
    content: string;   // 内容（純文本）
  }>;

  /**
   * 検品グループID（OrderGroup.orderGroupId を参照）
   */
  orderGroupId?: string;

  createdAt: Date;
  updatedAt: Date;
}

// 子SKU情報スキーマ
const matchedSubSkuSchema = new mongoose.Schema<IMatchedSubSku>(
  {
    code: { type: String, required: true, trim: true },
    price: { type: Number },
    description: { type: String, trim: true },
  },
  { _id: false },
);

// 商品スキーマ（新スキーマ）
const productSchema = new mongoose.Schema<IShipmentOrderProduct>(
  {
    // ユーザー入力
    inputSku: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },

    // auto-fill解析結果
    productId: { type: String, trim: true },
    productSku: { type: String, trim: true },
    productName: { type: String, trim: true },

    // 子SKU情報
    matchedSubSku: { type: matchedSubSkuSchema },

    // 親商品からスナップショット
    imageUrl: { type: String, trim: true },
    barcode: { type: [String] },
    coolType: { type: String, enum: ['0', '1', '2'] },
    // メール便計算設定
    mailCalcEnabled: { type: Boolean },
    mailCalcMaxQuantity: {
      type: Number,
      validate: {
        validator: (v: unknown) => {
          if (v === undefined || v === null) return true;
          if (typeof v !== 'number') return false;
          return Number.isInteger(v) && v > 0;
        },
        message: 'mailCalcMaxQuantity must be a positive integer',
      },
    },

    // 価格情報
    unitPrice: { type: Number, min: 0 },
    subtotal: { type: Number, min: 0 },
  },
  { _id: false },
);

// ヤマト配送データ用スキーマ
const yamatoCarrierDataSchema = new mongoose.Schema<IYamatoCarrierData>(
  {
    sortingCode: {
      type: String,
      trim: true,
      validate: {
        validator: (v: string | undefined | null) => !v || /^\d{6}$/.test(v),
        message: '仕分けコードは6桁の数字で入力してください',
      },
    },
    hatsuBaseNo1: {
      type: String,
      trim: true,
      validate: {
        validator: (v: string | undefined | null) => !v || /^\d{3}$/.test(v),
        message: '発店コード1は3桁の数字で入力してください',
      },
    },
    hatsuBaseNo2: {
      type: String,
      trim: true,
      validate: {
        validator: (v: string | undefined | null) => !v || /^\d{3}$/.test(v),
        message: '発店コード2は3桁の数字で入力してください',
      },
    },
  },
  { _id: false },
);

// 配送会社固有データ用スキーマ
const carrierDataSchema = new mongoose.Schema<ICarrierData>(
  {
    yamato: { type: yamatoCarrierDataSchema, required: false },
  },
  { _id: false },
);

const shipmentOrderSchema = new mongoose.Schema<IShipmentOrder>(
  {
    tenantId: { type: String, trim: true },

    orderNumber: { type: String, required: true, trim: true, unique: true },
    sourceOrderAt: { type: Date, required: false },
    // carrierId can be either ObjectId (for DB carriers) or String (for built-in carriers like '__builtin_yamato_b2__')
    carrierId: { type: mongoose.Schema.Types.Mixed, required: true },
    customerManagementNumber: { type: String, required: true, trim: true },
    trackingId: { type: String, trim: true, default: undefined },

    orderer: { type: optionalAddressSchema, default: undefined },

    recipient: { type: addressSchema, required: true },
    honorific: { type: String, trim: true, default: '様' },

    products: { type: [productSchema], required: true, default: [] },

    _productsMeta: {
      skus: { type: [String], default: [] },
      names: { type: [String], default: [] },
      barcodes: { type: [String], default: [] },
      skuCount: { type: Number, default: 0 },
      totalQuantity: { type: Number, default: 0 },
      totalPrice: { type: Number, default: 0 },
    },

    shipPlanDate: { type: String, required: true, trim: true },
    invoiceType: { type: String, required: true, trim: true },
    coolType: { type: String, trim: true },
    deliveryTimeSlot: { type: String, trim: true },
    deliveryDatePreference: { type: String, trim: true },

    orderSourceCompanyId: { type: String, trim: true, default: undefined },
    carrierData: { type: carrierDataSchema, required: false },
    sender: { type: addressSchema, required: true },

    handlingTags: { type: [String], default: [] },

    sourceRawRows: { type: [mongoose.Schema.Types.Mixed], default: undefined },
    carrierRawRow: { type: mongoose.Schema.Types.Mixed, default: undefined },

    internalRecord: {
      type: [{
        user: { type: String, required: true },
        timestamp: { type: Date, required: true },
        content: { type: String, required: true },
      }],
      default: undefined,
    },

    orderGroupId: { type: String, trim: true, index: true },

    status: {
      carrierReceipt: {
        isReceived: { type: Boolean, default: false },
        receivedAt: { type: Date },
      },
      confirm: {
        isConfirmed: { type: Boolean, default: false },
        confirmedAt: { type: Date },
      },
      printed: {
        isPrinted: { type: Boolean, default: false },
        printedAt: { type: Date },
      },
      inspected: {
        isInspected: { type: Boolean, default: false },
        inspectedAt: { type: Date },
      },
      shipped: {
        isShipped: { type: Boolean, default: false },
        shippedAt: { type: Date },
      },
      ecExported: {
        isExported: { type: Boolean, default: false },
        exportedAt: { type: Date },
      },
    },
  },
  {
    timestamps: true,
    collection: 'orders',
  },
);

// 计算 products 聚合字段的辅助函数（导出供其他模块使用）
export function calculateProductsMeta(products: IShipmentOrderProduct[]): {
  skus: string[];
  names: string[];
  barcodes: string[];
  skuCount: number;
  totalQuantity: number;
  totalPrice: number;
} {
  const productsArray = Array.isArray(products) ? products : [];
  // 使用 inputSku 作为主要 SKU，同时也包含 productSku（父商品SKU）
  const skus = [...new Set(productsArray.flatMap((p) => [p.inputSku, p.productSku]).filter((s): s is string => Boolean(s)))];
  // 使用 productName 作为商品名
  const names = [...new Set(productsArray.map((p) => p.productName).filter((name): name is string => Boolean(name && typeof name === 'string' && name.trim())))];
  // 提取所有 barcode（每个商品的 barcode 是字符串数组）
  const barcodes = [...new Set(productsArray.flatMap((p) => p.barcode || []).filter((b): b is string => Boolean(b)))];
  const totalQuantity = productsArray.reduce((sum, p) => sum + (p.quantity || 0), 0);
  // 合計金額（各商品の subtotal の合計）
  const totalPrice = productsArray.reduce((sum, p) => sum + (p.subtotal || 0), 0);

  return {
    skus,
    names,
    barcodes,
    skuCount: skus.length,
    totalQuantity,
    totalPrice,
  };
}

// pre-save hook: 在保存前自动计算 _productsMeta
shipmentOrderSchema.pre('save', function (next) {
  // 无论什么情况，只要有 products 就计算 _productsMeta（确保数据一致性）
  if (this.products && Array.isArray(this.products)) {
    this._productsMeta = calculateProductsMeta(this.products);
  }
  next();
});

// pre-update hook: 在 updateMany 和 findByIdAndUpdate 时也计算 _productsMeta
shipmentOrderSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate'], function (next) {
  const update = this.getUpdate() as any;
  if (!update) {
    next();
    return;
  }

  // 检查是否更新了 products 字段
  let products: IShipmentOrderProduct[] | undefined;

  // 处理 $set 操作（最常见的情况）
  if (update.$set?.products) {
    products = update.$set.products;
  }
  // 处理直接更新（非 $set，较少见）
  else if (update.products && !update.$set) {
    products = update.products;
  }

  // 如果更新了 products，计算 _productsMeta
  if (products && Array.isArray(products)) {
    const meta = calculateProductsMeta(products);
    if (!update.$set) {
      update.$set = {};
    }
    update.$set._productsMeta = meta;
  }

  next();
});

shipmentOrderSchema.index({ orderNumber: 1 });
shipmentOrderSchema.index({ carrierId: 1 });
shipmentOrderSchema.index({ shipPlanDate: 1 });
// 为 products 聚合字段添加索引
shipmentOrderSchema.index({ '_productsMeta.skus': 1 }); // 用于SKU搜索
shipmentOrderSchema.index({ '_productsMeta.names': 1 }); // 用于商品名搜索
shipmentOrderSchema.index({ '_productsMeta.barcodes': 1 }); // 用于バーコード搜索
shipmentOrderSchema.index({ '_productsMeta.totalQuantity': 1 }); // 用于数量排序
shipmentOrderSchema.index({ '_productsMeta.skuCount': 1 }); // 用于种类数排序
shipmentOrderSchema.index({ '_productsMeta.totalPrice': 1 }); // 用于金额搜索/排序

export const ShipmentOrder = mongoose.model<IShipmentOrder>('ShipmentOrder', shipmentOrderSchema);

// post-find hook: 在查询后检查并补充缺失的 _productsMeta（用于修复旧数据）
shipmentOrderSchema.post(['find', 'findOne', 'findOneAndUpdate'], async function (docs: any) {
  if (!docs) return;

  const documents = Array.isArray(docs) ? docs : [docs];
  const needsUpdate: any[] = [];

  for (const doc of documents) {
    if (!doc || !doc.products) continue;

    // 检查是否需要计算 _productsMeta
    const meta = doc._productsMeta as any;
    const needsMeta =
      !meta ||
      !Array.isArray(meta.skus) ||
      !Array.isArray(meta.names) ||
      !Array.isArray(meta.barcodes) ||
      meta.totalQuantity === undefined;

    if (needsMeta) {
      const meta = calculateProductsMeta(doc.products);
      doc._productsMeta = meta;
      needsUpdate.push({ _id: doc._id, _productsMeta: meta });
    }
  }

  // 批量更新缺失 _productsMeta 的文档（异步执行，不阻塞查询）
  if (needsUpdate.length > 0) {
    const bulkOps = needsUpdate.map(({ _id, _productsMeta }) => ({
      updateOne: {
        filter: { _id },
        update: { $set: { _productsMeta } },
      },
    }));

    ShipmentOrder.bulkWrite(bulkOps).catch((error) => {
      console.warn('Failed to update _productsMeta for some documents:', error);
    });
  }
});


