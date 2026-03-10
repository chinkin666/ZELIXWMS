import type { Request, Response } from 'express';
import {
  createMappingConfig,
  getAllMappingConfigs,
  getMappingConfigById,
  updateMappingConfig,
  deleteMappingConfig,
  getDefaultMappingConfig,
} from '@/services/mappingConfigService';
import type {
  CreateMappingConfigDto,
  UpdateMappingConfigDto,
} from '@/models/mappingConfig';
import { logger } from '@/lib/logger';
import { transformPluginsMetadata, combinePluginsMetadata } from '@/transforms/plugins/metadata';

/**
 * 创建映射配置
 * POST /api/mapping-configs
 */
export const createConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const dto: CreateMappingConfigDto = req.body;

    // 基本验证
    if (!dto.configType || !dto.name || !dto.mappings || !Array.isArray(dto.mappings)) {
      res.status(400).json({
        message: 'Invalid request: configType, name, and mappings are required',
      });
      return;
    }

    const config = await createMappingConfig(dto);
    res.status(201).json(config);
  } catch (error) {
    logger.error(error, 'Failed to create mapping config');
    res.status(500).json({ message: 'Failed to create mapping config' });
  }
};

/**
 * 获取所有映射配置
 * GET /api/mapping-configs?configType=ec-company-to-order&name=xxx&orderSourceCompanyName=xxx
 */
export const listConfigs = async (req: Request, res: Response): Promise<void> => {
  try {
    const configType = req.query.configType as string | undefined;
    const searchParams = {
      name: req.query.name as string | undefined,
      orderSourceCompanyName: req.query.orderSourceCompanyName as string | undefined,
      description: req.query.description as string | undefined,
      isDefault:
        req.query.isDefault !== undefined
          ? req.query.isDefault === 'true' || req.query.isDefault === '1'
          : undefined,
    };

    // 移除 undefined 值
    const filteredSearchParams = Object.fromEntries(
      Object.entries(searchParams).filter(([_, value]) => value !== undefined),
    ) as typeof searchParams;

    const configs = await getAllMappingConfigs(
      configType,
      Object.keys(filteredSearchParams).length > 0 ? filteredSearchParams : undefined,
    );
    res.json(configs);
  } catch (error) {
    logger.error(error, 'Failed to list mapping configs');
    res.status(500).json({ message: 'Failed to list mapping configs' });
  }
};

/**
 * 根据ID获取映射配置
 * GET /api/mapping-configs/:id
 */
export const getConfigById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const config = await getMappingConfigById(id);

    if (!config) {
      res.status(404).json({ message: 'Mapping config not found' });
      return;
    }

    res.json(config);
  } catch (error) {
    logger.error(error, 'Failed to get mapping config');
    res.status(500).json({ message: 'Failed to get mapping config' });
  }
};

/**
 * 更新映射配置
 * PUT /api/mapping-configs/:id
 */
export const updateConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const dto: UpdateMappingConfigDto = req.body;

    const config = await updateMappingConfig(id, dto);

    if (!config) {
      res.status(404).json({ message: 'Mapping config not found' });
      return;
    }

    res.json(config);
  } catch (error) {
    logger.error(error, 'Failed to update mapping config');
    res.status(500).json({ message: 'Failed to update mapping config' });
  }
};

/**
 * 删除映射配置
 * DELETE /api/mapping-configs/:id
 */
export const deleteConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const success = await deleteMappingConfig(id);

    if (!success) {
      res.status(404).json({ message: 'Mapping config not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    logger.error(error, 'Failed to delete mapping config');
    res.status(500).json({ message: 'Failed to delete mapping config' });
  }
};

/**
 * 获取默认映射配置
 * GET /api/mapping-configs/default?configType=shipment-order
 */
export const getDefaultConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const configType = req.query.configType as string;

    if (!configType) {
      res.status(400).json({ message: 'Invalid or missing configType parameter' });
      return;
    }

    const config = await getDefaultMappingConfig(configType);

    if (!config) {
      res.status(404).json({ message: 'Default mapping config not found' });
      return;
    }

    res.json(config);
  } catch (error) {
    logger.error(error, 'Failed to get default mapping config');
    res.status(500).json({ message: 'Failed to get default mapping config' });
  }
};

/**
 * 获取 transform plugins 列表
 * GET /api/mapping-configs/transform-plugins
 */
export const getTransformPlugins = async (req: Request, res: Response): Promise<void> => {
  try {
    // 将 zod schema 转换为简化的 JSON Schema 用于前端表单生成
    const transformPlugins = transformPluginsMetadata.map((p) => ({
      name: p.name,
      nameJa: p.nameJa,
      summary: p.summary,
      inputKinds: p.inputKinds,
      outputKind: p.outputKind,
      outputType: p.outputType,
      descriptionJa: p.descriptionJa,
      sideEffects: p.sideEffects,
      paramsSchema: p.paramsSchema ? zodToJsonSchema(p.paramsSchema) : undefined,
    }));

    const combinePlugins = combinePluginsMetadata.map((p) => ({
      name: p.name,
      nameJa: p.nameJa,
      summary: p.summary,
      paramsSchema: p.paramsSchema ? zodToJsonSchema(p.paramsSchema) : undefined,
    }));

    res.json({
      transforms: transformPlugins,
      combines: combinePlugins,
    });
  } catch (error) {
    logger.error(error, 'Failed to get transform plugins');
    res.status(500).json({ message: 'Failed to get transform plugins' });
  }
};

/**
 * 简单的 zod schema 转 JSON Schema 转换器（简化版）
 */
function zodToJsonSchema(schema: any): any {
  // 这是一个简化版本，只处理基本类型
  // 实际项目中可以使用 zod-to-json-schema 库
  if (schema._def?.typeName === 'ZodObject') {
    const shape = schema._def.shape();
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      // Unwrap optional/nullable/default wrappers so frontend can render correct inputs.
      // NOTE: We keep "required" decision based on the OUTER wrapper.
      const outerSchema = value as any;
      const outerDef = outerSchema?._def;
      const unwrap = (s: any): any => {
        let cur = s;
        // Peel Optional/Nullable/Default recursively
        while (cur?._def?.typeName === 'ZodOptional' || cur?._def?.typeName === 'ZodNullable' || cur?._def?.typeName === 'ZodDefault') {
          const t = cur._def.typeName;
          if (t === 'ZodOptional' || t === 'ZodNullable') {
            cur = cur._def.innerType;
          } else if (t === 'ZodDefault') {
            cur = cur._def.innerType;
          }
        }
        return cur;
      };

      const fieldSchema = unwrap(outerSchema);
      const fieldDef = fieldSchema?._def;
      
      // 检查是否有默认值（外层是 ZodDefault）
      const hasDefault = outerDef?.typeName === 'ZodDefault';
      const defaultValue = hasDefault ? outerDef.defaultValue() : undefined;

      if (fieldDef?.typeName === 'ZodString') {
        properties[key] = { type: 'string', ...(hasDefault ? { default: defaultValue } : {}) };
      } else if (fieldDef?.typeName === 'ZodNumber') {
        properties[key] = { type: 'number', ...(hasDefault ? { default: defaultValue } : {}) };
      } else if (fieldDef?.typeName === 'ZodBoolean') {
        properties[key] = { type: 'boolean', ...(hasDefault ? { default: defaultValue } : {}) };
      } else if (fieldDef?.typeName === 'ZodArray') {
        properties[key] = { type: 'array', items: { type: 'string' }, ...(hasDefault ? { default: defaultValue } : {}) };
      } else if (fieldDef?.typeName === 'ZodEnum') {
        properties[key] = {
          type: 'string',
          enum: fieldDef.values,
          ...(hasDefault ? { default: defaultValue } : {}),
        };
      } else if (fieldDef?.typeName === 'ZodLiteral') {
        properties[key] = {
          type: 'string',
          const: fieldDef.value,
          ...(hasDefault ? { default: defaultValue } : {}),
        };
      } else {
        properties[key] = { type: 'any', ...(hasDefault ? { default: defaultValue } : {}) };
      }

      // 检查是否必填（没有 default 且不是 optional）
      if (
        !outerDef?.typeName?.includes('Default') &&
        !outerDef?.typeName?.includes('Optional')
      ) {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  return { type: 'any' };
}

