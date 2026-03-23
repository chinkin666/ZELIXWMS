/**
 * useConfirm ユニットテスト / 确认弹窗 composable 单元测试
 *
 * confirm 関数の Promise ベースのダイアログ管理の検証
 * 验证 confirm 函数的 Promise 基础弹窗管理
 */
import { describe, it, expect, vi } from 'vitest'

// ODialog をモック / mock ODialog
vi.mock('@/components/ui/dialog', () => ({
  default: { name: 'ODialog', template: '<div />' },
}))

import { useConfirm } from '../useConfirm'

describe('useConfirm / 確認ダイアログ', () => {
  it('初期状態ではisOpenがfalse / 初始状态 isOpen 为 false', () => {
    const { isOpen } = useConfirm()
    expect(isOpen.value).toBe(false)
  })

  it('confirm呼び出しでisOpenがtrueになる / 调用 confirm 后 isOpen 变为 true', () => {
    const { confirm, isOpen } = useConfirm()
    confirm({ message: 'テスト確認' })
    expect(isOpen.value).toBe(true)
  })

  it('confirm がPromiseを返す / confirm 返回 Promise', () => {
    const { confirm } = useConfirm()
    const result = confirm({ message: '確認しますか？' })
    expect(result).toBeInstanceOf(Promise)
  })

  it('ConfirmDialog コンポーネントを返す / 返回 ConfirmDialog 组件', () => {
    const { ConfirmDialog } = useConfirm()
    expect(ConfirmDialog).toBeDefined()
    expect(ConfirmDialog.name).toBe('ConfirmDialog')
  })

  it('dangerオプションを受け取る / 接受 danger 选项', () => {
    const { confirm, isOpen } = useConfirm()
    confirm({ message: '削除しますか？', danger: true, title: '削除確認' })
    expect(isOpen.value).toBe(true)
  })
})
