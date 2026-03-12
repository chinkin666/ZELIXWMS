<template>
  <div class="inbound-order-create">
    <ControlPanel title="入庫指示作成" :show-search="false">
      <template #actions>
        <OButton variant="secondary" size="sm" @click="$router.push('/inbound/orders')">戻る</OButton>
      </template>
    </ControlPanel>

    <div class="o-card">
      <div class="form-grid">
        <div class="form-field">
          <label class="form-label">入庫先ロケーション <span class="required">*</span></label>
          <select v-model="form.destinationLocationId" class="o-input">
            <option value="">選択してください...</option>
            <option v-for="loc in physicalLocations" :key="loc._id" :value="loc._id">
              {{ loc.code }} ({{ loc.name }})
            </option>
          </select>
        </div>

        <div class="form-field">
          <label class="form-label">入庫予定日</label>
          <input v-model="form.expectedDate" type="date" class="o-input" />
        </div>

        <div class="form-field">
          <label class="form-label">仕入先名</label>
          <input v-model="form.supplierName" type="text" class="o-input" placeholder="仕入先名..." />
        </div>

        <div class="form-field">
          <label class="form-label">メモ</label>
          <input v-model="form.memo" type="text" class="o-input" placeholder="入庫メモ..." />
        </div>
      </div>
    </div>

    <!-- 入庫明細 -->
    <div class="section-header">
      <h3 class="section-title">入庫明細</h3>
      <OButton variant="secondary" size="sm" @click="addLine">行を追加</OButton>
    </div>

    <div class="o-table-wrapper">
      <table class="o-table">
        <thead>
          <tr>
            <th class="o-table-th" style="width:40px;">#</th>
            <th class="o-table-th" style="width:250px;">商品 <span class="required">*</span></th>
            <th class="o-table-th o-table-th--right" style="width:120px;">予定数量 <span class="required">*</span></th>
            <th class="o-table-th" style="width:100px;">在庫区分</th>
            <th class="o-table-th" style="width:130px;">注文番号</th>
            <th class="o-table-th" style="width:130px;">ロット番号</th>
            <th class="o-table-th" style="width:120px;">賞味期限</th>
            <th class="o-table-th" style="width:150px;">メモ</th>
            <th class="o-table-th" style="width:60px;"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="form.lines.length === 0">
            <td colspan="9" class="o-table-empty">行を追加してください</td>
          </tr>
          <tr v-for="(line, i) in form.lines" :key="i" class="o-table-row">
            <td class="o-table-td" style="text-align:center;">{{ i + 1 }}</td>
            <td class="o-table-td">
              <select v-model="line.productId" class="o-input o-input-sm">
                <option value="">商品を選択...</option>
                <option v-for="p in products" :key="p._id" :value="p._id">
                  {{ p.sku }} - {{ p.name }}
                </option>
              </select>
            </td>
            <td class="o-table-td">
              <input v-model.number="line.expectedQuantity" type="number" min="1" class="o-input o-input-sm" style="text-align:right;" />
            </td>
            <td class="o-table-td">
              <select v-model="line.stockCategory" class="o-input o-input-sm">
                <option value="new">新品</option>
                <option value="damaged">仕損</option>
              </select>
            </td>
            <td class="o-table-td">
              <input v-model="line.orderReferenceNumber" type="text" class="o-input o-input-sm" placeholder="注文番号..." />
            </td>
            <td class="o-table-td">
              <input v-model="line.lotNumber" type="text" class="o-input o-input-sm" placeholder="LOT-..." />
            </td>
            <td class="o-table-td">
              <input v-model="line.expiryDate" type="date" class="o-input o-input-sm" />
            </td>
            <td class="o-table-td">
              <input v-model="line.memo" type="text" class="o-input o-input-sm" />
            </td>
            <td class="o-table-td" style="text-align:center;">
              <button class="btn-remove" @click="removeLine(i)">&times;</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="form-actions">
      <OButton
        variant="primary"
        :disabled="!canSubmit || isSubmitting"
        @click="handleSubmit"
      >
        {{ isSubmitting ? '作成中...' : '入庫指示を作成' }}
      </OButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import { createInboundOrder } from '@/api/inboundOrder'
import { fetchLocations } from '@/api/location'
import { fetchProducts } from '@/api/product'
import type { Product } from '@/types/product'
import type { Location } from '@/types/inventory'

const router = useRouter()
const toast = useToast()
const isSubmitting = ref(false)
const products = ref<Product[]>([])
const locations = ref<Location[]>([])

interface FormLine {
  productId: string
  expectedQuantity: number
  stockCategory: 'new' | 'damaged'
  orderReferenceNumber: string
  lotNumber: string
  expiryDate: string
  memo: string
}

const form = ref({
  destinationLocationId: '',
  expectedDate: '',
  supplierName: '',
  memo: '',
  lines: [] as FormLine[],
})

const physicalLocations = computed(() =>
  locations.value.filter(l => !l.type.startsWith('virtual/')),
)

const canSubmit = computed(() =>
  form.value.destinationLocationId &&
  form.value.lines.length > 0 &&
  form.value.lines.every(l => l.productId && l.expectedQuantity >= 1),
)

const addLine = () => {
  form.value.lines.push({
    productId: '',
    expectedQuantity: 1,
    stockCategory: 'new',
    orderReferenceNumber: '',
    lotNumber: '',
    expiryDate: '',
    memo: '',
  })
}

const removeLine = (i: number) => {
  form.value.lines.splice(i, 1)
}

const handleSubmit = async () => {
  if (!canSubmit.value) return
  isSubmitting.value = true
  try {
    const payload = {
      destinationLocationId: form.value.destinationLocationId,
      supplier: form.value.supplierName ? { name: form.value.supplierName } : undefined,
      expectedDate: form.value.expectedDate || undefined,
      memo: form.value.memo || undefined,
      lines: form.value.lines.map(l => ({
        productId: l.productId,
        expectedQuantity: l.expectedQuantity,
        stockCategory: l.stockCategory,
        orderReferenceNumber: l.orderReferenceNumber || undefined,
        lotNumber: l.lotNumber || undefined,
        expiryDate: l.expiryDate || undefined,
        memo: l.memo || undefined,
      })),
    }
    const order = await createInboundOrder(payload)
    toast.showSuccess(`入庫指示 ${order.orderNumber} を作成しました`)
    router.push('/inbound/orders')
  } catch (e: any) {
    toast.showError(e?.message || '作成に失敗しました')
  } finally {
    isSubmitting.value = false
  }
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
  // 默认加一行
  addLine()
})
</script>

<style>
@import '@/styles/order-table.css';
</style>

<style scoped>
.inbound-order-create {
  display: flex;
  flex-direction: column;
  padding: 1rem;
}

.o-card {
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: var(--o-border-radius, 8px);
  padding: 1.25rem;
  margin-bottom: 1rem;
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

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--o-gray-700, #303133);
  margin: 0;
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

.o-input-sm {
  padding: 4px 8px;
  font-size: 13px;
}

.btn-remove {
  background: none;
  border: none;
  color: #f56c6c;
  font-size: 18px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}
.btn-remove:hover { color: #c0392b; }

.form-actions {
  margin-top: 1rem;
  text-align: right;
}

.o-table-th--right { text-align: right; }

@media (max-width: 768px) {
  .form-grid { grid-template-columns: 1fr; }
}
</style>
