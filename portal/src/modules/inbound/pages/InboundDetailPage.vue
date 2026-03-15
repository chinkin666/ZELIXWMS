<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const { t } = useI18n()
</script>

<template>
  <div>
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px">
      <el-button @click="$router.back()">{{ t('common.back') }}</el-button>
      <h2 style="margin: 0">{{ t('inbound.title') }} #{{ route.params.id }}</h2>
    </div>
    <el-card>
      <el-empty description="Phase 1 で実装予定 / Phase 1 待实现" />
    </el-card>
  </div>
</template>
