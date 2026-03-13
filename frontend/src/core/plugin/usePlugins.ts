import { computed, shallowRef, triggerRef, onUnmounted } from 'vue'
import type { WmsColumnDef } from '@/core/datatable/types/table'
import type { ColumnPlugin, PagePlugin, FieldPlugin, PageRouteConfig } from './types'
import { pluginRegistry } from './PluginRegistry'

/**
 * Force a re-read from the plain-class PluginRegistry.
 *
 * Because PluginRegistry is not a Vue reactive object we keep a shallowRef
 * "version" counter.  Every time the registry changes we bump the counter
 * via `triggerRef` so that any `computed` that reads it will re-evaluate.
 */
const registryVersion = shallowRef(0)

function bumpVersion(): void {
  registryVersion.value += 1
  triggerRef(registryVersion)
}

// Subscribe once at module level so every consumer shares a single listener.
let subscribed = false

function ensureSubscribed(): void {
  if (subscribed) return
  subscribed = true
  pluginRegistry.addOnRegister(bumpVersion)
  pluginRegistry.addOnUnregister(bumpVersion)
}

/**
 * Returns computed column definitions gathered from all registered column plugins.
 * The columns are sorted by each config's `order` hint (lower first, default 0).
 */
export function useColumnPlugins() {
  ensureSubscribed()

  const columns = computed<WmsColumnDef[]>(() => {
    // Touch the version ref so Vue tracks the dependency.
    void registryVersion.value

    const columnPlugins = pluginRegistry.getColumnPlugins() as readonly ColumnPlugin[]

    return columnPlugins
      .flatMap((plugin) =>
        plugin.columns.map((cfg) => ({
          column: cfg.column,
          order: cfg.order ?? 0,
        })),
      )
      .sort((a, b) => a.order - b.order)
      .map((entry) => entry.column)
  })

  return columns
}

/**
 * Returns computed route definitions gathered from all registered page plugins.
 */
export function usePagePlugins() {
  ensureSubscribed()

  const routes = computed<readonly PageRouteConfig[]>(() => {
    void registryVersion.value

    const pagePlugins = pluginRegistry.getPagePlugins() as readonly PagePlugin[]

    return pagePlugins.flatMap((plugin) => plugin.routes)
  })

  return routes
}

/**
 * Returns computed field plugin definitions from all registered field plugins.
 */
export function useFieldPlugins() {
  ensureSubscribed()

  const fields = computed<readonly FieldPlugin[]>(() => {
    void registryVersion.value

    return pluginRegistry.getFieldPlugins() as readonly FieldPlugin[]
  })

  return fields
}

/**
 * Convenience composable that exposes all plugin accessors plus a manual
 * refresh handle for cases where external code mutates the registry without
 * going through the callback hooks.
 */
export function usePlugins() {
  ensureSubscribed()

  const columns = useColumnPlugins()
  const pages = usePagePlugins()
  const fields = useFieldPlugins()

  function refreshPlugins(): void {
    bumpVersion()
  }

  return {
    columns,
    pages,
    fields,
    refreshPlugins,
  }
}
