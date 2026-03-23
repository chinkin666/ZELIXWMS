<template>
  <Dialog :open="open" @update:open="(val: boolean) => { if (!val) emit('close') }">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>在庫移動</DialogTitle>
      </DialogHeader>
    <div class="dialog-form">
      <div class="form-field">
        <Label>商品 <span class="text-destructive text-xs">*</span></Label>
        <Select :model-value="form.productId || '__all__'" @update:model-value="(val: string) => { form.productId = val === '__all__' ? '' : val; onProductChange() }">
          <SelectTrigger class="h-9"><SelectValue placeholder="商品を選択..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">商品を選択...</SelectItem>
            <SelectItem v-for="p in products" :key="p._id" :value="p._id">
              {{ p.sku }} - {{ p.name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="form-row">
        <div class="form-field" style="flex:1;">
          <Label>移動元 <span class="text-destructive text-xs">*</span></Label>
          <Select :model-value="form.fromLocationId || '__all__'" @update:model-value="(val: string) => form.fromLocationId = val === '__all__' ? '' : val">
            <SelectTrigger class="h-9"><SelectValue placeholder="移動元を選択..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">移動元を選択...</SelectItem>
              <SelectItem v-for="loc in physicalLocations" :key="loc._id" :value="loc._id">
                {{ loc.code }} ({{ loc.name }})
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="arrow-col">→</div>
        <div class="form-field" style="flex:1;">
          <Label>移動先 <span class="text-destructive text-xs">*</span></Label>
          <Select :model-value="form.toLocationId || '__all__'" @update:model-value="(val: string) => form.toLocationId = val === '__all__' ? '' : val">
            <SelectTrigger class="h-9"><SelectValue placeholder="移動先を選択..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">移動先を選択...</SelectItem>
              <SelectItem v-for="loc in physicalLocations" :key="loc._id" :value="loc._id">
                {{ loc.code }} ({{ loc.name }})
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-field" style="flex:1;">
          <Label>数量 <span class="text-destructive text-xs">*</span></Label>
          <Input v-model.number="form.quantity" type="number" min="1" />
        </div>
        <div class="form-field" style="flex:1;">
          <Label>ロット</Label>
          <Select :model-value="form.lotId || '__all__'" @update:model-value="(val: string) => form.lotId = val === '__all__' ? '' : val">
            <SelectTrigger class="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">指定なし</SelectItem>
              <SelectItem v-for="lot in lots" :key="lot._id" :value="lot._id">
                {{ lot.lotNumber }}{{ lot.expiryDate ? ' (' + formatDate(lot.expiryDate) + ')' : '' }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div class="form-field">
        <Label>メモ</Label>
        <Input v-model="form.memo" type="text" placeholder="移動理由..." />
      </div>

      <div v-if="sourceInfo" class="source-info">
        <span>移動元在庫: <strong>{{ sourceInfo.quantity }}</strong></span>
        <span>（引当済: {{ sourceInfo.reserved }}, 有効: <strong :class="{ 'text-danger': sourceInfo.available < form.quantity }">{{ sourceInfo.available }}</strong>）</span>
      </div>
    </div>

    <DialogFooter>
      <Button variant="secondary" @click="emit('close')">キャンセル</Button>
      <Button variant="default" :disabled="!canSubmit || saving" @click="handleSubmit">
        {{ saving ? '移動中...' : '在庫を移動' }}
      </Button>
    </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { ref, computed, watch } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
.source-info { font-size: 13px; color: var(--o-gray-600, #606266); background: var(--o-gray-50, #fafafa); padding: 8px 12px; border-radius: 4px; display: flex; gap: 8px; flex-wrap: wrap; }
.text-danger { color: #f56c6c; }
</style>
