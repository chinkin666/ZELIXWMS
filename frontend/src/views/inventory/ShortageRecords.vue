<template>
  <div class="shortage-records">
    <ControlPanel :title="t('wms.inventory.shortage.title', '欠品管理')" :show-search="false">
      <template #actions>
        <el-select v-model="statusFilter" :placeholder="t('wms.common.status', 'ステータス')" clearable style="width: 160px" @change="load">
          <el-option label="保留中 / 待处理" value="pending" />
          <el-option label="引当済 / 已预留" value="reserved" />
          <el-option label="充足済 / 已满足" value="fulfilled" />
          <el-option label="キャンセル / 已取消" value="cancelled" />
        </el-select>
      </template>
    </ControlPanel>

    <div class="table-section">
      <el-table :data="items" v-loading="loading" stripe border style="width: 100%">
        <el-table-column prop="orderNumber" :label="t('wms.inventory.shortage.orderNumber', '注文番号')" width="160" />
        <el-table-column prop="productName" :label="t('wms.inventory.shortage.product', '商品')" min-width="180" />
        <el-table-column prop="requestedQty" :label="t('wms.inventory.shortage.requested', '要求数')" width="100" align="right" />
        <el-table-column prop="availableQty" :label="t('wms.inventory.shortage.available', '在庫数')" width="100" align="right" />
        <el-table-column prop="shortageQty" :label="t('wms.inventory.shortage.shortage', '欠品数')" width="100" align="right">
          <template #default="{ row }">
            <span style="color: var(--el-color-danger); font-weight: 600">{{ row.shortageQty }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" :label="t('wms.common.status', 'ステータス')" width="120">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" :label="t('wms.common.date', '日付')" width="160">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column :label="t('wms.common.actions', '操作')" width="240" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'pending'" size="small" type="primary" @click="handleAction(row, 'reserve')">
              引当 / 预留
            </el-button>
            <el-button v-if="row.status === 'reserved'" size="small" type="success" @click="handleAction(row, 'fulfill')">
              充足 / 满足
            </el-button>
            <el-button v-if="row.status === 'pending' || row.status === 'reserved'" size="small" type="danger" @click="handleAction(row, 'cancel')">
              取消
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
// 欠品管理ページ / 欠品管理页面
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
    reserved: '',
    fulfilled: 'success',
    cancelled: 'info',
  }
  return map[status] ?? 'info'
}

const statusLabel = (status: string): string => {
  const map: Record<string, string> = {
    pending: '保留中 / 待处理',
    reserved: '引当済 / 已预留',
    fulfilled: '充足済 / 已满足',
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
    const json = await http.get<any>(`/api/shortage-records${params}`)
    items.value = Array.isArray(json) ? json : (json.items ?? [])
  } catch (e) {
    console.error(e)
    showToast(t('wms.inventory.shortage.loadError', '欠品データの読み込みに失敗しました'), 'danger')
  } finally {
    loading.value = false
  }
}

// アクション / 操作
async function handleAction(row: any, action: 'reserve' | 'fulfill' | 'cancel') {
  try {
    await http.patch<any>(`/api/shortage-records/${row._id}`, { action })
    showToast(t('wms.common.success', '成功'), 'success')
    await load()
  } catch (e: any) {
    showToast(e?.message || t('wms.common.error', 'エラーが発生しました'), 'danger')
  }
}

onMounted(load)
</script>

<style scoped>
.shortage-records {
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
