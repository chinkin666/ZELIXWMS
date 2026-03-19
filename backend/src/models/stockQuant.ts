import mongoose from 'mongoose';

export interface IStockQuant {
  _id: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  productSku: string;
  locationId: mongoose.Types.ObjectId;
  lotId?: mongoose.Types.ObjectId;
  quantity: number;
  reservedQuantity: number;
  lastMovedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const stockQuantSchema = new mongoose.Schema<IStockQuant>(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    productSku: {
      type: String,
      required: true,
      trim: true,
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: true,
    },
    lotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lot',
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
    },
    reservedQuantity: {
      type: Number,
      required: true,
      default: 0,
    },
    lastMovedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: 'stock_quants',
  },
);

// 在库的唯一性：product × location × lot
stockQuantSchema.index({ productId: 1, locationId: 1, lotId: 1 }, { unique: true });
stockQuantSchema.index({ productId: 1 });
stockQuantSchema.index({ locationId: 1 });
stockQuantSchema.index({ lotId: 1 });
stockQuantSchema.index({ productSku: 1 });
stockQuantSchema.index({ quantity: 1 });
// 在庫有無チェック用複合インデックス / 库存可用性检查用复合索引
stockQuantSchema.index({ productId: 1, quantity: 1 });
// 引当時の有効在庫一括取得用: productIdの$inクエリ + 数量条件でフィルタリング後に $expr を評価
// 在库批量获取用：productId的$in查询 + 数量条件过滤后评估$expr
// partial フィルタにより quantity<=0 のレコードをインデックスから除外しサイズ削減
// 部分过滤器：排除quantity<=0的记录，减少索引大小
stockQuantSchema.index(
  { productId: 1, quantity: 1, reservedQuantity: 1 },
  { partialFilterExpression: { quantity: { $gt: 0 } } },
);

export const StockQuant = mongoose.model<IStockQuant>('StockQuant', stockQuantSchema);
