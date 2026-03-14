/**
 * フィーチャーフラグ composable / 功能开关 composable
 *
 * リアクティブな機能フラグ状態クエリを提供。
 * 提供响应式的功能开关状态查询。
 */

import { ref, onMounted } from 'vue'
import { fetchFeatureFlagStatus } from '@/api/featureFlag'

const flagMap = ref<Record<string, boolean>>({})
const loaded = ref(false)

async function loadFlags(tenantId?: string) {
  try {
    const res = await fetchFeatureFlagStatus(tenantId)
    flagMap.value = res.data
    loaded.value = true
  } catch {
    // サイレント処理、機能はデフォルトで無効 / 静默处理，功能默认不可用
    loaded.value = true
  }
}

/**
 * フィーチャーフラグを使用 / 使用功能开关
 *
 * @param key 機能識別子 / 功能标识
 * @param defaultValue デフォルト値 / 默认值
 */
export function useFeatureFlag(key: string, defaultValue = false) {
  if (!loaded.value) {
    loadFlags()
  }

  return {
    /** 機能が有効かどうか / 功能是否启用 */
    isEnabled: () => flagMap.value[key] ?? defaultValue,
    /** 強制リフレッシュ / 强制刷新 */
    refresh: loadFlags,
    /** すべてのフラグ / 所有标志 */
    flags: flagMap,
    /** ロード済みかどうか / 是否已加载 */
    loaded,
  }
}
