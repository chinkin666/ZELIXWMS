<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function logout() {
  localStorage.removeItem('admin_token')
  router.push('/login')
}
</script>

<template>
  <el-container style="min-height: 100vh">
    <el-aside width="200px" style="background: #0d1117">
      <div style="padding: 20px; color: #fff; font-size: 16px; font-weight: bold">ZELIX Admin</div>
      <el-menu :default-active="$route.path" background-color="#0d1117" text-color="#8b949e" active-text-color="#fff" router>
        <el-menu-item index="/">Dashboard</el-menu-item>
        <el-menu-item index="/clients">客户管理</el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header style="display: flex; align-items: center; justify-content: flex-end; border-bottom: 1px solid #eee">
        <el-button text @click="logout">退出</el-button>
      </el-header>
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>
