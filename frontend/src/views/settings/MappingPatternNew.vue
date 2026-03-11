<template>
  <div class="mapping-pattern-new">
    <div class="top-bar">
      <div class="top-left">
        <div class="field">
          <div class="label">レイアウトタイプ</div>
          <select v-model="configType" class="o-input" style="width: 260px" @change="onConfigTypeChange" :disabled="isLocked">
            <option value="order-to-carrier">送り状データ</option>
            <option value="ec-company-to-order">出荷予定データ</option>
            <option value="order-to-sheet">出荷明細リスト出力(csv)</option>
            <option value="product">商品マスタ</option>
            <option value="order-source-company">ご依頼主マスタ</option>
          </select>
        </div>
        <div class="field" v-if="configType === 'order-to-carrier'">
          <div class="label">配送会社</div>
          <select
            v-model="carrierId"
            class="o-input"
            style="width: 260px"
            @change="onCarrierChange"
            :disabled="isLocked"
          >
            <option value="" disabled>配送会社を選択</option>
            <option v-for="c in carrierOptions" :key="c._id" :value="c._id">{{ c.name }}</option>
          </select>
        </div>
        <div
          class="field"
          v-if="
            configType === 'ec-company-to-order' ||
            configType === 'product' ||
            configType === 'order-source-company'
          "
        >
          <div class="label">ファイルアップロード</div>
          <div class="upload-row">
            <input
              ref="fileInputRef"
              type="file"
              accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              class="hidden-input"
              @change="onNativeFileSelect"
            />
            <button class="o-btn o-btn-primary" @click="fileInputRef?.click()">ファイルを選択</button>
            <select v-model="encoding" class="o-input" style="width: 160px">
              <option value="shift_jis">Shift_JIS (既定)</option>
              <option value="utf-8">UTF-8</option>
              <option value="utf-8-sig">UTF-8 (BOM)</option>
              <option value="gbk">GBK/GB18030</option>
            </select>
          </div>
          <div class="hint">CSV/TSV をアップロードすると右側 入力元（Source）にプレビューされます</div>
        </div>
      </div>
      <div class="top-right">
        <div class="field">
          <div class="label">サンプルデータ</div>
          <button class="o-btn o-btn-secondary" @click="loadSampleOrders">注文サンプルを読み込む</button>
        </div>
        <div class="field">
          <div class="label">レイアウト名</div>
          <input v-model="configName" class="o-input" style="width: 200px" placeholder="レイアウト名を入力" />
        </div>
        <div class="field">
          <div class="label">説明</div>
          <input v-model="configDescription" class="o-input" style="width: 200px" placeholder="説明（任意）" />
        </div>
        <div class="field">
          <button class="o-btn o-btn-primary" @click="handleSave" :disabled="!canSave">
            保存
          </button>
          <button class="o-btn o-btn-secondary" @click="handleLoad" style="margin-left: 8px">読み込み</button>
        </div>
      </div>
    </div>

    <div class="tables-row">
      <div class="table-card">
        <div class="table-title">
          出力先（Target）
          <!-- order-to-sheet 自定义字段管理 -->
          <template v-if="configType === 'order-to-sheet'">
            <div class="custom-target-controls">
              <input
                v-model="newCustomTargetField"
                class="o-input"
                placeholder="新しい出力項目名"
                style="width: 160px; margin-left: 16px"
                @keyup.enter="addCustomTargetField"
              />
              <button class="o-btn o-btn-primary" @click="addCustomTargetField" :disabled="!newCustomTargetField.trim()">
                追加
              </button>
              <button
                class="o-btn o-btn-danger"
                @click="removeSelectedCustomTargetField"
                :disabled="!selectedTarget || !isCustomTargetField(selectedTarget.field)"
              >
                選択項目を削除
              </button>
            </div>
          </template>
        </div>
        <div class="target-table-wrap" style="height: 520px; overflow-y: auto;">
          <table class="o-list-table target-table">
            <thead>
              <tr>
                <th style="width: 70px">必須</th>
                <th style="min-width: 220px">項目名</th>
                <th style="min-width: 240px">変換内容</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="row in targetRowsComputed" :key="row.field">
                <tr
                  :class="{ 'row-selected': selectedTarget?.field === row.field }"
                  @click="onSelectTarget(row)"
                  style="cursor: pointer"
                >
                  <td>
                    <span class="o-badge" :class="row.required ? 'o-badge-danger' : 'o-badge-info'">
                      {{ row.required ? '必須' : '任意' }}
                    </span>
                  </td>
                  <td>
                    <div
                      :class="{ 'product-child-item': row.field?.startsWith('products.0') }"
                      style="display: flex; align-items: center; gap: 4px"
                    >
                      <span>{{ row.label || row.field }}</span>
                      <span v-if="row.isExpandable" class="o-badge o-badge-info" style="margin-left: 4px">展開のみ</span>
                      <span
                        v-if="getFieldHint(row.field)"
                        :title="getFieldHint(row.field) ?? ''"
                        style="color: #909399; cursor: help; font-size: 14px"
                      >&#9432;</span>
                    </div>
                  </td>
                  <td>
                    <!-- 如果是可展开的 products，显示其子项的映射 -->
                    <template v-if="row.isExpandable && row.field === 'products' && row.children">
                      <div v-for="child in row.children" :key="child.field" style="margin-bottom: 4px">
                        <span class="pipeline-chip" v-if="mappings[child.field]" style="display: inline-block; font-size: 11px">
                          {{ child.label }}: {{ summaryForMapping(mappings[child.field]) }}
                        </span>
                        <span class="pipeline-chip empty" v-else style="display: inline-block; font-size: 11px">
                          {{ child.label }}: 未設定
                        </span>
                      </div>
                    </template>
                    <template v-else>
                      <span class="pipeline-chip" v-if="mappings[row.field]">
                        {{ summaryForMapping(mappings[row.field]) }}
                      </span>
                      <span class="pipeline-chip empty" v-else>未設定</span>
                    </template>
                  </td>
                </tr>
                <!-- Render children rows for tree-like products -->
                <template v-if="row.isExpandable && row.children">
                  <tr
                    v-for="child in row.children"
                    :key="child.field"
                    :class="{ 'row-selected': selectedTarget?.field === child.field }"
                    @click="onSelectTarget(child)"
                    style="cursor: pointer; background-color: #f9fafc"
                  >
                    <td>
                      <span class="o-badge" :class="child.required ? 'o-badge-danger' : 'o-badge-info'">
                        {{ child.required ? '必須' : '任意' }}
                      </span>
                    </td>
                    <td>
                      <div class="product-child-item" style="display: flex; align-items: center; gap: 4px">
                        <span>{{ child.label || child.field }}</span>
                      </div>
                    </td>
                    <td>
                      <span class="pipeline-chip" v-if="mappings[child.field]">
                        {{ summaryForMapping(mappings[child.field]) }}
                      </span>
                      <span class="pipeline-chip empty" v-else>未設定</span>
                    </td>
                  </tr>
                </template>
              </template>
            </tbody>
          </table>
        </div>
      </div>

      <div class="middle-buttons">
        <!-- 特殊字段：products 本身不能被设置（只能设置子项） -->
        <template v-if="selectedTarget?.isExpandable && selectedTarget?.field === 'products'">
          <div class="o-alert o-alert-info" style="margin-bottom: 10px">
            「商品」は展開のみ可能です。子項目（SKU、数量、商品名）を選択して設定してください。
          </div>
          <button class="o-btn o-btn-danger" :disabled="!selectedTarget" @click="clearSelected">
            クリア
          </button>
          <button class="o-btn o-btn-danger" @click="clearAll">全てクリア</button>
        </template>

        <!-- 特殊字段：handlingTags / barcode(string[]) 的专用按钮 -->
        <template
          v-else-if="
            selectedTarget?.field === 'handlingTags' ||
            (configType === 'product' && selectedTarget?.field === 'barcode')
          "
        >
          <button
            v-if="configType === 'product' && selectedTarget?.field === 'barcode'"
            class="o-btn o-btn-primary"
            :disabled="!selectedTarget"
            @click="openBarcodeMappingDialog"
          >
            バーコードレイアウト設定
          </button>
          <button
            v-if="selectedTarget?.field === 'handlingTags'"
            class="o-btn o-btn-primary"
            :disabled="!selectedTarget"
            @click="openHandlingTagsMappingDialog"
          >
            荷扱いタグレイアウト設定
          </button>
          <button class="o-btn o-btn-danger" :disabled="!selectedTarget" @click="clearSelected">
            クリア
          </button>
          <button class="o-btn o-btn-danger" @click="clearAll">全てクリア</button>
        </template>

        <!-- Source 选择 product 时的特殊按钮 -->
        <template v-else-if="selectedSources.length === 1 && selectedSources[0]?.name === 'products'">
          <button
            class="o-btn o-btn-primary"
            :disabled="!selectedTarget"
            @click="openProductToStringTransform"
          >
            商品を文字列に変換
          </button>
          <button class="o-btn o-btn-danger" :disabled="!selectedTarget" @click="clearSelected">
            クリア
          </button>
          <button class="o-btn o-btn-danger" @click="clearAll">全てクリア</button>
        </template>

        <!-- Source 选择 handlingTags 时的特殊按钮 -->
        <template v-else-if="selectedSources.length === 1 && selectedSources[0]?.name === 'handlingTags'">
          <button
            class="o-btn o-btn-primary"
            :disabled="!selectedTarget"
            @click="openHandlingTagsIndexDialog"
          >
            配列要素を取得
          </button>
          <button class="o-btn o-btn-danger" :disabled="!selectedTarget" @click="clearSelected">
            クリア
          </button>
          <button class="o-btn o-btn-danger" @click="clearAll">全てクリア</button>
        </template>

        <!-- 默认按钮 -->
        <template v-else>
          <!-- order-to-sheet 快捷添加按钮 -->
          <button
            v-if="configType === 'order-to-sheet'"
            class="o-btn o-btn-success"
            :disabled="selectedSources.length !== 1"
            @click="handleQuickAddFromSource"
          >
            &lt;&lt; 項目を追加
          </button>
          <button
            class="o-btn o-btn-primary"
            :disabled="!selectedTarget || selectedSources.length === 0"
            @click="handleDirectLink"
          >
            &lt;&lt; 紐付け
          </button>
          <button
            class="o-btn o-btn-warning"
            :disabled="!selectedTarget"
            @click="handleAddLiteral"
          >
            固定値を追加
          </button>
          <button
            class="o-btn o-btn-primary"
            :disabled="!selectedTarget"
            @click="openTransformDialog"
          >
            &lt;&lt; 変換付き紐付け
          </button>
          <button
            class="o-btn o-btn-secondary"
            :disabled="!selectedTarget"
            @click="openDetailDialog"
          >
            紐付け項目の詳細設定
          </button>
          <button class="o-btn o-btn-danger" :disabled="!selectedTarget" @click="clearSelected">
            クリア
          </button>
          <button class="o-btn o-btn-danger" @click="clearAll">全てクリア</button>
        </template>
      </div>

      <div class="table-card">
        <div class="table-title">入力元（Source）</div>
        <div class="source-table-wrap" style="height: 520px; overflow-y: auto;">
          <table class="o-list-table source-table">
            <thead>
              <tr>
                <th style="min-width: 240px">項目名</th>
                <th style="min-width: 200px">使用中の出力先</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="sourceRowsComputed.length === 0">
                <td colspan="2" style="text-align: center; color: #999; padding: 20px">
                  {{ sourceTableEmptyText }}
                </td>
              </tr>
              <tr
                v-for="row in sourceRowsComputed"
                :key="row.name"
                @click="onSelectSource(row)"
                :class="{ 'row-selected': isSourceSelected(row) }"
                style="cursor: pointer"
              >
                <td>
                  <input
                    type="checkbox"
                    :checked="isSourceSelected(row)"
                    style="margin-right: 8px; pointer-events: none"
                  />
                  {{ row.label || row.name }}
                </td>
                <td>
                  <div class="used-by-targets">
                    <span
                      v-for="targetField in getUsedByTargets(row.name)"
                      :key="targetField"
                      class="o-badge o-badge-info"
                      style="margin-right: 4px; margin-bottom: 4px"
                    >
                      {{ getTargetDisplayName(targetField) }}
                    </span>
                    <span v-if="getUsedByTargets(row.name).length === 0" class="empty-text">
                      未使用
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Target 字段说明（左下角） -->
    <div v-if="selectedTarget" class="target-description-box">
      <div class="target-description-title">フィールド説明</div>
      <div class="target-description-content">
        {{ getTargetDescription(selectedTarget.field) || '（説明なし）' }}
      </div>
    </div>

    <mapping-detail-dialog
      v-model="detailDialogVisible"
      :target="selectedTarget"
      :mapping="selectedTarget ? (mappings[selectedTarget.field] ?? null) : null"
      :pre-selected-sources="preSelectedSources"
      :sample-row="resolvedSampleRow"
      :config-type="configType"
      :carrier-id="carrierId"
      :carrier-options="carrierOptions"
      @submit="applyDetailMapping"
    />

    <!-- 移除 product-mapping-dialog（不再需要） -->

    <handling-tags-mapping-dialog
      v-model="handlingTagsMappingDialogVisible"
      :available-columns="availableSourceColumns"
      :sample-row="resolvedSampleRow"
      :target-field="selectedTarget?.field || ''"
      @submit="applyHandlingTagsMapping"
    />

    <handling-tags-index-dialog
      v-model="handlingTagsIndexDialogVisible"
      :target="selectedTarget"
      :sample-row="resolvedSampleRow"
      @submit="applyHandlingTagsIndex"
    />

    <barcode-mapping-dialog
      v-model="barcodeMappingDialogVisible"
      :available-columns="availableSourceColumns"
      :sample-row="resolvedSampleRow"
      :target-field="selectedTarget?.field || ''"
      @submit="applyBarcodeMapping"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { fetchShipmentOrders } from '@/api/shipmentOrders'
import { getOrderFieldDefinitions } from '@/types/order'
import { getProductFieldDefinitions } from '@/types/product'
import { fetchCarriers } from '@/api/carrier'
import * as XLSX from 'xlsx'
import {
  createMappingConfig,
  getMappingConfigById,
  updateMappingConfig,
  getAllMappingConfigs,
  type TransformMapping as ApiTransformMapping,
  type MappingConfig,
} from '@/api/mappingConfig'
import MappingDetailDialog from '@/components/mapping/MappingDetailDialog.vue'
import HandlingTagsMappingDialog from '@/components/mapping/HandlingTagsMappingDialog.vue'
import HandlingTagsIndexDialog from '@/components/mapping/HandlingTagsIndexDialog.vue'
import BarcodeMappingDialog from '@/components/mapping/BarcodeMappingDialog.vue'

type ValueKind = 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'json' | 'any'

interface TransformStep {
  id: string
  plugin: string
  params?: any
  enabled?: boolean
  onError?: { mode: 'fail' | 'fallback' | 'skip'; value?: any }
}

interface TransformPipeline {
  steps: TransformStep[]
}

type InputSource =
  | { id: string; type: 'column'; column: string; pipeline?: TransformPipeline }
  | { id: string; type: 'literal'; value: any; pipeline?: TransformPipeline }
  | { id: string; type: 'generated'; generator: 'now' | 'uuid' | string; generatorParams?: any; pipeline?: TransformPipeline }

interface CombineConfig {
  plugin: string
  params?: any
}

interface TransformMapping {
  targetField: string
  inputs: InputSource[]
  combine: CombineConfig
  outputPipeline?: TransformPipeline
  required?: boolean
  defaultValue?: any
}

interface TargetRow {
  field: string
  required: boolean
  label?: string
  children?: TargetRow[] // 用于树形结构
  isExpandable?: boolean // 是否可展开（但不可设置）
}

interface SourceRow {
  name: string
  label?: string
}

const route = useRoute()
const encoding = ref<'shift_jis' | 'utf-8' | 'utf-8-sig' | 'gbk'>('shift_jis')
const configType = ref<string>('ec-company-to-order')
const carrierId = ref<string | null>(null)
const carrierOptions = ref<any[]>([])
const configName = ref<string>('')
const configDescription = ref<string>('')
const currentConfigId = ref<string | null>(null)

// File input ref for native upload
const fileInputRef = ref<HTMLInputElement | null>(null)

// Locked mode - when navigating from carrier automation settings
const isLocked = ref(false)

// 从 order.ts 获取字段定义
const orderFieldDefinitions = getOrderFieldDefinitions()
const orderFieldLabels: Record<string, string> = {}
orderFieldDefinitions.forEach((def) => {
  if (def.title && def.dataKey) {
    orderFieldLabels[def.dataKey] = def.title
  }
})

// product 字段定义（用于商品マスタ mapping）
const productFieldDefinitions = getProductFieldDefinitions()
const productFieldLabels: Record<string, string> = {}
productFieldDefinitions.forEach((def) => {
  if (def.title && def.dataKey) {
    productFieldLabels[def.dataKey] = def.title
  }
})

// 过滤出用户可以上传的字段（用于 mapping）
const getUploadableOrderFields = (): TargetRow[] => {
  return orderFieldDefinitions
    .filter((def) => {
      // 排除非显示字段和示例字段
      if (!def.dataKey) return false
      if (def.tableVisible === false) return false
      if (def.dataKey.startsWith('__mappingExample_')) return false
      // 排除系统自动生成的字段（用户不能上传）
      if (def.formEditable === false) return false
      // 排除系统字段
      if (['orderNumber', 'createdAt', 'updatedAt', 'sourceRawRows', 'carrierRawRow'].includes(def.dataKey)) {
        return false
      }
      return true
    })
    .map((def) => ({
      field: def.dataKey!,
      required: def.required ?? false,
      label: def.title || def.dataKey!,
    }))
}

const targetOrderFields: TargetRow[] = getUploadableOrderFields()

// order を Source として使う時の除外フィールド
const isExcludedOrderSourceField = (fieldName: string): boolean => {
  if (!fieldName) return true
  // 明示除外
  const excluded = new Set(['status', 'sourceRawRows', 'carrierRawRow', 'createdAt', 'updatedAt'])
  if (excluded.has(fieldName)) return true
  // status 配下（例: status.carrierReceipt.isReceived）も除外
  if (fieldName.startsWith('status.')) return true
  return false
}

// order を Source として使う時は「全フィールド（アップロード可否に関わらず）」を表示する
const getAllOrderSourceFields = (): SourceRow[] => {
  // 当 order 作为 source 时，保持 products 字段不拆开，并放在最后
  const fields = orderFieldDefinitions
    .filter((def) => {
      if (!def.dataKey) return false
      if (def.dataKey.startsWith('__mappingExample_')) return false
      if (isExcludedOrderSourceField(def.dataKey)) return false
      return true
    })
    .map((def) => ({
      name: def.dataKey!,
      label: def.title || def.dataKey!,
    }))

  // 将 products 字段移到数组最后
  const productsIndex = fields.findIndex((f) => f.name === 'products')
  if (productsIndex !== -1) {
    const productsField = fields[productsIndex]
    if (productsField) {
      fields.splice(productsIndex, 1)
      fields.push(productsField)
    }
  }

  return fields
}

// 过滤出用户可以上传的 product 字段（用于商品マスタ mapping）
const getUploadableProductFields = (): TargetRow[] => {
  return productFieldDefinitions
    .filter((def: any) => {
      if (!def.dataKey) return false
      if (def.tableVisible === false) return false
      if (def.formEditable === false) return false
      // 排除系统字段
      if (['createdAt', 'updatedAt', '_id'].includes(def.dataKey)) return false
      return true
    })
    .map((def: any) => ({
      field: def.dataKey!,
      required: def.required ?? false,
      label: def.title || def.dataKey!,
    }))
}

const targetProductFields: TargetRow[] = getUploadableProductFields()

const carrierFieldTemplates: Record<string, TargetRow[]> = {
  default: [
    { field: 'shipper.postalCode', required: true },
    { field: 'shipper.address', required: true },
    { field: 'shipper.name', required: true },
    { field: 'shipper.phone', required: true },
    { field: 'recipient.postalCode', required: true },
    { field: 'recipient.address', required: true },
    { field: 'recipient.name', required: true },
    { field: 'recipient.phone', required: true },
    { field: 'delivery.shipDate', required: true },
    { field: 'delivery.deliveryDate', required: false },
    { field: 'delivery.timeSlot', required: false },
    { field: 'packageSummary.pieces', required: true },
  ],
}

const sourceUploadRows = ref<SourceRow[]>([])
const sourceOrderRows = ref<SourceRow[]>([])

// order-to-sheet 自定义 Target 字段
const customTargetFields = ref<string[]>([])
const newCustomTargetField = ref<string>('')

const addCustomTargetField = () => {
  const fieldName = newCustomTargetField.value.trim()
  if (!fieldName) return
  if (customTargetFields.value.includes(fieldName)) {
    alert('この項目名は既に存在します')
    return
  }
  customTargetFields.value = [...customTargetFields.value, fieldName]
  newCustomTargetField.value = ''
  alert('項目を追加しました')
}

const removeSelectedCustomTargetField = () => {
  if (!selectedTarget.value) return
  const fieldToRemove = selectedTarget.value.field
  if (!customTargetFields.value.includes(fieldToRemove)) {
    alert('この項目は削除できません')
    return
  }
  // Remove from customTargetFields
  customTargetFields.value = customTargetFields.value.filter((f) => f !== fieldToRemove)
  // Remove from mappings
  const next = { ...mappings.value }
  delete next[fieldToRemove]
  mappings.value = next
  selectedTarget.value = null
  alert('項目を削除しました')
}

const isCustomTargetField = (field: string): boolean => {
  return customTargetFields.value.includes(field)
}

// order-to-sheet 快捷添加：从右侧选中的 source 一键添加同名 target 并映射
const handleQuickAddFromSource = () => {
  if (configType.value !== 'order-to-sheet') return
  if (selectedSources.value.length !== 1) return

  const source = selectedSources.value[0]
  if (!source) return

  // 使用 source 的 label 作为 target 字段名（如果有的话），否则使用 name
  const fieldName = source.label || source.name

  // 如果该字段名已存在，提示用户
  if (customTargetFields.value.includes(fieldName)) {
    alert(`「${fieldName}」は既に存在します`)
    return
  }

  // 添加到 customTargetFields
  customTargetFields.value = [...customTargetFields.value, fieldName]

  // 创建映射关系
  const mapping: TransformMapping = {
    targetField: fieldName,
    inputs: [{
      id: 'src-0',
      type: 'column',
      column: source.name,
      pipeline: { steps: [] },
    }],
    combine: { plugin: 'combine.first' },
    outputPipeline: { steps: [] },
    required: false,
  }
  mappings.value = { ...mappings.value, [fieldName]: mapping }

  // 清空选择
  selectedSources.value = []

  alert(`「${fieldName}」を追加しました`)
}

const sampleRows = ref<Record<string, any>[]>([])
const mappings = ref<Record<string, TransformMapping>>({})
const selectedTarget = ref<TargetRow | null>(null)
const selectedSources = ref<SourceRow[]>([])

const detailDialogVisible = ref(false)
const handlingTagsMappingDialogVisible = ref(false)
const handlingTagsIndexDialogVisible = ref(false)
const barcodeMappingDialogVisible = ref(false)
const preSelectedSources = ref<SourceRow[]>([])

const currentSampleRow = computed<Record<string, any> | null>(() => sampleRows.value[0] ?? null)

// 解析引用字段的 sample row（用于预览时显示名称而非 ObjectId）
const resolvedSampleRow = computed<Record<string, any> | null>(() => {
  const row = currentSampleRow.value
  if (!row) return null

  const resolved = { ...row }

  // 解析 carrierId → carrierName
  if (resolved.carrierId) {
    const carrier = carrierOptions.value.find((c: any) => c._id === resolved.carrierId)
    if (carrier) {
      resolved.carrierId = carrier.name
    }
  }

  return resolved
})

const availableSourceColumns = computed<string[]>(() => {
  return sourceRowsComputed.value.map((r) => r.name)
})

// 获取字段的提示信息
const getFieldHint = (field: string): string | null => {
  const hints: Record<string, string> = {
    carrierId: 'この項目はCSVから取得する必要はありません。システム設定やデフォルト値から自動的に設定されます。',
    coolType: 'この項目はCSVから取得する必要はありません。システム設定やデフォルト値から自動的に設定されます。',
    'sender.postalCode': 'この項目はCSVから取得する必要はありません。システム設定（依頼主情報）から自動的に設定されます。',
    'sender.prefecture': 'この項目はCSVから取得する必要はありません。システム設定（依頼主情報）から自動的に設定されます。',
    'sender.city': 'この項目はCSVから取得する必要はありません。システム設定（依頼主情報）から自動的に設定されます。',
    'sender.street': 'この項目はCSVから取得する必要はありません。システム設定（依頼主情報）から自動的に設定されます。',
    'sender.name': 'この項目はCSVから取得する必要はありません。システム設定（依頼主情報）から自動的に設定されます。',
    'sender.phone': 'この項目はCSVから取得する必要はありません。システム設定（依頼主情報）から自動的に設定されます。',
    handlingTags: 'この項目はCSVから取得する必要はありません。システム設定やデフォルト値から自動的に設定されます。',
  }
  return hints[field] || null
}

// 获取 target 字段的详细说明
const getTargetDescription = (field: string): string | null => {
  if (!field) return null

  // 如果是 order-to-carrier，从 carrier 的 formatDefinition 获取
  if (configType.value === 'order-to-carrier' && selectedCarrier.value?.formatDefinition?.columns) {
    const col = selectedCarrier.value.formatDefinition.columns.find((c: any) => c.name === field)
    return col?.description || null
  }

  // 如果是 ec-company-to-order，从 order 字段定义获取
  if (configType.value === 'ec-company-to-order') {
    const def = orderFieldDefinitions.find((d) => d.dataKey === field)
    return def?.description || null
  }

  // 如果是 product，从 product 字段定义获取
  if (configType.value === 'product') {
    const def = productFieldDefinitions.find((d: any) => d.dataKey === field)
    return (def as any)?.description || null
  }

  return null
}

const selectedCarrier = computed(() => carrierOptions.value.find((c) => c._id === carrierId.value))

const targetRowsComputed = computed<TargetRow[]>(() => {
  if (configType.value === 'order-to-carrier') {
    const cols: any[] | undefined = selectedCarrier.value?.formatDefinition?.columns
    if (cols && cols.length) {
      const rows = cols.map((c) => ({ field: c.name, required: !!c.required }))

      // 查找 products 字段，将其展开为树形结构并移到最后
      const productsIndex = rows.findIndex((r) => r.field === 'products')
      if (productsIndex !== -1) {
        const productsRow: TargetRow = rows[productsIndex] as TargetRow
        productsRow.label = '商品'
        productsRow.isExpandable = true // 标记为可展开但不可设置
        productsRow.children = [
          { field: 'products.0.sku', required: true, label: '商品SKU管理番号（1件目）' },
          { field: 'products.0.quantity', required: true, label: '数量（1件目）' },
          { field: 'products.0.name', required: false, label: '商品名（1件目）' },
          { field: 'products.0.barcode', required: false, label: '商品バーコード（1件目）' },
        ]
        // 将 products 移到数组最后
        rows.splice(productsIndex, 1)
        rows.push(productsRow)
      }

      return rows
    }
    return []
  }
  if (configType.value === 'product') {
    return targetProductFields
  }
  // order-to-sheet: 使用用户自定义的 Target 字段
  if (configType.value === 'order-to-sheet') {
    return customTargetFields.value.map((fieldName) => ({
      field: fieldName,
      required: false,
      label: fieldName,
    }))
  }
  if (configType.value === 'order-source-company') {
    return [
      { field: 'senderName', required: true, label: '名' },
      { field: 'senderPostalCode', required: true, label: '郵便番号' },
      { field: 'senderAddressPrefecture', required: false, label: '住所（都道府県）' },
      { field: 'senderAddressCity', required: false, label: '住所（郡市区）' },
      { field: 'senderAddressStreet', required: false, label: '住所（それ以降）' },
      { field: 'senderPhone', required: true, label: '電話' },
    ]
  }

  // 对于 ec-company-to-order，也需要展开 products
  const rows: TargetRow[] = [...targetOrderFields]
  const productsIndex = rows.findIndex((r) => r.field === 'products')
  if (productsIndex !== -1 && rows[productsIndex]) {
    const productsRow = rows[productsIndex]!
    productsRow.label = '商品'
    productsRow.isExpandable = true
    productsRow.children = [
      { field: 'products.0.sku', required: true, label: '商品SKU管理番号（1件目）' },
      { field: 'products.0.quantity', required: true, label: '数量（1件目）' },
      { field: 'products.0.name', required: false, label: '商品名（1件目）' },
      { field: 'products.0.barcode', required: false, label: '商品バーコード（1件目）' },
    ]
    // 将 products 移到数组最后
    rows.splice(productsIndex, 1)
    rows.push(productsRow)
  }

  return rows
})

const sourceRowsComputed = computed<SourceRow[]>(() => {
  if (configType.value === 'order-to-carrier') {
    // 如果已经上传了文件，使用上传的列
    if (sourceOrderRows.value.length) {
      return sourceOrderRows.value.filter((r) => !isExcludedOrderSourceField(r.name))
    }
    // 否则，显示全部 order 字段（アップロード可否に関わらず）
    return getAllOrderSourceFields()
  }

  // order-to-sheet: 使用订单字段作为 Source
  if (configType.value === 'order-to-sheet') {
    return getAllOrderSourceFields()
  }

  return sourceUploadRows.value
})

const sourceTableEmptyText = computed(() => {
  if (
    configType.value === 'ec-company-to-order' ||
    configType.value === 'product' ||
    configType.value === 'order-source-company'
  ) {
    return 'ファイルをアップロードしてください'
  }
  return 'データがありません'
})

// 加载编辑的配置
const loadConfigForEdit = async (configId: string) => {
  try {
    const config = await getMappingConfigById(configId)
    if (!config) {
      alert('設定が見つかりませんでした')
      return
    }

    // 先加载 mappings，避免被 watch 清空
    const mappingsObj: Record<string, TransformMapping> = {}
    if (config.mappings && Array.isArray(config.mappings)) {
      for (const mapping of config.mappings as ApiTransformMapping[]) {
        mappingsObj[mapping.targetField] = mapping as TransformMapping
      }
    }

    // 如果是 order-to-sheet，从 mappings 中提取 target 字段作为 customTargetFields
    if (config.configType === 'order-to-sheet') {
      const targetFields = (config.mappings as ApiTransformMapping[]).map((m) => m.targetField)
      customTargetFields.value = targetFields
    }
    // 如果是 파일アップロード型（ec-company-to-order / product），从 mappings 中提取 source 字段
    else if (config.configType !== 'order-to-carrier') {
      const sourceFields = new Set<string>()
      for (const mapping of config.mappings as ApiTransformMapping[]) {
        if (mapping.inputs && Array.isArray(mapping.inputs)) {
          for (const input of mapping.inputs) {
            if (input.type === 'column' && input.column) {
              sourceFields.add(input.column)
            }
          }
        }
      }
      // 将提取的字段添加到 sourceUploadRows
      sourceUploadRows.value = Array.from(sourceFields).map((field) => ({
        name: field,
        label: field,
      }))
    }

    // 设置基本信息（这会触发 watch，清空 mappings，所以要在设置之前先保存）
    currentConfigId.value = config._id
    configName.value = config.name || ''
    configDescription.value = config.description || ''

    // 设置 carrierId（如果是 order-to-carrier 类型，需要在设置 configType 之前）
    if (config.configType === 'order-to-carrier' && config.carrierId) {
      carrierId.value = config.carrierId
    }

    // 最后设置 configType，这会触发 watch 清空 mappings，所以需要在 nextTick 后恢复
    console.log('[loadConfigForEdit] Setting configType to:', config.configType, 'current:', configType.value)
    configType.value = config.configType || 'ec-company-to-order'
    // 在 watch 执行后恢复 mappings
    await nextTick()
    console.log('[loadConfigForEdit] Restoring mappings, keys:', Object.keys(mappingsObj))
    mappings.value = mappingsObj
    console.log('[loadConfigForEdit] After restore, mappings keys:', Object.keys(mappings.value))

    // 如果是 order-to-carrier 或 order-to-sheet，加载样本订单
    if (config.configType === 'order-to-carrier' || config.configType === 'order-to-sheet') {
      await loadSampleOrders()
    }

    alert('設定を読み込みました')
  } catch (e: any) {
    console.error(e)
    alert(e?.message || '設定の読み込みに失敗しました')
  }
}

onMounted(async () => {
  await loadCarriers()

  // Check for locked mode from query parameters (from carrier automation settings)
  const lockedParam = route.query.locked as string | undefined
  const configTypeParam = route.query.configType as string | undefined
  const carrierIdParam = route.query.carrierId as string | undefined

  if (lockedParam === 'true') {
    isLocked.value = true

    // Set config type from query parameters
    if (configTypeParam) {
      configType.value = configTypeParam
    }

    // Handle carrier ID - may be a special identifier like __builtin_yamato_b2__
    if (carrierIdParam) {
      let actualCarrierId = carrierIdParam

      // Check if it's a special identifier and find the actual carrier
      if (carrierIdParam.startsWith('__builtin_')) {
        const carrierCode = carrierIdParam.replace('__builtin_', '').replace(/__$/, '')
        console.log('[MappingPatternNew] Looking for carrier with code:', carrierCode)
        console.log('[MappingPatternNew] Available carriers:', carrierOptions.value.map((c: any) => ({ _id: c._id, code: c.code, name: c.name })))
        // Prefer real carrier (non-builtin) over builtin one
        const realCarrier = carrierOptions.value.find((c: any) => c.code === carrierCode && !c._id.startsWith('__builtin_'))
        const builtinCarrier = carrierOptions.value.find((c: any) => c.code === carrierCode && c._id.startsWith('__builtin_'))
        const carrier = realCarrier || builtinCarrier
        if (carrier) {
          actualCarrierId = carrier._id
          console.log('[MappingPatternNew] Found carrier:', carrier._id, carrier.name, realCarrier ? '(real)' : '(builtin)')
        } else {
          console.warn('[MappingPatternNew] Carrier not found for code:', carrierCode)
        }
      }

      carrierId.value = actualCarrierId
      console.log('[MappingPatternNew] Set carrierId to:', actualCarrierId)

      // Try to load existing mapping config for this carrier
      if (configType.value === 'order-to-carrier' && actualCarrierId) {
        try {
          const existingConfigs = await getAllMappingConfigs('order-to-carrier')
          console.log('[MappingPatternNew] Existing order-to-carrier configs:', existingConfigs.map((c: MappingConfig) => ({ _id: c._id, name: c.name, carrierId: c.carrierId })))
          const existingConfig = existingConfigs.find((c: MappingConfig) => c.carrierId === actualCarrierId)
          if (existingConfig) {
            console.log('[MappingPatternNew] Found matching config:', existingConfig._id, existingConfig.name)
            await loadConfigForEdit(existingConfig._id)
            console.log('[MappingPatternNew] After loadConfigForEdit, mappings:', Object.keys(mappings.value))
          } else {
            console.warn('[MappingPatternNew] No matching config found for carrierId:', actualCarrierId)
          }
        } catch (e) {
          console.error('Failed to load existing mapping config:', e)
        }
      }
    }

    // Load sample orders for order-to-carrier type
    if (configType.value === 'order-to-carrier') {
      await loadSampleOrders()
    }
  }

  // 检查是否有编辑 ID（从路由参数或查询参数中获取）
  const editId = (route.params.id as string | undefined) || (route.query.id as string | undefined)
  if (editId) {
    await loadConfigForEdit(editId)
  }
})

const loadCarriers = async () => {
  try {
    carrierOptions.value = await fetchCarriers()
  } catch (e: any) {
    console.error(e)
    alert(e?.message || '配送会社一覧の取得に失敗しました')
  }
}

watch(
  () => configType.value,
  (val) => {
    selectedTarget.value = null
    selectedSources.value = []
    mappings.value = {}
    // 清空自定义字段（仅在切换到非 order-to-sheet 类型时）
    if (val !== 'order-to-sheet') {
      customTargetFields.value = []
    }
    if (val === 'order-to-carrier') {
      sourceUploadRows.value = []
      sampleRows.value = []
      // Load sample orders for preview/value lookup (do not affect Source table rows)
      if (!sampleRows.value.length) {
        loadSampleOrders()
      }
    } else if (val === 'order-to-sheet') {
      // order-to-sheet: 清空不需要的状态，加载订单样本
      sourceUploadRows.value = []
      sourceOrderRows.value = []
      carrierId.value = null
      // Load sample orders for preview/value lookup
      if (!sampleRows.value.length) {
        loadSampleOrders()
      }
    } else if (val === 'ec-company-to-order') {
      carrierId.value = null
      sourceOrderRows.value = []
      sampleRows.value = []
    } else {
      carrierId.value = null
      sourceOrderRows.value = []
      sampleRows.value = []
    }
  },
)

// --- File parsing (same approach as ImportDialog): use XLSX for both Excel and CSV ---

const parseSheetToRows = (wb: any): Record<string, any>[] => {
  if (!wb.SheetNames || wb.SheetNames.length === 0) return []
  const sheet = wb.Sheets[wb.SheetNames[0]]

  // 手动读取单元格，使用原始显示值（cell.w），避免 XLSX 自动格式化日期
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1')
  const headers: string[] = []
  const rows: Record<string, any>[] = []

  // 读取表头（第一行）
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col })
    const cell = sheet[cellAddress]
    const value = cell?.w != null ? String(cell.w) : (cell?.v != null ? String(cell.v) : '')
    headers.push(value.trim())
  }

  // 过滤空表头
  const validHeaders = headers.filter((h) => h)
  if (validHeaders.length === 0) return []

  // 读取数据行（从第二行开始）
  for (let row = range.s.r + 1; row <= range.e.r; row++) {
    const obj: Record<string, any> = {}
    validHeaders.forEach((header, colIndex) => {
      const col = range.s.c + colIndex
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
      const cell = sheet[cellAddress]
      const value = cell?.w != null ? String(cell.w) : (cell?.v != null ? String(cell.v) : '')
      obj[header] = value
    })
    rows.push(obj)
  }

  return rows
}

// minimal encoding decode (keep UI selection); use TextDecoder like ImportDialog
const decodeWithEncoding = (buf: ArrayBuffer, enc: string): string => {
  try {
    const decoder = new TextDecoder(enc === 'gbk' ? 'gb18030' : (enc as any), { fatal: false })
    return decoder.decode(buf)
  } catch {
    return new TextDecoder('utf-8').decode(buf)
  }
}

const parseExcelFile = async (file: File): Promise<Record<string, any>[]> => {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  return parseSheetToRows(wb)
}

const parseCsvFile = async (file: File): Promise<Record<string, any>[]> => {
  const buf = await file.arrayBuffer()
  let text = decodeWithEncoding(buf, encoding.value)
  // strip BOM if present
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  const wb = XLSX.read(text, { type: 'string' })
  return parseSheetToRows(wb)
}

const parseFileForPreview = async (file: File): Promise<Record<string, any>[]> => {
  const name = file.name.toLowerCase()
  const isExcel =
    file.type.includes('sheet') || name.endsWith('.xlsx') || name.endsWith('.xls')
  return isExcel ? parseExcelFile(file) : parseCsvFile(file)
}

// Native file input handler (replaces el-upload @change)
const onNativeFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input?.files?.[0]
  if (!file) return
  try {
    const rows = await parseFileForPreview(file)
    const headers = rows.length && rows[0] ? Object.keys(rows[0]) : []
    sourceUploadRows.value = headers.map((h) => ({ name: h }))
    sampleRows.value = rows.slice(0, 5)

    alert('アップロード済みのヘッダーを読み込みました')
  } catch (e: any) {
    console.error(e)
    alert(e?.message || 'ファイルの解析に失敗しました')
  }
  // Reset input so same file can be selected again
  if (input) input.value = ''
}

const loadSampleOrders = async () => {
  try {
    const orders = await fetchShipmentOrders({ limit: 5 })
    const first = orders[0]
    if (!first) {
      alert('サンプル注文が取得できませんでした')
      return
    }
    // Do not overwrite Source table rows with sample keys.
    sampleRows.value = orders.slice(0, 5).map((o: any) => o)
    alert('注文サンプルを読み込みました')
  } catch (e: any) {
    console.error(e)
    alert(e?.message || 'サンプル取得に失敗しました')
  }
}

const onSelectTarget = (row: TargetRow | null) => {
  // 如果选择的是可展开的 products 本身，不允许选择（清空选择）
  if (row && row.isExpandable && row.field === 'products') {
    selectedTarget.value = null
    selectedSources.value = []
    return
  }

  // 当target改变时，清空已选中的sources
  if (selectedTarget.value?.field !== row?.field) {
    selectedSources.value = []
  }
  selectedTarget.value = row
}

const onSelectSource = (row: SourceRow | null) => {
  if (!row) return
  toggleSource(row)
}

const toggleSource = (row: SourceRow) => {
  const exists = selectedSources.value.some((s) => s.name === row.name)
  if (exists) {
    selectedSources.value = selectedSources.value.filter((s) => s.name !== row.name)
  } else {
    selectedSources.value = [...selectedSources.value, row]
  }
}

const isSourceSelected = (row: SourceRow) =>
  selectedSources.value.some((s) => s.name === row.name)

const handleDirectLink = () => {
  if (!selectedTarget.value || !selectedSources.value.length) return
  const mapping: TransformMapping = {
    targetField: selectedTarget.value.field,
    inputs: selectedSources.value.map((s, idx) => ({
      id: `src-${idx}`,
      type: 'column',
      column: s.name,
      pipeline: { steps: [] },
    })),
    combine: { plugin: selectedSources.value.length > 1 ? 'combine.concat' : 'combine.first' },
    outputPipeline: { steps: [] },
    required: selectedTarget.value.required,
  }
  mappings.value = { ...mappings.value, [selectedTarget.value.field]: mapping }
  alert('紐付けました')
}

const handleAddLiteral = async () => {
  if (!selectedTarget.value) return
  const literal = await promptLiteral()
  if (literal === null) return
  const mapping: TransformMapping = {
    targetField: selectedTarget.value.field,
    inputs: [{ id: 'lit-1', type: 'literal', value: literal, pipeline: { steps: [] } }],
    combine: { plugin: 'combine.first' },
    outputPipeline: { steps: [] },
    required: selectedTarget.value.required,
  }
  mappings.value = { ...mappings.value, [selectedTarget.value.field]: mapping }
  alert('固定値を設定しました')
}

const promptLiteral = (): Promise<string | null> => {
  return new Promise((resolve) => {
    const value = prompt('固定値を入力してください')
    resolve(value)
  })
}

const openTransformDialog = () => {
  if (!selectedTarget.value) return
  // 将已选中的 sources 传递给对话框
  preSelectedSources.value = [...selectedSources.value]
  detailDialogVisible.value = true
}

const openDetailDialog = () => {
  if (!selectedTarget.value) return
  // 详细设置时不清空预选 sources
  preSelectedSources.value = []
  detailDialogVisible.value = true
}

const applyDetailMapping = (mapping: TransformMapping) => {
  mappings.value = { ...mappings.value, [mapping.targetField]: mapping }
  detailDialogVisible.value = false
  preSelectedSources.value = []
  alert('詳細設定を更新しました')
}

// 移除 openProductMappingDialog 和 applyProductMapping（不再需要）

const openHandlingTagsMappingDialog = () => {
  if (!selectedTarget.value || selectedTarget.value.field !== 'handlingTags') return
  handlingTagsMappingDialogVisible.value = true
}

const applyHandlingTagsMapping = (mapping: TransformMapping) => {
  mappings.value = { ...mappings.value, [mapping.targetField]: mapping }
  handlingTagsMappingDialogVisible.value = false
  alert('荷扱いタグレイアウトを設定しました')
}

const openProductToStringTransform = () => {
  if (!selectedTarget.value || selectedSources.value.length !== 1 || selectedSources.value[0]?.name !== 'products') {
    return
  }

  const mapping: TransformMapping = {
    targetField: selectedTarget.value.field,
    inputs: [
      {
        id: 'products-input',
        type: 'column',
        column: 'products',
        pipeline: undefined,
      },
    ],
    combine: {
      plugin: 'combine.first',
      params: {},
    },
    outputPipeline: {
      steps: [
        {
          id: 'product-to-string',
          plugin: 'product.toString',
          params: {
            separator: ' / ',
          },
          enabled: true,
        },
      ],
    },
    required: selectedTarget.value.required,
    defaultValue: undefined,
  }

  mappings.value = { ...mappings.value, [selectedTarget.value.field]: mapping }
  alert('商品を文字列に変換するレイアウトを設定しました')
}

const openHandlingTagsIndexDialog = () => {
  if (!selectedTarget.value || selectedSources.value.length !== 1 || selectedSources.value[0]?.name !== 'handlingTags') {
    return
  }
  handlingTagsIndexDialogVisible.value = true
}

const applyHandlingTagsIndex = (mapping: TransformMapping) => {
  mappings.value = { ...mappings.value, [mapping.targetField]: mapping }
  handlingTagsIndexDialogVisible.value = false
  alert('配列要素を取得するレイアウトを設定しました')
}

const openBarcodeMappingDialog = () => {
  if (configType.value !== 'product') return
  if (!selectedTarget.value || selectedTarget.value.field !== 'barcode') return
  barcodeMappingDialogVisible.value = true
}

const applyBarcodeMapping = (mapping: TransformMapping) => {
  mappings.value = { ...mappings.value, [mapping.targetField]: mapping }
  barcodeMappingDialogVisible.value = false
  alert('バーコードレイアウトを設定しました')
}

const onCarrierChange = () => {
  mappings.value = {}
  selectedTarget.value = null
  selectedSources.value = []
}

const clearSelected = () => {
  if (!selectedTarget.value) return
  const next = { ...mappings.value }
  delete next[selectedTarget.value.field]
  mappings.value = next
  alert('クリアしました')
}

const clearAll = () => {
  mappings.value = {}
  alert('全てクリアしました')
}

const summaryForMapping = (mapping?: TransformMapping) => {
  if (!mapping) return '未設定'
  if (!mapping.inputs || mapping.inputs.length === 0) return '未設定'

  const parts: string[] = []

  // 显示所有 inputs 的信息
  mapping.inputs.forEach((input, idx) => {
    let inputLabel = ''
    if (input.type === 'column') {
      inputLabel = getDisplayName(input.column || '')
    } else if (input.type === 'literal') {
      inputLabel = '固定値'
    } else if (input.type === 'generated') {
      inputLabel = `生成(${input.generator || ''})`
    }

    const inputSteps = input.pipeline?.steps?.length || 0
    if (inputSteps > 0) {
      inputLabel += `[${inputSteps}]`
    }

    if (mapping.inputs.length > 1) {
      parts.push(`${idx + 1}.${inputLabel}`)
    } else {
      parts.push(inputLabel)
    }
  })

  // 显示 combine 信息（如果有多个 inputs）
  if (mapping.inputs.length > 1) {
    const combinePlugin = mapping.combine?.plugin || 'combine.first'
    parts.push(`→${combinePlugin.replace('combine.', '')}`)
  }

  // 显示 output pipeline steps
  const outputSteps = mapping.outputPipeline?.steps?.length || 0
  if (outputSteps > 0) {
    parts.push(`→出力[${outputSteps}]`)
  }

  return parts.join(' ')
}

const onConfigTypeChange = () => {
  // handled by watch, but keep for clarity
}

const getDisplayName = (field: string) => {
  // 处理 sourceRawRows.0.xxx 格式的字段（EC連携用的元CSV数据）
  if (field.startsWith('sourceRawRows.0.')) {
    const csvFieldName = field.replace('sourceRawRows.0.', '')
    return `sourceRawRows.${csvFieldName}`
  }

  // 支持嵌套字段，如 products.0.sku
  const labels = configType.value === 'product' ? productFieldLabels : orderFieldLabels
  const directMatch = labels[field]
  if (directMatch) return directMatch

  // 尝试匹配基础字段名（处理嵌套路径，但排除 sourceRawRows）
  const baseField = field.split('.')[0]
  if (baseField && baseField !== 'sourceRawRows') {
    const baseMatch = labels[baseField]
    if (baseMatch) return baseMatch
  }

  return field
}

const getUsedByTargets = (sourceName: string): string[] => {
  const usedBy: string[] = []
  for (const [targetField, mapping] of Object.entries(mappings.value)) {
    if (mapping.inputs.some((inp) => inp.type === 'column' && inp.column === sourceName)) {
      usedBy.push(targetField)
    }
  }
  return usedBy
}

const getTargetDisplayName = (targetField: string): string => {
  const target = targetRowsComputed.value.find((t) => t.field === targetField)
  return target?.label || targetField
}

const canSave = computed(() => {
  return configName.value.trim().length > 0 && Object.keys(mappings.value).length > 0
})

const handleSave = async () => {
  if (!canSave.value) {
    alert('レイアウト名を入力し、少なくとも1つのマッピングを設定してください')
    return
  }

  try {
    const mappingList: TransformMapping[] = Object.values(mappings.value)

    const dto = {
      schemaVersion: 2,
      configType: configType.value,
      name: configName.value.trim(),
      description: configDescription.value.trim() || undefined,
      carrierId: configType.value === 'order-to-carrier' && carrierId.value ? carrierId.value : undefined,
      mappings: mappingList,
    }

    if (currentConfigId.value) {
      await updateMappingConfig(currentConfigId.value, dto)
      alert('設定を更新しました')
    } else {
      const result = await createMappingConfig(dto)
      currentConfigId.value = result._id
      alert('設定を保存しました')
    }
  } catch (e: any) {
    console.error(e)
    alert(e?.message || '保存に失敗しました')
  }
}

const handleLoad = async () => {
  try {
    const configs = await getAllMappingConfigs(configType.value)
    if (configs.length === 0) {
      alert('読み込める設定がありません')
      return
    }

    const options = configs.map((c: MappingConfig) => ({
      label: `${c.name}${c.description ? ` - ${c.description}` : ''}`,
      value: c._id,
      config: c,
    }))

    const labels = options.map((o) => o.label)
    const selectedIndexStr = prompt(
      '設定を選択してください\n\n' + labels.map((l, i) => `${i}: ${l}`).join('\n') + '\n\n番号を入力:'
    )

    if (selectedIndexStr === null) return

    const selectedIndex = parseInt(selectedIndexStr || '0', 10)
    if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= options.length) {
      alert('無効な選択です')
      return
    }

    const selected = options[selectedIndex]
    if (!selected) return

    const config = selected.config
    if (config.schemaVersion !== 2) {
      alert('この設定は v2 形式ではありません。v2 形式の設定を選択してください。')
      return
    }

    // 加载配置
    configName.value = config.name
    configDescription.value = config.description || ''
    currentConfigId.value = config._id
    configType.value = config.configType || 'ec-company-to-order'
    carrierId.value = config.carrierId || null

    // 加载 mappings
    const loadedMappings: Record<string, TransformMapping> = {}
    if (Array.isArray(config.mappings)) {
      for (const m of config.mappings as ApiTransformMapping[]) {
        loadedMappings[m.targetField] = m as TransformMapping
      }
    }
    mappings.value = loadedMappings

    // 如果是 파일アップロード型（ec-company-to-order / product），从 mappings 中提取 source 字段
    if (config.configType !== 'order-to-carrier') {
      const sourceFields = new Set<string>()
      for (const m of config.mappings as ApiTransformMapping[]) {
        if (m.inputs && Array.isArray(m.inputs)) {
          for (const input of m.inputs) {
            if (input.type === 'column' && input.column) {
              sourceFields.add(input.column)
            }
          }
        }
      }
      // 将提取的字段添加到 sourceUploadRows
      sourceUploadRows.value = Array.from(sourceFields).map((field) => ({
        name: field,
        label: field,
      }))
    }

    alert('設定を読み込みました')
  } catch (e: any) {
    if (e !== 'cancel') {
      console.error(e)
      alert(e?.message || '読み込みに失敗しました')
    }
  }
}
</script>

<style scoped>
.mapping-pattern-new {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.top-bar {
  display: flex;
  gap: 32px;
  align-items: flex-start;
  justify-content: space-between;
  padding: 8px 0 4px;
}

.top-left,
.top-right {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.field .label {
  font-weight: 600;
  margin-bottom: 4px;
}

.hint {
  color: #999;
  font-size: 12px;
  margin-top: 4px;
}

.upload-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.hidden-input {
  display: none;
}

.tables-row {
  display: grid;
  grid-template-columns: 1.2fr 160px 1fr;
  gap: 12px;
}

.table-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  padding: 10px;
  display: flex;
  flex-direction: column;
}

.table-title {
  font-weight: 600;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.custom-target-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.o-list-table {
  width: 100%;
  border-collapse: collapse;
}
.o-list-table th,
.o-list-table td {
  border: 1px solid var(--o-border-color, #dee2e6);
  padding: 8px 10px;
  text-align: left;
  font-size: 13px;
}
.o-list-table th {
  background: var(--o-gray-100, #f8f9fa);
  font-weight: 600;
  position: sticky;
  top: 0;
  z-index: 1;
}
.o-list-table tbody tr:hover {
  background: #f5f7fa;
}

.row-selected {
  background: #ecf5ff !important;
}

.middle-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: stretch;
  justify-content: center;
}

.pipeline-chip {
  padding: 4px 8px;
  background: #f5f7fa;
  border-radius: 6px;
  font-size: 12px;
}
.pipeline-chip.empty {
  color: #999;
}

.target-description-box {
  grid-column: 1;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  padding: 12px;
  margin-top: 12px;
  max-height: 200px;
  overflow-y: auto;
}

.target-description-title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 8px;
  color: #303133;
}

.target-description-content {
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.used-by-targets {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.empty-text {
  color: #999;
  font-size: 12px;
}

/* 商品子项的样式 */
.product-child-item {
  padding-left: 20px;
  position: relative;
}

.product-child-item::before {
  content: '\2514';
  position: absolute;
  left: 8px;
  color: #c0c4cc;
  font-weight: normal;
}

/* o-badge styles */
.o-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
}
.o-badge-danger {
  background: #fef0f0;
  color: #f56c6c;
}
.o-badge-info {
  background: #f4f4f5;
  color: #909399;
}

/* o-alert styles */
.o-alert {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.5;
}
.o-alert-info {
  background: #f4f4f5;
  color: #909399;
  border: 1px solid #e9e9eb;
}

/* Button styles */
.o-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 14px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  background: #fff;
  color: #606266;
  transition: all 0.15s;
  white-space: nowrap;
}
.o-btn:hover { background: #f5f7fa; border-color: #c0c4cc; }
.o-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.o-btn-primary {
  background: var(--o-primary, #714B67);
  color: #fff;
  border-color: var(--o-primary, #714B67);
}
.o-btn-primary:hover { opacity: 0.85; }

.o-btn-secondary {
  background: #fff;
  color: #606266;
  border-color: #dcdfe6;
}

.o-btn-danger {
  background: #fff;
  color: #f56c6c;
  border-color: #fbc4c4;
}
.o-btn-danger:hover { background: #fef0f0; }

.o-btn-warning {
  background: #fff;
  color: #e6a23c;
  border-color: #f5dab1;
}
.o-btn-warning:hover { background: #fdf6ec; }

.o-btn-success {
  background: #67c23a;
  color: #fff;
  border-color: #67c23a;
}
.o-btn-success:hover { opacity: 0.85; }

/* Input styles */
.o-input {
  padding: 6px 10px;
  border: 1px solid var(--o-border-color, #dee2e6);
  border-radius: 4px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
}
.o-input:focus { border-color: var(--o-primary, #714B67); }
</style>
