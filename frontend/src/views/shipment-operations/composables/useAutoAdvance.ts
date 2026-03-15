import { ref } from 'vue'

const STORAGE_KEY = 'wms_inspection_auto_advance'

/**
 * 検品後自動次注文移動の有効/無効管理 / 检品后自动切换到下一个订单的启用/禁用管理
 * localStorage に設定を永続化する / 将设置持久化到 localStorage
 * OneByOneInspection で使用
 */
export function useAutoAdvance(initialValue = true) {
  // localStorage から復元 / 从 localStorage 恢复
  const stored = localStorage.getItem(STORAGE_KEY)
  const initial = stored !== null ? stored === 'true' : initialValue

  const autoAdvanceEnabled = ref(initial)

  function toggleAutoAdvance() {
    autoAdvanceEnabled.value = !autoAdvanceEnabled.value
    localStorage.setItem(STORAGE_KEY, String(autoAdvanceEnabled.value))
  }

  return { autoAdvanceEnabled, toggleAutoAdvance }
}
