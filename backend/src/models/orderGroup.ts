import mongoose from 'mongoose';

/**
 * 出荷グループインターフェース
 */
export interface IOrderGroup {
  _id: mongoose.Types.ObjectId;
  orderGroupId: string; // 唯一キー（PK-yyyymmdd-00001）
  name: string; // 組名（唯一）
  description?: string; // 可選描述
  priority: number; // 優先級（数字越小優先級越高）
  enabled: boolean; // 是否啟用
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Mongoose Schema 定义
// ============================================

const orderGroupSchema = new mongoose.Schema<IOrderGroup>(
  {
    orderGroupId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    priority: { type: Number, required: true, default: 100 },
    enabled: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    collection: 'order_groups',
  },
);

// 索引
orderGroupSchema.index({ priority: 1 });
orderGroupSchema.index({ enabled: 1 });

export const OrderGroup = mongoose.model<IOrderGroup>('OrderGroup', orderGroupSchema);
