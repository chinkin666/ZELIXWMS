/**
 * RuleEngine 单元测试 / RuleEngine ユニットテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/models/ruleDefinition', () => ({
  RuleDefinition: {
    find: vi.fn(),
    updateMany: vi.fn().mockResolvedValue({}),
  },
  RuleModule: {},
  ConditionOperator: {},
  LogicOperator: {},
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { RuleDefinition } from '@/models/ruleDefinition';

const chainSort = (val: any) => ({
  sort: () => ({ lean: () => Promise.resolve(val) }),
});

describe('RuleEngine / ルールエンジン', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('evaluateRule / ルール評価（単体）', () => {
    it('条件なしルール→常にマッチ / 无条件规则始终匹配', async () => {
      const { RuleEngine } = await import('../ruleEngine');
      const result = RuleEngine.evaluateRule(
        { conditionGroups: [], actions: [] } as any,
        { product: { weight: 10 } },
      );
      expect(result).toBe(true);
    });

    it('eq 演算子が正しく評価されること / eq运算符正确评估', async () => {
      const { RuleEngine } = await import('../ruleEngine');
      const rule = {
        conditionGroups: [
          {
            logic: 'AND',
            conditions: [{ field: 'status', operator: 'eq', value: 'confirmed' }],
          },
        ],
        actions: [],
      } as any;

      expect(RuleEngine.evaluateRule(rule, { status: 'confirmed' })).toBe(true);
      expect(RuleEngine.evaluateRule(rule, { status: 'draft' })).toBe(false);
    });

    it('ネスト値（ドット記法）に対応すること / 支持嵌套值（点号表示法）', async () => {
      const { RuleEngine } = await import('../ruleEngine');
      const rule = {
        conditionGroups: [
          {
            logic: 'AND',
            conditions: [{ field: 'product.weight', operator: 'gt', value: 5 }],
          },
        ],
      } as any;

      expect(RuleEngine.evaluateRule(rule, { product: { weight: 10 } })).toBe(true);
      expect(RuleEngine.evaluateRule(rule, { product: { weight: 3 } })).toBe(false);
    });

    it('OR ロジックグループ / OR逻辑组', async () => {
      const { RuleEngine } = await import('../ruleEngine');
      const rule = {
        conditionGroups: [
          {
            logic: 'OR',
            conditions: [
              { field: 'type', operator: 'eq', value: 'fba' },
              { field: 'type', operator: 'eq', value: 'rsl' },
            ],
          },
        ],
      } as any;

      expect(RuleEngine.evaluateRule(rule, { type: 'fba' })).toBe(true);
      expect(RuleEngine.evaluateRule(rule, { type: 'rsl' })).toBe(true);
      expect(RuleEngine.evaluateRule(rule, { type: 'b2b' })).toBe(false);
    });

    it('複数条件グループ（AND結合）/ 多条件组（AND联合）', async () => {
      const { RuleEngine } = await import('../ruleEngine');
      const rule = {
        conditionGroups: [
          {
            logic: 'AND',
            conditions: [{ field: 'status', operator: 'eq', value: 'confirmed' }],
          },
          {
            logic: 'AND',
            conditions: [{ field: 'weight', operator: 'lte', value: 30 }],
          },
        ],
      } as any;

      expect(RuleEngine.evaluateRule(rule, { status: 'confirmed', weight: 20 })).toBe(true);
      expect(RuleEngine.evaluateRule(rule, { status: 'confirmed', weight: 50 })).toBe(false);
      expect(RuleEngine.evaluateRule(rule, { status: 'draft', weight: 20 })).toBe(false);
    });

    it('in 演算子 / in运算符', async () => {
      const { RuleEngine } = await import('../ruleEngine');
      const rule = {
        conditionGroups: [
          {
            logic: 'AND',
            conditions: [{ field: 'carrier', operator: 'in', value: ['yamato', 'sagawa'] }],
          },
        ],
      } as any;

      expect(RuleEngine.evaluateRule(rule, { carrier: 'yamato' })).toBe(true);
      expect(RuleEngine.evaluateRule(rule, { carrier: 'yupack' })).toBe(false);
    });

    it('contains 演算子 / contains运算符', async () => {
      const { RuleEngine } = await import('../ruleEngine');
      const rule = {
        conditionGroups: [
          {
            logic: 'AND',
            conditions: [{ field: 'address', operator: 'contains', value: '東京' }],
          },
        ],
      } as any;

      expect(RuleEngine.evaluateRule(rule, { address: '東京都渋谷区' })).toBe(true);
      expect(RuleEngine.evaluateRule(rule, { address: '大阪府' })).toBe(false);
    });

    it('between 演算子 / between运算符', async () => {
      const { RuleEngine } = await import('../ruleEngine');
      const rule = {
        conditionGroups: [
          {
            logic: 'AND',
            conditions: [{ field: 'weight', operator: 'between', value: [1, 30] }],
          },
        ],
      } as any;

      expect(RuleEngine.evaluateRule(rule, { weight: 15 })).toBe(true);
      expect(RuleEngine.evaluateRule(rule, { weight: 50 })).toBe(false);
    });

    it('starts_with 演算子 / starts_with运算符', async () => {
      const { RuleEngine } = await import('../ruleEngine');
      const rule = {
        conditionGroups: [
          {
            logic: 'AND',
            conditions: [{ field: 'sku', operator: 'starts_with', value: 'FBA-' }],
          },
        ],
      } as any;

      expect(RuleEngine.evaluateRule(rule, { sku: 'FBA-12345' })).toBe(true);
      expect(RuleEngine.evaluateRule(rule, { sku: 'RSL-12345' })).toBe(false);
    });
  });

  describe('evaluate / ルール評価（DB連携）', () => {
    it('マッチしたルールを優先度順に返すこと / 按优先级返回匹配规则', async () => {
      const rules = [
        {
          _id: 'R1',
          module: 'replenishment',
          priority: 1,
          isActive: true,
          conditionGroups: [],
          actions: [{ type: 'trigger_replenishment', params: { minQuantity: 10 } }],
          stopOnMatch: false,
        },
        {
          _id: 'R2',
          module: 'replenishment',
          priority: 2,
          isActive: true,
          conditionGroups: [
            {
              logic: 'AND',
              conditions: [{ field: 'availableQuantity', operator: 'lt', value: 5 }],
            },
          ],
          actions: [{ type: 'trigger_replenishment', params: { minQuantity: 5 } }],
          stopOnMatch: false,
        },
      ];
      vi.mocked(RuleDefinition.find).mockReturnValue(chainSort(rules) as any);

      const { RuleEngine } = await import('../ruleEngine');
      const results = await RuleEngine.evaluate('replenishment' as any, { availableQuantity: 3 });

      expect(results).toHaveLength(2);
      expect(RuleDefinition.updateMany).toHaveBeenCalled();
    });

    it('stopOnMatch=trueで評価停止 / stopOnMatch=true时停止评估', async () => {
      const rules = [
        {
          _id: 'R1',
          conditionGroups: [],
          actions: [{ type: 'a' }],
          stopOnMatch: true,
        },
        {
          _id: 'R2',
          conditionGroups: [],
          actions: [{ type: 'b' }],
          stopOnMatch: false,
        },
      ];
      vi.mocked(RuleDefinition.find).mockReturnValue(chainSort(rules) as any);

      const { RuleEngine } = await import('../ruleEngine');
      const results = await RuleEngine.evaluate('replenishment' as any, {});

      expect(results).toHaveLength(1);
      expect(results[0].actions[0].type).toBe('a');
    });

    it('有効期間外のルールをスキップ / 跳过有效期外的规则', async () => {
      const rules = [
        {
          _id: 'R1',
          conditionGroups: [],
          actions: [{ type: 'a' }],
          validFrom: new Date('2099-01-01'), // 未来
        },
      ];
      vi.mocked(RuleDefinition.find).mockReturnValue(chainSort(rules) as any);

      const { RuleEngine } = await import('../ruleEngine');
      const results = await RuleEngine.evaluate('replenishment' as any, {});

      expect(results).toHaveLength(0);
    });
  });
});
