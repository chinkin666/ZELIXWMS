<template>
  <div class="sagawa-settings">
    <PageHeader title="佐川急便 e飛伝Ⅲ 設定" :show-search="false">
      <template #actions>
        <Button variant="default" :disabled="saving" @click="handleSave">
          {{ saving ? '保存中...' : '保存' }}
        </Button>
      </template>
    </PageHeader>

    <!-- プラグイン状態 / 插件状态 -->
    <div class="plugin-status" :class="pluginRunning ? 'plugin-status--ok' : 'plugin-status--off'">
      <span class="plugin-status__dot" />
      <span>プラグイン: {{ pluginRunning ? '稼働中' : '未稼働' }}</span>
      <span v-if="pluginVersion" class="plugin-status__ver">v{{ pluginVersion }}</span>
    </div>

    <div v-if="loading" class="space-y-3 p-4">
      <Skeleton class="h-4 w-[250px]" />
      <Skeleton class="h-4 w-[200px]" />
      <Skeleton class="h-10 w-full" />
      <Skeleton class="h-10 w-full" />
      <Skeleton class="h-10 w-full" />
    </div>

    <template v-else>
      <!-- 基本設定 / 基本设定 -->
      <Card class="settings-card">
        <div class="card-header">
          <span class="card-title">基本設定</span>
          <span class="card-description">e飛伝Ⅲ CSV 出力時のデフォルト値を設定します</span>
        </div>
        <div class="card-body">
          <div class="o-form-group">
            <label>請求先コード</label>
            <Input v-model="form.billingCode" placeholder="半角英数字12文字" maxlength="12" style="max-width:250px" />
            <div class="field-hint">佐川急便と契約している請求先コード</div>
          </div>
          <div class="o-form-group">
            <label>デフォルト送り状種類</label>
            <Select v-model="form.defaultInvoiceType">
        <SelectTrigger class="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
        <SelectItem value="0">0: 元払い</SelectItem>
        <SelectItem value="1">1: 着払い</SelectItem>
        <SelectItem value="2">2: e-コレクト（代引き）</SelectItem>
        </SelectContent>
      </Select>
          </div>
          <div class="o-form-group">
            <label>デフォルト荷物サイズ</label>
            <Select v-model="form.defaultSize">
        <SelectTrigger class="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
        <SelectItem v-for="s in PACKAGE_SIZES" :key="s" :value="s">{{ s }}</SelectItem>
        </SelectContent>
      </Select>
          </div>
        </div>
      </Card>

      <!-- 使い方ガイド / 使用说明 -->
      <Card class="settings-card guide-card">
        <div class="card-header">
          <span class="card-title">使い方</span>
        </div>
        <div class="card-body">
          <div class="guide-steps">
            <div class="guide-step">
              <span class="guide-step__num">1</span>
              <div>
                <strong>CSV出力（WMS → e飛伝Ⅲ）</strong>
                <p>出荷管理 → 送り状未発行タブ → 注文を選択 →「配送業者データ出力」ボタン</p>
              </div>
            </div>
            <div class="guide-step">
              <span class="guide-step__num">2</span>
              <div>
                <strong>e飛伝Ⅲで送り状発行</strong>
                <p>出力したCSVをe飛伝Ⅲに取り込み、送り状を発行します</p>
              </div>
            </div>
            <div class="guide-step">
              <span class="guide-step__num">3</span>
              <div>
                <strong>追跡番号取込（e飛伝Ⅲ → WMS）</strong>
                <p>出荷管理 → 送り状未発行タブ →「送り状データ取込」ボタン → e飛伝Ⅲの実績CSVをアップロード</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from '@/composables/useToast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import PageHeader from '@/components/shared/PageHeader.vue'
import { fetchSagawaConfig } from '@/api/sagawa'
import { getApiBaseUrl } from '@/api/base'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const toast = useToast()
const loading = ref(false)
const saving = ref(false)
const pluginRunning = ref(false)
const pluginVersion = ref('')

const PACKAGE_SIZES = ['60', '80', '100', '120', '140', '160', '170']

const form = ref({
  billingCode: '',
  defaultInvoiceType: '0',
  defaultSize: '80',
})

async function checkPlugin() {
  try {
    // 佐川APIの利用可能性チェック（送り状種類取得で代用）/ 通过获取送状类型检查佐川API可用性
    const res = await fetch(`${getApiBaseUrl()}/sagawa/invoice-types`)
    if (res.ok) {
      pluginRunning.value = true
      pluginVersion.value = ''
    }
  } catch { pluginRunning.value = false }
}

async function loadConfig() {
  loading.value = true
  try {
    const config = await fetchSagawaConfig()
    form.value.billingCode = config.billingCode || ''
    form.value.defaultInvoiceType = config.defaultInvoiceType || '0'
    form.value.defaultSize = config.defaultSize || '80'
  } catch { /* 使用默认值 */ }
  finally { loading.value = false }
}

async function handleSave() {
  saving.value = true
  try {
    // 通过插件配置 API 保存 / プラグイン設定 API 経由で保存
    const res = await fetch(`${getApiBaseUrl()}/extensions/plugins/sagawa-express/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        billingCode: form.value.billingCode,
        defaultInvoiceType: form.value.defaultInvoiceType,
        defaultSize: form.value.defaultSize,
      }),
    })
    if (!res.ok) throw new Error('保存に失敗しました')
    toast.showSuccess('設定を保存しました')
  } catch (e: any) {
    toast.showError(e?.message || '保存に失敗しました')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await checkPlugin()
  await loadConfig()
})
</script>

<style scoped>
.sagawa-settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 20px 20px;
}
:deep(.o-control-panel) { margin-left: -20px; margin-right: -20px; }

/* 插件状态 / プラグイン状態 */
.plugin-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  font-size: 13px;
  border-left: 3px solid;
}
.plugin-status--ok { background: #f0f9eb; border-color: var(--o-success, #3D8B37); color: var(--o-success-text, #1B5E1B); }
.plugin-status--off { background: var(--o-gray-100); border-color: var(--o-gray-300); color: var(--o-gray-600); }
.plugin-status__dot {
  width: 8px; height: 8px; border-radius: 50%;
}
.plugin-status--ok .plugin-status__dot { background: var(--o-success); }
.plugin-status--off .plugin-status__dot { background: var(--o-gray-400); }
.plugin-status__ver { font-size: 11px; color: var(--o-gray-500); }

.loading-state { text-align: center; padding: 40px; color: var(--o-gray-500); }

/* 卡片 / カード */
.o-card {
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #e4e7ed);
  padding: 1.25rem;
}
.settings-card { max-width: 700px; }

.card-header {
  padding-bottom: 12px;
  border-bottom: 1px solid var(--o-border-color, #e4e7ed);
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.card-title { font-size: 1rem; font-weight: 600; color: var(--o-gray-800); }
.card-description { font-size: 0.8125rem; color: var(--o-gray-500); }

.card-body { display: flex; flex-direction: column; gap: 14px; }

.o-form-group { display: flex; flex-direction: column; gap: 4px; }
.form-label { font-size: 13px; font-weight: 500; color: var(--o-gray-700); }
.field-hint { font-size: 11px; color: var(--o-gray-400); }

/* 使い方ガイド / 使用指南 */
.guide-card { background: var(--o-gray-100, #f5f7fa); border-style: dashed; }
.guide-steps { display: flex; flex-direction: column; gap: 16px; }
.guide-step {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.guide-step__num {
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  background: var(--o-brand-primary, #0052A3);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  border-radius: 50%;
  flex-shrink: 0;
}
.guide-step strong { font-size: 14px; color: var(--o-gray-800); }
.guide-step p { margin: 4px 0 0; font-size: 13px; color: var(--o-gray-600); }
</style>
