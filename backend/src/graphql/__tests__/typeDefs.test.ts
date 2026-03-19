/**
 * GraphQL Schema 验证测试 / GraphQL スキーマバリデーションテスト
 */

import { describe, it, expect } from 'vitest';
import { typeDefs } from '../schema/typeDefs';

// graphql CJS require（vitest ESM 互換問題回避）
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { buildSchema, parse, validate } = require('graphql');

describe('GraphQL typeDefs', () => {
  it('should be valid GraphQL schema / 有効な GraphQL スキーマであること', () => {
    expect(() => buildSchema(typeDefs)).not.toThrow();
  });

  it('should define Query type / Query 型が定義されていること', () => {
    const schema = buildSchema(typeDefs);
    expect(schema.getQueryType()).toBeDefined();
    expect(schema.getQueryType()!.name).toBe('Query');
  });

  it('should define Mutation type / Mutation 型が定義されていること', () => {
    const schema = buildSchema(typeDefs);
    expect(schema.getMutationType()).toBeDefined();
    expect(schema.getMutationType()!.name).toBe('Mutation');
  });

  it('should have all 15 Query fields / 全 15 Query フィールドがあること', () => {
    const schema = buildSchema(typeDefs);
    const fields = schema.getQueryType()!.getFields();
    const expected = [
      'shipmentOrder', 'shipmentOrders', 'product', 'productBySku', 'products',
      'stockQuants', 'stockSummary', 'inboundOrder', 'inboundOrders',
      'client', 'clients', 'warehouses', 'waves', 'stockMoves', 'dashboardStats',
    ];
    for (const q of expected) {
      expect(fields[q], `Missing query: ${q}`).toBeDefined();
    }
  });

  it('should have all 15 Mutation fields / 全 15 Mutation フィールドがあること', () => {
    const schema = buildSchema(typeDefs);
    const fields = schema.getMutationType()!.getFields();
    const expected = [
      'createShipmentOrder', 'updateShipmentOrder', 'confirmShipmentOrder',
      'holdShipmentOrder', 'unholdShipmentOrder', 'cancelShipmentOrder',
      'createProduct', 'updateProduct', 'deleteProduct',
      'createInboundOrder', 'confirmInboundOrder', 'cancelInboundOrder',
      'createClient', 'updateClient', 'adjustStock',
    ];
    for (const m of expected) {
      expect(fields[m], `Missing mutation: ${m}`).toBeDefined();
    }
  });

  it('should validate sample query / サンプルクエリをバリデーション', () => {
    const schema = buildSchema(typeDefs);
    const errors = validate(schema, parse(`{
      dashboardStats { totalOrders shippedToday lowStockCount }
      products(pagination: { page: 1, limit: 10 }) {
        data { _id sku name price }
        pageInfo { total hasNext }
      }
    }`));
    expect(errors).toHaveLength(0);
  });

  it('should validate sample mutation / サンプルミューテーションをバリデーション', () => {
    const schema = buildSchema(typeDefs);
    const errors = validate(schema, parse(`mutation {
      createProduct(input: { sku: "T-001", name: "テスト", price: 1000 }) {
        _id sku name
      }
    }`));
    expect(errors).toHaveLength(0);
  });

  it('should reject invalid fields / 無効なフィールドを拒否', () => {
    const schema = buildSchema(typeDefs);
    const errors = validate(schema, parse(`{
      shipmentOrder(id: "123") { nonExistentField }
    }`));
    expect(errors.length).toBeGreaterThan(0);
  });
});
