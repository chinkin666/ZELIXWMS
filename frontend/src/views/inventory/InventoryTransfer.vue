<template>
  <div class="inventory-transfer">
    <ControlPanel :title="t('wms.inventory.transfer', '在庫移動')" :show-search="false" />

    <!-- 移動フォーム / 移动表单 -->
    <div class="transfer-form o-card">
      <h3 class="form-title">{{ t('wms.inventory.interWarehouseTransfer', '拠点間移動') }}</h3>
      <p class="form-desc">{{ t('wms.inventory.transferDesc', 'ロケーション間で在庫を移動します。移動元に十分な在庫が必要です。') }}</p>

      <div class="form-grid">
        <!-- 商品選択 / 商品选择 -->
        <div class="form-field">
          <label class="form-label">{{ t('wms.inventory.product', '商品') }} <span class="required-badge">必須</span></label>
          <select v-model="form.productId" class="o-input">
            <option value="">{{ t('wms.inventory.selectProduct', '商品を選択...') }}</option>
            <option v-for="p in products" :key="p._id" :value="p._id">
              {{ p.sku }} - {{ p.name }}
            </option>
          </select>
        </div>

        <!-- 移動数量 / 移动数量 -->
        <div class="form-field">
          <label class="form-label">{{ t('wms.inventory.transferQuantity', '移動数量') }} <span class="required-badge">必須</span></label>
          <input v-model.number="form.quantity" type="number" min="1" class="o-input" :placeholder="t('wms.inventory.transferQuantityPlaceholder', '例: 10')" />
          <span class="form-hint">{{ t('wms.inventory.transferQuantityHint', '1以上の整数を入力してください') }}</span>
        </div>

        <!-- 移動元ロケーション / 移动源库位 -->
        <div class="form-field">
          <label class="form-label">{{ t('wms.inventory.fromLocation', '移動元') }} <span class="required-badge">必須</span></label>
          <select v-model="form.fromLocationId" class="o-input">
            <option value="">{{ t('wms.inventory.selectFromLocation', '移動元を選択...') }}</option>
            <option v-for="loc in physicalLocations" :key="loc._id" :value="loc._id">
              {{ loc.code }} ({{ loc.name }})
            </option>
          </select>
        </div>

        <!-- 移動先ロケーション / 移动目标库位 -->
        <div class="form-field">
          <label class="form-label">{{ t('wms.inventory.toLocation', '移動先') }} <span class="required-badge">必須</span></label>
          <select v-model="form.toLocationId" class="o-input">
            <option value="">{{ t('wms.inventory.selectToLocation', '移動先を選択...') }}</option>
            <option v-for="loc in availableToLocations" :key="loc._id" :value="loc._id">
              {{ loc.code }} ({{ loc.name }})
            </option>
          </select>
        </div>

        <!-- メモ / 备注 -->
        <div class="form-field form-field-full">
          <label class="form-label">{{ t('wms.inventory.memo', 'メモ') }}</label>
          <input v-model="form.memo" type="text" class="o-input" :placeholder="t('wms.inventory.transferReasonPlaceholder', '移動理由...')" />
        </div>
      </div>

      <div class="form-actions">
        <OButton
          variant="primary"
          :disabled="!canSubmit || isSubmitting"
          @click="handleSubmit"
        >
          {{ isSubmitting ? t('wms.inventory.processing', '処理中...') : t('wms.inventory.executeTransfer', '在庫を移動') }}
        </OButton>
      </div>
    </div>

    <!-- 移動履歴 / 移动履历 -->
    <div class="section-title" style="display:flex;justify-content:space-between;align-items:center;">
      {{ t('wms.inventory.recentTransferHistory', '最近の移動履歴') }}
      <OButton variant="secondary" size="sm" @click="exportTransferCsv">{{ t('wms.inventory.csvExport', 'CSV出力') }}</OButton>
    </div>

    <div class="table-section">
      <Table
        :columns="historyTableColumns"
        :data="historyRows"
        row-key="_id"
        highlight-columns-on-hover
        pagination-enabled
        pagination-mode="client"
        :page-size="20"
        :page-sizes="[20, 50]"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
// 拠点間移動ビュー / 拠点间移动视图
// 3PL向け: ロケーション間で在庫を移動する機能
// 面向3PL: 在库位间移动库存的功能
import { computed, h, onMounted, ref } from 'vue'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import Table from '@/components/table/Table.vue'
import { transferStock, fetchMovements } from '@/api/inventory'
import { fetchLocations } from '@/api/location'
import { fetchProducts } from '@/api/product'
import type { Product } from '@/types/product'
import type { Location } from '@/types/inventory'
import type { StockMove } from '@/types/inventory'
import type { TableColumn } from '@/types/table'

const toast = useToast()
const { t } = useI18n()

const products = ref<Product[]>([])
const locations = ref<Location[]>([])
const isSubmitting = ref(false)
const isLoadingHistory = ref(false)
const historyRows = ref<StockMove[]>([])

const form = ref({
  productId: '',
  fromLocationId: '',
  toLocationId: '',
  quantity: 1 as number,
  memo: '',
})

// 物理ロケーションのみ表示（仮想ロケーション除外）
// 只显示物理库位（排除虚拟库位）
const physicalLocations = computed(() =>
  locations.value.filter(l => l.type && !l.type.startsWith('virtual/')),
)

// 移動先は移動元と同じロケーションを除外
// 移动目标排除与移动源相同的库位
const availableToLocations = computed(() =>
  physicalLocations.value.filter(l => l._id !== form.value.fromLocationId),
)

// バリデーション: 商品・移動元・移動先・数量すべて必須
// 验证: 商品、移动源、移动目标、数量全部必填
const canSubmit = computed(() =>
  form.value.productId
    && form.value.fromLocationId
    && form.value.toLocationId
    && form.value.fromLocationId !== form.value.toLocationId
    && form.value.quantity > 0,
)

// 日時フォーマット / 日期时间格式化
const formatDateTime = (d: string) => {
  if (!d) return '-'
  return new Date(d).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// 移動履歴テーブルカラム定義 / 移动履历表列定义
const historyTableColumns = computed<TableColumn[]>(() => [
  {
    key: 'moveNumber', dataKey: 'moveNumber', title: t('wms.inventory.moveNumber', '移動番号'), width: 160, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: StockMove }) => h('span', { class: 'move-number' }, rowData.moveNumber),
  },
  { key: 'productSku', dataKey: 'productSku', title: 'SKU', width: 120, fieldType: 'string' },
  {
    key: 'productName', dataKey: 'productName', title: t('wms.inventory.productName', '商品名'), width: 160, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: StockMove }) => rowData.productName || '-',
  },
  {
    key: 'quantity', dataKey: 'quantity', title: t('wms.inventory.quantity', '数量'), width: 80, fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: StockMove }) => h('span', { class: 'text-info' }, String(rowData.quantity)),
  },
  {
    key: 'fromLocation', title: t('wms.inventory.fromLocation', '移動元'), width: 150, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: StockMove }) =>
      h('span', { class: 'location-badge' }, rowData.fromLocation?.code || '-'),
  },
  {
    key: 'toLocation', title: t('wms.inventory.toLocation', '移動先'), width: 150, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: StockMove }) =>
      h('span', { class: 'location-badge' }, rowData.toLocation?.code || '-'),
  },
  {
    key: 'executedAt', title: t('wms.inventory.executedAt', '実行日時'), width: 140, fieldType: 'date',
    cellRenderer: ({ rowData }: { rowData: StockMove }) => rowData.executedAt ? formatDateTime(rowData.executedAt) : '-',
  },
  {
    key: 'memo', dataKey: 'memo', title: t('wms.inventory.memo', 'メモ'), width: 200, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: StockMove }) => rowData.memo || '-',
  },
])

// 移動実行 / 执行移动
const handleSubmit = async () => {
  if (!canSubmit.value) return
  isSubmitting.value = true
  try {
    const result = await transferStock({
      productId: form.value.productId,
      fromLocationId: form.value.fromLocationId,
      toLocationId: form.value.toLocationId,
      quantity: form.value.quantity,
      memo: form.value.memo || undefined,
    })
    toast.showSuccess(result.message)
    // フォームリセット（商品とロケーションは保持）
    // 重置表单（保留商品和库位选择）
    form.value.quantity = 1
    form.value.memo = ''
    await loadHistory()
  } catch (e: any) {
    toast.showError(e?.message || t('wms.inventory.transferFailed', '在庫移動に失敗しました'))
  } finally {
    isSubmitting.value = false
  }
}

// 移動履歴ロード / 加载移动履历
const loadHistory = async () => {
  isLoadingHistory.value = true
  try {
    const res = await fetchMovements({ moveType: 'transfer', limit: 20 })
    historyRows.value = res.items
  } catch (e: any) {
    toast.showError(t('wms.inventory.transferHistoryFetchFailed', '移動履歴の取得に失敗しました'))
  } finally {
    isLoadingHistory.value = false
  }
}

// CSV出力 / CSV导出
const exportTransferCsv = () => {
  const csvRows: string[] = [
    [
      t('wms.inventory.moveNumber', '移動番号'),
      'SKU',
      t('wms.inventory.productName', '商品名'),
      t('wms.inventory.quantity', '数量'),
      t('wms.inventory.fromLocation', '移動元'),
      t('wms.inventory.toLocation', '移動先'),
      t('wms.inventory.executedAt', '実行日時'),
      t('wms.inventory.memo', 'メモ'),
    ].join(','),
  ]
  for (const r of historyRows.value) {
    csvRows.push([
      `"${r.moveNumber}"`,
      `"${r.productSku}"`,
      `"${r.productName || ''}"`,
      String(r.quantity),
      `"${r.fromLocation?.code || ''}"`,
      `"${r.toLocation?.code || ''}"`,
      r.executedAt ? formatDateTime(r.executedAt) : '',
      `"${r.memo || ''}"`,
    ].join(','))
  }
  const bom = '\uFEFF'
  const blob = new Blob([bom + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `transfers_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// 初期データロード / 初始数据加载
onMounted(async () => {
  try {
    const [prods, locs] = await Promise.all([
      fetchProducts(),
      fetchLocations({ isActive: true }),
    ])
    products.value = prods
    locations.value = locs
  } catch (e: any) {
    toast.showError(t('wms.inventory.masterDataFetchFailed', 'マスタデータの取得に失敗しました'))
  }
  await loadHistory()
})
</script>

<style scoped>
.inventory-transfer {
  display: flex;
  flex-direction: column;
  padding: 0 20px 20px;
  gap: 16px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

.table-section {
  width: 100%;
}

.o-card {
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: var(--o-border-radius, 8px);
  padding: 1.5rem;
}

.form-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--o-gray-700, #303133);
  margin: 0 0 4px 0;
}

.form-desc {
  font-size: 13px;
  color: var(--o-gray-500, #909399);
  margin: 0 0 1.5rem 0;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-field-full {
  grid-column: 1 / -1;
}

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--o-gray-700, #303133);
}

.required-badge { display:inline-block;background:#dc3545;color:#fff;font-size:10px;font-weight:700;line-height:1;padding:2px 5px;border-radius:3px;white-space:nowrap;vertical-align:middle;margin-left:4px; }

.form-hint {
  font-size: 12px;
  color: var(--o-gray-500, #909399);
}

.form-actions {
  margin-top: 1.5rem;
  text-align: right;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--o-gray-700, #303133);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--o-border-color, #e4e7ed);
}

.o-input {
  padding: 8px 12px;
  border: 1px solid var(--o-border-color, #dcdfe6);
  border-radius: var(--o-border-radius, 4px);
  font-size: 14px;
  color: var(--o-gray-700, #303133);
  background: var(--o-view-background, #fff);
  width: 100%;
}

.move-number {
  font-family: monospace;
  font-size: 12px;
  color: var(--o-brand-primary, #714b67);
}

.location-badge {
  font-family: monospace;
  font-size: 12px;
  background: var(--o-gray-100, #f5f7fa);
  padding: 2px 6px;
  border-radius: 3px;
}

.text-info { color: #409eff; font-weight: 600; }

@media (max-width: 768px) {
  .form-grid { grid-template-columns: 1fr; }
}
</style>
