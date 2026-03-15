import mongoose from 'mongoose';

// ============================================
// 耗材マスター / 耗材主数据
// 商品（Product）とは独立した梱包資材管理
// 与商品（Product）独立的包装材料管理
// ============================================

// 耗材カテゴリ / 耗材类别
export type MaterialCategory = 'box' | 'cushioning' | 'tape' | 'label' | 'bag' | 'other';

export interface IMaterial {
  _id: mongoose.Types.ObjectId;
  tenantId: string;
  sku: string;                    // 耗材SKU（例: BOX-60, BUBBLE-A4）/ 耗材SKU
  name: string;                   // 耗材名 / 耗材名称
  category: MaterialCategory;     // 箱/緩衝材/テープ/ラベル/袋/その他 / 箱/缓冲材/胶带/标签/袋/其他
  unitCost: number;               // 単価（円）/ 单价（日元）
  // 在庫管理 / 库存管理
  inventoryEnabled: boolean;      // 在庫管理するか / 是否进行库存管理
  currentStock?: number;          // 現在在庫（簡易管理用）/ 当前库存（简易管理用）
  safetyStock?: number;           // 安全在庫 / 安全库存
  // サイズ / 尺寸（箱の場合）
  widthMm?: number;               // 幅(mm) / 宽(mm)
  depthMm?: number;               // 奥行(mm) / 深(mm)
  heightMm?: number;              // 高さ(mm) / 高(mm)
  // 仕入情報 / 采购信息
  supplierCode?: string;          // 仕入先コード / 供应商代码
  caseQuantity?: number;          // 1ケースあたりの枚/個数 / 每箱数量
  leadTime?: number;              // リードタイム（日）/ 交货周期（天）
  isActive: boolean;              // 有効/無効 / 启用/禁用
  memo?: string;                  // メモ / 备注
  createdAt: Date;
  updatedAt: Date;
}

const materialSchema = new mongoose.Schema<IMaterial>(
  {
    tenantId: { type: String, required: true, trim: true },
    sku: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ['box', 'cushioning', 'tape', 'label', 'bag', 'other'],
    },
    unitCost: { type: Number, required: true, min: 0 },
    // 在庫管理 / 库存管理
    inventoryEnabled: { type: Boolean, required: true, default: false },
    currentStock: { type: Number, min: 0 },
    safetyStock: { type: Number, min: 0 },
    // サイズ / 尺寸
    widthMm: { type: Number, min: 0 },
    depthMm: { type: Number, min: 0 },
    heightMm: { type: Number, min: 0 },
    // 仕入情報 / 采购信息
    supplierCode: { type: String, trim: true },
    caseQuantity: { type: Number, min: 1 },
    leadTime: { type: Number, min: 0 },
    isActive: { type: Boolean, required: true, default: true },
    memo: { type: String, trim: true },
  },
  {
    timestamps: true,
    collection: 'materials',
  },
);

// インデックス / 索引
// tenantId + sku でユニーク / tenantId + sku 唯一索引
materialSchema.index({ tenantId: 1, sku: 1 }, { unique: true });
// tenantId + isActive で有効耗材一覧 / tenantId + isActive 有效耗材列表
materialSchema.index({ tenantId: 1, isActive: 1 });
// カテゴリ検索 / 类别检索
materialSchema.index({ category: 1 });

export const Material = mongoose.model<IMaterial>('Material', materialSchema);
