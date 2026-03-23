<script setup lang="ts">
/**
 * ログインページ / 登录页面
 *
 * 認証されていないユーザーを受け付けるフルページのログインフォーム。
 * 未认证用户的全屏登录表单。
 * shadcn-vue Card, Input, Button, Label でリビルド。
 * 用 shadcn-vue Card, Input, Button, Label 重建。
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { login as apiLogin } from '@/api/auth'
import { useAuth } from '@/stores/auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, AlertTriangle, Loader2 } from 'lucide-vue-next'

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
  <div class="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-600 to-blue-900 p-4">
    <Card class="w-full max-w-[400px] shadow-2xl dark:bg-[#1e1e2e] dark:border-[#424260]">
      <CardHeader class="text-center space-y-1 pb-2">
        <CardTitle class="text-[1.75rem] font-bold tracking-wider text-blue-900 dark:text-blue-300">
          ZELIX WMS
        </CardTitle>
        <CardDescription class="text-muted-foreground">
          倉庫管理システム
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form class="flex flex-col gap-5" @submit.prevent="handleLogin">
          <!-- メールアドレス / 邮箱 -->
          <div class="flex flex-col gap-1.5">
            <Label for="login-email" class="text-[13px] font-semibold dark:text-slate-300">
              メールアドレス
            </Label>
            <Input
              id="login-email"
              v-model="email"
              type="email"
              required
              autofocus
              autocomplete="username"
              placeholder="admin@example.com"
              class="dark:bg-[#2a2a3e] dark:border-[#424260] dark:text-gray-200 dark:placeholder:text-[#616182]"
            />
          </div>

          <!-- パスワード / 密码 -->
          <div class="flex flex-col gap-1.5">
            <Label for="login-password" class="text-[13px] font-semibold dark:text-slate-300">
              パスワード
            </Label>
            <div class="relative">
              <Input
                id="login-password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                required
                autocomplete="current-password"
                placeholder="&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;"
                class="pr-10 dark:bg-[#2a2a3e] dark:border-[#424260] dark:text-gray-200 dark:placeholder:text-[#616182]"
              />
              <Button
                type="button"
                variant="ghost"
                class="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                tabindex="-1"
                :title="showPassword ? 'パスワードを隠す' : 'パスワードを表示'"
                @click="showPassword = !showPassword"
              >
                <EyeOff v-if="showPassword" class="size-[18px]" />
                <Eye v-else class="size-[18px]" />
              </Button>
            </div>
          </div>

          <!-- エラー表示 / 错误提示 -->
          <div
            v-if="error"
            class="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-md text-red-700 text-[13px] leading-relaxed dark:bg-[#3b1010] dark:border-[#6b2020] dark:text-red-300"
          >
            <AlertTriangle class="size-3.5 shrink-0" />
            <span>{{ error }}</span>
          </div>

          <!-- 送信ボタン / 提交按钮 -->
          <Button
            type="submit"
            class="w-full mt-1"
            size="lg"
            :disabled="loading"
          >
            <Loader2 v-if="loading" class="size-4 animate-spin" />
            {{ loading ? 'ログイン中...' : 'ログイン' }}
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
