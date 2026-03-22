<template>
  <ODialog
    :open="modelValue"
    :title="isEditing ? '出荷グループを編集' : '出荷グループを追加'"
    size="md"
    @close="$emit('update:modelValue', false)"
  >
    <!-- 编辑时显示 ID / 編集時にID表示 -->
    <div v-if="isEditing && initialData" class="group-id-display">
      <span class="group-id-label">グループID</span>
      <span class="group-id-value">{{ initialData.orderGroupId }}</span>
    </div>

    <div class="osc-form">
      <div class="osc-form-group">
        <label class="osc-label">グループ名 <span class="required-badge">必須</span></label>
        <input class="o-input" v-model="formData.name" placeholder="例: VIP、通常、冷凍品" />
        <div v-if="nameError" class="field-error">{{ nameError }}</div>
      </div>

      <div class="osc-form-group">
        <label class="osc-label">説明</label>
        <textarea class="o-input" v-model="formData.description" rows="2" placeholder="グループの用途を入力（任意）"></textarea>
      </div>

      <div class="osc-form-group">
        <label class="osc-label">有効</label>
        <div style="display:flex;align-items:center;gap:10px">
          <label class="o-toggle">
            <input type="checkbox" v-model="formData.enabled" />
            <span class="o-toggle-slider"></span>
          </label>
          <span class="toggle-hint">{{ formData.enabled ? '有効 — このグループに注文を割当可能' : '無効 — 新規割当不可（既存は維持）' }}</span>
        </div>
      </div>

      <!-- 分組条件セクション / 分组条件区域 -->
      <div class="criteria-section">
        <label class="osc-label">
          分組条件（自動振り分け用）
          <span class="criteria-hint">/ 分组条件（自动分配用）</span>
        </label>

        <div class="osc-form-group">
          <label class="osc-label osc-label--sub">条件タイプ / 条件类型</label>
          <select class="o-input" v-model="criteriaType" @change="onCriteriaTypeChange">
            <option value="">なし（手動割当のみ）/ 无（仅手动分配）</option>
            <option v-for="opt in criteriaTypeOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <!-- 都道府県条件 / 都道府县条件 -->
        <div v-if="criteriaType === 'prefecture'" class="criteria-detail">
          <label class="osc-label osc-label--sub">対象都道府県 / 目标都道府县</label>
          <div class="prefecture-grid">
            <label
              v-for="pref in prefectureList"
              :key="pref"
              class="pref-checkbox"
              :class="{ selected: selectedPrefectures.has(pref) }"
            >
              <input type="checkbox" :checked="selectedPrefectures.has(pref)" @change="togglePrefecture(pref)" />
              {{ pref }}
            </label>
          </div>
          <div class="criteria-quick-actions">
            <button type="button" class="link-btn" @click="selectAllPrefectures">全選択</button>
            <button type="button" class="link-btn" @click="clearAllPrefectures">全解除</button>
            <button type="button" class="link-btn" @click="selectKantoRegion">関東</button>
            <button type="button" class="link-btn" @click="selectKansaiRegion">関西</button>
          </div>
        </div>

        <!-- 荷主条件 / 货主条件 -->
        <div v-if="criteriaType === 'customer'" class="criteria-detail">
          <label class="osc-label osc-label--sub">荷主ID（カンマ区切り）/ 货主ID（逗号分隔）</label>
          <textarea
            class="o-input"
            v-model="customerIdsText"
            rows="2"
            placeholder="例: client-001, client-002"
          ></textarea>
          <div class="criteria-help">荷主（依頼元会社）のIDを入力してください / 请输入货主（委托方公司）的ID</div>
        </div>

        <!-- SKU数条件 / SKU数条件 -->
        <div v-if="criteriaType === 'sku_count'" class="criteria-detail">
          <label class="osc-label osc-label--sub">SKU種別 / SKU类别</label>
          <div class="sku-options">
            <label class="checkbox-label">
              <input type="checkbox" v-model="skuSingle" />
              単品（SKU 1種類）/ 单品（SKU 1种）
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="skuMulti" />
              複数品（SKU 2種類以上）/ 多品（SKU 2种以上）
            </label>
          </div>
        </div>

        <!-- ビジネスタイプ条件 / 业务类型条件 -->
        <div v-if="criteriaType === 'business_type'" class="criteria-detail">
          <label class="osc-label osc-label--sub">ビジネスタイプ / 业务类型</label>
          <div class="biz-type-options">
            <label
              v-for="bt in businessTypeOptions"
              :key="bt.value"
              class="checkbox-label"
            >
              <input
                type="checkbox"
                :checked="selectedBusinessTypes.has(bt.value)"
                @change="toggleBusinessType(bt.value)"
              />
              {{ bt.label }}
            </label>
          </div>
        </div>

        <!-- SLA条件 / SLA条件 -->
        <div v-if="criteriaType === 'sla'" class="criteria-detail">
          <label class="osc-label osc-label--sub">最大残り時間（時間）/ 最大剩余时间（小时）</label>
          <input class="o-input" type="number" v-model.number="slaMaxHours" min="1" max="720" placeholder="例: 24" />
          <div class="criteria-help">出荷予定日まで指定時間以内の注文をマッチ / 匹配距出货预定日在指定时间内的订单</div>
        </div>
      </div>
    </div>

    <template #footer>
      <OButton variant="secondary" @click="$emit('update:modelValue', false)">キャンセル</OButton>
      <OButton variant="primary" @click="handleSubmit">{{ isEditing ? '更新' : '作成' }}</OButton>
    </template>
  </ODialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import ODialog from '@/components/odoo/ODialog.vue'
import OButton from '@/components/odoo/OButton.vue'
import type { OrderGroup, SortCriteria, SortCriteriaType } from '@/types/orderGroup'
import { SORT_CRITERIA_TYPE_LABELS, BUSINESS_TYPE_LABELS } from '@/types/orderGroup'

const props = defineProps<{
  modelValue: boolean
  isEditing: boolean
  initialData?: OrderGroup | null
}>()

const emits = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'submit', data: {
    name: string
    description?: string
    enabled: boolean
    sortCriteria?: SortCriteria | null
  }): void
}>()

const formData = reactive({ name: '', description: '', enabled: true })
const nameError = ref('')

// 分組条件のステート / 分组条件状态
const criteriaType = ref<SortCriteriaType | ''>('')
const selectedPrefectures = ref(new Set<string>())
const customerIdsText = ref('')
const skuSingle = ref(false)
const skuMulti = ref(false)
const selectedBusinessTypes = ref(new Set<string>())
const slaMaxHours = ref<number>(24)

// 条件タイプ選択肢 / 条件类型选项
const criteriaTypeOptions = computed(() =>
  (Object.entries(SORT_CRITERIA_TYPE_LABELS) as [SortCriteriaType, { ja: string; zh: string }][]).map(
    ([value, labels]) => ({
      value,
      label: `${labels.ja} / ${labels.zh}`,
    }),
  ),
)

// ビジネスタイプ選択肢 / 业务类型选项
const businessTypeOptions = computed(() =>
  Object.entries(BUSINESS_TYPE_LABELS).map(([value, labels]) => ({
    value,
    label: `${labels.ja} / ${labels.zh}`,
  })),
)

// 都道府県リスト / 都道府县列表
const prefectureList = [
  '北海道',
  '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県',
  '山梨県', '長野県', '岐阜県', '静岡県', '愛知県',
  '三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
  '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県',
  '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県',
  '沖縄県',
]

const kantoRegion = ['茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県']
const kansaiRegion = ['三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県']

// 都道府県操作 / 都道府县操作
const togglePrefecture = (pref: string) => {
  const next = new Set(selectedPrefectures.value)
  if (next.has(pref)) {
    next.delete(pref)
  } else {
    next.add(pref)
  }
  selectedPrefectures.value = next
}

const selectAllPrefectures = () => {
  selectedPrefectures.value = new Set(prefectureList)
}

const clearAllPrefectures = () => {
  selectedPrefectures.value = new Set()
}

const selectKantoRegion = () => {
  const next = new Set(selectedPrefectures.value)
  for (const p of kantoRegion) next.add(p)
  selectedPrefectures.value = next
}

const selectKansaiRegion = () => {
  const next = new Set(selectedPrefectures.value)
  for (const p of kansaiRegion) next.add(p)
  selectedPrefectures.value = next
}

// ビジネスタイプ操作 / 业务类型操作
const toggleBusinessType = (bt: string) => {
  const next = new Set(selectedBusinessTypes.value)
  if (next.has(bt)) {
    next.delete(bt)
  } else {
    next.add(bt)
  }
  selectedBusinessTypes.value = next
}

// 条件タイプ変更時のリセット / 条件类型变更时重置
const onCriteriaTypeChange = () => {
  selectedPrefectures.value = new Set()
  customerIdsText.value = ''
  skuSingle.value = false
  skuMulti.value = false
  selectedBusinessTypes.value = new Set()
  slaMaxHours.value = 24
}

// 分組条件をビルド / 构建分组条件
const buildSortCriteria = (): SortCriteria | null => {
  if (!criteriaType.value) return null

  const base: SortCriteria = { type: criteriaType.value }

  switch (criteriaType.value) {
    case 'prefecture':
      base.prefecture = { regions: Array.from(selectedPrefectures.value) }
      break
    case 'customer':
      base.customer = {
        clientIds: customerIdsText.value
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      }
      break
    case 'sku_count':
      base.skuCount = { single: skuSingle.value, multi: skuMulti.value }
      break
    case 'business_type':
      base.businessType = {
        types: Array.from(selectedBusinessTypes.value) as SortCriteria['businessType'] extends { types: infer T } ? T extends (infer U)[] ? U[] : never : never,
      }
      break
    case 'sla':
      base.sla = { maxHours: slaMaxHours.value }
      break
  }

  return base
}

// 分組条件をフォームに反映 / 将分组条件反映到表单
const loadSortCriteria = (criteria: SortCriteria | null | undefined) => {
  if (!criteria) {
    criteriaType.value = ''
    onCriteriaTypeChange()
    return
  }

  criteriaType.value = criteria.type

  switch (criteria.type) {
    case 'prefecture':
      selectedPrefectures.value = new Set(criteria.prefecture?.regions ?? [])
      break
    case 'customer':
      customerIdsText.value = (criteria.customer?.clientIds ?? []).join(', ')
      break
    case 'sku_count':
      skuSingle.value = criteria.skuCount?.single ?? false
      skuMulti.value = criteria.skuCount?.multi ?? false
      break
    case 'business_type':
      selectedBusinessTypes.value = new Set(criteria.businessType?.types ?? [])
      break
    case 'sla':
      slaMaxHours.value = criteria.sla?.maxHours ?? 24
      break
  }
}

const handleSubmit = () => {
  nameError.value = ''
  if (!formData.name.trim()) {
    nameError.value = 'グループ名は必須です'
    return
  }
  emits('submit', {
    name: formData.name.trim(),
    description: formData.description?.trim() || undefined,
    enabled: formData.enabled,
    sortCriteria: buildSortCriteria(),
  })
}

watch(() => props.modelValue, (visible) => {
  if (visible) {
    nameError.value = ''
    if (props.isEditing && props.initialData) {
      formData.name = props.initialData.name
      formData.description = props.initialData.description || ''
      formData.enabled = props.initialData.enabled
      loadSortCriteria(props.initialData.sortCriteria)
    } else {
      formData.name = ''
      formData.description = ''
      formData.enabled = true
      criteriaType.value = ''
      onCriteriaTypeChange()
    }
  }
}, { immediate: true })
</script>

<style scoped>
.group-id-display {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  margin-bottom: 16px;
  background: var(--o-gray-100, #f5f7fa);
  font-size: 12px;
}
.group-id-label { color: var(--o-gray-500); font-weight: 500; }
.group-id-value { font-family: monospace; color: var(--o-gray-700); }

.osc-form { display: flex; flex-direction: column; gap: 14px; }
.osc-form-group { display: flex; flex-direction: column; gap: 4px; }
.osc-label {
  font-size: 13px; font-weight: 500;
  color: var(--o-gray-700, #4a433d);
  display: flex; align-items: center; gap: 4px;
}
.osc-label--sub {
  font-size: 12px;
  color: var(--o-gray-600, #606266);
}
.required-badge {
  display: inline-block; background: #dc3545; color: #fff;
  font-size: 10px; font-weight: 700; line-height: 1;
  padding: 2px 5px; border-radius: 3px; white-space: nowrap;
}
.field-error { color: var(--o-danger, #dc3545); font-size: 12px; }
.toggle-hint { font-size: 12px; color: var(--o-gray-500); }

.o-toggle { position: relative; display: inline-flex; align-items: center; cursor: pointer; }
.o-toggle input { position: absolute; opacity: 0; width: 0; height: 0; }
.o-toggle-slider { width: 40px; height: 20px; background: var(--o-toggle-off, #c0c4cc); border-radius: 10px; transition: 0.2s; position: relative; }
.o-toggle-slider::after { content: ''; position: absolute; width: 16px; height: 16px; border-radius: 50%; background: #fff; top: 2px; left: 2px; transition: 0.2s; }
.o-toggle input:checked + .o-toggle-slider { background: var(--o-brand-primary, #0052A3); }
.o-toggle input:checked + .o-toggle-slider::after { left: 22px; }

/* 分組条件セクション / 分组条件区域 */
.criteria-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 8px;
  padding-top: 14px;
  border-top: 1px solid var(--o-border-color, #e4e7ed);
}

.criteria-hint {
  font-size: 11px;
  color: var(--o-gray-400, #c0c4cc);
  font-weight: 400;
}

.criteria-detail {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  background: var(--o-gray-50, #fafafa);
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: 6px;
}

.criteria-help {
  font-size: 11px;
  color: var(--o-gray-400, #c0c4cc);
}

/* 都道府県グリッド / 都道府县网格 */
.prefecture-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 4px;
  max-height: 220px;
  overflow-y: auto;
  padding: 4px;
}

.pref-checkbox {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 6px;
  font-size: 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s;
  white-space: nowrap;
}
.pref-checkbox:hover { background: var(--o-gray-100, #f5f7fa); }
.pref-checkbox.selected { background: var(--o-brand-lighter, #e6f0ff); color: var(--o-brand-primary, #0052A3); }
.pref-checkbox input { width: 14px; height: 14px; margin: 0; }

.criteria-quick-actions {
  display: flex;
  gap: 12px;
  padding-top: 4px;
}

.link-btn {
  background: none;
  border: none;
  color: var(--o-brand-primary, #0052A3);
  font-size: 12px;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
}
.link-btn:hover { opacity: 0.7; }

/* SKU / ビジネスタイプ チェックボックス / SKU / 业务类型复选框 */
.sku-options,
.biz-type-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  cursor: pointer;
}
.checkbox-label input { width: 15px; height: 15px; margin: 0; }
</style>
