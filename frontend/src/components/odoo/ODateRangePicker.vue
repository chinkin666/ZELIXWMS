<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from '../../composables/useI18n'

const { t } = useI18n()

interface DateRange {
  readonly from: string
  readonly to: string
}

type PresetName =
  | 'today'
  | 'yesterday'
  | 'thisWeek'
  | 'lastWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisQuarter'
  | 'thisYear'
  | 'custom'

const props = withDefaults(defineProps<{
  modelValue: DateRange
  presets?: boolean
  format?: string
}>(), {
  presets: true,
  format: 'YYYY-MM-DD',
})

const emit = defineEmits<{
  'update:modelValue': [value: DateRange]
  'preset-select': [presetName: PresetName]
}>()

const showCalendar = ref(false)
const calendarRef = ref<HTMLDivElement | null>(null)
const triggerRef = ref<HTMLDivElement | null>(null)
const fromInput = ref(props.modelValue.from)
const toInput = ref(props.modelValue.to)
const selecting = ref<'from' | 'to'>('from')
const hoveredDate = ref('')
const comparisonMode = ref(false)
const activePreset = ref<PresetName | null>(null)

const calendarBaseDate = ref(new Date())

const DAYS_OF_WEEK = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const

watch(() => props.modelValue, (newVal) => {
  fromInput.value = newVal.from
  toInput.value = newVal.to
})

const leftMonth = computed(() => {
  const d = new Date(calendarBaseDate.value)
  return { year: d.getFullYear(), month: d.getMonth() }
})

const rightMonth = computed(() => {
  const d = new Date(calendarBaseDate.value)
  d.setMonth(d.getMonth() + 1)
  return { year: d.getFullYear(), month: d.getMonth() }
})

const leftMonthLabel = computed(() => formatMonthYear(leftMonth.value.year, leftMonth.value.month))
const rightMonthLabel = computed(() => formatMonthYear(rightMonth.value.year, rightMonth.value.month))

function formatMonthYear(year: number, month: number): string {
  const date = new Date(year, month, 1)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function getDaysInMonth(year: number, month: number): string[][] {
  const firstDay = new Date(year, month, 1)
  let startDay = firstDay.getDay() - 1
  if (startDay < 0) startDay = 6

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const weeks: string[][] = []
  let currentWeek: string[] = []

  for (let i = 0; i < startDay; i++) {
    currentWeek.push('')
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    currentWeek.push(dateStr)
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push('')
    }
    weeks.push(currentWeek)
  }

  return weeks
}

const leftWeeks = computed(() => getDaysInMonth(leftMonth.value.year, leftMonth.value.month))
const rightWeeks = computed(() => getDaysInMonth(rightMonth.value.year, rightMonth.value.month))

function getDayNumber(dateStr: string): number {
  return parseInt(dateStr.split('-')[2] ?? '0', 10)
}

function isInRange(dateStr: string): boolean {
  if (!dateStr || !fromInput.value) return false
  const endDate = toInput.value || hoveredDate.value
  if (!endDate) return false
  const [start, end] = fromInput.value <= endDate
    ? [fromInput.value, endDate]
    : [endDate, fromInput.value]
  return dateStr >= start && dateStr <= end
}

function isRangeStart(dateStr: string): boolean {
  if (!dateStr || !fromInput.value) return false
  const endDate = toInput.value || hoveredDate.value
  if (!endDate) return dateStr === fromInput.value
  return dateStr === (fromInput.value <= endDate ? fromInput.value : endDate)
}

function isRangeEnd(dateStr: string): boolean {
  if (!dateStr || !fromInput.value) return false
  const endDate = toInput.value || hoveredDate.value
  if (!endDate) return false
  return dateStr === (fromInput.value <= endDate ? endDate : fromInput.value)
}

function isToday(dateStr: string): boolean {
  return dateStr === toDateStr(new Date())
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function onDayClick(dateStr: string) {
  if (!dateStr) return
  if (selecting.value === 'from') {
    fromInput.value = dateStr
    toInput.value = ''
    selecting.value = 'to'
  } else {
    if (dateStr < fromInput.value) {
      toInput.value = fromInput.value
      fromInput.value = dateStr
    } else {
      toInput.value = dateStr
    }
    selecting.value = 'from'
    emitRange(fromInput.value, toInput.value)
    activePreset.value = 'custom'
  }
}

function onDayHover(dateStr: string) {
  if (selecting.value === 'to' && fromInput.value) {
    hoveredDate.value = dateStr
  }
}

function emitRange(from: string, to: string) {
  emit('update:modelValue', { from, to })
}

function prevMonth() {
  const d = new Date(calendarBaseDate.value)
  d.setMonth(d.getMonth() - 1)
  calendarBaseDate.value = d
}

function nextMonth() {
  const d = new Date(calendarBaseDate.value)
  d.setMonth(d.getMonth() + 1)
  calendarBaseDate.value = d
}

function getPresetRange(preset: PresetName): DateRange {
  const today = new Date()
  const todayStr = toDateStr(today)

  switch (preset) {
    case 'today':
      return { from: todayStr, to: todayStr }
    case 'yesterday': {
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const yStr = toDateStr(yesterday)
      return { from: yStr, to: yStr }
    }
    case 'thisWeek': {
      const start = new Date(today)
      const dayOfWeek = start.getDay() || 7
      start.setDate(start.getDate() - dayOfWeek + 1)
      return { from: toDateStr(start), to: todayStr }
    }
    case 'lastWeek': {
      const start = new Date(today)
      const dayOfWeek = start.getDay() || 7
      start.setDate(start.getDate() - dayOfWeek - 6)
      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      return { from: toDateStr(start), to: toDateStr(end) }
    }
    case 'thisMonth': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      return { from: toDateStr(start), to: todayStr }
    }
    case 'lastMonth': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const end = new Date(today.getFullYear(), today.getMonth(), 0)
      return { from: toDateStr(start), to: toDateStr(end) }
    }
    case 'thisQuarter': {
      const qMonth = Math.floor(today.getMonth() / 3) * 3
      const start = new Date(today.getFullYear(), qMonth, 1)
      return { from: toDateStr(start), to: todayStr }
    }
    case 'thisYear': {
      const start = new Date(today.getFullYear(), 0, 1)
      return { from: toDateStr(start), to: todayStr }
    }
    default:
      return { from: '', to: '' }
  }
}

function selectPreset(preset: PresetName) {
  if (preset === 'custom') {
    activePreset.value = 'custom'
    emit('preset-select', 'custom')
    return
  }
  const range = getPresetRange(preset)
  fromInput.value = range.from
  toInput.value = range.to
  activePreset.value = preset
  emitRange(range.from, range.to)
  emit('preset-select', preset)
}

function clearRange() {
  fromInput.value = ''
  toInput.value = ''
  activePreset.value = null
  selecting.value = 'from'
  emitRange('', '')
}

function onFromInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  fromInput.value = value
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    emitRange(value, toInput.value)
  }
}

function onToInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  toInput.value = value
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    emitRange(fromInput.value, value)
  }
}

function toggleCalendar() {
  showCalendar.value = !showCalendar.value
  if (showCalendar.value && fromInput.value) {
    const parts = fromInput.value.split('-')
    calendarBaseDate.value = new Date(parseInt(parts[0] ?? '0'), parseInt(parts[1] ?? '1') - 1, 1)
  }
}

function onClickOutside(event: MouseEvent) {
  const target = event.target as Node
  if (
    calendarRef.value && !calendarRef.value.contains(target) &&
    triggerRef.value && !triggerRef.value.contains(target)
  ) {
    showCalendar.value = false
  }
}

const comparisonRange = computed<DateRange>(() => {
  if (!comparisonMode.value || !fromInput.value || !toInput.value) {
    return { from: '', to: '' }
  }
  const from = new Date(fromInput.value)
  const to = new Date(toInput.value)
  const diff = to.getTime() - from.getTime()
  const prevTo = new Date(from.getTime() - 86400000)
  const prevFrom = new Date(prevTo.getTime() - diff)
  return { from: toDateStr(prevFrom), to: toDateStr(prevTo) }
})

const presetList: { key: PresetName; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'thisWeek', label: 'This Week' },
  { key: 'lastWeek', label: 'Last Week' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'lastMonth', label: 'Last Month' },
  { key: 'thisQuarter', label: 'This Quarter' },
  { key: 'thisYear', label: 'This Year' },
  { key: 'custom', label: 'Custom' },
]

onMounted(() => {
  document.addEventListener('mousedown', onClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', onClickOutside)
})
</script>

<template>
  <div class="o-date-range-picker">
    <div ref="triggerRef" class="o-date-range-inputs" @click="toggleCalendar">
      <div class="o-date-range-field">
        <label class="o-date-range-label">{{ t('common.from') || 'From' }}</label>
        <Input
          type="text"
          class="o-date-range-input"
          :value="fromInput"
          placeholder="YYYY-MM-DD"
          @input="onFromInput"
          @click.stop
        />
      </div>
      <span class="o-date-range-separator">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </span>
      <div class="o-date-range-field">
        <label class="o-date-range-label">{{ t('common.to') || 'To' }}</label>
        <Input
          type="text"
          class="o-date-range-input"
          :value="toInput"
          placeholder="YYYY-MM-DD"
          @input="onToInput"
          @click.stop
        />
      </div>
      <Button
        v-if="fromInput || toInput"
        class="o-date-range-clear"
        type="button"
        :aria-label="t('common.clear') || 'Clear'"
        @click.stop="clearRange"
      >
        &times;
      </button>
    </div>

    <div v-if="showCalendar" ref="calendarRef" class="o-date-range-dropdown">
      <div v-if="presets" class="o-date-range-presets">
        <Button
          v-for="preset in presetList"
          :key="preset.key"
          type="button"
          class="o-date-range-preset-btn"
          :class="{ 'o-date-range-preset-btn--active': activePreset === preset.key }"
          @click="selectPreset(preset.key)"
        >
          {{ t(`dateRange.${preset.key}`) || preset.label }}
        </button>
      </div>

      <div class="o-date-range-calendars">
        <div class="o-date-range-calendar">
          <div class="o-date-range-cal-header">
            <Button type="button" class="o-date-range-nav" @click="prevMonth">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <span class="o-date-range-month-label">{{ leftMonthLabel }}</span>
            <span />
          </div>
          <div class="o-date-range-cal-grid">
            <span v-for="day in DAYS_OF_WEEK" :key="day" class="o-date-range-day-header">{{ day }}</span>
            <template v-for="(week, wi) in leftWeeks" :key="wi">
              <Button
                v-for="(dateStr, di) in week"
                :key="di"
                type="button"
                class="o-date-range-day"
                :class="{
                  'o-date-range-day--empty': !dateStr,
                  'o-date-range-day--in-range': isInRange(dateStr),
                  'o-date-range-day--start': isRangeStart(dateStr),
                  'o-date-range-day--end': isRangeEnd(dateStr),
                  'o-date-range-day--today': isToday(dateStr),
                }"
                :disabled="!dateStr"
                @click="onDayClick(dateStr)"
                @mouseenter="onDayHover(dateStr)"
              >
                {{ dateStr ? getDayNumber(dateStr) : '' }}
              </button>
            </template>
          </div>
        </div>

        <div class="o-date-range-calendar">
          <div class="o-date-range-cal-header">
            <span />
            <span class="o-date-range-month-label">{{ rightMonthLabel }}</span>
            <Button type="button" class="o-date-range-nav" @click="nextMonth">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
          <div class="o-date-range-cal-grid">
            <span v-for="day in DAYS_OF_WEEK" :key="day" class="o-date-range-day-header">{{ day }}</span>
            <template v-for="(week, wi) in rightWeeks" :key="wi">
              <Button
                v-for="(dateStr, di) in week"
                :key="di"
                type="button"
                class="o-date-range-day"
                :class="{
                  'o-date-range-day--empty': !dateStr,
                  'o-date-range-day--in-range': isInRange(dateStr),
                  'o-date-range-day--start': isRangeStart(dateStr),
                  'o-date-range-day--end': isRangeEnd(dateStr),
                  'o-date-range-day--today': isToday(dateStr),
                }"
                :disabled="!dateStr"
                @click="onDayClick(dateStr)"
                @mouseenter="onDayHover(dateStr)"
              >
                {{ dateStr ? getDayNumber(dateStr) : '' }}
              </button>
            </template>
          </div>
        </div>
      </div>

      <div class="o-date-range-footer">
        <label class="o-date-range-comparison">
          <Input
            v-model="comparisonMode"
            type="checkbox"
            class="o-date-range-comparison-check"
          />
          <span>{{ t('dateRange.comparison') || 'vs Previous Period' }}</span>
        </label>
        <span v-if="comparisonMode && comparisonRange.from" class="o-date-range-comparison-label">
          {{ comparisonRange.from }} - {{ comparisonRange.to }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.o-date-range-picker {
  position: relative;
  display: inline-flex;
  flex-direction: column;
}

.o-date-range-inputs {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid var(--o-border-color, #dee2e6);
  border-radius: var(--o-border-radius, 4px);
  padding: 0.375rem 0.625rem;
  background: var(--o-view-background, #fff);
  cursor: pointer;
  transition: border-color 0.15s;
}

.o-date-range-inputs:hover {
  border-color: var(--o-brand-primary, #0052A3);
}

.o-date-range-field {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.o-date-range-label {
  font-size: var(--o-font-size-smaller, 0.75rem);
  color: var(--o-gray-500, #adb5bd);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.o-date-range-input {
  border: none;
  outline: none;
  font-size: var(--o-font-size-small, 0.8125rem);
  color: var(--o-gray-900, #212529);
  background: transparent;
  width: 100px;
  font-family: var(--o-font-family-mono);
}

.o-date-range-separator {
  color: var(--o-gray-400, #ced4da);
  display: flex;
  align-items: center;
}

.o-date-range-clear {
  background: none;
  border: none;
  color: var(--o-gray-500, #adb5bd);
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0 0.25rem;
  line-height: 1;
  transition: color 0.15s;
}

.o-date-range-clear:hover {
  color: var(--o-danger, #dc3545);
}

.o-date-range-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 100;
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #dee2e6);
  border-radius: var(--o-border-radius-lg, 6px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  display: flex;
  overflow: hidden;
}

.o-date-range-presets {
  display: flex;
  flex-direction: column;
  padding: 0.5rem;
  border-right: 1px solid var(--o-border-color, #dee2e6);
  min-width: 130px;
  gap: 0.125rem;
}

.o-date-range-preset-btn {
  background: none;
  border: none;
  padding: 0.375rem 0.75rem;
  text-align: left;
  font-size: var(--o-font-size-small, 0.8125rem);
  color: var(--o-gray-700, #495057);
  border-radius: var(--o-border-radius-sm, 3px);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
}

.o-date-range-preset-btn:hover {
  background: var(--o-gray-100, #f8f9fa);
}

.o-date-range-preset-btn--active {
  background: var(--o-brand-primary, #0052A3);
  color: #fff;
}

.o-date-range-preset-btn--active:hover {
  background: var(--o-brand-primary, #0052A3);
}

.o-date-range-calendars {
  display: flex;
  gap: 1rem;
  padding: 0.75rem;
}

.o-date-range-calendar {
  width: 230px;
}

.o-date-range-cal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.o-date-range-month-label {
  font-size: var(--o-font-size-base, 0.875rem);
  font-weight: 600;
  color: var(--o-gray-900, #212529);
}

.o-date-range-nav {
  background: none;
  border: none;
  color: var(--o-gray-600, #6c757d);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: var(--o-border-radius-sm, 3px);
  display: flex;
  align-items: center;
  transition: background 0.15s;
}

.o-date-range-nav:hover {
  background: var(--o-gray-100, #f8f9fa);
}

.o-date-range-cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
}

.o-date-range-day-header {
  font-size: var(--o-font-size-smaller, 0.75rem);
  color: var(--o-gray-500, #adb5bd);
  text-align: center;
  padding: 0.25rem 0;
  font-weight: 500;
}

.o-date-range-day {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 1;
  font-size: var(--o-font-size-small, 0.8125rem);
  color: var(--o-gray-800, #343a40);
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 0;
  transition: background 0.1s;
  padding: 0;
}

.o-date-range-day:not(.o-date-range-day--empty):hover {
  background: var(--o-gray-100, #f8f9fa);
}

.o-date-range-day--empty {
  cursor: default;
}

.o-date-range-day--in-range {
  background: var(--o-brand-lighter, #ede8eb);
}

.o-date-range-day--start,
.o-date-range-day--end {
  background: var(--o-brand-primary, #0052A3);
  color: #fff;
}

.o-date-range-day--start {
  border-radius: var(--o-border-radius-sm, 3px) 0 0 var(--o-border-radius-sm, 3px);
}

.o-date-range-day--end {
  border-radius: 0 var(--o-border-radius-sm, 3px) var(--o-border-radius-sm, 3px) 0;
}

.o-date-range-day--start.o-date-range-day--end {
  border-radius: var(--o-border-radius-sm, 3px);
}

.o-date-range-day--today {
  font-weight: 700;
  box-shadow: inset 0 0 0 1px var(--o-brand-primary, #0052A3);
}

.o-date-range-footer {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  border-top: 1px solid var(--o-border-color, #dee2e6);
  width: 100%;
}

.o-date-range-comparison {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: var(--o-font-size-small, 0.8125rem);
  color: var(--o-gray-700, #495057);
  cursor: pointer;
}

.o-date-range-comparison-check {
  accent-color: var(--o-brand-primary, #0052A3);
}

.o-date-range-comparison-label {
  font-size: var(--o-font-size-smaller, 0.75rem);
  color: var(--o-gray-500, #adb5bd);
  font-family: var(--o-font-family-mono);
}

[data-theme="dark"] .o-date-range-inputs {
  background: var(--o-gray-200);
  border-color: var(--o-gray-300);
}

[data-theme="dark"] .o-date-range-input {
  color: var(--o-gray-900);
}

[data-theme="dark"] .o-date-range-dropdown {
  background: var(--o-gray-200);
  border-color: var(--o-gray-300);
}

[data-theme="dark"] .o-date-range-presets {
  border-color: var(--o-gray-300);
}

[data-theme="dark"] .o-date-range-preset-btn {
  color: var(--o-gray-800);
}

[data-theme="dark"] .o-date-range-preset-btn:hover {
  background: var(--o-gray-300);
}

[data-theme="dark"] .o-date-range-month-label {
  color: var(--o-gray-900);
}

[data-theme="dark"] .o-date-range-day {
  color: var(--o-gray-800);
}

[data-theme="dark"] .o-date-range-day:not(.o-date-range-day--empty):hover {
  background: var(--o-gray-300);
}

[data-theme="dark"] .o-date-range-day--in-range {
  background: var(--o-brand-lighter);
}

[data-theme="dark"] .o-date-range-footer {
  border-color: var(--o-gray-300);
}
</style>
