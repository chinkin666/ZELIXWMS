/**
 * ScriptRunner 单元测试 / ScriptRunner ユニットテスト
 */

import { describe, it, expect, vi } from 'vitest';

// Mock AutomationScript + ScriptExecutionLog
vi.mock('@/models/automationScript', () => ({
  AutomationScript: {
    find: vi.fn().mockReturnValue({ lean: () => Promise.resolve([]) }),
    findById: vi.fn().mockReturnValue({ lean: () => Promise.resolve(null) }),
  },
}));

vi.mock('@/models/scriptExecutionLog', () => ({
  ScriptExecutionLog: {
    create: vi.fn().mockResolvedValue({}),
  },
}));

import { ScriptRunner } from '../scriptRunner';

describe('ScriptRunner', () => {
  const runner = new ScriptRunner();

  describe('validate / バリデーション', () => {
    it('should accept valid code / 有効なコードを受け付けること', () => {
      const result = runner.validate('var x = 1 + 2;');
      expect(result.valid).toBe(true);
    });

    it('should reject syntax errors / 構文エラーを拒否すること', () => {
      const result = runner.validate('var x = {;');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject require keyword / require キーワードを拒否すること', () => {
      const result = runner.validate('var fs = require("fs");');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('require');
    });

    it('should reject process keyword / process キーワードを拒否すること', () => {
      const result = runner.validate('process.exit(1);');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('process');
    });

    it('should reject import keyword / import キーワードを拒否すること', () => {
      const result = runner.validate('import fs from "fs";');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('import');
    });

    it('should reject eval / eval を拒否すること', () => {
      const result = runner.validate('eval("alert(1)");');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('eval');
    });

    it('should allow safe code with setField / setField を使う安全なコードを許可すること', () => {
      const code = `
        if (order.memo === "VIP") {
          setField("order.handlingTags", ["priority"]);
        }
      `;
      const result = runner.validate(code);
      expect(result.valid).toBe(true);
    });
  });

  describe('execute / 実行', () => {
    it('should execute simple script / 簡単なスクリプトを実行すること', async () => {
      const script = {
        _id: 'test-1',
        name: 'test-script',
        code: 'var x = 1 + 1;',
        event: 'order.created',
      };

      const result = await runner.execute(script, { order: { _id: 'o1' } });
      expect(result).toBeDefined();
    });

    it('should collect setField modifications / setField の変更を収集すること', async () => {
      const script = {
        _id: 'test-2',
        name: 'test-setfield',
        code: 'setField("order.memo", "modified"); setField("order.customFields", { key: "val" });',
        event: 'order.created',
      };

      const result = await runner.execute(script, { order: { _id: 'o1', memo: 'original' } });
      expect(result['order.memo']).toBe('modified');
      expect(result['order.customFields']).toEqual({ key: 'val' });
    });

    it('should reject setField on non-whitelisted fields / ホワイトリスト外フィールドの setField を拒否すること', async () => {
      const script = {
        _id: 'test-3',
        name: 'test-blocked',
        code: 'setField("order.status", "shipped");',
        event: 'order.created',
      };

      await expect(runner.execute(script, {})).rejects.toThrow('Modification not allowed');
    });

    it('should timeout on infinite loops / 無限ループでタイムアウトすること', async () => {
      const script = {
        _id: 'test-4',
        name: 'test-timeout',
        code: 'while(true) {}',
        event: 'order.created',
        timeout: 100,
      };

      await expect(runner.execute(script, {})).rejects.toThrow();
    });

    it('should provide safe globals / 安全なグローバルを提供すること', async () => {
      const script = {
        _id: 'test-5',
        name: 'test-globals',
        code: `
          var s = JSON.stringify({a: 1});
          var parsed = JSON.parse(s);
          var n = parseInt("42");
          var d = new Date().getTime();
          var m = Math.max(1, 2, 3);
        `,
        event: 'order.created',
      };

      const result = await runner.execute(script, {});
      expect(result).toBeDefined();
    });

    it('should isolate payload as deep copy / ペイロードをディープコピーで隔離すること', async () => {
      const originalOrder = { _id: 'o1', memo: 'original', items: [1, 2, 3] };
      const script = {
        _id: 'test-6',
        name: 'test-isolation',
        code: 'order.memo = "mutated"; order.items.push(4);',
        event: 'order.created',
      };

      await runner.execute(script, { order: originalOrder });
      // 原始对象不应被修改 / 元のオブジェクトは変更されるべきではない
      expect(originalOrder.memo).toBe('original');
      expect(originalOrder.items).toEqual([1, 2, 3]);
    });
  });
});
