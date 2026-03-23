<template>
  <div class="marketplace-settings">
    <PageHeader title="マーケットプレイス連携 / 电商平台集成" :show-search="false">
      <template #actions>
        <Button variant="secondary" :disabled="syncing" @click="syncAll">
          {{ syncing ? '同期中... / 同步中...' : '全体同期 / 全部同步' }}
        </Button>
      </template>
    </PageHeader>

    <!-- プロバイダ一覧 / 平台列表 -->
    <div class="provider-grid">
      <div v-if="loading" class="space-y-3 p-4">
        <Skeleton class="h-4 w-[250px]" />
        <Skeleton class="h-4 w-[200px]" />
        <Skeleton class="h-10 w-full" />
        <Skeleton class="h-10 w-full" />
        <Skeleton class="h-10 w-full" />
      </div>
      <div v-else-if="providers.length === 0" class="empty-state">
        プロバイダが見つかりません / 未找到平台
      </div>
      <Card v-for="provider in providers" :key="provider.id" class="provider-card">
        <div class="provider-header">
          <div class="provider-info">
            <span class="provider-name">{{ provider.name }}</span>
            <Badge variant="default">
              {{ provider.status === 'connected' ? '接続済み / 已连接' : '未接続 / 未连接' }}
            </Badge>
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
          <Button
            v-if="provider.status === 'disconnected'"
            variant="default"
            size="sm"
            @click="handleConnect(provider)"
          >
            接続 / 连接
          </Button>
          <Button
            v-if="provider.status === 'connected'"
            variant="destructive" size="sm"
            @click="handleDisconnect(provider)"
          >
            切断 / 断开
          </Button>
          <Button
            v-if="provider.status === 'connected'"
            variant="secondary"
            size="sm"
            :disabled="syncing"
            @click="handleSync(provider)"
          >
            同期 / 同步
          </Button>
        </div>
      </Card>
    </div>

    <!-- 接続ダイアログ / 连接对话框 -->
    <Dialog :open="connectDialogOpen" @update:open="connectDialogOpen = $event">
      <DialogContent>
        <DialogHeader><DialogTitle>プラットフォーム接続 / 平台连接</DialogTitle></DialogHeader>
      <div class="form-grid">
        <div class="form-field form-field--full">
          <label>プラットフォーム / 平台</label>
          <Input :model-value="connectTarget?.name" disabled />
        </div>
        <div class="form-field form-field--full">
          <label>API キー / API 密钥 <span class="text-destructive text-xs">*</span></label>
          <Input v-model="connectForm.apiKey" type="text" placeholder="API Key" />
        </div>
        <div class="form-field form-field--full">
          <label>API シークレット / API 密钥 <span class="text-destructive text-xs">*</span></label>
          <Input v-model="connectForm.apiSecret" type="password" placeholder="API Secret" />
        </div>
        <div class="form-field form-field--full">
          <label>ショップ URL / 店铺 URL</label>
          <Input v-model="connectForm.shopUrl" type="url" placeholder="https://your-shop.example.com" />
        </div>
      </div>
    </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import PageHeader from '@/components/shared/PageHeader.vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  getMarketplaceProviders,
  syncMarketplace,
  connectMarketplace,
  disconnectMarketplace,
  type MarketplaceProvider,
} from '@/api/marketplace'
import { onMounted, ref } from 'vue'
import { Badge } from '@/components/ui/badge'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
const { confirm } = useConfirmDialog()
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
  if (!(await confirm('この操作を実行しますか？'))) return
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

</style>
