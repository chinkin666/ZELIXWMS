import mongoose from 'mongoose';

// 請求書ステータス / 发票状态
export type InvoiceStatus = 'draft' | 'issued' | 'sent' | 'paid' | 'overdue' | 'cancelled';

// 請求書明細行インターフェース / 发票明细行接口
export interface IInvoiceLineItem {
  description: string;         // 項目説明 / 项目说明
  quantity: number;            // 数量
  unitPrice: number;           // 単価 / 单价
  amount: number;              // 金額 / 金额
}

// 請求書インターフェース / 发票接口
export interface IInvoice {
  _id: mongoose.Types.ObjectId;
  tenantId: string;
  invoiceNumber: string;       // 請求書番号（自動採番: INV-202603-001） / 发票编号（自动编号）
  billingRecordId?: string;    // 関連請求明細 / 关联请求明细
  clientId?: string;           // 請求先 / 请求对象
  clientName?: string;
  period: string;              // 対象期間 / 对象期间
  issueDate: Date;             // 発行日 / 发行日
  dueDate: Date;               // 支払期限 / 支付期限
  // 金額 / 金额
  subtotal: number;            // 小計 / 小计
  taxRate: number;             // 税率（例: 0.10） / 税率（例: 0.10）
  taxAmount: number;           // 税額 / 税额
  totalAmount: number;         // 合計 / 合计
  // 明細 / 明细
  lineItems: IInvoiceLineItem[];
  status: InvoiceStatus;
  paidAt?: Date;
  memo?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 明細行スキーマ / 明细行Schema
const lineItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    amount: { type: Number, required: true },
  },
  { _id: false },
);

const invoiceSchema = new mongoose.Schema<IInvoice>(
  {
    tenantId: { type: String, required: true, trim: true },
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    billingRecordId: { type: String, trim: true, default: undefined },
    clientId: { type: String, trim: true, default: undefined },
    clientName: { type: String, trim: true, default: undefined },
    period: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (v: string) => /^\d{4}-\d{2}$/.test(v),
        message: '期間はYYYY-MM形式である必要があります / 期间必须为YYYY-MM格式',
      },
    },
    issueDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    // 金額 / 金额
    subtotal: { type: Number, required: true, default: 0 },
    taxRate: { type: Number, required: true, default: 0.10 },
    taxAmount: { type: Number, required: true, default: 0 },
    totalAmount: { type: Number, required: true, default: 0 },
    // 明細 / 明细
    lineItems: { type: [lineItemSchema], default: [] },
    status: {
      type: String,
      required: true,
      enum: ['draft', 'issued', 'sent', 'paid', 'overdue', 'cancelled'],
      default: 'draft',
    },
    paidAt: { type: Date },
    memo: { type: String, trim: true },
  },
  {
    timestamps: true,
    collection: 'invoices',
  },
);

// インデックス / 索引
invoiceSchema.index({ tenantId: 1, period: 1 });
invoiceSchema.index({ tenantId: 1, clientId: 1 });
invoiceSchema.index({ tenantId: 1, status: 1 });
invoiceSchema.index({ billingRecordId: 1 });
invoiceSchema.index({ dueDate: 1, status: 1 });

export const Invoice = mongoose.model<IInvoice>('Invoice', invoiceSchema);
