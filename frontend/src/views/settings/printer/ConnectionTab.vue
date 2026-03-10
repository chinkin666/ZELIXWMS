<template>
  <div class="connection-tab">
    <!-- Service URL -->
    <el-form label-width="180px" label-position="left">
      <el-form-item label="サービスURL">
        <el-input
          v-model="serviceUrl"
          placeholder="http://127.0.0.1:8765"
          style="width: 360px"
          @change="handleUrlChange"
        />
      </el-form-item>

      <!-- Connection Actions -->
      <el-form-item>
        <el-button
          type="primary"
          :icon="Connection"
          :loading="connecting"
          @click="handleConnect"
        >
          接続テスト
        </el-button>
        <el-button
          :icon="Refresh"
          :loading="refreshing"
          :disabled="!isConnected"
          @click="handleRefreshPrinters"
        >
          プリンター情報を更新
        </el-button>
      </el-form-item>
    </el-form>

    <!-- Status Card -->
    <el-card class="status-card" shadow="never">
      <template #header>
        <div class="status-header">
          <span>接続ステータス</span>
          <el-tag :type="isConnected ? 'success' : 'info'" size="small">
            {{ isConnected ? '接続済み' : '未接続' }}
          </el-tag>
        </div>
      </template>

      <template v-if="isConnected && healthInfo">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="ステータス">
            <el-tag type="success" size="small">{{ healthInfo.status }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="ホスト">{{ healthInfo.host }}</el-descriptions-item>
          <el-descriptions-item label="ポート">{{ healthInfo.port }}</el-descriptions-item>
          <el-descriptions-item label="設定ファイル">
            <span class="monospace">{{ healthInfo.config_path }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="キャッシュ済みプリンター">
            {{ cachedPrinterCount }} 台
          </el-descriptions-item>
          <el-descriptions-item label="最終更新">
            {{ lastCacheUpdateDisplay }}
          </el-descriptions-item>
        </el-descriptions>
      </template>

      <template v-else-if="connectionError">
        <el-alert type="error" :closable="false" show-icon>
          <template #title>接続に失敗しました</template>
          {{ connectionError }}
        </el-alert>
      </template>

      <template v-else>
        <el-empty description="サービスに接続してください" :image-size="60" />
      </template>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Connection, Refresh } from '@element-plus/icons-vue'
import { healthCheck, getPrinters } from '@/utils/print/printBridgeApi'
import {
  getPrintConfig,
  savePrintConfig,
  updatePrintersCache,
} from '@/utils/print/printConfig'

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
  if (!ts) return '未取得'
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
    ElMessage.warning('サービスURLを入力してください')
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

    ElMessage.success('接続成功')
  } catch (error: any) {
    connectionError.value = error.message || 'サービスが起動していない可能性があります'
    ElMessage.error(`接続に失敗しました: ${connectionError.value}`)
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
    ElMessage.error(`プリンター情報の取得に失敗しました: ${error.message}`)
  } finally {
    refreshing.value = false
  }
}

async function handleRefreshPrinters() {
  await refreshPrinters()
  ElMessage.success('プリンター情報を更新しました')
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

.status-card {
  max-width: 600px;
}

.status-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.monospace {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  word-break: break-all;
}
</style>
