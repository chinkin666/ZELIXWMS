<template>
  <div class="mapping-config-list">
    <ControlPanel :title="t('wms.settings.mapping.title', 'レイアウト管理')" :show-search="false">
      <template #actions>
        <OButton variant="primary" @click="handleAdd">{{ t('wms.settings.mapping.newLayout', '新規レイアウト') }}</OButton>
      </template>
    </ControlPanel>

    <SearchForm
      class="search-section"
      :columns="searchColumns"
      :show-save="false"
      storage-key="mappingPatternsSearch"
      @search="handleSearch"
    />

    <div class="table-section">
      <Table
        :columns="tableColumns"
        :data="mappingConfigs"
        row-key="_id"
        highlight-columns-on-hover
        pagination-enabled
        pagination-mode="client"
        :page-size="10"
        :page-sizes="[10, 20, 50]"
        :global-search-text="globalSearchText"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, h } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useToast } from '@/composables/useToast'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import SearchForm from '@/components/search/SearchForm.vue'
import Table from '@/components/table/Table.vue'
import type { TableColumn, Operator } from '@/types/table'
import { getAllMappingConfigs, createMappingConfig, deleteMappingConfig, type MappingConfig } from '@/api/mappingConfig'

const router = useRouter()
const { t } = useI18n()
const { show: showToast } = useToast()
const mappingConfigs = ref<MappingConfig[]>([])
const loading = ref(false)
const globalSearchText = ref('')

// 日付フォーマット
const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return '-'
  try {
    const date = new Date(dateString)
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '-'
  }
}

// タイプ表示名
const CONFIG_TYPE_OPTIONS = [
  { label: t('wms.settings.mapping.typeOrderImport', '受注データ取込'), value: 'ec-company-to-order' },
  { label: t('wms.settings.mapping.typeCarrierExport', '送り状データ出力'), value: 'order-to-carrier' },
  { label: t('wms.settings.mapping.typeSheetExport', '出荷明細リスト出力'), value: 'order-to-sheet' },
  { label: t('wms.settings.mapping.typeCarrierImport', '送り状データ取込'), value: 'carrier-receipt-to-order' },
  { label: t('wms.settings.mapping.typeProductImport', '商品マスタ取込'), value: 'product' },
  { label: t('wms.settings.mapping.typeSourceCompanyImport', '依頼主マスタ取込'), value: 'order-source-company' },
]

const typeMap: Record<string, string> = Object.fromEntries(
  CONFIG_TYPE_OPTIONS.map((o) => [o.value, o.label]),
)

const formatType = (type: string | undefined): string => {
  if (!type) return '-'
  return typeMap[type] || type
}

// 列定義
const baseColumns: TableColumn[] = [
  {
    key: 'name',
    dataKey: 'name',
    title: t('wms.settings.mapping.layoutName', 'レイアウト名'),
    width: 200,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'configType',
    dataKey: 'configType',
    title: t('wms.settings.configType'),
    width: 180,
    fieldType: 'string',
    searchable: true,
    searchType: 'select',
    searchOptions: CONFIG_TYPE_OPTIONS,
  },
  {
    key: 'description',
    dataKey: 'description',
    title: t('wms.settings.description'),
    width: 250,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'isDefault',
    dataKey: 'isDefault',
    title: t('wms.settings.isDefault'),
    width: 100,
    fieldType: 'boolean',
    searchable: true,
    searchType: 'boolean',
  },
  {
    key: 'mappingsCount',
    dataKey: 'mappingsCount',
    title: t('wms.settings.mapping.mappingsCount', 'マッピング数'),
    width: 100,
    fieldType: 'number',
  },
  {
    key: 'createdAt',
    dataKey: 'createdAt',
    title: t('wms.settings.mapping.createdAt', '作成日時'),
    width: 160,
    fieldType: 'date',
  },
  {
    key: 'updatedAt',
    dataKey: 'updatedAt',
    title: t('wms.settings.mapping.updatedAt', '更新日時'),
    width: 160,
    fieldType: 'date',
  },
]

const searchColumns: TableColumn[] = baseColumns.filter((c) => c.searchable)

const tableColumns: TableColumn[] = [
  ...baseColumns.map((col) => {
    if (col.key === 'configType') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: MappingConfig }) => formatType(rowData.configType),
      }
    }
    if (col.key === 'isDefault') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: MappingConfig }) =>
          h(
            'span',
            { class: rowData.isDefault ? 'o-badge o-badge-success' : 'o-badge o-badge-info' },
            rowData.isDefault ? t('wms.settings.mapping.yes', 'はい') : t('wms.settings.mapping.no', 'いいえ'),
          ),
      }
    }
    if (col.key === 'mappingsCount') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: MappingConfig & { mappingsCount?: number } }) =>
          rowData.mappingsCount ?? 0,
      }
    }
    if (col.key === 'createdAt') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: MappingConfig }) => formatDate(rowData.createdAt),
      }
    }
    if (col.key === 'updatedAt') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: MappingConfig }) => formatDate(rowData.updatedAt),
      }
    }
    return col
  }),
  {
    key: 'actions',
    title: '',
    width: 200,
    cellRenderer: ({ rowData }: { rowData: MappingConfig }) =>
      h('div', { class: 'action-cell' }, [
        h(OButton, { variant: 'primary', size: 'sm', onClick: () => handleEdit(rowData) }, () => t('wms.common.edit')),
        h(OButton, { variant: 'secondary', size: 'sm', onClick: () => duplicateMappingConfig(rowData) }, () => t('wms.settings.mapping.duplicate', '複製')),
        h(OButton, { variant: 'danger', size: 'sm', onClick: () => confirmDelete(rowData) }, () => t('wms.common.delete')),
      ]),
  },
]

// 検索処理
const handleSearch = (payload: Record<string, { operator: Operator; value: any }>) => {
  if (payload.__global?.value) {
    globalSearchText.value = String(payload.__global.value).trim()
    delete payload.__global
  } else {
    globalSearchText.value = ''
  }
}

// データ読み込み
const loadMappingConfigs = async () => {
  loading.value = true
  try {
    const configs = await getAllMappingConfigs()
    mappingConfigs.value = configs.map((config) => ({
      ...config,
      mappingsCount: config.mappings?.length || 0,
    }))
  } catch (error) {
    // マッピング設定読み込み失敗 / Failed to load mapping configs
    showToast(t('wms.settings.mapping.loadError', 'レイアウトの読み込みに失敗しました'), 'danger')
  } finally {
    loading.value = false
  }
}

// 新規追加
const handleAdd = () => {
  router.push('/settings/mapping-patterns/new')
}

// 編集
const handleEdit = (row: MappingConfig) => {
  router.push({
    path: `/settings/mapping-patterns/edit/${row._id}`,
  })
}

// 複製
const duplicateMappingConfig = async (row: MappingConfig) => {
  try {
    const { _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = row
    const { mappingsCount: _mappingsCount, ...data } = rest as any
    await createMappingConfig({ ...data, name: `${row.name}_copy`, isDefault: false })
    showToast(t('wms.settings.mapping.duplicateSuccess', '複製しました'), 'success')
    await loadMappingConfigs()
  } catch (e: any) {
    showToast(e?.message || t('wms.settings.mapping.duplicateError', '複製に失敗しました'), 'danger')
  }
}

// 削除確認
const confirmDelete = (row: MappingConfig) => {
  if (!confirm(t('wms.settings.mapping.deleteConfirm', `「${row.name}」を削除しますか？`))) return
  deleteMappingConfig(row._id)
    .then(async () => {
      showToast(t('wms.settings.mapping.deleteSuccess', '削除しました'), 'success')
      await loadMappingConfigs()
    })
    .catch((error: any) => {
      showToast(error?.message || t('wms.settings.mapping.deleteError', '削除に失敗しました'), 'danger')
    })
}

onMounted(() => {
  loadMappingConfigs()
})
</script>

<style scoped>
.mapping-config-list {
  padding: 0 20px 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

.table-section {
  flex: 1;
  overflow: hidden;
}

:deep(.action-cell) {
  display: flex;
  align-items: center;
  gap: 6px;
}

:deep(.action-cell .o-btn) {
  margin: 0;
}
</style>
