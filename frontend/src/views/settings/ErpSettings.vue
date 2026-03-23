<template>
  <div class="erp-settings">
    <PageHeader title="ERP 連携設定 / ERP 集成设置" :show-search="false">
      <template #actions>
        <Button variant="secondary" :disabled="syncing" @click="handleSync">
          {{ syncing ? '同期中... / 同步中...' : '今すぐ同期 / 立即同步' }}
        </Button>
      </template>
    </PageHeader>

    <!-- ステータスカード / 状态卡片 -->
    <Card class="status-card">
      <CardHeader class="status-header">
        <CardTitle>接続ステータス / 连接状态</CardTitle>
        <span
          :class="status.connected
            ? 'o-status-tag o-status-tag--confirmed'
            : 'o-status-tag o-status-tag--cancelled'"
        >
          {{ status.connected ? '接続済み / 已连接' : '未接続 / 未连接' }}
        </span>
      </CardHeader>
      <div v-if="status.erpType" class="status-detail">
        ERP タイプ / ERP 类型: {{ status.erpType }}
      </div>
      <div v-if="status.lastSyncAt" class="status-detail">
        最終同期 / 最后同步: {{ formatDate(status.lastSyncAt) }}
      </div>
      <div v-if="status.syncStatus === 'error'" class="status-error">
        エラー / 错误: {{ status.errorMessage }}
      </div>
    </Card>

    <!-- 設定フォーム / 配置表单 -->
    <Card class="config-card">
      <CardHeader>
        <CardTitle>接続設定 / 连接配置</CardTitle>
      </CardHeader>
      <CardContent>
      <div class="form-grid">
        <div class="form-field">
          <Label>ERP タイプ / ERP 类型 <span class="text-destructive">*</span></Label>
          <Select v-model="config.erpType">
        <SelectTrigger class="w-full">
          <SelectValue placeholder="選択してください / 请选择" />
        </SelectTrigger>
        <SelectContent>
        <SelectItem v-for="opt in erpTypes" :key="opt.value" :value="opt.value">{{ opt.label }}</SelectItem>
        </SelectContent>
      </Select>
        </div>
        <div class="form-field">
          <Label>同期間隔（分）/ 同步间隔（分钟）</Label>
          <Input v-model.number="config.syncInterval" type="number" min="1" max="1440" />
        </div>
        <div class="form-field form-field--full">
          <Label>エンドポイント URL <span class="text-destructive">*</span></Label>
          <Input v-model="config.endpointUrl" type="url" placeholder="https://erp.example.com/api" />
        </div>
        <div class="form-field form-field--full">
          <Label>API キー / API 密钥 <span class="text-destructive">*</span></Label>
          <div class="secret-field">
            <input
              v-model="config.apiKey"
              :type="showApiKey ? 'text' : 'password'"
             
              placeholder="ERP API Key"
            />
            <Button type="button" class="secret-toggle" @click="showApiKey = !showApiKey">
              {{ showApiKey ? '隠す / 隐藏' : '表示 / 显示' }}
            </Button>
          </div>
        </div>
        <div class="form-field">
          <Label>ユーザー名 / 用户名</Label>
          <Input v-model="config.username" type="text" placeholder="ERP Username" />
        </div>
        <div class="form-field">
          <Label>パスワード / 密码</Label>
          <div class="secret-field">
            <input
              v-model="config.password"
              :type="showPassword ? 'text' : 'password'"
             
              placeholder="ERP Password"
            />
            <Button type="button" class="secret-toggle" @click="showPassword = !showPassword">
              {{ showPassword ? '隠す / 隐藏' : '表示 / 显示' }}
            </Button>
          </div>
        </div>
      </div>
    </CardContent>
    </Card>

    <!-- エクスポート設定 / 导出设置 -->
    <Card class="config-card">
      <CardHeader>
        <CardTitle>エクスポート設定 / 导出设置</CardTitle>
      </CardHeader>
      <CardContent>
      <div class="export-options">
        <label class="toggle-wrapper">
          <Checkbox :checked="config.exportShipments" @update:checked="val => config.exportShipments = val" />
          <span class="toggle-label">出荷データ / 出货数据</span>
        </label>
        <label class="toggle-wrapper">
          <Checkbox :checked="config.exportInvoices" @update:checked="val => config.exportInvoices = val" />
          <span class="toggle-label">請求書データ / 发票数据</span>
        </label>
        <label class="toggle-wrapper">
          <Checkbox :checked="config.exportInventory" @update:checked="val => config.exportInventory = val" />
          <span class="toggle-label">在庫データ / 库存数据</span>
        </label>
        <label class="toggle-wrapper">
          <Checkbox :checked="config.autoSync" @update:checked="val => config.autoSync = val" />
          <span class="toggle-label">自動同期 / 自动同步</span>
        </label>
      </div>
      <div class="form-actions">
        <Button variant="secondary" :disabled="testing" @click="handleTest">
          {{ testing ? 'テスト中... / 测试中...' : '接続テスト / 测试连接' }}
        </Button>
        <Button variant="default" :disabled="saving" @click="handleSave">
          {{ saving ? '保存中... / 保存中...' : '保存 / 保存' }}
        </Button>
      </div>
    </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import PageHeader from '@/components/shared/PageHeader.vue'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  getErpStatus,
  getErpConfig,
  updateErpConfig,
  testErpConnection,
  syncErp,
  type ErpStatus,
  type ErpConfig,
} from '@/api/erp'
import { onMounted, ref } from 'vue'
import { Badge } from '@/components/ui/badge'
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

.secret-field input {
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
