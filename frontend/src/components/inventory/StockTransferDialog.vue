<template>
  <ODialog :open="open" title="在庫移動" size="md" @close="emit('close')">
    <div class="dialog-form">
      <div class="form-field">
        <label class="form-label">商品 <span class="req">*</span></label>
        <select v-model="form.productId" class="o-input" @change="onProductChange">
          <option value="">商品を選択...</option>
          <option v-for="p in products" :key="p._id" :value="p._id">
            {{ p.sku }} - {{ p.name }}
          </option>
        </select>
      </div>

      <div class="form-row">
        <div class="form-field" style="flex:1;">
          <label class="form-label">移動元 <span class="req">*</span></label>
          <select v-model="form.fromLocationId" class="o-input">
            <option value="">移動元を選択...</option>
            <option v-for="loc in physicalLocations" :key="loc._id" :value="loc._id">
              {{ loc.code }} ({{ loc.name }})
            </option>
          </select>
        </div>
        <div class="arrow-col">→</div>
        <div class="form-field" style="flex:1;">
          <label class="form-label">移動先 <span class="req">*</span></label>
          <select v-model="form.toLocationId" class="o-input">
            <option value="">移動先を選択...</option>
            <option v-for="loc in physicalLocations" :key="loc._id" :value="loc._id">
              {{ loc.code }} ({{ loc.name }})
            </option>
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-field" style="flex:1;">
          <label class="form-label">数量 <span class="req">*</span></label>
          <input v-model.number="form.quantity" type="number" class="o-input" min="1" />
        </div>
        <div class="form-field" style="flex:1;">
          <label class="form-label">ロット</label>
          <select v-model="form.lotId" class="o-input">
            <option value="">指定なし</option>
            <option v-for="lot in lots" :key="lot._id" :value="lot._id">
              {{ lot.lotNumber }}{{ lot.expiryDate ? ' (' + formatDate(lot.expiryDate) + ')' : '' }}
            </option>
          </select>
        </div>
      </div>

      <div class="form-field">
        <label class="form-label">メモ</label>
        <input v-model="form.memo" type="text" class="o-input" placeholder="移動理由..." />
      </div>

      <div v-if="sourceInfo" class="source-info">
        <span>移動元在庫: <strong>{{ sourceInfo.quantity }}</strong></span>
        <span>（引当済: {{ sourceInfo.reserved }}, 有効: <strong :class="{ 'text-danger': sourceInfo.available < form.quantity }">{{ sourceInfo.available }}</strong>）</span>
      </div>
    </div>

    <template #footer>
      <OButton variant="secondary" @click="emit('close')">キャンセル</OButton>
      <OButton variant="primary" :disabled="!canSubmit || saving" @click="handleSubmit">
        {{ saving ? '移動中...' : '在庫を移動' }}
      </OButton>
    </template>
  </ODialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import ODialog from '@/components/odoo/ODialog.vue'
import OButton from '@/components/odoo/OButton.vue'
import { transferStock, fetchStock } from '@/api/inventory'
import { fetchLots } from '@/api/lot'
import type { Product } from '@/types/product'
import type { Location, Lot } from '@/types/inventory'
import { useToast } from '@/composables/useToast'

interface Props {
  open: boolean
  products: Product[]
  locations: Location[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  transferred: []
}>()

const toast = useToast()
const saving = ref(false)

const form = ref({
  productId: '',
  fromLocationId: '',
  toLocationId: '',
  quantity: 1,
  lotId: '',
  memo: '',
})

const lots = ref<Lot[]>([])
const sourceInfo = ref<{ quantity: number; reserved: number; available: number } | null>(null)

const physicalLocations = computed(() =>
  props.locations.filter(l => !l.type.startsWith('virtual/')),
)

const canSubmit = computed(() =>
  form.value.productId &&
  form.value.fromLocationId &&
  form.value.toLocationId &&
  form.value.fromLocationId !== form.value.toLocationId &&
  form.value.quantity > 0,
)

const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('ja-JP') : ''

function resetForm() {
  form.value = { productId: '', fromLocationId: '', toLocationId: '', quantity: 1, lotId: '', memo: '' }
  lots.value = []
  sourceInfo.value = null
}

watch(() => props.open, (v) => { if (v) resetForm() })

async function onProductChange() {
  lots.value = []
  sourceInfo.value = null
  form.value.lotId = ''
  if (!form.value.productId) return
  try {
    const res = await fetchLots({ productId: form.value.productId, status: 'active' })
    lots.value = res.items
  } catch { /* silent */ }
}

watch(() => [form.value.productId, form.value.fromLocationId, form.value.lotId], async () => {
  sourceInfo.value = null
  if (!form.value.productId || !form.value.fromLocationId) return
  try {
    const quants = await fetchStock({
      productId: form.value.productId,
      locationId: form.value.fromLocationId,
      showZero: true,
    })
    const match = form.value.lotId
      ? quants.find(q => q.lotId === form.value.lotId)
      : quants.find(q => !q.lotId)
    if (match) {
      sourceInfo.value = {
        quantity: match.quantity,
        reserved: match.reservedQuantity,
        available: match.availableQuantity,
      }
    } else {
      sourceInfo.value = { quantity: 0, reserved: 0, available: 0 }
    }
  } catch { /* silent */ }
})

async function handleSubmit() {
  if (!canSubmit.value) return
  saving.value = true
  try {
    const result = await transferStock({
      productId: form.value.productId,
      fromLocationId: form.value.fromLocationId,
      toLocationId: form.value.toLocationId,
      quantity: form.value.quantity,
      lotId: form.value.lotId || undefined,
      memo: form.value.memo || undefined,
    })
    toast.showSuccess(result.message)
    emit('transferred')
    emit('close')
  } catch (e: any) {
    toast.showError(e.message || '在庫移動に失敗しました')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.dialog-form { display: flex; flex-direction: column; gap: 14px; }
.form-field { display: flex; flex-direction: column; gap: 4px; }
.form-label { font-size: 13px; font-weight: 600; color: var(--o-gray-600, #606266); }
.req { color: #dc3545; font-size: 11px; }
.form-row { display: flex; gap: 12px; align-items: flex-end; }
.arrow-col { display: flex; align-items: center; padding-bottom: 6px; font-size: 18px; color: var(--o-gray-500, #909399); font-weight: 600; }
.o-input { padding: 6px 10px; border: 1px solid var(--o-border-color, #dcdfe6); border-radius: 4px; font-size: 14px; outline: none; width: 100%; }
.o-input:focus { border-color: var(--o-brand-primary, #714b67); }
.source-info { font-size: 13px; color: var(--o-gray-600, #606266); background: var(--o-gray-50, #fafafa); padding: 8px 12px; border-radius: 4px; display: flex; gap: 8px; flex-wrap: wrap; }
.text-danger { color: #f56c6c; }
</style>
