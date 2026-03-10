<template>
  <el-dialog
    v-model="dialogVisible"
    :title="title"
    :width="width"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="140px"
      label-position="left"
    >
      <el-scrollbar height="500px">
        <div class="form-content">
          <!-- 根据 columns 动态生成表单字段 -->
          <template v-for="column in formColumns" :key="column.key">
            <!-- 嵌套对象字段分组 -->
            <el-divider v-if="isGroupHeader(column)" :content-position="'left'">
              {{ getGroupTitle(column) }}
            </el-divider>

            <!-- 表单字段 -->
            <el-form-item
              v-if="!isGroupHeader(column)"
              :label="getFormLabel(column)"
              :prop="column.dataKey || column.key"
              :required="isFieldRequired(column)"
            >
              <!-- 字符串输入 -->
              <el-input
                v-if="column.fieldType === 'string' && !column.searchOptions"
                :model-value="getNestedValueInTemplate(formData, getNestedKey(column))"
                @update:model-value="(val: string | number | boolean | null) => setNestedValueInTemplate(formData, getNestedKey(column), val)"
                :placeholder="`${column.title}を入力してください`"
              />

              <!-- 数字输入 -->
              <el-input-number
                v-else-if="column.fieldType === 'number'"
                :model-value="getNestedValueInTemplate(formData, getNestedKey(column))"
                @update:model-value="(val: string | number | boolean | null) => setNestedValueInTemplate(formData, getNestedKey(column), val)"
                :min="column.min"
                :max="column.max"
                :precision="column.precision || 0"
                :disabled="isFieldDisabled(column)"
                style="width: 100%"
                :placeholder="isFieldDisabled(column) ? '-' : `${column.title}を入力してください`"
              />

              <!-- 日期（日時） -->
              <el-date-picker
                v-else-if="column.fieldType === 'date'"
                :model-value="getNestedValueInTemplate(formData, getNestedKey(column))"
                @update:model-value="(val: string | number | boolean | null) => setNestedValueInTemplate(formData, getNestedKey(column), val)"
                type="datetime"
                :format="column.dateFormat || 'YYYY-MM-DD HH:mm:ss'"
                value-format="YYYY-MM-DDTHH:mm:ss.SSS"
                style="width: 100%"
                :placeholder="`${column.title}を選択してください`"
              />

              <!-- 日期（年月日） -->
              <el-date-picker
                v-else-if="column.fieldType === 'dateOnly'"
                :model-value="getNestedValueInTemplate(formData, getNestedKey(column))"
                @update:model-value="(val: string | number | boolean | null) => setNestedValueInTemplate(formData, getNestedKey(column), val)"
                type="date"
                :format="column.dateFormat || 'YYYY/MM/DD'"
                value-format="YYYY/MM/DD"
                style="width: 100%"
                :placeholder="`${column.title}を選択してください`"
              />

              <!-- 多選タグ（荷扱いなど） -->
              <el-select
                v-else-if="column.fieldType === 'array' && column.multiple && column.searchOptions"
                :model-value="getNestedValueInTemplate(formData, getNestedKey(column))"
                @update:model-value="(val: string | number | boolean | null) => setNestedValueInTemplate(formData, getNestedKey(column), val)"
                multiple
                collapse-tags
                style="width: 100%"
                :placeholder="`${column.title}を選択してください`"
              >
                <el-option
                  v-for="option in column.searchOptions"
                  :key="String(option.value)"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>

              <!-- 多选下拉框（ECモール等） -->
              <el-select
                v-else-if="(column as any).formFieldType === 'multiSelect' && column.searchOptions && column.searchOptions.length > 0"
                :model-value="getNestedValueInTemplate(formData, getNestedKey(column))"
                @update:model-value="(val: string | number | boolean | null) => setNestedValueInTemplate(formData, getNestedKey(column), val)"
                multiple
                collapse-tags
                collapse-tags-tooltip
                style="width: 100%"
                :placeholder="`${column.title}を選択してください`"
              >
                <el-option
                  v-for="option in column.searchOptions"
                  :key="String(option.value)"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>

              <!-- 单选下拉框 -->
              <el-select
                v-else-if="column.searchOptions && column.searchOptions.length > 0"
                :model-value="getNestedValueInTemplate(formData, getNestedKey(column))"
                @update:model-value="(val: string | number | boolean | null) => handleSelectChange(column, val)"
                style="width: 100%"
                :placeholder="`${column.title}を選択してください`"
              >
                <el-option
                  v-for="option in getFilteredOptions(column)"
                  :key="String(option.value)"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>

              <!-- 布尔值 -->
              <el-select
                v-else-if="column.fieldType === 'boolean'"
                :model-value="getNestedValueInTemplate(formData, getNestedKey(column))"
                @update:model-value="(val: string | number | boolean | null) => setNestedValueInTemplate(formData, getNestedKey(column), val)"
                style="width: 100%"
                :placeholder="`${column.title}を選択してください`"
              >
                <el-option label="はい" :value="true" />
                <el-option label="いいえ" :value="false" />
              </el-select>

              <!-- 数组类型（字符串数组，如荷扱い） -->
              <div v-else-if="column.fieldType === 'array' && (column.dataKey || column.key) === 'handlingTags'" class="array-field">
                <div
                  v-for="(item, index) in getArrayValue(column)"
                  :key="index"
                  class="array-item"
                >
                  <el-form-item
                    :prop="`${column.dataKey || column.key}.${index}`"
                    style="width: calc(100% - 50px); margin-right: 10px; margin-bottom: 0"
                  >
                    <el-autocomplete
                      :model-value="item"
                      @update:model-value="(val: string | { value: string }) => updateStringArrayItem(column, index, typeof val === 'string' ? val : val?.value || '')"
                      @select="(item: { value: string }) => updateStringArrayItem(column, index, item.value)"
                      :fetch-suggestions="(queryString: string, cb: (results: any[]) => void) => handleHandlingTagSuggestions(queryString, cb)"
                      :placeholder="`${column.title}を入力または選択してください`"
                      style="width: 100%"
                      clearable
                    />
                  </el-form-item>
                  <el-button
                    type="danger"
                    :icon="Delete"
                    circle
                    @click="removeArrayItem(column, index)"
                  />
                </div>
                <el-button
                  type="primary"
                  :icon="Plus"
                  plain
                  @click="addArrayItem(column)"
                >
                  行を追加
                </el-button>
              </div>

              <!-- 数组类型（字符串数组，如バーコード、荷扱い） -->
              <div v-else-if="column.fieldType === 'array' && ['barcode', 'handlingTypes'].includes(column.dataKey || column.key)" class="array-field">
                <div
                  v-for="(item, index) in getArrayValue(column)"
                  :key="index"
                  class="array-item"
                >
                  <el-form-item
                    :prop="`${column.dataKey || column.key}.${index}`"
                    style="width: calc(100% - 50px); margin-right: 10px; margin-bottom: 0"
                  >
                    <el-input
                      :model-value="item"
                      @update:model-value="(val: string) => updateStringArrayItem(column, index, val)"
                      :placeholder="`${column.title}を入力してください`"
                      style="width: 100%"
                      clearable
                    />
                  </el-form-item>
                  <el-button
                    type="danger"
                    :icon="Delete"
                    circle
                    @click="removeArrayItem(column, index)"
                  />
                </div>
                <el-button
                  type="primary"
                  :icon="Plus"
                  plain
                  @click="addArrayItem(column)"
                >
                  行を追加
                </el-button>
              </div>

              <!-- 数组类型（商品列表） -->
              <div v-else-if="column.fieldType === 'array'" class="array-field">
                <div
                  v-for="(item, index) in getArrayValue(column)"
                  :key="index"
                  class="array-item"
                >
                  <el-form-item
                    :prop="`${column.dataKey || column.key}.${index}.inputSku`"
                    :rules="[
                      { required: true, message: 'SKU管理番号は必須です', trigger: 'blur' },
                    ]"
                    style="width: 30%; margin-right: 10px; margin-bottom: 0"
                  >
                    <el-input
                      v-model="item.inputSku"
                      placeholder="SKU管理番号 *"
                      style="width: 100%"
                    />
                  </el-form-item>
                  <el-form-item
                    :prop="`${column.dataKey || column.key}.${index}.productName`"
                    :rules="[
                      { required: false, message: '商品名を入力してください', trigger: 'blur' },
                    ]"
                    style="width: 30%; margin-right: 10px; margin-bottom: 0"
                  >
                    <el-input
                      v-model="item.productName"
                      placeholder="商品名（任意）"
                      style="width: 100%"
                    />
                  </el-form-item>
                  <el-form-item
                    :prop="`${column.dataKey || column.key}.${index}.quantity`"
                    :rules="[
                      { required: true, message: '数量は必須です', trigger: 'blur' },
                      { type: 'number', min: 1, message: '数量は1以上である必要があります', trigger: 'blur' },
                    ]"
                    style="width: 20%; margin-right: 10px; margin-bottom: 0"
                  >
                    <el-input-number
                      v-model="item.quantity"
                      :min="1"
                      placeholder="数量 *"
                      style="width: 100%"
                    />
                  </el-form-item>
                  <el-button
                    type="danger"
                    :icon="Delete"
                    circle
                    @click="removeArrayItem(column, index)"
                  />
                </div>
                <el-button
                  type="primary"
                  :icon="Plus"
                  plain
                  @click="addArrayItem(column)"
                >
                  商品を追加
                </el-button>
              </div>

              <!-- 默认文本输入 -->
              <el-input
                v-else
                :model-value="getNestedValueInTemplate(formData, getNestedKey(column))"
                @update:model-value="(val: string | number | boolean | null) => setNestedValueInTemplate(formData, getNestedKey(column), val)"
                :placeholder="`${column.title}を入力してください`"
              />
            </el-form-item>
          </template>
        </div>

        <!-- Slot for additional content -->
        <slot name="extra"></slot>
      </el-scrollbar>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">キャンセル</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          確定
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage, ElForm } from 'element-plus'
import { Plus, Delete } from '@element-plus/icons-vue'
import type { TableColumn } from '@/types/table'
import { setNestedValue, getNestedValue } from '@/utils/nestedObject'
import { getCoolTypeOptionsForInvoiceType } from '@/utils/orderValidation'

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

const formRef = ref<InstanceType<typeof ElForm>>()
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
const isGroupHeader = (column: TableColumn): boolean => {
  // 可以根据需要自定义分组逻辑
  return false
}

// 获取分组标题
const getGroupTitle = (column: TableColumn): string => {
  return column.title
}

// 获取表单标签（带必填标记）
const getFormLabel = (column: TableColumn): string => {
  const isRequired = isFieldRequired(column)
  return isRequired ? `${column.title} *` : column.title
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

// Get filtered options based on dependsOn field
const getFilteredOptions = (column: TableColumn) => {
  const dataKey = column.dataKey || column.key
  // クール区分の場合、invoiceType に依存してオプションをフィルタリング
  if (dataKey === 'coolType' && column.dependsOn === 'invoiceType') {
    const invoiceType = getNestedValue(formData.value, 'invoiceType') || '0'
    return getCoolTypeOptionsForInvoiceType(String(invoiceType))
  }
  // デフォルトは全オプションを返す
  return column.searchOptions || []
}

// Handle select change with dependent field reset
const handleSelectChange = (column: TableColumn, val: string | number | boolean | null) => {
  const dataKey = column.dataKey || column.key
  setNestedValue(formData.value, dataKey, val)

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

// 处理荷扱いタグ的建议
const handleHandlingTagSuggestions = (queryString: string, callback: (suggestions: Array<{ value: string }>) => void) => {
  const results = queryString
    ? HANDLING_TAG_OPTIONS.filter((option) =>
        option.toLowerCase().includes(queryString.toLowerCase())
      )
    : HANDLING_TAG_OPTIONS
  
  callback(results.map((option) => ({ value: option })))
}

// 生成表单验证规则（必填 + 类型 + 邮编/电话数字校验 + 数值上下限）
const formRules = computed(() => {
  const rules: Record<string, any[]> = {}
  const digitsOnly = /^\d+$/
  const postalCode7 = /^\d{7}$/
  const baseNo3 = /^\d{3}$/

  formColumns.value.forEach((column) => {
    const key = getNestedKey(column)
    const columnRules: any[] = []

    // Dynamic required validation using validator
    if (column.required || column.requiredWhen) {
      columnRules.push({
        validator: (_: any, value: any, callback: any) => {
          // Check if field is currently required
          const required = isFieldRequired(column)
          if (!required) {
            callback()
            return
          }
          // Check if value is empty
          const isEmpty = value === undefined || value === null || value === '' ||
            (Array.isArray(value) && value.length === 0)
          if (isEmpty) {
            callback(new Error(`${column.title}は必須です`))
            return
          }
          callback()
        },
        trigger: column.fieldType === 'date' || column.fieldType === 'dateOnly' ? 'change' : 'blur',
      })
    }

    // 类型与特殊字段规则
    if (column.fieldType === 'number') {
      columnRules.push({
        type: 'number',
        message: `${column.title}は数値で入力してください`,
        trigger: 'change',
      })
      if (column.min !== undefined || column.max !== undefined) {
        columnRules.push({
          validator: (_: any, value: any, callback: any) => {
            // Skip validation for disabled fields or empty values (optional fields)
            if (isFieldDisabled(column)) {
              callback()
              return
            }
            if (value === undefined || value === null || value === '') {
              callback()
              return
            }
            const num = Number(value)
            if (Number.isNaN(num)) {
              callback(new Error(`${column.title}は数値で入力してください`))
              return
            }
            if (column.min !== undefined && num < column.min) {
              callback(new Error(`${column.title}は${column.min}以上で入力してください`))
              return
            }
            if (column.max !== undefined && num > column.max) {
              callback(new Error(`${column.title}は${column.max}以下で入力してください`))
              return
            }
            callback()
          },
          trigger: 'change',
        })
      }
    } else if (column.fieldType === 'date') {
      columnRules.push({
        type: 'string',
        message: `${column.title}は日付形式で入力してください`,
        trigger: 'change',
      })
    } else if (column.fieldType === 'dateOnly') {
      columnRules.push({
        pattern: /^(?:\d{4}\/\d{2}\/\d{2}|\d{4}-\d{2}-\d{2})$/,
        message: `${column.title}はYYYY/MM/DD形式で入力してください`,
        trigger: 'change',
      })
    }

    // 邮编/电话：根据字段名启发式校验
    const keyLower = key.toLowerCase()
    if (keyLower.includes('postalcode')) {
      columnRules.push({
        pattern: postalCode7,
        message: '郵便番号は7桁の数字で入力してください',
        trigger: 'blur',
      })
    }
    if (keyLower.includes('phone')) {
      columnRules.push({
        pattern: digitsOnly,
        message: '電話番号は数字のみで入力してください',
        trigger: 'blur',
      })
    }
    // 発ベースNo：任意入力、入力されている場合は3桁数字
    if (keyLower.includes('hatsubaseno')) {
      columnRules.push({
        validator: (_: any, value: any, callback: any) => {
          const v = typeof value === 'string' ? value.trim() : value
          if (v === undefined || v === null || v === '') {
            callback()
            return
          }
          if (!baseNo3.test(String(v))) {
            callback(new Error('発ベースNoは3桁の数字で入力してください'))
            return
          }
          callback()
        },
        trigger: 'blur',
      })
    }

    if (columnRules.length > 0) {
      rules[key] = columnRules
    }
  })

  return rules
})

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
        // 对已有数据（编辑模式）立即校验并提示类型/格式问题
        const hasInitial =
          props.initialData && Object.keys(props.initialData).length > 0
        if (hasInitial && formRef.value) {
          await formRef.value.clearValidate()
          await formRef.value.validate().catch(() => {})
        }
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
  formRef.value?.resetFields()
}

// 处理提交
const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    if (props.allowInvalidSubmit) {
      // エラーは表示するが、保存はブロックしない
      await formRef.value.validate().catch(() => {})
    } else {
      await formRef.value.validate()
    }
    submitting.value = true

    // 构建提交数据（保持嵌套结构）
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
    if (props.allowInvalidSubmit) {
      ElMessage.success('保存しました（未入力/形式エラーの項目は赤枠で表示されます）')
    } else {
      ElMessage.success('保存しました')
    }
    handleClose()
  } catch (error) {
    ElMessage.error('入力内容を確定してください')
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

.array-field {
  width: 100%;
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

:deep(.el-divider__text) {
  font-weight: 600;
  color: #409eff;
}
</style>

