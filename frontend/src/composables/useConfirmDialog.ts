/**
 * shadcn AlertDialog ベース確認ダイアログ composable / 基于 shadcn AlertDialog 的确认弹窗 composable
 *
 * グローバル共有状態で、どのコンポーネントからでも confirm() を呼べる
 * 全局共享状态，任何组件都可以调用 confirm()
 *
 * @example
 * const { confirm } = useConfirmDialog()
 * if (!(await confirm('本当に削除しますか？'))) return
 */
import { ref } from 'vue'

/** ダイアログ状態（グローバルシングルトン）/ 弹窗状态（全局单例）*/
const isOpen = ref(false)
const title = ref('確認')
const message = ref('')
const isDanger = ref(false)
const confirmText = ref('確認')
const cancelText = ref('キャンセル')
let resolvePromise: ((value: boolean) => void) | null = null

/** 危険キーワード自動判定 / 危险关键词自动判定 */
const dangerKeywords = ['削除', '取消', 'キャンセル', '無効', 'リセット', '解除', '取り消せません']

export interface ConfirmDialogOptions {
  /** ダイアログタイトル / 弹窗标题 */
  title?: string
  /** 危険操作フラグ / 危险操作标记 */
  danger?: boolean
  /** 確認ボタンテキスト / 确认按钮文字 */
  confirmText?: string
  /** キャンセルボタンテキスト / 取消按钮文字 */
  cancelText?: string
}

export function useConfirmDialog() {
  /**
   * 確認ダイアログを表示し、ユーザーの選択を Promise で返す
   * 显示确认弹窗，通过 Promise 返回用户选择
   */
  const confirm = (msg: string, opts?: ConfirmDialogOptions): Promise<boolean> => {
    message.value = msg
    const autoDetectDanger = dangerKeywords.some(kw => msg.includes(kw))
    isDanger.value = opts?.danger ?? autoDetectDanger
    title.value = opts?.title ?? (isDanger.value ? '操作の確認' : '確認')
    confirmText.value = opts?.confirmText ?? (isDanger.value ? '削除する' : '確認')
    cancelText.value = opts?.cancelText ?? 'キャンセル'
    isOpen.value = true
    return new Promise<boolean>(resolve => {
      resolvePromise = resolve
    })
  }

  const handleConfirm = () => {
    isOpen.value = false
    resolvePromise?.(true)
    resolvePromise = null
  }

  const handleCancel = () => {
    isOpen.value = false
    resolvePromise?.(false)
    resolvePromise = null
  }

  return { isOpen, title, message, isDanger, confirmText, cancelText, confirm, handleConfirm, handleCancel }
}
