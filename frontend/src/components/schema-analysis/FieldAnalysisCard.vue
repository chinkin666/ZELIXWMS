<template>
  <div class="field-analysis-card">
    <div class="field-header">
      <span class="field-name">{{ fieldName }}</span>
      <el-button
        v-if="uniqueCount > 20 && !forceChart"
        text
        size="small"
        @click="forceChart = true"
      >
        グラフ表示
      </el-button>
      <el-button
        v-if="forceChart && uniqueCount > 20"
        text
        size="small"
        @click="forceChart = false"
      >
        サンプル表示
      </el-button>
    </div>

    <div class="field-content">
      <!-- Left: Fill ratio bar -->
      <div class="fill-ratio-section">
        <div class="ratio-bar-container">
          <div class="ratio-bar">
            <div
              class="ratio-filled"
              :style="{ width: fillPercentage + '%' }"
            />
          </div>
          <div class="ratio-labels">
            <span class="ratio-label filled">{{ filledCount }}</span>
            <span class="ratio-label empty">{{ emptyCount }}</span>
          </div>
        </div>
        <div class="ratio-text">
          <span v-if="emptyCount > 0" class="empty-text">{{ emptyPercentage }}% 空</span>
          <span v-else class="full-text">100% 値あり</span>
        </div>
      </div>

      <!-- Right: Distribution visualization -->
      <div class="distribution-section">
        <!-- Case 1: uniqueCount <= 4 - Stacked horizontal bar (100% width) -->
        <template v-if="uniqueCount > 0 && uniqueCount <= 4">
          <div class="stacked-bar-container">
            <div class="stacked-bar">
              <div
                v-for="(item, idx) in stackedBarItems"
                :key="idx"
                class="stacked-segment clickable"
                :style="{
                  width: item.percentage + '%',
                  backgroundColor: chartColors[idx % chartColors.length],
                }"
                :title="`${item.label}: ${item.count} (${item.percentage}%)`"
                @click="handleValueClick(item.label)"
              />
            </div>
            <div class="stacked-legend">
              <div
                v-for="(item, idx) in stackedBarItems"
                :key="idx"
                class="legend-item clickable"
                @click="handleValueClick(item.label)"
              >
                <span
                  class="legend-color"
                  :style="{ backgroundColor: chartColors[idx % chartColors.length] }"
                />
                <span class="legend-label">{{ formatValue(item.label) }}</span>
                <span class="legend-count">{{ item.count }}</span>
              </div>
            </div>
          </div>
        </template>

        <!-- Case 2: 4 < uniqueCount <= 20 - Vertical bar chart -->
        <template v-else-if="uniqueCount > 4 && (uniqueCount <= 20 || forceChart)">
          <div class="vertical-chart-wrapper">
            <Bar
              :data="verticalBarChartData"
              :options="verticalBarChartOptions"
              class="chart-vertical"
            />
            <div class="chart-legend">
              <div
                v-for="(item, idx) in verticalBarItems"
                :key="idx"
                class="legend-item clickable"
                @click="handleValueClick(item.label)"
              >
                <span
                  class="legend-color"
                  :style="{ backgroundColor: 'rgba(64, 158, 255, 0.85)' }"
                />
                <span class="legend-label">{{ formatValue(item.label) }}</span>
                <span class="legend-count">{{ item.count }}</span>
              </div>
            </div>
          </div>
        </template>

        <!-- Case 3: uniqueCount > 20 and not force chart - Show examples -->
        <template v-else-if="uniqueCount > 20 && !forceChart">
          <div class="examples-section">
            <div class="examples-header">
              <span class="unique-count">{{ uniqueCount }} 種類</span>
            </div>
            <div class="examples-list">
              <el-tag
                v-for="(example, idx) in displayExamples"
                :key="idx"
                size="small"
                type="info"
                class="example-tag clickable"
                @click="handleValueClick(example)"
              >
                {{ formatValue(example) }}
              </el-tag>
            </div>
          </div>
        </template>

        <!-- Case 4: All empty -->
        <template v-else-if="uniqueCount === 0">
          <div class="no-data">値なし</div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export interface FieldAnalysisData {
  fieldName: string
  fieldPath: string
  totalCount: number
  filledCount: number
  emptyCount: number
  valueCounts: Map<string, number>
  // Maps display value back to raw value for filtering
  rawValueMap: Map<string, any>
}

const props = defineProps<{
  data: FieldAnalysisData
}>()

const emit = defineEmits<{
  (e: 'filter', fieldPath: string, value: any): void
}>()

const forceChart = ref(false)

const handleValueClick = (displayValue: string) => {
  const rawValue = props.data.rawValueMap.get(displayValue)
  if (rawValue !== undefined) {
    emit('filter', props.data.fieldPath, rawValue)
  }
}

const fieldName = computed(() => props.data.fieldName)
const totalCount = computed(() => props.data.totalCount)
const filledCount = computed(() => props.data.filledCount)
const emptyCount = computed(() => props.data.emptyCount)

const fillPercentage = computed(() => {
  if (totalCount.value === 0) return 0
  return Math.round((filledCount.value / totalCount.value) * 100)
})

const emptyPercentage = computed(() => {
  if (totalCount.value === 0) return 0
  return Math.round((emptyCount.value / totalCount.value) * 100)
})

const uniqueCount = computed(() => props.data.valueCounts.size)

const sortedValues = computed(() => {
  return Array.from(props.data.valueCounts.entries())
    .sort((a, b) => b[1] - a[1])
})

// Stacked bar items for <= 4 unique values
const stackedBarItems = computed(() => {
  const entries = sortedValues.value
  const total = entries.reduce((sum, [, count]) => sum + count, 0)
  return entries.map(([label, count]) => ({
    label,
    count,
    percentage: total > 0 ? Math.round((count / total) * 100) : 0,
  }))
})

// Vertical bar items for legend
const verticalBarItems = computed(() => {
  return sortedValues.value.slice(0, 20).map(([label, count]) => ({
    label,
    count,
  }))
})

const displayExamples = computed(() => {
  const values = Array.from(props.data.valueCounts.keys())
  if (values.length <= 10) return values
  const shuffled = [...values].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, 10)
})

const formatValue = (value: string): string => {
  if (value === '__empty__') return '(空)'
  if (value.length > 20) return value.substring(0, 17) + '...'
  return value
}

const chartColors = [
  'rgba(64, 158, 255, 0.85)',
  'rgba(103, 194, 58, 0.85)',
  'rgba(230, 162, 60, 0.85)',
  'rgba(245, 108, 108, 0.85)',
  'rgba(144, 147, 153, 0.85)',
  'rgba(155, 89, 182, 0.85)',
  'rgba(26, 188, 156, 0.85)',
  'rgba(52, 73, 94, 0.85)',
]

// Vertical bar chart for 4 < unique <= 20
const verticalBarChartData = computed(() => {
  const entries = sortedValues.value.slice(0, 20)
  const percentages = entries.map(([, count]) =>
    totalCount.value > 0 ? (count / totalCount.value) * 100 : 0
  )
  return {
    labels: entries.map(([label]) => formatValue(label)),
    datasets: [
      {
        data: percentages,
        backgroundColor: 'rgba(64, 158, 255, 0.7)',
        borderRadius: 2,
      },
    ],
  }
})

const verticalBarChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  onClick: (_event: any, elements: any[]) => {
    if (elements.length > 0) {
      const idx = elements[0].index
      const entry = sortedValues.value[idx]
      if (entry) {
        handleValueClick(entry[0])
      }
    }
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (context: any) => {
          const idx = context.dataIndex
          const entry = sortedValues.value[idx]
          if (!entry) return ''
          const [, count] = entry
          const percentage = Math.round(context.raw)
          return `${count} 件 (${percentage}%)`
        },
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        font: { size: 9 },
        color: '#909399',
        maxRotation: 45,
        minRotation: 45,
      },
    },
    y: {
      display: true,
      min: 0,
      grid: {
        color: '#f0f2f5',
      },
      ticks: {
        font: { size: 9 },
        color: '#909399',
        callback: (value: number | string) => `${value}%`,
      },
    },
  },
}))
</script>

<style scoped>
.field-analysis-card {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 16px;
  background: #fff;
}

.field-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.field-name {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
}

.field-content {
  display: flex;
  gap: 20px;
}

.fill-ratio-section {
  flex: 0 0 200px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ratio-bar-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ratio-bar {
  height: 8px;
  background: #f0f2f5;
  border-radius: 4px;
  overflow: hidden;
}

.ratio-filled {
  height: 100%;
  background: linear-gradient(90deg, #409eff, #67c23a);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.ratio-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
}

.ratio-label.filled {
  color: #409eff;
}

.ratio-label.empty {
  color: #909399;
}

.ratio-text {
  font-size: 12px;
}

.empty-text {
  color: #909399;
}

.full-text {
  color: #67c23a;
}

.distribution-section {
  flex: 1;
  min-width: 0;
}

/* Stacked horizontal bar styles */
.stacked-bar-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.stacked-bar {
  height: 24px;
  display: flex;
  border-radius: 4px;
  overflow: hidden;
  background: #f0f2f5;
}

.stacked-segment {
  height: 100%;
  min-width: 2px;
  transition: width 0.3s ease;
}

.stacked-segment:first-child {
  border-top-left-radius: 4px;
  border-bottom-left-radius: 4px;
}

.stacked-segment:last-child {
  border-top-right-radius: 4px;
  border-bottom-right-radius: 4px;
}

/* Shared legend styles */
.stacked-legend,
.chart-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  flex-shrink: 0;
}

.legend-label {
  color: #606266;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.legend-count {
  color: #909399;
  font-size: 11px;
}

/* Vertical chart styles */
.vertical-chart-wrapper {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.chart-vertical {
  height: 180px !important;
  cursor: pointer;
}

.examples-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.examples-header {
  font-size: 12px;
  color: #909399;
}

.unique-count {
  font-weight: 500;
}

.examples-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.example-tag {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.no-data {
  color: #c0c4cc;
  font-size: 12px;
  font-style: italic;
}

/* Clickable elements */
.clickable {
  cursor: pointer;
  transition: opacity 0.2s, transform 0.1s;
}

.clickable:hover {
  opacity: 0.8;
}

.legend-item.clickable:hover {
  background: #f5f7fa;
  border-radius: 4px;
}

.stacked-segment.clickable:hover {
  filter: brightness(1.1);
}

.example-tag.clickable:hover {
  transform: scale(1.05);
}
</style>
