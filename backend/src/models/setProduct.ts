import mongoose from 'mongoose';

export interface ISetComponent {
  productId: mongoose.Types.ObjectId;
  sku: string;
  name: string;
  quantity: number; // 1セットあたりの必要数量
}

export interface ISetProduct {
  _id: mongoose.Types.ObjectId;
  sku: string; // セット組品番（products テーブルの SKU と紐づけ可能）
  name: string;
  components: ISetComponent[];
  isActive: boolean;
  memo?: string;
  createdAt: Date;
  updatedAt: Date;
}

const setComponentSchema = new mongoose.Schema<ISetComponent>(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    sku: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const setProductSchema = new mongoose.Schema<ISetProduct>(
  {
    sku: {
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
    components: {
      type: [setComponentSchema],
      default: [],
      validate: {
        validator: (v: ISetComponent[]) => v.length > 0,
        message: '構成品は1つ以上必要です',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    memo: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'set_products',
  },
);

export const SetProduct = mongoose.model<ISetProduct>('SetProduct', setProductSchema);
