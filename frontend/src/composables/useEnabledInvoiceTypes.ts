/**
 * B2 Cloud 送り状種類の有効/無効設定を取得する composable
 * B2 Cloud 送り状種類の有効/無効設定を取得するコンポーザブル
 *
 * carrier-automation 設定から serviceTypeMapping を読み取り、
 * 無効化された送り状種類をフィルタリングするために使用する。
 */
import { ref, computed } from 'vue'
import { fetchCarrierAutomationConfig } from '@/api/carrierAutomation'

// モジュールレベルキャッシュ（全コンポーネント共有）/ 模块级缓存（全组件共享）
const disabledTypes = ref<Set<string>>(new Set())
let loaded = false
let loading = false

async function loadConfig() {
  if (loaded || loading) return
  loading = true
  try {
    const config = await fetchCarrierAutomationConfig('yamato-b2')
    const mapping = config.yamatoB2?.serviceTypeMapping
    if (mapping) {
      const disabled = new Set<string>()
      for (const [key, value] of Object.entries(mapping)) {
        if (typeof value === 'object' && value && value.enabled === false) {
          disabled.add(key)
        }
      }
      disabledTypes.value = disabled
    }
    loaded = true
  } catch {
    // 設定が取得できない場合は全て有効として扱う / 取得失敗時は全て有効とする
  } finally {
    loading = false
  }
}

/**
 * 送り状種類の有効/無効フィルタリング機能を提供
 * 送り状種類の有効/無効フィルタリング機能を提供する
 */
export function useEnabledInvoiceTypes() {
  // 初回呼び出し時にロード / 初回调用时加载
  loadConfig()

  const isInvoiceTypeEnabled = (invoiceType: string): boolean => {
    return !disabledTypes.value.has(invoiceType)
  }

  const filterEnabledOptions = <T extends { value: string }>(options: T[]): T[] => {
    return options.filter(opt => isInvoiceTypeEnabled(opt.value))
  }

  /** キャッシュを無効化して再読み込み / 缓存を无效化して再读み込み */
  const reload = () => {
    loaded = false
    return loadConfig()
  }

  return {
    disabledTypes: computed(() => disabledTypes.value),
    isInvoiceTypeEnabled,
    filterEnabledOptions,
    reload,
  }
}
