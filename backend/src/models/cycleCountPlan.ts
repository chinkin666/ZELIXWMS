import mongoose from 'mongoose';

/**
 * 循環棚卸計画 / 循环盘点计划
 */

export type CycleCountStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled';
export type CountItemStatus = 'pending' | 'counted' | 'recounted' | 'confirmed';

export interface ICycleCountItem {
  productId: mongoose.Types.ObjectId;
  sku: string;
  locationId: mongoose.Types.ObjectId;
  locationCode: string;
  systemQuantity: number;
  countedQuantity?: number;
  variance?: number;
  varianceRate?: number;
  countedBy?: string;
  countedAt?: Date;
  status: CountItemStatus;
}

export interface ICycleCountPlan {
  _id: mongoose.Types.ObjectId;
  tenantId: string;
  planNumber: string;
  planType: 'monthly_cycle' | 'annual_full' | 'spot';
  warehouseId?: mongoose.Types.ObjectId;
  period: string; // YYYY-MM
  targetSkuCount: number;
  totalSkuCount: number;
  coverageRate: number;
  items: ICycleCountItem[];
  status: CycleCountStatus;
  totalVarianceRate?: number;
  alertTriggered: boolean;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const cycleCountItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    sku: { type: String, required: true, trim: true },
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
    locationCode: { type: String, required: true, trim: true },
    systemQuantity: { type: Number, required: true },
    countedQuantity: { type: Number },
    variance: { type: Number },
    varianceRate: { type: Number },
    countedBy: { type: String, trim: true },
    countedAt: { type: Date },
    status: { type: String, enum: ['pending', 'counted', 'recounted', 'confirmed'], default: 'pending' },
  },
  { _id: false },
);

const cycleCountPlanSchema = new mongoose.Schema<ICycleCountPlan>(
  {
    tenantId: { type: String, required: true },
    planNumber: { type: String, required: true, unique: true, trim: true },
    planType: { type: String, required: true, enum: ['monthly_cycle', 'annual_full', 'spot'] },
    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
    period: { type: String, required: true, trim: true },
    targetSkuCount: { type: Number, default: 0 },
    totalSkuCount: { type: Number, default: 0 },
    coverageRate: { type: Number, default: 0 },
    items: { type: [cycleCountItemSchema], default: [] },
    status: { type: String, required: true, enum: ['draft', 'in_progress', 'completed', 'cancelled'], default: 'draft' },
    totalVarianceRate: { type: Number },
    alertTriggered: { type: Boolean, default: false },
    completedAt: { type: Date },
  },
  { timestamps: true, collection: 'cycle_count_plans' },
);

cycleCountPlanSchema.index({ tenantId: 1, period: 1 });
cycleCountPlanSchema.index({ tenantId: 1, status: 1 });

export const CycleCountPlan = mongoose.model<ICycleCountPlan>('CycleCountPlan', cycleCountPlanSchema);
