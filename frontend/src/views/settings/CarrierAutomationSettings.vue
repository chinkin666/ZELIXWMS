<template>
  <div class="carrier-automation-settings">
    <ControlPanel :title="t('wms.settings.carrierAutomationTitle', '配送業者自動化設定')" :show-search="false" />

    <div class="o-card automation-tabs-card">
      <div class="o-tabs">
        <button
          class="o-tab"
          :class="{ active: activeTab === 'yamato-b2' }"
          @click="activeTab = 'yamato-b2'"
        >{{ t('wms.settings.yamatoB2Cloud', 'ヤマトB2 Cloud') }}</button>
        <button class="o-tab" disabled title="Coming Soon">{{ t('wms.settings.sagawa', '佐川急便') }}</button>
        <button class="o-tab" disabled title="Coming Soon">{{ t('wms.settings.seino', '西濃運輸') }}</button>
      </div>

      <div class="tab-content" v-if="activeTab === 'yamato-b2'">
        <div v-if="loading" class="loading-state">{{ t('wms.settings.loading', '読み込み中...') }}</div>
        <template v-else>
          <div class="config-form">
            <div class="o-form-group">
              <label class="form-label">{{ t('wms.settings.enabled', '有効') }}</label>
              <div style="display:flex;align-items:center;gap:12px">
                <label class="o-toggle">
                  <input type="checkbox" v-model="yamatoB2Form.enabled" />
                  <span class="o-toggle-slider"></span>
                </label>
                <span class="form-hint">{{ t('wms.settings.automationEnabledHint', 'ONにすると、配送業者データ出力・取込で自動化機能が使えます') }}</span>
              </div>
            </div>

            <hr class="o-divider" />
            <h4 class="section-label">{{ t('wms.settings.apiConnectionSettings', 'API接続設定') }}</h4>

            <div class="o-form-group">
              <label class="form-label">{{ t('wms.settings.apiEndpoint', 'APIエンドポイント') }} <span class="required">*</span></label>
              <input class="o-input" v-model="yamatoB2Form.apiEndpoint" placeholder="https://yamato-b2-webapi.nexand.org" style="max-width:400px" />
            </div>

            <div class="o-form-group">
              <label class="form-label">API Key <span class="required">*</span></label>
              <input class="o-input" v-model="yamatoB2Form.apiKey" type="password" :placeholder="t('wms.settings.apiKeyPlaceholder', '公開API用のアクセスキー')" style="max-width:400px" />
              <div class="field-hint">{{ t('wms.settings.apiKeyHint', 'API提供者から発行されたアクセスキーを入力してください') }}</div>
            </div>

            <div class="o-form-group">
              <label class="form-label">{{ t('wms.settings.customerCode', 'お客様コード') }} <span class="required">*</span></label>
              <input class="o-input" v-model="yamatoB2Form.customerCode" :placeholder="t('wms.settings.customerCodePlaceholder', 'ヤマトビジネスメンバーズID')" style="max-width:400px" />
            </div>

            <div class="o-form-group">
              <label class="form-label">{{ t('wms.settings.password', 'パスワード') }} <span class="required">*</span></label>
              <input class="o-input" v-model="yamatoB2Form.customerPassword" type="password" :placeholder="t('wms.settings.password', 'パスワード')" style="max-width:400px" />
            </div>

            <div class="o-form-group">
              <label class="form-label">{{ t('wms.settings.classificationCode', '分類コード') }}</label>
              <input class="o-input" v-model="yamatoB2Form.customerClsCode" :placeholder="t('wms.settings.classificationCodePlaceholder', '任意（お届け先分類コード）')" style="max-width:400px" />
            </div>

            <div class="o-form-group">
              <label class="form-label">{{ t('wms.settings.loginUserId', 'ログインユーザーID') }}</label>
              <input class="o-input" v-model="yamatoB2Form.loginUserId" :placeholder="t('wms.settings.optional', '任意')" style="max-width:400px" />
            </div>

            <hr class="o-divider" />
            <h4 class="section-label">{{ t('wms.settings.serviceTypeMapping', 'サービス種類マッピング') }}</h4>
            <div class="field-hint" style="margin-bottom:16px">{{ t('wms.settings.serviceTypeMappingHint', '各送り状種類のB2サービス種類と印刷テンプレートを設定します') }}</div>

            <div class="service-mapping-wrapper">
              <table class="o-list-table service-mapping-table">
                <thead>
                  <tr>
                    <th style="width:180px">{{ t('wms.settings.waybillType') }}</th>
                    <th style="width:180px">{{ t('wms.settings.b2ServiceType', 'B2サービス種類') }}</th>
                    <th style="width:160px">{{ t('wms.settings.pdfSource', 'PDF取得元') }}</th>
                    <th style="min-width:180px">{{ t('wms.settings.printTemplate') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in serviceTypeMappingList" :key="row.invoiceType">
                    <td>{{ row.label }}</td>
                    <td>
                      <select
                        class="o-input"
                        :value="row.b2ServiceType"
                        @change="updateMappingRow(row.invoiceType, 'b2ServiceType', ($event.target as HTMLSelectElement).value)"
                      >
                        <option
                          v-for="opt in b2ServiceTypeOptions"
                          :key="opt.value"
                          :value="opt.value"
                        >{{ opt.label }}</option>
                      </select>
                    </td>
                    <td>
                      <select
                        class="o-input"
                        :value="row.pdfSource"
                        @change="updateMappingRow(row.invoiceType, 'pdfSource', ($event.target as HTMLSelectElement).value)"
                      >
                        <option
                          v-for="opt in pdfSourceOptions"
                          :key="opt.value"
                          :value="opt.value"
                        >{{ opt.label }}</option>
                      </select>
                    </td>
                    <td>
                      <select
                        class="o-input"
                        :value="row.printTemplateId || ''"
                        @change="updateMappingRow(row.invoiceType, 'printTemplateId', ($event.target as HTMLSelectElement).value || undefined)"
                        :disabled="row.pdfSource === 'b2-webapi'"
                      >
                        <option value="">{{ t('wms.settings.selectTemplate', 'テンプレートを選択') }}</option>
                        <option
                          v-for="t in printTemplates"
                          :key="t.id"
                          :value="t.id"
                        >{{ t.name }}</option>
                      </select>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <hr class="o-divider" />
            <h4 class="section-label">{{ t('wms.settings.billingSection', '請求先') }}</h4>

            <div class="o-form-group">
              <label class="form-label">{{ t('wms.settings.invoiceCode', '請求先顧客コード') }}</label>
              <input class="o-input" v-model="yamatoB2Form.invoiceCode" placeholder="10〜12桁" maxlength="12" style="width:200px" />
              <div class="field-hint">{{ t('wms.settings.invoiceCodeHint', 'B2 Cloudで設定された請求先の顧客コード（10〜12桁）') }}</div>
            </div>

            <div class="o-form-group">
              <label class="form-label">{{ t('wms.settings.invoiceFreightNo', '運賃管理番号') }}</label>
              <input class="o-input" v-model="yamatoB2Form.invoiceFreightNo" placeholder="2桁" maxlength="2" style="width:100px" />
              <div class="field-hint">{{ t('wms.settings.invoiceFreightNoHint', '運賃の管理番号（2桁）') }}</div>
            </div>
            <hr class="o-divider" />
            <h4 class="section-label">{{ t('wms.settings.autoValidationSettings', '自動検証設定') }}</h4>
            <div class="field-hint" style="margin-bottom:16px">{{ t('wms.settings.autoValidationHint', '出荷確認時にB2 Cloudへの自動検証を定期的にリトライする設定です') }}</div>

            <div class="o-form-group">
              <label class="form-label">{{ t('wms.settings.autoValidation', '自動検証') }}</label>
              <div style="display:flex;align-items:center;gap:12px">
                <label class="o-toggle">
                  <input type="checkbox" v-model="autoValidationForm.enabled" />
                  <span class="o-toggle-slider"></span>
                </label>
                <span class="form-hint">{{ t('wms.settings.autoValidationEnabledHint', 'ONにすると、検証失敗時に自動でリトライします') }}</span>
              </div>
            </div>

            <div class="o-form-group" v-if="autoValidationForm.enabled">
              <label class="form-label">{{ t('wms.settings.validationInterval', '検証間隔') }}</label>
              <div style="display:flex;align-items:center;gap:12px">
                <select class="o-input" v-model.number="autoValidationForm.intervalMinutes" style="width:160px">
                  <option :value="1">1{{ t('wms.settings.minuteUnit', '分') }}</option>
                  <option :value="5">5{{ t('wms.settings.minuteUnit', '分') }}</option>
                  <option :value="10">10{{ t('wms.settings.minuteUnit', '分') }}</option>
                  <option :value="30">30{{ t('wms.settings.minuteUnit', '分') }}</option>
                  <option :value="60">60{{ t('wms.settings.minuteUnit', '分') }}</option>
                </select>
                <span class="form-hint">{{ t('wms.settings.validationIntervalHint', '検証失敗後、次のリトライまでの間隔') }}</span>
              </div>
            </div>

            <div class="o-form-group" v-if="autoValidationForm.enabled">
              <label class="form-label">{{ t('wms.settings.maxRetries', '最大リトライ回数') }}</label>
              <div style="display:flex;align-items:center;gap:12px">
                <input class="o-input" type="number" v-model.number="autoValidationForm.maxRetries" min="1" max="20" style="width:100px" />
                <span class="form-hint">{{ t('wms.settings.maxRetriesHint', 'この回数を超えるとエラーを表示して停止します') }}</span>
              </div>
            </div>
          </div>

          <div class="form-actions">
            <OButton variant="secondary" @click="testConnection" :disabled="testing || !canTest">
              {{ testing ? t('wms.settings.testing', 'テスト中...') : t('wms.settings.connectionTest', '接続テスト') }}
            </OButton>
            <OButton variant="primary" @click="saveConfig" :disabled="saving">
              {{ saving ? t('wms.settings.saving', '保存中...') : t('wms.common.save') }}
            </OButton>
          </div>

          <div v-if="testResult" class="test-result" :class="testResult.success ? 'test-success' : 'test-error'">
            <strong>{{ testResult.success ? t('wms.settings.connectionSuccess', '接続成功') : t('wms.settings.connectionFailed', '接続失敗') }}</strong>
            <p>{{ testResult.message }}</p>
            <button class="dismiss-btn" @click="testResult = null">&times;</button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from '@/composables/useI18n'
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

const { t } = useI18n()
const { show: showToast } = useToast()

const activeTab = ref('yamato-b2')
const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const testResult = ref<ConnectionTestResult | null>(null)
const printTemplates = ref<PrintTemplateApiModel[]>([])

// 送り状種類オプション（注文側）
const invoiceTypeOptions = [
  { label: '0: 発払い', value: '0' },
  { label: '1: EAZY', value: '1' },
  { label: '2: コレクト', value: '2' },
  { label: '3: クロネコゆうメール（DM便）', value: '3' },
  { label: '4: タイム', value: '4' },
  { label: '5: 着払い', value: '5' },
  { label: '6: 発払い複数口', value: '6' },
  { label: '7: クロネコゆうパケット', value: '7' },
  { label: '8: 宅急便コンパクト', value: '8' },
  { label: '9: コンパクトコレクト', value: '9' },
  { label: 'A: ネコポス', value: 'A' },
]

// B2サービス種類オプション
const b2ServiceTypeOptions = [
  { label: '0: 発払い', value: '0' },
  { label: '1: EAZY', value: '1' },
  { label: '2: コレクト', value: '2' },
  { label: '3: クロネコゆうメール', value: '3' },
  { label: '4: タイム', value: '4' },
  { label: '5: 着払い', value: '5' },
  { label: '6: 発払い（複数口）', value: '6' },
  { label: '7: クロネコゆうパケット', value: '7' },
  { label: '8: 宅急便コンパクト', value: '8' },
  { label: '9: 宅急便コンパクトコレクト', value: '9' },
  { label: 'A: ネコポス', value: 'A' },
]

// PDF取得元オプション
const pdfSourceOptions: { label: string; value: PdfSource }[] = [
  { label: 'ローカルテンプレート', value: 'local' },
  { label: 'B2 Cloudから取得', value: 'b2-webapi' },
]

// デフォルトのサービス種類マッピング（同じ値にマッピング）
const defaultServiceTypeMapping: Record<string, ServiceTypeConfig> = {
  '0': { b2ServiceType: '0' },
  '1': { b2ServiceType: '1' },
  '2': { b2ServiceType: '2' },
  '3': { b2ServiceType: '3' },
  '4': { b2ServiceType: '4' },
  '5': { b2ServiceType: '5' },
  '6': { b2ServiceType: '6' },
  '7': { b2ServiceType: '7' },
  '8': { b2ServiceType: '8' },
  '9': { b2ServiceType: '9' },
  'A': { b2ServiceType: 'A' },
}

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

// 服务类型映射列表（用于表格绑定）
interface ServiceTypeMappingRow {
  invoiceType: string
  label: string
  b2ServiceType: string
  printTemplateId?: string
  pdfSource: PdfSource
}

const serviceTypeMappingList = computed<ServiceTypeMappingRow[]>({
  get: () => {
    return invoiceTypeOptions.map(opt => {
      const config = yamatoB2Form.value.serviceTypeMapping[opt.value] || { b2ServiceType: opt.value }
      return {
        invoiceType: opt.value,
        label: opt.label,
        b2ServiceType: config.b2ServiceType || opt.value,
        printTemplateId: config.printTemplateId,
        pdfSource: config.pdfSource || 'local',
      }
    })
  },
  set: (rows) => {
    const mapping: Record<string, ServiceTypeConfig> = {}
    for (const row of rows) {
      mapping[row.invoiceType] = {
        b2ServiceType: row.b2ServiceType,
        printTemplateId: row.printTemplateId,
        pdfSource: row.pdfSource,
      }
    }
    yamatoB2Form.value.serviceTypeMapping = mapping
  },
})

// 更新单个映射行
function updateMappingRow(invoiceType: string, field: 'b2ServiceType' | 'printTemplateId' | 'pdfSource', value: string | undefined) {
  if (!yamatoB2Form.value.serviceTypeMapping[invoiceType]) {
    yamatoB2Form.value.serviceTypeMapping[invoiceType] = { b2ServiceType: invoiceType }
  }
  if (field === 'b2ServiceType') {
    yamatoB2Form.value.serviceTypeMapping[invoiceType].b2ServiceType = value || invoiceType
  } else if (field === 'printTemplateId') {
    yamatoB2Form.value.serviceTypeMapping[invoiceType].printTemplateId = value
  } else if (field === 'pdfSource') {
    yamatoB2Form.value.serviceTypeMapping[invoiceType].pdfSource = (value as PdfSource) || 'local'
  }
}

const autoValidationForm = ref<AutoValidationConfig>({
  enabled: false,
  intervalMinutes: 5,
  maxRetries: 5,
})

const enabled = ref(false)

// For template binding
Object.defineProperty(yamatoB2Form.value, 'enabled', {
  get: () => enabled.value,
  set: (val: boolean) => { enabled.value = val },
  enumerable: true,
})

const canTest = computed(() => {
  return (
    yamatoB2Form.value.apiEndpoint &&
    yamatoB2Form.value.apiKey &&
    yamatoB2Form.value.customerCode &&
    yamatoB2Form.value.customerPassword
  )
})

const loadConfig = async () => {
  loading.value = true
  try {
    // Load print templates first
    try {
      printTemplates.value = await fetchPrintTemplates()
    } catch {
      printTemplates.value = []
    }

    const config = await fetchCarrierAutomationConfig('yamato-b2')
    enabled.value = config.enabled || false
    if (config.autoValidation) {
      autoValidationForm.value = {
        enabled: config.autoValidation.enabled ?? false,
        intervalMinutes: config.autoValidation.intervalMinutes ?? 5,
        maxRetries: config.autoValidation.maxRetries ?? 5,
      }
    }
    if (config.yamatoB2) {
      // Merge serviceTypeMapping with defaults
      const mergedMapping: Record<string, ServiceTypeConfig> = JSON.parse(JSON.stringify(defaultServiceTypeMapping))
      if (config.yamatoB2.serviceTypeMapping) {
        for (const [key, value] of Object.entries(config.yamatoB2.serviceTypeMapping)) {
          mergedMapping[key] = { ...mergedMapping[key], ...value }
        }
      }

      // Use Object.assign to preserve the enabled getter/setter defined via Object.defineProperty
      Object.assign(yamatoB2Form.value, {
        apiEndpoint: config.yamatoB2.apiEndpoint || 'https://yamato-b2-webapi.nexand.org',
        apiKey: config.yamatoB2.apiKey || '',
        customerCode: config.yamatoB2.customerCode || '',
        customerPassword: config.yamatoB2.customerPassword || '',
        customerClsCode: config.yamatoB2.customerClsCode || '',
        loginUserId: config.yamatoB2.loginUserId || '',
        serviceTypeMapping: mergedMapping,
        invoiceCode: config.yamatoB2.invoiceCode || '',
        invoiceFreightNo: config.yamatoB2.invoiceFreightNo || '',
      })
    }
  } catch (error: any) {
    showToast(error?.message || t('wms.settings.configFetchFailed', '設定の取得に失敗しました'), 'danger')
  } finally {
    loading.value = false
  }
}

const saveConfig = async () => {
  if (!yamatoB2Form.value.apiKey || !yamatoB2Form.value.customerCode || !yamatoB2Form.value.customerPassword) {
    showToast(t('wms.settings.apiFieldsRequired', 'API Key、お客様コード、パスワードは必須です'), 'warning')
    return
  }

  saving.value = true
  try {
    await saveCarrierAutomationConfig('yamato-b2', {
      enabled: enabled.value,
      yamatoB2: yamatoB2Form.value,
      autoValidation: autoValidationForm.value,
    })
    showToast(t('wms.settings.configSaved', '設定を保存しました'), 'success')
  } catch (error: any) {
    showToast(error?.message || t('wms.settings.saveFailed', '保存に失敗しました'), 'danger')
  } finally {
    saving.value = false
  }
}

const testConnection = async () => {
  if (!yamatoB2Form.value.apiKey || !yamatoB2Form.value.customerCode || !yamatoB2Form.value.customerPassword) {
    showToast(t('wms.settings.apiFieldsRequired', 'API Key、お客様コード、パスワードは必須です'), 'warning')
    return
  }

  testing.value = true
  testResult.value = null
  try {
    // Save first
    await saveCarrierAutomationConfig('yamato-b2', {
      enabled: enabled.value,
      yamatoB2: yamatoB2Form.value,
      autoValidation: autoValidationForm.value,
    })

    // Then test
    testResult.value = await testCarrierAutomationConnection('yamato-b2')
    if (testResult.value.success) {
      showToast(t('wms.settings.connectionTestSuccess', '接続テスト成功'), 'success')
    } else {
      showToast(`${t('wms.settings.connectionTestFailed', '接続テスト失敗')}: ${testResult.value.message}`, 'danger')
    }
  } catch (error: any) {
    testResult.value = {
      success: false,
      message: error?.message || t('wms.settings.connectionTestError', '接続テストに失敗しました'),
    }
    showToast(testResult.value.message, 'danger')
  } finally {
    testing.value = false
  }
}

onMounted(() => {
  loadConfig()
})
</script>

<style scoped>
.carrier-automation-settings {
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
}

.automation-tabs-card {
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

.o-tab:disabled {
  color: #c0c4cc;
  cursor: not-allowed;
}

.o-tab.active {
  color: var(--o-brand-primary, #714b67);
  border-bottom-color: var(--o-brand-primary, #714b67);
  font-weight: 500;
}

.tab-content {
  padding: 20px;
  min-height: 400px;
}

.config-form {
  max-width: 800px;
}

.o-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  border: 1px solid var(--o-border-color, #dcdfe6);
  border-radius: var(--o-border-radius, 4px);
  font-size: var(--o-font-size-base, 14px);
  cursor: pointer;
  background: var(--o-view-background, #fff);
  color: var(--o-gray-700, #303133);
  transition: 0.2s;
  white-space: nowrap;
}
.o-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.o-btn-primary { background: var(--o-brand-primary, #714b67); color: #fff; border-color: var(--o-brand-primary, #714b67); }
.o-btn-secondary { background: var(--o-view-background, #fff); color: var(--o-gray-700, #303133); }

.o-input {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid var(--o-border-color, #dcdfe6);
  border-radius: var(--o-border-radius, 4px);
  font-size: var(--o-font-size-base, 14px);
  color: var(--o-gray-700, #303133);
  background: var(--o-view-background, #fff);
  box-sizing: border-box;
}
.o-input:disabled { opacity: 0.6; background: #f5f7fa; }

.o-form-group { margin-bottom: 1rem; }
.form-label { display: block; font-size: var(--o-font-size-small, 13px); font-weight: 500; color: var(--o-gray-700, #303133); margin-bottom: 0.25rem; }
.required { color: #f56c6c; }

.o-toggle { position: relative; display: inline-flex; align-items: center; cursor: pointer; }
.o-toggle input { position: absolute; opacity: 0; width: 0; height: 0; }
.o-toggle-slider { width: 40px; height: 20px; background: var(--o-toggle-off, #c0c4cc); border-radius: 10px; transition: 0.2s; position: relative; }
.o-toggle-slider::after { content: ''; position: absolute; width: 16px; height: 16px; border-radius: 50%; background: #fff; top: 2px; left: 2px; transition: 0.2s; }
.o-toggle input:checked + .o-toggle-slider { background: var(--o-brand-primary, #714b67); }
.o-toggle input:checked + .o-toggle-slider::after { left: 22px; }

.o-divider {
  border: none;
  border-top: 1px solid var(--o-border-color, #ebeef5);
  margin: 20px 0 12px;
}

.section-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--o-gray-700, #303133);
  margin: 0 0 12px;
}

.form-hint {
  font-size: 12px;
  color: var(--o-gray-500, #909399);
}

.field-hint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--o-gray-500, #909399);
}

/* .o-list-table base styles are defined globally in style.css */

.service-mapping-wrapper {
  overflow-x: auto;
  margin-bottom: 24px;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--o-border-color, #ebeef5);
}

.test-result {
  margin-top: 16px;
  max-width: 600px;
  padding: 12px 16px;
  border-radius: var(--o-border-radius, 4px);
  position: relative;
}

.test-success {
  background: #f0f9eb;
  border: 1px solid #67c23a;
  color: #67c23a;
}

.test-error {
  background: #fef0f0;
  border: 1px solid #f56c6c;
  color: #f56c6c;
}

.test-result p {
  margin: 4px 0 0;
  font-size: 13px;
}

.dismiss-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  border: none;
  background: none;
  font-size: 18px;
  cursor: pointer;
  color: inherit;
  line-height: 1;
}

.loading-state {
  padding: 60px 0;
  text-align: center;
  color: var(--o-gray-500, #909399);
}
</style>
