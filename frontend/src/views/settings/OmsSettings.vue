<template>
  <div class="oms-settings">
    <PageHeader title="OMS 連携設定 / OMS 集成设置" :show-search="false">
      <template #actions>
        <Button variant="secondary" :disabled="syncing" @click="handleSync">
          {{ syncing ? '同期中... / 同步中...' : '今すぐ同期 / 立即同步' }}
        </Button>
      </template>
    </PageHeader>

    <!-- ステータスカード / 状态卡片 -->
    <Card class="status-card">
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
      <div v-if="status.lastSyncAt" class="status-detail">
        最終同期 / 最后同步: {{ formatDate(status.lastSyncAt) }}
      </div>
      <div v-if="status.syncStatus === 'error'" class="status-error">
        エラー / 错误: {{ status.errorMessage }}
      </div>
    </Card>

    <!-- 設定フォーム / 配置表单 -->
    <Card class="config-card">
      <h3 class="section-title">設定 / 配置</h3>
      <div class="form-grid">
        <div class="form-field form-field--full">
          <label>API エンドポイント URL <span class="text-destructive text-xs">*</span></label>
          <Input v-model="config.endpointUrl" type="url" placeholder="https://oms.example.com/api" />
        </div>
        <div class="form-field form-field--full">
          <label>API キー / API 密钥 <span class="text-destructive text-xs">*</span></label>
          <div class="secret-field">
            <input
              v-model="config.apiKey"
              :type="showApiKey ? 'text' : 'password'"
             
              placeholder="OMS API Key"
            />
            <Button type="button" class="secret-toggle" @click="showApiKey = !showApiKey">
              {{ showApiKey ? '隠す / 隐藏' : '表示 / 显示' }}
            </Button>
          </div>
        </div>
        <div class="form-field">
          <label>同期間隔（分）/ 同步间隔（分钟）</label>
          <Input v-model.number="config.syncInterval" type="number" min="1" max="1440" />
        </div>
        <div class="form-field">
          <label>自動同期 / 自动同步</label>
          <label class="toggle-wrapper">
            <Checkbox :checked="config.autoSync" @update:checked="val => config.autoSync = val" />
            <span class="toggle-label">{{ config.autoSync ? 'ON' : 'OFF' }}</span>
          </label>
        </div>
        <div class="form-field">
          <label>注文同期 / 订单同步</label>
          <label class="toggle-wrapper">
            <Checkbox :checked="config.syncOrders" @update:checked="val => config.syncOrders = val" />
            <span class="toggle-label">{{ config.syncOrders ? 'ON' : 'OFF' }}</span>
          </label>
        </div>
        <div class="form-field">
          <label>在庫同期 / 库存同步</label>
          <label class="toggle-wrapper">
            <Checkbox :checked="config.syncInventory" @update:checked="val => config.syncInventory = val" />
            <span class="toggle-label">{{ config.syncInventory ? 'ON' : 'OFF' }}</span>
          </label>
        </div>
        <div class="form-field">
          <label>出荷同期 / 出货同步</label>
          <label class="toggle-wrapper">
            <Checkbox :checked="config.syncShipments" @update:checked="val => config.syncShipments = val" />
            <span class="toggle-label">{{ config.syncShipments ? 'ON' : 'OFF' }}</span>
          </label>
        </div>
      </div>
      <div class="form-actions">
        <Button variant="secondary" :disabled="testing" @click="handleTest">
          {{ testing ? 'テスト中... / 测试中...' : '接続テスト / 测试连接' }}
        </Button>
        <Button variant="default" :disabled="saving" @click="handleSave">
          {{ saving ? '保存中... / 保存中...' : '保存 / 保存' }}
        </Button>
      </div>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import PageHeader from '@/components/shared/PageHeader.vue'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  getOmsStatus,
  getOmsConfig,
  updateOmsConfig,
  testOmsConnection,
  syncOms,
  type OmsStatus,
  type OmsConfig,
} from '@/api/oms'
import { onMounted, ref } from 'vue'
import { Badge } from '@/components/ui/badge'
const { show: showToast } = useToast()

// === State / 状態 ===
const status = ref<OmsStatus>({ connected: false })
const config = ref<OmsConfig>({
  endpointUrl: '',
  apiKey: '',
  syncInterval: 30,
  autoSync: false,
  syncOrders: true,
  syncInventory: true,
  syncShipments: true,
})
const showApiKey = ref(false)
const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const syncing = ref(false)

// === データ読込 / 数据加载 ===
const loadData = async () => {
  loading.value = true
  try {
    const [statusResult, configResult] = await Promise.allSettled([
      getOmsStatus(),
      getOmsConfig(),
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
  if (!config.value.endpointUrl.trim()) {
    showToast('API エンドポイント URL は必須です / API端点URL是必填项', 'danger')
    return
  }
  if (!config.value.apiKey.trim()) {
    showToast('API キーは必須です / API密钥是必填项', 'danger')
    return
  }
  saving.value = true
  try {
    config.value = await updateOmsConfig({ ...config.value })
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
    const result = await testOmsConnection()
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
    await syncOms()
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
.oms-settings {
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

.secret-field .{
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

.toggle-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  margin-top: 4px;
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
