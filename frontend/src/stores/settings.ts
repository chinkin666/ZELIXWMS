import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type OrderSearchStyle = 'classic' | 'modern'

const STORAGE_KEY = 'app:settings'

interface AppSettings {
  orderSearchStyle: OrderSearchStyle
}

const defaultSettings: AppSettings = {
  orderSearchStyle: 'modern',
}

export const useSettingsStore = defineStore('settings', () => {
  const orderSearchStyle = ref<OrderSearchStyle>(defaultSettings.orderSearchStyle)

  // localStorageから設定を読み込む / 从 localStorage 加载设置
  const loadSettings = () => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AppSettings>
        if (parsed.orderSearchStyle) {
          orderSearchStyle.value = parsed.orderSearchStyle
        }
      }
    } catch (e) {
      // 設定読み込み失敗 / Failed to load settings
    }
  }

  // 設定をlocalStorageに保存する / 保存设置到 localStorage
  const saveSettings = () => {
    if (typeof window === 'undefined') return
    try {
      const settings: AppSettings = {
        orderSearchStyle: orderSearchStyle.value,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch (e) {
      // 設定保存失敗 / Failed to save settings
    }
  }

  // 検索ボックスのスタイルを設定する / 设置搜索框样式
  const setOrderSearchStyle = (style: OrderSearchStyle) => {
    orderSearchStyle.value = style
    saveSettings()
  }

  // 初期化時に設定を読み込む / 初始化时加载设置
  loadSettings()

  // 変更を監視して自動保存 / 监听变化自动保存
  watch(orderSearchStyle, () => {
    saveSettings()
  })

  return {
    orderSearchStyle,
    setOrderSearchStyle,
    loadSettings,
  }
})
