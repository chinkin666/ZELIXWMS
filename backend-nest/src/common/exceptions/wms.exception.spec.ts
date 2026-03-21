// WMS 例外クラス テスト / WMS异常类测试
import {
  WmsException,
  InsufficientStockException,
  InvalidStatusTransitionException,
  DuplicateResourceException,
} from './wms.exception.js';
import { WMS_ERROR_CODES } from './wms-error-codes.js';

describe('WmsException', () => {
  // 正しいステータスコードで例外を生成 / 使用正确的状态码创建异常
  it('should create exception with correct status code', () => {
    const exception = new WmsException('AUTH_INVALID_TOKEN');

    expect(exception.getStatus()).toBe(401);
    expect(exception.errorCode).toBe('AUTH-001');

    const response = exception.getResponse() as Record<string, unknown>;
    expect(response.code).toBe('AUTH-001');
    expect(response.message).toBe('Invalid token');
    expect(response.details).toBeNull();
  });

  // 詳細付きで例外を生成 / 使用详细信息创建异常
  it('should create exception with details', () => {
    const exception = new WmsException('PROD_NOT_FOUND', 'SKU-12345');

    expect(exception.getStatus()).toBe(404);
    expect(exception.errorCode).toBe('PROD-001');

    const response = exception.getResponse() as Record<string, unknown>;
    expect(response.details).toBe('SKU-12345');
  });

  // 各ステータスコードの検証 / 验证各状态码
  it.each([
    ['AUTH_FORBIDDEN', 403],
    ['AUTH_RATE_LIMITED', 429],
    ['INV_INSUFFICIENT_STOCK', 409],
    ['INV_NEGATIVE_QUANTITY', 422],
    ['INV_RESERVATION_EXPIRED', 410],
    ['INTERNAL_ERROR', 500],
  ] as const)('should return status %i for %s', (code, expectedStatus) => {
    const exception = new WmsException(code);
    expect(exception.getStatus()).toBe(expectedStatus);
  });
});

describe('InsufficientStockException', () => {
  // 正しいコードとメッセージを持つ / 具有正确的代码和消息
  it('should have correct code and formatted details', () => {
    const exception = new InsufficientStockException('prod-123', 10, 3);

    expect(exception.getStatus()).toBe(409);
    expect(exception.errorCode).toBe('INV-001');

    const response = exception.getResponse() as Record<string, unknown>;
    expect(response.message).toBe('Insufficient stock');
    expect(response.details).toBe('Product prod-123: required 10, available 3');
  });
});

describe('InvalidStatusTransitionException', () => {
  // 正しいフォーマットを持つ / 具有正确的格式
  it('should have correct format', () => {
    const exception = new InvalidStatusTransitionException(
      'ShipmentOrder',
      'pending',
      'delivered',
    );

    expect(exception.getStatus()).toBe(422);
    expect(exception.errorCode).toBe('SHIP-002');

    const response = exception.getResponse() as Record<string, unknown>;
    expect(response.details).toBe(
      "ShipmentOrder: cannot transition from 'pending' to 'delivered'",
    );
  });
});

describe('DuplicateResourceException', () => {
  // 正しいフォーマットを持つ / 具有正确的格式
  it('should have correct format', () => {
    const exception = new DuplicateResourceException(
      'Product',
      'sku',
      'ABC-001',
    );

    expect(exception.getStatus()).toBe(409);
    expect(exception.errorCode).toBe('GEN-001');

    const response = exception.getResponse() as Record<string, unknown>;
    expect(response.details).toBe(
      "Product with sku='ABC-001' already exists",
    );
  });
});

describe('WMS_ERROR_CODES', () => {
  // 全エラーコードに必須フィールドがある / 所有错误代码具有必填字段
  it('should have required fields for all error codes', () => {
    for (const [key, value] of Object.entries(WMS_ERROR_CODES)) {
      expect(value).toHaveProperty('code');
      expect(value).toHaveProperty('status');
      expect(value).toHaveProperty('message');
      expect(typeof value.code).toBe('string');
      expect(typeof value.status).toBe('number');
      expect(typeof value.message).toBe('string');
      expect(value.status).toBeGreaterThanOrEqual(400);
      expect(value.status).toBeLessThanOrEqual(599);
    }
  });

  // コードの一意性を検証 / 验证代码唯一性
  it('should have unique error codes', () => {
    const codes = Object.values(WMS_ERROR_CODES).map((v) => v.code);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });
});
