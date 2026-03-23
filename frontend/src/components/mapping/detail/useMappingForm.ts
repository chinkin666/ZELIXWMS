/**
 * マッピングフォームのコンポーザブル / 映射表单组合式函数
 *
 * MappingDetailDialog から抽出したリアクティブ状態・変更関数・プレビューロジック
 * 从 MappingDetailDialog 提取的响应式状态、变更函数、预览逻辑
 */
import { computed, reactive, watch, ref, onMounted, type Ref } from 'vue'
import {
  getTransformPlugins,
  type TransformPluginInfo,
  type TransformPipeline,
  type TransformStep,
  type TransformMapping,
  type InputSource,
} from '@/api/mappingConfig'
import {
  jsonSchemaToFormFields,
  buildParamsFromForm,
  type FormField,
} from '@/utils/transformForm'
import { runTransformMapping } from '@/utils/transformRunner'

// ----- 型定義 / 类型定义 -----

/** フォーム内の入力項目 / 表单中的输入项 */
export interface FormInput {
  id: string
  type: 'column' | 'literal'
  column?: string
  value?: any
  pipelineSteps: Array<{ id: string; plugin: string; params: Record<string, any> }>
}

/** 出力先フィールド行 / 输出目标字段行 */
export interface TargetRow {
  field: string
  required: boolean
}

/** 入力元フィールド行 / 输入源字段行 */
export interface SourceRow {
  name: string
  label?: string
}

/** コンポーザブルに渡すプロパティ / 传递给组合式函数的属性 */
export interface UseMappingFormOptions {
  /** ダイアログ表示状態 / 对话框显示状态 */
  modelValue: Ref<boolean>
  /** 対象フィールド / 目标字段 */
  target: Ref<TargetRow | null>
  /** 既存マッピング / 现有映射 */
  mapping: Ref<TransformMapping | null>
  /** 事前選択された入力元 / 预先选择的输入源 */
  preSelectedSources: Ref<SourceRow[] | undefined>
  /** サンプル行データ / 样本行数据 */
  sampleRow: Ref<Record<string, any> | null | undefined>
  /** 設定タイプ / 配置类型 */
  configType: Ref<string | undefined>
  /** 配送業者ID / 承运商ID */
  carrierId: Ref<string | null | undefined>
  /** 配送業者オプション / 承运商选项 */
  carrierOptions: Ref<any[] | undefined>
}

// ----- ユニークID生成 / 生成唯一ID -----

const generateId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

// ----- 日付フォーマット関連 / 日期格式相关 -----

/** 日付精度を推定する / 推断日期精度 */
const inferDateParsePrecision = (formats: any): 'date' | 'datetime' => {
  const list = Array.isArray(formats) ? formats : []
  // 入力フォーマットに時刻が含まれる場合は秒精度 / 如果输入格式包含时间则为秒精度
  const hasTime = list.some(
    (f) => typeof f === 'string' && (f.includes('HH') || f.includes(':')),
  )
  return hasTime ? 'datetime' : 'date'
}

/** 日付フォーマット選択肢を取得 / 获取日期格式选项 */
const getDateFormatOptions = (
  plugin: string,
  fieldKey: string,
): Array<{ label: string; value: any }> => {
  const dateFormats = [
    { label: 'YYYY-MM-DD (日まで)', value: 'YYYY-MM-DD', precision: 'date' },
    { label: 'YYYY/MM/DD (日まで)', value: 'YYYY/MM/DD', precision: 'date' },
    { label: 'MM/DD/YYYY (日まで)', value: 'MM/DD/YYYY', precision: 'date' },
    { label: 'DD/MM/YYYY (日まで)', value: 'DD/MM/YYYY', precision: 'date' },
    { label: 'YYYY-MM-DD HH:mm:ss (秒まで)', value: 'YYYY-MM-DD HH:mm:ss', precision: 'datetime' },
    { label: 'YYYY/MM/DD HH:mm:ss (秒まで)', value: 'YYYY/MM/DD HH:mm:ss', precision: 'datetime' },
    { label: 'YYYY-MM-DD HH:mm (分まで)', value: 'YYYY-MM-DD HH:mm', precision: 'datetime' },
    { label: 'YYYY/MM/DD HH:mm (分まで)', value: 'YYYY/MM/DD HH:mm', precision: 'datetime' },
  ]

  if (plugin === 'date.parse') {
    if (fieldKey === 'formats') {
      return dateFormats.map((f) => ({ label: f.label, value: f.value }))
    }
  } else if (plugin === 'date.format') {
    if (fieldKey === 'format' || fieldKey === 'dateFormat') {
      return [
        ...dateFormats.map((f) => ({ label: f.label, value: f.value })),
        { label: 'YYYY (年のみ)', value: 'YYYY' },
        { label: 'MM (月のみ、0埋め)', value: 'MM' },
        { label: 'M (月のみ)', value: 'M' },
        { label: 'DD (日のみ、0埋め)', value: 'DD' },
        { label: 'D (日のみ)', value: 'D' },
        { label: 'YYYY年MM月DD日 (日本語、0埋め)', value: 'YYYY年MM月DD日' },
        { label: 'YYYY年M月D日 (日本語)', value: 'YYYY年M月D日' },
      ]
    } else if (fieldKey === 'timeFormat') {
      return [
        { label: 'HH:mm:ss (秒まで)', value: 'HH:mm:ss' },
        { label: 'HH:mm (分まで)', value: 'HH:mm' },
      ]
    }
  }

  return []
}

// ----- メインコンポーザブル / 主组合式函数 -----

export function useMappingForm(options: UseMappingFormOptions) {
  const {
    modelValue,
    target,
    mapping,
    preSelectedSources,
    sampleRow,
  } = options

  // ----- プラグイン一覧 / 插件列表 -----

  const transformPlugins = ref<TransformPluginInfo[]>([])

  onMounted(async () => {
    try {
      const plugins = await getTransformPlugins()
      transformPlugins.value = plugins.transforms
    } catch (_e) {
      // プラグイン読み込み失敗 / 插件加载失败
    }
  })

  // ----- リアクティブフォーム状態 / 响应式表单状态 -----

  const form = reactive<{
    defaultValue: any
    inputs: FormInput[]
    outputPipelineSteps: Array<{ id: string; plugin: string; params: Record<string, any> }>
  }>({
    defaultValue: undefined,
    inputs: [],
    outputPipelineSteps: [],
  })

  /** 入力ステップのフォームフィールド / 输入步骤的表单字段 [inputIdx][stepIdx][fields] */
  const inputStepFields = ref<FormField[][][]>([])
  /** 出力ステップのフォームフィールド / 输出步骤的表单字段 [stepIdx][fields] */
  const outputStepFields = ref<FormField[][]>([])

  /** 利用可能な列 / 可用列 */
  const availableColumns = computed(() => {
    if (!sampleRow.value) return []
    return Object.keys(sampleRow.value)
  })

  // ----- プラグイン説明取得 / 获取插件说明 -----

  const getPluginDescription = (pluginName: string): string | null => {
    const plugin = transformPlugins.value.find((p) => p.name === pluginName)
    if (!plugin?.descriptionJa) return null
    return plugin.descriptionJa.replace(/\n/g, '<br>')
  }

  // ----- プラグインパラメータ初期化共通関数 / 插件参数初始化通用函数 -----

  /**
   * プラグイン変更時のフィールド・パラメータ初期化
   * 插件变更时的字段和参数初始化
   */
  const initPluginFields = (
    step: { plugin: string; params: Record<string, any> },
    pluginInfo: TransformPluginInfo,
  ): FormField[] => {
    if (!pluginInfo.paramsSchema) return []

    let fields = jsonSchemaToFormFields(pluginInfo.paramsSchema)

    // 日付系プラグインのフォーマットフィールドをカスタマイズ / 自定义日期插件格式字段
    if (
      step.plugin === 'date.parse' ||
      step.plugin === 'date.format' ||
      step.plugin === 'date.addDays'
    ) {
      fields = fields.map((field) => {
        if (field.key === 'formats') {
          return {
            ...field,
            label: '入力日付形式（複数指定可）',
            type: 'select' as const,
            options: getDateFormatOptions(step.plugin, field.key),
          }
        } else if (
          field.key === 'format' ||
          field.key === 'dateFormat' ||
          field.key === 'timeFormat'
        ) {
          return {
            ...field,
            type: 'select' as const,
            options: getDateFormatOptions(step.plugin, field.key),
          }
        } else if (field.key === 'precision') {
          return {
            ...field,
            label:
              step.plugin === 'date.parse'
                ? 'データベース保存精度（日/秒）'
                : '出力精度（日/秒）',
          }
        }
        return field
      })
    }

    // date.format: 出力フォーマット選択 / 输出格式选择（单选下拉）
    if (step.plugin === 'date.format') {
      fields = [
        {
          key: 'format',
          label: '出力フォーマット',
          type: 'select' as const,
          options: getDateFormatOptions('date.format', 'format'),
          default: 'YYYY/MM/DD',
        } as FormField,
      ]
    }

    return fields
  }

  /**
   * プラグイン固有パラメータの初期化・復元
   * 初始化/恢复插件特有参数
   */
  const initPluginParams = (
    step: { plugin: string; params: Record<string, any> },
    fields: FormField[],
    existingParams: Record<string, any>,
  ) => {
    step.params = {}
    for (const field of fields) {
      // DB 値を優先、なければデフォルト / 优先使用DB值，否则使用默认值
      if (existingParams[field.key] !== undefined) {
        step.params[field.key] = existingParams[field.key]
      } else if (field.default !== undefined) {
        step.params[field.key] = field.default
      }
    }

    // lookup.map: cases 復元 / 恢复 cases
    if (step.plugin === 'lookup.map') {
      step.params.cases =
        existingParams.cases && typeof existingParams.cases === 'object'
          ? existingParams.cases
          : {}
    }
    // lookup.contains: rules 初期化 / 初始化 rules
    if (step.plugin === 'lookup.contains') {
      step.params.rules = Array.isArray(existingParams.rules)
        ? existingParams.rules
        : []
    }
    // string.replace: rules 初期化 / 初始化 rules
    if (step.plugin === 'string.replace') {
      step.params.rules = Array.isArray(existingParams.rules)
        ? existingParams.rules
        : []
    }
    // http.fetchJson: bodyParams 初期化 / 初始化 bodyParams
    if (step.plugin === 'http.fetchJson' && !step.params.bodyParams) {
      step.params.bodyParams = []
    }
    // date.parse: formats 配列と precision / formats 数组和 precision
    if (step.plugin === 'date.parse') {
      if (!step.params.formats) {
        step.params.formats = ['YYYY-MM-DD']
      }
      if (!step.params.precision) {
        step.params.precision = inferDateParsePrecision(step.params.formats)
      }
    }
    // date.format: precision 初期化 / 初始化 precision
    if (step.plugin === 'date.format' && !step.params.precision) {
      step.params.precision = 'datetime'
    }
    // date.addDays: days 初期化 / 初始化 days
    if (step.plugin === 'date.addDays') {
      if (step.params.days === undefined || step.params.days === null) {
        step.params.days = 30
      }
    }
    // jp.sliceByWidth: boundary 初期化 / 初始化 boundary
    if (step.plugin === 'jp.sliceByWidth' && !step.params.boundary) {
      step.params.boundary = 'keepLeft'
    }
    // string.insertSymbol: positions 配列初期化 / 初始化 positions 数组
    if (step.plugin === 'string.insertSymbol') {
      if (!Array.isArray(step.params.positions)) {
        step.params.positions = [0]
      } else {
        step.params.positions = step.params.positions
          .map((p: any) => (typeof p === 'number' && p >= 0 ? p : 0))
          .filter((p: number, idx: number, arr: number[]) => arr.indexOf(p) === idx)
        if (step.params.positions.length === 0) {
          step.params.positions = [0]
        }
      }
      if (!step.params.symbol) {
        step.params.symbol = '-'
      }
    }
  }

  // ----- 入力操作 / 输入操作 -----

  /** 入力を追加 / 添加输入 */
  const addInput = () => {
    form.inputs.push({
      id: generateId('input'),
      type: 'column',
      column: '',
      pipelineSteps: [],
    })
    inputStepFields.value.push([])
  }

  /** 入力を削除 / 删除输入 */
  const removeInput = (idx: number) => {
    form.inputs.splice(idx, 1)
    inputStepFields.value.splice(idx, 1)
  }

  /** 入力を上へ移動 / 上移输入 */
  const moveInputUp = (idx: number) => {
    if (idx === 0) return
    const temp = form.inputs[idx]
    const prev = form.inputs[idx - 1]
    if (temp && prev) {
      form.inputs[idx] = prev
      form.inputs[idx - 1] = temp
      const tempFields = inputStepFields.value[idx]
      const prevFields = inputStepFields.value[idx - 1]
      inputStepFields.value[idx] = prevFields || []
      inputStepFields.value[idx - 1] = tempFields || []
    }
  }

  /** 入力を下へ移動 / 下移输入 */
  const moveInputDown = (idx: number) => {
    if (idx === form.inputs.length - 1) return
    const temp = form.inputs[idx]
    const next = form.inputs[idx + 1]
    if (temp && next) {
      form.inputs[idx] = next
      form.inputs[idx + 1] = temp
      const tempFields = inputStepFields.value[idx]
      const nextFields = inputStepFields.value[idx + 1]
      inputStepFields.value[idx] = nextFields || []
      inputStepFields.value[idx + 1] = tempFields || []
    }
  }

  /** 入力タイプ変更ハンドラ / 输入类型变更处理 */
  const onInputTypeChange = (idx: number) => {
    const input = form.inputs[idx]
    if (!input) return
    if (input.type === 'column') {
      input.column = ''
    } else if (input.type === 'literal') {
      input.value = ''
    }
  }

  // ----- 入力ステップ操作 / 输入步骤操作 -----

  /** 入力変換ステップを追加 / 添加输入变换步骤 */
  const addInputStep = (inputIdx: number) => {
    const input = form.inputs[inputIdx]
    if (!input) return
    input.pipelineSteps.push({ id: generateId('step'), plugin: '', params: {} })
    if (!inputStepFields.value[inputIdx]) inputStepFields.value[inputIdx] = []
    inputStepFields.value[inputIdx].push([])
  }

  /** 入力変換ステップを削除 / 删除输入变换步骤 */
  const removeInputStep = (inputIdx: number, stepIdx: number) => {
    const input = form.inputs[inputIdx]
    if (!input) return
    input.pipelineSteps.splice(stepIdx, 1)
    if (inputStepFields.value[inputIdx]) {
      inputStepFields.value[inputIdx].splice(stepIdx, 1)
    }
  }

  /** 入力ステップのプラグイン変更ハンドラ / 输入步骤插件变更处理 */
  const onInputStepPluginChange = (inputIdx: number, stepIdx: number) => {
    const input = form.inputs[inputIdx]
    if (!input) return
    const step = input.pipelineSteps[stepIdx]
    if (!step) return

    const pluginInfo = transformPlugins.value.find((p) => p.name === step.plugin)
    if (pluginInfo?.paramsSchema) {
      if (!inputStepFields.value[inputIdx]) inputStepFields.value[inputIdx] = []
      const fields = initPluginFields(step, pluginInfo)
      inputStepFields.value[inputIdx][stepIdx] = fields
      const existingParams = { ...step.params }
      initPluginParams(step, fields, existingParams)
    } else {
      if (!inputStepFields.value[inputIdx]) inputStepFields.value[inputIdx] = []
      inputStepFields.value[inputIdx][stepIdx] = []
    }
  }

  // ----- 出力ステップ操作 / 输出步骤操作 -----

  /** 出力変換ステップを追加 / 添加输出变换步骤 */
  const addOutputStep = () => {
    form.outputPipelineSteps.push({ id: generateId('step'), plugin: '', params: {} })
    outputStepFields.value.push([])
  }

  /** 出力変換ステップを削除 / 删除输出变换步骤 */
  const removeOutputStep = (stepIdx: number) => {
    form.outputPipelineSteps.splice(stepIdx, 1)
    outputStepFields.value.splice(stepIdx, 1)
  }

  /** 出力ステップのプラグイン変更ハンドラ / 输出步骤插件变更处理 */
  const onOutputStepPluginChange = (stepIdx: number) => {
    const step = form.outputPipelineSteps[stepIdx]
    if (!step) return

    const pluginInfo = transformPlugins.value.find((p) => p.name === step.plugin)
    if (pluginInfo?.paramsSchema) {
      const fields = initPluginFields(step, pluginInfo)
      outputStepFields.value[stepIdx] = fields
      const existingParams = { ...step.params }
      initPluginParams(step, fields, existingParams)
    } else {
      outputStepFields.value[stepIdx] = []
    }
  }

  // ----- lookup.map ヘルパー / lookup.map 辅助函数 -----

  const getLookupMapEntries = (
    params: Record<string, any>,
  ): Array<{ id: string; key: string; value: any }> => {
    if (!params?.cases || typeof params.cases !== 'object') return []
    return Object.entries(params.cases).map(([key, value]) => ({
      id: `entry-${key}`,
      key,
      value,
    }))
  }

  const addLookupMapEntry = (params: Record<string, any>) => {
    if (!params.cases) params.cases = {}
    let newKey = ''
    let i = 1
    while (Object.prototype.hasOwnProperty.call(params.cases, newKey) || newKey === '') {
      newKey = `新規キー${i++}`
    }
    params.cases[newKey] = ''
  }

  const removeLookupMapEntry = (params: Record<string, any>, key: string) => {
    if (params?.cases) {
      delete params.cases[key]
    }
  }

  const updateLookupMapEntryKey = (
    params: Record<string, any>,
    oldKey: string,
    newKey: string,
  ) => {
    if (!params?.cases || oldKey === newKey) return
    const value = params.cases[oldKey]
    delete params.cases[oldKey]
    params.cases[newKey] = value
  }

  const updateLookupMapEntryValue = (
    params: Record<string, any>,
    key: string,
    newValue: any,
  ) => {
    if (params?.cases) {
      params.cases[key] = newValue
    }
  }

  // ----- lookup.contains ヘルパー / lookup.contains 辅助函数 -----

  const addLookupContainsRule = (params: Record<string, any>) => {
    if (!params.rules) params.rules = []
    params.rules.push({ search: '', value: '' })
  }

  const removeLookupContainsRule = (params: Record<string, any>, idx: number) => {
    if (params?.rules) {
      params.rules.splice(idx, 1)
    }
  }

  // ----- string.replace ヘルパー / string.replace 辅助函数 -----

  const addStringReplaceRule = (params: Record<string, any>) => {
    if (!params.rules) params.rules = []
    params.rules.push({ search: '', replace: '', count: 0 })
  }

  const removeStringReplaceRule = (params: Record<string, any>, idx: number) => {
    if (params?.rules) {
      params.rules.splice(idx, 1)
    }
  }

  // ----- http.fetchJson ヘルパー / http.fetchJson 辅助函数 -----

  const addBodyParam = (params: Record<string, any>) => {
    if (!params.bodyParams) params.bodyParams = []
    params.bodyParams.push({
      key: '',
      value: '',
      source: 'literal',
      column: undefined,
    })
  }

  const removeBodyParam = (params: Record<string, any>, idx: number) => {
    if (params.bodyParams) {
      params.bodyParams.splice(idx, 1)
    }
  }

  const onBodyParamSourceChange = (param: any) => {
    if (param.source === 'column') {
      param.value = undefined
    } else {
      param.column = undefined
    }
  }

  // ----- string.insertSymbol ヘルパー / string.insertSymbol 辅助函数 -----

  const addInsertSymbolPosition = (params: Record<string, any>) => {
    if (!Array.isArray(params.positions)) params.positions = []
    params.positions.push(0)
  }

  const removeInsertSymbolPosition = (params: Record<string, any>, idx: number) => {
    if (Array.isArray(params.positions)) {
      params.positions.splice(idx, 1)
      // 配列が空なら最低1つ保持 / 数组为空时至少保留1个
      if (params.positions.length === 0) {
        params.positions.push(0)
      }
    }
  }

  // ----- date.parse ヘルパー / date.parse 辅助函数 -----

  const onDateParseFormatsChanged = (step: any) => {
    if (!step || step.plugin !== 'date.parse') return
    const inferred = inferDateParsePrecision(step.params?.formats)
    step.params = step.params || {}
    step.params.precision = inferred
  }

  const addDateFormat = (params: Record<string, any>) => {
    if (!params.formats) params.formats = []
    params.formats.push('YYYY-MM-DD')
    // 精度を同期 / 同步精度
    if (!params.precision) {
      params.precision = inferDateParsePrecision(params.formats)
    }
  }

  // ----- フォーム初期化ウォッチャー / 表单初始化监听器 -----

  watch(
    () => [mapping.value, modelValue.value, preSelectedSources.value] as const,
    ([m, visible, preSelected]) => {
      if (visible) {
        if (m) {
          // 既存 mapping を読み込む / 加载现有映射
          form.defaultValue = m.defaultValue
          form.inputs = m.inputs
            .filter((inp) => inp.type === 'column' || inp.type === 'literal')
            .map((inp) => ({
              id: inp.id,
              type: inp.type as 'column' | 'literal',
              column: inp.type === 'column' ? inp.column : undefined,
              value: inp.type === 'literal' ? inp.value : undefined,
              pipelineSteps:
                inp.pipeline?.steps?.map((s) => ({
                  id: s.id,
                  plugin: s.plugin,
                  params: s.params || {},
                })) || [],
            }))
          form.outputPipelineSteps =
            m.outputPipeline?.steps?.map((s) => ({
              id: s.id,
              plugin: s.plugin,
              params: s.params || {},
            })) || []

          // フィールド設定を初期化 / 初始化字段设置
          inputStepFields.value = form.inputs.map((inp) =>
            inp.pipelineSteps.map(() => [] as FormField[]),
          )
          outputStepFields.value = form.outputPipelineSteps.map(() => [] as FormField[])

          // 各ステップのフィールド設定を読み込む / 加载各步骤的字段设置
          form.inputs.forEach((inp, inpIdx) => {
            inp.pipelineSteps.forEach((step, stepIdx) => {
              if (step.plugin) {
                onInputStepPluginChange(inpIdx, stepIdx)
              }
            })
          })
          form.outputPipelineSteps.forEach((step, stepIdx) => {
            if (step.plugin) {
              onOutputStepPluginChange(stepIdx)
            }
          })
        } else if (preSelected && preSelected.length > 0) {
          // mapping なし、事前選択の入力元を自動追加 / 无映射，自动添加预选输入源
          form.defaultValue = undefined
          form.inputs = preSelected.map((src, idx) => ({
            id: `input-${Date.now()}-${idx}`,
            type: 'column' as const,
            column: src.name,
            pipelineSteps: [],
          }))
          form.outputPipelineSteps = []
          inputStepFields.value = form.inputs.map(() => [])
          outputStepFields.value = []
        } else {
          // 新規作成 / 新建
          form.defaultValue = undefined
          form.inputs = []
          form.outputPipelineSteps = []
          inputStepFields.value = []
          outputStepFields.value = []
        }
      }
    },
    { immediate: true },
  )

  // ----- プレビュー / 预览 -----

  const previewValue = ref<string>('（計算中...）')

  /** 参照中の入力元列 / 正在引用的输入源列 */
  const referencedSources = computed(() => {
    return form.inputs.filter((i) => i.type === 'column').map((i) => i.column || '')
  })

  /** 現在の TransformMapping を構築（プレビュー用）/ 构建当前 TransformMapping（用于预览） */
  const buildCurrentMapping = (): TransformMapping | null => {
    if (form.inputs.length === 0) return null

    const inputs: InputSource[] = form.inputs
      .map((inp): InputSource | null => {
        const pipelineSteps: TransformStep[] = inp.pipelineSteps
          .filter((s) => s.plugin)
          .map((s) => ({
            id: s.id,
            plugin: s.plugin,
            params: s.params || {},
            enabled: true,
          }))

        const pipeline: TransformPipeline | undefined =
          pipelineSteps.length > 0 ? { steps: pipelineSteps } : undefined

        if (inp.type === 'column') {
          return {
            id: inp.id,
            type: 'column' as const,
            column: inp.column || '',
            pipeline,
          }
        } else if (inp.type === 'literal') {
          return {
            id: inp.id,
            type: 'literal' as const,
            value: inp.value,
            pipeline,
          }
        }
        return null
      })
      .filter((inp): inp is InputSource => inp !== null)

    const outputSteps: TransformStep[] = form.outputPipelineSteps
      .filter((s) => s.plugin)
      .map((s) => ({
        id: s.id,
        plugin: s.plugin,
        params: s.params || {},
        enabled: true,
      }))

    const combinePlugin = inputs.length > 1 ? 'combine.concat' : 'combine.first'

    return {
      targetField: target.value?.field || '',
      inputs,
      combine: {
        plugin: combinePlugin,
        params: {},
      },
      outputPipeline: outputSteps.length > 0 ? { steps: outputSteps } : undefined,
      defaultValue: form.defaultValue,
    }
  }

  // フォーム変更を監視し、プレビューを非同期更新 / 监听表单变更，异步更新预览
  watch(
    () => [form.inputs, form.outputPipelineSteps, form.defaultValue, sampleRow.value],
    async () => {
      if (!sampleRow.value) {
        previewValue.value = '（サンプルなし）'
        return
      }

      const currentMapping = buildCurrentMapping()
      if (!currentMapping) {
        previewValue.value = '（入力なし）'
        return
      }

      try {
        const result = await runTransformMapping(currentMapping, sampleRow.value)
        if (result === null || result === undefined) {
          previewValue.value = '（空）'
        } else if (typeof result === 'object') {
          previewValue.value = JSON.stringify(result)
        } else {
          previewValue.value = String(result)
        }
      } catch (error) {
        previewValue.value = `（エラー: ${error instanceof Error ? error.message : '不明なエラー'}）`
      }
    },
    { deep: true, immediate: true },
  )

  // ----- 送信処理 / 提交处理 -----

  /** lookup.map 一時データを除去 / 移除 lookup.map 临时数据 */
  const cleanupLookupMapParams = (params: Record<string, any>) => {
    for (const key of Object.keys(params)) {
      if (key.startsWith('_')) {
        delete params[key]
      }
    }
  }

  /** フォームデータから TransformMapping を構築して返す / 从表单数据构建 TransformMapping 并返回 */
  const buildSubmitMapping = (): TransformMapping | null => {
    if (!target.value) return null

    const inputs: InputSource[] = form.inputs
      .map((inp, inpIdx): InputSource | null => {
        const steps: TransformStep[] = inp.pipelineSteps
          .filter((s) => s.plugin)
          .map((s, stepIdx) => {
            const params = buildParamsFromForm(
              inputStepFields.value[inpIdx]?.[stepIdx] || [],
              s.params,
            )
            if (s.plugin === 'lookup.map') {
              cleanupLookupMapParams(params)
            }
            return {
              id: s.id,
              plugin: s.plugin,
              params,
              enabled: true,
            }
          })

        const pipeline: TransformPipeline = { steps }

        if (inp.type === 'column') {
          return {
            id: inp.id,
            type: 'column' as const,
            column: inp.column || '',
            pipeline,
          }
        } else if (inp.type === 'literal') {
          return {
            id: inp.id,
            type: 'literal' as const,
            value: inp.value,
            pipeline,
          }
        }
        return null
      })
      .filter((inp): inp is InputSource => inp !== null)

    const outputSteps: TransformStep[] = form.outputPipelineSteps
      .filter((s) => s.plugin)
      .map((s, stepIdx) => {
        const params = buildParamsFromForm(
          outputStepFields.value[stepIdx] || [],
          s.params,
        )
        if (s.plugin === 'lookup.map') {
          cleanupLookupMapParams(params)
        }
        return {
          id: s.id,
          plugin: s.plugin,
          params,
          enabled: true,
        }
      })

    const combinePlugin = inputs.length > 1 ? 'combine.concat' : 'combine.first'

    // 最終クリーンアップ / 最终清理
    const finalCleanup = (steps: TransformStep[]) => {
      steps.forEach((step) => {
        if (step.plugin === 'lookup.map' && step.params) {
          cleanupLookupMapParams(step.params)
        }
      })
    }
    finalCleanup(inputs.flatMap((inp) => inp.pipeline?.steps || []))
    finalCleanup(outputSteps)

    return {
      targetField: target.value.field,
      inputs,
      combine: {
        plugin: combinePlugin,
        params: {},
      },
      outputPipeline: outputSteps.length > 0 ? { steps: outputSteps } : undefined,
      required: target.value.required ?? false,
      defaultValue: form.defaultValue || undefined,
    }
  }

  return {
    // 状態 / 状态
    form,
    inputStepFields,
    outputStepFields,
    transformPlugins,
    availableColumns,
    previewValue,
    referencedSources,

    // プラグイン情報 / 插件信息
    getPluginDescription,

    // 入力操作 / 输入操作
    addInput,
    removeInput,
    moveInputUp,
    moveInputDown,
    onInputTypeChange,

    // 入力ステップ操作 / 输入步骤操作
    addInputStep,
    removeInputStep,
    onInputStepPluginChange,

    // 出力ステップ操作 / 输出步骤操作
    addOutputStep,
    removeOutputStep,
    onOutputStepPluginChange,

    // lookup.map ヘルパー / 辅助函数
    getLookupMapEntries,
    addLookupMapEntry,
    removeLookupMapEntry,
    updateLookupMapEntryKey,
    updateLookupMapEntryValue,

    // lookup.contains ヘルパー / 辅助函数
    addLookupContainsRule,
    removeLookupContainsRule,

    // string.replace ヘルパー / 辅助函数
    addStringReplaceRule,
    removeStringReplaceRule,

    // http.fetchJson ヘルパー / 辅助函数
    addBodyParam,
    removeBodyParam,
    onBodyParamSourceChange,

    // string.insertSymbol ヘルパー / 辅助函数
    addInsertSymbolPosition,
    removeInsertSymbolPosition,

    // date ヘルパー / 辅助函数
    onDateParseFormatsChanged,
    addDateFormat,

    // 送信 / 提交
    buildSubmitMapping,
  }
}
