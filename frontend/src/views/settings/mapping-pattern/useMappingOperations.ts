/**
 * マッピング操作のコンポーザブル / Mapping operations composable
 *
 * マッピングの作成・編集・削除・ダイアログ管理を担当
 * 担当：创建、编辑、删除映射以及对话框管理
 */
import { ref, type Ref, type ComputedRef } from 'vue'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'

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
  children?: TargetRow[]
  isExpandable?: boolean
}

interface SourceRow {
  name: string
  label?: string
}

interface UseMappingOperationsParams {
  mappings: Ref<Record<string, TransformMapping>>
  selectedTarget: Ref<TargetRow | null>
  selectedSources: Ref<SourceRow[]>
  configType: Ref<string>
  customTargetFields: Ref<string[]>
  targetRowsComputed: ComputedRef<TargetRow[]>
  orderFieldLabels: Record<string, string>
  productFieldLabels: Record<string, string>
}

export function useMappingOperations(params: UseMappingOperationsParams) {
  const { show: showToast } = useToast()
  const { t } = useI18n()

  const {
    mappings,
    selectedTarget,
    selectedSources,
    configType,
    customTargetFields,
    targetRowsComputed,
    orderFieldLabels,
    productFieldLabels,
  } = params

  // ダイアログ表示状態 / Dialog visibility state
  const detailDialogVisible = ref(false)
  const handlingTagsMappingDialogVisible = ref(false)
  const handlingTagsIndexDialogVisible = ref(false)
  const barcodeMappingDialogVisible = ref(false)
  const preSelectedSources = ref<SourceRow[]>([])

  // --- マッピング作成・編集 / Mapping creation & editing ---

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
    showToast(t('wms.mapping.linked', 'マッピングを設定しました'), 'success')
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
    showToast(t('wms.mapping.literalSet', '固定値を設定しました'), 'success')
  }

  const promptLiteral = (): Promise<string | null> => {
    return new Promise((resolve) => {
      const value = prompt(t('wms.mapping.enterLiteralValue', '固定値を入力してください'))
      resolve(value)
    })
  }

  // --- ダイアログ操作 / Dialog operations ---

  const openTransformDialog = () => {
    if (!selectedTarget.value) return
    preSelectedSources.value = [...selectedSources.value]
    detailDialogVisible.value = true
  }

  const openDetailDialog = () => {
    if (!selectedTarget.value) return
    preSelectedSources.value = []
    detailDialogVisible.value = true
  }

  const applyDetailMapping = (mapping: TransformMapping) => {
    mappings.value = { ...mappings.value, [mapping.targetField]: mapping }
    detailDialogVisible.value = false
    preSelectedSources.value = []
    showToast(t('wms.mapping.detailUpdated', '詳細設定を更新しました'), 'success')
  }

  const openHandlingTagsMappingDialog = () => {
    if (!selectedTarget.value || selectedTarget.value.field !== 'handlingTags') return
    handlingTagsMappingDialogVisible.value = true
  }

  const applyHandlingTagsMapping = (mapping: TransformMapping) => {
    mappings.value = { ...mappings.value, [mapping.targetField]: mapping }
    handlingTagsMappingDialogVisible.value = false
    showToast(t('wms.mapping.handlingTagsMappingSet', '荷扱いタグレイアウトを設定しました'), 'success')
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
    showToast(t('wms.mapping.productToStringSet', '商品を文字列に変換するレイアウトを設定しました'), 'success')
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
    showToast(t('wms.mapping.arrayIndexSet', '配列要素を取得するレイアウトを設定しました'), 'success')
  }

  const openBarcodeMappingDialog = () => {
    if (configType.value !== 'product') return
    if (!selectedTarget.value || selectedTarget.value.field !== 'barcode') return
    barcodeMappingDialogVisible.value = true
  }

  const applyBarcodeMapping = (mapping: TransformMapping) => {
    mappings.value = { ...mappings.value, [mapping.targetField]: mapping }
    barcodeMappingDialogVisible.value = false
    showToast(t('wms.mapping.barcodeMappingSet', 'バーコードレイアウトを設定しました'), 'success')
  }

  // --- クリア操作 / Clear operations ---

  const clearSelected = () => {
    if (!selectedTarget.value) return
    const next = { ...mappings.value }
    delete next[selectedTarget.value.field]
    mappings.value = next
    showToast(t('wms.mapping.cleared', 'クリアしました'), 'info')
  }

  const clearAll = () => {
    mappings.value = {}
    showToast(t('wms.mapping.allCleared', '全てクリアしました'), 'info')
  }

  const onCarrierChange = () => {
    mappings.value = {}
    selectedTarget.value = null
    selectedSources.value = []
  }

  // --- クイック追加 / Quick add from source ---

  const handleQuickAddFromSource = () => {
    if (configType.value !== 'order-to-sheet') return
    if (selectedSources.value.length !== 1) return

    const source = selectedSources.value[0]
    if (!source) return

    const fieldName = source.label || source.name

    if (customTargetFields.value.includes(fieldName)) {
      showToast(t('wms.mapping.fieldAlreadyExistsNamed', `「${fieldName}」は既に存在します`), 'warning')
      return
    }

    customTargetFields.value = [...customTargetFields.value, fieldName]

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

    selectedSources.value = []
    showToast(t('wms.mapping.fieldAddedNamed', `「${fieldName}」を追加しました`), 'success')
  }

  // --- 表示ヘルパー / Display helpers ---

  const summaryForMapping = (mapping?: TransformMapping) => {
    if (!mapping) return t('wms.mapping.notSet', '未設定')
    if (!mapping.inputs || mapping.inputs.length === 0) return t('wms.mapping.notSet', '未設定')

    const parts: string[] = []

    mapping.inputs.forEach((input, idx) => {
      let inputLabel = ''
      if (input.type === 'column') {
        inputLabel = getDisplayName(input.column || '')
      } else if (input.type === 'literal') {
        inputLabel = t('wms.mapping.literalValue', '固定値')
      } else if (input.type === 'generated') {
        inputLabel = `${t('wms.mapping.generated', '生成')}(${input.generator || ''})`
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

    if (mapping.inputs.length > 1) {
      const combinePlugin = mapping.combine?.plugin || 'combine.first'
      parts.push(`→${combinePlugin.replace('combine.', '')}`)
    }

    const outputSteps = mapping.outputPipeline?.steps?.length || 0
    if (outputSteps > 0) {
      parts.push(`→${t('wms.mapping.output', '出力')}[${outputSteps}]`)
    }

    return parts.join(' ')
  }

  const getDisplayName = (field: string) => {
    if (field.startsWith('sourceRawRows.0.')) {
      const csvFieldName = field.replace('sourceRawRows.0.', '')
      return `sourceRawRows.${csvFieldName}`
    }

    const labels = configType.value === 'product' ? productFieldLabels : orderFieldLabels
    const directMatch = labels[field]
    if (directMatch) return directMatch

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

  return {
    // ダイアログ状態 / Dialog state
    detailDialogVisible,
    handlingTagsMappingDialogVisible,
    handlingTagsIndexDialogVisible,
    barcodeMappingDialogVisible,
    preSelectedSources,

    // マッピング操作 / Mapping operations
    handleDirectLink,
    handleAddLiteral,
    openTransformDialog,
    openDetailDialog,
    applyDetailMapping,
    openHandlingTagsMappingDialog,
    applyHandlingTagsMapping,
    openProductToStringTransform,
    openHandlingTagsIndexDialog,
    applyHandlingTagsIndex,
    openBarcodeMappingDialog,
    applyBarcodeMapping,
    clearSelected,
    clearAll,
    onCarrierChange,
    handleQuickAddFromSource,

    // 表示ヘルパー / Display helpers
    summaryForMapping,
    getDisplayName,
    getUsedByTargets,
    getTargetDisplayName,
  }
}
