<template>
  <div class="shipment-stop">
    <PageHeader :title="t('wms.shipment.stopTitle', '出荷停止')" :show-search="false">
      <template #actions>
        <Button variant="secondary" size="sm" @click="loadData">{{ t('wms.common.refresh', '更新') }}</Button>
        <Button variant="default" size="sm" @click="showStopDialog = true">停止</Button>
        <Button variant="secondary" size="sm" @click="showCsvDialog = true">CSV一括停止</Button>
        <Button variant="secondary" size="sm" @click="downloadCsv">CSV出力</Button>
      </template>
    </PageHeader>

    <!-- 集計カード / 统计卡片 -->
    <div class="summary-cards">
      <div class="summary-card">
        <div class="summary-value">{{ stoppedOrders.length }}</div>
        <div class="summary-label">停止中</div>
      </div>
      <div class="summary-card" v-if="selectedIds.length > 0">
        <div class="summary-value">{{ selectedIds.length }}</div>
        <div class="summary-label">選択中</div>
      </div>
    </div>

    <!-- 停止中一覧 / 停止中列表 -->
    <div class="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><Checkbox :checked="selectAll" @update:checked="(v: boolean) => { selectAll = v; toggleSelectAll() }" /></TableHead>
            <TableHead>注文番号</TableHead>
            <TableHead>お届け先</TableHead>
            <TableHead>停止日時</TableHead>
            <TableHead>理由</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="stoppedOrders.length === 0">
            <TableCell colspan="6" class="text-center py-8 text-muted-foreground">停止中の注文はありません</TableCell>
          </TableRow>
          <TableRow v-for="order in stoppedOrders" :key="order.id">
            <TableCell><Checkbox :checked="selectedIds.includes(order.id)" @update:checked="(v: boolean) => { if (v) { selectedIds.push(order.id) } else { selectedIds = selectedIds.filter(id => id !== order.id) } }" /></TableCell>
            <TableCell>{{ order.orderNumber }}</TableCell>
            <TableCell>{{ order.recipientName || '-' }}</TableCell>
            <TableCell>{{ formatDate(order.statusHeldAt) }}</TableCell>
            <TableCell>{{ order.customFields?.holdReason || '-' }}</TableCell>
            <TableCell>
              <Button class="btn-action" @click="releaseOrder(order.id)">解除</Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- 一括解除ボタン / 批量解除按钮 -->
    <div v-if="selectedIds.length > 0" class="bulk-actions">
      <span>{{ selectedIds.length }}件選択中</span>
      <Button variant="default" size="sm" @click="releaseBulk">一括解除</Button>
    </div>

    <!-- 停止ダイアログ / 停止对话框 -->
    <div v-if="showStopDialog" class="dialog-overlay" @click.self="showStopDialog = false">
      <div class="dialog">
        <h3 class="dialog-title">出荷停止</h3>
        <div class="dialog-body">
          <label class="dialog-label">停止する注文IDを入力（カンマ区切り）</label>
          <Textarea v-model="stopIdsInput" class="dialog-textarea" rows="3" placeholder="ID1, ID2, ..."></Textarea>
          <label class="dialog-label">停止理由（必須）</label>
          <Input v-model="stopReason" placeholder="例: 在庫不足のため停止" />
        </div>
        <div class="dialog-actions">
          <Button variant="secondary" size="sm" @click="showStopDialog = false">キャンセル</Button>
          <Button variant="default" size="sm" @click="executeStop" :disabled="!stopReason.trim()">停止実行</Button>
        </div>
      </div>
    </div>

    <!-- CSV一括停止ダイアログ / CSV批量停止对话框 -->
    <div v-if="showCsvDialog" class="dialog-overlay" @click.self="showCsvDialog = false">
      <div class="dialog">
        <h3 class="dialog-title">CSV一括出荷停止</h3>
        <div class="dialog-body">
          <label class="dialog-label">CSVファイル（注文番号列を含む）</label>
          <input type="file" accept=".csv" @change="handleCsvFile" class="dialog-file-input" />
          <div v-if="csvOrderNumbers.length > 0" class="csv-preview">
            {{ csvOrderNumbers.length }}件の注文番号を読込みました
          </div>
          <label class="dialog-label">停止理由（必須）</label>
          <Input v-model="csvStopReason" placeholder="例: 一括停止指示" />
        </div>
        <div class="dialog-actions">
          <Button variant="secondary" size="sm" @click="showCsvDialog = false">キャンセル</Button>
          <Button variant="default" size="sm" @click="executeCsvStop" :disabled="csvOrderNumbers.length === 0 || !csvStopReason.trim()">停止実行</Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Textarea } from '@/components/ui/textarea'
// 出荷停止画面 / 出货停止页面
import { onMounted, ref } from 'vue'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import PageHeader from '@/components/shared/PageHeader.vue'
import { apiFetch } from '@/api/http'
import { getApiBaseUrl } from '@/api/base'

const API_BASE_URL = getApiBaseUrl()
const toast = useToast()
const { t } = useI18n()

// 停止中注文一覧 / 停止中订单列表
const stoppedOrders = ref<any[]>([])
const selectedIds = ref<string[]>([])
const selectAll = ref(false)

// 停止ダイアログ / 停止对话框
const showStopDialog = ref(false)
const stopIdsInput = ref('')
const stopReason = ref('')

// CSV一括停止ダイアログ / CSV批量停止对话框
const showCsvDialog = ref(false)
const csvOrderNumbers = ref<string[]>([])
const csvStopReason = ref('')

// 日付フォーマット / 日期格式化
function formatDate(d: string | undefined) {
  if (!d) return '-'
  return new Date(d).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// データ読込 / 加载数据
async function loadData() {
  try {
    const res = await apiFetch(`${API_BASE_URL}/shipment-orders/stop/list`)
    if (!res.ok) {
      toast.showError('データの取得に失敗しました')
      return
    }
    const data = await res.json()
    stoppedOrders.value = data.items || []
  } catch {
    toast.showError('データの取得に失敗しました')
  }
}

// 出荷停止実行 / 执行出货停止
async function executeStop() {
  const ids = stopIdsInput.value.split(',').map((s) => s.trim()).filter(Boolean)
  if (ids.length === 0) {
    toast.showError('IDを入力してください')
    return
  }
  try {
    const res = await apiFetch(`${API_BASE_URL}/shipment-orders/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, reason: stopReason.value.trim() }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast.showError(err.message || '停止処理に失敗しました')
      return
    }
    const data = await res.json()
    toast.showSuccess(`${data.stopped}件を停止しました`)
    showStopDialog.value = false
    stopIdsInput.value = ''
    stopReason.value = ''
    loadData()
  } catch {
    toast.showError('停止処理に失敗しました')
  }
}

// CSV読込 / CSV读取
function handleCsvFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target?.result as string
    if (!text) return
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
    // ヘッダ行をスキップし、各行の最初の列を注文番号として取得
    // 跳过表头行，获取每行的第一列作为订单编号
    const numbers: string[] = []
    for (let i = 0; i < lines.length; i++) {
      const cols = lines[i].split(',')
      const val = cols[0]?.trim().replace(/^"(.*)"$/, '$1')
      if (!val) continue
      // ヘッダ行のスキップ判定（数字で始まらない場合はスキップ）
      // 表头行判定（不以数字开头则跳过）— ただし注文番号は文字列の場合もあるので1行目のみスキップ
      if (i === 0 && /^[a-zA-Z]/.test(val)) continue
      numbers.push(val)
    }
    csvOrderNumbers.value = numbers
  }
  reader.readAsText(file, 'UTF-8')
}

// CSV一括停止実行 / CSV批量停止执行
async function executeCsvStop() {
  if (csvOrderNumbers.value.length === 0) return
  try {
    const res = await apiFetch(`${API_BASE_URL}/shipment-orders/stop/bulk-csv`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderNumbers: csvOrderNumbers.value, reason: csvStopReason.value.trim() }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast.showError(err.message || 'CSV停止処理に失敗しました')
      return
    }
    const data = await res.json()
    const notFoundMsg = data.notFound?.length > 0 ? ` (未該当: ${data.notFound.length}件)` : ''
    toast.showSuccess(`${data.stopped}件を停止しました${notFoundMsg}`)
    showCsvDialog.value = false
    csvOrderNumbers.value = []
    csvStopReason.value = ''
    loadData()
  } catch {
    toast.showError('CSV停止処理に失敗しました')
  }
}

// 単一解除 / 单个解除
async function releaseOrder(orderId: string) {
  try {
    const res = await apiFetch(`${API_BASE_URL}/shipment-orders/stop/release`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [orderId] }),
    })
    if (!res.ok) {
      toast.showError('解除に失敗しました')
      return
    }
    toast.showSuccess('停止を解除しました')
    loadData()
  } catch {
    toast.showError('解除に失敗しました')
  }
}

// 一括解除 / 批量解除
async function releaseBulk() {
  try {
    const res = await apiFetch(`${API_BASE_URL}/shipment-orders/stop/release`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: selectedIds.value }),
    })
    if (!res.ok) {
      toast.showError('一括解除に失敗しました')
      return
    }
    const data = await res.json()
    toast.showSuccess(`${data.released}件を解除しました`)
    selectedIds.value = []
    selectAll.value = false
    loadData()
  } catch {
    toast.showError('一括解除に失敗しました')
  }
}

// 全選択切替 / 全选切换
function toggleSelectAll() {
  if (selectAll.value) {
    selectedIds.value = stoppedOrders.value.map((o: any) => o.id)
  } else {
    selectedIds.value = []
  }
}

// CSV出力 / CSV导出
function downloadCsv() {
  if (stoppedOrders.value.length === 0) {
    toast.showError('出力対象がありません')
    return
  }
  const headers = ['注文番号', 'お届け先', '停止日時', '理由']
  const lines = [headers.join(',')]
  for (const order of stoppedOrders.value) {
    const row = [
      order.orderNumber || '',
      order.recipientName || '',
      order.statusHeldAt ? new Date(order.statusHeldAt).toISOString() : '',
      (order.customFields?.holdReason || '').replace(/,/g, '，'),
    ]
    lines.push(row.join(','))
  }
  const bom = '\uFEFF'
  const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `shipment-stop-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(loadData)
</script>

<style scoped>
.shipment-stop { display: flex; flex-direction: column; gap: 16px; padding: 0 20px 20px; }
:deep(.o-control-panel) { margin-left: -20px; margin-right: -20px; }
.summary-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
.summary-card { background: var(--o-view-background, #fff); border: 1px solid var(--o-border-color, #e4e7ed); border-radius: 8px; padding: 16px; text-align: center; }
.summary-value { font-size: 28px; font-weight: 700; color: var(--o-primary, #017e84); }
.summary-label { font-size: 13px; color: var(--o-gray-600, #606266); margin-top: 4px; }
.btn-action { padding: 4px 12px; border: 1px solid var(--o-primary, #017e84); border-radius: 4px; background: transparent; color: var(--o-primary, #017e84); cursor: pointer; font-size: 12px; }
.btn-action:hover { background: var(--o-primary, #017e84); color: white; }
.bulk-actions { display: flex; align-items: center; gap: 12px; padding: 8px 0; }
/* ダイアログ / 对话框 */
.dialog-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.dialog { background: var(--o-view-background, #fff); border-radius: 12px; padding: 24px; width: 480px; max-width: 90vw; box-shadow: 0 8px 32px rgba(0,0,0,0.15); }
.dialog-title { margin: 0 0 16px; font-size: 18px; font-weight: 600; }
.dialog-body { display: flex; flex-direction: column; gap: 12px; }
.dialog-label { font-size: 13px; font-weight: 500; color: var(--o-gray-700, #303133); }
.dialog-input { padding: 8px 12px; border: 1px solid var(--o-border-color, #dcdfe6); border-radius: 6px; font-size: 14px; }
.dialog-textarea { padding: 8px 12px; border: 1px solid var(--o-border-color, #dcdfe6); border-radius: 6px; font-size: 14px; resize: vertical; }
.dialog-file-input { font-size: 13px; }
.csv-preview { padding: 8px 12px; background: #e8f5e9; border-radius: 6px; font-size: 13px; color: #2e7d32; }
.dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
@import '@/styles/order-table.css';
</style>
