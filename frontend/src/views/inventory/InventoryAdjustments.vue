<template>
  <div class="inventory-adjustments">
    <ControlPanel title="在庫調整" :show-search="false" />

    <div class="adjust-form o-card">
      <h3 class="form-title">在庫調整（棚卸し）</h3>
      <p class="form-desc">商品の在庫数量を手動で調整します。正の値で増加、負の値で減少します。</p>

      <div class="form-grid">
        <div class="form-field">
          <label class="form-label">商品 <span class="required">*</span></label>
          <select v-model="form.productId" class="o-input" @change="handleProductChange">
            <option value="">商品を選択...</option>
            <option v-for="p in products" :key="p._id" :value="p._id">
              {{ p.sku }} - {{ p.name }}
            </option>
          </select>
        </div>

        <div class="form-field">
          <label class="form-label">ロケーション <span class="required">*</span></label>
          <select v-model="form.locationId" class="o-input">
            <option value="">ロケーションを選択...</option>
            <option v-for="loc in physicalLocations" :key="loc._id" :value="loc._id">
              {{ loc.code }} ({{ loc.name }})
            </option>
          </select>
        </div>

        <div class="form-field">
          <label class="form-label">調整数量 <span class="required">*</span></label>
          <input v-model.number="form.adjustQuantity" type="number" class="o-input" placeholder="例: +10 or -5" />
          <span class="form-hint">正: 在庫増加 / 負: 在庫減少</span>
        </div>

        <div class="form-field">
          <label class="form-label">メモ</label>
          <input v-model="form.memo" type="text" class="o-input" placeholder="調整理由..." />
        </div>
      </div>

      <div class="form-actions">
        <OButton
          variant="primary"
          :disabled="!canSubmit || isSubmitting"
          @click="handleSubmit"
        >
          {{ isSubmitting ? '処理中...' : '在庫を調整' }}
        </OButton>
      </div>
    </div>

    <!-- 調整履歴 -->
    <div class="section-title" style="display:flex;justify-content:space-between;align-items:center;">
      最近の調整履歴
      <OButton variant="secondary" size="sm" @click="exportAdjustmentCsv">CSV出力</OButton>
    </div>
    <div class="o-table-wrapper">
      <table class="o-table">
        <thead>
          <tr>
            <th class="o-table-th" style="width:160px;">移動番号</th>
            <th class="o-table-th" style="width:120px;">SKU</th>
            <th class="o-table-th" style="width:160px;">商品名</th>
            <th class="o-table-th o-table-th--right" style="width:80px;">数量</th>
            <th class="o-table-th" style="width:160px;">ロケーション</th>
            <th class="o-table-th" style="width:140px;">実行日時</th>
            <th class="o-table-th" style="width:200px;">メモ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoadingHistory">
            <td colspan="7" class="o-table-empty">読み込み中...</td>
          </tr>
          <tr v-else-if="historyRows.length === 0">
            <td colspan="7" class="o-table-empty">調整履歴がありません</td>
          </tr>
          <tr v-for="row in historyRows" :key="row._id" class="o-table-row">
            <td class="o-table-td"><span class="move-number">{{ row.moveNumber }}</span></td>
            <td class="o-table-td">{{ row.productSku }}</td>
            <td class="o-table-td">{{ row.productName || '-' }}</td>
            <td class="o-table-td o-table-td--right">
              <span :class="isIncrease(row) ? 'text-success' : 'text-danger'">
                {{ isIncrease(row) ? '+' : '-' }}{{ row.quantity }}
              </span>
            </td>
            <td class="o-table-td">
              <span class="location-badge">{{ isIncrease(row) ? row.toLocation?.code : row.fromLocation?.code }}</span>
            </td>
            <td class="o-table-td">{{ row.executedAt ? formatDateTime(row.executedAt) : '-' }}</td>
            <td class="o-table-td">{{ row.memo || '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useToast } from '@/composables/useToast'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import { adjustStock, fetchMovements } from '@/api/inventory'
import { fetchLocations } from '@/api/location'
import { fetchProducts } from '@/api/product'
import type { Product } from '@/types/product'
import type { Location } from '@/types/inventory'
import type { StockMove } from '@/types/inventory'

const toast = useToast()

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
  locations.value.filter(l => !l.type.startsWith('virtual/')),
)

const canSubmit = computed(() =>
  form.value.productId && form.value.locationId && form.value.adjustQuantity !== 0,
)

const handleProductChange = () => {
  const product = products.value.find(p => p._id === form.value.productId)
  if (product && !form.value.locationId) {
    // 默认选择产品的 defaultLocationId (如果前端有此字段的话)
  }
}

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
    toast.showError(e?.message || '在庫調整に失敗しました')
  } finally {
    isSubmitting.value = false
  }
}

const isIncrease = (row: StockMove) => {
  return row.toLocation?.code && !row.toLocation.code.startsWith('VIRTUAL/')
}

const formatDateTime = (d: string) => {
  if (!d) return '-'
  return new Date(d).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const loadHistory = async () => {
  isLoadingHistory.value = true
  try {
    const res = await fetchMovements({ moveType: 'adjustment', limit: 20 })
    historyRows.value = res.items
  } catch (e: any) {
    toast.showError('調整履歴の取得に失敗しました')
  } finally {
    isLoadingHistory.value = false
  }
}

const exportAdjustmentCsv = () => {
  const csvRows: string[] = ['移動番号,SKU,商品名,数量,ロケーション,実行日時,メモ']
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
    toast.showError('マスタデータの取得に失敗しました')
  }
  await loadHistory()
})
</script>

<style>
@import '@/styles/order-table.css';
</style>

<style scoped>
.inventory-adjustments {
  display: flex;
  flex-direction: column;
  padding: 1rem;
}

.o-card {
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: var(--o-border-radius, 8px);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
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

.required { color: #f56c6c; }

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
  margin-bottom: 12px;
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

.text-success { color: #67c23a; font-weight: 600; }
.text-danger { color: #f56c6c; font-weight: 600; }
.o-table-td--right { text-align: right; }
.o-table-th--right { text-align: right; }

@media (max-width: 768px) {
  .form-grid { grid-template-columns: 1fr; }
}
</style>
