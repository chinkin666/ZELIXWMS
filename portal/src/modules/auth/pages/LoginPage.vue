<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { usePortalAuthStore } from '@/stores/auth'
import { http } from '@/api/http'

const { t, locale } = useI18n()
const router = useRouter()
const auth = usePortalAuthStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

async function handleLogin() {
  if (!email.value || !password.value) return
  loading.value = true
  errorMsg.value = ''

  try {
    const res: any = await http.post('/portal/auth/login', {
      email: email.value,
      password: password.value,
    })
    auth.setAuth(res.token, {
      id: res.user.id,
      email: res.user.email,
      displayName: res.user.displayName,
      clientId: res.user.clientId || '',
      clientName: res.user.clientName || '',
      subClientId: res.user.subClientId,
      role: res.user.role === 'client' ? 'client_admin' : 'client_subclient_user',
      language: (res.user.language as any) || locale.value,
    })
    router.push('/')
  } catch (e: any) {
    errorMsg.value = e.body?.message || e.message || 'Login failed'
  } finally {
    loading.value = false
  }
}

function switchLang(lang: string) {
  locale.value = lang
  localStorage.setItem('portal_lang', lang)
}
</script>

<template>
  <div style="display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f5f7fa">
    <el-card style="width: 400px">
      <div style="text-align: center; margin-bottom: 24px">
        <h1 style="font-size: 24px; margin: 0 0 8px">{{ t('common.appName') }}</h1>
        <p style="color: #909399; margin: 0">{{ t('auth.loginSubtitle') }}</p>
      </div>

      <el-form @submit.prevent="handleLogin">
        <el-form-item>
          <el-input v-model="email" :placeholder="t('auth.email')" size="large" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="password" :placeholder="t('auth.password')" type="password" size="large" show-password />
        </el-form-item>

        <el-alert v-if="errorMsg" :title="errorMsg" type="error" show-icon :closable="false" style="margin-bottom: 16px" />

        <el-form-item>
          <el-button type="primary" native-type="submit" :loading="loading" size="large" style="width: 100%">
            {{ t('auth.login') }}
          </el-button>
        </el-form-item>
      </el-form>

      <div style="display: flex; justify-content: center; gap: 12px; margin-top: 16px">
        <el-link @click="switchLang('zh')" :type="locale === 'zh' ? 'primary' : 'default'">中文</el-link>
        <el-link @click="switchLang('ja')" :type="locale === 'ja' ? 'primary' : 'default'">日本語</el-link>
        <el-link @click="switchLang('en')" :type="locale === 'en' ? 'primary' : 'default'">English</el-link>
      </div>
    </el-card>
  </div>
</template>
