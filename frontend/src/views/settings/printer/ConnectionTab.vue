<template>
  <div class="connection-tab">
    <!-- Service URL -->
    <div class="form-group">
      <label>{{ t('wms.printer.serviceUrl', 'サービスURL') }}</label>
      <Input v-model="serviceUrl" placeholder="http://127.0.0.1:8765" style="width: 360px" @change="handleUrlChange" />
    </div>

    <!-- Connection Actions -->
    <div class="flex justify-end gap-2 pt-4">
      <Button variant="default" :disabled="connecting" @click="handleConnect">
        {{ connecting ? t('wms.printer.connecting', '接続中...') : t('wms.printer.connectionTest', '接続テスト') }}
      </Button>
      <Button variant="secondary" :disabled="!isConnected || refreshing" @click="handleRefreshPrinters">
        {{ refreshing ? t('wms.printer.refreshing', '更新中...') : t('wms.printer.refreshPrinters', 'プリンター情報を更新') }}
      </Button>
    </div>

    <!-- Status Card -->
    <div class="rounded-lg border bg-card p-4 status-card">
      <div class="font-semibold mb-2">
        <span>{{ t('wms.printer.connectionStatus', '接続ステータス') }}</span>
        <span class="o-badge" :class="isConnected ? 'o-badge-success' : 'o-badge-info'">
          {{ isConnected ? t('wms.printer.connected', '接続済み') : t('wms.printer.disconnected', '未接続') }}
        </span>
      </div>
      <div class="">
        <template v-if="isConnected && healthInfo">
          <div class="kv-list">
            <div class="kv-row">
              <span class="kv-label">{{ t('wms.printer.status', 'ステータス') }}</span>
              <span class="kv-value">
                <span class="o-badge o-badge-success">{{ healthInfo.status }}</span>
              </span>
            </div>
            <div class="kv-row">
              <span class="kv-label">{{ t('wms.printer.host', 'ホスト') }}</span>
              <span class="kv-value">{{ healthInfo.host }}</span>
            </div>
            <div class="kv-row">
              <span class="kv-label">{{ t('wms.printer.port', 'ポート') }}</span>
              <span class="kv-value">{{ healthInfo.port }}</span>
            </div>
            <div class="kv-row">
              <span class="kv-label">{{ t('wms.printer.configFile', '設定ファイル') }}</span>
              <span class="kv-value"><span class="monospace">{{ healthInfo.config_path }}</span></span>
            </div>
            <div class="kv-row">
              <span class="kv-label">{{ t('wms.printer.cachedPrinters', 'キャッシュ済みプリンター') }}</span>
              <span class="kv-value">{{ cachedPrinterCount }} {{ t('wms.printer.unitPrinters', '台') }}</span>
            </div>
            <div class="kv-row">
              <span class="kv-label">{{ t('wms.printer.lastUpdated', '最終更新') }}</span>
              <span class="kv-value">{{ lastCacheUpdateDisplay }}</span>
            </div>
          </div>
        </template>

        <template v-else-if="connectionError">
          <div class="o-alert o-alert-error">
            <strong>{{ t('wms.printer.connectionFailed', '接続に失敗しました') }}</strong>
            <p>{{ connectionError }}</p>
          </div>
        </template>

        <template v-else>
          <div class="o-empty-state">
            <p>{{ t('wms.printer.pleaseConnect', 'サービスに接続してください') }}</p>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import { healthCheck, getPrinters } from '@/utils/print/printBridgeApi'
import { Input } from '@/components/ui/input'
import {
  getPrintConfig,
  savePrintConfig,
  updatePrintersCache,
} from '@/utils/print/printConfig'

const { t } = useI18n()
const toast = useToast()

const emit = defineEmits<{
  (e: 'printers-updated'): void
}>()

const serviceUrl = ref('http://127.0.0.1:8765')
const connecting = ref(false)
const refreshing = ref(false)
const isConnected = ref(false)
const healthInfo = ref<{ status: string; config_path: string; host: string; port: number } | null>(null)
const connectionError = ref('')

const cachedPrinterCount = computed(() => {
  return getPrintConfig().localBridge.printersCache.length
})

const lastCacheUpdateDisplay = computed(() => {
  const ts = getPrintConfig().localBridge.lastCacheUpdate
  if (!ts) return t('wms.printer.notYetFetched', '未取得')
  try {
    return new Date(ts).toLocaleString('ja-JP')
  } catch {
    return ts
  }
})

function handleUrlChange() {
  const config = getPrintConfig()
  config.localBridge.serviceUrl = serviceUrl.value
  savePrintConfig(config)
}

async function handleConnect() {
  if (!serviceUrl.value.trim()) {
    toast.show(t('wms.printer.enterServiceUrl', 'サービスURLを入力してください'), 'warning')
    return
  }

  connecting.value = true
  connectionError.value = ''
  isConnected.value = false
  healthInfo.value = null

  try {
    const data = await healthCheck(serviceUrl.value)
    healthInfo.value = data
    isConnected.value = true

    // Save URL and auto-refresh printers
    handleUrlChange()
    await refreshPrinters()

    toast.show(t('wms.printer.connectionSuccess', '接続成功'), 'success')
  } catch (error: any) {
    connectionError.value = error.message || t('wms.printer.serviceNotRunning', 'サービスが起動していない可能性があります')
    toast.show(`${t('wms.printer.connectionFailed', '接続に失敗しました')}: ${connectionError.value}`, 'danger')
  } finally {
    connecting.value = false
  }
}

async function refreshPrinters() {
  refreshing.value = true
  try {
    const data = await getPrinters(serviceUrl.value)
    updatePrintersCache(data.printers, data.default_printer_os)
    emit('printers-updated')
  } catch (error: any) {
    toast.show(`${t('wms.printer.fetchPrintersFailed', 'プリンター情報の取得に失敗しました')}: ${error.message}`, 'danger')
  } finally {
    refreshing.value = false
  }
}

async function handleRefreshPrinters() {
  await refreshPrinters()
  toast.show(t('wms.printer.printersUpdated', 'プリンター情報を更新しました'), 'success')
}

onMounted(() => {
  const config = getPrintConfig()
  serviceUrl.value = config.localBridge.serviceUrl

  // If we have cached printers, show as connected
  if (config.localBridge.printersCache.length > 0) {
    isConnected.value = true
    // Try a quick health check in background
    healthCheck(serviceUrl.value)
      .then((data) => {
        healthInfo.value = data
      })
      .catch(() => {
        // Keep showing cached data but mark as potentially stale
      })
  }
})
</script>

<style scoped>
.connection-tab {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Form layout */
.form-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.form-label {
  min-width: 180px;
  font-size: 14px;
  color: #374151;
  font-weight: 500;
}

.form-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 192px;
}

/* Card */
.o-card {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
  max-width: 600px;
}

.o-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  font-weight: 600;
  font-size: 14px;
  color: #111827;
}

.o-card__body {
  padding: 16px;
}

/* Key-value list */
.kv-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.kv-row {
  display: grid;
  grid-template-columns: 180px 1fr;
  border-bottom: 1px solid #e5e7eb;
  font-size: 13px;
}

.kv-row:last-child {
  border-bottom: none;
}

.kv-label {
  background: #f9fafb;
  padding: 8px 12px;
  color: #6b7280;
  font-weight: 500;
  border-right: 1px solid #e5e7eb;
}

.kv-value {
  padding: 8px 12px;
  color: #111827;
  display: flex;
  align-items: center;
}

/* Alert */
.o-alert {
  border-radius: 4px;
  padding: 12px 16px;
  font-size: 14px;
}

.o-alert-error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
}

.o-alert-error strong {
  display: block;
  margin-bottom: 4px;
}

.o-alert-error p {
  margin: 0;
  font-size: 13px;
}

/* Empty state */
.o-empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 32px 16px;
  color: #9ca3af;
  font-size: 14px;
}

.o-empty-state p {
  margin: 0;
}

/* Monospace */
.monospace {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  word-break: break-all;
}
</style>
