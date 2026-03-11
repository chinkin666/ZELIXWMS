import { ref, type Ref } from 'vue'
import { messages } from '../i18n'

interface I18nMessages {
  [key: string]: string | I18nMessages
}

type Locale = 'en' | 'zh' | 'ja'

interface LocaleOption {
  readonly code: Locale
  readonly label: string
  readonly flag: string
}

const STORAGE_KEY = 'wms_locale'
const DEFAULT_LOCALE: Locale = 'ja'

function getStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'en' || stored === 'zh' || stored === 'ja') {
      return stored
    }
  } catch {
    // localStorage unavailable
  }
  return DEFAULT_LOCALE
}

// Module-level reactive ref — shared across all consumers
const locale: Ref<Locale> = ref(getStoredLocale())

const availableLocales: readonly LocaleOption[] = [
  { code: 'en', label: 'English', flag: 'EN' },
  { code: 'zh', label: '中文', flag: '中' },
  { code: 'ja', label: '日本語', flag: 'JA' },
] as const

function resolveKey(obj: I18nMessages, path: string): string | undefined {
  const keys = path.split('.')
  let current: I18nMessages | string = obj

  for (const key of keys) {
    if (typeof current !== 'object' || current === null) {
      return undefined
    }
    current = current[key] as I18nMessages | string
    if (current === undefined) {
      return undefined
    }
  }

  return typeof current === 'string' ? current : undefined
}

function interpolate(template: string, params: Record<string, string | number>): string {
  return Object.entries(params).reduce(
    (result, [key, value]) => result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value)),
    template,
  )
}

function t(key: string, params?: Record<string, string | number> | string): string {
  const currentMessages = messages[locale.value] as I18nMessages
  const resolved = resolveKey(currentMessages, key)

  const recordParams = typeof params === 'object' ? params : undefined
  const fallbackStr = typeof params === 'string' ? params : undefined

  if (resolved === undefined) {
    // Fallback to English
    const fallback = resolveKey(messages.en as I18nMessages, key)
    if (fallback === undefined) {
      return fallbackStr ?? key
    }
    return recordParams ? interpolate(fallback, recordParams) : fallback
  }

  return recordParams ? interpolate(resolved, recordParams) : resolved
}

function setLocale(newLocale: Locale): void {
  locale.value = newLocale
  try {
    localStorage.setItem(STORAGE_KEY, newLocale)
  } catch {
    // localStorage unavailable
  }
}

export function useI18n() {
  return {
    locale,
    t,
    setLocale,
    availableLocales,
  } as const
}
