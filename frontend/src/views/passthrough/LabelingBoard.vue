<script setup lang="ts">
/**
 * ラベル貼付タスク看板 / 贴标任务看板
 */
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getApiBaseUrl } from '@/api/base'
import { useWmsUserStore } from '@/stores/wms/useWmsUserStore'

const userStore = useWmsUserStore()
const baseUrl = getApiBaseUrl()

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
      ElMessage.success('更新成功')
      await loadTasks()
    } else {
      const data = await res.json()
      ElMessage.error(data.message || '失敗')
    }
  } catch (e: any) { ElMessage.error(e.message) }
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
      <el-button @click="loadTasks" :loading="loading">更新</el-button>
    </div>

    <!-- 看板 4 列 / 看板 4 列 -->
    <el-row :gutter="12">
      <el-col :span="6" v-for="(col, idx) in [
        { title: '待印刷', data: pending, color: '#909399' },
        { title: '印刷中/貼付中', data: [...printing, ...labeling], color: '#e6a23c' },
        { title: '待復核', data: verifying, color: '#409eff' },
        { title: '完了', data: completed, color: '#67c23a' },
      ]" :key="idx">
        <div style="font-weight: bold; margin-bottom: 8px; padding: 8px; border-radius: 4px; text-align: center" :style="{ background: col.color + '20', color: col.color }">
          {{ col.title }} ({{ col.data.length }})
        </div>
        <div v-for="task in col.data" :key="task._id" style="margin-bottom: 8px">
          <el-card shadow="hover" :body-style="{ padding: '12px' }">
            <div style="font-size: 13px; font-weight: bold">{{ task.taskNumber }}</div>
            <div style="font-size: 12px; color: #909399">{{ task.sku }} — {{ task.fnsku || '' }}</div>
            <div style="font-size: 12px; margin-top: 4px">
              {{ task.completedQuantity || 0 }} / {{ task.requiredQuantity }}
              <span style="margin-left: 8px">{{ task.labelTypes?.join(', ') }}</span>
            </div>
            <div style="margin-top: 8px; display: flex; gap: 4px">
              <el-button v-if="task.status === 'pending'" size="small" type="warning"
                @click="transition(task._id, 'start-print', { operatorId: userStore.currentUser?.displayName })">
                印刷開始
              </el-button>
              <el-button v-if="task.status === 'printing'" size="small" type="primary"
                @click="transition(task._id, 'start-label')">
                貼付開始
              </el-button>
              <el-button v-if="task.status === 'labeling'" size="small" type="success"
                @click="openVerifyDialog(task._id)">
                復核
              </el-button>
            </div>
          </el-card>
        </div>
      </el-col>
    </el-row>

    <!-- 復核ダイアログ / 复核对话框 -->
    <el-dialog v-model="verifyDialogVisible" title="復核 / 复核" width="400px">
      <el-form label-width="100px">
        <el-form-item label="結果">
          <el-radio-group v-model="verifyResult">
            <el-radio value="pass">合格</el-radio>
            <el-radio value="fail">不合格</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="verifyResult === 'fail'" label="不合格数">
          <el-input-number v-model="verifyFailedQty" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="verifyDialogVisible = false">キャンセル</el-button>
        <el-button type="primary" @click="submitVerify">確認</el-button>
      </template>
    </el-dialog>
  </div>
</template>
