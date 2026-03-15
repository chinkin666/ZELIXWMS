import { createI18n } from 'vue-i18n'
import zh from './zh'
import ja from './ja'
import en from './en'

export const i18n = createI18n({
  legacy: false,
  locale: localStorage.getItem('portal_lang') || 'ja',
  fallbackLocale: 'en',
  messages: { zh, ja, en },
})
