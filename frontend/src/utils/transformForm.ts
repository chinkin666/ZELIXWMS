/**
 * ユーティリティ関数：JSON Schemaからフォームフィールド設定を生成 / 工具函数：从 JSON Schema 生成表单字段配置
 */

// パラメータ名から日本語ラベルへのマッピング / 参数名到日语标签的映射
const paramLabelMap: Record<string, string> = {
  // regex.extract
  pattern: '正規表現パターン',
  flags: 'フラグ',
  groups: 'グループ選択',
  separator: '区切り文字',
  default: 'デフォルト値',
  // lookup.contains / condition.equals
  caseSensitive: '大文字小文字を区別',
  // condition.equals
  compareTo: '比較する値',
  // string.split
  // separatorは上で定義済み / separator 已在上面定义
  // jp.sliceByWidth
  startWidth: '開始位置（文字幅）',
  endWidth: '終了位置（文字幅）',
  boundary: '境界処理',
  // number.parse
  allowThousands: 'カンマ区切りを許可',
  int: '整数として解析',
  // char.toHalfWidth / char.toFullWidth
  includeDigits: '数字を変換',
  includeLetters: '英字を変換',
  includeSymbols: '記号を変換',
  // common
  normalize: '内容の空白を削除',
  // array.index
  index: 'インデックス（0から開始）',
  // date.addDays
  days: '加算する日数',
  // json.pick
  path: 'JSONパス',
  // string.pad
  targetLength: '目標の長さ',
  padChar: '埋める文字',
  position: '埋める位置',
  // http.fetchJson
  url: 'URL',
  method: 'HTTPメソッド',
  timeoutMs: 'タイムアウト（ミリ秒）',
  pick: '取得するパス',
}

// パラメータ名からプレースホルダーへのマッピング / 参数名到 placeholder 的映射
const paramPlaceholderMap: Record<string, string> = {
  pattern: '例: \\d+ (数字を抽出)',
  flags: 'g=全部, i=大小文字無視, 空=最初の1つ',
  groups: '例: 1 / 1,3 / 1-3 / 0-2,4',
  separator: '空欄=そのまま結合',
  default: 'マッチしない場合の値',
  compareTo: '等しいかどうか判定する値',
  startWidth: '1から開始（半角=1、全角=2）',
  endWidth: '終了位置（半角=1、全角=2）',
  index: '0=最初の要素',
  days: '例: 30',
  path: '例: data.items[0].name',
  targetLength: '例: 8',
  padChar: 'デフォルト: 0',
  position: 'start=前方, end=後方',
  url: 'https://example.com/api',
  pick: '例: data.result',
}

export interface FormField {
  key: string
  label: string
  type: 'string' | 'number' | 'boolean' | 'select' | 'array' | 'object'
  required?: boolean
  default?: any
  options?: { label: string; value: any }[] // for select
  placeholder?: string
  description?: string
  min?: number
  max?: number
}

/**
 * JSON Schemaをフォームフィールド設定に変換 / 将 JSON Schema 转换为表单字段配置
 */
export function jsonSchemaToFormFields(schema: any, prefix = ''): FormField[] {
  if (!schema || schema.type !== 'object' || !schema.properties) {
    return []
  }

  const fields: FormField[] = []
  const required = schema.required || []

  for (const [key, prop] of Object.entries(schema.properties as Record<string, any>)) {
    const fieldKey = prefix ? `${prefix}.${key}` : key
    const isRequired = required.includes(key)

    // 日本語ラベルとプレースホルダーを取得 / 获取日语标签和 placeholder
    const label = paramLabelMap[key] || key
    const placeholder = paramPlaceholderMap[key] || prop.description || key

    if (prop.type === 'string') {
      if (prop.enum) {
        fields.push({
          key: fieldKey,
          label,
          type: 'select',
          required: isRequired,
          default: prop.default,
          options: prop.enum.map((v: any) => ({ label: String(v), value: v })),
          description: prop.description,
        })
      } else if (prop.const !== undefined) {
        // literal type, skip (handled by select)
      } else {
        fields.push({
          key: fieldKey,
          label,
          type: 'string',
          required: isRequired,
          default: prop.default,
          placeholder,
          description: prop.description,
        })
      }
    } else if (prop.type === 'number') {
      fields.push({
        key: fieldKey,
        label,
        type: 'number',
        required: isRequired,
        default: prop.default,
        min: prop.minimum,
        max: prop.maximum,
        description: prop.description,
      })
    } else if (prop.type === 'boolean') {
      fields.push({
        key: fieldKey,
        label,
        type: 'boolean',
        required: isRequired,
        default: prop.default ?? false,
        description: prop.description,
      })
    } else if (prop.type === 'any') {
      // any型は文字列入力として処理 / any 类型作为字符串输入处理
      fields.push({
        key: fieldKey,
        label,
        type: 'string',
        required: isRequired,
        default: prop.default,
        placeholder,
        description: prop.description,
      })
    } else if (prop.type === 'array') {
      // 簡略化処理：配列は暫定的に文字列入力（カンマ区切り） / 简化处理：数组暂时作为字符串输入（逗号分隔）
      fields.push({
        key: fieldKey,
        label: key,
        type: 'string',
        required: isRequired,
        default: prop.default,
        placeholder: 'カンマ区切りで入力',
        description: prop.description,
      })
    } else {
      // objectまたはその他の型、再帰処理 / object 或其他类型，递归处理
      const nested = jsonSchemaToFormFields(prop, fieldKey)
      fields.push(...nested)
    }
  }

  return fields
}

/**
 * フォーム値からパラメータオブジェクトを構築 / 从表单值构建参数对象
 */
export function buildParamsFromForm(fields: FormField[], formData: Record<string, any>): any {
  const params: any = {}
  const fieldKeys = new Set(fields.map(f => f.key))

  // まずfieldsに定義されたフィールドを処理 / 首先处理 fields 中定义的字段
  for (const field of fields) {
    const value = formData[field.key]
    if (value !== undefined && value !== null && value !== '') {
      if (field.type === 'number') {
        params[field.key] = Number(value)
      } else if (field.type === 'boolean') {
        params[field.key] = Boolean(value)
      } else if (field.type === 'array' && typeof value === 'string') {
        params[field.key] = value.split(',').map((s) => s.trim()).filter(Boolean)
      } else {
        params[field.key] = value
      }
    } else if (field.default !== undefined) {
      params[field.key] = field.default
    }
  }

  // fieldsに含まれない全ての元データを保持（例：lookup.mapのcases） / 保留所有不在 fields 中的原始数据（如 lookup.map 的 cases）
  // ただし一時フィールド（_entryIds, _entryMap）は除外 / 但排除临时字段（_entryIds, _entryMap）
  for (const [key, value] of Object.entries(formData)) {
    if (!fieldKeys.has(key) && !key.startsWith('_')) {
      params[key] = value
    }
  }

  // ネストされたオブジェクトを処理（keyにドットを含む場合） / 处理嵌套对象（key 包含点号）
  const result: any = {}
  for (const [key, value] of Object.entries(params)) {
    if (key.includes('.')) {
      const parts = key.split('.').filter(Boolean)
      if (parts.length > 0) {
        let current = result
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i]
          if (part && !current[part]) current[part] = {}
          if (part) current = current[part]
        }
        const lastPart = parts[parts.length - 1]
        if (lastPart) current[lastPart] = value
      }
    } else {
      result[key] = value
    }
  }

  return Object.keys(result).length > 0 ? result : undefined
}

