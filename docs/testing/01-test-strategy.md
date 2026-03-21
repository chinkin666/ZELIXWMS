# テスト戦略ガイド / 测试策略指南

> ZELIXWMS のテストピラミッド、各テストレベルの設計方針、カバレッジ目標、CI 統合、パフォーマンス・セキュリティテスト（NestJS + PostgreSQL + Supabase 新アーキテクチャ）。
> ZELIXWMS 的测试金字塔、各测试层级设计方针、覆盖率目标、CI 集成、性能和安全测试（NestJS + PostgreSQL + Supabase 新架构）。

---

## 1. テストピラミッド / 测试金字塔

```
        ┌─────────┐
        │  E2E    │  10% — Playwright（クリティカルフロー / 关键流程）
        │ (少数)  │
       ┌┴─────────┴┐
       │ Integration│  20% — Testcontainers + Supertest
       │  (中程度)  │       （実 DB・API テスト / 真实 DB 和 API 测试）
      ┌┴────────────┴┐
      │    Unit      │  70% — Vitest + vi.mock
      │   (大量)     │       （ビジネスロジック / 业务逻辑）
      └──────────────┘
```

| レベル / 层级 | 割合 / 比例 | フレームワーク | 速度 / 速度 | 信頼性 / 可靠性 |
|---|---|---|---|---|
| Unit | 70% | Vitest + vi.mock | 高速 / 快 | モックに依存 / 依赖 Mock |
| Integration | 20% | Testcontainers + Supertest | 中速 / 中 | 実環境に近い / 接近真实环境 |
| E2E | 10% | Playwright | 低速 / 慢 | 最も信頼性が高い / 最高可靠性 |

---

## 2. ユニットテスト / 单元测试

### フレームワーク / 框架

**Vitest** + **vi.mock** で全外部依存をモック。
使用 Vitest + vi.mock 模拟所有外部依赖。

### 設計方針 / 设计方针

- すべての外部依存（DB、Redis、外部 API）をモック / Mock 所有外部依赖
- ビジネスロジックを単体でテスト / 独立测试业务逻辑
- 各テストは独立して実行可能 / 每个测试可独立执行
- `beforeEach` / `afterEach` で状態をリセット / 在每次测试前后重置状态

### テスト対象 / 测试目标

| 層 / 层 | テスト対象 / 测试目标 | 例 / 示例 |
|---|---|---|
| Service | ビジネスロジック / 业务逻辑 | `inventoryService.test.ts` |
| Utility | ユーティリティ関数 / 工具函数 | `naturalSort.test.ts` |
| Guard | 認証・認可ガード / 认证授权守卫 | `authGuard.test.ts` |
| Pipe | バリデーションパイプ / 验证管道 | `validationPipe.test.ts` |
| DTO | データ変換 / 数据转换 | `createProductDto.test.ts` |

### モック戦略 / Mock 策略

```typescript
// Drizzle DB のモック例 / Drizzle DB Mock 示例
vi.mock('@/db/drizzle', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// サービスのモック例 / 服务 Mock 示例
vi.mock('@/services/notificationService', () => ({
  NotificationService: vi.fn().mockImplementation(() => ({
    send: vi.fn(),
  })),
}));
```

### モック対象の原則 / Mock 原则

| モックする / 需要 Mock | モックしない / 不需要 Mock | 理由 / 理由 |
|---|---|---|
| Drizzle DB クエリ | ビジネスロジック | DB 依存を排除 / 排除数据库依赖 |
| 外部 API（B2 Cloud 等） | バリデーション関数 | 外部依存を排除 / 排除外部依赖 |
| Redis / BullMQ | ユーティリティ関数 | インフラ依存を排除 / 排除基础设施依赖 |
| nodemailer | 純粋関数 / 纯函数 | I/O を排除 / 排除 I/O |

---

## 3. インテグレーションテスト / 集成测试

### フレームワーク / 框架

**Testcontainers** で実際の PostgreSQL コンテナを起動してテスト。
使用 Testcontainers 启动真实的 PostgreSQL 容器进行测试。

### 設計方針 / 设计方针

- 実際の PostgreSQL に対してクエリを実行 / 对真实 PostgreSQL 执行查询
- API エンドポイントを Supertest でテスト / 使用 Supertest 测试 API 端点
- テストごとにトランザクションでロールバック / 每次测试通过事务回滚
- マイグレーション + シードデータを自動適用 / 自动应用迁移和种子数据

### Testcontainers 設定例 / Testcontainers 配置示例

```typescript
import { PostgreSqlContainer } from '@testcontainers/postgresql';

let container: StartedPostgreSqlContainer;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:15-alpine')
    .withDatabase('zelixwms_test')
    .start();

  process.env.DATABASE_URL = container.getConnectionUri();
  // マイグレーション実行 / 执行迁移
  await runMigrations();
}, 60000);

afterAll(async () => {
  await container.stop();
});
```

### テスト対象 / 测试目标

| テスト対象 / 测试目标 | 内容 / 内容 |
|---|---|
| API エンドポイント | リクエスト → レスポンスの検証 / 请求 → 响应验证 |
| DB クエリ | Drizzle ORM クエリの正確性 / 查询准确性 |
| トランザクション | ロールバック・コミットの動作 / 回滚和提交行为 |
| マイグレーション | スキーマ変更の正確性 / Schema 变更准确性 |
| 認証フロー | JWT 発行 → 検証の一連の流れ / JWT 签发 → 验证全流程 |

---

## 4. E2E テスト / 端到端测试

### フレームワーク / 框架

**Playwright** でクリティカルなユーザーフローをブラウザテスト。
使用 Playwright 对关键用户流程进行浏览器测试。

### テスト対象フロー / 测试目标流程

| フロー / 流程 | ステップ数 / 步骤数 | 優先度 / 优先级 |
|---|---|---|
| ログイン → ダッシュボード / 登录 → 仪表盘 | 3 | Critical |
| 入庫フロー（予定作成 → 受取 → 棚入れ）/ 入库流程 | 8 | Critical |
| 出庫フロー（指示作成 → ピッキング → 出荷）/ 出库流程 | 10 | Critical |
| 在庫調整 / 库存调整 | 5 | High |
| 商品マスタ CRUD / 商品主数据 CRUD | 6 | High |
| ユーザー管理 / 用户管理 | 5 | Medium |

### Playwright 設定 / Playwright 配置

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: 'http://localhost:4001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    port: 4001,
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## 5. カバレッジ目標 / 覆盖率目标

### レイヤー別目標 / 各层目标

| レイヤー / 层 | 最低カバレッジ / 最低覆盖率 | 備考 / 备注 |
|---|---|---|
| **Service 層** | **80%+** | ビジネスロジックの核心 / 业务逻辑核心 |
| **Controller 層** | **60%+** | ルーティング・バリデーション / 路由和验证 |
| **Utility** | **90%+** | 純粋関数、テストしやすい / 纯函数，易于测试 |
| **Guard / Pipe** | **80%+** | セキュリティクリティカル / 安全关键 |
| **全体 / 整体** | **80%+** | CI でブロッキングチェック / CI 中阻断检查 |

### クリティカルパス（100% 目標）/ 关键路径（目标 100%）

以下のモジュールは可能な限り 100% カバレッジを目指す。
以下模块尽可能目标 100% 覆盖率。

| モジュール / 模块 | 理由 / 理由 |
|---|---|
| `inventoryService` | 在庫の正確性が業務の根幹 / 库存准确性是业务根本 |
| `outboundWorkflow` | 出荷ミスは直接的な損害 / 发货错误直接造成损失 |
| `inboundWorkflow` | 入庫ミスは在庫差異に直結 / 入库错误直接导致库存差异 |
| `chargeService` | 課金の正確性 / 计费准确性 |
| `authGuard` | 認証・認可の安全性 / 认证授权安全性 |

---

## 6. テストデータ / 测试数据

### ファクトリ関数（推奨）/ 工厂函数（推荐）

フィクスチャファイルではなく、ファクトリ関数でテストデータを生成。
使用工厂函数生成测试数据，而非 Fixture 文件。

```typescript
// factories/product.factory.ts
export function createProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: crypto.randomUUID(),
    sku: `TEST-${Date.now()}`,
    name: 'テスト商品 / 测试商品',
    minStockLevel: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// テスト内での使用 / 在测试中使用
it('should detect low stock / 应该检测到低库存', () => {
  const product = createProduct({ minStockLevel: 5 });
  // ...
});
```

### ファクトリ関数の原則 / 工厂函数原则

- デフォルト値は常に有効なデータ / 默认值始终为有效数据
- `overrides` パラメータで個別のフィールドを上書き可能 / 可通过 overrides 覆盖单个字段
- テスト間でデータを共有しない / 测试之间不共享数据
- ID はランダム生成して衝突を回避 / 随机生成 ID 避免冲突

---

## 7. CI 統合 / CI 集成

### GitHub Actions テスト実行 / GitHub Actions 测试执行

```yaml
# .github/workflows/ci.yml
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 20
        cache: 'npm'
    - run: npm ci

    # 型チェック / 类型检查
    - run: cd backend && npx tsc --noEmit
    - run: cd frontend && npx vue-tsc --build

    # ユニットテスト / 单元测试
    - run: cd backend && npx vitest run --coverage
    - run: cd frontend && npx vitest run --coverage

    # カバレッジしきい値チェック / 覆盖率阈值检查
    - name: Check coverage threshold
      run: |
        cd backend
        npx vitest run --coverage --coverage.thresholds.statements=80
```

### PR ブロッキングルール / PR 阻断规则

以下のいずれかが失敗した場合、PR マージをブロック。
以下任一失败时，阻止 PR 合并。

- [ ] 型チェック（tsc / vue-tsc）/ 类型检查
- [ ] ユニットテスト / 单元测试
- [ ] カバレッジ 80% 未満 / 覆盖率低于 80%
- [ ] ESLint エラー

### テスト実行タイミング / 测试执行时机

| イベント / 事件 | ユニット / 单元 | インテグレーション / 集成 | E2E |
|---|---|---|---|
| `push` (develop) | YES | YES | NO |
| `pull_request` (main) | YES | YES | YES |
| `push` (main) | YES | YES | YES |
| 手動トリガー / 手动触发 | YES | YES | YES |

### 同一ブランチの重複実行はキャンセル / 同一分支重复执行自动取消

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

---

## 8. パフォーマンステスト / 性能测试

### ツール / 工具

**k6** で負荷テストを実施。
使用 k6 进行负载测试。

### テスト対象エンドポイント / 测试目标端点

| エンドポイント / 端点 | 目標 RPS | 目標 p95 | シナリオ / 场景 |
|---|---|---|---|
| `POST /api/auth/login` | 100 | < 200ms | ログイン負荷 / 登录负载 |
| `GET /api/orders` | 200 | < 300ms | 出荷指示一覧 / 出库指示列表 |
| `POST /api/inventory/adjust` | 50 | < 500ms | 在庫調整 / 库存调整 |
| `GET /api/products` | 200 | < 200ms | 商品一覧 / 商品列表 |

### k6 スクリプト例 / k6 脚本示例

```javascript
// k6/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // ランプアップ / 升压
    { duration: '3m', target: 50 },   // 定常負荷 / 稳定负载
    { duration: '1m', target: 0 },    // ランプダウン / 降压
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // p95 < 500ms
    http_req_failed: ['rate<0.01'],    // エラー率 < 1% / 错误率 < 1%
  },
};

export default function () {
  const res = http.get('http://localhost:4000/api/products');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
```

### 実行方法 / 执行方式

```bash
# 負荷テスト実行 / 执行负载测试
k6 run k6/load-test.js

# HTML レポート出力 / 输出 HTML 报告
k6 run --out json=results.json k6/load-test.js
```

---

## 9. セキュリティテスト / 安全测试

### 依存パッケージ監査 / 依赖包审计

```bash
# npm audit（毎 PR で自動実行）/ 每个 PR 自动执行
npm audit

# 高重要度のみ / 仅高严重度
npm audit --audit-level=high

# 自動修正 / 自动修复
npm audit fix
```

### OWASP ZAP スキャン / OWASP ZAP 扫描

```bash
# Docker で ZAP ベースラインスキャン / 使用 Docker 进行 ZAP 基线扫描
docker run -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
  -t http://host.docker.internal:4000 \
  -r zap-report.html
```

### セキュリティテストチェックリスト / 安全测试检查清单

| 項目 / 项目 | ツール / 工具 | 頻度 / 频率 |
|---|---|---|
| 依存パッケージ脆弱性 / 依赖包漏洞 | `npm audit` | 毎 PR / 每个 PR |
| SQL インジェクション / SQL 注入 | OWASP ZAP | 月次 / 每月 |
| XSS | OWASP ZAP | 月次 |
| 認証・認可テスト / 认证授权测试 | ユニットテスト + 手動 | 毎 PR + 月次 |
| シークレット漏洩 / 密钥泄露 | git-secrets / gitleaks | 毎コミット / 每次提交 |
| CSRF 保護 / CSRF 防护 | 手動テスト / 手动测试 | 月次 |
| レートリミット / 速率限制 | k6 + 手動 | 月次 |

---

## テスト実行コマンド一覧 / 测试执行命令列表

```bash
# === ユニットテスト / 单元测试 ===
cd backend && npx vitest run                    # バックエンド全テスト / 后端全部测试
cd backend && npx vitest run --coverage         # カバレッジ付き / 含覆盖率
cd frontend && npx vitest run                   # フロントエンド全テスト / 前端全部测试

# === 型チェック / 类型检查 ===
cd backend && npx tsc --noEmit
cd frontend && npx vue-tsc --build
cd admin && npx vue-tsc --build
cd portal && npx vue-tsc --build

# === インテグレーションテスト / 集成测试 ===
cd backend && npx vitest run --config vitest.integration.config.ts

# === E2E テスト / 端到端测试 ===
npx playwright test
npx playwright test --ui                        # UI モード / UI 模式

# === パフォーマンステスト / 性能测试 ===
k6 run k6/load-test.js

# === セキュリティテスト / 安全测试 ===
npm audit
```

---

## 参考ファイル / 参考文件

| ファイル / 文件 | 説明 / 说明 |
|---|---|
| `backend/vitest.config.ts` | バックエンドユニットテスト設定 / 后端单元测试配置 |
| `backend/vitest.integration.config.ts` | インテグレーションテスト設定 / 集成测试配置 |
| `frontend/vitest.config.ts` | フロントエンドテスト設定 / 前端测试配置 |
| `playwright.config.ts` | Playwright E2E テスト設定 / E2E 测试配置 |
| `.github/workflows/ci.yml` | CI パイプライン / CI 流水线 |
| `k6/` | パフォーマンステストスクリプト / 性能测试脚本 |
| `backend/src/test/factories/` | テストデータファクトリ / 测试数据工厂 |
