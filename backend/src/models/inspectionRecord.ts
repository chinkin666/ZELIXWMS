import mongoose from 'mongoose';

/**
 * 検品記録 / 检品记录
 *
 * 入庫検品の6次元チェック結果を記録する。
 * 记录入库检品的6维度检查结果。
 */

export type CheckResult = 'pass' | 'fail' | 'na';
export type InspectionMode = 'full' | 'sampling';

export interface IInspectionException {
  /** 異常区分 / 异常分类 */
  category: 'quantity_variance' | 'label_error' | 'appearance_defect' | 'packaging_issue' | 'mixed_shipment' | 'other';
  /** 数量 / 数量 */
  quantity: number;
  /** 説明 / 描述 */
  description: string;
  /** 写真URL / 照片URL */
  photoUrls: string[];
}

export interface IInspectionRecord {
  _id: mongoose.Types.ObjectId;
  tenantId: string;
  /** 検品番号 / 检品编号 */
  recordNumber: string;

  // 関連 / 关联
  inboundOrderId: mongoose.Types.ObjectId;
  inboundLineNumber?: number;
  productId?: mongoose.Types.ObjectId;
  sku?: string;

  // 検品方式 / 检品方式
  inspectionMode: InspectionMode;
  /** 抜取率（例 0.1 = 10%）/ 抽检比例 */
  samplingRate?: number;

  // 6次元チェック / 6维度检查
  checks: {
    skuMatch: CheckResult;
    barcodeMatch: CheckResult;
    quantityMatch: CheckResult;
    appearanceOk: CheckResult;
    accessoriesOk: CheckResult;
    packagingOk: CheckResult;
  };

  // 数量 / 数量
  expectedQuantity: number;
  inspectedQuantity: number;
  passedQuantity: number;
  failedQuantity: number;

  // 異常 / 异常
  exceptions: IInspectionException[];

  // 担当者 / 人员
  inspectedBy: string;
  verifiedBy?: string;
  verifiedAt?: Date;

  // 写真 / 照片
  photos: string[];
  memo?: string;

  createdAt: Date;
  updatedAt: Date;
}

const inspectionExceptionSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      enum: ['quantity_variance', 'label_error', 'appearance_defect', 'packaging_issue', 'mixed_shipment', 'other'],
    },
    quantity: { type: Number, default: 0 },
    description: { type: String, trim: true },
    photoUrls: [{ type: String }],
  },
  { _id: false },
);

const inspectionRecordSchema = new mongoose.Schema<IInspectionRecord>(
  {
    tenantId: { type: String, required: true },
    recordNumber: { type: String, required: true, unique: true, trim: true },

    inboundOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'InboundOrder', required: true },
    inboundLineNumber: { type: Number },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    sku: { type: String, trim: true },

    inspectionMode: { type: String, enum: ['full', 'sampling'], default: 'full' },
    samplingRate: { type: Number, min: 0, max: 1 },

    checks: {
      type: new mongoose.Schema(
        {
          skuMatch: { type: String, enum: ['pass', 'fail', 'na'], default: 'na' },
          barcodeMatch: { type: String, enum: ['pass', 'fail', 'na'], default: 'na' },
          quantityMatch: { type: String, enum: ['pass', 'fail', 'na'], default: 'na' },
          appearanceOk: { type: String, enum: ['pass', 'fail', 'na'], default: 'na' },
          accessoriesOk: { type: String, enum: ['pass', 'fail', 'na'], default: 'na' },
          packagingOk: { type: String, enum: ['pass', 'fail', 'na'], default: 'na' },
        },
        { _id: false },
      ),
      default: {},
    },

    expectedQuantity: { type: Number, default: 0 },
    inspectedQuantity: { type: Number, default: 0 },
    passedQuantity: { type: Number, default: 0 },
    failedQuantity: { type: Number, default: 0 },

    exceptions: { type: [inspectionExceptionSchema], default: [] },

    inspectedBy: { type: String, required: true, trim: true },
    verifiedBy: { type: String, trim: true },
    verifiedAt: { type: Date },

    photos: [{ type: String }],
    memo: { type: String, trim: true },
  },
  {
    timestamps: true,
    collection: 'inspection_records',
  },
);

inspectionRecordSchema.index({ tenantId: 1, inboundOrderId: 1 });
inspectionRecordSchema.index({ tenantId: 1, createdAt: -1 });

export const InspectionRecord = mongoose.model<IInspectionRecord>('InspectionRecord', inspectionRecordSchema);
