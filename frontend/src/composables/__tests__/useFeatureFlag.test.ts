/**
 * useFeatureFlag ユニットテスト / 功能开关 composable 单元测试
 *
 * フィーチャーフラグの状態クエリの検証
 * 验证功能开关状态查询
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// フィーチャーフラグAPIをモック / mock 功能开关 API
vi.mock('@/api/featureFlag', () => ({
  fetchFeatureFlagStatus: vi.fn().mockResolvedValue({
    data: { 'dark-mode': true, 'beta-feature': false },
  }),
}))

// Vue をモック / mock Vue
vi.mock('vue', async () => {
  const actual = await vi.importActual('vue')
  return {
    ...actual,
    onMounted: vi.fn(),
  }
})

import { useFeatureFlag } from '../useFeatureFlag'

describe('useFeatureFlag / フィーチャーフラグ', () => {
  it('isEnabled がデフォルト値を返す（フラグ未ロード時）/ isEnabled 返回默认值（标志未加载时）', () => {
    const { isEnabled } = useFeatureFlag('unknown-flag', false)
    // フラグがまだロードされていない場合、デフォルト値を返す / 标志尚未加载时返回默认值
    expect(typeof isEnabled()).toBe('boolean')
  })

  it('カスタムデフォルト値を使用する / 使用自定义默认值', () => {
    const { isEnabled } = useFeatureFlag('non-existent', true)
    // non-existent フラグは存在しないのでデフォルト値が返る / 不存在的标志返回默认值
    expect(isEnabled()).toBe(true)
  })

  it('refresh 関数を返す / 返回 refresh 函数', () => {
    const { refresh } = useFeatureFlag('test')
    expect(typeof refresh).toBe('function')
  })

  it('flags と loaded の ref を返す / 返回 flags 和 loaded ref', () => {
    const { flags, loaded } = useFeatureFlag('test')
    expect(flags).toBeDefined()
    expect(loaded).toBeDefined()
    expect(typeof loaded.value).toBe('boolean')
  })
})
