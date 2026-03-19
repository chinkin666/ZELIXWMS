/**
 * definePlugin 单元测试 / definePlugin ユニットテスト
 */

import { describe, it, expect } from 'vitest';
import { definePlugin } from '../src/definePlugin';

describe('definePlugin', () => {
  const validManifest = {
    name: 'test-plugin',
    version: '1.0.0',
    description: 'Test',
    author: 'Test',
    hooks: ['order.created' as const],
    permissions: [],
  };

  it('should return valid plugin definition / 有効なプラグイン定義を返すこと', () => {
    const plugin = definePlugin({
      manifest: validManifest,
      async install() {},
    });
    expect(plugin.manifest.name).toBe('test-plugin');
    expect(plugin.install).toBeTypeOf('function');
  });

  it('should throw on missing manifest / manifest 未指定でエラーになること', () => {
    expect(() => definePlugin({ manifest: null as any, async install() {} })).toThrow('manifest is required');
  });

  it('should throw on missing name / name 未指定でエラーになること', () => {
    expect(() => definePlugin({
      manifest: { ...validManifest, name: '' },
      async install() {},
    })).toThrow('manifest.name is required');
  });

  it('should throw on non-kebab-case name / kebab-case 以外でエラーになること', () => {
    expect(() => definePlugin({
      manifest: { ...validManifest, name: 'TestPlugin' },
      async install() {},
    })).toThrow('kebab-case');
  });

  it('should throw on missing version / version 未指定でエラーになること', () => {
    expect(() => definePlugin({
      manifest: { ...validManifest, version: '' },
      async install() {},
    })).toThrow('manifest.version is required');
  });

  it('should throw on missing hooks / hooks 未指定でエラーになること', () => {
    expect(() => definePlugin({
      manifest: { ...validManifest, hooks: null as any },
      async install() {},
    })).toThrow('manifest.hooks must be an array');
  });

  it('should throw on missing install / install 未指定でエラーになること', () => {
    expect(() => definePlugin({
      manifest: validManifest,
      install: null as any,
    })).toThrow('install function is required');
  });

  it('should accept optional uninstall and healthCheck / オプションの uninstall と healthCheck を受け付けること', () => {
    const plugin = definePlugin({
      manifest: validManifest,
      async install() {},
      async uninstall() {},
      async healthCheck() { return { healthy: true }; },
    });
    expect(plugin.uninstall).toBeTypeOf('function');
    expect(plugin.healthCheck).toBeTypeOf('function');
  });
});
