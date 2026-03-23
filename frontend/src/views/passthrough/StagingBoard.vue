<script setup lang="ts">
/**
 * 暫存エリアダッシュボード / 暂存区看板
 *
 * 当前暂存货物总览：停留时间分布、客户别汇总、超时预警
 * 現在の一時保管貨物概要：滞留時間分布、顧客別集計、超過警告
 */
import { ref, onMounted } from 'vue'
import { Card, CardContent } from '@/components/ui/card'
import { useRouter } from 'vue-router'
import { getApiBaseUrl } from '@/api/base'
import { useWmsUserStore } from '@/stores/wms/useWmsUserStore'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'

const router = useRouter()
const userStore = useWmsUserStore()
const baseUrl = getApiBaseUrl()

const dashboard = ref<any>(null)
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const res = await fetch(`${baseUrl}/passthrough/staging`, {
      headers: { Authorization: `Bearer ${userStore.token}` },
    })
    if (res.ok) {
      const json = await res.json()
      // バックエンドが data でラップする場合の対応 / 兼容后端用 data 包装的情况
      const raw = json?.data ?? json
      dashboard.value = {
        totalOrders: raw?.totalOrders ?? 0,
        totalBoxes: raw?.totalBoxes ?? 0,
        byDuration: raw?.byDuration ?? { under24h: 0, under48h: 0, under72h: 0, over72h: 0 },
        alerts: raw?.alerts ?? [],
        byClient: raw?.byClient ?? {},
      }
    } else {
      // エンドポイント未実装時はデフォルト値を設定 / 端点未实装时设置默认值
      dashboard.value = { totalOrders: 0, totalBoxes: 0, byDuration: { under24h: 0, under48h: 0, under72h: 0, over72h: 0 }, alerts: [], byClient: {} }
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div v-if="loading" class="space-y-3 p-4">
      <Skeleton class="h-4 w-[250px]" />
      <Skeleton class="h-4 w-[200px]" />
      <Skeleton class="h-10 w-full" />
      <Skeleton class="h-10 w-full" />
      <Skeleton class="h-10 w-full" />
    </div>
    <template v-else>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
        <h2 style="margin: 0">暫存エリア / 暂存区看板</h2>
        <Button class="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 border border-input bg-background hover:bg-accent" @click="load">更新</Button>
      </div>

      <template v-if="dashboard">
        <!-- KPI -->
        <div class="grid grid-cols-5 gap-4" style="margin-bottom: 24px">
          <div class="rounded-lg border bg-card shadow-sm p-4 col-span-1">
            <div style="color: #909399">暂存中</div>
            <div style="font-size: 32px; font-weight: bold">{{ dashboard.totalOrders ?? 0 }}</div>
            <div style="font-size: 13px; color: #909399">{{ dashboard.totalBoxes ?? 0 }} 箱</div>
          </div>
          <div class="rounded-lg border bg-card shadow-sm p-4">
            <div style="color: #67c23a">&lt;24h</div>
            <div style="font-size: 28px; font-weight: bold">{{ dashboard.byDuration?.under24h ?? 0 }}</div>
          </div>
          <div class="rounded-lg border bg-card shadow-sm p-4">
            <div style="color: #e6a23c">24-48h</div>
            <div style="font-size: 28px; font-weight: bold">{{ dashboard.byDuration?.under48h ?? 0 }}</div>
          </div>
          <div class="rounded-lg border bg-card shadow-sm p-4">
            <div style="color: #f56c6c">48-72h</div>
            <div style="font-size: 28px; font-weight: bold">{{ dashboard.byDuration?.under72h ?? 0 }}</div>
          </div>
          <div class="rounded-lg border bg-card shadow-sm p-4" :style="{ background: (dashboard.byDuration?.over72h ?? 0) > 0 ? '#fef0f0' : '' }">
            <div style="color: #f56c6c; font-weight: bold">&gt;72h ⚠</div>
            <div style="font-size: 28px; font-weight: bold; color: #f56c6c">{{ dashboard.byDuration?.over72h ?? 0 }}</div>
          </div>
        </div>

        <!-- 超时预警 / 超過警告 -->
        <div v-if="dashboard.alerts?.length" class="rounded-lg border bg-card shadow-sm" style="margin-bottom: 16px">
          <div class="border-b px-4 py-3">
            <span style="color: #f56c6c">超時預警 / 超时预警 (>72h)</span>
          </div>
          <div class="p-4">
            <div class="rounded-md border overflow-auto">
              <Table class="w-full text-sm">
                <TableHeader>
                  <TableRow class="border-b bg-muted/50">
                    <TableHead class="h-8 px-2 text-left font-medium text-muted-foreground" style="width: 160px">予約番号</TableHead>
                    <TableHead class="h-8 px-2 text-left font-medium text-muted-foreground">原因</TableHead>
                    <TableHead class="h-8 px-2 text-left font-medium text-muted-foreground" style="width: 100px">滞留</TableHead>
                    <TableHead class="h-8 px-2 text-left font-medium text-muted-foreground" style="width: 100px">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="row in dashboard.alerts" :key="row.orderNumber" class="border-b hover:bg-muted/50">
                    <TableCell class="p-2">{{ row.orderNumber }}</TableCell>
                    <TableCell class="p-2">{{ row.reason }}</TableCell>
                    <TableCell class="p-2"><span style="color: #f56c6c; font-weight: bold">{{ row.hours }}h</span></TableCell>
                    <TableCell class="p-2">
                      <Button class="text-sm text-primary hover:underline" @click="router.push('/passthrough/tasks')">対応</Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <!-- 客户别汇总 / 顧客別集計 -->
        <div class="rounded-lg border bg-card shadow-sm">
          <div class="border-b px-4 py-3">顧客別集計 / 客户别汇总</div>
          <div class="p-4">
            <div class="rounded-md border overflow-auto">
              <Table class="w-full text-sm">
                <TableHeader>
                  <TableRow class="border-b bg-muted/50">
                    <TableHead class="h-8 px-2 text-left font-medium text-muted-foreground">客户ID</TableHead>
                    <TableHead class="h-8 px-2 text-left font-medium text-muted-foreground" style="width: 100px">预定数</TableHead>
                    <TableHead class="h-8 px-2 text-left font-medium text-muted-foreground" style="width: 100px">箱数</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="([id, v]) in Object.entries(dashboard.byClient || {})" :key="id" class="border-b hover:bg-muted/50">
                    <TableCell class="p-2">{{ id }}</TableCell>
                    <TableCell class="p-2">{{ (v as any).orders }}</TableCell>
                    <TableCell class="p-2">{{ (v as any).boxes }}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <div v-if="!Object.keys(dashboard.byClient || {}).length" class="flex flex-col items-center justify-center py-6 text-muted-foreground">
              <p>暂无</p>
            </div>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>
