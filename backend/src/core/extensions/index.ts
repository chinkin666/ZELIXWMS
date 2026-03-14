/**
 * 扩展系统公共导出 / 拡張システム公開エクスポート
 */

export { extensionManager } from './extensionManager';
export { HookManager } from './hookManager';
export { PluginManager } from './pluginManager';
export { CustomFieldService } from './customFieldService';
export { FeatureFlagService } from './featureFlagService';
export { HOOK_EVENTS } from './types';
export type {
  HookEventName,
  HookContext,
  HookHandlerFn,
  HookHandlerOptions,
  EmitOptions,
} from './types';
