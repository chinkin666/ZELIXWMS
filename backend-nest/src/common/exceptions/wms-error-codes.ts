// WMS エラーコード定義 / WMS错误代码定义
export const WMS_ERROR_CODES = {
  // Auth 認証 / 认证
  AUTH_INVALID_TOKEN: { code: 'AUTH-001', status: 401, message: 'Invalid token' },
  AUTH_EXPIRED_TOKEN: { code: 'AUTH-002', status: 401, message: 'Token expired' },
  AUTH_FORBIDDEN: { code: 'AUTH-003', status: 403, message: 'Insufficient permissions' },
  AUTH_RATE_LIMITED: { code: 'AUTH-004', status: 429, message: 'Too many login attempts' },

  // Product 商品 / 商品
  PROD_NOT_FOUND: { code: 'PROD-001', status: 404, message: 'Product not found' },
  PROD_DUPLICATE_SKU: { code: 'PROD-002', status: 409, message: 'Duplicate SKU' },
  PROD_INVALID_BARCODE: { code: 'PROD-003', status: 422, message: 'Invalid barcode format' },

  // Inventory 在庫 / 库存
  INV_INSUFFICIENT_STOCK: { code: 'INV-001', status: 409, message: 'Insufficient stock' },
  INV_NEGATIVE_QUANTITY: { code: 'INV-002', status: 422, message: 'Quantity cannot be negative' },
  INV_RESERVATION_EXPIRED: { code: 'INV-003', status: 410, message: 'Reservation expired' },
  INV_LOCATION_NOT_FOUND: { code: 'INV-004', status: 404, message: 'Location not found' },

  // Shipment 出荷 / 出货
  SHIP_NOT_FOUND: { code: 'SHIP-001', status: 404, message: 'Shipment order not found' },
  SHIP_INVALID_STATUS: { code: 'SHIP-002', status: 422, message: 'Invalid status transition' },
  SHIP_ALREADY_SHIPPED: { code: 'SHIP-003', status: 409, message: 'Order already shipped' },

  // Inbound 入庫 / 入库
  INBOUND_NOT_FOUND: { code: 'INB-001', status: 404, message: 'Inbound order not found' },
  INBOUND_INVALID_STATUS: { code: 'INB-002', status: 422, message: 'Invalid status transition' },
  INBOUND_QUANTITY_MISMATCH: { code: 'INB-003', status: 422, message: 'Received quantity exceeds expected' },

  // Billing 請求 / 请求
  BILL_NOT_FOUND: { code: 'BILL-001', status: 404, message: 'Billing record not found' },
  BILL_ALREADY_INVOICED: { code: 'BILL-002', status: 409, message: 'Already invoiced' },

  // Carrier 配送 / 配送
  CARRIER_NOT_FOUND: { code: 'CARR-001', status: 404, message: 'Carrier not found' },
  CARRIER_BUILT_IN: { code: 'CARR-002', status: 403, message: 'Cannot modify built-in carrier' },
  CARRIER_SESSION_EXPIRED: { code: 'CARR-003', status: 401, message: 'Carrier session expired' },

  // Tenant テナント / 租户
  TENANT_MISMATCH: { code: 'TENANT-001', status: 403, message: 'Tenant mismatch' },
  TENANT_NOT_FOUND: { code: 'TENANT-002', status: 404, message: 'Tenant not found' },

  // General 一般 / 通用
  DUPLICATE_RESOURCE: { code: 'GEN-001', status: 409, message: 'Resource already exists' },
  VALIDATION_ERROR: { code: 'GEN-002', status: 422, message: 'Validation failed' },
  INTERNAL_ERROR: { code: 'GEN-003', status: 500, message: 'Internal server error' },
} as const;

export type WmsErrorCode = keyof typeof WMS_ERROR_CODES;
