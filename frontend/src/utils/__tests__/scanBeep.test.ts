/**
 * scanBeep ユニットテスト / 扫描提示音单元测试
 *
 * beepSuccess, beepError, beepComplete の検証
 * 验证 beepSuccess, beepError, beepComplete
 *
 * Web Audio API はモジュールレベルでキャッシュされるため、
 * 各テストで vi.resetModules() + dynamic import を使用する。
 * Web Audio API 在模块级别缓存，因此每个测试使用 vi.resetModules() + 动态导入。
 */
import { describe, it, expect, vi } from 'vitest'

function setupMockAudioContext() {
  const createOscillator = vi.fn(() => ({
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    type: '',
    frequency: { value: 0 },
  }))

  const createGain = vi.fn(() => ({
    connect: vi.fn(),
    gain: { value: 0, exponentialRampToValueAtTime: vi.fn() },
  }))

  const mockCtx = { createOscillator, createGain, destination: {}, currentTime: 0 }

  // Vitest 4.x では class/function を使用してコンストラクタをモックする必要がある
  // Vitest 4.x 需要使用 class/function 来 mock 构造函数
  ;(window as any).AudioContext = function AudioContext() {
    return mockCtx
  }
  ;(window as any).webkitAudioContext = function webkitAudioContext() {
    return mockCtx
  }

  return mockCtx
}

describe('beepSuccess / 成功ビープ', () => {
  it('AudioContext のオシレーターを作成して再生する / 创建 AudioContext 振荡器并播放', async () => {
    vi.resetModules()
    const mockCtx = setupMockAudioContext()

    const { beepSuccess } = await import('../scanBeep')
    beepSuccess()
    expect(mockCtx.createOscillator).toHaveBeenCalled()
    expect(mockCtx.createGain).toHaveBeenCalled()
  })

  it('例外を投げずに実行できる / 不抛出异常', async () => {
    vi.resetModules()
    setupMockAudioContext()

    const { beepSuccess } = await import('../scanBeep')
    expect(() => beepSuccess()).not.toThrow()
  })
})

describe('beepError / エラービープ', () => {
  it('2回のビープ音を生成する / 生成两声提示音', async () => {
    vi.resetModules()
    const mockCtx = setupMockAudioContext()

    const { beepError } = await import('../scanBeep')
    beepError()
    expect(mockCtx.createOscillator).toHaveBeenCalledTimes(2)
  })
})

describe('beepComplete / 完了チャイム', () => {
  it('3音のチャイムを生成する / 生成三音提示', async () => {
    vi.resetModules()
    const mockCtx = setupMockAudioContext()

    const { beepComplete } = await import('../scanBeep')
    beepComplete()
    expect(mockCtx.createOscillator).toHaveBeenCalledTimes(3)
  })
})

describe('AudioContext 利用不可時 / AudioContext不可用时', () => {
  it('AudioContext が未定義でもエラーを投げない / AudioContext未定义时不抛出错误', async () => {
    vi.resetModules()
    ;(window as any).AudioContext = undefined
    ;(window as any).webkitAudioContext = undefined

    const { beepSuccess } = await import('../scanBeep')
    expect(() => beepSuccess()).not.toThrow()
  })
})
