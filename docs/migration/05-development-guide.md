# ZELIXWMS NestJS 移行開発ガイド
# ZELIXWMS NestJS 迁移开发指南

> NestJS + Drizzle ORM + PostgreSQL (Supabase) 開発規約・ワークフロー
> NestJS + Drizzle ORM + PostgreSQL (Supabase) 开发规范与工作流
>
> 最終更新 / 最后更新: 2026-03-21

---

## 1. 開発環境セットアップ / 开发环境搭建

### 1.1 前提条件 / 前提条件

| ツール / 工具 | バージョン / 版本 | 用途 / 用途 |
|---|---|---|
| Node.js | 20+ | ランタイム / 运行时 |
| pnpm | 9+ | パッケージ管理 / 包管理 |
| Docker & Docker Compose | 27+ | コンテナ環境 / 容器环境 |
| PostgreSQL | 15+ | Supabase 経由 / 通过Supabase |
| Redis | 7+ | BullMQ キュー / BullMQ队列 |
| Git | 2.40+ | バージョン管理 / 版本管理 |

### 1.2 Docker によるローカル環境構築 / Docker本地环境搭建

```bash
# リポジトリクローン / 克隆仓库
git clone git@github.com:kin/ZELIXWMS.git
cd ZELIXWMS

# Docker Compose で全サービス起動 / Docker Compose启动全部服务
docker compose up -d

# サービス一覧 / 服务列表:
#   zelixwms-db       (PostgreSQL 15, port 5432)
#   zelixwms-redis    (Redis 7, port 6379)
#   zelixwms-backend  (NestJS, port 4100)
#   zelixwms-frontend (Vue 3, port 5173)
```

### 1.3 ローカル直接開発（Docker なし）/ 本地直接开发（无Docker）

```bash
# 依存関係インストール / 安装依赖
cd backend-nest
pnpm install

# 環境変数設定 / 设置环境变量
cp .env.example .env
# .env を編集: DATABASE_URL, REDIS_URL, SUPABASE_URL, SUPABASE_SERVICE_KEY
# 编辑 .env：DATABASE_URL, REDIS_URL, SUPABASE_URL, SUPABASE_SERVICE_KEY

# Supabase ローカル環境起動 / 启动Supabase本地环境
cd ..
npx supabase start

# マイグレーション実行 / 执行迁移
cd backend-nest
pnpm drizzle-kit push

# 開発サーバー起動 / 启动开发服务器
pnpm start:dev
```

### 1.4 環境変数一覧 / 环境变量列表

```env
# データベース / 数据库
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/zelixwms

# Supabase
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# Redis
REDIS_URL=redis://localhost:6379

# アプリケーション / 应用
NODE_ENV=development
PORT=4100
LOG_LEVEL=debug

# B2 Cloud（変更禁止 / 禁止修改）
B2_CLOUD_BASE_URL=https://biz.kuronekoyamato.co.jp
B2_CLOUD_API_BASE=https://biz-api.kuronekoyamato.co.jp
```

---

## 2. プロジェクト構成 / 项目结构

### 2.1 ディレクトリ構成 / 目录结构

```
ZELIXWMS/
├── backend-nest/               # NestJS バックエンド / NestJS后端
│   ├── src/
│   │   ├── app.module.ts       # ルートモジュール / 根模块
│   │   ├── main.ts             # エントリポイント / 入口
│   │   ├── common/             # 共通（Guards, Pipes, Interceptors）/ 公共模块
│   │   ├── database/           # Drizzle スキーマ・マイグレーション / 数据库
│   │   ├── config/             # 環境変数・設定 / 配置
│   │   ├── auth/               # 認証 / 认证
│   │   ├── products/           # 商品管理 / 商品管理
│   │   ├── inbound/            # 入庫 / 入库
│   │   ├── shipment/           # 出荷 / 出库
│   │   ├── inventory/          # 在庫 / 库存
│   │   ├── warehouse/          # 倉庫オペレーション / 仓库运营
│   │   ├── stocktaking/        # 棚卸 / 盘点
│   │   ├── returns/            # 返品 / 退货
│   │   ├── billing/            # 請求 / 计费
│   │   ├── carriers/           # 配送業者 / 配送商
│   │   ├── clients/            # 顧客 / 客户
│   │   ├── client-portal/      # 荷主ポータル / 货主门户
│   │   ├── integrations/       # 外部連携 (FBA, RSL, OMS, ERP) / 外部集成
│   │   ├── extensions/         # プラグイン・Webhook・スクリプト / 插件Webhook脚本
│   │   ├── automation/         # ルールエンジン・ワークフロー / 规则引擎工作流
│   │   ├── reporting/          # レポート・KPI / 报表KPI
│   │   ├── notifications/      # 通知 / 通知
│   │   ├── admin/              # テナント・ユーザー管理 / 租户用户管理
│   │   ├── import/             # CSV インポート / CSV导入
│   │   ├── render/             # PDF・ラベル生成 / PDF标签生成
│   │   ├── queue/              # BullMQ プロセッサ / BullMQ处理器
│   │   ├── operational/        # 操作ログ / 操作日志
│   │   └── peak-mode/          # ピークモード / 高峰模式
│   ├── test/
│   │   ├── unit/               # 単体テスト / 单元测试
│   │   ├── integration/        # 統合テスト / 集成测试
│   │   └── e2e/                # E2E テスト / E2E测试
│   ├── drizzle/                # マイグレーションファイル / 迁移文件
│   ├── drizzle.config.ts
│   ├── vitest.config.ts
│   ├── nest-cli.json
│   └── package.json
├── backend/                    # 現行 Express（段階的停止）/ 现行Express（逐步停止）
├── frontend/                   # Vue 3（変更なし）/ Vue 3（不变）
├── admin/                      # 管理画面（変更なし）/ 管理界面（不变）
├── portal/                     # 荷主ポータル（変更なし）/ 货主门户（不变）
├── supabase/                   # Supabase 設定 / Supabase配置
└── docker-compose.yml
```

### 2.2 モジュール内部構成 / 模块内部结构

各モジュールは以下の統一構成に従う：
每个模块遵循以下统一结构：

```
products/
├── products.module.ts          # モジュール定義 / 模块定义
├── products.controller.ts      # HTTP ハンドラ / HTTP处理器
├── products.service.ts         # ビジネスロジック / 业务逻辑
├── set-products.controller.ts  # 追加 Controller（必要な場合）/ 额外Controller
├── set-products.service.ts     # 追加 Service / 额外Service
└── dto/
    ├── create-product.dto.ts   # 作成 DTO / 创建DTO
    ├── update-product.dto.ts   # 更新 DTO / 更新DTO
    └── list-products.dto.ts    # クエリ DTO / 查询DTO
```

---

## 3. コーディング規約 / 编码规范

### 3.1 命名規則 / 命名规则

| 対象 / 对象 | スタイル / 风格 | 例 / 示例 |
|---|---|---|
| ファイル名 / 文件名 | kebab-case | `inbound-workflow.service.ts` |
| クラス名 / 类名 | PascalCase | `InboundWorkflowService` |
| メソッド名 / 方法名 | camelCase | `findAllByTenant()` |
| 変数名 / 变量名 | camelCase | `tenantId`, `shipmentOrder` |
| DB テーブル名 / 数据库表名 | snake_case | `shipment_orders` |
| DB カラム名 / 数据库列名 | snake_case | `created_at`, `tenant_id` |
| 定数 / 常量 | UPPER_SNAKE_CASE | `MAX_BATCH_SIZE` |
| 列挙型 / 枚举 | PascalCase (型), UPPER_SNAKE_CASE (値) | `OrderStatus.CONFIRMED` |
| DTO | PascalCase + 接尾辞 Dto | `CreateProductDto` |

### 3.2 ファイルサイズ制限 / 文件大小限制

| 種別 / 类别 | 推奨 / 推荐 | 最大 / 最大 |
|---|---|---|
| Controller | 200行 | 400行 |
| Service | 300行 | 600行 |
| Schema / DTO | 100行 | 300行 |
| テスト / 测试 | 400行 | 800行 |

ファイルが制限を超える場合は分割する。
文件超过限制时必须拆分。

### 3.3 Controller パターン / Controller模式

```typescript
// products.controller.ts
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
  @UseGuards(RolesGuard)
  @RequireRole('operator', 'manager', 'admin')
  async create(
    @TenantId() tenantId: string,
    @Body() dto: CreateProductDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.productsService.create(tenantId, dto, user);
  }
}
```

### 3.4 Service パターン / Service模式

```typescript
// products.service.ts
@Injectable()
export class ProductsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
  ) {}

  async findAll(tenantId: string, query: ListProductsDto) {
    const { page = 1, limit = 50, sku, name } = query;
    const offset = (page - 1) * limit;

    const conditions = [eq(products.tenantId, tenantId)];
    if (sku) conditions.push(ilike(products.sku, `%${sku}%`));
    if (name) conditions.push(ilike(products.name, `%${name}%`));

    const [items, countResult] = await Promise.all([
      this.db.select().from(products)
        .where(and(...conditions))
        .limit(limit).offset(offset)
        .orderBy(products.createdAt),
      this.db.select({ count: sql`count(*)` }).from(products)
        .where(and(...conditions)),
    ]);

    return { items, total: Number(countResult[0].count), page, limit };
  }

  // トランザクション使用例 / 事务使用示例
  async create(tenantId: string, dto: CreateProductDto, user: AuthUser) {
    return this.db.transaction(async (tx) => {
      const [product] = await tx.insert(products).values({
        tenantId,
        ...dto,
        createdBy: user.id,
      }).returning();

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

### 3.5 DTO パターン（Zod ベース）/ DTO模式（基于Zod）

```typescript
// dto/create-product.dto.ts
import { z } from 'zod';

export const createProductSchema = z.object({
  sku: z.string().min(1).max(100),
  name: z.string().min(1).max(500),
  price: z.number().nonnegative().optional(),
  // ... 他のフィールド / 其他字段
});

export type CreateProductDto = z.infer<typeof createProductSchema>;
```

### 3.6 不変性の原則 / 不可变性原则

```typescript
// 正しい: 新しいオブジェクトを返す / 正确：返回新对象
async update(tenantId: string, id: string, dto: UpdateProductDto) {
  const [updated] = await this.db.update(products)
    .set({ ...dto, updatedAt: new Date() })
    .where(and(eq(products.id, id), eq(products.tenantId, tenantId)))
    .returning();
  return updated;
}

// 誤り: ミューテーション / 错误：直接修改
// product.name = dto.name;  ← 禁止 / 禁止
```

### 3.7 エラーハンドリング / 错误处理

```typescript
// Service 内で NestJS 例外を使用 / 在Service中使用NestJS异常
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

async findOne(tenantId: string, id: string) {
  const product = await this.db.select().from(products)
    .where(and(eq(products.id, id), eq(products.tenantId, tenantId)))
    .limit(1);

  if (!product.length) {
    throw new NotFoundException(
      `商品が見つかりません (id: ${id}) / 商品未找到 (id: ${id})`
    );
  }

  return product[0];
}
```

### 3.8 コメント規約 / 注释规范

```typescript
// 中日バイリンガル / 中日双语
// 在庫引当処理 / 库存预留处理
async reserveStock(tenantId: string, orderId: string) {
  // 在庫不足チェック / 检查库存不足
  // ...
}
```

---

## 4. テスト戦略 / 测试策略

### 4.1 テスト構成 / 测试结构

```
test/
├── unit/                       # 単体テスト: Service のビジネスロジック
│   ├── products.service.spec.ts     # 单元测试：Service的业务逻辑
│   ├── stock.service.spec.ts
│   └── ...
├── integration/                # 統合テスト: Controller + DB
│   ├── products.integration.spec.ts # 集成测试：Controller + DB
│   ├── inbound.integration.spec.ts
│   └── ...
└── e2e/                        # E2E テスト: API 全フロー
    ├── auth.e2e.spec.ts        # E2E测试：API全流程
    ├── shipment-flow.e2e.spec.ts
    └── ...
```

### 4.2 テスト優先度 / 测试优先级

| レベル / 级别 | カバレッジ目標 / 覆盖率目标 | テスト対象 / 测试对象 |
|---|---|---|
| 単体テスト / 单元测试 | 80%+ | Service メソッド、ビジネスロジック、バリデーション |
| 統合テスト / 集成测试 | 70%+ | Controller + Service + DB、トランザクション |
| E2E テスト / E2E测试 | クリティカルフロー | 入庫→検品→棚入→完了、出荷→B2Cloud→完了 |

### 4.3 単体テスト例 / 单元测试示例

```typescript
// test/unit/products.service.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductsService } from '../../src/products/products.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([]),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: 'uuid-1', sku: 'TEST' }]),
    };
    service = new ProductsService(mockDb);
  });

  it('findAll はページネーション付きで返す / findAll应返回分页结果', async () => {
    const result = await service.findAll('tenant-1', { page: 1, limit: 10 });
    expect(result).toHaveProperty('items');
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('page');
    expect(result).toHaveProperty('limit');
  });
});
```

### 4.4 統合テスト例（Testcontainers）/ 集成测试示例

```typescript
// test/integration/products.integration.spec.ts
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

let pgContainer: StartedPostgreSqlContainer;
let db: ReturnType<typeof drizzle>;

beforeAll(async () => {
  pgContainer = await new PostgreSqlContainer().start();
  const client = postgres(pgContainer.getConnectionUri());
  db = drizzle(client);
  await migrate(db, { migrationsFolder: './drizzle' });
}, 60000);

afterAll(async () => {
  await pgContainer.stop();
});

describe('ProductsService Integration', () => {
  it('CRUD 全操作が動作する / CRUD全操作应正常工作', async () => {
    // create → read → update → soft-delete
    // 作成→読取→更新→ソフトデリート / 创建→读取→更新→软删除
  });
});
```

### 4.5 テスト実行コマンド / 测试执行命令

```bash
# 全テスト / 全部测试
pnpm test

# 単体テストのみ / 仅单元测试
pnpm test:unit

# 統合テストのみ / 仅集成测试
pnpm test:integration

# E2E テストのみ / 仅E2E测试
pnpm test:e2e

# カバレッジ / 覆盖率
pnpm test:coverage

# ウォッチモード / 监视模式
pnpm test:watch
```

---

## 5. Drizzle マイグレーションワークフロー / Drizzle迁移工作流

### 5.1 スキーマ定義 / Schema定义

```typescript
// database/schema/products.ts
import { pgTable, uuid, text, numeric, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  sku: text('sku').notNull(),
  name: text('name').notNull(),
  price: numeric('price', { precision: 12, scale: 2 }),
  customFields: jsonb('custom_fields').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
```

### 5.2 マイグレーション作成・適用 / 创建与应用迁移

```bash
# 1. スキーマ変更 / 修改Schema
#    database/schema/*.ts を編集 / 编辑 database/schema/*.ts

# 2. マイグレーション生成 / 生成迁移
pnpm drizzle-kit generate

# 3. 生成された SQL を確認 / 确认生成的SQL
#    drizzle/XXXX_migration_name.sql を確認 / 确认 drizzle/XXXX_migration_name.sql

# 4. マイグレーション適用 / 应用迁移
pnpm drizzle-kit push

# 5. Drizzle Studio でデータ確認（オプション）/ 用Drizzle Studio确认数据（可选）
pnpm drizzle-kit studio
```

### 5.3 マイグレーションルール / 迁移规则

1. **破壊的変更は禁止**: カラム削除・型変更は段階的に実施
   **禁止破坏性变更**：列删除、类型变更必须分阶段实施
2. **マイグレーションは追加のみ**: 既存マイグレーションファイルは編集禁止
   **迁移仅限追加**：禁止编辑已有迁移文件
3. **データマイグレーション**: DDL と DML は別ファイルで管理
   **数据迁移**：DDL和DML分文件管理
4. **ロールバック SQL**: 各マイグレーションにロールバック手順を記載
   **回滚SQL**：每个迁移需记录回滚步骤

### 5.4 Seed データ / 种子数据

```bash
# 開発用 Seed / 开发用种子数据
pnpm seed:dev

# テスト用 Seed / 测试用种子数据
pnpm seed:test
```

---

## 6. Git ワークフロー / Git工作流

### 6.1 ブランチ命名規則 / 分支命名规则

```
main                           # 本番 / 生产
├── develop                    # 開発統合 / 开发集成
├── feat/phase-1-schemas       # 機能ブランチ / 功能分支
├── feat/phase-2-products      # 機能ブランチ / 功能分支
├── fix/inventory-transaction  # バグ修正 / 缺陷修复
├── refactor/billing-service   # リファクタリング / 重构
└── docs/api-mapping           # ドキュメント / 文档
```

### 6.2 コミットメッセージ規約 / 提交消息规范

```
<type>: <日本語説明> <中文说明>

<本文（任意）/ 正文（可选）>
```

**type 一覧 / type列表:**

| type | 用途 / 用途 |
|---|---|
| `feat` | 新機能 / 新功能 |
| `fix` | バグ修正 / 修复缺陷 |
| `refactor` | リファクタリング / 重构 |
| `docs` | ドキュメント / 文档 |
| `test` | テスト / 测试 |
| `chore` | ビルド・設定 / 构建配置 |
| `perf` | パフォーマンス / 性能 |
| `ci` | CI/CD / CI/CD |

**例 / 示例:**
```
feat: ProductsModule CRUD実装 Products模块CRUD实现
fix: 在庫引当トランザクションデッドロック修正 修复库存预留事务死锁
docs: API マッピング更新 更新API映射文档
```

### 6.3 ブランチ運用 / 分支运营

```
1. develop から機能ブランチを作成
   从 develop 创建功能分支

2. 機能実装 + テスト追加
   实现功能 + 添加测试

3. PR 作成（develop 向け）
   创建PR（目标 develop）

4. コードレビュー + CI パス
   代码审查 + CI通过

5. develop にマージ
   合并到 develop

6. 定期的に develop → main リリース
   定期从 develop → main 发布
```

---

## 7. PR チェックリスト / PR检查清单

PR を作成する前に以下を確認：
创建PR前确认以下事项：

### コード品質 / 代码质量
- [ ] TypeScript 型エラーなし / 无TypeScript类型错误
- [ ] ESLint エラーなし / 无ESLint错误
- [ ] ファイルサイズ制限内 / 文件大小在限制内
- [ ] 不変性の原則に従っている / 遵循不可变性原则
- [ ] エラーハンドリングが適切 / 错误处理正确

### テスト / 测试
- [ ] 単体テスト追加済み / 已添加单元测试
- [ ] 統合テスト追加済み（DB 操作がある場合）/ 已添加集成测试（涉及DB操作时）
- [ ] 全テストパス (`pnpm test`) / 全部测试通过
- [ ] カバレッジ 80%+ / 覆盖率80%+

### セキュリティ / 安全
- [ ] ハードコードされたシークレットなし / 无硬编码密钥
- [ ] 入力バリデーション実装済み / 已实现输入验证
- [ ] SQL インジェクション対策（Drizzle パラメータ化クエリ使用）/ SQL注入防护
- [ ] 認証・認可チェック実装済み / 已实现认证授权检查

### 互換性 / 兼容性
- [ ] API パス構造維持 / 保持API路径结构
- [ ] レスポンス形式互換（`_id` エイリアス等）/ 响应格式兼容
- [ ] フロントエンド影響確認 / 确认前端影响

### ドキュメント / 文档
- [ ] コメント中日バイリンガル / 注释中日双语
- [ ] CLAUDE.md ルール遵守 / 遵守CLAUDE.md规则
- [ ] 関連ドキュメント更新済み / 已更新相关文档
- [ ] devlog.md 記録済み / 已记录devlog.md

---

## 8. デプロイメントプロセス / 部署流程

### 8.1 環境一覧 / 环境列表

| 環境 / 环境 | 用途 / 用途 | URL |
|---|---|---|
| local | ローカル開発 / 本地开发 | `http://localhost:4100` |
| staging | ステージング / 预发布 | `https://staging.zelixwms.com` |
| production | 本番 / 生产 | `https://api.zelixwms.com` |

### 8.2 デプロイ手順 / 部署步骤

```bash
# 1. テスト全パス確認 / 确认全部测试通过
pnpm test

# 2. ビルド / 构建
pnpm build

# 3. Docker イメージビルド / Docker镜像构建
docker build -t zelixwms-backend:latest -f backend-nest/Dockerfile .

# 4. ステージングデプロイ / 预发布部署
# 4.1 マイグレーション適用 / 应用迁移
NODE_ENV=staging pnpm drizzle-kit push

# 4.2 デプロイ / 部署
docker compose -f docker-compose.staging.yml up -d

# 5. ステージング確認 / 预发布确认
# 5.1 ヘルスチェック / 健康检查
curl https://staging.zelixwms.com/health

# 5.2 スモークテスト / 冒烟测试
pnpm test:e2e:staging

# 6. 本番デプロイ / 生产部署（同様の手順）/ 同样的步骤
```

### 8.3 ロールバック / 回滚

```bash
# Docker イメージを前バージョンに戻す / 回滚Docker镜像到前一版本
docker compose down
docker compose -f docker-compose.yml up -d --no-build

# DB ロールバック（必要な場合）/ 数据库回滚（必要时）
# 手動でロールバック SQL を実行 / 手动执行回滚SQL
psql $DATABASE_URL -f drizzle/rollback_XXXX.sql
```

### 8.4 並行稼働期間 / 并行运行期间

移行中は Express と NestJS を並行稼働させる：
迁移期间Express和NestJS并行运行：

```
Phase 1: Express (4000) + NestJS (4100) 並行テスト / 并行测试
Phase 2: nginx proxy でエンドポイント単位切替 / nginx按端点切换
Phase 3: NestJS (4000) 完全切替、Express 停止 / 完全切换，停止Express
```

---

## 9. 重要な制約 / 重要约束

### 9.1 変更禁止ファイル / 禁止修改的文件

以下のファイルは CLAUDE.md のルールに基づき変更禁止：
以下文件根据CLAUDE.md规则禁止修改：

- `backend/src/services/yamatoB2Service.ts` — コアロジック変更禁止
  核心逻辑禁止修改
- `backend/src/utils/yamatoB2Format.ts` — B2 Cloud フォーマット定義
  B2 Cloud格式定义

NestJS では上記ファイルを `@Injectable()` で wrapper して使用する。
在NestJS中使用 `@Injectable()` 包装上述文件。

### 9.2 フロントエンド変更最小化 / 前端改动最小化

- API パス構造は変更しない / 不变更API路径结构
- レスポンスに `_id` エイリアスを含める / 响应中包含 `_id` 别名
- ページネーション形式を維持 / 保持分页格式
- エラーレスポンス形式を維持 / 保持错误响应格式

### 9.3 ドキュメント同期 / 文档同步

コード変更時は対応するドキュメントを先に更新する（CLAUDE.md 参照）。
代码变更时先更新对应文档（参考CLAUDE.md）。

すべてのコメント・ドキュメントは中日バイリンガルで記載する。
所有注释和文档使用中日双语记载。
