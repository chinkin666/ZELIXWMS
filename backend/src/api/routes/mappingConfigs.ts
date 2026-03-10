import { Router } from 'express';
import {
  createConfig,
  listConfigs,
  getConfigById,
  updateConfig,
  deleteConfig,
  getDefaultConfig,
  getTransformPlugins,
} from '@/api/controllers/mappingConfigController';

export const mappingConfigRouter = Router();

// 获取 transform plugins 列表
mappingConfigRouter.get('/transform-plugins', getTransformPlugins);

// 获取默认配置
mappingConfigRouter.get('/default', getDefaultConfig);

// 获取所有配置
mappingConfigRouter.get('/', listConfigs);

// 根据ID获取配置
mappingConfigRouter.get('/:id', getConfigById);

// 创建配置
mappingConfigRouter.post('/', createConfig);

// 更新配置
mappingConfigRouter.put('/:id', updateConfig);

// 删除配置
mappingConfigRouter.delete('/:id', deleteConfig);

