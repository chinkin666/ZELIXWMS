<script setup lang="ts">
/**
 * ログインページ / 登录页面
 *
 * 認証されていないユーザーを受け付けるフルページのログインフォーム。
 * 未认证用户的全屏登录表单。
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { login as apiLogin } from '@/api/auth'
import { useAuth } from '@/stores/auth'

const router = useRouter()
const { setAuth } = useAuth()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  error.value = ''

  if (!email.value.trim() || !password.value.trim()) {
    error.value = 'メールアドレスとパスワードを入力してください / 请输入邮箱和密码'
    return
  }

  loading.value = true
  try {
    const result = await apiLogin(email.value.trim(), password.value)
    setAuth(result.token, {
      id: result.user._id,
      email: result.user.email,
      displayName: result.user.displayName,
      role: result.user.role,
      warehouseIds: result.user.warehouseIds,
      clientId: result.user.clientId,
    })
    router.push('/')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'ログインに失敗しました / 登录失败'
    error.value = message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <!-- ロゴ / Logo -->
      <div class="login-header">
        <h1 class="login-title">ZELIX WMS</h1>
        <p class="login-subtitle">倉庫管理システム</p>
      </div>

      <!-- フォーム / 表单 -->
      <form class="login-form" @submit.prevent="handleLogin">
        <div class="login-field">
          <label for="login-email">メールアドレス</label>
          <input
            id="login-email"
            v-model="email"
            type="email"
            required
            autofocus
            autocomplete="username"
            placeholder="admin@example.com"
          />
        </div>

        <div class="login-field">
          <label for="login-password">パスワード</label>
          <div class="login-password-wrapper">
            <input
              id="login-password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              required
              autocomplete="current-password"
              placeholder="••••••••"
            />
            <button
              type="button"
              class="login-password-toggle"
              tabindex="-1"
              :title="showPassword ? 'パスワードを隠す' : 'パスワードを表示'"
              @click="showPassword = !showPassword"
            >
              <!-- 目のアイコン / Eye icon -->
              <svg v-if="!showPassword" width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
                <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
              </svg>
              <svg v-else width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/>
                <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/>
                <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- エラー表示 / 错误提示 -->
        <div v-if="error" class="login-error">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
          </svg>
          <span>{{ error }}</span>
        </div>

        <!-- 送信ボタン / 提交按钮 -->
        <button type="submit" class="login-submit" :disabled="loading">
          <span v-if="loading" class="login-spinner" />
          {{ loading ? 'ログイン中...' : 'ログイン' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #1a237e 0%, #283593 50%, #3949ab 100%);
  padding: 1rem;
}

.login-card {
  width: 100%;
  max-width: 400px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  padding: 2.5rem 2rem 2rem;
}

.login-header {
  text-align: center;
  margin-bottom: 2rem;
}

.login-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1a237e;
  margin: 0 0 0.25rem;
  letter-spacing: 0.05em;
}

.login-subtitle {
  font-size: 0.875rem;
  color: #78909c;
  margin: 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.login-field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.login-field label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #455a64;
}

.login-field input {
  width: 100%;
  padding: 0.625rem 0.75rem;
  font-size: 0.9375rem;
  border: 1px solid #cfd8dc;
  border-radius: 6px;
  background: #fafafa;
  color: #263238;
  transition: border-color 0.2s, box-shadow 0.2s;
  outline: none;
  box-sizing: border-box;
}

.login-field input:focus {
  border-color: #3949ab;
  box-shadow: 0 0 0 3px rgba(57, 73, 171, 0.15);
  background: #fff;
}

.login-field input::placeholder {
  color: #b0bec5;
}

.login-password-wrapper {
  position: relative;
}

.login-password-wrapper input {
  padding-right: 2.5rem;
}

.login-password-toggle {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: #90a4ae;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s;
}

.login-password-toggle:hover {
  color: #455a64;
}

.login-error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #b91c1c;
  font-size: 0.8125rem;
  line-height: 1.4;
}

.login-submit {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #fff;
  background: #3949ab;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s, opacity 0.2s;
  margin-top: 0.25rem;
}

.login-submit:hover:not(:disabled) {
  background: #283593;
}

.login-submit:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.login-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ダークモード対応 / 暗色模式适配 */
[data-theme="dark"] .login-card {
  background: #1e1e2e;
}

[data-theme="dark"] .login-title {
  color: #8c9eff;
}

[data-theme="dark"] .login-subtitle {
  color: #9e9e9e;
}

[data-theme="dark"] .login-field label {
  color: #b0bec5;
}

[data-theme="dark"] .login-field input {
  background: #2a2a3e;
  border-color: #424260;
  color: #e0e0e0;
}

[data-theme="dark"] .login-field input:focus {
  border-color: #7986cb;
  box-shadow: 0 0 0 3px rgba(121, 134, 203, 0.2);
  background: #2e2e42;
}

[data-theme="dark"] .login-field input::placeholder {
  color: #616182;
}

[data-theme="dark"] .login-password-toggle {
  color: #616182;
}

[data-theme="dark"] .login-password-toggle:hover {
  color: #b0bec5;
}

[data-theme="dark"] .login-error {
  background: #3b1010;
  border-color: #6b2020;
  color: #fca5a5;
}
</style>
