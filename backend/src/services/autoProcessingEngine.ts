import mongoose from 'mongoose';
import {
  AutoProcessingRule,
  type IAutoProcessingRule,
  type IAutoProcessingCondition,
  type IAutoProcessingAction,
  type TriggerEvent,
  type RawRowOperator,
  type OrderFieldOperator,
} from '@/models/autoProcessingRule';
import { AutoProcessingLog } from '@/models/autoProcessingLog';
import { ShipmentOrder, calculateProductsMeta } from '@/models/shipmentOrder';
import { Product } from '@/models/product';

// ============================================
// Public API
// ============================================

/**
 * Fire-and-forget: called after an order status change.
 * Finds all matching auto rules and executes them.
 */
export async function processOrderEvent(
  orderId: string,
  event: TriggerEvent,
): Promise<void> {
  const rules = await AutoProcessingRule.find({
    enabled: true,
    triggerMode: 'auto',
    triggerEvents: event,
  })
    .sort({ priority: 1 })
    .lean();

  if (rules.length === 0) return;

  const order = await ShipmentOrder.findById(orderId).lean();
  if (!order) return;

  for (const rule of rules) {
    try {
      await executeRuleForOrder(rule, order, event);
    } catch (err) {
      console.error(`[AutoProcessing] Rule "${rule.name}" failed for order ${orderId}:`, err);
    }
  }
}

/**
 * Fire-and-forget for bulk: called after bulk status changes.
 * Processes each order in the given IDs list.
 */
export async function processOrderEventBulk(
  orderIds: string[],
  event: TriggerEvent,
): Promise<void> {
  const rules = await AutoProcessingRule.find({
    enabled: true,
    triggerMode: 'auto',
    triggerEvents: event,
  })
    .sort({ priority: 1 })
    .lean();

  if (rules.length === 0) return;

  const orders = await ShipmentOrder.find({
    _id: { $in: orderIds.map((id) => new mongoose.Types.ObjectId(id)) },
  }).lean();

  for (const order of orders) {
    for (const rule of rules) {
      try {
        await executeRuleForOrder(rule, order, event);
      } catch (err) {
        console.error(`[AutoProcessing] Rule "${rule.name}" failed for order ${order._id}:`, err);
      }
    }
  }
}

/**
 * Manual execution: run a specific rule against all orders that currently match conditions.
 * Returns stats about how many orders were processed.
 */
export async function runRuleManually(
  rule: IAutoProcessingRule,
): Promise<{ processed: number; matched: number; executed: number; errors: number }> {
  // Load all orders (no specific event filter for manual)
  const orders = await ShipmentOrder.find().lean();

  let matched = 0;
  let executed = 0;
  let errors = 0;

  for (const order of orders) {
    const conditionsMet = evaluateConditions(rule.conditions, order);
    if (!conditionsMet) continue;
    matched++;

    // Check rerun
    if (!rule.allowRerun) {
      const alreadyRun = await AutoProcessingLog.findOne({
        orderId: order._id,
        ruleId: rule._id,
        success: true,
      }).lean();
      if (alreadyRun) continue;
    }

    try {
      await executeActions(rule.actions, order);
      await AutoProcessingLog.create({
        orderId: order._id,
        orderSystemId: (order as any).orderNumber || String(order._id),
        ruleId: rule._id,
        ruleName: rule.name,
        event: 'order.created', // manual run doesn't have a specific event
        actionsExecuted: rule.actions,
        success: true,
        executedAt: new Date(),
      });
      executed++;
    } catch (err) {
      errors++;
      await AutoProcessingLog.create({
        orderId: order._id,
        orderSystemId: (order as any).orderNumber || String(order._id),
        ruleId: rule._id,
        ruleName: rule.name,
        event: 'order.created',
        actionsExecuted: rule.actions,
        success: false,
        error: err instanceof Error ? err.message : String(err),
        executedAt: new Date(),
      }).catch(console.error);
    }
  }

  return { processed: orders.length, matched, executed, errors };
}

// ============================================
// Core Logic
// ============================================

async function executeRuleForOrder(
  rule: IAutoProcessingRule,
  order: any,
  event: TriggerEvent,
): Promise<void> {
  // Check rerun
  if (!rule.allowRerun) {
    const alreadyRun = await AutoProcessingLog.findOne({
      orderId: order._id,
      ruleId: rule._id,
      success: true,
    }).lean();
    if (alreadyRun) return;
  }

  // Evaluate conditions
  if (!evaluateConditions(rule.conditions, order)) return;

  // Execute actions
  try {
    await executeActions(rule.actions, order);
    await AutoProcessingLog.create({
      orderId: order._id,
      orderSystemId: order.orderNumber || String(order._id),
      ruleId: rule._id,
      ruleName: rule.name,
      event,
      actionsExecuted: rule.actions,
      success: true,
      executedAt: new Date(),
    });
  } catch (err) {
    await AutoProcessingLog.create({
      orderId: order._id,
      orderSystemId: order.orderNumber || String(order._id),
      ruleId: rule._id,
      ruleName: rule.name,
      event,
      actionsExecuted: rule.actions,
      success: false,
      error: err instanceof Error ? err.message : String(err),
      executedAt: new Date(),
    }).catch(console.error);
    throw err;
  }
}

// ============================================
// Condition Evaluation
// ============================================

function evaluateConditions(conditions: IAutoProcessingCondition[], order: any): boolean {
  if (!conditions || conditions.length === 0) return true;
  return conditions.every((cond) => evaluateCondition(cond, order));
}

function evaluateCondition(cond: IAutoProcessingCondition, order: any): boolean {
  switch (cond.type) {
    case 'orderField':
      return evaluateOrderFieldCondition(cond, order);
    case 'orderStatus':
      return evaluateOrderFieldCondition(cond, order);
    case 'orderGroup':
      return evaluateOrderGroupCondition(cond, order);
    case 'carrierRawRow':
      return evaluateCarrierRawRowCondition(cond, order);
    case 'sourceRawRow':
      return evaluateSourceRawRowCondition(cond, order);
    default:
      return false;
  }
}

function evaluateOrderGroupCondition(cond: IAutoProcessingCondition, order: any): boolean {
  if (!Array.isArray(cond.orderGroupIds) || cond.orderGroupIds.length === 0) return true;
  const orderGroupId = order.orderGroupId || '';
  return cond.orderGroupIds.includes(orderGroupId);
}

function evaluateOrderFieldCondition(cond: IAutoProcessingCondition, order: any): boolean {
  // Legacy: orderGroupId multi-select (for backward compat with old rules)
  if (cond.fieldKey === 'orderGroupId' && Array.isArray(cond.orderGroupIds)) {
    const orderGroupId = order.orderGroupId || '';
    return cond.orderGroupIds.includes(orderGroupId);
  }

  const fieldKey = cond.fieldKey;
  const operator = cond.operator;
  const value = cond.value;

  if (!fieldKey || !operator) return false;

  const fieldValue = getNestedValue(order, fieldKey);
  return matchOperator(fieldValue, operator, value);
}

function evaluateCarrierRawRowCondition(cond: IAutoProcessingCondition, order: any): boolean {
  const rawRow = order.carrierRawRow;
  if (!rawRow || typeof rawRow !== 'object') {
    // If operator is isEmpty, no rawRow means condition met
    return cond.carrierOperator === 'isEmpty';
  }

  const columnName = cond.carrierColumnName;
  const operator = cond.carrierOperator as RawRowOperator;
  if (!columnName || !operator) return false;

  const cellValue = rawRow[columnName];
  return matchRawRowOperator(cellValue, operator, cond.carrierValue);
}

function evaluateSourceRawRowCondition(cond: IAutoProcessingCondition, order: any): boolean {
  const rawRows: any[] = order.sourceRawRows;
  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    return cond.sourceOperator === 'isEmpty';
  }

  const columnName = cond.sourceColumnName;
  const operator = cond.sourceOperator as RawRowOperator;
  if (!columnName || !operator) return false;

  // Any row matching is sufficient
  return rawRows.some((row) => {
    const cellValue = row?.[columnName];
    return matchRawRowOperator(cellValue, operator, cond.sourceValue);
  });
}

// ============================================
// Operator Matching
// ============================================

function matchOperator(fieldValue: unknown, operator: OrderFieldOperator, condValue: unknown): boolean {
  const strField = fieldValue != null ? String(fieldValue) : '';
  const strCond = condValue != null ? String(condValue) : '';

  switch (operator) {
    case 'is':
      return strField === strCond;
    case 'isNot':
      return strField !== strCond;
    case 'contains':
      return strField.includes(strCond);
    case 'notContains':
      return !strField.includes(strCond);
    case 'hasAnyValue':
      return fieldValue != null && strField !== '';
    case 'isEmpty':
      return fieldValue == null || strField === '';
    case 'equals':
      return Number(fieldValue) === Number(condValue);
    case 'notEquals':
      return Number(fieldValue) !== Number(condValue);
    case 'lessThan':
      return Number(fieldValue) < Number(condValue);
    case 'lessThanOrEqual':
      return Number(fieldValue) <= Number(condValue);
    case 'greaterThan':
      return Number(fieldValue) > Number(condValue);
    case 'greaterThanOrEqual':
      return Number(fieldValue) >= Number(condValue);
    case 'between': {
      if (!Array.isArray(condValue) || condValue.length < 2) return false;
      const num = Number(fieldValue);
      return num >= Number(condValue[0]) && num <= Number(condValue[1]);
    }
    case 'before': {
      const d1 = new Date(strField).getTime();
      const d2 = new Date(strCond).getTime();
      return !isNaN(d1) && !isNaN(d2) && d1 < d2;
    }
    case 'after': {
      const d1 = new Date(strField).getTime();
      const d2 = new Date(strCond).getTime();
      return !isNaN(d1) && !isNaN(d2) && d1 > d2;
    }
    default:
      return false;
  }
}

function matchRawRowOperator(cellValue: unknown, operator: RawRowOperator, condValue: unknown): boolean {
  const strCell = cellValue != null ? String(cellValue) : '';
  const strCond = condValue != null ? String(condValue) : '';

  switch (operator) {
    case 'is':
      return strCell === strCond;
    case 'isNot':
      return strCell !== strCond;
    case 'contains':
      return strCell.includes(strCond);
    case 'notContains':
      return !strCell.includes(strCond);
    case 'isEmpty':
      return cellValue == null || strCell === '';
    case 'hasAnyValue':
      return cellValue != null && strCell !== '';
    default:
      return false;
  }
}

// ============================================
// Action Execution
// ============================================

async function executeActions(actions: IAutoProcessingAction[], order: any): Promise<void> {
  for (const action of actions) {
    await executeAction(action, order);
  }
}

async function executeAction(action: IAutoProcessingAction, order: any): Promise<void> {
  switch (action.type) {
    case 'addProduct':
      await executeAddProduct(action, order);
      break;
    case 'setOrderGroup':
      await executeSetOrderGroup(action, order);
      break;
  }
}

async function executeAddProduct(action: IAutoProcessingAction, order: any): Promise<void> {
  if (!action.productSku) return;

  const inputSku = action.productSku;
  const quantity = action.quantity || 1;

  // Resolve product from database (try main SKU first, then sub-SKU)
  let product = await Product.findOne({ sku: inputSku }).lean();
  let matchedSubSku: { code: string; price?: number; description?: string } | undefined;
  let isMainSku = true;

  if (!product) {
    product = await Product.findOne({ 'subSkus.subSku': inputSku }).lean();
    isMainSku = false;
    if (product) {
      const sub = product.subSkus?.find((s) => s.subSku === inputSku && s.isActive !== false);
      if (sub) {
        matchedSubSku = { code: sub.subSku, price: sub.price, description: sub.description };
      }
    }
  }

  const unitPrice = matchedSubSku?.price ?? product?.price ?? 0;

  const newProduct: Record<string, any> = {
    inputSku,
    quantity,
    ...(product
      ? {
          productId: String(product._id),
          productSku: product.sku,
          productName: product.name,
          matchedSubSku: isMainSku ? undefined : matchedSubSku,
          imageUrl: product.imageUrl,
          barcode: product.barcode,
          coolType: product.coolType,
          mailCalcEnabled: product.mailCalcEnabled,
          mailCalcMaxQuantity: product.mailCalcMaxQuantity,
          unitPrice,
          subtotal: unitPrice * quantity,
        }
      : {}),
  };

  const currentProducts = Array.isArray(order.products) ? [...order.products] : [];
  currentProducts.push(newProduct);

  const meta = calculateProductsMeta(currentProducts);

  await ShipmentOrder.findByIdAndUpdate(order._id, {
    $push: { products: newProduct },
    $set: { _productsMeta: meta },
  });

  // Update in-memory order so subsequent actions see the change
  order.products = currentProducts;
  order._productsMeta = meta;
}

async function executeSetOrderGroup(action: IAutoProcessingAction, order: any): Promise<void> {
  if (!action.orderGroupId) return;

  await ShipmentOrder.findByIdAndUpdate(order._id, {
    $set: { orderGroupId: action.orderGroupId },
  });

  // Update in-memory
  order.orderGroupId = action.orderGroupId;
}

// ============================================
// Utilities
// ============================================

function getNestedValue(obj: any, path: string): unknown {
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[part];
  }
  return current;
}
