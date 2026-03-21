<template>
  <div class="erp-settings">
    <ControlPanel title="ERP 連携設定 / ERP 集成设置" :show-search="false">
      <template #actions>
        <OButton variant="secondary" :disabled="syncing" @click="handleSync">
          {{ syncing ? '同期中... / 同步中...' : '今すぐ同期 / 立即同步' }}
        </OButton>
      </template>
    </ControlPanel>

    <!-- ステータスカード / 状态卡片 -->
    <div class="status-card o-card">
      <div class="status-header">
        <h3 class="section-title">接続ステータス / 连接状态</h3>
        <span
          :class="status.connected
            ? 'o-status-tag o-status-tag--confirmed'
            : 'o-status-tag o-status-tag--cancelled'"
        >
          {{ status.connected ? '接続済み / 已连接' : '未接続 / 未连接' }}
        </span>
      </div>
      <div v-if="status.erpType" class="status-detail">
        ERP タイプ / ERP 类型: {{ status.erpType }}
      </div>
      <div v-if="status.lastSyncAt" class="status-detail">
        最終同期 / 最后同步: {{ formatDate(status.lastSyncAt) }}
      </div>
      <div v-if="status.syncStatus === 'error'" class="status-error">
        エラー / 错误: {{ status.errorMessage }}
      </div>
    </div>

    <!-- 設定フォーム / 配置表单 -->
    <div class="config-card o-card">
      <h3 class="section-title">接続設定 / 连接配置</h3>
      <div class="form-grid">
        <div class="form-field">
          <label class="form-label">ERP タイプ / ERP 类型 <span class="required-badge">必須</span></label>
          <select v-model="config.erpType" class="o-input">
            <option value="" disabled>選択してください / 请选择</option>
            <option v-for="opt in erpTypes" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-field">
          <label class="form-label">同期間隔（分）/ 同步间隔（分钟）</label>
          <input v-model.number="config.syncInterval" type="number" class="o-input" min="1" max="1440" />
        </div>
        <div class="form-field form-field--full">
          <label class="form-label">エンドポイント URL <span class="required-badge">必須</span></label>
          <input v-model="config.endpointUrl" type="url" class="o-input" placeholder="https://erp.example.com/api" />
        </div>
        <div class="form-field form-field--full">
          <label class="form-label">API キー / API 密钥 <span class="required-badge">必須</span></label>
          <div class="secret-field">
            <input
              v-model="config.apiKey"
              :type="showApiKey ? 'text' : 'password'"
              class="o-input"
              placeholder="ERP API Key"
            />
            <button type="button" class="secret-toggle" @click="showApiKey = !showApiKey">
              {{ showApiKey ? '隠す / 隐藏' : '表示 / 显示' }}
            </button>
          </div>
        </div>
        <div class="form-field">
          <label class="form-label">ユーザー名 / 用户名</label>
          <input v-model="config.username" type="text" class="o-input" placeholder="ERP Username" />
        </div>
        <div class="form-field">
          <label class="form-label">パスワード / 密码</label>
          <div class="secret-field">
            <input
              v-model="config.password"
              :type="showPassword ? 'text' : 'password'"
              class="o-input"
              placeholder="ERP Password"
            />
            <button type="button" class="secret-toggle" @click="showPassword = !showPassword">
              {{ showPassword ? '隠す / 隐藏' : '表示 / 显示' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- エクスポート設定 / 导出设置 -->
    <div class="config-card o-card">
      <h3 class="section-title">エクスポート設定 / 导出设置</h3>
      <div class="export-options">
        <label class="toggle-wrapper">
          <input v-model="config.exportShipments" type="checkbox" class="toggle-input" />
          <span class="toggle-label">出荷データ / 出货数据</span>
        </label>
        <label class="toggle-wrapper">
          <input v-model="config.exportInvoices" type="checkbox" class="toggle-input" />
          <span class="toggle-label">請求書データ / 发票数据</span>
        </label>
        <label class="toggle-wrapper">
          <input v-model="config.exportInventory" type="checkbox" class="toggle-input" />
          <span class="toggle-label">在庫データ / 库存数据</span>
        </label>
        <label class="toggle-wrapper">
          <input v-model="config.autoSync" type="checkbox" class="toggle-input" />
          <span class="toggle-label">自動同期 / 自动同步</span>
        </label>
      </div>
      <div class="form-actions">
        <OButton variant="secondary" :disabled="testing" @click="handleTest">
          {{ testing ? 'テスト中... / 测试中...' : '接続テスト / 测试连接' }}
        </OButton>
        <OButton variant="primary" :disabled="saving" @click="handleSave">
          {{ saving ? '保存中... / 保存中...' : '保存 / 保存' }}
        </OButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useToast } from '@/composables/useToast'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import {
  getErpStatus,
  getErpConfig,
  updateErpConfig,
  testErpConnection,
  syncErp,
  type ErpStatus,
  type ErpConfig,
} from '@/api/erp'

const { show: showToast } = useToast()

// === ERP タイプ選択肢 / ERP 类型选项 ===
const erpTypes = [
  { value: 'sap', label: 'SAP' },
  { value: 'oracle', label: 'Oracle ERP' },
  { value: 'freee', label: 'freee' },
  { value: 'moneyforward', label: 'マネーフォワード / MoneyForward' },
  { value: 'pca', label: 'PCA会計' },
  { value: 'custom', label: 'カスタム / 自定义' },
]

// === State / 状態 ===
const status = ref<ErpStatus>({ connected: false })
const config = ref<ErpConfig>({
  erpType: '',
  endpointUrl: '',
  apiKey: '',
  username: '',
  password: '',
  exportShipments: true,
  exportInvoices: true,
  exportInventory: true,
  syncInterval: 60,
  autoSync: false,
})
const showApiKey = ref(false)
const showPassword = ref(false)
const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const syncing = ref(false)

// === データ読込 / 数据加载 ===
const loadData = async () => {
  loading.value = true
  try {
    const [statusResult, configResult] = await Promise.allSettled([
      getErpStatus(),
      getErpConfig(),
    ])
    if (statusResult.status === 'fulfilled') status.value = statusResult.value
    if (configResult.status === 'fulfilled') config.value = configResult.value
  } catch (error: any) {
    showToast(error?.message || 'データ取得に失敗しました / 获取数据失败', 'danger')
  } finally {
    loading.value = false
  }
}

// === 保存 / 保存 ===
const handleSave = async () => {
  if (!config.value.erpType) {
    showToast('ERP タイプを選択してください / 请选择ERP类型', 'danger')
    return
  }
  if (!config.value.endpointUrl.trim()) {
    showToast('エンドポイント URL は必須です / 端点URL是必填项', 'danger')
    return
  }
  if (!config.value.apiKey.trim()) {
    showToast('API キーは必須です / API密钥是必填项', 'danger')
    return
  }
  saving.value = true
  try {
    config.value = await updateErpConfig({ ...config.value })
    showToast('設定を保存しました / 设置已保存', 'success')
    await loadData()
  } catch (error: any) {
    showToast(error?.message || '保存に失敗しました / 保存失败', 'danger')
  } finally {
    saving.value = false
  }
}

// === テスト / 测试 ===
const handleTest = async () => {
  testing.value = true
  try {
    const result = await testErpConnection()
    if (result.success) {
      showToast(`接続テスト成功 / 连接测试成功${result.latency ? ` (${result.latency}ms)` : ''}`, 'success')
    } else {
      showToast(`接続テスト失敗 / 连接测试失败: ${result.message}`, 'danger')
    }
  } catch (error: any) {
    showToast(error?.message || '接続テストに失敗しました / 连接测试失败', 'danger')
  } finally {
    testing.value = false
  }
}

// === 同期 / 同步 ===
const handleSync = async () => {
  syncing.value = true
  try {
    await syncErp()
    showToast('同期を開始しました / 已开始同步', 'success')
    await loadData()
  } catch (error: any) {
    showToast(error?.message || '同期に失敗しました / 同步失败', 'danger')
  } finally {
    syncing.value = false
  }
}

// === 日付フォーマット / 日期格式化 ===
const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  return d.toLocaleString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

onMounted(() => {
  loadData()
})
</script>

<style>
@import '@/styles/order-table.css';
</style>

<style scoped>
.erp-settings {
  padding: 0 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

.status-card,
.config-card {
  border: 1px solid var(--o-border-color, #dcdfe6);
  border-radius: var(--o-border-radius, 4px);
  padding: 16px;
  background: #fff;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--o-gray-800, #1f2937);
  margin: 0 0 12px;
}

.status-detail {
  font-size: 13px;
  color: var(--o-gray-600, #606266);
  margin-bottom: 4px;
}

.status-error {
  font-size: 13px;
  color: #f56c6c;
  margin-top: 4px;
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

.secret-field {
  display: flex;
  gap: 4px;
}

.secret-field .o-input {
  flex: 1;
}

.secret-toggle {
  padding: 0 8px;
  border: 1px solid var(--o-border-color, #dcdfe6);
  border-radius: var(--o-border-radius, 4px);
  background: var(--o-gray-100, #f8f9fa);
  cursor: pointer;
  font-size: 12px;
  white-space: nowrap;
}

.secret-toggle:hover {
  background: var(--o-gray-200, #e9ecef);
}

.export-options {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.toggle-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.toggle-input {
  width: 16px;
  height: 16px;
}

.toggle-label {
  font-size: 13px;
  color: var(--o-gray-700, #303133);
}

.form-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  justify-content: flex-end;
}

.o-status-tag--cancelled { background: #fef0f0; color: #f56c6c; }
</style>
