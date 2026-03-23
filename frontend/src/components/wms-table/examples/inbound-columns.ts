/**
 * 入庫管理テーブル列定義 / 入库管理表格列定义
 *
 * 全ての列は WmsColumnSchema で定義。テンプレートにハードコーディングなし。
 * 所有列均通过 WmsColumnSchema 定义。模板中无硬编码。
 */
import type { WmsColumnSchema, WmsToolbarConfig, WmsFieldSchema } from '../types'
import { h } from 'vue'
import { Plus, Trash2, Download } from 'lucide-vue-next'

// ─── テーブル列スキーマ / 表格列Schema ──────────────────────────────

export const inboundColumns: WmsColumnSchema[] = [
  {
    key: 'orderNumber',
    label: '入庫指示番号',
    type: 'text',
    sortable: true,
    filterable: true,
    filterType: 'text',
    width: 140,
  },
  {
    key: 'status',
    label: 'ステータス',
    type: 'badge',
    sortable: true,
    filterable: true,
    filterType: 'select',
    filterOptions: [
      { label: '下書き', value: 'draft' },
      { label: '確認済', value: 'confirmed' },
      { label: '入庫中', value: 'receiving' },
      { label: '完了', value: 'done' },
      { label: 'キャンセル', value: 'cancelled' },
    ],
    badgeMap: {
      draft: { label: '下書き', variant: 'secondary' },
      confirmed: { label: '確認済', variant: 'default' },
      receiving: { label: '入庫中', variant: 'outline' },
      done: { label: '完了', variant: 'default' },
      cancelled: { label: 'キャンセル', variant: 'destructive' },
    },
    width: 100,
  },
  {
    key: 'flowType',
    label: '入庫区分',
    type: 'badge',
    badgeMap: {
      standard: { label: '通常', variant: 'secondary' },
      fba: { label: 'FBA', variant: 'outline' },
      rsl: { label: 'RSL', variant: 'outline' },
      passthrough: { label: '通過型', variant: 'outline' },
    },
    width: 80,
  },
  {
    key: 'supplierName',
    label: '仕入先',
    type: 'text',
    sortable: true,
    width: 160,
  },
  {
    key: 'warehouseName',
    label: '入庫先',
    type: 'text',
    width: 120,
  },
  {
    key: 'expectedDate',
    label: '入庫予定日',
    type: 'date',
    sortable: true,
    width: 110,
  },
  {
    key: 'poNumber',
    label: '発注番号',
    type: 'text',
    visible: false,
    width: 120,
  },
  {
    key: 'deliveryCompany',
    label: '配送会社',
    type: 'text',
    visible: false,
    width: 100,
  },
  {
    key: 'totalCbm',
    label: 'CBM',
    type: 'number',
    visible: false,
    align: 'right',
    width: 80,
  },
  {
    key: 'totalPallets',
    label: 'パレット',
    type: 'number',
    visible: false,
    align: 'right',
    width: 80,
  },
  {
    key: 'notes',
    label: '備考',
    type: 'text',
    visible: false,
    width: 200,
    render: (value) => value && value.length > 30 ? value.substring(0, 30) + '...' : (value ?? '-'),
  },
  {
    key: 'createdAt',
    label: '作成日時',
    type: 'datetime',
    sortable: true,
    width: 140,
  },
]

// ─── ツールバー設定 / 工具栏设定 ────────────────────────────────────

export function createInboundToolbar(handlers: {
  onCreate: () => void
  onBatchDelete: (rows: any[]) => void
  onExport: () => void
}): WmsToolbarConfig {
  return {
    searchEnabled: true,
    searchPlaceholder: '入庫指示番号で検索...',
    searchColumnKey: 'orderNumber',
    actions: [
      {
        key: 'create',
        label: '新規作成',
        icon: Plus,
        variant: 'default',
        handler: handlers.onCreate,
      },
      {
        key: 'export',
        label: 'CSV出力',
        icon: Download,
        variant: 'outline',
        handler: handlers.onExport,
      },
    ],
    batchActions: [
      {
        key: 'delete',
        label: '一括削除',
        icon: Trash2,
        variant: 'destructive',
        requireSelection: true,
        handler: handlers.onBatchDelete,
      },
    ],
  }
}

// ─── Sheet フォームスキーマ / Sheet 表单Schema ──────────────────────

export const inboundFormSchema: WmsFieldSchema[] = [
  {
    key: 'orderNumber',
    label: '入庫指示番号',
    type: 'text',
    required: true,
    placeholder: 'IN-2026-XXXX',
    validation: {
      pattern: /^IN-\d{4}-\d{4}$/,
      message: 'IN-YYYY-NNNN形式で入力してください',
    },
  },
  {
    key: 'status',
    label: 'ステータス',
    type: 'select',
    required: true,
    options: [
      { label: '下書き', value: 'draft' },
      { label: '確認済', value: 'confirmed' },
      { label: '入庫中', value: 'receiving' },
      { label: '完了', value: 'done' },
    ],
    defaultValue: 'draft',
  },
  {
    key: 'flowType',
    label: '入庫区分',
    type: 'select',
    required: true,
    options: [
      { label: '通常', value: 'standard' },
      { label: 'FBA', value: 'fba' },
      { label: 'RSL', value: 'rsl' },
      { label: '通過型', value: 'passthrough' },
    ],
    defaultValue: 'standard',
  },
  {
    key: 'supplierId',
    label: '仕入先',
    type: 'select',
    required: true,
    options: [], // 動的にロード / 动态加载
    placeholder: '仕入先を選択...',
  },
  {
    key: 'warehouseId',
    label: '入庫先倉庫',
    type: 'select',
    required: true,
    options: [], // 動的にロード / 动态加载
    placeholder: '倉庫を選択...',
  },
  {
    key: 'expectedDate',
    label: '入庫予定日',
    type: 'date',
    required: true,
  },
  {
    key: 'poNumber',
    label: '発注番号',
    type: 'text',
    placeholder: 'PO-XXXX',
  },
  {
    key: 'deliveryCompany',
    label: '配送会社',
    type: 'text',
    group: '配送情報',
  },
  {
    key: 'deliverySlipNumber',
    label: '配送伝票番号',
    type: 'text',
  },
  {
    key: 'containerType',
    label: 'コンテナ種別',
    type: 'select',
    options: [
      { label: 'なし', value: '' },
      { label: '20ft', value: '20ft' },
      { label: '40ft', value: '40ft' },
      { label: '40ft HC', value: '40ft_hc' },
    ],
    visible: (data) => data.flowType !== 'passthrough',
  },
  {
    key: 'totalCbm',
    label: 'CBM',
    type: 'number',
    validation: { min: 0 },
  },
  {
    key: 'totalPallets',
    label: 'パレット数',
    type: 'number',
    validation: { min: 0 },
  },
  {
    key: 'notes',
    label: '備考',
    type: 'textarea',
    colSpan: 2,
    group: 'その他',
  },
  {
    key: 'isCodDelivery',
    label: '代引配送',
    type: 'switch',
  },
  {
    key: 'isUnplanned',
    label: '計画外入庫',
    type: 'switch',
    helpText: '事前予定なしの入庫の場合はONにしてください',
  },
]
