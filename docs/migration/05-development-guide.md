# ZELIXWMS 移行開発ガイド
# ZELIXWMS 迁移开发指南

## 1. 開発環境セットアップ / 开发环境搭建

### 1.1 前提条件 / 前提条件
```
Node.js 20+
pnpm 9+ (npm → pnpm に変更推奨)
Docker & Docker Compose
Supabase CLI (npx supabase)
PostgreSQL 15+ (Supabase経由)
Redis 7+
```

### 1.2 プロジェクト初期化 / 项目初始化
```bash
# NestJS プロジェクト作成 / 创建NestJS项目
cd /Users/kin/Documents/GitHub/ZELIXWMS
nest new backend-nest --package-manager pnpm --strict

# 依存関係インストール / 安装依赖
cd backend-nest
pnpm add @nestjs/config @nestjs/bullmq bullmq
pnpm add drizzle-orm postgres
pnpm add @supabase/supabase-js
pnpm add zod pino pino-pretty
pnpm add -D drizzle-kit @types/node
```

### 1.3 Supabase ローカル環境 / Supabase本地环境
```bash
# Supabase 初期化（既に supabase/ ディレクトリあり）
cd /Users/kin/Documents/GitHub/ZELIXWMS
npx supabase start

# マイグレーション作成
npx supabase migration new create_initial_schema
```

### 1.4 ディレクトリ構成 / 目录结构
```
ZELIXWMS/
├── backend/           # 現行 Express (段階的に停止)
├── backend-nest/      # 新 NestJS
├── frontend/          # Vue 3 (変更なし)
├── admin/             # Admin (変更なし)
├── portal/            # Portal (変更なし)
├── supabase/          # Supabase config + migrations
├── packages/          # 共有パッケージ
└── docker-compose.yml # 更新: backend-nest 追加
```

## 2. NestJS モジュール開発パターン / NestJS模块开发模式

### 2.1 モジュール作成 / 创建模块
```bash
nest g module products
nest g controller products
nest g service products
```

### 2.2 Controller パターン / Controller模式
```typescript
// products.controller.ts
import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { ProductsService } from './products.service';

@Controller('api/products')
@UseGuards(AuthGuard, TenantGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll(
    @TenantId() tenantId: string,
    @Query() query: ListProductsDto,
  ) {
    return this.productsService.findAll(tenantId, query);
  }

  @Post()
  async create(
    @TenantId() tenantId: string,
    @Body() dto: CreateProductDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.productsService.create(tenantId, dto, user);
  }

  @Put(':id')
  async update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(tenantId, id, dto);
  }
}
```

### 2.3 Service パターン (Drizzle) / Service模式
```typescript
// products.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '../database/drizzle';
import { products } from '../database/schema/products';
import { eq, and, ilike } from 'drizzle-orm';

@Injectable()
export class ProductsService {
  async findAll(tenantId: string, query: ListProductsDto) {
    const { page = 1, limit = 50, sku, name } = query;
    const offset = (page - 1) * limit;

    const conditions = [eq(products.tenantId, tenantId)];
    if (sku) conditions.push(ilike(products.sku, `%${sku}%`));
    if (name) conditions.push(ilike(products.name, `%${name}%`));

    const [items, countResult] = await Promise.all([
      db.select().from(products)
        .where(and(...conditions))
        .limit(limit).offset(offset)
        .orderBy(products.createdAt),
      db.select({ count: sql`count(*)` }).from(products)
        .where(and(...conditions)),
    ]);

    return { items, total: Number(countResult[0].count), page, limit };
  }

  async create(tenantId: string, dto: CreateProductDto, user: AuthUser) {
    // トランザクション使用例 / 事务使用示例
    return db.transaction(async (tx) => {
      const [product] = await tx.insert(products).values({
        tenantId,
        ...dto,
        createdBy: user.id,
      }).returning();

      // 操作ログ / 操作日志
      await tx.insert(operationLogs).values({
        tenantId,
        action: 'product_create',
        referenceId: product.id,
        userId: user.id,
      });

      return product;
    });
  }
}
```

### 2.4 Drizzle Schema パターン / Drizzle Schema模式
```typescript
// database/schema/products.ts
import { pgTable, uuid, text, numeric, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  sku: text('sku').notNull(),
  name: text('name').notNull(),
  // ... (02-database-design.md 参照)
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});
```

## 3. テナント分離 / 租户隔离

### 3.1 TenantGuard
```typescript
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.tenantId) throw new ForbiddenException('Tenant not found');
    request.tenantId = user.tenantId;
    return true;
  }
}
```

### 3.2 @TenantId デコレータ
```typescript
export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenantId;
  },
);
```

### 3.3 RLS ポリシー (Supabase)
```sql
-- products テーブルのRLSポリシー
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON products
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
```

## 4. B2 Cloud 連携移行 / B2 Cloud连接迁移

### 4.1 yamatoB2Service.ts の移行方針
```
CLAUDE.md の変更禁止ルールに準拠:
- yamatoB2Service.ts のコアロジックは変更しない
- NestJS の Injectable wrapper で囲む
- 認証/バリデーション/エクスポートの関数シグネチャを維持
```

### 4.2 NestJS wrapper
```typescript
// carriers/yamato-b2/yamato-b2.module.ts
@Module({
  providers: [YamatoB2Service],
  exports: [YamatoB2Service],
})
export class YamatoB2Module {}

// carriers/yamato-b2/yamato-b2.service.ts
// 既存の yamatoB2Service.ts の関数をそのまま import して使用
// Import existing functions directly - DO NOT MODIFY core logic
import {
  login,
  validateShipments,
  exportShipments,
  authenticatedFetch,
} from '../../legacy/yamatoB2Service';
```

## 5. データ移行 / 数据迁移

### 5.1 MongoDB → PostgreSQL ETL
```bash
# Step 1: MongoDB からエクスポート
npm run db:dump

# Step 2: BSON → JSON 変換（既に dump/ にある）

# Step 3: JSON → PostgreSQL INSERT
npx tsx scripts/migrate-to-pg.ts
```

### 5.2 ID マッピング
```
MongoDB ObjectId (24文字hex) → PostgreSQL UUID (36文字)
マッピングテーブルを作成し、外部キー参照を変換
```

### 5.3 スキーマ差分
| MongoDB | PostgreSQL | 変換方法 |
|---------|-----------|---------|
| _id (ObjectId) | id (UUID) | auto generate |
| embedded objects | JSONB or 別テーブル | ケースバイケース |
| Mixed type | JSONB | そのまま |
| array of ObjectId | junction table | 中間テーブル |
| String ref | UUID FK | マッピング |
| timestamps | timestamp with tz | そのまま |

## 6. テスト移行 / 测试迁移

### 6.1 テスト構成
```
backend-nest/test/
├── unit/              # Service テスト (Vitest)
├── integration/       # Controller + DB テスト (Testcontainers)
├── e2e/               # API E2E テスト
└── fixtures/          # テストデータ
```

### 6.2 Testcontainers
```typescript
// テスト用 PostgreSQL コンテナ
import { PostgreSqlContainer } from '@testcontainers/postgresql';

let pgContainer: StartedPostgreSqlContainer;

beforeAll(async () => {
  pgContainer = await new PostgreSqlContainer().start();
  // Drizzle 接続
  const db = drizzle(pgContainer.getConnectionUri());
  // マイグレーション実行
  await migrate(db, { migrationsFolder: './drizzle' });
});
```

## 7. 段階的切替手順 / 分阶段切换步骤

### Phase 1: 並行稼働
```
Frontend → Express (port 4000)  ← 現行
         → NestJS  (port 4100)  ← 新規（テスト用）
```

### Phase 2: 部分切替
```
Frontend → NestJS (一部API)
         → Express (残りAPI) ← nginx proxy で振り分け
```

### Phase 3: 完全切替
```
Frontend → NestJS (port 4000)
Express → 停止
```

## 8. チェックリスト / 检查清单

### 開発開始前
- [ ] Supabase ローカル環境構築
- [ ] NestJS プロジェクト初期化
- [ ] Drizzle ORM セットアップ
- [ ] 初期マイグレーション作成
- [ ] AuthGuard + TenantGuard 実装

### Phase 1 完了基準
- [ ] マスタ系 API (products, locations, warehouses, carriers)
- [ ] 認証 (Supabase Auth)
- [ ] テナント分離
- [ ] 基本テスト

### Phase 2 完了基準
- [ ] 入庫フロー完全動作
- [ ] 出荷フロー完全動作
- [ ] 在庫フロー完全動作
- [ ] B2 Cloud 連携動作

### Phase 3 完了基準
- [ ] 全109画面動作確認
- [ ] テスト全パス
- [ ] データ移行完了
- [ ] Docker 更新
- [ ] Express 停止
