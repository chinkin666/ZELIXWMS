# ZELIXWMS 后端模块完全设计书（NestJS 移行版）
# ZELIXWMS バックエンドモジュール完全設計書（NestJS 移行版）

> 基于 [03-backend-architecture.md](../migration/03-backend-architecture.md) 的深化重写
> [03-backend-architecture.md](../migration/03-backend-architecture.md) を深掘りしたリライト
>
> 覆盖全 16 业务模块 + 5 共通模块 = 21 模块的完整内部设计
> 全 16 業務モジュール + 5 共通モジュール = 21 モジュールの完全内部設計
>
> 最终更新 / 最終更新: 2026-03-21

---

## 目次 / 目次

- [Part A: 共通モジュール / 通用模块 (5)](#part-a-共通モジュール--通用模块)
  - [A1. CommonModule](#a1-commonmodule)
  - [A2. DatabaseModule](#a2-databasemodule)
  - [A3. AuthModule](#a3-authmodule)
  - [A4. QueueModule](#a4-queuemodule)
  - [A5. ConfigModule](#a5-configmodule)
- [Part B: 業務モジュール / 业务模块 (16)](#part-b-業務モジュール--业务模块)
  - [B1. ProductsModule](#b1-productsmodule)
  - [B2. InventoryModule](#b2-inventorymodule)
  - [B3. InboundModule](#b3-inboundmodule)
  - [B4. ShipmentModule](#b4-shipmentmodule)
  - [B5. WarehouseModule](#b5-warehousemodule)
  - [B6. ReturnsModule](#b6-returnsmodule)
  - [B7. BillingModule](#b7-billingmodule)
  - [B8. CarriersModule](#b8-carriersmodule)
  - [B9. ClientsModule](#b9-clientsmodule)
  - [B10. ExtensionsModule](#b10-extensionsmodule)
  - [B11. IntegrationsModule](#b11-integrationsmodule)
  - [B12. ReportingModule](#b12-reportingmodule)
  - [B13. NotificationsModule](#b13-notificationsmodule)
  - [B14. AdminModule](#b14-adminmodule)
  - [B15. ImportModule](#b15-importmodule)
  - [B16. RenderModule](#b16-rendermodule)
- [Part C: 模块依赖关系总览 / モジュール依存関係一覧](#part-c-模块依赖关系总览--モジュール依存関係一覧)
- [Part D: 领域事件总览 / ドメインイベント一覧](#part-d-领域事件总览--ドメインイベント一覧)

---

## 共通规约 / 共通規約

### DTO 验证框架 / DTO バリデーションフレームワーク

NestJS 移行版使用 Zod 3.x (非 class-validator)，与现行 Express 版保持一致。
NestJS 移行版は Zod 3.x を使用（class-validator ではない）。現行 Express 版と一貫性を保つ。

```typescript
// Zod DTO の標準パターン / Zod DTO 标准模式
import { z } from 'zod';
import { createZodDto } from '@anatine/zod-nestjs';

export const CreateProductSchema = z.object({ /* ... */ });
export class CreateProductDto extends createZodDto(CreateProductSchema) {}
```

### BaseRepository 标准方法 / BaseRepository 標準メソッド

全 Repository 继承 BaseRepository，提供以下标准方法:
全 Repository が BaseRepository を継承し、以下の標準メソッドを提供:

```typescript
abstract class BaseRepository<T> {
  abstract get table(): PgTable;

  async findById(id: string, tenantId: string): Promise<T | null>;
  async findAllPaginated(tenantId: string, pagination: PaginationDto, filters?: Record<string, unknown>): Promise<PaginatedResult<T>>;
  async create(tenantId: string, data: Partial<T>): Promise<T>;
  async update(id: string, tenantId: string, data: Partial<T>): Promise<T>;
  async softDelete(id: string, tenantId: string): Promise<void>;
  async count(tenantId: string, filters?: Record<string, unknown>): Promise<number>;
  async exists(id: string, tenantId: string): Promise<boolean>;
}
```

### 分页响应类型 / ページネーションレスポンス型

```typescript
interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
```

---

# Part A: 共通モジュール / 通用模块

---

## A1. CommonModule

> 全局守卫、拦截器、管道、过滤器、装饰器
> グローバルガード・インターセプタ・パイプ・フィルタ・デコレータ

### 目录结构 / ディレクトリ構成

```
src/common/
├── common.module.ts
├── guards/
│   ├── auth.guard.ts                # JWT 验证 / JWT 検証
│   ├── tenant.guard.ts              # 租户隔离 / テナント分離
│   ├── role.guard.ts                # RBAC 角色检查 / ロールチェック
│   └── api-key.guard.ts             # 外部集成 API Key / 外部連携 API キー
├── interceptors/
│   ├── transform.interceptor.ts     # 响应格式化 + _id 别名 / レスポンス整形 + _id エイリアス
│   ├── logging.interceptor.ts       # 请求耗时日志 / リクエスト処理時間ログ
│   └── audit.interceptor.ts         # 操作审计 / 操作監査
├── pipes/
│   ├── zod-validation.pipe.ts       # Zod 全局验证 / Zod グローバルバリデーション
│   ├── pagination.pipe.ts           # page/limit 解析 + 上限200 / ページネーション解析
│   └── uuid-param.pipe.ts           # UUID 参数验证 / UUID パラメータ検証
├── filters/
│   └── all-exceptions.filter.ts     # 全局异常 → 统一格式 / 例外 → 統一フォーマット
├── decorators/
│   ├── current-user.decorator.ts    # @CurrentUser() → UserPayload
│   ├── tenant-id.decorator.ts       # @TenantId() → string
│   ├── roles.decorator.ts           # @Roles('admin','manager')
│   └── public.decorator.ts          # @Public() 跳过认证 / 認証スキップ
├── dto/
│   ├── pagination.dto.ts            # { page, limit, sort, order }
│   └── bulk-result.dto.ts           # { total, successCount, failureCount, errors }
└── errors/
    ├── wms-not-found.exception.ts         # 404
    ├── insufficient-stock.exception.ts    # 409
    ├── invalid-status-transition.exception.ts  # 422
    ├── tenant-mismatch.exception.ts       # 403
    └── duplicate-resource.exception.ts    # 409
```

### 核心类型签名 / コア型シグネチャ

```typescript
// ── Guards ──
@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean>;
}

@Injectable()
export class TenantGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean>;
}

@Injectable()
export class RoleGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean>;
}

// ── Interceptors ──
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>>;
}

// ── Pipes ──
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown;
}

// ── DTOs ──
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  sort: z.string().optional().default('createdAt'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const BulkResultSchema = z.object({
  total: z.number(),
  successCount: z.number(),
  failureCount: z.number(),
  errors: z.array(z.object({ index: z.number().optional(), field: z.string().optional(), message: z.string() })),
});
```

### 模块依赖 / モジュール依存

- 依赖: 无（全局模块，被所有模块引用）
- 依存: なし（グローバルモジュール、全モジュールから参照）

---

## A2. DatabaseModule

> Drizzle ORM 连接 + BaseRepository + Schema 定义
> Drizzle ORM 接続 + BaseRepository + Schema 定義

### 目录结构 / ディレクトリ構成

```
src/database/
├── drizzle.module.ts                # 全局 DB 模块 / グローバル DB モジュール
├── drizzle.provider.ts              # Drizzle 实例工厂 / Drizzle インスタンスファクトリ
├── schema/
│   ├── index.ts                     # 全表 re-export
│   ├── tenants.ts
│   ├── users.ts
│   ├── products.ts
│   ├── set-products.ts
│   ├── materials.ts
│   ├── shipment-orders.ts
│   ├── inbound-orders.ts
│   ├── inventory.ts                 # stock_quants, stock_moves
│   ├── lots.ts
│   ├── serial-numbers.ts
│   ├── locations.ts
│   ├── carriers.ts
│   ├── carrier-automations.ts
│   ├── clients.ts
│   ├── sub-clients.ts
│   ├── customers.ts
│   ├── shops.ts
│   ├── suppliers.ts
│   ├── order-source-companies.ts
│   ├── billing.ts                   # billing_records, invoices
│   ├── service-rates.ts
│   ├── work-charges.ts
│   ├── shipping-rates.ts
│   ├── price-catalogs.ts
│   ├── returns.ts
│   ├── stocktaking.ts
│   ├── cycle-counts.ts
│   ├── tasks.ts
│   ├── waves.ts
│   ├── inspections.ts
│   ├── labeling-tasks.ts
│   ├── extensions.ts                # plugins, webhooks, scripts
│   ├── custom-fields.ts
│   ├── feature-flags.ts
│   ├── rules.ts
│   ├── workflows.ts
│   ├── notifications.ts
│   ├── email-templates.ts
│   ├── notification-preferences.ts
│   ├── daily-reports.ts
│   ├── mapping-configs.ts
│   ├── print-templates.ts
│   ├── form-templates.ts
│   ├── system-settings.ts
│   ├── audit.ts                     # operation_logs, api_logs
│   └── fba.ts                       # fba_shipment_plans, fba_boxes
├── repositories/
│   ├── base.repository.ts           # BaseRepository<T> 抽象类
│   ├── products.repository.ts
│   ├── set-products.repository.ts
│   ├── shipment-orders.repository.ts
│   ├── inbound-orders.repository.ts
│   ├── inventory.repository.ts
│   ├── locations.repository.ts
│   ├── lots.repository.ts
│   ├── serial-numbers.repository.ts
│   ├── carriers.repository.ts
│   ├── clients.repository.ts
│   ├── billing.repository.ts
│   ├── returns.repository.ts
│   ├── stocktaking.repository.ts
│   ├── cycle-counts.repository.ts
│   ├── tasks.repository.ts
│   ├── waves.repository.ts
│   ├── extensions.repository.ts
│   ├── notifications.repository.ts
│   ├── daily-reports.repository.ts
│   ├── mapping-configs.repository.ts
│   ├── print-templates.repository.ts
│   ├── tenants.repository.ts
│   ├── users.repository.ts
│   ├── system-settings.repository.ts
│   ├── operation-logs.repository.ts
│   └── api-logs.repository.ts
└── migrations/
    └── *.sql
```

### BaseRepository 完整签名 / BaseRepository 完全シグネチャ

```typescript
@Injectable()
export abstract class BaseRepository<T> {
  constructor(@Inject('DRIZZLE') protected readonly db: DrizzleDB) {}

  protected abstract get table(): PgTable;

  // ── 标准 CRUD / 標準 CRUD ──
  async findById(id: string, tenantId: string): Promise<T | null>;
  async findAllPaginated(tenantId: string, pagination: PaginationDto, filters?: Record<string, unknown>): Promise<PaginatedResult<T>>;
  async findOne(tenantId: string, filters: Record<string, unknown>): Promise<T | null>;
  async findMany(tenantId: string, filters: Record<string, unknown>): Promise<T[]>;
  async create(tenantId: string, data: Partial<T>): Promise<T>;
  async createMany(tenantId: string, data: Partial<T>[]): Promise<T[]>;
  async update(id: string, tenantId: string, data: Partial<T>): Promise<T>;
  async softDelete(id: string, tenantId: string): Promise<void>;
  async hardDelete(id: string, tenantId: string): Promise<void>;

  // ── 集计 / 集計 ──
  async count(tenantId: string, filters?: Record<string, unknown>): Promise<number>;
  async exists(id: string, tenantId: string): Promise<boolean>;

  // ── 事务 / トランザクション ──
  async withTransaction<R>(fn: (tx: DrizzleTransaction) => Promise<R>): Promise<R>;
}
```

---

## A3. AuthModule

> Supabase Auth JWT 验证 + 用户上下文
> Supabase Auth JWT 検証 + ユーザーコンテキスト

### 目录结构 / ディレクトリ構成

```
src/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── portal-auth.controller.ts        # 货主门户认证 / 荷主ポータル認証
├── portal-auth.service.ts
├── supabase-auth.strategy.ts        # JWT 验证策略 / JWT 検証ストラテジー
└── dto/
    ├── login.dto.ts
    ├── register.dto.ts
    └── refresh-token.dto.ts
```

### Controller 方法签名 / Controller メソッドシグネチャ

```typescript
@Controller('api/auth')
export class AuthController {
  @Post('login')          async login(@Body() dto: LoginDto): Promise<AuthTokenResponse>;
  @Post('register')       async register(@Body() dto: RegisterDto): Promise<AuthTokenResponse>;
  @Get('me')              async me(@CurrentUser() user: UserPayload): Promise<UserProfile>;
  @Post('logout')         async logout(@CurrentUser() user: UserPayload): Promise<void>;
  @Post('refresh-token')  async refreshToken(@Body() dto: RefreshTokenDto): Promise<AuthTokenResponse>;
}

@Controller('api/portal')
export class PortalAuthController {
  @Post('login')    async portalLogin(@Body() dto: PortalLoginDto): Promise<AuthTokenResponse>;
  @Post('register') async portalRegister(@Body() dto: PortalRegisterDto): Promise<AuthTokenResponse>;
}
```

### Service 方法签名 / Service メソッドシグネチャ

```typescript
@Injectable()
export class AuthService {
  async login(dto: LoginDto): Promise<AuthTokenResponse>;
  async register(dto: RegisterDto): Promise<AuthTokenResponse>;
  async getCurrentUser(userId: string, tenantId: string): Promise<UserProfile>;
  async logout(userId: string): Promise<void>;
  async refreshToken(refreshToken: string): Promise<AuthTokenResponse>;
  async verifyJwt(token: string): Promise<UserPayload>;
}
```

### DTO 定义 / DTO 定義

```typescript
export const LoginSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(100),
});

export const RegisterSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(100),
  tenantCode: z.string().min(1).max(50),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});
```

### 模块依赖 / モジュール依存

- 依赖: `DatabaseModule`, `ConfigModule`
- 依存: `DatabaseModule`, `ConfigModule`

---

## A4. QueueModule

> BullMQ 7 队列 + Processor 定义
> BullMQ 7 キュー + Processor 定義

### 目录结构 / ディレクトリ構成

```
src/queue/
├── queue.module.ts
├── processors/
│   ├── webhook.processor.ts         # wms-webhook キュー
│   ├── script.processor.ts          # wms-script キュー
│   ├── audit.processor.ts           # wms-audit キュー
│   ├── csv-import.processor.ts      # wms-csv-import キュー
│   ├── billing.processor.ts         # wms-billing キュー
│   ├── notification.processor.ts    # wms-notification キュー
│   └── report.processor.ts          # wms-report キュー
├── scheduled-tasks.service.ts       # Cron 定时任务 / 定期タスク
└── queue.constants.ts               # 队列名常量 / キュー名定数
```

### 队列定义 / キュー定義

| 队列名 / キュー名 | 并发度 | 重试 | 用途 / 用途 |
|---|:---:|:---:|---|
| `wms-webhook` | 3 | 3x exp | Webhook 投递 / 配信 |
| `wms-script` | 2 | 3x exp | 自动化脚本 / スクリプト実行 |
| `wms-audit` | 1 | 3x exp | 审计日志 / 監査ログ |
| `wms-csv-import` | 2 | 3x exp | CSV 导入 / インポート |
| `wms-billing` | 2 | 3x exp | 账单计算 / 請求計算 |
| `wms-notification` | 3 | 3x exp | 通知发送 / 通知送信 |
| `wms-report` | 1 | 3x exp | 报表生成 / レポート生成 |

### 定时任务 / 定期タスク

```typescript
@Injectable()
export class ScheduledTasksService {
  @Cron('0 */30 * * * *')  async releaseExpiredReservations(): Promise<void>;
  @Cron('0 0 2 * * *')     async generateDailyReport(): Promise<void>;
  @Cron('0 0 1 1 * *')     async generateMonthlyBilling(): Promise<void>;
}
```

### 模块依赖 / モジュール依存

- 依赖: `ConfigModule` (Redis 连接)
- 依存: `ConfigModule` (Redis 接続)

---

## A5. ConfigModule

> 环境变量验证 + 外部服务配置
> 環境変数バリデーション + 外部サービス設定

### 目录结构 / ディレクトリ構成

```
src/config/
├── config.module.ts
├── env.ts                           # 环境变量加载 / 環境変数ロード
├── env.schema.ts                    # Zod 验证 / Zod バリデーション
├── database.ts                      # PostgreSQL 连接 / 接続設定
├── redis.ts                         # Redis 连接 / 接続設定
└── supabase.ts                      # Supabase 客户端 / クライアント
```

### 环境变量 Schema / 環境変数 Schema

```typescript
export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_JWT_SECRET: z.string().min(32),
  REDIS_URL: z.string().url(),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});
```

---

# Part B: 業務モジュール / 业务模块

---

## B1. ProductsModule

> 商品管理: 商品、セット商品、資材、サブSKU
> 商品管理: 商品、套装商品、材料、子SKU

### 目录结构 / ディレクトリ構成

```
src/modules/products/
├── products.module.ts
├── products.controller.ts           # 14 endpoints
├── products.service.ts
├── set-products.controller.ts       # 5 endpoints
├── set-products.service.ts
├── materials.controller.ts          # 5 endpoints
├── materials.service.ts
└── dto/
    ├── create-product.dto.ts
    ├── update-product.dto.ts
    ├── product-query.dto.ts
    ├── create-set-product.dto.ts
    ├── update-set-product.dto.ts
    ├── create-material.dto.ts
    └── update-material.dto.ts
```

### Controller 方法签名 / Controller メソッドシグネチャ

```typescript
@Controller('api/products')
export class ProductsController {
  @Get()              async findAll(@TenantId() tid: string, @Query() q: ProductQueryDto): Promise<PaginatedResult<Product>>;
  @Get('search')      async search(@TenantId() tid: string, @Query('q') keyword: string): Promise<Product[]>;
  @Get('barcode/:code') async findByBarcode(@TenantId() tid: string, @Param('code') code: string): Promise<Product>;
  @Get(':id')         async findOne(@TenantId() tid: string, @Param('id') id: string): Promise<Product>;
  @Get(':id/stock')   async getStock(@TenantId() tid: string, @Param('id') id: string): Promise<ProductStockItem[]>;
  @Get(':id/history') async getHistory(@TenantId() tid: string, @Param('id') id: string): Promise<ChangeHistory[]>;
  @Post()             async create(@TenantId() tid: string, @Body() dto: CreateProductDto): Promise<Product>;
  @Put(':id')         async update(@TenantId() tid: string, @Param('id') id: string, @Body() dto: UpdateProductDto): Promise<Product>;
  @Patch(':id')       async partialUpdate(@TenantId() tid: string, @Param('id') id: string, @Body() dto: Partial<UpdateProductDto>): Promise<Product>;
  @Delete(':id')      async remove(@TenantId() tid: string, @Param('id') id: string): Promise<void>;
  @Post('import')     async importCsv(@TenantId() tid: string, @UploadedFile() file: MultipartFile): Promise<ImportResult>;
  @Post('export')     async exportCsv(@TenantId() tid: string, @Body() q: ProductQueryDto): Promise<StreamableFile>;
  @Post('bulk-update') async bulkUpdate(@TenantId() tid: string, @Body() dto: BulkUpdateProductDto): Promise<BulkResult>;
  @Post('bulk-delete') async bulkDelete(@TenantId() tid: string, @Body() dto: { ids: string[] }): Promise<BulkResult>;
}

@Controller('api/set-products')
export class SetProductsController {
  @Get()         async findAll(@TenantId() tid: string, @Query() q: PaginationDto): Promise<PaginatedResult<SetProduct>>;
  @Get(':id')    async findOne(@TenantId() tid: string, @Param('id') id: string): Promise<SetProduct>;
  @Post()        async create(@TenantId() tid: string, @Body() dto: CreateSetProductDto): Promise<SetProduct>;
  @Put(':id')    async update(@TenantId() tid: string, @Param('id') id: string, @Body() dto: UpdateSetProductDto): Promise<SetProduct>;
  @Delete(':id') async remove(@TenantId() tid: string, @Param('id') id: string): Promise<void>;
}

@Controller('api/materials')
export class MaterialsController {
  @Get()         async findAll(@TenantId() tid: string, @Query() q: PaginationDto): Promise<PaginatedResult<Material>>;
  @Get(':id')    async findOne(@TenantId() tid: string, @Param('id') id: string): Promise<Material>;
  @Post()        async create(@TenantId() tid: string, @Body() dto: CreateMaterialDto): Promise<Material>;
  @Put(':id')    async update(@TenantId() tid: string, @Param('id') id: string, @Body() dto: UpdateMaterialDto): Promise<Material>;
  @Delete(':id') async remove(@TenantId() tid: string, @Param('id') id: string): Promise<void>;
}
```

### Service 方法签名 / Service メソッドシグネチャ

```typescript
@Injectable()
export class ProductsService {
  async findAll(tenantId: string, query: ProductQueryDto): Promise<PaginatedResult<Product>>;
  async search(tenantId: string, keyword: string): Promise<Product[]>;
  async findById(id: string, tenantId: string): Promise<Product>;
  async findByBarcode(code: string, tenantId: string): Promise<Product>;
  async findBySku(sku: string, tenantId: string): Promise<Product | null>;
  async getProductStock(id: string, tenantId: string): Promise<ProductStockItem[]>;
  async getChangeHistory(id: string, tenantId: string): Promise<ChangeHistory[]>;
  async create(tenantId: string, dto: CreateProductDto): Promise<Product>;
  async update(id: string, tenantId: string, dto: UpdateProductDto): Promise<Product>;
  async partialUpdate(id: string, tenantId: string, dto: Partial<UpdateProductDto>): Promise<Product>;
  async softDelete(id: string, tenantId: string): Promise<void>;
  async bulkUpdate(tenantId: string, dto: BulkUpdateProductDto): Promise<BulkResult>;
  async bulkDelete(tenantId: string, ids: string[]): Promise<BulkResult>;
}

@Injectable()
export class SetProductsService {
  async findAll(tenantId: string, query: PaginationDto): Promise<PaginatedResult<SetProduct>>;
  async findById(id: string, tenantId: string): Promise<SetProduct>;
  async create(tenantId: string, dto: CreateSetProductDto): Promise<SetProduct>;
  async update(id: string, tenantId: string, dto: UpdateSetProductDto): Promise<SetProduct>;
  async softDelete(id: string, tenantId: string): Promise<void>;
  async expandSetProduct(setProductId: string, tenantId: string): Promise<Product[]>;
}
```

### DTO 完整定义 / DTO 完全定義

```typescript
export const CreateProductSchema = z.object({
  sku: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  nameFull: z.string().max(500).optional(),
  category: z.string().max(100).optional(),
  subcategory: z.string().max(100).optional(),
  barcode: z.array(z.string()).optional().default([]),
  janCode: z.string().max(20).optional(),
  weight: z.number().nonnegative().optional(),
  dimensions: z.object({
    length: z.number().nonnegative().optional(),
    width: z.number().nonnegative().optional(),
    height: z.number().nonnegative().optional(),
  }).optional(),
  unitPrice: z.number().nonnegative().optional(),
  coolType: z.enum(['normal', 'chilled', 'frozen']).optional().default('normal'),
  safetyStock: z.number().int().nonnegative().optional().default(0),
  imageUrl: z.string().url().optional(),
  customFields: z.record(z.unknown()).optional(),
  clientId: z.string().uuid().optional(),
  memo: z.string().max(2000).optional(),
});

export const UpdateProductSchema = CreateProductSchema.partial();

export const ProductQuerySchema = PaginationSchema.extend({
  search: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  categoryId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  coolType: z.enum(['normal', 'chilled', 'frozen']).optional(),
});

export const CreateSetProductSchema = z.object({
  sku: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  components: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })).min(1),
  memo: z.string().max(2000).optional(),
});
```

### Repository 自定义方法 / Repository カスタムメソッド

```typescript
@Injectable()
export class ProductsRepository extends BaseRepository<Product> {
  // BaseRepository 标准方法 + 以下自定义 / 以下カスタム
  async findBySku(sku: string, tenantId: string): Promise<Product | null>;
  async findByBarcode(barcode: string, tenantId: string): Promise<Product | null>;
  async searchByKeyword(keyword: string, tenantId: string, limit?: number): Promise<Product[]>;
  async bulkUpdateFields(ids: string[], tenantId: string, data: Partial<Product>): Promise<number>;
}
```

### 领域事件 / ドメインイベント

| 发布 / パブリッシュ | 消费 / コンシューム |
|---|---|
| `product.created` | — |
| `product.updated` | — |
| `product.deleted` | — |
| — | — |

### 模块依赖 / モジュール依存

- 依赖: `DatabaseModule`
- 被依赖: `InventoryModule`, `ShipmentModule`, `InboundModule`, `ImportModule`

---

## B2. InventoryModule

> 库存管理: 在库数量、移动、台账、批次、序列号、库位、库存类别
> 在庫管理: 在庫数量・移動・台帳・ロット・シリアル番号・ロケーション・在庫カテゴリ

### 目录结构 / ディレクトリ構成

```
src/modules/inventory/
├── inventory.module.ts
├── inventory.controller.ts          # 17 endpoints (在庫照会 / 库存查询)
├── inventory.service.ts             # 一覧・集計 / 列表汇总
├── stock.service.ts                 # 预留・移动・调整 / 引当・移動・調整
├── inventory-ledger.controller.ts   # 3 endpoints
├── inventory-ledger.service.ts
├── location.controller.ts           # 7 endpoints
├── location.service.ts
├── lot.controller.ts                # 5 endpoints
├── lot.service.ts
├── serial-number.controller.ts      # 5 endpoints
├── serial-number.service.ts
├── inventory-category.controller.ts # 5 endpoints
├── inventory-category.service.ts
└── dto/
    ├── adjust-stock.dto.ts
    ├── transfer-stock.dto.ts
    ├── reserve-stock.dto.ts
    ├── bulk-adjust.dto.ts
    ├── stock-query.dto.ts
    ├── create-location.dto.ts
    ├── create-lot.dto.ts
    ├── create-serial-number.dto.ts
    └── create-inventory-category.dto.ts
```

### Service 方法签名 / Service メソッドシグネチャ

```typescript
@Injectable()
export class InventoryService {
  async listStock(tenantId: string, filters: StockQueryDto): Promise<PaginatedResult<StockListItem>>;
  async getInventorySummary(tenantId: string, filters: InventorySummaryDto): Promise<PaginatedResult<InventorySummaryItem>>;
  async getProductStock(productId: string, tenantId: string): Promise<ProductStockItem[]>;
  async getOverview(tenantId: string): Promise<InventoryOverview>;
  async getLocationUsage(tenantId: string): Promise<LocationUsage[]>;
  async getLowStockAlerts(tenantId: string): Promise<LowStockAlertItem[]>;
  async getAgingAnalysis(tenantId: string): Promise<AgingReport>;
  async exportInventory(tenantId: string, filters: StockQueryDto): Promise<StreamableFile>;
}

@Injectable()
export class StockService {
  async adjustStock(tenantId: string, dto: AdjustStockDto, userId: string): Promise<AdjustStockResult>;
  async bulkAdjustStock(tenantId: string, items: BulkAdjustDto, userId: string): Promise<BulkResult>;
  async transferStock(tenantId: string, dto: TransferStockDto, userId: string): Promise<TransferStockResult>;
  async reserveForOrders(tenantId: string, orderIds: string[], userId: string): Promise<ReserveResult>;
  async unreserveForOrder(tenantId: string, orderId: string): Promise<void>;
  async completeStockForOrder(tenantId: string, orderId: string): Promise<void>;
  async cleanupZeroStock(tenantId: string): Promise<{ deletedCount: number }>;
  async rebuildInventory(tenantId: string, fix: boolean): Promise<RebuildInventoryResult>;
  async releaseExpiredReservations(tenantId: string): Promise<ReleaseExpiredResult>;
}

@Injectable()
export class InventoryLedgerService {
  async getLedgerSummary(tenantId: string, filters: LedgerQueryDto): Promise<PaginatedResult<LedgerEntry>>;
  async exportLedger(tenantId: string, filters: LedgerQueryDto): Promise<StreamableFile>;
}

@Injectable()
export class LocationService {
  async findAll(tenantId: string, query: PaginationDto): Promise<PaginatedResult<Location>>;
  async findById(id: string, tenantId: string): Promise<Location>;
  async create(tenantId: string, dto: CreateLocationDto): Promise<Location>;
  async update(id: string, tenantId: string, dto: UpdateLocationDto): Promise<Location>;
  async remove(id: string, tenantId: string): Promise<void>;
  async bulkCreate(tenantId: string, dtos: CreateLocationDto[]): Promise<Location[]>;
  async getTree(tenantId: string): Promise<LocationTreeNode[]>;
}

@Injectable()
export class LotService {
  async findAll(tenantId: string, query: PaginationDto): Promise<PaginatedResult<Lot>>;
  async findById(id: string, tenantId: string): Promise<Lot>;
  async create(tenantId: string, dto: CreateLotDto): Promise<Lot>;
  async update(id: string, tenantId: string, dto: UpdateLotDto): Promise<Lot>;
  async remove(id: string, tenantId: string): Promise<void>;
}
```

### DTO 完整定义 / DTO 完全定義

```typescript
export const AdjustStockSchema = z.object({
  productId: z.string().uuid(),
  locationId: z.string().uuid(),
  lotId: z.string().uuid().optional(),
  adjustQuantity: z.number().int(),  // 正 = 增加、負 = 減少 / 正=增加、负=减少
  memo: z.string().max(500).optional(),
});

export const TransferStockSchema = z.object({
  productId: z.string().uuid(),
  fromLocationId: z.string().uuid(),
  toLocationId: z.string().uuid(),
  quantity: z.number().int().positive(),
  lotId: z.string().uuid().optional(),
  memo: z.string().max(500).optional(),
});

export const BulkAdjustSchema = z.object({
  items: z.array(z.object({
    productSku: z.string().min(1),
    locationCode: z.string().min(1),
    quantity: z.number().int(),
    lotNumber: z.string().optional(),
    memo: z.string().max(500).optional(),
  })).min(1).max(1000),
});

export const CreateLocationSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  type: z.enum(['rack', 'shelf', 'bin', 'floor', 'zone', 'virtual', 'staging', 'shipping', 'receiving']),
  parentId: z.string().uuid().optional(),
  warehouseType: z.enum(['normal', 'chilled', 'frozen', 'hazardous']).optional().default('normal'),
  capacity: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional().default(true),
});

export const CreateLotSchema = z.object({
  lotNumber: z.string().min(1).max(100),
  productId: z.string().uuid(),
  expiryDate: z.coerce.date().optional(),
  manufacturingDate: z.coerce.date().optional(),
  status: z.enum(['active', 'quarantine', 'expired', 'recalled']).optional().default('active'),
  memo: z.string().max(500).optional(),
});
```

### 领域事件 / ドメインイベント

| 发布 / パブリッシュ | 消费 / コンシューム |
|---|---|
| `stock.adjusted` | — |
| `stock.reserved` | — |
| `stock.moved` | — |
| `stock.released` | — |
| — | `inbound.completed` → 增加库存 / 在庫増加 |
| — | `return.processed` → 恢复库存 / 在庫復元 |
| — | `stocktaking.finalized` → 差异反映 / 差異反映 |

### 模块依赖 / モジュール依存

- 依赖: `DatabaseModule`
- 被依赖: `InboundModule`, `ShipmentModule`, `WarehouseModule`, `ReturnsModule`

---

## B3. InboundModule

> 入库管理: 入库指示、工作流（draft→confirmed→receiving→putaway→completed）、通过型入库
> 入庫管理: 入庫指示・ワークフロー（draft→confirmed→receiving→putaway→completed）・通過型入庫

### 目录结构 / ディレクトリ構成

```
src/modules/inbound/
├── inbound.module.ts
├── inbound.controller.ts            # 15 endpoints
├── inbound.service.ts
├── inbound-workflow.service.ts      # 状态机 / ステートマシン
├── passthrough.controller.ts        # 10 endpoints
├── passthrough.service.ts
└── dto/
    ├── create-inbound.dto.ts
    ├── update-inbound.dto.ts
    ├── receive-item.dto.ts
    ├── bulk-receive.dto.ts
    ├── putaway.dto.ts
    └── inbound-query.dto.ts
```

### Service 方法签名 / Service メソッドシグネチャ

```typescript
@Injectable()
export class InboundService {
  async findAll(tenantId: string, query: InboundQueryDto): Promise<PaginatedResult<InboundOrder>>;
  async findById(id: string, tenantId: string): Promise<InboundOrder>;
  async create(tenantId: string, dto: CreateInboundDto): Promise<InboundOrder>;
  async update(id: string, tenantId: string, dto: UpdateInboundDto): Promise<InboundOrder>;
  async softDelete(id: string, tenantId: string): Promise<void>;
  async getVarianceReport(id: string, tenantId: string): Promise<VarianceReport>;
  async getHistory(tenantId: string, query: PaginationDto): Promise<PaginatedResult<InboundOrder>>;
}

@Injectable()
export class InboundWorkflowService {
  async confirm(id: string, tenantId: string, userId: string): Promise<InboundOrder>;
  async receiveLine(id: string, tenantId: string, dto: ReceiveItemDto, userId: string): Promise<InboundOrder>;
  async bulkReceive(id: string, tenantId: string, dto: BulkReceiveDto, userId: string): Promise<InboundOrder>;
  async putaway(id: string, tenantId: string, dto: PutawayDto, userId: string): Promise<InboundOrder>;
  async complete(id: string, tenantId: string, userId: string): Promise<InboundOrder>;
  async cancel(id: string, tenantId: string, userId: string): Promise<InboundOrder>;
}
```

### DTO 完整定义 / DTO 完全定義

```typescript
export const CreateInboundSchema = z.object({
  clientId: z.string().uuid(),
  supplierId: z.string().uuid().optional(),
  expectedDate: z.coerce.date(),
  warehouseId: z.string().uuid().optional(),
  lines: z.array(z.object({
    productId: z.string().uuid(),
    expectedQuantity: z.number().int().positive(),
    lotNumber: z.string().max(100).optional(),
    locationId: z.string().uuid().optional(),
    unitPrice: z.number().nonnegative().optional(),
    memo: z.string().max(500).optional(),
  })).min(1),
  serviceOptions: z.record(z.unknown()).optional(),
  memo: z.string().max(2000).optional(),
});

export const ReceiveItemSchema = z.object({
  lineIndex: z.number().int().nonnegative(),
  receivedQuantity: z.number().int().positive(),
  locationId: z.string().uuid(),
  lotNumber: z.string().max(100).optional(),
  condition: z.enum(['good', 'damaged', 'returned']).optional().default('good'),
  memo: z.string().max(500).optional(),
});

export const PutawaySchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid(),
    fromLocationId: z.string().uuid(),
    toLocationId: z.string().uuid(),
    quantity: z.number().int().positive(),
    lotId: z.string().uuid().optional(),
  })).min(1),
});
```

### 领域事件 / ドメインイベント

| 发布 / パブリッシュ | 消费 / コンシューム |
|---|---|
| `inbound.confirmed` | — |
| `inbound.received` | AuditListener, NotificationListener |
| `inbound.completed` | AuditListener, WebhookListener, InventoryListener |
| `inbound.cancelled` | — |
| — | — |

### 模块依赖 / モジュール依存

- 依赖: `DatabaseModule`, `InventoryModule`
- 被依赖: `ImportModule`

---

## B4. ShipmentModule

> 出库管理: 出库指示、保管型出库、套装出库、批量状态操作
> 出庫管理: 出荷指示・保管型出庫・セット出荷・一括ステータス操作

### 目录结构 / ディレクトリ構成

```
src/modules/shipment/
├── shipment.module.ts
├── shipment.controller.ts           # 15 endpoints
├── shipment.service.ts
├── outbound-request.controller.ts   # 8 endpoints
├── outbound-request.service.ts
├── set-order.controller.ts          # 7 endpoints
├── set-order.service.ts
└── dto/
    ├── create-shipment.dto.ts
    ├── update-shipment.dto.ts
    ├── bulk-status.dto.ts
    ├── shipment-query.dto.ts
    ├── import-receipts.dto.ts
    └── create-outbound-request.dto.ts
```

### Service 方法签名 / Service メソッドシグネチャ

```typescript
@Injectable()
export class ShipmentService {
  async findAll(tenantId: string, query: ShipmentQueryDto): Promise<PaginatedResult<ShipmentOrder>>;
  async findById(id: string, tenantId: string): Promise<ShipmentOrder>;
  async findByIds(ids: string[], tenantId: string): Promise<ShipmentOrder[]>;
  async createBulk(tenantId: string, items: CreateShipmentDto[], userId: string): Promise<CreateOrdersBulkResult>;
  async update(id: string, tenantId: string, dto: UpdateShipmentDto): Promise<ShipmentOrder>;
  async partialUpdate(id: string, tenantId: string, dto: Partial<UpdateShipmentDto>): Promise<ShipmentOrder>;
  async bulkUpdate(tenantId: string, ids: string[], dto: Partial<UpdateShipmentDto>): Promise<BulkResult>;
  async softDelete(id: string, tenantId: string): Promise<void>;
  async bulkDelete(tenantId: string, ids: string[]): Promise<{ deletedCount: number; requestedCount: number }>;
  async updateStatus(id: string, tenantId: string, action: StatusActionInput, userId: string): Promise<ShipmentOrder>;
  async bulkUpdateStatus(tenantId: string, ids: string[], action: StatusActionInput, userId: string): Promise<StatusBulkResult>;
  async importCarrierReceipts(tenantId: string, dto: ImportReceiptsDto): Promise<ImportResult>;
  async getGroupCounts(tenantId: string, query: ShipmentQueryDto): Promise<Record<string, number>>;
  async exportCsv(tenantId: string, query: ShipmentQueryDto): Promise<StreamableFile>;
  async getTracking(id: string, tenantId: string): Promise<TrackingInfo>;
}
```

### DTO 完整定义 / DTO 完全定義

```typescript
export const CreateShipmentSchema = z.object({
  clientId: z.string().uuid(),
  customerManagementNumber: z.string().max(100).optional(),
  recipientName: z.string().min(1).max(200),
  recipientPostalCode: z.string().regex(/^\d{3}-?\d{4}$/),
  recipientPrefecture: z.string().min(1).max(50),
  recipientCity: z.string().min(1).max(100),
  recipientStreet: z.string().max(200).optional(),
  recipientBuilding: z.string().max(200).optional(),
  recipientPhone: z.string().max(20),
  shipPlanDate: z.coerce.date().optional(),
  carrierId: z.string().uuid().optional(),
  deliveryTimeSlot: z.string().max(50).optional(),
  products: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().nonnegative().optional(),
  })).min(1),
  materials: z.array(z.object({
    materialId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })).optional().default([]),
  memo: z.string().max(2000).optional(),
});

export const BulkStatusSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
  action: z.enum(['mark-print-ready', 'mark-printed', 'mark-shipped', 'mark-ec-exported', 'mark-inspected', 'mark-held', 'unhold', 'unconfirm']),
});

export const ShipmentQuerySchema = PaginationSchema.extend({
  status: z.string().optional(),
  clientId: z.string().uuid().optional(),
  carrierId: z.string().uuid().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  search: z.string().optional(),
  filters: z.record(z.unknown()).optional(),  // 高级过滤器 / 高度なフィルター (50+ fields)
});
```

### 领域事件 / ドメインイベント

| 发布 / パブリッシュ | 消费 / コンシューム |
|---|---|
| `order.created` | WebhookListener, AutoProcessingListener |
| `order.confirmed` | StockService (引当), BillingListener |
| `order.shipped` | AuditListener, NotificationListener, BillingListener, WebhookListener |
| `order.cancelled` | StockService (引当解放) |
| — | `extension.triggered` → 自动处理 / 自動処理 |

### 模块依赖 / モジュール依存

- 依赖: `DatabaseModule`, `InventoryModule`, `CarriersModule`
- 被依赖: `ReturnsModule`, `IntegrationsModule`, `ImportModule`

---

## B5. WarehouseModule

> 仓库运营: 仓库、任务、波次、检品、贴标、棚卸、循环盘点
> 倉庫オペレーション: 倉庫・タスク・ウェーブ・検品・ラベリング・棚卸・循環棚卸

### 目录结构 / ディレクトリ構成

```
src/modules/warehouse/
├── warehouse.module.ts
├── warehouse.controller.ts          # 5 endpoints
├── warehouse.service.ts
├── task.controller.ts               # 7 endpoints
├── task.service.ts
├── wave.controller.ts               # 7 endpoints
├── wave.service.ts
├── inspection.controller.ts         # 5 endpoints
├── inspection.service.ts
├── labeling.controller.ts           # 6 endpoints
├── labeling.service.ts
├── stocktaking.controller.ts        # 8 endpoints
├── stocktaking.service.ts
├── cycle-count.controller.ts        # 6 endpoints
├── cycle-count.service.ts
└── dto/
    ├── create-task.dto.ts
    ├── create-wave.dto.ts
    ├── inspection-result.dto.ts
    ├── create-stocktaking.dto.ts
    └── create-cycle-count.dto.ts
```

### Service 方法签名（抜粋）/ Service メソッドシグネチャ（抜粋）

```typescript
@Injectable()
export class TaskService {
  async findAll(tenantId: string, query: PaginationDto): Promise<PaginatedResult<Task>>;
  async findById(id: string, tenantId: string): Promise<Task>;
  async create(tenantId: string, dto: CreateTaskDto): Promise<Task>;
  async update(id: string, tenantId: string, dto: UpdateTaskDto): Promise<Task>;
  async complete(id: string, tenantId: string, userId: string): Promise<Task>;
  async assign(id: string, tenantId: string, assigneeId: string): Promise<Task>;
  async remove(id: string, tenantId: string): Promise<void>;
}

@Injectable()
export class WaveService {
  async findAll(tenantId: string, query: PaginationDto): Promise<PaginatedResult<Wave>>;
  async findById(id: string, tenantId: string): Promise<Wave>;
  async create(tenantId: string, dto: CreateWaveDto): Promise<Wave>;
  async update(id: string, tenantId: string, dto: UpdateWaveDto): Promise<Wave>;
  async release(id: string, tenantId: string, userId: string): Promise<Wave>;
  async complete(id: string, tenantId: string, userId: string): Promise<Wave>;
  async remove(id: string, tenantId: string): Promise<void>;
}

@Injectable()
export class StocktakingService {
  async findAll(tenantId: string, query: PaginationDto): Promise<PaginatedResult<StocktakingOrder>>;
  async findById(id: string, tenantId: string): Promise<StocktakingOrder>;
  async create(tenantId: string, dto: CreateStocktakingDto): Promise<StocktakingOrder>;
  async update(id: string, tenantId: string, dto: UpdateStocktakingDto): Promise<StocktakingOrder>;
  async registerCount(id: string, tenantId: string, dto: CountEntryDto, userId: string): Promise<StocktakingOrder>;
  async finalize(id: string, tenantId: string, userId: string): Promise<StocktakingOrder>;
  async cancel(id: string, tenantId: string, userId: string): Promise<StocktakingOrder>;
  async remove(id: string, tenantId: string): Promise<void>;
}

@Injectable()
export class CycleCountService {
  async findAll(tenantId: string, query: PaginationDto): Promise<PaginatedResult<CycleCount>>;
  async findById(id: string, tenantId: string): Promise<CycleCount>;
  async create(tenantId: string, dto: CreateCycleCountDto): Promise<CycleCount>;
  async update(id: string, tenantId: string, dto: UpdateCycleCountDto): Promise<CycleCount>;
  async execute(id: string, tenantId: string, userId: string): Promise<CycleCount>;
  async remove(id: string, tenantId: string): Promise<void>;
}
```

### DTO 完整定义（抜粋）/ DTO 完全定義（抜粋）

```typescript
export const CreateStocktakingSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['full', 'partial', 'spot']),
  locationIds: z.array(z.string().uuid()).optional(),
  productIds: z.array(z.string().uuid()).optional(),
  scheduledDate: z.coerce.date(),
  memo: z.string().max(2000).optional(),
});

export const CreateWaveSchema = z.object({
  name: z.string().min(1).max(200),
  orderIds: z.array(z.string().uuid()).min(1),
  priority: z.number().int().min(0).max(99).optional().default(50),
  memo: z.string().max(2000).optional(),
});

export const CreateTaskSchema = z.object({
  type: z.enum(['picking', 'packing', 'sorting', 'putaway', 'replenishment']),
  orderId: z.string().uuid().optional(),
  waveId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    locationId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })).min(1),
  priority: z.number().int().min(0).max(99).optional().default(50),
});
```

### 领域事件 / ドメインイベント

| 发布 / パブリッシュ | 消费 / コンシューム |
|---|---|
| `stocktaking.finalized` | AuditListener, LedgerListener, StockService |
| `task.completed` | AuditListener |
| `wave.released` | TaskService (タスク自動生成) |
| — | — |

### 模块依赖 / モジュール依存

- 依赖: `DatabaseModule`, `InventoryModule`

---

## B6. ReturnsModule

> 退货管理: 退货指示、检品、上架、状态流转
> 返品管理: 返品指示・検品・棚入れ・ステータス遷移

### 目录结构 / ディレクトリ構成

```
src/modules/returns/
├── returns.module.ts
├── returns.controller.ts            # 11 endpoints
├── returns.service.ts
└── dto/
    ├── create-return.dto.ts
    ├── process-return.dto.ts
    └── return-query.dto.ts
```

### Service 方法签名 / Service メソッドシグネチャ

```typescript
@Injectable()
export class ReturnsService {
  async findAll(tenantId: string, query: ReturnQueryDto): Promise<PaginatedResult<ReturnOrder>>;
  async findById(id: string, tenantId: string): Promise<ReturnOrder>;
  async create(tenantId: string, dto: CreateReturnDto): Promise<ReturnOrder>;
  async update(id: string, tenantId: string, dto: UpdateReturnDto): Promise<ReturnOrder>;
  async softDelete(id: string, tenantId: string): Promise<void>;
  async receive(id: string, tenantId: string, userId: string): Promise<ReturnOrder>;
  async inspect(id: string, tenantId: string, dto: ProcessReturnDto, userId: string): Promise<ReturnOrder>;
  async putback(id: string, tenantId: string, userId: string): Promise<ReturnOrder>;
  async complete(id: string, tenantId: string, userId: string): Promise<ReturnOrder>;
  async cancel(id: string, tenantId: string, userId: string): Promise<ReturnOrder>;
  async importCsv(tenantId: string, csvContent: string): Promise<ImportResult>;
}
```

### DTO 完整定义 / DTO 完全定義

```typescript
export const CreateReturnSchema = z.object({
  originalOrderId: z.string().uuid().optional(),
  clientId: z.string().uuid(),
  reason: z.enum(['defective', 'wrong_item', 'customer_return', 'damaged', 'other']),
  lines: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
    condition: z.enum(['good', 'damaged', 'defective']).optional().default('good'),
    memo: z.string().max(500).optional(),
  })).min(1),
  memo: z.string().max(2000).optional(),
});

export const ProcessReturnSchema = z.object({
  lines: z.array(z.object({
    lineIndex: z.number().int().nonnegative(),
    inspectedQuantity: z.number().int().nonnegative(),
    condition: z.enum(['good', 'damaged', 'defective']),
    disposition: z.enum(['restock', 'dispose', 'quarantine']),
    locationId: z.string().uuid().optional(),
  })),
});
```

### 领域事件 / ドメインイベント

| 发布 / パブリッシュ | 消费 / コンシューム |
|---|---|
| `return.received` | AuditListener |
| `return.processed` | AuditListener, InventoryListener (在庫復元) |
| `return.completed` | NotificationListener, WebhookListener |

### 模块依赖 / モジュール依存

- 依赖: `DatabaseModule`, `InventoryModule`, `ShipmentModule`

---

## B7. BillingModule

> 账单管理: 请求记录、发票、作业费、服务费率、配送费率、价格目录
> 請求管理: 請求レコード・請求書・作業費・サービス料金・配送料金・価格カタログ

### 目录结构 / ディレクトリ構成

```
src/modules/billing/
├── billing.module.ts
├── billing.controller.ts            # 5 endpoints
├── billing.service.ts
├── invoice.controller.ts            # 7 endpoints
├── invoice.service.ts
├── work-charge.controller.ts        # 5 endpoints
├── work-charge.service.ts
├── service-rate.controller.ts       # 5 endpoints
├── service-rate.service.ts
├── shipping-rate.controller.ts      # 5 endpoints
├── shipping-rate.service.ts
├── price-catalog.controller.ts      # 5 endpoints
├── price-catalog.service.ts
└── dto/
    ├── billing-query.dto.ts
    ├── create-invoice.dto.ts
    ├── work-charge.dto.ts
    ├── service-rate.dto.ts
    ├── shipping-rate.dto.ts
    └── price-catalog.dto.ts
```

### Service 方法签名 / Service メソッドシグネチャ

```typescript
@Injectable()
export class BillingService {
  async findAll(tenantId: string, query: BillingQueryDto): Promise<PaginatedResult<BillingRecord>>;
  async findById(id: string, tenantId: string): Promise<BillingRecord>;
  async generateMonthlyBilling(tenantId: string, period: string): Promise<BillingRecord[]>;
  async getDashboard(tenantId: string): Promise<BillingDashboard>;
  async exportBilling(tenantId: string, query: BillingQueryDto): Promise<StreamableFile>;
  async createAutoCharge(tenantId: string, event: string, entityId: string, amount: number): Promise<BillingRecord>;
}

@Injectable()
export class InvoiceService {
  async findAll(tenantId: string, query: PaginationDto): Promise<PaginatedResult<Invoice>>;
  async findById(id: string, tenantId: string): Promise<Invoice>;
  async create(tenantId: string, dto: CreateInvoiceDto): Promise<Invoice>;
  async update(id: string, tenantId: string, dto: UpdateInvoiceDto): Promise<Invoice>;
  async remove(id: string, tenantId: string): Promise<void>;
  async send(id: string, tenantId: string): Promise<void>;
  async generatePdf(id: string, tenantId: string): Promise<Buffer>;
}
```

### DTO 完整定义 / DTO 完全定義

```typescript
export const CreateInvoiceSchema = z.object({
  clientId: z.string().uuid(),
  period: z.string().regex(/^\d{4}-\d{2}$/),  // YYYY-MM
  items: z.array(z.object({
    description: z.string().min(1).max(500),
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative(),
    amount: z.number().nonnegative(),
    category: z.enum(['storage', 'handling', 'shipping', 'material', 'other']),
  })).min(1),
  taxRate: z.number().min(0).max(1).optional().default(0.1),
  dueDate: z.coerce.date().optional(),
  memo: z.string().max(2000).optional(),
});

export const ServiceRateSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.enum(['storage', 'handling', 'inspection', 'labeling', 'packing', 'other']),
  unitPrice: z.number().nonnegative(),
  unit: z.enum(['per_item', 'per_case', 'per_pallet', 'per_day', 'per_month', 'flat']),
  clientId: z.string().uuid().optional(),
  isDefault: z.boolean().optional().default(false),
  validFrom: z.coerce.date().optional(),
  validTo: z.coerce.date().optional(),
});

export const ShippingRateSchema = z.object({
  carrierId: z.string().uuid(),
  sizeCode: z.string().min(1).max(20),
  originRegion: z.string().max(50).optional(),
  destinationRegion: z.string().max(50),
  basePrice: z.number().nonnegative(),
  coolSurcharge: z.number().nonnegative().optional().default(0),
  frozenSurcharge: z.number().nonnegative().optional().default(0),
  validFrom: z.coerce.date().optional(),
  validTo: z.coerce.date().optional(),
});
```

### 领域事件 / ドメインイベント

| 发布 / パブリッシュ | 消费 / コンシューム |
|---|---|
| `billing.generated` | NotificationListener |
| `invoice.sent` | AuditListener |
| — | `order.shipped` → 自动计费 / 自動請求 |
| — | `inbound.completed` → 自动计费 / 自動請求 |

### 模块依赖 / モジュール依存

- 依赖: `DatabaseModule`
- 被依赖: 无

---

## B8. CarriersModule

> 配送商管理: 配送商、自动化设置、B2 Cloud wrapper (变更禁止)、佐川、运费计算
> 配送業者管理: 配送業者・自動化設定・B2 Cloud ラッパー（変更禁止）・佐川・運賃計算

### 目录结构 / ディレクトリ構成

```
src/modules/carriers/
├── carriers.module.ts
├── carriers.controller.ts           # 5 endpoints
├── carriers.service.ts
├── carrier-automation.controller.ts # 3 endpoints
├── carrier-automation.service.ts
├── b2-cloud.service.ts              # ★ 内部変更禁止 / 禁止修改内部 ★
├── yamato-b2.controller.ts          # 4 endpoints
├── yamato-calc.controller.ts        # 3 endpoints
├── yamato-calc.service.ts
├── sagawa.controller.ts             # 3 endpoints
├── sagawa.service.ts
└── dto/
    ├── create-carrier.dto.ts
    ├── automation-rule.dto.ts
    └── b2-cloud-shipment.dto.ts
```

### Service 方法签名 / Service メソッドシグネチャ

```typescript
@Injectable()
export class CarriersService {
  async findAll(tenantId: string, query: PaginationDto): Promise<PaginatedResult<Carrier>>;
  async findById(id: string, tenantId: string): Promise<Carrier>;
  async create(tenantId: string, dto: CreateCarrierDto): Promise<Carrier>;
  async update(id: string, tenantId: string, dto: UpdateCarrierDto): Promise<Carrier>;
  async remove(id: string, tenantId: string): Promise<void>;
}

// ★ yamatoB2Service.ts をラップ。内部ロジック変更禁止 ★
// ★ 包装 yamatoB2Service.ts。禁止修改内部逻辑 ★
@Injectable()
export class B2CloudService {
  async login(): Promise<B2CloudSession>;
  async validateShipments(shipments: B2CloudShipmentDto[]): Promise<ValidationResult>;
  async exportShipments(shipments: B2CloudShipmentDto[]): Promise<ExportResult>;
  async printLabels(shipmentIds: string[]): Promise<Buffer>;
}
```

### 模块依赖 / モジュール依存

- 依赖: `DatabaseModule`
- 被依赖: `ShipmentModule`

> **重要 / 重要**: B2CloudService 只是对现有 `yamatoB2Service.ts` 的 wrapper。绝对禁止修改内部逻辑。
> B2CloudService は既存 `yamatoB2Service.ts` のラッパーに過ぎない。内部ロジックの変更は絶対禁止。

---

## B9. ClientsModule

> 客户管理: 货主、子货主、店铺、终端客户、供应商、订单来源、货主门户
> 顧客管理: 荷主・サブ荷主・店舗・エンドカスタマー・仕入先・注文元・荷主ポータル

### 目录结构 / ディレクトリ構成

```
src/modules/clients/
├── clients.module.ts
├── clients.controller.ts            # 5 endpoints
├── clients.service.ts
├── sub-client.controller.ts         # 5 endpoints
├── sub-client.service.ts
├── shop.controller.ts               # 5 endpoints
├── shop.service.ts
├── customer.controller.ts           # 5 endpoints
├── customer.service.ts
├── supplier.controller.ts           # 5 endpoints
├── supplier.service.ts
├── order-source-company.controller.ts # 5 endpoints
├── order-source-company.service.ts
├── client-portal.controller.ts      # 5 endpoints
├── client-portal.service.ts
└── dto/
    ├── create-client.dto.ts
    ├── create-sub-client.dto.ts
    ├── create-shop.dto.ts
    ├── create-customer.dto.ts
    ├── create-supplier.dto.ts
    └── create-order-source.dto.ts
```

### Service 方法签名（代表例）/ Service メソッドシグネチャ（代表例）

```typescript
@Injectable()
export class ClientsService {
  async findAll(tenantId: string, query: PaginationDto): Promise<PaginatedResult<Client>>;
  async findById(id: string, tenantId: string): Promise<Client>;
  async create(tenantId: string, dto: CreateClientDto): Promise<Client>;
  async update(id: string, tenantId: string, dto: UpdateClientDto): Promise<Client>;
  async remove(id: string, tenantId: string): Promise<void>;
}

@Injectable()
export class ClientPortalService {
  async getDashboard(clientId: string, tenantId: string): Promise<PortalDashboard>;
  async getShipments(clientId: string, tenantId: string, query: PaginationDto): Promise<PaginatedResult<ShipmentOrder>>;
  async getInbound(clientId: string, tenantId: string, query: PaginationDto): Promise<PaginatedResult<InboundOrder>>;
  async getInventory(clientId: string, tenantId: string, query: PaginationDto): Promise<PaginatedResult<StockListItem>>;
  async getBilling(clientId: string, tenantId: string, query: PaginationDto): Promise<PaginatedResult<BillingRecord>>;
}
```

### DTO 完整定义 / DTO 完全定義

```typescript
export const CreateClientSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  name2: z.string().max(200).optional(),
  contactName: z.string().max(100).optional(),
  contactEmail: z.string().email().max(200).optional(),
  contactPhone: z.string().max(50).optional(),
  postalCode: z.string().max(20).optional(),
  prefecture: z.string().max(50).optional(),
  city: z.string().max(100).optional(),
  address: z.string().max(500).optional(),
  billingCycle: z.enum(['monthly', 'biweekly', 'weekly']).optional().default('monthly'),
  isActive: z.boolean().optional().default(true),
  memo: z.string().max(2000).optional(),
});
```

### 模块依赖 / モジュール依存

- 依赖: `DatabaseModule`, `AuthModule`
- 被依赖: `ShipmentModule`, `InboundModule`, `BillingModule`

---

## B10. ExtensionsModule

> 扩展系统: 插件、Webhook、脚本、Hook 管理、自定义字段、功能标志、规则引擎、工作流引擎、自动处理
> 拡張システム: プラグイン・Webhook・スクリプト・Hook管理・カスタムフィールド・機能フラグ・ルールエンジン・ワークフローエンジン・自動処理

### 目录结构 / ディレクトリ構成

```
src/modules/extensions/
├── extensions.module.ts
├── plugin.controller.ts             # 7 endpoints
├── plugin.service.ts
├── webhook.controller.ts            # 7 endpoints
├── webhook.service.ts
├── script.controller.ts             # 7 endpoints
├── script-runner.service.ts
├── custom-field.controller.ts       # 5 endpoints
├── custom-field.service.ts
├── feature-flag.controller.ts       # 5 endpoints
├── feature-flag.service.ts
├── auto-processing-rule.controller.ts # 6 endpoints
├── auto-processing.service.ts
├── rule.controller.ts               # 5 endpoints
├── rule-engine.service.ts
├── packing-rule.controller.ts       # 5 endpoints
├── workflow.controller.ts           # 7 endpoints
├── workflow-engine.service.ts
├── hook-manager.service.ts
└── dto/
    ├── create-plugin.dto.ts
    ├── webhook-config.dto.ts
    ├── script.dto.ts
    ├── custom-field.dto.ts
    ├── feature-flag.dto.ts
    ├── rule.dto.ts
    ├── packing-rule.dto.ts
    └── workflow.dto.ts
```

### Service 方法签名（抜粋）/ Service メソッドシグネチャ（抜粋）

```typescript
@Injectable()
export class WebhookService {
  async findAll(tenantId: string): Promise<WebhookConfig[]>;
  async findById(id: string, tenantId: string): Promise<WebhookConfig>;
  async create(tenantId: string, dto: WebhookConfigDto): Promise<WebhookConfig>;
  async update(id: string, tenantId: string, dto: WebhookConfigDto): Promise<WebhookConfig>;
  async remove(id: string, tenantId: string): Promise<void>;
  async testWebhook(id: string, tenantId: string): Promise<WebhookTestResult>;
  async getLogs(id: string, tenantId: string): Promise<WebhookLog[]>;
  async dispatch(event: string, payload: unknown, tenantId: string): Promise<void>;
}

@Injectable()
export class HookManagerService {
  async executeHooks(event: string, context: HookContext, tenantId: string): Promise<HookResult>;
  async registerHook(event: string, handler: HookHandler): void;
}

@Injectable()
export class AutoProcessingService {
  async findAllRules(tenantId: string): Promise<AutoProcessingRule[]>;
  async createRule(tenantId: string, dto: AutoProcessingRuleDto): Promise<AutoProcessingRule>;
  async processEvent(event: string, entityId: string, tenantId: string): Promise<ProcessingResult>;
}

@Injectable()
export class WorkflowEngineService {
  async findAll(tenantId: string): Promise<Workflow[]>;
  async create(tenantId: string, dto: WorkflowDto): Promise<Workflow>;
  async trigger(tenantId: string, workflowId: string, context: Record<string, unknown>): Promise<WorkflowExecution>;
}
```

### 领域事件 / ドメインイベント

| 发布 / パブリッシュ | 消费 / コンシューム |
|---|---|
| `extension.triggered` | WebhookListener, ScriptListener |
| — | `order.created` → 自动处理 / 自動処理 |
| — | `order.confirmed` → 自动处理 / 自動処理 |
| — | `inbound.completed` → Webhook |

### 模块依赖 / モジュール依存

- 依赖: `DatabaseModule`, `QueueModule`
- 被依赖: `ShipmentModule`

---

## B11. IntegrationsModule

> 外部集成: FBA、RSL、OMS、电商平台、ERP、B2 Cloud 代理
> 外部連携: FBA・RSL・OMS・マーケットプレイス・ERP・B2 Cloud プロキシ

### 目录结构 / ディレクトリ構成

```
src/modules/integrations/
├── integrations.module.ts
├── fba/
│   ├── fba.controller.ts            # 7 endpoints
│   ├── fba.service.ts
│   ├── fba-box.controller.ts        # 5 endpoints
│   └── fba-box.service.ts
├── rsl/
│   ├── rsl.controller.ts            # 5 endpoints
│   └── rsl.service.ts
├── oms/
│   ├── oms.controller.ts            # 3 endpoints
│   └── oms.service.ts
├── marketplace/
│   ├── marketplace.controller.ts    # 3 endpoints
│   └── marketplace.service.ts
├── erp/
│   ├── erp.controller.ts            # 3 endpoints
│   └── erp.service.ts
├── passthrough-proxy.controller.ts  # 1 endpoint (B2 Cloud proxy)
└── dto/
    ├── fba-plan.dto.ts
    ├── fba-box.dto.ts
    ├── rsl-plan.dto.ts
    ├── oms-order.dto.ts
    └── marketplace-config.dto.ts
```

### Service 方法签名（代表例）/ Service メソッドシグネチャ（代表例）

```typescript
@Injectable()
export class FbaService {
  async findAllPlans(tenantId: string, query: PaginationDto): Promise<PaginatedResult<FbaShipmentPlan>>;
  async findPlanById(id: string, tenantId: string): Promise<FbaShipmentPlan>;
  async createPlan(tenantId: string, dto: FbaPlanDto): Promise<FbaShipmentPlan>;
  async updatePlan(id: string, tenantId: string, dto: FbaPlanDto): Promise<FbaShipmentPlan>;
  async removePlan(id: string, tenantId: string): Promise<void>;
  async submitPlan(id: string, tenantId: string): Promise<FbaShipmentPlan>;
  async getLabels(id: string, tenantId: string): Promise<Buffer>;
}

@Injectable()
export class OmsService {
  async sync(tenantId: string): Promise<SyncResult>;
  async getStatus(tenantId: string): Promise<SyncStatus>;
  async updateConfig(tenantId: string, config: OmsConfigDto): Promise<void>;
}
```

### 模块依赖 / モジュール依存

- 依赖: `DatabaseModule`, `ShipmentModule`

---

## B12. ReportingModule

> 报表/KPI: 仪表盘、管理员仪表盘、日报、KPI、高峰模式、异常报表、订单分组
> レポート/KPI: ダッシュボード・管理者ダッシュボード・日報・KPI・ピークモード・異常レポート・注文グループ

### 目录结构 / ディレクトリ構成

```
src/modules/reporting/
├── reporting.module.ts
├── dashboard.controller.ts          # 3 endpoints
├── dashboard.service.ts
├── admin-dashboard.controller.ts    # 2 endpoints
├── kpi.controller.ts                # 4 endpoints
├── kpi.service.ts
├── daily-report.controller.ts       # 4 endpoints
├── daily-report.service.ts
├── peak-mode.controller.ts          # 3 endpoints
├── peak-mode.service.ts
├── exception.controller.ts          # 3 endpoints
├── order-group.controller.ts        # 5 endpoints
├── order-group.service.ts
└── dto/
    ├── dashboard-query.dto.ts
    ├── date-range.dto.ts
    ├── kpi-query.dto.ts
    └── peak-mode-toggle.dto.ts
```

### Service 方法签名 / Service メソッドシグネチャ

```typescript
@Injectable()
export class DashboardService {
  async getStats(tenantId: string): Promise<DashboardStats>;
  async getOrdersSummary(tenantId: string): Promise<OrdersSummary>;
  async getInventorySummary(tenantId: string): Promise<InventoryDashboardSummary>;
}

@Injectable()
export class KpiService {
  async getDashboard(tenantId: string, query: KpiQueryDto): Promise<KpiDashboard>;
  async getFulfillmentRate(tenantId: string, range: DateRangeDto): Promise<number>;
  async getAccuracyRate(tenantId: string, range: DateRangeDto): Promise<number>;
  async getThroughput(tenantId: string, range: DateRangeDto): Promise<ThroughputData>;
}

@Injectable()
export class DailyReportService {
  async findAll(tenantId: string, query: PaginationDto): Promise<PaginatedResult<DailyReport>>;
  async findById(id: string, tenantId: string): Promise<DailyReport>;
  async generate(tenantId: string, date?: Date): Promise<DailyReport>;
  async exportReport(tenantId: string, query: DateRangeDto): Promise<StreamableFile>;
}

@Injectable()
export class PeakModeService {
  async activate(tenantId: string): Promise<void>;
  async deactivate(tenantId: string): Promise<void>;
  async getStatus(tenantId: string): Promise<PeakModeStatus>;
}
```

### 模块依赖 / モジュール依存

- 依赖: `DatabaseModule`

---

## B13. NotificationsModule

> 通知: 应用内通知、邮件模板、通知设置
> 通知: アプリ内通知・メールテンプレート・通知設定

### 目录结构 / ディレクトリ構成

```
src/modules/notifications/
├── notifications.module.ts
├── notifications.controller.ts       # 6 endpoints
├── notifications.service.ts
├── notification-preference.controller.ts # 2 endpoints
├── email-template.controller.ts      # 7 endpoints
├── email-template.service.ts
└── dto/
    ├── send-notification.dto.ts
    ├── notification-query.dto.ts
    ├── notification-preference.dto.ts
    └── create-email-template.dto.ts
```

### Service 方法签名 / Service メソッドシグネチャ

```typescript
@Injectable()
export class NotificationsService {
  async findAll(tenantId: string, userId: string, query: PaginationDto): Promise<PaginatedResult<Notification>>;
  async findById(id: string, tenantId: string): Promise<Notification>;
  async getUnreadCount(tenantId: string, userId: string): Promise<number>;
  async markAsRead(id: string, tenantId: string): Promise<void>;
  async markAllAsRead(tenantId: string, userId: string): Promise<void>;
  async remove(id: string, tenantId: string): Promise<void>;
  async send(tenantId: string, dto: SendNotificationDto): Promise<Notification>;
}

@Injectable()
export class EmailTemplateService {
  async findAll(tenantId: string): Promise<EmailTemplate[]>;
  async findById(id: string, tenantId: string): Promise<EmailTemplate>;
  async create(tenantId: string, dto: CreateEmailTemplateDto): Promise<EmailTemplate>;
  async update(id: string, tenantId: string, dto: UpdateEmailTemplateDto): Promise<EmailTemplate>;
  async remove(id: string, tenantId: string): Promise<void>;
  async preview(id: string, tenantId: string, context: Record<string, unknown>): Promise<string>;
  async sendTest(id: string, tenantId: string, recipientEmail: string): Promise<void>;
}
```

### 领域事件 / ドメインイベント

| 发布 / パブリッシュ | 消费 / コンシューム |
|---|---|
| — | `order.shipped` → 通知 / 通知 |
| — | `inbound.received` → 通知 / 通知 |
| — | `billing.generated` → 通知 / 通知 |
| — | `stock.adjusted` (低库存时) → 警报 / アラート |

### 模块依赖 / モジュール依存

- 依赖: `DatabaseModule`, `QueueModule`

---

## B14. AdminModule

> 管理: 租户、用户、系统设置、操作日志、API 日志
> 管理: テナント・ユーザー・システム設定・操作ログ・API ログ

### 目录结构 / ディレクトリ構成

```
src/modules/admin/
├── admin.module.ts
├── tenant.controller.ts             # 6 endpoints
├── tenant.service.ts
├── user.controller.ts               # 8 endpoints
├── user.service.ts
├── system-settings.controller.ts    # 2 endpoints
├── system-settings.service.ts
├── operation-log.controller.ts      # 3 endpoints
├── api-log.controller.ts            # 2 endpoints
└── dto/
    ├── create-tenant.dto.ts
    ├── update-tenant.dto.ts
    ├── create-user.dto.ts
    ├── update-user.dto.ts
    └── update-settings.dto.ts
```

### Service 方法签名 / Service メソッドシグネチャ

```typescript
@Injectable()
export class TenantService {
  async findAll(query: PaginationDto): Promise<PaginatedResult<Tenant>>;
  async findById(id: string): Promise<Tenant>;
  async create(dto: CreateTenantDto): Promise<Tenant>;
  async update(id: string, dto: UpdateTenantDto): Promise<Tenant>;
  async remove(id: string): Promise<void>;
  async getStats(id: string): Promise<TenantStats>;
}

@Injectable()
export class UserService {
  async findAll(tenantId: string, query: PaginationDto): Promise<PaginatedResult<User>>;
  async findById(id: string, tenantId: string): Promise<User>;
  async create(tenantId: string, dto: CreateUserDto): Promise<User>;
  async update(id: string, tenantId: string, dto: UpdateUserDto): Promise<User>;
  async remove(id: string, tenantId: string): Promise<void>;
  async changeRole(id: string, tenantId: string, role: UserRole): Promise<User>;
  async activate(id: string, tenantId: string): Promise<User>;
  async deactivate(id: string, tenantId: string): Promise<User>;
}

@Injectable()
export class SystemSettingsService {
  async getSettings(tenantId: string): Promise<SystemSettings>;
  async updateSettings(tenantId: string, dto: UpdateSettingsDto): Promise<SystemSettings>;
}
```

### DTO 完整定义 / DTO 完全定義

```typescript
export const CreateTenantSchema = z.object({
  tenantCode: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  name2: z.string().max(200).optional(),
  plan: z.enum(['free', 'starter', 'standard', 'pro', 'enterprise']).optional().default('free'),
  contactName: z.string().max(100).optional(),
  contactEmail: z.string().email().max(200).optional(),
  contactPhone: z.string().max(50).optional(),
  maxUsers: z.number().int().positive().optional().default(5),
  maxWarehouses: z.number().int().positive().optional().default(1),
  maxClients: z.number().int().positive().optional().default(10),
  features: z.array(z.string()).optional().default([]),
  memo: z.string().max(2000).optional(),
});

export const CreateUserSchema = z.object({
  email: z.string().email().max(200),
  name: z.string().min(1).max(100),
  password: z.string().min(8).max(100),
  role: z.enum(['admin', 'manager', 'operator', 'viewer', 'client']),
  isActive: z.boolean().optional().default(true),
});
```

### 领域事件 / ドメインイベント

| 发布 / パブリッシュ | 消费 / コンシューム |
|---|---|
| `user.created` | AuditListener |
| `user.updated` | AuditListener |
| `tenant.created` | AuditListener |

### 模块依赖 / モジュール依存

- 依赖: `DatabaseModule`, `AuthModule`

---

## B15. ImportModule

> 数据导入: CSV 通用导入、映射配置、WMS 计划
> データインポート: CSV 汎用インポート・マッピング設定・WMS スケジュール

### 目录结构 / ディレクトリ構成

```
src/modules/import/
├── import.module.ts
├── import.controller.ts             # 6 endpoints
├── csv-import.service.ts
├── mapping-config.controller.ts     # 5 endpoints
├── mapping-config.service.ts
├── wms-schedule.controller.ts       # 5 endpoints
├── wms-schedule.service.ts
└── dto/
    ├── import-file.dto.ts
    ├── mapping-config.dto.ts
    └── import-progress.dto.ts
```

### Service 方法签名 / Service メソッドシグネチャ

```typescript
@Injectable()
export class CsvImportService {
  async importGenericCsv(tenantId: string, file: MultipartFile, entityType: string): Promise<ImportResult>;
  async importShipmentOrders(tenantId: string, csvContent: string, options?: { dryRun?: boolean; carrierId?: string }): Promise<ImportResult>;
  async importProducts(tenantId: string, csvContent: string, options?: { dryRun?: boolean }): Promise<ImportResult>;
  async importInboundOrders(tenantId: string, csvContent: string, options?: { dryRun?: boolean }): Promise<ImportResult>;
  async importInventory(tenantId: string, csvContent: string): Promise<ImportResult>;
  async getImportHistory(tenantId: string, query: PaginationDto): Promise<PaginatedResult<ImportHistory>>;
  async getTemplates(tenantId: string): Promise<ImportTemplate[]>;
}

@Injectable()
export class MappingConfigService {
  async findAll(tenantId: string): Promise<MappingConfig[]>;
  async findById(id: string, tenantId: string): Promise<MappingConfig>;
  async create(tenantId: string, dto: MappingConfigDto): Promise<MappingConfig>;
  async update(id: string, tenantId: string, dto: MappingConfigDto): Promise<MappingConfig>;
  async remove(id: string, tenantId: string): Promise<void>;
}
```

### DTO 完整定义 / DTO 完全定義

```typescript
export const ImportFileSchema = z.object({
  entityType: z.enum(['shipment-orders', 'products', 'inbound-orders', 'inventory', 'return-orders']),
  dryRun: z.boolean().optional().default(false),
  mappingConfigId: z.string().uuid().optional(),
  carrierId: z.string().uuid().optional(),
});

export const MappingConfigSchema = z.object({
  name: z.string().min(1).max(200),
  entityType: z.enum(['shipment-orders', 'products', 'inbound-orders', 'inventory', 'return-orders']),
  mappings: z.record(z.string()),  // { csvHeader: internalField }
  defaultValues: z.record(z.unknown()).optional(),
  isDefault: z.boolean().optional().default(false),
});
```

### 模块依赖 / モジュール依存

- 依赖: `DatabaseModule`, `QueueModule`

---

## B16. RenderModule

> PDF/标签生成: 打印模板、表单模板、标签/条码/送货单/装箱单生成
> PDF/ラベル生成: 印刷テンプレート・フォームテンプレート・ラベル/バーコード/納品書/パッキングリスト生成

### 目录结构 / ディレクトリ構成

```
src/modules/render/
├── render.module.ts
├── render.controller.ts             # 5 endpoints
├── render.service.ts
├── print-template.controller.ts     # 7 endpoints
├── print-template.service.ts
├── form-template.controller.ts      # 5 endpoints
├── form-template.service.ts
└── dto/
    ├── render-request.dto.ts
    ├── print-template.dto.ts
    └── form-template.dto.ts
```

### Service 方法签名 / Service メソッドシグネチャ

```typescript
@Injectable()
export class RenderService {
  async renderLabel(tenantId: string, dto: RenderLabelDto): Promise<Buffer>;
  async renderPdf(tenantId: string, dto: RenderPdfDto): Promise<Buffer>;
  async renderBarcode(tenantId: string, dto: RenderBarcodeDto): Promise<Buffer>;
  async renderDeliverySlip(tenantId: string, orderId: string): Promise<Buffer>;
  async renderPackingList(tenantId: string, orderId: string): Promise<Buffer>;
}

@Injectable()
export class PrintTemplateService {
  async findAll(tenantId: string): Promise<PrintTemplate[]>;
  async findById(id: string, tenantId: string): Promise<PrintTemplate>;
  async create(tenantId: string, dto: PrintTemplateDto): Promise<PrintTemplate>;
  async update(id: string, tenantId: string, dto: PrintTemplateDto): Promise<PrintTemplate>;
  async remove(id: string, tenantId: string): Promise<void>;
  async render(id: string, tenantId: string, data: Record<string, unknown>): Promise<Buffer>;
  async preview(id: string, tenantId: string): Promise<Buffer>;
}
```

### DTO 完整定义 / DTO 完全定義

```typescript
export const RenderLabelDto = z.object({
  templateId: z.string().uuid().optional(),
  orderIds: z.array(z.string().uuid()).min(1),
  format: z.enum(['pdf', 'zpl', 'png']).optional().default('pdf'),
  labelSize: z.enum(['A4', 'A5', '4x6', 'custom']).optional().default('A4'),
});

export const PrintTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['label', 'delivery_slip', 'packing_list', 'invoice', 'barcode', 'custom']),
  format: z.enum(['html', 'zpl', 'ejs']),
  content: z.string().min(1),
  paperSize: z.enum(['A4', 'A5', 'B5', '4x6', 'custom']).optional().default('A4'),
  orientation: z.enum(['portrait', 'landscape']).optional().default('portrait'),
  isDefault: z.boolean().optional().default(false),
});
```

### 模块依赖 / モジュール依存

- 依赖: `DatabaseModule`

---

# Part C: 模块依赖关系总览 / モジュール依存関係一覧

```
AppModule
├── CommonModule          (global)  ← 无依赖 / 依存なし
├── DatabaseModule        (global)  ← ConfigModule
├── ConfigModule          (global)  ← 无依赖 / 依存なし
├── QueueModule           (global)  ← ConfigModule
├── EventEmitterModule    (global)  ← 无依赖 / 依存なし
├── AuthModule                      ← DatabaseModule, ConfigModule
│
├── ProductsModule                  ← DatabaseModule
├── InventoryModule                 ← DatabaseModule
├── InboundModule                   ← DatabaseModule, InventoryModule
├── ShipmentModule                  ← DatabaseModule, InventoryModule, CarriersModule
├── WarehouseModule                 ← DatabaseModule, InventoryModule
├── ReturnsModule                   ← DatabaseModule, InventoryModule, ShipmentModule
├── BillingModule                   ← DatabaseModule
├── CarriersModule                  ← DatabaseModule
├── ClientsModule                   ← DatabaseModule, AuthModule
├── ExtensionsModule                ← DatabaseModule, QueueModule
├── IntegrationsModule              ← DatabaseModule, ShipmentModule
├── ReportingModule                 ← DatabaseModule
├── NotificationsModule             ← DatabaseModule, QueueModule
├── AdminModule                     ← DatabaseModule, AuthModule
├── ImportModule                    ← DatabaseModule, QueueModule
└── RenderModule                    ← DatabaseModule
```

### 循环依赖回避 / 循環依存回避

- `ShipmentModule` → `CarriersModule` は一方向のみ / 一方向のみ
- `ReturnsModule` → `ShipmentModule` は一方向のみ（逆参照は EventEmitter 経由）
- `InboundModule` ↔ `InventoryModule`: InboundModule が InventoryModule に依存（逆はイベント経由）
- 模块间通信优先使用 EventEmitter2 解耦 / モジュール間通信は EventEmitter2 で疎結合化を優先

---

# Part D: 领域事件总览 / ドメインイベント一覧

| 事件名 / イベント名 | 发布模块 / パブリッシャー | 监听模块 / リスナー | 触发时机 / トリガー |
|---|---|---|---|
| `product.created` | ProductsModule | AuditListener | 商品作成時 |
| `product.updated` | ProductsModule | AuditListener | 商品更新時 |
| `product.deleted` | ProductsModule | AuditListener | 商品削除時 |
| `stock.adjusted` | InventoryModule | AuditListener, NotificationListener | 在庫調整時 |
| `stock.reserved` | InventoryModule | AuditListener | 在庫引当時 |
| `stock.moved` | InventoryModule | AuditListener, LedgerListener | 在庫移動時 |
| `stock.released` | InventoryModule | AuditListener | 引当解放時 |
| `inbound.confirmed` | InboundModule | AuditListener | 入庫確定時 |
| `inbound.received` | InboundModule | AuditListener, NotificationListener | 入庫検品時 |
| `inbound.completed` | InboundModule | AuditListener, WebhookListener, InventoryListener, BillingListener | 入庫完了時 |
| `inbound.cancelled` | InboundModule | AuditListener | 入庫キャンセル時 |
| `order.created` | ShipmentModule | WebhookListener, AutoProcessingListener | 出庫伝票作成時 |
| `order.confirmed` | ShipmentModule | StockService, BillingListener | 出庫確定時 |
| `order.shipped` | ShipmentModule | AuditListener, NotificationListener, BillingListener, WebhookListener | 出庫完了時 |
| `order.cancelled` | ShipmentModule | StockService | 出庫キャンセル時 |
| `return.received` | ReturnsModule | AuditListener | 返品受入時 |
| `return.processed` | ReturnsModule | AuditListener, InventoryListener | 返品処理時 |
| `return.completed` | ReturnsModule | NotificationListener, WebhookListener | 返品完了時 |
| `stocktaking.finalized` | WarehouseModule | AuditListener, LedgerListener, StockService | 棚卸確定時 |
| `task.completed` | WarehouseModule | AuditListener | タスク完了時 |
| `wave.released` | WarehouseModule | TaskService | ウェーブリリース時 |
| `billing.generated` | BillingModule | NotificationListener | 請求書生成時 |
| `invoice.sent` | BillingModule | AuditListener | 請求書送信時 |
| `user.created` | AdminModule | AuditListener | ユーザー作成時 |
| `user.updated` | AdminModule | AuditListener | ユーザー更新時 |
| `tenant.created` | AdminModule | AuditListener | テナント作成時 |
| `extension.triggered` | ExtensionsModule | WebhookListener, ScriptListener | 拡張トリガー時 |

### 事件处理模式 / イベント処理パターン

```typescript
// 标准模式: 事件监听器 → BullMQ 队列 → Worker 异步处理
// 標準パターン: イベントリスナー → BullMQ キュー → Worker 非同期処理
@OnEvent('order.shipped')
async handleOrderShipped(event: OrderShippedEvent) {
  // 入队操作是同步的（<1ms）/ キュー追加は同期的（<1ms）
  await Promise.all([
    this.auditQueue.add('log', { action: 'order.shipped', ...event }),
    this.notificationQueue.add('send', { type: 'order_shipped', ...event }),
    this.webhookQueue.add('dispatch', { event: 'order.shipped', payload: event }),
    this.billingQueue.add('charge', { event: 'order.shipped', ...event }),
  ]);
}
```

---

## 附录: 端点总数 / エンドポイント合計

| Module | Controllers | Services | Repositories | Endpoints |
|--------|:-----------:|:--------:|:------------:|:---------:|
| CommonModule | 0 | 0 | 0 | 0 |
| DatabaseModule | 0 | 0 | 26+ | 0 |
| AuthModule | 2 | 2 | 0 | 7 |
| QueueModule | 0 | 1 | 0 | 5 |
| ConfigModule | 0 | 0 | 0 | 0 |
| ProductsModule | 3 | 3 | 3 | 24 |
| InventoryModule | 5 | 7 | 6 | 42 |
| InboundModule | 2 | 3 | 2 | 25 |
| ShipmentModule | 3 | 3 | 3 | 30 |
| WarehouseModule | 7 | 7 | 5 | 44 |
| ReturnsModule | 1 | 1 | 1 | 11 |
| BillingModule | 5 | 5 | 5 | 32 |
| CarriersModule | 4 | 4 | 2 | 18 |
| ClientsModule | 7 | 7 | 6 | 40 |
| ExtensionsModule | 8 | 9 | 4 | 54 |
| IntegrationsModule | 6 | 6 | 2 | 27 |
| ReportingModule | 6 | 5 | 1 | 24 |
| NotificationsModule | 3 | 3 | 3 | 15 |
| AdminModule | 5 | 3 | 5 | 21 |
| ImportModule | 3 | 3 | 1 | 16 |
| RenderModule | 3 | 3 | 2 | 17 |
| **合计 / 合計** | **73** | **75** | **77** | **~452** |

> 注: 含 Health (3), Queue (5), Workflow (10), Photos (5) 等辅助端点后约 ~492
> 注: Health (3), Queue (5), Workflow (10), Photos (5) 等補助エンドポイント含めて約 ~492

---

> 本文档是 ZELIXWMS 后端最详细的模块级设计参考。实际开发时以此为蓝图实施。
> 本ドキュメントは ZELIXWMS バックエンドの最も詳細なモジュールレベル設計リファレンスである。実装はこれを設計図として進める。
```
