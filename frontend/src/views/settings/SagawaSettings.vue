<template>
  <div class="sagawa-settings">
    <ControlPanel :title="t('wms.settings.sagawa.title', '佐川急便 e飛伝 連携')" :show-search="false" />

    <!-- ── CSV 出力セクション / CSV 导出区域 ── -->
    <section class="settings-section">
      <h3 class="section-title">{{ t('wms.settings.sagawa.csvExportTitle', 'CSV出力（e飛伝取込用）') }}</h3>
      <p class="section-description">{{ t('wms.settings.sagawa.csvExportDescription', '出荷指示を佐川急便 e飛伝形式の CSV としてエクスポートします。') }}</p>

      <div class="form-row">
        <div class="o-form-group">
          <label class="form-label">{{ t('wms.settings.sagawa.shipPlanDateFrom', '出荷予定日（FROM）') }}</label>
          <input type="date" class="o-input" v-model="exportFilters.shipPlanDateFrom" />
        </div>
        <div class="o-form-group">
          <label class="form-label">{{ t('wms.settings.sagawa.shipPlanDateTo', '出荷予定日（TO）') }}</label>
          <input type="date" class="o-input" v-model="exportFilters.shipPlanDateTo" />
        </div>
        <div class="o-form-group">
          <label class="form-label">{{ t('wms.settings.sagawa.status', 'ステータス') }}</label>
          <select class="o-input" v-model="exportFilters.status">
            <option value="">{{ t('wms.settings.sagawa.statusAll', 'すべて') }}</option>
            <option value="unshipped">{{ t('wms.settings.sagawa.statusUnshipped', '未出荷') }}</option>
            <option value="confirmed">{{ t('wms.settings.sagawa.statusConfirmed', '確定済み') }}</option>
            <option value="printed">{{ t('wms.settings.sagawa.statusPrinted', '印刷済み') }}</option>
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="o-form-group">
          <label class="form-label">{{ t('wms.settings.sagawa.billingCode', '請求先コード') }}</label>
          <input class="o-input" v-model="exportConfig.billingCode" :placeholder="t('wms.settings.sagawa.billingCodePlaceholder', '半角英数字12文字')" />
        </div>
        <div class="o-form-group">
          <label class="form-label">{{ t('wms.settings.sagawa.defaultInvoiceType', 'デフォルト送り状種類') }}</label>
          <select class="o-input" v-model="exportConfig.defaultInvoiceType">
            <option value="">{{ t('wms.settings.sagawa.selectPlaceholder', '選択してください') }}</option>
            <option v-for="t in invoiceTypes" :key="t.invoiceType" :value="t.invoiceType">
              {{ t.invoiceType }}: {{ t.name }}
            </option>
          </select>
        </div>
        <div class="o-form-group">
          <label class="form-label">{{ t('wms.settings.sagawa.defaultSize', 'デフォルト荷物サイズ') }}</label>
          <select class="o-input" v-model="exportConfig.defaultSize">
            <option value="">{{ t('wms.settings.sagawa.selectPlaceholder', '選択してください') }}</option>
            <option v-for="s in PACKAGE_SIZES" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
      </div>

      <!-- 品名印字規則 / 品名印字ルール -->
      <div class="form-row">
        <div class="o-form-group">
          <label class="form-label">品名印字ルール</label>
          <select class="o-input" v-model="exportConfig.productNameRuleType">
            <option value="">デフォルト（商品名そのまま）</option>
            <option value="front">前からN文字</option>
            <option value="back">後ろからN文字</option>
            <option value="fixed">固定文字</option>
          </select>
        </div>
        <div class="o-form-group" v-if="exportConfig.productNameRuleType === 'front' || exportConfig.productNameRuleType === 'back'">
          <label class="form-label">文字数（最大16）</label>
          <input class="o-input" type="number" v-model.number="exportConfig.productNameMaxChars" min="1" max="16" placeholder="16" />
        </div>
        <div class="o-form-group" v-if="exportConfig.productNameRuleType === 'fixed'">
          <label class="form-label">固定文字</label>
          <input class="o-input" v-model="exportConfig.productNameFixedText" placeholder="例: 食品" maxlength="16" />
        </div>
        <div class="o-form-group">
          <label class="form-label">複数商品時</label>
          <select class="o-input" v-model="exportConfig.multiSkuMode">
            <option value="first">最初の商品名 + 他N点</option>
            <option value="count">「商品 N点」</option>
            <option value="concat">全商品名を連結</option>
          </select>
        </div>
      </div>

      <div class="action-row">
        <OButton variant="secondary" :disabled="searchingOrders" @click="searchOrders">
          {{ searchingOrders ? t('wms.settings.sagawa.searching', '検索中...') : t('wms.common.search') }}
        </OButton>
        <span v-if="matchedOrders.length > 0" class="preview-count">
          {{ t('wms.settings.sagawa.ordersFound', `${matchedOrders.length}件の出荷指示が見つかりました`) }}
        </span>
        <span v-else-if="hasSearched" class="preview-count preview-count--empty">
          {{ t('wms.settings.sagawa.noOrdersFound', '該当する出荷指示はありません') }}
        </span>
      </div>

      <!-- 検索結果プレビュー / 搜索结果预览 -->
      <div v-if="matchedOrders.length > 0" class="preview-table-wrapper">
        <table class="o-list-table">
          <thead>
            <tr>
              <th style="width: 40px"><input type="checkbox" :checked="allSelected" @change="toggleSelectAll" /></th>
              <th>{{ t('wms.settings.sagawa.orderNumber', '注文番号') }}</th>
              <th>{{ t('wms.settings.sagawa.recipient', 'お届け先') }}</th>
              <th>{{ t('wms.settings.sagawa.shipPlanDate', '出荷予定日') }}</th>
              <th>{{ t('wms.settings.sagawa.status', 'ステータス') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in matchedOrders" :key="order._id">
              <td><input type="checkbox" :checked="selectedIds.has(order._id)" @change="toggleSelect(order._id)" /></td>
              <td>{{ order.orderNumber }}</td>
              <td>{{ order.recipient?.name1 || order.recipient?.name || '-' }}</td>
              <td>{{ order.shipPlanDate || '-' }}</td>
              <td>
                <span v-if="order.status?.shipped?.isShipped" class="o-badge o-badge-success">{{ t('wms.settings.sagawa.statusShipped', '出荷済') }}</span>
                <span v-else-if="order.status?.printed?.isPrinted" class="o-badge o-badge-info">{{ t('wms.settings.sagawa.statusPrintedBadge', '印刷済') }}</span>
                <span v-else-if="order.status?.confirm?.isConfirmed" class="o-badge o-badge-warning">{{ t('wms.settings.sagawa.statusConfirmedBadge', '確定済') }}</span>
                <span v-else class="o-badge o-badge-default">{{ t('wms.settings.sagawa.statusUnprocessed', '未処理') }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="matchedOrders.length > 0" class="action-row">
        <OButton variant="primary" :disabled="selectedIds.size === 0 || exporting" @click="handleExport">
          {{ exporting ? t('wms.settings.sagawa.csvExporting', 'CSV出力中...') : t('wms.settings.sagawa.csvExportButton', `CSV出力（${selectedIds.size}件）`) }}
        </OButton>
      </div>
    </section>

    <!-- ── 追跡番号取込セクション / 追踪号导入区域 ── -->
    <section class="settings-section">
      <h3 class="section-title">{{ t('wms.settings.sagawa.trackingImportTitle', '追跡番号取込（e飛伝 → WMS）') }}</h3>
      <p class="section-description">{{ t('wms.settings.sagawa.trackingImportDescription', 'e飛伝から出力された追跡番号付き CSV をアップロードして、出荷指示に追跡番号を反映します。') }}</p>

      <div class="form-row">
        <div class="o-form-group" style="flex: 2">
          <label class="form-label">{{ t('wms.settings.sagawa.csvFile', 'CSV ファイル') }}</label>
          <input
            ref="fileInputRef"
            type="file"
            accept=".csv"
            class="o-input"
            @change="handleFileSelect"
          />
        </div>
      </div>

      <!-- 解析結果プレビュー / 解析结果预览 -->
      <div v-if="parsedTrackingRows.length > 0" class="preview-table-wrapper">
        <table class="o-list-table">
          <thead>
            <tr>
              <th>{{ t('wms.settings.sagawa.orderNumber', '注文番号') }}</th>
              <th>{{ t('wms.settings.sagawa.trackingNumber', '追跡番号') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in parsedTrackingRows" :key="idx">
              <td>{{ row.orderNumber }}</td>
              <td>{{ row.trackingNumber }}</td>
            </tr>
          </tbody>
        </table>
        <p class="preview-count">{{ t('wms.settings.sagawa.trackingDetected', `${parsedTrackingRows.length}件の追跡番号が検出されました`) }}</p>
      </div>

      <div v-if="parsedTrackingRows.length > 0" class="action-row">
        <OButton variant="primary" :disabled="importing" @click="handleImport">
          {{ importing ? t('wms.settings.sagawa.importing', '取込中...') : t('wms.settings.sagawa.applyTracking', '追跡番号を反映') }}
        </OButton>
        <OButton variant="secondary" @click="clearTracking">{{ t('wms.settings.sagawa.clear', 'クリア') }}</OButton>
      </div>

      <!-- 取込結果 / 导入结果 -->
      <div v-if="importResult" class="import-result">
        <p>{{ t('wms.settings.sagawa.importResult', '取込結果') }}: <strong>{{ importResult.updated }}{{ t('wms.settings.sagawa.itemsUnit', '件') }}</strong> {{ t('wms.settings.sagawa.updated', '更新') }} / {{ importResult.skipped }}{{ t('wms.settings.sagawa.itemsUnit', '件') }} {{ t('wms.settings.sagawa.skipped', 'スキップ') }}（{{ t('wms.settings.sagawa.total', '合計') }} {{ importResult.total }}{{ t('wms.settings.sagawa.itemsUnit', '件') }}）</p>
      </div>
    </section>

    <!-- ── 送り状種類一覧セクション / 送状类型列表区域 ── -->
    <section class="settings-section">
      <h3 class="section-title">{{ t('wms.settings.sagawa.invoiceTypesTitle', '送り状種類一覧') }}</h3>
      <p class="section-description">{{ t('wms.settings.sagawa.invoiceTypesDescription', '佐川急便で利用可能な送り状種類です。') }}</p>

      <div v-if="invoiceTypes.length > 0" class="preview-table-wrapper">
        <table class="o-list-table">
          <thead>
            <tr>
              <th style="width: 100px">{{ t('wms.settings.sagawa.code', 'コード') }}</th>
              <th>{{ t('wms.settings.sagawa.name', '名称') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in invoiceTypes" :key="t.invoiceType">
              <td>{{ t.invoiceType }}</td>
              <td>{{ t.name }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="empty-text">{{ t('wms.settings.sagawa.loading', '読み込み中...') }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, reactive } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useToast } from '@/composables/useToast'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import {
  exportSagawaCsv,
  importSagawaTracking,
  fetchSagawaInvoiceTypes,
  type SagawaInvoiceType,
  type SagawaTrackingImportResult,
} from '@/api/sagawa'
import { fetchShipmentOrdersPage } from '@/api/shipmentOrders'

const { t } = useI18n()
const { show: showToast } = useToast()

// ── 定数 / 定数 ──
const PACKAGE_SIZES = ['60', '80', '100', '140', '160', '170']

// ── 送り状種類 / 送状类型 ──
const invoiceTypes = ref<SagawaInvoiceType[]>([])

// ── CSV 出力 / CSV 导出 ──
const exportFilters = reactive({
  shipPlanDateFrom: '',
  shipPlanDateTo: '',
  status: '',
})

const exportConfig = reactive({
  billingCode: '',
  defaultInvoiceType: '',
  productNameRuleType: '' as '' | 'front' | 'back' | 'fixed',
  productNameMaxChars: 16,
  productNameFixedText: '',
  multiSkuMode: 'first' as 'first' | 'count' | 'concat',
  defaultSize: '',
})

const searchingOrders = ref(false)
const hasSearched = ref(false)
const matchedOrders = ref<any[]>([])
const selectedIds = ref<Set<string>>(new Set())
const exporting = ref(false)

const allSelected = computed(() =>
  matchedOrders.value.length > 0 && selectedIds.value.size === matchedOrders.value.length,
)

/**
 * 出荷指示を検索 / 出荷指示を検索
 */
const searchOrders = async () => {
  searchingOrders.value = true
  hasSearched.value = false
  matchedOrders.value = []
  selectedIds.value = new Set()

  try {
    // 构建搜索条件 / 検索条件を構築
    const q: Record<string, { operator: string; value: any }> = {
      // 佐川のみ / 佐川のみ
      carrierCode: { operator: 'is', value: 'sagawa' },
    }

    if (exportFilters.shipPlanDateFrom) {
      q['shipPlanDate'] = { operator: 'gte', value: exportFilters.shipPlanDateFrom }
    }
    if (exportFilters.shipPlanDateTo) {
      // 如果同时有 from 和 to，使用 between / from と to の両方がある場合は between を使用
      if (exportFilters.shipPlanDateFrom) {
        q['shipPlanDate'] = {
          operator: 'between',
          value: [exportFilters.shipPlanDateFrom, exportFilters.shipPlanDateTo],
        }
      } else {
        q['shipPlanDate'] = { operator: 'lte', value: exportFilters.shipPlanDateTo }
      }
    }

    if (exportFilters.status === 'unshipped') {
      q['status.shipped.isShipped'] = { operator: 'is', value: false }
    } else if (exportFilters.status === 'confirmed') {
      q['status.confirm.isConfirmed'] = { operator: 'is', value: true }
    } else if (exportFilters.status === 'printed') {
      q['status.printed.isPrinted'] = { operator: 'is', value: true }
    }

    const result = await fetchShipmentOrdersPage({
      page: 1,
      limit: 500,
      q,
      sortBy: 'shipPlanDate',
      sortOrder: 'asc',
    })

    matchedOrders.value = result.items || []
    // 默认全选 / デフォルトで全選択
    selectedIds.value = new Set(matchedOrders.value.map((o: any) => o._id))
    hasSearched.value = true
  } catch (error: any) {
    showToast(error?.message || '検索に失敗しました', 'danger')
  } finally {
    searchingOrders.value = false
  }
}

const toggleSelectAll = () => {
  if (allSelected.value) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(matchedOrders.value.map((o: any) => o._id))
  }
}

const toggleSelect = (id: string) => {
  const next = new Set(selectedIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  selectedIds.value = next
}

/**
 * CSV 出力 / CSV 导出
 */
const handleExport = async () => {
  if (selectedIds.value.size === 0) return
  exporting.value = true

  try {
    const config: Record<string, any> = {}
    if (exportConfig.billingCode) config.billingCode = exportConfig.billingCode
    if (exportConfig.defaultInvoiceType) config.defaultInvoiceType = exportConfig.defaultInvoiceType
    if (exportConfig.defaultSize) config.defaultSize = exportConfig.defaultSize
    if (exportConfig.multiSkuMode) config.multiSkuMode = exportConfig.multiSkuMode

    // 品名印字規則 / 品名印字ルール
    if (exportConfig.productNameRuleType === 'front') {
      config.productNameRule = { type: 'front', maxChars: exportConfig.productNameMaxChars || 16 }
    } else if (exportConfig.productNameRuleType === 'back') {
      config.productNameRule = { type: 'back', maxChars: exportConfig.productNameMaxChars || 16 }
    } else if (exportConfig.productNameRuleType === 'fixed' && exportConfig.productNameFixedText) {
      config.productNameRule = { type: 'fixed', text: exportConfig.productNameFixedText }
    }

    const blob = await exportSagawaCsv({
      orderIds: Array.from(selectedIds.value),
      config: Object.keys(config).length > 0 ? config : undefined,
    })

    // ダウンロード / 下载
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sagawa_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    showToast(`${selectedIds.value.size}件の CSV を出力しました`, 'success')
  } catch (error: any) {
    showToast(error?.message || 'CSV出力に失敗しました', 'danger')
  } finally {
    exporting.value = false
  }
}

// ── 追跡番号取込 / 追踪号导入 ──
const fileInputRef = ref<HTMLInputElement | null>(null)
const trackingCsvContent = ref('')
const parsedTrackingRows = ref<Array<{ orderNumber: string; trackingNumber: string }>>([])
const importing = ref(false)
const importResult = ref<SagawaTrackingImportResult | null>(null)

/**
 * CSV ファイル選択 / CSV 文件选择
 */
const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  importResult.value = null

  const reader = new FileReader()
  reader.onload = (e) => {
    const content = e.target?.result as string
    trackingCsvContent.value = content
    parseTrackingPreview(content)
  }
  reader.readAsText(file, 'Shift_JIS')
}

/**
 * 追跡番号 CSV をプレビュー解析 / 追踪号 CSV 预览解析
 *
 * 简单前端解析用于预览，实际取込は后端で行う。
 * フロントエンドの簡易解析はプレビュー用。実際の取込はバックエンドで行う。
 */
const parseTrackingPreview = (csv: string) => {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) {
    parsedTrackingRows.value = []
    return
  }

  const headers = lines[0].split(',').map((h) => h.replace(/"/g, '').trim())
  const orderIdx = headers.findIndex((h) => h.includes('管理番号') || h.includes('注文番号'))
  const trackIdx = headers.findIndex(
    (h) => h.includes('送り状') || h.includes('問い合せ') || h.includes('問合せ') || h.includes('追跡'),
  )

  if (orderIdx < 0 || trackIdx < 0) {
    showToast('注文番号列または追跡番号列が見つかりません', 'warning')
    parsedTrackingRows.value = []
    return
  }

  const rows: Array<{ orderNumber: string; trackingNumber: string }> = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.replace(/"/g, '').trim())
    const orderNumber = cols[orderIdx] || ''
    const trackingNumber = cols[trackIdx] || ''
    if (orderNumber && trackingNumber) {
      rows.push({ orderNumber, trackingNumber })
    }
  }
  parsedTrackingRows.value = rows
}

/**
 * 追跡番号を反映 / 追踪号反映
 */
const handleImport = async () => {
  if (!trackingCsvContent.value) return
  importing.value = true
  importResult.value = null

  try {
    const result = await importSagawaTracking(trackingCsvContent.value)
    importResult.value = result
    showToast(`${result.updated}件の追跡番号を反映しました`, 'success')
  } catch (error: any) {
    showToast(error?.message || '追跡番号の取込に失敗しました', 'danger')
  } finally {
    importing.value = false
  }
}

const clearTracking = () => {
  trackingCsvContent.value = ''
  parsedTrackingRows.value = []
  importResult.value = null
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

// ── 初期化 / 初始化 ──
onMounted(async () => {
  try {
    invoiceTypes.value = await fetchSagawaInvoiceTypes()
  } catch (error: any) {
    showToast(error?.message || '送り状種類の取得に失敗しました', 'danger')
  }
})
</script>

<style scoped>
.sagawa-settings {
  padding: 0 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

.settings-section {
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #ebeef5);
  border-radius: var(--o-border-radius, 4px);
  padding: 20px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--o-gray-700, #303133);
  margin: 0 0 4px;
}

.section-description {
  font-size: 13px;
  color: var(--o-gray-500, #909399);
  margin: 0 0 16px;
}

.form-row {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}

.form-row .o-form-group {
  flex: 1;
}

.o-form-group {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  font-size: var(--o-font-size-small, 13px);
  font-weight: 500;
  color: var(--o-gray-700, #303133);
  margin-bottom: 0.25rem;
}

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

.action-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.preview-count {
  font-size: 13px;
  color: var(--o-gray-600, #606266);
}

.preview-count--empty {
  color: var(--o-gray-500, #909399);
}

.preview-table-wrapper {
  max-height: 400px;
  overflow: auto;
  margin-top: 12px;
  margin-bottom: 8px;
}

/* .o-list-table base styles are defined globally in style.css */

.o-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.o-badge-success {
  background: #f0f9eb;
  color: #67c23a;
}

.o-badge-info {
  background: #f4f4f5;
  color: #909399;
}

.o-badge-warning {
  background: #fdf6ec;
  color: #e6a23c;
}

.o-badge-default {
  background: #f4f4f5;
  color: #606266;
}

.import-result {
  margin-top: 12px;
  padding: 12px 16px;
  background: #f0f9eb;
  border: 1px solid #e1f3d8;
  border-radius: 4px;
  font-size: 13px;
  color: #67c23a;
}

.empty-text {
  font-size: 13px;
  color: var(--o-gray-500, #909399);
}
</style>
