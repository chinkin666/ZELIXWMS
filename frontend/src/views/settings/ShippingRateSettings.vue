<template>
  <div class="shipping-rate-settings">
    <PageHeader title="運賃率表" :show-search="false">
      <template #actions>
        <Button variant="default" @click="openCreate"><span>+</span> 新規追加</Button>
      </template>
    </PageHeader>

    <div class="table-section">
      <DataTable
        :columns="tableColumns"
        :data="list"
        row-key="_id"
        :search-columns="searchColumns"
        @search="handleSearch"
        pagination-enabled
        pagination-mode="server"
        :page-size="pageSize"
        :page-sizes="[10, 20, 50]"
        :total="total"
        :current-page="currentPage"
        @page-change="handlePageChangeEvent"
      />
    </div>

    <!-- 作成/編集ダイアログ / 创建/编辑对话框 -->
    <Dialog :open="dialogVisible" @update:open="dialogVisible = $event">
      <DialogContent>
        <DialogHeader><DialogTitle>{{ isEditing ? '運賃率表を編集' : '運賃率表を追加' }}</DialogTitle></DialogHeader>
      
        <form class="rate-form" @submit.prevent="handleSubmit">
          <div class="form-row">
            <label>プラン名 <span class="text-destructive text-xs">*</span></label>
            <Input v-model="form.name" required placeholder="例: ヤマト 関東→関東 60サイズ" />
          </div>
          <div class="form-row">
            <label>配送業者ID <span class="text-destructive text-xs">*</span></label>
            <Input v-model="form.carrierId" required />
          </div>
          <div class="form-row">
            <label>配送業者名（表示用）</label>
            <Input v-model="form.carrierName" placeholder="例: ヤマト運輸" />
          </div>

          <div class="form-section-title">サイズ条件 / 尺寸条件</div>
          <div class="form-row-inline">
            <div class="form-row">
              <label>種別</label>
              <Select v-model="form.sizeType">
        <SelectTrigger class="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
        <SelectItem value="flat">一律</SelectItem>
        <SelectItem value="weight">重量ベース</SelectItem>
        <SelectItem value="dimension">才数ベース</SelectItem>
        </SelectContent>
      </Select>
            </div>
            <div class="form-row" v-if="form.sizeType !== 'flat'">
              <label>最小値</label>
              <Input type="number" v-model.number="form.sizeMin" min="0" step="0.1" />
            </div>
            <div class="form-row" v-if="form.sizeType !== 'flat'">
              <label>最大値</label>
              <Input type="number" v-model.number="form.sizeMax" min="0" step="0.1" />
            </div>
          </div>

          <div class="form-section-title">料金 / 费用</div>
          <div class="form-row-inline">
            <div class="form-row">
              <label>基本料金 <span class="text-destructive text-xs">*</span></label>
              <Input type="number" v-model.number="form.basePrice" required min="0" />
            </div>
            <div class="form-row">
              <label>クール便追加</label>
              <Input type="number" v-model.number="form.coolSurcharge" min="0" />
            </div>
            <div class="form-row">
              <label>代引手数料</label>
              <Input type="number" v-model.number="form.codSurcharge" min="0" />
            </div>
            <div class="form-row">
              <label>燃油サーチャージ</label>
              <Input type="number" v-model.number="form.fuelSurcharge" min="0" />
            </div>
          </div>

          <div class="form-section-title">有効期間 / 有效期间</div>
          <div class="form-row-inline">
            <div class="form-row">
              <label>開始日</label>
              <Input type="date" v-model="form.validFrom" />
            </div>
            <div class="form-row">
              <label>終了日</label>
              <Input type="date" v-model="form.validTo" />
            </div>
          </div>

          <div class="form-row">
            <label>備考</label>
            <Textarea v-model="form.memo" rows="2" />
          </div>

          <div class="form-actions">
            <Button variant="secondary" type="button" @click="closeDialog">キャンセル</Button>
            <Button variant="default" type="submit" :disabled="saving">
              {{ saving ? '保存中...' : '保存' }}
            </Button>
          </div>
        </form>
    </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/shared/PageHeader.vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DataTable } from '@/components/data-table'
import type { TableColumn, Operator } from '@/types/table'
import {
  fetchShippingRates,
  createShippingRate,
  updateShippingRate,
  deleteShippingRate,
} from '@/api/shippingRate'
import type { ShippingRateData } from '@/api/shippingRate'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { computed, h, onMounted, ref } from 'vue'
import { Badge } from '@/components/ui/badge'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
const { confirm } = useConfirmDialog()
const { show: showToast } = useToast()
const { t } = useI18n()

// ---------------------------------------------------------------------------
// State / 状態管理
// ---------------------------------------------------------------------------
const list = ref<ShippingRateData[]>([])
const total = ref(0)
const loading = ref(false)
const saving = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const globalSearchText = ref('')

const dialogVisible = ref(false)
const editingId = ref<string | null>(null)

const emptyForm = () => ({
  name: '',
  carrierId: '',
  carrierName: '',
  sizeType: 'flat' as 'weight' | 'dimension' | 'flat',
  sizeMin: undefined as number | undefined,
  sizeMax: undefined as number | undefined,
  basePrice: 0,
  coolSurcharge: 0,
  codSurcharge: 0,
  fuelSurcharge: 0,
  validFrom: '',
  validTo: '',
  memo: '',
})

const form = ref(emptyForm())

// ---------------------------------------------------------------------------
// サイズ種別ラベル / 尺寸类型标签
// ---------------------------------------------------------------------------
const sizeTypeLabel = (type: string): string => {
  const map: Record<string, string> = {
    flat: '一律',
    weight: '重量',
    dimension: '才数',
  }
  return map[type] || type
}

// ---------------------------------------------------------------------------
// Search & Table columns / 搜索和表格列定义
// ---------------------------------------------------------------------------
const baseColumns: TableColumn[] = [
  {
    key: 'name',
    dataKey: 'name',
    title: 'プラン名',
    width: 220,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'carrierName',
    dataKey: 'carrierName',
    title: '配送業者',
    width: 140,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'sizeType',
    dataKey: 'sizeType',
    title: '種別',
    width: 80,
    fieldType: 'string',
  },
  {
    key: 'basePrice',
    dataKey: 'basePrice',
    title: '基本料金',
    width: 100,
    fieldType: 'number',
  },
  {
    key: 'coolSurcharge',
    dataKey: 'coolSurcharge',
    title: 'クール',
    width: 80,
    fieldType: 'number',
  },
  {
    key: 'codSurcharge',
    dataKey: 'codSurcharge',
    title: '代引',
    width: 80,
    fieldType: 'number',
  },
  {
    key: 'fuelSurcharge',
    dataKey: 'fuelSurcharge',
    title: '燃油',
    width: 80,
    fieldType: 'number',
  },
  {
    key: 'sizeMin',
    dataKey: 'sizeMin',
    title: 'サイズ下限',
    width: 90,
    fieldType: 'number',
  },
  {
    key: 'sizeMax',
    dataKey: 'sizeMax',
    title: 'サイズ上限',
    width: 90,
    fieldType: 'number',
  },
  {
    key: 'validFrom',
    dataKey: 'validFrom',
    title: '有効開始',
    width: 110,
    fieldType: 'string',
  },
  {
    key: 'validTo',
    dataKey: 'validTo',
    title: '有効終了',
    width: 110,
    fieldType: 'string',
  },
  {
    key: 'memo',
    dataKey: 'memo',
    title: 'メモ',
    width: 150,
    fieldType: 'string',
  },
  {
    key: 'isActive',
    dataKey: 'isActive',
    title: '有効',
    width: 70,
    fieldType: 'boolean',
    searchable: true,
    searchType: 'boolean',
  },
]

const searchColumns: TableColumn[] = baseColumns.filter((c) => c.searchable)

const tableColumns: TableColumn[] = [
  ...baseColumns.map((col) => {
    if (col.key === 'sizeType') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: ShippingRateData }) => sizeTypeLabel(rowData.sizeType),
      }
    }
    if (col.key === 'basePrice' || col.key === 'coolSurcharge' || col.key === 'codSurcharge' || col.key === 'fuelSurcharge') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: ShippingRateData }) => {
          const value = (rowData as any)[col.dataKey || col.key]
          return value !== undefined && value !== null ? `\u00A5${Number(value).toLocaleString()}` : '-'
        },
      }
    }
    if (col.key === 'isActive') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: ShippingRateData }) =>
          h(
            'span',
            { class: rowData.isActive ? 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800' : 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800' },
            rowData.isActive ? '有効' : '無効',
          ),
      }
    }
    if (col.key === 'carrierName') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: ShippingRateData }) => rowData.carrierName || rowData.carrierId || '-',
      }
    }
    return col
  }),
  {
    key: 'actions',
    title: t('wms.common.actions', '操作'),
    width: 160,
    cellRenderer: ({ rowData }: { rowData: ShippingRateData }) =>
      h('div', { class: 'action-cell' }, [
        h(Button, { variant: 'default', size: 'sm', onClick: () => openEdit(rowData) }, () => '編集'),
        h(Button, { variant: 'destructive', size: 'sm', onClick: () => confirmDelete(rowData) }, () => '削除'),
      ]),
  },
]

// ---------------------------------------------------------------------------
// Computed
// ---------------------------------------------------------------------------
const isEditing = computed(() => editingId.value !== null)

// ---------------------------------------------------------------------------
// Search handler / 搜索处理
// ---------------------------------------------------------------------------
const currentSearchText = ref('')

const handleSearch = (payload: Record<string, { operator: Operator; value: any }>) => {
  if (payload.__global?.value) {
    globalSearchText.value = String(payload.__global.value).trim()
    delete payload.__global
  } else {
    globalSearchText.value = ''
  }

  const parts: string[] = []
  if (payload.name?.value) parts.push(String(payload.name.value).trim())
  if (payload.carrierName?.value) parts.push(String(payload.carrierName.value).trim())

  currentSearchText.value = parts.join(' ')
  currentPage.value = 1
  loadList()
}

// ---------------------------------------------------------------------------
// Data loading / 数据加载
// ---------------------------------------------------------------------------
const loadList = async () => {
  loading.value = true
  try {
    const result = await fetchShippingRates({
      search: currentSearchText.value || undefined,
      page: currentPage.value,
      limit: pageSize.value,
    })
    list.value = result.data
    total.value = result.total
  } catch (error: any) {
    showToast(error?.message || '取得に失敗しました', 'danger')
  } finally {
    loading.value = false
  }
}

// ---------------------------------------------------------------------------
// Pagination / 分页
// ---------------------------------------------------------------------------
const handlePageChangeEvent = (payload: { page: number; pageSize: number }) => {
  currentPage.value = payload.page
  pageSize.value = payload.pageSize
  loadList()
}

// ---------------------------------------------------------------------------
// Dialog / 对话框
// ---------------------------------------------------------------------------
const openCreate = () => {
  editingId.value = null
  form.value = emptyForm()
  dialogVisible.value = true
}

const openEdit = (item: ShippingRateData) => {
  editingId.value = item._id
  form.value = {
    name: item.name,
    carrierId: item.carrierId,
    carrierName: item.carrierName || '',
    sizeType: item.sizeType,
    sizeMin: item.sizeMin,
    sizeMax: item.sizeMax,
    basePrice: item.basePrice,
    coolSurcharge: item.coolSurcharge,
    codSurcharge: item.codSurcharge,
    fuelSurcharge: item.fuelSurcharge,
    validFrom: item.validFrom ? item.validFrom.slice(0, 10) : '',
    validTo: item.validTo ? item.validTo.slice(0, 10) : '',
    memo: item.memo || '',
  }
  dialogVisible.value = true
}

const closeDialog = () => {
  dialogVisible.value = false
  editingId.value = null
  form.value = emptyForm()
}

const handleSubmit = async () => {
  saving.value = true
  try {
    const payload: Record<string, unknown> = {
      name: form.value.name.trim(),
      carrierId: form.value.carrierId.trim(),
      carrierName: form.value.carrierName.trim() || undefined,
      sizeType: form.value.sizeType,
      sizeMin: form.value.sizeType !== 'flat' ? form.value.sizeMin : undefined,
      sizeMax: form.value.sizeType !== 'flat' ? form.value.sizeMax : undefined,
      basePrice: form.value.basePrice,
      coolSurcharge: form.value.coolSurcharge,
      codSurcharge: form.value.codSurcharge,
      fuelSurcharge: form.value.fuelSurcharge,
      validFrom: form.value.validFrom || undefined,
      validTo: form.value.validTo || undefined,
      memo: form.value.memo.trim() || undefined,
    }

    if (editingId.value) {
      await updateShippingRate(editingId.value, payload as Partial<ShippingRateData>)
      showToast('更新しました', 'success')
    } else {
      await createShippingRate(payload as Partial<ShippingRateData>)
      showToast('作成しました', 'success')
    }
    closeDialog()
    await loadList()
  } catch (error: any) {
    showToast(error?.message || '保存に失敗しました', 'danger')
  } finally {
    saving.value = false
  }
}

// ---------------------------------------------------------------------------
// Delete / 删除
// ---------------------------------------------------------------------------
const confirmDelete = async (item: ShippingRateData) => {
  if (!(await confirm('この操作を実行しますか？'))) return
  try {
    await deleteShippingRate(item._id)
    showToast('無効にしました', 'success')
    await loadList()
  } catch (error: any) {
    showToast(error?.message || '削除に失敗しました', 'danger')
  }
}

// ---------------------------------------------------------------------------
// Init / 初始化
// ---------------------------------------------------------------------------
onMounted(() => {
  loadList()
})
</script>

<style>
@import '@/styles/order-table.css';

</style>

<style scoped>
.shipping-rate-settings {
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

:deep(.action-cell) {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* フォーム / 表单 */
.rate-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 0;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.form-row-inline {
  display: flex;
  gap: 12px;
}

.form-section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--o-gray-600, #606266);
  border-bottom: 1px solid var(--o-border-color, #dcdfe6);
  padding-bottom: 4px;
  margin-top: 4px;
}

.form-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--o-gray-700, #303133);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}
</style>
