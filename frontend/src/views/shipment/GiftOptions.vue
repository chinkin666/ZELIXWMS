<template>
  <div class="gift-options">
    <PageHeader :title="t('wms.shipment.gift.title', 'ギフト設定')" :show-search="false" />

    <div class="cards-section">
      <div class="grid grid-cols-3 gap-4">
        <!-- ラッピングカラー / 包装颜色 -->
        <div class="rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow">
          <div class="border-b px-4 py-3">
            <span style="font-weight: 600">🎁 ラッピング / 包装</span>
          </div>
          <div class="p-4">
            <div class="rounded-md border overflow-auto">
              <Table class="w-full text-sm">
                <TableHeader>
                  <TableRow class="border-b bg-muted/50">
                    <TableHead class="h-8 px-2 text-left font-medium text-muted-foreground" style="min-width: 120px">名称</TableHead>
                    <TableHead class="h-8 px-2 text-left font-medium text-muted-foreground" style="width: 100px">カラー / 颜色</TableHead>
                    <TableHead class="h-8 px-2 text-right font-medium text-muted-foreground" style="width: 100px">料金 / 价格</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="row in wrappingItems" :key="row._id" class="border-b hover:bg-muted/50">
                    <TableCell class="p-2">{{ row.name }}</TableCell>
                    <TableCell class="p-2">
                      <div v-if="row.color" style="display: flex; align-items: center; gap: 6px">
                        <span :style="{ display: 'inline-block', width: '16px', height: '16px', borderRadius: '3px', backgroundColor: row.color, border: '1px solid #ddd' }" />
                        {{ row.color }}
                      </div>
                      <span v-else>-</span>
                    </TableCell>
                    <TableCell class="p-2 text-right">{{ row.price != null ? `¥${row.price}` : '-' }}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <!-- のし / 熨斗 -->
        <div class="rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow">
          <div class="border-b px-4 py-3">
            <span style="font-weight: 600">📜 のし / 熨斗</span>
          </div>
          <div class="p-4">
            <div class="rounded-md border overflow-auto">
              <Table class="w-full text-sm">
                <TableHeader>
                  <TableRow class="border-b bg-muted/50">
                    <TableHead class="h-8 px-2 text-left font-medium text-muted-foreground" style="min-width: 140px">名称</TableHead>
                    <TableHead class="h-8 px-2 text-right font-medium text-muted-foreground" style="width: 100px">料金 / 价格</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="row in noshiItems" :key="row._id" class="border-b hover:bg-muted/50">
                    <TableCell class="p-2">{{ row.name }}</TableCell>
                    <TableCell class="p-2 text-right">{{ row.price != null ? `¥${row.price}` : '-' }}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <!-- メッセージカード / 贺卡 -->
        <div class="rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow">
          <div class="border-b px-4 py-3">
            <span style="font-weight: 600">💌 メッセージカード / 贺卡</span>
          </div>
          <div class="p-4">
            <div class="rounded-md border overflow-auto">
              <Table class="w-full text-sm">
                <TableHeader>
                  <TableRow class="border-b bg-muted/50">
                    <TableHead class="h-8 px-2 text-left font-medium text-muted-foreground" style="min-width: 140px">名称</TableHead>
                    <TableHead class="h-8 px-2 text-right font-medium text-muted-foreground" style="width: 100px">料金 / 价格</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="row in messageCardItems" :key="row._id" class="border-b hover:bg-muted/50">
                    <TableCell class="p-2">{{ row.name }}</TableCell>
                    <TableCell class="p-2 text-right">{{ row.price != null ? `¥${row.price}` : '-' }}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 全オプション一覧 / 全选项列表 -->
    <div class="table-section">
      <h3 style="margin: 8px 0">全ギフトオプション / 全部礼品选项</h3>
      <div class="rounded-md border overflow-auto">
        <Table class="w-full text-sm">
          <TableHeader>
            <TableRow class="border-b bg-muted/50">
              <TableHead class="h-10 px-2 text-left font-medium text-muted-foreground" style="width: 140px">{{ t('wms.shipment.gift.type', '種別') }}</TableHead>
              <TableHead class="h-10 px-2 text-left font-medium text-muted-foreground" style="min-width: 200px">{{ t('wms.shipment.gift.name', '名称') }}</TableHead>
              <TableHead class="h-10 px-2 text-right font-medium text-muted-foreground" style="width: 120px">{{ t('wms.shipment.gift.price', '料金') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="loading">
              <TableCell colspan="3">
                <div class="space-y-3 p-4">
                  <Skeleton class="h-4 w-[250px] mx-auto" />
                  <Skeleton class="h-10 w-full" />
                  <Skeleton class="h-10 w-full" />
                </div>
              </TableCell>
            </TableRow>
            <TableRow v-for="row in items" :key="row._id" class="border-b hover:bg-muted/50">
              <TableCell class="p-2">
                <span :class="typeTagClass(row.type)" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium">{{ typeLabel(row.type) }}</span>
              </TableCell>
              <TableCell class="p-2">{{ row.name }}</TableCell>
              <TableCell class="p-2 text-right">{{ row.price != null ? `¥${row.price}` : '-' }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// ギフト設定ページ / 礼品设置页面
import { ref, computed, onMounted } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useToast } from '@/composables/useToast'
import { http } from '@/api/http'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import PageHeader from '@/components/shared/PageHeader.vue'

const { t } = useI18n()
const { show: showToast } = useToast()
const items = ref<any[]>([])
const loading = ref(false)

// タイプ別フィルタ / 按类型过滤
const wrappingItems = computed(() => items.value.filter((i) => i.type === 'wrapping'))
const noshiItems = computed(() => items.value.filter((i) => i.type === 'noshi'))
const messageCardItems = computed(() => items.value.filter((i) => i.type === 'message_card'))

// タイプ表示 / 类型显示
const typeTagClass = (type: string): string => {
  const map: Record<string, string> = {
    wrapping: 'bg-blue-100 text-blue-800',
    noshi: 'bg-green-100 text-green-800',
    message_card: 'bg-yellow-100 text-yellow-800',
  }
  return map[type] ?? 'bg-muted text-muted-foreground'
}

const typeLabel = (type: string): string => {
  const map: Record<string, string> = {
    wrapping: 'ラッピング / 包装',
    noshi: 'のし / 熨斗',
    message_card: 'メッセージカード / 贺卡',
  }
  return map[type] ?? type
}

// データ読み込み / 数据加载
async function load() {
  loading.value = true
  try {
    const json = await http.get<any>('/gift-options')
    items.value = Array.isArray(json) ? json : (json.items ?? [])
  } catch (e) {
    console.error(e)
    showToast(t('wms.shipment.gift.loadError', 'ギフトオプションの読み込みに失敗しました'), 'danger')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.gift-options {
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
.cards-section {
  flex-shrink: 0;
}
.table-section {
  flex: 1;
  overflow: auto;
}
</style>
