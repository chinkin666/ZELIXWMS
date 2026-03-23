/**
 * Toast 通知コンポーザブル / Toast 通知组合式函数
 *
 * vue-sonner ベースに移行。API は維持。
 * 已迁移到 vue-sonner 基础。API 保持不变。
 */
import { toast } from 'vue-sonner'

export function useToast() {
  function show(message: string, type: 'success' | 'warning' | 'danger' | 'info' = 'success', duration = 3000) {
    const opts = { duration }
    if (type === 'success') toast.success(message, opts)
    else if (type === 'danger') toast.error(message, opts)
    else if (type === 'warning') toast.warning(message, opts)
    else toast.info(message, opts)
  }

  function showSuccess(message: string, duration = 3000) {
    toast.success(message, { duration })
  }

  function showError(message: string, duration = 5000) {
    toast.error(message, { duration })
  }

  function showWarning(message: string, duration = 4000) {
    toast.warning(message, { duration })
  }

  function showInfo(message: string, duration = 3000) {
    toast.info(message, { duration })
  }

  return { show, showSuccess, showError, showWarning, showInfo }
}
