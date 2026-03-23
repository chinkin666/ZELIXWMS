<template>
  <Dialog :open="modelValue" @update:open="$emit('update:modelValue', $event)">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>B2 Cloud 送信結果</DialogTitle>
      </DialogHeader>
    <div v-if="result">
      <div class="descriptions-grid">
        <div class="desc-item"><span class="desc-label">送信件数</span><span>{{ result.total }}</span></div>
        <div class="desc-item"><span class="desc-label">成功</span><span class="o-badge o-badge-success">{{ result.success_count }} 件</span></div>
        <div class="desc-item"><span class="desc-label">失敗</span>
          <span v-if="result.error_count > 0" class="o-badge o-badge-danger">{{ result.error_count }} 件</span>
          <span v-else class="o-badge o-badge-info">0 件</span>
        </div>
      </div>

      <div v-if="result.results && result.results.length > 0" class="result-details">
        <h4>詳細</h4>
        <Table class="o-list-table">
          <TableHeader>
            <TableRow>
              <TableHead style="width:60px">#</TableHead>
              <TableHead style="width:100px">結果</TableHead>
              <TableHead>エラー</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="(row, idx) in result.results" :key="idx">
              <TableCell>{{ row.order_index }}</TableCell>
              <TableCell>
                <span :class="['o-badge', row.success ? 'o-badge-success' : 'o-badge-danger']">
                  {{ row.success ? '成功' : '失敗' }}
                </span>
              </TableCell>
              <TableCell>{{ row.error }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <!-- Print results summary -->
      <div v-if="result.printResults && result.printResults.length > 0" class="result-details">
        <h4>発行結果</h4>
        <Table class="o-list-table">
          <TableHeader>
            <TableRow>
              <TableHead style="width:120px">伝票タイプ</TableHead>
              <TableHead style="width:80px">発行</TableHead>
              <TableHead style="width:80px">件数</TableHead>
              <TableHead>エラー</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="(row, idx) in result.printResults" :key="idx">
              <TableCell>{{ getPrintTypeName(row.print_type) }}</TableCell>
              <TableCell>
                <span :class="['o-badge', row.success ? 'o-badge-success' : 'o-badge-danger']">
                  {{ row.success ? '成功' : '失敗' }}
                </span>
              </TableCell>
              <TableCell>{{ row.tracking_numbers?.length || 0 }} 件</TableCell>
              <TableCell>{{ row.error }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
    <DialogFooter>
      <Button variant="secondary" @click="$emit('update:modelValue', false)">閉じる</Button>
      <Button variant="default" @click="$emit('confirm')">OK（一覧を更新）</Button>
    </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { YamatoB2ExportResult } from '@/types/carrierAutomation'

defineProps<{
  modelValue: boolean
  result: YamatoB2ExportResult | null
}>()

defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm'): void
}>()

const getPrintTypeName = (printType: string): string => {
  const names: Record<string, string> = {
    '0': '発払い',
    '2': 'コレクト',
    '3': 'クロネコゆうメール',
    '4': 'タイム',
    '5': '着払い',
    '7': 'クロネコゆうパケット',
    '8': '宅急便コンパクト',
    '9': 'コンパクトコレクト',
    'A': 'ネコポス',
  }
  return names[printType] || printType
}
</script>

<script lang="ts">
export default {
  name: 'YamatoB2ExportResultDialog',
}
</script>

<style scoped>
.descriptions-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
}

.desc-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.desc-label {
  font-size: 12px;
  color: #909399;
}

.result-details {
  margin-top: 20px;
}

.result-details h4 {
  margin: 0 0 12px;
  font-size: 14px;
  color: #303133;
}
</style>
