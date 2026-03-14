/**
 * 自定义字段服务 / カスタムフィールドサービス
 *
 * 管理自定义字段定义的 CRUD，并提供字段值校验。
 * カスタムフィールド定義の CRUD 管理およびフィールド値バリデーション。
 */

import { logger } from '@/lib/logger';
import {
  CustomFieldDefinition,
  type ICustomFieldDefinition,
  type CustomFieldEntityType,
  type CustomFieldType,
} from '@/models/customFieldDefinition';

export class CustomFieldService {
  /**
   * 获取指定实体类型的所有字段定义 / 指定エンティティの全フィールド定義を取得
   */
  async getDefinitions(
    entityType: CustomFieldEntityType,
    tenantId?: string,
  ): Promise<ICustomFieldDefinition[]> {
    const filter: Record<string, unknown> = { entityType, enabled: true };
    if (tenantId) filter.tenantId = tenantId;
    return CustomFieldDefinition.find(filter).sort({ sortOrder: 1, createdAt: 1 }).lean();
  }

  /**
   * 获取所有字段定义（管理用）/ 全フィールド定義取得（管理用）
   */
  async getAllDefinitions(
    params?: { entityType?: string; tenantId?: string },
  ): Promise<ICustomFieldDefinition[]> {
    const filter: Record<string, unknown> = {};
    if (params?.entityType) filter.entityType = params.entityType;
    if (params?.tenantId) filter.tenantId = params.tenantId;
    return CustomFieldDefinition.find(filter).sort({ entityType: 1, sortOrder: 1 }).lean();
  }

  /**
   * 创建字段定义 / フィールド定義を作成
   */
  async createDefinition(
    data: Partial<ICustomFieldDefinition>,
  ): Promise<ICustomFieldDefinition> {
    // fieldKey 格式校验 / fieldKey フォーマットバリデーション
    if (data.fieldKey && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(data.fieldKey)) {
      throw new Error('fieldKey は英数字とアンダースコアのみ使用可能（先頭は英字または_）');
    }

    // select 类型必须有 options / select タイプは options 必須
    if (data.fieldType === 'select' && (!data.options || data.options.length === 0)) {
      throw new Error('select タイプには options が必須です');
    }

    const definition = await CustomFieldDefinition.create(data);
    logger.info(
      { entityType: data.entityType, fieldKey: data.fieldKey },
      'Custom field definition created / カスタムフィールド定義を作成',
    );
    return definition.toObject();
  }

  /**
   * 更新字段定义 / フィールド定義を更新
   */
  async updateDefinition(
    id: string,
    data: Partial<ICustomFieldDefinition>,
  ): Promise<ICustomFieldDefinition | null> {
    // 不允许修改 entityType 和 fieldKey / entityType と fieldKey の変更は不可
    const { entityType: _e, fieldKey: _f, ...updateData } = data as Record<string, unknown>;

    if (data.fieldType === 'select' && data.options && data.options.length === 0) {
      throw new Error('select タイプには options が必須です');
    }

    const updated = await CustomFieldDefinition.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    ).lean();

    if (updated) {
      logger.info({ id }, 'Custom field definition updated / カスタムフィールド定義を更新');
    }
    return updated;
  }

  /**
   * 删除字段定义 / フィールド定義を削除
   */
  async deleteDefinition(id: string): Promise<boolean> {
    const result = await CustomFieldDefinition.findByIdAndDelete(id);
    if (result) {
      logger.info({ id }, 'Custom field definition deleted / カスタムフィールド定義を削除');
    }
    return !!result;
  }

  /**
   * 校验 customFields 值是否符合定义 / customFields 値がフィールド定義に適合するかバリデーション
   */
  async validateValues(
    entityType: CustomFieldEntityType,
    values: Record<string, unknown>,
    tenantId?: string,
  ): Promise<{ valid: boolean; errors: string[] }> {
    const definitions = await this.getDefinitions(entityType, tenantId);
    const errors: string[] = [];

    for (const def of definitions) {
      const value = values[def.fieldKey];

      // 必须字段检查 / 必須フィールドチェック
      if (def.required && (value === undefined || value === null || value === '')) {
        errors.push(`${def.label} は必須です`);
        continue;
      }

      if (value === undefined || value === null) continue;

      // 类型检查 / タイプチェック
      if (!this.checkType(value, def.fieldType, def.options)) {
        errors.push(`${def.label} のタイプが正しくありません（期待: ${def.fieldType}）`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * 获取带默认值的 customFields / デフォルト値付き customFields を取得
   */
  async getDefaultValues(
    entityType: CustomFieldEntityType,
    tenantId?: string,
  ): Promise<Record<string, unknown>> {
    const definitions = await this.getDefinitions(entityType, tenantId);
    const defaults: Record<string, unknown> = {};
    for (const def of definitions) {
      if (def.defaultValue !== undefined && def.defaultValue !== null) {
        defaults[def.fieldKey] = def.defaultValue;
      }
    }
    return defaults;
  }

  private checkType(value: unknown, fieldType: CustomFieldType, options?: string[]): boolean {
    switch (fieldType) {
      case 'text':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'date':
        return typeof value === 'string' && !isNaN(Date.parse(value));
      case 'select':
        return typeof value === 'string' && (options ?? []).includes(value);
      default:
        return true;
    }
  }
}
