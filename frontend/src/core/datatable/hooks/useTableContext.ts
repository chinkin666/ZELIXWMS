import { inject, provide, type InjectionKey, type Ref } from 'vue'
import type { WmsColumnDef } from '../types/table'

export interface WmsTableContext {
  /** 當前可見列 */
  columns: Ref<WmsColumnDef[]>
}

const TABLE_CONTEXT_KEY: InjectionKey<WmsTableContext> = Symbol('WmsTableContext')

export function provideTableContext(ctx: WmsTableContext) {
  provide(TABLE_CONTEXT_KEY, ctx)
}

export function useTableContext(): WmsTableContext {
  const ctx = inject(TABLE_CONTEXT_KEY)
  if (!ctx) {
    throw new Error('useTableContext must be used within a WmsDataTable')
  }
  return ctx
}
