<template>
  <div class="carrier-automation-settings">
    <div class="page-header">
      <div>
        <h1 class="page-title">配送会社自動化設定</h1>
        <p class="page-subtitle">配送会社APIとの自動連携設定を管理します</p>
      </div>
    </div>

    <el-tabs v-model="activeTab" type="card" class="automation-tabs">
      <el-tab-pane label="ヤマトB2 Cloud" name="yamato-b2">
        <div class="tab-content" v-loading="loading">
          <el-form
            ref="formRef"
            :model="yamatoB2Form"
            label-width="180px"
            label-position="left"
            class="config-form"
          >
            <el-form-item label="有効">
              <el-switch v-model="yamatoB2Form.enabled" />
              <span class="form-hint">ONにすると、配送会社データ出力・取込で自動化機能が使えます</span>
            </el-form-item>

            <el-divider content-position="left">API接続設定</el-divider>

            <el-form-item label="APIエンドポイント" required>
              <el-input
                v-model="yamatoB2Form.apiEndpoint"
                placeholder="https://yamato-b2-webapi.nexand.org"
              />
            </el-form-item>

            <el-form-item label="API Key" required>
              <el-input
                v-model="yamatoB2Form.apiKey"
                type="password"
                placeholder="公開API用のアクセスキー"
                show-password
              />
              <div class="field-hint">API提供者から発行されたアクセスキーを入力してください</div>
            </el-form-item>

            <el-form-item label="お客様コード" required>
              <el-input
                v-model="yamatoB2Form.customerCode"
                placeholder="ヤマトビジネスメンバーズID"
              />
            </el-form-item>

            <el-form-item label="パスワード" required>
              <el-input
                v-model="yamatoB2Form.customerPassword"
                type="password"
                placeholder="パスワード"
                show-password
              />
            </el-form-item>

            <el-form-item label="分類コード">
              <el-input
                v-model="yamatoB2Form.customerClsCode"
                placeholder="任意（お届け先分類コード）"
              />
            </el-form-item>

            <el-form-item label="ログインユーザーID">
              <el-input
                v-model="yamatoB2Form.loginUserId"
                placeholder="任意"
              />
            </el-form-item>

            <el-divider content-position="left">サービス種類マッピング</el-divider>
            <div class="field-hint" style="margin-bottom: 16px">各送り状種類のB2サービス種類と印刷テンプレートを設定します</div>

            <el-table :data="serviceTypeMappingList" border size="small" class="service-mapping-table">
              <el-table-column prop="invoiceType" label="送り状種類" width="180">
                <template #default="{ row }">
                  {{ row.label }}
                </template>
              </el-table-column>
              <el-table-column prop="b2ServiceType" label="B2サービス種類" width="180">
                <template #default="{ row }">
                  <el-select
                    :model-value="row.b2ServiceType"
                    @update:model-value="(val: string | undefined) => updateMappingRow(row.invoiceType, 'b2ServiceType', val)"
                    style="width: 100%"
                  >
                    <el-option
                      v-for="opt in b2ServiceTypeOptions"
                      :key="opt.value"
                      :label="opt.label"
                      :value="opt.value"
                    />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column prop="pdfSource" label="PDF取得元" width="160">
                <template #default="{ row }">
                  <el-select
                    :model-value="row.pdfSource"
                    @update:model-value="(val: string | undefined) => updateMappingRow(row.invoiceType, 'pdfSource', val)"
                    style="width: 100%"
                  >
                    <el-option
                      v-for="opt in pdfSourceOptions"
                      :key="opt.value"
                      :label="opt.label"
                      :value="opt.value"
                    />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column prop="printTemplateId" label="印刷テンプレート" min-width="180">
                <template #default="{ row }">
                  <el-select
                    :model-value="row.printTemplateId"
                    @update:model-value="(val: string | undefined) => updateMappingRow(row.invoiceType, 'printTemplateId', val)"
                    clearable
                    placeholder="テンプレートを選択"
                    style="width: 100%"
                    :disabled="row.pdfSource === 'b2-webapi'"
                  >
                    <el-option
                      v-for="t in printTemplates"
                      :key="t.id"
                      :label="t.name"
                      :value="t.id"
                    />
                  </el-select>
                </template>
              </el-table-column>
            </el-table>

            <el-divider content-position="left">請求先</el-divider>

            <el-form-item
              label="請求先顧客コード"
              prop="invoiceCode"
              :rules="invoiceCodeRules"
            >
              <el-input
                v-model="yamatoB2Form.invoiceCode"
                placeholder="10〜12桁"
                maxlength="12"
                style="width: 200px"
              />
              <div class="field-hint">B2 Cloudで設定された請求先の顧客コード（10〜12桁）</div>
            </el-form-item>

            <el-form-item
              label="運賃管理番号"
              prop="invoiceFreightNo"
              :rules="invoiceFreightNoRules"
            >
              <el-input
                v-model="yamatoB2Form.invoiceFreightNo"
                placeholder="2桁"
                maxlength="2"
                style="width: 100px"
              />
              <div class="field-hint">運賃の管理番号（2桁）</div>
            </el-form-item>
          </el-form>

          <div class="form-actions">
            <el-button @click="testConnection" :loading="testing" :disabled="!canTest">
              接続テスト
            </el-button>
            <el-button type="primary" @click="saveConfig" :loading="saving">
              保存
            </el-button>
          </div>

          <el-alert
            v-if="testResult"
            :title="testResult.success ? '接続成功' : '接続失敗'"
            :type="testResult.success ? 'success' : 'error'"
            :description="testResult.message"
            show-icon
            closable
            @close="testResult = null"
            class="test-result"
          />
        </div>
      </el-tab-pane>

      <el-tab-pane label="佐川急便" name="sagawa-api" disabled>
        <div class="tab-content coming-soon">
          <el-empty description="Coming Soon" />
        </div>
      </el-tab-pane>

      <el-tab-pane label="西濃運輸" name="seino-api" disabled>
        <div class="tab-content coming-soon">
          <el-empty description="Coming Soon" />
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormItemRule } from 'element-plus'
import type { YamatoB2Config, ConnectionTestResult, ServiceTypeConfig, PdfSource } from '@/types/carrierAutomation'
import {
  fetchCarrierAutomationConfig,
  saveCarrierAutomationConfig,
  testCarrierAutomationConnection,
} from '@/api/carrierAutomation'
import { fetchPrintTemplates, type PrintTemplateApiModel } from '@/api/printTemplates'

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

// 請求先顧客コード (invoice_code): 10〜12桁
const invoiceCodeRules: FormItemRule[] = [
  {
    validator: (_rule, value, callback) => {
      if (value && (value.length < 10 || value.length > 12)) {
        callback(new Error('10〜12桁で入力してください'))
      } else {
        callback()
      }
    },
    trigger: 'blur',
  },
]

// 運賃管理番号 (invoice_freight_no): 2桁
const invoiceFreightNoRules: FormItemRule[] = [
  {
    validator: (_rule, value, callback) => {
      if (value && value.length !== 2) {
        callback(new Error('2桁で入力してください'))
      } else {
        callback()
      }
    },
    trigger: 'blur',
  },
]

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
    ElMessage.error(error?.message || '設定の取得に失敗しました')
  } finally {
    loading.value = false
  }
}

const saveConfig = async () => {
  if (!yamatoB2Form.value.apiKey || !yamatoB2Form.value.customerCode || !yamatoB2Form.value.customerPassword) {
    ElMessage.warning('API Key、お客様コード、パスワードは必須です')
    return
  }

  saving.value = true
  try {
    await saveCarrierAutomationConfig('yamato-b2', {
      enabled: enabled.value,
      yamatoB2: yamatoB2Form.value,
    })
    ElMessage.success('設定を保存しました')
  } catch (error: any) {
    ElMessage.error(error?.message || '保存に失敗しました')
  } finally {
    saving.value = false
  }
}

const testConnection = async () => {
  // First save the config, then test
  if (!yamatoB2Form.value.apiKey || !yamatoB2Form.value.customerCode || !yamatoB2Form.value.customerPassword) {
    ElMessage.warning('API Key、お客様コード、パスワードは必須です')
    return
  }

  testing.value = true
  testResult.value = null
  try {
    // Save first
    await saveCarrierAutomationConfig('yamato-b2', {
      enabled: enabled.value,
      yamatoB2: yamatoB2Form.value,
    })

    // Then test
    testResult.value = await testCarrierAutomationConnection('yamato-b2')
    if (testResult.value.success) {
      ElMessage.success('接続テスト成功')
    } else {
      ElMessage.error(`接続テスト失敗: ${testResult.value.message}`)
    }
  } catch (error: any) {
    testResult.value = {
      success: false,
      message: error?.message || '接続テストに失敗しました',
    }
    ElMessage.error(testResult.value.message)
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
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.page-title {
  margin: 0;
  font-size: 20px;
}

.page-subtitle {
  margin: 6px 0 0;
  color: #666;
  font-size: 13px;
}

.automation-tabs {
  background: #fff;
  border-radius: 4px;
}

.tab-content {
  padding: 20px;
  min-height: 400px;
}

.config-form {
  max-width: 800px;
}

.config-form :deep(.el-form-item__content > .el-input) {
  max-width: 400px;
}

.form-hint {
  margin-left: 12px;
  font-size: 12px;
  color: #909399;
}

.field-hint {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

.test-result {
  margin-top: 16px;
  max-width: 600px;
}

.coming-soon {
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.el-divider__text) {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.service-mapping-table {
  margin-bottom: 24px;
}

.service-mapping-table :deep(.el-table__cell) {
  padding: 8px 0;
}
</style>
