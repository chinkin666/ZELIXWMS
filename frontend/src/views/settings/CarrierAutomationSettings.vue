<template>
  <div class="carrier-automation-settings">
    <ControlPanel :title="'配送業者自動化設定'" :show-search="false" />

    <!-- 动态 tab（根据已安装配送業者生成）/ 動的タブ（インストール済み配送業者から生成） -->
    <div class="o-card automation-tabs-card">
      <div class="o-tabs">
        <button
          v-for="carrier in availableCarriers"
          :key="carrier.type"
          class="o-tab"
          :class="{ active: activeTab === carrier.type }"
          @click="switchTab(carrier.type)"
        >
          {{ carrier.name }}
          <span v-if="carrier.connected" class="tab-status tab-status--ok" title="接続済み" />
          <span v-else-if="carrier.configured" class="tab-status tab-status--warn" title="未接続" />
        </button>
      </div>

      <!-- ヤマト B2 Cloud -->
      <div class="tab-content" v-if="activeTab === 'yamato-b2'">
        <div v-if="loading" class="loading-state">読み込み中...</div>
        <template v-else>
          <div class="config-form">
            <!-- 接続ステータス / 接続状態 -->
            <div class="connection-status" :class="connectionStatusClass">
              <span class="connection-status__icon">{{ connectionStatusIcon }}</span>
              <div class="connection-status__text">
                <strong>{{ connectionStatusLabel }}</strong>
                <span v-if="lastTestedAt" class="connection-status__time">最終テスト: {{ lastTestedAt }}</span>
              </div>
            </div>

            <div class="o-form-group">
              <label class="form-label">有効</label>
              <div style="display:flex;align-items:center;gap:12px">
                <label class="o-toggle">
                  <input type="checkbox" v-model="yamatoB2Form.enabled" />
                  <span class="o-toggle-slider"></span>
                </label>
                <span class="form-hint">ONにすると、配送業者データ出力・取込で自動化機能が使えます</span>
              </div>
            </div>

            <hr class="o-divider" />
            <h4 class="section-label">API接続設定</h4>

            <div class="form-grid">
              <div class="o-form-group">
                <label class="form-label">APIエンドポイント <span class="required-badge">必須</span></label>
                <input class="o-input" v-model="yamatoB2Form.apiEndpoint" placeholder="https://yamato-b2-webapi.nexand.org" />
              </div>
              <div class="o-form-group">
                <label class="form-label">API Key <span class="required-badge">必須</span></label>
                <div class="password-wrap">
                  <input class="o-input" v-model="yamatoB2Form.apiKey" :type="showApiKey ? 'text' : 'password'" placeholder="公開API用のアクセスキー" />
                  <button class="password-toggle" type="button" @click="showApiKey = !showApiKey" :title="showApiKey ? '隠す' : '表示'">
                    {{ showApiKey ? '🙈' : '👁' }}
                  </button>
                </div>
              </div>
              <div class="o-form-group">
                <label class="form-label">お客様コード <span class="required-badge">必須</span></label>
                <input class="o-input" v-model="yamatoB2Form.customerCode" placeholder="ヤマトビジネスメンバーズID" />
              </div>
              <div class="o-form-group">
                <label class="form-label">パスワード <span class="required-badge">必須</span></label>
                <div class="password-wrap">
                  <input class="o-input" v-model="yamatoB2Form.customerPassword" :type="showPassword ? 'text' : 'password'" placeholder="パスワード" />
                  <button class="password-toggle" type="button" @click="showPassword = !showPassword">
                    {{ showPassword ? '🙈' : '👁' }}
                  </button>
                </div>
              </div>
            </div>

            <hr class="o-divider" />
            <h4 class="section-label">請求先</h4>
            <div class="form-grid">
              <div class="o-form-group">
                <label class="form-label">請求先顧客コード</label>
                <input class="o-input" v-model="yamatoB2Form.invoiceCode" placeholder="10〜12桁" maxlength="12" />
                <div class="field-hint">B2 Cloudで設定された請求先の顧客コード</div>
              </div>
              <div class="o-form-group">
                <label class="form-label">運賃管理番号</label>
                <input class="o-input" v-model="yamatoB2Form.invoiceFreightNo" placeholder="2桁" maxlength="2" style="width:100px" />
              </div>
            </div>

            <hr class="o-divider" />
            <h4 class="section-label">自動検証設定</h4>
            <p class="field-hint" style="margin-bottom:12px">出荷確認時にB2 Cloudへの自動検証を定期的にリトライする設定です</p>

            <div class="o-form-group">
              <label class="form-label">自動検証</label>
              <div style="display:flex;align-items:center;gap:12px">
                <label class="o-toggle">
                  <input type="checkbox" v-model="autoValidationForm.enabled" />
                  <span class="o-toggle-slider"></span>
                </label>
                <span class="form-hint">ONにすると、検証失敗時に自動でリトライします</span>
              </div>
            </div>
            <div class="form-grid" v-if="autoValidationForm.enabled">
              <div class="o-form-group">
                <label class="form-label">検証間隔</label>
                <select class="o-input" v-model.number="autoValidationForm.intervalMinutes" style="width:160px">
                  <option :value="1">1分</option>
                  <option :value="5">5分</option>
                  <option :value="10">10分</option>
                  <option :value="30">30分</option>
                  <option :value="60">60分</option>
                </select>
              </div>
              <div class="o-form-group">
                <label class="form-label">最大リトライ回数</label>
                <input class="o-input" type="number" v-model.number="autoValidationForm.maxRetries" min="1" max="20" style="width:100px" />
              </div>
            </div>
          </div>

            <hr class="o-divider" />
            <h4 class="section-label">送り状種類マッピング</h4>
            <p class="field-hint" style="margin-bottom:12px">各送り状種類のB2送り状種類と印刷テンプレートを設定します</p>

            <div class="service-mapping-wrapper">
              <table class="o-list-table service-mapping-table">
                <thead>
                  <tr>
                    <th style="width:180px">送り状種類</th>
                    <th style="width:180px">B2送り状種類</th>
                    <th style="width:160px">PDF取得元</th>
                    <th style="min-width:180px">印刷テンプレート</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in serviceTypeMappingList" :key="row.invoiceType">
                    <td>{{ row.label }}</td>
                    <td>
                      <select class="o-input" :value="row.b2ServiceType" @change="updateMappingRow(row.invoiceType, 'b2ServiceType', ($event.target as HTMLSelectElement).value)">
                        <option v-for="opt in b2ServiceTypeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                      </select>
                    </td>
                    <td>
                      <select class="o-input" :value="row.pdfSource" @change="updateMappingRow(row.invoiceType, 'pdfSource', ($event.target as HTMLSelectElement).value)">
                        <option v-for="opt in pdfSourceOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                      </select>
                    </td>
                    <td>
                      <select class="o-input" :value="row.printTemplateId || ''" @change="updateMappingRow(row.invoiceType, 'printTemplateId', ($event.target as HTMLSelectElement).value || undefined)" :disabled="row.pdfSource === 'b2-webapi'">
                        <option value="">テンプレートを選択</option>
                        <option v-for="tpl in printTemplates" :key="tpl.id" :value="tpl.id">{{ tpl.name }}</option>
                      </select>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

          <div class="form-actions">
            <OButton variant="secondary" @click="testConnection" :disabled="testing || !canTest">
              {{ testing ? 'テスト中...' : '接続テスト' }}
            </OButton>
            <OButton variant="primary" @click="saveConfig" :disabled="saving">
              {{ saving ? '保存中...' : '保存' }}
            </OButton>
          </div>

          <div v-if="testResult" class="test-result" :class="testResult.success ? 'test-success' : 'test-error'">
            <strong>{{ testResult.success ? '接続成功' : '接続失敗' }}</strong>
            <p>{{ testResult.message }}</p>
            <button class="dismiss-btn" @click="testResult = null">&times;</button>
          </div>
        </template>
      </div>

      <!-- 佐川急便 e飛伝Ⅲ -->
      <div class="tab-content" v-if="activeTab === 'sagawa'">
        <div class="plugin-status-card">
          <div class="plugin-status-header">
            <h4>佐川急便 e飛伝Ⅲ プラグイン</h4>
            <span class="o-badge" :class="sagawaPluginRunning ? 'o-badge-success' : 'o-badge-secondary'">
              {{ sagawaPluginRunning ? '稼働中' : '未稼働' }}
            </span>
          </div>
          <p class="field-hint">佐川急便の連携は<strong>プラグイン方式</strong>で動作しています。CSV出力・追跡番号取込は佐川急便設定ページで行えます。</p>
          <div class="plugin-actions">
            <OButton variant="secondary" @click="$router.push('/settings/sagawa')">佐川急便設定を開く</OButton>
            <OButton variant="secondary" @click="$router.push('/settings/plugins')">プラグイン管理</OButton>
          </div>
        </div>
      </div>

      <!-- 日本郵便（将来） -->
      <div class="tab-content" v-if="activeTab === 'japanpost'">
        <div class="coming-soon">
          <svg width="48" height="48" viewBox="0 0 16 16" fill="currentColor" style="opacity:0.2"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/></svg>
          <h4>日本郵便 ゆうパック</h4>
          <p>開発予定 — プラグインとして実装される予定です</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useToast } from '@/composables/useToast'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import type { YamatoB2Config, ConnectionTestResult, ServiceTypeConfig, PdfSource, AutoValidationConfig } from '@/types/carrierAutomation'
import {
  fetchCarrierAutomationConfig,
  saveCarrierAutomationConfig,
  testCarrierAutomationConnection,
} from '@/api/carrierAutomation'
import { fetchPrintTemplates, type PrintTemplateApiModel } from '@/api/printTemplates'

const { show: showToast } = useToast()

// 动态 tab / 動的タブ
interface CarrierTab {
  type: string
  name: string
  configured: boolean
  connected: boolean
}

const activeTab = ref('yamato-b2')
const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const testResult = ref<ConnectionTestResult | null>(null)
const printTemplates = ref<PrintTemplateApiModel[]>([])
const showApiKey = ref(false)
const showPassword = ref(false)
const lastTestedAt = ref('')
const sagawaPluginRunning = ref(false)

// 可用配送業者（根据系统配置动态生成）/ 利用可能な配送業者
const availableCarriers = ref<CarrierTab[]>([
  { type: 'yamato-b2', name: 'ヤマト B2 Cloud', configured: false, connected: false },
  { type: 'sagawa', name: '佐川急便 e飛伝Ⅲ', configured: false, connected: false },
  { type: 'japanpost', name: '日本郵便', configured: false, connected: false },
])

function switchTab(type: string) {
  activeTab.value = type
  if (type === 'sagawa') checkSagawaPlugin()
}

async function checkSagawaPlugin() {
  try {
    const res = await fetch(`${import.meta.env.VITE_BACKEND_ORIGIN || 'http://localhost:4000'}/api/plugins/sagawa-express/status`)
    sagawaPluginRunning.value = res.ok
    if (res.ok) {
      const carrier = availableCarriers.value.find(c => c.type === 'sagawa')
      if (carrier) { carrier.configured = true; carrier.connected = true }
    }
  } catch { sagawaPluginRunning.value = false }
}

// 接続ステータス / 接続状態
const connectionStatusClass = computed(() => {
  if (!yamatoB2Form.value.enabled) return 'connection-status--disabled'
  if (testResult.value?.success) return 'connection-status--ok'
  if (testResult.value && !testResult.value.success) return 'connection-status--error'
  if (yamatoB2Form.value.apiKey) return 'connection-status--configured'
  return 'connection-status--disabled'
})

const connectionStatusIcon = computed(() => {
  if (!yamatoB2Form.value.enabled) return '○'
  if (testResult.value?.success) return '●'
  if (testResult.value && !testResult.value.success) return '✕'
  if (yamatoB2Form.value.apiKey) return '◎'
  return '○'
})

const connectionStatusLabel = computed(() => {
  if (!yamatoB2Form.value.enabled) return '無効'
  if (testResult.value?.success) return '接続済み'
  if (testResult.value && !testResult.value.success) return '接続失敗'
  if (yamatoB2Form.value.apiKey) return '設定済み（未テスト）'
  return '未設定'
})

// 送り状種類オプション
const invoiceTypeOptions = [
  { label: '0: 発払い', value: '0' },
  { label: '1: EAZY', value: '1' },
  { label: '2: コレクト', value: '2' },
  { label: '3: DM便', value: '3' },
  { label: '4: タイム', value: '4' },
  { label: '5: 着払い', value: '5' },
  { label: '6: 発払い複数口', value: '6' },
  { label: '7: ゆうパケット', value: '7' },
  { label: '8: コンパクト', value: '8' },
  { label: '9: コンパクトコレクト', value: '9' },
  { label: 'A: ネコポス', value: 'A' },
]

const b2ServiceTypeOptions = [...invoiceTypeOptions]

const pdfSourceOptions: { label: string; value: PdfSource }[] = [
  { label: 'ローカル', value: 'local' },
  { label: 'B2 Cloud', value: 'b2-webapi' },
]

const defaultServiceTypeMapping: Record<string, ServiceTypeConfig> = Object.fromEntries(
  invoiceTypeOptions.map(o => [o.value, { b2ServiceType: o.value }])
)

const yamatoB2Form = ref<YamatoB2Config & { enabled?: boolean; serviceTypeMapping: Record<string, ServiceTypeConfig> }>({
  apiEndpoint: 'https://yamato-b2-webapi.nexand.org',
  apiKey: '',
  customerCode: '',
  customerPassword: '',
  customerClsCode: '',
  loginUserId: '',
  serviceTypeMapping: JSON.parse(JSON.stringify(defaultServiceTypeMapping)),
  invoiceCode: '',
  invoiceFreightNo: '',
  enabled: false,
})

interface ServiceTypeMappingRow {
  invoiceType: string; label: string; b2ServiceType: string; printTemplateId?: string; pdfSource: PdfSource
}

const serviceTypeMappingList = computed<ServiceTypeMappingRow[]>({
  get: () => invoiceTypeOptions.map(opt => {
    const config = yamatoB2Form.value.serviceTypeMapping[opt.value] || { b2ServiceType: opt.value }
    return {
      invoiceType: opt.value, label: opt.label,
      b2ServiceType: config.b2ServiceType || opt.value,
      printTemplateId: config.printTemplateId,
      pdfSource: config.pdfSource || 'local',
    }
  }),
  set: (rows) => {
    const mapping: Record<string, ServiceTypeConfig> = {}
    for (const row of rows) {
      mapping[row.invoiceType] = { b2ServiceType: row.b2ServiceType, printTemplateId: row.printTemplateId, pdfSource: row.pdfSource }
    }
    yamatoB2Form.value.serviceTypeMapping = mapping
  },
})

function updateMappingRow(invoiceType: string, field: 'b2ServiceType' | 'printTemplateId' | 'pdfSource', value: string | undefined) {
  if (!yamatoB2Form.value.serviceTypeMapping[invoiceType]) {
    yamatoB2Form.value.serviceTypeMapping[invoiceType] = { b2ServiceType: invoiceType }
  }
  const m = yamatoB2Form.value.serviceTypeMapping[invoiceType]
  if (field === 'b2ServiceType') m.b2ServiceType = value || invoiceType
  else if (field === 'printTemplateId') m.printTemplateId = value
  else if (field === 'pdfSource') m.pdfSource = (value as PdfSource) || 'local'
}

const autoValidationForm = ref<AutoValidationConfig>({ enabled: false, intervalMinutes: 5, maxRetries: 5 })

const canTest = computed(() => !!(yamatoB2Form.value.apiEndpoint && yamatoB2Form.value.apiKey && yamatoB2Form.value.customerCode && yamatoB2Form.value.customerPassword))

const loadConfig = async () => {
  loading.value = true
  try {
    try { printTemplates.value = await fetchPrintTemplates() } catch { printTemplates.value = [] }

    const config = await fetchCarrierAutomationConfig('yamato-b2')
    yamatoB2Form.value.enabled = config.enabled || false
    if (config.autoValidation) {
      autoValidationForm.value = {
        enabled: config.autoValidation.enabled ?? false,
        intervalMinutes: config.autoValidation.intervalMinutes ?? 5,
        maxRetries: config.autoValidation.maxRetries ?? 5,
      }
    }
    if (config.yamatoB2) {
      const mergedMapping: Record<string, ServiceTypeConfig> = JSON.parse(JSON.stringify(defaultServiceTypeMapping))
      if (config.yamatoB2.serviceTypeMapping) {
        for (const [key, value] of Object.entries(config.yamatoB2.serviceTypeMapping)) {
          mergedMapping[key] = { ...mergedMapping[key], ...value }
        }
      }
      yamatoB2Form.value = {
        ...yamatoB2Form.value,
        apiEndpoint: config.yamatoB2.apiEndpoint || 'https://yamato-b2-webapi.nexand.org',
        apiKey: config.yamatoB2.apiKey || '',
        customerCode: config.yamatoB2.customerCode || '',
        customerPassword: config.yamatoB2.customerPassword || '',
        customerClsCode: config.yamatoB2.customerClsCode || '',
        loginUserId: config.yamatoB2.loginUserId || '',
        serviceTypeMapping: mergedMapping,
        invoiceCode: config.yamatoB2.invoiceCode || '',
        invoiceFreightNo: config.yamatoB2.invoiceFreightNo || '',
      }
    }
    // 更新配送業者状态
    const yamato = availableCarriers.value.find(c => c.type === 'yamato-b2')
    if (yamato) {
      yamato.configured = !!yamatoB2Form.value.apiKey
      yamato.connected = config.enabled || false
    }
  } catch (error: any) {
    showToast(error?.message || '設定の取得に失敗しました', 'danger')
  } finally {
    loading.value = false
  }
}

const saveConfig = async () => {
  if (!yamatoB2Form.value.apiKey || !yamatoB2Form.value.customerCode || !yamatoB2Form.value.customerPassword) {
    showToast('API Key、お客様コード、パスワードは必須です', 'warning')
    return
  }
  saving.value = true
  try {
    await saveCarrierAutomationConfig('yamato-b2', {
      enabled: yamatoB2Form.value.enabled,
      yamatoB2: yamatoB2Form.value,
      autoValidation: autoValidationForm.value,
    })
    showToast('設定を保存しました', 'success')
  } catch (error: any) {
    showToast(error?.message || '保存に失敗しました', 'danger')
  } finally {
    saving.value = false
  }
}

const testConnection = async () => {
  if (!canTest.value) return
  testing.value = true
  testResult.value = null
  try {
    testResult.value = await testCarrierAutomationConnection('yamato-b2')
    lastTestedAt.value = new Date().toLocaleTimeString('ja-JP')
    const yamato = availableCarriers.value.find(c => c.type === 'yamato-b2')
    if (yamato) yamato.connected = testResult.value.success
    showToast(testResult.value.success ? '接続テスト成功' : `接続テスト失敗: ${testResult.value.message}`, testResult.value.success ? 'success' : 'danger')
  } catch (error: any) {
    testResult.value = { success: false, message: error?.message || '接続テストに失敗しました' }
    showToast(testResult.value.message, 'danger')
  } finally {
    testing.value = false
  }
}

onMounted(() => {
  loadConfig()
  checkSagawaPlugin()
})
</script>

<style scoped>
.carrier-automation-settings {
  padding: 0 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
:deep(.o-control-panel) { margin-left: -20px; margin-right: -20px; }

.o-card { background: var(--o-view-background, #fff); border: 1px solid var(--o-border-color, #e4e7ed); }
.automation-tabs-card { padding: 0; }

.o-tabs { display: flex; border-bottom: 2px solid var(--o-border-color, #e4e7ed); }
.o-tab {
  padding: 0.75rem 1.25rem;
  border: none; background: none;
  font-size: var(--o-font-size-base, 14px);
  color: var(--o-gray-600, #606266);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  display: flex; align-items: center; gap: 6px;
}
.o-tab.active { color: var(--o-brand-primary, #D97756); border-bottom-color: var(--o-brand-primary, #D97756); font-weight: 500; }

.tab-status { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.tab-status--ok { background: var(--o-success, #3D8B37); }
.tab-status--warn { background: var(--o-warning, #D4A017); }

.tab-content { padding: 20px; min-height: 300px; }
.config-form { max-width: 900px; }

/* 接続状態 / 接続ステータス */
.connection-status {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 16px; margin-bottom: 16px;
  border-left: 3px solid;
}
.connection-status--ok { background: #f0f9eb; border-color: var(--o-success); }
.connection-status--error { background: #fef0f0; border-color: var(--o-danger); }
.connection-status--configured { background: #fdf6ec; border-color: var(--o-warning); }
.connection-status--disabled { background: var(--o-gray-100); border-color: var(--o-gray-300); }
.connection-status__icon { font-size: 18px; }
.connection-status--ok .connection-status__icon { color: var(--o-success); }
.connection-status--error .connection-status__icon { color: var(--o-danger); }
.connection-status--configured .connection-status__icon { color: var(--o-warning); }
.connection-status--disabled .connection-status__icon { color: var(--o-gray-400); }
.connection-status__text { display: flex; flex-direction: column; gap: 2px; }
.connection-status__text strong { font-size: 13px; }
.connection-status__time { font-size: 11px; color: var(--o-gray-500); }

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 16px; }

/* 密码显示/隐藏 */
.password-wrap { position: relative; }
.password-wrap .o-input { padding-right: 36px; }
.password-toggle {
  position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
  border: none; background: none; cursor: pointer; font-size: 14px; padding: 4px;
}

.o-input {
  width: 100%; padding: 6px 10px;
  border: 1px solid var(--o-border-color, #dcdfe6);
  font-size: var(--o-font-size-base, 14px);
  color: var(--o-gray-700, #303133);
  background: var(--o-view-background, #fff);
  box-sizing: border-box;
}
.o-input:disabled { opacity: 0.6; background: #f5f7fa; }

.o-form-group { margin-bottom: 1rem; }
.form-label { display: block; font-size: var(--o-font-size-small, 13px); font-weight: 500; color: var(--o-gray-700, #303133); margin-bottom: 0.25rem; }
.required-badge { display:inline-block;background:#dc3545;color:#fff;font-size:10px;font-weight:700;line-height:1;padding:2px 5px;border-radius:3px;white-space:nowrap;vertical-align:middle;margin-left:4px; }

.o-toggle { position: relative; display: inline-flex; align-items: center; cursor: pointer; }
.o-toggle input { position: absolute; opacity: 0; width: 0; height: 0; }
.o-toggle-slider { width: 40px; height: 20px; background: var(--o-toggle-off, #c0c4cc); border-radius: 10px; transition: 0.2s; position: relative; }
.o-toggle-slider::after { content: ''; position: absolute; width: 16px; height: 16px; border-radius: 50%; background: #fff; top: 2px; left: 2px; transition: 0.2s; }
.o-toggle input:checked + .o-toggle-slider { background: var(--o-brand-primary, #D97756); }
.o-toggle input:checked + .o-toggle-slider::after { left: 22px; }

.o-divider { border: none; border-top: 1px solid var(--o-border-color, #ebeef5); margin: 20px 0 12px; }
.section-label { font-size: 14px; font-weight: 600; color: var(--o-gray-800, #303133); margin: 0 0 12px; }
.form-hint { font-size: 12px; color: var(--o-gray-500, #909399); }
.field-hint { margin-top: 4px; font-size: 12px; color: var(--o-gray-500, #909399); }

.service-mapping-wrapper { overflow-x: auto; margin-bottom: 16px; }
.form-actions { display: flex; gap: 12px; margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--o-border-color, #ebeef5); }

.test-result { margin-top: 16px; max-width: 600px; padding: 12px 16px; position: relative; }
.test-success { background: #f0f9eb; border: 1px solid #67c23a; color: #67c23a; }
.test-error { background: #fef0f0; border: 1px solid #f56c6c; color: #f56c6c; }
.test-result p { margin: 4px 0 0; font-size: 13px; }
.dismiss-btn { position: absolute; top: 8px; right: 8px; border: none; background: none; font-size: 18px; cursor: pointer; color: inherit; line-height: 1; }

/* 佐川プラグインカード */
.plugin-status-card { padding: 20px; }
.plugin-status-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.plugin-status-header h4 { margin: 0; font-size: 16px; }
.plugin-actions { display: flex; gap: 8px; margin-top: 16px; }
.o-badge { display: inline-block; padding: 2px 10px; font-size: 12px; font-weight: 600; }
.o-badge-success { background: var(--o-success-bg); color: var(--o-success-text); }
.o-badge-secondary { background: var(--o-gray-200); color: var(--o-gray-700); }

/* Coming Soon */
.coming-soon { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 20px; color: var(--o-gray-400); text-align: center; }
.coming-soon h4 { color: var(--o-gray-600); margin: 0; }
.coming-soon p { margin: 0; font-size: 13px; }

.loading-state { padding: 60px 0; text-align: center; color: var(--o-gray-500, #909399); }

@media (max-width: 768px) {
  .form-grid { grid-template-columns: 1fr; }
}
</style>
