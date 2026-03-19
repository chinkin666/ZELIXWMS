/**
 * useToast コンポーザブルのユニットテスト
 * useToast 组合式函数单元测试
 *
 * トースト通知の表示・削除・自動消去を検証する。
 * 验证 Toast 通知的显示、删除和自动消去行为。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useToast } from '../useToast'

// モジュールレベルの共有 ref をテスト間でリセットするため、
// 各テスト前にタイマーをモックし、既存トーストを除去する。
// 模块级共享 ref 在测试之间需要清理，每个测试前 mock 计时器并清除现有 toast。
beforeEach(() => {
  vi.useFakeTimers()
  // モジュール共有 state をリセット / 重置模块共享状态
  const { toasts, remove } = useToast()
  ;[...toasts.value].forEach((t) => remove(t.id))
})

afterEach(() => {
  vi.useRealTimers()
})

// ─────────────────────────────────────────────
// show() 基本動作 / show() 基础行为
// ─────────────────────────────────────────────
describe('show() / 基本トースト表示', () => {
  it('トーストを追加し、id・message・type が設定される / 添加 toast 并设置 id、message、type', () => {
    const { toasts, show } = useToast()

    show('Hello', 'success')

    expect(toasts.value).toHaveLength(1)
    expect(toasts.value[0].message).toBe('Hello')
    expect(toasts.value[0].type).toBe('success')
    expect(typeof toasts.value[0].id).toBe('number')
  })

  it('type のデフォルト値は "success" / type 默认值为 "success"', () => {
    const { toasts, show } = useToast()

    show('Default type')

    expect(toasts.value[0].type).toBe('success')
  })

  it('duration のデフォルト値は 3000ms / duration 默认值为 3000ms', () => {
    const { toasts, show } = useToast()

    show('With default duration')

    expect(toasts.value[0].duration).toBe(3000)
  })

  it('カスタム duration を指定できる / 可以指定自定义 duration', () => {
    const { toasts, show } = useToast()

    show('Long toast', 'info', 10000)

    expect(toasts.value[0].duration).toBe(10000)
  })
})

// ─────────────────────────────────────────────
// showSuccess() / 成功トースト
// ─────────────────────────────────────────────
describe('showSuccess() / 成功通知', () => {
  it('type が "success" でトーストを追加する / 添加 type 为 "success" 的 toast', () => {
    const { toasts, showSuccess } = useToast()

    showSuccess('保存しました')

    expect(toasts.value).toHaveLength(1)
    expect(toasts.value[0].type).toBe('success')
    expect(toasts.value[0].message).toBe('保存しました')
  })

  it('デフォルト duration は 3000ms / 默认 duration 为 3000ms', () => {
    const { toasts, showSuccess } = useToast()

    showSuccess('OK')

    expect(toasts.value[0].duration).toBe(3000)
  })

  it('カスタム duration を上書きできる / 可以覆盖自定义 duration', () => {
    const { toasts, showSuccess } = useToast()

    showSuccess('Quick', 1000)

    expect(toasts.value[0].duration).toBe(1000)
  })
})

// ─────────────────────────────────────────────
// showError() / エラートースト
// ─────────────────────────────────────────────
describe('showError() / エラー通知', () => {
  it('type が "danger" でトーストを追加する / 添加 type 为 "danger" 的 toast', () => {
    const { toasts, showError } = useToast()

    showError('処理に失敗しました')

    expect(toasts.value).toHaveLength(1)
    expect(toasts.value[0].type).toBe('danger')
    expect(toasts.value[0].message).toBe('処理に失敗しました')
  })

  it('デフォルト duration は 5000ms (エラーは長め) / 默认 duration 为 5000ms（错误提示时间更长）', () => {
    const { toasts, showError } = useToast()

    showError('Error')

    expect(toasts.value[0].duration).toBe(5000)
  })
})

// ─────────────────────────────────────────────
// showWarning() / 警告トースト
// ─────────────────────────────────────────────
describe('showWarning() / 警告通知', () => {
  it('type が "warning" でトーストを追加する / 添加 type 为 "warning" 的 toast', () => {
    const { toasts, showWarning } = useToast()

    showWarning('在庫が少なくなっています')

    expect(toasts.value).toHaveLength(1)
    expect(toasts.value[0].type).toBe('warning')
    expect(toasts.value[0].message).toBe('在庫が少なくなっています')
  })

  it('デフォルト duration は 4000ms / 默认 duration 为 4000ms', () => {
    const { toasts, showWarning } = useToast()

    showWarning('Warning')

    expect(toasts.value[0].duration).toBe(4000)
  })
})

// ─────────────────────────────────────────────
// remove() / 手動削除
// ─────────────────────────────────────────────
describe('remove() / 手動でトーストを削除', () => {
  it('指定した id のトーストを削除する / 按 id 删除指定 toast', () => {
    const { toasts, show, remove } = useToast()

    show('First', 'success', 0)
    show('Second', 'success', 0)

    const idToRemove = toasts.value[0].id
    remove(idToRemove)

    expect(toasts.value).toHaveLength(1)
    expect(toasts.value[0].message).toBe('Second')
  })

  it('存在しない id を渡しても他のトーストに影響しない / 删除不存在的 id 不影响其他 toast', () => {
    const { toasts, show, remove } = useToast()

    show('Only toast', 'success', 0)
    remove(99999)

    expect(toasts.value).toHaveLength(1)
  })

  it('空のリストに対して remove を呼んでもエラーにならない / 空列表调用 remove 不报错', () => {
    const { toasts, remove } = useToast()

    expect(() => remove(0)).not.toThrow()
    expect(toasts.value).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────
// 自動消去 / 自动消去
// ─────────────────────────────────────────────
describe('自動消去 / 自动消去', () => {
  it('duration 経過後にトーストが自動削除される / duration 到期后 toast 自动删除', () => {
    const { toasts, show } = useToast()

    show('Auto dismiss', 'success', 2000)
    expect(toasts.value).toHaveLength(1)

    vi.advanceTimersByTime(2000)

    expect(toasts.value).toHaveLength(0)
  })

  it('duration 前はトーストが残る / duration 到期前 toast 保留', () => {
    const { toasts, show } = useToast()

    show('Stay', 'success', 3000)

    vi.advanceTimersByTime(2999)

    expect(toasts.value).toHaveLength(1)
  })

  it('duration = 0 のときは自動削除されない / duration=0 时不自动删除', () => {
    const { toasts, show } = useToast()

    show('Persistent', 'success', 0)

    vi.advanceTimersByTime(100000)

    expect(toasts.value).toHaveLength(1)
  })

  it('異なる duration を持つ複数トーストが順番に消える / 不同 duration 的多个 toast 按顺序消失', () => {
    const { toasts, show } = useToast()

    show('Fast', 'success', 1000)
    show('Slow', 'warning', 3000)
    expect(toasts.value).toHaveLength(2)

    vi.advanceTimersByTime(1000)
    // Fast は消えている / Fast 已消失
    expect(toasts.value).toHaveLength(1)
    expect(toasts.value[0].message).toBe('Slow')

    vi.advanceTimersByTime(2000)
    // Slow も消えている / Slow 也已消失
    expect(toasts.value).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────
// 複数トースト / 複数 toast の同時表示
// ─────────────────────────────────────────────
describe('複数トースト / 同时显示多个 toast', () => {
  it('複数のトーストを同時に保持できる / 可以同时保持多个 toast', () => {
    const { toasts, showSuccess, showError, showWarning } = useToast()

    showSuccess('Success message', 0)
    showError('Error message', 0)
    showWarning('Warning message', 0)

    expect(toasts.value).toHaveLength(3)
  })

  it('各トーストは一意の id を持つ / 每个 toast 拥有唯一 id', () => {
    const { toasts, show } = useToast()

    show('A', 'success', 0)
    show('B', 'success', 0)
    show('C', 'success', 0)

    const ids = toasts.value.map((t) => t.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(3)
  })

  it('追加順にリストに格納される / 按添加顺序存入列表', () => {
    const { toasts, show } = useToast()

    show('First', 'success', 0)
    show('Second', 'info', 0)

    expect(toasts.value[0].message).toBe('First')
    expect(toasts.value[1].message).toBe('Second')
  })

  it('空文字メッセージのトーストも追加できる / 空字符串消息的 toast 也能添加（边界値）', () => {
    const { toasts, show } = useToast()

    show('', 'info', 0)

    expect(toasts.value).toHaveLength(1)
    expect(toasts.value[0].message).toBe('')
  })

  it('Unicode・絵文字を含むメッセージも扱える / 包含 Unicode 和 emoji 的消息也能处理', () => {
    const { toasts, show } = useToast()

    show('入荷完了 ✅ 東京都渋谷区', 'success', 0)

    expect(toasts.value[0].message).toBe('入荷完了 ✅ 東京都渋谷区')
  })
})
