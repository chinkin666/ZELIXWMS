import mongoose from 'mongoose';

export type SetOrderType = 'assembly' | 'disassembly';
export type SetOrderStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface ISetOrderComponent {
  productId: mongoose.Types.ObjectId;
  sku: string;
  name: string;
  quantityPerSet: number; // 1セットあたりの必要数
  totalQuantity: number;  // = quantityPerSet × 指示数
}

export interface ISetOrder {
  _id: mongoose.Types.ObjectId;
  orderNumber: string;
  type: SetOrderType;
  setProductId: mongoose.Types.ObjectId;
  setSku: string;
  setName: string;
  quantity: number;         // 指示数
  completedQuantity: number; // 完成数
  stockCategory?: string;   // 完成後の在庫区分
  desiredDate?: Date;       // 完成希望日
  lotNumber?: string;
  expiryDate?: Date;
  status: SetOrderStatus;
  completedAt?: Date;
  components: ISetOrderComponent[];
  memo?: string;
  createdAt: Date;
  updatedAt: Date;
}

const setOrderComponentSchema = new mongoose.Schema<ISetOrderComponent>(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    sku: { type: String, required: true },
    name: { type: String, required: true },
    quantityPerSet: { type: Number, required: true, min: 1 },
    totalQuantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const setOrderSchema = new mongoose.Schema<ISetOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['assembly', 'disassembly'],
      required: true,
    },
    setProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SetProduct',
      required: true,
    },
    setSku: { type: String, required: true },
    setName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    completedQuantity: { type: Number, default: 0, min: 0 },
    stockCategory: { type: String, trim: true },
    desiredDate: { type: Date },
    lotNumber: { type: String, trim: true },
    expiryDate: { type: Date },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
    },
    completedAt: { type: Date },
    components: {
      type: [setOrderComponentSchema],
      default: [],
    },
    memo: { type: String, trim: true },
  },
  {
    timestamps: true,
    collection: 'set_orders',
  },
);

setOrderSchema.index({ type: 1, status: 1 });
setOrderSchema.index({ setSku: 1 });
setOrderSchema.index({ createdAt: -1 });

export const SetOrder = mongoose.model<ISetOrder>('SetOrder', setOrderSchema);
