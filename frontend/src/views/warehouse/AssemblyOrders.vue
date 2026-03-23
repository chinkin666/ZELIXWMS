<template>
  <div class="assembly-orders">
    <PageHeader :title="t('wms.warehouse.assembly.title', 'セット組み作業')" :show-search="false">
      <template #actions>
        <select v-model="statusFilter" class="flex h-9 w-40 rounded-md border border-input bg-transparent px-3 py-1 text-sm" @change="load">
          <option value="">{{ t('wms.common.status', 'ステータス') }}</option>
          <option value="pending">未着手 / 未开始</option>
          <option value="in_progress">作業中 / 进行中</option>
          <option value="completed">完了 / 已完成</option>
          <option value="cancelled">キャンセル / 已取消</option>
        </select>
      </template>
    </PageHeader>

    <div class="table-section">
      <div class="rounded-md border overflow-auto">
        <Table class="w-full text-sm">
          <TableHeader>
            <TableRow class="border-b bg-muted/50">
              <TableHead class="h-10 px-2 text-left font-medium text-muted-foreground" style="width: 160px">{{ t('wms.warehouse.assembly.number', '指示番号') }}</TableHead>
              <TableHead class="h-10 px-2 text-left font-medium text-muted-foreground" style="min-width: 200px">{{ t('wms.warehouse.assembly.setProduct', 'セット商品') }}</TableHead>
              <TableHead class="h-10 px-2 text-right font-medium text-muted-foreground" style="width: 100px">{{ t('wms.warehouse.assembly.targetQty', '目標数') }}</TableHead>
              <TableHead class="h-10 px-2 text-right font-medium text-muted-foreground" style="width: 100px">{{ t('wms.warehouse.assembly.assembledQty', '完了数') }}</TableHead>
              <TableHead class="h-10 px-2 text-left font-medium text-muted-foreground" style="width: 120px">{{ t('wms.common.status', 'ステータス') }}</TableHead>
              <TableHead class="h-10 px-2 text-left font-medium text-muted-foreground" style="width: 140px">{{ t('wms.warehouse.assembly.assignedTo', '担当者') }}</TableHead>
              <TableHead class="h-10 px-2 text-left font-medium text-muted-foreground" style="width: 160px">{{ t('wms.common.date', '日付') }}</TableHead>
              <TableHead class="h-10 px-2 text-left font-medium text-muted-foreground" style="width: 260px">{{ t('wms.common.actions', '操作') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="loading">
              <TableCell colspan="8">
                <div class="space-y-3 p-4">
                  <Skeleton class="h-4 w-[250px] mx-auto" />
                  <Skeleton class="h-10 w-full" />
                  <Skeleton class="h-10 w-full" />
                  <Skeleton class="h-10 w-full" />
                </div>
              </TableCell>
            </TableRow>
            <TableRow v-for="row in items" :key="row._id" class="border-b hover:bg-muted/50">
              <TableCell class="p-2">{{ row.assemblyNumber }}</TableCell>
              <TableCell class="p-2">{{ row.setProductName }}</TableCell>
              <TableCell class="p-2 text-right">{{ row.targetQty }}</TableCell>
              <TableCell class="p-2 text-right">
                <span :style="{ color: row.assembledQty >= row.targetQty ? '#22c55e' : 'inherit', fontWeight: 600 }">
                  {{ row.assembledQty }}
                </span>
              </TableCell>
              <TableCell class="p-2">
                <span :class="statusTagClass(row.status)" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium">{{ statusLabel(row.status) }}</span>
              </TableCell>
              <TableCell class="p-2">{{ row.assignedTo }}</TableCell>
              <TableCell class="p-2">{{ formatDate(row.createdAt) }}</TableCell>
              <TableCell class="p-2">
                <div class="flex gap-1">
                  <Button v-if="row.status === 'pending'" class="inline-flex items-center justify-center rounded-md text-sm font-medium h-8 px-3 bg-primary text-primary-foreground hover:bg-primary/90" @click="handleAction(row, 'start')">
                    開始 / 开始
                  </Button>
                  <Button v-if="row.status === 'in_progress'" class="inline-flex items-center justify-center rounded-md text-sm font-medium h-8 px-3 bg-green-600 text-white hover:bg-green-700" @click="handleAction(row, 'complete')">
                    完了 / 完成
                  </Button>
                  <Button v-if="row.status !== 'completed' && row.status !== 'cancelled'" class="inline-flex items-center justify-center rounded-md text-sm font-medium h-8 px-3 bg-destructive text-destructive-foreground hover:bg-destructive/90" @click="handleAction(row, 'cancel')">
                    取消
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
// セット組み作業ページ / 套装组装作业页面
import { ref, onMounted } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useToast } from '@/composables/useToast'
import { http } from '@/api/http'
import PageHeader from '@/components/shared/PageHeader.vue'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'

const { t } = useI18n()
const { show: showToast } = useToast()
const items = ref<any[]>([])
const loading = ref(false)
const statusFilter = ref('')

// ステータス表示 / 状态显示
const statusTagClass = (status: string): string => {
  const map: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-muted text-muted-foreground',
  }
  return map[status] ?? 'bg-muted text-muted-foreground'
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
