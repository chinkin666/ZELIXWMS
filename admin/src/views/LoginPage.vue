<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { http } from '@/api/http'

const router = useRouter()
const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

async function handleLogin() {
  if (!email.value || !password.value) return
  loading.value = true
  errorMsg.value = ''
  try {
    const res: any = await http.post('/auth/login', { email: email.value, password: password.value })
    localStorage.setItem('admin_token', res.token)
    router.push('/')
  } catch (e: any) {
    errorMsg.value = e.body?.message || e.message || 'Login failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div style="display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f0f2f5">
    <el-card style="width: 380px">
      <h2 style="text-align: center; margin: 0 0 24px">ZELIX Admin</h2>
      <el-form @submit.prevent="handleLogin">
        <el-form-item><el-input v-model="email" placeholder="Email" size="large" /></el-form-item>
        <el-form-item><el-input v-model="password" placeholder="Password" type="password" size="large" show-password /></el-form-item>
        <el-alert v-if="errorMsg" :title="errorMsg" type="error" :closable="false" style="margin-bottom: 16px" />
        <el-form-item><el-button type="primary" native-type="submit" :loading="loading" size="large" style="width: 100%">Login</el-button></el-form-item>
      </el-form>
    </el-card>
  </div>
</template>
