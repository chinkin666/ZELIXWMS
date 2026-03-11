import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MenuConfig {
  readonly id: string
  readonly label: string
  readonly icon: string
  readonly children: readonly MenuConfig[]
  readonly visible: boolean
  readonly order: number
  readonly permissions: readonly string[]
}

export interface ColumnConfig {
  readonly id: string
  readonly label: string
  readonly field: string
  readonly width?: number
  readonly sortable?: boolean
  readonly filterable?: boolean
  readonly visible: boolean
  readonly order: number
}

export interface TableConfig {
  readonly id: string
  readonly columns: readonly ColumnConfig[]
  readonly sortable: boolean
  readonly filterable: boolean
  readonly pagination: {
    readonly enabled: boolean
    readonly pageSize: number
    readonly pageSizes: readonly number[]
  }
  readonly actions: readonly string[]
}

export interface ComponentConfig {
  readonly id: string
  readonly type: string
  readonly props?: Readonly<Record<string, unknown>>
  readonly order: number
}

export interface PageConfig {
  readonly id: string
  readonly menuId: string
  readonly layout: 'default' | 'split' | 'tabs' | 'dashboard'
  readonly components: readonly ComponentConfig[]
  readonly tableId?: string
}

export interface ActionConfig {
  readonly id: string
  readonly type: 'upload' | 'print' | 'api' | 'export' | 'custom'
  readonly label: string
  readonly icon: string
  readonly handler: string
  readonly permissions: readonly string[]
  readonly context?: readonly string[]
}

export interface EnvironmentConfig {
  readonly id: string
  readonly name: string
  readonly warehouse: string
  readonly menus: readonly MenuConfig[]
  readonly tables: readonly TableConfig[]
  readonly pages: readonly PageConfig[]
  readonly actions: readonly ActionConfig[]
}

export interface WmsConfig {
  readonly menus: readonly MenuConfig[]
  readonly tables: readonly TableConfig[]
  readonly pages: readonly PageConfig[]
  readonly actions: readonly ActionConfig[]
}

/** User-level overrides are partial so they merge on top of env config. */
export interface UserConfigOverrides {
  readonly menus?: readonly Partial<MenuConfig>[]
  readonly tables?: readonly Partial<TableConfig>[]
  readonly pages?: readonly Partial<PageConfig>[]
  readonly actions?: readonly Partial<ActionConfig>[]
}

// ---------------------------------------------------------------------------
// Storage Adapter
// ---------------------------------------------------------------------------

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
}

function createLocalStorageAdapter(): StorageAdapter {
  return {
    async getItem(key: string): Promise<string | null> {
      try {
        return localStorage.getItem(key)
      } catch {
        console.error(`[WmsConfigStore] Failed to read key "${key}" from localStorage`)
        return null
      }
    },
    async setItem(key: string, value: string): Promise<void> {
      try {
        localStorage.setItem(key, value)
      } catch {
        console.error(`[WmsConfigStore] Failed to write key "${key}" to localStorage`)
      }
    },
    async removeItem(key: string): Promise<void> {
      try {
        localStorage.removeItem(key)
      } catch {
        console.error(`[WmsConfigStore] Failed to remove key "${key}" from localStorage`)
      }
    },
  }
}

// ---------------------------------------------------------------------------
// Base (default) configuration
// ---------------------------------------------------------------------------

function createBaseMenus(): MenuConfig[] {
  return [
    {
      id: 'receiving',
      label: '入庫管理',
      icon: 'mdi-package-down',
      children: [],
      visible: true,
      order: 1,
      permissions: ['receiving.view'],
    },
    {
      id: 'inventory',
      label: '在庫管理',
      icon: 'mdi-warehouse',
      children: [],
      visible: true,
      order: 2,
      permissions: ['inventory.view'],
    },
    {
      id: 'orders',
      label: '受注管理',
      icon: 'mdi-clipboard-list',
      children: [],
      visible: true,
      order: 3,
      permissions: ['orders.view'],
    },
    {
      id: 'shipping',
      label: '出荷管理',
      icon: 'mdi-truck-delivery',
      children: [],
      visible: true,
      order: 4,
      permissions: ['shipping.view'],
    },
    {
      id: 'returns',
      label: '返品管理',
      icon: 'mdi-package-variant-closed-minus',
      children: [],
      visible: true,
      order: 5,
      permissions: ['returns.view'],
    },
    {
      id: 'stocktaking',
      label: '棚卸管理',
      icon: 'mdi-counter',
      children: [],
      visible: true,
      order: 6,
      permissions: ['stocktaking.view'],
    },
    {
      id: 'daily',
      label: '日次管理',
      icon: 'mdi-calendar-check',
      children: [],
      visible: true,
      order: 7,
      permissions: ['daily.view'],
    },
    {
      id: 'billing',
      label: '請求管理',
      icon: 'mdi-receipt-text',
      children: [],
      visible: true,
      order: 8,
      permissions: ['billing.view'],
    },
    {
      id: 'settings',
      label: '設定管理',
      icon: 'mdi-cog',
      children: [],
      visible: true,
      order: 9,
      permissions: ['settings.view'],
    },
  ]
}

function createBaseConfig(): WmsConfig {
  return {
    menus: createBaseMenus(),
    tables: [],
    pages: [],
    actions: [],
  }
}

// ---------------------------------------------------------------------------
// Merge helpers (immutable)
// ---------------------------------------------------------------------------

function mergeMenus(
  base: readonly MenuConfig[],
  overrides: readonly Partial<MenuConfig>[],
): MenuConfig[] {
  const overrideMap = new Map(
    overrides.filter((o) => o.id).map((o) => [o.id, o]),
  )

  const merged = base.map((menu): MenuConfig => {
    const override = overrideMap.get(menu.id)
    if (!override) return menu

    const children =
      override.children !== undefined
        ? mergeMenus(menu.children, override.children as Partial<MenuConfig>[])
        : [...menu.children]

    return {
      ...menu,
      ...override,
      children,
      permissions: override.permissions ?? menu.permissions,
    } as MenuConfig
  })

  // Append menus that exist only in overrides
  const baseIds = new Set(base.map((m) => m.id))
  for (const override of overrides) {
    if (override.id && !baseIds.has(override.id)) {
      merged.push({
        id: override.id,
        label: override.label ?? '',
        icon: override.icon ?? '',
        children: (override.children ?? []) as MenuConfig[],
        visible: override.visible ?? true,
        order: override.order ?? merged.length + 1,
        permissions: override.permissions ?? [],
      })
    }
  }

  return merged.sort((a, b) => a.order - b.order)
}

function mergeById<T extends { readonly id: string }>(
  base: readonly T[],
  overrides: readonly Partial<T>[],
): T[] {
  const overrideMap = new Map(
    overrides.filter((o) => (o as { id?: string }).id).map((o) => [(o as { id: string }).id, o]),
  )

  const merged = base.map((item): T => {
    const override = overrideMap.get(item.id)
    if (!override) return item
    return { ...item, ...override } as T
  })

  const baseIds = new Set(base.map((item) => item.id))
  for (const override of overrides) {
    const oid = (override as { id?: string }).id
    if (oid && !baseIds.has(oid)) {
      merged.push(override as T)
    }
  }

  return merged
}

function mergeConfigs(
  base: WmsConfig,
  env: Partial<WmsConfig>,
  user: UserConfigOverrides,
): WmsConfig {
  // Layer 1 + 2: base + environment
  const envMenus = env.menus
    ? mergeMenus(base.menus, env.menus as Partial<MenuConfig>[])
    : [...base.menus]
  const envTables = env.tables
    ? mergeById(base.tables, env.tables as Partial<TableConfig>[])
    : [...base.tables]
  const envPages = env.pages
    ? mergeById(base.pages, env.pages as Partial<PageConfig>[])
    : [...base.pages]
  const envActions = env.actions
    ? mergeById(base.actions, env.actions as Partial<ActionConfig>[])
    : [...base.actions]

  // Layer 2 + 3: environment + user
  const finalMenus = user.menus ? mergeMenus(envMenus, user.menus) : envMenus
  const finalTables = user.tables ? mergeById(envTables, user.tables) : envTables
  const finalPages = user.pages ? mergeById(envPages, user.pages) : envPages
  const finalActions = user.actions ? mergeById(envActions, user.actions) : envActions

  return {
    menus: finalMenus,
    tables: finalTables,
    pages: finalPages,
    actions: finalActions,
  }
}

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const STORAGE_PREFIX = 'wms_config'

function envKey(envId: string): string {
  return `${STORAGE_PREFIX}:env:${envId}`
}

function userKey(envId: string): string {
  return `${STORAGE_PREFIX}:user:${envId}`
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useWmsConfigStore = defineStore('wmsConfig', () => {
  // State ---------------------------------------------------------------
  const storage = ref<StorageAdapter>(createLocalStorageAdapter())
  const baseConfig = ref<WmsConfig>(createBaseConfig())
  const currentEnvId = ref<string | null>(null)
  const envConfig = ref<Partial<WmsConfig>>({})
  const userConfig = ref<UserConfigOverrides>({})
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Derived (resolved) config -------------------------------------------
  const resolvedConfig = computed<WmsConfig>(() =>
    mergeConfigs(baseConfig.value, envConfig.value, userConfig.value),
  )

  // Getters -------------------------------------------------------------
  const menuTree = computed<readonly MenuConfig[]>(() =>
    resolvedConfig.value.menus.filter((m) => m.visible),
  )

  function getTableConfig(tableId: string): TableConfig | undefined {
    return resolvedConfig.value.tables.find((t) => t.id === tableId)
  }

  function getPageConfig(pageId: string): PageConfig | undefined {
    return resolvedConfig.value.pages.find((p) => p.id === pageId)
  }

  function getActions(context: string): readonly ActionConfig[] {
    return resolvedConfig.value.actions.filter(
      (a) => !a.context || a.context.includes(context),
    )
  }

  // Actions -------------------------------------------------------------

  async function loadConfig(envId: string): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const envRaw = await storage.value.getItem(envKey(envId))
      const userRaw = await storage.value.getItem(userKey(envId))

      envConfig.value = envRaw ? (JSON.parse(envRaw) as Partial<WmsConfig>) : {}
      userConfig.value = userRaw ? (JSON.parse(userRaw) as UserConfigOverrides) : {}
      currentEnvId.value = envId
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      error.value = `Failed to load config for environment "${envId}": ${message}`
      console.error(`[WmsConfigStore] ${error.value}`)
    } finally {
      loading.value = false
    }
  }

  async function saveEnvConfig(
    envId: string,
    config: Partial<WmsConfig>,
  ): Promise<void> {
    loading.value = true
    error.value = null

    try {
      await storage.value.setItem(envKey(envId), JSON.stringify(config))

      if (envId === currentEnvId.value) {
        envConfig.value = config
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      error.value = `Failed to save env config for "${envId}": ${message}`
      console.error(`[WmsConfigStore] ${error.value}`)
    } finally {
      loading.value = false
    }
  }

  async function saveUserConfig(
    envId: string,
    config: UserConfigOverrides,
  ): Promise<void> {
    loading.value = true
    error.value = null

    try {
      await storage.value.setItem(userKey(envId), JSON.stringify(config))

      if (envId === currentEnvId.value) {
        userConfig.value = config
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      error.value = `Failed to save user config for "${envId}": ${message}`
      console.error(`[WmsConfigStore] ${error.value}`)
    } finally {
      loading.value = false
    }
  }

  async function saveConfig(
    envId: string,
    config: {
      env?: Partial<WmsConfig>
      user?: UserConfigOverrides
    },
  ): Promise<void> {
    if (config.env) {
      await saveEnvConfig(envId, config.env)
    }
    if (config.user) {
      await saveUserConfig(envId, config.user)
    }
  }

  function setStorageAdapter(adapter: StorageAdapter): void {
    storage.value = adapter
  }

  function getMenuTree(): readonly MenuConfig[] {
    return menuTree.value
  }

  // Reset ---------------------------------------------------------------

  function $reset(): void {
    currentEnvId.value = null
    envConfig.value = {}
    userConfig.value = {}
    loading.value = false
    error.value = null
    baseConfig.value = createBaseConfig()
    storage.value = createLocalStorageAdapter()
  }

  return {
    // State
    currentEnvId,
    baseConfig,
    envConfig,
    userConfig,
    loading,
    error,

    // Computed
    resolvedConfig,
    menuTree,

    // Getters
    getTableConfig,
    getPageConfig,
    getActions,
    getMenuTree,

    // Actions
    loadConfig,
    saveConfig,
    saveEnvConfig,
    saveUserConfig,
    setStorageAdapter,
    $reset,

    // Expose merge utility for external use
    mergeConfigs,
  }
})
