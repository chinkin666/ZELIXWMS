/**
 * 日付値を正規化し、日付部分のみを保持（YYYY/MM/DD） / 规范化日期值，只保留日期部分（YYYY/MM/DD）
 * 時分秒を含む可能性のある日付文字列を処理するために使用 / 用于处理可能包含时分秒的日期字符串
 *
 * @param val - 日付値（文字列、Dateオブジェクト等） / 日期值（可以是字符串、Date对象等）
 * @returns 正規化後の日付文字列（YYYY/MM/DD形式）、解析できない場合は空文字列 / 规范化后的日期字符串（YYYY/MM/DD格式），如果无法解析则返回空字符串
 */
export function normalizeDateOnly(val: any): string {
  if (!val) return ''

  if (typeof val === 'string') {
    // 既にYYYY/MM/DD形式の場合、そのまま返す / 如果已经是 YYYY/MM/DD 格式，直接返回
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(val)) return val
    
    // YYYY-MM-DD形式の場合、YYYY/MM/DDに変換 / 如果是 YYYY-MM-DD 格式，转换为 YYYY/MM/DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val.replace(/-/g, '/')
    
    // 時分秒を含む場合、日付部分のみを抽出 / 如果包含时分秒，只提取日期部分
    // YYYY-MM-DDまたはYYYY/MM/DD形式にマッチ（後ろに時間部分が続く可能性あり） / 匹配 YYYY-MM-DD 或 YYYY/MM/DD 格式（可能后面跟着时间部分）
    const dateMatch = val.match(/^(\d{4})[-\/](\d{2})[-\/](\d{2})/)
    if (dateMatch) {
      const [, year, month, day] = dateMatch
      return `${year}/${month}/${day}`
    }
    
    // Dateオブジェクトとして解析を試みる / 尝试解析为 Date 对象
    const d = new Date(val)
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}/${month}/${day}`
    }
  }
  
  if (val instanceof Date) {
    if (!isNaN(val.getTime())) {
      const year = val.getFullYear()
      const month = String(val.getMonth() + 1).padStart(2, '0')
      const day = String(val.getDate()).padStart(2, '0')
      return `${year}/${month}/${day}`
    }
  }

  return ''
}

