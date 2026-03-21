import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'path'

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    // @/* → src/* の解決 / Resolve @/* to src/*
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    pool: 'forks',
    // テストファイル間のモック干渉を防ぐため順次実行 / Run sequentially to prevent mock interference between test files
    fileParallelism: false,
    include: ['src/**/*.test.ts'],
    // テスト環境変数 / 测试环境变量
    env: {
      MONGODB_URI: 'mongodb://127.0.0.1:27017/test-zelix',
      NODE_ENV: 'test',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
    },
  },
})
