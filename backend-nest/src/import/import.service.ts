// インポートサービス（CSVインポート）/ 导入服务（CSV导入）
import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module.js';
import type { DrizzleDB } from '../database/database.types.js';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { products } from '../database/schema/products.js';
import { shipmentOrders } from '../database/schema/shipments.js';
import { stockQuants } from '../database/schema/inventory.js';

// ファイルサイズ上限（10MB）/ 文件大小上限（10MB）
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

// エンティティタイプ別の必須フィールド / 按实体类型的必填字段
const REQUIRED_FIELDS: Record<string, string[]> = {
  products: ['sku', 'name'],
  orders: ['orderNumber', 'recipientName'],
  inventory: ['productId', 'locationId', 'quantity'],
};

// エンティティタイプ別のフィールド型定義 / 按实体类型的字段类型定义
const FIELD_TYPES: Record<string, Record<string, 'string' | 'number' | 'boolean'>> = {
  products: { sku: 'string', name: 'string', price: 'number', weight: 'number' },
  orders: { orderNumber: 'string', recipientName: 'string', recipientPhone: 'string' },
  inventory: { productId: 'string', locationId: 'string', quantity: 'number' },
};

// バリデーション結果 / 验证结果
export interface ValidateResult {
  valid: boolean;
  errors: string[];
  preview: any[];
}

// インポート結果 / 导入结果
export interface ImportResult {
  imported: number;
  errors: string[];
}

@Injectable()
export class ImportService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // CSVデータバリデーション / CSV数据验证
  async validateCsv(
    tenantId: string,
    data: any[],
    mappingConfigId?: string,
    fileSize?: number,
  ): Promise<ValidateResult> {
    const errors: string[] = [];
    const preview: any[] = [];

    // ファイルサイズチェック / 文件大小检查
    if (fileSize && fileSize > MAX_FILE_SIZE_BYTES) {
      throw new WmsException(
        'IMPORT_FILE_TOO_LARGE',
        `File size ${(fileSize / 1024 / 1024).toFixed(2)}MB exceeds 10MB limit`,
      );
    }

    // 空データチェック / 空数据检查
    if (!data || data.length === 0) {
      return {
        valid: false,
        errors: ['No data provided / データがありません / 没有提供数据'],
        preview: [],
      };
    }

    // ヘッダーバリデーション（マッピング設定に基づく）/ 头部验证（基于映射配置）
    const headers = Object.keys(data[0]);
    if (headers.length === 0) {
      throw new WmsException(
        'IMPORT_INVALID_HEADERS',
        'CSV has no columns / CSVにカラムがありません / CSV没有列',
      );
    }

    // エンティティタイプ推定（mappingConfigIdがあれば利用）/ 推断实体类型
    const entityType = mappingConfigId ?? this.detectEntityType(headers);
    const requiredFields = REQUIRED_FIELDS[entityType] ?? [];
    const fieldTypes = FIELD_TYPES[entityType] ?? {};

    // 必須フィールドチェック / 必填字段检查
    const missingHeaders = requiredFields.filter((f) => !headers.includes(f));
    if (missingHeaders.length > 0) {
      throw new WmsException(
        'IMPORT_INVALID_HEADERS',
        `Missing required headers: ${missingHeaders.join(', ')} / 必須ヘッダー不足: ${missingHeaders.join(', ')} / 缺少必填头: ${missingHeaders.join(', ')}`,
      );
    }

    // 各行バリデーション / 逐行验证
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 1;

      // 必須フィールドの値チェック / 必填字段值检查
      for (const field of requiredFields) {
        const value = row[field];
        if (value === undefined || value === null || String(value).trim() === '') {
          errors.push(
            `Row ${rowNum}: "${field}" is required / 行${rowNum}: "${field}"は必須です / 第${rowNum}行: "${field}"为必填`,
          );
        }
      }

      // フィールド型チェック / 字段类型检查
      for (const [field, expectedType] of Object.entries(fieldTypes)) {
        const value = row[field];
        if (value === undefined || value === null) continue;

        if (expectedType === 'number' && isNaN(Number(value))) {
          errors.push(
            `Row ${rowNum}: "${field}" must be a number / 行${rowNum}: "${field}"は数値である必要があります / 第${rowNum}行: "${field}"必须为数字`,
          );
        }
      }
    }

    // バリデーション失敗時 / 验证失败时
    if (errors.length > 0) {
      throw new WmsException(
        'IMPORT_VALIDATION_FAILED',
        errors.join('; '),
      );
    }

    // プレビュー用に先頭5件を返す / 返回前5条作为预览
    const previewCount = Math.min(5, data.length);
    for (let i = 0; i < previewCount; i++) {
      preview.push(data[i]);
    }

    return {
      valid: true,
      errors,
      preview,
    };
  }

  // CSVデータインポート実行 / 执行CSV数据导入
  async importCsv(
    tenantId: string,
    data: any[],
    entityType: string,
  ): Promise<ImportResult> {
    // 空データチェック / 空数据检查
    if (!data || data.length === 0) {
      return {
        imported: 0,
        errors: ['No data provided / データがありません / 没有提供数据'],
      };
    }

    // エンティティタイプ別にルーティング / 按实体类型路由
    return this.importByEntityType(tenantId, data, entityType);
  }

  // エンティティタイプ別インポートルーティング / 按实体类型路由导入
  private async importByEntityType(
    tenantId: string,
    data: any[],
    entityType: string,
  ): Promise<ImportResult> {
    switch (entityType) {
      case 'products':
        return this.importProducts(tenantId, data);
      case 'orders':
        return this.importOrders(tenantId, data);
      case 'inventory':
        return this.importInventory(tenantId, data);
      default:
        return {
          imported: 0,
          errors: [
            `Unsupported entity type: ${entityType}. Supported: products, orders, inventory / ` +
            `未対応のエンティティタイプ: ${entityType} / ` +
            `不支持的实体类型: ${entityType}`,
          ],
        };
    }
  }

  // 商品インポート / 导入商品
  private async importProducts(tenantId: string, data: any[]): Promise<ImportResult> {
    const errors: string[] = [];
    let imported = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 1;
      try {
        await (this.db as any)
          .insert(products)
          .values({
            tenantId,
            sku: String(row.sku),
            name: String(row.name),
            nameFull: row.nameFull ?? null,
            price: row.price != null ? String(row.price) : null,
            weight: row.weight != null ? String(row.weight) : null,
            category: row.category ?? '0',
            barcode: row.barcode ? [String(row.barcode)] : [],
            memo: row.memo ?? null,
          });
        imported++;
      } catch (err: any) {
        errors.push(
          `Row ${rowNum}: ${err.message ?? 'Unknown error'} / 行${rowNum}: インポート失敗 / 第${rowNum}行: 导入失败`,
        );
      }
    }

    return { imported, errors };
  }

  // 出荷注文インポート / 导入出货订单
  private async importOrders(tenantId: string, data: any[]): Promise<ImportResult> {
    const errors: string[] = [];
    let imported = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 1;
      try {
        await (this.db as any)
          .insert(shipmentOrders)
          .values({
            tenantId,
            orderNumber: String(row.orderNumber),
            recipientName: row.recipientName ?? null,
            recipientPhone: row.recipientPhone ?? null,
            recipientPostalCode: row.recipientPostalCode ?? null,
            recipientPrefecture: row.recipientPrefecture ?? null,
            recipientCity: row.recipientCity ?? null,
            recipientStreet: row.recipientStreet ?? null,
            recipientBuilding: row.recipientBuilding ?? null,
            senderName: row.senderName ?? null,
            senderPhone: row.senderPhone ?? null,
            carrierId: row.carrierId ?? null,
            invoiceType: row.invoiceType ?? null,
          });
        imported++;
      } catch (err: any) {
        errors.push(
          `Row ${rowNum}: ${err.message ?? 'Unknown error'} / 行${rowNum}: インポート失敗 / 第${rowNum}行: 导入失败`,
        );
      }
    }

    return { imported, errors };
  }

  // 在庫インポート / 导入库存
  private async importInventory(tenantId: string, data: any[]): Promise<ImportResult> {
    const errors: string[] = [];
    let imported = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 1;
      try {
        await (this.db as any)
          .insert(stockQuants)
          .values({
            tenantId,
            productId: String(row.productId),
            locationId: String(row.locationId),
            quantity: Number(row.quantity),
            reservedQuantity: row.reservedQuantity ? Number(row.reservedQuantity) : 0,
            lotId: row.lotId ?? null,
          });
        imported++;
      } catch (err: any) {
        errors.push(
          `Row ${rowNum}: ${err.message ?? 'Unknown error'} / 行${rowNum}: インポート失敗 / 第${rowNum}行: 导入失败`,
        );
      }
    }

    return { imported, errors };
  }

  // ヘッダーからエンティティタイプを推定 / 从头部推断实体类型
  private detectEntityType(headers: string[]): string {
    if (headers.includes('sku') && headers.includes('name')) return 'products';
    if (headers.includes('orderNumber')) return 'orders';
    if (headers.includes('productId') && headers.includes('locationId')) return 'inventory';
    return 'products'; // デフォルト / 默认
  }
}
