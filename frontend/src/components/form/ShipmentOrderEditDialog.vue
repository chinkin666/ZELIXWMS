<template>
  <ODialog
    :open="dialogVisible"
    size="xl"
    @close="handleClose"
  >
    <template #title>
      {{ title }}
      <span v-if="hasErrors" class="o-status-badge o-status-warning">未入力項目あり</span>
    </template>
    <div class="o-sheet-scroll">
      <div class="o-sheet">
        <!-- Top fields above tabs (2-column like Odoo) -->
        <div class="o-top-fields">
          <div class="o-top-col">
            <template v-for="col in topLeftFields" :key="col.key">
              <div v-if="isFieldVisible(col)" class="o-field-row">
                <label class="o-field-label">
                  {{ col.title }}
                  <span v-if="isFieldRequired(col)" class="required-badge">必須</span>
                </label>
                <div class="o-field-value">
                  <FormField :column="col" :form-data="formData" :is-disabled="isFieldDisabled(col)" @update="handleFieldUpdate" />
                </div>
              </div>
            </template>
          </div>
          <div class="o-top-col">
            <template v-for="col in topRightFields" :key="col.key">
              <div v-if="isFieldVisible(col)" class="o-field-row">
                <label class="o-field-label">
                  {{ col.title }}
                  <span v-if="isFieldRequired(col)" class="required-badge">必須</span>
                </label>
                <div class="o-field-value">
                  <FormField :column="col" :form-data="formData" :is-disabled="isFieldDisabled(col)" @update="handleFieldUpdate" />
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- Notebook tabs -->
        <div class="o-notebook">
          <div class="o-notebook-tabs">
            <button
              v-for="tab in tabDefs"
              :key="tab.key"
              :class="{ active: activeTab === tab.key }"
              @click="activeTab = tab.key"
            >
              {{ tab.title }}
              <span v-if="tabErrorCount(tab.key) > 0" class="o-tab-error">{{ tabErrorCount(tab.key) }}</span>
            </button>
          </div>

          <div class="o-notebook-page">
            <!-- 商品明細 tab -->
            <template v-if="activeTab === 'products'">
              <table class="o-lines-table">
                <thead>
                  <tr>
                    <th>SKU管理番号 <span class="required-badge">必須</span></th>
                    <th>商品名</th>
                    <th style="text-align:right;width:100px;">数量</th>
                    <th style="width:50px;"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, index) in productItems" :key="index">
                    <td>
                      <input
                        class="o-inline-input"
                        :class="{ 'o-inline-input--error': !item.inputSku || !isValidSku(item.inputSku) }"
                        :value="item.inputSku"
                        @input="(e: Event) => onSkuInput(index, (e.target as HTMLInputElement).value)"
                        placeholder="半角英数字30文字以内"
                        maxlength="30"
                      />
                    </td>
                    <td>
                      <input
                        class="o-inline-input"
                        :value="item.productName"
                        @input="(e: Event) => onProductNameInput(index, (e.target as HTMLInputElement).value)"
                        placeholder="全角25文字/半角50文字以内"
                      />
                    </td>
                    <td>
                      <input
                        class="o-inline-input o-no-spin"
                        type="text"
                        inputmode="numeric"
                        :value="item.quantity"
                        @input="(e: Event) => onQuantityInput(index, (e.target as HTMLInputElement).value)"
                        style="text-align:right;"
                      />
                    </td>
                    <td style="text-align:center;">
                      <OButton variant="icon-danger" @click="removeProduct(index)" title="削除">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                      </OButton>
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="4">
                      <button class="o-add-line-btn" @click="addProduct">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2z"/></svg>
                        商品を追加
                      </button>
                    </td>
                  </tr>
                </tfoot>
              </table>

              <!-- 荷扱い (max 2 for Yamato B2) -->
              <div class="o-handling-section">
                <h4 class="o-handling-title">荷扱い区分 <span class="o-handling-hint">（最大2つまで選択）</span></h4>
                <div class="o-handling-options">
                  <label
                    v-for="opt in HANDLING_OPTIONS"
                    :key="opt"
                    class="o-handling-chip"
                    :class="{ 'o-handling-chip--active': handlingTagsValue.includes(opt), 'o-handling-chip--disabled': !handlingTagsValue.includes(opt) && handlingTagsValue.length >= 2 }"
                  >
                    <input
                      type="checkbox"
                      :checked="handlingTagsValue.includes(opt)"
                      :disabled="!handlingTagsValue.includes(opt) && handlingTagsValue.length >= 2"
                      @change="toggleHandlingTag(opt)"
                    />
                    {{ opt }}
                  </label>
                </div>
              </div>
            </template>

            <!-- お届け先 tab -->
            <template v-if="activeTab === 'recipient'">
              <div class="o-form-grid">
                <div v-for="col in recipientFields" :key="col.key" class="o-form-group">
                  <label class="o-form-label">
                    {{ col.title }}
                    <span v-if="isFieldRequired(col)" class="required-badge">必須</span>
                  </label>
                  <div class="o-form-field">
                    <FormField :column="col" :form-data="formData" :is-disabled="isFieldDisabled(col)" @update="handleFieldUpdate" />
                  </div>
                </div>
              </div>
            </template>

            <!-- ご依頼主 tab -->
            <template v-if="activeTab === 'sender'">
              <div class="o-sender-toolbar">
                <OButton variant="secondary" size="sm" @click="openSenderSearch">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                  登録済みご依頼主から選択
                </OButton>
              </div>

              <!-- Search panel -->
              <div v-if="senderSearchOpen" class="o-sender-search-panel">
                <input
                  v-model="senderSearchQuery"
                  class="o-inline-input"
                  placeholder="名前・郵便番号・電話番号で検索..."
                  autofocus
                />
                <div class="o-sender-search-list">
                  <div v-if="senderSearchLoading" class="o-sender-search-empty">読み込み中...</div>
                  <div v-else-if="filteredSenderResults.length === 0" class="o-sender-search-empty">該当なし</div>
                  <div
                    v-for="company in filteredSenderResults"
                    :key="company._id"
                    class="o-sender-search-item"
                    @click="applySenderCompany(company)"
                  >
                    <div class="o-sender-search-name">{{ company.senderName }}</div>
                    <div class="o-sender-search-detail">
                      〒{{ company.senderPostalCode }}
                      {{ company.senderAddressPrefecture }}{{ company.senderAddressCity }}{{ company.senderAddressStreet }}
                      / {{ company.senderPhone }}
                    </div>
                  </div>
                </div>
                <button class="o-btn o-btn-sm o-btn-text" @click="senderSearchOpen = false" style="margin-top:4px;">閉じる</button>
              </div>

              <div class="o-form-grid">
                <div v-for="col in senderFields" :key="col.key" class="o-form-group">
                  <label class="o-form-label">
                    {{ col.title }}
                    <span v-if="isFieldRequired(col)" class="required-badge">必須</span>
                  </label>
                  <div class="o-form-field">
                    <FormField :column="col" :form-data="formData" :is-disabled="isFieldDisabled(col)" @update="handleFieldUpdate" />
                  </div>
                </div>
              </div>
            </template>

            <!-- 注文者 tab -->
            <template v-if="activeTab === 'orderer'">
              <div class="o-form-grid">
                <div v-for="col in ordererFields" :key="col.key" class="o-form-group">
                  <label class="o-form-label">
                    {{ col.title }}
                    <span v-if="isFieldRequired(col)" class="required-badge">必須</span>
                  </label>
                  <div class="o-form-field">
                    <FormField :column="col" :form-data="formData" :is-disabled="isFieldDisabled(col)" @update="handleFieldUpdate" />
                  </div>
                </div>
              </div>
            </template>

            <!-- その他 tab -->
            <template v-if="activeTab === 'other'">
              <div class="o-form-grid">
                <div v-for="col in otherFields" :key="col.key" class="o-form-group">
                  <label class="o-form-label">
                    {{ col.title }}
                    <span v-if="isFieldRequired(col)" class="required-badge">必須</span>
                  </label>
                  <div class="o-form-field">
                    <FormField :column="col" :form-data="formData" :is-disabled="isFieldDisabled(col)" @update="handleFieldUpdate" />
                  </div>
                </div>
              </div>

              <!-- 元データ（取込時の行） -->
              <div v-if="sourceRawRows.length > 0" class="o-raw-data-section">
                <h4 class="o-raw-data-title">元データ（取込時の行）</h4>
                <div v-for="(row, ri) in sourceRawRows" :key="ri" class="o-raw-data-card">
                  <table class="o-raw-data-table">
                    <tbody>
                      <tr v-for="(val, key) in row" :key="String(key)">
                        <th>{{ key }}</th>
                        <td>{{ val ?? '-' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="o-form-footer">
        <OButton type="button" variant="secondary" @click="handleClose">キャンセル</OButton>
        <OButton
          type="button"
          variant="primary"
          @click="handleSubmit"
          :disabled="submitting"
        >
          <span v-if="submitting" class="spinner"></span>
          登録
        </OButton>
      </div>
    </template>
  </ODialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ODialog from '@/components/odoo/ODialog.vue'
import OButton from '@/components/odoo/OButton.vue'
import FormField from './FormField.vue'
import type { TableColumn } from '@/types/table'
import type { OrderSourceCompany } from '@/types/orderSourceCompany'
import { setNestedValue, getNestedValue } from '@/utils/nestedObject'
import { getCoolTypeOptionsForInvoiceType } from '@/utils/orderValidation'
import { lookupPostalCode } from '@/utils/postalCodeLookup'
import { fetchOrderSourceCompanies } from '@/api/orderSourceCompany'

// Top-level field keys (shown above tabs, like Odoo header fields)
const TOP_LEFT_KEYS = ['orderNumber', 'customerManagementNumber', 'carrierId', 'invoiceType', 'coolType']
const TOP_RIGHT_KEYS = ['shipPlanDate', 'deliveryDatePreference', 'deliveryTimeSlot', 'trackingId']
// Other shipping keys (shown in "その他" tab)
const OTHER_KEYS = new Set(['ecCompanyId', 'handlingTags'])

// Tab field keys
const RECIPIENT_KEYS = new Set(['recipient.postalCode', 'recipient.prefecture', 'recipient.city', 'recipient.street', 'recipient.building', 'recipientAddress', 'recipient.name', 'recipient.phone'])
const SENDER_KEYS = new Set(['sender.postalCode', 'sender.prefecture', 'sender.city', 'sender.street', 'sender.building', 'senderAddress', 'sender.name', 'sender.phone', 'carrierData.yamato.hatsuBaseNo1', 'carrierData.yamato.hatsuBaseNo2'])
const ORDERER_KEYS = new Set(['orderer.postalCode', 'orderer.prefecture', 'orderer.city', 'orderer.street', 'orderer.building', 'ordererAddress', 'orderer.name', 'orderer.phone'])

interface Props {
  modelValue: boolean
  title?: string
  columns: TableColumn[]
  initialData?: Record<string, any>
  allowInvalidSubmit?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '出荷指示を編集',
  initialData: () => ({}),
  allowInvalidSubmit: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'submit', data: Record<string, any>): void
}>()

const submitting = ref(false)
const formData = ref<Record<string, any>>({})
const activeTab = ref('products')

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const getKey = (col: TableColumn) => (col.dataKey || col.key) as string

// All editable columns
const formColumns = computed(() => {
  const systemFields = ['_id', 'tenantId', 'status', 'createdAt', 'updatedAt', 'systemIds', 'clientOrderIds', 'itemBarcodes', 'carrierRawRow', 'internalRecord']
  const computedFields = ['itemsCount']
  const actionFields = ['actions', 'selection']
  return props.columns.filter((col) => {
    return !systemFields.includes(col.key) &&
      !computedFields.includes(col.key) &&
      !actionFields.includes(col.key) &&
      col.dataKey !== undefined
  })
})

// Top fields (above tabs) - ordered explicitly
const topLeftFields = computed(() => {
  const cols = formColumns.value
  return TOP_LEFT_KEYS.map(k => cols.find(c => getKey(c) === k)).filter(Boolean) as TableColumn[]
})

const topRightFields = computed(() => {
  const cols = formColumns.value
  return TOP_RIGHT_KEYS.map(k => cols.find(c => getKey(c) === k)).filter(Boolean) as TableColumn[]
})

// Tab fields
const recipientFields = computed(() => formColumns.value.filter(c => RECIPIENT_KEYS.has(getKey(c))))
const senderFields = computed(() => formColumns.value.filter(c => SENDER_KEYS.has(getKey(c))))
const ordererFields = computed(() => formColumns.value.filter(c => ORDERER_KEYS.has(getKey(c))))
const otherFields = computed(() => formColumns.value.filter(c => OTHER_KEYS.has(getKey(c))))

const tabDefs = computed(() => {
  const tabs = [
    { key: 'products', title: '商品明細', fields: [] as TableColumn[] },
    { key: 'recipient', title: 'お届け先情報', fields: recipientFields.value },
    { key: 'sender', title: 'ご依頼主情報', fields: senderFields.value },
    { key: 'orderer', title: '注文者情報', fields: ordererFields.value },
  ]
  if (otherFields.value.length > 0) {
    tabs.push({ key: 'other', title: 'その他の情報', fields: otherFields.value })
  }
  return tabs
})

// Products
const productItems = computed(() => {
  const val = getNestedValue(formData.value, 'products')
  return Array.isArray(val) ? val : []
})

const addProduct = () => {
  const arr = [...productItems.value, { inputSku: '', productName: '', quantity: 1 }]
  setNestedValue(formData.value, 'products', arr)
}

const removeProduct = (index: number) => {
  const arr = [...productItems.value]
  arr.splice(index, 1)
  setNestedValue(formData.value, 'products', arr)
}

// SKU: half-width alphanumeric only, max 30 chars
const isValidSku = (sku: string) => /^[a-zA-Z0-9]*$/.test(sku)
const onSkuInput = (index: number, raw: string) => {
  const filtered = raw.replace(/[^a-zA-Z0-9]/g, '').slice(0, 30)
  const arr = [...productItems.value]
  arr[index] = { ...arr[index], inputSku: filtered }
  setNestedValue(formData.value, 'products', arr)
}

// 商品名: max 25 full-width chars (50 half-width chars)
// Count: full-width = 2, half-width = 1, limit = 50
const truncateByWidth = (s: string, maxWidth: number): string => {
  let w = 0
  let i = 0
  for (const ch of s) {
    const cw = ch.charCodeAt(0) > 0xff ? 2 : 1
    if (w + cw > maxWidth) break
    w += cw
    i += ch.length
  }
  return s.slice(0, i)
}
const onQuantityInput = (index: number, raw: string) => {
  const digits = raw.replace(/\D/g, '')
  const num = digits === '' ? 1 : Math.max(1, parseInt(digits, 10))
  const arr = [...productItems.value]
  arr[index] = { ...arr[index], quantity: num }
  setNestedValue(formData.value, 'products', arr)
}

const onProductNameInput = (index: number, raw: string) => {
  const truncated = truncateByWidth(raw, 50)
  const arr = [...productItems.value]
  arr[index] = { ...arr[index], productName: truncated }
  setNestedValue(formData.value, 'products', arr)
}

// 元データ (read-only)
const sourceRawRows = computed(() => {
  const val = getNestedValue(formData.value, 'sourceRawRows')
  return Array.isArray(val) ? val : []
})

// 荷扱い options (Yamato B2: max 2)
const HANDLING_OPTIONS = ['天地無用', 'われもの', '取扱注意', '下積み厳禁', 'ナマモノ', '精密機器', 'こわれもの']

const handlingTagsValue = computed(() => {
  const val = getNestedValue(formData.value, 'handlingTags')
  return Array.isArray(val) ? val : []
})

const toggleHandlingTag = (tag: string) => {
  const current = [...handlingTagsValue.value]
  const idx = current.indexOf(tag)
  if (idx >= 0) {
    current.splice(idx, 1)
  } else if (current.length < 2) {
    current.push(tag)
  }
  setNestedValue(formData.value, 'handlingTags', current)
}

// ── ご依頼主検索 ──
const senderSearchOpen = ref(false)
const senderSearchQuery = ref('')
const senderSearchResults = ref<OrderSourceCompany[]>([])
const senderSearchLoading = ref(false)

const openSenderSearch = async () => {
  senderSearchOpen.value = true
  senderSearchQuery.value = ''
  senderSearchLoading.value = true
  try {
    senderSearchResults.value = await fetchOrderSourceCompanies()
  } catch {
    senderSearchResults.value = []
  } finally {
    senderSearchLoading.value = false
  }
}

const filteredSenderResults = computed(() => {
  const q = senderSearchQuery.value.trim().toLowerCase()
  if (!q) return senderSearchResults.value
  return senderSearchResults.value.filter(c =>
    c.senderName.toLowerCase().includes(q) ||
    c.senderPostalCode.includes(q) ||
    c.senderPhone.includes(q) ||
    (c.senderAddressPrefecture || '').includes(q) ||
    (c.senderAddressCity || '').includes(q)
  )
})

const applySenderCompany = (company: OrderSourceCompany) => {
  setNestedValue(formData.value, 'sender.postalCode', company.senderPostalCode || '')
  setNestedValue(formData.value, 'sender.prefecture', company.senderAddressPrefecture || '')
  setNestedValue(formData.value, 'sender.city', company.senderAddressCity || '')
  setNestedValue(formData.value, 'sender.street', company.senderAddressStreet || '')
  setNestedValue(formData.value, 'sender.building', (company as any).senderAddressBuilding || '')
  setNestedValue(formData.value, 'sender.name', company.senderName || '')
  setNestedValue(formData.value, 'sender.phone', company.senderPhone || '')
  setNestedValue(formData.value, 'carrierData.yamato.hatsuBaseNo1', company.hatsuBaseNo1 || '')
  setNestedValue(formData.value, 'carrierData.yamato.hatsuBaseNo2', company.hatsuBaseNo2 || '')
  senderSearchOpen.value = false
}

// Visibility rules based on invoiceType
const COOL_TYPE_INVOICE_TYPES = new Set(['0', '2', '5']) // 発払い, コレクト, 着払い
const TIME_SLOT_INVOICE_TYPES = new Set(['0', '2', '5', '6', '8', '9']) // + 発払複数口, 宅急便コンパクト, コンパクトコレクト
const DELIVERY_DATE_INVOICE_TYPES = new Set(['0', '1', '2', '4', '5', '6', '8', '9']) // ネコポス(A),クロネコゆうメール(3),クロネコゆうパケット(7)はお届け日指定不可

const isFieldVisible = (col: TableColumn): boolean => {
  const key = getKey(col)
  // 新規作成時は出荷管理No・送り状番号を非表示
  if (key === 'orderNumber' && !props.initialData?.orderNumber) return false
  if (key === 'trackingId' && !props.initialData?.trackingId) return false
  const invoiceType = String(getNestedValue(formData.value, 'invoiceType') || '')
  if (key === 'coolType') return COOL_TYPE_INVOICE_TYPES.has(invoiceType)
  if (key === 'deliveryTimeSlot') return TIME_SLOT_INVOICE_TYPES.has(invoiceType)
  if (key === 'deliveryDatePreference') return DELIVERY_DATE_INVOICE_TYPES.has(invoiceType)
  return true
}

// Field helpers
const READ_ONLY_FIELDS = new Set(['orderNumber', 'trackingId'])

const isFieldDisabled = (column: TableColumn): boolean => {
  const key = getKey(column)
  if (READ_ONLY_FIELDS.has(key)) return true
  if (typeof column.disabledWhen === 'function') return column.disabledWhen(formData.value)
  return false
}

const isFieldRequired = (column: TableColumn): boolean => {
  if (isFieldDisabled(column)) return false
  if (typeof column.requiredWhen === 'function') return column.requiredWhen(formData.value)
  return column.required === true
}

// 郵便番号 → 住所自動入力のマッピング
const POSTAL_CODE_PREFIX_MAP: Record<string, string> = {
  'recipient.postalCode': 'recipient',
  'sender.postalCode': 'sender',
  'orderer.postalCode': 'orderer',
}

const handleFieldUpdate = (key: string, value: any) => {
  setNestedValue(formData.value, key, value)

  // 郵便番号の自動住所入力
  const addrPrefix = POSTAL_CODE_PREFIX_MAP[key]
  if (addrPrefix) {
    const digits = String(value || '').replace(/\D/g, '')
    if (digits.length === 7) {
      lookupPostalCode(digits).then((result) => {
        if (result) {
          setNestedValue(formData.value, `${addrPrefix}.prefecture`, result.prefecture)
          setNestedValue(formData.value, `${addrPrefix}.city`, result.city)
          // street は既に入力がある場合は上書きしない
          const currentStreet = getNestedValue(formData.value, `${addrPrefix}.street`)
          if (!currentStreet) {
            setNestedValue(formData.value, `${addrPrefix}.street`, result.street)
          }
        }
      })
    }
  }

  // Handle dependent field reset when invoiceType changes
  if (key === 'invoiceType') {
    const inv = String(value || '')
    // Reset coolType when hidden or invalid
    if (!COOL_TYPE_INVOICE_TYPES.has(inv)) {
      setNestedValue(formData.value, 'coolType', '')
    } else {
      const currentCoolType = getNestedValue(formData.value, 'coolType')
      if (currentCoolType && currentCoolType !== '0') {
        const validOptions = getCoolTypeOptionsForInvoiceType(inv)
        const isValid = validOptions.some(opt => opt.value === currentCoolType)
        if (!isValid) setNestedValue(formData.value, 'coolType', '0')
      }
    }
    // Reset deliveryTimeSlot when hidden
    if (!TIME_SLOT_INVOICE_TYPES.has(inv)) {
      setNestedValue(formData.value, 'deliveryTimeSlot', '')
    }
  }
}

// Validation
const hasEmptySku = computed(() => {
  return productItems.value.some((item) => !item.inputSku)
})

const hasErrors = computed(() => {
  if (hasEmptySku.value) return true
  return formColumns.value.some((col) => {
    if (!isFieldRequired(col)) return false
    const val = getNestedValue(formData.value, getKey(col))
    return val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)
  })
})

const tabErrorCount = (tabKey: string): number => {
  const tab = tabDefs.value.find(t => t.key === tabKey)
  if (!tab || tab.key === 'products') return 0
  return tab.fields.filter((col) => {
    if (!isFieldRequired(col)) return false
    const val = getNestedValue(formData.value, getKey(col))
    return val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)
  }).length
}

// Init form data
const initFormData = () => {
  const data: Record<string, any> = {}
  formColumns.value.forEach((column) => {
    const key = getKey(column)
    const initialValue = props.initialData ? getNestedValue(props.initialData, key) : undefined

    if (initialValue !== undefined) {
      setNestedValue(data, key, initialValue)
    } else {
      if (column.fieldType === 'array') {
        if (key === 'products') {
          setNestedValue(data, key, [{ inputSku: '', productName: '', quantity: 1 }])
        } else {
          setNestedValue(data, key, [])
        }
      } else if (column.fieldType === 'number') {
        setNestedValue(data, key, undefined)
      } else if (column.fieldType === 'boolean') {
        setNestedValue(data, key, false)
      } else if (key === 'shipPlanDate') {
        const today = new Date()
        const y = today.getFullYear()
        const m = String(today.getMonth() + 1).padStart(2, '0')
        const d = String(today.getDate()).padStart(2, '0')
        setNestedValue(data, key, `${y}/${m}/${d}`)
      } else if (key === 'deliveryDatePreference') {
        setNestedValue(data, key, '最短日')
      } else {
        setNestedValue(data, key, '')
      }
    }
  })
  formData.value = data
}

watch(
  [() => props.modelValue, () => props.initialData],
  ([isOpen]) => {
    if (isOpen) {
      setTimeout(() => {
        initFormData()
        activeTab.value = 'products'
      }, 0)
    } else {
      formData.value = {}
    }
  },
  { immediate: true, deep: true }
)

const handleClose = () => { dialogVisible.value = false }

// Collect missing required fields for validation
const missingRequiredFields = computed(() => {
  const missing: string[] = []
  formColumns.value.forEach((col) => {
    if (!isFieldRequired(col)) return
    if (!isFieldVisible(col)) return
    const val = getNestedValue(formData.value, getKey(col))
    if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
      missing.push(col.title)
    }
  })
  // Check products
  if (productItems.value.length === 0) {
    missing.push('商品明細')
  } else if (hasEmptySku.value) {
    missing.push('SKU管理番号')
  }
  return missing
})

const handleSubmit = async () => {
  // Validate required fields
  if (missingRequiredFields.value.length > 0) {
    alert(`以下の必須項目が未入力です:\n${missingRequiredFields.value.join('\n')}`)
    return
  }

  try {
    submitting.value = true
    const submitData: Record<string, any> = {}
    formColumns.value.forEach((column) => {
      const key = getKey(column)
      const value = getNestedValue(formData.value, key)
      if (props.allowInvalidSubmit) {
        setNestedValue(submitData, key, value)
      } else if (value !== undefined && value !== null && value !== '') {
        setNestedValue(submitData, key, value)
      }
    })
    emit('submit', submitData)
    handleClose()
  } catch {
    alert('入力内容を確定してください')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.o-sheet-scroll {
  height: 70vh;
  overflow-y: auto;
}

.o-sheet {
  padding: 1.5rem 0;
}

.o-status-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 12px;
  margin-left: 8px;
  vertical-align: middle;
}
.o-status-warning {
  background: #fff3cd;
  color: #856404;
  border: 1px solid #ffc107;
}

/* ── Top fields (2 column above tabs, like Odoo header fields) ── */
.o-top-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 3rem;
  margin-bottom: 1.5rem;
}

.o-top-col {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.o-field-row {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.o-field-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--o-gray-600, #606266);
  width: 140px;
  min-width: 140px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.o-field-value {
  flex: 1;
  min-width: 0;
}

.o-field-value :deep(.o-input),
.o-field-value :deep(select.o-input) {
  width: 100%;
  padding: 0.3rem 0.5rem;
  font-size: 13px;
  border: 1px solid var(--o-border-color, #d6d6d6);
  border-radius: var(--o-border-radius, 4px);
}

.o-field-value :deep(.o-input:focus),
.o-field-value :deep(select.o-input:focus) {
  border-color: var(--o-brand-primary, #714B67);
  outline: none;
  box-shadow: 0 0 0 2px rgba(113, 75, 103, 0.12);
}

/* ── Notebook ── */
.o-notebook { margin-top: 0; }

.o-notebook-tabs {
  display: flex;
  border-bottom: 2px solid var(--o-border-color, #d6d6d6);
  margin-bottom: 0;
}

.o-notebook-tabs button {
  padding: 0.5rem 1rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  font-size: 13px;
  font-weight: 500;
  color: var(--o-gray-600, #606266);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}

.o-notebook-tabs button:hover { color: var(--o-gray-900, #212529); }
.o-notebook-tabs button.active {
  color: var(--o-brand-primary, #714B67);
  border-bottom-color: var(--o-brand-primary, #714B67);
}

.o-tab-error {
  display: inline-block;
  background: #dc3545;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 10px;
  line-height: 1.3;
}

.o-notebook-page { padding: 1rem 0; min-height: 220px; }

/* ── Tab form grid (2 column for address tabs) ── */
.o-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.625rem 2rem;
}

.o-form-group {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.o-form-label {
  font-size: 13px;
  color: var(--o-gray-600, #606266);
  text-align: left;
  width: 140px;
  min-width: 140px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
}

.o-form-field {
  flex: 1;
  min-width: 0;
}

.o-form-field :deep(.o-input),
.o-form-field :deep(select.o-input) {
  width: 100%;
  padding: 0.3rem 0.5rem;
  font-size: 13px;
  border: 1px solid var(--o-border-color, #d6d6d6);
  border-radius: var(--o-border-radius, 4px);
}

.o-form-field :deep(.o-input:focus),
.o-form-field :deep(select.o-input:focus) {
  border-color: var(--o-brand-primary, #714B67);
  outline: none;
  box-shadow: 0 0 0 2px rgba(113, 75, 103, 0.12);
}

.required-badge {
  display: inline-block;
  background: #dc3545;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  padding: 2px 5px;
  border-radius: 3px;
  white-space: nowrap;
}

/* ── Products table (like Odoo order lines) ── */
.o-lines-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 0.5rem;
}

.o-lines-table th {
  padding: 0.5rem 0.625rem;
  font-size: 12px;
  font-weight: 600;
  color: var(--o-gray-600, #606266);
  border-bottom: 2px solid var(--o-border-color, #d6d6d6);
  text-align: left;
}

.o-lines-table td {
  padding: 0.375rem 0.5rem;
  border-bottom: 1px solid var(--o-gray-200, #e5e5e5);
}

.o-lines-table tbody tr:hover {
  background: var(--o-gray-50, #f8f9fa);
}

.o-inline-input {
  width: 100%;
  padding: 0.25rem 0.375rem;
  border: 1px solid var(--o-border-color, #d6d6d6);
  border-radius: var(--o-border-radius, 4px);
  font-size: 13px;
  color: var(--o-gray-900, #212529);
  background: var(--o-view-background, #fff);
  outline: none;
}

.o-inline-input:focus {
  border-color: var(--o-brand-primary, #714B67);
  box-shadow: 0 0 0 2px rgba(113, 75, 103, 0.12);
}
.o-inline-input--error {
  border-color: #dc3545;
}
.o-inline-input--error:focus {
  box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.15);
}

.o-btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--o-gray-500, #6c757d);
  padding: 4px;
  border-radius: 4px;
}
.o-btn-icon--danger:hover { color: #dc3545; }

.o-add-line-btn {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.625rem;
  background: none;
  border: 1px dashed #999;
  border-radius: var(--o-border-radius, 4px);
  color: var(--o-brand-primary, #714B67);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.o-add-line-btn:hover {
  border-color: var(--o-brand-primary, #714B67);
  background: rgba(113, 75, 103, 0.04);
}

/* ── Footer ── */
.o-form-footer {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid #fff;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin-right: 6px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── 元データ section ── */
.o-raw-data-section {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--o-gray-200, #e5e5e5);
}

.o-raw-data-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--o-gray-700, #495057);
  margin: 0 0 0.75rem;
}

.o-raw-data-card {
  margin-bottom: 0.75rem;
  border: 1px solid var(--o-gray-200, #e5e5e5);
  border-radius: var(--o-border-radius, 4px);
  overflow: hidden;
}

.o-raw-data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.o-raw-data-table th {
  text-align: left;
  padding: 4px 8px;
  background: var(--o-gray-50, #f8f9fa);
  color: var(--o-gray-600, #606266);
  font-weight: 500;
  width: 180px;
  border-bottom: 1px solid var(--o-gray-200, #e5e5e5);
  white-space: nowrap;
}

.o-raw-data-table td {
  padding: 4px 8px;
  color: var(--o-gray-900, #212529);
  border-bottom: 1px solid var(--o-gray-200, #e5e5e5);
  word-break: break-all;
}

.o-raw-data-table tr:last-child th,
.o-raw-data-table tr:last-child td {
  border-bottom: none;
}

/* ── 荷扱い section ── */
.o-handling-section {
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid var(--o-gray-200, #e5e5e5);
}

.o-handling-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--o-gray-700, #495057);
  margin: 0 0 0.5rem;
}

.o-handling-hint {
  font-weight: 400;
  font-size: 11px;
  color: var(--o-gray-500, #adb5bd);
}

.o-handling-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.o-handling-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid var(--o-border-color, #d6d6d6);
  border-radius: 16px;
  font-size: 12px;
  color: var(--o-gray-700, #495057);
  cursor: pointer;
  user-select: none;
  transition: all 0.15s;
}

.o-handling-chip input[type="checkbox"] {
  display: none;
}

.o-handling-chip--active {
  background: var(--o-brand-primary, #714B67);
  color: #fff;
  border-color: var(--o-brand-primary, #714B67);
}

.o-handling-chip--disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.o-handling-chip:not(.o-handling-chip--active):not(.o-handling-chip--disabled):hover {
  border-color: var(--o-brand-primary, #714B67);
  color: var(--o-brand-primary, #714B67);
}

/* ── Sender search ── */
.o-sender-toolbar {
  margin-bottom: 0.75rem;
}

.o-btn-sm {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  font-size: 12px;
  border-radius: var(--o-border-radius, 4px);
}

.o-btn-text {
  background: none;
  border: none;
  color: var(--o-gray-600, #606266);
  cursor: pointer;
  font-size: 12px;
}
.o-btn-text:hover {
  color: var(--o-brand-primary, #714B67);
}

.o-sender-search-panel {
  background: var(--o-gray-50, #f8f9fa);
  border: 1px solid var(--o-border-color, #d6d6d6);
  border-radius: var(--o-border-radius, 4px);
  padding: 8px;
  margin-bottom: 0.75rem;
}

.o-sender-search-list {
  max-height: 200px;
  overflow-y: auto;
  margin-top: 6px;
}

.o-sender-search-empty {
  padding: 12px;
  text-align: center;
  color: var(--o-gray-500, #adb5bd);
  font-size: 12px;
}

.o-sender-search-item {
  padding: 6px 8px;
  border-radius: 3px;
  cursor: pointer;
  transition: background 0.1s;
}

.o-sender-search-item:hover {
  background: rgba(113, 75, 103, 0.08);
}

.o-sender-search-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--o-gray-900, #212529);
}

.o-sender-search-detail {
  font-size: 11px;
  color: var(--o-gray-500, #6c757d);
  margin-top: 1px;
}

@media (max-width: 768px) {
  .o-top-fields { grid-template-columns: 1fr; }
  .o-form-grid { grid-template-columns: 1fr; }
}
</style>
