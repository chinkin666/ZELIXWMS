import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
// Element Plus 按需自动导入 / Element Plus オンデマンド自動インポート
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
    // Element Plus 组件和API按需自动导入 / Element Plus コンポーネントとAPIのオンデマンド自動インポート
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-vue': ['vue', 'vue-router', 'pinia'],

          'vendor-charts': ['chart.js'],
          'vendor-pdf': ['pdf-lib'],
          'vendor-xlsx': ['xlsx'],
          'vendor-barcode': ['bwip-js'],
          'vendor-pdfmake': ['pdfmake'],
          'vendor-draggable': ['vuedraggable'],
        },
      },
    },
  },
  server: {
    host: 'localhost',
    port: 4001,
    proxy: {
      // 代理本地打印桥接服务，避免 CORS 问题
      '/api/print-bridge': {
        target: 'http://127.0.0.1:8765',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/print-bridge/, ''),
      },
    },
  },
})
