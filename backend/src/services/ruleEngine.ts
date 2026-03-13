import {
  RuleDefinition,
  IRuleDefinition,
  IRuleCondition,
  IRuleConditionGroup,
  IRuleAction,
  RuleModule,
  ConditionOperator,
  LogicOperator,
} from '../models/ruleDefinition';

/** Context passed to rule evaluation — a flat or nested object with business data */
export type RuleContext = Record<string, any>;

/** Result of rule evaluation */
export interface RuleEvaluationResult {
  matched: boolean;
  rule: IRuleDefinition;
  actions: IRuleAction[];
}

export class RuleEngine {
  /**
   * Evaluate all active rules for a given module against a context.
   * Returns matched rules sorted by priority (lower first).
   * If a matched rule has stopOnMatch=true, stops evaluation.
   */
  static async evaluate(
    module: RuleModule,
    context: RuleContext,
    options?: {
      warehouseId?: string;
      clientId?: string;
    },
  ): Promise<RuleEvaluationResult[]> {
    const now = new Date();

    const query: Record<string, any> = {
      module,
      isActive: true,
    };

    if (options?.warehouseId) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { warehouseId: options.warehouseId },
          { warehouseId: { $exists: false } },
          { warehouseId: null },
        ],
      });
    }

    if (options?.clientId) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { clientId: options.clientId },
          { clientId: { $exists: false } },
          { clientId: null },
        ],
      });
    }

    const rules = await RuleDefinition.find(query).sort({ priority: 1 }).lean<IRuleDefinition[]>();

    const results: RuleEvaluationResult[] = [];
    const matchedRuleIds: string[] = [];

    for (const rule of rules) {
      // Skip rules outside their valid date range
      if (rule.validFrom && now < new Date(rule.validFrom)) {
        continue;
      }
      if (rule.validTo && now > new Date(rule.validTo)) {
        continue;
      }

      const matched = RuleEngine.evaluateRule(rule, context);

      if (matched) {
        results.push({
          matched: true,
          rule,
          actions: rule.actions,
        });
        matchedRuleIds.push(String(rule._id));

        if (rule.stopOnMatch) {
          break;
        }
      }
    }

    if (matchedRuleIds.length > 0) {
      await RuleEngine.recordExecution(matchedRuleIds);
    }

    return results;
  }

  /**
   * Evaluate a single rule's condition groups against context.
   * Returns true if conditions match.
   */
  static evaluateRule(rule: IRuleDefinition, context: RuleContext): boolean {
    if (!rule.conditionGroups || rule.conditionGroups.length === 0) {
      return true;
    }

    // All condition groups must pass (groups are AND'd together)
    return rule.conditionGroups.every((group) =>
      RuleEngine.evaluateConditionGroup(group, context),
    );
  }

  /**
   * Evaluate a condition group (AND/OR logic).
   */
  private static evaluateConditionGroup(
    group: IRuleConditionGroup,
    context: RuleContext,
  ): boolean {
    if (!group.conditions || group.conditions.length === 0) {
      return true;
    }

    if (group.logic === 'AND') {
      return group.conditions.every((condition) =>
        RuleEngine.evaluateCondition(condition, context),
      );
    }

    // OR logic
    return group.conditions.some((condition) =>
      RuleEngine.evaluateCondition(condition, context),
    );
  }

  /**
   * Evaluate a single condition against context.
   * Supports nested field paths like 'product.weight' via dot notation.
   */
  private static evaluateCondition(
    condition: IRuleCondition,
    context: RuleContext,
  ): boolean {
    const value = RuleEngine.getNestedValue(context, condition.field);
    const conditionValue = condition.value;

    switch (condition.operator) {
      case 'eq':
        return value === conditionValue;

      case 'ne':
        return value !== conditionValue;

      case 'gt':
        return value > (conditionValue as number);

      case 'gte':
        return value >= (conditionValue as number);

      case 'lt':
        return value < (conditionValue as number);

      case 'lte':
        return value <= (conditionValue as number);

      case 'in':
        return Array.isArray(conditionValue) && conditionValue.includes(value);

      case 'not_in':
        return Array.isArray(conditionValue) && !conditionValue.includes(value);

      case 'contains':
        return typeof value === 'string' && value.includes(conditionValue as string);

      case 'starts_with':
        return typeof value === 'string' && value.startsWith(conditionValue as string);

      case 'between':
        return (
          Array.isArray(conditionValue) &&
          conditionValue.length === 2 &&
          value >= conditionValue[0] &&
          value <= conditionValue[1]
        );

      default:
        return false;
    }
  }

  /**
   * Get a nested value from context using dot notation.
   * e.g., getNestedValue({ product: { weight: 10 } }, 'product.weight') => 10
   */
  private static getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce<any>(
      (current, key) =>
        current !== null && current !== undefined ? current[key] : undefined,
      obj,
    );
  }

  /**
   * Increment execution count and update lastExecutedAt for matched rules.
   */
  private static async recordExecution(ruleIds: string[]): Promise<void> {
    await RuleDefinition.updateMany(
      { _id: { $in: ruleIds } },
      {
        $inc: { executionCount: 1 },
        $set: { lastExecutedAt: new Date() },
      },
    );
  }
}
