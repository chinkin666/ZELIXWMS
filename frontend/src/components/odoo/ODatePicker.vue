<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: string
  min?: string
  max?: string
  placeholder?: string
}>(), {
  placeholder: 'YYYY-MM-DD',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const showCalendar = ref(false)
const calendarRef = ref<HTMLDivElement | null>(null)
const triggerRef = ref<HTMLDivElement | null>(null)
const inputValue = ref(props.modelValue)
const calendarBaseDate = ref(new Date())

const DAYS_OF_WEEK = ['日', '月', '火', '水', '木', '金', '土'] as const

watch(() => props.modelValue, (v) => { inputValue.value = v })

const currentMonth = computed(() => {
  const d = new Date(calendarBaseDate.value)
  return { year: d.getFullYear(), month: d.getMonth() }
})

const monthLabel = computed(() => {
  const { year, month } = currentMonth.value
  return `${year}年${month + 1}月`
})

function getDaysInMonth(year: number, month: number): string[][] {
  const firstDay = new Date(year, month, 1)
  const startDay = firstDay.getDay() // 0=Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const weeks: string[][] = []
  let currentWeek: string[] = []
  for (let i = 0; i < startDay; i++) currentWeek.push('')
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    currentWeek.push(dateStr)
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push('')
    weeks.push(currentWeek)
  }
  return weeks
}

const weeks = computed(() => getDaysInMonth(currentMonth.value.year, currentMonth.value.month))

function getDayNumber(dateStr: string): number {
  return parseInt(dateStr.split('-')[2] ?? '0', 10)
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isSelected(dateStr: string): boolean {
  return dateStr === inputValue.value
}

function isToday(dateStr: string): boolean {
  return dateStr === toDateStr(new Date())
}

function isDisabled(dateStr: string): boolean {
  if (!dateStr) return true
  if (props.min && dateStr < props.min) return true
  if (props.max && dateStr > props.max) return true
  return false
}

function onDayClick(dateStr: string) {
  if (!dateStr || isDisabled(dateStr)) return
  inputValue.value = dateStr
  emit('update:modelValue', dateStr)
  showCalendar.value = false
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

const dropdownStyle = ref<Record<string, string>>({})

function updateDropdownPosition() {
  if (!triggerRef.value) return
  const rect = triggerRef.value.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom
  const dropdownHeight = 320 // approximate max height
  if (spaceBelow >= dropdownHeight || spaceBelow >= rect.top) {
    // Show below
    dropdownStyle.value = {
      position: 'fixed',
      top: `${rect.bottom + 4}px`,
      left: `${rect.left}px`,
      zIndex: '9999',
    }
  } else {
    // Show above
    dropdownStyle.value = {
      position: 'fixed',
      top: `${rect.top - dropdownHeight - 4}px`,
      left: `${rect.left}px`,
      zIndex: '9999',
    }
  }
}

function toggleCalendar() {
  showCalendar.value = !showCalendar.value
  if (showCalendar.value) {
    if (inputValue.value) {
      const parts = inputValue.value.split('-')
      calendarBaseDate.value = new Date(parseInt(parts[0] ?? '0'), parseInt(parts[1] ?? '1') - 1, 1)
    }
    nextTick(() => updateDropdownPosition())
  }
}

function onInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  inputValue.value = value
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    if (!isDisabled(value)) {
      emit('update:modelValue', value)
    }
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

function selectToday() {
  const today = toDateStr(new Date())
  if (!isDisabled(today)) {
    onDayClick(today)
  }
}

function clear() {
  inputValue.value = ''
  emit('update:modelValue', '')
}

function onScrollOrResize() {
  if (showCalendar.value) {
    updateDropdownPosition()
  }
}

onMounted(() => {
  document.addEventListener('mousedown', onClickOutside)
  window.addEventListener('scroll', onScrollOrResize, true)
  window.addEventListener('resize', onScrollOrResize)
})
onUnmounted(() => {
  document.removeEventListener('mousedown', onClickOutside)
  window.removeEventListener('scroll', onScrollOrResize, true)
  window.removeEventListener('resize', onScrollOrResize)
})
</script>

<template>
  <div class="o-datepicker">
    <div ref="triggerRef" class="o-datepicker-trigger" @click="toggleCalendar">
      <svg class="o-datepicker-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
      </svg>
      <input
        type="text"
        class="o-datepicker-input"
        :value="inputValue"
        :placeholder="placeholder"
        @input="onInput"
        @click.stop
      />
      <button
        v-if="inputValue"
        class="o-datepicker-clear"
        type="button"
        @click.stop="clear"
      >&times;</button>
    </div>

    <Teleport to="body">
    <div v-if="showCalendar" ref="calendarRef" class="o-datepicker-dropdown" :style="dropdownStyle">
      <div class="o-datepicker-header">
        <button type="button" class="o-datepicker-nav" @click="prevMonth">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span class="o-datepicker-month">{{ monthLabel }}</span>
        <button type="button" class="o-datepicker-nav" @click="nextMonth">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      <div class="o-datepicker-grid">
        <span v-for="day in DAYS_OF_WEEK" :key="day" class="o-datepicker-weekday">{{ day }}</span>
        <template v-for="(week, wi) in weeks" :key="wi">
          <template v-for="(dateStr, di) in week" :key="di">
            <span v-if="!dateStr" class="o-datepicker-day o-datepicker-day--empty" />
            <button
              v-else
              type="button"
              class="o-datepicker-day"
              :class="{
                'o-datepicker-day--selected': isSelected(dateStr),
                'o-datepicker-day--today': isToday(dateStr),
                'o-datepicker-day--disabled': isDisabled(dateStr),
              }"
              :disabled="isDisabled(dateStr)"
              @click="onDayClick(dateStr)"
            >
              {{ getDayNumber(dateStr) }}
            </button>
          </template>
        </template>
      </div>

      <div class="o-datepicker-footer">
        <button type="button" class="o-datepicker-today-btn" @click="selectToday">今日</button>
      </div>
    </div>
    </Teleport>
  </div>
</template>

<style scoped>
.o-datepicker {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  width: 100%;
}
.o-datepicker-trigger {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid var(--o-gray-300, #dee2e6);
  border-radius: var(--o-border-radius, 4px);
  padding: 0.375rem 0.625rem;
  background: var(--o-view-background, #fff);
  cursor: pointer;
  transition: border-color 0.15s;
}
.o-datepicker-trigger:hover {
  border-color: var(--o-brand-primary, #714B67);
}
.o-datepicker-icon {
  color: var(--o-gray-500, #adb5bd);
  flex-shrink: 0;
}
.o-datepicker-input {
  border: none;
  outline: none;
  font-size: var(--o-font-size-base, 0.875rem);
  color: var(--o-gray-900, #212529);
  background: transparent;
  width: 100%;
  cursor: pointer;
}
.o-datepicker-input::placeholder {
  color: var(--o-gray-400, #ced4da);
}
.o-datepicker-clear {
  background: none;
  border: none;
  color: var(--o-gray-500, #adb5bd);
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0 0.25rem;
  line-height: 1;
}
.o-datepicker-clear:hover {
  color: var(--o-danger, #dc3545);
}
</style>

<!-- Unscoped styles for teleported dropdown -->
<style>
.o-datepicker-dropdown {
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #dee2e6);
  border-radius: var(--o-border-radius-lg, 6px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  padding: 0.75rem;
  width: 260px;
}
.o-datepicker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}
.o-datepicker-month {
  font-size: var(--o-font-size-base, 0.875rem);
  font-weight: 600;
  color: var(--o-gray-900, #212529);
}
.o-datepicker-nav {
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
.o-datepicker-nav:hover {
  background: var(--o-gray-100, #f8f9fa);
}
.o-datepicker-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
}
.o-datepicker-weekday {
  font-size: var(--o-font-size-smaller, 0.75rem);
  color: var(--o-gray-500, #adb5bd);
  text-align: center;
  padding: 0.25rem 0;
  font-weight: 500;
}
.o-datepicker-day {
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
  border-radius: var(--o-border-radius-sm, 3px);
  transition: background 0.1s;
  padding: 0;
}
.o-datepicker-day:not(.o-datepicker-day--empty):not(.o-datepicker-day--disabled):hover {
  background: var(--o-gray-100, #f8f9fa);
}
.o-datepicker-day--empty {
  cursor: default;
  background: none;
  border: none;
  pointer-events: none;
}
.o-datepicker-day--disabled {
  color: var(--o-gray-400, #ced4da);
  cursor: not-allowed;
}
.o-datepicker-day--selected {
  background: var(--o-brand-primary, #714B67);
  color: #fff;
}
.o-datepicker-day--selected:hover {
  background: var(--o-brand-primary, #714B67) !important;
}
.o-datepicker-day--today:not(.o-datepicker-day--selected) {
  font-weight: 700;
  box-shadow: inset 0 0 0 1px var(--o-brand-primary, #714B67);
}
.o-datepicker-footer {
  display: flex;
  justify-content: center;
  padding-top: 0.5rem;
  border-top: 1px solid var(--o-border-color, #dee2e6);
  margin-top: 0.5rem;
}
.o-datepicker-today-btn {
  background: none;
  border: none;
  color: var(--o-brand-primary, #714B67);
  font-size: var(--o-font-size-small, 0.8125rem);
  font-weight: 500;
  cursor: pointer;
  padding: 0.25rem 0.75rem;
  border-radius: var(--o-border-radius-sm, 3px);
  transition: background 0.15s;
}
.o-datepicker-today-btn:hover {
  background: var(--o-gray-100, #f8f9fa);
}
</style>
