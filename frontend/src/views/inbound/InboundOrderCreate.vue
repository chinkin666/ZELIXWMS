<template>
  <div class="inbound-order-create">
    <PageHeader :title="t('wms.inbound.createOrder', '入庫指示作成')" :show-search="false">
      <template #actions>
        <Button variant="secondary" size="sm" @click="$router.push('/inbound/orders')">{{ t('wms.common.back', '戻る') }}</Button>
      </template>
    </PageHeader>

    <div class="rounded-lg border bg-card p-4">
      <div class="form-grid">
        <div class="form-field">
          <label>{{ t('wms.inbound.destinationLocation', '入庫先ロケーション') }} <span class="text-destructive text-xs">*</span></label>
          <Select :model-value="form.destinationLocationId || '__none__'" @update:model-value="(v: string) => { form.destinationLocationId = v === '__none__' ? '' : v }">
            <SelectTrigger><SelectValue :placeholder="t('wms.common.pleaseSelect', '選択してください...')" /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="loc in physicalLocations" :key="loc._id" :value="loc._id">
                {{ loc.code }} ({{ loc.name }})
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="form-field">
          <label>{{ t('wms.inbound.expectedDate', '入庫予定日') }}</label>
          <Input v-model="form.expectedDate" type="date" />
        </div>

        <div class="form-field">
          <label>{{ t('wms.inbound.supplierName', '仕入先') }}</label>
          <Select :model-value="form.supplierId || '__none__'" @update:model-value="(v: string) => { form.supplierId = v === '__none__' ? '' : v; onSupplierChange() }">
            <SelectTrigger><SelectValue :placeholder="t('wms.common.pleaseSelect', '選択してください...')" /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="s in suppliers" :key="s._id" :value="s._id">
                {{ s.supplierCode ? `[${s.supplierCode}] ` : '' }}{{ s.name }}
              </SelectItem>
              <SelectItem value="__manual__">{{ t('wms.inbound.manualInput', '手動入力...') }}</SelectItem>
            </SelectContent>
          </Select>
          <Input
            v-if="form.supplierId === '__manual__'"
            v-model="form.supplierName"
            type="text"
            style="margin-top:4px;"
            :placeholder="t('wms.inbound.supplierNamePlaceholder', '仕入先名を入力...')"
          />
        </div>

        <div class="form-field">
          <label>{{ t('wms.product.memo', 'メモ') }}</label>
          <Input v-model="form.memo" type="text" :placeholder="t('wms.inbound.memoPlaceholder', '入庫メモ...')" />
        </div>

        <div class="form-field">
          <label>{{ t('wms.inbound.flowType', '入庫タイプ') }}</label>
          <Select v-model="form.flowType">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">{{ t('wms.inbound.flowTypeStandard', '在庫型（通常）') }}</SelectItem>
              <SelectItem value="crossdock">{{ t('wms.inbound.flowTypeCrossdock', '通過型（クロスドック）') }}</SelectItem>
            </SelectContent>
          </Select>
          <p v-if="form.flowType === 'crossdock'" class="crossdock-hint">
            {{ t('wms.inbound.crossdockHint', '通過型: 検品後に棚入れをスキップし、直接出荷ステージングに移動します') }}
          </p>
        </div>

        <div class="form-field">
          <label>{{ t('wms.inbound.requestedDate', '入庫希望日') }}</label>
          <Input v-model="form.requestedDate" type="date" />
        </div>

        <div class="form-field">
          <label>{{ t('wms.inbound.purchaseOrderNumber', '発注番号') }}</label>
          <Input v-model="form.purchaseOrderNumber" type="text" :placeholder="t('wms.inbound.poPlaceholder', '顧客側管理番号...')" />
        </div>
      </div>

      <!-- LOGIFAST 詳細情報（折りたたみ）/ 详细信息（折叠） -->
      <details class="logifast-details">
        <summary class="details-summary">{{ t('wms.inbound.advancedInfo', '物流・納品元詳細') }}</summary>
        <div class="form-grid" style="margin-top:8px;">
          <div class="form-field">
            <label>{{ t('wms.inbound.supplierPhone', '納品元電話番号') }}</label>
            <Input v-model="form.supplierPhone" type="text" placeholder="03-1234-5678" />
          </div>
          <div class="form-field">
            <label>{{ t('wms.inbound.supplierPostalCode', '納品元郵便番号') }}</label>
            <Input v-model="form.supplierPostalCode" type="text" placeholder="123-4567" />
          </div>
          <div class="form-field">
            <label>{{ t('wms.inbound.supplierAddress', '納品元住所') }}</label>
            <Input v-model="form.supplierAddress" type="text" />
          </div>
          <div class="form-field">
            <label>{{ t('wms.inbound.containerType', 'コンテナ') }}</label>
            <Select :model-value="form.containerType || '__none__'" @update:model-value="(v: string) => { form.containerType = v === '__none__' ? '' : v }">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{{ t('wms.common.none', 'なし') }}</SelectItem>
                <SelectItem value="20ft">20ft</SelectItem>
                <SelectItem value="40ft">40ft</SelectItem>
                <SelectItem value="40ftH">40ft HC</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="form-field">
            <label>{{ t('wms.inbound.cubicMeters', '立方数 (M³)') }}</label>
            <Input v-model.number="form.cubicMeters" type="number" step="0.1" min="0" />
          </div>
          <div class="form-field">
            <label>{{ t('wms.inbound.palletCount', 'パレット数') }}</label>
            <Input v-model.number="form.palletCount" type="number" min="0" />
          </div>
          <div class="form-field">
            <label>{{ t('wms.inbound.innerBoxCount', 'インナー箱数') }}</label>
            <Input v-model.number="form.innerBoxCount" type="number" min="0" />
          </div>
        </div>
      </details>
    </div>

    <!-- 入庫明細 -->
    <div class="section-header">
      <h3 class="section-title">{{ t('wms.inbound.orderDetails', '入庫明細') }}</h3>
      <Button variant="secondary" size="sm" @click="addLine">{{ t('wms.inbound.addLine', '行を追加') }}</Button>
    </div>

    <div class="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead style="width:40px;">#</TableHead>
            <TableHead style="width:250px;">{{ t('wms.inbound.product', '商品') }} <span class="text-destructive text-xs">*</span></TableHead>
            <TableHead class="text-right" style="width:120px;">{{ t('wms.inbound.expectedQuantity', '予定数量') }} <span class="text-destructive text-xs">*</span></TableHead>
            <TableHead style="width:100px;">{{ t('wms.inbound.stockCategory', '在庫区分') }}</TableHead>
            <TableHead style="width:130px;">{{ t('wms.inbound.orderReferenceNumber', '注文番号') }}</TableHead>
            <TableHead style="width:130px;">{{ t('wms.inbound.lotNumber', 'ロット番号') }}</TableHead>
            <TableHead style="width:120px;">{{ t('wms.inbound.expiryDate', '賞味期限') }}</TableHead>
            <TableHead style="width:150px;">{{ t('wms.product.memo', 'メモ') }}</TableHead>
            <TableHead style="width:60px;"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="form.lines.length === 0">
            <TableCell colspan="9" class="text-center py-8 text-muted-foreground">{{ t('wms.inbound.pleaseAddLine', '行を追加してください') }}</TableCell>
          </TableRow>
          <TableRow v-for="(line, i) in form.lines" :key="i">
            <TableCell style="text-align:center;">{{ i + 1 }}</TableCell>
            <TableCell>
              <Input
                type="text"
                class="h-8 text-sm"
                :placeholder="t('wms.inbound.searchProduct', 'SKU / 商品名で検索...')"
                :value="getProductLabel(line.productId)"
                :list="'product-datalist-' + i"
                @input="(e) => handleProductSearch(e, line)"
                @change="(e) => handleProductSelect(e, line)"
              />
              <datalist :id="'product-datalist-' + i">
                <option v-for="p in products" :key="p._id" :value="p.sku + ' - ' + p.name" />
              </datalist>
            </TableCell>
            <TableCell>
              <Input v-model.number="line.expectedQuantity" type="number" min="1" class="h-8 text-sm" style="text-align:right;" />
            </TableCell>
            <TableCell>
              <Select v-model="line.stockCategory">
                <SelectTrigger class="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">{{ t('wms.inbound.stockNew', '新品') }}</SelectItem>
                  <SelectItem value="damaged">{{ t('wms.inbound.stockDamaged', '仕損') }}</SelectItem>
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell>
              <Input v-model="line.orderReferenceNumber" type="text" class="h-8 text-sm" :placeholder="t('wms.inbound.orderReferenceNumberPlaceholder', '注文番号...')" />
            </TableCell>
            <TableCell>
              <Input v-model="line.lotNumber" type="text" class="h-8 text-sm" placeholder="LOT-..." />
            </TableCell>
            <TableCell>
              <Input v-model="line.expiryDate" type="date" class="h-8 text-sm" />
            </TableCell>
            <TableCell>
              <Input v-model="line.memo" type="text" class="h-8 text-sm" />
            </TableCell>
            <TableCell style="text-align:center;">
              <Button variant="ghost" class="btn-remove" @click="removeLine(i)">&times;</Button>
            </TableCell>
          </TableRow>
          <!-- 合計行 / 合计行 -->
          <TableRow v-if="form.lines.length > 0" class="total-row">
            <TableCell colspan="2" style="text-align:right;font-weight:600;">
              {{ t('wms.common.total', '合計') }}: {{ form.lines.length }} {{ t('wms.inbound.lines', '行') }}
            </TableCell>
            <TableCell style="text-align:right;font-weight:600;">
              {{ form.lines.reduce((s, l) => s + (l.expectedQuantity || 0), 0) }}
            </TableCell>
            <TableCell colspan="6"></TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <div class="form-actions">
      <!-- バリデーションヒント / 验证提示 -->
      <div v-if="!canSubmit && form.lines.length > 0" class="validation-hints">
        <p v-if="!form.destinationLocationId" class="hint-text">⚠️ {{ t('wms.inbound.selectLocation', '入庫先ロケーションを選択してください') }}</p>
        <p v-for="(line, i) in form.lines.filter(l => !l.productId)" :key="'v-' + i" class="hint-text">
          ⚠️ {{ t('wms.inbound.selectProduct', '行{n}: 商品を選択してください').replace('{n}', String(form.lines.indexOf(line) + 1)) }}
        </p>
        <p v-for="(line, i) in form.lines.filter(l => l.productId && l.expectedQuantity < 1)" :key="'q-' + i" class="hint-text">
          ⚠️ {{ t('wms.inbound.quantityRequired', '行{n}: 数量を1以上入力してください').replace('{n}', String(form.lines.indexOf(line) + 1)) }}
        </p>
      </div>
      <Button
        variant="default"
        :disabled="!canSubmit || isSubmitting"
        @click="handleSubmit"
      >
        {{ isSubmitting ? t('wms.inbound.creating', '作成中...') : t('wms.inbound.createOrderButton', '入庫指示を作成') }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import PageHeader from '@/components/shared/PageHeader.vue'
import { createInboundOrder } from '@/api/inboundOrder'
import { fetchLocations } from '@/api/location'
import { fetchProducts } from '@/api/product'
import { fetchSuppliers, type SupplierData } from '@/api/supplier'
import type { Product } from '@/types/product'
import type { Location } from '@/types/inventory'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const router = useRouter()
const toast = useToast()
const { t } = useI18n()
const isSubmitting = ref(false)
const products = ref<Product[]>([])
const locations = ref<Location[]>([])
const suppliers = ref<SupplierData[]>([])

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
  requestedDate: '',
  supplierId: '',
  supplierName: '',
  supplierPhone: '',
  supplierPostalCode: '',
  supplierAddress: '',
  memo: '',
  flowType: 'standard' as 'standard' | 'crossdock',
  purchaseOrderNumber: '',
  containerType: '',
  cubicMeters: undefined as number | undefined,
  palletCount: undefined as number | undefined,
  innerBoxCount: undefined as number | undefined,
  lines: [] as FormLine[],
})

// 仕入先選択変更時 / 仕入先选择变更时
const onSupplierChange = () => {
  if (form.value.supplierId && form.value.supplierId !== '__manual__') {
    const s = suppliers.value.find(s => s._id === form.value.supplierId)
    form.value.supplierName = s?.name || ''
  } else if (form.value.supplierId !== '__manual__') {
    form.value.supplierName = ''
  }
}

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
  form.value.lines = form.value.lines.filter((_, idx) => idx !== i)
}

// 商品検索・選択ヘルパー / 商品搜索选择辅助函数
const getProductLabel = (productId: string): string => {
  if (!productId) return ''
  const p = products.value.find(p => p._id === productId)
  return p ? `${p.sku} - ${p.name}` : ''
}

const handleProductSearch = (_e: Event, _line: any) => {
  // datalist が自動的にフィルタリングするため、追加処理不要
  // datalist 会自动过滤，无需额外处理
}

const handleProductSelect = (e: Event, line: any) => {
  const input = (e.target as HTMLInputElement).value
  // "SKU - Name" 形式から SKU を抽出し、商品を特定
  // 从 "SKU - Name" 格式中提取 SKU 并匹配商品
  const matched = products.value.find(p => input.startsWith(p.sku + ' - ') || input === p.sku)
  if (matched) {
    line.productId = matched._id
    line.productSku = matched.sku
    line.productName = matched.name
  } else {
    line.productId = ''
    line.productSku = ''
    line.productName = ''
  }
}

const handleSubmit = async () => {
  if (!canSubmit.value) return
  isSubmitting.value = true
  try {
    const selectedSupplier = form.value.supplierId && form.value.supplierId !== '__manual__'
      ? suppliers.value.find(s => s._id === form.value.supplierId)
      : null
    const supplierData = selectedSupplier
      ? {
          name: selectedSupplier.name,
          code: selectedSupplier.supplierCode,
          phone: form.value.supplierPhone || (selectedSupplier as any).phone || undefined,
          postalCode: form.value.supplierPostalCode || (selectedSupplier as any).postalCode || undefined,
          address: form.value.supplierAddress || (selectedSupplier as any).address || undefined,
        }
      : (form.value.supplierName ? {
          name: form.value.supplierName,
          phone: form.value.supplierPhone || undefined,
          postalCode: form.value.supplierPostalCode || undefined,
          address: form.value.supplierAddress || undefined,
        } : undefined)

    const payload = {
      destinationLocationId: form.value.destinationLocationId,
      supplier: supplierData,
      expectedDate: form.value.expectedDate || undefined,
      requestedDate: form.value.requestedDate || undefined,
      memo: form.value.memo || undefined,
      flowType: form.value.flowType,
      purchaseOrderNumber: form.value.purchaseOrderNumber || undefined,
      containerType: form.value.containerType || undefined,
      cubicMeters: form.value.cubicMeters || undefined,
      palletCount: form.value.palletCount || undefined,
      innerBoxCount: form.value.innerBoxCount || undefined,
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
    toast.showSuccess(t('wms.inbound.createSuccess', '入庫指示を作成しました'))
    router.push('/inbound/orders')
  } catch (e: any) {
    toast.showError(e?.message || t('wms.inbound.createError', '作成に失敗しました'))
  } finally {
    isSubmitting.value = false
  }
}

onMounted(async () => {
  try {
    const [prods, locs, supplierRes] = await Promise.all([
      fetchProducts(),
      fetchLocations({ isActive: true }),
      fetchSuppliers({ isActive: 'true', limit: 500 }),
    ])
    products.value = prods
    locations.value = locs
    suppliers.value = supplierRes.data || []
  } catch (e: any) {
    toast.showError(t('wms.inbound.masterDataError', 'マスタデータの取得に失敗しました'))
  }
  // デフォルトで1行追加 / 默认加一行
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
  gap: 16px;
  padding: 0 20px 20px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
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

.required { color: var(--o-danger); }

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

.{
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

.crossdock-hint {
  margin: 4px 0 0;
  padding: 6px 10px;
  font-size: 12px;
  color: #e67e22;
  background: #fef9e7;
  border: 1px solid #f9e79f;
  border-radius: 4px;
  line-height: 1.4;
}

.btn-remove {
  background: none;
  border: none;
  color: var(--o-danger);
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

.validation-hints {
  margin-bottom: 8px;
}
.hint-text {
  color: #e6a23c;
  font-size: 13px;
  margin: 2px 0;
}

.logifast-details {
  margin-top: 12px;
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: var(--o-border-radius, 4px);
  padding: 0 12px;
}
.logifast-details[open] {
  padding-bottom: 12px;
}
.details-summary {
  padding: 10px 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--o-primary, #017e84);
  cursor: pointer;
  user-select: none;
}
.details-summary:hover {
  color: var(--o-primary-dark, #015f63);
}
</style>
