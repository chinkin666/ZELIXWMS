<template>
  <div class="mapping-config-list">
    <ControlPanel title="レイアウト管理" :show-search="false">
      <template #actions>
        <OButton variant="primary" @click="handleAdd">新規レイアウト</OButton>
      </template>
    </ControlPanel>

    <div class="table-section">
      <Table
        :columns="tableColumns"
        :data="mappingConfigs"
        :height="580"
        row-key="_id"
        highlight-columns-on-hover
        pagination-enabled
        pagination-mode="client"
        :page-size="10"
        :page-sizes="[10, 20, 50]"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, h } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import Table from '@/components/table/Table.vue'
import type { TableColumn } from '@/types/table'
import { getAllMappingConfigs, createMappingConfig, deleteMappingConfig, type MappingConfig } from '@/api/mappingConfig'

const router = useRouter()
const { show: showToast } = useToast()
const mappingConfigs = ref<MappingConfig[]>([])
const loading = ref(false)

// 格式化日期
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

// 格式化布尔值
const formatBoolean = (value: boolean | undefined): string => {
  return value ? 'はい' : 'いいえ'
}

// 格式化类型
const formatType = (type: string | undefined): string => {
  if (!type) return '-'
  const typeMap: Record<string, string> = {
    'ec-company-to-order': '出荷予定データ',
    'order-to-carrier': '送り状データ',
    'order-to-sheet': '出荷明細リスト出力(csv)',
    product: '商品マスタ',
    'order-source-company': 'ご依頼主マスタ',
  }
  return typeMap[type] || type
}

// 表格列配置
const tableColumns: TableColumn[] = [
  {
    key: 'name',
    dataKey: 'name',
    title: 'レイアウト名',
    width: 200,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
    cellRenderer: ({ rowData }: { rowData: MappingConfig }) => rowData.name || '-',
  },
  {
    key: 'configType',
    dataKey: 'configType',
    title: 'タイプ',
    width: 150,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
    cellRenderer: ({ rowData }: { rowData: MappingConfig }) => formatType(rowData.configType),
  },

  {
    key: 'description',
    dataKey: 'description',
    title: '説明',
    width: 250,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
    cellRenderer: ({ rowData }: { rowData: MappingConfig }) => rowData.description || '-',
  },
  {
    key: 'isDefault',
    dataKey: 'isDefault',
    title: 'デフォルト',
    width: 100,
    fieldType: 'boolean',
    searchable: true,
    searchType: 'boolean',
    cellRenderer: ({ rowData }: { rowData: MappingConfig }) =>
      formatBoolean(rowData.isDefault),
  },
  {
    key: 'mappingsCount',
    dataKey: 'mappingsCount',
    title: 'マッピング数',
    width: 120,
    fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: MappingConfig & { mappingsCount?: number } }) =>
      rowData.mappingsCount ?? 0,
  },
  {
    key: 'createdAt',
    dataKey: 'createdAt',
    title: '作成日時',
    width: 180,
    fieldType: 'date',
    searchable: true,
    searchType: 'date',
    dateFormat: 'YYYY-MM-DD HH:mm:ss',
    cellRenderer: ({ rowData }: { rowData: MappingConfig }) => formatDate(rowData.createdAt),
  },
  {
    key: 'updatedAt',
    dataKey: 'updatedAt',
    title: '更新日時',
    width: 180,
    fieldType: 'date',
    searchable: true,
    searchType: 'date',
    dateFormat: 'YYYY-MM-DD HH:mm:ss',
    cellRenderer: ({ rowData }: { rowData: MappingConfig }) => formatDate(rowData.updatedAt),
  },
  {
    key: 'actions',
    title: '操作',
    width: 160,
    cellRenderer: ({ rowData }: { rowData: MappingConfig }) =>
      h('div', { class: 'action-cell' }, [
        h(OButton, { variant: 'primary', size: 'sm', onClick: () => handleEdit(rowData) }, () => '編集'),
        h(OButton, { variant: 'secondary', size: 'sm', onClick: () => duplicateMappingConfig(rowData) }, () => '複製'),
        h(OButton, { variant: 'danger', size: 'sm', onClick: () => confirmDelete(rowData) }, () => '削除'),
      ]),
  },
]

// 加载数据
const loadMappingConfigs = async () => {
  loading.value = true
  try {
    const configs = await getAllMappingConfigs()
    mappingConfigs.value = configs.map((config) => ({
      ...config,
      mappingsCount: config.mappings?.length || 0,
    }))
  } catch (error) {
    console.error('Failed to load mapping configs:', error)
    showToast('レイアウトの読み込みに失敗しました', 'danger')
  } finally {
    loading.value = false
  }
}

// 添加新配置
const handleAdd = () => {
  router.push('/settings/mapping-patterns/new')
}

// 编辑配置
const handleEdit = (row: MappingConfig) => {
  router.push({
    path: `/settings/mapping-patterns/edit/${row._id}`,
  })
}

const duplicateMappingConfig = async (row: MappingConfig) => {
  try {
    const { _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = row
    const { mappingsCount: _mappingsCount, ...data } = rest as any
    await createMappingConfig({ ...data, name: `${row.name}_copy`, isDefault: false })
    showToast('複製しました', 'success')
    await loadMappingConfigs()
  } catch (e: any) {
    showToast(e?.message || '複製に失敗しました', 'danger')
  }
}

// 确认删除
const confirmDelete = (row: MappingConfig) => {
  if (!confirm(`「${row.name}」を削除しますか？`)) return
  deleteMappingConfig(row._id)
    .then(async () => {
      showToast('削除しました', 'success')
      await loadMappingConfigs()
    })
    .catch((error: any) => {
      showToast(error?.message || '削除に失敗しました', 'danger')
    })
}

// 组件挂载时加载数据
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
}
:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}




.table-section {
  flex: 1;
  overflow: hidden;
}

.o-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  border: 1px solid var(--o-border-color, #dcdfe6);
  border-radius: var(--o-border-radius, 4px);
  font-size: var(--o-font-size-base, 14px);
  cursor: pointer;
  background: var(--o-view-background, #fff);
  color: var(--o-gray-700, #303133);
  transition: 0.2s;
  white-space: nowrap;
}

.o-btn-primary { background: var(--o-brand-primary, #714b67); color: #fff; border-color: var(--o-brand-primary, #714b67); }
.o-btn-sm { padding: 4px 10px; font-size: 13px; }
.o-btn-outline-primary { background: transparent; color: var(--o-brand-primary, #714b67); border-color: var(--o-brand-primary, #714b67); }
.o-btn-outline-secondary { background: transparent; color: var(--o-gray-600, #909399); border-color: var(--o-gray-600, #909399); }
.o-btn-outline-danger { background: transparent; color: #f56c6c; border-color: #f56c6c; }

/* 操作列样式 - 垂直排列 */
:deep(.action-cell) {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  padding: 4px;
}

:deep(.action-cell .o-btn) {
  margin: 0;
  min-width: 54px;
}
</style>
