/**
 * useAutoPrint ユニットテスト / 自动打印 composable 单元测试
 *
 * localStorage を介した自動印刷設定の管理を検証
 * 验证通过 localStorage 管理自动打印设置
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useAutoPrint } from '../useAutoPrint'

describe('useAutoPrint / 自動印刷設定', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('デフォルト値がtrueで初期化される / 默认值 true 初始化', () => {
    const { autoPrintEnabled } = useAutoPrint('test_auto_print')
    expect(autoPrintEnabled.value).toBe(true)
  })

  it('カスタムデフォルト値で初期化できる / 可以使用自定义默认值初始化', () => {
    const { autoPrintEnabled } = useAutoPrint('test_auto_print', false)
    expect(autoPrintEnabled.value).toBe(false)
  })

  it('localStorageに保存された値を読み込む / 从 localStorage 加载保存的值', () => {
    localStorage.setItem('test_auto_print', 'false')
    const { autoPrintEnabled } = useAutoPrint('test_auto_print')
    expect(autoPrintEnabled.value).toBe(false)
  })

  it('設定をlocalStorageに保存する / 将设置保存到 localStorage', () => {
    const { autoPrintEnabled, saveAutoPrintSetting } = useAutoPrint('test_auto_print')
    autoPrintEnabled.value = false
    saveAutoPrintSetting()
    expect(localStorage.getItem('test_auto_print')).toBe('false')
  })

  it('異なるストレージキーで独立して動作する / 不同存储键独立工作', () => {
    localStorage.setItem('key_a', 'true')
    localStorage.setItem('key_b', 'false')
    const a = useAutoPrint('key_a')
    const b = useAutoPrint('key_b')
    expect(a.autoPrintEnabled.value).toBe(true)
    expect(b.autoPrintEnabled.value).toBe(false)
  })
})
