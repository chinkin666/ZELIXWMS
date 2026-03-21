// WMS 基底例外クラス / WMS基础异常类
import { HttpException } from '@nestjs/common';
import { WMS_ERROR_CODES, type WmsErrorCode } from './wms-error-codes.js';

export class WmsException extends HttpException {
  public readonly errorCode: string;

  constructor(code: WmsErrorCode, details?: string) {
    const errorDef = WMS_ERROR_CODES[code];
    super(
      {
        code: errorDef.code,
        message: errorDef.message,
        details: details || null,
      },
      errorDef.status,
    );
    this.errorCode = errorDef.code;
  }
}

// 在庫不足例外 / 库存不足异常
export class InsufficientStockException extends WmsException {
  constructor(productId: string, required: number, available: number) {
    super(
      'INV_INSUFFICIENT_STOCK',
      `Product ${productId}: required ${required}, available ${available}`,
    );
  }
}

// 無効なステータス遷移例外 / 无效状态转换异常
export class InvalidStatusTransitionException extends WmsException {
  constructor(entity: string, from: string, to: string) {
    super(
      'SHIP_INVALID_STATUS',
      `${entity}: cannot transition from '${from}' to '${to}'`,
    );
  }
}

// 重複リソース例外 / 重复资源异常
export class DuplicateResourceException extends WmsException {
  constructor(resource: string, field: string, value: string) {
    super(
      'DUPLICATE_RESOURCE',
      `${resource} with ${field}='${value}' already exists`,
    );
  }
}
