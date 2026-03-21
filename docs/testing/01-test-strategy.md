# テスト戦略ガイド / 测试策略指南

> ZELIXWMS のテスト構成・実行方法・カバレッジ目標・CI 統合。
> ZELIXWMS 的测试配置、执行方式、覆盖率目标、CI 集成。

---

## 1. テスト構成 / 测试配置

### 概要 / 概览

| 領域 / 领域 | フレームワーク | テスト数 | 環境 |
|---|---|---|---|
| **Backend** | Vitest 4.x | ~1454 テスト | Node.js (`environment: 'node'`) |
| **Frontend** | Vitest 4.x | ~353 テスト | jsdom (`environment: 'jsdom'`) |
| **合計 / 总计** | | **~1807 テスト** | |

### Backend テスト設定 / 后端测试配置

**ファイル**: `backend/vitest.config.ts`

```typescript
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
    },
  },
});
```

### Frontend テスト設定 / 前端测试配置

**ファイル**: `frontend/vitest.config.ts`

```typescript
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts', 'src/**/*.vue'],
      exclude: ['src/**/*.test.ts'],
    },
  },
});
```

---

## 2. テストカテゴリ / 测试类别

### ユニットテスト / 单元测试

個別の関数・サービス・ユーティリティを単体でテスト。
对单个函数、服务、工具进行独立测试。

| 層 / 层 | テストファイル例 | テスト対象 / 测试目标 |
|---|---|---|
| Service | `services/__tests__/inventoryService.test.ts` | ビジネスロジック / 业务逻辑 |
| Utility | `utils/__tests__/naturalSort.test.ts` | ユーティリティ関数 / 工具函数 |
| Middleware | `middleware/__tests__/auth.test.ts` | 認証・認可 / 认证授权 |
| Model | `lib/errors.test.ts` | エラーハンドリング / 错误处理 |

### インテグレーションテスト / 集成测试

コントローラーからサービスまでのフローをテスト。
测试从控制器到服务的完整流程。

| テストファイル例 | テスト対象 |
|---|---|
| `controllers/__tests__/shipmentOrderController.test.ts` | 出荷指示 API |
| `controllers/__tests__/inventoryController.test.ts` | 在庫管理 API |
| `controllers/__tests__/inboundController.test.ts` | 入庫 API |
| `controllers/__tests__/billingController.test.ts` | 課金 API |
| `graphql/__tests__/resolvers.test.ts` | GraphQL リゾルバー |
| `graphql/__tests__/mutations.test.ts` | GraphQL ミューテーション |

### E2E テスト / 端到端测试

業務フロー全体をシミュレーション。
模拟完整业务流程。

| テストファイル | 内容 / 内容 |
|---|---|
| `services/__tests__/e2e-warehouse-flow.test.ts` | 倉庫業務フロー全体（16 ステップ）/ 完整仓库业务流程 |

### フロントエンドテスト / 前端测试

Vue コンポーネントとユーティリティのテスト。
Vue 组件和工具函数的测试。

| テストファイル例 | テスト対象 |
|---|---|
| `components/__tests__/ErrorBoundary.test.ts` | エラーバウンダリコンポーネント |
| `components/__tests__/Table.test.ts` | テーブルコンポーネント |
| `views/shipment-orders/__tests__/ShipmentOrderCreate.test.ts` | 出荷指示作成画面 |
| `composables/__tests__/useToast.test.ts` | Toast 通知 composable |
| `utils/__tests__/orderValidation.test.ts` | 注文バリデーション |

---

## 3. テスト実行方法 / 测试执行方式

### バックエンド / 后端

```bash
# 全テスト実行 / 执行所有测试
cd backend && npx vitest run

# ウォッチモード（ファイル変更で自動実行）/ 监听模式（文件变更自动执行）
cd backend && npx vitest

# カバレッジ付き / 含覆盖率
cd backend && npx vitest run --coverage

# 特定ファイルのみ / 仅执行特定文件
cd backend && npx vitest run src/services/__tests__/inventoryService.test.ts

# パターンでフィルタ / 按模式筛选
cd backend && npx vitest run --grep "outbound"
```

### フロントエンド / 前端

```bash
# 全テスト実行
cd frontend && npx vitest run

# ウォッチモード
cd frontend && npx vitest

# カバレッジ付き
cd frontend && npx vitest run --coverage
```

### npm スクリプト経由 / 通过 npm 脚本

```bash
# バックエンド（package.json に定義済み）
cd backend
npm test             # vitest run
npm run test:watch   # vitest（ウォッチモード）
npm run test:coverage # vitest run --coverage
```

### 型チェック / 类型检查

```bash
# バックエンド
cd backend && npx tsc --noEmit

# フロントエンド
cd frontend && npx vue-tsc --build

# Admin
cd admin && npx vue-tsc --build

# Portal
cd portal && npx vue-tsc --build
```

---

## 4. カバレッジ目標 / 覆盖率目标

### 全体目標 / 整体目标

| 領域 | 最低カバレッジ / 最低覆盖率 | 備考 / 备注 |
|---|---|---|
| 全体 / 全体 | **80%** | 必達目標 / 必须达成 |
| クリティカルパス | **100%** | 入出庫・在庫管理・課金 |

### クリティカルパスの定義 / 关键路径定义

以下のモジュールは 100% カバレッジを目指す。
以下模块目标 100% 覆盖率。

| モジュール | 理由 / 理由 |
|---|---|
| `inventoryService` | 在庫の正確性が業務の根幹 / 库存准确性是业务根本 |
| `outboundWorkflow` | 出荷ミスは直接的な損害 / 发货错误直接造成损失 |
| `inboundWorkflow` | 入庫ミスは在庫差異に直結 / 入库错误直接导致库存差异 |
| `chargeService` | 課金の正確性 / 计费准确性 |
| `auth middleware` | 認証・認可の安全性 / 认证授权安全性 |

### カバレッジレポーター / 覆盖率报告

| レポーター | 用途 / 用途 |
|---|---|
| `text` | コンソール出力（CI + ローカル）/ 控制台输出 |
| `lcov` | HTML レポート + CI 統合 / HTML 报告 + CI 集成 |

---

## 5. モック戦略 / Mock 策略

### vi.mock によるモジュールモック / 使用 vi.mock 进行模块 Mock

```typescript
// MongoDB モデルのモック例 / MongoDB 模型 Mock 示例
vi.mock('@/models/product', () => ({
  Product: {
    find: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    updateOne: vi.fn(),
  },
}));

// サービスのモック例 / 服务 Mock 示例
vi.mock('@/services/notificationService', () => ({
  sendNotification: vi.fn(),
}));
```

### モック対象の原則 / Mock 原则

| モックする / 需要 Mock | モックしない / 不需要 Mock | 理由 / 理由 |
|---|---|---|
| MongoDB モデル | ビジネスロジック | DB 依存を排除 / 排除数据库依赖 |
| 外部 API（B2 Cloud 等）| バリデーション関数 | 外部依存を排除 / 排除外部依赖 |
| Redis / BullMQ | ユーティリティ関数 | インフラ依存を排除 / 排除基础设施依赖 |
| nodemailer | 純粋関数 | I/O を排除 / 排除 I/O |

### Vitest グローバル設定 / Vitest 全局设置

`vitest.config.ts` で `globals: true` 設定済みのため、`describe`, `it`, `expect`, `vi` はインポート不要。
已在 `vitest.config.ts` 中设置 `globals: true`，无需导入 `describe`, `it`, `expect`, `vi`。

---

## 6. E2E テスト / 端到端测试

### バックエンド E2E / 后端 E2E

`e2e-warehouse-flow.test.ts` で 16 ステップの完全な倉庫業務フローをテスト。
在 `e2e-warehouse-flow.test.ts` 中测试 16 步完整仓库业务流程。

テストフロー / 测试流程:
1. 商品登録 / 商品注册
2. 入庫予定作成 / 创建入库预定
3. 入庫受取 / 入库接收
4. 棚入れ / 上架
5. 在庫確認 / 库存确认
6. 出荷指示作成 / 创建出库指示
7. ピッキング / 拣货
8. 検品 / 验货
9. 出荷確定 / 出库确认
10. ... 返品・在庫調整等 / 退货、库存调整等

### ブラウザ E2E（Playwright）/ 浏览器 E2E

Playwright の設定ファイルが存在。ブラウザベースの E2E テスト用。
Playwright 配置文件已存在，用于浏览器端的端到端测试。

```bash
# Playwright テスト実行（設定があれば）
npx playwright test
```

---

## 7. テストデータ / 测试数据

### シードスクリプト / 种子脚本

| スクリプト | 内容 / 内容 |
|---|---|
| `npm run seed` | 配送業者・マッピング・帳票テンプレート / 运输商、映射、单据模板 |
| `npm run seed:b2-mapping` | B2 Cloud マッピング設定 / B2 Cloud 映射配置 |

**ファイル一覧 / 文件列表** (`backend/src/scripts/seeds/`):
- `seedCarriers.ts` - 配送業者 / 运输商
- `seedMappingConfigs.ts` - マッピング設定 / 映射配置
- `seedPrintTemplates.ts` - 帳票テンプレート / 单据模板
- `seedFormTemplates.ts` - フォームテンプレート / 表单模板
- `inboundPrintTemplates.ts` - 入庫帳票テンプレート / 入库单据模板
- `seedProducts.ts` - 商品マスタ / 商品主数据
- `utils.ts` - シード共通ユーティリティ / 种子通用工具

### テスト内のデータ生成パターン / 测试中的数据生成模式

```typescript
// ファクトリパターン例 / 工厂模式示例
function createMockProduct(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    sku: 'TEST-SKU-001',
    name: 'テスト商品',
    minStockLevel: 10,
    ...overrides,
  };
}

// テスト内での使用 / 在测试中使用
it('should detect low stock', () => {
  const product = createMockProduct({ minStockLevel: 5 });
  // ...
});
```

### テストの独立性 / 测试独立性

- 各テストは独立して実行可能 / 每个测试可独立执行
- `beforeEach` / `afterEach` で状態をリセット / 在每次测试前后重置状态
- モックは各テストで明示的にセットアップ / 每个测试明确设置 Mock
- テスト間でデータを共有しない / 测试之间不共享数据

---

## 8. CI でのテスト / CI 中的测试

### GitHub Actions 統合 / GitHub Actions 集成

**ファイル**: `.github/workflows/ci.yml`

### 実行タイミング / 执行时机

| イベント | ブランチ | 実行内容 |
|---|---|---|
| `push` | `main`, `develop` | 型チェック + ユニットテスト |
| `pull_request` | `main` | 型チェック + ユニットテスト |

### CI テスト実行フロー / CI 测试执行流程

```
1. actions/checkout@v4
2. actions/setup-node@v4 (Node 20, npm cache)
3. npm ci (ルートワークスペース)
4. Backend: tsc --noEmit (型チェック / 类型检查)
5. Backend: vitest run (ユニットテスト / 单元测试)
6. Frontend: vitest run (ユニットテスト)
7. Frontend: vue-tsc --build (型チェック)
8. Admin: vue-tsc --build (型チェック)
9. Portal: vue-tsc --build (型チェック)
```

### 並行実行の最適化 / 并行执行优化

同一ブランチの重複実行はキャンセルされる（`concurrency` 設定）。
同一分支的重复执行会被取消（`concurrency` 设置）。

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

### テスト失敗時の対応 / 测试失败时的处理

1. CI のログで失敗したテストを確認 / 查看 CI 日志中失败的测试
2. ローカルで再現 / 在本地复现:
   ```bash
   cd backend && npx vitest run --reporter verbose
   ```
3. 失敗テストを個別に実行 / 单独执行失败的测试:
   ```bash
   npx vitest run src/services/__tests__/failingTest.test.ts
   ```
4. テスト自体が正しいか確認（実装バグか、テストバグか）
   确认测试本身是否正确（是实现 bug 还是测试 bug）

---

## 参考ファイル / 参考文件

| ファイル | 説明 |
|---|---|
| `backend/vitest.config.ts` | バックエンドテスト設定 / 后端测试配置 |
| `frontend/vitest.config.ts` | フロントエンドテスト設定 / 前端测试配置 |
| `.github/workflows/ci.yml` | CI パイプライン / CI 流水线 |
| `backend/src/scripts/seed.ts` | シードデータスクリプト / 种子数据脚本 |
| `backend/src/services/__tests__/e2e-warehouse-flow.test.ts` | E2E 業務フローテスト |
