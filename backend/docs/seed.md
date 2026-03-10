# 数据库种子数据 (Seed) 功能说明

## 概述

Seed 功能用于初始化数据库中的基础数据，特别是快递公司信息。这些数据来源于 `carrier-format/nexand_出荷管理仕様書.md` 文档。

## 使用方法

### 运行 Seed 脚本

```bash
cd backend
npm run seed
```

这个命令会：
1. 连接到 MongoDB 数据库
2. 初始化/更新快递公司数据
3. 完成后断开连接

### 环境配置

确保 `.env` 文件中配置了正确的 MongoDB 连接：

```env
MONGODB_URI=mongodb://127.0.0.1:27017/nexand-shipment
MONGODB_DB=nexand-shipment
```

## 种子数据内容

### 快递公司 (Carriers)

当前包含以下快递公司：

1. **佐川急便e飛伝3** (`sagawa_efiden3`)
   - 文档ID: `01_e飛伝3`

2. **ヤマト運輸B2** (`yamato_b2`)
   - 文档ID: `02_ヤマトB2`

3. **カンガルーマジック2** (`seino_km2`)
   - 文档ID: `03_KM2`

4. **ゆうパックプリントR** (`yupack_printr`)
   - 文档ID: `04_ゆうプリR`

5. **飛脚ゆうパケット便** (`hikyaku_yupacket`)
   - 文档ID: `05_飛脚ゆうパケット便`

## 数据更新机制

- 如果快递公司已存在（根据 `code` 字段），则更新其信息
- 如果快递公司不存在，则创建新记录
- 所有快递公司默认启用（`enabled: true`）

## 扩展 Seed 功能

如果需要添加更多种子数据，可以：

1. 在 `backend/src/scripts/seed.ts` 中添加新的种子函数
2. 在 `main()` 函数中调用新的种子函数
3. 可以创建单独的 seed 文件，如 `seed-carriers.ts`、`seed-users.ts` 等

### 示例：添加新的种子数据

```typescript
// backend/src/scripts/seed.ts
async function seedUsers(): Promise<void> {
  // 初始化用户数据
  // ...
}

async function main(): Promise<void> {
  await connectDatabase();
  await seedCarriers();
  await seedUsers();  // 添加新的种子函数
  await disconnectDatabase();
}
```

## 注意事项

1. **数据安全**: Seed 脚本会更新现有数据，运行前请确认数据库状态
2. **开发环境**: 建议只在开发/测试环境运行 seed 脚本
3. **生产环境**: 生产环境应使用迁移脚本或手动导入数据
4. **备份**: 运行 seed 前建议备份数据库

## 相关文件

- `backend/src/scripts/seed.ts` - Seed 脚本主文件
- `backend/src/models/carrier.ts` - 快递公司数据模型
- `backend/src/config/database.ts` - 数据库连接配置
- `carrier-format/nexand_出荷管理仕様書.md` - 数据来源文档














