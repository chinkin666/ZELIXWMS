<script setup lang="ts">
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
/**
 * 異常報告一覧 / 异常报告列表
 */
import { ref, onMounted } from 'vue'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/composables/useToast'
import { getApiBaseUrl } from '@/api/base'
import { useWmsUserStore } from '@/stores/wms/useWmsUserStore'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'

const userStore = useWmsUserStore()
const baseUrl = getApiBaseUrl()
const { showSuccess, showError } = useToast()

const reports = ref<any[]>([])
const loading = ref(false)
const statusFilter = ref('')
const slaInfo = ref<any>(null)

// ページネーション / 分页
const page = ref(1)
const limit = ref(20)
const total = ref(0)

// 新規異常ダイアログ / 新建异常对话框
const showCreateDialog = ref(false)
const createForm = ref({
  level: 'A' as string,
  category: 'appearance_defect' as string,
  description: '',
  sku: '',
  affectedQuantity: 0,
  suggestedAction: '',
})

async function loadData() {
  loading.value = true
  try {
    const qp = new URLSearchParams({ page: String(page.value), limit: String(limit.value) })
    if (statusFilter.value) qp.set('status', statusFilter.value)
    const [reportsRes, slaRes] = await Promise.all([
      fetch(`${baseUrl}/exceptions?${qp}`, { headers: { Authorization: `Bearer ${userStore.token}` } }),
      fetch(`${baseUrl}/exceptions/sla-status`, { headers: { Authorization: `Bearer ${userStore.token}` } }),
    ])
    const reportsData = await reportsRes.json()
    reports.value = reportsData.data || []
    total.value = reportsData.total ?? reportsData.data?.length ?? 0
    slaInfo.value = await slaRes.json()
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

async function createReport() {
  try {
    const res = await fetch(`${baseUrl}/exceptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userStore.token}` },
      body: JSON.stringify({
        ...createForm.value,
        referenceType: 'other',
        reportedBy: userStore.currentUser?.displayName || 'unknown',
      }),
    })
    if (res.ok) {
      showSuccess('異常報告を作成しました / 异常报告已创建')
      showCreateDialog.value = false
      createForm.value = { level: 'A', category: 'appearance_defect', description: '', sku: '', affectedQuantity: 0, suggestedAction: '' }
      await loadData()
    } else {
      showError('処理に失敗しました / 处理失败')
    }
  } catch (e: any) { showError(e.message) }
}

async function resolveReport(id: string) {
  const resolution = prompt('処理結果を入力 / 输入处理结果:')
  if (!resolution) return
  try {
    const res = await fetch(`${baseUrl}/exceptions/${id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userStore.token}` },
      body: JSON.stringify({ resolvedBy: userStore.currentUser?.displayName, resolution }),
    })
    if (res.ok) {
      showSuccess('処理完了')
    } else {
      showError('処理に失敗しました / 处理失败')
    }
    await loadData()
  } catch (e: any) { showError(e.message) }
}

function slaRemaining(deadline: string): string {
  const diff = new Date(deadline).getTime() - Date.now()
  if (diff <= 0) return '超過!'
  const min = Math.floor(diff / 60000)
  return min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min}m`
}

// ページネーション / 分页
const totalPages = () => Math.ceil(total.value / limit.value)
function prevPage() { if (page.value > 1) { page.value--; loadData() } }
function nextPage() { if (page.value < totalPages()) { page.value++; loadData() } }

onMounted(loadData)
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
      <h2 style="margin: 0">異常報告 / 异常报告</h2>
      <div style="display: flex; gap: 8px">
        <Select v-model="statusFilter">
          <SelectTrigger class="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">ステータス</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="notified">Notified</SelectItem>
            <SelectItem value="acknowledged">Acknowledged</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <Button class="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 bg-destructive text-destructive-foreground hover:bg-destructive/90" @click="showCreateDialog = true">+ 異常報告</Button>
      </div>
    </div>

    <!-- SLA サマリー / SLA 汇总 -->
    <div v-if="slaInfo" class="grid grid-cols-2 gap-4" style="margin-bottom: 16px">
      <div class="rounded-lg border bg-card shadow-sm p-4">
        <div style="color: #909399">未処理</div>
        <div style="font-size: 28px; font-weight: bold">{{ slaInfo.openCount || 0 }}</div>
      </div>
      <div class="rounded-lg border bg-card shadow-sm p-4" :style="{ background: slaInfo.breachedCount > 0 ? '#fef0f0' : '' }">
        <div style="color: #f56c6c">SLA 超過</div>
        <div style="font-size: 28px; font-weight: bold; color: #f56c6c">{{ slaInfo.breachedCount || 0 }}</div>
      </div>
    </div>

    <div class="rounded-md border overflow-auto">
      <Table class="w-full text-sm">
        <TableHeader>
          <TableRow class="border-b bg-muted/50">
            <TableHead class="h-10 px-2 text-left font-medium text-muted-foreground" style="width: 160px">報告番号</TableHead>
            <TableHead class="h-10 px-2 text-left font-medium text-muted-foreground" style="width: 80px">レベル</TableHead>
            <TableHead class="h-10 px-2 text-left font-medium text-muted-foreground" style="width: 140px">区分</TableHead>
            <TableHead class="h-10 px-2 text-left font-medium text-muted-foreground">内容</TableHead>
            <TableHead class="h-10 px-2 text-left font-medium text-muted-foreground" style="width: 100px">SLA</TableHead>
            <TableHead class="h-10 px-2 text-left font-medium text-muted-foreground" style="width: 110px">ステータス</TableHead>
            <TableHead class="h-10 px-2 text-left font-medium text-muted-foreground" style="width: 100px">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="loading">
            <TableCell colspan="7">
              <div class="space-y-3 p-4">
                <Skeleton class="h-4 w-[250px] mx-auto" />
                <Skeleton class="h-10 w-full" />
                <Skeleton class="h-10 w-full" />
                <Skeleton class="h-10 w-full" />
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-for="row in reports" :key="row._id" class="border-b hover:bg-muted/50">
            <TableCell class="p-2">{{ row.reportNumber }}</TableCell>
            <TableCell class="p-2">
              <span :class="row.level === 'C' ? 'bg-red-100 text-red-800' : row.level === 'B' ? 'bg-yellow-100 text-yellow-800' : 'bg-muted text-muted-foreground'" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium">
                {{ row.level }}
              </span>
            </TableCell>
            <TableCell class="p-2">{{ row.category }}</TableCell>
            <TableCell class="p-2 truncate max-w-xs" :title="row.description">{{ row.description }}</TableCell>
            <TableCell class="p-2">
              <span :style="{ color: row.slaBreached ? '#f56c6c' : '#67c23a', fontWeight: 'bold' }">
                {{ slaRemaining(row.slaDeadline) }}
              </span>
            </TableCell>
            <TableCell class="p-2">
              <span :class="row.status === 'resolved' ? 'bg-green-100 text-green-800' : row.status === 'open' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium">
                {{ row.status }}
              </span>
            </TableCell>
            <TableCell class="p-2">
              <Button v-if="['open', 'notified', 'acknowledged'].includes(row.status)" class="text-sm text-primary hover:underline" @click="resolveReport(row._id)">
                処理
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- ページネーション / 分页 -->
    <div v-if="total > limit" style="display: flex; justify-content: center; gap: 8px; margin-top: 16px">
      <Button class="inline-flex items-center justify-center rounded-md text-sm font-medium h-8 px-3 border border-input bg-background hover:bg-accent" :disabled="page <= 1" @click="prevPage">前へ</Button>
      <span class="flex items-center text-sm text-muted-foreground">{{ page }} / {{ totalPages() }}</span>
      <Button class="inline-flex items-center justify-center rounded-md text-sm font-medium h-8 px-3 border border-input bg-background hover:bg-accent" :disabled="page >= totalPages()" @click="nextPage">次へ</Button>
    </div>

    <!-- 新規異常ダイアログ / 新建异常对话框 -->
    <Dialog :open="showCreateDialog" @update:open="showCreateDialog = $event">
      <DialogContent class="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>異常報告作成 / 新建异常报告</DialogTitle>
        </DialogHeader>
        <div class="grid gap-4 py-4">
          <div class="grid grid-cols-4 items-center gap-4">
            <label class="text-right text-sm">レベル</label>
            <div class="col-span-3 flex gap-2">
              <label v-for="lv in [{v:'A',l:'A (一般)'},{v:'B',l:'B (重要)'},{v:'C',l:'C (緊急)'}]" :key="lv.v" class="inline-flex items-center gap-1 text-sm">
                <input type="radio" v-model="createForm.level" :value="lv.v" /> {{ lv.l }}
              </label>
            </div>
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <label class="text-right text-sm">区分</label>
            <Select v-model="createForm.category">
          <SelectTrigger class="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="quantity_variance">数量差異</SelectItem>
            <SelectItem value="label_error">ラベル異常</SelectItem>
            <SelectItem value="appearance_defect">外観不良</SelectItem>
            <SelectItem value="packaging_issue">包装異常</SelectItem>
            <SelectItem value="mixed_shipment">混載異常</SelectItem>
            <SelectItem value="other">その他</SelectItem>
          </SelectContent>
        </Select>
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <label class="text-right text-sm">SKU</label>
            <Input v-model="createForm.sku" class="col-span-3 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" />
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <label class="text-right text-sm">影響数量</label>
            <Input v-model.number="createForm.affectedQuantity" type="number" min="0" class="col-span-3 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" />
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <label class="text-right text-sm">内容</label>
            <textarea v-model="createForm.description" rows="3" class="col-span-3 flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <label class="text-right text-sm">推奨対応</label>
            <Input v-model="createForm.suggestedAction" class="col-span-3 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" />
          </div>
        </div>
        <DialogFooter>
          <Button class="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 border border-input bg-background hover:bg-accent" @click="showCreateDialog = false">キャンセル</Button>
          <Button class="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90" @click="createReport">作成</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
