<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
</script>

<template>
  <div>
    <h2 style="margin: 0 0 24px">{{ t('billing.title') }}</h2>

    <el-row :gutter="16" style="margin-bottom: 24px">
      <el-col :span="8">
        <el-card shadow="hover">
          <div style="font-size: 14px; color: #909399">{{ t('billing.creditLimit') }}</div>
          <div style="font-size: 28px; font-weight: bold; margin-top: 8px">--</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <div style="font-size: 14px; color: #909399">{{ t('billing.currentBalance') }}</div>
          <div style="font-size: 28px; font-weight: bold; margin-top: 8px">--</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <div style="font-size: 14px; color: #909399">{{ t('billing.invoices') }}</div>
          <div style="font-size: 28px; font-weight: bold; margin-top: 8px">--</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card>
      <template #header>{{ t('billing.details') }}</template>
      <el-empty :description="t('common.noData')" />
    </el-card>
  </div>
</template>
