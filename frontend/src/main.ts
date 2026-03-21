import { createApp } from 'vue'
import { createPinia } from 'pinia'
// 全局CSS保留，组件按需自动导入 / グローバルCSS維持、コンポーネントはオンデマンド自動インポート
import 'element-plus/dist/index.css'
import './style.css'
import App from './App.vue'
import router from './router'
import { useToast } from './composables/useToast'
import { useWmsUserStore } from './stores/wms/useWmsUserStore'

const pinia = createPinia()
const app = createApp(App)
app.use(pinia)
app.use(router)

// ストレージから認証状態を復元 / 从存储恢复认证状态
const userStore = useWmsUserStore()
userStore.loadFromStorage()

// グローバルエラーハンドラー / Global error handler
// 未処理のエラーをキャッチしてトースト通知を表示 / Catches unhandled errors and shows toast notification
app.config.errorHandler = (err, _instance, info) => {
  const error = err instanceof Error ? err : new Error(String(err))
  // エラーハンドリングはトースト通知で処理 / Error handling via toast notification

  const { showError } = useToast()
  showError(`予期しないエラー: ${error.message}`, 5000)
}

app.mount('#app')
