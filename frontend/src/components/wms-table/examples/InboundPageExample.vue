<script setup lang="ts">
/**
 * 入庫管理ページ（リファレンス実装）/ 入库管理页面（参考实装）
 *
 * WmsTable + WmsForm + Sheet で構成。
 * 全ての列・フォーム・アクションは JSON/TS スキーマ駆動。
 * テンプレートにビジネスロジック・カラム定義のハードコーディングなし。
 */
import { computed } from 'vue'
import { WmsTable } from '@/components/wms-table'
import WmsForm from '@/components/wms-form/WmsForm.vue'
import PageHeader from '@/components/shared/PageHeader.vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { useWmsPage } from '@/composables/useWmsPage'
import { inboundColumns, createInboundToolbar, inboundFormSchema } from './inbound-columns'
import { toast } from 'vue-sonner'

// ─── API / API ──────────────────────────────────────────────────────

async function fetchInboundList(params: Record<string, any>) {
  // 実際のAPI呼び出し（ここではモックデータ）/ 实际API调用（这里是mock数据）
  const { apiFetch } from '@/api/http'
  const res = await apiFetch(`/api/inbound-orders?page=${params.page}&limit=${params.limit}`)
  const json = await res.json()
  return {
    data: json?.items ?? json?.data ?? [],
    total: json?.total ?? 0,
  }
}

// ─── 状態管理 / 状态管理 ────────────────────────────────────────────

const {
  data,
  total,
  loading,
  sheetOpen,
  sheetMode,
  sheetData,
  loadData,
  handleSelectionChange,
  openSheet,
  openCreateSheet,
  closeSheet,
} = useWmsPage({
  fetchFn: fetchInboundList,
  pageSize: 20,
})

// ─── ツールバー設定（イベントハンドラ注入）/ 工具栏设定（注入事件处理）──

const toolbar = createInboundToolbar({
  onCreate: () => openCreateSheet(),
  onBatchDelete: async (rows) => {
    if (!confirm(`${rows.length}件を削除しますか？`)) return
    toast.success(`${rows.length}件を削除しました`)
    await loadData()
  },
  onExport: () => toast('CSV出力機能は準備中です'),
})

// ─── フォーム送信 / 表单提交 ────────────────────────────────────────

const formValues = computed(() => {
  if (sheetMode.value === 'create') {
    return Object.fromEntries(
      inboundFormSchema
        .filter(f => f.defaultValue !== undefined)
        .map(f => [f.key, f.defaultValue]),
    )
  }
  return sheetData.value ?? {}
})

async function handleFormSubmit(data: Record<string, any>) {
  try {
    if (sheetMode.value === 'create') {
      toast.success('入庫指示を作成しました')
    } else {
      toast.success('入庫指示を更新しました')
    }
    closeSheet()
    await loadData()
  } catch (e: any) {
    toast.error(e.message || '保存に失敗しました')
  }
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- ページヘッダー / 页面标题 -->
    <PageHeader title="入庫管理" />

    <!-- テーブル / 表格 -->
    <div class="flex-1 p-4">
      <WmsTable
        :columns="inboundColumns"
        :data="data"
        :loading="loading"
        :toolbar="toolbar"
        :selectable="true"
        :page-size="20"
        :on-row-click="(row) => openSheet(row, 'view')"
        @selection-change="handleSelectionChange"
      />
    </div>

    <!-- 右サイドSheet（詳細/編集/新規）/ 右侧Sheet（详情/编辑/新建）-->
    <Sheet :open="sheetOpen" @update:open="(v) => { if (!v) closeSheet() }">
      <SheetContent class="sm:max-w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {{ sheetMode === 'create' ? '入庫指示作成' : sheetMode === 'edit' ? '入庫指示編集' : '入庫指示詳細' }}
          </SheetTitle>
          <SheetDescription>
            <template v-if="sheetData">
              {{ sheetData.orderNumber }}
              <Badge variant="secondary" class="ml-2">{{ sheetData.status }}</Badge>
            </template>
            <template v-else>
              新しい入庫指示を作成します
            </template>
          </SheetDescription>
        </SheetHeader>

        <div class="mt-6">
          <WmsForm
            :schema="inboundFormSchema"
            :model-value="formValues"
            :readonly="sheetMode === 'view'"
            :submit-label="sheetMode === 'create' ? '作成' : '更新'"
            @submit="handleFormSubmit"
          >
            <template v-if="sheetMode === 'view'" #footer>
              <Button variant="outline" @click="sheetMode = 'edit'">編集</Button>
              <Button variant="destructive" @click="closeSheet">閉じる</Button>
            </template>
          </WmsForm>
        </div>
      </SheetContent>
    </Sheet>
  </div>
</template>
