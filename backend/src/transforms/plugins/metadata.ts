/**
 * Transform plugins 元数据定义（仅用于类型验证和 API 返回）
 * 实际的转换逻辑在前端实现
 */

import { z } from 'zod';
import type { TransformPlugin, CombinePlugin } from '../types';

// Transform plugins 元数据（不包含 run 方法）
export const transformPluginsMetadata: TransformPlugin[] = [
  {
    name: 'string.trim',
    nameJa: '空白を削除',
    summary: 'Trim whitespace',
    outputType: 'string',
    descriptionJa: '文字列の前後の空白を削除します。入力: 文字列、出力: 文字列（空白削除後）',
  },
  {
    name: 'string.pad',
    nameJa: '文字列を埋める（パディング）',
    summary: 'Pad string to target length',
    outputType: 'string',
    descriptionJa:
      '文字列が指定した長さに満たない場合、指定した文字で埋めます。\n\n【パラメータ説明】\n・目標の長さ: 最終的な文字列の長さを指定\n・埋める文字: 埋めるために使用する文字（デフォルト: "0"）\n・埋める位置: "start"=前方、"end"=後方（デフォルト: "start"）\n\n【使用例】\n・注文番号を8桁に: 目標の長さ=8, 埋める文字="0", 位置="start" → "123" → "00000123"\n・コードを右詰め: 目標の長さ=5, 埋める文字=" ", 位置="start" → "AB" → "   AB"\n・後方埋め: 目標の長さ=6, 埋める文字="-", 位置="end" → "ABC" → "ABC---"',
    paramsSchema: z.object({
      targetLength: z.number().int().min(1),
      padChar: z.string().default('0'),
      position: z.enum(['start', 'end']).default('start'),
    }),
  },
  {
    name: 'string.uppercase',
    nameJa: '大文字に変換',
    summary: 'Uppercase',
    outputType: 'string',
    descriptionJa: '文字列を大文字に変換します。入力: 文字列、出力: 文字列（大文字）',
  },
  {
    name: 'string.lowercase',
    nameJa: '小文字に変換',
    summary: 'Lowercase',
    outputType: 'string',
    descriptionJa: '文字列を小文字に変換します。入力: 文字列、出力: 文字列（小文字）',
  },
  {
    name: 'string.split',
    nameJa: '文字列を分割',
    summary: 'Split string into array',
    outputType: 'any',
    descriptionJa: '文字列を指定された区切り文字で分割して配列に変換します。入力: 文字列、出力: 文字列配列',
    paramsSchema: z.object({
      separator: z.string().default(','),
    }),
  },
  {
    name: 'char.toHalfWidth',
    nameJa: '数字・英字・記号を全角から半角に変換',
    summary: 'Convert full-width digits, letters and symbols to half-width',
    outputType: 'string',
    descriptionJa:
      '数字、英文字母、記号を全角から半角に変換します。入力: 文字列、出力: 文字列（全角→半角変換後）',
    paramsSchema: z.object({
      includeDigits: z.boolean().default(true),
      includeLetters: z.boolean().default(true),
      includeSymbols: z.boolean().default(true),
    }),
  },
  {
    name: 'char.toFullWidth',
    nameJa: '数字・英字・記号を半角から全角に変換',
    summary: 'Convert half-width digits, letters and symbols to full-width',
    outputType: 'string',
    descriptionJa:
      '数字、英文字母、記号を半角から全角に変換します。入力: 文字列、出力: 文字列（半角→全角変換後）',
    paramsSchema: z.object({
      includeDigits: z.boolean().default(true),
      includeLetters: z.boolean().default(true),
      includeSymbols: z.boolean().default(true),
    }),
  },
  {
    name: 'string.insertSymbol',
    nameJa: '文字指定位置に記号を挿入',
    summary: 'Insert symbol at specified positions',
    outputType: 'string',
    descriptionJa:
      '文字列の指定された位置に記号を挿入します。複数の位置を指定できます。入力: 文字列、出力: 文字列（記号挿入後）',
    paramsSchema: z.object({
      positions: z.array(z.number().int().min(0)).min(1),
      symbol: z.string().default('-'),
    }),
  },
  {
    name: 'jp.sliceByWidth',
    nameJa: '文字幅で切り取り（日本語対応）',
    summary: 'Slice by display width (half=1, full=2)',
    outputType: 'string',
    descriptionJa: '文字列を表示幅（半角=1、全角=2）で切り取ります。日本語の全角文字に対応しています。入力: 文字列、出力: 文字列（切り取り後）',
    paramsSchema: z.object({
      startWidth: z.number().min(1),
      endWidth: z.number().min(1),
      boundary: z.enum(['keepLeft', 'keepRight', 'error']).default('keepLeft'),
    }),
  },
  {
    name: 'lookup.map',
    nameJa: '値マッピング（完全一致）',
    summary: 'Exact value map (A->B)',
    outputType: 'any',
    descriptionJa:
      '値の完全一致マッピングを行います。指定されたマッピングテーブル（キー→値のペア）に基づいて値を変換します。入力値がマッピングテーブルのキーと完全一致する場合、対応する値に変換されます。見つからない場合はデフォルト値を返します。入力: 任意の値、出力: マッピングされた値（見つからない場合はデフォルト値）',
    paramsSchema: z.object({
      cases: z.record(z.any()),
      default: z.any().optional(),
      normalize: z.boolean().default(true),
    }),
  },
  {
    name: 'regex.extract',
    nameJa: '正規表現で抽出',
    summary: 'Extract value using regex pattern',
    outputType: 'string',
    descriptionJa:
      '正規表現パターンで値を抽出します。キャプチャグループがある場合はその結果を、ない場合はマッチした文字列を返します。複数マッチの場合は結合して返します。\n\n【パラメータ説明】\n・正規表現パターン: 抽出したい文字列のパターンを指定（例: "\\d+" で数字を抽出）\n・フラグ: "g"=全てマッチ、""=最初の1つだけ、"i"=大文字小文字を区別しない\n・グループ選択: 取得するキャプチャグループを指定（例: "1" / "1,3" / "1-3" / "0-2,4"）\n・区切り文字: 複数マッチした場合の結合文字（空欄=そのまま結合）\n・デフォルト値: マッチしない場合に返す値\n\n【使用例】\n・数字を抽出: パターン="\\d+" → "ABC123DEF" → "123"\n・電話番号を抽出: パターン="\\d{2,4}-\\d{2,4}-\\d{4}" → "Tel:03-1234-5678です" → "03-1234-5678"\n・括弧内を抽出: パターン="\\((.+?)\\)", フラグ="" → "商品A(赤)" → "赤"\n・特定グループのみ: パターン="(\\d+)-(\\d+)", グループ選択="1" → "123-456" → "123"\n・複数グループ: パターン="(\\d+)-(\\d+)-(\\d+)", グループ選択="1,3" → "123-456-789" → "123789"\n\n【💡 正規表現がわからない場合】\nAIチャット（ChatGPT、Claude等）に聞くと適切なパターンを教えてもらえます。\n質問例：「"Tel:03-1234-5678です"から電話番号"03-1234-5678"を抽出する正規表現を書いて」\n質問例：「"商品A(赤)についてです"から括弧内の"赤"を抽出する正規表現を書いて」',
    paramsSchema: z.object({
      pattern: z.string(),
      flags: z.string().default('g'),
      groups: z.string().optional(),
      separator: z.string().default(''),
      default: z.any().optional(),
    }),
  },
  {
    name: 'lookup.contains',
    nameJa: '値マッピング（部分一致）',
    summary: 'Map value if contains search string',
    outputType: 'any',
    descriptionJa:
      '入力値が指定された文字列を含む場合、対応する値に変換します。複数のルールを上から順に評価し、最初に一致したルールの値を返します。見つからない場合はデフォルト値を返します。\n\n【使用例】\n・配送方法の判定: rules=[{search:"急ぎ", value:"express"}, {search:"翌日", value:"next_day"}] → "至急お届け" → "express"\n・カテゴリ分類: rules=[{search:"シャツ", value:"tops"}, {search:"パンツ", value:"bottoms"}] → "Tシャツ（白）" → "tops"',
    paramsSchema: z.object({
      rules: z.array(
        z.object({
          search: z.string(),
          value: z.any(),
        }),
      ),
      caseSensitive: z.boolean().default(true),
      default: z.any().optional(),
    }),
  },
  {
    name: 'string.replace',
    nameJa: '文字列置換',
    summary: 'Find and replace strings',
    outputType: 'string',
    descriptionJa:
      '文字列を検索して置換します。複数のルールを上から順に実行します。各ルールで置換回数を指定できます（0または未指定=全て置換）。\n\n【使用例】\n・会社名を略称に: rules=[{search:"株式会社", replace:"(株)"}] → "株式会社ABC" → "(株)ABC"\n・全角スペースを半角に: rules=[{search:"　", replace:" "}] → "東京都　渋谷区" → "東京都 渋谷区"\n・複数置換: rules=[{search:"㈱", replace:"(株)"}, {search:"㈲", replace:"(有)"}]',
    paramsSchema: z.object({
      rules: z.array(
        z.object({
          search: z.string(),
          replace: z.string().default(''),
          count: z.number().int().min(0).default(0),
        }),
      ),
    }),
  },
  {
    name: 'date.parse',
    nameJa: '日付を解析',
    summary: 'Parse date/datetime to ISO string',
    outputType: 'datetime',
    descriptionJa:
      '日付文字列を解析して標準形式に変換します。precisionパラメータで「date」（日まで）または「datetime」（秒まで）を指定できます。入力: 文字列（日付形式）、出力: 文字列（precision="date"の場合はYYYY-MM-DD、precision="datetime"の場合はISO形式）',
    paramsSchema: z.object({
      formats: z.array(z.string()).min(1),
      precision: z.enum(['date', 'datetime', 'time']).default('datetime'),
    }),
  },
  {
    name: 'date.format',
    nameJa: '日付をフォーマット',
    summary: 'Format date/datetime to target string',
    outputType: 'string',
    descriptionJa:
      '日付/日時を指定された形式の文字列にフォーマットします。precisionパラメータで「date」（日まで）または「datetime」（秒まで）を指定できます。入力: 日付/日時（ISO形式など）、出力: 文字列（指定された形式）',
    paramsSchema: z.object({
      format: z.string().optional(),
      precision: z.enum(['date', 'datetime', 'time']).optional(),
      dateFormat: z.string().optional(),
      timeFormat: z.string().optional(),
    }),
  },
  {
    name: 'date.addDays',
    nameJa: '日付に日数を加算',
    summary: 'Add days to date/datetime',
    outputType: 'datetime',
    descriptionJa:
      '日付/日時に指定された日数を加算します。入力と同じ形式で出力されます。daysパラメータで加算する日数を指定できます（デフォルト: 30）。',
    paramsSchema: z.object({
      days: z.number().int().default(30),
    }),
  },
  {
    name: 'number.parse',
    nameJa: '数値に変換',
    summary: 'Parse string to number',
    outputType: 'number',
    descriptionJa: '文字列を数値に変換します。カンマ区切りの数値や整数/小数の指定が可能です。入力: 文字列（数値形式）、出力: 数値',
    paramsSchema: z.object({
      allowThousands: z.boolean().default(true),
      int: z.boolean().default(false),
    }),
  },
  {
    name: 'http.fetchJson',
    nameJa: 'HTTPからJSONを取得',
    summary: 'Fetch JSON from HTTP endpoint (async)',
    outputType: 'json',
    descriptionJa:
      'HTTPエンドポイントからJSONデータを取得します。非同期処理でネットワークリクエストを実行します。POST/PUT/PATCHメソッドの場合、bodyパラメータを固定値または列から取得できます。入力: 任意の値（URLパラメータやbodyパラメータとして使用可能）、出力: JSONオブジェクト（pickパラメータで特定の値を抽出可能）',
    sideEffects: 'network',
    paramsSchema: z.object({
      url: z.string().min(1),
      method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('GET'),
      headers: z.record(z.string()).optional(),
      query: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
      body: z.any().optional(),
      bodyParams: z
        .array(
          z.object({
            key: z.string(),
            value: z.any().optional(),
            source: z.enum(['literal', 'column']),
            column: z.string().optional(),
          }),
        )
        .optional(),
      timeoutMs: z.number().min(1).max(120_000).default(10_000),
      pick: z.string().optional(),
    }),
  },
  {
    name: 'json.pick',
    nameJa: 'JSONから値を取得',
    summary: 'Pick value by dotted path',
    outputType: 'any',
    descriptionJa: 'JSONオブジェクトからドット区切りのパスで指定された値を取得します。入力: JSONオブジェクト、出力: 指定されたパスの値（任意の型）',
    paramsSchema: z.object({
      path: z.string().min(1),
    }),
  },
  {
    name: 'condition.equals',
    nameJa: '値が等しいか判定（true/false）',
    summary: 'Return true if value equals compareTo, otherwise false',
    outputType: 'boolean',
    descriptionJa: '値が指定された値と等しいかどうかを判定します。等しい場合はtrue、そうでない場合はfalseを返します。\n\n【パラメータ説明】\n・比較する値: 入力値と比較する値を指定\n・大文字小文字を区別: ONの場合は完全一致、OFFの場合は大小文字を無視して比較\n\n【使用例】\n・"発送済み"と比較: 比較する値="発送済み" → "発送済み" → true、"未発送" → false\n・大小文字無視で比較: 比較する値="ABC", 大文字小文字を区別=OFF → "abc" → true',
    paramsSchema: z.object({
      compareTo: z.any(),
      caseSensitive: z.boolean().default(true),
    }),
  },
  {
    name: 'product.fromColumns',
    nameJa: '列から商品に変換',
    summary: 'Convert 3 columns (sku, quantity, name) to products array',
    outputType: 'json',
    descriptionJa:
      '3つの列（SKU、数量、商品名）から商品オブジェクトを作成し、products配列（長さ1）に変換します。入力: 任意の値（通常はSKU列）、出力: products配列 [{sku, quantity, name}]',
    paramsSchema: z.object({
      skuColumn: z.string().default('sku'),
      quantityColumn: z.string().default('quantity'),
      nameColumn: z.string().default('name'),
    }),
  },
  {
    name: 'product.toString',
    nameJa: '商品配列を文字列に変換',
    summary: 'Convert products array to formatted string',
    outputType: 'string',
    descriptionJa:
      '商品配列（products）を「商品名 x 数量 / 商品名 x 数量」形式の文字列に変換します。数量が1の場合は「x 数量」を表示しません。入力: products配列、出力: 文字列（フォーマット済み）',
    paramsSchema: z.object({
      separator: z.string().default(' / '),
    }),
  },
  {
    name: 'array.index',
    nameJa: '配列要素を取得',
    summary: 'Get array element by index',
    outputType: 'any',
    descriptionJa: '配列から指定されたインデックスの要素を取得します。インデックスは0から開始します。入力: 配列、出力: 指定されたインデックスの要素（存在しない場合は undefined）',
    paramsSchema: z.object({
      index: z.number().int().min(0).default(0),
    }),
  },
];

// Combine plugins 元数据（不包含 run 方法）
export const combinePluginsMetadata: CombinePlugin[] = [
  {
    name: 'combine.concat',
    nameJa: '値を結合',
    summary: 'Join values into a string',
    paramsSchema: z.object({
      separator: z.string().default(''),
      ignoreEmpty: z.boolean().default(true),
    }),
  },
  {
    name: 'combine.first',
    nameJa: '最初の非空値を取得',
    summary: 'Pick the first non-empty value',
  },
  {
    name: 'combine.array',
    nameJa: '値を配列に結合',
    summary: 'Combine values into array',
  },
];

