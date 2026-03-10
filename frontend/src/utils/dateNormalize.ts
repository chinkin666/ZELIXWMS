/**
 * 规范化日期值，只保留日期部分（YYYY/MM/DD）
 * 用于处理可能包含时分秒的日期字符串
 * 
 * @param val - 日期值（可以是字符串、Date对象等）
 * @returns 规范化后的日期字符串（YYYY/MM/DD格式），如果无法解析则返回空字符串
 */
export function normalizeDateOnly(val: any): string {
  if (!val) return ''

  if (typeof val === 'string') {
    // 如果已经是 YYYY/MM/DD 格式，直接返回
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(val)) return val
    
    // 如果是 YYYY-MM-DD 格式，转换为 YYYY/MM/DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val.replace(/-/g, '/')
    
    // 如果包含时分秒，只提取日期部分
    // 匹配 YYYY-MM-DD 或 YYYY/MM/DD 格式（可能后面跟着时间部分）
    const dateMatch = val.match(/^(\d{4})[-\/](\d{2})[-\/](\d{2})/)
    if (dateMatch) {
      const [, year, month, day] = dateMatch
      return `${year}/${month}/${day}`
    }
    
    // 尝试解析为 Date 对象
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

