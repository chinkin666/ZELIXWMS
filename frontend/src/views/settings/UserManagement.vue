<template>
  <div class="user-management">
    <ControlPanel title="ユーザー管理" :show-search="false">
      <template #actions>
        <OButton variant="primary" @click="openCreate"><span class="o-icon">+</span> 新規追加</OButton>
      </template>
    </ControlPanel>

    <!-- ロールフィルタータブ / 角色筛选标签 -->
    <div class="role-tabs">
      <button
        v-for="tab in roleTabs"
        :key="tab.value"
        class="role-tab"
        :class="{ active: activeRoleFilter === tab.value }"
        @click="handleRoleFilter(tab.value)"
      >
        {{ tab.label }}
        <span v-if="tab.value !== ''" class="role-dot" :style="{ background: ROLE_COLORS[tab.value as UserRole] }" />
      </button>
    </div>

    <SearchForm
      class="search-section"
      :columns="searchColumns"
      :show-save="false"
      storage-key="userManagementSearch"
      @search="handleSearch"
    />

    <div class="table-section">
      <Table
        :columns="tableColumns"
        :data="list"
        row-key="_id"
        pagination-enabled
        pagination-mode="server"
        :page-size="pageSize"
        :page-sizes="[10, 20, 50]"
        :total="total"
        :current-page="currentPage"
        :global-search-text="globalSearchText"
        @page-change="handlePageChangeEvent"
      />
    </div>

    <!-- サブユーザーダイアログ / 子用户对话框 -->
    <ODialog :open="subUserDialogVisible" title="サブユーザー一覧" size="lg" @close="subUserDialogVisible = false">
        <div v-if="subUsers.length === 0" class="empty-message">サブユーザーはいません。</div>
        <div v-else class="sub-user-list">
          <div v-for="sub in subUsers" :key="sub._id" class="sub-user-item">
            <div class="sub-user-info">
              <span class="sub-user-name">{{ sub.displayName }}</span>
              <span class="sub-user-email">{{ sub.email }}</span>
              <span class="role-badge" :style="{ background: ROLE_COLORS[sub.role], color: '#fff' }">
                {{ ROLE_LABELS[sub.role] }}
              </span>
            </div>
            <div class="sub-user-actions">
              <OButton variant="primary" size="sm" @click="openEditFromSub(sub)">編集</OButton>
            </div>
          </div>
        </div>
      <template #footer><span></span></template>
    </ODialog>

    <!-- 作成/編集ダイアログ / 创建/编辑对话框 -->
    <ODialog
      :open="dialogVisible"
      :title="isEditing ? 'ユーザーを編集' : 'ユーザーを追加'"
      size="lg"
      @close="closeDialog"
    >
        <form class="user-form" @submit.prevent="handleSubmit">
          <div class="form-row">
            <label class="form-label">メールアドレス <span class="required-badge">必須</span></label>
            <input class="o-input" v-model="form.email" type="email" required placeholder="user@example.com" />
          </div>

          <div class="form-row">
            <label class="form-label">
              パスワード
              <span v-if="!isEditing" class="required-badge">必須</span>
              <span v-else class="optional-hint">（変更する場合のみ入力）</span>
            </label>
            <div class="password-wrapper">
              <input
                class="o-input password-input"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                :required="!isEditing"
                placeholder="••••••••"
                autocomplete="new-password"
              />
              <button type="button" class="password-toggle" @click="showPassword = !showPassword">
                {{ showPassword ? '隠す' : '表示' }}
              </button>
            </div>
          </div>

          <div class="form-row">
            <label class="form-label">表示名 <span class="required-badge">必須</span></label>
            <input class="o-input" v-model="form.displayName" required placeholder="山田 太郎" />
          </div>

          <div class="form-row">
            <label class="form-label">ロール <span class="required-badge">必須</span></label>
            <select class="o-input" v-model="form.role" required>
              <option value="" disabled>選択してください</option>
              <option v-for="r in ALL_ROLES" :key="r" :value="r">{{ ROLE_LABELS[r] }}</option>
            </select>
          </div>

          <!-- 権限説明 / 权限说明 -->
          <div v-if="form.role" class="permission-hint">
            <strong>権限:</strong>
            <span v-if="form.role === 'admin'">全機能にアクセス可能</span>
            <span v-if="form.role === 'manager'">出荷/入庫/在庫/返品/請求 + 一部設定</span>
            <span v-if="form.role === 'operator'">検品/棚入れ/棚卸のみ</span>
            <span v-if="form.role === 'viewer'">閲覧のみ（編集不可）</span>
            <span v-if="form.role === 'client'">自社データのみ閲覧可能</span>
          </div>

          <!-- 倉庫選択 (manager/operator/viewer) / 仓库选择 -->
          <div v-if="showWarehouseSelect" class="form-row">
            <label class="form-label">倉庫</label>
            <div class="multi-select-wrapper">
              <label
                v-for="wh in warehouseOptions"
                :key="wh._id"
                class="checkbox-label"
              >
                <input type="checkbox" :value="wh._id" v-model="form.warehouseIds" />
                {{ wh.name }} ({{ wh.code }})
              </label>
              <span v-if="warehouseOptions.length === 0" class="empty-hint">倉庫データがありません</span>
            </div>
          </div>

          <!-- 荷主選択 (client) / 客户选择 -->
          <div v-if="form.role === 'client'" class="form-row">
            <label class="form-label">荷主</label>
            <select class="o-input" v-model="form.clientId">
              <option value="">未選択</option>
              <option v-for="cl in clientOptions" :key="cl._id" :value="cl._id">
                {{ cl.name }} ({{ cl.clientCode }})
              </option>
            </select>
          </div>

          <div class="form-row">
            <label class="form-label">電話番号</label>
            <input class="o-input" v-model="form.phone" placeholder="03-1234-5678" />
          </div>

          <div class="form-row">
            <label class="form-label">言語</label>
            <select class="o-input" v-model="form.language">
              <option value="ja">日本語</option>
              <option value="zh">中文</option>
              <option value="en">English</option>
            </select>
          </div>

          <div class="form-row">
            <label class="form-label">親ユーザー（サブユーザー作成用）</label>
            <select class="o-input" v-model="form.parentUserId">
              <option value="">なし</option>
              <option v-for="u in parentUserOptions" :key="u._id" :value="u._id">
                {{ u.displayName }} ({{ u.email }})
              </option>
            </select>
          </div>

          <div class="form-row">
            <label class="form-label">メモ</label>
            <textarea class="o-input" v-model="form.memo" rows="3" />
          </div>

          <div class="form-actions">
            <OButton variant="secondary" type="button" @click="closeDialog">キャンセル</OButton>
            <OButton variant="primary" type="submit" :disabled="saving">
              {{ saving ? '保存中...' : '保存' }}
            </OButton>
          </div>
        </form>
      <template #footer><span></span></template>
    </ODialog>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import ODialog from '@/components/odoo/ODialog.vue'
import SearchForm from '@/components/search/SearchForm.vue'
import Table from '@/components/table/Table.vue'
import type { TableColumn, Operator } from '@/types/table'
import {
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
  fetchSubUsers,
  ROLE_LABELS,
  ROLE_COLORS,
  ALL_ROLES,
} from '@/api/user'
import type { User, UserRole, CreateUserDto, UpdateUserDto } from '@/api/user'
import { fetchWarehouses } from '@/api/warehouse'
import type { Warehouse } from '@/api/warehouse'
import { fetchClients } from '@/api/client'
import type { Client } from '@/api/client'

const { show: showToast } = useToast()
const { t } = useI18n()

// ---------------------------------------------------------------------------
// 状態 / 状态
// ---------------------------------------------------------------------------
const list = ref<User[]>([])
const total = ref(0)
const loading = ref(false)
const saving = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const globalSearchText = ref('')
const activeRoleFilter = ref<UserRole | ''>('')

const dialogVisible = ref(false)
const editingId = ref<string | null>(null)
const showPassword = ref(false)

// サブユーザー / 子用户
const subUserDialogVisible = ref(false)
const subUsers = ref<User[]>([])

// マスタデータ / 主数据
const warehouseOptions = ref<Warehouse[]>([])
const clientOptions = ref<Client[]>([])
const parentUserOptions = ref<User[]>([])

// ロールタブ / 角色标签
const roleTabs = [
  { label: '全て', value: '' as const },
  { label: '管理者', value: 'admin' as const },
  { label: '主管', value: 'manager' as const },
  { label: '作業員', value: 'operator' as const },
  { label: '閲覧者', value: 'viewer' as const },
  { label: '荷主', value: 'client' as const },
]

// ---------------------------------------------------------------------------
// フォーム / 表单
// ---------------------------------------------------------------------------
const emptyForm = () => ({
  email: '',
  password: '',
  displayName: '',
  role: '' as UserRole | '',
  warehouseIds: [] as string[],
  clientId: '',
  clientName: '',
  parentUserId: '',
  phone: '',
  language: 'ja',
  memo: '',
})

const form = ref(emptyForm())

// ---------------------------------------------------------------------------
// 計算プロパティ / 计算属性
// ---------------------------------------------------------------------------
const isEditing = computed(() => editingId.value !== null)

const showWarehouseSelect = computed(() => {
  const r = form.value.role
  return r === 'manager' || r === 'operator' || r === 'viewer'
})

// ---------------------------------------------------------------------------
// テーブル列 / 表格列
// ---------------------------------------------------------------------------
const baseColumns: TableColumn[] = [
  {
    key: 'email',
    dataKey: 'email',
    title: 'メール',
    width: 220,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'displayName',
    dataKey: 'displayName',
    title: '表示名',
    width: 150,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'role',
    dataKey: 'role',
    title: 'ロール',
    width: 100,
    fieldType: 'string',
  },
  {
    key: 'warehouseIds',
    dataKey: 'warehouseIds',
    title: '倉庫',
    width: 160,
    fieldType: 'string',
  },
  {
    key: 'clientName',
    dataKey: 'clientName',
    title: '荷主',
    width: 120,
    fieldType: 'string',
  },
  {
    key: 'isActive',
    dataKey: 'isActive',
    title: '有効',
    width: 80,
    fieldType: 'boolean',
  },
  {
    key: 'lastLoginAt',
    dataKey: 'lastLoginAt',
    title: '最終ログイン',
    width: 160,
    fieldType: 'string',
  },
]

const searchColumns: TableColumn[] = baseColumns.filter((c) => c.searchable)

const tableColumns: TableColumn[] = [
  ...baseColumns.map((col) => {
    if (col.key === 'role') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: User }) =>
          h(
            'span',
            {
              class: 'role-badge',
              style: { background: ROLE_COLORS[rowData.role], color: '#fff' },
            },
            ROLE_LABELS[rowData.role] || rowData.role,
          ),
      }
    }
    if (col.key === 'isActive') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: User }) =>
          h(
            'span',
            {
              class: rowData.isActive
                ? 'o-status-tag o-status-tag--confirmed'
                : 'o-status-tag o-status-tag--cancelled',
            },
            rowData.isActive ? '有効' : '無効',
          ),
      }
    }
    if (col.key === 'warehouseIds') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: User }) => {
          const ids = rowData.warehouseIds || []
          if (ids.length === 0) return '-'
          // 倉庫名を表示 / 显示仓库名
          const names = ids.map((id) => {
            const wh = warehouseOptions.value.find((w) => w._id === id)
            return wh ? wh.name : id.slice(-6)
          })
          return names.join(', ')
        },
      }
    }
    if (col.key === 'clientName') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: User }) => rowData.clientName || '-',
      }
    }
    if (col.key === 'lastLoginAt') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: User }) => {
          if (!rowData.lastLoginAt) return '-'
          return new Date(rowData.lastLoginAt).toLocaleString('ja-JP')
        },
      }
    }
    return col
  }),
  {
    key: 'actions',
    title: t('wms.common.actions', '操作'),
    width: 220,
    cellRenderer: ({ rowData }: { rowData: User }) =>
      h('div', { class: 'action-cell' }, [
        h(OButton, { variant: 'primary', size: 'sm', onClick: () => openEdit(rowData) }, () => '編集'),
        h(
          OButton,
          { variant: 'secondary', size: 'sm', onClick: () => showSubUsers(rowData) },
          () => 'サブ',
        ),
        h(
          OButton,
          { variant: 'icon-danger', size: 'sm', onClick: () => confirmDelete(rowData) },
          () => '削除',
        ),
      ]),
  },
]

// ---------------------------------------------------------------------------
// 検索 / 搜索
// ---------------------------------------------------------------------------
const currentSearchText = ref('')

const handleSearch = (payload: Record<string, { operator: Operator; value: any }>) => {
  if (payload.__global?.value) {
    globalSearchText.value = String(payload.__global.value).trim()
    delete payload.__global
  } else {
    globalSearchText.value = ''
  }

  const parts: string[] = []
  if (payload.email?.value) parts.push(String(payload.email.value).trim())
  if (payload.displayName?.value) parts.push(String(payload.displayName.value).trim())

  currentSearchText.value = parts.join(' ')
  currentPage.value = 1
  loadList()
}

const handleRoleFilter = (role: UserRole | '') => {
  activeRoleFilter.value = role
  currentPage.value = 1
  loadList()
}

// ---------------------------------------------------------------------------
// データ取得 / 数据加载
// ---------------------------------------------------------------------------
const loadList = async () => {
  loading.value = true
  try {
    const result = await fetchUsers({
      search: currentSearchText.value || undefined,
      role: activeRoleFilter.value || undefined,
      page: currentPage.value,
      limit: pageSize.value,
    })
    list.value = result.data
    total.value = result.total
  } catch (error: any) {
    showToast(error?.message || '取得に失敗しました', 'danger')
  } finally {
    loading.value = false
  }
}

const loadMasterData = async () => {
  try {
    const [whResult, clResult, userResult] = await Promise.all([
      fetchWarehouses({ limit: 200, isActive: 'true' }),
      fetchClients({ limit: 200, isActive: 'true' }),
      fetchUsers({ limit: 200 }),
    ])
    warehouseOptions.value = whResult.data
    clientOptions.value = clResult.data
    parentUserOptions.value = userResult.data
  } catch (error: any) {
    showToast(error?.message || 'マスタデータの取得に失敗しました', 'danger')
  }
}

// ---------------------------------------------------------------------------
// ページネーション / 分页
// ---------------------------------------------------------------------------
const handlePageChangeEvent = (payload: { page: number; pageSize: number }) => {
  currentPage.value = payload.page
  pageSize.value = payload.pageSize
  loadList()
}

// ---------------------------------------------------------------------------
// ダイアログ / 对话框
// ---------------------------------------------------------------------------
const openCreate = () => {
  editingId.value = null
  form.value = emptyForm()
  showPassword.value = false
  dialogVisible.value = true
}

const openEdit = (item: User) => {
  editingId.value = item._id
  form.value = {
    email: item.email,
    password: '',
    displayName: item.displayName,
    role: item.role,
    warehouseIds: [...(item.warehouseIds || [])],
    clientId: item.clientId || '',
    clientName: item.clientName || '',
    parentUserId: item.parentUserId || '',
    phone: item.phone || '',
    language: item.language || 'ja',
    memo: item.memo || '',
  }
  showPassword.value = false
  dialogVisible.value = true
}

const openEditFromSub = (item: User) => {
  subUserDialogVisible.value = false
  openEdit(item)
}

const closeDialog = () => {
  dialogVisible.value = false
  editingId.value = null
  form.value = emptyForm()
  showPassword.value = false
}

const handleSubmit = async () => {
  saving.value = true
  try {
    if (editingId.value) {
      // 更新 / 更新
      const payload: UpdateUserDto = {
        email: form.value.email.trim(),
        displayName: form.value.displayName.trim(),
        role: form.value.role as UserRole,
        warehouseIds: showWarehouseSelect.value ? form.value.warehouseIds : undefined,
        clientId: form.value.role === 'client' ? form.value.clientId || undefined : undefined,
        clientName: form.value.role === 'client' ? resolveClientName() : undefined,
        parentUserId: form.value.parentUserId || undefined,
        phone: form.value.phone.trim() || undefined,
        language: form.value.language || undefined,
        memo: form.value.memo.trim() || undefined,
      }
      // パスワード変更がある場合のみ含める / 仅当密码变更时包含
      if (form.value.password.trim()) {
        payload.password = form.value.password.trim()
      }
      await updateUser(editingId.value, payload)
      showToast('更新しました', 'success')
    } else {
      // 作成 / 创建
      const payload: CreateUserDto = {
        email: form.value.email.trim(),
        password: form.value.password.trim(),
        displayName: form.value.displayName.trim(),
        role: form.value.role as UserRole,
        warehouseIds: showWarehouseSelect.value ? form.value.warehouseIds : undefined,
        clientId: form.value.role === 'client' ? form.value.clientId || undefined : undefined,
        clientName: form.value.role === 'client' ? resolveClientName() : undefined,
        parentUserId: form.value.parentUserId || undefined,
        phone: form.value.phone.trim() || undefined,
        language: form.value.language || undefined,
        memo: form.value.memo.trim() || undefined,
      }
      await createUser(payload)
      showToast('作成しました', 'success')
    }
    closeDialog()
    await loadList()
  } catch (error: any) {
    showToast(error?.message || '保存に失敗しました', 'danger')
  } finally {
    saving.value = false
  }
}

/** 選択された荷主名を解決 / 解析选中的客户名称 */
const resolveClientName = (): string | undefined => {
  if (!form.value.clientId) return undefined
  const found = clientOptions.value.find((c) => c._id === form.value.clientId)
  return found ? found.name : undefined
}

// ---------------------------------------------------------------------------
// 削除 / 删除
// ---------------------------------------------------------------------------
const confirmDelete = async (item: User) => {
  try {
    await ElMessageBox.confirm(
      `「${item.displayName}」を無効にしてもよろしいですか？ / 确定要禁用「${item.displayName}」吗？`,
      '確認 / 确认',
      { confirmButtonText: '無効化 / 禁用', cancelButtonText: 'キャンセル / 取消', type: 'warning' },
    )
  } catch { return }
  try {
    await deleteUser(item._id)
    showToast('無効にしました', 'success')
    await loadList()
  } catch (error: any) {
    showToast(error?.message || '削除に失敗しました', 'danger')
  }
}

// ---------------------------------------------------------------------------
// サブユーザー / 子用户
// ---------------------------------------------------------------------------
const showSubUsers = async (item: User) => {
  try {
    subUsers.value = await fetchSubUsers(item._id)
    subUserDialogVisible.value = true
  } catch (error: any) {
    showToast(error?.message || 'サブユーザーの取得に失敗しました', 'danger')
  }
}

// ---------------------------------------------------------------------------
// 初期化 / 初始化
// ---------------------------------------------------------------------------
onMounted(() => {
  loadList()
  loadMasterData()
})
</script>

<style>
@import '@/styles/order-table.css';

.o-status-tag--cancelled { background: #fef0f0; color: #f56c6c; }
</style>

<style scoped>
.user-management {
  padding: 0 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

/* ロールタブ / 角色标签 */
.role-tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--o-border-color, #dcdfe6);
  padding-bottom: 0;
}

.role-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 13px;
  color: var(--o-gray-600, #606266);
  border-bottom: 2px solid transparent;
  transition: color 0.2s, border-color 0.2s;
}

.role-tab:hover {
  color: var(--o-primary, #714b67);
}

.role-tab.active {
  color: var(--o-primary, #714b67);
  border-bottom-color: var(--o-primary, #714b67);
  font-weight: 600;
}

.role-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.table-section {
  width: 100%;
}

:deep(.action-cell) {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* ロールバッジ / 角色徽章 */
:deep(.role-badge) {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.5;
}

/* フォーム / 表单 */
.user-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 0;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--o-gray-700, #303133);
}

.optional-hint {
  font-size: 11px;
  font-weight: 400;
  color: var(--o-gray-500, #909399);
  margin-left: 4px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

/* パスワード / 密码 */
.password-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.password-input {
  flex: 1;
  padding-right: 60px;
}

.password-toggle {
  position: absolute;
  right: 8px;
  background: none;
  border: 1px solid var(--o-border-color, #dcdfe6);
  border-radius: 3px;
  padding: 2px 8px;
  font-size: 11px;
  cursor: pointer;
  color: var(--o-gray-600, #606266);
}

.password-toggle:hover {
  background: var(--o-gray-100, #f5f7fa);
}

/* マルチセレクト / 多选 */
.multi-select-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px;
  border: 1px solid var(--o-border-color, #dcdfe6);
  border-radius: var(--o-border-radius, 4px);
  background: var(--o-gray-50, #fafafa);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  cursor: pointer;
}

.empty-hint {
  font-size: 12px;
  color: var(--o-gray-500, #909399);
}

/* 権限説明 / 权限说明 */
.permission-hint {
  padding: 8px 12px;
  background: var(--o-gray-100, #f5f7fa);
  border-radius: var(--o-border-radius, 4px);
  font-size: 13px;
  color: var(--o-gray-700, #303133);
  border-left: 3px solid var(--o-primary, #714b67);
}

.permission-hint strong {
  margin-right: 4px;
}

/* サブユーザー / 子用户 */
.empty-message {
  padding: 20px;
  text-align: center;
  color: var(--o-gray-500, #909399);
  font-size: 14px;
}

.sub-user-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sub-user-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid var(--o-border-color, #dcdfe6);
  border-radius: var(--o-border-radius, 4px);
}

.sub-user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sub-user-name {
  font-weight: 500;
  font-size: 14px;
}

.sub-user-email {
  font-size: 13px;
  color: var(--o-gray-500, #909399);
}

.sub-user-actions {
  display: flex;
  gap: 6px;
}
</style>
