<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getOrder, acknowledgeVariance, uploadFbaLabel, type PassthroughOrder } from '@/api/passthrough'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const order = ref<PassthroughOrder | null>(null)
const loading = ref(false)

// 进度步骤 / 進捗ステップ
const stepMap: Record<string, number> = {
  confirmed: 0,
  arrived: 1,
  processing: 2,
  awaiting_label: 2,
  ready_to_ship: 3,
  shipped: 4,
  done: 5,
}
const currentStep = computed(() => order.value ? (stepMap[order.value.status] ?? 0) : 0)

// 费用汇总 / 費用集計
const estimatedTotal = computed(() =>
  order.value?.serviceOptions?.reduce((s, o) => s + (o.estimatedCost || 0), 0) || 0,
)
const confirmedTotal = computed(() =>
  order.value?.serviceOptions
    ?.filter((o) => o.status === 'completed')
    .reduce((s, o) => s + (o.actualCost || o.estimatedCost || 0), 0) || 0,
)

async function load() {
  loading.value = true
  try {
    order.value = await getOrder(route.params.id as string)
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function handleAckVariance() {
  if (!order.value) return
  try {
    await acknowledgeVariance(order.value._id)
    await load()
  } catch (e) {
    console.error(e)
  }
}

// FBA标上传 / FBAラベルアップロード
const labelFile = ref<File | null>(null)
const labelFormat = ref('6up')
const uploading = ref(false)

async function handleUploadLabel() {
  if (!order.value || !labelFile.value) return
  uploading.value = true
  try {
    await uploadFbaLabel(order.value._id, labelFile.value, labelFormat.value)
    await load()
    labelFile.value = null
  } catch (e) {
    console.error(e)
  } finally {
    uploading.value = false
  }
}

function onFileChange(uploadFile: any) {
  labelFile.value = uploadFile.raw
}

onMounted(load)
</script>

<template>
  <div v-loading="loading">
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px">
      <el-button @click="router.back()">{{ t('common.back') }}</el-button>
      <h2 style="margin: 0">{{ order?.orderNumber || '...' }}</h2>
      <el-tag v-if="order" :type="order.status === 'shipped' ? 'success' : order.status === 'awaiting_label' ? 'danger' : ''">
        {{ order.status }}
      </el-tag>
    </div>

    <template v-if="order">
      <!-- 进度条 / 進捗 -->
      <el-steps :active="currentStep" finish-status="success" style="margin-bottom: 32px">
        <el-step title="待到货" />
        <el-step title="受付" />
        <el-step title="作业" />
        <el-step title="待出货" />
        <el-step title="已出货" />
      </el-steps>

      <el-row :gutter="16">
        <!-- 左：基本信息 + 差异 / 左：基本情報 + 差異 -->
        <el-col :span="14">
          <!-- 基本信息 / 基本情報 -->
          <el-card style="margin-bottom: 16px">
            <template #header>基本信息</template>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="目的地">{{ (order.destinationType || '').toUpperCase() }}</el-descriptions-item>
              <el-descriptions-item label="FC">{{ order.fbaInfo?.destinationFc || '--' }}</el-descriptions-item>
              <el-descriptions-item label="箱数">{{ order.actualBoxCount || order.totalBoxCount || '--' }}</el-descriptions-item>
              <el-descriptions-item label="预定到达">{{ order.expectedDate ? new Date(order.expectedDate).toLocaleDateString() : '--' }}</el-descriptions-item>
              <el-descriptions-item label="实际到达">{{ order.arrivedAt ? new Date(order.arrivedAt).toLocaleDateString() : '--' }}</el-descriptions-item>
              <el-descriptions-item label="出货时间">{{ order.shippedAt ? new Date(order.shippedAt).toLocaleDateString() : '--' }}</el-descriptions-item>
            </el-descriptions>
          </el-card>

          <!-- 差异明细 / 差異明細 -->
          <el-card v-if="order.varianceReport?.hasVariance" style="margin-bottom: 16px">
            <template #header>
              <div style="display: flex; justify-content: space-between; align-items: center">
                <span style="color: #e6a23c">{{ t('inbound.variance') }}</span>
                <el-button
                  v-if="!order.varianceReport?.clientViewedAt"
                  type="warning"
                  size="small"
                  @click="handleAckVariance"
                >
                  我已确认
                </el-button>
                <el-tag v-else type="success" size="small">已确认</el-tag>
              </div>
            </template>
            <el-table :data="order.varianceReport?.details || []" size="small">
              <el-table-column prop="sku" label="SKU" width="120" />
              <el-table-column prop="productName" label="商品" />
              <el-table-column prop="expectedQuantity" label="预定" width="80" />
              <el-table-column prop="actualQuantity" label="实收" width="80" />
              <el-table-column label="差异" width="80">
                <template #default="{ row }">
                  <span :style="{ color: row.variance !== 0 ? '#f56c6c' : '#67c23a' }">
                    {{ row.variance > 0 ? '+' : '' }}{{ row.variance }}
                  </span>
                </template>
              </el-table-column>
            </el-table>
          </el-card>

          <!-- FBA 标状态 / FBAラベル状態 -->
          <el-card v-if="order.destinationType === 'fba' || order.destinationType === 'rsl'" style="margin-bottom: 16px">
            <template #header>FBA/RSL ラベル</template>
            <div v-if="order.fbaInfo?.labelSplitStatus === 'split'">
              <el-tag type="success">已拆分 ({{ order.fbaInfo?.splitLabels?.length || 0 }} 张)</el-tag>
            </div>
            <div v-else>
              <el-tag type="danger" style="margin-bottom: 12px">未上传</el-tag>
              <div style="display: flex; gap: 8px; align-items: center">
                <el-upload :auto-upload="false" :show-file-list="false" accept=".pdf" @change="onFileChange">
                  <el-button>选择 PDF</el-button>
                </el-upload>
                <span v-if="labelFile" style="font-size: 12px; color: #909399">{{ labelFile.name }}</span>
                <el-select v-model="labelFormat" style="width: 100px" size="small">
                  <el-option label="6-up" value="6up" />
                  <el-option label="4-up" value="4up" />
                  <el-option label="单张" value="single" />
                </el-select>
                <el-button type="primary" :loading="uploading" :disabled="!labelFile" @click="handleUploadLabel">
                  上传并拆分
                </el-button>
              </div>
            </div>
          </el-card>

          <!-- 追踪号 / 追跡番号 -->
          <el-card v-if="order.trackingNumbers?.length">
            <template #header>追踪号</template>
            <el-table :data="order.trackingNumbers" size="small">
              <el-table-column prop="boxNumber" label="箱号" width="100" />
              <el-table-column prop="trackingNumber" label="追踪号" />
              <el-table-column prop="carrier" label="承运商" width="100" />
            </el-table>
          </el-card>
        </el-col>

        <!-- 右：作业进度 + 费用 / 右：作業進捗 + 費用 -->
        <el-col :span="10">
          <!-- 作业进度 / 作業進捗 -->
          <el-card style="margin-bottom: 16px">
            <template #header>作业进度</template>
            <div v-if="!order.serviceOptions?.length">
              <el-empty description="无作业选项" :image-size="60" />
            </div>
            <div v-else>
              <div
                v-for="opt in order.serviceOptions"
                :key="opt.optionCode"
                style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f0f0f0"
              >
                <div>
                  <el-tag
                    :type="opt.status === 'completed' ? 'success' : opt.status === 'in_progress' ? 'warning' : 'info'"
                    size="small"
                    style="margin-right: 8px"
                  >
                    {{ opt.status === 'completed' ? '完成' : opt.status === 'in_progress' ? '进行中' : '待开始' }}
                  </el-tag>
                  {{ opt.optionName }}
                </div>
                <div style="font-size: 13px; color: #606266">
                  {{ opt.actualQuantity ?? '--' }}/{{ opt.quantity }}
                </div>
              </div>
            </div>
          </el-card>

          <!-- 费用 / 費用 -->
          <el-card>
            <template #header>费用</template>
            <el-descriptions :column="1" border size="small">
              <el-descriptions-item label="预估">¥{{ estimatedTotal.toLocaleString() }}</el-descriptions-item>
              <el-descriptions-item label="已确定">¥{{ confirmedTotal.toLocaleString() }}</el-descriptions-item>
            </el-descriptions>
            <div v-if="order.serviceOptions?.length" style="margin-top: 12px">
              <div
                v-for="opt in order.serviceOptions"
                :key="opt.optionCode"
                style="display: flex; justify-content: space-between; font-size: 12px; padding: 4px 0"
              >
                <span>{{ opt.optionName }}</span>
                <span>¥{{ (opt.actualCost || opt.estimatedCost || 0).toLocaleString() }}</span>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </template>
  </div>
</template>
