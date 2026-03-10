/**
 * Transform pipeline types - shared between frontend and backend
 */

export interface TransformContext {
  meta?: Record<string, any>
  fetchImpl?: typeof fetch
}

export interface TransformStep {
  id: string
  plugin: string
  params?: any
  enabled?: boolean
  onError?: { mode: 'fail' | 'fallback' | 'skip'; value?: any }
}

export interface TransformPipeline {
  steps: TransformStep[]
}

export type InputSource =
  | { id: string; type: 'column'; column: string; pipeline?: TransformPipeline }
  | { id: string; type: 'literal'; value: any; pipeline?: TransformPipeline }
  | { id: string; type: 'generated'; generator: 'now' | 'uuid' | string; generatorParams?: any; pipeline?: TransformPipeline }

export interface CombineConfig {
  plugin: string
  params?: any
}

export interface TransformMapping {
  targetField: string
  inputs: InputSource[]
  combine: CombineConfig
  outputPipeline?: TransformPipeline
  required?: boolean
  defaultValue?: any
  meta?: Record<string, any>
}
