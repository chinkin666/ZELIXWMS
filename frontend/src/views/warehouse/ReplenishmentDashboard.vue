<template>
  <div class="replenishment-dashboard">
    <ControlPanel :title="t('wms.warehouse.replenishment', '補充管理')" :show-search="false">
      <template #actions>
        <OButton variant="primary" @click="triggerReplenishment" :disabled="triggering">
          {{ triggering ? t('wms.common.processing', '処理中...') : t('wms.warehouse.triggerReplenishment', '補充トリガー') }}
        </OButton>
      </template>
    </ControlPanel>

    <!-- 統計カード / 统计卡片 -->
    <div class="stat-cards">
      <StatCard
        :title="t('wms.warehouse.pending', '未処理')"
        :value="String(stats.pending)"
        icon="\u{1F4CB}"
        color="#fa8c16"
      />
      <StatCard
        :title="t('wms.warehouse.inProgress', '処理中')"
        :value="String(stats.inProgress)"
        icon="\u{1F3C3}"
        color="#1677ff"
      />
      <StatCard
        :title="t('wms.warehouse.completed', '完了')"
        :value="String(stats.completed)"
        icon="\u{2705}"
        color="#52c41a"
      />
      <StatCard
        :title="t('wms.warehouse.total', '合計')"
        :value="String(stats.total)"
        icon="\u{1F4E6}"
        color="#722ed1"
      />
    </div>

    <!-- フィルター / 筛选器 -->
    <div class="filter-bar">
      <div class="filter-group">
        <label class="filter-label">{{ t('wms.warehouse.statusFilter', 'ステータス') }}</label>
        <select v-model="filterStatus" class="filter-select" @change="loadTasks">
          <option value="">{{ t('wms.common.all', 'すべて') }}</option>
          <option value="pending">{{ t('wms.warehouse.pending', '未処理') }}</option>
          <option value="in_progress">{{ t('wms.warehouse.inProgress', '処理中') }}</option>
          <option value="completed">{{ t('wms.warehouse.completed', '完了') }}</option>
        </select>
      </div>
      <div class="filter-group">
        <label class="filter-label">{{ t('wms.warehouse.skuFilter', '商品SKU') }}</label>
        <input
          v-model="filterSku"
          type="text"
          class="filter-input"
          :placeholder="t('wms.warehouse.skuPlaceholder', 'SKUで検索...')"
          @input="handleSkuSearch"
        />
      </div>
    </div>

    <!-- タスク一覧テーブル / 任务列表 -->
    <OLoadingState :loading="isLoading" :empty="!isLoading && tasks.length === 0">
      <div class="table-section">
        <table class="task-table">
          <thead>
            <tr>
              <th>{{ t('wms.warehouse.taskId', 'タスクID') }}</th>
              <th>{{ t('wms.warehouse.productSku', '商品SKU') }}</th>
              <th>{{ t('wms.warehouse.productName', '商品名') }}</th>
              <th>{{ t('wms.warehouse.fromLocation', '移動元') }}</th>
              <th>{{ t('wms.warehouse.toLocation', '移動先') }}</th>
              <th>{{ t('wms.warehouse.requiredQty', '必要数量') }}</th>
              <th>{{ t('wms.warehouse.status', 'ステータス') }}</th>
              <th>{{ t('wms.warehouse.createdAt', '作成日') }}</th>
              <th>{{ t('wms.warehouse.actions', '操作') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="task in tasks" :key="task._id">
              <td class="task-id">{{ task._id?.slice(-6) || '-' }}</td>
              <td class="sku-cell">{{ task.productSku || '-' }}</td>
              <td>{{ task.productName || '-' }}</td>
              <td><span class="location-badge">{{ task.fromLocation || '-' }}</span></td>
              <td><span class="location-badge">{{ task.toLocation || '-' }}</span></td>
              <td class="qty-cell">{{ task.requiredQuantity ?? '-' }}</td>
              <td>
                <span class="status-tag" :class="`status-${task.status}`">
                  {{ getStatusLabel(task.status) }}
                </span>
              </td>
              <td class="date-cell">{{ formatDate(task.createdAt) }}</td>
              <td>
                <OButton
                  v-if="task.status !== 'completed'"
                  variant="primary"
                  size="sm"
                  @click="openCompleteDialog(task)"
                >
                  {{ t('wms.warehouse.complete', '完了') }}
                </OButton>
                <span v-else class="completed-mark">{{ t('wms.warehouse.done', '完了済') }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </OLoadingState>

    <!-- 完了ダイアログ / 完成对话框 -->
    <div v-if="showCompleteDialog" class="dialog-overlay" @click.self="showCompleteDialog = false">
      <div class="dialog-box">
        <div class="dialog-header">
          <h3>{{ t('wms.warehouse.completeTask', 'タスク完了') }}</h3>
          <button class="dialog-close" @click="showCompleteDialog = false">&times;</button>
        </div>
        <div class="dialog-body">
          <p class="dialog-info">
            {{ t('wms.warehouse.completingTask', '補充タスクを完了します') }}:
            <strong>{{ completingTask?.productSku }}</strong>
          </p>
          <div class="dialog-field">
            <label>{{ t('wms.warehouse.actualQuantity', '実際の補充数量') }}</label>
            <input
              v-model.number="completeQuantity"
              type="number"
              min="0"
              class="dialog-input"
              :placeholder="String(completingTask?.requiredQuantity || 0)"
            />
          </div>
        </div>
        <div class="dialog-footer">
          <OButton variant="secondary" size="sm" @click="showCompleteDialog = false">
            {{ t('wms.common.cancel', 'キャンセル') }}
          </OButton>
          <OButton variant="primary" size="sm" @click="confirmComplete" :disabled="completing">
            {{ completing ? t('wms.common.processing', '処理中...') : t('wms.warehouse.confirmComplete', '完了を確定') }}
          </OButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 補充ダッシュボード / 补货仪表盘
 *
 * 補充タスクの一覧表示・トリガー・完了処理を行う
 * 显示补货任务列表、触发补货、完成任务
 */
import { ref, onMounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import OLoadingState from '@/components/odoo/OLoadingState.vue'
import StatCard from '@/components/odoo/StatCard.vue'
import { getApiBaseUrl } from '@/api/base'
import { apiFetch } from '@/api/http'

const API_BASE_URL = getApiBaseUrl()
const toast = useToast()
const { t } = useI18n()

// タスクデータ型 / 任务数据类型
interface ReplenishmentTask {
  _id: string
  productSku: string
  productName?: string
  fromLocation: string
  toLocation: string
  requiredQuantity: number
  actualQuantity?: number
  status: 'pending' | 'in_progress' | 'completed'
  createdAt: string
}

// 統計データ型 / 统计数据类型
interface ReplenishmentStats {
  pending: number
  inProgress: number
  completed: number
  total: number
}

const isLoading = ref(false)
const triggering = ref(false)
const completing = ref(false)
const tasks = ref<ReplenishmentTask[]>([])
const stats = ref<ReplenishmentStats>({ pending: 0, inProgress: 0, completed: 0, total: 0 })
const filterStatus = ref('')
const filterSku = ref('')

// 完了ダイアログ / 完成对话框
const showCompleteDialog = ref(false)
const completingTask = ref<ReplenishmentTask | null>(null)
const completeQuantity = ref(0)

let skuSearchTimer: ReturnType<typeof setTimeout> | null = null

// タスク一覧の読み込み / 加载任务列表
const loadTasks = async () => {
  isLoading.value = true
  try {
    const url = new URL(`${API_BASE_URL}/workflows/replenishment/status`)
    if (filterStatus.value) url.searchParams.append('status', filterStatus.value)
    if (filterSku.value) url.searchParams.append('sku', filterSku.value)

    const res = await apiFetch(url.toString())
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'データの取得に失敗しました')
    const data = await res.json()
    tasks.value = data.tasks || data.data || []

    // 統計の算出 / 计算统计
    const allTasks = tasks.value
    stats.value = {
      pending: allTasks.filter(t => t.status === 'pending').length,
      inProgress: allTasks.filter(t => t.status === 'in_progress').length,
      completed: allTasks.filter(t => t.status === 'completed').length,
      total: allTasks.length,
    }
  } catch (e: any) {
    toast.showError(e.message || t('wms.warehouse.fetchFailed', '補充タスクの取得に失敗しました'))
  } finally {
    isLoading.value = false
  }
}

// SKU検索（デバウンス） / SKU搜索（防抖）
const handleSkuSearch = () => {
  if (skuSearchTimer) clearTimeout(skuSearchTimer)
  skuSearchTimer = setTimeout(() => loadTasks(), 300)
}

// 補充トリガー / 触发补货
const triggerReplenishment = async () => {
  try {
    await ElMessageBox.confirm(
      t('wms.warehouse.confirmTrigger', '補充トリガーを実行しますか？在庫不足の商品に対して補充タスクが作成されます。 / 确定要执行补货触发吗？将为库存不足的商品创建补货任务。'),
      '確認 / 确认',
      { confirmButtonText: '実行 / 执行', cancelButtonText: 'キャンセル / 取消', type: 'warning' },
    )
  } catch { return }
  triggering.value = true
  try {
    const res = await apiFetch(`${API_BASE_URL}/workflows/replenishment/trigger`, {
      method: 'POST',
    })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || '補充トリガーに失敗しました')
    const data = await res.json()
    toast.showSuccess(
      t('wms.warehouse.triggerSuccess', '補充トリガーを実行しました') +
      (data.created ? `: ${data.created}件のタスクを作成` : '')
    )
    await loadTasks()
  } catch (e: any) {
    toast.showError(e.message || t('wms.warehouse.triggerFailed', '補充トリガーに失敗しました'))
  } finally {
    triggering.value = false
  }
}

// 完了ダイアログを開く / 打开完成对话框
const openCompleteDialog = (task: ReplenishmentTask) => {
  completingTask.value = task
  completeQuantity.value = task.requiredQuantity
  showCompleteDialog.value = true
}

// タスク完了確定 / 确认完成任务
const confirmComplete = async () => {
  if (!completingTask.value) return
  if (completeQuantity.value <= 0) {
    toast.showWarning(t('wms.warehouse.invalidQuantity', '有効な数量を入力してください'))
    return
  }

  completing.value = true
  try {
    const res = await apiFetch(
      `${API_BASE_URL}/workflows/replenishment/${completingTask.value._id}/complete`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: completeQuantity.value }),
      }
    )
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'タスクの完了に失敗しました')
    toast.showSuccess(t('wms.warehouse.taskCompleted', '補充タスクを完了しました'))
    showCompleteDialog.value = false
    await loadTasks()
  } catch (e: any) {
    toast.showError(e.message || t('wms.warehouse.completeFailed', 'タスクの完了に失敗しました'))
  } finally {
    completing.value = false
  }
}

// ステータスラベル / 状态标签
const getStatusLabel = (status: string): string => {
  const map: Record<string, string> = {
    pending: '未処理',
    in_progress: '処理中',
    completed: '完了',
  }
  return map[status] || status
}

// 日時フォーマット / 格式化日期
const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('ja-JP', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

onMounted(() => {
  loadTasks()
})
</script>

<style scoped>
.replenishment-dashboard {
  display: flex;
  flex-direction: column;
  padding: 0 20px 20px;
  gap: 16px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

/* 統計カード / 统计卡片 */
.stat-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

/* フィルター / 筛选器 */
.filter-bar {
  display: flex;
  gap: 16px;
  align-items: flex-end;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--o-gray-600, #606266);
}

.filter-select,
.filter-input {
  padding: 6px 10px;
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: 6px;
  font-size: 13px;
  outline: none;
  background: var(--o-view-background, #fff);
  transition: border-color 0.2s;
  min-width: 160px;
}

.filter-select:focus,
.filter-input:focus {
  border-color: var(--o-brand-primary, #0052A3);
}

/* テーブル / 表格 */
.table-section {
  overflow-x: auto;
}

.task-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: 8px;
  overflow: hidden;
  font-size: 13px;
}

.task-table thead {
  background: var(--o-gray-50, #fafafa);
}

.task-table th {
  padding: 10px 14px;
  text-align: left;
  font-weight: 600;
  color: var(--o-gray-700, #303133);
  border-bottom: 1px solid var(--o-border-color, #e4e7ed);
  white-space: nowrap;
}

.task-table td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--o-border-color, #e4e7ed);
  color: var(--o-gray-700, #606266);
}

.task-table tbody tr:hover {
  background: var(--o-gray-50, #fafafa);
}

.task-id {
  font-family: monospace;
  font-size: 12px;
  color: var(--o-gray-500, #909399);
}

.sku-cell {
  font-weight: 600;
  color: var(--o-brand-primary, #714b67);
}

.location-badge {
  font-family: monospace;
  font-size: 12px;
  background: var(--o-gray-100, #f5f7fa);
  padding: 2px 6px;
  border-radius: 3px;
}

.qty-cell {
  font-weight: 600;
}

.date-cell {
  font-size: 12px;
  color: var(--o-gray-500, #909399);
}

/* ステータスタグ / 状态标签 */
.status-tag {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-pending {
  background: #fff7e6;
  color: #d46b08;
}

.status-in_progress {
  background: #e6f4ff;
  color: #1677ff;
}

.status-completed {
  background: #f6ffed;
  color: #389e0d;
}

.completed-mark {
  font-size: 12px;
  color: var(--o-gray-400, #c0c4cc);
}

/* ダイアログ / 对话框 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-box {
  background: var(--o-view-background, #fff);
  border-radius: 10px;
  width: 420px;
  max-width: 90vw;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--o-border-color, #e4e7ed);
}

.dialog-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--o-gray-800, #303133);
}

.dialog-close {
  background: none;
  border: none;
  font-size: 22px;
  color: var(--o-gray-500, #909399);
  cursor: pointer;
  line-height: 1;
}

.dialog-close:hover {
  color: var(--o-gray-800, #303133);
}

.dialog-body {
  padding: 20px;
}

.dialog-info {
  font-size: 13px;
  color: var(--o-gray-600, #606266);
  margin: 0 0 16px;
}

.dialog-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dialog-field label {
  font-size: 13px;
  font-weight: 500;
  color: var(--o-gray-700, #303133);
}

.dialog-input {
  padding: 8px 12px;
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.dialog-input:focus {
  border-color: var(--o-brand-primary, #0052A3);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 20px;
  border-top: 1px solid var(--o-border-color, #e4e7ed);
}
</style>
