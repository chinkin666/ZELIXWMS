<template>
  <div class="location-settings">
    <PageHeader :title="t('wms.inventory.locationManagement', 'ロケーション管理')" :show-search="false">
      <template #actions>
        <div style="display:flex;gap:6px;">
          <Button variant="secondary" size="sm" :disabled="isSeeding" @click="handleSeed">
            {{ isSeeding ? t('wms.inventory.creating', '作成中...') : t('wms.inventory.seedData', '初期データ作成') }}
          </Button>
          <Button variant="default" size="sm" @click="openCreateDialog">
            {{ t('wms.common.create', '新規作成') }}
          </Button>
        </div>
      </template>
    </PageHeader>

    <div class="table-section">
      <DataTable
        :columns="tableColumns"
        :data="locations"
        row-key="_id"
        pagination-enabled
        pagination-mode="client"
        :page-size="20"
        :page-sizes="[20, 50, 100]"
        :global-search-text="globalSearchText"
        :search-columns="searchColumns"
        @search="handleSearch"
      />
    </div>

    <!-- Create/Edit Dialog -->
    <Dialog :open="dialogVisible" @update:open="dialogVisible = $event">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ editingId ? t('wms.inventory.editLocation', 'ロケーション編集') : t('wms.inventory.createLocation', 'ロケーション新規作成') }}</DialogTitle>
        </DialogHeader>
      <div class="dialog-form">
        <div class="form-field">
          <label>{{ t('wms.inventory.code', 'コード') }} <span class="text-destructive text-xs">*</span></label>
          <Input v-model="dialogForm.code" type="text" :placeholder="t('wms.inventory.codePlaceholder', '例: WH-MAIN/A-01')" />
        </div>
        <div class="form-field">
          <label>{{ t('wms.inventory.locationName', '名称') }} <span class="text-destructive text-xs">*</span></label>
          <Input v-model="dialogForm.name" type="text" :placeholder="t('wms.inventory.locationNamePlaceholder', '例: A棟 1列')" />
        </div>
        <div class="form-field">
          <label>{{ t('wms.inventory.locationType', 'タイプ') }} <span class="text-destructive text-xs">*</span></label>
          <Select v-model="dialogForm.type">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="warehouse">{{ t('wms.inventory.typeWarehouse', '倉庫') }}</SelectItem>
              <SelectItem value="zone">{{ t('wms.inventory.typeZone', 'ゾーン') }}</SelectItem>
              <SelectItem value="shelf">{{ t('wms.inventory.typeShelf', '棚') }}</SelectItem>
              <SelectItem value="bin">{{ t('wms.inventory.typeBin', '区画') }}</SelectItem>
              <SelectItem value="staging">{{ t('wms.inventory.typeStaging', '出荷準備') }}</SelectItem>
              <SelectItem value="receiving">{{ t('wms.inventory.typeReceiving', '入庫検品') }}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="form-field">
          <label>{{ t('wms.inventory.parentLocation', '親ロケーション') }}</label>
          <Select :model-value="dialogForm.parentId || '__none__'" @update:model-value="(v: string) => { dialogForm.parentId = v === '__none__' ? '' : v }">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{{ t('wms.inventory.noParent', 'なし（最上位）') }}</SelectItem>
              <SelectItem v-for="loc in parentCandidates" :key="loc._id" :value="loc._id">{{ loc.code }} ({{ loc.name }})</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="form-field">
          <label>{{ t('wms.inventory.temperatureZone', '温度帯') }}</label>
          <Select :model-value="dialogForm.coolType || '__none__'" @update:model-value="(v: string) => { dialogForm.coolType = v === '__none__' ? '' : v }">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{{ t('wms.inventory.notSpecified', '指定なし') }}</SelectItem>
              <SelectItem value="0">{{ t('wms.inventory.tempNormal', '常温') }}</SelectItem>
              <SelectItem value="1">{{ t('wms.inventory.tempFrozen', '冷凍') }}</SelectItem>
              <SelectItem value="2">{{ t('wms.inventory.tempChilled', '冷蔵') }}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="form-field">
          <label>{{ t('wms.inventory.sortOrder', '表示順') }}</label>
          <Input v-model.number="dialogForm.sortOrder" type="number" />
        </div>
        <div class="form-field" style="grid-column:1/-1;">
          <label>{{ t('wms.inventory.memo', 'メモ') }}</label>
          <Input v-model="dialogForm.memo" type="text" />
        </div>
      </div>
        <DialogFooter>
          <Button variant="secondary" @click="dialogVisible = false">{{ t('wms.common.cancel', 'キャンセル') }}</Button>
          <Button variant="default" :disabled="!canSaveDialog || isSaving" @click="handleSaveDialog">
            {{ isSaving ? t('wms.inventory.saving', '保存中...') : t('wms.common.save', '保存') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { computed, h, onMounted, ref } from 'vue'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import PageHeader from '@/components/shared/PageHeader.vue'
import { DataTable } from '@/components/data-table'
import {
  fetchLocations,
  createLocation,
  updateLocation,
  deleteLocation as apiDeleteLocation,
  seedLocations,
  fetchLocationUsage,
} from '@/api/location'
import type { LocationUsage } from '@/api/location'
import type { Location } from '@/types/inventory'
import type { TableColumn, Operator } from '@/types/table'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
const { confirm } = useConfirmDialog()

const toast = useToast()
const { t } = useI18n()
const isLoading = ref(false)
const isSeeding = ref(false)
const isSaving = ref(false)
const locations = ref<Location[]>([])
const globalSearchText = ref('')
const locationUsageMap = ref<Map<string, LocationUsage>>(new Map())

const dialogVisible = ref(false)
const editingId = ref<string | null>(null)
const dialogForm = ref({
  code: '',
  name: '',
  type: 'shelf' as string,
  parentId: '',
  coolType: '',
  sortOrder: 0,
  memo: '',
})

const parentCandidates = computed(() =>
  locations.value.filter(l =>
    !l.type.startsWith('virtual/') && l._id !== editingId.value,
  ),
)

const canSaveDialog = computed(() =>
  dialogForm.value.code.trim() && dialogForm.value.name.trim() && dialogForm.value.type,
)

const typeLabel = (val: string) => {
  const map: Record<string, string> = {
    warehouse: t('wms.inventory.typeWarehouse', '倉庫'),
    zone: t('wms.inventory.typeZone', 'ゾーン'),
    shelf: t('wms.inventory.typeShelf', '棚'),
    bin: t('wms.inventory.typeBin', '区画'),
    staging: t('wms.inventory.typeStaging', '出荷準備'),
    receiving: t('wms.inventory.typeReceiving', '入庫検品'),
    'virtual/supplier': t('wms.inventory.typeVirtualSupplier', '仮想:仕入先'),
    'virtual/customer': t('wms.inventory.typeVirtualCustomer', '仮想:顧客'),
  }
  return map[val] || val
}

const getIndent = (loc: Location) => {
  return loc.parentId ? 20 : 0
}

const searchColumns = computed<TableColumn[]>(() => [
  { key: 'code', dataKey: 'code', title: t('wms.inventory.code', 'コード'), width: 160, fieldType: 'string', searchable: true, searchType: 'string' },
  { key: 'name', dataKey: 'name', title: t('wms.inventory.locationName', '名称'), width: 160, fieldType: 'string', searchable: true, searchType: 'string' },
  {
    key: 'type', dataKey: 'type', title: t('wms.inventory.locationType', 'タイプ'), width: 100, fieldType: 'string',
    searchable: true, searchType: 'select',
    searchOptions: [
      { label: t('wms.inventory.typeWarehouse', '倉庫'), value: 'warehouse' },
      { label: t('wms.inventory.typeZone', 'ゾーン'), value: 'zone' },
      { label: t('wms.inventory.typeShelf', '棚'), value: 'shelf' },
      { label: t('wms.inventory.typeBin', '区画'), value: 'bin' },
      { label: t('wms.inventory.typeStaging', '出荷準備'), value: 'staging' },
      { label: t('wms.inventory.typeReceiving', '入庫検品'), value: 'receiving' },
    ],
  },
  { key: 'isActive', dataKey: 'isActive', title: t('wms.inventory.active', '有効'), width: 60, fieldType: 'boolean', searchable: true, searchType: 'boolean' },
])

const tableColumns = computed<TableColumn[]>(() => [
  {
    key: 'code', dataKey: 'code', title: t('wms.inventory.code', 'コード'), width: 160, fieldType: 'string', searchable: true, searchType: 'string',
    cellRenderer: ({ rowData }: { rowData: Location }) =>
      h('span', { class: 'location-code', style: { paddingLeft: `${getIndent(rowData)}px` } }, rowData.code),
  },
  { key: 'name', dataKey: 'name', title: t('wms.inventory.locationName', '名称'), width: 160, fieldType: 'string', searchable: true, searchType: 'string' },
  {
    key: 'type', dataKey: 'type', title: t('wms.inventory.locationType', 'タイプ'), width: 100, fieldType: 'string',
    searchable: true, searchType: 'select',
    searchOptions: [
      { label: t('wms.inventory.typeWarehouse', '倉庫'), value: 'warehouse' },
      { label: t('wms.inventory.typeZone', 'ゾーン'), value: 'zone' },
      { label: t('wms.inventory.typeShelf', '棚'), value: 'shelf' },
      { label: t('wms.inventory.typeBin', '区画'), value: 'bin' },
      { label: t('wms.inventory.typeStaging', '出荷準備'), value: 'staging' },
      { label: t('wms.inventory.typeReceiving', '入庫検品'), value: 'receiving' },
    ],
    cellRenderer: ({ rowData }: { rowData: Location }) =>
      h('span', { class: `type-badge type--${rowData.type.replace('/', '-')}` }, typeLabel(rowData.type)),
  },
  {
    key: 'stockType', dataKey: 'stockType', title: t('wms.inventory.stockType', '在庫区分'), width: 100, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: Location }) => (rowData as any).stockType ?? '-',
  },
  {
    key: 'fullPath', dataKey: 'fullPath', title: t('wms.inventory.fullPath', 'フルパス'), width: 250, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: Location }) => h('span', { class: 'text-muted' }, rowData.fullPath),
  },
  {
    key: 'coolType', dataKey: 'coolType', title: t('wms.inventory.temperatureZone', '温度帯'), width: 80, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: Location }) => {
      if (rowData.coolType === '1') return h('span', { style: 'color:#409eff;' }, t('wms.inventory.tempFrozen', '冷凍'))
      if (rowData.coolType === '2') return h('span', { style: 'color:#67c23a;' }, t('wms.inventory.tempChilled', '冷蔵'))
      return '-'
    },
  },
  {
    key: 'warehouseName', title: t('wms.inventory.warehouseName', '倉庫'), width: 120, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: Location }) => {
      const wh = (rowData as any).warehouseName ?? (rowData as any).warehouse?.name
      return wh ?? '-'
    },
  },
  {
    key: 'isActive', dataKey: 'isActive', title: t('wms.inventory.active', '有効'), width: 60, fieldType: 'boolean', searchable: true, searchType: 'boolean',
    cellRenderer: ({ rowData }: { rowData: Location }) =>
      h('span', { style: { color: rowData.isActive ? '#67c23a' : '#f56c6c' } }, rowData.isActive ? t('wms.inventory.activeYes', '有効') : t('wms.inventory.activeNo', '無効')),
  },
  { key: 'sortOrder', dataKey: 'sortOrder', title: t('wms.inventory.sortOrder', '順序'), width: 60, fieldType: 'number', align: 'right' as const },
  {
    key: 'memo', dataKey: 'memo', title: t('wms.inventory.memo', 'メモ'), width: 200, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: Location }) => rowData.memo || '-',
  },
  {
    key: 'usageStatus', dataKey: 'usageStatus', title: t('wms.inventory.usageStatus', '使用状況'), width: 150, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: Location }) => {
      const usage = locationUsageMap.value.get(rowData._id)
      const skuCount = usage?.skuCount ?? 0
      const totalQty = usage?.totalQuantity ?? 0
      const isActive = rowData.isActive

      // 色分け: 無効→赤、在庫あり→緑、空→灰色
      // 颜色: 无效→红、有库存→绿、空→灰
      const color = !isActive ? '#f56c6c' : skuCount > 0 ? '#67c23a' : '#909399'
      const bgColor = !isActive ? '#fef0f0' : skuCount > 0 ? '#e1f3d8' : '#f4f4f5'

      const label = !isActive
        ? t('wms.inventory.activeNo', '無効')
        : skuCount > 0
          ? `${skuCount} SKU / ${totalQty} ${t('wms.inventory.pcs', '個')}`
          : t('wms.inventory.empty', '空')

      return h('span', {
        class: 'usage-badge',
        style: { color, background: bgColor, padding: '2px 8px', borderRadius: '3px', fontSize: '12px', fontWeight: '500' },
      }, label)
    },
  },
  {
    key: 'actions', title: t('wms.common.actions', '操作'), width: 120, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: Location }) =>
      h('div', { style: 'display:inline-flex;gap:4px;' }, [
        h(Button, { variant: 'default', size: 'sm', onClick: () => openEditDialog(rowData) }, () => t('wms.common.edit', '編集')),
        h(Button, {
          variant: 'destructive', size: 'sm',
          disabled: rowData.type.startsWith('virtual/'),
          onClick: () => handleDelete(rowData),
        }, () => t('wms.common.delete', '削除')),
      ]),
  },
])

const handleSearch = (payload: Record<string, { operator: Operator; value: any }>) => {
  if (payload.__global?.value) {
    globalSearchText.value = String(payload.__global.value).trim()
    delete payload.__global
  } else {
    globalSearchText.value = ''
  }
}

const loadLocations = async () => {
  isLoading.value = true
  try {
    // ロケーション一覧と使用状況を並行取得 / 并行获取位置列表和使用情况
    const [locs, usageList] = await Promise.all([
      fetchLocations(),
      fetchLocationUsage().catch(() => [] as LocationUsage[]),
    ])
    locations.value = locs

    const newMap = new Map<string, LocationUsage>()
    for (const u of usageList) {
      newMap.set(u.locationId, u)
    }
    locationUsageMap.value = newMap
  } catch (e: any) {
    toast.showError(e?.message || t('wms.inventory.locationFetchFailed', 'ロケーションの取得に失敗しました'))
  } finally {
    isLoading.value = false
  }
}

const handleSeed = async () => {
  isSeeding.value = true
  try {
    const result = await seedLocations()
    toast.showSuccess(result.message)
    await loadLocations()
  } catch (e: any) {
    toast.showError(e?.message || t('wms.inventory.seedFailed', '初期データ作成に失敗しました'))
  } finally {
    isSeeding.value = false
  }
}

const openCreateDialog = () => {
  editingId.value = null
  dialogForm.value = { code: '', name: '', type: 'shelf', parentId: '', coolType: '', sortOrder: 0, memo: '' }
  dialogVisible.value = true
}

const openEditDialog = (loc: Location) => {
  editingId.value = loc._id
  dialogForm.value = {
    code: loc.code,
    name: loc.name,
    type: loc.type,
    parentId: loc.parentId || '',
    coolType: loc.coolType || '',
    sortOrder: loc.sortOrder,
    memo: loc.memo || '',
  }
  dialogVisible.value = true
}

const handleSaveDialog = async () => {
  if (!canSaveDialog.value) return
  isSaving.value = true
  try {
    const data = {
      code: dialogForm.value.code.trim(),
      name: dialogForm.value.name.trim(),
      type: dialogForm.value.type,
      parentId: dialogForm.value.parentId || undefined,
      coolType: dialogForm.value.coolType || undefined,
      sortOrder: dialogForm.value.sortOrder,
      memo: dialogForm.value.memo || undefined,
    }

    if (editingId.value) {
      await updateLocation(editingId.value, data as any)
      toast.showSuccess(t('wms.inventory.locationUpdated', 'ロケーションを更新しました'))
    } else {
      await createLocation(data as any)
      toast.showSuccess(t('wms.inventory.locationCreated', 'ロケーションを作成しました'))
    }

    dialogVisible.value = false
    await loadLocations()
  } catch (e: any) {
    toast.showError(e?.message || t('wms.inventory.saveFailed', '保存に失敗しました'))
  } finally {
    isSaving.value = false
  }
}

const handleDelete = async (loc: Location) => {
  if (!(await confirm('この操作を実行しますか？'))) return
  try {
    await apiDeleteLocation(loc._id)
    toast.showSuccess(t('wms.inventory.locationDeleted', 'ロケーションを削除しました'))
    await loadLocations()
  } catch (e: any) {
    toast.showError(e?.message || t('wms.inventory.deleteFailed', '削除に失敗しました'))
  }
}

onMounted(() => loadLocations())
</script>

<style scoped>
.location-settings {
  display: flex;
  flex-direction: column;
  padding: 0 20px 20px;
  gap: 16px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

.table-section {
  width: 100%;
}

.location-code {
  font-family: monospace;
  font-weight: 600;
  color: var(--o-brand-primary, #714b67);
}

.type-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 500;
  background: var(--o-gray-100, #f5f7fa);
  color: var(--o-gray-600, #606266);
}

.type--warehouse { background: #d9ecff; color: #409eff; }
.type--zone { background: #e1f3d8; color: #67c23a; }
.type--shelf { background: #fdf6ec; color: #e6a23c; }
.type--bin { background: #f4f4f5; color: #909399; }
.type--staging { background: #fef0f0; color: #f56c6c; }
.type--receiving { background: #ecf5ff; color: #409eff; }
.type--virtual-supplier { background: #f4f4f5; color: #909399; font-style: italic; }
.type--virtual-customer { background: #f4f4f5; color: #909399; font-style: italic; }

.text-muted { color: var(--o-gray-500, #909399); font-size: 12px; }

.dialog-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  padding: 1rem 0;
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

.required-badge { display:inline-block;background:#dc3545;color:#fff;font-size:10px;font-weight:700;line-height:1;padding:2px 5px;border-radius:3px;white-space:nowrap;vertical-align:middle;margin-left:4px; }

.{
  padding: 8px 12px;
  border: 1px solid var(--o-border-color, #dcdfe6);
  border-radius: var(--o-border-radius, 4px);
  font-size: 14px;
  color: var(--o-gray-700, #303133);
  background: var(--o-view-background, #fff);
  width: 100%;
}

:deep(.action-cell) {
  display: flex;
  gap: 4px;
}
</style>
