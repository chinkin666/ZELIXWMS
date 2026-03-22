<script setup lang="ts">
/**
 * 異常報告一覧 / 异常报告列表
 */
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getApiBaseUrl } from '@/api/base'
import { useWmsUserStore } from '@/stores/wms/useWmsUserStore'

const userStore = useWmsUserStore()
const baseUrl = getApiBaseUrl()

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
      ElMessage.success('異常報告を作成しました / 异常报告已创建')
      showCreateDialog.value = false
      createForm.value = { level: 'A', category: 'appearance_defect', description: '', sku: '', affectedQuantity: 0, suggestedAction: '' }
      await loadData()
    } else {
      ElMessage.error('処理に失敗しました / 处理失败')
    }
  } catch (e: any) { ElMessage.error(e.message) }
}

async function resolveReport(id: string) {
  const { value: resolution } = await ElMessageBox.prompt(
    '処理結果を入力 / 输入处理结果:',
    '入力 / 输入',
    { confirmButtonText: '確定 / 确定', cancelButtonText: 'キャンセル / 取消' },
  ).catch(() => ({ value: null }))
  if (!resolution) return
  try {
    const res = await fetch(`${baseUrl}/exceptions/${id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userStore.token}` },
      body: JSON.stringify({ resolvedBy: userStore.currentUser?.displayName, resolution }),
    })
    if (res.ok) {
      ElMessage.success('処理完了')
    } else {
      ElMessage.error('処理に失敗しました / 处理失败')
    }
    await loadData()
  } catch (e: any) { ElMessage.error(e.message) }
}

function slaRemaining(deadline: string): string {
  const diff = new Date(deadline).getTime() - Date.now()
  if (diff <= 0) return '超過!'
  const min = Math.floor(diff / 60000)
  return min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min}m`
}

onMounted(loadData)
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
      <h2 style="margin: 0">異常報告 / 异常报告</h2>
      <div style="display: flex; gap: 8px">
        <el-select v-model="statusFilter" style="width: 140px" @change="() => { page = 1; loadData() }" clearable placeholder="ステータス">
          <el-option label="Open" value="open" />
          <el-option label="Notified" value="notified" />
          <el-option label="Acknowledged" value="acknowledged" />
          <el-option label="Resolved" value="resolved" />
        </el-select>
        <el-button type="danger" @click="showCreateDialog = true">+ 異常報告</el-button>
      </div>
    </div>

    <!-- SLA サマリー / SLA 汇总 -->
    <el-row v-if="slaInfo" :gutter="16" style="margin-bottom: 16px">
      <el-col :span="8">
        <el-card shadow="hover">
          <div style="color: #909399">未処理</div>
          <div style="font-size: 28px; font-weight: bold">{{ slaInfo.openCount || 0 }}</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover" :body-style="{ background: slaInfo.breachedCount > 0 ? '#fef0f0' : '' }">
          <div style="color: #f56c6c">SLA 超過</div>
          <div style="font-size: 28px; font-weight: bold; color: #f56c6c">{{ slaInfo.breachedCount || 0 }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-table :data="reports" v-loading="loading" stripe>
      <el-table-column prop="reportNumber" label="報告番号" width="160" />
      <el-table-column label="レベル" width="80">
        <template #default="{ row }">
          <el-tag :type="row.level === 'C' ? 'danger' : row.level === 'B' ? 'warning' : 'info'" size="small">
            {{ row.level }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="category" label="区分" width="140" />
      <el-table-column prop="description" label="内容" show-overflow-tooltip />
      <el-table-column label="SLA" width="100">
        <template #default="{ row }">
          <span :style="{ color: row.slaBreached ? '#f56c6c' : '#67c23a', fontWeight: 'bold' }">
            {{ slaRemaining(row.slaDeadline) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="ステータス" width="110">
        <template #default="{ row }">
          <el-tag :type="row.status === 'resolved' ? 'success' : row.status === 'open' ? 'danger' : 'warning'" size="small">
            {{ row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <el-button v-if="['open', 'notified', 'acknowledged'].includes(row.status)" text type="primary" size="small" @click="resolveReport(row._id)">
            処理
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- ページネーション / 分页 -->
    <div v-if="total > limit" style="display: flex; justify-content: center; margin-top: 16px">
      <el-pagination
        v-model:current-page="page"
        :page-size="limit"
        :total="total"
        layout="prev, pager, next"
        @current-change="loadData"
      />
    </div>

    <!-- 新規異常ダイアログ / 新建异常对话框 -->
    <el-dialog v-model="showCreateDialog" title="異常報告作成 / 新建异常报告" width="500px">
      <el-form label-width="100px">
        <el-form-item label="レベル">
          <el-radio-group v-model="createForm.level">
            <el-radio-button value="A">A (一般)</el-radio-button>
            <el-radio-button value="B">B (重要)</el-radio-button>
            <el-radio-button value="C">C (緊急)</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="区分">
          <el-select v-model="createForm.category" style="width: 100%">
            <el-option label="数量差異" value="quantity_variance" />
            <el-option label="ラベル異常" value="label_error" />
            <el-option label="外観不良" value="appearance_defect" />
            <el-option label="包装異常" value="packaging_issue" />
            <el-option label="混載異常" value="mixed_shipment" />
            <el-option label="その他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="SKU"><el-input v-model="createForm.sku" /></el-form-item>
        <el-form-item label="影響数量"><el-input-number v-model="createForm.affectedQuantity" :min="0" /></el-form-item>
        <el-form-item label="内容"><el-input v-model="createForm.description" type="textarea" :rows="3" /></el-form-item>
        <el-form-item label="推奨対応"><el-input v-model="createForm.suggestedAction" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">キャンセル</el-button>
        <el-button type="primary" @click="createReport">作成</el-button>
      </template>
    </el-dialog>
  </div>
</template>
