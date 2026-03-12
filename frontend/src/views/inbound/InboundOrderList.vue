<template>
  <div class="inbound-order-list">
    <ControlPanel title="入庫指示一覧" :show-search="false">
      <template #actions>
        <div style="display:flex;gap:6px;align-items:center;">
          <select v-model="filterStatus" class="o-input o-input-sm" style="width:120px;" @change="loadData">
            <option value="">全状態</option>
            <option value="draft">下書き</option>
            <option value="confirmed">確認済</option>
            <option value="receiving">入庫中</option>
            <option value="received">検品済</option>
            <option value="done">完了</option>
            <option value="cancelled">キャンセル</option>
          </select>
          <OButton variant="primary" size="sm" @click="$router.push('/inbound/create')">新規作成</OButton>
        </div>
      </template>
    </ControlPanel>

    <!-- 一括操作バー -->
    <div v-if="selectedIds.length > 0" class="bulk-bar">
      <span class="bulk-info">{{ selectedIds.length }} 件選択</span>
      <OButton variant="secondary" size="sm" style="border-color:#f56c6c;color:#f56c6c;" :disabled="isBulkDeleting" @click="handleBulkDelete">
        {{ isBulkDeleting ? '削除中...' : '一括削除' }}
      </OButton>
      <OButton variant="secondary" size="sm" @click="handleBulkCancel" :disabled="isBulkProcessing">一括キャンセル</OButton>
      <OButton variant="secondary" size="sm" @click="selectedIds = []">選択解除</OButton>
    </div>

    <div class="o-table-wrapper">
      <table class="o-table">
        <thead>
          <tr>
            <th class="o-table-th" style="width:40px;">
              <input type="checkbox" :checked="isAllSelected" :indeterminate="isPartialSelected" @change="toggleSelectAll" />
            </th>
            <th class="o-table-th" style="width:160px;">入庫指示番号</th>
            <th class="o-table-th" style="width:90px;">状態</th>
            <th class="o-table-th" style="width:160px;">仕入先</th>
            <th class="o-table-th" style="width:160px;">入庫先</th>
            <th class="o-table-th o-table-th--right" style="width:80px;">行数</th>
            <th class="o-table-th o-table-th--right" style="width:100px;">予定数量</th>
            <th class="o-table-th o-table-th--right" style="width:100px;">入庫済</th>
            <th class="o-table-th" style="width:120px;">入庫予定日</th>
            <th class="o-table-th" style="width:120px;">作成日時</th>
            <th class="o-table-th" style="width:240px;">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="11" class="o-table-empty">読み込み中...</td>
          </tr>
          <tr v-else-if="rows.length === 0">
            <td colspan="11" class="o-table-empty">データがありません</td>
          </tr>
          <tr v-for="row in rows" :key="row._id" class="o-table-row" :class="{ 'row-selected': selectedIds.includes(row._id) }">
            <td class="o-table-td" style="text-align:center;">
              <input type="checkbox" :value="row._id" v-model="selectedIds" />
            </td>
            <td class="o-table-td">
              <span class="order-number">{{ row.orderNumber }}</span>
            </td>
            <td class="o-table-td">
              <span class="o-status-tag" :class="statusClass(row.status)">{{ statusLabel(row.status) }}</span>
            </td>
            <td class="o-table-td">{{ row.supplier?.name || '-' }}</td>
            <td class="o-table-td">
              <span class="location-badge">{{ getDestCode(row) }}</span>
            </td>
            <td class="o-table-td o-table-td--right">{{ row.lines.length }}</td>
            <td class="o-table-td o-table-td--right">{{ totalExpected(row) }}</td>
            <td class="o-table-td o-table-td--right">
              <span :class="{ 'text-success': totalReceived(row) >= totalExpected(row) && totalExpected(row) > 0 }">
                {{ totalReceived(row) }}
              </span>
            </td>
            <td class="o-table-td">{{ row.expectedDate ? formatDate(row.expectedDate) : '-' }}</td>
            <td class="o-table-td">{{ formatDateTime(row.createdAt) }}</td>
            <td class="o-table-td o-table-td--actions">
              <div style="display:inline-flex;gap:4px;flex-wrap:wrap;">
                <OButton
                  v-if="row.status === 'draft'"
                  variant="primary" size="sm"
                  :disabled="isConfirming"
                  @click="handleConfirm(row)"
                >確定</OButton>
                <OButton
                  v-if="row.status === 'confirmed' || row.status === 'receiving'"
                  variant="success" size="sm"
                  @click="$router.push(`/inbound/receive/${row._id}`)"
                >入庫検品</OButton>
                <OButton
                  v-if="row.status === 'received'"
                  variant="primary" size="sm"
                  @click="$router.push(`/inbound/putaway/${row._id}`)"
                >棚入れ</OButton>
                <OButton
                  v-if="row.status === 'confirmed' || row.status === 'receiving' || row.status === 'received'"
                  variant="secondary" size="sm"
                  @click="handleComplete(row)"
                >完了</OButton>
                <OButton
                  v-if="row.status !== 'done' && row.status !== 'cancelled'"
                  variant="secondary" size="sm"
                  style="border-color:#f56c6c;color:#f56c6c;"
                  @click="handleCancel(row)"
                >取消</OButton>
                <OButton
                  v-if="row.status === 'draft'"
                  variant="secondary" size="sm"
                  style="border-color:#f56c6c;color:#f56c6c;"
                  @click="handleDelete(row)"
                >削除</OButton>
                <OButton
                  v-if="row.status !== 'draft' && row.status !== 'cancelled'"
                  variant="secondary" size="sm"
                  @click="openPrint(row._id, 'inspection')"
                >検品表</OButton>
                <OButton
                  v-if="row.status !== 'draft' && row.status !== 'cancelled'"
                  variant="secondary" size="sm"
                  @click="openPrint(row._id, 'kanban')"
                >看板</OButton>
                <OButton
                  v-if="row.status !== 'cancelled'"
                  variant="secondary" size="sm"
                  @click="openPrint(row._id, 'barcode')"
                >BC</OButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="o-table-pagination">
      <span class="o-table-pagination__info">{{ total }} 件</span>
      <div class="o-table-pagination__controls">
        <select class="o-input o-input-sm" v-model.number="pageSize" style="width:80px;" @change="currentPage = 1; loadData()">
          <option :value="25">25</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>
        <OButton variant="secondary" size="sm" :disabled="currentPage <= 1" @click="currentPage--; loadData()">&lsaquo;</OButton>
        <span class="o-table-pagination__page">{{ currentPage }} / {{ totalPages }}</span>
        <OButton variant="secondary" size="sm" :disabled="currentPage >= totalPages" @click="currentPage++; loadData()">&rsaquo;</OButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useToast } from '@/composables/useToast'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import {
  fetchInboundOrders,
  confirmInboundOrder,
  completeInboundOrder,
  cancelInboundOrder,
  deleteInboundOrder,
} from '@/api/inboundOrder'
import type { InboundOrder } from '@/types/inventory'

const toast = useToast()
const isLoading = ref(false)
const isConfirming = ref(false)
const isBulkDeleting = ref(false)
const isBulkProcessing = ref(false)
const rows = ref<InboundOrder[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(25)
const filterStatus = ref('')
const selectedIds = ref<string[]>([])

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

const isAllSelected = computed(() =>
  rows.value.length > 0 && rows.value.every(r => selectedIds.value.includes(r._id)),
)
const isPartialSelected = computed(() =>
  !isAllSelected.value && rows.value.some(r => selectedIds.value.includes(r._id)),
)

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedIds.value = []
  } else {
    selectedIds.value = rows.value.map(r => r._id)
  }
}

const statusLabel = (s: string) => {
  const map: Record<string, string> = { draft: '下書き', confirmed: '確認済', receiving: '入庫中', received: '検品済', done: '完了', cancelled: 'キャンセル' }
  return map[s] || s
}

const statusClass = (s: string) => {
  const map: Record<string, string> = {
    draft: 'o-status-tag--draft',
    confirmed: 'o-status-tag--issued',
    receiving: 'o-status-tag--printed',
    received: 'o-status-tag--issued',
    done: 'o-status-tag--confirmed',
    cancelled: 'o-status-tag--cancelled',
  }
  return map[s] || ''
}

const getDestCode = (row: InboundOrder) => {
  if (typeof row.destinationLocationId === 'object' && row.destinationLocationId?.code) {
    return row.destinationLocationId.code
  }
  return String(row.destinationLocationId || '-')
}

const totalExpected = (row: InboundOrder) => row.lines.reduce((sum, l) => sum + l.expectedQuantity, 0)
const totalReceived = (row: InboundOrder) => row.lines.reduce((sum, l) => sum + l.receivedQuantity, 0)

const formatDate = (d: string) => new Date(d).toLocaleDateString('ja-JP')
const formatDateTime = (d: string) => new Date(d).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })

const loadData = async () => {
  isLoading.value = true
  selectedIds.value = []
  try {
    const res = await fetchInboundOrders({
      status: filterStatus.value || undefined,
      page: currentPage.value,
      limit: pageSize.value,
    })
    rows.value = res.items
    total.value = res.total
  } catch (e: any) {
    toast.showError(e?.message || 'データの取得に失敗しました')
  } finally {
    isLoading.value = false
  }
}

const handleConfirm = async (row: InboundOrder) => {
  if (!confirm(`入庫指示 ${row.orderNumber} を確定しますか？`)) return
  isConfirming.value = true
  try {
    await confirmInboundOrder(row._id)
    toast.showSuccess('入庫指示を確定しました')
    await loadData()
  } catch (e: any) {
    toast.showError(e?.message || '確定に失敗しました')
  } finally {
    isConfirming.value = false
  }
}

const handleComplete = async (row: InboundOrder) => {
  const received = totalReceived(row)
  const expected = totalExpected(row)
  if (received < expected) {
    if (!confirm(`まだ未入庫の行があります（${received}/${expected}）。強制完了しますか？`)) return
  }
  try {
    await completeInboundOrder(row._id)
    toast.showSuccess('入庫指示を完了にしました')
    await loadData()
  } catch (e: any) {
    toast.showError(e?.message || '完了に失敗しました')
  }
}

const handleCancel = async (row: InboundOrder) => {
  if (!confirm(`入庫指示 ${row.orderNumber} をキャンセルしますか？`)) return
  try {
    await cancelInboundOrder(row._id)
    toast.showSuccess('入庫指示をキャンセルしました')
    await loadData()
  } catch (e: any) {
    toast.showError(e?.message || 'キャンセルに失敗しました')
  }
}

const handleDelete = async (row: InboundOrder) => {
  if (!confirm(`入庫指示 ${row.orderNumber} を削除しますか？`)) return
  try {
    await deleteInboundOrder(row._id)
    toast.showSuccess('入庫指示を削除しました')
    await loadData()
  } catch (e: any) {
    toast.showError(e?.message || '削除に失敗しました')
  }
}

const handleBulkDelete = async () => {
  const targets = rows.value.filter(r => selectedIds.value.includes(r._id) && r.status === 'draft')
  if (targets.length === 0) {
    toast.showError('削除可能な入庫指示（下書き状態）がありません')
    return
  }
  if (!confirm(`${targets.length}件の入庫指示を削除しますか？（下書き状態のみ）`)) return

  isBulkDeleting.value = true
  let successCount = 0
  let failCount = 0
  for (const row of targets) {
    try {
      await deleteInboundOrder(row._id)
      successCount++
    } catch {
      failCount++
    }
  }
  isBulkDeleting.value = false

  if (successCount > 0) toast.showSuccess(`${successCount}件を削除しました`)
  if (failCount > 0) toast.showError(`${failCount}件の削除に失敗しました`)
  await loadData()
}

const handleBulkCancel = async () => {
  const targets = rows.value.filter(
    r => selectedIds.value.includes(r._id) && r.status !== 'done' && r.status !== 'cancelled',
  )
  if (targets.length === 0) {
    toast.showError('キャンセル可能な入庫指示がありません')
    return
  }
  if (!confirm(`${targets.length}件の入庫指示をキャンセルしますか？`)) return

  isBulkProcessing.value = true
  let successCount = 0
  let failCount = 0
  for (const row of targets) {
    try {
      await cancelInboundOrder(row._id)
      successCount++
    } catch {
      failCount++
    }
  }
  isBulkProcessing.value = false

  if (successCount > 0) toast.showSuccess(`${successCount}件をキャンセルしました`)
  if (failCount > 0) toast.showError(`${failCount}件のキャンセルに失敗しました`)
  await loadData()
}

const openPrint = (id: string, type: 'inspection' | 'kanban' | 'barcode') => {
  window.open(`/inbound/print/${type}/${id}`, '_blank')
}

onMounted(() => loadData())
</script>

<style>
@import '@/styles/order-table.css';
</style>

<style scoped>
.inbound-order-list {
  display: flex;
  flex-direction: column;
  padding: 1rem;
}

.bulk-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #e3f2fd;
  border: 1px solid #90caf9;
  border-radius: 6px;
  margin-bottom: 8px;
}

.bulk-info {
  font-size: 13px;
  font-weight: 600;
  color: #1565c0;
  margin-right: 4px;
}

.row-selected {
  background: #e3f2fd !important;
}

.order-number {
  font-family: monospace;
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

.text-success { color: #67c23a; font-weight: 600; }
.o-table-td--right { text-align: right; }
.o-table-th--right { text-align: right; }

.o-status-tag--draft { background: #f4f4f5; color: #909399; }
.o-status-tag--cancelled { background: #fef0f0; color: #f56c6c; }
</style>
