import type { FormTemplate, FormTemplateColumn, BarcodeConfig, HeaderFooterItem } from '@/types/formTemplate'
import { renderBarcodePngDataUrl } from '@/utils/print/renderBarcodeDataUrl'
import type { TDocumentDefinitions } from 'pdfmake/interfaces'
import { loadJapaneseFont } from './jpFontLoader'

// 日本語フォントの読み込み状態
let japaneseFont: Uint8Array | null = null
let fontLoadAttempted = false

// pdfmake を動的にインポート（遅延ロード）
async function createPdfDocument(docDefinition: TDocumentDefinitions): Promise<{
  getBlob: (callback: (blob: Blob) => void) => void
}> {
  // pdfmake を動的にインポート
  const pdfMakeModule = await import('pdfmake/build/pdfmake')
  const pdfFontsModule = await import('pdfmake/build/vfs_fonts')
  
  const pdfMake = pdfMakeModule.default || pdfMakeModule
  const fontsData = pdfFontsModule as Record<string, any>
  
  // 日本語フォントを一度だけロードする
  if (!fontLoadAttempted) {
    fontLoadAttempted = true
    try {
      japaneseFont = await loadJapaneseFont()
    } catch (error) {
      console.warn('日本語フォントのロードに失敗しました。Roboto フォントを使用します。', error)
    }
  }
  
  // pdfmake 0.3: フォントファイルは Base64 文字列として直接エクスポートされている
  // virtualfs に正しくフォントを登録する
  if ((pdfMake as any).virtualfs) {
    const virtualFs = (pdfMake as any).virtualfs
    
    // Roboto フォントを登録
    for (const [key, value] of Object.entries(fontsData)) {
      if (key !== 'default' && typeof value === 'string' && key.endsWith('.ttf')) {
        // Base64 文字列をバイナリに変換して書き込む
        const binaryString = atob(value)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        virtualFs.writeFileSync(key, bytes)
      }
    }
    
    // 日本語フォントを登録
    if (japaneseFont) {
      virtualFs.writeFileSync('NotoSansJP-Regular.ttf', japaneseFont)
    }
  }
  
  // フォント設定
  const fontDefs: Record<string, any> = {
    Roboto: {
      normal: 'Roboto-Regular.ttf',
      bold: 'Roboto-Medium.ttf',
      italics: 'Roboto-Italic.ttf',
      bolditalics: 'Roboto-MediumItalic.ttf'
    }
  }
  
  // 日本語フォントが利用可能な場合は追加
  if (japaneseFont) {
    fontDefs.NotoSansJP = {
      normal: 'NotoSansJP-Regular.ttf',
      bold: 'NotoSansJP-Regular.ttf', // Bold がないので Regular を使用
      italics: 'NotoSansJP-Regular.ttf',
      bolditalics: 'NotoSansJP-Regular.ttf'
    }
    
    // デフォルトフォントを日本語フォントに設定
    docDefinition.defaultStyle = {
      ...docDefinition.defaultStyle,
      font: 'NotoSansJP'
    }
  }
  
  // pdfmake 0.3: fonts プロパティに直接設定
  if (pdfMake.fonts) {
    Object.assign(pdfMake.fonts, fontDefs)
  } else {
    ;(pdfMake as any).fonts = fontDefs
  }
  
  // PDF ドキュメントを作成
  return pdfMake.createPdf(docDefinition)
}

type Content = TDocumentDefinitions['content']
type ContentTable = Extract<Content, { table: any }>

export interface GeneratePdfOptions {
  /** プレビューモード（新しいタブで開く） */
  preview?: boolean
  /** ファイル名（ダウンロード用） */
  filename?: string
  /** Blob URLを返す（プレビュー用） */
  returnBlob?: boolean
}

/**
 * 変数を置換（ページ番号なし）
 */
/**
 * 変数を置換（ページ番号あり）
 */
function replaceVariablesWithPage(text: string, currentPage: number, pageCount: number): string {
  const now = new Date()
  return text
    .replace(/\{\{date\}\}/g, now.toLocaleDateString('ja-JP'))
    .replace(/\{\{time\}\}/g, now.toLocaleTimeString('ja-JP'))
    .replace(/\{\{datetime\}\}/g, now.toLocaleString('ja-JP'))
    .replace(/\{\{page\}\}/g, String(currentPage))
    .replace(/\{\{pages\}\}/g, String(pageCount))
}

/**
 * HeaderFooterItem を pdfmake のコンテンツに変換
 */
function renderHeaderFooterItem(item: HeaderFooterItem, currentPage: number, pageCount: number): any {
  const style: any = {
    fontSize: item.style.fontSize || 10,
    bold: item.style.bold || false,
    italics: item.style.italic || false,
    alignment: item.style.alignment || 'left',
  }
  if (item.style.color) {
    style.color = item.style.color
  }

  if (item.type === 'text') {
    return {
      text: replaceVariablesWithPage(item.text || '', currentPage, pageCount),
      ...style,
    }
  }

  if (item.type === 'columns') {
    if (!item.columns || item.columns.length === 0) {
      return null
    }
    return {
      columns: item.columns.map((col) => ({
        text: replaceVariablesWithPage(col.text || '', currentPage, pageCount),
        width: col.width === 'auto' ? 'auto' : col.width || '*',
        alignment: col.alignment || style.alignment,
        fontSize: style.fontSize,
        bold: style.bold,
        italics: style.italics,
        color: style.color,
      })),
    }
  }

  if (item.type === 'table') {
    if (!item.table?.body || item.table.body.length === 0) {
      return null
    }
    // 空の行をフィルタリングし、各行のセル数を統一
    const validBody = item.table.body.filter((row) => Array.isArray(row) && row.length > 0)
    if (validBody.length === 0) {
      return null
    }

    const tableStyle = item.table.tableStyle || {}
    const headerRows = tableStyle.headerRows || 0
    const cellPadding = tableStyle.cellPadding ?? 4
    const horizontalAlign = tableStyle.horizontalAlign || 'left'
    const borderColor = tableStyle.borderColor || '#cccccc'
    const headerBgColor = tableStyle.headerBgColor || '#2a3474'
    const headerTextColor = tableStyle.headerTextColor || '#ffffff'

    const maxCols = Math.max(...validBody.map((row) => row.length))
    const normalizedBody = validBody.map((row, rowIdx) => {
      // セル数を統一（足りない場合は空文字で埋める）
      const normalizedRow = [...row]
      while (normalizedRow.length < maxCols) {
        normalizedRow.push('')
      }
      const isHeaderRow = rowIdx < headerRows
      return normalizedRow.map((cell) => ({
        text: replaceVariablesWithPage(cell || '', currentPage, pageCount),
        fontSize: style.fontSize,
        bold: isHeaderRow ? true : style.bold,
        italics: style.italics,
        color: isHeaderRow ? headerTextColor : (style.color || '#000000'),
        fillColor: isHeaderRow ? headerBgColor : undefined,
        alignment: horizontalAlign,
      }))
    })
    const widths = item.table.widths?.slice(0, maxCols) || Array(maxCols).fill('*')
    // widths の数を maxCols に合わせる
    while (widths.length < maxCols) {
      widths.push('*')
    }
    return {
      table: {
        headerRows: headerRows,
        widths,
        body: normalizedBody,
      },
      layout: {
        hLineColor: () => borderColor,
        vLineColor: () => borderColor,
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        paddingLeft: () => cellPadding,
        paddingRight: () => cellPadding,
        paddingTop: () => cellPadding,
        paddingBottom: () => cellPadding,
      },
    }
  }

  return null
}

/**
 * 指定された position と showOn 条件でフィルタされた items を取得
 */
function getFilteredItems(
  items: HeaderFooterItem[] | undefined,
  position: 'header' | 'footer' | 'title',
  showOn: 'all' | 'first' | 'last' | null,
): HeaderFooterItem[] {
  if (!items) return []
  return items.filter((item) => {
    if (item.position !== position) return false
    if (showOn === null) return true // showOn を無視する場合
    if (item.showOn === 'all') return true
    return item.showOn === showOn
  })
}

/**
 * 日付をフォーマット
 */
function formatDate(value: any, format: string): string {
  if (!value) return '-'
  
  let date: Date
  if (value instanceof Date) {
    date = value
  } else if (typeof value === 'string' || typeof value === 'number') {
    date = new Date(value)
  } else {
    return String(value)
  }
  
  if (isNaN(date.getTime())) return String(value)
  
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  
  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

/**
 * 値をフォーマット（日付・配列対応）
 */
function formatTextValue(value: any, renderType?: string, dateFormat?: string): string {
  if (value === null || value === undefined) return '-'
  
  // 日付形式の場合
  if (renderType === 'date' && dateFormat) {
    return formatDate(value, dateFormat)
  }
  
  if (Array.isArray(value)) {
    return value.join(', ')
  }
  return String(value)
}

/**
 * バーコード/QRコード画像を生成
 */
function renderBarcodeImage(
  value: any,
  renderType: 'barcode' | 'qrcode',
  barcodeConfig?: BarcodeConfig,
  horizontalAlign?: string,
): any {
  // 値が存在しない場合は null を返す
  if (!value) return null
  
  // 配列の場合は最後の要素を使用（SKU を末尾にする前提）
  let barcodeValue: any = value
  if (Array.isArray(value)) {
    if (value.length === 0) return null
    barcodeValue = value[value.length - 1]
  }
  
  // 文字列に変換して、空文字列や空白のみの場合は null を返す
  const textValue = String(barcodeValue).trim()
  if (!textValue || textValue === '') return null
  
  try {
    const isBarcode = renderType === 'barcode'
    const defaultFormat = isBarcode ? 'code128' : 'qrcode'
    const format = barcodeConfig?.format || defaultFormat
    
    // 表示サイズ（ユーザー設定またはデフォルト）
    const displayWidth = barcodeConfig?.width || (isBarcode ? 120 : 60)
    const displayHeight = barcodeConfig?.height || (isBarcode ? 40 : 60)
    
    // 高解像度で生成するため、生成サイズを2倍にする
    // これにより、PDFでの表示時により鮮明な画像になる
    const renderScale = 2 // 2倍の解像度で生成
    const renderWidth = displayWidth * renderScale
    const renderHeight = displayHeight * renderScale
    
    const dataUrl = renderBarcodePngDataUrl({
      bcid: format,
      text: textValue,
      width: renderWidth,
      height: renderHeight,
    })
    
    // PDFでの表示サイズ（pt単位）
    // 1pt = 1/72 inch
    const pdfWidth = displayWidth * 0.75
    const pdfHeight = displayHeight * 0.75
    
    return {
      image: dataUrl,
      width: pdfWidth,
      height: pdfHeight,
      alignment: horizontalAlign || 'left',
    }
  } catch (e) {
    console.warn('バーコード生成失敗:', e)
    return null
  }
}

/**
 * 単一のセル内容を生成
 */
function renderCellContent(
  value: any,
  renderType: string | undefined,
  barcodeConfig: BarcodeConfig | undefined,
  dateFormat: string | undefined,
  fontSize: number,
  horizontalAlign: string,
  label?: string,
  rowData?: Record<string, any>, // 行全体のデータ（原始データ取得用）
  fieldKey?: string, // フィールドキー（原始データ取得用）
): any {
  const labelPrefix = label ? `${label}: ` : ''

  // バーコード/QRコード の場合
  if ((renderType === 'qrcode' || renderType === 'barcode')) {
    // バーコード/QRコードの場合は、原始データから取得を試みる
    let barcodeValue: any = value
    
    // フィールドが 'barcode' の場合、原始配列データを優先的に使用
    if (fieldKey === 'barcode' && rowData && '_rawBarcode' in rowData) {
      const rawBarcode = rowData._rawBarcode
      if (rawBarcode !== null && rawBarcode !== undefined) {
        barcodeValue = rawBarcode
      }
    }
    
    const barcodeImg = renderBarcodeImage(barcodeValue, renderType, barcodeConfig, horizontalAlign)
    if (barcodeImg) {
      // ラベルがある場合は stack で縦に並べる
      if (label) {
        return {
          stack: [
            { text: label, fontSize: fontSize - 1, color: '#666666', alignment: horizontalAlign },
            barcodeImg,
          ],
        }
      }
      return barcodeImg
    }
    // バーコード/QRコードが生成できない場合（空文字列など）は何も表示しない
    // テキストフォールバックは行わず、空のセルとして扱う
    return {
      text: '',
      fontSize,
      alignment: horizontalAlign,
    }
  }

  return {
    text: labelPrefix + formatTextValue(value, renderType, dateFormat),
    fontSize,
    alignment: horizontalAlign,
  }
}

/**
 * multi 列の内容を stack として生成（1セル内に縦並び）
 */
function renderMultiColumnContent(
  row: Record<string, any>,
  col: FormTemplateColumn,
  fontSize: number,
  horizontalAlign: string,
): any {
  if (!col.children || col.children.length === 0) {
    return { text: '-', fontSize, alignment: horizontalAlign }
  }

  // 各 child の内容を stack で縦に並べる
  const stackItems: any[] = []

  for (const child of col.children) {
    const value = child.field ? row[child.field] : null
    const cellContent = renderCellContent(
      value,
      child.renderType,
      child.barcodeConfig,
      child.dateFormat,
      fontSize,
      horizontalAlign,
      child.label,
      row, // 行全体のデータを渡す（原始データ取得用）
      child.field, // フィールドキーを渡す
    )
    stackItems.push(cellContent)
  }

  return {
    stack: stackItems,
    alignment: horizontalAlign,
  }
}

/**
 * 帳票 PDF を生成
 * 
 * シンプルなアプローチ：
 * - 1データ = 1行
 * - multi 列は stack で縦に並べる（1セル内）
 * - これにより dontBreakRows が正しく機能する
 */
export async function generateFormPdf(
  template: FormTemplate,
  data: Record<string, any>[],
  options?: GeneratePdfOptions,
): Promise<Blob | void> {
  // 列を順序でソート
  const enabledColumns = [...template.columns].sort((a, b) => a.order - b.order)

  if (enabledColumns.length === 0) {
    throw new Error('出力する列が設定されていません')
  }

  const fontSize = template.styles.fontSize || 9
  const horizontalAlign = template.styles.horizontalAlign || 'left'
  const headerBgColor = template.styles.headerBgColor || '#2a3474'
  const headerTextColor = template.styles.headerTextColor || '#ffffff'

  // ============================================================
  // 表ヘッダーを構築（1行）
  // ============================================================
  const headerRow: any[] = enabledColumns.map((col) => ({
    text: col.label.replace(/\n/g, ' / '), // 改行は「/」で区切って表示
    style: 'tableHeader',
    fillColor: headerBgColor,
    color: headerTextColor,
    bold: true,
    alignment: horizontalAlign,
  }))

  // ============================================================
  // 表データを構築（1データ = 1行）
  // ============================================================
  const tableBody: any[][] = []

  for (const row of data) {
    const dataRow: any[] = []

    for (const col of enabledColumns) {
      if (col.type === 'single') {
        // single 列: 通常のセル
        const value = col.field ? row[col.field] : null
        const cellContent = renderCellContent(
          value,
          col.renderType,
          col.barcodeConfig,
          col.dateFormat,
          fontSize,
          horizontalAlign,
          undefined, // label
          row, // 行全体のデータを渡す（原始データ取得用）
          col.field, // フィールドキーを渡す
        )
        dataRow.push(cellContent)
      } else {
        // multi 列: stack で縦に並べる
        const cellContent = renderMultiColumnContent(row, col, fontSize, horizontalAlign)
        dataRow.push(cellContent)
      }
    }

    tableBody.push(dataRow)
  }

  // 列幅を計算 ('auto' は pdfmake の '*' に変換)
  const widths = enabledColumns.map((c) => {
    if (typeof c.width === 'number') return c.width
    // 'auto' または未設定は pdfmake の '*'（自動幅）に変換
    if (c.width === 'auto' || c.width === '*' || !c.width) return '*'
    return '*'
  })

  // ドキュメント定義を構築
  const content: Content[] = []

  // タイトル項目（position === 'title'）をレンダリング
  const titleItems = getFilteredItems(template.headerFooterItems, 'title', null)
  for (const item of titleItems) {
    const rendered = renderHeaderFooterItem(item, 1, 1) // タイトルはページ番号は1として扱う
    if (rendered) {
      content.push({
        ...rendered,
        margin: item.style.margin || [0, 0, 0, 20],
      } as any)
    }
  }

  // セル内余白
  const cellPadding = template.styles.cellPadding || 4

  // 表
  const tableContent: ContentTable = {
    table: {
      headerRows: 1, // ヘッダー行数は1
      widths,
      body: [headerRow, ...tableBody],
      // 行が分割されないようにする
      dontBreakRows: true,
    },
    layout: {
      hLineColor: () => template.styles.borderColor || '#cccccc',
      vLineColor: () => template.styles.borderColor || '#cccccc',
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      paddingLeft: () => cellPadding,
      paddingRight: () => cellPadding,
      paddingTop: () => cellPadding,
      paddingBottom: () => cellPadding,
    },
  }
  content.push(tableContent as any)

  // ============================================================
  // 余白計算
  // ============================================================
  const userMargins = template.pageMargins || [40, 40, 40, 40]
  const [marginLeft, marginTop, marginRight, marginBottom] = userMargins

  // ヘッダー・フッター項目の高さを計算
  const headerItems = getFilteredItems(template.headerFooterItems, 'header', null)
  const footerItems = getFilteredItems(template.headerFooterItems, 'footer', null)

  // 項目の高さを計算するヘルパー関数
  function calculateItemHeight(item: HeaderFooterItem): number {
    const fontSize = item.style.fontSize || 10
    if (item.type === 'table' && item.table?.body) {
      const rowCount = item.table.body.length
      const cellPadding = item.table.tableStyle?.cellPadding ?? 4
      // 各行の高さ = フォントサイズ + セル内余白*2 + 罫線
      return rowCount * (fontSize + cellPadding * 2 + 1) + 8
    }
    if (item.type === 'columns') {
      return fontSize + 12
    }
    return fontSize + 8
  }

  let headerAreaHeight = 0
  for (const item of headerItems) {
    headerAreaHeight += calculateItemHeight(item)
  }

  let footerAreaHeight = 0
  for (const item of footerItems) {
    footerAreaHeight += calculateItemHeight(item)
  }

  const pdfPageMargins: [number, number, number, number] = [
    marginLeft,
    marginTop + headerAreaHeight,
    marginRight,
    marginBottom + footerAreaHeight,
  ]

  // ドキュメント定義
  const docDefinition: TDocumentDefinitions = {
    pageSize: template.pageSize || 'A4',
    pageOrientation: template.pageOrientation || 'landscape',
    pageMargins: pdfPageMargins,
    content,
    styles: {
      tableHeader: {
        bold: true,
        fontSize: template.styles.fontSize || 9,
      },
    },
    defaultStyle: {
      fontSize: template.styles.fontSize || 9,
    },
  }

  // ヘッダー
  if (headerItems.length > 0) {
    docDefinition.header = (currentPage: number, pageCount: number) => {
      const isFirst = currentPage === 1
      const isLast = currentPage === pageCount

      const elements: any[] = []
      for (const item of headerItems) {
        // showOn 条件をチェック
        if (item.showOn === 'first' && !isFirst) continue
        if (item.showOn === 'last' && !isLast) continue

        const rendered = renderHeaderFooterItem(item, currentPage, pageCount)
        if (rendered) {
          elements.push(rendered)
        }
      }

      if (elements.length === 0) return null

      return {
        stack: elements,
        margin: [marginLeft, marginTop, marginRight, 0],
      }
    }
  }

  // フッター
  if (footerItems.length > 0) {
    docDefinition.footer = (currentPage: number, pageCount: number) => {
      const isFirst = currentPage === 1
      const isLast = currentPage === pageCount

      const elements: any[] = []
      for (const item of footerItems) {
        // showOn 条件をチェック
        if (item.showOn === 'first' && !isFirst) continue
        if (item.showOn === 'last' && !isLast) continue

        const rendered = renderHeaderFooterItem(item, currentPage, pageCount)
        if (rendered) {
          elements.push(rendered)
        }
      }

      if (elements.length === 0) return null

      return {
        stack: elements,
        margin: [marginLeft, 0, marginRight, marginBottom],
      }
    }
  }

  // PDF 生成
  const pdfDoc = await createPdfDocument(docDefinition)

  // Blob を取得
  const blob = await new Promise<Blob>((resolve, reject) => {
    try {
      const result = (pdfDoc as any).getBlob((b: Blob) => {
        resolve(b)
      })
      
      if (result && typeof result.then === 'function') {
        result.then((b: Blob) => resolve(b)).catch(reject)
      }
    } catch (error) {
      reject(error)
    }
  })
  
  // returnBlob オプションが指定されている場合は Blob を返す
  if (options?.returnBlob) {
    return blob
  }

  const url = URL.createObjectURL(blob)

  if (options?.preview) {
    const newWindow = window.open(url, '_blank')
    if (!newWindow) {
      console.warn('ポップアップがブロックされました。ダウンロードします。')
      const a = document.createElement('a')
      a.href = url
      a.download = options?.filename || 'preview.pdf'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
    setTimeout(() => URL.revokeObjectURL(url), 10000)
    return
  } else if (options?.filename) {
    const a = document.createElement('a')
    a.href = url
    a.download = options.filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    return blob
  }
  
  return blob
}

/**
 * デフォルトの帳票テンプレートを生成
 */
export function createDefaultFormTemplate(
  type: string,
  name: string,
  columns: FormTemplateColumn[],
): Partial<FormTemplate> {
  return {
    name,
    targetType: type,
    columns,
    styles: {
      fontSize: 9,
      headerBgColor: '#2a3474',
      headerTextColor: '#ffffff',
      borderColor: '#cccccc',
      cellPadding: 4,
      horizontalAlign: 'left',
    },
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [40, 60, 40, 60],
    headerFooterItems: [
      {
        id: 'default_title',
        position: 'title',
        showOn: 'all',
        type: 'text',
        style: {
          fontSize: 16,
          bold: true,
          alignment: 'center',
        },
        text: name,
      },
      {
        id: 'default_header',
        position: 'header',
        showOn: 'all',
        type: 'text',
        style: {
          fontSize: 10,
          alignment: 'center',
        },
        text: `${name} - {{date}}`,
      },
      {
        id: 'default_footer',
        position: 'footer',
        showOn: 'all',
        type: 'text',
        style: {
          fontSize: 9,
          alignment: 'right',
        },
        text: '{{page}} / {{pages}}',
      },
    ],
    isDefault: false,
  }
}
