<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()

// --- Types ---

type BarcodeFormat = 'EAN-13' | 'EAN-8' | 'Code128' | 'QR' | 'Unknown'

interface ScanEntry {
  readonly id: string
  readonly barcode: string
  readonly format: BarcodeFormat
  readonly timestamp: Date
}

// --- Props & Emits ---

const props = withDefaults(defineProps<{
  enabled?: boolean
  prefix?: string
  minLength?: number
}>(), {
  enabled: true,
  prefix: '',
  minLength: 6,
})

const emit = defineEmits<{
  'scan': [barcodeData: ScanEntry]
  'error': [invalidScan: string]
}>()

// --- State ---

const scanHistory = ref<readonly ScanEntry[]>([])
const manualInput = ref('')
const showFlash = ref(false)
const flashBarcode = ref('')
const isListening = ref(false)

const MAX_HISTORY = 10
const MAX_CHAR_INTERVAL_MS = 50

let inputBuffer = ''
let lastKeyTime = 0
let bufferTimeout: ReturnType<typeof setTimeout> | null = null
let idCounter = 0

// --- Barcode Format Detection ---

function detectFormat(code: string): BarcodeFormat {
  const digits = code.replace(/\D/g, '')

  if (digits.length === 13 && digits === code && validateEan(digits)) {
    return 'EAN-13'
  }
  if (digits.length === 8 && digits === code && validateEan(digits)) {
    return 'EAN-8'
  }
  // Code128 can encode any ASCII character, typically alphanumeric
  if (/^[A-Za-z0-9\-.$\/+%\s]{6,}$/.test(code) && /[A-Za-z]/.test(code)) {
    return 'Code128'
  }
  // QR codes often contain URLs or structured data
  if (code.includes('://') || code.includes('{') || code.length > 30) {
    return 'QR'
  }
  return 'Unknown'
}

function validateEan(digits: string): boolean {
  const nums = digits.split('').map(Number)
  const checkDigit = nums.pop()
  if (checkDigit === undefined) return false
  const sum = nums.reduce((acc, digit, i) => {
    const weight = i % 2 === 0 ? 1 : 3
    return acc + digit * weight
  }, 0)
  return (10 - (sum % 10)) % 10 === checkDigit
}

// --- Audio ---

function playSuccessBeep(): void {
  try {
    const ctx = new AudioContext()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.frequency.value = 1200
    oscillator.type = 'square'
    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.1)
    setTimeout(() => ctx.close(), 200)
  } catch {
    // Web Audio API not available
  }
}

// --- Flash Overlay ---

function triggerFlash(barcode: string): void {
  flashBarcode.value = barcode
  showFlash.value = true
  setTimeout(() => {
    showFlash.value = false
  }, 1200)
}

// --- Scan Processing ---

function generateId(): string {
  idCounter += 1
  return `scan-${Date.now()}-${idCounter}`
}

function processScan(rawBarcode: string): void {
  const barcode = rawBarcode.trim()

  if (barcode.length < props.minLength) {
    emit('error', barcode)
    return
  }

  if (props.prefix && !barcode.startsWith(props.prefix)) {
    emit('error', barcode)
    return
  }

  const format = detectFormat(barcode)
  const entry: ScanEntry = {
    id: generateId(),
    barcode,
    format,
    timestamp: new Date(),
  }

  scanHistory.value = [entry, ...scanHistory.value].slice(0, MAX_HISTORY)
  playSuccessBeep()
  triggerFlash(barcode)
  emit('scan', entry)
}

// --- Keyboard Listener ---

function handleKeyDown(event: KeyboardEvent): void {
  if (!props.enabled) return

  // Skip if user is focused on an input/textarea (except our manual input)
  const target = event.target as HTMLElement
  if (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable
  ) {
    return
  }

  const now = Date.now()

  if (event.key === 'Enter') {
    if (inputBuffer.length >= props.minLength) {
      processScan(inputBuffer)
    }
    inputBuffer = ''
    if (bufferTimeout) clearTimeout(bufferTimeout)
    return
  }

  // Only accept printable characters
  if (event.key.length !== 1) return

  const timeDelta = now - lastKeyTime
  lastKeyTime = now

  if (timeDelta > MAX_CHAR_INTERVAL_MS && inputBuffer.length > 0) {
    // Too slow — user typing, not a scanner
    inputBuffer = ''
  }

  inputBuffer += event.key

  // Reset buffer after a pause
  if (bufferTimeout) clearTimeout(bufferTimeout)
  bufferTimeout = setTimeout(() => {
    inputBuffer = ''
  }, MAX_CHAR_INTERVAL_MS * 3)
}

// --- Manual Entry ---

function submitManualEntry(): void {
  if (manualInput.value.trim().length === 0) return
  processScan(manualInput.value)
  manualInput.value = ''
}

// --- Format Display ---

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatLabel(format: BarcodeFormat): string {
  return format
}

// --- Lifecycle ---

onMounted(() => {
  if (props.enabled) {
    document.addEventListener('keydown', handleKeyDown)
    isListening.value = true
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
  if (bufferTimeout) clearTimeout(bufferTimeout)
})

watch(() => props.enabled, (enabled) => {
  if (enabled) {
    document.addEventListener('keydown', handleKeyDown)
    isListening.value = true
  } else {
    document.removeEventListener('keydown', handleKeyDown)
    isListening.value = false
  }
})
</script>

<template>
  <div class="o-barcode-listener">
    <!-- Flash Overlay -->
    <Transition name="o-barcode-flash">
      <div
        v-if="showFlash"
        class="o-barcode-flash-overlay"
      >
        <span class="o-barcode-flash-overlay__code">{{ flashBarcode }}</span>
      </div>
    </Transition>

    <!-- Status & Controls -->
    <div class="o-barcode-status">
      <div class="o-barcode-status__indicator">
        <span
          class="o-barcode-status__dot"
          :class="isListening ? 'o-barcode-status__dot--active' : 'o-barcode-status__dot--inactive'"
        />
        <span class="o-barcode-status__text">
          {{ isListening
            ? (t('barcode.listening') || 'Scanner ready — Listening...')
            : (t('barcode.disabled') || 'Scanner disabled')
          }}
        </span>
      </div>
      <div
        v-if="prefix"
        class="o-barcode-status__prefix"
      >
        {{ t('barcode.prefix') || 'Prefix filter' }}: <code>{{ prefix }}</code>
      </div>
    </div>

    <!-- Manual Entry -->
    <div class="o-barcode-manual">
      <label class="o-barcode-manual__label">
        {{ t('barcode.manualEntry') || 'Manual Entry' }}
      </label>
      <div class="o-barcode-manual__row">
        <Input
          v-model="manualInput"
          type="text"
          class="o-barcode-manual__input"
          :placeholder="t('barcode.enterBarcode') || 'Enter barcode...'"
          @keydown.enter="submitManualEntry"
        />
        <Button
          class="o-barcode-manual__submit"
          :disabled="manualInput.trim().length === 0"
          @click="submitManualEntry"
        >
          {{ t('barcode.submit') || 'Submit' }}
        </button>
      </div>
    </div>

    <!-- Scan History -->
    <div class="o-barcode-history">
      <h4 class="o-barcode-history__title">
        {{ t('barcode.history') || 'Scan History' }}
        <span class="o-barcode-history__count">({{ scanHistory.length }})</span>
      </h4>
      <div
        v-if="scanHistory.length === 0"
        class="o-barcode-history__empty"
      >
        {{ t('barcode.noScans') || 'No scans recorded yet.' }}
      </div>
      <div
        v-for="entry in scanHistory"
        :key="entry.id"
        class="o-barcode-history__item"
      >
        <div class="o-barcode-history__barcode">
          <code>{{ entry.barcode }}</code>
        </div>
        <div class="o-barcode-history__meta">
          <span
            class="o-barcode-history__format"
            :class="`o-barcode-history__format--${entry.format.toLowerCase()}`"
          >
            {{ formatLabel(entry.format) }}
          </span>
          <span class="o-barcode-history__time">{{ formatTime(entry.timestamp) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.o-barcode-listener {
  /* brand primary inherited from global */
  position: relative;
  font-family: inherit;
}

/* Flash Overlay */
.o-barcode-flash-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 82, 163, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  pointer-events: none;
}

.o-barcode-flash-overlay__code {
  font-size: 32px;
  font-weight: 700;
  font-family: monospace;
  color: var(--o-brand-primary, #0052A3);
  background: var(--o-view-background);
  padding: 16px 32px;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.o-barcode-flash-enter-active {
  transition: opacity 0.15s ease-out;
}

.o-barcode-flash-leave-active {
  transition: opacity 0.6s ease-in;
}

.o-barcode-flash-enter-from,
.o-barcode-flash-leave-to {
  opacity: 0;
}

/* Status */
.o-barcode-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--o-view-background);
  border: 1px solid var(--o-border-color);
  border-radius: 8px;
  margin-bottom: 12px;
}

.o-barcode-status__indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.o-barcode-status__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.o-barcode-status__dot--active {
  background: var(--o-success);
  box-shadow: 0 0 6px rgba(40, 167, 69, 0.5);
  animation: o-barcode-pulse 2s infinite;
}

.o-barcode-status__dot--inactive {
  background: var(--o-gray-400);
}

@keyframes o-barcode-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.o-barcode-status__text {
  font-size: 13px;
  color: var(--o-gray-700);
  font-weight: 500;
}

.o-barcode-status__prefix {
  font-size: 12px;
  color: var(--o-gray-500);
}

.o-barcode-status__prefix code {
  background: var(--o-gray-100);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
}

/* Manual Entry */
.o-barcode-manual {
  padding: 12px 16px;
  background: var(--o-view-background);
  border: 1px solid var(--o-border-color);
  border-radius: 8px;
  margin-bottom: 12px;
}

.o-barcode-manual__label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--o-gray-700);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.o-barcode-manual__row {
  display: flex;
  gap: 8px;
}

.o-barcode-manual__input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--o-border-color);
  border-radius: 6px;
  font-size: 14px;
  font-family: monospace;
  outline: none;
  transition: border-color 0.2s;
}

.o-barcode-manual__input:focus {
  border-color: var(--o-brand-primary, #0052A3);
  box-shadow: 0 0 0 3px rgba(0, 82, 163, 0.1);
}

.o-barcode-manual__submit {
  padding: 8px 16px;
  background: var(--o-brand-primary, #0052A3);
  color: var(--o-view-background);
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
}

.o-barcode-manual__submit:hover:not(:disabled) {
  opacity: 0.9;
}

.o-barcode-manual__submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* History */
.o-barcode-history {
  background: var(--o-view-background);
  border: 1px solid var(--o-border-color);
  border-radius: 8px;
  padding: 12px 16px;
}

.o-barcode-history__title {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--o-gray-900);
}

.o-barcode-history__count {
  font-weight: 400;
  color: var(--o-gray-500);
}

.o-barcode-history__empty {
  text-align: center;
  padding: 20px;
  color: var(--o-gray-500);
  font-size: 13px;
}

.o-barcode-history__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid var(--o-gray-100);
}

.o-barcode-history__item:last-child {
  border-bottom: none;
}

.o-barcode-history__barcode code {
  font-size: 13px;
  background: var(--o-gray-100);
  padding: 3px 8px;
  border-radius: 4px;
  color: var(--o-gray-900);
}

.o-barcode-history__meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.o-barcode-history__format {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  text-transform: uppercase;
}

.o-barcode-history__format--ean-13,
.o-barcode-history__format--ean-8 {
  background: var(--o-success-bg);
  color: var(--o-success);
}

.o-barcode-history__format--code128 {
  background: var(--o-info-bg);
  color: var(--o-info);
}

.o-barcode-history__format--qr {
  background: var(--o-warning-bg);
  color: var(--o-warning);
}

.o-barcode-history__format--unknown {
  background: var(--o-gray-100);
  color: var(--o-gray-500);
}

.o-barcode-history__time {
  font-size: 11px;
  color: var(--o-gray-400);
}
</style>
