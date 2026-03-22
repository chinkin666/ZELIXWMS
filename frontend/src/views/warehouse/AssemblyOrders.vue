<template>
  <div class="assembly-orders">
    <ControlPanel :title="t('wms.warehouse.assembly.title', 'セット組み作業')" :show-search="false">
      <template #actions>
        <el-select v-model="statusFilter" :placeholder="t('wms.common.status', 'ステータス')" clearable style="width: 160px" @change="load">
          <el-option label="未着手 / 未开始" value="pending" />
          <el-option label="作業中 / 进行中" value="in_progress" />
          <el-option label="完了 / 已完成" value="completed" />
          <el-option label="キャンセル / 已取消" value="cancelled" />
        </el-select>
      </template>
    </ControlPanel>

    <div class="table-section">
      <el-table :data="items" v-loading="loading" stripe border style="width: 100%">
        <el-table-column prop="assemblyNumber" :label="t('wms.warehouse.assembly.number', '指示番号')" width="160" />
        <el-table-column prop="setProductName" :label="t('wms.warehouse.assembly.setProduct', 'セット商品')" min-width="200" />
        <el-table-column prop="targetQty" :label="t('wms.warehouse.assembly.targetQty', '目標数')" width="100" align="right" />
        <el-table-column prop="assembledQty" :label="t('wms.warehouse.assembly.assembledQty', '完了数')" width="100" align="right">
          <template #default="{ row }">
            <span :style="{ color: row.assembledQty >= row.targetQty ? 'var(--el-color-success)' : 'inherit', fontWeight: 600 }">
              {{ row.assembledQty }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="status" :label="t('wms.common.status', 'ステータス')" width="120">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="assignedTo" :label="t('wms.warehouse.assembly.assignedTo', '担当者')" width="140" />
        <el-table-column prop="createdAt" :label="t('wms.common.date', '日付')" width="160">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column :label="t('wms.common.actions', '操作')" width="260" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'pending'" size="small" type="primary" @click="handleAction(row, 'start')">
              開始 / 开始
            </el-button>
            <el-button v-if="row.status === 'in_progress'" size="small" type="success" @click="handleAction(row, 'complete')">
              完了 / 完成
            </el-button>
            <el-button v-if="row.status !== 'completed' && row.status !== 'cancelled'" size="small" type="danger" @click="handleAction(row, 'cancel')">
              取消
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
// セット組み作業ページ / 套装组装作业页面
import { ref, onMounted } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useToast } from '@/composables/useToast'
import { http } from '@/api/http'
import ControlPanel from '@/components/odoo/ControlPanel.vue'

const { t } = useI18n()
const { show: showToast } = useToast()
const items = ref<any[]>([])
const loading = ref(false)
const statusFilter = ref('')

// ステータス表示 / 状态显示
const statusTagType = (status: string): '' | 'success' | 'warning' | 'danger' | 'info' => {
  const map: Record<string, '' | 'success' | 'warning' | 'danger' | 'info'> = {
    pending: 'warning',
    in_progress: '',
    completed: 'success',
    cancelled: 'info',
  }
  return map[status] ?? 'info'
}

const statusLabel = (status: string): string => {
  const map: Record<string, string> = {
    pending: '未着手 / 未开始',
    in_progress: '作業中 / 进行中',
    completed: '完了 / 已完成',
    cancelled: 'キャンセル / 已取消',
  }
  return map[status] ?? status
}

// 日付フォーマット / 日期格式化
const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return '-'
  try {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return '-' }
}

// データ読み込み / 数据加载
async function load() {
  loading.value = true
  try {
    const params = statusFilter.value ? `?status=${statusFilter.value}` : ''
    const json = await http.get<any>(`/assembly-orders${params}`)
    items.value = Array.isArray(json) ? json : (json.items ?? [])
  } catch (e) {
    console.error(e)
    showToast(t('wms.warehouse.assembly.loadError', 'セット組みデータの読み込みに失敗しました'), 'danger')
  } finally {
    loading.value = false
  }
}

// アクション / 操作
async function handleAction(row: any, action: 'start' | 'complete' | 'cancel') {
  try {
    await http.patch<any>(`/assembly-orders/${row._id}`, { action })
    showToast(t('wms.common.success', '成功'), 'success')
    await load()
  } catch (e: any) {
    showToast(e?.message || t('wms.common.error', 'エラーが発生しました'), 'danger')
  }
}

onMounted(load)
</script>

<style scoped>
.assembly-orders {
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
  overflow: auto;
}
</style>
