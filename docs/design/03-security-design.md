# セキュリティ設計書 / 安全设计文档

> 対象読者: 新規開発者 / 目标读者: 新加入的开发者
>
> 最終更新 / 最后更新: 2026-03-21
>
> アーキテクチャ: NestJS 11 + PostgreSQL 16 (Supabase) + Drizzle ORM

---

## 目次 / 目录

1. [認証方式（Supabase Auth）](#1-認証方式supabase-auth--认证方式)
2. [認可（3 層ガード）](#2-認可3-層ガード--授权3-层守卫)
3. [マルチテナント分離](#3-マルチテナント分離--多租户隔离)
4. [パスワードセキュリティ](#4-パスワードセキュリティ--密码安全)
5. [レートリミット](#5-レートリミット--速率限制)
6. [SSRF 防御](#6-ssrf-防御--ssrf-防护)
7. [セキュリティヘッダー](#7-セキュリティヘッダー--安全头)
8. [入力バリデーション](#8-入力バリデーション--输入验证)
9. [監査ログ](#9-監査ログ--审计日志)
10. [シークレット管理](#10-シークレット管理--密钥管理)
11. [CORS](#11-cors)
12. [OWASP Top 10 対策](#12-owasp-top-10-対策--owasp-top-10-防护)

---

## 1. 認証方式（Supabase Auth）/ 认证方式

### JWT ベース認証 / 基于 JWT 的认证

```
[クライアント] → POST /api/auth/login { email, password }
               → Supabase Auth で認証 / 通过 Supabase Auth 认证
               ← { access_token, refresh_token, user }

[後続リクエスト] → Authorization: Bearer <access_token>
                → AuthGuard で Supabase JWT を検証 / AuthGuard 验证 Supabase JWT
                ← req.user に注入 / 注入到 req.user
```

### Supabase Auth の機能 / Supabase Auth 功能

| 機能 / 功能 | 説明 / 说明 |
|---|---|
| **JWT 発行・検証** | Supabase が JWT を発行、NestJS AuthGuard が検証 / Supabase 发行 JWT，AuthGuard 验证 |
| **app_metadata** | `tenant_id` と `role` を JWT の `app_metadata` に格納 / 在 app_metadata 中存储 tenant_id 和 role |
| **リフレッシュトークン** | 自動トークンリフレッシュ / 自动令牌刷新 |
| **メール認証** | サインアップ時のメール確認 / 注册时的邮件验证 |
| **MFA** | TOTP ベースの多要素認証 / 基于 TOTP 的多因素认证 |

### JWT ペイロード / JWT 载荷

```json
{
  "sub": "uuid-of-user",
  "email": "user@example.com",
  "app_metadata": {
    "tenant_id": "uuid-of-tenant",
    "role": "admin",
    "warehouse_ids": ["uuid-1", "uuid-2"]
  },
  "exp": 1234567890
}
```

### ポータル認証 / 门户认证

荷主（client ロール）向けの `PortalAuthController` を提供。
为货主（client 角色）提供独立的 `PortalAuthController`。

- 専用ログインエンドポイント / 专用登录端点
- client ロール限定のアクセス / 仅限 client 角色访问
- テナント内の自社データのみ閲覧可能 / 仅可查看本租户自社数据

---

## 2. 認可（3 層ガード）/ 授权（3 层守卫）

### ガードパイプライン / 守卫管道

```
リクエスト → AuthGuard → TenantGuard → RoleGuard → Controller
请求       → 认证守卫   → 租户守卫     → 角色守卫   → 控制器
```

### AuthGuard（認証ガード / 认证守卫）

```typescript
// Supabase JWT を検証し、req.user にユーザー情報を注入
// 验证 Supabase JWT，将用户信息注入 req.user
@UseGuards(AuthGuard)
```

- Supabase JWT の署名・有効期限を検証 / 验证 Supabase JWT 签名和有效期
- 無効・期限切れトークンは **401 Unauthorized** / 无效或过期令牌返回 401
- `@CurrentUser()` デコレータでユーザー情報取得 / 通过装饰器获取用户信息

### TenantGuard（テナントガード / 租户守卫）

```typescript
// JWT の app_metadata.tenant_id を req に注入し、
// 以降のクエリで自動的にテナントフィルタを適用
// 从 JWT 的 app_metadata 中提取 tenant_id 注入请求
@UseGuards(TenantGuard)
```

- `app_metadata.tenant_id` を抽出 / 提取 tenant_id
- テナント ID なしのリクエストは **403 Forbidden** / 无 tenant_id 返回 403
- `@TenantId()` デコレータで取得可能 / 通过装饰器获取

### RoleGuard（ロールガード / 角色守卫）

```typescript
// 指定ロール以上のアクセスのみ許可
// 仅允许指定角色以上的访问
@Roles('admin', 'manager')
@UseGuards(RoleGuard)
```

### ロール階層 / 角色层级

```
admin            テナント内全権限 / 租户内全权限
  ├── manager    承認・レポート / 审批・报表
  ├── operator   倉庫オペレーション / 仓库操作
  ├── viewer     閲覧のみ / 仅查看
  └── client     荷主ポータル / 货主门户
```

---

## 3. マルチテナント分離 / 多租户隔离

### 2 層分離戦略 / 双层隔离策略

| 層 / 层 | 方式 / 方式 | 説明 / 说明 |
|---|---|---|
| **アプリケーション層** | WHERE `tenant_id = ?` | Repository 基底クラスが全クエリに自動付与 / Base Repository 自动附加 |
| **データベース層** | PostgreSQL RLS | セーフティネットとして RLS ポリシーを設定 / 作为安全网设置 RLS 策略 |

### アプリケーション層（主要な分離手段）/ 应用层（主要隔离手段）

```typescript
// BaseRepository が全クエリに tenant_id を自動付与
// BaseRepository 自动在所有查询中附加 tenant_id
export abstract class BaseRepository<T> {
  async findAll(tenantId: string, filters?: Partial<T>): Promise<T[]> {
    return this.db
      .select()
      .from(this.table)
      .where(and(eq(this.table.tenantId, tenantId), ...filterConditions));
  }
}
```

### RLS（セーフティネット）/ RLS（安全网）

```sql
-- 全テーブルに適用する RLS ポリシー / 应用于所有表的 RLS 策略
ALTER TABLE inbound_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON inbound_orders
  USING (tenant_id = (current_setting('app.tenant_id'))::uuid);

-- NestJS から Drizzle 経由で設定 / 通过 NestJS + Drizzle 设置
-- SET LOCAL app.tenant_id = 'uuid-of-tenant';
```

> **設計判断 / 设计决策**: アプリケーション層の WHERE フィルタが主要な分離手段。
> RLS はアプリケーションバグに対するセーフティネットとして機能する。
> 应用层 WHERE 过滤是主要隔离手段。RLS 作为应用层 bug 的安全网。

---

## 4. パスワードセキュリティ / 密码安全

| 項目 / 项目 | 値 / 值 |
|---|---|
| **アルゴリズム** | PBKDF2 SHA-512 |
| **イテレーション回数** | 210,000 回 |
| **ソルト** | ランダム生成、ユーザーごとに一意 / 随机生成，每用户唯一 |
| **保存先** | Supabase Auth（Supabase が管理）/ Supabase Auth 管理 |

> Supabase Auth がパスワードハッシュを管理するため、アプリケーションコードで
> 直接パスワードを保存・検証することはない。
> Supabase Auth 管理密码哈希，应用代码不直接存储或验证密码。

---

## 5. レートリミット / 速率限制

NestJS の `@nestjs/throttler` で実装。
通过 `@nestjs/throttler` 实现。

| プリセット / 预设 | 対象 / 目标 | 制限 / 限制 | ウィンドウ / 时间窗口 |
|---|---|---|---|
| **global** | 全 API エンドポイント | 1000 req | 15 分 |
| **auth** | 認証エンドポイント (`/auth/*`) | 20 req | 15 分 |
| **write** | 書き込み操作 (POST/PUT/DELETE) | 200 req | 15 分 |

### 特記事項 / 注意事项

- **ヘルスチェック除外**: `/health`, `/health/liveness` はレートリミットから除外
  健康检查排除在速率限制外
- **標準ヘッダー**: `RateLimit-*` レスポンスヘッダーを返す
  返回 RateLimit-* 响应头
- **開発環境**: `NODE_ENV === 'development'` 時はスキップ可能（設定依存）
  开发环境可跳过（取决于配置）

---

## 6. SSRF 防御 / SSRF 防护

Webhook URL に対する SSRF 防御を実装。
对 Webhook URL 实施 SSRF 防护。

| 対策 / 措施 | 説明 / 说明 |
|---|---|
| **URL ホワイトリスト** | 許可されたドメイン/IP のみ接続 / 仅允许连接白名单域名/IP |
| **プライベート IP 拒否** | `10.x`, `172.16.x`, `192.168.x`, `127.0.0.1` 等を拒否 / 拒绝内网 IP |
| **リダイレクト制限** | HTTP リダイレクトの追跡を制限 / 限制 HTTP 重定向跟踪 |
| **タイムアウト** | 外部リクエストにタイムアウトを設定 / 设置外部请求超时 |

---

## 7. セキュリティヘッダー / 安全头

### Helmet（NestJS Fastify 互換）/ Helmet (Fastify 兼容)

```typescript
// main.ts
import helmet from '@fastify/helmet';
app.register(helmet, {
  contentSecurityPolicy: false, // Vue SPA のため無効化 / 因 Vue SPA 禁用
});
```

### Nginx 追加ヘッダー / Nginx 附加头

| ヘッダー / 头 | 値 / 值 | 説明 / 说明 |
|---|---|---|
| `X-Frame-Options` | `DENY` | クリックジャッキング防止 / 防止点击劫持 |
| `X-Content-Type-Options` | `nosniff` | MIME スニッフィング防止 / 防止 MIME 嗅探 |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | HSTS 強制 / 强制 HSTS |
| `X-XSS-Protection` | `1; mode=block` | XSS フィルタ有効化 / 启用 XSS 过滤 |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | リファラーポリシー / 引用策略 |

---

## 8. 入力バリデーション / 输入验证

### 2 層バリデーション / 双层验证

| 層 / 层 | 技術 / 技术 | 説明 / 说明 |
|---|---|---|
| **NestJS ValidationPipe** | class-validator + class-transformer | DTO レベルの自動バリデーション / DTO 级自动验证 |
| **Zod スキーマ** | Zod 3.x | 複雑なビジネスルールのバリデーション / 复杂业务规则验证 |

### 実装パターン / 实现模式

```typescript
// DTO バリデーション（NestJS 標準）/ DTO 验证（NestJS 标准）
@Post()
async create(@Body() dto: CreateInboundOrderDto) {
  // ValidationPipe が自動的にバリデーション
  // ValidationPipe 自动验证
}

// Zod バリデーション（複雑なビジネスルール）/ Zod 验证（复杂业务规则）
const result = shipmentSchema.safeParse(data);
if (!result.success) throw new BadRequestException(result.error);
```

### バリデーションエラー応答 / 验证错误响应

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    { "field": "quantity", "message": "数量は正の整数である必要があります / 数量必须是正整数" }
  ]
}
```

---

## 9. 監査ログ / 审计日志

### ドメインイベント → BullMQ → operation_logs / 领域事件 → BullMQ → operation_logs

全ミューテーション（作成・更新・削除）をドメインイベント経由で非同期ログ記録。
所有变更操作（创建、更新、删除）通过领域事件异步记录日志。

```
Service でミューテーション実行
  → EventEmitter2.emit('audit.created', payload)
  → BullMQ audit キューにジョブ投入
  → AuditProcessor が operation_logs テーブルに INSERT
```

### operation_logs テーブル / 表结构

```sql
CREATE TABLE operation_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL,
  user_id     UUID NOT NULL,
  action      VARCHAR(50) NOT NULL,  -- create, update, delete
  resource    VARCHAR(100) NOT NULL, -- inbound_orders, shipment_orders, ...
  resource_id UUID,
  details     JSONB,                 -- { before: {...}, after: {...} }
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);  -- 月次パーティション / 月度分区
```

### ログ種別 / 日志类型

| ログ / 日志 | 保存先 / 存储 | 内容 / 内容 | TTL |
|---|---|---|---|
| `operation_logs` | PostgreSQL (パーティション) | ユーザー操作 (CRUD) / 用户操作 | 180 日 |
| `api_logs` | PostgreSQL (パーティション) | 外部 API 呼び出し (B2 Cloud 等) / 外部 API 调用 | 180 日 |
| アプリケーションログ / 应用日志 | stdout (Pino) | サーバー実行ログ / 服务器运行日志 | インフラ依存 |

### 閲覧方法 / 查看方式

- **設定 > 管理・ログ > 操作ログ** (`/settings/operation-logs`)
  设置 > 管理・日志 > 操作日志
- **設定 > 管理・ログ > API 連携ログ** (`/settings/api-logs`)
  设置 > 管理・日志 > API 连携日志

---

## 10. シークレット管理 / 密钥管理

### 環境変数（ハードコードデフォルト値なし）/ 环境变量（无硬编码默认值）

| 変数 / 变量 | 用途 / 用途 | 必須 / 必须 |
|---|---|---|
| `SUPABASE_URL` | Supabase プロジェクト URL | 必須 |
| `SUPABASE_ANON_KEY` | Supabase 匿名キー / 匿名密钥 | 必須 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role キー / 服务角色密钥 | 必須 |
| `DATABASE_URL` | PostgreSQL 接続文字列 / 连接串 | 必須 |
| `REDIS_URL` | Redis 接続文字列 / 连接串 | 必須 |
| `NODE_ENV` | 実行環境 / 运行环境 | 必須 (production/development) |
| `CORS_ORIGIN` | 許可オリジン / 允许的源 | 本番推奨 / 生产推荐 |

### セキュリティ原則 / 安全原则

- **ハードコード禁止**: シークレットをソースコードに含めない / 禁止在源码中包含密钥
- **デフォルト値なし**: 本番環境でフォールバック値を使用しない / 生产环境不使用回退值
- **起動時検証**: Zod スキーマで全環境変数を起動時に検証（`config/env.schema.ts`）
  启动时通过 Zod schema 验证所有环境变量
- **service_role キー**: サーバーサイドのみで使用、フロントエンドに露出しない
  仅在服务端使用，不暴露给前端

---

## 11. CORS

### 設定可能な許可オリジン / 可配置的允许源

```typescript
// config/cors.ts
{
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:4001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Warehouse-Id'],
}
```

- 本番環境では許可オリジンを明示的に指定 / 生产环境明确指定允许的源
- `credentials: true` で認証ヘッダー送信を許可 / 允许发送认证头
- `X-Warehouse-Id` カスタムヘッダーを許可 / 允许自定义仓库选择头

---

## 12. OWASP Top 10 対策 / OWASP Top 10 防护

### A01: アクセス制御の不備 / 失效的访问控制

- [x] 3 層ガード: AuthGuard → TenantGuard → RoleGuard
- [x] テナント ID によるデータ分離（アプリ層 + RLS）/ 通过 tenant_id 隔离数据
- [x] Repository 基底クラスで tenant_id 自動付与 / Base Repository 自动附加 tenant_id

### A02: 暗号化の失敗 / 加密失败

- [x] パスワードは Supabase Auth (PBKDF2 SHA-512 210K iterations) でハッシュ
- [x] JWT は Supabase の秘密鍵で署名 / JWT 由 Supabase 密钥签名
- [x] HTTPS は Nginx/Cloudflare で終端 / HTTPS 通过反向代理终端

### A03: インジェクション / 注入

- [x] Drizzle ORM: パラメータ化クエリのみ。直接 SQL 文字列連結なし
  Drizzle ORM：仅参数化查询，无直接 SQL 拼接
- [x] NestJS ValidationPipe + Zod で全入力を検証 / 验证所有输入
- [x] Vue テンプレートはデフォルトで HTML エスケープ。`v-html` は極力不使用
  Vue 模板默认 HTML 转义

### A04: 安全でない設計 / 不安全的设计

- [x] RBAC（ロールベースアクセス制御）で権限を体系的に管理
- [x] 最小権限の原則: operator/viewer は必要最小限の操作のみ / 最小权限原则

### A05: セキュリティの設定ミス / 安全配置错误

- [x] Helmet で HTTP ヘッダーを自動設定 / 通过 Helmet 自动设置
- [x] 環境変数の起動時検証（Zod スキーマ）/ 启动时验证环境变量
- [x] エラーメッセージは本番では詳細を隠蔽 / 生产环境隐藏错误详情

### A06: 脆弱で古いコンポーネント / 易受攻击和过时的组件

- [x] `npm audit` で定期的に脆弱性チェック / 定期检查漏洞
- [x] CI/CD パイプラインで自動チェック（GitHub Actions）/ CI/CD 自动检查
- [x] Dependabot / Snyk による自動 PR / 自动漏洞修复 PR

### A07: 認証の失敗 / 身份验证失败

- [x] `authLimiter` (20 req/15min) でブルートフォース攻撃を防止 / 防止暴力破解
- [x] Supabase Auth のリフレッシュトークンで安全なセッション管理 / 安全会话管理
- [x] MFA (TOTP) サポート / 多因素认证支持

### A08: ソフトウェアとデータの整合性の失敗 / 软件和数据完整性失败

- [x] Supabase JWT 署名検証で改ざんを検知 / 通过 JWT 签名检测篡改
- [x] PostgreSQL トランザクションでデータ整合性を保証 / 通过事务保证数据完整性

### A09: セキュリティログとモニタリングの失敗 / 安全日志和监控失败

- [x] 全ミューテーションを `operation_logs` に記録 / 记录所有变更到 operation_logs
- [x] 外部 API 呼び出しを `api_logs` に記録 / 记录外部 API 调用到 api_logs
- [x] Pino 構造化ログで異常検知 / 通过 Pino 结构化日志检测异常

### A10: SSRF (サーバーサイドリクエストフォージェリ) / 服务器端请求伪造

- [x] Webhook URL のホワイトリスト制御 / Webhook URL 白名单控制
- [x] プライベート IP アドレスへのリクエスト拒否 / 拒绝向内网 IP 发送请求
- [x] 外部 API 呼び出し (B2 Cloud 等) はサーバーサイドで実行 / 外部 API 调用在服务端执行

---

## クイックリファレンス: NestJS セキュリティパイプライン
## 快速参考: NestJS 安全管道

```typescript
// main.ts — グローバル設定 / 全局设置
app.register(helmet);                              // 1. HTTP ヘッダー保護
app.enableCors(corsOptions);                       // 2. CORS 設定
app.useGlobalPipes(new ValidationPipe());          // 3. グローバルバリデーション
app.useGlobalFilters(new AllExceptionsFilter());   // 4. 例外フィルタ
app.useGlobalInterceptors(new TransformInterceptor()); // 5. レスポンス整形

// コントローラー — エンドポイント保護 / 控制器 — 端点保护
@Controller('inbound-orders')
@UseGuards(AuthGuard, TenantGuard)                 // 6. 認証 + テナント
export class InboundController {

  @Post('receive')
  @Roles('admin', 'manager', 'operator')           // 7. ロール制限
  @UseGuards(RoleGuard)
  @Throttle({ default: { limit: 200, ttl: 900 } }) // 8. レートリミット
  async receive(@Body() dto: ReceiveDto, @TenantId() tenantId: string) {
    return this.inboundService.receive(tenantId, dto);
  }
}
```

この順序により、未認証リクエストは早期に拒否され、不要な処理コストを回避できる。
通过此顺序，未认证请求会被提前拒绝，避免不必要的处理开销。

---

> **最終更新 / 最后更新**: 2026-03-21
> **関連ドキュメント / 相关文档**: `docs/migration/03-backend-architecture.md`, `docs/design/00-system-overview.md`
