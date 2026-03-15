<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
      <h2 style="margin: 0">{{ t('products.title') }}</h2>
      <div style="display: flex; gap: 8px">
        <el-button>{{ t('products.importProducts') }}</el-button>
        <el-button type="primary">{{ t('products.addProduct') }}</el-button>
      </div>
    </div>
    <el-card>
      <el-empty :description="t('common.noData')" />
    </el-card>
  </div>
</template>
