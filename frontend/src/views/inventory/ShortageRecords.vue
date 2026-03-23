<template>
  <div class="shortage-records">
    <PageHeader :title="t('wms.inventory.shortage.title', '欠品管理')" :show-search="false">
      <template #actions>
        <Select :model-value="statusFilter || '__all__'" @update:model-value="(v: string) => { statusFilter = v === '__all__' ? '' : v; load() }">
          <SelectTrigger class="flex h-9 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{{ t('wms.common.status', 'ステータス') }}</SelectItem>
            <SelectItem value="pending">保留中 / 待处理</SelectItem>
            <SelectItem value="reserved">引当済 / 已预留</SelectItem>
            <SelectItem value="fulfilled">充足済 / 已满足</SelectItem>
            <SelectItem value="cancelled">キャンセル / 已取消</SelectItem>
          </SelectContent>
        </Select>
      </template>
    </PageHeader>

    <div class="table-section">
      <div class="rounded-md border overflow-auto">
        <Table class="w-full text-sm">
          <TableHeader>
            <TableRow class="border-b bg-muted/50">
              <TableHead class="h-10 px-2 text-left font-medium text-muted-foreground" style="width: 160px">{{ t('wms.inventory.shortage.orderNumber', '注文番号') }}</TableHead>
              <TableHead class="h-10 px-2 text-left font-medium text-muted-foreground" style="min-width: 180px">{{ t('wms.inventory.shortage.product', '商品') }}</TableHead>
              <TableHead class="h-10 px-2 text-right font-medium text-muted-foreground" style="width: 100px">{{ t('wms.inventory.shortage.requested', '要求数') }}</TableHead>
              <TableHead class="h-10 px-2 text-right font-medium text-muted-foreground" style="width: 100px">{{ t('wms.inventory.shortage.available', '在庫数') }}</TableHead>
              <TableHead class="h-10 px-2 text-right font-medium text-muted-foreground" style="width: 100px">{{ t('wms.inventory.shortage.shortage', '欠品数') }}</TableHead>
              <TableHead class="h-10 px-2 text-left font-medium text-muted-foreground" style="width: 120px">{{ t('wms.common.status', 'ステータス') }}</TableHead>
              <TableHead class="h-10 px-2 text-left font-medium text-muted-foreground" style="width: 160px">{{ t('wms.common.date', '日付') }}</TableHead>
              <TableHead class="h-10 px-2 text-left font-medium text-muted-foreground" style="width: 240px">{{ t('wms.common.actions', '操作') }}</TableHead>
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
              <TableCell class="p-2">{{ row.orderNumber }}</TableCell>
              <TableCell class="p-2">{{ row.productName }}</TableCell>
              <TableCell class="p-2 text-right">{{ row.requestedQty }}</TableCell>
              <TableCell class="p-2 text-right">{{ row.availableQty }}</TableCell>
              <TableCell class="p-2 text-right">
                <span style="color: #ef4444; font-weight: 600">{{ row.shortageQty }}</span>
              </TableCell>
              <TableCell class="p-2">
                <span :class="statusTagClass(row.status)" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium">{{ statusLabel(row.status) }}</span>
              </TableCell>
              <TableCell class="p-2">{{ formatDate(row.createdAt) }}</TableCell>
              <TableCell class="p-2">
                <div class="flex gap-1">
                  <Button v-if="row.status === 'pending'" class="inline-flex items-center justify-center rounded-md text-sm font-medium h-8 px-3 bg-primary text-primary-foreground hover:bg-primary/90" @click="handleAction(row, 'reserve')">
                    引当 / 预留
                  </Button>
                  <Button v-if="row.status === 'reserved'" class="inline-flex items-center justify-center rounded-md text-sm font-medium h-8 px-3 bg-green-600 text-white hover:bg-green-700" @click="handleAction(row, 'fulfill')">
                    充足 / 满足
                  </Button>
                  <Button v-if="row.status === 'pending' || row.status === 'reserved'" class="inline-flex items-center justify-center rounded-md text-sm font-medium h-8 px-3 bg-destructive text-destructive-foreground hover:bg-destructive/90" @click="handleAction(row, 'cancel')">
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
// 欠品管理ページ / 欠品管理页面
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
    reserved: 'bg-blue-100 text-blue-800',
    fulfilled: 'bg-green-100 text-green-800',
    cancelled: 'bg-muted text-muted-foreground',
  }
  return map[status] ?? 'bg-muted text-muted-foreground'
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
    const json = await http.get<any>(`/shortage-records${params}`)
    items.value = Array.isArray(json) ? json : (json.items ?? [])
  } catch (e: any) {
    showToast(e?.message || t('wms.inventory.shortage.loadError', '欠品データの読み込みに失敗しました'), 'danger')
  } finally {
    loading.value = false
  }
}

// アクション / 操作
async function handleAction(row: any, action: 'reserve' | 'fulfill' | 'cancel') {
  try {
    await http.patch<any>(`/shortage-records/${row._id}`, { action })
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
