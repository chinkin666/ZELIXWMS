import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './style.css'
import App from './App.vue'
import router from './router'
import { useToast } from './composables/useToast'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(ElementPlus)

// グローバルエラーハンドラー / Global error handler
// 未処理のエラーをキャッチしてトースト通知を表示 / Catches unhandled errors and shows toast notification
app.config.errorHandler = (err, _instance, info) => {
  const error = err instanceof Error ? err : new Error(String(err))
  // エラーハンドリングはトースト通知で処理 / Error handling via toast notification

  const { showError } = useToast()
  showError(`予期しないエラー: ${error.message}`, 5000)
}

app.mount('#app')
