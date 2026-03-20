<template>
  <div class="inbound-order-create">
    <ControlPanel :title="t('wms.inbound.createOrder', '入庫指示作成')" :show-search="false">
      <template #actions>
        <OButton variant="secondary" size="sm" @click="$router.push('/inbound/orders')">{{ t('wms.common.back', '戻る') }}</OButton>
      </template>
    </ControlPanel>

    <div class="o-card">
      <div class="form-grid">
        <div class="form-field">
          <label class="form-label">{{ t('wms.inbound.destinationLocation', '入庫先ロケーション') }} <span class="required-badge">必須</span></label>
          <select v-model="form.destinationLocationId" class="o-input">
            <option value="">{{ t('wms.common.pleaseSelect', '選択してください...') }}</option>
            <option v-for="loc in physicalLocations" :key="loc._id" :value="loc._id">
              {{ loc.code }} ({{ loc.name }})
            </option>
          </select>
        </div>

        <div class="form-field">
          <label class="form-label">{{ t('wms.inbound.expectedDate', '入庫予定日') }}</label>
          <input v-model="form.expectedDate" type="date" class="o-input" />
        </div>

        <div class="form-field">
          <label class="form-label">{{ t('wms.inbound.supplierName', '仕入先') }}</label>
          <select v-model="form.supplierId" class="o-input" @change="onSupplierChange">
            <option value="">{{ t('wms.common.pleaseSelect', '選択してください...') }}</option>
            <option v-for="s in suppliers" :key="s._id" :value="s._id">
              {{ s.supplierCode ? `[${s.supplierCode}] ` : '' }}{{ s.name }}
            </option>
            <option value="__manual__">{{ t('wms.inbound.manualInput', '手動入力...') }}</option>
          </select>
          <input
            v-if="form.supplierId === '__manual__'"
            v-model="form.supplierName"
            type="text"
            class="o-input"
            style="margin-top:4px;"
            :placeholder="t('wms.inbound.supplierNamePlaceholder', '仕入先名を入力...')"
          />
        </div>

        <div class="form-field">
          <label class="form-label">{{ t('wms.product.memo', 'メモ') }}</label>
          <input v-model="form.memo" type="text" class="o-input" :placeholder="t('wms.inbound.memoPlaceholder', '入庫メモ...')" />
        </div>

        <div class="form-field">
          <label class="form-label">{{ t('wms.inbound.flowType', '入庫タイプ') }}</label>
          <select v-model="form.flowType" class="o-input">
            <option value="standard">{{ t('wms.inbound.flowTypeStandard', '在庫型（通常）') }}</option>
            <option value="crossdock">{{ t('wms.inbound.flowTypeCrossdock', '通過型（クロスドック）') }}</option>
          </select>
          <p v-if="form.flowType === 'crossdock'" class="crossdock-hint">
            {{ t('wms.inbound.crossdockHint', '通過型: 検品後に棚入れをスキップし、直接出荷ステージングに移動します') }}
          </p>
        </div>

        <div class="form-field">
          <label class="form-label">{{ t('wms.inbound.requestedDate', '入庫希望日') }}</label>
          <input v-model="form.requestedDate" type="date" class="o-input" />
        </div>

        <div class="form-field">
          <label class="form-label">{{ t('wms.inbound.purchaseOrderNumber', '発注番号') }}</label>
          <input v-model="form.purchaseOrderNumber" type="text" class="o-input" :placeholder="t('wms.inbound.poPlaceholder', '顧客側管理番号...')" />
        </div>
      </div>

      <!-- LOGIFAST 詳細情報（折りたたみ）/ 详细信息（折叠） -->
      <details class="logifast-details">
        <summary class="details-summary">{{ t('wms.inbound.advancedInfo', '物流・納品元詳細') }}</summary>
        <div class="form-grid" style="margin-top:8px;">
          <div class="form-field">
            <label class="form-label">{{ t('wms.inbound.supplierPhone', '納品元電話番号') }}</label>
            <input v-model="form.supplierPhone" type="text" class="o-input" placeholder="03-1234-5678" />
          </div>
          <div class="form-field">
            <label class="form-label">{{ t('wms.inbound.supplierPostalCode', '納品元郵便番号') }}</label>
            <input v-model="form.supplierPostalCode" type="text" class="o-input" placeholder="123-4567" />
          </div>
          <div class="form-field">
            <label class="form-label">{{ t('wms.inbound.supplierAddress', '納品元住所') }}</label>
            <input v-model="form.supplierAddress" type="text" class="o-input" />
          </div>
          <div class="form-field">
            <label class="form-label">{{ t('wms.inbound.containerType', 'コンテナ') }}</label>
            <select v-model="form.containerType" class="o-input">
              <option value="">{{ t('wms.common.none', 'なし') }}</option>
              <option value="20ft">20ft</option>
              <option value="40ft">40ft</option>
              <option value="40ftH">40ft HC</option>
            </select>
          </div>
          <div class="form-field">
            <label class="form-label">{{ t('wms.inbound.cubicMeters', '立方数 (M³)') }}</label>
            <input v-model.number="form.cubicMeters" type="number" step="0.1" min="0" class="o-input" />
          </div>
          <div class="form-field">
            <label class="form-label">{{ t('wms.inbound.palletCount', 'パレット数') }}</label>
            <input v-model.number="form.palletCount" type="number" min="0" class="o-input" />
          </div>
          <div class="form-field">
            <label class="form-label">{{ t('wms.inbound.innerBoxCount', 'インナー箱数') }}</label>
            <input v-model.number="form.innerBoxCount" type="number" min="0" class="o-input" />
          </div>
        </div>
      </details>
    </div>

    <!-- 入庫明細 -->
    <div class="section-header">
      <h3 class="section-title">{{ t('wms.inbound.orderDetails', '入庫明細') }}</h3>
      <OButton variant="secondary" size="sm" @click="addLine">{{ t('wms.inbound.addLine', '行を追加') }}</OButton>
    </div>

    <div class="o-table-wrapper">
      <table class="o-table">
        <thead>
          <tr>
            <th class="o-table-th" style="width:40px;">#</th>
            <th class="o-table-th" style="width:250px;">{{ t('wms.inbound.product', '商品') }} <span class="required-badge">必須</span></th>
            <th class="o-table-th o-table-th--right" style="width:120px;">{{ t('wms.inbound.expectedQuantity', '予定数量') }} <span class="required-badge">必須</span></th>
            <th class="o-table-th" style="width:100px;">{{ t('wms.inbound.stockCategory', '在庫区分') }}</th>
            <th class="o-table-th" style="width:130px;">{{ t('wms.inbound.orderReferenceNumber', '注文番号') }}</th>
            <th class="o-table-th" style="width:130px;">{{ t('wms.inbound.lotNumber', 'ロット番号') }}</th>
            <th class="o-table-th" style="width:120px;">{{ t('wms.inbound.expiryDate', '賞味期限') }}</th>
            <th class="o-table-th" style="width:150px;">{{ t('wms.product.memo', 'メモ') }}</th>
            <th class="o-table-th" style="width:60px;"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="form.lines.length === 0">
            <td colspan="9" class="o-table-empty">{{ t('wms.inbound.pleaseAddLine', '行を追加してください') }}</td>
          </tr>
          <tr v-for="(line, i) in form.lines" :key="i" class="o-table-row">
            <td class="o-table-td" style="text-align:center;">{{ i + 1 }}</td>
            <td class="o-table-td">
              <input
                type="text"
                class="o-input o-input-sm"
                :placeholder="t('wms.inbound.searchProduct', 'SKU / 商品名で検索...')"
                :value="getProductLabel(line.productId)"
                :list="'product-datalist-' + i"
                @input="(e) => handleProductSearch(e, line)"
                @change="(e) => handleProductSelect(e, line)"
              />
              <datalist :id="'product-datalist-' + i">
                <option v-for="p in products" :key="p._id" :value="p.sku + ' - ' + p.name" />
              </datalist>
            </td>
            <td class="o-table-td">
              <input v-model.number="line.expectedQuantity" type="number" min="1" class="o-input o-input-sm" style="text-align:right;" />
            </td>
            <td class="o-table-td">
              <select v-model="line.stockCategory" class="o-input o-input-sm">
                <option value="new">{{ t('wms.inbound.stockNew', '新品') }}</option>
                <option value="damaged">{{ t('wms.inbound.stockDamaged', '仕損') }}</option>
              </select>
            </td>
            <td class="o-table-td">
              <input v-model="line.orderReferenceNumber" type="text" class="o-input o-input-sm" :placeholder="t('wms.inbound.orderReferenceNumberPlaceholder', '注文番号...')" />
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
          <!-- 合計行 / 合计行 -->
          <tr v-if="form.lines.length > 0" class="o-table-row total-row">
            <td class="o-table-td" colspan="2" style="text-align:right;font-weight:600;">
              {{ t('wms.common.total', '合計') }}: {{ form.lines.length }} {{ t('wms.inbound.lines', '行') }}
            </td>
            <td class="o-table-td" style="text-align:right;font-weight:600;">
              {{ form.lines.reduce((s, l) => s + (l.expectedQuantity || 0), 0) }}
            </td>
            <td class="o-table-td" colspan="6"></td>
          </tr>
        </tbody>
      </table>
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
      <OButton
        variant="primary"
        :disabled="!canSubmit || isSubmitting"
        @click="handleSubmit"
      >
        {{ isSubmitting ? t('wms.inbound.creating', '作成中...') : t('wms.inbound.createOrderButton', '入庫指示を作成') }}
      </OButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import { createInboundOrder } from '@/api/inboundOrder'
import { fetchLocations } from '@/api/location'
import { fetchProducts } from '@/api/product'
import { fetchSuppliers, type SupplierData } from '@/api/supplier'
import type { Product } from '@/types/product'
import type { Location } from '@/types/inventory'

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
  form.value.lines.splice(i, 1)
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
