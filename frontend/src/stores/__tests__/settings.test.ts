/**
 * settings store ユニットテスト / 设置 store 单元测试
 *
 * useSettingsStore の検証
 * 验证 useSettingsStore
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSettingsStore } from '../settings'

describe('useSettingsStore / 設定ストア', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('デフォルト値で初期化される / 使用默认值初始化', () => {
    const store = useSettingsStore()
    expect(store.orderSearchStyle).toBe('modern')
  })

  it('setOrderSearchStyle で検索スタイルを変更する / setOrderSearchStyle 更改搜索样式', () => {
    const store = useSettingsStore()
    store.setOrderSearchStyle('classic')
    expect(store.orderSearchStyle).toBe('classic')
  })

  it('設定をlocalStorageに保存する / 将设置保存到 localStorage', () => {
    const store = useSettingsStore()
    store.setOrderSearchStyle('classic')
    const stored = JSON.parse(localStorage.getItem('app:settings') || '{}')
    expect(stored.orderSearchStyle).toBe('classic')
  })

  it('localStorageから設定を復元する / 从 localStorage 恢复设置', () => {
    localStorage.setItem('app:settings', JSON.stringify({ orderSearchStyle: 'classic' }))
    const store = useSettingsStore()
    store.loadSettings()
    expect(store.orderSearchStyle).toBe('classic')
  })

  it('不正なlocalStorageデータでもエラーにならない / 不正确的 localStorage 数据不会报错', () => {
    localStorage.setItem('app:settings', 'invalid-json{')
    expect(() => {
      const store = useSettingsStore()
      store.loadSettings()
    }).not.toThrow()
  })
})
