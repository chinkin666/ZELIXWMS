<template>
  <div class="stocktaking-discrepancies">
    <PageHeader :title="t('wms.inventory.discrepancy.title', '棚卸差異')" :show-search="false">
      <template #actions>
        <Select :model-value="statusFilter || '__all__'" @update:model-value="(v: string) => { statusFilter = v === '__all__' ? '' : v; load() }">
          <SelectTrigger class="flex h-9 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{{ t('wms.common.status', 'ステータス') }}</SelectItem>
            <SelectItem value="pending">未処理 / 待处理</SelectItem>
            <SelectItem value="approved">承認済 / 已批准</SelectItem>
            <SelectItem value="rejected">却下 / 已拒绝</SelectItem>
          </SelectContent>
        </Select>
      </template>
    </PageHeader>

    <div class="table-section">
      <div class="rounded-md border overflow-auto">
        <Table class="w-full text-sm">
          <TableHeader>
            <TableRow class="border-b bg-muted/50">
              <TableHead class="h-10 px-2 text-left font-medium text-muted-foreground" style="width: 160px">{{ t('wms.inventory.discrepancy.stocktakingNumber', '棚卸番号') }}</TableHead>
              <TableHead class="h-10 px-2 text-left font-medium text-muted-foreground" style="min-width: 180px">{{ t('wms.inventory.discrepancy.product', '商品') }}</TableHead>
              <TableHead class="h-10 px-2 text-left font-medium text-muted-foreground" style="width: 140px">{{ t('wms.inventory.discrepancy.location', 'ロケーション') }}</TableHead>
              <TableHead class="h-10 px-2 text-right font-medium text-muted-foreground" style="width: 110px">{{ t('wms.inventory.discrepancy.systemQty', 'システム数') }}</TableHead>
              <TableHead class="h-10 px-2 text-right font-medium text-muted-foreground" style="width: 110px">{{ t('wms.inventory.discrepancy.countedQty', '実棚数') }}</TableHead>
              <TableHead class="h-10 px-2 text-right font-medium text-muted-foreground" style="width: 110px">{{ t('wms.inventory.discrepancy.discrepancy', '差異') }}</TableHead>
              <TableHead class="h-10 px-2 text-left font-medium text-muted-foreground" style="width: 120px">{{ t('wms.common.status', 'ステータス') }}</TableHead>
              <TableHead class="h-10 px-2 text-left font-medium text-muted-foreground" style="width: 200px">{{ t('wms.common.actions', '操作') }}</TableHead>
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
              <TableCell class="p-2">{{ row.stocktakingNumber }}</TableCell>
              <TableCell class="p-2">{{ row.productName }}</TableCell>
              <TableCell class="p-2">{{ row.locationName }}</TableCell>
              <TableCell class="p-2 text-right">{{ row.systemQty }}</TableCell>
              <TableCell class="p-2 text-right">{{ row.countedQty }}</TableCell>
              <TableCell class="p-2 text-right">
                <span :style="{ color: discrepancyColor(row), fontWeight: 600 }">
                  {{ discrepancyValue(row) > 0 ? '+' : '' }}{{ discrepancyValue(row) }}
                </span>
              </TableCell>
              <TableCell class="p-2">
                <span :class="statusTagClass(row.status)" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium">{{ statusLabel(row.status) }}</span>
              </TableCell>
              <TableCell class="p-2">
                <div class="flex gap-1">
                  <Button v-if="row.status === 'pending'" class="inline-flex items-center justify-center rounded-md text-sm font-medium h-8 px-3 bg-green-600 text-white hover:bg-green-700" @click="handleAction(row, 'approve')">
                    承認 / 批准
                  </Button>
                  <Button v-if="row.status === 'pending'" class="inline-flex items-center justify-center rounded-md text-sm font-medium h-8 px-3 bg-destructive text-destructive-foreground hover:bg-destructive/90" @click="handleAction(row, 'reject')">
                    却下 / 拒绝
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
// 棚卸差異ページ / 盘点差异页面
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

// 差異計算 / 差异计算
const discrepancyValue = (row: any): number => {
  return (row.countedQty ?? 0) - (row.systemQty ?? 0)
}

// 差異色分け / 差异颜色
const discrepancyColor = (row: any): string => {
  const diff = discrepancyValue(row)
  if (diff > 0) return '#22c55e'
  if (diff < 0) return '#ef4444'
  return 'inherit'
}

// ステータス表示 / 状态显示
const statusTagClass = (status: string): string => {
  const map: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  }
  return map[status] ?? 'bg-muted text-muted-foreground'
}

const statusLabel = (status: string): string => {
  const map: Record<string, string> = {
    pending: '未処理 / 待处理',
    approved: '承認済 / 已批准',
    rejected: '却下 / 已拒绝',
  }
  return map[status] ?? status
}

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
