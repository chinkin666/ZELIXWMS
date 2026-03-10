<template>
  <div class="product-settings">
    <div class="page-header">
      <div>
        <h1 class="page-title">商品設定</h1>
        <p class="page-subtitle">SKU管理番号 と印刷用商品名、商品名、検品コード (バーコード)、クール区分、メール便計算を管理します</p>
      </div>
      <div class="page-actions">
        <el-button type="primary" :icon="Plus" @click="openCreate">商品を追加</el-button>
        <el-button type="success" :icon="Upload" @click="showImportDialog = true">取り込みファイルを選択</el-button>
      </div>
    </div>

    <SearchForm
      class="search-section"
      :columns="searchColumns"
      :show-save="false"
      storage-key="productSearch"
      @search="handleSearch"
    />

    <div class="table-section">
      <Table
        :columns="tableColumns"
        :data="list"
        :height="520"
        row-key="_id"
        highlight-columns-on-hover
        pagination-enabled
        pagination-mode="client"
        :page-size="10"
        :page-sizes="[10, 20, 50]"
        :global-search-text="globalSearchText"
        row-selection-enabled
        :selected-keys="selectedKeys"
        bulk-edit-enabled
        @update:selected-keys="selectedKeys = $event"
        @bulk-edit="handleBulkEdit"
      />
    </div>

    <FormDialog
      v-model="dialogVisible"
      :title="isEditing ? '商品を編集' : '商品を追加'"
      :columns="formColumns"
      :initial-data="editingRow || { mailCalcEnabled: false }"
      width="720px"
      @submit="handleDialogSubmitWithSubSkus"
    >
      <template #extra>
        <!-- Image Upload Section -->
        <div class="image-upload-section">
          <el-divider content-position="left">商品画像</el-divider>
          <div class="image-upload-content">
            <div class="image-preview">
              <img :src="resolveImageUrl(editImageUrl)" class="preview-img" @error="(e: Event) => { (e.target as HTMLImageElement).src = noImageSrc }" />
            </div>
            <div class="image-inputs">
              <!-- No image or has image: show action buttons -->
              <div v-if="!showUrlInput" class="image-input-row">
                <el-upload
                  :show-file-list="false"
                  :auto-upload="false"
                  accept="image/*"
                  @change="handleImageFileChange"
                >
                  <el-button size="small" :icon="Picture" :loading="uploadingImage">ファイルをアップロード</el-button>
                </el-upload>
                <el-button size="small" @click="showUrlInput = true">外部URLを指定</el-button>
                <el-button v-if="editImageUrl" size="small" type="danger" link @click="editImageUrl = ''">削除</el-button>
              </div>
              <!-- URL input mode -->
              <div v-else class="image-input-row">
                <el-input
                  v-model="editImageUrl"
                  size="small"
                  placeholder="画像URLを入力 (https://...)"
                  clearable
                  @clear="showUrlInput = false"
                />
                <el-button size="small" @click="showUrlInput = false">戻る</el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- Sub-SKU Management Section in Edit Dialog -->
        <div class="sub-sku-inline-section">
          <el-divider content-position="left">子SKU管理</el-divider>
          <el-table :data="editDialogSubSkus" :style="{ width: '100%' }" size="small" max-height="200">
            <el-table-column prop="subSku" label="子SKUコード" width="200">
              <template #default="{ row, $index }">
                <div>
                  <el-input
                    v-model="row.subSku"
                    size="small"
                    placeholder="子SKUコード"
                    :class="{ 'is-error': editDialogSubSkuValidationErrors[$index] }"
                    @blur="validateEditDialogSubSkuInput($index)"
                  />
                  <div v-if="editDialogSubSkuValidationErrors[$index]" class="sku-error-message">
                    {{ editDialogSubSkuValidationErrors[$index] }}
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="price" label="価格" width="100">
              <template #default="{ row }">
                <el-input-number
                  v-model="row.price"
                  size="small"
                  :min="0"
                  :precision="0"
                  :controls="false"
                  placeholder="親価格"
                  style="width: 100%"
                />
              </template>
            </el-table-column>
            <el-table-column prop="description" label="説明">
              <template #default="{ row }">
                <el-input v-model="row.description" size="small" placeholder="説明（例: セール価格）" />
              </template>
            </el-table-column>
            <el-table-column prop="isActive" label="有効" width="60" align="center">
              <template #default="{ row }">
                <el-checkbox v-model="row.isActive" />
              </template>
            </el-table-column>
            <el-table-column label="" width="60" align="center">
              <template #default="{ $index }">
                <el-button type="danger" link size="small" @click="removeEditDialogSubSku($index)">削除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div class="sub-sku-actions">
            <el-button type="primary" size="small" @click="addEditDialogSubSku">+ 子SKUを追加</el-button>
          </div>
        </div>
      </template>
    </FormDialog>

    <!-- Sub-SKU Management Dialog -->
    <el-dialog
      v-model="subSkuDialogVisible"
      title="子SKU管理"
      width="700px"
      :close-on-click-modal="false"
    >
      <div v-if="subSkuEditingProduct" class="sub-sku-header">
        <p><strong>親商品:</strong> {{ subSkuEditingProduct.sku }} - {{ subSkuEditingProduct.name }}</p>
        <p v-if="subSkuEditingProduct.price"><strong>親商品価格:</strong> ¥{{ subSkuEditingProduct.price.toLocaleString() }}</p>
      </div>

      <el-table :data="tempSubSkus" :style="{ width: '100%' }" size="small" max-height="300">
        <el-table-column prop="subSku" label="子SKUコード" width="220">
          <template #default="{ row, $index }">
            <div>
              <el-input
                v-model="row.subSku"
                size="small"
                placeholder="子SKUコード"
                :class="{ 'is-error': subSkuValidationErrors[$index] }"
                @blur="validateSubSkuInput($index)"
              />
              <div v-if="subSkuValidationErrors[$index]" class="sku-error-message">
                {{ subSkuValidationErrors[$index] }}
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="price" label="価格" width="120">
          <template #default="{ row }">
            <el-input-number
              v-model="row.price"
              size="small"
              :min="0"
              :precision="0"
              :controls="false"
              placeholder="親価格"
              style="width: 100%"
            />
          </template>
        </el-table-column>
        <el-table-column prop="description" label="説明">
          <template #default="{ row }">
            <el-input v-model="row.description" size="small" placeholder="説明（例: セール価格）" />
          </template>
        </el-table-column>
        <el-table-column prop="isActive" label="有効" width="70" align="center">
          <template #default="{ row }">
            <el-checkbox v-model="row.isActive" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" align="center">
          <template #default="{ $index }">
            <el-button type="danger" link size="small" @click="removeSubSku($index)">削除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="sub-sku-actions">
        <el-button type="primary" size="small" @click="addSubSku">+ 子SKUを追加</el-button>
      </div>

      <template #footer>
        <el-button @click="subSkuDialogVisible = false">キャンセル</el-button>
        <el-button type="primary" :loading="savingSubSkus" @click="saveSubSkus">保存</el-button>
      </template>
    </el-dialog>

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
import { ElButton, ElMessage, ElMessageBox, ElDialog, ElDivider, ElInputNumber, ElCheckbox, ElTable, ElTableColumn, ElInput, ElUpload } from 'element-plus'
import { Edit, Plus, Delete, Upload, Picture } from '@element-plus/icons-vue'
import { uploadProductImage } from '@/api/product'
import { getApiBaseUrl } from '@/api/base'
import noImageSrc from '@/assets/images/no_image.png'
import SearchForm from '@/components/search/SearchForm.vue'
import Table from '@/components/table/Table.vue'
import FormDialog from '@/components/form/FormDialog.vue'
import ImportDialog from '@/components/import/ImportDialog.vue'
import type { TableColumn, Operator } from '@/types/table'
import { bulkUpdateProducts, checkSkuAvailability, createProduct, deleteProduct, fetchProducts, importProductsWithStrategy, updateProduct, type ImportStrategy, type ImportResult } from '@/api/product'
import type { Product, ProductFilters, UpsertProductDto, SubSku } from '@/types/product'
import ImportResultDialog, { type ImportResultData } from '@/components/import/ImportResultDialog.vue'

const COOL_TYPE_OPTIONS = [
  { label: '常温', value: '0' },
  { label: 'クール冷蔵', value: '1' },
  { label: 'クール冷凍', value: '2' },
]

// メール便計算オプション
const MAIL_CALC_OPTIONS = [
  { label: 'しない', value: false },
  { label: 'する', value: true },
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
const uploadingImage = ref(false)
const showUrlInput = ref(false)

// Sub-SKU management (edit dialog inline)
const editDialogSubSkus = ref<SubSku[]>([])

// SKU validation error tracking
const skuValidationErrors = ref<Record<string, string>>({}) // { sku: errorMessage }
const subSkuValidationErrors = ref<Record<number, string>>({}) // { index: errorMessage } for sub-SKU dialog
const editDialogSubSkuValidationErrors = ref<Record<number, string>>({}) // { index: errorMessage } for edit dialog

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
            ElButton,
            {
              type: 'primary',
              link: true,
              size: 'small',
              onClick: () => openSubSkuDialog(rowData),
            },
            { default: () => displayText },
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
        h(
          ElButton,
          {
            type: 'primary',
            plain: true,
            size: 'small',
            onClick: () => openEdit(rowData),
          },
          { default: () => '編集' },
        ),
        h(
          ElButton,
          {
            type: 'info',
            plain: true,
            size: 'small',
            onClick: () => duplicateProduct(rowData),
          },
          { default: () => '複製' },
        ),
        h(
          ElButton,
          {
            type: 'danger',
            plain: true,
            size: 'small',
            onClick: () => confirmDelete(rowData),
          },
          { default: () => '削除' },
        ),
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
  showUrlInput.value = false
  editDialogSubSkus.value = []
  editDialogSubSkuValidationErrors.value = {}
  skuValidationErrors.value = {}
  dialogVisible.value = true
}

const openEdit = (row: Product) => {
  editingRow.value = row
  editImageUrl.value = row.imageUrl || ''
  showUrlInput.value = false
  // Clone subSkus for editing in the dialog
  editDialogSubSkus.value = (row.subSkus || []).map((s) => ({ ...s }))
  editDialogSubSkuValidationErrors.value = {}
  skuValidationErrors.value = {}
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
  showUrlInput.value = false
  editDialogSubSkus.value = []
  editDialogSubSkuValidationErrors.value = {}
  skuValidationErrors.value = {}
  dialogVisible.value = true
}

const handleImageFileChange = async (uploadFile: any) => {
  const file = uploadFile.raw || uploadFile
  if (!file) return
  uploadingImage.value = true
  try {
    const result = await uploadProductImage(file)
    editImageUrl.value = result.imageUrl
    ElMessage.success('画像をアップロードしました')
  } catch (error: any) {
    ElMessage.error(error?.message || '画像のアップロードに失敗しました')
  } finally {
    uploadingImage.value = false
  }
}

// Sub-SKU management functions
const openSubSkuDialog = (row: Product) => {
  subSkuEditingProduct.value = row
  tempSubSkus.value = (row.subSkus || []).map((s) => ({ ...s }))
  subSkuValidationErrors.value = {}
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
  const subSku = tempSubSkus.value[index]
  if (!subSku) return

  subSku.subSku = (subSku.subSku || '').trim()
  const code = subSku.subSku

  // Clear previous error
  delete subSkuValidationErrors.value[index]

  if (!code) return

  // Check if it matches parent SKU
  if (subSkuEditingProduct.value && code === subSkuEditingProduct.value.sku) {
    subSkuValidationErrors.value[index] = '親SKUと同じコードは使用できません'
    return
  }

  // Check for duplicates within the current list
  const duplicateIndex = tempSubSkus.value.findIndex((s, i) => i !== index && s.subSku === code)
  if (duplicateIndex >= 0) {
    subSkuValidationErrors.value[index] = 'このコードは既に入力されています'
    return
  }

  // Check against database
  try {
    const excludeId = subSkuEditingProduct.value?._id
    const results = await checkSkuAvailability([code], excludeId)
    if (results[code] && !results[code].available) {
      const conflict = results[code]
      if (conflict.conflictType === 'mainSku') {
        subSkuValidationErrors.value[index] = `このコードは既存商品のSKU「${conflict.conflictProductSku}」と重複しています`
      } else {
        subSkuValidationErrors.value[index] = `このコードは商品「${conflict.conflictProductSku}」の子SKUと重複しています`
      }
    }
  } catch (error: any) {
    console.error('SKU validation error:', error)
  }
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

const validateEditDialogSubSkuInput = async (index: number, parentSku?: string) => {
  const subSku = editDialogSubSkus.value[index]
  if (!subSku) return

  subSku.subSku = (subSku.subSku || '').trim()
  const code = subSku.subSku

  // Clear previous error
  delete editDialogSubSkuValidationErrors.value[index]

  if (!code) return

  // Check if it matches parent SKU (use provided parentSku or editing row's SKU)
  const currentParentSku = parentSku || editingRow.value?.sku
  if (currentParentSku && code === currentParentSku) {
    editDialogSubSkuValidationErrors.value[index] = '親SKUと同じコードは使用できません'
    return
  }

  // Check for duplicates within the current list
  const duplicateIndex = editDialogSubSkus.value.findIndex((s, i) => i !== index && s.subSku === code)
  if (duplicateIndex >= 0) {
    editDialogSubSkuValidationErrors.value[index] = 'このコードは既に入力されています'
    return
  }

  // Check against database
  try {
    const excludeId = editingRow.value?._id
    const results = await checkSkuAvailability([code], excludeId)
    if (results[code] && !results[code].available) {
      const conflict = results[code]
      if (conflict.conflictType === 'mainSku') {
        editDialogSubSkuValidationErrors.value[index] = `このコードは既存商品のSKU「${conflict.conflictProductSku}」と重複しています`
      } else {
        editDialogSubSkuValidationErrors.value[index] = `このコードは商品「${conflict.conflictProductSku}」の子SKUと重複しています`
      }
    }
  } catch (error: any) {
    console.error('SKU validation error:', error)
  }
}

// Validate main SKU (for create/edit dialog)
const validateMainSkuInput = async (sku: string): Promise<string | null> => {
  const code = (sku || '').trim()
  if (!code) return null

  // Check against database
  try {
    const excludeId = editingRow.value?._id
    const results = await checkSkuAvailability([code], excludeId)
    if (results[code] && !results[code].available) {
      const conflict = results[code]
      if (conflict.conflictType === 'mainSku') {
        return `このSKUは既存商品「${conflict.conflictProductSku}」と重複しています`
      } else {
        return `このSKUは商品「${conflict.conflictProductSku}」の子SKUと重複しています`
      }
    }
  } catch (error: any) {
    console.error('SKU validation error:', error)
  }
  return null
}

const saveSubSkus = async () => {
  if (!subSkuEditingProduct.value) return

  // Check if there are any validation errors
  if (Object.keys(subSkuValidationErrors.value).length > 0) {
    ElMessage.error('入力エラーがあります。修正してください。')
    return
  }

  // Validate sub-SKUs
  const validSubSkus = tempSubSkus.value.filter((s) => s.subSku && s.subSku.trim())

  // Check for duplicates within the list
  const codes = validSubSkus.map((s) => s.subSku.trim())
  const uniqueCodes = new Set(codes)
  if (uniqueCodes.size !== codes.length) {
    ElMessage.error('子SKUコードが重複しています')
    return
  }

  // Check if any sub-SKU matches the parent SKU
  if (codes.includes(subSkuEditingProduct.value.sku)) {
    ElMessage.error('子SKUコードは親SKUと同じにできません')
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
      ElMessage.error(conflictErrors[0])
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
    ElMessage.success('子SKUを保存しました')
    subSkuDialogVisible.value = false
    await loadList()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || error?.message || '保存に失敗しました')
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
  const pickPositiveInt = (val: any) => {
    if (val === undefined || val === null || val === '') return undefined
    const n = typeof val === 'number' ? val : Number(String(val).trim())
    if (!Number.isFinite(n)) return undefined
    const i = Math.trunc(n)
    return i > 0 ? i : undefined
  }
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
    ElMessage.error(error?.message || '取得に失敗しました')
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
    ElMessage.error('子SKUに入力エラーがあります。修正してください。')
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
      ElMessage.error('子SKUコードが重複しています')
      saving.value = false
      return
    }
    const parentSku = (payload.sku || '').trim()
    if (subSkuCodes.includes(parentSku)) {
      ElMessage.error('子SKUコードは親SKUと同じにできません')
      saving.value = false
      return
    }

    // Validate main SKU uniqueness against database
    const mainSkuError = await validateMainSkuInput(parentSku)
    if (mainSkuError) {
      ElMessage.error(mainSkuError)
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
        ElMessage.error(conflictErrors[0]) // Show first error
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
      ElMessage.success('更新しました')
    } else {
      await createProduct(cleanPayload as UpsertProductDto)
      ElMessage.success('作成しました')
    }
    dialogVisible.value = false
    resetForm()
    await loadList()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || error?.message || '保存に失敗しました')
  } finally {
    saving.value = false
  }
}

const handleBulkEdit = async (payload: { columnKey: string; dataKey: string; fieldType?: string; value: any; overwrite: boolean; selectedKeys: (string | number)[]; selectedRows: Record<string, any>[] }) => {
  const { dataKey, value, selectedKeys: keys } = payload
  if (!keys || keys.length === 0) {
    ElMessage.warning('商品が選択されていません')
    return
  }
  try {
    const updates = { [dataKey]: value }
    const result = await bulkUpdateProducts(keys.map(String), updates)
    ElMessage.success(`${result.modifiedCount}件更新しました`)
    await loadList()
    selectedKeys.value = []
  } catch (error: any) {
    ElMessage.error(error?.message || '一括更新に失敗しました')
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
      ElMessage.success(messages.join('、') + 'しました')
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
      ElMessage.error(err?.message || '取り込みに失敗しました')
    }
  } finally {
    importing.value = false
  }
}

const confirmDelete = (row: Product) => {
  ElMessageBox.confirm(`「${row.name}」を削除しますか？`, '確認', {
    confirmButtonText: 'はい',
    cancelButtonText: 'いいえ',
    type: 'warning',
  })
    .then(async () => {
      await deleteProduct(row._id)
      ElMessage.success('削除しました')
      await loadList()
    })
    .catch(() => {})
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
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.page-actions {
  display: flex;
  gap: 8px;
}

.page-title {
  margin: 0;
  font-size: 20px;
}

.page-subtitle {
  margin: 6px 0 0;
  color: #666;
  font-size: 13px;
}

.table-section {
  width: 100%;
}

/* 操作列样式 - 垂直排列 */
:deep(.action-cell) {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  padding: 4px;
}

:deep(.action-cell .el-button) {
  margin: 0;
  min-width: 54px;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 13px;
  border-width: 1px;
}

:deep(.action-cell .el-button--primary.is-plain) {
  border-color: var(--el-color-primary);
}

:deep(.action-cell .el-button--info.is-plain) {
  border-color: var(--el-color-info);
}

:deep(.action-cell .el-button--danger.is-plain) {
  border-color: var(--el-color-danger);
}

.sub-sku-header {
  margin-bottom: 16px;
  padding: 12px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.sub-sku-header p {
  margin: 0 0 4px;
  font-size: 14px;
}

.sub-sku-header p:last-child {
  margin-bottom: 0;
}

.sub-sku-actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-start;
}

.sub-sku-inline-section {
  padding: 0 20px 20px;
}

.sub-sku-inline-section :deep(.el-divider__text) {
  font-weight: 600;
  color: #409eff;
  font-size: 14px;
}

/* SKU validation error styles */
.sku-error-message {
  color: #f56c6c;
  font-size: 11px;
  line-height: 1.3;
  margin-top: 2px;
  word-break: break-word;
}

:deep(.el-input.is-error .el-input__wrapper) {
  box-shadow: 0 0 0 1px #f56c6c inset;
}

.image-upload-section {
  padding: 0 20px;
}

.image-upload-section :deep(.el-divider__text) {
  font-weight: 600;
  color: #409eff;
  font-size: 14px;
}

.image-upload-content {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.image-preview {
  flex-shrink: 0;
}

.preview-img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  object-position: center;
  border-radius: 6px;
  border: 1px solid #dcdfe6;
}

.image-inputs {
  flex: 1;
  min-width: 0;
}

.image-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.upload-status {
  font-size: 12px;
  color: #909399;
}
</style>

