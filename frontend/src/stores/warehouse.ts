/**
 * 倉庫選択ストア / 仓库选择状态管理
 * ナビバーの倉庫セレクターで使用し、選択状態をlocalStorageに永続化する
 * 用于导航栏的仓库选择器，将选择状态持久化到localStorage
 */
import { ref, computed } from 'vue'

const STORAGE_KEY = 'wms_selected_warehouse'

const selectedWarehouseId = ref<string>(localStorage.getItem(STORAGE_KEY) || '')

export function useWarehouseStore() {
  /**
   * 倉庫を選択する / 选择仓库
   * @param id 倉庫ID（空文字で全倉庫） / 仓库ID（空字符串表示全仓库）
   */
  function setWarehouse(id: string) {
    selectedWarehouseId.value = id
    if (id) {
      localStorage.setItem(STORAGE_KEY, id)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  return {
    selectedWarehouseId: computed(() => selectedWarehouseId.value),
    setWarehouse,
  }
}
