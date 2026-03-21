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
        <div class="browser-info-content">
          <svg width="32" height="32" viewBox="0 0 16 16" fill="currentColor" style="opacity:0.3">
            <path d="M2.5 8a5.5 5.5 0 0 1 8.25-4.764.5.5 0 0 0 .5-.866A6.5 6.5 0 1 0 14.5 8a.5.5 0 0 0-1 0 5.5 5.5 0 1 1-11 0z"/>
            <path d="M15.354 3.354a.5.5 0 0 0-.708-.708L8 9.293 5.354 6.646a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0l7-7z"/>
          </svg>
          <p><strong>ブラウザ印刷モード</strong></p>
          <p class="browser-info-desc">ブラウザの標準印刷機能を使用します。印刷時にブラウザのダイアログが表示されます。</p>
          <p class="browser-info-hint">追加設定は不要です。プリンターはブラウザ側で選択してください。</p>
        </div>
      </div>
    </template>

    <!-- 共通印刷パラメータ / 共通印刷参数 -->
    <div class="o-card params-card">
      <div class="params-title">印刷パラメータ</div>
      <div class="params-grid">
        <div class="params-group">
          <label class="params-label">左余白 (mm)</label>
          <input class="o-input" type="number" v-model.number="printParams.marginLeftMm" min="0" max="50" step="0.5" style="width:100px" />
        </div>
        <div class="params-group">
          <label class="params-label">上余白 (mm)</label>
          <input class="o-input" type="number" v-model.number="printParams.marginTopMm" min="0" max="50" step="0.5" style="width:100px" />
        </div>
        <div class="params-group">
          <label class="params-label">印刷比率</label>
          <div class="scale-buttons">
            <button
              v-for="pct in SCALE_PRESETS"
              :key="pct"
              class="scale-btn"
              :class="{ active: printParams.scalePercent === pct }"
              @click="setScale(pct)"
            >{{ pct }}%</button>
          </div>
        </div>
        <div class="params-group">
          <label class="params-label">カスタム比率 (%)</label>
          <input class="o-input" type="number" v-model.number="printParams.scalePercent" min="10" max="400" step="1" style="width:100px" />
        </div>
        <div class="params-group">
          <label class="params-label">印刷部数</label>
          <input class="o-input" type="number" v-model.number="printParams.copies" min="1" max="50" style="width:80px" />
        </div>
      </div>
      <div class="params-actions">
        <OButton variant="primary" size="sm" @click="saveParams">設定を保存</OButton>
        <span v-if="paramsSaved" class="params-saved">保存しました</span>
      </div>
    </div>

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
import { ElMessageBox } from 'element-plus'
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

// 共通印刷パラメータ / 共通印刷参数
const SCALE_PRESETS = [25, 50, 73, 100, 150] as const

const printParams = reactive({
  marginLeftMm: 0,
  marginTopMm: 0,
  scalePercent: 100,
  copies: 1,
})
const paramsSaved = ref(false)

// localStorage から読み込み / localStorage から読み込み
function loadParams() {
  try {
    const raw = localStorage.getItem('printParams')
    if (raw) {
      const parsed = JSON.parse(raw)
      printParams.marginLeftMm = parsed.marginLeftMm ?? 0
      printParams.marginTopMm = parsed.marginTopMm ?? 0
      printParams.scalePercent = parsed.scalePercent ?? 100
      printParams.copies = parsed.copies ?? 1
    }
  } catch { /* ignore */ }
}

function saveParams() {
  localStorage.setItem('printParams', JSON.stringify({
    marginLeftMm: printParams.marginLeftMm,
    marginTopMm: printParams.marginTopMm,
    scalePercent: printParams.scalePercent,
    copies: printParams.copies,
  }))
  paramsSaved.value = true
  setTimeout(() => { paramsSaved.value = false }, 2000)
  showToast('印刷パラメータを保存しました', 'success')
}

function setScale(pct: number) {
  printParams.scalePercent = pct
}

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
      'すべてのプリンター設定をリセットしますか？テンプレートごとの設定もすべて削除されます。 / 确定要重置所有打印机设置吗？每个模板的设置也将全部删除。',
      '確認 / 确认',
      { confirmButtonText: 'リセット / 重置', cancelButtonText: 'キャンセル / 取消', type: 'warning' },
    )
  } catch { return }
  resetPrintConfig()
  const fresh = getPrintConfig()
  Object.assign(config, fresh)
  refreshCachedData()
  showToast(t('wms.settings.settingsReset', '設定をリセットしました'), 'success')
}

onMounted(() => {
  refreshCachedData()
  loadParams()
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
  accent-color: var(--o-brand-primary, #0052A3);
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
  color: var(--o-brand-primary, #0052A3);
  border-bottom-color: var(--o-brand-primary, #0052A3);
  font-weight: 500;
}

.tab-content {
  padding: 20px;
}

/* 印刷パラメータ / 印刷参数 */
.params-card { padding: 16px 20px; }
.params-title { font-size: 14px; font-weight: 600; color: var(--o-gray-800); margin-bottom: 14px; }
.params-grid { display: flex; flex-wrap: wrap; gap: 16px 24px; }
.params-group { display: flex; flex-direction: column; gap: 4px; }
.params-label { font-size: 12px; font-weight: 500; color: var(--o-gray-600); }
.scale-buttons { display: flex; gap: 4px; }
.scale-btn {
  padding: 4px 12px;
  font-size: 13px;
  border: 1px solid var(--o-border-color, #e4e7ed);
  background: var(--o-view-background, #fff);
  color: var(--o-gray-600);
  cursor: pointer;
  transition: all 0.15s;
}
.scale-btn:hover { border-color: var(--o-brand-primary, #0052A3); color: var(--o-brand-primary); }
.scale-btn.active { background: var(--o-brand-primary, #0052A3); color: #fff; border-color: var(--o-brand-primary); }
.params-actions { display: flex; align-items: center; gap: 10px; margin-top: 16px; }
.params-saved { font-size: 12px; color: var(--o-success, #3D8B37); }

.browser-info-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 24px 20px;
  text-align: center;
}
.browser-info-content p { margin: 0; }
.browser-info-desc { font-size: 13px; color: var(--o-gray-600); }
.browser-info-hint { font-size: 12px; color: var(--o-gray-400); }
</style>
