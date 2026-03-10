import { z } from 'zod';

export type ValueKind = 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'json' | 'any';

export interface TransformContext {
  /** Arbitrary per-run context (e.g., tenantId, rowIndex, sample row). */
  meta?: Record<string, any>;
  /** Optional fetch implementation override (for http plugins). */
  fetchImpl?: typeof fetch;
}

export type OnErrorMode = 'fail' | 'fallback' | 'skip';

export interface OnErrorBehavior {
  mode: OnErrorMode;
  value?: any;
}

export interface TransformStep<P = any> {
  id: string;
  plugin: string;
  params?: P;
  enabled?: boolean;
  onError?: OnErrorBehavior;
}

export interface TransformPipeline {
  steps: TransformStep[];
}

export type InputSource =
  | {
      id: string;
      type: 'column';
      column: string;
      pipeline?: TransformPipeline;
    }
  | {
      id: string;
      type: 'literal';
      value: any;
      pipeline?: TransformPipeline;
    }
  | {
      id: string;
      type: 'generated';
      generator: 'now' | 'uuid' | string;
      generatorParams?: Record<string, any>;
      pipeline?: TransformPipeline;
    };

export interface CombineConfig<P = any> {
  plugin: string;
  params?: P;
}

export interface TransformMapping {
  /** Target database field path (e.g., parties.recipient.name). */
  targetField: string;
  /** Inputs that will be processed individually then combined. */
  inputs: InputSource[];
  /** How to combine multiple processed inputs into a single value. */
  combine: CombineConfig;
  /** Optional post-combine pipeline (e.g., final formatting/validation). */
  outputPipeline?: TransformPipeline;
  /** Whether this field is required after transformation. */
  required?: boolean;
  /** Default value if result is empty/undefined. */
  defaultValue?: any;
  /** Optional metadata for UI. */
  meta?: Record<string, any>;
}

export interface TransformPluginRunArgs<P = any> {
  value: any;
  params: P;
  context: TransformContext;
}

/**
 * TransformPlugin 元数据定义（仅用于类型验证和 API 返回）
 * 实际的转换逻辑在前端实现
 */
export interface TransformPlugin<P = any> {
  name: string;
  nameJa?: string; // 日文名称（用于前端显示）
  summary?: string;
  inputKinds?: ValueKind[];
  outputKind?: ValueKind;
  /** 最终输出值的类型 */
  outputType?: ValueKind;
  /** 日语描述 */
  descriptionJa?: string;
  paramsSchema?: z.ZodTypeAny;
  sideEffects?: 'none' | 'network';
  // 注意：run 方法已移除，转换逻辑在前端实现
}

/**
 * CombinePlugin 元数据定义（仅用于类型验证和 API 返回）
 * 实际的组合逻辑在前端实现
 */
export interface CombinePlugin<P = any> {
  name: string;
  nameJa?: string; // 日文名称（用于前端显示）
  summary?: string;
  paramsSchema?: z.ZodTypeAny;
  // 注意：run 方法已移除，组合逻辑在前端实现
}


