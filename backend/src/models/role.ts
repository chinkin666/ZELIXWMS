import mongoose from 'mongoose';

/**
 * 権限識別子フォーマット: resource:action
 * 权限标识格式: resource:action
 *
 * 例 / 例: 'inbound:view', 'inbound:receive', 'inspection:operate', 'labeling:verify'
 */

// システム定義ロール / 系统预定义角色
export const SYSTEM_ROLES = {
  // 平台端 / プラットフォーム端
  platform_admin: 'platform_admin',
  platform_operator: 'platform_operator',
  platform_finance: 'platform_finance',

  // 仓库端 / 倉庫端
  warehouse_admin: 'warehouse_admin',
  warehouse_supervisor: 'warehouse_supervisor',
  receiver: 'receiver',
  inspector: 'inspector',
  labeler: 'labeler',
  shipper: 'shipper',
  warehouse_viewer: 'warehouse_viewer',

  // 客户端 / 顧客端
  client_admin: 'client_admin',
  client_subclient_user: 'client_subclient_user',
} as const;

// 仓库端权限一览 / 倉庫端権限一覧
export const WAREHOUSE_PERMISSIONS = [
  // 入库 / 入庫
  'inbound:view',
  'inbound:receive',
  'inbound:variance',
  'inbound:supervisor_confirm',

  // 检品 / 検品
  'inspection:operate',
  'inspection:verify',

  // 贴标 / ラベル貼付
  'labeling:operate',
  'labeling:verify',

  // 出货 / 出荷
  'shipping:operate',
  'shipping:tracking',

  // 异常 / 異常
  'exception:create',
  'exception:resolve',

  // 库存 / 在庫
  'inventory:view',
  'inventory:adjust',

  // 盘点 / 棚卸し
  'cycle_count:operate',

  // 任务 / タスク
  'task:view',
  'task:assign',

  // 员工 / スタッフ
  'staff:manage',

  // 报告 / レポート
  'report:view',
] as const;

// 预定义角色的默认权限 / 定義済みロールのデフォルト権限
export const DEFAULT_ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  warehouse_admin: WAREHOUSE_PERMISSIONS,
  warehouse_supervisor: [
    'inbound:view', 'inbound:receive', 'inbound:variance', 'inbound:supervisor_confirm',
    'inspection:operate', 'inspection:verify',
    'labeling:operate', 'labeling:verify',
    'shipping:operate', 'shipping:tracking',
    'exception:create', 'exception:resolve',
    'inventory:view', 'inventory:adjust',
    'cycle_count:operate',
    'task:view', 'task:assign',
    'report:view',
  ],
  receiver: [
    'inbound:view', 'inbound:receive', 'inbound:variance',
    'exception:create',
    'inventory:view',
    'cycle_count:operate',
    'task:view',
  ],
  inspector: [
    'inbound:view',
    'inspection:operate',
    'exception:create',
    'inventory:view',
    'cycle_count:operate',
    'task:view',
  ],
  labeler: [
    'labeling:operate',
    'exception:create',
    'task:view',
  ],
  shipper: [
    'shipping:operate', 'shipping:tracking',
    'exception:create',
    'task:view',
  ],
  warehouse_viewer: [
    'inbound:view',
    'inventory:view',
    'task:view',
    'report:view',
  ],
};

export interface IRole {
  _id: mongoose.Types.ObjectId;
  /** テナントID / 租户ID */
  tenantId: string;
  /** ロールコード / 角色编码 */
  code: string;
  /** ロール名 / 角色名称 */
  name: string;
  /** ロール名2（多言語用）/ 角色名称2（多语言） */
  name2?: string;
  /** 説明 / 说明 */
  description?: string;
  /** 権限リスト / 权限列表 */
  permissions: string[];
  /** システム定義（削除不可）/ 系统预定义（不可删除） */
  isSystem: boolean;
  /** 適用先 / 适用范围 */
  scope: 'platform' | 'warehouse' | 'client';
  /** 倉庫ID（倉庫レベルロール用）/ 仓库ID（仓库级角色用） */
  warehouseId?: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const roleSchema = new mongoose.Schema<IRole>(
  {
    tenantId: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    name2: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    permissions: {
      type: [String],
      default: [],
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    scope: {
      type: String,
      required: true,
      enum: ['platform', 'warehouse', 'client'],
    },
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'roles',
  },
);

roleSchema.index({ tenantId: 1, code: 1 }, { unique: true });
roleSchema.index({ tenantId: 1, scope: 1 });

export const Role = mongoose.model<IRole>('Role', roleSchema);
