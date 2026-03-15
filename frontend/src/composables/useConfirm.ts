/**
 * 確認ダイアログ composable / 确认弹窗 composable
 *
 * window.confirm() の代替として、ODialog ベースの確認ダイアログを提供する
 * 替代 window.confirm()，提供基于 ODialog 的确认弹窗
 *
 * @example
 * const { confirm, ConfirmDialog } = useConfirm()
 * const ok = await confirm({ title: '削除確認', message: '本当に削除しますか？', danger: true })
 * if (ok) { ... }
 */
import { ref, h, defineComponent } from 'vue'
import ODialog from '@/components/odoo/ODialog.vue'

export interface ConfirmOptions {
  /** ダイアログタイトル / 弹窗标题 */
  title?: string
  /** 確認メッセージ / 确认消息 */
  message: string
  /** 危険操作フラグ（赤ボタン表示）/ 危险操作标记（红色按钮）*/
  danger?: boolean
  /** 確認ボタンテキスト / 确认按钮文字 */
  confirmText?: string
  /** キャンセルボタンテキスト / 取消按钮文字 */
  cancelText?: string
}

export function useConfirm() {
  const isOpen = ref(false)
  const options = ref<ConfirmOptions>({ message: '' })
  let resolvePromise: ((value: boolean) => void) | null = null

  function confirm(opts: ConfirmOptions): Promise<boolean> {
    options.value = opts
    isOpen.value = true
    return new Promise<boolean>((resolve) => {
      resolvePromise = resolve
    })
  }

  function handleConfirm() {
    isOpen.value = false
    resolvePromise?.(true)
    resolvePromise = null
  }

  function handleClose() {
    isOpen.value = false
    resolvePromise?.(false)
    resolvePromise = null
  }

  // レンダリングコンポーネント / 渲染组件
  const ConfirmDialog = defineComponent({
    name: 'ConfirmDialog',
    setup() {
      return () =>
        h(
          ODialog,
          {
            open: isOpen.value,
            title: options.value.title || '確認',
            size: 'sm' as const,
            danger: options.value.danger || false,
            onClose: handleClose,
            onConfirm: handleConfirm,
          },
          {
            default: () => h('p', { style: 'margin:0;font-size:14px;line-height:1.6;color:var(--o-gray-700,#303133)' }, options.value.message),
            'confirm-text': () => options.value.confirmText || (options.value.danger ? '削除' : '確認'),
          },
        )
    },
  })

  return { confirm, ConfirmDialog, isOpen }
}
