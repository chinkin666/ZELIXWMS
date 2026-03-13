<template>
  <div class="rule-settings">
    <ControlPanel title="ルール設定" :show-search="false">
      <template #actions>
        <OButton variant="secondary" @click="openTestDialog">テスト</OButton>
        <OButton variant="primary" @click="openCreate">新規ルール</OButton>
      </template>
    </ControlPanel>

    <!-- Filter bar -->
    <div class="search-section">
      <input
        v-model="searchText"
        type="text"
        class="o-input"
        style="flex: 1; max-width: 400px;"
        placeholder="ルール名・コードで検索..."
        @keydown.enter="handleSearch"
      />
      <select v-model="moduleFilter" class="o-input" style="width: 160px;" @change="handleSearch">
        <option value="">全モジュール</option>
        <option v-for="m in moduleOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
      </select>
      <label class="search-section__filter">
        <input v-model="showActiveOnly" type="checkbox" @change="handleSearch" />
        有効のみ
      </label>
      <OButton variant="primary" @click="handleSearch">検索</OButton>
    </div>

    <!-- Table -->
    <div class="o-table-wrapper">
      <table class="o-table">
        <thead>
          <tr>
            <th class="o-table-th" style="width: 200px">ルール名</th>
            <th class="o-table-th" style="width: 100px">モジュール</th>
            <th class="o-table-th" style="width: 80px">優先度</th>
            <th class="o-table-th" style="width: 80px">条件数</th>
            <th class="o-table-th" style="width: 100px">アクション数</th>
            <th class="o-table-th" style="width: 80px">実行回数</th>
            <th class="o-table-th" style="width: 80px">有効</th>
            <th class="o-table-th" style="width: 140px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td class="o-table-td o-table-empty" colspan="8">読み込み中...</td>
          </tr>
          <tr v-else-if="rules.length === 0">
            <td class="o-table-td o-table-empty" colspan="8">データがありません</td>
          </tr>
          <tr v-for="r in rules" :key="r._id" class="o-table-row">
            <td class="o-table-td">
              <div>{{ r.name }}</div>
              <div v-if="r.ruleCode" class="rule-code">{{ r.ruleCode }}</div>
            </td>
            <td class="o-table-td">{{ moduleLabel(r.module) }}</td>
            <td class="o-table-td" style="text-align: center">{{ r.priority }}</td>
            <td class="o-table-td" style="text-align: center">{{ countConditions(r) }}</td>
            <td class="o-table-td" style="text-align: center">{{ r.actions.length }}</td>
            <td class="o-table-td" style="text-align: center">{{ r.executionCount ?? 0 }}</td>
            <td class="o-table-td" style="text-align: center">
              <button
                class="toggle-switch"
                :class="{ 'toggle-switch--active': r.isActive }"
                @click="handleToggle(r)"
              >
                <span class="toggle-switch__slider" />
              </button>
            </td>
            <td class="o-table-td o-table-td--actions">
              <OButton variant="primary" size="sm" @click="openEdit(r)">編集</OButton>
              <OButton variant="icon-danger" size="sm" @click="confirmDelete(r)">削除</OButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="o-table-pagination">
      <span class="o-table-pagination__info">全{{ total }}件中 {{ paginationStart }}-{{ paginationEnd }}件</span>
      <div class="o-table-pagination__controls">
        <select class="o-input o-input-sm" v-model.number="pageSize" style="width:80px;" @change="handlePageSizeChange">
          <option :value="10">10</option>
          <option :value="20">20</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>
        <OButton variant="secondary" size="sm" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">&lsaquo;</OButton>
        <span class="o-table-pagination__page">{{ currentPage }} / {{ totalPages }}</span>
        <OButton variant="secondary" size="sm" :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)">&rsaquo;</OButton>
      </div>
    </div>

    <!-- Create/Edit Dialog -->
    <ODialog v-model="dialogOpen" :title="isEditing ? 'ルールを編集' : 'ルールを追加'" size="lg" @confirm="handleSave">
      <div class="form-grid">
        <div class="form-field">
          <label class="form-label">ルール名 <span class="required">*</span></label>
          <input v-model="form.name" type="text" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">モジュール <span class="required">*</span></label>
          <select v-model="form.module" class="o-input">
            <option value="">選択してください</option>
            <option v-for="m in moduleOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
        </div>
        <div class="form-field form-field--full">
          <label class="form-label">説明</label>
          <input v-model="form.description" type="text" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">優先度</label>
          <input v-model.number="form.priority" type="number" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">
            <input v-model="form.stopOnMatch" type="checkbox" />
            マッチ時停止
          </label>
        </div>
        <div class="form-field">
          <label class="form-label">有効開始日</label>
          <input v-model="form.validFrom" type="date" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">有効終了日</label>
          <input v-model="form.validTo" type="date" class="o-input" />
        </div>
        <div class="form-field form-field--full">
          <label class="form-label">備考</label>
          <textarea v-model="form.memo" class="o-input form-textarea" rows="2" />
        </div>
      </div>

      <!-- Condition Groups -->
      <div class="builder-section">
        <div class="builder-section__header">
          <h4>条件グループ</h4>
          <OButton variant="secondary" size="sm" @click="addConditionGroup">+ グループ追加</OButton>
        </div>
        <div v-for="(group, gi) in form.conditionGroups" :key="gi" class="condition-group">
          <div class="condition-group__header">
            <select v-model="group.logic" class="o-input o-input-sm" style="width: 80px;">
              <option value="AND">AND</option>
              <option value="OR">OR</option>
            </select>
            <span class="condition-group__title">グループ {{ gi + 1 }}</span>
            <button class="condition-group__remove" @click="removeConditionGroup(gi)">&times;</button>
          </div>
          <div v-for="(cond, ci) in group.conditions" :key="ci" class="condition-row">
            <input v-model="cond.field" type="text" class="o-input o-input-sm" placeholder="フィールド" style="flex: 1;" />
            <select v-model="cond.operator" class="o-input o-input-sm" style="width: 140px;">
              <option v-for="op in operatorOptions" :key="op.value" :value="op.value">{{ op.label }}</option>
            </select>
            <input v-model="cond.value" type="text" class="o-input o-input-sm" placeholder="値" style="flex: 1;" />
            <OButton variant="icon-danger" size="sm" @click="removeCondition(gi, ci)">削除</OButton>
          </div>
          <OButton variant="secondary" size="sm" @click="addCondition(gi)">+ 条件追加</OButton>
        </div>
      </div>

      <!-- Actions -->
      <div class="builder-section">
        <div class="builder-section__header">
          <h4>アクション</h4>
          <OButton variant="secondary" size="sm" @click="addAction">+ アクション追加</OButton>
        </div>
        <div v-for="(action, ai) in form.actions" :key="ai" class="action-row">
          <input v-model="action.type" type="text" class="o-input o-input-sm" placeholder="タイプ" style="width: 160px;" />
          <input v-model="action.paramsJson" type="text" class="o-input o-input-sm" placeholder='パラメータ (JSON: {"key":"value"})' style="flex: 1;" />
          <OButton variant="icon-danger" size="sm" @click="removeAction(ai)">削除</OButton>
        </div>
      </div>
    </ODialog>

    <!-- Test Dialog -->
    <ODialog v-model="testDialogOpen" title="ルールテスト" size="lg" :show-footer="false">
      <div class="test-dialog">
        <div class="form-field">
          <label class="form-label">モジュール</label>
          <select v-model="testForm.module" class="o-input">
            <option v-for="m in moduleOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
        </div>
        <div class="form-field">
          <label class="form-label">コンテキスト (JSON)</label>
          <textarea v-model="testForm.contextJson" class="o-input form-textarea" rows="6" placeholder='{"productCode": "ABC", "quantity": 10}' />
        </div>
        <div class="test-dialog__actions">
          <OButton variant="primary" @click="handleTest">テスト実行</OButton>
        </div>
        <div v-if="testResults.length > 0" class="test-results">
          <h4>マッチしたルール ({{ testResults.length }}件)</h4>
          <div v-for="(result, ri) in testResults" :key="ri" class="test-result-item">
            <div class="test-result-item__name">{{ result.ruleName }}</div>
            <div v-if="result.ruleCode" class="test-result-item__code">{{ result.ruleCode }}</div>
            <div class="test-result-item__actions">
              <span v-for="(action, ai) in result.actions" :key="ai" class="test-result-action">
                {{ action.type }}
              </span>
            </div>
          </div>
        </div>
        <div v-else-if="testExecuted" class="test-results test-results--empty">
          マッチするルールがありません
        </div>
      </div>
    </ODialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from '@/composables/useToast'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import ODialog from '@/components/odoo/ODialog.vue'
import {
  fetchRules,
  createRule,
  updateRule,
  deleteRule,
  toggleRule,
  testRule,
  type RuleDefinition,
  type RuleConditionGroup,
  type RuleTestResult,
} from '@/api/rule'

const { show: showToast } = useToast()

// Module options
const moduleOptions = [
  { value: 'inbound', label: '入庫' },
  { value: 'outbound', label: '出庫' },
  { value: 'inventory', label: '在庫' },
  { value: 'slotting', label: '棚割' },
  { value: 'billing', label: '請求' },
  { value: 'notification', label: '通知' },
  { value: 'quality', label: '品質' },
] as const

const moduleLabel = (module: string) => {
  const found = moduleOptions.find((m) => m.value === module)
  return found ? found.label : module
}

// Operator options
const operatorOptions = [
  { value: 'equals', label: '等しい' },
  { value: 'not_equals', label: '等しくない' },
  { value: 'greater_than', label: 'より大きい' },
  { value: 'less_than', label: 'より小さい' },
  { value: 'gte', label: '以上' },
  { value: 'lte', label: '以下' },
  { value: 'contains', label: '含む' },
  { value: 'not_contains', label: '含まない' },
  { value: 'in', label: 'いずれか' },
  { value: 'not_in', label: 'いずれでもない' },
  { value: 'regex', label: '正規表現' },
] as const

// State
const rules = ref<RuleDefinition[]>([])
const total = ref(0)
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const searchText = ref('')
const moduleFilter = ref('')
const showActiveOnly = ref(false)

// Dialog
const dialogOpen = ref(false)
const editingId = ref<string | null>(null)
const isEditing = computed(() => !!editingId.value)

interface FormAction {
  type: string
  paramsJson: string
}

interface FormState {
  name: string
  module: string
  description: string
  priority: number
  stopOnMatch: boolean
  validFrom: string
  validTo: string
  memo: string
  conditionGroups: RuleConditionGroup[]
  actions: FormAction[]
}

const emptyForm = (): FormState => ({
  name: '',
  module: '',
  description: '',
  priority: 0,
  stopOnMatch: false,
  validFrom: '',
  validTo: '',
  memo: '',
  conditionGroups: [],
  actions: [],
})

const form = ref<FormState>(emptyForm())

// Test Dialog
const testDialogOpen = ref(false)
const testForm = ref({ module: 'inbound', contextJson: '' })
const testResults = ref<RuleTestResult[]>([])
const testExecuted = ref(false)

// Computed
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
const paginationStart = computed(() => (total.value === 0 ? 0 : (currentPage.value - 1) * pageSize.value + 1))
const paginationEnd = computed(() => Math.min(currentPage.value * pageSize.value, total.value))

const countConditions = (r: RuleDefinition) => {
  return r.conditionGroups.reduce((sum, g) => sum + g.conditions.length, 0)
}

// Load
const loadList = async () => {
  loading.value = true
  try {
    const result = await fetchRules({
      search: searchText.value || undefined,
      module: moduleFilter.value || undefined,
      isActive: showActiveOnly.value ? 'true' : undefined,
      page: currentPage.value,
      limit: pageSize.value,
    })
    rules.value = result.data
    total.value = result.total
  } catch (error: any) {
    showToast(error?.message || '取得に失敗しました', 'danger')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  currentPage.value = 1
  loadList()
}

const handlePageSizeChange = () => {
  currentPage.value = 1
  loadList()
}

const goToPage = (page: number) => {
  currentPage.value = page
  loadList()
}

// Condition Group builders
const addConditionGroup = () => {
  form.value.conditionGroups.push({
    logic: 'AND',
    conditions: [{ field: '', operator: 'equals', value: '' }],
  })
}

const removeConditionGroup = (gi: number) => {
  form.value.conditionGroups.splice(gi, 1)
}

const addCondition = (gi: number) => {
  form.value.conditionGroups[gi].conditions.push({ field: '', operator: 'equals', value: '' })
}

const removeCondition = (gi: number, ci: number) => {
  form.value.conditionGroups[gi].conditions.splice(ci, 1)
}

// Action builders
const addAction = () => {
  form.value.actions.push({ type: '', paramsJson: '{}' })
}

const removeAction = (ai: number) => {
  form.value.actions.splice(ai, 1)
}

// CRUD
const openCreate = () => {
  editingId.value = null
  form.value = emptyForm()
  dialogOpen.value = true
}

const openEdit = (r: RuleDefinition) => {
  editingId.value = r._id
  form.value = {
    name: r.name,
    module: r.module,
    description: r.description || '',
    priority: r.priority,
    stopOnMatch: r.stopOnMatch ?? false,
    validFrom: r.validFrom ? r.validFrom.slice(0, 10) : '',
    validTo: r.validTo ? r.validTo.slice(0, 10) : '',
    memo: r.memo || '',
    conditionGroups: r.conditionGroups.map((g) => ({
      logic: g.logic,
      conditions: g.conditions.map((c) => ({ ...c })),
    })),
    actions: r.actions.map((a) => ({
      type: a.type,
      paramsJson: JSON.stringify(a.params),
    })),
  }
  dialogOpen.value = true
}

const handleSave = async () => {
  if (!form.value.name.trim()) {
    showToast('ルール名は必須です', 'danger')
    return
  }
  if (!form.value.module) {
    showToast('モジュールは必須です', 'danger')
    return
  }

  // Parse action params from JSON strings
  const parsedActions = form.value.actions.map((a) => {
    let params: Record<string, any> = {}
    try {
      params = JSON.parse(a.paramsJson || '{}')
    } catch {
      // keep empty object on parse failure
    }
    return { type: a.type, params }
  })

  const payload: Partial<RuleDefinition> = {
    name: form.value.name,
    module: form.value.module as RuleDefinition['module'],
    description: form.value.description || undefined,
    priority: form.value.priority,
    stopOnMatch: form.value.stopOnMatch,
    validFrom: form.value.validFrom || undefined,
    validTo: form.value.validTo || undefined,
    memo: form.value.memo || undefined,
    conditionGroups: form.value.conditionGroups,
    actions: parsedActions,
  }

  try {
    if (editingId.value) {
      await updateRule(editingId.value, payload)
      showToast('更新しました', 'success')
    } else {
      await createRule(payload)
      showToast('作成しました', 'success')
    }
    dialogOpen.value = false
    await loadList()
  } catch (error: any) {
    showToast(error?.message || '保存に失敗しました', 'danger')
  }
}

const confirmDelete = (r: RuleDefinition) => {
  if (!confirm(`「${r.name}」を削除しますか？`)) return
  deleteRule(r._id)
    .then(async () => {
      showToast('削除しました', 'success')
      await loadList()
    })
    .catch((err: any) => {
      showToast(err?.message || '削除に失敗しました', 'danger')
    })
}

const handleToggle = async (r: RuleDefinition) => {
  try {
    const updated = await toggleRule(r._id)
    const idx = rules.value.findIndex((rule) => rule._id === r._id)
    if (idx !== -1) {
      rules.value = rules.value.map((rule, i) => (i === idx ? updated : rule))
    }
    showToast(`ルールを${updated.isActive ? '有効' : '無効'}にしました`, 'success')
  } catch (error: any) {
    showToast(error?.message || '切替に失敗しました', 'danger')
  }
}

// Test
const openTestDialog = () => {
  testForm.value = { module: 'inbound', contextJson: '' }
  testResults.value = []
  testExecuted.value = false
  testDialogOpen.value = true
}

const handleTest = async () => {
  let context: Record<string, any> = {}
  try {
    context = JSON.parse(testForm.value.contextJson || '{}')
  } catch {
    showToast('コンテキストのJSON形式が不正です', 'danger')
    return
  }

  try {
    testResults.value = await testRule({
      module: testForm.value.module,
      context,
    })
    testExecuted.value = true
  } catch (error: any) {
    showToast(error?.message || 'テストに失敗しました', 'danger')
  }
}

onMounted(() => {
  loadList()
})
</script>

<style>
@import '@/styles/order-table.css';
</style>

<style scoped>
.rule-settings {
  padding: 0 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

/* Search section */
.search-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-section__filter {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
}

/* Rule code subtitle */
.rule-code {
  font-size: 11px;
  color: var(--o-gray-500, #909399);
}

/* Toggle switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
  background: var(--o-gray-300, #dcdfe6);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s;
  padding: 0;
}

.toggle-switch--active {
  background: var(--o-primary, #714b67);
}

.toggle-switch__slider {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s;
}

.toggle-switch--active .toggle-switch__slider {
  transform: translateX(20px);
}

/* Form */
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

.required {
  color: #dc2626;
}

.form-textarea {
  resize: vertical;
}

/* Builder sections */
.builder-section {
  margin-top: 20px;
  border-top: 1px solid var(--o-border-color, #dcdfe6);
  padding-top: 16px;
}

.builder-section__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.builder-section__header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

/* Condition group */
.condition-group {
  border: 1px solid var(--o-border-color, #dcdfe6);
  border-radius: var(--o-border-radius, 4px);
  padding: 12px;
  margin-bottom: 12px;
  background: var(--o-gray-100, #f8f9fa);
}

.condition-group__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.condition-group__title {
  font-size: 13px;
  font-weight: 500;
  flex: 1;
}

.condition-group__remove {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: var(--o-gray-500, #adb5bd);
  padding: 0 4px;
}

.condition-group__remove:hover {
  color: #dc2626;
}

.condition-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

/* Action row */
.action-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

/* Test dialog */
.test-dialog {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.test-dialog__actions {
  display: flex;
  justify-content: flex-end;
}

.test-results {
  border-top: 1px solid var(--o-border-color, #dcdfe6);
  padding-top: 12px;
}

.test-results h4 {
  margin: 0 0 8px;
  font-size: 14px;
}

.test-results--empty {
  color: var(--o-gray-500, #909399);
  font-size: 13px;
}

.test-result-item {
  padding: 8px 12px;
  border: 1px solid var(--o-border-color, #dcdfe6);
  border-radius: var(--o-border-radius, 4px);
  margin-bottom: 6px;
  background: var(--o-gray-100, #f8f9fa);
}

.test-result-item__name {
  font-weight: 500;
  font-size: 13px;
}

.test-result-item__code {
  font-size: 11px;
  color: var(--o-gray-500, #909399);
}

.test-result-item__actions {
  margin-top: 4px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.test-result-action {
  display: inline-block;
  padding: 2px 8px;
  background: var(--o-primary-light, #f0ebee);
  color: var(--o-primary, #714b67);
  border-radius: 3px;
  font-size: 11px;
}
</style>
