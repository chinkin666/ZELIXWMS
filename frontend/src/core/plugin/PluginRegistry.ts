import type {
  WmsPlugin,
  WmsPluginBase,
  PluginType,
  FieldPlugin,
  ColumnPlugin,
  PagePlugin,
  WorkflowPlugin,
  IntegrationPlugin,
} from './types'

type RegistryCallback = (plugin: WmsPlugin) => void

interface PluginTypeMap {
  field: FieldPlugin
  column: ColumnPlugin
  page: PagePlugin
  workflow: WorkflowPlugin
  integration: IntegrationPlugin
}

const REQUIRED_FIELDS: readonly (keyof WmsPluginBase)[] = ['id', 'name', 'version', 'type'] as const
const VALID_TYPES: readonly PluginType[] = ['field', 'column', 'page', 'workflow', 'integration'] as const

class PluginRegistry {
  private readonly plugins: Map<string, WmsPlugin> = new Map()
  private readonly onRegisterCallbacks: RegistryCallback[] = []
  private readonly onUnregisterCallbacks: RegistryCallback[] = []

  get onRegister(): readonly RegistryCallback[] {
    return [...this.onRegisterCallbacks]
  }

  get onUnregister(): readonly RegistryCallback[] {
    return [...this.onUnregisterCallbacks]
  }

  addOnRegister(callback: RegistryCallback): void {
    this.onRegisterCallbacks.push(callback)
  }

  addOnUnregister(callback: RegistryCallback): void {
    this.onUnregisterCallbacks.push(callback)
  }

  removeOnRegister(callback: RegistryCallback): void {
    const index = this.onRegisterCallbacks.indexOf(callback)
    if (index !== -1) {
      this.onRegisterCallbacks.splice(index, 1)
    }
  }

  removeOnUnregister(callback: RegistryCallback): void {
    const index = this.onUnregisterCallbacks.indexOf(callback)
    if (index !== -1) {
      this.onUnregisterCallbacks.splice(index, 1)
    }
  }

  register(plugin: WmsPlugin): void {
    this.validatePlugin(plugin)

    if (this.plugins.has(plugin.id)) {
      // プラグインID重複のため登録スキップ / Skipping duplicate plugin registration
      return
    }

    this.plugins.set(plugin.id, plugin)
    this.onRegisterCallbacks.forEach((cb) => cb(plugin))
  }

  unregister(pluginId: string): void {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      return
    }

    this.plugins.delete(pluginId)
    this.onUnregisterCallbacks.forEach((cb) => cb(plugin))
  }

  getPlugin(id: string): WmsPlugin | undefined {
    const plugin = this.plugins.get(id)
    return plugin ? { ...plugin } : undefined
  }

  getPlugins(): readonly WmsPlugin[]
  getPlugins<T extends PluginType>(type: T): readonly PluginTypeMap[T][]
  getPlugins(type?: PluginType): readonly WmsPlugin[] {
    const all = Array.from(this.plugins.values())
    const filtered = type ? all.filter((p) => p.type === type) : all
    return filtered.map((p) => ({ ...p }))
  }

  getColumnPlugins(): readonly ColumnPlugin[] {
    return this.getPlugins('column')
  }

  getPagePlugins(): readonly PagePlugin[] {
    return this.getPlugins('page')
  }

  getFieldPlugins(): readonly FieldPlugin[] {
    return this.getPlugins('field')
  }

  getWorkflowPlugins(): readonly WorkflowPlugin[] {
    return this.getPlugins('workflow')
  }

  getIntegrationPlugins(): readonly IntegrationPlugin[] {
    return this.getPlugins('integration')
  }

  async loadAll(): Promise<void> {
    const plugins = Array.from(this.plugins.values())
    for (const plugin of plugins) {
      if (plugin.install) {
        await plugin.install()
      }
    }
  }

  private validatePlugin(plugin: WmsPlugin): void {
    for (const field of REQUIRED_FIELDS) {
      if (!plugin[field]) {
        throw new Error(
          `[PluginRegistry] Plugin is missing required field "${field}".`,
        )
      }
    }

    if (!VALID_TYPES.includes(plugin.type)) {
      throw new Error(
        `[PluginRegistry] Plugin "${plugin.id}" has invalid type "${plugin.type}". Must be one of: ${VALID_TYPES.join(', ')}.`,
      )
    }
  }
}

export const pluginRegistry = new PluginRegistry()
export { PluginRegistry }
