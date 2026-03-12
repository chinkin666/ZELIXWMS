<template>
  <div class="inventory-movements">
    <ControlPanel title="入出庫履歴" :show-search="false">
      <template #actions>
        <div style="display:flex;gap:6px;align-items:center;">
          <select v-model="filterMoveType" class="o-input o-input-sm" style="width:120px;" @change="loadData">
            <option value="">全タイプ</option>
            <option value="inbound">入庫</option>
            <option value="outbound">出庫</option>
            <option value="transfer">移動</option>
            <option value="adjustment">調整</option>
            <option value="return">返品</option>
          </select>
          <select v-model="filterState" class="o-input o-input-sm" style="width:100px;" @change="loadData">
            <option value="">全状態</option>
            <option value="draft">下書き</option>
            <option value="confirmed">確認済</option>
            <option value="done">完了</option>
            <option value="cancelled">取消</option>
          </select>
          <OButton variant="secondary" size="sm" @click="exportCsv">CSV出力</OButton>
        </div>
      </template>
    </ControlPanel>

    <div class="o-table-wrapper">
      <table class="o-table">
        <thead>
          <tr>
            <th class="o-table-th" style="width:160px;">移動番号</th>
            <th class="o-table-th" style="width:80px;">タイプ</th>
            <th class="o-table-th" style="width:80px;">状態</th>
            <th class="o-table-th" style="width:120px;">SKU</th>
            <th class="o-table-th" style="width:160px;">商品名</th>
            <th class="o-table-th o-table-th--right" style="width:80px;">数量</th>
            <th class="o-table-th" style="width:160px;">移動元</th>
            <th class="o-table-th" style="width:160px;">移動先</th>
            <th class="o-table-th" style="width:140px;">関連</th>
            <th class="o-table-th" style="width:140px;">実行日時</th>
            <th class="o-table-th" style="width:160px;">メモ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="11" class="o-table-empty">読み込み中...</td>
          </tr>
          <tr v-else-if="rows.length === 0">
            <td colspan="11" class="o-table-empty">データがありません</td>
          </tr>
          <tr v-for="row in rows" :key="row._id" class="o-table-row">
            <td class="o-table-td"><span class="move-number">{{ row.moveNumber }}</span></td>
            <td class="o-table-td">
              <span class="move-type-badge" :class="'move-type--' + row.moveType">{{ moveTypeLabel(row.moveType) }}</span>
            </td>
            <td class="o-table-td">
              <span class="o-status-tag" :class="stateClass(row.state)">{{ stateLabel(row.state) }}</span>
            </td>
            <td class="o-table-td">{{ row.productSku }}</td>
            <td class="o-table-td">{{ row.productName || '-' }}</td>
            <td class="o-table-td o-table-td--right">{{ row.quantity }}</td>
            <td class="o-table-td">
              <span class="location-badge">{{ row.fromLocation?.code || '-' }}</span>
            </td>
            <td class="o-table-td">
              <span class="location-badge">{{ row.toLocation?.code || '-' }}</span>
            </td>
            <td class="o-table-td">
              <span v-if="row.referenceNumber" class="text-muted">{{ row.referenceNumber }}</span>
              <span v-else>-</span>
            </td>
            <td class="o-table-td">{{ row.executedAt ? formatDateTime(row.executedAt) : row.createdAt ? formatDateTime(row.createdAt) : '-' }}</td>
            <td class="o-table-td">{{ row.memo || '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="o-table-pagination">
      <span class="o-table-pagination__info">{{ total }} 件中 {{ rows.length }} 件表示</span>
      <div class="o-table-pagination__controls">
        <select class="o-input o-input-sm" v-model.number="pageSize" style="width:80px;">
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
import { fetchMovements } from '@/api/inventory'
import type { StockMove } from '@/types/inventory'

const toast = useToast()
const isLoading = ref(false)
const rows = ref<StockMove[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(50)
const filterMoveType = ref('')
const filterState = ref('')

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

const moveTypeLabel = (t: string) => {
  const map: Record<string, string> = { inbound: '入庫', outbound: '出庫', transfer: '移動', adjustment: '調整', return: '返品' }
  return map[t] || t
}

const stateLabel = (s: string) => {
  const map: Record<string, string> = { draft: '下書き', confirmed: '確認済', done: '完了', cancelled: '取消' }
  return map[s] || s
}

const stateClass = (s: string) => {
  const map: Record<string, string> = {
    draft: 'o-status-tag--draft',
    confirmed: 'o-status-tag--issued',
    done: 'o-status-tag--confirmed',
    cancelled: 'o-status-tag--cancelled',
  }
  return map[s] || ''
}

const formatDateTime = (d: string) => {
  if (!d) return '-'
  return new Date(d).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const exportCsv = () => {
  const csvRows: string[] = ['移動番号,タイプ,状態,SKU,商品名,数量,移動元,移動先,関連番号,実行日時,メモ']
  for (const r of rows.value) {
    csvRows.push([
      `"${r.moveNumber}"`,
      moveTypeLabel(r.moveType),
      stateLabel(r.state),
      `"${r.productSku}"`,
      `"${r.productName || ''}"`,
      r.quantity,
      `"${r.fromLocation?.code || ''}"`,
      `"${r.toLocation?.code || ''}"`,
      `"${r.referenceNumber || ''}"`,
      r.executedAt ? formatDateTime(r.executedAt) : '',
      `"${r.memo || ''}"`,
    ].join(','))
  }
  const bom = '\uFEFF'
  const blob = new Blob([bom + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `movements_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const loadData = async () => {
  isLoading.value = true
  try {
    const res = await fetchMovements({
      moveType: filterMoveType.value || undefined,
      state: filterState.value || undefined,
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

onMounted(() => loadData())
</script>

<style>
@import '@/styles/order-table.css';
</style>

<style scoped>
.inventory-movements {
  display: flex;
  flex-direction: column;
  padding: 1rem;
}

.move-number {
  font-family: monospace;
  font-size: 12px;
  color: var(--o-brand-primary, #714b67);
  font-weight: 600;
}

.move-type-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 600;
}

.move-type--inbound { background: #e1f3d8; color: #67c23a; }
.move-type--outbound { background: #fef0f0; color: #f56c6c; }
.move-type--transfer { background: #d9ecff; color: #409eff; }
.move-type--adjustment { background: #fdf6ec; color: #e6a23c; }
.move-type--return { background: #f4f4f5; color: #909399; }

.o-status-tag--draft { background: #f4f4f5; color: #909399; }
.o-status-tag--cancelled { background: #fef0f0; color: #f56c6c; text-decoration: line-through; }

.location-badge {
  font-family: monospace;
  font-size: 12px;
  background: var(--o-gray-100, #f5f7fa);
  padding: 2px 6px;
  border-radius: 3px;
}

.text-muted { color: var(--o-gray-500, #909399); font-size: 12px; }
.o-table-td--right { text-align: right; }
.o-table-th--right { text-align: right; }
</style>
