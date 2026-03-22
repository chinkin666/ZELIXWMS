// スキーマ定義バリデーションテスト / 数据库表结构定义验证测试
// 新規スキーマテーブルが正しいテーブル名と必須カラムを持つことを検証
// 验证新schema表定义具有正确的表名和必要列
import {
  photos,
  workflows,
  workflowLogs,
  slottingRules,
  fbaShipmentPlans,
  fbaBoxes,
  rslShipmentPlans,
  passthroughOrders,
  apiLogs,
} from './schema/index';
import { getTableName, getTableColumns } from 'drizzle-orm';

describe('Schema Validation - New Tables / 新規テーブルスキーマ検証 / 新表结构验证', () => {
  // === photos テーブル / 照片表 ===
  describe('photos', () => {
    it('should have correct table name / 正しいテーブル名 / 正确的表名', () => {
      expect(getTableName(photos)).toBe('photos');
    });

    it('should have required columns / 必須カラムを持つ / 具有必要列', () => {
      const columns = getTableColumns(photos);
      expect(columns).toHaveProperty('id');
      expect(columns).toHaveProperty('tenantId');
      expect(columns).toHaveProperty('entityType');
      expect(columns).toHaveProperty('entityId');
      expect(columns).toHaveProperty('filename');
      expect(columns).toHaveProperty('url');
      expect(columns).toHaveProperty('size');
      expect(columns).toHaveProperty('mimeType');
      expect(columns).toHaveProperty('createdAt');
    });
  });

  // === workflows テーブル / 工作流表 ===
  describe('workflows', () => {
    it('should have correct table name / 正しいテーブル名 / 正确的表名', () => {
      expect(getTableName(workflows)).toBe('workflows');
    });

    it('should have required columns / 必須カラムを持つ / 具有必要列', () => {
      const columns = getTableColumns(workflows);
      expect(columns).toHaveProperty('id');
      expect(columns).toHaveProperty('tenantId');
      expect(columns).toHaveProperty('name');
      expect(columns).toHaveProperty('triggerType');
      expect(columns).toHaveProperty('enabled');
      expect(columns).toHaveProperty('createdAt');
      expect(columns).toHaveProperty('updatedAt');
    });
  });

  // === workflow_logs テーブル / 工作流日志表 ===
  describe('workflowLogs', () => {
    it('should have correct table name / 正しいテーブル名 / 正确的表名', () => {
      expect(getTableName(workflowLogs)).toBe('workflow_logs');
    });

    it('should have required columns / 必須カラムを持つ / 具有必要列', () => {
      const columns = getTableColumns(workflowLogs);
      expect(columns).toHaveProperty('id');
      expect(columns).toHaveProperty('tenantId');
      expect(columns).toHaveProperty('workflowId');
      expect(columns).toHaveProperty('status');
      expect(columns).toHaveProperty('createdAt');
    });
  });

  // === slotting_rules テーブル / 上架规则表 ===
  describe('slottingRules', () => {
    it('should have correct table name / 正しいテーブル名 / 正确的表名', () => {
      expect(getTableName(slottingRules)).toBe('slotting_rules');
    });

    it('should have required columns / 必須カラムを持つ / 具有必要列', () => {
      const columns = getTableColumns(slottingRules);
      expect(columns).toHaveProperty('id');
      expect(columns).toHaveProperty('tenantId');
      expect(columns).toHaveProperty('name');
      expect(columns).toHaveProperty('priority');
      expect(columns).toHaveProperty('enabled');
      expect(columns).toHaveProperty('conditions');
      expect(columns).toHaveProperty('actions');
    });
  });

  // === fba_shipment_plans テーブル / FBA发货计划表 ===
  describe('fbaShipmentPlans', () => {
    it('should have correct table name / 正しいテーブル名 / 正确的表名', () => {
      expect(getTableName(fbaShipmentPlans)).toBe('fba_shipment_plans');
    });

    it('should have required columns / 必須カラムを持つ / 具有必要列', () => {
      const columns = getTableColumns(fbaShipmentPlans);
      expect(columns).toHaveProperty('id');
      expect(columns).toHaveProperty('tenantId');
      expect(columns).toHaveProperty('planName');
      expect(columns).toHaveProperty('status');
      expect(columns).toHaveProperty('items');
      expect(columns).toHaveProperty('createdAt');
    });
  });

  // === fba_boxes テーブル / FBA箱表 ===
  describe('fbaBoxes', () => {
    it('should have correct table name / 正しいテーブル名 / 正确的表名', () => {
      expect(getTableName(fbaBoxes)).toBe('fba_boxes');
    });

    it('should have required columns / 必須カラムを持つ / 具有必要列', () => {
      const columns = getTableColumns(fbaBoxes);
      expect(columns).toHaveProperty('id');
      expect(columns).toHaveProperty('tenantId');
      expect(columns).toHaveProperty('shipmentPlanId');
      expect(columns).toHaveProperty('boxNumber');
      expect(columns).toHaveProperty('status');
      expect(columns).toHaveProperty('items');
    });
  });

  // === rsl_shipment_plans テーブル / RSL发货计划表 ===
  describe('rslShipmentPlans', () => {
    it('should have correct table name / 正しいテーブル名 / 正确的表名', () => {
      expect(getTableName(rslShipmentPlans)).toBe('rsl_shipment_plans');
    });

    it('should have required columns / 必須カラムを持つ / 具有必要列', () => {
      const columns = getTableColumns(rslShipmentPlans);
      expect(columns).toHaveProperty('id');
      expect(columns).toHaveProperty('tenantId');
      expect(columns).toHaveProperty('planName');
      expect(columns).toHaveProperty('status');
      expect(columns).toHaveProperty('items');
      expect(columns).toHaveProperty('createdAt');
    });
  });

  // === passthrough_orders テーブル / 直通订单表 ===
  describe('passthroughOrders', () => {
    it('should have correct table name / 正しいテーブル名 / 正确的表名', () => {
      expect(getTableName(passthroughOrders)).toBe('passthrough_orders');
    });

    it('should have required columns / 必須カラムを持つ / 具有必要列', () => {
      const columns = getTableColumns(passthroughOrders);
      expect(columns).toHaveProperty('id');
      expect(columns).toHaveProperty('tenantId');
      expect(columns).toHaveProperty('orderNumber');
      expect(columns).toHaveProperty('status');
      expect(columns).toHaveProperty('items');
      expect(columns).toHaveProperty('createdAt');
    });
  });

  // === api_logs テーブル / API日志表 ===
  describe('apiLogs', () => {
    it('should have correct table name / 正しいテーブル名 / 正确的表名', () => {
      expect(getTableName(apiLogs)).toBe('api_logs');
    });

    it('should have required columns / 必須カラムを持つ / 具有必要列', () => {
      const columns = getTableColumns(apiLogs);
      expect(columns).toHaveProperty('id');
      expect(columns).toHaveProperty('tenantId');
      expect(columns).toHaveProperty('method');
      expect(columns).toHaveProperty('path');
      expect(columns).toHaveProperty('statusCode');
      expect(columns).toHaveProperty('createdAt');
    });
  });

  // === エクスポート整合性テスト / 导出完整性测试 ===
  describe('All tables are exported from index / 全テーブルがindexからエクスポートされている / 全部表从index导出', () => {
    it('should export all 9 new tables from schema/index', () => {
      // 各テーブルがnullやundefinedでないことを確認 / 确认各表不为null或undefined
      expect(photos).toBeDefined();
      expect(workflows).toBeDefined();
      expect(workflowLogs).toBeDefined();
      expect(slottingRules).toBeDefined();
      expect(fbaShipmentPlans).toBeDefined();
      expect(fbaBoxes).toBeDefined();
      expect(rslShipmentPlans).toBeDefined();
      expect(passthroughOrders).toBeDefined();
      expect(apiLogs).toBeDefined();
    });
  });
});
