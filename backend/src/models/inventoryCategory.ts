import mongoose from 'mongoose';

export interface IInventoryCategory {
  _id: mongoose.Types.ObjectId;
  /** 在庫区分コード（システム内部識別用） */
  code: string;
  /** 在庫区分名称（表示名称） */
  name: string;
  /** 説明 */
  description?: string;
  /** デフォルトカテゴリかどうか（通常/返品/不良） */
  isDefault: boolean;
  /** 有効フラグ */
  isActive: boolean;
  /** 表示順 */
  sortOrder: number;
  /** UIバッジ色ラベル */
  colorLabel?: string;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryCategorySchema = new mongoose.Schema<IInventoryCategory>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    colorLabel: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'inventory_categories',
  },
);

inventoryCategorySchema.index({ sortOrder: 1 });
inventoryCategorySchema.index({ isActive: 1 });

export const InventoryCategory = mongoose.model<IInventoryCategory>(
  'InventoryCategory',
  inventoryCategorySchema,
);
