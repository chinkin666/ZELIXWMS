import { ref } from 'vue'

/**
 * 検品後自動次注文移動の有効/無効管理 / 检品后自动切换到下一个订单的启用/禁用管理
 * OneByOneInspection で使用
 */
export function useAutoAdvance(initialValue = true) {
  const autoAdvanceEnabled = ref(initialValue)

  function toggleAutoAdvance() {
    autoAdvanceEnabled.value = !autoAdvanceEnabled.value
  }

  return { autoAdvanceEnabled, toggleAutoAdvance }
}
