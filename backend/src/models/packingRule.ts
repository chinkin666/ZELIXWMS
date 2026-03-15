import mongoose from 'mongoose';

// ============================================
// 梱包ルール / 梱包规则
// 自動耗材追加ルール（例: 60サイズ以下 → BOX-60 x1 + 気泡膜 x1）
// 自动耗材追加规则（例: 60尺寸以下 → BOX-60 x1 + 气泡膜 x1）
// ============================================

// 条件インターフェース / 条件接口
export interface IPackingRuleConditions {
  maxWeight?: number;          // 最大重量(g) / 最大重量(g)
  maxDimension?: number;       // 最大才数 / 最大才数
  coolType?: string;           // クール区分 / 冷藏区分
  invoiceType?: string;        // 送り状種類 / 送货单种类
  maxProductCount?: number;    // 最大商品数 / 最大商品数
}

// 適用耗材インターフェース / 应用耗材接口
export interface IPackingRuleMaterial {
  productSku: string;          // 耗材SKU / 耗材SKU
  productName?: string;        // 耗材名 / 耗材名
  quantity: number;            // 数量 / 数量
  unitCost?: number;           // 単価 / 单价
}

export interface IPackingRule {
  _id: mongoose.Types.ObjectId;
  tenantId: string;
  name: string;                // ルール名 / 规则名
  priority: number;            // 優先度（小さい方が優先）/ 优先级（越小越优先）
  isActive: boolean;           // 有効/無効 / 启用/禁用
  // 条件 / 条件
  conditions: IPackingRuleConditions;
  // 適用する耗材 / 应用的耗材
  materials: IPackingRuleMaterial[];
  memo?: string;               // メモ / 备注
  createdAt: Date;
  updatedAt: Date;
}

// 条件サブドキュメント / 条件子文档
const packingRuleConditionsSchema = new mongoose.Schema<IPackingRuleConditions>(
  {
    maxWeight: { type: Number, min: 0 },
    maxDimension: { type: Number, min: 0 },
    coolType: { type: String, trim: true },
    invoiceType: { type: String, trim: true },
    maxProductCount: { type: Number, min: 1 },
  },
  { _id: false },
);

// 耗材サブドキュメント / 耗材子文档
const packingRuleMaterialSchema = new mongoose.Schema<IPackingRuleMaterial>(
  {
    productSku: { type: String, required: true, trim: true },
    productName: { type: String, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    unitCost: { type: Number, min: 0 },
  },
  { _id: false },
);

const packingRuleSchema = new mongoose.Schema<IPackingRule>(
  {
    tenantId: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    priority: { type: Number, required: true, default: 100 },
    isActive: { type: Boolean, required: true, default: true },
    conditions: { type: packingRuleConditionsSchema, required: true, default: {} },
    materials: { type: [packingRuleMaterialSchema], required: true, default: [] },
    memo: { type: String, trim: true },
  },
  {
    timestamps: true,
    collection: 'packing_rules',
  },
);

// インデックス / 索引
packingRuleSchema.index({ tenantId: 1, isActive: 1 });
packingRuleSchema.index({ priority: 1 });

export const PackingRule = mongoose.model<IPackingRule>('PackingRule', packingRuleSchema);
