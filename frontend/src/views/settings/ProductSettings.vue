<template>
  <div class="product-settings">
    <ControlPanel title="商品設定" :show-search="false">
      <template #actions>
        <OButton variant="primary" @click="openCreate"><span class="o-icon">+</span> 商品を追加</OButton>
        <OButton variant="success" @click="showImportDialog = true"><span class="o-icon">&#8593;</span> 取り込みファイルを選択</OButton>
      </template>
    </ControlPanel>

    <SearchForm
      class="search-section"
      :columns="searchColumns"
      :show-save="false"
      storage-key="productSearch"
      @search="handleSearch"
    />

    <Table
      :columns="tableColumns"
      :data="list"
      :height="560"
      row-key="_id"
      highlight-columns-on-hover
      pagination-enabled
      pagination-mode="client"
      :page-size="25"
      :page-sizes="[10, 25, 50, 100]"
      :global-search-text="globalSearchText"
      row-selection-enabled
      :selected-keys="selectedKeys"
      bulk-edit-enabled
      @update:selected-keys="selectedKeys = $event"
      @bulk-edit="handleBulkEdit"
    />

    <FormDialog
      v-model="dialogVisible"
      :title="isEditing ? '商品を編集' : '商品を追加'"
      :columns="formColumns"
      :initial-data="editingRow || { mailCalcEnabled: false }"
      width="720px"
      @submit="handleDialogSubmitWithSubSkus"
    >
      <template #extra>
        <ProductImageUpload
          ref="imageUploadRef"
          :image-url="editImageUrl"
          @update:image-url="editImageUrl = $event"
        />

        <SubSkuInlineEditor
          :sub-skus="editDialogSubSkus"
          :validation-errors="editDialogSubSkuValidationErrors"
          @add="addEditDialogSubSku"
          @remove="removeEditDialogSubSku"
          @validate="(index) => validateEditDialogSubSkuInput(index)"
        />
      </template>
    </FormDialog>

    <!-- Sub-SKU Management Dialog -->
    <SubSkuDialog
      :open="subSkuDialogVisible"
      :editing-product="subSkuEditingProduct"
      :sub-skus="tempSubSkus"
      :validation-errors="subSkuValidationErrors"
      :saving="savingSubSkus"
      @update:open="subSkuDialogVisible = $event"
      @add="addSubSku"
      @remove="removeSubSku"
      @validate="(index) => validateSubSkuInput(index)"
      @save="saveSubSkus"
    />

    <ImportDialog
      v-model="showImportDialog"
      :config-type="'product'"
      :passthrough="true"
      show-duplicate-strategy
      @import="handleImportProducts"
    />

    <ImportResultDialog v-model="importResultDialogVisible" :result="importResult" />
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import { useToast } from '@/composables/useToast'
import { getApiBaseUrl } from '@/api/base'
import noImageSrc from '@/assets/images/no_image.png'
import SearchForm from '@/components/search/SearchForm.vue'
import Table from '@/components/table/Table.vue'
import FormDialog from '@/components/form/FormDialog.vue'
import ImportDialog from '@/components/import/ImportDialog.vue'
import type { TableColumn, Operator } from '@/types/table'
import { bulkUpdateProducts, checkSkuAvailability, createProduct, deleteProduct, fetchProducts, importProductsWithStrategy, updateProduct, type ImportStrategy } from '@/api/product'
import type { Product, ProductFilters, UpsertProductDto, SubSku } from '@/types/product'
import ImportResultDialog, { type ImportResultData } from '@/components/import/ImportResultDialog.vue'
import ProductImageUpload from './product-settings/ProductImageUpload.vue'
import SubSkuInlineEditor from './product-settings/SubSkuInlineEditor.vue'
import SubSkuDialog from './product-settings/SubSkuDialog.vue'
import { useSkuValidation } from './product-settings/useSkuValidation'

const toast = useToast()

const COOL_TYPE_OPTIONS = [
  { label: '通常', value: '0' },
  { label: 'クール冷凍', value: '1' },
  { label: 'クール冷蔵', value: '2' },
]

const list = ref<Product[]>([])
const loading = ref(false)
const saving = ref(false)
const importing = ref(false)
const importResultDialogVisible = ref(false)
const importResult = ref<ImportResultData>({
  insertedCount: 0,
  updatedCount: 0,
  skippedCount: 0,
  skippedSkus: [],
  errors: [],
})
const dialogVisible = ref(false)
const showImportDialog = ref(false)
const editingRow = ref<Product | null>(null)
const globalSearchText = ref('')
const selectedKeys = ref<(string | number)[]>([])

// Sub-SKU management (separate dialog)
const subSkuDialogVisible = ref(false)
const subSkuEditingProduct = ref<Product | null>(null)
const tempSubSkus = ref<SubSku[]>([])
const savingSubSkus = ref(false)

// Image upload state
const editImageUrl = ref<string>('')
const imageUploadRef = ref<InstanceType<typeof ProductImageUpload> | null>(null)

// Sub-SKU management (edit dialog inline)
const editDialogSubSkus = ref<SubSku[]>([])

// SKU validation (composable)
const {
  subSkuValidationErrors,
  editDialogSubSkuValidationErrors,
  validateDialogSubSku,
  validateEditDialogSubSku,
  validateMainSkuInput,
  resetDialogErrors,
  resetEditDialogErrors,
} = useSkuValidation()

const baseColumns: TableColumn[] = [
  {
    key: 'imageUrl',
    dataKey: 'imageUrl',
    title: '画像',
    width: 125,
    fieldType: 'string',
    searchable: false,
    formEditable: false,
    bulkEditDisabled: true,
  },
  {
    key: 'sku',
    dataKey: 'sku',
    title: 'SKU管理番号',
    width: 160,
    fieldType: 'string',
    required: true,
    searchable: true,
    searchType: 'string',
    bulkEditDisabled: true,
  },
  {
    key: 'name',
    dataKey: 'name',
    title: '印刷用商品名',
    width: 200,
    fieldType: 'string',
    required: true,
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'nameFull',
    dataKey: 'nameFull',
    title: '商品名',
    width: 220,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'barcode',
    dataKey: 'barcode',
    title: '検品コード (バーコード)',
    width: 220,
    fieldType: 'array',
    searchable: false,
    bulkEditDisabled: true,
  },
  {
    key: 'coolType',
    dataKey: 'coolType',
    title: 'クール区分',
    width: 140,
    fieldType: 'string',
    searchOptions: COOL_TYPE_OPTIONS,
    searchable: true,
    searchType: 'select',
  },
  {
    key: 'mailCalcEnabled',
    dataKey: 'mailCalcEnabled',
    title: 'メール便計算',
    width: 120,
    fieldType: 'boolean',
    required: true,
    searchable: true,
    searchType: 'boolean',
  },
  {
    key: 'mailCalcMaxQuantity',
    dataKey: 'mailCalcMaxQuantity',
    title: 'メール便最大数量',
    width: 140,
    fieldType: 'number',
    required: false,
    searchable: false,
    min: 1,
    // Conditional behavior: required when mailCalcEnabled is true, disabled otherwise
    disabledWhen: (formData: Record<string, any>) => !formData.mailCalcEnabled,
    requiredWhen: (formData: Record<string, any>) => formData.mailCalcEnabled === true,
  },
  {
    key: 'price',
    dataKey: 'price',
    title: '商品金額',
    width: 120,
    fieldType: 'number',
    searchable: false,
  },
  {
    key: 'handlingTypes',
    dataKey: 'handlingTypes',
    title: '荷扱い',
    width: 160,
    fieldType: 'array',
    searchable: false,
    bulkEditDisabled: true,
  },
  {
    key: 'memo',
    dataKey: 'memo',
    title: 'メモ',
    width: 200,
    fieldType: 'string',
    searchable: false,
  },
  {
    key: 'subSkusCount',
    dataKey: 'subSkus',
    title: '子SKU',
    width: 200,
    fieldType: 'string',
    searchable: false,
    formEditable: false,
    bulkEditDisabled: true,
  },
  {
    key: 'createdAt',
    dataKey: 'createdAt',
    title: '作成日時',
    width: 180,
    fieldType: 'date',
    formEditable: false,
    bulkEditDisabled: true,
  },
]

const searchColumns: TableColumn[] = baseColumns.filter((c) => c.searchable)

const API_BASE = getApiBaseUrl().replace(/\/api$/, '')

const resolveImageUrl = (url?: string): string => {
  if (!url) return noImageSrc
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${API_BASE}${url}`
}

const tableColumns: TableColumn[] = [
  ...baseColumns.map((col) => {
    if (col.key === 'imageUrl') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: Product }) => {
          return h('img', {
            src: resolveImageUrl(rowData.imageUrl),
            style: 'width:80px;height:80px;object-fit:cover;object-position:center;border-radius:4px;',
            onError: (e: Event) => { (e.target as HTMLImageElement).src = noImageSrc },
          })
        },
      }
    }
    if (col.key === 'createdAt') {
      return { ...col, cellRenderer: ({ rowData }: { rowData: Product }) => formatDate(rowData.createdAt) }
    }
    if (col.key === 'barcode') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: Product }) => {
          const bc = (rowData as any).barcode
          if (!Array.isArray(bc) || bc.length === 0) return '-'
          return bc.join(', ')
        },
      }
    }
    if (col.key === 'coolType') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: Product }) => {
          const found = COOL_TYPE_OPTIONS.find((o) => o.value === rowData.coolType)
          return found?.label || '-'
        },
      }
    }
    if (col.key === 'mailCalcEnabled') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: Product }) => {
          return rowData.mailCalcEnabled ? 'する' : 'しない'
        },
      }
    }
    if (col.key === 'mailCalcMaxQuantity') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: Product }) => {
          if (!rowData.mailCalcEnabled) return '-'
          return rowData.mailCalcMaxQuantity ?? '-'
        },
      }
    }
    // handlingTypes array
    if (col.key === 'handlingTypes') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: Product }) => {
          const ht = rowData.handlingTypes
          if (!Array.isArray(ht) || ht.length === 0) return '-'
          return ht.join(', ')
        },
      }
    }
    // subSkusCount column with button to open sub-SKU dialog
    if (col.key === 'subSkusCount') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: Product }) => {
          const subSkus = rowData.subSkus || []
          const displayText = subSkus.length > 0
            ? subSkus.map((s) => s.subSku).join(', ')
            : '-'
          return h(
            OButton,
            {
              variant: 'secondary',
              size: 'sm',
              onClick: () => openSubSkuDialog(rowData),
            },
            () => displayText,
          )
        },
      }
    }
    return {
      ...col,
      cellRenderer: ({ rowData }: { rowData: Product }) => (rowData as any)[col.dataKey || col.key] ?? '-',
    }
  }),
  {
    key: 'actions',
    title: '操作',
    width: 200,
    cellRenderer: ({ rowData }: { rowData: Product }) =>
      h('div', { class: 'action-cell' }, [
        h(OButton, { variant: 'primary', size: 'sm', onClick: () => openEdit(rowData) }, () => '編集'),
        h(OButton, { variant: 'secondary', size: 'sm', onClick: () => duplicateProduct(rowData) }, () => '複製'),
        h(OButton, { variant: 'danger', size: 'sm', onClick: () => confirmDelete(rowData) }, () => '削除'),
      ]),
  },
]

const formColumns = baseColumns.filter((col) => col.formEditable !== false)

const currentFilters = ref<ProductFilters>({})

const isEditing = computed(() => !!editingRow.value?._id)

const resetForm = () => {
  editingRow.value = null
}

const openCreate = () => {
  resetForm()
  editImageUrl.value = ''
  imageUploadRef.value?.resetUrlInput()
  editDialogSubSkus.value = []
  resetEditDialogErrors()
  resetDialogErrors()
  dialogVisible.value = true
}

const openEdit = (row: Product) => {
  editingRow.value = row
  editImageUrl.value = row.imageUrl || ''
  imageUploadRef.value?.resetUrlInput()
  // Clone subSkus for editing in the dialog
  editDialogSubSkus.value = (row.subSkus || []).map((s) => ({ ...s }))
  resetEditDialogErrors()
  resetDialogErrors()
  dialogVisible.value = true
}

const duplicateProduct = (row: Product) => {
  // Open as new product (empty _id → isEditing = false), with SKU and subSkus cleared
  editingRow.value = {
    ...row,
    _id: '',
    sku: '',
    subSkus: [],
  } as Product
  editImageUrl.value = row.imageUrl || ''
  imageUploadRef.value?.resetUrlInput()
  editDialogSubSkus.value = []
  resetEditDialogErrors()
  resetDialogErrors()
  dialogVisible.value = true
}

// Sub-SKU management functions
const openSubSkuDialog = (row: Product) => {
  subSkuEditingProduct.value = row
  tempSubSkus.value = (row.subSkus || []).map((s) => ({ ...s }))
  resetDialogErrors()
  subSkuDialogVisible.value = true
}

const addSubSku = () => {
  tempSubSkus.value.push({
    subSku: '',
    price: undefined,
    description: '',
    isActive: true,
  })
}

const removeSubSku = (index: number) => {
  tempSubSkus.value.splice(index, 1)
}

const validateSubSkuInput = async (index: number) => {
  await validateDialogSubSku(
    index,
    tempSubSkus.value,
    subSkuEditingProduct.value?.sku,
    subSkuEditingProduct.value?._id,
  )
}

// Edit dialog inline sub-SKU functions
const addEditDialogSubSku = () => {
  editDialogSubSkus.value.push({
    subSku: '',
    price: undefined,
    description: '',
    isActive: true,
  })
}

const removeEditDialogSubSku = (index: number) => {
  editDialogSubSkus.value.splice(index, 1)
}

const validateEditDialogSubSkuInput = async (index: number) => {
  await validateEditDialogSubSku(
    index,
    editDialogSubSkus.value,
    editingRow.value?.sku,
    editingRow.value?._id,
  )
}

const saveSubSkus = async () => {
  if (!subSkuEditingProduct.value) return

  // Check if there are any validation errors
  if (Object.keys(subSkuValidationErrors.value).length > 0) {
    toast.showWarning('入力エラーがあります。修正してください。')
    return
  }

  // Validate sub-SKUs
  const validSubSkus = tempSubSkus.value.filter((s) => s.subSku && s.subSku.trim())

  // Check for duplicates within the list
  const codes = validSubSkus.map((s) => s.subSku.trim())
  const uniqueCodes = new Set(codes)
  if (uniqueCodes.size !== codes.length) {
    toast.showWarning('子SKUコードが重複しています')
    return
  }

  // Check if any sub-SKU matches the parent SKU
  if (codes.includes(subSkuEditingProduct.value.sku)) {
    toast.showWarning('子SKUコードは親SKUと同じにできません')
    return
  }

  // Validate all sub-SKUs against database
  if (codes.length > 0) {
    const excludeId = subSkuEditingProduct.value._id
    const results = await checkSkuAvailability(codes, excludeId)
    const conflictErrors: string[] = []
    for (const code of codes) {
      if (results[code] && !results[code].available) {
        const conflict = results[code]
        if (conflict.conflictType === 'mainSku') {
          conflictErrors.push(`子SKU「${code}」は既存商品のSKU「${conflict.conflictProductSku}」と重複しています`)
        } else {
          conflictErrors.push(`子SKU「${code}」は商品「${conflict.conflictProductSku}」の子SKUと重複しています`)
        }
      }
    }
    if (conflictErrors.length > 0) {
      toast.showWarning(conflictErrors[0])
      return
    }
  }

  savingSubSkus.value = true
  try {
    await updateProduct(subSkuEditingProduct.value._id, {
      subSkus: validSubSkus.map((s) => ({
        subSku: s.subSku.trim(),
        price: s.price,
        description: s.description?.trim() || undefined,
        isActive: s.isActive !== false,
      })),
    })
    toast.showSuccess('子SKUを保存しました')
    subSkuDialogVisible.value = false
    await loadList()
  } catch (error: any) {
    toast.showError(error?.response?.data?.message || error?.message || '保存に失敗しました')
  } finally {
    savingSubSkus.value = false
  }
}

const handleSearch = (payload: Record<string, { operator: Operator; value: any }>) => {
  // Extract global search text (client-side only, strip from payload)
  if (payload.__global?.value) {
    globalSearchText.value = String(payload.__global.value).trim()
    delete payload.__global
  } else {
    globalSearchText.value = ''
  }

  const nextFilters: ProductFilters = {}
  const pickString = (val: any) => (typeof val === 'string' && val.trim() ? val.trim() : undefined)
  const pickBoolean = (val: any): boolean | undefined => {
    if (val === true || val === 'true') return true
    if (val === false || val === 'false') return false
    return undefined
  }

  if (payload.sku?.value) nextFilters.sku = pickString(payload.sku.value)
  if (payload.name?.value) nextFilters.name = pickString(payload.name.value)
  if (payload.nameFull?.value) nextFilters.nameFull = pickString(payload.nameFull.value)
  if (payload.coolType?.value) nextFilters.coolType = payload.coolType.value as ProductFilters['coolType']
  if (payload.mailCalcEnabled?.value !== undefined) {
    nextFilters.mailCalcEnabled = pickBoolean(payload.mailCalcEnabled.value)
  }

  currentFilters.value = nextFilters
  loadList()
}

const loadList = async () => {
  loading.value = true
  try {
    list.value = await fetchProducts(currentFilters.value)
  } catch (error: any) {
    toast.showError(error?.message || '取得に失敗しました')
  } finally {
    loading.value = false
  }
}

const normalizeBarcodeInput = (val: any): string[] => {
  if (val === undefined || val === null) return []
  if (Array.isArray(val)) {
    return val
      .map((v) => (v === undefined || v === null ? '' : String(v).trim()))
      .filter((v) => v.length > 0)
  }
  if (typeof val === 'string') {
    const s = val.trim()
    if (!s) return []
    return s
      .split(/\n+/g)
      .map((x) => x.trim())
      .filter((x) => x.length > 0)
  }
  return [String(val).trim()].filter((x) => x.length > 0)
}

const normalizeArrayInput = (val: any): string[] => {
  if (val === undefined || val === null) return []
  if (Array.isArray(val)) {
    return val
      .map((v) => (v === undefined || v === null ? '' : String(v).trim()))
      .filter((v) => v.length > 0)
  }
  if (typeof val === 'string') {
    const s = val.trim()
    if (!s) return []
    return s
      .split(/\n+/g)
      .map((x) => x.trim())
      .filter((x) => x.length > 0)
  }
  return [String(val).trim()].filter((x) => x.length > 0)
}

const handleDialogSubmitWithSubSkus = async (payload: Record<string, any>) => {
  // Check if there are any validation errors
  if (Object.keys(editDialogSubSkuValidationErrors.value).length > 0) {
    toast.showWarning('子SKUに入力エラーがあります。修正してください。')
    return
  }

  saving.value = true
  try {
    const normalizeMailCalcEnabled = (val: any): boolean => {
      if (val === true || val === 'true' || val === '1' || val === 'する') return true
      return false
    }

    const normalizeMailCalcMaxQuantity = (val: any): number | undefined => {
      if (val === undefined || val === null || val === '') return undefined
      const n = typeof val === 'number' ? val : Number(String(val).trim())
      if (!Number.isFinite(n)) return undefined
      const i = Math.trunc(n)
      return i > 0 ? i : undefined
    }

    const normalizeOptionalNumber = (val: any): number | undefined => {
      if (val === undefined || val === null || val === '') return undefined
      const n = typeof val === 'number' ? val : Number(String(val).trim())
      return Number.isFinite(n) ? n : undefined
    }

    // Validate sub-SKUs from edit dialog
    const validSubSkus = editDialogSubSkus.value.filter((s) => s.subSku && s.subSku.trim())
    const subSkuCodes = validSubSkus.map((s) => s.subSku.trim())
    const uniqueSubSkuCodes = new Set(subSkuCodes)
    if (uniqueSubSkuCodes.size !== subSkuCodes.length) {
      toast.showWarning('子SKUコードが重複しています')
      saving.value = false
      return
    }
    const parentSku = (payload.sku || '').trim()
    if (subSkuCodes.includes(parentSku)) {
      toast.showWarning('子SKUコードは親SKUと同じにできません')
      saving.value = false
      return
    }

    // Validate main SKU uniqueness against database
    const mainSkuError = await validateMainSkuInput(parentSku, editingRow.value?._id)
    if (mainSkuError) {
      toast.showWarning(mainSkuError)
      saving.value = false
      return
    }

    // Validate all sub-SKUs against database
    if (subSkuCodes.length > 0) {
      const excludeId = editingRow.value?._id
      const results = await checkSkuAvailability(subSkuCodes, excludeId)
      const conflictErrors: string[] = []
      for (const code of subSkuCodes) {
        if (results[code] && !results[code].available) {
          const conflict = results[code]
          if (conflict.conflictType === 'mainSku') {
            conflictErrors.push(`子SKU「${code}」は既存商品のSKU「${conflict.conflictProductSku}」と重複しています`)
          } else {
            conflictErrors.push(`子SKU「${code}」は商品「${conflict.conflictProductSku}」の子SKUと重複しています`)
          }
        }
      }
      if (conflictErrors.length > 0) {
        toast.showWarning(conflictErrors[0]) // Show first error
        saving.value = false
        return
      }
    }

    const mailCalcEnabledValue = normalizeMailCalcEnabled(payload.mailCalcEnabled)
    // Only set mailCalcMaxQuantity if mailCalcEnabled is true
    const mailCalcMaxQuantityValue = mailCalcEnabledValue
      ? normalizeMailCalcMaxQuantity(payload.mailCalcMaxQuantity)
      : undefined

    const cleanPayload: Record<string, any> = {
      sku: parentSku,
      name: (payload.name || '').trim(),
      nameFull: payload.nameFull ? String(payload.nameFull).trim() : undefined,
      barcode: normalizeBarcodeInput(payload.barcode),
      coolType: payload.coolType || undefined,
      mailCalcEnabled: mailCalcEnabledValue,
      mailCalcMaxQuantity: mailCalcMaxQuantityValue,
      memo: payload.memo ? String(payload.memo).trim() : undefined,
      price: normalizeOptionalNumber(payload.price),
      handlingTypes: normalizeArrayInput(payload.handlingTypes),
      imageUrl: editImageUrl.value || undefined,
      // Include sub-SKUs
      subSkus: validSubSkus.map((s) => ({
        subSku: s.subSku.trim(),
        price: s.price,
        description: s.description?.trim() || undefined,
        isActive: s.isActive !== false,
      })),
    }

    if (editingRow.value?._id) {
      await updateProduct(editingRow.value._id, cleanPayload)
      toast.showSuccess('更新しました')
    } else {
      await createProduct(cleanPayload as UpsertProductDto)
      toast.showSuccess('作成しました')
    }
    dialogVisible.value = false
    resetForm()
    await loadList()
  } catch (error: any) {
    toast.showError(error?.response?.data?.message || error?.message || '保存に失敗しました')
  } finally {
    saving.value = false
  }
}

const handleBulkEdit = async (payload: { columnKey: string; dataKey: string; fieldType?: string; value: any; overwrite: boolean; selectedKeys: (string | number)[]; selectedRows: Record<string, any>[] }) => {
  const { dataKey, value, selectedKeys: keys } = payload
  if (!keys || keys.length === 0) {
    toast.showWarning('商品が選択されていません')
    return
  }
  try {
    const updates = { [dataKey]: value }
    const result = await bulkUpdateProducts(keys.map(String), updates)
    toast.showSuccess(`${result.modifiedCount}件更新しました`)
    await loadList()
    selectedKeys.value = []
  } catch (error: any) {
    toast.showError(error?.message || '一括更新に失敗しました')
  }
}

const handleImportProducts = async (rows: any[], strategy: ImportStrategy = 'error') => {
  if (!rows || !Array.isArray(rows)) return
  importing.value = true
  importResult.value = {
    insertedCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    skippedSkus: [],
    errors: [],
  }
  importResultDialogVisible.value = false

  try {
    const result = await importProductsWithStrategy(rows, strategy)

    // 結果を保存
    importResult.value = {
      insertedCount: result.insertedCount,
      updatedCount: result.updatedCount,
      skippedCount: result.skippedCount,
      skippedSkus: result.skippedSkus || [],
      errors: [],
    }

    // 成功メッセージを表示
    const messages: string[] = []
    if (result.insertedCount > 0) messages.push(`${result.insertedCount}件登録`)
    if (result.updatedCount > 0) messages.push(`${result.updatedCount}件更新`)
    if (result.skippedCount > 0) messages.push(`${result.skippedCount}件スキップ`)

    if (messages.length > 0) {
      toast.showSuccess(messages.join('、') + 'しました')
    }

    // スキップまたは更新がある場合は結果ダイアログを表示
    if (result.skippedCount > 0 || result.updatedCount > 0) {
      importResultDialogVisible.value = true
    }

    await loadList()
    showImportDialog.value = false
  } catch (err: any) {
    const errors = err?.errors || []
    if (Array.isArray(errors) && errors.length > 0) {
      importResult.value = {
        insertedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        skippedSkus: [],
        errors,
      }
      importResultDialogVisible.value = true
    } else {
      toast.showError(err?.message || '取り込みに失敗しました')
    }
  } finally {
    importing.value = false
  }
}

const confirmDelete = (row: Product) => {
  if (confirm(`「${row.name}」を削除しますか？`)) {
    deleteProduct(row._id)
      .then(async () => {
        toast.showSuccess('削除しました')
        await loadList()
      })
      .catch(() => {})
  }
}

const formatDate = (iso: string) => {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

onMounted(() => {
  loadList()
})
</script>

<style scoped>
.product-settings {
  display: flex;
  flex-direction: column;
}

.search-section {
  margin-bottom: 20px;
}

:deep(.action-cell) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}


</style>
