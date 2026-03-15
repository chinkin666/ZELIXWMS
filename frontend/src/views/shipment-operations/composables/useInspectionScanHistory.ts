import { ref } from 'vue'

// スキャン履歴エントリ / 扫描历史条目
interface ScanHistoryEntry {
  time: string
  value: string
  result: 'ok' | 'error'
  detail: string
}

/**
 * スキャン履歴の管理 / 扫描历史管理
 * OneByOneInspection / OneProductInspection で共通使用
 */
export function useInspectionScanHistory() {
  const scanHistory = ref<ScanHistoryEntry[]>([])

  function addScanHistory(value: string, result: 'ok' | 'error', detail: string) {
    const now = new Date()
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
    scanHistory.value = [...scanHistory.value, { time, value, result, detail }].slice(-5)
  }

  return { scanHistory, addScanHistory }
}
