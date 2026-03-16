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
    <el-aside width="220px" style="background: #0d1117">
      <div style="padding: 20px; color: #fff; font-size: 18px; font-weight: bold; border-bottom: 1px solid #21262d">
        ZELIX Admin
      </div>
      <el-menu
        :default-active="$route.path"
        background-color="#0d1117"
        text-color="#8b949e"
        active-text-color="#fff"
        router
        style="border-right: none"
      >
        <el-menu-item index="/">
          <span>Dashboard</span>
        </el-menu-item>

        <el-sub-menu index="client-group">
          <template #title><span>客户管理</span></template>
          <el-menu-item index="/clients">客户列表</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="order-group">
          <template #title><span>预定管理</span></template>
          <el-menu-item index="/orders">全部预定</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="report-group">
          <template #title><span>报告</span></template>
          <el-menu-item index="/kpi">KPI</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header style="display: flex; align-items: center; justify-content: flex-end; border-bottom: 1px solid #eee; gap: 12px">
        <span style="font-size: 13px; color: #909399">Platform Admin</span>
        <el-button text @click="logout">退出</el-button>
      </el-header>
      <el-main style="background: #f5f7fa">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>
