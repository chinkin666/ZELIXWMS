import en from './en'
import zh from './zh'
import ja from './ja'
import { wmsEn, wmsZh, wmsJa } from './wms'

function flatToNested(flat: Record<string, string>): Record<string, any> {
  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.')
    let current = result
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]!
      if (!(part in current)) {
        current[part] = {}
      }
      current = current[part]
    }
    const lastPart = parts[parts.length - 1]!
    current[lastPart] = value
  }
  return result
}

function deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
  const result = { ...target }
  for (const key of Object.keys(source)) {
    if (key in result && typeof result[key] === 'object' && typeof source[key] === 'object') {
      result[key] = deepMerge(result[key], source[key])
    } else {
      result[key] = source[key]
    }
  }
  return result
}

export const messages = {
  en: deepMerge(en, flatToNested(wmsEn)),
  zh: deepMerge(zh, flatToNested(wmsZh)),
  ja: deepMerge(ja, flatToNested(wmsJa)),
}
