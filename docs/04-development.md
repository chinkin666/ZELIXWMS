# ZELIXWMS 开发文档（Development Guide）

> 版本: 1.0 | 日期: 2026-03-14

---

## 1. 开发环境搭建

### 1.1 前置要求

| 工具 | 版本 | 说明 |
|------|------|------|
| Node.js | ≥20 | 运行时 |
| MongoDB | 6.x+ | 数据库（standalone 或 replica set） |
| pnpm / npm | 最新 | 包管理器 |
| Git | 最新 | 版本控制 |

### 1.2 安装步骤

```bash
# 1. 克隆项目
git clone <repo-url> ZELIXWMS
cd ZELIXWMS

# 2. 安装依赖（Monorepo 工作区）
npm install

# 3. 配置环境变量
cp backend/.env.example backend/.env
# 编辑 backend/.env 设置 MONGODB_URI 等

# 4. 启动 MongoDB
mongod --dbpath ./local-db

# 5. 启动后端
cd backend && npm run dev

# 6. 启动前端（新终端）
cd frontend && npm run dev
```

### 1.3 Monorepo 工作区

```json
// 根 package.json
{
  "workspaces": ["backend", "frontend", "mobile"]
}
```

- `backend/` — Express API 服务
- `frontend/` — Vue 3 SPA
- `shared/` — 共享类型定义
- `mobile/` — 移动端（未来扩展）

### 1.4 开发端口

| 服务 | 端口 | 说明 |
|------|------|------|
| Frontend (Vite) | 5173 (默认) | 开发服务器 |
| Backend (Express) | 4000 | API 服务 |
| MongoDB | 27017 | 数据库 |

Vite 配置了 proxy 将 `/api` 请求代理到后端：

```typescript
// frontend/vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:4000',
      changeOrigin: true
    }
  }
}
```

---

## 2. 代码规范

### 2.1 TypeScript 规范

- 严格模式 (`strict: true`)
- 所有函数参数和返回值必须有类型标注
- 使用 Zod 进行运行时校验（后端输入）
- 避免 `any` 类型，必要时使用 `unknown`

### 2.2 后端代码组织

#### 新增功能模块步骤

1. **Model** — 在 `backend/src/models/` 创建 Mongoose Schema
2. **Controller** — 在 `backend/src/api/controllers/` 创建控制器
3. **Routes** — 在 `backend/src/api/routes/index.ts` 注册路由
4. **Service**（可选）— 复杂业务逻辑放在 `backend/src/services/`

#### Controller 模式

```typescript
// backend/src/api/controllers/exampleController.ts
import { Router, Request, Response } from 'express';
import { ExampleModel } from '../../models/example';

const router = Router();

// GET /api/examples
router.get('/', async (req: Request, res: Response) => {
  try {
    const items = await ExampleModel.find();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/examples
router.post('/', async (req: Request, res: Response) => {
  try {
    const item = new ExampleModel(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
```

#### 路由注册

```typescript
// backend/src/api/routes/index.ts
import exampleController from '../controllers/exampleController';
router.use('/examples', exampleController);
```

### 2.3 前端代码组织

#### 新增页面步骤

1. **View** — 在 `frontend/src/views/` 对应领域目录创建 `.vue` 文件
2. **Router** — 在 `frontend/src/router/index.ts` 添加路由
3. **API** — 在 `frontend/src/api/` 创建 API 客户端模块
4. **Composable**（可选）— 抽取复杂逻辑到 `composables/`
5. **Store**（可选）— 需要跨组件状态时创建 Pinia Store

#### Vue 组件规范

```vue
<!-- 使用 Composition API + script setup -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { exampleApi } from '@/api/examples'

const { t } = useI18n()
const items = ref<Example[]>([])
const loading = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    items.value = await exampleApi.getAll()
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="page-container">
    <el-table :data="items" v-loading="loading">
      <!-- columns -->
    </el-table>
  </div>
</template>
```

#### API 客户端模式

```typescript
// frontend/src/api/examples.ts
import { api } from './base'

export const exampleApi = {
  getAll: () => api.get('/examples').then(r => r.data),
  getById: (id: string) => api.get(`/examples/${id}`).then(r => r.data),
  create: (data: any) => api.post('/examples', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/examples/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/examples/${id}`).then(r => r.data),
}
```

---

## 3. 关键模块开发指南

### 3.1 出荷指示（ShipmentOrder）

**核心文件**：
- Model: `backend/src/models/shipmentOrder.ts`
- Controller: `backend/src/api/controllers/shipmentOrderController.ts`
- V1 View: `frontend/src/views/shipment/ShipmentOrderCreate.vue`
- V2 Module: `frontend/src/modules/shipment/`

**状态流转**：
```
创建 → carrierReceipt(回执) → confirm(確認/锁库)
    → printed(印刷) → inspected(検品) → shipped(出荷) → ecExported(EC出力)
```

**注意事项**：
- confirm 时会调用 `stockService.reserveStockForOrder()` 预留库存
- unconfirm 时调用 `stockService.unreserveStockForOrder()` 释放库存
- 每次状态变更后触发 `autoProcessingEngine.processOrderEvent()`
- `_productsMeta` 由 pre-save hook 自动维护，不要手动修改

### 3.2 入库管理（InboundOrder）

**核心文件**：
- Model: `backend/src/models/inboundOrder.ts`
- Controller: `backend/src/api/controllers/inboundOrderController.ts`
- Workflow: `backend/src/services/inboundWorkflow.ts`
- Views: `frontend/src/views/inbound/`

**工作流**：
```
draft → confirmed → startReceiving() → receiving
  → confirmReceiveLine() x N → received
  → startPutaway() → putaway tasks
  → completePutaway() x N → done
```

### 3.3 库存管理

**核心文件**：
- StockQuant: `backend/src/models/stockQuant.ts`
- StockMove: `backend/src/models/stockMove.ts`
- InventoryLedger: `backend/src/models/inventoryLedger.ts`
- StockService: `backend/src/services/stockService.ts`

**关键概念**：
- **StockQuant** = 某个库位上某个商品（某批次）的实际数量
- **reservedQuantity** = 已被出库单预留但未出库的数量
- **可用量** = quantity - reservedQuantity
- 所有库存变动必须写入 **InventoryLedger**

### 3.4 B2 Cloud 集成

> ⚠️ **核心代码禁止修改**（详见 CLAUDE.md）

**核心文件**：
- Service: `backend/src/services/yamatoB2Service.ts` — 禁止修改
- Format: `backend/src/utils/yamatoB2Format.ts` — 禁止修改
- Controller: `backend/src/api/controllers/carrierAutomationController.ts`

**扩展方式**：
- 在现有核心逻辑之上构建新功能
- 不要修改 `authenticatedFetch()`, `validateShipments()`, `exportShipments()`, `login()`, `loginFromApi()`
- 不要修改 `addressMapping` 和 `b2ApiToJapaneseKeyMapping`

**API 使用规则**：
- validate 用日本語キー + `/api/v1/shipments/validate`
- export 用英語キー + `/api/v1/shipments`
- 不要使用 `/api/v1/shipments/validate-full`（有 bug）

### 3.5 自动处理规则

**核心文件**：
- Engine: `backend/src/services/autoProcessingEngine.ts`
- Model: `backend/src/models/autoProcessingRule.ts`
- Controller: `backend/src/api/controllers/autoProcessingRuleController.ts`

**添加新的动作类型**：
1. 在 `AutoProcessingRule` model 的 `actions` 数组中添加新类型
2. 在 `autoProcessingEngine.ts` 的 `executeAction()` 中实现逻辑
3. 在前端 `components/auto-processing/` 中添加编辑器组件

### 3.6 映射配置（MappingConfig）

**核心文件**：
- Model: `backend/src/models/mappingConfig.ts`
- Service: `backend/src/services/mappingConfigService.ts`
- Transforms: `backend/src/transforms/`

**添加新的转换插件**：
1. 在 `backend/src/transforms/core.ts` 中注册插件函数
2. 在前端 `utils/transforms/` 中同步实现（预览用）
3. 插件函数签名：`(value: string, params: any) => string`

### 3.7 标签模板渲染

**核心文件**：
- Service: `backend/src/services/printTemplateService.ts`
- Renderer: `backend/src/services/render/konva/skiaRenderer.ts`
- Worker: `backend/src/services/render/konva/renderWorker.ts`

**添加新的渲染元素**：
1. 在 `skiaRenderer.ts` 的 `renderElement()` 中添加新元素类型的绘制逻辑
2. 在前端模板编辑器中添加对应的元素配置 UI
3. 确保字体管理器支持所需字体

---

## 4. 数据库操作指南

### 4.1 模型定义模式

```typescript
// backend/src/models/example.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IExample extends Document {
  name: string;
  status: 'draft' | 'active' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

const exampleSchema = new Schema<IExample>({
  name: { type: String, required: true },
  status: {
    type: String,
    enum: ['draft', 'active', 'completed'],
    default: 'draft'
  }
}, {
  timestamps: true  // 自动管理 createdAt/updatedAt
});

// 索引
exampleSchema.index({ status: 1, createdAt: -1 });

// Pre-save hook（如需自动计算字段）
exampleSchema.pre('save', function() {
  // 计算逻辑
});

export const ExampleModel = mongoose.model<IExample>('Example', exampleSchema);
```

### 4.2 事务使用

MongoDB 事务需要 Replica Set：

```typescript
import { getSession } from '../../config/database';

async function atomicOperation() {
  const session = await getSession();
  if (!session) {
    // 非 replica set 模式，不使用事务
    await step1();
    await step2();
    return;
  }

  try {
    session.startTransaction();
    await step1({ session });
    await step2({ session });
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
```

### 4.3 查询优化

- 始终为频繁查询的字段创建索引
- 使用 `.lean()` 返回纯 JSON（不需要 Mongoose 方法时）
- 分页查询使用 `skip()` + `limit()`
- 复杂聚合使用 MongoDB Aggregation Pipeline

---

## 5. 前端组件使用指南

### 5.1 Odoo 组件库

#### ODialog（对话框）
```vue
<ODialog v-model="visible" title="确认" @confirm="onConfirm">
  <p>确定要执行此操作吗？</p>
</ODialog>
```

#### OBarcodeListener（条码扫描）
```vue
<OBarcodeListener @scan="onBarcodeScan" />

<script setup>
function onBarcodeScan(barcode: string) {
  // 处理扫描结果
}
</script>
```

#### OStatusbar（状态条）
```vue
<OStatusbar
  :steps="['draft', 'confirmed', 'receiving', 'done']"
  :current="order.status"
/>
```

#### OImportWizard（导入向导）
```vue
<OImportWizard
  :mapping-config="selectedConfig"
  @import="onImport"
/>
```

#### WmsDataTable（数据表格）
```vue
<WmsDataTable
  :data="items"
  :columns="columns"
  :loading="loading"
  :pagination="pagination"
  @page-change="onPageChange"
  @selection-change="onSelectionChange"
/>
```

### 5.2 国际化

```typescript
// 使用 useI18n composable
import { useI18n } from '@/composables/useI18n'

const { t, locale } = useI18n()

// 在模板中
// {{ t('common.save') }}
// {{ t('shipment.orderNumber') }}
```

翻译文件位于：
- `frontend/src/i18n/ja.ts` — 日语
- `frontend/src/i18n/en.ts` — 英语
- `frontend/src/i18n/zh.ts` — 中文

### 5.3 Toast 通知

```typescript
import { useToast } from '@/composables/useToast'

const toast = useToast()
toast.success('保存しました')
toast.error('エラーが発生しました')
toast.warning('注意してください')
```

---

## 6. 调试与排错

### 6.1 后端调试

- 日志查看：Pino 输出到 stdout，格式化使用 `pino-pretty`
- MongoDB 查询：使用 MongoDB Compass 连接 (`compass-connections.json`)
- API 测试：使用 Postman 或 curl 直接调用 `/api/` 端点

### 6.2 前端调试

- Vue DevTools 浏览器扩展
- Pinia DevTools（状态检查）
- Vite HMR（热模块替换）
- Network 面板查看 API 调用

### 6.3 常见问题

| 问题 | 原因 | 解决 |
|------|------|------|
| B2 Cloud 返回 'entry' 错误 | Session 过期 | 自动重试已处理，无需手动干预 |
| MongoDB 事务失败 | 非 Replica Set 模式 | 切换到 Replica Set 或降级为非事务操作 |
| 标签渲染乱码 | 日文字体未加载 | 检查 `fontManager.ts` 字体路径 |
| CSV 导入字段错位 | MappingConfig 配置不匹配 | 检查列映射和转换管道 |
| 库存预留失败 | 可用库存不足 | 检查 StockQuant 的 quantity - reservedQuantity |

---

## 7. Git 工作流

### 7.1 分支策略

| 分支 | 用途 |
|------|------|
| `main` | 主分支（生产） |
| `WMS` | 当前开发分支 |
| `feature/*` | 功能分支 |
| `fix/*` | 修复分支 |

### 7.2 Commit 规范

```
<type>: <description>

type: feat / fix / refactor / docs / test / chore / perf / ci
```

示例：
```
feat: add wave picking management
fix: resolve B2 session retry logic
refactor: extract V2 shipment composables
```

---

## 8. 禁止修改区域

以下文件/功能已稳定运行，**禁止修改核心逻辑**：

| 文件 | 禁止修改内容 |
|------|-------------|
| `yamatoB2Service.ts` | `authenticatedFetch()`, `validateShipments()`, `exportShipments()`, `login()`, `loginFromApi()`, `addressMapping` |
| `yamatoB2Format.ts` | `b2ApiToJapaneseKeyMapping` |

**背景**：2026-03-12 经过长时间调试稳定化。如需扩展 B2 Cloud 功能，请在现有核心逻辑之上构建，不要修改底层实现。

---

## 9. 未来待办项

### 9.1 安全增强（优先级：高）
- [ ] 实现后端 JWT/Session 认证中间件
- [ ] 替换前端 Mock 登录为真实 API 认证
- [ ] 添加中间件级多租户隔离
- [ ] 全面启用 Zod 输入校验
- [ ] 添加 Rate Limiting

### 9.2 功能增强
- [ ] 佐川急便 API 集成 (`sagawa-api`)
- [ ] 西濃運輸 API 集成 (`seino-api`)
- [ ] 移动端应用（mobile workspace）
- [ ] WebSocket 实时通知
- [ ] 仪表板数据可视化增强

### 9.3 技术债务
- [ ] V1 → V2 出荷页面完全迁移
- [ ] 统一前后端类型定义（shared workspace）
- [ ] 测试覆盖率提升
- [ ] CI/CD 管道搭建
- [ ] Docker 容器化部署
