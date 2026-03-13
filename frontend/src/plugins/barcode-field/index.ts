import { defineAsyncComponent } from 'vue'
import type { FieldPlugin } from '@/core/plugin'

/**
 * バーコードフィールドプラグイン
 *
 * フォームエンジンでバーコード入力・スキャンフィールドを使用可能にする。
 */
export const barcodeFieldPlugin: FieldPlugin<string> = {
  id: 'barcode-field',
  name: 'バーコードフィールド',
  version: '1.0.0',
  type: 'field',
  description: 'バーコードスキャン・手入力対応フィールド',
  field: {
    component: defineAsyncComponent(
      () => import('./BarcodeFieldInput.vue'),
    ),
    defaultValue: '',
    rules: ['required'],
    props: {
      placeholder: 'バーコードをスキャンまたは入力',
    },
  },
}
