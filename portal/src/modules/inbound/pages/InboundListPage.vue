<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
      <h2 style="margin: 0">{{ t('inbound.title') }}</h2>
      <el-button type="primary" @click="$router.push('/inbound/new')">{{ t('inbound.createOrder') }}</el-button>
    </div>
    <el-card>
      <el-empty :description="t('common.noData')" />
    </el-card>
  </div>
</template>
