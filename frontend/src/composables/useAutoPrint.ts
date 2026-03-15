import { ref } from 'vue'

/**
 * Composable for managing auto-print toggle state via localStorage.
 * Shared between OneByOneInspection, OneProductInspection, and OrderItemScan.
 *
 * @param storageKey - The localStorage key used to persist the setting
 * @param defaultValue - Default value when no stored setting exists (default: true)
 */
export function useAutoPrint(storageKey: string, defaultValue = true) {
  const loadSetting = (): boolean => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored === null) return defaultValue
      return stored === 'true'
    } catch {
      return defaultValue
    }
  }

  const autoPrintEnabled = ref<boolean>(loadSetting())

  const saveAutoPrintSetting = () => {
    try {
      localStorage.setItem(storageKey, String(autoPrintEnabled.value))
    } catch (e) {
      // 自動印刷設定保存失敗 / Failed to save auto print setting
    }
  }

  return {
    autoPrintEnabled,
    saveAutoPrintSetting,
  }
}
