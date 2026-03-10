<template>
  <div class="mapping-config-list">
    <!-- 上半部分：标题和按钮 -->
    <div class="page-header">
      <h1 class="page-title">レイアウト管理</h1>
      <div class="header-actions">
        <el-button type="primary" :icon="Plus" @click="handleAdd">
          新規レイアウト
        </el-button>
      </div>
    </div>

    <!-- 下半部分：表格 -->
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
import { ElButton, ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit } from '@element-plus/icons-vue'
import Table from '@/components/table/Table.vue'
import type { TableColumn } from '@/types/table'
import { getAllMappingConfigs, createMappingConfig, deleteMappingConfig, type MappingConfig } from '@/api/mappingConfig'

const router = useRouter()
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
        h(
          ElButton,
          {
            type: 'primary',
            plain: true,
            size: 'small',
            icon: Edit,
            onClick: () => handleEdit(rowData),
          },
          { default: () => '編集' },
        ),
        h(
          ElButton,
          {
            type: 'info',
            plain: true,
            size: 'small',
            onClick: () => duplicateMappingConfig(rowData),
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

// 加载数据
const loadMappingConfigs = async () => {
  loading.value = true
  try {
    const configs = await getAllMappingConfigs()
    // 添加映射数量字段用于显示
    mappingConfigs.value = configs.map((config) => ({
      ...config,
      mappingsCount: config.mappings?.length || 0,
    }))
  } catch (error) {
    console.error('Failed to load mapping configs:', error)
    ElMessage.error('レイアウトの読み込みに失敗しました')
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
    const { _id, createdAt, updatedAt, ...rest } = row
    const { mappingsCount, ...data } = rest as any
    await createMappingConfig({ ...data, name: `${row.name}_copy`, isDefault: false })
    ElMessage.success('複製しました')
    await loadMappingConfigs()
  } catch (e: any) {
    ElMessage.error(e?.message || '複製に失敗しました')
  }
}

// 确认删除
const confirmDelete = (row: MappingConfig) => {
  ElMessageBox.confirm(`「${row.name}」を削除しますか？`, '確認', {
    confirmButtonText: 'はい',
    cancelButtonText: 'いいえ',
    type: 'warning',
  })
    .then(async () => {
      try {
        await deleteMappingConfig(row._id)
        ElMessage.success('削除しました')
        await loadMappingConfigs()
      } catch (error: any) {
        ElMessage.error(error?.message || '削除に失敗しました')
      }
    })
    .catch(() => {})
}

// 组件挂载时加载数据
onMounted(() => {
  loadMappingConfigs()
})
</script>

<style scoped>
.mapping-config-list {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.page-title {
  margin: 0;
  font-size: 20px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.table-section {
  flex: 1;
  overflow: hidden;
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
</style>

