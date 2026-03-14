<template>
  <div class="printer-settings">
    <ControlPanel :title="t('wms.settings.printerSettings', 'プリンター設定')" :show-search="false">
      <template #actions>
        <OButton variant="secondary" size="sm" @click="handleReset">{{ t('wms.settings.reset', 'リセット') }}</OButton>
      </template>
    </ControlPanel>

    <!-- Print Method Selection -->
    <div class="o-card method-card">
      <div class="o-form-group" style="margin-bottom:0">
        <label class="form-label">{{ t('wms.settings.printMethod', '印刷方法') }}</label>
        <div class="radio-group">
          <label class="radio-option">
            <input
              type="radio"
              name="printMethod"
              value="browser"
              :checked="config.method === 'browser'"
              @change="handleMethodChange('browser')"
            />
            <span>{{ t('wms.settings.browserPrint', 'ブラウザ印刷') }}</span>
          </label>
          <label class="radio-option">
            <input
              type="radio"
              name="printMethod"
              value="local-bridge"
              :checked="config.method === 'local-bridge'"
              @change="handleMethodChange('local-bridge')"
            />
            <span>{{ t('wms.settings.localPrint', 'ローカル印刷') }}</span>
          </label>
        </div>
      </div>
    </div>

    <!-- Browser Mode: Simple Info -->
    <template v-if="config.method === 'browser'">
      <div class="o-card browser-info">
        <p style="text-align:center;color:#909399;padding:20px 0">
          {{ t('wms.settings.browserPrintDescription', 'ブラウザの標準印刷機能を使用します。印刷時にブラウザのダイアログが表示されます。') }}
        </p>
      </div>
    </template>

    <!-- Local Bridge Mode: 4 Tabs -->
    <template v-if="config.method === 'local-bridge'">
      <div class="o-card tabs-card">
        <div class="o-tabs">
          <button
            class="o-tab"
            :class="{ active: activeTab === 'connection' }"
            @click="activeTab = 'connection'"
          >{{ t('wms.settings.connection', '接続') }}</button>
          <button
            class="o-tab"
            :class="{ active: activeTab === 'printers' }"
            @click="activeTab = 'printers'"
          >{{ t('wms.settings.printerList', 'プリンター一覧') }}</button>
          <button
            class="o-tab"
            :class="{ active: activeTab === 'print-templates' }"
            @click="activeTab = 'print-templates'"
          >{{ t('wms.settings.printTemplates', '印刷テンプレート') }}</button>
          <button
            class="o-tab"
            :class="{ active: activeTab === 'form-templates' }"
            @click="activeTab = 'form-templates'"
          >{{ t('wms.settings.formTemplates', '帳票テンプレート') }}</button>
        </div>

        <div class="tab-content">
          <ConnectionTab v-if="activeTab === 'connection'" @printers-updated="refreshCachedData" />
          <PrinterListTab
            v-if="activeTab === 'printers'"
            :printers="cachedPrinters"
            :default-printer-os="defaultPrinterOs"
            :last-cache-update="lastCacheUpdate"
          />
          <PrintTemplatePrinterTab v-if="activeTab === 'print-templates'" :printers="cachedPrinters" />
          <FormTemplatePrinterTab v-if="activeTab === 'form-templates'" :printers="cachedPrinters" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
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

const { show: showToast } = useToast()
const { t } = useI18n()

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
  if (!confirm(t('wms.settings.confirmResetPrinter', 'すべてのプリンター設定をリセットしますか？テンプレートごとの設定もすべて削除されます。'))) return
  resetPrintConfig()
  const fresh = getPrintConfig()
  Object.assign(config, fresh)
  refreshCachedData()
  showToast(t('wms.settings.settingsReset', '設定をリセットしました'), 'success')
}

onMounted(() => {
  refreshCachedData()
})
</script>

<style scoped>
.printer-settings {
  padding: 0 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}





.o-card {
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: var(--o-border-radius, 8px);
  padding: 1.25rem;
}


.o-form-group { margin-bottom: 1rem; }
.form-label { display: block; font-size: var(--o-font-size-small, 13px); font-weight: 500; color: var(--o-gray-700, #303133); margin-bottom: 0.5rem; }

.radio-group {
  display: flex;
  flex-direction: row;
  gap: 24px;
}

.radio-option {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 14px;
  color: var(--o-gray-700, #303133);
}

.radio-option input[type="radio"] {
  accent-color: var(--o-brand-primary, #714b67);
}

.method-card {
  padding: 16px 20px;
}

.tabs-card {
  padding: 0;
}

.o-tabs {
  display: flex;
  border-bottom: 2px solid var(--o-border-color, #e4e7ed);
}

.o-tab {
  padding: 0.75rem 1.25rem;
  border: none;
  background: none;
  font-size: var(--o-font-size-base, 14px);
  color: var(--o-gray-600, #606266);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
}

.o-tab.active {
  color: var(--o-brand-primary, #714b67);
  border-bottom-color: var(--o-brand-primary, #714b67);
  font-weight: 500;
}

.tab-content {
  padding: 20px;
}
</style>
