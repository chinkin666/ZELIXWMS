<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const currentStep = ref(0)
const steps = [
  'inbound.step1',
  'inbound.step2',
  'inbound.step3',
  'inbound.step4',
  'inbound.step5',
]
</script>

<template>
  <div>
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px">
      <el-button @click="$router.back()">{{ t('common.back') }}</el-button>
      <h2 style="margin: 0">{{ t('inbound.createOrder') }}</h2>
    </div>

    <!-- ステップ / 步骤条 -->
    <el-steps :active="currentStep" finish-status="success" style="margin-bottom: 32px">
      <el-step v-for="(step, i) in steps" :key="i" :title="t(step)" />
    </el-steps>

    <!-- ステップ内容（Phase 1 で実装）/ 步骤内容（Phase 1 实现） -->
    <el-card>
      <el-empty description="Phase 1 で実装予定 / Phase 1 待实现" />
    </el-card>

    <!-- ナビゲーション / 导航按钮 -->
    <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px">
      <el-button v-if="currentStep > 0" @click="currentStep--">{{ t('common.back') }}</el-button>
      <el-button v-if="currentStep < steps.length - 1" type="primary" @click="currentStep++">
        {{ t('common.confirm') }}
      </el-button>
      <el-button v-if="currentStep === steps.length - 1" type="primary">
        {{ t('common.submit') }}
      </el-button>
    </div>
  </div>
</template>
