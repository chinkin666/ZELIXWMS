#!/usr/bin/env node

/**
 * zelix-plugin CLI — 插件脚手架工具 / プラグインスキャフォールドツール
 *
 * 用法 / 使い方:
 *   zelix-plugin create <name>         创建新插件 / 新規プラグインを作成
 *   zelix-plugin validate <dir>        校验插件目录 / プラグインディレクトリをバリデーション
 *
 * @example
 *   zelix-plugin create my-carrier
 *   zelix-plugin create inventory-sync --hooks order.shipped,inventory.changed
 */

import fs from 'fs';
import path from 'path';

const TEMPLATE_DIR = path.resolve(__dirname, '../../templates/plugin');

// ─── 命令解析 / コマンドパース ───

const [, , command, ...args] = process.argv;

function printUsage(): void {
  console.log(`
zelix-plugin — ZELIX WMS Plugin SDK CLI

Commands:
  create <name>                  创建新插件 / 新規プラグインを作成
    --hooks <events>             Hook 事件（逗号分隔）/ Hook イベント（カンマ区切り）
    --author <name>              作者名 / 作者名
    --dir <path>                 输出目录（默认 extensions/plugins/）/ 出力ディレクトリ

  validate <dir>                 校验插件目录 / プラグインディレクトリをバリデーション
`);
}

// ─── 参数解析 / 引数パース ───

function parseArgs(rawArgs: string[]): { positional: string[]; flags: Record<string, string> } {
  const positional: string[] = [];
  const flags: Record<string, string> = {};

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = rawArgs[i + 1] && !rawArgs[i + 1].startsWith('--') ? rawArgs[++i] : 'true';
      flags[key] = value;
    } else {
      positional.push(arg);
    }
  }

  return { positional, flags };
}

// ─── create 命令 / create コマンド ───

function create(rawArgs: string[]): void {
  const { positional, flags } = parseArgs(rawArgs);
  const name = positional[0];

  if (!name) {
    console.error('Error: Plugin name is required / プラグイン名は必須です');
    console.error('Usage: zelix-plugin create <name>');
    process.exit(1);
  }

  // 校验名称格式 / 名前フォーマットを検証
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    console.error(`Error: Plugin name must be kebab-case: "${name}"`);
    process.exit(1);
  }

  const hooks = flags.hooks ? flags.hooks.split(',').map((h) => h.trim()) : ['order.created'];
  const author = flags.author || 'ZELIX';
  const baseDir = flags.dir || path.resolve(process.cwd(), 'extensions/plugins');
  const pluginDir = path.join(baseDir, name);

  // 检查目录是否已存在 / ディレクトリが既に存在するか確認
  if (fs.existsSync(pluginDir)) {
    console.error(`Error: Directory already exists: ${pluginDir}`);
    process.exit(1);
  }

  console.log(`Creating plugin: ${name}`);
  console.log(`  Directory: ${pluginDir}`);
  console.log(`  Hooks: ${hooks.join(', ')}`);
  console.log(`  Author: ${author}`);
  console.log('');

  // 创建目录 / ディレクトリを作成
  fs.mkdirSync(pluginDir, { recursive: true });
  fs.mkdirSync(path.join(pluginDir, '__tests__'), { recursive: true });

  // 生成 manifest.json / manifest.json を生成
  const manifest = {
    name,
    version: '1.0.0',
    description: `${name} plugin for ZELIX WMS`,
    author,
    hooks,
    permissions: [],
    config: {
      enabled: {
        type: 'boolean',
        default: true,
        description: `Enable/disable ${name} plugin`,
      },
    },
    sdkVersion: '1.0.0',
  };
  fs.writeFileSync(
    path.join(pluginDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );

  // 生成 index.ts / index.ts を生成
  const hooksImport = hooks.map((h) => {
    const constName = h.replace('.', '_').toUpperCase();
    return `HOOK_EVENTS.${constName}`;
  });

  const hookRegistrations = hooks.map((h) => {
    const constName = h.replace('.', '_').toUpperCase();
    return `    // 注册 Hook: ${h} / Hook 登録: ${h}
    ctx.registerHook(
      HOOK_EVENTS.${constName},
      guardEnabled(ctx, async (hookCtx, config) => {
        ctx.logger.info(
          { event: hookCtx.event, payload: hookCtx.payload },
          '[${name}] Event received / イベント受信',
        );
        // TODO: 实现业务逻辑 / ビジネスロジックを実装
      }),
      { priority: 50, async: true },
    );`;
  }).join('\n\n');

  const indexTs = `/**
 * ${name} 插件入口 / ${name} プラグインエントリポイント
 *
 * @packageDocumentation
 */

import { definePlugin, HOOK_EVENTS, guardEnabled } from '@zelix/plugin-sdk';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const manifest = require('./manifest.json');

export default definePlugin({
  manifest,

  async install(ctx) {
${hookRegistrations}

    ctx.logger.info('${name} plugin installed / ${name} プラグインインストール完了');
  },

  async uninstall() {
    // 清理资源 / リソースクリーンアップ
  },

  async healthCheck() {
    return { healthy: true };
  },
});
`;
  fs.writeFileSync(path.join(pluginDir, 'index.ts'), indexTs);

  // 生成测试文件 / テストファイルを生成
  const testTs = `/**
 * ${name} 插件测试 / ${name} プラグインテスト
 */

import { describe, it, expect } from 'vitest';
import { createMockContext, createMockHookContext, HOOK_EVENTS } from '@zelix/plugin-sdk';
import plugin from '../index';

describe('${name}', () => {
  it('should install without errors / エラーなくインストールできること', async () => {
    const ctx = createMockContext();
    await plugin.install(ctx);
    expect(ctx.registeredHooks.length).toBeGreaterThan(0);
  });

  it('should register hooks for manifest events / manifest のイベントに Hook を登録すること', async () => {
    const ctx = createMockContext();
    await plugin.install(ctx);

    const events = ctx.registeredHooks.map((h) => h.event);
${hooks.map((h) => `    expect(events).toContain('${h}');`).join('\n')}
  });

  it('should skip when disabled / 無効時はスキップすること', async () => {
    const ctx = createMockContext({ config: { enabled: false } });
    await plugin.install(ctx);

    const hookCtx = createMockHookContext('${hooks[0]}' as any, { test: true });
    await ctx.invokeHook('${hooks[0]}' as any, hookCtx);

    // 无效时不应有日志输出 / 無効時はログ出力なし
    expect(ctx.logger.calls.info.length).toBeLessThanOrEqual(1); // install log only
  });

  it('should pass health check / ヘルスチェックに合格すること', async () => {
    const result = await plugin.healthCheck!();
    expect(result.healthy).toBe(true);
  });
});
`;
  fs.writeFileSync(path.join(pluginDir, '__tests__/index.test.ts'), testTs);

  console.log('Files created:');
  console.log(`  ${pluginDir}/manifest.json`);
  console.log(`  ${pluginDir}/index.ts`);
  console.log(`  ${pluginDir}/__tests__/index.test.ts`);
  console.log('');
  console.log(`Done! Plugin "${name}" created successfully.`);
  console.log('');
  console.log('Next steps:');
  console.log(`  1. Edit ${pluginDir}/index.ts to implement your business logic`);
  console.log(`  2. Run tests: cd ${pluginDir} && npx vitest`);
  console.log(`  3. Restart ZELIX WMS to load the plugin`);
}

// ─── validate 命令 / validate コマンド ───

function validate(rawArgs: string[]): void {
  const dir = rawArgs[0] || '.';
  const pluginDir = path.resolve(dir);

  console.log(`Validating plugin: ${pluginDir}`);
  console.log('');

  const errors: string[] = [];
  const warnings: string[] = [];

  // 检查 manifest.json / manifest.json をチェック
  const manifestPath = path.join(pluginDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    errors.push('manifest.json not found');
  } else {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

      if (!manifest.name) errors.push('manifest.name is required');
      else if (!/^[a-z][a-z0-9-]*$/.test(manifest.name)) {
        errors.push(`manifest.name must be kebab-case: "${manifest.name}"`);
      }

      if (!manifest.version) errors.push('manifest.version is required');
      if (!manifest.hooks || !Array.isArray(manifest.hooks)) {
        errors.push('manifest.hooks must be an array');
      }
      if (!manifest.permissions) warnings.push('manifest.permissions is empty');
      if (!manifest.description) warnings.push('manifest.description is empty');
      if (!manifest.author) warnings.push('manifest.author is empty');
    } catch {
      errors.push('manifest.json is not valid JSON');
    }
  }

  // 检查 index.ts / index.ts をチェック
  const hasIndex = fs.existsSync(path.join(pluginDir, 'index.ts'))
    || fs.existsSync(path.join(pluginDir, 'index.js'));
  if (!hasIndex) {
    errors.push('index.ts or index.js not found');
  }

  // 检查测试文件 / テストファイルをチェック
  const hasTests = fs.existsSync(path.join(pluginDir, '__tests__'));
  if (!hasTests) {
    warnings.push('No __tests__ directory found');
  }

  // 输出结果 / 結果出力
  if (errors.length === 0 && warnings.length === 0) {
    console.log('  PASS: Plugin structure is valid');
  }

  for (const w of warnings) {
    console.log(`  WARN: ${w}`);
  }

  for (const e of errors) {
    console.log(`  FAIL: ${e}`);
  }

  console.log('');
  if (errors.length > 0) {
    console.log(`Validation failed with ${errors.length} error(s)`);
    process.exit(1);
  } else {
    console.log('Validation passed');
  }
}

// ─── 主入口 / メインエントリ ───

switch (command) {
  case 'create':
    create(args);
    break;
  case 'validate':
    validate(args);
    break;
  case 'help':
  case '--help':
  case '-h':
  case undefined:
    printUsage();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    printUsage();
    process.exit(1);
}
