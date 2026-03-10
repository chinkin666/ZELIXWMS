<template>
  <div class="printer-settings">
    <div class="page-header">
      <div>
        <h1 class="page-title">プリンター設定</h1>
        <p class="page-subtitle">印刷方法とプリンター設定を管理します</p>
      </div>
      <div class="header-actions">
        <el-button @click="handleReset" size="small">リセット</el-button>
      </div>
    </div>

    <!-- Print Method Selection -->
    <el-card shadow="never" class="method-card">
      <el-form-item label="印刷方法" :label-width="'100px'" style="margin-bottom: 0">
        <el-radio-group v-model="config.method" @change="handleMethodChange">
          <el-radio value="browser">ブラウザ印刷</el-radio>
          <el-radio value="local-bridge">ローカル印刷</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-card>

    <!-- Browser Mode: Simple Info -->
    <template v-if="config.method === 'browser'">
      <el-card shadow="never">
        <el-empty description="ブラウザの標準印刷機能を使用します。印刷時にブラウザのダイアログが表示されます。" :image-size="80" />
      </el-card>
    </template>

    <!-- Local Bridge Mode: 4 Tabs -->
    <template v-if="config.method === 'local-bridge'">
      <el-card shadow="never" class="tabs-card">
        <el-tabs v-model="activeTab" type="border-card">
          <el-tab-pane label="接続" name="connection">
            <ConnectionTab @printers-updated="refreshCachedData" />
          </el-tab-pane>

          <el-tab-pane label="プリンター一覧" name="printers">
            <PrinterListTab
              :printers="cachedPrinters"
              :default-printer-os="defaultPrinterOs"
              :last-cache-update="lastCacheUpdate"
            />
          </el-tab-pane>

          <el-tab-pane label="印刷テンプレート" name="print-templates">
            <PrintTemplatePrinterTab :printers="cachedPrinters" />
          </el-tab-pane>

          <el-tab-pane label="帳票テンプレート" name="form-templates">
            <FormTemplatePrinterTab :printers="cachedPrinters" />
          </el-tab-pane>
        </el-tabs>
      </el-card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getPrintConfig,
  savePrintConfig,
  resetPrintConfig,
  type PrintConfig,
  type PrinterInfo,
} from '@/utils/print/printConfig'
import ConnectionTab from './printer/ConnectionTab.vue'
import PrinterListTab from './printer/PrinterListTab.vue'
import PrintTemplatePrinterTab from './printer/PrintTemplatePrinterTab.vue'
import FormTemplatePrinterTab from './printer/FormTemplatePrinterTab.vue'

const config = reactive<PrintConfig>(getPrintConfig())
const activeTab = ref('connection')

const cachedPrinters = ref<PrinterInfo[]>([])
const defaultPrinterOs = ref<string | null>(null)
const lastCacheUpdate = ref<string | null>(null)

function refreshCachedData() {
  const freshConfig = getPrintConfig()
  cachedPrinters.value = freshConfig.localBridge.printersCache
  defaultPrinterOs.value = freshConfig.localBridge.defaultPrinterOs
  lastCacheUpdate.value = freshConfig.localBridge.lastCacheUpdate
}

function handleMethodChange(method: string) {
  config.method = method as PrintConfig['method']
  savePrintConfig(config)
}

async function handleReset() {
  try {
    await ElMessageBox.confirm(
      'すべてのプリンター設定をリセットしますか？テンプレートごとの設定もすべて削除されます。',
      '確認',
      {
        confirmButtonText: 'はい',
        cancelButtonText: 'いいえ',
        type: 'warning',
      },
    )
    resetPrintConfig()
    const fresh = getPrintConfig()
    Object.assign(config, fresh)
    refreshCachedData()
    ElMessage.success('設定をリセットしました')
  } catch {
    // cancelled
  }
}

onMounted(() => {
  refreshCachedData()
})
</script>

<style scoped>
.printer-settings {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.page-subtitle {
  margin: 6px 0 0;
  color: #666;
  font-size: 14px;
}

.method-card :deep(.el-card__body) {
  padding: 16px 20px;
}

.tabs-card :deep(.el-card__body) {
  padding: 0;
}

.tabs-card :deep(.el-tabs--border-card) {
  border: none;
  box-shadow: none;
}

.tabs-card :deep(.el-tabs__content) {
  padding: 20px;
}
</style>
