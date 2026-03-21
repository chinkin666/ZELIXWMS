<template>
  <div class="workflow-settings">
    <ControlPanel title="ワークフロー管理 / 工作流管理" :show-search="false">
      <template #actions>
        <OButton variant="primary" @click="openCreate">新規作成 / 新建</OButton>
      </template>
    </ControlPanel>

    <!-- ワークフロー一覧 / 工作流列表 -->
    <div class="table-section">
      <div v-if="loading" class="loading-state">読み込み中... / 加载中...</div>
      <div v-else-if="workflows.length === 0" class="empty-state">
        ワークフローがありません / 没有工作流
      </div>
      <div class="o-table-wrapper" v-else>
        <table class="o-table">
          <thead>
            <tr>
              <th class="o-table-th" style="width: 60px">状態 / 状态</th>
              <th class="o-table-th" style="width: 180px">名称 / 名称</th>
              <th class="o-table-th" style="width: 160px">トリガーイベント / 触发事件</th>
              <th class="o-table-th" style="width: 80px">アクション数 / 动作数</th>
              <th class="o-table-th" style="width: 100px">最終実行 / 最后运行</th>
              <th class="o-table-th" style="width: 80px">実行結果 / 运行结果</th>
              <th class="o-table-th" style="width: 60px">実行回数 / 运行次数</th>
              <th class="o-table-th" style="width: 240px">操作 / 操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="wf in workflows" :key="wf._id" class="o-table-row">
              <td class="o-table-td">
                <span
                  :class="wf.enabled
                    ? 'o-status-tag o-status-tag--confirmed'
                    : 'o-status-tag o-status-tag--cancelled'"
                  style="cursor: pointer"
                  @click="handleToggle(wf)"
                >
                  {{ wf.enabled ? 'ON' : 'OFF' }}
                </span>
              </td>
              <td class="o-table-td">
                <span class="wf-name">{{ wf.name }}</span>
                <span v-if="wf.description" class="wf-desc">{{ wf.description }}</span>
              </td>
              <td class="o-table-td">
                <code class="event-code">{{ wf.triggerEvent }}</code>
              </td>
              <td class="o-table-td" style="text-align: center">{{ wf.actions.length }}</td>
              <td class="o-table-td">
                <span v-if="wf.lastRunAt" class="last-run">{{ formatDate(wf.lastRunAt) }}</span>
                <span v-else class="last-run">-</span>
              </td>
              <td class="o-table-td">
                <span v-if="wf.lastRunStatus" :class="runStatusClass(wf.lastRunStatus)">
                  {{ runStatusLabel(wf.lastRunStatus) }}
                </span>
                <span v-else>-</span>
              </td>
              <td class="o-table-td" style="text-align: center">{{ wf.runCount }}</td>
              <td class="o-table-td">
                <div class="action-cell">
                  <OButton
                    variant="secondary"
                    size="sm"
                    :disabled="testingId === wf._id"
                    @click="handleTest(wf)"
                  >
                    {{ testingId === wf._id ? 'テスト中...' : 'テスト / 测试' }}
                  </OButton>
                  <OButton variant="primary" size="sm" @click="openEdit(wf)">
                    編集 / 编辑
                  </OButton>
                  <OButton variant="icon-danger" size="sm" @click="confirmDelete(wf)">
                    削除 / 删除
                  </OButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 作成・編集ダイアログ / 创建/编辑对话框 -->
    <ODialog
      v-model="dialogOpen"
      :title="editingId ? 'ワークフロー編集 / 编辑工作流' : 'ワークフロー作成 / 新建工作流'"
      size="lg"
      @confirm="handleSave"
    >
      <div class="form-grid">
        <div class="form-field form-field--full">
          <label class="form-label">名称 / 名称 <span class="required-badge">必須</span></label>
          <input v-model="form.name" type="text" class="o-input" placeholder="例: 出荷完了通知 / 例: 出货完成通知" />
        </div>
        <div class="form-field form-field--full">
          <label class="form-label">トリガーイベント / 触发事件 <span class="required-badge">必須</span></label>
          <select v-model="form.triggerEvent" class="o-input">
            <option value="" disabled>選択してください / 请选择</option>
            <option v-for="ev in triggerEvents" :key="ev" :value="ev">{{ ev }}</option>
          </select>
        </div>
        <div class="form-field form-field--full">
          <label class="form-label">説明 / 描述</label>
          <textarea v-model="form.description" class="o-input form-textarea" rows="2" />
        </div>
        <div class="form-field form-field--full">
          <label class="form-label">アクション定義（JSON）/ 动作定义（JSON）</label>
          <textarea
            v-model="actionsJson"
            class="o-input form-textarea mono-text"
            rows="6"
            placeholder='[{"type": "email", "config": {"to": "admin@example.com"}}]'
          />
          <div v-if="actionsError" class="field-error">{{ actionsError }}</div>
        </div>
      </div>
    </ODialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useToast } from '@/composables/useToast'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import ODialog from '@/components/odoo/ODialog.vue'
import {
  getWorkflows,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  toggleWorkflow,
  testWorkflow,
  type Workflow,
} from '@/api/workflow'

const { show: showToast } = useToast()

// === トリガーイベント / 触发事件 ===
const triggerEvents = [
  'order.created',
  'order.updated',
  'order.cancelled',
  'shipment.created',
  'shipment.shipped',
  'shipment.delivered',
  'inbound.received',
  'inbound.completed',
  'inventory.low_stock',
  'inventory.adjusted',
  'return.created',
  'return.processed',
]

// === State / 状態 ===
const workflows = ref<Workflow[]>([])
const loading = ref(false)
const dialogOpen = ref(false)
const editingId = ref<string | null>(null)
const testingId = ref<string | null>(null)

const emptyForm = () => ({
  name: '',
  triggerEvent: '',
  description: '',
})
const form = ref(emptyForm())
const actionsJson = ref('[]')
const actionsError = ref('')

// === Actions JSON バリデーション / Actions JSON 验证 ===
const parsedActions = computed(() => {
  try {
    const parsed = JSON.parse(actionsJson.value)
    actionsError.value = ''
    return parsed
  } catch {
    actionsError.value = 'JSON フォーマットが不正です / JSON格式不正确'
    return null
  }
})

// === データ読込 / 数据加载 ===
const loadList = async () => {
  loading.value = true
  try {
    workflows.value = await getWorkflows()
  } catch (error: any) {
    showToast(error?.message || 'ワークフロー取得に失敗しました / 获取工作流失败', 'danger')
  } finally {
    loading.value = false
  }
}

// === CRUD ===
const openCreate = () => {
  editingId.value = null
  form.value = emptyForm()
  actionsJson.value = '[]'
  actionsError.value = ''
  dialogOpen.value = true
}

const openEdit = (wf: Workflow) => {
  editingId.value = wf._id
  form.value = {
    name: wf.name,
    triggerEvent: wf.triggerEvent,
    description: wf.description || '',
  }
  actionsJson.value = JSON.stringify(wf.actions, null, 2)
  actionsError.value = ''
  dialogOpen.value = true
}

const handleSave = async () => {
  if (!form.value.name.trim()) {
    showToast('名称は必須です / 名称是必填项', 'danger')
    return
  }
  if (!form.value.triggerEvent) {
    showToast('トリガーイベントを選択してください / 请选择触发事件', 'danger')
    return
  }
  if (parsedActions.value === null) {
    showToast('アクション JSON が不正です / 动作JSON格式不正确', 'danger')
    return
  }

  const payload = {
    ...form.value,
    actions: parsedActions.value,
  }

  try {
    if (editingId.value) {
      await updateWorkflow(editingId.value, payload)
      showToast('ワークフローを更新しました / 工作流已更新', 'success')
    } else {
      await createWorkflow(payload)
      showToast('ワークフローを作成しました / 工作流已创建', 'success')
    }
    dialogOpen.value = false
    await loadList()
  } catch (error: any) {
    showToast(error?.message || '保存に失敗しました / 保存失败', 'danger')
  }
}

const confirmDelete = (wf: Workflow) => {
  if (!confirm(`「${wf.name}」を削除しますか？/ 确定要删除「${wf.name}」吗？`)) return
  deleteWorkflow(wf._id)
    .then(async () => {
      showToast('ワークフローを削除しました / 工作流已删除', 'success')
      await loadList()
    })
    .catch((err: any) => {
      showToast(err?.message || '削除に失敗しました / 删除失败', 'danger')
    })
}

// === トグル / 切换 ===
const handleToggle = async (wf: Workflow) => {
  try {
    const result = await toggleWorkflow(wf._id)
    wf.enabled = result.enabled
    showToast(result.enabled ? '有効化しました / 已启用' : '無効化しました / 已禁用', 'success')
  } catch (error: any) {
    showToast(error?.message || 'トグルに失敗しました / 切换失败', 'danger')
  }
}

// === テスト / 测试 ===
const handleTest = async (wf: Workflow) => {
  testingId.value = wf._id
  try {
    const result = await testWorkflow(wf._id)
    if (result.success) {
      showToast(`テスト成功: ${result.actionsExecuted} アクション実行 / 测试成功: ${result.actionsExecuted} 个动作已执行`, 'success')
    } else {
      showToast(`テスト失敗 / 测试失败: ${result.message}`, 'danger')
    }
  } catch (error: any) {
    showToast(error?.message || 'テストに失敗しました / 测试失败', 'danger')
  } finally {
    testingId.value = null
  }
}

// === ヘルパー / 辅助函数 ===
const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  return d.toLocaleString('ja-JP', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

const runStatusClass = (status: string) => {
  const map: Record<string, string> = {
    success: 'o-status-tag o-status-tag--confirmed',
    failed: 'o-status-tag o-status-tag--cancelled',
    skipped: 'o-status-tag o-status-tag--pending',
  }
  return map[status] || 'o-status-tag'
}

const runStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    success: '成功',
    failed: '失敗 / 失败',
    skipped: 'スキップ / 跳过',
  }
  return map[status] || status
}

onMounted(() => {
  loadList()
})
</script>

<style>
@import '@/styles/order-table.css';

.o-status-tag--cancelled { background: #fef0f0; color: #f56c6c; }
.o-status-tag--pending { background: #fdf6ec; color: #e6a23c; }
</style>

<style scoped>
.workflow-settings {
  padding: 0 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

.loading-state,
.empty-state {
  padding: 40px;
  text-align: center;
  color: var(--o-gray-500, #909399);
}

.wf-name {
  display: block;
  font-weight: 500;
  color: var(--o-gray-800, #1f2937);
}

.wf-desc {
  display: block;
  font-size: 12px;
  color: var(--o-gray-500, #909399);
  margin-top: 2px;
}

.event-code {
  font-size: 12px;
  background: var(--o-gray-100, #f0f2f5);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'SF Mono', 'Fira Code', monospace;
}

.last-run {
  font-size: 12px;
  color: var(--o-gray-500, #909399);
}

.action-cell {
  display: flex;
  gap: 4px;
  align-items: center;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 16px;
}

.form-field--full {
  grid-column: 1 / -1;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 4px;
  color: var(--o-gray-700, #303133);
}

.required-badge {
  color: #dc2626;
  font-size: 11px;
}

.form-textarea {
  resize: vertical;
}

.mono-text {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 12px;
}

.field-error {
  font-size: 12px;
  color: #f56c6c;
  margin-top: 4px;
}

.form-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
