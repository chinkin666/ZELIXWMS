# テスト戦略 完全版 / 测试策略 完整版

> ZELIXWMS のテストピラミッド、各テストレベルの規約、カバレッジ目標、負荷テスト、セキュリティテスト、テストデータ管理、CI/CD 統合を網羅する包括的テスト戦略ドキュメント。
> ZELIXWMS 的测试金字塔、各测试层级规范、覆盖率目标、负载测试、安全测试、测试数据管理、CI/CD 集成的综合测试策略文档。

**最終更新 / 最后更新**: 2026-03-21
**対象 / 适用范围**: Backend (NestJS + PostgreSQL), Frontend (Vue 3), API E2E, Browser E2E

---

## 目次 / 目录

1. [テストピラミッド / 测试金字塔](#1-テストピラミッド--测试金字塔)
2. [ユニットテスト規約 / 单元测试规范](#2-ユニットテスト規約--单元测试规范)
3. [インテグレーションテスト規約 / 集成测试规范](#3-インテグレーションテスト規約--集成测试规范)
4. [E2E テスト規約 / 端到端测试规范](#4-e2e-テスト規約--端到端测试规范)
5. [負荷テスト / 负载测试](#5-負荷テスト--负载测试)
6. [セキュリティテスト / 安全测试](#6-セキュリティテスト--安全测试)
7. [テストデータ管理 / 测试数据管理](#7-テストデータ管理--测试数据管理)
8. [CI/CD 統合 / CI/CD 集成](#8-cicd-統合--cicd-集成)
9. [テストカバレッジレポート / 测试覆盖率报告](#9-テストカバレッジレポート--测试覆盖率报告)

---

## 1. テストピラミッド / 测试金字塔

### 構造図 / 结构图

```
              ┌───────────────┐
              │     E2E       │  10% — Playwright + Supertest
              │   (少数/少量)   │  クリティカルフロー / 关键流程
             ┌┴───────────────┴┐
             │  Integration     │  20% — Testcontainers + PostgreSQL
             │  (中程度/中等)    │  実 DB + API テスト / 真实 DB + API 测试
            ┌┴─────────────────┴┐
            │      Unit          │  70% — Vitest + vi.mock
            │    (大量/大量)      │  ビジネスロジック / 业务逻辑
            └────────────────────┘
```

### レベル別概要 / 各层级概览

| レベル / 层级 | 割合 / 比例 | フレームワーク / 框架 | 速度 / 速度 | 信頼性 / 可靠性 | コスト / 成本 |
|---|---|---|---|---|---|
| Unit | 70% | Vitest + vi.mock | < 1s/テスト | Mock 依存 / 依赖 Mock | 最低 / 最低 |
| Integration | 20% | Testcontainers + Supertest | 2-10s/テスト | 実環境に近い / 接近真实环境 | 中 / 中 |
| E2E | 10% | Playwright + Supertest | 10-60s/テスト | 最高 / 最高 | 最高 / 最高 |

### 原則 / 原则

1. **下層を厚く / 底层要厚实** -- ユニットテストが最も多く、最も速い。単一関数・単一メソッドの正確性を保証する。
   底层单元测试数量最多、速度最快。保证单个函数和方法的正确性。

2. **上層は薄く / 上层要精简** -- E2E テストはクリティカルパスのみ。メンテナンスコストが高いため最小限に。
   E2E 测试仅覆盖关键路径。维护成本高，保持最少数量。

3. **各層で独立した価値 / 每层独立提供价值** -- ユニットテストで見つけられるバグを E2E で検出するのは非効率。
   用 E2E 检测单元测试能发现的 bug 是低效的。

---

## 2. ユニットテスト規約 / 单元测试规范

### フレームワーク / 框架

- **テストランナー / 测试运行器**: Vitest
- **カバレッジプロバイダー / 覆盖率提供者**: v8
- **カバレッジ目標 / 覆盖率目标**: 80%+ (statements, branches, functions, lines)
- **モック / Mock**: `vi.mock`, `vi.fn`, `vi.spyOn`
- **設定ファイル / 配置文件**: `backend/vitest.config.ts`

### Vitest 設定 / Vitest 配置

```typescript
// backend/vitest.config.ts
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    pool: 'forks',
    // テストファイル間のモック干渉を防止 / 防止测试文件间 Mock 干扰
    fileParallelism: false,
    include: ['src/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.d.ts'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
```

### 命名規約 / 命名规范

テスト名は **日本語 + 中国語** のバイリンガルで記述する。
测试名称使用 **日语 + 中文** 双语编写。

```
describe('ServiceName') → describe('methodName') → it('期待される動作 / 期望行为')
```

```typescript
describe('InventoryService', () => {
  describe('adjustStock', () => {
    it('正常に在庫を増加する / 应正常增加库存', async () => {
      // ...
    });

    it('存在しないロケーションでエラーを返す / 不存在的仓位应返回错误', async () => {
      // ...
    });

    it('マイナス在庫を許可しない / 不允许负库存', async () => {
      // ...
    });
  });
});
```

### ファイル配置 / 文件位置

テストファイルはソースファイルに隣接する `__tests__/` ディレクトリに配置する。
测试文件放置在源文件相邻的 `__tests__/` 目录中。

```
src/
├── services/
│   ├── inventoryService.ts
│   └── __tests__/
│       └── inventoryService.test.ts
├── api/
│   ├── controllers/
│   │   ├── inventoryController.ts
│   │   └── __tests__/
│   │       └── inventoryController.test.ts
│   └── middleware/
│       ├── auth.ts
│       └── __tests__/
│           └── auth.test.ts
└── utils/
    ├── naturalSort.ts
    └── __tests__/
        └── naturalSort.test.ts
```

### モック戦略 / Mock 策略

#### モック対象の原則 / Mock 原则

| モックする / 需要 Mock | モックしない / 不需要 Mock | 理由 / 理由 |
|---|---|---|
| DB クエリ (Drizzle/Mongoose) | ビジネスロジック / 业务逻辑 | DB 依存を排除 / 排除数据库依赖 |
| 外部 API (B2 Cloud, Sagawa 等) | バリデーション関数 / 验证函数 | 外部依存を排除 / 排除外部依赖 |
| Redis / BullMQ | ユーティリティ関数 / 工具函数 | インフラ依存を排除 / 排除基础设施依赖 |
| nodemailer / 通知サービス | 純粋関数 / 纯函数 | I/O を排除 / 排除 I/O |
| 現在時刻 (Date.now) | 定数 / 常量 | 再現性確保 / 确保可重现 |

#### チェーンモックヘルパー / 链式 Mock 辅助

Mongoose チェーンメソッド用のヘルパーパターン。
Mongoose 链式方法的辅助模式。

```typescript
// test-helpers/chain-mock.ts

/** lean() を返すチェーンヘルパー / 返回 lean() 的链式辅助 */
export const chainLean = (val: any) => ({
  lean: () => Promise.resolve(val),
});

/** sort() → lean() チェーンヘルパー / sort → lean 链式辅助 */
export const chainSortLean = (val: any) => ({
  sort: () => chainLean(val),
});

/** select() → lean() チェーンヘルパー / select → lean 链式辅助 */
export const chainSelectLean = (val: any) => ({
  select: () => chainLean(val),
});

/** skip() → limit() → lean() チェーンヘルパー / skip → limit → lean 链式辅助 */
export const chainPagination = (val: any) => ({
  skip: () => ({ limit: () => chainSortLean(val) }),
});
```

### レイヤー別テスト例 / 各层测试示例

#### Controller テスト / Controller 测试

```typescript
/**
 * inventoryController ユニットテスト / inventoryController 单元测试
 *
 * HTTP リクエストがサービス層へ正しく流れるかを検証。
 * 验证 HTTP 请求是否正确流向服务层。
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/services/inventoryService');

import * as inventoryService from '@/services/inventoryService';
import { adjustStock } from '@/api/controllers/inventoryController';

describe('InventoryController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('adjustStock', () => {
    it('正常な調整リクエストを処理する / 应处理正常的调整请求', async () => {
      const mockResult = { success: true, quantId: 'q-001' };
      vi.mocked(inventoryService.adjustQuantity).mockResolvedValue(mockResult);

      const req = {
        body: { productId: 'p-001', locationId: 'l-001', quantity: 10, reason: 'テスト' },
        user: { tenantId: 't-001', userId: 'u-001' },
      };
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };

      await adjustStock(req as any, res as any);

      expect(inventoryService.adjustQuantity).toHaveBeenCalledWith(
        expect.objectContaining({ productId: 'p-001', quantity: 10 })
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('バリデーションエラーで 400 を返す / 验证错误应返回 400', async () => {
      const req = { body: {}, user: { tenantId: 't-001' } };
      const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };

      await adjustStock(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
```

#### Service テスト / Service 测试

```typescript
/**
 * chargeService ユニットテスト / chargeService 单元测试
 *
 * 作業チャージ自動生成・保管料計算・月次請求書生成のテスト。
 * 作业费用自动生成、仓储费计算、月度账单生成的测试。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/models/serviceRate', () => ({
  ServiceRate: {
    findOne: vi.fn(),
    find: vi.fn(),
  },
}));

vi.mock('@/models/workCharge', () => ({
  WorkCharge: {
    create: vi.fn().mockResolvedValue({}),
    aggregate: vi.fn().mockResolvedValue([]),
  },
}));

import { ServiceRate } from '@/models/serviceRate';
import { WorkCharge } from '@/models/workCharge';
import { calculateStorageFee } from '@/services/chargeService';

describe('ChargeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateStorageFee', () => {
    it('パレット数と単価から保管料を正しく算出する / 应根据托盘数和单价正确计算仓储费', async () => {
      vi.mocked(ServiceRate.findOne).mockReturnValue({
        lean: () => Promise.resolve({ unitPrice: 500, unit: 'pallet' }),
      } as any);

      const result = await calculateStorageFee({
        clientId: 'c-001',
        palletCount: 10,
        month: '2026-03',
      });

      expect(result.amount).toBe(5000);
      expect(result.currency).toBe('JPY');
    });

    it('料金マスタ未設定時にエラーを返す / 费率主数据未设置时应返回错误', async () => {
      vi.mocked(ServiceRate.findOne).mockReturnValue({
        lean: () => Promise.resolve(null),
      } as any);

      await expect(
        calculateStorageFee({ clientId: 'c-001', palletCount: 10, month: '2026-03' })
      ).rejects.toThrow('料金マスタが見つかりません');
    });
  });
});
```

#### Repository / Utility テスト / Repository / 工具函数 测试

```typescript
/**
 * naturalSort ユーティリティテスト / naturalSort 工具函数测试
 *
 * 自然順ソートの正確性を検証。
 * 验证自然顺序排序的准确性。
 */
import { describe, it, expect } from 'vitest';
import { naturalSort } from '@/utils/naturalSort';

describe('naturalSort', () => {
  it('数字を含む文字列を自然順にソートする / 应按自然顺序排列包含数字的字符串', () => {
    const input = ['A-10', 'A-2', 'A-1', 'A-20'];
    const result = naturalSort(input);
    expect(result).toEqual(['A-1', 'A-2', 'A-10', 'A-20']);
  });

  it('日本語文字列を正しく処理する / 应正确处理日语字符串', () => {
    const input = ['棚10', '棚2', '棚1'];
    const result = naturalSort(input);
    expect(result).toEqual(['棚1', '棚2', '棚10']);
  });

  it('空配列を処理できる / 应能处理空数组', () => {
    expect(naturalSort([])).toEqual([]);
  });
});
```

### レイヤー別カバレッジ目標 / 各层覆盖率目标

| レイヤー / 层 | 最低カバレッジ / 最低覆盖率 | 備考 / 备注 |
|---|---|---|
| **Service 層 / Service 层** | **80%+** | ビジネスロジックの核心 / 业务逻辑核心 |
| **Controller 層 / Controller 层** | **60%+** | ルーティング・バリデーション / 路由和验证 |
| **Utility / 工具函数** | **90%+** | 純粋関数、テストしやすい / 纯函数，易于测试 |
| **Guard / Pipe** | **80%+** | セキュリティクリティカル / 安全关键 |
| **全体 / 整体** | **80%+** | CI でブロッキングチェック / CI 中阻断检查 |

### クリティカルパス（100% 目標）/ 关键路径（目标 100%）

| モジュール / 模块 | 理由 / 理由 |
|---|---|
| `inventoryService` | 在庫の正確性が業務の根幹 / 库存准确性是业务根本 |
| `outboundWorkflow` | 出荷ミスは直接的な損害 / 发货错误直接造成损失 |
| `inboundWorkflow` | 入庫ミスは在庫差異に直結 / 入库错误直接导致库存差异 |
| `chargeService` | 課金の正確性 / 计费准确性 |
| `authGuard` / `requirePermission` | 認証・認可の安全性 / 认证授权安全性 |

---

## 3. インテグレーションテスト規約 / 集成测试规范

### フレームワーク / 框架

- **DB コンテナ / DB 容器**: Testcontainers (`@testcontainers/postgresql`)
- **HTTP テスト / HTTP 测试**: Supertest
- **設定ファイル / 配置文件**: `backend/vitest.integration.config.ts`

### 設計方針 / 设计方针

1. **実 DB を使用 / 使用真实数据库** -- Testcontainers で PostgreSQL 15 コンテナを起動。テスト終了後に自動破棄。
   使用 Testcontainers 启动 PostgreSQL 15 容器。测试结束后自动销毁。

2. **トランザクションロールバック / 事务回滚** -- 各テストをトランザクション内で実行し、終了時にロールバック。テスト間の状態汚染を防止。
   每个测试在事务内执行，结束时回滚。防止测试间状态污染。

3. **ファクトリ関数でシードデータ / 使用工厂函数生成种子数据** -- フィクスチャファイルではなくファクトリ関数を使用。テストごとに新鮮なデータを生成。
   使用工厂函数而非 Fixture 文件。每个测试生成新数据。

4. **テスト分離 / 测试隔离** -- 各テストは独立して実行可能。実行順序に依存しない。
   每个测试可独立运行。不依赖执行顺序。

### Testcontainers セットアップ / Testcontainers 设置

```typescript
// test/setup/integration-setup.ts
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

let container: StartedPostgreSqlContainer;
let pool: Pool;
let db: ReturnType<typeof drizzle>;

/**
 * テスト用 PostgreSQL コンテナを起動 / 启动测试用 PostgreSQL 容器
 * タイムアウト 60 秒（初回の Docker イメージプル考慮）
 * 超时 60 秒（考虑首次 Docker 镜像拉取）
 */
beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:15-alpine')
    .withDatabase('zelixwms_test')
    .withUsername('test')
    .withPassword('test')
    .start();

  const connectionUri = container.getConnectionUri();
  pool = new Pool({ connectionString: connectionUri });
  db = drizzle(pool);

  // マイグレーション実行 / 执行迁移
  await migrate(db, { migrationsFolder: './drizzle' });
}, 60_000);

afterAll(async () => {
  await pool.end();
  await container.stop();
});

export { db, pool };
```

### トランザクションロールバックパターン / 事务回滚模式

```typescript
// test/setup/transaction-wrapper.ts
import { db, pool } from './integration-setup';

/**
 * 各テストをトランザクション内で実行し、ロールバックで状態をリセット。
 * 每个测试在事务内执行，通过回滚重置状态。
 */
export function withTransaction(
  testFn: (tx: typeof db) => Promise<void>
): () => Promise<void> {
  return async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // テスト実行 / 执行测试
      await testFn(db);
    } finally {
      // 常にロールバック / 始终回滚
      await client.query('ROLLBACK');
      client.release();
    }
  };
}
```

### 在庫移動インテグレーションテスト例 / 库存转移集成测试示例

```typescript
/**
 * 在庫移動のインテグレーションテスト / 库存转移集成测试
 *
 * 実際の PostgreSQL に対して在庫移動の一連の流れをテスト。
 * 对真实 PostgreSQL 测试库存转移的完整流程。
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { createApp } from '@/app';
import { createTestProduct, createTestLocation, createTestTenant } from '@/test/factories';

describe('在庫移動 Integration / 库存转移集成测试', () => {
  let container: StartedPostgreSqlContainer;
  let app: Express.Application;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:15-alpine')
      .withDatabase('zelixwms_test')
      .start();

    process.env.DATABASE_URL = container.getConnectionUri();
    app = await createApp();
  }, 60_000);

  afterAll(async () => {
    await container.stop();
  });

  it('ロケーション間の在庫移動が正しく反映される / 仓位间库存转移应正确反映', async () => {
    // Arrange: テストデータ作成 / 创建测试数据
    const tenant = await createTestTenant();
    const product = await createTestProduct({ tenantId: tenant.id });
    const fromLocation = await createTestLocation({ tenantId: tenant.id, code: 'A-01-01' });
    const toLocation = await createTestLocation({ tenantId: tenant.id, code: 'B-01-01' });

    // 初期在庫を A-01-01 に投入 / 将初始库存放入 A-01-01
    await request(app)
      .post('/api/inventory/adjust')
      .set('Authorization', `Bearer ${tenant.token}`)
      .send({
        productId: product.id,
        locationId: fromLocation.id,
        quantity: 100,
        reason: 'テスト初期投入 / 测试初始投入',
      })
      .expect(200);

    // Act: A-01-01 → B-01-01 に 30 個移動 / 从 A-01-01 转移 30 个到 B-01-01
    const transferRes = await request(app)
      .post('/api/inventory/transfer')
      .set('Authorization', `Bearer ${tenant.token}`)
      .send({
        productId: product.id,
        fromLocationId: fromLocation.id,
        toLocationId: toLocation.id,
        quantity: 30,
      })
      .expect(200);

    expect(transferRes.body.success).toBe(true);

    // Assert: 移動元は 70、移動先は 30 / 移出方 70，移入方 30
    const stockRes = await request(app)
      .get(`/api/inventory/stock?productId=${product.id}`)
      .set('Authorization', `Bearer ${tenant.token}`)
      .expect(200);

    const fromStock = stockRes.body.data.find(
      (s: any) => s.locationId === fromLocation.id
    );
    const toStock = stockRes.body.data.find(
      (s: any) => s.locationId === toLocation.id
    );

    expect(fromStock.quantity).toBe(70);
    expect(toStock.quantity).toBe(30);
  });

  it('在庫不足の移動はエラーを返す / 库存不足的转移应返回错误', async () => {
    const tenant = await createTestTenant();
    const product = await createTestProduct({ tenantId: tenant.id });
    const fromLocation = await createTestLocation({ tenantId: tenant.id, code: 'C-01-01' });
    const toLocation = await createTestLocation({ tenantId: tenant.id, code: 'D-01-01' });

    // 在庫なしで移動を試みる / 无库存时尝试转移
    const res = await request(app)
      .post('/api/inventory/transfer')
      .set('Authorization', `Bearer ${tenant.token}`)
      .send({
        productId: product.id,
        fromLocationId: fromLocation.id,
        toLocationId: toLocation.id,
        quantity: 10,
      })
      .expect(400);

    expect(res.body.error).toContain('在庫不足');
  });

  it('異なるテナント間の在庫は互いに見えない / 不同租户的库存互不可见', async () => {
    const tenantA = await createTestTenant();
    const tenantB = await createTestTenant();
    const product = await createTestProduct({ tenantId: tenantA.id });
    const location = await createTestLocation({ tenantId: tenantA.id, code: 'E-01-01' });

    await request(app)
      .post('/api/inventory/adjust')
      .set('Authorization', `Bearer ${tenantA.token}`)
      .send({
        productId: product.id,
        locationId: location.id,
        quantity: 50,
      })
      .expect(200);

    // テナント B からは見えない / 从租户 B 不可见
    const res = await request(app)
      .get(`/api/inventory/stock?productId=${product.id}`)
      .set('Authorization', `Bearer ${tenantB.token}`)
      .expect(200);

    expect(res.body.data).toHaveLength(0);
  });
});
```

---

## 4. E2E テスト規約 / 端到端测试规范

### 4.1 API E2E テスト / API 端到端测试

**ツール / 工具**: Supertest (NestJS アプリを直接起動してテスト)

```typescript
// e2e/api/auth-flow.e2e-spec.ts
import request from 'supertest';
import { Test } from '@nestjs/testing';
import { AppModule } from '@/app.module';
import { INestApplication } from '@nestjs/common';

describe('認証フロー API E2E / 认证流程 API 端到端', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('ログイン → トークン取得 → 認証付きリクエスト / 登录 → 获取令牌 → 带认证请求', async () => {
    // Step 1: ログイン / 登录
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'password123' })
      .expect(200);

    const { token } = loginRes.body;
    expect(token).toBeDefined();

    // Step 2: 認証付きリクエスト / 带认证请求
    const productsRes = await request(app.getHttpServer())
      .get('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(productsRes.body.data).toBeDefined();
  });
});
```

### 4.2 ブラウザ E2E テスト / 浏览器端到端测试

**ツール / 工具**: Playwright

#### Playwright 設定 / Playwright 配置

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/browser',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],
  use: {
    baseURL: 'http://localhost:4001',
    trace: 'on-first-retry',
    // 失敗時にスクリーンショット / 失败时截图
    screenshot: 'only-on-failure',
    // 失敗時にビデオ / 失败时录像
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    port: 4001,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

### 4.3 クリティカルユーザージャーニー / 关键用户旅程

以下のフローは最優先で E2E テストを実装する。
以下流程是最优先实施 E2E 测试的。

#### Journey 1: 出荷フロー / 出货流程

```
ログイン → 出荷指示作成 → 配送業者割当 → 出荷実行 → 追跡確認
登录 → 创建出库指示 → 分配承运商 → 执行出货 → 确认追踪
```

```typescript
// e2e/browser/outbound-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('出荷フロー / 出货流程', () => {
  test.beforeEach(async ({ page }) => {
    // ログイン / 登录
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'admin@test.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('出荷指示作成 → 配送業者割当 → 出荷 → 追跡 / 创建出库指示 → 分配承运商 → 出货 → 追踪', async ({ page }) => {
    // Step 1: 出荷指示作成 / 创建出库指示
    await page.goto('/shipments/new');
    await page.fill('[data-testid="customer-search"]', 'テスト顧客');
    await page.click('[data-testid="customer-option-0"]');
    await page.fill('[data-testid="product-search"]', 'TEST-001');
    await page.click('[data-testid="product-option-0"]');
    await page.fill('[data-testid="quantity"]', '5');
    await page.click('[data-testid="create-shipment"]');
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();

    // Step 2: 配送業者割当 / 分配承运商
    await page.click('[data-testid="assign-carrier"]');
    await page.selectOption('[data-testid="carrier-select"]', 'yamato');
    await page.click('[data-testid="confirm-carrier"]');
    await expect(page.locator('[data-testid="carrier-badge"]')).toContainText('ヤマト');

    // Step 3: 出荷実行 / 执行出货
    await page.click('[data-testid="ship-button"]');
    await page.click('[data-testid="confirm-ship"]');
    await expect(page.locator('[data-testid="status-badge"]')).toContainText('出荷済');

    // Step 4: 追跡確認 / 确认追踪
    const trackingNumber = await page.locator('[data-testid="tracking-number"]').textContent();
    expect(trackingNumber).toBeTruthy();
  });
});
```

#### Journey 2: 入庫フロー / 入库流程

```
入庫予定作成 → 受取処理 → 検品 → 棚入れ
创建入库预定 → 接收处理 → 检验 → 上架
```

```typescript
// e2e/browser/inbound-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('入庫フロー / 入库流程', () => {
  test('入庫予定作成 → 受取 → 検品 → 棚入れ / 创建入库预定 → 接收 → 检验 → 上架', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'admin@test.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Step 1: 入庫予定作成 / 创建入库预定
    await page.goto('/inbound/new');
    await page.fill('[data-testid="supplier-search"]', 'テスト仕入先');
    await page.click('[data-testid="supplier-option-0"]');
    await page.fill('[data-testid="product-sku"]', 'TEST-001');
    await page.fill('[data-testid="expected-quantity"]', '100');
    await page.click('[data-testid="create-inbound"]');
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();

    // Step 2: 受取処理 / 接收处理
    await page.click('[data-testid="receive-button"]');
    await page.fill('[data-testid="actual-quantity"]', '98');
    await page.click('[data-testid="confirm-receive"]');
    await expect(page.locator('[data-testid="status-badge"]')).toContainText('受取済');

    // Step 3: 検品 / 检验
    await page.click('[data-testid="inspect-button"]');
    await page.fill('[data-testid="good-quantity"]', '96');
    await page.fill('[data-testid="damaged-quantity"]', '2');
    await page.click('[data-testid="confirm-inspect"]');

    // Step 4: 棚入れ / 上架
    await page.click('[data-testid="putaway-button"]');
    await page.selectOption('[data-testid="location-select"]', 'A-01-01');
    await page.click('[data-testid="confirm-putaway"]');
    await expect(page.locator('[data-testid="status-badge"]')).toContainText('完了');
  });
});
```

#### Journey 3: 在庫検索・移動フロー / 库存查询和转移流程

```
在庫検索 → ロケーション間移動 → 残高確認
库存查询 → 仓位间转移 → 确认余额
```

```typescript
// e2e/browser/inventory-transfer.spec.ts
import { test, expect } from '@playwright/test';

test.describe('在庫移動フロー / 库存转移流程', () => {
  test('検索 → 移動 → 残高確認 / 查询 → 转移 → 确认余额', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'admin@test.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Step 1: 在庫検索 / 库存查询
    await page.goto('/inventory');
    await page.fill('[data-testid="search-sku"]', 'TEST-001');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('[data-testid="stock-row-0"]')).toBeVisible();

    const beforeQty = await page.locator('[data-testid="stock-row-0-quantity"]').textContent();

    // Step 2: 移動実行 / 执行转移
    await page.click('[data-testid="transfer-button-0"]');
    await page.selectOption('[data-testid="to-location"]', 'B-02-01');
    await page.fill('[data-testid="transfer-quantity"]', '10');
    await page.click('[data-testid="confirm-transfer"]');
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();

    // Step 3: 残高確認 / 确认余额
    await page.click('[data-testid="search-button"]');
    const afterQty = await page.locator('[data-testid="stock-row-0-quantity"]').textContent();
    expect(Number(afterQty)).toBe(Number(beforeQty) - 10);
  });
});
```

#### Journey 4: 月次請求計算 / 月度计费计算

```
月次計算実行 → 請求書生成 → 内容確認
执行月度计算 → 生成发票 → 确认内容
```

```typescript
// e2e/browser/billing-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('月次請求フロー / 月度计费流程', () => {
  test('月次計算 → 請求書生成 → 確認 / 月度计算 → 生成发票 → 确认', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'admin@test.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Step 1: 月次計算実行 / 执行月度计算
    await page.goto('/billing');
    await page.selectOption('[data-testid="billing-month"]', '2026-03');
    await page.click('[data-testid="calculate-button"]');
    await expect(page.locator('[data-testid="calculation-complete"]')).toBeVisible({
      timeout: 30_000,
    });

    // Step 2: 請求書生成 / 生成发票
    await page.click('[data-testid="generate-invoice-0"]');
    await expect(page.locator('[data-testid="invoice-preview"]')).toBeVisible();

    // Step 3: 内容確認 / 确认内容
    const totalAmount = await page.locator('[data-testid="invoice-total"]').textContent();
    expect(Number(totalAmount?.replace(/[^0-9]/g, ''))).toBeGreaterThan(0);
  });
});
```

### 4.4 スクリーンショット・ビデオキャプチャ / 截图和视频捕获

失敗時の自動キャプチャ設定は `playwright.config.ts` で行う。
失败时的自动捕获在 `playwright.config.ts` 中配置。

```typescript
// playwright.config.ts (抜粋 / 摘录)
use: {
  screenshot: 'only-on-failure',  // 失敗時のみスクリーンショット / 仅失败时截图
  video: 'on-first-retry',        // 初回リトライ時にビデオ / 首次重试时录像
  trace: 'on-first-retry',        // 初回リトライ時にトレース / 首次重试时追踪
},
```

出力先 / 输出位置:
- スクリーンショット / 截图: `playwright-report/screenshots/`
- ビデオ / 视频: `playwright-report/videos/`
- トレース / 追踪: `playwright-report/traces/`

---

## 5. 負荷テスト / 负载测试

### ツール / 工具

**k6** -- Go 製の高性能負荷テストツール。JavaScript でスクリプトを記述。
k6 -- Go 编写的高性能负载测试工具。使用 JavaScript 编写脚本。

### テストシナリオ / 测试场景

| シナリオ / 场景 | パターン / 模式 | 期間 / 时长 | ユーザー数 / 用户数 | 目的 / 目的 |
|---|---|---|---|---|
| ランプアップ / 升压 | 段階的増加 / 逐步增加 | 5 分 | 10 → 100 | 徐々に負荷を上げて限界を探る / 逐步加压寻找极限 |
| 定常負荷 / 稳定负载 | 一定 / 恒定 | 10 分 | 100 | 安定動作を確認 / 确认稳定运行 |
| スパイク / 尖峰 | 急激な増加 / 急剧增加 | 2 分 | 200 | 急激なアクセス増に耐えるか / 能否承受急剧访问增加 |

### 合格基準 / 合格标准

| メトリクス / 指标 | 合格基準 / 合格标准 |
|---|---|
| P95 レイテンシ / P95 延迟 | < 500ms (100 同時ユーザー / 100 并发用户) |
| P99 レイテンシ / P99 延迟 | < 1000ms |
| エラー率 / 错误率 | < 1% |
| RPS | > 200 (定常負荷 / 稳定负载) |

### 対象エンドポイント / 目标端点

| エンドポイント / 端点 | 目標 RPS | 目標 P95 | シナリオ / 场景 |
|---|---|---|---|
| `POST /api/auth/login` | 100 | < 200ms | ログイン負荷 / 登录负载 |
| `GET /api/orders` | 200 | < 300ms | 出荷指示一覧 / 出库指示列表 |
| `POST /api/inventory/adjust` | 50 | < 500ms | 在庫調整 / 库存调整 |
| `GET /api/products` | 200 | < 200ms | 商品一覧 / 商品列表 |
| `GET /api/inventory/stock` | 150 | < 300ms | 在庫照会 / 库存查询 |
| `POST /api/shipments` | 80 | < 400ms | 出荷登録 / 出货登录 |

### k6 スクリプト例 / k6 脚本示例

```javascript
// k6/load-test.js
/**
 * ZELIXWMS 負荷テスト / ZELIXWMS 负载测试
 *
 * 3 段階シナリオ: ランプアップ → 定常 → スパイク
 * 三阶段场景: 升压 → 稳定 → 尖峰
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// カスタムメトリクス / 自定义指标
const errorRate = new Rate('errors');
const loginDuration = new Trend('login_duration', true);
const productListDuration = new Trend('product_list_duration', true);
const inventoryAdjustDuration = new Trend('inventory_adjust_duration', true);

export const options = {
  scenarios: {
    // シナリオ 1: ランプアップ / 场景 1: 升压
    ramp_up: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 100 },  // 5 分で 0→100 ユーザー / 5 分钟 0→100 用户
      ],
      gracefulRampDown: '30s',
    },
    // シナリオ 2: 定常負荷 / 场景 2: 稳定负载
    steady: {
      executor: 'constant-vus',
      vus: 100,
      duration: '10m',
      startTime: '5m',  // ランプアップ後に開始 / 升压后开始
    },
    // シナリオ 3: スパイク / 场景 3: 尖峰
    spike: {
      executor: 'ramping-vus',
      startVUs: 100,
      stages: [
        { duration: '30s', target: 200 },  // 30 秒で 200 に / 30 秒到 200
        { duration: '1m', target: 200 },   // 1 分間維持 / 维持 1 分钟
        { duration: '30s', target: 100 },  // 30 秒で 100 に戻す / 30 秒回到 100
      ],
      startTime: '15m',  // 定常負荷後に開始 / 稳定负载后开始
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],     // P95 < 500ms
    http_req_failed: ['rate<0.01'],       // エラー率 < 1% / 错误率 < 1%
    errors: ['rate<0.01'],
    login_duration: ['p(95)<200'],        // ログイン P95 < 200ms
    product_list_duration: ['p(95)<200'], // 商品一覧 P95 < 200ms
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

/**
 * セットアップ: テスト用トークン取得 / Setup: 获取测试令牌
 */
export function setup() {
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: 'loadtest@test.com',
    password: 'loadtest123',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(loginRes, { 'ログイン成功 / 登录成功': (r) => r.status === 200 });

  return { token: loginRes.json('token') };
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.token}`,
  };

  // ── ログインテスト / 登录测试 ──
  group('ログイン / 登录', () => {
    const res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
      email: 'loadtest@test.com',
      password: 'loadtest123',
    }), { headers: { 'Content-Type': 'application/json' } });

    loginDuration.add(res.timings.duration);
    const ok = check(res, { 'status 200': (r) => r.status === 200 });
    errorRate.add(!ok);
  });

  sleep(1);

  // ── 商品一覧取得 / 获取商品列表 ──
  group('商品一覧 / 商品列表', () => {
    const res = http.get(`${BASE_URL}/api/products?page=1&limit=20`, { headers });
    productListDuration.add(res.timings.duration);
    const ok = check(res, {
      'status 200': (r) => r.status === 200,
      'レスポンス < 500ms / 响应 < 500ms': (r) => r.timings.duration < 500,
    });
    errorRate.add(!ok);
  });

  sleep(1);

  // ── 在庫照会 / 库存查询 ──
  group('在庫照会 / 库存查询', () => {
    const res = http.get(`${BASE_URL}/api/inventory/stock?page=1&limit=50`, { headers });
    const ok = check(res, {
      'status 200': (r) => r.status === 200,
    });
    errorRate.add(!ok);
  });

  sleep(1);

  // ── 在庫調整 / 库存调整 ──
  group('在庫調整 / 库存调整', () => {
    const res = http.post(`${BASE_URL}/api/inventory/adjust`, JSON.stringify({
      productId: 'load-test-product-001',
      locationId: 'load-test-location-001',
      quantity: Math.floor(Math.random() * 10) + 1,
      reason: 'k6 負荷テスト / k6 负载测试',
    }), { headers });

    inventoryAdjustDuration.add(res.timings.duration);
    const ok = check(res, {
      'status 200 or 400': (r) => r.status === 200 || r.status === 400,
    });
    errorRate.add(!ok);
  });

  sleep(1);
}
```

### 実行方法 / 执行方式

```bash
# 基本実行 / 基本执行
k6 run k6/load-test.js

# 環境指定 / 指定环境
k6 run -e BASE_URL=https://staging.zelixwms.com k6/load-test.js

# JSON レポート出力 / 输出 JSON 报告
k6 run --out json=k6-results.json k6/load-test.js

# InfluxDB 連携（Grafana ダッシュボード用）/ InfluxDB 集成（Grafana 仪表盘用）
k6 run --out influxdb=http://localhost:8086/k6 k6/load-test.js
```

---

## 6. セキュリティテスト / 安全测试

### 6.1 OWASP ZAP 自動スキャン / OWASP ZAP 自动扫描

```bash
# Docker でベースラインスキャン / 使用 Docker 进行基线扫描
docker run -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
  -t http://host.docker.internal:4000 \
  -r zap-report.html \
  -J zap-report.json

# フルスキャン（月次）/ 完整扫描（每月）
docker run -t ghcr.io/zaproxy/zaproxy:stable zap-full-scan.py \
  -t http://host.docker.internal:4000 \
  -r zap-full-report.html
```

#### CI 統合 / CI 集成

```yaml
# .github/workflows/security.yml
security-scan:
  runs-on: ubuntu-latest
  steps:
    - name: OWASP ZAP ベースラインスキャン / 基线扫描
      uses: zaproxy/action-baseline@v0.10.0
      with:
        target: 'http://localhost:4000'
        rules_file_name: '.zap-rules.tsv'
        fail_action: true
```

### 6.2 npm audit

```bash
# 毎 PR で実行 / 每个 PR 执行
npm audit --audit-level=high

# 自動修正 / 自动修复
npm audit fix

# CI での強制チェック / CI 中强制检查
npm audit --audit-level=high --production
```

#### CI 統合 / CI 集成

```yaml
- name: npm audit / npm 依赖审计
  run: |
    cd backend && npm audit --audit-level=high --production
    cd ../frontend && npm audit --audit-level=high --production
```

### 6.3 テナント分離検証テスト / 租户隔离验证测试

マルチテナント環境でのデータ分離を検証する専用テスト。
验证多租户环境中的数据隔离的专用测试。

```typescript
// test/security/tenant-isolation.test.ts
/**
 * テナント分離テスト / 租户隔离测试
 *
 * テナント A のデータがテナント B から参照・変更できないことを検証。
 * 验证租户 A 的数据不能从租户 B 访问或修改。
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '@/app';
import { createTestTenant, createTestProduct } from '@/test/factories';

describe('テナント分離 / 租户隔离', () => {
  let app: any;

  beforeAll(async () => {
    app = await createApp();
  });

  const endpoints = [
    { method: 'GET', path: '/api/products' },
    { method: 'GET', path: '/api/inventory/stock' },
    { method: 'GET', path: '/api/orders' },
    { method: 'GET', path: '/api/inbound' },
    { method: 'GET', path: '/api/clients' },
    { method: 'GET', path: '/api/billing/records' },
  ];

  endpoints.forEach(({ method, path }) => {
    it(`${method} ${path}: 他テナントのデータが見えない / 其他租户的数据不可见`, async () => {
      const tenantA = await createTestTenant();
      const tenantB = await createTestTenant();

      // テナント A にデータ作成 / 在租户 A 创建数据
      await createTestProduct({ tenantId: tenantA.id });

      // テナント B からアクセス / 从租户 B 访问
      const res = await request(app)
        [method.toLowerCase()](path)
        .set('Authorization', `Bearer ${tenantB.token}`);

      // テナント A のデータが含まれていないことを確認 / 确认不包含租户 A 的数据
      if (res.body.data) {
        const foreignData = res.body.data.filter(
          (item: any) => item.tenantId === tenantA.id
        );
        expect(foreignData).toHaveLength(0);
      }
    });
  });

  it('テナント A のリソースを B が直接 ID 指定しても 404 / 租户 B 直接指定 A 的资源 ID 应返回 404', async () => {
    const tenantA = await createTestTenant();
    const tenantB = await createTestTenant();
    const product = await createTestProduct({ tenantId: tenantA.id });

    const res = await request(app)
      .get(`/api/products/${product.id}`)
      .set('Authorization', `Bearer ${tenantB.token}`);

    expect(res.status).toBe(404);
  });
});
```

### 6.4 ロールベースアクセス制御マトリクステスト / 基于角色的访问控制矩阵测试

```typescript
// test/security/rbac-matrix.test.ts
/**
 * RBAC マトリクステスト / RBAC 矩阵测试
 *
 * 各ロールが適切なエンドポイントのみにアクセスできることを検証。
 * 验证每个角色只能访问适当的端点。
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '@/app';
import { createTestUser } from '@/test/factories';

/**
 * アクセスマトリクス定義 / 访问矩阵定义
 * true = アクセス可 / 可访问, false = アクセス不可 / 不可访问
 */
const accessMatrix: Record<string, Record<string, boolean>> = {
  'GET /api/products':        { admin: true, manager: true,  operator: true,  viewer: true  },
  'POST /api/products':       { admin: true, manager: true,  operator: false, viewer: false },
  'DELETE /api/products/:id': { admin: true, manager: false, operator: false, viewer: false },
  'POST /api/inventory/adjust':   { admin: true, manager: true,  operator: true,  viewer: false },
  'GET /api/billing/records':     { admin: true, manager: true,  operator: false, viewer: false },
  'POST /api/billing/calculate':  { admin: true, manager: false, operator: false, viewer: false },
  'GET /api/users':               { admin: true, manager: false, operator: false, viewer: false },
  'POST /api/users':              { admin: true, manager: false, operator: false, viewer: false },
  'GET /api/system/settings':     { admin: true, manager: false, operator: false, viewer: false },
};

describe('RBAC マトリクス / RBAC 矩阵', () => {
  let app: any;
  const tokens: Record<string, string> = {};

  beforeAll(async () => {
    app = await createApp();

    // 各ロールのユーザーとトークンを作成 / 创建每个角色的用户和令牌
    for (const role of ['admin', 'manager', 'operator', 'viewer']) {
      const user = await createTestUser({ role });
      tokens[role] = user.token;
    }
  });

  Object.entries(accessMatrix).forEach(([endpoint, roles]) => {
    const [method, path] = endpoint.split(' ');

    Object.entries(roles).forEach(([role, allowed]) => {
      const testName = allowed
        ? `${role} は ${endpoint} にアクセスできる / ${role} 可以访问 ${endpoint}`
        : `${role} は ${endpoint} にアクセスできない / ${role} 不能访问 ${endpoint}`;

      it(testName, async () => {
        const resolvedPath = path.replace(':id', 'test-id-001');
        const res = await request(app)
          [method.toLowerCase()](resolvedPath)
          .set('Authorization', `Bearer ${tokens[role]}`)
          .send(method === 'POST' ? { name: 'test' } : undefined);

        if (allowed) {
          expect(res.status).not.toBe(403);
        } else {
          expect(res.status).toBe(403);
        }
      });
    });
  });
});
```

### 6.5 セキュリティテストチェックリスト / 安全测试检查清单

| 項目 / 项目 | ツール / 工具 | 頻度 / 频率 | CI 統合 / CI 集成 |
|---|---|---|---|
| 依存パッケージ脆弱性 / 依赖包漏洞 | `npm audit` | 毎 PR / 每个 PR | YES |
| SQL インジェクション / SQL 注入 | OWASP ZAP | 月次 / 每月 | YES (Nightly) |
| XSS | OWASP ZAP | 月次 / 每月 | YES (Nightly) |
| テナント分離 / 租户隔离 | ユニットテスト / 单元测试 | 毎 PR | YES |
| RBAC マトリクス / RBAC 矩阵 | ユニットテスト / 单元测试 | 毎 PR | YES |
| シークレット漏洩 / 密钥泄露 | gitleaks | 毎コミット / 每次提交 | YES (pre-commit) |
| CSRF 保護 / CSRF 防护 | 手動 + E2E / 手动 + E2E | 月次 / 每月 | NO |
| レートリミット / 速率限制 | k6 | 月次 / 每月 | YES (Nightly) |

---

## 7. テストデータ管理 / 测试数据管理

### 7.1 ファクトリ関数 / 工厂函数

フィクスチャファイルではなく、ファクトリ関数でテストデータを生成。各テストが独自のデータセットを持つことでテスト分離を保証する。
使用工厂函数生成测试数据，而非 Fixture 文件。每个测试拥有独立数据集以保证测试隔离。

```typescript
// backend/src/test/factories/product.factory.ts
/**
 * テスト商品ファクトリ / 测试商品工厂
 */
import { randomUUID } from 'crypto';

interface ProductOverrides {
  id?: string;
  tenantId?: string;
  sku?: string;
  name?: string;
  barcode?: string;
  minStockLevel?: number;
  maxStockLevel?: number;
  weight?: number;
  category?: string;
}

export function createTestProduct(overrides: ProductOverrides = {}) {
  const id = overrides.id ?? randomUUID();
  return {
    id,
    tenantId: overrides.tenantId ?? 'test-tenant-001',
    sku: overrides.sku ?? `SKU-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: overrides.name ?? `テスト商品 ${id.slice(0, 8)} / 测试商品`,
    barcode: overrides.barcode ?? `4900000${Date.now().toString().slice(-6)}`,
    minStockLevel: overrides.minStockLevel ?? 10,
    maxStockLevel: overrides.maxStockLevel ?? 1000,
    weight: overrides.weight ?? 0.5,
    category: overrides.category ?? 'general',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
```

```typescript
// backend/src/test/factories/shipment.factory.ts
/**
 * テスト出荷ファクトリ / 测试出货工厂
 */
import { randomUUID } from 'crypto';

interface ShipmentOverrides {
  id?: string;
  tenantId?: string;
  orderId?: string;
  status?: string;
  carrierId?: string;
  trackingNumber?: string;
  items?: Array<{ productId: string; quantity: number }>;
}

export function createTestShipment(overrides: ShipmentOverrides = {}) {
  return {
    id: overrides.id ?? randomUUID(),
    tenantId: overrides.tenantId ?? 'test-tenant-001',
    orderId: overrides.orderId ?? `ORD-${Date.now()}`,
    status: overrides.status ?? 'pending',
    carrierId: overrides.carrierId ?? null,
    trackingNumber: overrides.trackingNumber ?? null,
    items: overrides.items ?? [
      { productId: randomUUID(), quantity: 5 },
    ],
    shippedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
```

```typescript
// backend/src/test/factories/tenant.factory.ts
/**
 * テストテナントファクトリ / 测试租户工厂
 */
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';

interface TenantOverrides {
  id?: string;
  name?: string;
  plan?: string;
}

export function createTestTenant(overrides: TenantOverrides = {}) {
  const id = overrides.id ?? randomUUID();
  const token = jwt.sign(
    { tenantId: id, userId: randomUUID(), role: 'admin' },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );

  return {
    id,
    name: overrides.name ?? `テストテナント ${id.slice(0, 8)} / 测试租户`,
    plan: overrides.plan ?? 'standard',
    token,
    createdAt: new Date(),
  };
}
```

```typescript
// backend/src/test/factories/index.ts
/**
 * ファクトリ関数エクスポート / 工厂函数导出
 */
export { createTestProduct } from './product.factory';
export { createTestShipment } from './shipment.factory';
export { createTestTenant } from './tenant.factory';
export { createTestLocation } from './location.factory';
export { createTestUser } from './user.factory';
export { createTestInbound } from './inbound.factory';
export { createTestClient } from './client.factory';
```

### 7.2 ファクトリ関数の原則 / 工厂函数原则

| 原則 / 原则 | 説明 / 说明 |
|---|---|
| デフォルト値は常に有効 / 默认值始终有效 | `overrides` なしで呼んでも有効なオブジェクトを返す / 无 overrides 调用也返回有效对象 |
| 部分上書き可能 / 可部分覆盖 | `createTestProduct({ minStockLevel: 0 })` で個別フィールドだけ変更 / 只修改单个字段 |
| テスト間で共有しない / 测试间不共享 | 毎回新しいデータを生成 / 每次生成新数据 |
| ID はランダム / ID 随机 | `randomUUID()` で衝突を回避 / 使用 randomUUID() 避免冲突 |
| 不変パターン / 不可变模式 | スプレッド演算子で新しいオブジェクトを返す / 使用展开运算符返回新对象 |

### 7.3 シードスクリプト / 种子脚本

開発・ステージング環境用のシードデータ。
用于开发和 Staging 环境的种子数据。

```typescript
// backend/src/db/seeds/development.ts
/**
 * 開発環境シードデータ / 开发环境种子数据
 *
 * 実行: npx tsx src/db/seeds/development.ts
 */
import { createTestTenant, createTestProduct, createTestLocation } from '@/test/factories';

async function seed() {
  console.log('シードデータ投入開始 / 开始插入种子数据...');

  // テナント作成 / 创建租户
  const tenants = Array.from({ length: 3 }, (_, i) =>
    createTestTenant({ name: `開発テナント ${i + 1} / 开发租户 ${i + 1}` })
  );

  for (const tenant of tenants) {
    // 各テナントに商品 50 件 / 每个租户 50 个商品
    const products = Array.from({ length: 50 }, () =>
      createTestProduct({ tenantId: tenant.id })
    );

    // 各テナントにロケーション 20 件 / 每个租户 20 个仓位
    const locations = Array.from({ length: 20 }, (_, i) =>
      createTestLocation({
        tenantId: tenant.id,
        code: `${String.fromCharCode(65 + Math.floor(i / 5))}-${(i % 5) + 1}-01`,
      })
    );

    // DB に投入 / 插入数据库
    // await db.insert(tenantTable).values(tenant);
    // await db.insert(productTable).values(products);
    // await db.insert(locationTable).values(locations);
  }

  console.log('シードデータ投入完了 / 种子数据插入完成');
}

seed().catch(console.error);
```

### 7.4 データ匿名化 / 数据匿名化

本番データを使ったテストでは、個人情報を匿名化する。
使用生产数据测试时，需要对个人信息进行匿名化处理。

```typescript
// backend/src/db/scripts/anonymize.ts
/**
 * 本番データ匿名化スクリプト / 生产数据匿名化脚本
 *
 * 使用: npx tsx src/db/scripts/anonymize.ts
 * 対象: staging DB のみ / 仅适用于 staging 数据库
 */
const anonymizationRules = {
  // テーブル / 表: フィールド → 変換ルール / 字段 → 转换规则
  users: {
    email: (id: string) => `user-${id}@anonymized.test`,
    name: (id: string) => `ユーザー ${id} / 用户 ${id}`,
    phone: () => '090-0000-0000',
  },
  clients: {
    contactEmail: (id: string) => `client-${id}@anonymized.test`,
    contactName: (id: string) => `担当者 ${id} / 联系人 ${id}`,
    contactPhone: () => '03-0000-0000',
  },
  shipments: {
    recipientName: () => '匿名受取人 / 匿名收件人',
    recipientPhone: () => '090-0000-0000',
    recipientAddress: () => '東京都千代田区匿名町1-1-1',
  },
};
```

---

## 8. CI/CD 統合 / CI/CD 集成

### 8.1 パイプライン全体像 / 流水线全景

```
┌─────────────────────────────────────────────────────────────┐
│                      PR (Pull Request)                       │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌───────────┐  │
│  │ 型チェック │  │ Lint      │  │ Unit     │  │ npm audit │  │
│  │ 类型检查  │  │           │  │ Tests    │  │           │  │
│  └──────────┘  └───────────┘  └──────────┘  └───────────┘  │
│                      ↓ すべて Pass / 全部通过                  │
│              ┌───────────────────┐                            │
│              │ カバレッジ ≥ 80%   │                            │
│              │ 覆盖率 ≥ 80%     │                            │
│              └───────────────────┘                            │
└─────────────────────────────────────────────────────────────┘
                          ↓ Merge
┌─────────────────────────────────────────────────────────────┐
│                    Staging Deploy                             │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────┐  │
│  │ Integration  │  │ API E2E       │  │ Browser E2E      │  │
│  │ Tests        │  │ (Supertest)   │  │ (Playwright)     │  │
│  └──────────────┘  └───────────────┘  └──────────────────┘  │
│                      ↓ すべて Pass / 全部通过                  │
│              ┌───────────────────┐                            │
│              │ Production Deploy │                            │
│              └───────────────────┘                            │
└─────────────────────────────────────────────────────────────┘
                          ↓ Nightly (毎晩 / 每晚)
┌─────────────────────────────────────────────────────────────┐
│                     Nightly Suite                             │
│  ┌──────────────┐  ┌───────────┐  ┌──────────────────────┐  │
│  │ Full E2E     │  │ k6 Load   │  │ OWASP ZAP Scan      │  │
│  │ (全ブラウザ) │  │ Test      │  │                      │  │
│  └──────────────┘  └───────────┘  └──────────────────────┘  │
│              → レポートのみ（ブロックしない）                     │
│              → 仅报告（不阻断）                                │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 GitHub Actions ワークフロー / GitHub Actions 工作流

#### PR ワークフロー / PR 工作流

```yaml
# .github/workflows/pr-check.yml
name: PR Check / PR 检查

on:
  pull_request:
    branches: [main, develop]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # ── 型チェック + Lint / 类型检查 + Lint ──
  type-check-and-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci

      - name: 型チェック (Backend) / 类型检查 (后端)
        run: cd backend && npx tsc --noEmit

      - name: 型チェック (Frontend) / 类型检查 (前端)
        run: cd frontend && npx vue-tsc --build

      - name: ESLint
        run: cd backend && npx eslint src/ --max-warnings 0

  # ── ユニットテスト / 单元测试 ──
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci

      - name: Backend ユニットテスト / 后端单元测试
        run: cd backend && npx vitest run --coverage

      - name: カバレッジしきい値チェック / 覆盖率阈值检查
        run: |
          cd backend
          npx vitest run --coverage \
            --coverage.thresholds.statements=80 \
            --coverage.thresholds.branches=80 \
            --coverage.thresholds.functions=80 \
            --coverage.thresholds.lines=80

      - name: カバレッジレポートアップロード / 上传覆盖率报告
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: backend/coverage/

  # ── セキュリティ / 安全 ──
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci

      - name: npm audit
        run: |
          cd backend && npm audit --audit-level=high --production
          cd ../frontend && npm audit --audit-level=high --production

      - name: gitleaks シークレットスキャン / 密钥扫描
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

#### Staging デプロイ後テスト / Staging 部署后测试

```yaml
# .github/workflows/staging-tests.yml
name: Staging Tests / Staging 测试

on:
  push:
    branches: [main]

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: zelixwms_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci

      - name: インテグレーションテスト / 集成测试
        run: cd backend && npx vitest run --config vitest.integration.config.ts
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/zelixwms_test

  e2e-tests:
    runs-on: ubuntu-latest
    needs: integration-tests
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps chromium

      - name: E2E テスト / 端到端测试
        run: npx playwright test

      - name: Playwright レポートアップロード / 上传 Playwright 报告
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
```

#### Nightly テスト / 夜间测试

```yaml
# .github/workflows/nightly.yml
name: Nightly Suite / 夜间测试套件

on:
  schedule:
    - cron: '0 18 * * *'  # JST 03:00 / UTC 18:00
  workflow_dispatch:

jobs:
  full-e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps

      - name: フル E2E テスト (全ブラウザ) / 完整 E2E 测试 (全浏览器)
        run: npx playwright test --reporter=html
        continue-on-error: true

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: full-e2e-report
          path: playwright-report/

  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: grafana/setup-k6-action@v1

      - name: k6 負荷テスト / k6 负载测试
        run: k6 run k6/load-test.js
        env:
          BASE_URL: ${{ secrets.STAGING_URL }}
        continue-on-error: true

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: k6-report
          path: k6-results.json

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: OWASP ZAP スキャン / OWASP ZAP 扫描
        uses: zaproxy/action-baseline@v0.10.0
        with:
          target: ${{ secrets.STAGING_URL }}
        continue-on-error: true
```

### 8.3 テスト実行タイミングまとめ / 测试执行时机汇总

| イベント / 事件 | Unit | Integration | E2E | Load | Security |
|---|---|---|---|---|---|
| PR (develop/main) | **必須 / 必须** | NO | NO | NO | **npm audit** |
| Push (main) | **必須 / 必须** | **必須 / 必须** | **必須 / 必须** | NO | **npm audit** |
| Nightly | YES | YES | **フル / 完整** | **YES** | **ZAP + audit** |
| 手動 / 手动 | YES | YES | YES | YES | YES |

### 8.4 PR ブロッキングルール / PR 阻断规则

以下のいずれかが失敗した場合、PR マージをブロックする。
以下任一失败时，阻止 PR 合并。

- [ ] 型チェック (tsc / vue-tsc) / 类型检查
- [ ] ESLint (エラー 0) / ESLint (0 errors)
- [ ] ユニットテスト全 Pass / 单元测试全部通过
- [ ] カバレッジ 80% 以上 / 覆盖率 80% 以上
- [ ] npm audit (high severity 0) / npm audit (高严重度 0)
- [ ] gitleaks (シークレット検出 0) / gitleaks (密钥检测 0)

---

## 9. テストカバレッジレポート / 测试覆盖率报告

### 9.1 カバレッジプロバイダー / 覆盖率提供者

**v8** -- Node.js ネイティブのカバレッジエンジン。Istanbul よりも高速で正確。
v8 -- Node.js 原生覆盖率引擎。比 Istanbul 更快更准确。

```typescript
// vitest.config.ts (coverage 設定 / 配置)
coverage: {
  provider: 'v8',
  reporter: [
    'text',           // ターミナル出力 / 终端输出
    'lcov',           // CI 統合用 / CI 集成用
    'json-summary',   // バッジ生成用 / 徽章生成用
    'html',           // ブラウザで閲覧 / 浏览器查看
  ],
  include: ['src/**/*.ts'],
  exclude: [
    'src/**/*.test.ts',
    'src/**/*.d.ts',
    'src/test/**',
    'src/db/seeds/**',
    'src/db/migrations/**',
  ],
  thresholds: {
    statements: 80,
    branches: 80,
    functions: 80,
    lines: 80,
  },
},
```

### 9.2 lcov for CI 統合 / lcov 用于 CI 集成

lcov レポートは CI で自動生成され、以下のサービスと統合可能。
lcov 报告在 CI 中自动生成，可与以下服务集成。

| サービス / 服务 | 統合方法 / 集成方法 |
|---|---|
| GitHub Actions | `actions/upload-artifact` でレポートアップロード / 上传报告 |
| Codecov | `codecov/codecov-action` で自動連携 / 自动集成 |
| Coveralls | `coverallsapp/github-action` で自動連携 / 自动集成 |

```yaml
# Codecov 統合例 / Codecov 集成示例
- name: Codecov アップロード / 上传
  uses: codecov/codecov-action@v4
  with:
    files: backend/coverage/lcov.info
    flags: backend
    fail_ci_if_error: true
    token: ${{ secrets.CODECOV_TOKEN }}
```

### 9.3 カバレッジバッジ / 覆盖率徽章

README にカバレッジバッジを表示。
在 README 中显示覆盖率徽章。

```markdown
<!-- README.md -->
![Coverage](https://img.shields.io/codecov/c/github/ZELIXWMS/ZELIXWMS?label=coverage)
```

ローカルでバッジを生成する場合 / 本地生成徽章:

```bash
# json-summary から coverage % を抽出 / 从 json-summary 提取覆盖率
node -e "
const summary = require('./backend/coverage/coverage-summary.json');
const pct = summary.total.lines.pct;
console.log('Coverage: ' + pct + '%');
"
```

### 9.4 カバレッジレポートの閲覧方法 / 覆盖率报告查看方式

```bash
# HTML レポートをブラウザで開く / 在浏览器中打开 HTML 报告
open backend/coverage/index.html

# ターミナルでサマリー確認 / 在终端确认摘要
cd backend && npx vitest run --coverage
```

---

## テスト実行コマンド一覧 / 测试执行命令列表

```bash
# ===== ユニットテスト / 单元测试 =====
cd backend && npx vitest run                         # 全テスト実行 / 执行全部测试
cd backend && npx vitest run --coverage              # カバレッジ付き / 含覆盖率
cd backend && npx vitest run src/services/           # ディレクトリ指定 / 指定目录
cd backend && npx vitest run --watch                 # ウォッチモード / 监视模式

# ===== 型チェック / 类型检查 =====
cd backend && npx tsc --noEmit
cd frontend && npx vue-tsc --build

# ===== インテグレーションテスト / 集成测试 =====
cd backend && npx vitest run --config vitest.integration.config.ts

# ===== E2E テスト / 端到端测试 =====
npx playwright test                                   # 全テスト / 全部测试
npx playwright test --ui                              # UI モード / UI 模式
npx playwright test --project=chromium                # Chromium のみ / 仅 Chromium
npx playwright test e2e/browser/outbound-flow.spec.ts # 単一ファイル / 单个文件
npx playwright show-report                            # レポート表示 / 显示报告

# ===== 負荷テスト / 负载测试 =====
k6 run k6/load-test.js
k6 run -e BASE_URL=https://staging.zelixwms.com k6/load-test.js

# ===== セキュリティテスト / 安全测试 =====
npm audit --audit-level=high
npx gitleaks detect --source .
docker run -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
  -t http://localhost:4000 -r zap-report.html
```

---

## 参考ファイル / 参考文件

| ファイル / 文件 | 説明 / 说明 |
|---|---|
| `backend/vitest.config.ts` | ユニットテスト設定 / 单元测试配置 |
| `backend/vitest.integration.config.ts` | インテグレーションテスト設定 / 集成测试配置 |
| `playwright.config.ts` | Playwright E2E テスト設定 / E2E 测试配置 |
| `.github/workflows/pr-check.yml` | PR チェックワークフロー / PR 检查工作流 |
| `.github/workflows/staging-tests.yml` | Staging テストワークフロー / Staging 测试工作流 |
| `.github/workflows/nightly.yml` | 夜間テストワークフロー / 夜间测试工作流 |
| `k6/load-test.js` | 負荷テストスクリプト / 负载测试脚本 |
| `backend/src/test/factories/` | テストデータファクトリ / 测试数据工厂 |
| `docs/testing/01-test-strategy.md` | テスト戦略概要（旧版）/ 测试策略概览（旧版） |

---

## 変更履歴 / 变更历史

| 日付 / 日期 | 変更者 / 变更者 | 内容 / 内容 |
|---|---|---|
| 2026-03-21 | - | 初版作成 / 初版创建 |
```

---

The document has been composed. Since I only have read-only tools in this session, please save the content above to the target path. You will also need to create the directory first:

```bash
mkdir -p /Users/kin/Documents/GitHub/ZELIXWMS/docs/architecture
```

Then save the file to `/Users/kin/Documents/GitHub/ZELIXWMS/docs/architecture/12-testing-strategy.md`.

**Summary of what the document covers across 700+ lines:**

1. **Testing Pyramid** -- Visual diagram, layer breakdown (Unit 70%, Integration 20%, E2E 10%), guiding principles
2. **Unit Test Standards** -- Vitest config, bilingual naming convention (`describe/it` in JP+CN), file placement in `__tests__/`, mock strategy with chain helpers, example tests for Controller/Service/Utility layers, per-layer coverage targets
3. **Integration Test Standards** -- Testcontainers with PostgreSQL 15, transaction rollback per test, factory-based seeding, complete inventory transfer integration test example including tenant isolation
4. **E2E Test Standards** -- API E2E with Supertest, Browser E2E with Playwright, four complete critical journey implementations (Outbound, Inbound, Inventory Transfer, Monthly Billing), screenshot/video/trace capture on failure
5. **Load Testing** -- k6 with three scenarios (ramp-up, steady, spike), acceptance criteria (P95 <500ms at 100 concurrent), full k6 script with custom metrics and grouped checks
6. **Security Testing** -- OWASP ZAP automated scan, npm audit in CI, tenant isolation verification test (all endpoints), RBAC access control matrix test (role x endpoint)
7. **Test Data Management** -- Factory functions for Product/Shipment/Tenant with overrides pattern, seed scripts for dev/staging, data anonymization rules for production-like testing
8. **CI/CD Integration** -- Three-tier pipeline (PR: unit+lint+typecheck, Staging: integration+E2E, Nightly: full E2E+load+security), complete GitHub Actions YAML for each tier, PR blocking rules
9. **Coverage Reporting** -- v8 provider, lcov/json-summary/html reporters, Codecov integration, README badge

**Key referenced files:**
- `/Users/kin/Documents/GitHub/ZELIXWMS/docs/testing/01-test-strategy.md` -- existing strategy (used as foundation)
- `/Users/kin/Documents/GitHub/ZELIXWMS/backend/vitest.config.ts` -- current Vitest configuration
- `/Users/kin/Documents/GitHub/ZELIXWMS/backend/src/services/__tests__/inventoryService.test.ts` -- real test conventions (bilingual comments, chain mock pattern)
- `/Users/kin/Documents/GitHub/ZELIXWMS/backend/src/api/controllers/__tests__/inventoryController.test.ts` -- controller test conventions
