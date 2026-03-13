import type { Component } from 'vue'
import type { WmsColumnDef } from '@/core/datatable/types/table'

// ---------------------------------------------------------------------------
// Plugin type discriminator
// ---------------------------------------------------------------------------

export type PluginType = 'field' | 'column' | 'page' | 'workflow' | 'integration'

// ---------------------------------------------------------------------------
// Base metadata shared by every plugin
// ---------------------------------------------------------------------------

export interface PluginMeta {
  readonly id: string
  readonly name: string
  readonly version: string
  readonly type: PluginType
  readonly description?: string
  readonly dependencies?: readonly string[]
  /** Called once when the plugin is loaded via PluginRegistry.loadAll(). */
  readonly install?: () => void | Promise<void>
}

// ---------------------------------------------------------------------------
// Field plugin – registers a custom form-field component
// ---------------------------------------------------------------------------

export interface FieldPluginConfig<TValue = unknown> {
  /** The Vue component rendered for this field. */
  readonly component: Component
  /** Default value used when the field is first mounted. */
  readonly defaultValue?: TValue
  /** Optional list of built-in validation rule names. */
  readonly rules?: readonly string[]
  /** Props forwarded to the component at render time. */
  readonly props?: Readonly<Record<string, unknown>>
}

export interface FieldPlugin<TValue = unknown> extends PluginMeta {
  readonly type: 'field'
  readonly field: FieldPluginConfig<TValue>
}

// ---------------------------------------------------------------------------
// Column plugin – extends WmsColumnDef with plugin metadata
// ---------------------------------------------------------------------------

export interface ColumnPluginConfig<T = any> {
  /** Column definition compatible with the existing datatable system. */
  readonly column: WmsColumnDef<T>
  /**
   * Optional target table identifier.
   * When specified the column is only injected into matching tables.
   */
  readonly target?: string
  /** Insertion order hint – lower numbers appear first. */
  readonly order?: number
}

export interface ColumnPlugin<T = any> extends PluginMeta {
  readonly type: 'column'
  readonly columns: readonly ColumnPluginConfig<T>[]
}

// ---------------------------------------------------------------------------
// Page plugin – registers one or more routes
// ---------------------------------------------------------------------------

export interface PageRouteMeta {
  readonly title: string
  readonly [key: string]: unknown
}

export interface PageRouteConfig {
  readonly path: string
  readonly component: Component | (() => Promise<Component>)
  readonly meta: PageRouteMeta
  /** Optional nested child routes. */
  readonly children?: readonly PageRouteConfig[]
}

export interface PagePlugin extends PluginMeta {
  readonly type: 'page'
  readonly routes: readonly PageRouteConfig[]
}

// ---------------------------------------------------------------------------
// Workflow plugin – defines a sequence of steps
// ---------------------------------------------------------------------------

export interface WorkflowStep<TInput = unknown, TOutput = unknown> {
  readonly id: string
  readonly name: string
  readonly description?: string
  /**
   * Execute the step.
   * Receives the accumulated context and returns updated output.
   */
  readonly execute: (input: TInput) => TOutput | Promise<TOutput>
  /** Optional guard that decides whether the step should run. */
  readonly canExecute?: (input: TInput) => boolean | Promise<boolean>
}

export interface WorkflowPluginConfig<TInput = unknown, TOutput = unknown> {
  readonly steps: readonly WorkflowStep<TInput, TOutput>[]
  /** When true the workflow can be re-entered after completion. */
  readonly repeatable?: boolean
}

export interface WorkflowPlugin<TInput = unknown, TOutput = unknown> extends PluginMeta {
  readonly type: 'workflow'
  readonly workflow: WorkflowPluginConfig<TInput, TOutput>
}

// ---------------------------------------------------------------------------
// Integration plugin – registers an external service adapter
// ---------------------------------------------------------------------------

export interface IntegrationAdapter<TConfig = unknown> {
  /** Initialise the adapter with service-specific configuration. */
  readonly init: (config: TConfig) => void | Promise<void>
  /** Tear down resources held by the adapter. */
  readonly destroy?: () => void | Promise<void>
  /** Health-check / connectivity probe. */
  readonly healthCheck?: () => boolean | Promise<boolean>
}

export interface IntegrationPluginConfig<TConfig = unknown> {
  readonly adapter: IntegrationAdapter<TConfig>
  /** Base URL or endpoint for the external service. */
  readonly endpoint?: string
  /** Default headers attached to outbound requests. */
  readonly headers?: Readonly<Record<string, string>>
}

export interface IntegrationPlugin<TConfig = unknown> extends PluginMeta {
  readonly type: 'integration'
  readonly integration: IntegrationPluginConfig<TConfig>
}

// ---------------------------------------------------------------------------
// Discriminated union of all plugin definitions
// ---------------------------------------------------------------------------

export type PluginDefinition =
  | FieldPlugin
  | ColumnPlugin
  | PagePlugin
  | WorkflowPlugin
  | IntegrationPlugin

// ---------------------------------------------------------------------------
// Utility types
// ---------------------------------------------------------------------------

/** Extract the plugin definition that matches a given PluginType literal. */
export type PluginOfType<T extends PluginType> = Extract<PluginDefinition, { readonly type: T }>

/** Convenience alias used by PluginRegistry class. */
export type WmsPlugin = PluginDefinition

/** Convenience alias for base metadata. */
export type WmsPluginBase = PluginMeta
