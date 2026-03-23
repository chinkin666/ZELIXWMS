/**
 * useKeyboardShortcuts ユニットテスト / 键盘快捷键 composable 单元测试
 *
 * ショートカットの登録とイベントハンドリングの検証
 * 验证快捷键注册和事件处理
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Vue ライフサイクルフックをモック / mock Vue 生命周期钩子
const mountedCallbacks: Function[] = []
const unmountCallbacks: Function[] = []

vi.mock('vue', () => ({
  onMounted: (cb: Function) => { mountedCallbacks.push(cb) },
  onBeforeUnmount: (cb: Function) => { unmountCallbacks.push(cb) },
}))

import { useKeyboardShortcuts } from '../useKeyboardShortcuts'
import type { Shortcut } from '../useKeyboardShortcuts'

describe('useKeyboardShortcuts / キーボードショートカット', () => {
  beforeEach(() => {
    mountedCallbacks.length = 0
    unmountCallbacks.length = 0
    vi.clearAllMocks()
  })

  it('ショートカットリストを返す / 返回快捷键列表', () => {
    const shortcuts: Shortcut[] = [
      { key: 'n', alt: true, description: '新規作成', handler: vi.fn() },
    ]
    const result = useKeyboardShortcuts(shortcuts)
    expect(result.shortcuts).toBe(shortcuts)
  })

  it('マウント時にイベントリスナーを登録する / 挂载时注册事件监听器', () => {
    const addSpy = vi.spyOn(document, 'addEventListener')
    const shortcuts: Shortcut[] = [
      { key: 's', ctrl: true, description: '保存', handler: vi.fn() },
    ]
    useKeyboardShortcuts(shortcuts)
    // onMountedのコールバックを実行 / 执行 onMounted 回调
    mountedCallbacks.forEach(cb => cb())
    expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    addSpy.mockRestore()
  })

  it('アンマウント時にイベントリスナーを解除する / 卸载时移除事件监听器', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener')
    const shortcuts: Shortcut[] = [
      { key: 's', ctrl: true, description: '保存', handler: vi.fn() },
    ]
    useKeyboardShortcuts(shortcuts)
    unmountCallbacks.forEach(cb => cb())
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    removeSpy.mockRestore()
  })

  it('一致するショートカットのハンドラーを呼び出す / 调用匹配的快捷键处理器', () => {
    const handler = vi.fn()
    const shortcuts: Shortcut[] = [
      { key: 'n', alt: true, description: '新規', handler },
    ]
    useKeyboardShortcuts(shortcuts)
    mountedCallbacks.forEach(cb => cb())

    const event = new KeyboardEvent('keydown', { key: 'n', altKey: true })
    Object.defineProperty(event, 'target', { value: document.body })
    document.dispatchEvent(event)
    expect(handler).toHaveBeenCalled()
  })

  it('INPUT要素内ではalt/ctrlなしのショートカットを無視する / INPUT 元素内忽略无 alt/ctrl 的快捷键', () => {
    const handler = vi.fn()
    const shortcuts: Shortcut[] = [
      { key: 'n', description: '新規', handler },
    ]
    useKeyboardShortcuts(shortcuts)
    mountedCallbacks.forEach(cb => cb())

    const input = document.createElement('input')
    const event = new KeyboardEvent('keydown', { key: 'n' })
    Object.defineProperty(event, 'target', { value: input })
    document.dispatchEvent(event)
    expect(handler).not.toHaveBeenCalled()
  })
})
