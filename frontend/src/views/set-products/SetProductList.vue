<template>
  <div class="set-product-list">
    <ControlPanel :title="t('wms.setProduct.list', 'セット組一覧')" :show-search="false">
      <template #actions>
        <div style="display:flex;gap:6px;">
          <OButton variant="secondary" size="sm" @click="exportCsv">{{ t('wms.setProduct.csvExport', 'CSVエクスポート') }}</OButton>
          <OButton variant="primary" size="sm" @click="openCreateDialog">{{ t('wms.common.create', '新規作成') }}</OButton>
        </div>
      </template>
    </ControlPanel>

    <SearchForm
      class="search-section"
      :columns="searchColumns"
      :show-save="false"
      storage-key="setProductListSearch"
      @search="handleSearch"
    />

    <div class="table-section">
      <Table
        :columns="tableColumns"
        :data="filtered"
        row-key="_id"
        pagination-enabled
        pagination-mode="client"
        :global-search-text="globalSearchText"
      />
    </div>

    <!-- Create/Edit Dialog -->
    <ODialog v-model="dialogVisible" :title="editingId ? t('wms.setProduct.editTitle', 'セット組編集') : t('wms.setProduct.createTitle', 'セット組新規作成')" size="lg">
      <div class="dialog-form">
        <div class="form-field">
          <label class="form-label">{{ t('wms.setProduct.sku', '品番') }} <span class="req">{{ t('wms.setProduct.required', '必須') }}</span></label>
          <input v-model="form.sku" type="text" class="o-input" :placeholder="t('wms.setProduct.setSkuPlaceholder', 'セット組品番')" />
        </div>
        <div class="form-field">
          <label class="form-label">{{ t('wms.setProduct.name', '名称') }} <span class="req">{{ t('wms.setProduct.required', '必須') }}</span></label>
          <input v-model="form.name" type="text" class="o-input" :placeholder="t('wms.setProduct.setNamePlaceholder', 'セット組名称')" />
        </div>
        <div class="form-field">
          <label class="form-label">{{ t('wms.setProduct.memo', 'メモ') }}</label>
          <textarea v-model="form.memo" class="o-input" rows="2" />
        </div>

        <div class="form-field">
          <label class="form-label">{{ t('wms.setProduct.components', '構成品') }} <span class="req">{{ t('wms.setProduct.required', '必須') }}</span></label>
          <table class="comp-table">
            <thead>
              <tr>
                <th>{{ t('wms.setProduct.product', '商品') }}</th>
                <th style="width:80px;">{{ t('wms.setProduct.quantity', '数量') }}</th>
                <th style="width:40px;"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(comp, idx) in form.components" :key="idx">
                <td>
                  <select
                    class="o-input"
                    :value="comp.productId"
                    @change="onComponentProductChange(idx, ($event.target as HTMLSelectElement).value)"
                  >
                    <option value="">{{ t('wms.setProduct.selectProduct', '商品を選択...') }}</option>
                    <option v-for="p in productOptions" :key="p._id" :value="p._id">
                      {{ p.sku }} - {{ p.name }}
                    </option>
                  </select>
                </td>
                <td>
                  <input
                    class="o-input"
                    type="number"
                    :value="comp.quantity"
                    min="1"
                    @input="(e: Event) => comp.quantity = Number((e.target as HTMLInputElement).value) || 1"
                    style="width:70px;"
                  />
                </td>
                <td style="text-align:center;">
                  <button class="remove-btn" @click="removeComponent(idx)">&times;</button>
                </td>
              </tr>
            </tbody>
          </table>
          <button class="add-comp-btn" @click="addComponent">{{ t('wms.setProduct.addComponent', '+ 構成品を追加') }}</button>
        </div>
      </div>
      <template #footer>
        <OButton variant="secondary" @click="dialogVisible = false">{{ t('wms.common.cancel', 'キャンセル') }}</OButton>
        <OButton variant="primary" :disabled="isSaving" @click="handleSave">
          {{ isSaving ? t('wms.setProduct.saving', '保存中...') : t('wms.common.save', '保存') }}
        </OButton>
      </template>
    </ODialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h, onMounted } from 'vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import OButton from '@/components/odoo/OButton.vue'
import ODialog from '@/components/odoo/ODialog.vue'
import SearchForm from '@/components/search/SearchForm.vue'
import Table from '@/components/table/Table.vue'
import type { TableColumn, Operator } from '@/types/table'
import { fetchSetProducts, createSetProduct, updateSetProduct, deleteSetProduct } from '@/api/setProduct'
import { fetchProducts } from '@/api/product'
import type { SetProduct } from '@/types/setProduct'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()
const toast = useToast()

const items = ref<SetProduct[]>([])
const isLoading = ref(false)
const globalSearchText = ref('')

const productOptions = ref<Array<{ _id: string; sku: string; name: string }>>([])

const filtered = computed(() => {
  if (!globalSearchText.value.trim()) return items.value
  const q = globalSearchText.value.trim().toLowerCase()
  return items.value.filter(
    (s) => s.sku.toLowerCase().includes(q) || s.name.toLowerCase().includes(q),
  )
})

// Dialog
const dialogVisible = ref(false)
const editingId = ref<string | null>(null)
const isSaving = ref(false)

interface FormComponent {
  productId: string
  sku: string
  name: string
  quantity: number
}

const form = ref({
  sku: '',
  name: '',
  memo: '',
  components: [] as FormComponent[],
})

// Column definitions
const baseColumns = computed<TableColumn[]>(() => [
  {
    key: 'sku',
    dataKey: 'sku',
    title: t('wms.setProduct.sku', '品番'),
    width: 140,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
    cellRenderer: ({ rowData }: { rowData: SetProduct }) =>
      h('strong', null, rowData.sku),
  },
  {
    key: 'name',
    dataKey: 'name',
    title: t('wms.setProduct.name', '名称'),
    width: 180,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
    cellRenderer: ({ rowData }: { rowData: SetProduct }) => rowData.name,
  },
  {
    key: 'components',
    title: t('wms.setProduct.components', '構成品'),
    width: 300,
    cellRenderer: ({ rowData }: { rowData: SetProduct }) =>
      h('div', { class: 'component-tags' },
        rowData.components.map((c, i) =>
          h('span', { key: i, class: 'comp-tag' }, `${c.sku} x${c.quantity}`),
        ),
      ),
  },
  {
    key: 'isActive',
    dataKey: 'isActive',
    title: t('wms.setProduct.state', '状態'),
    width: 80,
    fieldType: 'boolean',
    cellRenderer: ({ rowData }: { rowData: SetProduct }) =>
      h(
        'span',
        { class: rowData.isActive ? 'o-status-tag o-status-tag--confirmed' : 'o-status-tag o-status-tag--inactive' },
        rowData.isActive ? t('wms.setProduct.active', '有効') : t('wms.setProduct.inactive', '無効'),
      ),
  },
])

const searchColumns = computed<TableColumn[]>(() => baseColumns.value.filter((c) => c.searchable))

const tableColumns = computed<TableColumn[]>(() => [
  ...baseColumns.value,
  {
    key: 'actions',
    title: t('wms.common.actions', '操作'),
    width: 160,
    cellRenderer: ({ rowData }: { rowData: SetProduct }) =>
      h('div', { class: 'action-cell' }, [
        h(OButton, { variant: 'primary', size: 'sm', onClick: () => openEditDialog(rowData) }, () => t('wms.common.edit', '編集')),
        h(OButton, { variant: 'icon-danger', size: 'sm', onClick: () => handleDelete(rowData) }, () => t('wms.common.delete', '削除')),
      ]),
  },
])

// Search handler
const handleSearch = (payload: Record<string, { operator: Operator; value: any }>) => {
  if (payload.__global?.value) {
    globalSearchText.value = String(payload.__global.value).trim()
  } else {
    globalSearchText.value = ''
  }
}

function openCreateDialog() {
  editingId.value = null
  form.value = { sku: '', name: '', memo: '', components: [{ productId: '', sku: '', name: '', quantity: 1 }] }
  dialogVisible.value = true
}

function openEditDialog(item: SetProduct) {
  editingId.value = item._id
  form.value = {
    sku: item.sku,
    name: item.name,
    memo: item.memo || '',
    components: item.components.map((c) => ({ ...c })),
  }
  dialogVisible.value = true
}

function addComponent() {
  form.value = {
    ...form.value,
    components: [...form.value.components, { productId: '', sku: '', name: '', quantity: 1 }],
  }
}

function removeComponent(idx: number) {
  form.value = {
    ...form.value,
    components: form.value.components.filter((_, i) => i !== idx),
  }
}

function onComponentProductChange(idx: number, productId: string) {
  const product = productOptions.value.find((p) => p._id === productId)
  const updated = form.value.components.map((c, i) =>
    i === idx
      ? { ...c, productId, sku: product?.sku || '', name: product?.name || '' }
      : c,
  )
  form.value = { ...form.value, components: updated }
}

async function handleSave() {
  if (!form.value.sku.trim() || !form.value.name.trim()) {
    toast.showWarning(t('wms.setProduct.skuNameRequired', '品番と名称は必須です'))
    return
  }
  const validComponents = form.value.components.filter((c) => c.productId)
  if (validComponents.length === 0) {
    toast.showWarning(t('wms.setProduct.componentsRequired', '構成品は1つ以上必要です'))
    return
  }

  isSaving.value = true
  try {
    const payload = {
      sku: form.value.sku.trim(),
      name: form.value.name.trim(),
      memo: form.value.memo.trim() || undefined,
      components: validComponents.map((c) => ({
        productId: c.productId,
        sku: c.sku,
        name: c.name,
        quantity: c.quantity,
      })),
    }

    if (editingId.value) {
      await updateSetProduct(editingId.value, payload)
      toast.showSuccess(t('wms.setProduct.updated', '更新しました'))
    } else {
      await createSetProduct(payload)
      toast.showSuccess(t('wms.setProduct.created', '作成しました'))
    }
    dialogVisible.value = false
    await loadData()
  } catch (e: any) {
    toast.showError(e.message || t('wms.setProduct.saveFailed', '保存に失敗しました'))
  } finally {
    isSaving.value = false
  }
}

async function handleDelete(item: SetProduct) {
  if (!confirm(t('wms.setProduct.deleteConfirm', `セット組「${item.sku}」を削除しますか？`))) return
  try {
    await deleteSetProduct(item._id)
    toast.showSuccess(t('wms.setProduct.deleted', '削除しました'))
    await loadData()
  } catch (e: any) {
    toast.showError(e.message || t('wms.setProduct.deleteFailed', '削除に失敗しました'))
  }
}

function exportCsv() {
  const rows: string[] = [
    [
      t('wms.setProduct.sku', '品番'),
      t('wms.setProduct.name', '名称'),
      t('wms.setProduct.componentSku', '構成品SKU'),
      t('wms.setProduct.componentName', '構成品名'),
      t('wms.setProduct.quantity', '数量'),
    ].join(','),
  ]
  for (const item of filtered.value) {
    for (const c of item.components) {
      rows.push(`"${item.sku}","${item.name}","${c.sku}","${c.name}",${c.quantity}`)
    }
  }
  const bom = '\uFEFF'
  const blob = new Blob([bom + rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `set_products_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

async function loadData() {
  isLoading.value = true
  try {
    items.value = await fetchSetProducts()
  } catch (e: any) {
    toast.showError(t('wms.setProduct.fetchFailed', 'セット組の取得に失敗しました'))
  } finally {
    isLoading.value = false
  }
}

async function loadProducts() {
  try {
    const all = await fetchProducts()
    productOptions.value = all.map((p) => ({ _id: p._id, sku: p.sku, name: p.name }))
  } catch {
    // silent
  }
}

onMounted(() => {
  loadData()
  loadProducts()
})
</script>

<style scoped>
.set-product-list {
  padding: 0 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

.table-section {
  width: 100%;
}

/* Component tags (set-product specific) */
:deep(.component-tags) { display: flex; flex-wrap: wrap; gap: 4px; }
:deep(.comp-tag) { display: inline-block; padding: 2px 8px; background: var(--o-success-bg, #f0f9eb); color: var(--o-success, #67c23a); border-radius: 4px; font-size: 12px; font-weight: 500; }

/* Inactive status tag */
:deep(.o-status-tag--inactive) { background: var(--o-gray-200, #f5f5f5); color: var(--o-gray-500, #909399); }

:deep(.action-cell) {
  display: inline-flex;
  gap: 4px;
}

/* Dialog form */
.dialog-form { display: flex; flex-direction: column; gap: 14px; padding: 4px 0; }
.form-field { display: flex; flex-direction: column; gap: 4px; }
.form-label { font-size: 13px; font-weight: 600; color: var(--o-gray-600, #606266); }
.req { color: var(--o-danger, #C0392B); font-size: 11px; }

/* Component composition table inside dialog */
.comp-table { width: 100%; border-collapse: collapse; }
.comp-table th { padding: 6px 8px; font-size: 12px; font-weight: 600; text-align: left; border-bottom: 2px solid var(--o-border-color, #d6d6d6); color: var(--o-gray-600, #606266); }
.comp-table td { padding: 4px 6px; border-bottom: 1px solid var(--o-border-color-light, #ebeef5); }
.remove-btn { background: none; border: none; color: var(--o-danger, #f56c6c); cursor: pointer; font-size: 18px; line-height: 1; }
.remove-btn:hover { color: var(--o-danger, #C0392B); }
.add-comp-btn { width: 100%; padding: 6px; background: none; border: 1px dashed var(--o-gray-500, #999); border-radius: 4px; color: var(--o-brand-primary, #714b67); font-size: 13px; cursor: pointer; margin-top: 6px; }
.add-comp-btn:hover { border-color: var(--o-brand-primary, #714b67); background: color-mix(in srgb, var(--o-brand-primary, #714b67) 4%, transparent); }
</style>
