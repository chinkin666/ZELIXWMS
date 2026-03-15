<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { usePortalAuthStore } from '@/stores/auth'

const { t } = useI18n()
const auth = usePortalAuthStore()
</script>

<template>
  <div>
    <h2 style="margin: 0 0 24px">{{ t('dashboard.welcome') }}{{ auth.user?.displayName ? `，${auth.user.displayName}` : '' }}</h2>

    <!-- KPI カード / KPI 卡片 -->
    <el-row :gutter="16" style="margin-bottom: 24px">
      <el-col :span="6">
        <el-card shadow="hover">
          <div style="font-size: 14px; color: #909399">{{ t('dashboard.inProgress') }}</div>
          <div style="font-size: 28px; font-weight: bold; margin-top: 8px">--</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div style="font-size: 14px; color: #909399">{{ t('dashboard.pending') }}</div>
          <div style="font-size: 28px; font-weight: bold; margin-top: 8px">--</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div style="font-size: 14px; color: #909399">{{ t('dashboard.monthlyFee') }}</div>
          <div style="font-size: 28px; font-weight: bold; margin-top: 8px">--</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div style="font-size: 14px; color: #909399">{{ t('dashboard.creditUsage') }}</div>
          <div style="font-size: 28px; font-weight: bold; margin-top: 8px">--</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 最近の入庫予約 / 最近入库预定 -->
    <el-card>
      <template #header>{{ t('dashboard.recentOrders') }}</template>
      <el-empty :description="t('common.noData')" />
    </el-card>
  </div>
</template>
