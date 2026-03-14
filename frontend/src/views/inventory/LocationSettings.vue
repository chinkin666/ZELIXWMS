<template>
  <div class="location-settings">
    <ControlPanel :title="t('wms.inventory.locationManagement', 'ロケーション管理')" :show-search="false">
      <template #actions>
        <div style="display:flex;gap:6px;">
          <OButton variant="secondary" size="sm" :disabled="isSeeding" @click="handleSeed">
            {{ isSeeding ? t('wms.inventory.creating', '作成中...') : t('wms.inventory.seedData', '初期データ作成') }}
          </OButton>
          <OButton variant="primary" size="sm" @click="openCreateDialog">
            {{ t('wms.common.create', '新規作成') }}
          </OButton>
        </div>
      </template>
    </ControlPanel>

    <SearchForm
      class="search-section"
      :columns="searchColumns"
      :show-save="false"
      storage-key="locationSettingsSearch"
      @search="handleSearch"
    />

    <div class="table-section">
      <Table
        :columns="tableColumns"
        :data="locations"
        :height="520"
        row-key="_id"
        highlight-columns-on-hover
        pagination-enabled
        pagination-mode="client"
        :page-size="20"
        :page-sizes="[20, 50, 100]"
        :global-search-text="globalSearchText"
      />
    </div>

    <!-- Create/Edit Dialog -->
    <ODialog v-model="dialogVisible" :title="editingId ? t('wms.inventory.editLocation', 'ロケーション編集') : t('wms.inventory.createLocation', 'ロケーション新規作成')" size="md">
      <div class="dialog-form">
        <div class="form-field">
          <label class="form-label">{{ t('wms.inventory.code', 'コード') }} <span class="required-badge">必須</span></label>
          <input v-model="dialogForm.code" type="text" class="o-input" :placeholder="t('wms.inventory.codePlaceholder', '例: WH-MAIN/A-01')" />
        </div>
        <div class="form-field">
          <label class="form-label">{{ t('wms.inventory.locationName', '名称') }} <span class="required-badge">必須</span></label>
          <input v-model="dialogForm.name" type="text" class="o-input" :placeholder="t('wms.inventory.locationNamePlaceholder', '例: A棟 1列')" />
        </div>
        <div class="form-field">
          <label class="form-label">{{ t('wms.inventory.locationType', 'タイプ') }} <span class="required-badge">必須</span></label>
          <select v-model="dialogForm.type" class="o-input">
            <option value="warehouse">{{ t('wms.inventory.typeWarehouse', '倉庫') }}</option>
            <option value="zone">{{ t('wms.inventory.typeZone', 'ゾーン') }}</option>
            <option value="shelf">{{ t('wms.inventory.typeShelf', '棚') }}</option>
            <option value="bin">{{ t('wms.inventory.typeBin', '区画') }}</option>
            <option value="staging">{{ t('wms.inventory.typeStaging', '出荷準備') }}</option>
            <option value="receiving">{{ t('wms.inventory.typeReceiving', '入庫検品') }}</option>
          </select>
        </div>
        <div class="form-field">
          <label class="form-label">{{ t('wms.inventory.parentLocation', '親ロケーション') }}</label>
          <select v-model="dialogForm.parentId" class="o-input">
            <option value="">{{ t('wms.inventory.noParent', 'なし（最上位）') }}</option>
            <option v-for="loc in parentCandidates" :key="loc._id" :value="loc._id">
              {{ loc.code }} ({{ loc.name }})
            </option>
          </select>
        </div>
        <div class="form-field">
          <label class="form-label">{{ t('wms.inventory.temperatureZone', '温度帯') }}</label>
          <select v-model="dialogForm.coolType" class="o-input">
            <option value="">{{ t('wms.inventory.notSpecified', '指定なし') }}</option>
            <option value="0">{{ t('wms.inventory.tempNormal', '常温') }}</option>
            <option value="1">{{ t('wms.inventory.tempFrozen', '冷凍') }}</option>
            <option value="2">{{ t('wms.inventory.tempChilled', '冷蔵') }}</option>
          </select>
        </div>
        <div class="form-field">
          <label class="form-label">{{ t('wms.inventory.sortOrder', '表示順') }}</label>
          <input v-model.number="dialogForm.sortOrder" type="number" class="o-input" />
        </div>
        <div class="form-field" style="grid-column:1/-1;">
          <label class="form-label">{{ t('wms.inventory.memo', 'メモ') }}</label>
          <input v-model="dialogForm.memo" type="text" class="o-input" />
        </div>
      </div>
      <template #footer>
        <OButton variant="secondary" @click="dialogVisible = false">{{ t('wms.common.cancel', 'キャンセル') }}</OButton>
        <OButton variant="primary" :disabled="!canSaveDialog || isSaving" @click="handleSaveDialog">
          {{ isSaving ? t('wms.inventory.saving', '保存中...') : t('wms.common.save', '保存') }}
        </OButton>
      </template>
    </ODialog>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import OButton from '@/components/odoo/OButton.vue'
import ODialog from '@/components/odoo/ODialog.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import SearchForm from '@/components/search/SearchForm.vue'
import Table from '@/components/table/Table.vue'
import {
  fetchLocations,
  createLocation,
  updateLocation,
  deleteLocation as apiDeleteLocation,
  seedLocations,
} from '@/api/location'
import type { Location } from '@/types/inventory'
import type { TableColumn, Operator } from '@/types/table'

const toast = useToast()
const { t } = useI18n()
const isLoading = ref(false)
const isSeeding = ref(false)
const isSaving = ref(false)
const locations = ref<Location[]>([])
const globalSearchText = ref('')

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
    key: 'actions', title: t('wms.common.actions', '操作'), width: 120, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: Location }) =>
      h('div', { style: 'display:inline-flex;gap:4px;' }, [
        h(OButton, { variant: 'primary', size: 'sm', onClick: () => openEditDialog(rowData) }, () => t('wms.common.edit', '編集')),
        h(OButton, {
          variant: 'danger', size: 'sm',
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
    locations.value = await fetchLocations()
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
  if (!confirm(t('wms.inventory.confirmDeleteLocation', `ロケーション "${loc.code}" を削除しますか？`))) return
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

.o-input {
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
