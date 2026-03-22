<template>
  <div class="gift-options">
    <ControlPanel :title="t('wms.shipment.gift.title', 'ギフト設定')" :show-search="false" />

    <div class="cards-section">
      <el-row :gutter="16">
        <!-- ラッピングカラー / 包装颜色 -->
        <el-col :span="8">
          <el-card shadow="hover">
            <template #header>
              <span style="font-weight: 600">🎁 ラッピング / 包装</span>
            </template>
            <el-table :data="wrappingItems" v-loading="loading" stripe size="small">
              <el-table-column prop="name" label="名称" min-width="120" />
              <el-table-column prop="color" label="カラー / 颜色" width="100">
                <template #default="{ row }">
                  <div v-if="row.color" style="display: flex; align-items: center; gap: 6px">
                    <span :style="{ display: 'inline-block', width: '16px', height: '16px', borderRadius: '3px', backgroundColor: row.color, border: '1px solid #ddd' }" />
                    {{ row.color }}
                  </div>
                  <span v-else>-</span>
                </template>
              </el-table-column>
              <el-table-column prop="price" label="料金 / 价格" width="100" align="right">
                <template #default="{ row }">{{ row.price != null ? `¥${row.price}` : '-' }}</template>
              </el-table-column>
            </el-table>
          </el-card>
        </el-col>

        <!-- のし / 熨斗 -->
        <el-col :span="8">
          <el-card shadow="hover">
            <template #header>
              <span style="font-weight: 600">📜 のし / 熨斗</span>
            </template>
            <el-table :data="noshiItems" v-loading="loading" stripe size="small">
              <el-table-column prop="name" label="名称" min-width="140" />
              <el-table-column prop="price" label="料金 / 价格" width="100" align="right">
                <template #default="{ row }">{{ row.price != null ? `¥${row.price}` : '-' }}</template>
              </el-table-column>
            </el-table>
          </el-card>
        </el-col>

        <!-- メッセージカード / 贺卡 -->
        <el-col :span="8">
          <el-card shadow="hover">
            <template #header>
              <span style="font-weight: 600">💌 メッセージカード / 贺卡</span>
            </template>
            <el-table :data="messageCardItems" v-loading="loading" stripe size="small">
              <el-table-column prop="name" label="名称" min-width="140" />
              <el-table-column prop="price" label="料金 / 价格" width="100" align="right">
                <template #default="{ row }">{{ row.price != null ? `¥${row.price}` : '-' }}</template>
              </el-table-column>
            </el-table>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 全オプション一覧 / 全选项列表 -->
    <div class="table-section">
      <h3 style="margin: 8px 0">全ギフトオプション / 全部礼品选项</h3>
      <el-table :data="items" v-loading="loading" stripe border style="width: 100%">
        <el-table-column prop="type" :label="t('wms.shipment.gift.type', '種別')" width="140">
          <template #default="{ row }">
            <el-tag :type="typeTagType(row.type)" size="small">{{ typeLabel(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="name" :label="t('wms.shipment.gift.name', '名称')" min-width="200" />
        <el-table-column prop="price" :label="t('wms.shipment.gift.price', '料金')" width="120" align="right">
          <template #default="{ row }">{{ row.price != null ? `¥${row.price}` : '-' }}</template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
// ギフト設定ページ / 礼品设置页面
import { ref, computed, onMounted } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useToast } from '@/composables/useToast'
import { http } from '@/api/http'
import ControlPanel from '@/components/odoo/ControlPanel.vue'

const { t } = useI18n()
const { show: showToast } = useToast()
const items = ref<any[]>([])
const loading = ref(false)

// タイプ別フィルタ / 按类型过滤
const wrappingItems = computed(() => items.value.filter((i) => i.type === 'wrapping'))
const noshiItems = computed(() => items.value.filter((i) => i.type === 'noshi'))
const messageCardItems = computed(() => items.value.filter((i) => i.type === 'message_card'))

// タイプ表示 / 类型显示
const typeTagType = (type: string): '' | 'success' | 'warning' | 'danger' | 'info' => {
  const map: Record<string, '' | 'success' | 'warning' | 'danger' | 'info'> = {
    wrapping: '',
    noshi: 'success',
    message_card: 'warning',
  }
  return map[type] ?? 'info'
}

const typeLabel = (type: string): string => {
  const map: Record<string, string> = {
    wrapping: 'ラッピング / 包装',
    noshi: 'のし / 熨斗',
    message_card: 'メッセージカード / 贺卡',
  }
  return map[type] ?? type
}

// データ読み込み / 数据加载
async function load() {
  loading.value = true
  try {
    const json = await http.get<any>('/gift-options')
    items.value = Array.isArray(json) ? json : (json.items ?? [])
  } catch (e) {
    console.error(e)
    showToast(t('wms.shipment.gift.loadError', 'ギフトオプションの読み込みに失敗しました'), 'danger')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.gift-options {
  padding: 0 20px 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}
.cards-section {
  flex-shrink: 0;
}
.table-section {
  flex: 1;
  overflow: auto;
}
</style>
