/**
 * Transform plugins - 前端实现
 * 所有转换逻辑都在前端执行
 */

import type { TransformContext } from '@/api/mappingConfig'

// 辅助函数：获取日文字符宽度（半角=1，全角=2）
function getJapaneseCharWidth(ch: string): number {
  const code = ch.charCodeAt(0)
  // ASCII (半角)
  if (code <= 0x007f) return 1
  // 半角カタカナ
  if (code >= 0xff61 && code <= 0xff9f) return 1
  // 半角ハングル
  if (code >= 0xffa0 && code <= 0xffdc) return 1
  // CJK統一漢字
  if (code >= 0x4e00 && code <= 0x9fff) return 2
  // 平仮名
  if (code >= 0x3040 && code <= 0x309f) return 2
  // 片仮名（全角）
  if (code >= 0x30a0 && code <= 0x30ff) return 2
  // 全角ASCII・記号 (0xFF01-0xFF60)
  if (code >= 0xff01 && code <= 0xff60) return 2
  // 全角通貨記号など (0xFFE0-0xFFEF)
  if (code >= 0xffe0 && code <= 0xffef) return 2
  // CJK記号・句読点
  if (code >= 0x3000 && code <= 0x303f) return 2
  // その他は全角として扱う（安全側）
  return 2
}

// 全角到半角的映射表
const fullToHalfWidthMap: Record<string, string> = {
  // 数字
  '０': '0', '１': '1', '２': '2', '３': '3', '４': '4',
  '５': '5', '６': '6', '７': '7', '８': '8', '９': '9',
  // 大写字母
  'Ａ': 'A', 'Ｂ': 'B', 'Ｃ': 'C', 'Ｄ': 'D', 'Ｅ': 'E', 'Ｆ': 'F',
  'Ｇ': 'G', 'Ｈ': 'H', 'Ｉ': 'I', 'Ｊ': 'J', 'Ｋ': 'K', 'Ｌ': 'L',
  'Ｍ': 'M', 'Ｎ': 'N', 'Ｏ': 'O', 'Ｐ': 'P', 'Ｑ': 'Q', 'Ｒ': 'R',
  'Ｓ': 'S', 'Ｔ': 'T', 'Ｕ': 'U', 'Ｖ': 'V', 'Ｗ': 'W', 'Ｘ': 'X',
  'Ｙ': 'Y', 'Ｚ': 'Z',
  // 小写字母
  'ａ': 'a', 'ｂ': 'b', 'ｃ': 'c', 'ｄ': 'd', 'ｅ': 'e', 'ｆ': 'f',
  'ｇ': 'g', 'ｈ': 'h', 'ｉ': 'i', 'ｊ': 'j', 'ｋ': 'k', 'ｌ': 'l',
  'ｍ': 'm', 'ｎ': 'n', 'ｏ': 'o', 'ｐ': 'p', 'ｑ': 'q', 'ｒ': 'r',
  'ｓ': 's', 'ｔ': 't', 'ｕ': 'u', 'ｖ': 'v', 'ｗ': 'w', 'ｘ': 'x',
  'ｙ': 'y', 'ｚ': 'z',
  // 符号
  '！': '!', '？': '?', '：': ':', '；': ';', '，': ',', '．': '.',
  '（': '(', '）': ')', '［': '[', '］': ']', '｛': '{', '｝': '}',
  '「': '"', '」': '"', '『': "'", '』': "'", '〜': '~', 'ー': '-',
  '＿': '_', '＠': '@', '＃': '#', '＄': '$', '％': '%', '＆': '&',
  '＊': '*', '＋': '+', '＝': '=', '＜': '<', '＞': '>', '／': '/',
  '＼': '\\', '｜': '|', '＾': '^', '｀': '`',
  '　': ' ', // 全角空格
}

// 半角到全角的映射表（反向映射）
const halfToFullWidthMap: Record<string, string> = Object.fromEntries(
  Object.entries(fullToHalfWidthMap).map(([full, half]) => [half, full])
)

// 辅助函数：按格式解析日期（使用本地时间，不进行时区转换）
function parseDateByFormat(value: string, format: string): Date | null {
  // 支持灵活的时间格式（小时、分钟、秒可以是1位或2位数）
  const formatMap: Record<string, RegExp> = {
    'YYYY-MM-DD': /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    'YYYY/MM/DD': /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,
    'MM/DD/YYYY': /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    'DD/MM/YYYY': /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    'YYYY-MM-DD HH:mm:ss': /^(\d{4})-(\d{1,2})-(\d{1,2}) (\d{1,2}):(\d{1,2}):(\d{1,2})$/,
    'YYYY/MM/DD HH:mm:ss': /^(\d{4})\/(\d{1,2})\/(\d{1,2}) (\d{1,2}):(\d{1,2}):(\d{1,2})$/,
    'YYYY-MM-DD HH:mm': /^(\d{4})-(\d{1,2})-(\d{1,2}) (\d{1,2}):(\d{1,2})$/,
    'YYYY/MM/DD HH:mm': /^(\d{4})\/(\d{1,2})\/(\d{1,2}) (\d{1,2}):(\d{1,2})$/,
  }

  const regex = formatMap[format]
  if (!regex) {
    // 如果没有匹配的格式，尝试使用 Date 构造函数（但要注意时区问题）
    const d = new Date(value)
    return isNaN(d.getTime()) ? null : d
  }

  const match = value.match(regex)
  if (!match) return null

  if (format.includes('HH:mm:ss')) {
    const parts = match as RegExpMatchArray
    const year = parseInt(parts[1] || '0', 10)
    const month = parseInt(parts[2] || '0', 10) - 1
    const day = parseInt(parts[3] || '0', 10)
    const hour = parseInt(parts[4] || '0', 10)
    const minute = parseInt(parts[5] || '0', 10)
    const second = parseInt(parts[6] || '0', 10)
    // 使用本地时间创建 Date 对象，不进行时区转换
    return new Date(year, month, day, hour, minute, second)
  } else if (format.includes('HH:mm')) {
    const parts = match as RegExpMatchArray
    const year = parseInt(parts[1] || '0', 10)
    const month = parseInt(parts[2] || '0', 10) - 1
    const day = parseInt(parts[3] || '0', 10)
    const hour = parseInt(parts[4] || '0', 10)
    const minute = parseInt(parts[5] || '0', 10)
    // 使用本地时间创建 Date 对象，不进行时区转换
    return new Date(year, month, day, hour, minute, 0)
  } else {
    const parts = match as RegExpMatchArray
    if (format === 'MM/DD/YYYY') {
      const month = parseInt(parts[1] || '0', 10) - 1
      const day = parseInt(parts[2] || '0', 10)
      const year = parseInt(parts[3] || '0', 10)
      return new Date(year, month, day)
    } else if (format === 'DD/MM/YYYY') {
      const day = parseInt(parts[1] || '0', 10)
      const month = parseInt(parts[2] || '0', 10) - 1
      const year = parseInt(parts[3] || '0', 10)
      return new Date(year, month, day)
    } else {
      const year = parseInt(parts[1] || '0', 10)
      const month = parseInt(parts[2] || '0', 10) - 1
      const day = parseInt(parts[3] || '0', 10)
      return new Date(year, month, day)
    }
  }
}

// 辅助函数：格式化日期
function formatDate(date: Date, format: string): string {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const monthPadded = String(month).padStart(2, '0')
  const dayPadded = String(day).padStart(2, '0')

  // 特殊格式：只输出年
  if (format === 'YYYY') {
    return String(year)
  }

  // 特殊格式：只输出月（补0）
  if (format === 'MM') {
    return monthPadded
  }

  // 特殊格式：只输出月（不补0）
  if (format === 'M') {
    return String(month)
  }

  // 特殊格式：只输出日（补0）
  if (format === 'DD') {
    return dayPadded
  }

  // 特殊格式：只输出日（不补0）
  if (format === 'D') {
    return String(day)
  }

  // 日语格式：YYYY年MM月DD日（补0）
  if (format === 'YYYY年MM月DD日') {
    return `${year}年${monthPadded}月${dayPadded}日`
  }

  // 日语格式：YYYY年M月D日（不补0）
  if (format === 'YYYY年M月D日') {
    return `${year}年${month}月${day}日`
  }

  // 标准格式处理（需要先处理长的标记，避免被短的替换）
  let result = format
    .replace(/YYYY/g, String(year))
    .replace(/MM/g, monthPadded)
    .replace(/DD/g, dayPadded)
    .replace(/M/g, String(month))
    .replace(/D/g, String(day))

  return result
}

// 辅助函数：格式化时间
function formatTime(date: Date, format: string): string {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return format
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

// Helper: format date & time with a single pattern string (supports YYYY/MM/DD HH:mm:ss etc)
function formatDateTimeByPattern(date: Date, pattern: string): string {
  // Order matters: replace date tokens and time tokens
  return formatTime(date, formatDate(date, pattern))
}

export interface TransformPlugin {
  name: string
  nameJa?: string
  summary?: string
  outputType?: 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'json' | 'any'
  descriptionJa?: string
  run: (args: { value: any; params: any; context: TransformContext }) => Promise<any> | any
}

export const stringTrimPlugin: TransformPlugin = {
  name: 'string.trim',
  nameJa: '空白を削除',
  summary: 'Trim whitespace',
  outputType: 'string',
  descriptionJa: '文字列の前後の空白を削除します。入力: 文字列、出力: 文字列（空白削除後）',
  run: ({ value }) => (typeof value === 'string' ? value.trim() : value),
}

export const stringPadPlugin: TransformPlugin = {
  name: 'string.pad',
  nameJa: '文字列を埋める（パディング）',
  summary: 'Pad string to target length',
  outputType: 'string',
  descriptionJa:
    '文字列が指定した長さに満たない場合、指定した文字で埋めます。\n\n【パラメータ説明】\n・目標の長さ: 最終的な文字列の長さを指定\n・埋める文字: 埋めるために使用する文字（デフォルト: "0"）\n・埋める位置: "start"=前方、"end"=後方（デフォルト: "start"）\n\n【使用例】\n・注文番号を8桁に: 目標の長さ=8, 埋める文字="0", 位置="start" → "123" → "00000123"\n・コードを右詰め: 目標の長さ=5, 埋める文字=" ", 位置="start" → "AB" → "   AB"\n・後方埋め: 目標の長さ=6, 埋める文字="-", 位置="end" → "ABC" → "ABC---"',
  run: ({ value, params }) => {
    if (value == null) return value
    const str = String(value)
    const targetLength = params?.targetLength ?? 0
    const padChar = params?.padChar ?? '0'
    const position = params?.position ?? 'start'

    if (targetLength <= 0 || str.length >= targetLength) {
      return str
    }

    if (position === 'end') {
      return str.padEnd(targetLength, padChar)
    } else {
      return str.padStart(targetLength, padChar)
    }
  },
}

export const stringUppercasePlugin: TransformPlugin = {
  name: 'string.uppercase',
  nameJa: '大文字に変換',
  summary: 'Uppercase',
  outputType: 'string',
  descriptionJa: '文字列を大文字に変換します。入力: 文字列、出力: 文字列（大文字）',
  run: ({ value }) => (typeof value === 'string' ? value.toUpperCase() : value),
}

export const stringLowercasePlugin: TransformPlugin = {
  name: 'string.lowercase',
  nameJa: '小文字に変換',
  summary: 'Lowercase',
  outputType: 'string',
  descriptionJa: '文字列を小文字に変換します。入力: 文字列、出力: 文字列（小文字）',
  run: ({ value }) => (typeof value === 'string' ? value.toLowerCase() : value),
}

export const stringSplitPlugin: TransformPlugin = {
  name: 'string.split',
  nameJa: '文字列を分割',
  summary: 'Split string into array',
  outputType: 'any',
  descriptionJa: '文字列を指定された区切り文字で分割して配列に変換します。入力: 文字列、出力: 文字列配列',
  run: ({ value, params }) => {
    if (typeof value !== 'string') return value
    const separator = params?.separator || ','
    return value.split(separator).map((s) => s.trim()).filter((s) => s !== '')
  },
}

export const charToHalfWidthPlugin: TransformPlugin = {
  name: 'char.toHalfWidth',
  nameJa: '数字・英字・記号を全角から半角に変換',
  summary: 'Convert full-width digits, letters and symbols to half-width',
  outputType: 'string',
  descriptionJa:
    '数字、英文字母、記号を全角から半角に変換します。入力: 文字列、出力: 文字列（全角→半角変換後）',
  run: ({ value, params }) => {
    if (typeof value !== 'string') return value
    const includeDigits = params?.includeDigits !== false
    const includeLetters = params?.includeLetters !== false
    const includeSymbols = params?.includeSymbols !== false

    return value
      .split('')
      .map((char) => {
        // 数字
        if (includeDigits && char >= '０' && char <= '９') {
          return fullToHalfWidthMap[char] ?? char
        }
        // 大写字母
        if (includeLetters && char >= 'Ａ' && char <= 'Ｚ') {
          return fullToHalfWidthMap[char] ?? char
        }
        // 小写字母
        if (includeLetters && char >= 'ａ' && char <= 'ｚ') {
          return fullToHalfWidthMap[char] ?? char
        }
        // 符号
        if (includeSymbols && fullToHalfWidthMap[char]) {
          return fullToHalfWidthMap[char]
        }
        return char
      })
      .join('')
  },
}

export const charToFullWidthPlugin: TransformPlugin = {
  name: 'char.toFullWidth',
  nameJa: '数字・英字・記号を半角から全角に変換',
  summary: 'Convert half-width digits, letters and symbols to full-width',
  outputType: 'string',
  descriptionJa:
    '数字、英文字母、記号を半角から全角に変換します。入力: 文字列、出力: 文字列（半角→全角変換後）',
  run: ({ value, params }) => {
    if (typeof value !== 'string') return value
    const includeDigits = params?.includeDigits !== false
    const includeLetters = params?.includeLetters !== false
    const includeSymbols = params?.includeSymbols !== false

    return value
      .split('')
      .map((char) => {
        // 数字
        if (includeDigits && char >= '0' && char <= '9') {
          return halfToFullWidthMap[char] ?? char
        }
        // 大写字母
        if (includeLetters && char >= 'A' && char <= 'Z') {
          return halfToFullWidthMap[char] ?? char
        }
        // 小写字母
        if (includeLetters && char >= 'a' && char <= 'z') {
          return halfToFullWidthMap[char] ?? char
        }
        // 符号
        if (includeSymbols && halfToFullWidthMap[char]) {
          return halfToFullWidthMap[char]
        }
        return char
      })
      .join('')
  },
}

export const stringInsertSymbolPlugin: TransformPlugin = {
  name: 'string.insertSymbol',
  nameJa: '文字指定位置に記号を挿入',
  summary: 'Insert symbol at specified positions',
  outputType: 'string',
  descriptionJa:
    '文字列の指定された位置に記号を挿入します。複数の位置を指定できます。位置は0から始まるインデックス（0=先頭、1=1文字目後、2=2文字目後...）です。入力: 文字列、出力: 文字列（記号挿入後）',
  run: ({ value, params }) => {
    if (typeof value !== 'string') return value
    const positions = params?.positions || []
    const symbol = params?.symbol || '-'

    if (!Array.isArray(positions) || positions.length === 0) {
      return value
    }

    // 去重并排序（从大到小），从后往前插入，避免位置偏移
    const uniquePositions = Array.from(new Set(positions))
      .filter((pos) => typeof pos === 'number' && pos >= 0)
      .sort((a, b) => b - a)
    
    if (uniquePositions.length === 0) {
      return value
    }

    let result = value
    for (const pos of uniquePositions) {
      // pos 是插入位置（0=先頭、1=1文字目後、2=2文字目後...）
      if (pos <= result.length) {
        result = result.slice(0, pos) + symbol + result.slice(pos)
      }
    }

    return result
  },
}

export const jpSliceByWidthPlugin: TransformPlugin = {
  name: 'jp.sliceByWidth',
  nameJa: '文字幅で切り取り（日本語対応）',
  summary: 'Slice by display width (half=1, full=2)',
  outputType: 'string',
  descriptionJa:
    '文字列を表示幅（半角=1、全角=2）で切り取ります。日本語の全角文字に対応しています。入力: 文字列、出力: 文字列（切り取り後）',
  run: ({ value, params }) => {
    if (typeof value !== 'string') return value
    const { startWidth, endWidth, boundary = 'keepLeft' } = params || {}
    // Allow startWidth to be 0 (valid starting position)
    if (startWidth === undefined || startWidth === null || endWidth === undefined || endWidth === null || startWidth > endWidth) return ''

    let acc = 0
    let startIdx = 0
    let endIdx = value.length

    for (let i = 0; i < value.length; i++) {
      const char = value[i]
      if (!char) continue
      const w = getJapaneseCharWidth(char)
      const next = acc + w

      // Determine start index
      if (acc < startWidth - 1 && startWidth - 1 < next) {
        if (boundary === 'error') {
          throw new Error('Cut hits full-width char at start')
        }
        if (boundary === 'keepRight') {
          startIdx = i + 1
        } else {
          startIdx = i
        }
      } else if (acc === startWidth - 1) {
        startIdx = i
      }

      // Determine end index (exclusive)
      const endWidthNum = endWidth || 0
      if (acc < endWidthNum && endWidthNum <= next) {
        if (boundary === 'error' && w === 2 && endWidthNum !== next) {
          throw new Error('Cut hits full-width char at end')
        }
        endIdx = boundary === 'keepLeft' ? i : i + 1
        break
      }

      acc = next
      const startWidthNum = startWidth || 0
      if (next < startWidthNum - 1) startIdx = i + 1
    }

    return value.slice(startIdx, endIdx)
  },
}

export const lookupMapPlugin: TransformPlugin = {
  name: 'lookup.map',
  nameJa: '値マッピング（完全一致）',
  summary: 'Exact value map (A->B)',
  outputType: 'any',
  descriptionJa:
    '値の完全一致マッピングを行います。指定されたマッピングテーブル（キー→値のペア）に基づいて値を変換します。入力値がマッピングテーブルのキーと完全一致する場合、対応する値に変換されます。見つからない場合はデフォルト値を返します。入力: 任意の値、出力: マッピングされた値（見つからない場合はデフォルト値）',
  run: ({ value, params }) => {
    const key =
      params?.normalize !== false && typeof value === 'string' ? value.trim() : (value as string | number)
    if (key !== undefined && key !== null && params?.cases?.hasOwnProperty(String(key))) {
      return params.cases[String(key)]
    }
    return params?.default
  },
}

/**
 * 解析 groups 参数字符串，返回要选取的索引数组
 * 支持格式: "1" / "1,3" / "1-3" / "0-2,4"
 */
function parseGroupsParam(groupsStr: string): number[] {
  if (!groupsStr || typeof groupsStr !== 'string') return []

  const indices: Set<number> = new Set()
  const parts = groupsStr.split(',').map(s => s.trim()).filter(s => s)

  for (const part of parts) {
    if (part.includes('-')) {
      // 范围格式: "1-3"
      const [startStr, endStr] = part.split('-')
      const start = parseInt(startStr || '0', 10)
      const end = parseInt(endStr || '0', 10)
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let i = start; i <= end; i++) {
          indices.add(i)
        }
      }
    } else {
      // 单个数字: "1"
      const num = parseInt(part, 10)
      if (!isNaN(num) && num >= 0) {
        indices.add(num)
      }
    }
  }

  return Array.from(indices).sort((a, b) => a - b)
}

export const regexExtractPlugin: TransformPlugin = {
  name: 'regex.extract',
  nameJa: '正規表現で抽出',
  summary: 'Extract value using regex pattern',
  outputType: 'string',
  descriptionJa:
    '正規表現パターンで値を抽出します。キャプチャグループがある場合はその結果を、ない場合はマッチした文字列を返します。複数マッチの場合は結合して返します。\n\n【パラメータ説明】\n・正規表現パターン: 抽出したい文字列のパターンを指定（例: "\\d+" で数字を抽出）\n・フラグ: "g"=全てマッチ、""=最初の1つだけ、"i"=大文字小文字を区別しない\n・グループ選択: 取得するキャプチャグループを指定（例: "1" / "1,3" / "1-3" / "0-2,4"）\n・区切り文字: 複数マッチした場合の結合文字（空欄=そのまま結合）\n・デフォルト値: マッチしない場合に返す値\n\n【使用例】\n・数字を抽出: パターン="\\d+" → "ABC123DEF" → "123"\n・電話番号を抽出: パターン="\\d{2,4}-\\d{2,4}-\\d{4}" → "Tel:03-1234-5678です" → "03-1234-5678"\n・括弧内を抽出: パターン="\\((.+?)\\)", フラグ="" → "商品A(赤)" → "赤"\n・特定グループのみ: パターン="(\\d+)-(\\d+)", グループ選択="1" → "123-456" → "123"\n・複数グループ: パターン="(\\d+)-(\\d+)-(\\d+)", グループ選択="1,3" → "123-456-789" → "123789"\n\n【💡 正規表現がわからない場合】\nAIチャット（ChatGPT、Claude等）に聞くと適切なパターンを教えてもらえます。\n質問例：「"Tel:03-1234-5678です"から電話番号"03-1234-5678"を抽出する正規表現を書いて」\n質問例：「"商品A(赤)についてです"から括弧内の"赤"を抽出する正規表現を書いて」',
  run: ({ value, params }) => {
    const str = value == null ? '' : String(value)
    const pattern = params?.pattern || ''
    const flags = params?.flags || 'g'
    const separator = params?.separator ?? ''
    const groupsParam = params?.groups || ''

    if (!pattern) return undefined

    try {
      const re = new RegExp(pattern, flags)

      // groups 参数指定时，使用 exec 获取 capture groups
      if (groupsParam) {
        const selectedIndices = parseGroupsParam(groupsParam)
        if (selectedIndices.length === 0) {
          return params?.default ?? undefined
        }

        const results: string[] = []
        let match: RegExpExecArray | null

        if (flags.includes('g')) {
          // 全局匹配：每次 exec 返回一个匹配
          while ((match = re.exec(str)) !== null) {
            for (const idx of selectedIndices) {
              if (idx < match.length && match[idx] !== undefined) {
                results.push(match[idx])
              }
            }
          }
        } else {
          // 非全局：只执行一次
          match = re.exec(str)
          if (match) {
            for (const idx of selectedIndices) {
              if (idx < match.length && match[idx] !== undefined) {
                results.push(match[idx])
              }
            }
          }
        }

        if (results.length === 0) return params?.default ?? undefined
        return results.join(separator)
      }

      // 原有逻辑（无 groups 参数时）
      const matches = str.match(re)

      if (!matches) return params?.default ?? undefined

      // グローバルフラグがない場合、キャプチャグループを確認
      if (!flags.includes('g') && matches.length > 1) {
        // キャプチャグループがある場合、グループ1以降を結合
        const groups = matches.slice(1).filter(m => m !== undefined)
        return groups.length > 0 ? groups.join(separator) : matches[0]
      }

      // グローバルフラグがある場合、全マッチを結合
      return matches.join(separator)
    } catch (e) {
      console.error('regex.extract error:', e)
      return undefined
    }
  },
}

export const lookupContainsPlugin: TransformPlugin = {
  name: 'lookup.contains',
  nameJa: '値マッピング（部分一致）',
  summary: 'Map value if contains search string',
  outputType: 'any',
  descriptionJa:
    '入力値が指定された文字列を含む場合、対応する値に変換します。複数のルールを上から順に評価し、最初に一致したルールの値を返します。見つからない場合はデフォルト値を返します。\n\n【使用例】\n・配送方法の判定: rules=[{search:"急ぎ", value:"express"}, {search:"翌日", value:"next_day"}] → "至急お届け" → "express"\n・カテゴリ分類: rules=[{search:"シャツ", value:"tops"}, {search:"パンツ", value:"bottoms"}] → "Tシャツ（白）" → "tops"',
  run: ({ value, params }) => {
    const str = value == null ? '' : String(value)
    const caseSensitive = params?.caseSensitive !== false

    for (const rule of params?.rules || []) {
      const search = rule.search || ''
      if (!search) continue

      const haystack = caseSensitive ? str : str.toLowerCase()
      const needle = caseSensitive ? search : search.toLowerCase()

      if (haystack.includes(needle)) {
        return rule.value
      }
    }
    return params?.default
  },
}

export const stringReplacePlugin: TransformPlugin = {
  name: 'string.replace',
  nameJa: '文字列置換',
  summary: 'Find and replace strings',
  outputType: 'string',
  descriptionJa:
    '文字列を検索して置換します。複数のルールを上から順に実行します。各ルールで置換回数を指定できます（0または未指定=全て置換）。\n\n【使用例】\n・会社名を略称に: rules=[{search:"株式会社", replace:"(株)"}] → "株式会社ABC" → "(株)ABC"\n・全角スペースを半角に: rules=[{search:"　", replace:" "}] → "東京都　渋谷区" → "東京都 渋谷区"\n・複数置換: rules=[{search:"㈱", replace:"(株)"}, {search:"㈲", replace:"(有)"}]',
  run: ({ value, params }) => {
    if (value == null) return value
    let str = String(value)

    for (const rule of params?.rules || []) {
      const search = rule.search
      if (!search) continue

      const replace = rule.replace ?? ''
      const count = rule.count || 0 // 0 = replace all

      if (count <= 0) {
        // Replace all occurrences
        str = str.split(search).join(replace)
      } else {
        // Replace limited times
        let replaced = 0
        let result = ''
        let remaining = str

        while (replaced < count) {
          const idx = remaining.indexOf(search)
          if (idx === -1) break

          result += remaining.slice(0, idx) + replace
          remaining = remaining.slice(idx + search.length)
          replaced++
        }
        str = result + remaining
      }
    }

    return str
  },
}

export const dateParsePlugin: TransformPlugin = {
  name: 'date.parse',
  nameJa: '日付を解析',
  summary: 'Parse date/datetime to ISO string',
  outputType: 'datetime',
  descriptionJa:
    '日付文字列を解析して標準形式に変換します。precisionパラメータで「date」（日まで）または「datetime」（秒まで）を指定できます。入力: 文字列（日付形式）、出力: 文字列（precision="date"の場合はYYYY-MM-DD、precision="datetime"の場合はISO形式）',
  run: ({ value, params }) => {
    if (!value) return value
    const formats = params?.formats || []
    const precision = params?.precision || 'datetime'

    let parsedDate: Date | null = null

    if (formats.length > 0) {
      for (const fmt of formats) {
        const d = parseDateByFormat(String(value), fmt)
        if (d && !isNaN(d.getTime())) {
          parsedDate = d
          break
        }
      }
    }

    if (!parsedDate) {
      const d = new Date(value)
      if (!isNaN(d.getTime())) {
        parsedDate = d
      }
    }

    if (!parsedDate) return value

    if (precision === 'date') {
      const year = parsedDate.getFullYear()
      const month = String(parsedDate.getMonth() + 1).padStart(2, '0')
      const day = String(parsedDate.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    } else if (precision === 'time') {
      const hours = String(parsedDate.getHours()).padStart(2, '0')
      const minutes = String(parsedDate.getMinutes()).padStart(2, '0')
      const seconds = String(parsedDate.getSeconds()).padStart(2, '0')
      return `${hours}:${minutes}:${seconds}`
    } else {
      // precision === 'datetime': 使用本地时间，不进行时区转换
      // 格式：YYYY-MM-DDTHH:mm:ss（日期数值，不带时区信息）
      const year = parsedDate.getFullYear()
      const month = String(parsedDate.getMonth() + 1).padStart(2, '0')
      const day = String(parsedDate.getDate()).padStart(2, '0')
      const hours = String(parsedDate.getHours()).padStart(2, '0')
      const minutes = String(parsedDate.getMinutes()).padStart(2, '0')
      const seconds = String(parsedDate.getSeconds()).padStart(2, '0')
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
    }
  },
}

export const dateFormatPlugin: TransformPlugin = {
  name: 'date.format',
  nameJa: '日付をフォーマット',
  summary: 'Format date/datetime to target string',
  outputType: 'string',
  descriptionJa:
    '日付/日時を指定された形式の文字列にフォーマットします。precisionパラメータで「date」（日まで）または「datetime」（秒まで）を指定できます。入力: 日付/日時（ISO形式など）、出力: 文字列（指定された形式）',
  run: ({ value, params }) => {
    if (!value) return value
    const d = new Date(value)
    if (isNaN(d.getTime())) return value

    // If a single format is provided, use it directly (supports datetime patterns).
    // This is the preferred way from UI: choose "convert to what format" via dropdown.
    if (params?.format) {
      const format = params.format
      
      // 特殊格式：只输出年
      if (format === 'YYYY') {
        return String(d.getFullYear())
      }
      
      // 特殊格式：只输出月
      if (format === 'MM') {
        return String(d.getMonth() + 1).padStart(2, '0')
      }
      if (format === 'M') {
        return String(d.getMonth() + 1)
      }
      
      // 特殊格式：只输出日
      if (format === 'DD') {
        return String(d.getDate()).padStart(2, '0')
      }
      if (format === 'D') {
        return String(d.getDate())
      }
      
      // 日语格式
      if (format === 'YYYY年MM月DD日' || format === 'YYYY年M月D日') {
        return formatDate(d, format)
      }
      
      // 其他格式使用原有逻辑
      return formatDateTimeByPattern(d, format)
    }

    const precision = params?.precision

    if (precision) {
      if (precision === 'date') {
        const dateFormat = params?.dateFormat || 'YYYY/MM/DD'
        return formatDate(d, dateFormat)
      } else if (precision === 'time') {
        const timeFormat = params?.timeFormat || 'HH:mm:ss'
        return formatTime(d, timeFormat)
      } else {
        const dateFormat = params?.dateFormat || 'YYYY/MM/DD'
        const timeFormat = params?.timeFormat || 'HH:mm:ss'
        return `${formatDate(d, dateFormat)} ${formatTime(d, timeFormat)}`
      }
    }

    return `${formatDate(d, 'YYYY/MM/DD')} ${formatTime(d, 'HH:mm:ss')}`
  },
}

export const dateAddDaysPlugin: TransformPlugin = {
  name: 'date.addDays',
  nameJa: '日付に日数を加算',
  summary: 'Add days to date/datetime',
  outputType: 'datetime',
  descriptionJa:
    '日付/日時に指定された日数を加算します。入力と同じ形式で出力されます。daysパラメータで加算する日数を指定できます（デフォルト: 30）。',
  run: ({ value, params }) => {
    if (!value) return value
    
    // 保存原始值（用于保持格式）
    const originalValue = typeof value === 'string' ? value : String(value)
    
    // 解析日期
    let parsedDate: Date | null = null
    
    // 尝试按常见格式解析
    const commonFormats = [
      'YYYY-MM-DD',
      'YYYY/MM/DD',
      'MM/DD/YYYY',
      'DD/MM/YYYY',
      'YYYY-MM-DD HH:mm:ss',
      'YYYY/MM/DD HH:mm:ss',
      'YYYY-MM-DD HH:mm',
      'YYYY/MM/DD HH:mm',
    ]
    
    if (typeof value === 'string') {
      for (const fmt of commonFormats) {
        const d = parseDateByFormat(value, fmt)
        if (d && !isNaN(d.getTime())) {
          parsedDate = d
          break
        }
      }
    }
    
    // 如果还没有解析成功，尝试直接解析
    if (!parsedDate) {
      if (value instanceof Date) {
        parsedDate = value
      } else {
        const d = new Date(value)
        if (!isNaN(d.getTime())) {
          parsedDate = d
        }
      }
    }
    
    if (!parsedDate) return value
    
    // 获取要加的天数，默认30
    const days = params?.days ?? 30
    const daysNum = typeof days === 'number' ? days : parseInt(String(days), 10)
    if (isNaN(daysNum)) return value
    
    // 加天数
    const resultDate = new Date(parsedDate)
    resultDate.setDate(resultDate.getDate() + daysNum)
    
    // 检测原始格式并保持相同格式输出
    if (typeof originalValue === 'string') {
      // 尝试匹配常见格式（按从具体到一般的顺序）
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(originalValue)) {
        // ISO格式 YYYY-MM-DDTHH:mm:ss
        const year = resultDate.getFullYear()
        const month = String(resultDate.getMonth() + 1).padStart(2, '0')
        const day = String(resultDate.getDate()).padStart(2, '0')
        const hours = String(resultDate.getHours()).padStart(2, '0')
        const minutes = String(resultDate.getMinutes()).padStart(2, '0')
        const seconds = String(resultDate.getSeconds()).padStart(2, '0')
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
      } else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(originalValue)) {
        // YYYY-MM-DD HH:mm:ss
        const year = resultDate.getFullYear()
        const month = String(resultDate.getMonth() + 1).padStart(2, '0')
        const day = String(resultDate.getDate()).padStart(2, '0')
        const hours = String(resultDate.getHours()).padStart(2, '0')
        const minutes = String(resultDate.getMinutes()).padStart(2, '0')
        const seconds = String(resultDate.getSeconds()).padStart(2, '0')
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
      } else if (/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/.test(originalValue)) {
        // YYYY/MM/DD HH:mm:ss
        const year = resultDate.getFullYear()
        const month = String(resultDate.getMonth() + 1).padStart(2, '0')
        const day = String(resultDate.getDate()).padStart(2, '0')
        const hours = String(resultDate.getHours()).padStart(2, '0')
        const minutes = String(resultDate.getMinutes()).padStart(2, '0')
        const seconds = String(resultDate.getSeconds()).padStart(2, '0')
        return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(originalValue)) {
        // YYYY-MM-DD
        const year = resultDate.getFullYear()
        const month = String(resultDate.getMonth() + 1).padStart(2, '0')
        const day = String(resultDate.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      } else if (/^\d{4}\/\d{2}\/\d{2}$/.test(originalValue)) {
        // YYYY/MM/DD
        const year = resultDate.getFullYear()
        const month = String(resultDate.getMonth() + 1).padStart(2, '0')
        const day = String(resultDate.getDate()).padStart(2, '0')
        return `${year}/${month}/${day}`
      } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(originalValue)) {
        // MM/DD/YYYY 或 DD/MM/YYYY（无法区分，默认使用 MM/DD/YYYY）
        const year = resultDate.getFullYear()
        const month = String(resultDate.getMonth() + 1).padStart(2, '0')
        const day = String(resultDate.getDate()).padStart(2, '0')
        return `${month}/${day}/${year}`
      }
    }
    
    // 如果无法识别格式，使用ISO格式输出
    const year = resultDate.getFullYear()
    const month = String(resultDate.getMonth() + 1).padStart(2, '0')
    const day = String(resultDate.getDate()).padStart(2, '0')
    const hours = String(resultDate.getHours()).padStart(2, '0')
    const minutes = String(resultDate.getMinutes()).padStart(2, '0')
    const seconds = String(resultDate.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
  },
}

export const numberParsePlugin: TransformPlugin = {
  name: 'number.parse',
  nameJa: '数値に変換',
  summary: 'Parse string to number',
  outputType: 'number',
  descriptionJa:
    '文字列を数値に変換します。カンマ区切りの数値や整数/小数の指定が可能です。入力: 文字列（数値形式）、出力: 数値',
  run: ({ value, params }) => {
    if (typeof value === 'number') return value
    if (typeof value !== 'string') return value
    const cleaned = params?.allowThousands !== false ? value.replace(/,/g, '') : value
    const parsed = params?.int ? parseInt(cleaned, 10) : parseFloat(cleaned)
    return Number.isFinite(parsed) ? parsed : value
  },
}

export const httpFetchJsonPlugin: TransformPlugin = {
  name: 'http.fetchJson',
  nameJa: 'HTTPからJSONを取得',
  summary: 'Fetch JSON from HTTP endpoint (async)',
  outputType: 'json',
  descriptionJa:
    'HTTPエンドポイントからJSONデータを取得します。非同期処理でネットワークリクエストを実行します。POST/PUT/PATCHメソッドの場合、bodyパラメータを固定値または列から取得できます。入力: 任意の値（URLパラメータやbodyパラメータとして使用可能）、出力: JSONオブジェクト（pickパラメータで特定の値を抽出可能）',
  run: async ({ value, params, context }) => {
    const url = new URL(params?.url || '')
    if (params?.query) {
      Object.entries(params.query).forEach(([k, v]) => {
        if (v === undefined || v === null) return
        url.searchParams.set(k, String(v))
      })
    }

    // 构建 body
    let bodyData: any = params?.body
    if (params?.bodyParams && params.bodyParams.length > 0) {
      bodyData = {}
      for (const param of params.bodyParams) {
        if (param.source === 'column' && param.column) {
          const row = context.meta?.row || {}
          bodyData[param.key] = row[param.column]
        } else {
          bodyData[param.key] = param.value
        }
      }
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), params?.timeoutMs ?? 10_000)
    const fetchImpl = context.fetchImpl ?? fetch
    try {
      const resp = await fetchImpl(url.toString(), {
        method: params?.method ?? 'GET',
        headers: params?.headers,
        body: bodyData ? JSON.stringify(bodyData) : undefined,
        signal: controller.signal,
      })
      const json = await resp.json()
      if (!params?.pick) return json
      return params.pick.split('.').reduce((acc: any, key: string) => (acc == null ? undefined : acc[key]), json)
    } finally {
      clearTimeout(timer)
    }
  },
}

export const jsonPickPlugin: TransformPlugin = {
  name: 'json.pick',
  nameJa: 'JSONから値を取得',
  summary: 'Pick value by dotted path',
  outputType: 'any',
  descriptionJa:
    'JSONオブジェクトからドット区切りのパスで指定された値を取得します。入力: JSONオブジェクト、出力: 指定されたパスの値（任意の型）',
  run: ({ value, params }) => {
    return params?.path?.split('.').reduce((acc: any, key: string) => (acc == null ? undefined : acc[key]), value)
  },
}

export const conditionEqualsPlugin: TransformPlugin = {
  name: 'condition.equals',
  nameJa: '値が等しいか判定（true/false）',
  summary: 'Return true if value equals compareTo, otherwise false',
  outputType: 'boolean',
  descriptionJa:
    '値が指定された値と等しいかどうかを判定します。等しい場合はtrue、そうでない場合はfalseを返します。\n\n【パラメータ説明】\n・比較する値: 入力値と比較する値を指定\n・大文字小文字を区別: ONの場合は完全一致、OFFの場合は大小文字を無視して比較\n\n【使用例】\n・"発送済み"と比較: 比較する値="発送済み" → "発送済み" → true、"未発送" → false\n・大小文字無視で比較: 比較する値="ABC", 大文字小文字を区別=OFF → "abc" → true',
  run: ({ value, params }) => {
    if (params?.caseSensitive === false && typeof value === 'string' && typeof params?.compareTo === 'string') {
      return value.toLowerCase() === params.compareTo.toLowerCase()
    }
    return value === params?.compareTo
  },
}


export const productFromColumnsPlugin: TransformPlugin = {
  name: 'product.fromColumns',
  nameJa: '列から商品に変換',
  summary: 'Convert 3 columns (sku, quantity, name) to products array',
  outputType: 'json',
  descriptionJa:
    '3つの列（SKU、数量、商品名）から商品オブジェクトを作成し、products配列（長さ1）に変換します。パラメータで列名を指定できます。入力: 任意の値（通常はSKU列の値）、出力: products配列 [{sku, quantity, name}]',
  run: ({ value, params, context }) => {
    const row = context.meta?.row || {}
    const skuColumn = params?.skuColumn || 'sku'
    const quantityColumn = params?.quantityColumn || 'quantity'
    const nameColumn = params?.nameColumn || 'name'

    // 列から値を取得（value が指定されていない場合は列から取得）
    const sku = row[skuColumn] !== undefined ? row[skuColumn] : value ?? ''
    const quantity = row[quantityColumn] ?? ''
    const name = row[nameColumn] ?? ''

    // 数量を数値に変換
    let quantityNum = 1
    if (quantity !== undefined && quantity !== null && quantity !== '') {
      const parsed = typeof quantity === 'number' ? quantity : parseFloat(String(quantity))
      quantityNum = Number.isFinite(parsed) && parsed > 0 ? parsed : 1
    }

    return [
      {
        sku: String(sku || ''),
        quantity: quantityNum,
        name: String(name || ''),
      },
    ]
  },
}

export const arrayIndexPlugin: TransformPlugin = {
  name: 'array.index',
  nameJa: '配列要素を取得',
  summary: 'Get array element by index',
  outputType: 'any',
  descriptionJa: '配列から指定されたインデックスの要素を取得します。インデックスは0から開始します。入力: 配列、出力: 指定されたインデックスの要素（存在しない場合は undefined）',
  run: ({ value, params }) => {
    if (!Array.isArray(value)) return undefined
    const index = params?.index ?? 0
    return value[index]
  },
}

export const productToStringPlugin: TransformPlugin = {
  name: 'product.toString',
  nameJa: '商品配列を文字列に変換',
  summary: 'Convert products array to formatted string',
  outputType: 'string',
  descriptionJa:
    '商品配列（products）を「商品名 x 数量 / 商品名 x 数量」形式の文字列に変換します。数量が1の場合は「x 数量」を表示しません。入力: products配列、出力: 文字列（フォーマット済み）',
  run: ({ value, params }) => {
    // 如果已经是字符串，直接返回（兼容 export 时已经转换的情况）
    if (typeof value === 'string') {
      return value
    }
    
    if (!Array.isArray(value)) {
      // もし配列でない場合、空配列として扱う
      return ''
    }

    const products = value.filter((p) => p && (p.productName || p.productSku || p.inputSku || p.name || p.sku))
    if (products.length === 0) {
      return ''
    }

    const parts = products.map((p) => {
      const name = p.productName || p.name || p.productSku || p.inputSku || p.sku || ''
      const quantity = p.quantity || 1

      if (quantity === 1) {
        return name
      } else {
        return `${name}*${quantity}`
      }
    })

    const separator = params?.separator || ' / '
    return parts.join(separator)
  },
}

// 导出所有插件
export const transformPlugins: Record<string, TransformPlugin> = {
  'string.trim': stringTrimPlugin,
  'string.pad': stringPadPlugin,
  'string.uppercase': stringUppercasePlugin,
  'string.lowercase': stringLowercasePlugin,
  'string.split': stringSplitPlugin,
  'char.toHalfWidth': charToHalfWidthPlugin,
  'char.toFullWidth': charToFullWidthPlugin,
  'string.insertSymbol': stringInsertSymbolPlugin,
  'jp.sliceByWidth': jpSliceByWidthPlugin,
  'lookup.map': lookupMapPlugin,
  'lookup.contains': lookupContainsPlugin,
  'string.replace': stringReplacePlugin,
  'regex.extract': regexExtractPlugin,
  'date.parse': dateParsePlugin,
  'date.format': dateFormatPlugin,
  'date.addDays': dateAddDaysPlugin,
  'number.parse': numberParsePlugin,
  'http.fetchJson': httpFetchJsonPlugin,
  'json.pick': jsonPickPlugin,
  'condition.equals': conditionEqualsPlugin,
  'product.fromColumns': productFromColumnsPlugin,
  'product.toString': productToStringPlugin,
  'array.index': arrayIndexPlugin,
}

