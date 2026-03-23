<template>
  <Dialog :open="dialogVisible" @update:open="(val: boolean) => { if (!val) handleClose() }">
    <DialogContent class="sm:max-w-4xl">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
      </DialogHeader>
    <form ref="formRef" @submit.prevent="handleSubmit">
      <div class="form-scroll" style="max-height: 500px; overflow-y: auto">
        <div class="form-content">
          <!-- 根据 columns 动态生成表单字段 -->
          <template v-for="column in formColumns" :key="column.key">
            <!-- 嵌套对象字段分组 -->
            <hr
              v-if="isGroupHeader(column)"
              style="border:none;border-top:1px solid var(--o-border-color);margin:1rem 0"
            />

            <!-- 表单字段 -->
            <div
              v-if="!isGroupHeader(column)"
              class="o-form-group"
            >
              <label class="o-form-label">
                {{ column.title }}
                <span v-if="isFieldRequired(column)" class="required-badge">必須</span>
              </label>

              <!-- 字符串输入 -->
              <input
                v-if="column.fieldType === 'string' && !column.searchOptions"
                class="o-input"
                :value="getNestedValueInTemplate(formData, getNestedKey(column))"
                @input="(e: Event) => setNestedValueInTemplate(formData, getNestedKey(column), (e.target as HTMLInputElement).value)"
                :placeholder="`${column.title}を入力してください`"
              />

              <!-- 数字输入 -->
              <input
                v-else-if="column.fieldType === 'number'"
                class="o-input"
                type="number"
                :value="getNestedValueInTemplate(formData, getNestedKey(column))"
                @input="(e: Event) => { const v = (e.target as HTMLInputElement).value; setNestedValueInTemplate(formData, getNestedKey(column), v === '' ? undefined : Number(v)) }"
                :min="column.min"
                :max="column.max"
                :step="column.precision ? Math.pow(10, -column.precision) : 1"
                :disabled="isFieldDisabled(column)"
                style="width: 100%"
                :placeholder="isFieldDisabled(column) ? '-' : `${column.title}を入力してください`"
              />

              <!-- 日期（日時） -->
              <input
                v-else-if="column.fieldType === 'date'"
                class="o-input"
                type="datetime-local"
                :value="toDatetimeLocalValue(getNestedValueInTemplate(formData, getNestedKey(column)))"
                @input="(e: Event) => setNestedValueInTemplate(formData, getNestedKey(column), fromDatetimeLocalValue((e.target as HTMLInputElement).value))"
                style="width: 100%"
              />

              <!-- 日期（年月日） -->
              <input
                v-else-if="column.fieldType === 'dateOnly'"
                class="o-input"
                type="date"
                :value="toDateInputValue(getNestedValueInTemplate(formData, getNestedKey(column)))"
                @input="(e: Event) => setNestedValueInTemplate(formData, getNestedKey(column), fromDateInputValue((e.target as HTMLInputElement).value))"
                style="width: 100%"
              />

              <!-- 多選タグ（荷扱いなど） -->
              <select
                v-else-if="column.fieldType === 'array' && column.multiple && column.searchOptions"
                class="o-input"
                multiple
                :value="getNestedValueInTemplate(formData, getNestedKey(column))"
                @change="(e: Event) => { const sel = e.target as HTMLSelectElement; const vals = Array.from(sel.selectedOptions).map(o => o.value); setNestedValueInTemplate(formData, getNestedKey(column), vals) }"
                style="width: 100%"
              >
                <option
                  v-for="option in column.searchOptions"
                  :key="String(option.value)"
                  :value="option.value"
                >{{ option.label }}</option>
              </select>

              <!-- 多选下拉框（ECモール等） -->
              <select
                v-else-if="(column as any).formFieldType === 'multiSelect' && column.searchOptions && column.searchOptions.length > 0"
                class="o-input"
                multiple
                :value="getNestedValueInTemplate(formData, getNestedKey(column))"
                @change="(e: Event) => { const sel = e.target as HTMLSelectElement; const vals = Array.from(sel.selectedOptions).map(o => o.value); setNestedValueInTemplate(formData, getNestedKey(column), vals) }"
                style="width: 100%"
              >
                <option
                  v-for="option in column.searchOptions"
                  :key="String(option.value)"
                  :value="option.value"
                >{{ option.label }}</option>
              </select>

              <!-- 单选下拉框 -->
              <select
                v-else-if="column.searchOptions && column.searchOptions.length > 0"
                class="o-input"
                :key="`${getNestedKey(column)}-${column.dependsOn ? getNestedValueInTemplate(formData, column.dependsOn) : ''}`"
                :value="getNestedValueInTemplate(formData, getNestedKey(column))"
                @change="(e: Event) => handleSelectChange(column, (e.target as HTMLSelectElement).value)"
                style="width: 100%"
              >
                <option value="">{{ `${column.title}を選択してください` }}</option>
                <option
                  v-for="option in getFilteredOptions(column)"
                  :key="String(option.value)"
                  :value="option.value"
                >{{ option.label }}</option>
              </select>

              <!-- 布尔值 -->
              <select
                v-else-if="column.fieldType === 'boolean'"
                class="o-input"
                :value="String(getNestedValueInTemplate(formData, getNestedKey(column)))"
                @change="(e: Event) => { const v = (e.target as HTMLSelectElement).value; setNestedValueInTemplate(formData, getNestedKey(column), v === 'true') }"
                style="width: 100%"
              >
                <option value="">{{ `${column.title}を選択してください` }}</option>
                <option value="true">はい</option>
                <option value="false">いいえ</option>
              </select>

              <!-- 数组类型（字符串数组，如荷扱い handlingTags） -->
              <div v-else-if="column.fieldType === 'array' && (column.dataKey || column.key) === 'handlingTags'" class="array-field">
                <div
                  v-for="(item, index) in getArrayValue(column)"
                  :key="index"
                  class="array-item"
                >
                  <input
                    class="o-input"
                    :value="item"
                    @input="(e: Event) => updateStringArrayItem(column, index, (e.target as HTMLInputElement).value)"
                    :placeholder="`${column.title}を入力または選択してください`"
                    :list="`handling-tags-${index}`"
                    style="flex: 1; margin-right: 10px"
                  />
                  <datalist :id="`handling-tags-${index}`">
                    <option v-for="opt in HANDLING_TAG_OPTIONS" :key="opt" :value="opt" />
                  </datalist>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    @click="removeArrayItem(column, index)"
                    title="削除"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  @click="addArrayItem(column)"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  行を追加
                </Button>
              </div>

              <!-- 数组类型（字符串数组，如バーコード、荷扱い） -->
              <div v-else-if="column.fieldType === 'array' && ['barcode', 'handlingTypes'].includes(column.dataKey || column.key)" class="array-field">
                <div
                  v-for="(item, index) in getArrayValue(column)"
                  :key="index"
                  class="array-item"
                >
                  <input
                    class="o-input"
                    :value="item"
                    @input="(e: Event) => updateStringArrayItem(column, index, (e.target as HTMLInputElement).value)"
                    :placeholder="`${column.title}を入力してください`"
                    style="flex: 1; margin-right: 10px"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    @click="removeArrayItem(column, index)"
                    title="削除"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  @click="addArrayItem(column)"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  行を追加
                </Button>
              </div>

              <!-- 数组类型（商品列表） -->
              <div v-else-if="column.fieldType === 'array'" class="array-field">
                <div
                  v-for="(item, index) in getArrayValue(column)"
                  :key="index"
                  class="array-item"
                >
                  <input
                    class="o-input"
                    v-model="item.inputSku"
                    placeholder="SKU管理番号 *"
                    style="width: 30%; margin-right: 10px"
                  />
                  <input
                    class="o-input"
                    v-model="item.productName"
                    placeholder="商品名（任意）"
                    style="width: 30%; margin-right: 10px"
                  />
                  <input
                    class="o-input"
                    type="number"
                    v-model.number="item.quantity"
                    :min="1"
                    placeholder="数量 *"
                    style="width: 20%; margin-right: 10px"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    @click="removeArrayItem(column, index)"
                    title="削除"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  @click="addArrayItem(column)"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  商品を追加
                </Button>
              </div>

              <!-- デフォルトテキスト入力 / 默认文本输入 -->
              <input
                v-else
                class="o-input"
                :value="getNestedValueInTemplate(formData, getNestedKey(column))"
                @input="(e: Event) => setNestedValueInTemplate(formData, getNestedKey(column), (e.target as HTMLInputElement).value)"
                :placeholder="`${column.title}を入力してください`"
              />
            </div>
          </template>
        </div>

        <!-- Slot for additional content -->
        <slot name="extra"></slot>
      </div>
    </form>

    <DialogFooter>
      <div class="dialog-footer">
        <Button type="button" variant="secondary" @click="handleClose">キャンセル</Button>
        <Button
          type="button"
          variant="default"
          @click="handleSubmit"
          :disabled="submitting"
        >
          <span v-if="submitting" class="spinner"></span>
          確定
        </Button>
      </div>
    </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { TableColumn, SearchOption } from '@/types/table'
import { setNestedValue, getNestedValue } from '@/utils/nestedObject'
import { getCoolTypeOptionsForInvoiceType } from '@/utils/orderValidation'
import { useEnabledInvoiceTypes } from '@/composables/useEnabledInvoiceTypes'

// 荷扱いのデフォルトオプション
const HANDLING_TAG_OPTIONS = [
  '精密機器',
  'ワレ物注意',
  '下積厳禁',
  '天地無用',
  'ナマモノ',
  '水濡厳禁',
]

// 为了在模板中使用，需要将函数暴露出来
const setNestedValueInTemplate = (obj: Record<string, any>, path: string, value: any) => {
  setNestedValue(obj, path, value)
}

const getNestedValueInTemplate = (obj: Record<string, any>, path: string) => {
  return getNestedValue(obj, path)
}

// Date helper: convert ISO/custom format to datetime-local input value
const toDatetimeLocalValue = (val: any): string => {
  if (!val) return ''
  if (typeof val === 'string') {
    // "2024-01-15T10:30:00.000" -> "2024-01-15T10:30"
    const m = val.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/)
    if (m?.[1]) return m[1]
  }
  return ''
}

const fromDatetimeLocalValue = (val: string): string => {
  if (!val) return ''
  // "2024-01-15T10:30" -> "2024-01-15T10:30:00.000"
  return `${val}:00.000`
}

const toDateInputValue = (val: any): string => {
  if (!val) return ''
  if (typeof val === 'string') {
    // "2024/01/15" -> "2024-01-15"
    return val.replace(/\//g, '-').substring(0, 10)
  }
  return ''
}

const fromDateInputValue = (val: string): string => {
  if (!val) return ''
  // "2024-01-15" -> "2024/01/15"
  return val.replace(/-/g, '/')
}

interface Props {
  modelValue: boolean
  title?: string
  width?: string | number
  columns: TableColumn[]
  initialData?: Record<string, any>
  /** true の場合、バリデーションエラーがあっても保存（emit）できる */
  allowInvalidSubmit?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: 'フォーム',
  width: '800px',
  initialData: () => ({}),
  allowInvalidSubmit: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'submit', data: Record<string, any>): void
}>()

const formRef = ref<HTMLFormElement>()
const submitting = ref(false)
const formData = ref<Record<string, any>>({})

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

// 过滤出需要显示在表单中的列（排除系统字段和计算字段）
const formColumns = computed(() => {
  return props.columns.filter((col) => {
    // 排除系统字段
    const systemFields = ['_id', 'tenantId', 'status', 'createdAt', 'updatedAt', 'systemIds', 'clientOrderIds', 'itemBarcodes']
    // 排除计算字段（如 itemsCount）
    const computedFields = ['itemsCount']
    // 排除操作列
    const actionFields = ['actions', 'selection']

    return !systemFields.includes(col.key) &&
           !computedFields.includes(col.key) &&
           !actionFields.includes(col.key) &&
           col.dataKey !== undefined // 必须有 dataKey 才能映射到表单字段
  })
})

// 获取嵌套键的路径
const getNestedKey = (column: TableColumn): string => {
  return column.dataKey || column.key
}

// 判断是否为分组标题
const isGroupHeader = (_column: TableColumn): boolean => {
  // 可以根据需要自定义分组逻辑
  return false
}

// Check if field is disabled based on disabledWhen callback
const isFieldDisabled = (column: TableColumn): boolean => {
  if (typeof column.disabledWhen === 'function') {
    return column.disabledWhen(formData.value)
  }
  return false
}

// Check if field is required based on requiredWhen callback or required prop
const isFieldRequired = (column: TableColumn): boolean => {
  // If field is disabled, it's not required
  if (isFieldDisabled(column)) {
    return false
  }
  // Check requiredWhen callback first
  if (typeof column.requiredWhen === 'function') {
    return column.requiredWhen(formData.value)
  }
  // Fall back to static required prop
  return column.required === true
}

// 佐川急便の送り状種類オプション / 佐川急便の送り状種類オプション
const sagawaInvoiceTypeOptions = [
  { label: '元払い', value: '0' },
  { label: '着払い', value: '1' },
  { label: 'e-コレクト（代引き）', value: '2' },
]

const { filterEnabledOptions } = useEnabledInvoiceTypes()

// Get filtered options based on dependsOn field
const getFilteredOptions = (column: TableColumn) => {
  const dataKey = column.dataKey || column.key
  // クール区分の場合、invoiceType に依存してオプションをフィルタリング
  if (dataKey === 'coolType' && column.dependsOn === 'invoiceType') {
    const invoiceType = getNestedValue(formData.value, 'invoiceType') || '0'
    return getCoolTypeOptionsForInvoiceType(String(invoiceType))
  }
  // carrierId に依存するフィールドをフィルタリング / carrierId 依赖字段过滤
  if (column.dependsOn === 'carrierId') {
    const carrierId = String(getNestedValue(formData.value, 'carrierId') || '')
    const isSagawa = carrierId === '__builtin_sagawa__' || carrierId.includes('sagawa')
    if (isSagawa) {
      if (dataKey === 'invoiceType') return sagawaInvoiceTypeOptions
      if (dataKey === 'deliveryTimeSlot') return [
        { label: '指定なし', value: '' },
        { label: '午前中', value: '午前中' },
        { label: '12:00-14:00', value: '12-14' },
        { label: '14:00-16:00', value: '14-16' },
        { label: '16:00-18:00', value: '16-18' },
        { label: '18:00-20:00', value: '18-20' },
        { label: '18:00-21:00', value: '18-21' },
        { label: '19:00-21:00', value: '19-21' },
        { label: '20:00-21:00', value: '20-21' },
      ]
    }
  }
  const options = column.searchOptions || []
  // ヤマト B2: 無効化された送り状種類をフィルタリング / ヤマト B2: 无效的送り状種類を过滤
  if (dataKey === 'invoiceType') {
    const carrierId = String(getNestedValue(formData.value, 'carrierId') || '')
    const isSagawa = carrierId === '__builtin_sagawa__' || carrierId.includes('sagawa')
    if (!isSagawa) return filterEnabledOptions(options as { value: string; label?: string }[]) as SearchOption[]
  }
  return options
}

// Handle select change with dependent field reset
const handleSelectChange = (column: TableColumn, val: string | number | boolean | null) => {
  const dataKey = column.dataKey || column.key
  setNestedValue(formData.value, dataKey, val)

  // carrierId が変更された場合、invoiceType をリセット（佐川は0-2のみ）
  // carrierId 变更时，重置 invoiceType
  if (dataKey === 'carrierId') {
    const currentInvoiceType = getNestedValue(formData.value, 'invoiceType')
    const cid = String(val || '')
    if (cid === '__builtin_sagawa__' || cid.includes('sagawa')) {
      // 佐川は 0/1/2 のみ有効
      if (currentInvoiceType && !['0', '1', '2'].includes(String(currentInvoiceType))) {
        setNestedValue(formData.value, 'invoiceType', '0')
      }
    }
  }

  // invoiceType が変更された場合、coolType の値を検証してリセット
  if (dataKey === 'invoiceType') {
    const currentCoolType = getNestedValue(formData.value, 'coolType')
    if (currentCoolType && currentCoolType !== '0') {
      const validOptions = getCoolTypeOptionsForInvoiceType(String(val))
      const isValid = validOptions.some(opt => opt.value === currentCoolType)
      if (!isValid) {
        // 現在のクール区分が有効でない場合、「通常」にリセット
        setNestedValue(formData.value, 'coolType', '0')
      }
    }
  }
}

// 获取数组值
const getArrayValue = (column: TableColumn): any[] => {
  const key = getNestedKey(column)
  const value = getNestedValue(formData.value, key)
  if (!Array.isArray(value)) {
    setNestedValue(formData.value, key, [])
    return []
  }
  return value
}

// 添加数组项
const addArrayItem = (column: TableColumn) => {
  const key = getNestedKey(column)
  const array = getArrayValue(column)
  // 根据字段类型添加不同的默认值
  if (['handlingTags', 'barcode', 'handlingTypes'].includes(key)) {
    array.push('')
  } else {
    // 默认是商品结构（新スキーマ：inputSku, productName, quantity）
    array.push({ inputSku: '', productName: '', quantity: 1 })
  }
  setNestedValue(formData.value, key, array)
}

// 删除数组项
const removeArrayItem = (column: TableColumn, index: number) => {
  const key = getNestedKey(column)
  const array = getArrayValue(column)
  array.splice(index, 1)
  setNestedValue(formData.value, key, array)
}

// 更新字符串数组项
const updateStringArrayItem = (column: TableColumn, index: number, value: string) => {
  const key = getNestedKey(column)
  const array = getArrayValue(column)
  array[index] = value
  setNestedValue(formData.value, key, array)
}

// Simple validation (replaces el-form validation)
const validateForm = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = []

  const digitsOnly = /^\d+$/
  const postalCode7 = /^\d{7}$/
  const baseNo3 = /^\d{3}$/

  formColumns.value.forEach((column) => {
    const key = getNestedKey(column)
    const value = getNestedValue(formData.value, key)

    // Required check
    if (isFieldRequired(column)) {
      const isEmpty = value === undefined || value === null || value === '' ||
        (Array.isArray(value) && value.length === 0)
      if (isEmpty) {
        errors.push(`${column.title}は必須です`)
      }
    }

    // Skip further validation if disabled
    if (isFieldDisabled(column)) return

    // Number validation
    if (column.fieldType === 'number' && value !== undefined && value !== null && value !== '') {
      const num = Number(value)
      if (Number.isNaN(num)) {
        errors.push(`${column.title}は数値で入力してください`)
      } else {
        if (column.min !== undefined && num < column.min) {
          errors.push(`${column.title}は${column.min}以上で入力してください`)
        }
        if (column.max !== undefined && num > column.max) {
          errors.push(`${column.title}は${column.max}以下で入力してください`)
        }
      }
    }

    // Postal code validation
    const keyLower = key.toLowerCase()
    if (keyLower.includes('postalcode') && value && !postalCode7.test(String(value))) {
      errors.push('郵便番号は7桁の数字で入力してください')
    }
    if (keyLower.includes('phone') && value && !digitsOnly.test(String(value))) {
      errors.push('電話番号は数字のみで入力してください')
    }
    if (keyLower.includes('hatsubaseno') && value) {
      const v = typeof value === 'string' ? value.trim() : value
      if (v && !baseNo3.test(String(v))) {
        errors.push('発ベースNoは3桁の数字で入力してください')
      }
    }
  })

  return { valid: errors.length === 0, errors }
}

// 初始化表单数据
const initFormData = () => {
  const data: Record<string, any> = {}
  formColumns.value.forEach((column) => {
    const key = getNestedKey(column)
    const initialValue = props.initialData ? getNestedValue(props.initialData, key) : undefined

    // 如果 initialData 中有值（包括 0, false, '' 等），使用它；否则设置默认值
    if (initialValue !== undefined) {
      // 多选字段：将字符串转换为数组
      if ((column as any).formFieldType === 'multiSelect') {
        const arr = Array.isArray(initialValue) ? initialValue : (initialValue ? [initialValue] : [])
        setNestedValue(data, key, arr)
      } else if (column.fieldType === 'date' || column.fieldType === 'dateOnly') {
        // 有初始值，直接使用；日期字段做格式归一化
        const normalized = normalizeDateValue(initialValue, column.fieldType)
        setNestedValue(data, key, normalized)
      } else {
        setNestedValue(data, key, initialValue)
      }
    } else {
      // 没有初始值，设置默认值
      if (column.fieldType === 'array') {
        if (column.multiple && column.searchOptions) {
          setNestedValue(data, key, [])
        } else if (['handlingTags', 'barcode', 'handlingTypes'].includes(key)) {
          // 对于荷扱いやバーコード（字符串数组），初始化为空数组
          setNestedValue(data, key, [])
        } else {
          // 对于商品列表，至少需要一个空项（新スキーマ）
          setNestedValue(data, key, [{ inputSku: '', productName: '', quantity: 1 }])
        }
      } else if (column.fieldType === 'number') {
        setNestedValue(data, key, undefined)
      } else if (column.fieldType === 'boolean') {
        setNestedValue(data, key, false)
      } else if (column.fieldType === 'date' || column.fieldType === 'dateOnly') {
        setNestedValue(data, key, '')
      } else {
        setNestedValue(data, key, '')
      }
    }
  })
  formData.value = data
}

// 监听弹窗打开和 initialData 变化，初始化表单
watch(
  [() => props.modelValue, () => props.initialData],
  async ([isOpen]) => {
    if (isOpen) {
      // 延迟确保 DOM 更新完成
      setTimeout(async () => {
        initFormData()
      }, 0)
    } else {
      formData.value = {}
    }
  },
  { immediate: true, deep: true }
)

// 处理关闭
const handleClose = () => {
  dialogVisible.value = false
}

// 送信処理 / 处理提交
const handleSubmit = async () => {
  const { valid, errors } = validateForm()

  if (!props.allowInvalidSubmit && !valid) {
    alert(errors.join('\n'))
    return
  }

  try {
    submitting.value = true

    // 送信データ構築 / 构建提交数据（保持嵌套结构）
    const submitData: Record<string, any> = {}
    formColumns.value.forEach((column) => {
      const key = getNestedKey(column)
      let value = getNestedValue(formData.value, key)
      if ((column.fieldType === 'date' || column.fieldType === 'dateOnly') && value) {
        value = normalizeDateValue(value, column.fieldType)
      }

      // 对于多选字段（如 ECモール），只保存第一个选中的值
      if ((column as any).formFieldType === 'multiSelect' && Array.isArray(value) && value.length > 0) {
        // 多选时只保存第一个值（因为 ecCompanyId 是字符串，不是数组）
        setNestedValue(submitData, key, value[0])
      } else if (column.fieldType === 'array') {
        if (column.multiple && column.searchOptions) {
          // allowInvalidSubmit: そのまま保存（空配列も許可）
          const arr = Array.isArray(value) ? value : []
          setNestedValue(submitData, key, arr)
        } else {
          // 商品など：allowInvalidSubmit の場合は未入力を含めてそのまま保存
          const arr = Array.isArray(value) ? value : []
          setNestedValue(submitData, key, arr)
        }
      } else {
        // allowInvalidSubmit の場合は空文字も含めて保存する
        if (props.allowInvalidSubmit) {
          setNestedValue(submitData, key, value)
        } else if (value !== undefined && value !== null && value !== '') {
          setNestedValue(submitData, key, value)
        }
      }
    })

    emit('submit', submitData)
    handleClose()
  } catch (_error) {
    alert('入力内容を確定してください')
  } finally {
    submitting.value = false
  }
}

// 日期归一化：
// - date: ISO datetime（toISOString）
// - dateOnly: YYYY-MM-DD
const normalizeDateValue = (val: any, mode: 'date' | 'dateOnly'): string => {
  if (!val) return ''

  if (mode === 'dateOnly') {
    if (typeof val === 'string') {
      if (/^\d{4}\/\d{2}\/\d{2}$/.test(val)) return val
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val.replace(/-/g, '/')
      const m = val.match(/^(\d{4}[-\/]\d{2}[-\/]\d{2})/)
      if (m?.[1]) return m[1].replace(/-/g, '/')
    }
    const d = val instanceof Date ? val : new Date(val)
    if (!isNaN(d.getTime())) {
      // 使用本地时间，不进行时区转换
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}/${month}/${day}`
    }
    return ''
  }

  // mode === 'date'
  if (val instanceof Date) {
    // 使用本地时间，不进行时区转换
    const year = val.getFullYear()
    const month = String(val.getMonth() + 1).padStart(2, '0')
    const day = String(val.getDate()).padStart(2, '0')
    const hours = String(val.getHours()).padStart(2, '0')
    const minutes = String(val.getMinutes()).padStart(2, '0')
    const seconds = String(val.getSeconds()).padStart(2, '0')
    const milliseconds = String(val.getMilliseconds()).padStart(3, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`
  }
  if (typeof val === 'string') {
    // 如果已经是带毫秒的格式，直接返回
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}$/.test(val)) {
      return val
    }
    // 如果是不带毫秒的格式，添加毫秒
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(val)) {
      return `${val}.000`
    }
    const d = new Date(val)
    if (!isNaN(d.getTime())) {
      // 使用本地时间，不进行时区转换
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const hours = String(d.getHours()).padStart(2, '0')
      const minutes = String(d.getMinutes()).padStart(2, '0')
      const seconds = String(d.getSeconds()).padStart(2, '0')
      const milliseconds = String(d.getMilliseconds()).padStart(3, '0')
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`
    }
  }
  return ''
}
</script>

<style scoped>
.form-content {
  padding: 20px;
}

.o-form-group {
  margin-bottom: 1rem;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.o-form-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--o-font-size-small, 13px);
  font-weight: 500;
  color: var(--o-gray-700, #495057);
  min-width: 140px;
  padding-top: 6px;
  flex-shrink: 0;
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

.o-form-group .o-input,
.o-form-group select.o-input {
  flex: 1;
}

.array-field {
  width: 100%;
  flex: 1;
}

.array-item {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
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
  vertical-align: middle;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
