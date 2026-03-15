import mongoose from 'mongoose';

export type InboundOrderStatus =
  | 'draft'          // 草稿（客户填写中）/ 下書き
  | 'confirmed'      // 已确认（客户提交）/ 確認済
  | 'arrived'        // 已受付（仓库扫码接收）/ 受付済
  | 'processing'     // 作业中（执行作业选项）/ 作業中
  | 'awaiting_label' // 等待FBA标（客户未上传）/ FBAラベル待ち
  | 'ready_to_ship'  // 待出货（作业完成+FBA标就绪）/ 出荷準備完了
  | 'shipped'        // 已出货 / 出荷済
  | 'receiving'      // 收货中（保管型）/ 受領中
  | 'received'       // 收货完成（保管型）/ 受領完了
  | 'done'           // 完结 / 完了
  | 'cancelled';     // 取消 / キャンセル

export type StockCategory = 'new' | 'damaged';
/** 入庫フロータイプ / 入库流程类型 */
export type InboundFlowType = 'standard' | 'crossdock' | 'passthrough';
/** 出荷先タイプ / 出货目的地类型 */
export type DestinationType = 'fba' | 'rsl' | 'b2b';

/** 作業オプション（課金ポイント）/ 作业选项（收费点） */
export interface IServiceOption {
  /** 作業コード / 作业编码 (如 'fnsku_labeling') */
  optionCode: string;
  /** 作業名 / 作业名称 */
  optionName: string;
  /** 予定数量 / 预计数量 */
  quantity: number;
  /** 単価（ServiceRate から取得）/ 单价 */
  unitPrice: number;
  /** 概算費用 / 预估费用 */
  estimatedCost: number;
  /** 実作業数量（倉庫記入）/ 实际作业数量 */
  actualQuantity?: number;
  /** 実費用 / 实际费用 */
  actualCost?: number;
  /** ステータス / 状态 */
  status: 'pending' | 'in_progress' | 'completed';
}

/** FBA情報 / FBA 信息 */
export interface IFbaInfo {
  /** Amazon Shipment ID */
  shipmentId?: string;
  /** 目的FC / 目的 FC */
  destinationFc?: string;
  /** 元PDF URL / 原始 PDF URL */
  labelPdfUrl?: string;
  /** PDF分割ステータス / PDF 拆分状态 */
  labelSplitStatus?: 'pending' | 'split' | 'failed';
  /** 分割後ラベル / 拆分后单张标签 */
  splitLabels?: Array<{
    index: number;
    boxNumber: string;
    imageUrl: string;
    printed: boolean;
  }>;
  /** ラベルフォーマット（4-up/6-up/single）/ 标签格式 */
  labelFormat?: '4up' | '6up' | 'single';
}

/** RSL情報 / RSL 信息 */
export interface IRslInfo {
  rslPlanId?: string;
  destinationWarehouse?: string;
  labelPdfUrl?: string;
  labelSplitStatus?: 'pending' | 'split' | 'failed';
  splitLabels?: Array<{ index: number; boxNumber: string; imageUrl: string; printed: boolean }>;
  labelFormat?: '4up' | '6up' | 'single';
}

/** B2B情報 / B2B 信息 */
export interface IB2bInfo {
  recipientName?: string;
  postalCode?: string;
  prefecture?: string;
  city?: string;
  address1?: string;
  address2?: string;
  phone?: string;
  deliveryNote?: string;
  requireDeliverySlip?: boolean;
}

/** 差異明細 / 差异明细 */
export interface IVarianceReport {
  hasVariance: boolean;
  details: Array<{
    sku: string;
    productName?: string;
    expectedQuantity: number;
    actualQuantity: number;
    variance: number;
    note?: string;
  }>;
  reportedAt?: Date;
  clientViewedAt?: Date;
}

export interface IInboundOrderLine {
  lineNumber: number;
  productId: mongoose.Types.ObjectId;
  productSku: string;
  productName?: string;
  expectedQuantity: number;
  receivedQuantity: number;
  lotId?: mongoose.Types.ObjectId;
  lotNumber?: string;
  expiryDate?: Date;
  locationId?: mongoose.Types.ObjectId;
  stockMoveIds: mongoose.Types.ObjectId[];
  putawayLocationId?: mongoose.Types.ObjectId;
  putawayQuantity: number;
  stockCategory: StockCategory;
  orderReferenceNumber?: string;
  memo?: string;
}

export interface IInboundOrder {
  _id: mongoose.Types.ObjectId;
  /** テナントID / 租户ID */
  tenantId?: string;
  orderNumber: string;
  status: InboundOrderStatus;
  destinationLocationId: mongoose.Types.ObjectId;
  supplier?: {
    name: string;
    code?: string;
    memo?: string;
  };
  lines: IInboundOrderLine[];
  expectedDate?: Date;
  completedAt?: Date;
  memo?: string;
  createdBy?: string;
  purchaseOrderNumber?: string;
  purchaseOrderDate?: Date;

  /** 入庫フロータイプ / 入库流程类型 */
  flowType?: InboundFlowType;
  /** 通過型: 紐付く出荷指示IDs / 通过型: 关联的出库指示IDs */
  linkedOrderIds?: string[];

  // --- 客户关联（Phase 0.1 追加）/ 顧客関連 ---
  /** 顧客ID / 客户ID */
  clientId?: mongoose.Types.ObjectId;
  /** 子顧客ID / 子客户ID */
  subClientId?: mongoose.Types.ObjectId;
  /** 店舗ID / 店铺ID */
  shopId?: mongoose.Types.ObjectId;

  // --- 通过型扩展（Phase 1）/ 通過型拡張 ---
  /** 出荷先タイプ / 出货目的地 */
  destinationType?: DestinationType;
  /** 作業オプション（課金ポイント）/ 作业选项 */
  serviceOptions?: IServiceOption[];
  /** FBA情報 / FBA 信息 */
  fbaInfo?: IFbaInfo;
  /** RSL情報 / RSL 信息 */
  rslInfo?: IRslInfo;
  /** B2B情報 / B2B 信息 */
  b2bInfo?: IB2bInfo;
  /** 配送方式 / 配送方法 */
  shippingMethod?: 'truck' | 'parcel';
  /** 追跡番号 / 追踪号（逐箱发时可能多个） */
  trackingNumbers?: Array<{
    boxNumber?: string;
    trackingNumber: string;
    carrier?: string;
  }>;
  /** 差異明細 / 差异明细 */
  varianceReport?: IVarianceReport;

  // --- 到货信息 / 到着情報 ---
  /** 実到着日 / 实际到货日 */
  actualArrivalDate?: Date;
  /** 総箱数 / 总箱数 */
  totalBoxCount?: number;
  /** 実受領箱数 / 实收箱数 */
  actualBoxCount?: number;
  /** 総重量(kg) / 总重量 */
  totalWeight?: number;
  /** 受付担当 / 受付人员 */
  receivedBy?: string;
  /** 受付完了日時 / 受付完成时间 */
  arrivedAt?: Date;
  /** 出荷完了日時 / 出货完成时间 */
  shippedAt?: Date;

  /** 自定义字段 / カスタムフィールド */
  customFields?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const inboundOrderLineSchema = new mongoose.Schema<IInboundOrderLine>(
  {
    lineNumber: { type: Number, required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productSku: { type: String, required: true, trim: true },
    productName: { type: String, trim: true },
    expectedQuantity: { type: Number, required: true, min: 1 },
    receivedQuantity: { type: Number, default: 0, min: 0 },
    lotId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lot' },
    lotNumber: { type: String, trim: true },
    expiryDate: { type: Date },
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
    stockMoveIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'StockMove' }],
    putawayLocationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
    putawayQuantity: { type: Number, default: 0, min: 0 },
    stockCategory: { type: String, enum: ['new', 'damaged'], default: 'new' },
    orderReferenceNumber: { type: String, trim: true },
    memo: { type: String, trim: true },
  },
  { _id: false },
);

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true },
    memo: { type: String, trim: true },
  },
  { _id: false },
);

// 作業オプション / 作业选项 schema
const serviceOptionSchema = new mongoose.Schema(
  {
    optionCode: { type: String, required: true, trim: true },
    optionName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    estimatedCost: { type: Number, required: true, min: 0 },
    actualQuantity: { type: Number, min: 0 },
    actualCost: { type: Number, min: 0 },
    status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
  },
  { _id: false },
);

// FBA情報 / FBA 信息 schema
const fbaInfoSchema = new mongoose.Schema(
  {
    shipmentId: { type: String, trim: true },
    destinationFc: { type: String, trim: true },
    labelPdfUrl: { type: String, trim: true },
    labelSplitStatus: { type: String, enum: ['pending', 'split', 'failed'], default: 'pending' },
    splitLabels: [{
      index: { type: Number },
      boxNumber: { type: String, trim: true },
      imageUrl: { type: String, trim: true },
      printed: { type: Boolean, default: false },
    }],
    labelFormat: { type: String, enum: ['4up', '6up', 'single'] },
  },
  { _id: false },
);

// RSL情報 / RSL 信息 schema
const rslInfoSchema = new mongoose.Schema(
  {
    rslPlanId: { type: String, trim: true },
    destinationWarehouse: { type: String, trim: true },
    labelPdfUrl: { type: String, trim: true },
    labelSplitStatus: { type: String, enum: ['pending', 'split', 'failed'], default: 'pending' },
    splitLabels: [{
      index: { type: Number },
      boxNumber: { type: String, trim: true },
      imageUrl: { type: String, trim: true },
      printed: { type: Boolean, default: false },
    }],
    labelFormat: { type: String, enum: ['4up', '6up', 'single'] },
  },
  { _id: false },
);

// B2B情報 / B2B 信息 schema
const b2bInfoSchema = new mongoose.Schema(
  {
    recipientName: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    prefecture: { type: String, trim: true },
    city: { type: String, trim: true },
    address1: { type: String, trim: true },
    address2: { type: String, trim: true },
    phone: { type: String, trim: true },
    deliveryNote: { type: String, trim: true },
    requireDeliverySlip: { type: Boolean, default: false },
  },
  { _id: false },
);

// 差異明細 / 差异明细 schema
const varianceReportSchema = new mongoose.Schema(
  {
    hasVariance: { type: Boolean, default: false },
    details: [{
      sku: { type: String, trim: true },
      productName: { type: String, trim: true },
      expectedQuantity: { type: Number },
      actualQuantity: { type: Number },
      variance: { type: Number },
      note: { type: String, trim: true },
    }],
    reportedAt: { type: Date },
    clientViewedAt: { type: Date },
  },
  { _id: false },
);

const inboundOrderSchema = new mongoose.Schema<IInboundOrder>(
  {
    tenantId: { type: String, trim: true, index: true },
    orderNumber: { type: String, required: true, unique: true, trim: true },
    status: {
      type: String,
      required: true,
      enum: [
        'draft', 'confirmed', 'arrived', 'processing', 'awaiting_label',
        'ready_to_ship', 'shipped', 'receiving', 'received', 'done', 'cancelled',
      ],
      default: 'draft',
    },
    destinationLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
    },
    supplier: { type: supplierSchema },
    lines: { type: [inboundOrderLineSchema], default: [] },
    expectedDate: { type: Date },
    completedAt: { type: Date },
    memo: { type: String, trim: true },
    createdBy: { type: String, trim: true },

    purchaseOrderNumber: { type: String, trim: true },
    purchaseOrderDate: { type: Date },

    // フロータイプ / 流程类型
    flowType: { type: String, enum: ['standard', 'crossdock', 'passthrough'], default: 'standard' },
    linkedOrderIds: [{ type: String }],

    // 顧客関連 / 客户关联
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    subClientId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubClient' },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop' },

    // 通過型拡張 / 通过型扩展
    destinationType: { type: String, enum: ['fba', 'rsl', 'b2b'] },
    serviceOptions: { type: [serviceOptionSchema], default: [] },
    fbaInfo: { type: fbaInfoSchema },
    rslInfo: { type: rslInfoSchema },
    b2bInfo: { type: b2bInfoSchema },
    shippingMethod: { type: String, enum: ['truck', 'parcel'] },
    trackingNumbers: [{
      boxNumber: { type: String, trim: true },
      trackingNumber: { type: String, required: true, trim: true },
      carrier: { type: String, trim: true },
    }],
    varianceReport: { type: varianceReportSchema },

    // 到着情報 / 到货信息
    actualArrivalDate: { type: Date },
    totalBoxCount: { type: Number, min: 0 },
    actualBoxCount: { type: Number, min: 0 },
    totalWeight: { type: Number, min: 0 },
    receivedBy: { type: String, trim: true },
    arrivedAt: { type: Date },
    shippedAt: { type: Date },

    // カスタムフィールド / 自定义字段
    customFields: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    collection: 'inbound_orders',
  },
);

inboundOrderSchema.index({ tenantId: 1, status: 1 });
inboundOrderSchema.index({ tenantId: 1, flowType: 1, status: 1 });
inboundOrderSchema.index({ tenantId: 1, clientId: 1, createdAt: -1 });
inboundOrderSchema.index({ tenantId: 1, shopId: 1 });
inboundOrderSchema.index({ expectedDate: 1 });
inboundOrderSchema.index({ 'lines.productId': 1 });
inboundOrderSchema.index({ 'lines.productSku': 1 });

export const InboundOrder = mongoose.model<IInboundOrder>('InboundOrder', inboundOrderSchema);
