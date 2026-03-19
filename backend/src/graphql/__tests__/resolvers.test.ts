/**
 * GraphQL Resolvers 辅助函数测试 / GraphQL リゾルバヘルパー関数テスト
 *
 * DB 不依赖的纯逻辑测试。
 * DB に依存しない純粋ロジックテスト。
 */

import { describe, it, expect } from 'vitest';

// 直接测试 typeDefs 中的 schema 完整性（不需要 DB）
// typeDefs のスキーマ完全性を直接テスト（DB 不要）
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { buildSchema } = require('graphql');
import { typeDefs } from '../schema/typeDefs';

describe('GraphQL Schema types', () => {
  const schema = buildSchema(typeDefs);

  it('should have ShipmentOrder type with key fields', () => {
    const type = schema.getType('ShipmentOrder');
    expect(type).toBeDefined();
    const fields = (type as any).getFields();
    expect(fields._id).toBeDefined();
    expect(fields.orderNumber).toBeDefined();
    expect(fields.recipient).toBeDefined();
    expect(fields.products).toBeDefined();
    expect(fields.status).toBeDefined();
  });

  it('should have Product type with key fields', () => {
    const type = schema.getType('Product');
    expect(type).toBeDefined();
    const fields = (type as any).getFields();
    expect(fields._id).toBeDefined();
    expect(fields.sku).toBeDefined();
    expect(fields.name).toBeDefined();
    expect(fields.price).toBeDefined();
    expect(fields.safetyStock).toBeDefined();
  });

  it('should have StockQuant with availableQuantity', () => {
    const type = schema.getType('StockQuant');
    expect(type).toBeDefined();
    const fields = (type as any).getFields();
    expect(fields.quantity).toBeDefined();
    expect(fields.reservedQuantity).toBeDefined();
    expect(fields.availableQuantity).toBeDefined();
    expect(fields.product).toBeDefined(); // field resolver
  });

  it('should have DashboardStats with all 8 metrics', () => {
    const type = schema.getType('DashboardStats');
    expect(type).toBeDefined();
    const fields = (type as any).getFields();
    const expectedFields = [
      'totalOrders', 'pendingOrders', 'shippedToday', 'totalProducts',
      'totalStock', 'lowStockCount', 'activeClients', 'activeWaves',
    ];
    for (const f of expectedFields) {
      expect(fields[f], `Missing: ${f}`).toBeDefined();
    }
  });

  it('should have PageInfo with pagination fields', () => {
    const type = schema.getType('PageInfo');
    expect(type).toBeDefined();
    const fields = (type as any).getFields();
    expect(fields.total).toBeDefined();
    expect(fields.page).toBeDefined();
    expect(fields.limit).toBeDefined();
    expect(fields.hasNext).toBeDefined();
  });

  it('should have MutationResult type', () => {
    const type = schema.getType('MutationResult');
    expect(type).toBeDefined();
    const fields = (type as any).getFields();
    expect(fields.success).toBeDefined();
    expect(fields.message).toBeDefined();
    expect(fields.id).toBeDefined();
  });

  it('should have all input types', () => {
    const inputTypes = [
      'PaginationInput', 'AddressInput', 'ShipmentOrderProductInput',
      'CreateShipmentOrderInput', 'UpdateShipmentOrderInput',
      'CreateProductInput', 'UpdateProductInput',
      'CreateInboundOrderInput', 'InboundOrderLineInput',
      'CreateClientInput', 'UpdateClientInput',
      'StockAdjustmentInput',
      'ShipmentOrderFilter', 'ProductFilter', 'StockFilter', 'InboundOrderFilter',
    ];

    for (const name of inputTypes) {
      expect(schema.getType(name), `Missing input type: ${name}`).toBeDefined();
    }
  });

  it('should have Connection types for all paginated queries', () => {
    const connectionTypes = [
      'ShipmentOrderConnection', 'ProductConnection', 'StockQuantConnection',
      'InboundOrderConnection', 'ClientConnection', 'WaveConnection', 'StockMoveConnection',
    ];

    for (const name of connectionTypes) {
      const type = schema.getType(name);
      expect(type, `Missing: ${name}`).toBeDefined();
      const fields = (type as any).getFields();
      expect(fields.data, `${name} missing data`).toBeDefined();
      expect(fields.pageInfo, `${name} missing pageInfo`).toBeDefined();
    }
  });
});
