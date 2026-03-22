<template>
  <div class="stocktaking-discrepancies">
    <ControlPanel :title="t('wms.inventory.discrepancy.title', '棚卸差異')" :show-search="false">
      <template #actions>
        <el-select v-model="statusFilter" :placeholder="t('wms.common.status', 'ステータス')" clearable style="width: 160px" @change="load">
          <el-option label="未処理 / 待处理" value="pending" />
          <el-option label="承認済 / 已批准" value="approved" />
          <el-option label="却下 / 已拒绝" value="rejected" />
        </el-select>
      </template>
    </ControlPanel>

    <div class="table-section">
      <el-table :data="items" v-loading="loading" stripe border style="width: 100%">
        <el-table-column prop="stocktakingNumber" :label="t('wms.inventory.discrepancy.stocktakingNumber', '棚卸番号')" width="160" />
        <el-table-column prop="productName" :label="t('wms.inventory.discrepancy.product', '商品')" min-width="180" />
        <el-table-column prop="locationName" :label="t('wms.inventory.discrepancy.location', 'ロケーション')" width="140" />
        <el-table-column prop="systemQty" :label="t('wms.inventory.discrepancy.systemQty', 'システム数')" width="110" align="right" />
        <el-table-column prop="countedQty" :label="t('wms.inventory.discrepancy.countedQty', '実棚数')" width="110" align="right" />
        <el-table-column :label="t('wms.inventory.discrepancy.discrepancy', '差異')" width="110" align="right">
          <template #default="{ row }">
            <span :style="{ color: discrepancyColor(row), fontWeight: 600 }">
              {{ discrepancyValue(row) > 0 ? '+' : '' }}{{ discrepancyValue(row) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="status" :label="t('wms.common.status', 'ステータス')" width="120">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('wms.common.actions', '操作')" width="200" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'pending'" size="small" type="success" @click="handleAction(row, 'approve')">
              承認 / 批准
            </el-button>
            <el-button v-if="row.status === 'pending'" size="small" type="danger" @click="handleAction(row, 'reject')">
              却下 / 拒绝
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
// 棚卸差異ページ / 盘点差异页面
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

// 差異計算 / 差异计算
const discrepancyValue = (row: any): number => {
  return (row.countedQty ?? 0) - (row.systemQty ?? 0)
}

// 差異色分け / 差异颜色
const discrepancyColor = (row: any): string => {
  const diff = discrepancyValue(row)
  if (diff > 0) return 'var(--el-color-success)'
  if (diff < 0) return 'var(--el-color-danger)'
  return 'inherit'
}

// ステータス表示 / 状态显示
const statusTagType = (status: string): '' | 'success' | 'warning' | 'danger' | 'info' => {
  const map: Record<string, '' | 'success' | 'warning' | 'danger' | 'info'> = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
  }
  return map[status] ?? 'info'
}

const statusLabel = (status: string): string => {
  const map: Record<string, string> = {
    pending: '未処理 / 待处理',
    approved: '承認済 / 已批准',
    rejected: '却下 / 已拒绝',
  }
  return map[status] ?? status
}

// 日付フォーマット（未使用だが将来用 / 预留）
// const formatDate = ...

// データ読み込み / 数据加载
async function load() {
  loading.value = true
  try {
    const params = statusFilter.value ? `?status=${statusFilter.value}` : ''
    const json = await http.get<any>(`/stocktaking-discrepancies${params}`)
    items.value = Array.isArray(json) ? json : (json.items ?? [])
  } catch (e: any) {
    showToast(e?.message || t('wms.inventory.discrepancy.loadError', '棚卸差異の読み込みに失敗しました'), 'danger')
  } finally {
    loading.value = false
  }
}

// アクション / 操作
async function handleAction(row: any, action: 'approve' | 'reject') {
  try {
    await http.patch<any>(`/stocktaking-discrepancies/${row._id}`, { action })
    showToast(t('wms.common.success', '成功'), 'success')
    await load()
  } catch (e: any) {
    showToast(e?.message || t('wms.common.error', 'エラーが発生しました'), 'danger')
  }
}

onMounted(load)
</script>

<style scoped>
.stocktaking-discrepancies {
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
