<template>
  <div class="inventory-adjustments">
    <PageHeader :title="t('wms.inventory.adjustments', '在庫調整')" :show-search="false" />

    <div class="adjust-form rounded-lg border bg-card p-4">
      <h3 class="form-title">{{ t('wms.inventory.adjustmentStocktaking', '在庫調整（棚卸し）') }}</h3>
      <p class="form-desc">{{ t('wms.inventory.adjustmentDesc', '商品の在庫数量を手動で調整します。正の値で増加、負の値で減少します。') }}</p>

      <div class="form-grid">
        <div class="form-field">
          <label>{{ t('wms.inventory.product', '商品') }} <span class="text-destructive text-xs">*</span></label>
          <Select :model-value="form.productId || '__none__'" @update:model-value="(v: string) => { form.productId = v === '__none__' ? '' : v; handleProductChange() }">
            <SelectTrigger><SelectValue :placeholder="t('wms.inventory.selectProduct', '商品を選択...')" /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="p in products" :key="p._id" :value="p._id">{{ p.sku }} - {{ p.name }}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="form-field">
          <label>{{ t('wms.inventory.location', 'ロケーション') }} <span class="text-destructive text-xs">*</span></label>
          <Select :model-value="form.locationId || '__none__'" @update:model-value="(v: string) => { form.locationId = v === '__none__' ? '' : v }">
            <SelectTrigger><SelectValue :placeholder="t('wms.inventory.selectLocation', 'ロケーションを選択...')" /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="loc in physicalLocations" :key="loc._id" :value="loc._id">{{ loc.code }} ({{ loc.name }})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="form-field">
          <label>{{ t('wms.inventory.adjustQuantity', '調整数量') }} <span class="text-destructive text-xs">*</span></label>
          <Input v-model.number="form.adjustQuantity" type="number" :placeholder="t('wms.inventory.adjustQuantityPlaceholder', '例: +10 or -5')" />
          <span class="form-hint">{{ t('wms.inventory.adjustQuantityHint', '正: 在庫増加 / 負: 在庫減少') }}</span>
        </div>

        <div class="form-field">
          <label>{{ t('wms.inventory.memo', 'メモ') }}</label>
          <Input v-model="form.memo" type="text" :placeholder="t('wms.inventory.adjustReasonPlaceholder', '調整理由...')" />
        </div>
      </div>

      <div class="form-actions">
        <Button
          variant="default"
          :disabled="!canSubmit || isSubmitting"
          @click="handleSubmit"
        >
          {{ isSubmitting ? t('wms.inventory.processing', '処理中...') : t('wms.inventory.adjustStock', '在庫を調整') }}
        </Button>
      </div>
    </div>

    <!-- 調整履歴 -->
    <div class="section-title" style="display:flex;justify-content:space-between;align-items:center;">
      {{ t('wms.inventory.recentAdjustmentHistory', '最近の調整履歴') }}
      <Button variant="secondary" size="sm" @click="exportAdjustmentCsv">{{ t('wms.inventory.csvExport', 'CSV出力') }}</Button>
    </div>

    <div class="table-section">
      <DataTable
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { computed, h, onMounted, ref } from 'vue'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/shared/PageHeader.vue'
import { DataTable } from '@/components/data-table'
import { adjustStock, fetchMovements } from '@/api/inventory'
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
  locationId: '',
  adjustQuantity: 0 as number,
  memo: '',
})

const physicalLocations = computed(() =>
  locations.value.filter(l => l.type && !l.type.startsWith('virtual/')),
)

const canSubmit = computed(() =>
  form.value.productId && form.value.locationId && form.value.adjustQuantity !== 0,
)

const handleProductChange = () => {
  // 商品変更時の処理（将来的にデフォルトロケーション自動選択等を実装可能）
  // 商品切替时的处理（未来可实现默认库位自动选择等功能）
  // Currently no-op: location must be selected manually by the user.
}

const isIncrease = (row: StockMove) => {
  return row.toLocation?.code && !row.toLocation.code.startsWith('VIRTUAL/')
}

const formatDateTime = (d: string) => {
  if (!d) return '-'
  return new Date(d).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

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
    cellRenderer: ({ rowData }: { rowData: StockMove }) => {
      const inc = isIncrease(rowData)
      return h('span', { class: inc ? 'text-success' : 'text-danger' },
        `${inc ? '+' : '-'}${rowData.quantity}`)
    },
  },
  {
    key: 'location', title: t('wms.inventory.location', 'ロケーション'), width: 160, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: StockMove }) =>
      h('span', { class: 'location-badge' }, isIncrease(rowData) ? rowData.toLocation?.code : rowData.fromLocation?.code),
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

const handleSubmit = async () => {
  if (!canSubmit.value) return
  isSubmitting.value = true
  try {
    const result = await adjustStock({
      productId: form.value.productId,
      locationId: form.value.locationId,
      adjustQuantity: form.value.adjustQuantity,
      memo: form.value.memo || undefined,
    })
    toast.showSuccess(result.message)
    form.value.adjustQuantity = 0
    form.value.memo = ''
    await loadHistory()
  } catch (e: any) {
    toast.showError(e?.message || t('wms.inventory.adjustmentFailed', '在庫調整に失敗しました'))
  } finally {
    isSubmitting.value = false
  }
}

const loadHistory = async () => {
  isLoadingHistory.value = true
  try {
    const res = await fetchMovements({ moveType: 'adjustment', limit: 20 })
    historyRows.value = res.items
  } catch (e: any) {
    toast.showError(t('wms.inventory.adjustmentHistoryFetchFailed', '調整履歴の取得に失敗しました'))
  } finally {
    isLoadingHistory.value = false
  }
}

const exportAdjustmentCsv = () => {
  const csvRows: string[] = [
    [
      t('wms.inventory.moveNumber', '移動番号'),
      'SKU',
      t('wms.inventory.productName', '商品名'),
      t('wms.inventory.quantity', '数量'),
      t('wms.inventory.location', 'ロケーション'),
      t('wms.inventory.executedAt', '実行日時'),
      t('wms.inventory.memo', 'メモ'),
    ].join(','),
  ]
  for (const r of historyRows.value) {
    const inc = isIncrease(r)
    csvRows.push([
      `"${r.moveNumber}"`,
      `"${r.productSku}"`,
      `"${r.productName || ''}"`,
      `${inc ? '+' : '-'}${r.quantity}`,
      `"${inc ? r.toLocation?.code || '' : r.fromLocation?.code || ''}"`,
      r.executedAt ? formatDateTime(r.executedAt) : '',
      `"${r.memo || ''}"`,
    ].join(','))
  }
  const bom = '\uFEFF'
  const blob = new Blob([bom + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `adjustments_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

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
.inventory-adjustments {
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

.{
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

.text-success { color: #67c23a; font-weight: 600; }
.text-danger { color: #f56c6c; font-weight: 600; }

@media (max-width: 768px) {
  .form-grid { grid-template-columns: 1fr; }
}
</style>
