import type {
  MappingConfigDocument,
  CreateMappingConfigDto,
  UpdateMappingConfigDto,
} from '@/models/mappingConfig';
import { MappingConfig } from '@/models/mappingConfig';
import { OrderSourceCompany } from '@/models/orderSourceCompany';
import { Carrier } from '@/models/carrier';
import { logger } from '@/lib/logger';

/**
 * 映射配置服务
 * 负责映射配置的增删改查操作
 */

/**
 * 获取租户ID（从请求参数或默认值）/ テナントIDを取得（リクエストパラメータまたはデフォルト値）
 *
 * Controller 层通过 req.user?.tenantId 传入，此处提供 fallback。
 * Controller 層で req.user?.tenantId を渡し、ここでは fallback を提供。
 */
const getTenantId = (tenantId?: string): string => {
  return tenantId || 'default-tenant';
};

/**
 * 将 Mongoose 文档转换为 MappingConfigDocument
 */
const toDocument = (doc: any): MappingConfigDocument => {
  return {
    _id: doc._id.toString(),
    schemaVersion: doc.schemaVersion ?? 2,
    tenantId: doc.tenantId,
    configType: doc.configType,
    name: doc.name,
    description: doc.description,
    isDefault: doc.isDefault ?? false,
    orderSourceCompanyId: doc.orderSourceCompanyId,
    orderSourceCompanyName: doc.orderSourceCompanyName,
    carrierId: doc.carrierId,
    carrierCode: doc.carrierCode,
    carrierName: doc.carrierName,
    mappings: doc.mappings,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    createdBy: doc.createdBy,
    updatedBy: doc.updatedBy,
  };
};

/**
 * 填充关联数据（orderSourceCompanyName 和 carrierName）
 */
const populateRelatedFields = async (
  dto: CreateMappingConfigDto | UpdateMappingConfigDto,
): Promise<{
  orderSourceCompanyId?: string;
  orderSourceCompanyName?: string;
  carrierCode?: string;
  carrierName?: string;
}> => {
  const result: {
    orderSourceCompanyId?: string;
    orderSourceCompanyName?: string;
    carrierCode?: string;
    carrierName?: string;
  } = {};

  // 处理订单来源公司
  if (dto.orderSourceCompanyId) {
    // 如果提供了 ID，根据 ID 查找名称
    const company = await OrderSourceCompany.findById(dto.orderSourceCompanyId);
    if (company) {
      result.orderSourceCompanyId = dto.orderSourceCompanyId;
      result.orderSourceCompanyName = company.senderName;
    }
  } else if (dto.orderSourceCompanyName) {
    // 如果只提供了名称，根据名称查找或创建
    let company = await OrderSourceCompany.findOne({
      senderName: dto.orderSourceCompanyName,
    });

    if (!company) {
      // 如果不存在，创建新的订单来源公司
      // 注意：这里只需要设置名称，其他字段为可选，不设置或设置为 undefined
      // 空字符串会被转换为 undefined，避免触发 Mongoose 验证错误
      const companyData: any = {
        senderName: dto.orderSourceCompanyName,
      };
      
      // 只设置非空字段，空字符串不设置（保持 undefined）
      // 这样 Mongoose 就不会对这些可选字段进行验证
      company = new OrderSourceCompany(companyData);
      await company.save();
      logger.info({ companyId: company._id.toString(), senderName: company.senderName }, 'Order source company created');
    }

    result.orderSourceCompanyId = company._id.toString();
    result.orderSourceCompanyName = company.senderName;
  }

  // 填充快递公司信息
  if (dto.carrierId) {
    const carrier = await Carrier.findById(dto.carrierId);
    if (carrier) {
      result.carrierCode = carrier.code;
      result.carrierName = carrier.name;
    }
  }

  return result;
};

/**
 * 创建映射配置
 */
export const createMappingConfig = async (
  dto: CreateMappingConfigDto,
): Promise<MappingConfigDocument> => {
  const tenantId = getTenantId();

  // 如果设置为默认配置，先取消其他默认配置
  if (dto.isDefault) {
    await MappingConfig.updateMany(
      {
        tenantId,
        configType: dto.configType,
        isDefault: true,
      },
      {
        $set: { isDefault: false },
      },
    );
  }

  // 填充关联字段
  const relatedFields = await populateRelatedFields(dto);

  // 创建新配置
  const config = new MappingConfig({
    tenantId,
    schemaVersion: dto.schemaVersion ?? 2,
    configType: dto.configType,
    name: dto.name,
    description: dto.description,
    isDefault: dto.isDefault ?? false,
    orderSourceCompanyId: relatedFields.orderSourceCompanyId || dto.orderSourceCompanyId,
    orderSourceCompanyName: relatedFields.orderSourceCompanyName,
    carrierId: dto.carrierId,
    carrierCode: relatedFields.carrierCode,
    carrierName: relatedFields.carrierName,
    mappings: dto.mappings,
  });

  const savedConfig = await config.save();
  const savedDoc = toDocument(savedConfig);
  logger.info({ configId: savedDoc._id, name: savedDoc.name }, 'Mapping config created');

  return savedDoc;
};

/**
 * 获取所有映射配置
 */
export const getAllMappingConfigs = async (
  configType?: string,
  searchParams?: {
    name?: string;
    orderSourceCompanyName?: string;
    description?: string;
    isDefault?: boolean;
  },
): Promise<MappingConfigDocument[]> => {
  const tenantId = getTenantId();

  // 构建查询条件
  const query: any = { tenantId };

  if (configType) {
    query.configType = configType;
  }

  // 按搜索参数过滤
  if (searchParams) {
    if (searchParams.name) {
      query.name = { $regex: searchParams.name, $options: 'i' };
    }
    if (searchParams.orderSourceCompanyName) {
      query.orderSourceCompanyName = {
        $regex: searchParams.orderSourceCompanyName,
        $options: 'i',
      };
    }
    if (searchParams.description) {
      query.description = { $regex: searchParams.description, $options: 'i' };
    }
    if (searchParams.isDefault !== undefined) {
      query.isDefault = searchParams.isDefault;
    }
  }

  // 查询数据库
  const configs = await MappingConfig.find(query).sort({ createdAt: -1 });

  return configs.map(toDocument);
};

/**
 * 根据ID获取映射配置
 */
export const getMappingConfigById = async (
  id: string,
): Promise<MappingConfigDocument | null> => {
  const tenantId = getTenantId();

  try {
    const config = await MappingConfig.findOne({ _id: id, tenantId });

    if (!config) {
      return null;
    }

    return toDocument(config);
  } catch (error) {
    logger.error(error, 'Failed to get mapping config by id');
    return null;
  }
};

/**
 * 更新映射配置
 */
export const updateMappingConfig = async (
  id: string,
  dto: UpdateMappingConfigDto,
): Promise<MappingConfigDocument | null> => {
  const tenantId = getTenantId();

  try {
    const config = await MappingConfig.findOne({ _id: id, tenantId });

    if (!config) {
      return null;
    }

    const configDoc = toDocument(config);

    // 如果设置为默认配置，先取消其他默认配置
    if (dto.isDefault === true) {
      const targetConfigType = dto.configType ?? configDoc.configType;
      await MappingConfig.updateMany(
        {
          _id: { $ne: id },
          tenantId,
          configType: targetConfigType,
          isDefault: true,
        },
        {
          $set: { isDefault: false },
        },
      );
    }

    // 填充关联字段（如果更新了 ID 或名称）
    const relatedFields = await populateRelatedFields(dto);

    // 更新字段
    const updateData: any = {};
    if (dto.schemaVersion !== undefined) updateData.schemaVersion = dto.schemaVersion;
    if (dto.configType !== undefined) updateData.configType = dto.configType;
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.isDefault !== undefined) updateData.isDefault = dto.isDefault;
    if (dto.mappings !== undefined) updateData.mappings = dto.mappings;
    if (dto.orderSourceCompanyId !== undefined || dto.orderSourceCompanyName !== undefined) {
      updateData.orderSourceCompanyId = relatedFields.orderSourceCompanyId || dto.orderSourceCompanyId || configDoc.orderSourceCompanyId;
      updateData.orderSourceCompanyName = relatedFields.orderSourceCompanyName || configDoc.orderSourceCompanyName;
    }
    if (dto.carrierId !== undefined) {
      updateData.carrierId = dto.carrierId;
      if (relatedFields.carrierCode) updateData.carrierCode = relatedFields.carrierCode;
      if (relatedFields.carrierName) updateData.carrierName = relatedFields.carrierName;
    }

    const updatedConfig = await MappingConfig.findByIdAndUpdate(id, { $set: updateData }, { new: true });

    if (!updatedConfig) {
      return null;
    }

    const updatedDoc = toDocument(updatedConfig);
    logger.info({ configId: id, name: updatedDoc.name }, 'Mapping config updated');

    return updatedDoc;
  } catch (error) {
    logger.error(error, 'Failed to update mapping config');
    return null;
  }
};

/**
 * 删除映射配置
 */
export const deleteMappingConfig = async (id: string): Promise<boolean> => {
  const tenantId = getTenantId();

  try {
    const config = await MappingConfig.findOneAndDelete({ _id: id, tenantId });

    if (!config) {
      return false;
    }

    const configDoc = toDocument(config);
    logger.info({ configId: id, name: configDoc.name }, 'Mapping config deleted');

    return true;
  } catch (error) {
    logger.error(error, 'Failed to delete mapping config');
    return false;
  }
};

/**
 * 获取默认映射配置
 */
export const getDefaultMappingConfig = async (
  configType: string,
): Promise<MappingConfigDocument | null> => {
  const tenantId = getTenantId();

  try {
    const config = await MappingConfig.findOne({
      tenantId,
      configType,
      isDefault: true,
    });

    if (!config) {
      return null;
    }

    return toDocument(config);
  } catch (error) {
    logger.error(error, 'Failed to get default mapping config');
    return null;
  }
};

