<template>
  <div class="marketplace-settings">
    <ControlPanel title="マーケットプレイス連携 / 电商平台集成" :show-search="false">
      <template #actions>
        <OButton variant="secondary" :disabled="syncing" @click="syncAll">
          {{ syncing ? '同期中... / 同步中...' : '全体同期 / 全部同步' }}
        </OButton>
      </template>
    </ControlPanel>

    <!-- プロバイダ一覧 / 平台列表 -->
    <div class="provider-grid">
      <div v-if="loading" class="loading-state">読み込み中... / 加载中...</div>
      <div v-else-if="providers.length === 0" class="empty-state">
        プロバイダが見つかりません / 未找到平台
      </div>
      <div v-for="provider in providers" :key="provider.id" class="provider-card o-card">
        <div class="provider-header">
          <div class="provider-info">
            <span class="provider-name">{{ provider.name }}</span>
            <span
              :class="provider.status === 'connected'
                ? 'o-status-tag o-status-tag--confirmed'
                : 'o-status-tag o-status-tag--cancelled'"
            >
              {{ provider.status === 'connected' ? '接続済み / 已连接' : '未接続 / 未连接' }}
            </span>
          </div>
          <span class="provider-platform">{{ platformLabel(provider.platform) }}</span>
        </div>
        <div class="provider-body">
          <div v-if="provider.lastSyncAt" class="last-sync">
            最終同期 / 最后同步: {{ formatDate(provider.lastSyncAt) }}
          </div>
          <div v-else class="last-sync">未同期 / 未同步</div>
        </div>
        <div class="provider-actions">
          <OButton
            v-if="provider.status === 'disconnected'"
            variant="primary"
            size="sm"
            @click="handleConnect(provider)"
          >
            接続 / 连接
          </OButton>
          <OButton
            v-if="provider.status === 'connected'"
            variant="icon-danger"
            size="sm"
            @click="handleDisconnect(provider)"
          >
            切断 / 断开
          </OButton>
          <OButton
            v-if="provider.status === 'connected'"
            variant="secondary"
            size="sm"
            :disabled="syncing"
            @click="handleSync(provider)"
          >
            同期 / 同步
          </OButton>
        </div>
      </div>
    </div>

    <!-- 接続ダイアログ / 连接对话框 -->
    <ODialog v-model="connectDialogOpen" title="プラットフォーム接続 / 平台连接" size="md" @confirm="submitConnect">
      <div class="form-grid">
        <div class="form-field form-field--full">
          <label class="form-label">プラットフォーム / 平台</label>
          <input :value="connectTarget?.name" class="o-input" disabled />
        </div>
        <div class="form-field form-field--full">
          <label class="form-label">API キー / API 密钥 <span class="required-badge">必須</span></label>
          <input v-model="connectForm.apiKey" type="text" class="o-input" placeholder="API Key" />
        </div>
        <div class="form-field form-field--full">
          <label class="form-label">API シークレット / API 密钥 <span class="required-badge">必須</span></label>
          <input v-model="connectForm.apiSecret" type="password" class="o-input" placeholder="API Secret" />
        </div>
        <div class="form-field form-field--full">
          <label class="form-label">ショップ URL / 店铺 URL</label>
          <input v-model="connectForm.shopUrl" type="url" class="o-input" placeholder="https://your-shop.example.com" />
        </div>
      </div>
    </ODialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import { useToast } from '@/composables/useToast'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import ODialog from '@/components/odoo/ODialog.vue'
import {
  getMarketplaceProviders,
  syncMarketplace,
  connectMarketplace,
  disconnectMarketplace,
  type MarketplaceProvider,
} from '@/api/marketplace'

const { show: showToast } = useToast()

// === State / 状態 ===
const providers = ref<MarketplaceProvider[]>([])
const loading = ref(false)
const syncing = ref(false)

// 接続ダイアログ / 连接对话框
const connectDialogOpen = ref(false)
const connectTarget = ref<MarketplaceProvider | null>(null)
const connectForm = ref({ apiKey: '', apiSecret: '', shopUrl: '' })

// === プラットフォームラベル / 平台标签 ===
const platformLabel = (platform: string): string => {
  const labels: Record<string, string> = {
    shopify: 'Shopify',
    rakuten: '楽天 / 乐天',
    amazon: 'Amazon',
    base: 'BASE',
  }
  return labels[platform] || platform
}

// === データ読込 / 数据加载 ===
const loadProviders = async () => {
  loading.value = true
  try {
    providers.value = await getMarketplaceProviders()
  } catch (error: any) {
    showToast(error?.message || 'プロバイダ取得に失敗しました / 获取平台失败', 'danger')
  } finally {
    loading.value = false
  }
}

// === 同期 / 同步 ===
const syncAll = async () => {
  syncing.value = true
  try {
    await syncMarketplace()
    showToast('全体同期を開始しました / 已开始全部同步', 'success')
    await loadProviders()
  } catch (error: any) {
    showToast(error?.message || '同期に失敗しました / 同步失败', 'danger')
  } finally {
    syncing.value = false
  }
}

const handleSync = async (provider: MarketplaceProvider) => {
  syncing.value = true
  try {
    await syncMarketplace(provider.id)
    showToast(`${provider.name} の同期を開始しました / 已开始同步 ${provider.name}`, 'success')
    await loadProviders()
  } catch (error: any) {
    showToast(error?.message || '同期に失敗しました / 同步失败', 'danger')
  } finally {
    syncing.value = false
  }
}

// === 接続・切断 / 连接/断开 ===
const handleConnect = (provider: MarketplaceProvider) => {
  connectTarget.value = provider
  connectForm.value = { apiKey: '', apiSecret: '', shopUrl: '' }
  connectDialogOpen.value = true
}

const submitConnect = async () => {
  if (!connectTarget.value) return
  if (!connectForm.value.apiKey.trim() || !connectForm.value.apiSecret.trim()) {
    showToast('API キーとシークレットは必須です / API密钥和密钥是必填项', 'danger')
    return
  }
  try {
    await connectMarketplace(connectTarget.value.id, {
      providerId: connectTarget.value.id,
      apiKey: connectForm.value.apiKey,
      apiSecret: connectForm.value.apiSecret,
      shopUrl: connectForm.value.shopUrl || undefined,
    })
    showToast(`${connectTarget.value.name} に接続しました / 已连接 ${connectTarget.value.name}`, 'success')
    connectDialogOpen.value = false
    await loadProviders()
  } catch (error: any) {
    showToast(error?.message || '接続に失敗しました / 连接失败', 'danger')
  }
}

const handleDisconnect = async (provider: MarketplaceProvider) => {
  try {
    await ElMessageBox.confirm(
      `「${provider.name}」の接続を切断しますか？ / 确定要断开「${provider.name}」吗？`,
      '確認 / 确认',
      { confirmButtonText: '切断 / 断开', cancelButtonText: 'キャンセル / 取消', type: 'warning' },
    )
  } catch { return }
  try {
    await disconnectMarketplace(provider.id)
    showToast(`${provider.name} を切断しました / 已断开 ${provider.name}`, 'success')
    await loadProviders()
  } catch (error: any) {
    showToast(error?.message || '切断に失敗しました / 断开失败', 'danger')
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
  loadProviders()
})
</script>

<style>
@import '@/styles/order-table.css';
</style>

<style scoped>
.marketplace-settings {
  padding: 0 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

.provider-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.provider-card {
  border: 1px solid var(--o-border-color, #dcdfe6);
  border-radius: var(--o-border-radius, 4px);
  padding: 16px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.provider-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.provider-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.provider-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--o-gray-800, #1f2937);
}

.provider-platform {
  font-size: 12px;
  color: var(--o-gray-500, #909399);
}

.provider-body {
  font-size: 13px;
  color: var(--o-gray-600, #606266);
}

.last-sync {
  font-size: 12px;
  color: var(--o-gray-500, #909399);
}

.provider-actions {
  display: flex;
  gap: 8px;
  margin-top: auto;
}

.loading-state,
.empty-state {
  padding: 40px;
  text-align: center;
  color: var(--o-gray-500, #909399);
  grid-column: 1 / -1;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
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

.o-status-tag--cancelled { background: #fef0f0; color: #f56c6c; }
</style>
