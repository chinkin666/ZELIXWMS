<script setup lang="ts">
import { Input } from '@/components/ui/input'
/**
 * ラベル貼付タスク看板 / 贴标任务看板
 */
import { ref, computed, onMounted } from 'vue'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/composables/useToast'
import { getApiBaseUrl } from '@/api/base'
import { useWmsUserStore } from '@/stores/wms/useWmsUserStore'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const userStore = useWmsUserStore()
const baseUrl = getApiBaseUrl()
const { showSuccess, showError } = useToast()

const tasks = ref<any[]>([])
const loading = ref(false)

async function loadTasks() {
  loading.value = true
  try {
    const res = await fetch(`${baseUrl}/labeling-tasks?limit=100`, {
      headers: { Authorization: `Bearer ${userStore.token}` },
    })
    const data = await res.json()
    tasks.value = data.data || []
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

const pending = computed(() => tasks.value.filter(t => t.status === 'pending'))
const printing = computed(() => tasks.value.filter(t => t.status === 'printing'))
const labeling = computed(() => tasks.value.filter(t => t.status === 'labeling'))
const verifying = computed(() => tasks.value.filter(t => t.status === 'verifying'))
const completed = computed(() => tasks.value.filter(t => t.status === 'completed').slice(0, 10))

async function transition(taskId: string, action: string, body: any = {}) {
  try {
    const res = await fetch(`${baseUrl}/labeling-tasks/${taskId}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userStore.token}` },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      showSuccess('更新成功')
      await loadTasks()
    } else {
      const data = await res.json()
      showError(data.message || '失敗')
    }
  } catch (e: any) { showError(e.message) }
}

// 復核ダイアログ / 复核对话框
const verifyDialogVisible = ref(false)
const verifyingTaskId = ref('')
const verifyResult = ref<'pass' | 'fail'>('pass')
const verifyFailedQty = ref(0)

function openVerifyDialog(taskId: string) {
  verifyingTaskId.value = taskId
  verifyResult.value = 'pass'
  verifyFailedQty.value = 0
  verifyDialogVisible.value = true
}

async function submitVerify() {
  await transition(verifyingTaskId.value, 'verify', {
    verifiedBy: userStore.currentUser?.displayName || 'unknown',
    result: verifyResult.value,
    failedQuantity: verifyResult.value === 'fail' ? verifyFailedQty.value : 0,
  })
  verifyDialogVisible.value = false
}

onMounted(loadTasks)
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
      <h2 style="margin: 0">ラベル貼付看板 / 贴标看板</h2>
      <Button class="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 border border-input bg-background hover:bg-accent" @click="loadTasks">
        {{ loading ? '読み込み中...' : '更新' }}
      </Button>
    </div>

    <!-- 看板 4 列 / 看板 4 列 -->
    <div class="grid grid-cols-4 gap-3">
      <div v-for="(col, idx) in [
        { title: '待印刷', data: pending, color: '#909399' },
        { title: '印刷中/貼付中', data: [...printing, ...labeling], color: '#e6a23c' },
        { title: '待復核', data: verifying, color: '#409eff' },
        { title: '完了', data: completed, color: '#67c23a' },
      ]" :key="idx">
        <div style="font-weight: bold; margin-bottom: 8px; padding: 8px; border-radius: 4px; text-align: center" :style="{ background: col.color + '20', color: col.color }">
          {{ col.title }} ({{ col.data.length }})
        </div>
        <div v-for="task in col.data" :key="task._id" style="margin-bottom: 8px">
          <div class="rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow p-3">
            <div style="font-size: 13px; font-weight: bold">{{ task.taskNumber }}</div>
            <div style="font-size: 12px; color: #909399">{{ task.sku }} — {{ task.fnsku || '' }}</div>
            <div style="font-size: 12px; margin-top: 4px">
              {{ task.completedQuantity || 0 }} / {{ task.requiredQuantity }}
              <span style="margin-left: 8px">{{ task.labelTypes?.join(', ') }}</span>
            </div>
            <div style="margin-top: 8px; display: flex; gap: 4px">
              <Button v-if="task.status === 'pending'" class="inline-flex items-center justify-center rounded-md text-xs font-medium h-7 px-2 bg-yellow-500 text-white hover:bg-yellow-600"
                @click="transition(task._id, 'start-print', { operatorId: userStore.currentUser?.displayName })">
                印刷開始
              </Button>
              <Button v-if="task.status === 'printing'" class="inline-flex items-center justify-center rounded-md text-xs font-medium h-7 px-2 bg-primary text-primary-foreground hover:bg-primary/90"
                @click="transition(task._id, 'start-label')">
                貼付開始
              </Button>
              <Button v-if="task.status === 'labeling'" class="inline-flex items-center justify-center rounded-md text-xs font-medium h-7 px-2 bg-green-600 text-white hover:bg-green-700"
                @click="openVerifyDialog(task._id)">
                復核
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 復核ダイアログ / 复核对话框 -->
    <Dialog :open="verifyDialogVisible" @update:open="verifyDialogVisible = $event">
      <DialogContent class="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>復核 / 复核</DialogTitle>
        </DialogHeader>
        <div class="grid gap-4 py-4">
          <div class="grid grid-cols-4 items-center gap-4">
            <label class="text-right text-sm">結果</label>
            <div class="col-span-3 flex gap-4">
              <label class="inline-flex items-center gap-1 text-sm"><input type="radio" v-model="verifyResult" value="pass" /> 合格</label>
              <label class="inline-flex items-center gap-1 text-sm"><input type="radio" v-model="verifyResult" value="fail" /> 不合格</label>
            </div>
          </div>
          <div v-if="verifyResult === 'fail'" class="grid grid-cols-4 items-center gap-4">
            <label class="text-right text-sm">不合格数</label>
            <Input v-model.number="verifyFailedQty" type="number" min="0" class="col-span-3 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" />
          </div>
        </div>
        <DialogFooter>
          <Button class="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 border border-input bg-background hover:bg-accent" @click="verifyDialogVisible = false">キャンセル</Button>
          <Button class="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90" @click="submitVerify">確認</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
