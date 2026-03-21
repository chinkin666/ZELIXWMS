# 認証・認可・マルチテナント設計書 / 认证・授权・多租户设计文档

> 対象読者: 開発チーム全員 / 目标读者: 全体开发团队
>
> 最終更新 / 最后更新: 2026-03-21
>
> アーキテクチャ: NestJS 11 + PostgreSQL 16 (Supabase) + Drizzle ORM
>
> ステータス / 状态: **ADR-005 Accepted**

---

## 目次 / 目录

1. [認証アーキテクチャ / 认证架构](#1-認証アーキテクチャ--认证架构)
2. [認可アーキテクチャ / 授权架构](#2-認可アーキテクチャ--授权架构)
3. [マルチテナント完全設計 / 多租户完整设计](#3-マルチテナント完全設計--多租户完整设计)
4. [RLS ポリシー全表 / RLS 策略全表](#4-rls-ポリシー全表--rls-策略全表)
5. [セキュリティ攻撃防護マトリクス / 安全攻击防护矩阵](#5-セキュリティ攻撃防護マトリクス--安全攻击防护矩阵)
6. [API キー機構 / API Key 机制](#6-api-キー機構--api-key-机制)
7. [現行システムからの移行 / 从现有系统迁移](#7-現行システムからの移行--从现有系统迁移)

---

## 1. 認証アーキテクチャ / 认证架构

### 1.1 Supabase Auth 統合フロー / Supabase Auth 集成流程

```
┌─────────────┐       ┌──────────────┐       ┌──────────────────┐       ┌────────────┐
│  Vue 3 SPA  │       │  NestJS API  │       │  Supabase Auth   │       │ PostgreSQL │
│  (Frontend) │       │  (Backend)   │       │  (IdP)           │       │ (Supabase) │
└──────┬──────┘       └──────┬───────┘       └────────┬─────────┘       └─────┬──────┘
       │                     │                        │                       │
       │  1. POST /api/auth/login                     │                       │
       │     {email, password}                        │                       │
       │────────────────────>│                        │                       │
       │                     │  2. supabase.auth       │                       │
       │                     │     .signInWithPassword │                       │
       │                     │───────────────────────>│                       │
       │                     │                        │  3. Verify credentials│
       │                     │                        │  ────────────────────>│
       │                     │                        │  <────────────────────│
       │                     │                        │  4. password_hash OK  │
       │                     │  5. {access_token,     │                       │
       │                     │      refresh_token,    │                       │
       │                     │      user}             │                       │
       │                     │<───────────────────────│                       │
       │                     │                        │                       │
       │                     │  6. Enrich app_metadata│                       │
       │                     │     (tenant_id, role,  │                       │
       │                     │      warehouse_ids)    │                       │
       │                     │───────────────────────>│                       │
       │                     │                        │                       │
       │  7. {access_token, refresh_token, user}      │                       │
       │<────────────────────│                        │                       │
       │                     │                        │                       │
       │  8. GET /api/products                        │                       │
       │     Authorization: Bearer <access_token>     │                       │
       │────────────────────>│                        │                       │
       │                     │  9. Verify JWT (RS256) │                       │
       │                     │     Extract claims     │                       │
       │                     │  10. SET LOCAL          │                       │
       │                     │      app.tenant_id     │                       │
       │                     │───────────────────────────────────────────────>│
       │                     │  11. SELECT * FROM      │                       │
       │                     │      products           │                       │
       │                     │      (RLS enforced)     │                       │
       │                     │<──────────────────────────────────────────────│
       │  12. {data: [...]}  │                        │                       │
       │<────────────────────│                        │                       │
```

### 1.2 JWT トークン構造 / JWT 令牌结构

#### ヘッダー / Header

```json
{
  "alg": "RS256",
  "typ": "JWT",
  "kid": "supabase-key-id-xxxx"
}
```

> **設計決定 / 设计决策**: RS256（非対称署名）を採用。
> 現行 Express システムは HS256（対称鍵）だが、NestJS 移行で RS256 に変更する。
> 当前 Express 系统使用 HS256（对称密钥），NestJS 迁移时切换到 RS256。
>
> | 比較 / 比较 | HS256 (現行) | RS256 (移行後) |
> |---|---|---|
> | 鍵の種類 / 密钥类型 | 共有シークレット / 共享密钥 | 公開鍵 + 秘密鍵 / 公钥 + 私钥 |
> | 署名者 / 签名者 | API サーバー / API 服务器 | Supabase Auth のみ / 仅 Supabase Auth |
> | 検証者 / 验证者 | API サーバー / API 服务器 | 公開鍵を持つ全サービス / 持有公钥的所有服务 |
> | 鍵漏洩リスク / 密钥泄露风险 | 高（偽造可能）/ 高（可伪造） | 低（公開鍵では偽造不可）/ 低（公钥无法伪造） |
> | マイクロサービス / 微服务 | 全サービスに秘密鍵が必要 / 所有服务需要密钥 | 公開鍵のみ配布 / 仅分发公钥 |

#### ペイロード / Payload

```json
{
  "aud": "authenticated",
  "exp": 1711234567,
  "iat": 1711230967,
  "iss": "https://<project>.supabase.co/auth/v1",
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "app_metadata": {
    "tenant_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "role": "admin",
    "warehouse_ids": [
      "11111111-1111-1111-1111-111111111111",
      "22222222-2222-2222-2222-222222222222"
    ],
    "client_id": null
  },
  "user_metadata": {
    "display_name": "田中太郎",
    "language": "ja",
    "avatar": null
  }
}
```

| クレーム / Claim | 型 / 型 | 説明 / 说明 |
|---|---|---|
| `sub` | UUID | Supabase Auth ユーザー ID / 用户 ID |
| `email` | string | メールアドレス / 邮箱地址 |
| `app_metadata.tenant_id` | UUID | テナント ID（RLS で使用）/ 租户 ID（用于 RLS） |
| `app_metadata.role` | enum | `admin\|manager\|operator\|viewer\|client` |
| `app_metadata.warehouse_ids` | UUID[] | アクセス可能な倉庫（空=全倉庫）/ 可访问仓库（空=全部） |
| `app_metadata.client_id` | UUID? | client ロール時の荷主 ID / client 角色时的货主 ID |
| `user_metadata.display_name` | string | 表示名 / 显示名 |
| `exp` | number | 有効期限（発行から 1 時間）/ 过期时间（发行后 1 小时） |
| `iat` | number | 発行日時 / 发行时间 |

### 1.3 トークンライフサイクル / 令牌生命周期

```
[ログイン / 登录]
    │
    ├─ Supabase Auth が access_token (1h) + refresh_token (30d) を発行
    │  Supabase Auth 发行 access_token (1h) + refresh_token (30d)
    │
    ▼
[アクセス / 访问]
    │
    ├─ 全リクエストに Authorization: Bearer <access_token> を付与
    │  所有请求附加 Authorization: Bearer <access_token>
    ├─ AuthGuard が署名 + 有効期限を検証 / AuthGuard 验证签名 + 有效期
    │
    ▼
[リフレッシュ / 刷新]
    │
    ├─ access_token 期限切れ → フロントエンドが自動リフレッシュ
    │  access_token 过期 → 前端自动刷新
    ├─ supabase.auth.refreshSession() → 新 access_token 取得
    │  supabase.auth.refreshSession() → 获取新 access_token
    ├─ refresh_token も期限切れ → 再ログイン要求
    │  refresh_token 也过期 → 要求重新登录
    │
    ▼
[ログアウト / 登出]
    │
    ├─ supabase.auth.signOut() → refresh_token を無効化
    │  supabase.auth.signOut() → 使 refresh_token 失效
    ├─ フロントエンドがローカルストレージからトークン削除
    │  前端从 localStorage 删除令牌
    └─ access_token は有効期限まで有効（ステートレス）
       access_token 在到期前仍有效（无状态）
```

### 1.4 パスワードポリシー / 密码策略

| 項目 / 项目 | 値 / 值 | 説明 / 说明 |
|---|---|---|
| 最小文字数 / 最小字符数 | 8 | Supabase Auth デフォルト / 默认 |
| ハッシュアルゴリズム / 哈希算法 | PBKDF2 SHA-512 | Supabase Auth 内部 / 内部 |
| イテレーション / 迭代 | 210,000 | OWASP 2024 推奨 / 推荐 |
| ソルト / 盐 | ランダム 16 バイト / 随机 16 字节 | ユーザーごとに一意 / 每用户唯一 |
| 保存場所 / 存储位置 | `auth.users` (Supabase 管理) | アプリコードから不可視 / 应用代码不可见 |

> **重要 / 重要**: アプリケーションコードでパスワードを直接保存・検証しない。
> 全てのパスワード管理は Supabase Auth が担当する。
> 应用代码不直接存储或验证密码，全部由 Supabase Auth 管理。

### 1.5 OAuth / SSO プロバイダー / OAuth/SSO 提供商

| プロバイダー / 提供商 | 対象 / 目标 | プラン / 计划 | 設定 / 配置 |
|---|---|---|---|
| メール + パスワード / 邮箱 + 密码 | 全ユーザー / 全用户 | free+ | デフォルト / 默认 |
| Google OAuth 2.0 | enterprise プラン / 企业计划 | enterprise | Supabase Dashboard で設定 / 在 Dashboard 配置 |
| Microsoft Entra ID | enterprise プラン / 企业计划 | enterprise | SAML 2.0 / OIDC |
| Magic Link | オプション / 可选 | starter+ | メール送信 / 邮件发送 |
| TOTP (MFA) | 全ユーザー / 全用户 | free+ | ユーザーごとに有効化 / 每用户可启用 |

### 1.6 セッション管理 / 会话管理

**ステートレス JWT 設計 / 无状态 JWT 设计**:

- サーバーサイドセッションストアなし / 无服务器端会话存储
- JWT 自体がセッション情報を含む / JWT 本身包含会话信息
- スケールアウトに影響なし / 不影响横向扩展
- Supabase Auth が refresh_token をデータベースで管理 / 管理 refresh_token

| 設定 / 配置 | 値 / 值 |
|---|---|
| access_token TTL | 3600 秒 (1 時間 / 1 小时) |
| refresh_token TTL | 2,592,000 秒 (30 日 / 30 天) |
| 同時セッション数 / 并发会话数 | 無制限（デバイスごと）/ 无限制（每设备） |
| トークン格納先 / 令牌存储 | localStorage (SPA) |

---

## 2. 認可アーキテクチャ / 授权架构

### 2.1 3 層ガードチェーン / 3 层守卫链

```
HTTP Request
    │
    ▼
┌──────────────────────────────────────────────────────────┐
│  Layer 1: AuthGuard (認証 / 认证)                        │
│                                                          │
│  - JWT 署名検証 (RS256 公開鍵) / 验证 JWT 签名           │
│  - 有効期限チェック / 检查有效期                           │
│  - req.user に AuthUser を注入 / 注入 AuthUser 到 req    │
│  - 失敗 → 401 Unauthorized                               │
└──────────────────┬───────────────────────────────────────┘
                   │ OK
                   ▼
┌──────────────────────────────────────────────────────────┐
│  Layer 2: TenantGuard (テナント分離 / 租户隔离)           │
│                                                          │
│  - app_metadata.tenant_id を抽出 / 提取 tenant_id        │
│  - SET LOCAL app.tenant_id = ? (RLS 用)                  │
│  - tenant_id なし → 403 Forbidden                         │
│  - テナント status チェック (active のみ) / 检查状态       │
└──────────────────┬───────────────────────────────────────┘
                   │ OK
                   ▼
┌──────────────────────────────────────────────────────────┐
│  Layer 3: RoleGuard (ロール認可 / 角色授权)               │
│                                                          │
│  - @Roles() デコレータの要求ロールを取得 / 获取要求角色    │
│  - ロール階層比較 / 角色层级比较                          │
│  - 権限不足 → 403 Forbidden                               │
└──────────────────┬───────────────────────────────────────┘
                   │ OK
                   ▼
            Controller Method
```

### 2.2 NestJS ガード実装 / NestJS 守卫实现

```typescript
// --- AuthGuard ---
// Supabase JWT を検証し req.user を注入 / 验证 Supabase JWT 并注入 req.user
@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException();

    // RS256 公開鍵で検証、アルゴリズム固定 / 使用 RS256 公钥验证，固定算法
    const payload = await this.jwtService.verifyAsync(token, {
      secret: this.supabaseJwtPublicKey,
      algorithms: ['RS256'],
    });
    request.user = this.mapToAuthUser(payload);
    return true;
  }
}

// --- TenantGuard ---
// tenant_id を抽出し RLS 用の SET LOCAL を実行 / 提取 tenant_id 并执行 SET LOCAL
@Injectable()
export class TenantGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.user?.appMetadata?.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant ID required');

    // テナント状態チェック / 检查租户状态
    const tenant = await this.tenantService.findById(tenantId);
    if (!tenant || tenant.status !== 'active') {
      throw new ForbiddenException('Tenant suspended or not found');
    }

    request.tenantId = tenantId;
    return true;
  }
}

// --- RoleGuard ---
// @Roles() デコレータのロール要件をチェック / 检查 @Roles() 装饰器的角色要求
@Injectable()
export class RoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY, [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles) return true;
    const { role } = context.switchToHttp().getRequest().user;
    return requiredRoles.includes(role);
  }
}
```

### 2.3 デコレータ / 装饰器

```typescript
// @Roles — ロール制限 / 角色限制
@Roles('admin', 'manager')
@UseGuards(AuthGuard, TenantGuard, RoleGuard)
async approveOrder() { ... }

// @CurrentUser — 認証ユーザー取得 / 获取认证用户
async getProfile(@CurrentUser() user: AuthUser) { ... }

// @TenantId — テナント ID 取得 / 获取租户 ID
async listProducts(@TenantId() tenantId: string) { ... }

// @RequirePermission — 細粒度権限チェック / 细粒度权限检查
@RequirePermission('shipment:export')
async exportShipments() { ... }

// @Public — 認証不要マーク / 标记无需认证
@Public()
async healthCheck() { ... }
```

### 2.4 ロール階層と権限マトリクス / 角色层级与权限矩阵

#### ロール階層 / 角色层级

```
admin ─────────── テナント全権限 / 租户全权限
  │
  ├── manager ─── 承認 + レポート + CRUD / 审批 + 报表 + CRUD
  │
  ├── operator ── 倉庫操作 CRUD / 仓库操作 CRUD
  │
  ├── viewer ──── 読み取り専用 / 只读
  │
  └── client ──── 荷主ポータル（自社データのみ）/ 货主门户（仅本社数据）
```

#### 完全権限マトリクス / 完整权限矩阵

凡例 / 图例: C=Create, R=Read, U=Update, D=Delete, A=Approve, X=Export, I=Import

| モジュール / 模块 | 操作 / 操作 | admin | manager | operator | viewer | client |
|---|---|:---:|:---:|:---:|:---:|:---:|
| **テナント設定** / 租户设置 | CRUD | CRUD | R | - | - | - |
| **ユーザー管理** / 用户管理 | CRUD | CRUD | CR | - | - | - |
| **倉庫** / 仓库 | CRUD | CRUD | CRUD | R | R | - |
| **ロケーション** / 库位 | CRUD | CRUD | CRUD | CRU | R | - |
| **商品マスタ** / 商品主数据 | CRUDXI | CRUDXI | CRUDXI | CRUDXI | RX | R |
| **入庫指示** / 入库单 | CRUDAXI | CRUDAXI | CRUDAXI | CRUXI | RX | CR |
| **入庫検品** / 入库检品 | CRUD | CRUD | CRUD | CRUD | R | R |
| **出荷指示** / 出货单 | CRUDAXI | CRUDAXI | CRUDAXI | CRUXI | RX | CR |
| **出荷ピッキング** / 拣货 | CRUD | CRUD | CRUD | CRUD | R | - |
| **出荷梱包** / 打包 | CRUD | CRUD | CRUD | CRUD | R | - |
| **出荷ラベル** / 贴标 | CRUDX | CRUDX | CRUDX | CRUDX | R | - |
| **配送連携** / 配送对接 | CRUDX | CRUDX | CRUDX | RX | R | - |
| **返品** / 退货 | CRUD | CRUD | CRUD | CRU | R | CR |
| **在庫照会** / 库存查询 | RX | RX | RX | RX | RX | R |
| **在庫移動** / 库存移动 | CRUD | CRUD | CRUD | CRU | R | - |
| **在庫調整** / 库存调整 | CRUD | CRUDA | CRU | R | R | - |
| **棚卸** / 盘点 | CRUDA | CRUDA | CRU | R | - | - |
| **ロット** / 批次 | CRUD | CRUD | CRU | R | R | R |
| **シリアル** / 序列号 | CRUD | CRUD | CRU | R | R | - |
| **荷主** / 客户 | CRUD | CRUD | R | R | R(自社) |
| **請求** / 账单 | CRUDXA | CRUDXA | R | R | R(自社) |
| **レポート** / 报表 | RX | RX | RX | RX | R(自社) |
| **操作ログ** / 操作日志 | R | R | R(自分) | R(自分) | - |
| **システム設定** / 系统设置 | CRUD | R | - | - | - |
| **Webhook** | CRUD | CRUD | R | - | - | - |
| **自動化ルール** / 自动化规则 | CRUD | CRUD | R | R | - |
| **プラグイン** / 插件 | CRUD | R | - | - | - |
| **API キー** | CRUD | CRUD | - | - | - |

### 2.5 リソースレベルアクセス制御 / 资源级访问控制

#### 倉庫スコープフィルタリング / 仓库范围过滤

```typescript
// BaseRepository: warehouse_ids による自動フィルタリング
// BaseRepository: 根据 warehouse_ids 自动过滤
export abstract class BaseRepository<T> {
  async findAll(tenantId: string, user: AuthUser, filters?: Partial<T>): Promise<T[]> {
    const conditions = [eq(this.table.tenantId, tenantId)];

    // admin/manager は全倉庫、operator/viewer は制限あり
    // admin/manager 全仓库，operator/viewer 有限制
    if (user.warehouseIds?.length > 0 && !['admin', 'manager'].includes(user.role)) {
      conditions.push(inArray(this.table.warehouseId, user.warehouseIds));
    }

    // X-Warehouse-Id ヘッダーによる追加フィルタ / 通过 header 额外过滤
    if (filters?.warehouseId) {
      conditions.push(eq(this.table.warehouseId, filters.warehouseId));
    }

    return this.db.select().from(this.table).where(and(...conditions));
  }
}
```

#### クライアントポータル分離 / 客户门户隔离

```typescript
// client ロールは自社データのみ / client 角色仅限本社数据
if (user.role === 'client' && user.clientId) {
  conditions.push(eq(this.table.clientId, user.clientId));
}
```

---

## 3. マルチテナント完全設計 / 多租户完整设计

### 3.1 2 層分離戦略 / 双层隔离策略

```
┌──────────────────────────────────────────────────────────────────┐
│                        HTTP Request                              │
│                  Authorization: Bearer <JWT>                     │
└───────────────────────────┬──────────────────────────────────────┘
                            │
            ┌───────────────▼───────────────┐
            │    Layer 1: アプリケーション層    │
            │    应用层 (Primary)              │
            │                                 │
            │  TenantGuard → req.tenantId     │
            │  BaseRepository.findAll(        │
            │    tenantId, ...)               │
            │  → WHERE tenant_id = ?          │
            └───────────────┬─────────────────┘
                            │
            ┌───────────────▼───────────────┐
            │    Layer 2: データベース層        │
            │    数据库层 (Safety Net)         │
            │                                 │
            │  SET LOCAL app.tenant_id = ?    │
            │  → RLS POLICY USING (           │
            │      tenant_id =                │
            │      current_setting(           │
            │        'app.tenant_id')::uuid   │
            │    )                            │
            └─────────────────────────────────┘
```

### 3.2 アプリケーション層: BaseRepository / 应用层: BaseRepository

```typescript
// src/common/base.repository.ts
// 全 Repository の基底クラス — tenant_id を自動付与
// 所有 Repository 的基类 — 自动附加 tenant_id

export abstract class BaseRepository<TTable extends PgTable, TInsert, TSelect> {
  constructor(
    protected readonly db: DrizzleDatabase,
    protected readonly table: TTable,
  ) {}

  // SELECT: tenant_id フィルタ自動付与 / 自动附加 tenant_id 过滤
  async findAll(tenantId: string, options?: FindOptions): Promise<TSelect[]> {
    const conditions = [eq(this.table.tenantId, tenantId)];
    if (this.table.deletedAt) {
      conditions.push(isNull(this.table.deletedAt));
    }
    // ...追加フィルタ / 额外过滤...
    return this.db.select().from(this.table).where(and(...conditions));
  }

  async findById(tenantId: string, id: string): Promise<TSelect | null> {
    const [row] = await this.db.select().from(this.table)
      .where(and(eq(this.table.id, id), eq(this.table.tenantId, tenantId)));
    return row ?? null;
  }

  // INSERT: tenant_id を自動注入 / 自动注入 tenant_id
  async create(tenantId: string, data: TInsert): Promise<TSelect> {
    const [row] = await this.db.insert(this.table)
      .values({ ...data, tenantId })
      .returning();
    return row;
  }

  // UPDATE: tenant_id を WHERE 条件に含む / WHERE 条件中包含 tenant_id
  async update(tenantId: string, id: string, data: Partial<TInsert>): Promise<TSelect> {
    const [row] = await this.db.update(this.table)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(this.table.id, id), eq(this.table.tenantId, tenantId)))
      .returning();
    return row;
  }

  // DELETE (論理削除) / 软删除
  async softDelete(tenantId: string, id: string): Promise<void> {
    await this.db.update(this.table)
      .set({ deletedAt: new Date() })
      .where(and(eq(this.table.id, id), eq(this.table.tenantId, tenantId)));
  }
}
```

### 3.3 データベース層: RLS ポリシーテンプレート / 数据库层: RLS 策略模板

```sql
-- ============================================================
-- RLS 有効化 + ポリシー適用テンプレート / RLS 启用 + 策略模板
-- ============================================================

-- Step 1: tenant_id を JWT クレームから取得する関数
-- 从 JWT claim 中获取 tenant_id 的函数
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
BEGIN
  RETURN (current_setting('request.jwt.claims', true)::jsonb
          -> 'app_metadata' ->> 'tenant_id')::uuid;
EXCEPTION WHEN OTHERS THEN
  -- フォールバック: アプリ層が設定した値を使用 / 回退: 使用应用层设置的值
  RETURN (current_setting('app.tenant_id', true))::uuid;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Step 2: 現在のユーザーロールを取得する関数
-- 获取当前用户角色的函数
CREATE OR REPLACE FUNCTION current_user_role() RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('request.jwt.claims', true)::jsonb
         -> 'app_metadata' ->> 'role';
EXCEPTION WHEN OTHERS THEN
  RETURN current_setting('app.user_role', true);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Step 3: 標準テナント分離ポリシー（テンプレート）
-- 标准租户隔离策略（模板）
-- 各テーブルに以下を適用 / 对每个表应用以下策略:

-- (a) RLS 有効化 / 启用 RLS
ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;

-- (b) SELECT ポリシー / SELECT 策略
CREATE POLICY tenant_select ON <table_name>
  FOR SELECT
  USING (tenant_id = current_tenant_id());

-- (c) INSERT ポリシー / INSERT 策略
CREATE POLICY tenant_insert ON <table_name>
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

-- (d) UPDATE ポリシー / UPDATE 策略
CREATE POLICY tenant_update ON <table_name>
  FOR UPDATE
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- (e) DELETE ポリシー / DELETE 策略
CREATE POLICY tenant_delete ON <table_name>
  FOR DELETE
  USING (tenant_id = current_tenant_id());
```

### 3.4 Drizzle からの RLS セッション変数設定 / 从 Drizzle 设置 RLS 会话变量

```typescript
// src/common/tenant-context.middleware.ts
// TenantGuard 通過後、各リクエストの DB 接続で SET LOCAL を実行
// TenantGuard 通过后，在每个请求的 DB 连接中执行 SET LOCAL

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly db: DrizzleDatabase) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const tenantId = req.tenantId;
    const userRole = req.user?.role;

    if (tenantId) {
      // トランザクション内で SET LOCAL — コネクション返却時に自動リセット
      // 在事务内 SET LOCAL — 连接归还时自动重置
      await this.db.execute(sql`SET LOCAL app.tenant_id = ${tenantId}`);
      if (userRole) {
        await this.db.execute(sql`SET LOCAL app.user_role = ${userRole}`);
      }
    }

    next();
  }
}
```

### 3.5 テナント作成ワークフロー / 租户创建工作流

```
1. POST /api/admin/tenants  (platform admin のみ / 仅平台管理员)
   │
   ├─ 2. tenants テーブルに INSERT / 插入 tenants 表
   │     {tenant_code, name, plan, max_users, max_warehouses}
   │
   ├─ 3. system_settings テーブルにデフォルト設定 INSERT
   │     在 system_settings 表中插入默认配置
   │
   ├─ 4. Supabase Auth でテナント管理者ユーザーを作成
   │     在 Supabase Auth 中创建租户管理员用户
   │     app_metadata: {tenant_id, role: 'admin'}
   │
   ├─ 5. users テーブルに管理者 INSERT / 插入管理员到 users 表
   │     {tenant_id, supabase_uid, role: 'admin', email}
   │
   ├─ 6. デフォルト倉庫 + バーチャルロケーション作成
   │     创建默认仓库 + 虚拟库位
   │     (virtual/supplier, virtual/customer)
   │
   └─ 7. ウェルカムメール送信 / 发送欢迎邮件
```

### 3.6 クロステナントデータ共有 / 跨租户数据共享

| シナリオ / 场景 | アプローチ / 方法 |
|---|---|
| プラットフォーム管理ダッシュボード / 平台管理仪表盘 | `service_role` キーでRLSバイパス / 使用 service_role 绕过 RLS |
| テナント横断レポート / 跨租户报表 | 専用ビュー + `SECURITY DEFINER` 関数 / 专用视图 + 函数 |
| `feature_flags` テーブル | tenant_id なし、RLS 不要 / 无 tenant_id，不需要 RLS |

```sql
-- プラットフォーム管理者用ビュー（RLS バイパス）/ 平台管理员视图（绕过 RLS）
CREATE VIEW admin_tenant_summary AS
SELECT
  t.id AS tenant_id,
  t.name AS tenant_name,
  t.plan,
  t.status,
  COUNT(DISTINCT u.id) AS user_count,
  COUNT(DISTINCT w.id) AS warehouse_count
FROM tenants t
LEFT JOIN users u ON u.tenant_id = t.id AND u.deleted_at IS NULL
LEFT JOIN warehouses w ON w.tenant_id = t.id AND w.deleted_at IS NULL
GROUP BY t.id;

-- service_role で呼び出し / 通过 service_role 调用
-- この関数は SECURITY DEFINER で RLS をバイパス / 此函数通过 SECURITY DEFINER 绕过 RLS
```

### 3.7 テナント固有設定 / 租户专属配置

`system_settings` テーブルがテナントごとの設定を保持。
`system_settings` 表保存每个租户的配置。

```sql
-- テナントごとに1行 / 每个租户一行
SELECT * FROM system_settings WHERE tenant_id = current_tenant_id();

-- 設定例 / 配置示例:
-- inbound_require_inspection: true  (入庫検品必須 / 入库检品必须)
-- inventory_lot_tracking_enabled: true (ロット追跡有効 / 批次追踪启用)
-- outbound_auto_allocate: false (自動引当無効 / 自动分配禁用)
-- system_language: 'ja' (日本語 / 日语)
-- timezone: 'Asia/Tokyo'
```

---

## 4. RLS ポリシー全表 / RLS 策略全表

### 4.1 標準テナント分離テーブル（55テーブル）/ 标准租户隔离表（55表）

以下のテーブルは全て同一の標準ポリシーテンプレートを適用。
以下表全部应用相同的标准策略模板。

**ポリシー / 策略**: `tenant_id = current_tenant_id()` (SELECT/INSERT/UPDATE/DELETE)

| # | テーブル / 表 | SELECT | INSERT | UPDATE | DELETE | 備考 / 备注 |
|---|---|:---:|:---:|:---:|:---:|---|
| 1 | `users` | tenant | tenant | tenant | tenant | |
| 2 | `warehouses` | tenant | tenant | tenant | tenant | |
| 3 | `locations` | tenant | tenant | tenant | tenant | |
| 4 | `products` | tenant | tenant | tenant | tenant | |
| 5 | `stock_quants` | tenant | tenant | tenant | tenant | |
| 6 | `stock_moves` | tenant | tenant | tenant | tenant | |
| 7 | `inbound_orders` | tenant | tenant | tenant | tenant | |
| 8 | `inbound_order_lines` | tenant | tenant | tenant | tenant | |
| 9 | `shipment_orders` | tenant | tenant | tenant | tenant | |
| 10 | `shipment_order_products` | tenant | tenant | tenant | tenant | |
| 11 | `shipment_order_materials` | tenant | tenant | tenant | tenant | |
| 12 | `return_orders` | tenant | tenant | tenant | tenant | |
| 13 | `return_order_lines` | tenant | tenant | tenant | tenant | |
| 14 | `carriers` | tenant | tenant | tenant | tenant | |
| 15 | `lots` | tenant | tenant | tenant | tenant | |
| 16 | `serial_numbers` | tenant | tenant | tenant | tenant | |
| 17 | `inventory_reservations` | tenant | tenant | tenant | tenant | |
| 18 | `inventory_ledger` | tenant | tenant | tenant | tenant | |
| 19 | `clients` | tenant | tenant | tenant | tenant | |
| 20 | `sub_clients` | tenant | tenant | tenant | tenant | |
| 21 | `shops` | tenant | tenant | tenant | tenant | |
| 22 | `customers` | tenant | tenant | tenant | tenant | |
| 23 | `suppliers` | tenant | tenant | tenant | tenant | |
| 24 | `order_source_companies` | tenant | tenant | tenant | tenant | |
| 25 | `billing_records` | tenant | tenant | tenant | tenant | |
| 26 | `invoices` | tenant | tenant | tenant | tenant | |
| 27 | `work_charges` | tenant | tenant | tenant | tenant | |
| 28 | `service_rates` | tenant | tenant | tenant | tenant | |
| 29 | `shipping_rates` | tenant | tenant | tenant | tenant | |
| 30 | `price_catalogs` | tenant | tenant | tenant | tenant | |
| 31 | `waves` | tenant | tenant | tenant | tenant | |
| 32 | `pick_tasks` | tenant | tenant | tenant | tenant | |
| 33 | `pick_items` | tenant | tenant | tenant | tenant | |
| 34 | `packing_tasks` | tenant | tenant | tenant | tenant | |
| 35 | `packing_rules` | tenant | tenant | tenant | tenant | |
| 36 | `labeling_tasks` | tenant | tenant | tenant | tenant | |
| 37 | `sorting_tasks` | tenant | tenant | tenant | tenant | |
| 38 | `warehouse_tasks` | tenant | tenant | tenant | tenant | |
| 39 | `wms_tasks` | tenant | tenant | tenant | tenant | |
| 40 | `replenishment_tasks` | tenant | tenant | tenant | tenant | |
| 41 | `stocktaking_orders` | tenant | tenant | tenant | tenant | |
| 42 | `cycle_count_plans` | tenant | tenant | tenant | tenant | |
| 43 | `inspection_records` | tenant | tenant | tenant | tenant | |
| 44 | `daily_reports` | tenant | tenant | tenant | tenant | |
| 45 | `exception_reports` | tenant | tenant | tenant | tenant | |
| 46 | `materials` | tenant | tenant | tenant | tenant | |
| 47 | `roles` | tenant | tenant | tenant | tenant | |
| 48 | `inventory_categories` | tenant | tenant | tenant | tenant | |
| 49 | `webhooks` | tenant | tenant | tenant | tenant | |
| 50 | `automation_scripts` | tenant | tenant | tenant | tenant | |
| 51 | `auto_processing_rules` | tenant | tenant | tenant | tenant | |
| 52 | `rule_definitions` | tenant | tenant | tenant | tenant | |
| 53 | `slotting_rules` | tenant | tenant | tenant | tenant | |
| 54 | `custom_field_definitions` | tenant | tenant | tenant | tenant | |
| 55 | `print_templates` | tenant | tenant | tenant | tenant | |
| 56 | `email_templates` | tenant | tenant | tenant | tenant | |
| 57 | `form_templates` | tenant | tenant | tenant | tenant | |
| 58 | `wms_schedules` | tenant | tenant | tenant | tenant | |
| 59 | `mapping_configs` | tenant | tenant | tenant | tenant | |
| 60 | `fba_shipment_plans` | tenant | tenant | tenant | tenant | |
| 61 | `rsl_shipment_plans` | tenant | tenant | tenant | tenant | |
| 62 | `fba_boxes` | tenant | tenant | tenant | tenant | |
| 63 | `notifications` | tenant | tenant | tenant | tenant | |
| 64 | `notification_preferences` | tenant | tenant | tenant | tenant | |
| 65 | `order_groups` | tenant | tenant | tenant | tenant | |
| 66 | `set_products` | tenant | tenant | tenant | tenant | |
| 67 | `set_orders` | tenant | tenant | tenant | tenant | |
| 68 | `carrier_automation_configs` | tenant | tenant | tenant | tenant | |
| 69 | `carrier_session_caches` | tenant | tenant | tenant | tenant | |
| 70 | `system_settings` | tenant | tenant | tenant | tenant | |

### 4.2 特殊ポリシーテーブル / 特殊策略表

#### `tenants` テーブル — プラットフォーム管理者専用 / 仅平台管理员

```sql
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- テナント自身のレコードのみ参照可能 / 仅可查看自身租户记录
CREATE POLICY tenant_self_select ON tenants
  FOR SELECT
  USING (id = current_tenant_id());

-- INSERT/UPDATE/DELETE は service_role (admin API) のみ
-- INSERT/UPDATE/DELETE 仅限 service_role (admin API)
-- (RLS は service_role をバイパスするため、ポリシー不要)
-- (RLS 对 service_role 自动绕过，无需额外策略)
```

#### ログテーブル — 挿入専用（非管理者）/ 日志表 — 仅插入（非管理员）

```sql
-- operation_logs: テナント分離 + 非管理者は INSERT のみ
-- 租户隔离 + 非管理员仅 INSERT

ALTER TABLE operation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY oplog_select ON operation_logs
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND current_user_role() IN ('admin', 'manager')
  );

CREATE POLICY oplog_insert ON operation_logs
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

-- UPDATE/DELETE ポリシーなし = 変更不可 / 无策略 = 不可修改
-- (監査ログは不変である必要がある / 审计日志必须不可变)
```

```sql
-- api_logs: 同一パターン / 相同模式
ALTER TABLE api_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY apilog_select ON api_logs
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND current_user_role() IN ('admin', 'manager')
  );
CREATE POLICY apilog_insert ON api_logs
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
```

```sql
-- event_logs: 同一パターン / 相同模式
ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY eventlog_select ON event_logs
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND current_user_role() IN ('admin', 'manager')
  );
CREATE POLICY eventlog_insert ON event_logs
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
```

```sql
-- webhook_logs: 同一パターン / 相同模式
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY whlog_select ON webhook_logs
  FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY whlog_insert ON webhook_logs
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

-- script_execution_logs / auto_processing_logs: 同一パターン / 相同模式
-- wms_schedule_logs: 同一パターン / 相同模式
```

#### グローバルテーブル — RLS 不要 / 全局表 — 不需要 RLS

| テーブル / 表 | 理由 / 原因 |
|---|---|
| `feature_flags` | tenant_id なし、グローバル設定 / 无 tenant_id，全局配置 |
| `plugins` | プラグインはプラットフォームレベル / 插件为平台级 |
| `plugin_configs` | tenant_id あるが service_role のみ操作 / 有 tenant_id 但仅 service_role 操作 |

### 4.3 RLS パフォーマンス最適化 / RLS 性能优化

```sql
-- (1) tenant_id を先頭にした複合インデックス / 以 tenant_id 开头的复合索引
-- RLS の WHERE tenant_id = ? が Index Scan を使用できるようにする
-- 确保 RLS 的 WHERE tenant_id = ? 可以使用 Index Scan
CREATE INDEX idx_products_tenant_sku ON products (tenant_id, sku) WHERE deleted_at IS NULL;
CREATE INDEX idx_shipments_tenant_time ON shipment_orders (tenant_id, created_at DESC);
-- ...（全テーブルの既存インデックスが tenant_id を先頭に含む / 所有表的现有索引以 tenant_id 开头）

-- (2) current_tenant_id() 関数は STABLE — 同一トランザクション内でキャッシュされる
-- current_tenant_id() 函数标记为 STABLE — 在同一事务内缓存

-- (3) RLS の実行計画例 / RLS 执行计划示例
-- EXPLAIN ANALYZE SELECT * FROM products WHERE sku = 'ABC';
-- → Index Scan using idx_products_tenant_sku (tenant_id = '...', sku = 'ABC')
-- → RLS フィルタが Index Scan に統合される / RLS 过滤器合并到 Index Scan 中

-- (4) パーティションテーブル (operation_logs 等) は created_at パーティションプルーニング
-- 分区表 (operation_logs 等) 利用 created_at 分区裁剪
-- + tenant_id インデックスで二重最適化 / + tenant_id 索引双重优化
```

**ベンチマーク見積 / 基准估算**:

| テーブル行数 / 表行数 | RLS オーバーヘッド / 开销 | 条件 / 条件 |
|---|---|---|
| < 100K | < 0.1ms | tenant_id インデックスあり / 有索引 |
| 100K - 1M | < 0.5ms | 複合インデックスあり / 有复合索引 |
| 1M - 10M | < 1ms | パーティション + インデックス / 分区 + 索引 |
| > 10M | < 2ms | パーティション + 部分インデックス / 分区 + 部分索引 |

---

## 5. セキュリティ攻撃防護マトリクス / 安全攻击防护矩阵

| # | 攻撃 / 攻击 | 対策 / 对策 | 実装 / 实现 | 検証方法 / 验证方法 |
|---|---|---|---|---|
| 1 | **JWT 偽造** / JWT 伪造 | RS256 非対称署名 + アルゴリズムピニング / RS256 非对称签名 + 算法固定 | AuthGuard: `algorithms: ['RS256']` のみ受付。HS256/none を拒否 / 仅接受 RS256，拒绝 HS256/none | 不正アルゴリズムの JWT を送信→401 / 发送错误算法 JWT→401 |
| 2 | **テナントデータ漏洩** / 租户数据泄露 | RLS + アプリ層ダブルチェック / RLS + 应用层双重检查 | BaseRepository: WHERE tenant_id + RLS ポリシー / WHERE tenant_id + RLS 策略 | 他テナントの ID を URL に入力→空結果 / 在 URL 中输入其他租户 ID→空结果 |
| 3 | **ブルートフォース** / 暴力破解 | アカウントレベル + IP レベル制限 / 账户级 + IP 级限制 | `@nestjs/throttler`: auth=20req/15min, global=1000req/15min | 21回目のログイン試行→429 / 第 21 次登录尝试→429 |
| 4 | **CSRF** | SameSite Cookie + CORS オリジン制限 / SameSite Cookie + CORS 限制 | CORS: 明示的 origin 設定、credentials: true / 明确 origin 配置 | 別ドメインからの POST→CORS エラー / 从其他域 POST→CORS 错误 |
| 5 | **XSS** | CSP ヘッダー + 入力サニタイズ / CSP 头 + 输入消毒 | Helmet CSP + Vue テンプレート自動エスケープ + class-validator / Helmet CSP + Vue 自动转义 | `<script>` タグを入力→エスケープ出力 / 输入 script 标签→转义输出 |
| 6 | **SQL インジェクション** / SQL 注入 | Drizzle ORM パラメータ化クエリ / 参数化查询 | 全クエリが Drizzle builder 経由。直接 SQL 文字列連結なし / 所有查询通过 Drizzle builder，无直接 SQL 拼接 | `'; DROP TABLE--` を入力→正常パラメータ化 / 输入注入字符串→正常参数化 |
| 7 | **IDOR** (Insecure Direct Object Reference) | テナントスコープルックアップ / 租户范围查找 | findById(tenantId, id) — 他テナントの ID ではヒットしない / 其他租户 ID 不会命中 | 他テナントのリソース ID で GET→404 / 用其他租户资源 ID GET→404 |
| 8 | **トークン窃取** / 令牌窃取 | 短い access_token TTL + refresh rotation / 短 access_token TTL + 刷新轮换 | access_token: 1h, refresh: 30d (使用時ローテーション) / 使用时轮换 | 盗まれた access_token は 1 時間で失効 / 被盗 access_token 1 小时后失效 |
| 9 | **権限昇格** / 权限提升 | JWT app_metadata はサーバー側のみ変更可能 / 仅服务器端可修改 | app_metadata は Supabase service_role API でのみ更新。クライアントからは変更不可 / 仅通过 service_role API 更新，客户端不可修改 | app_metadata を変更した JWT を送信→署名検証失敗 / 发送修改过 app_metadata 的 JWT→签名验证失败 |
| 10 | **SSRF** | URL ホワイトリスト + プライベート IP 拒否 / URL 白名单 + 拒绝内网 IP | Webhook URL バリデーション: 10.x, 172.16.x, 192.168.x, 127.x を拒否 / 拒绝内网 IP | Webhook に `http://127.0.0.1` を設定→400 / 设置 localhost→400 |
| 11 | **セッションハイジャック** / 会话劫持 | HTTPS + Secure フラグ + HttpOnly / HTTPS + Secure + HttpOnly | Nginx: HSTS max-age=31536000; SameSite=Strict | HTTP でのアクセス→HTTPS にリダイレクト / HTTP 访问→重定向到 HTTPS |
| 12 | **MFA バイパス** | Supabase TOTP 実装 + レートリミット / Supabase TOTP + 速率限制 | MFA 有効ユーザーは TOTP コード必須 / 启用 MFA 的用户必须提供 TOTP 代码 | MFA 有効ユーザーがコードなしでログイン→MFA チャレンジ / 无代码登录→MFA 质询 |

---

## 6. API キー機構 / API Key 机制

### 6.1 概要 / 概述

マシン間通信（M2M）用の API キー認証メカニズム。
外部システム連携、バッチ処理、CI/CD パイプラインなど、ブラウザセッション不要の接続に使用。

用于机器间通信（M2M）的 API 密钥认证机制。
用于外部系统集成、批处理、CI/CD 管道等不需要浏览器会话的连接。

### 6.2 API キーテーブル / API Key 表

```sql
CREATE TABLE api_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            VARCHAR(200) NOT NULL,           -- 人間可読な名前 / 人类可读名称
  key_prefix      VARCHAR(8) NOT NULL,             -- 'zlx_pk_' (表示用) / (用于显示)
  key_hash        TEXT NOT NULL,                   -- SHA-256 ハッシュ / SHA-256 哈希
  scopes          TEXT[] NOT NULL DEFAULT '{}',    -- ['products:read', 'shipments:write']
  rate_limit      INT NOT NULL DEFAULT 1000,       -- リクエスト/時 / 请求/小时
  expires_at      TIMESTAMPTZ,                     -- NULL = 無期限 / 无期限
  last_used_at    TIMESTAMPTZ,
  last_used_ip    INET,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      UUID NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at      TIMESTAMPTZ,

  UNIQUE (tenant_id, name)
);

CREATE INDEX idx_api_keys_hash ON api_keys (key_hash) WHERE is_active = TRUE AND revoked_at IS NULL;
CREATE INDEX idx_api_keys_tenant ON api_keys (tenant_id, is_active);
```

### 6.3 API キー形式 / API Key 格式

```
zlx_pk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6

├── zlx_pk_ ─── プレフィックス（識別用）/ 前缀（识别用）
└── 52 chars ── ランダム暗号化バイト（base62）/ 随机加密字节（base62）
```

- **生成時**: 平文を一度だけ表示、SHA-256 ハッシュのみ保存 /
  生成时仅显示一次明文，仅保存 SHA-256 哈希
- **認証時**: リクエストのキーを SHA-256 し、DB の key_hash と比較 /
  认证时将请求密钥 SHA-256 后与 DB 的 key_hash 比较

### 6.4 API キー認証フロー / API Key 认证流程

```
[外部システム / 外部系统]
    │
    │  X-API-Key: zlx_pk_a1b2c3d4...
    │
    ▼
┌──────────────────────────────────────┐
│  ApiKeyGuard                         │
│                                      │
│  1. X-API-Key ヘッダー抽出            │
│  2. SHA-256(key) → hash              │
│  3. DB 検索: key_hash = hash         │
│     AND is_active = TRUE             │
│     AND revoked_at IS NULL           │
│     AND (expires_at IS NULL          │
│          OR expires_at > NOW())      │
│  4. tenant_id + scopes を req に注入  │
│  5. last_used_at/ip を更新            │
│  6. レートリミットチェック / 检查速率限制│
└──────────────────┬───────────────────┘
                   │
                   ▼
            TenantGuard → RoleGuard (scope-based)
```

### 6.5 スコープ定義 / 作用域定义

| スコープ / 作用域 | 説明 / 说明 |
|---|---|
| `products:read` | 商品情報の読み取り / 读取商品信息 |
| `products:write` | 商品の作成・更新 / 创建・更新商品 |
| `inbound:read` | 入庫指示の読み取り / 读取入库单 |
| `inbound:write` | 入庫指示の作成・更新 / 创建・更新入库单 |
| `shipments:read` | 出荷指示の読み取り / 读取出货单 |
| `shipments:write` | 出荷指示の作成 / 创建出货单 |
| `shipments:export` | 出荷指示のエクスポート / 导出出货单 |
| `inventory:read` | 在庫照会 / 库存查询 |
| `stock_moves:read` | 在庫移動の読み取り / 读取库存移动 |
| `reports:read` | レポートの読み取り / 读取报表 |
| `webhooks:manage` | Webhook の管理 / 管理 Webhook |

### 6.6 API キー管理 API / API Key 管理接口

```
POST   /api/settings/api-keys          — 新規作成（平文キーを返す）/ 创建（返回明文密钥）
GET    /api/settings/api-keys          — 一覧取得（key_hash は非表示）/ 列表（隐藏 key_hash）
PATCH  /api/settings/api-keys/:id      — 名前・スコープ・有効期限の更新 / 更新名称・作用域・有效期
DELETE /api/settings/api-keys/:id      — 論理削除（revoked_at を設定）/ 逻辑删除（设置 revoked_at）
POST   /api/settings/api-keys/:id/rotate — キーローテーション / 密钥轮换
```

---

## 7. 現行システムからの移行 / 从现有系统迁移

### 7.1 現行 vs 移行後 / 现行 vs 迁移后

| 項目 / 项目 | 現行 (Express + MongoDB) | 移行後 (NestJS + PostgreSQL) |
|---|---|---|
| **JWT 署名** | HS256 (共有シークレット) | RS256 (Supabase 非対称鍵) |
| **パスワード** | bcrypt (アプリ管理) | PBKDF2 SHA-512 (Supabase Auth) |
| **テナント分離** | アプリ層 WHERE のみ | アプリ層 WHERE + RLS |
| **ロール管理** | JWT ペイロード直接 | JWT app_metadata |
| **セッション** | JWT (24h TTL) | JWT (1h) + refresh (30d) |
| **API キー** | なし | api_keys テーブル |
| **MFA** | なし | TOTP (Supabase Auth) |
| **OAuth** | なし | Google / Microsoft |

### 7.2 移行手順 / 迁移步骤

```
Phase 1: Supabase Auth セットアップ / 设置
  ├─ Supabase プロジェクト作成 / 创建项目
  ├─ JWT シークレット + 公開鍵取得 / 获取 JWT 密钥 + 公钥
  └─ 環境変数設定 / 设置环境变量

Phase 2: ユーザー移行 / 用户迁移
  ├─ MongoDB users → Supabase Auth (supabase.auth.admin.createUser)
  ├─ app_metadata に tenant_id, role, warehouse_ids を設定
  │  在 app_metadata 中设置 tenant_id, role, warehouse_ids
  ├─ users テーブルに supabase_uid を紐付け
  │  在 users 表中关联 supabase_uid
  └─ パスワードリセットメール送信（bcrypt → PBKDF2 移行）
     发送密码重置邮件（bcrypt → PBKDF2 迁移）

Phase 3: NestJS ガード実装 / 实现守卫
  ├─ AuthGuard (RS256 検証)
  ├─ TenantGuard (RLS SET LOCAL)
  └─ RoleGuard (app_metadata.role)

Phase 4: RLS デプロイ / 部署 RLS
  ├─ 全テーブルに ENABLE ROW LEVEL SECURITY / 在所有表上启用
  ├─ tenant_select/insert/update/delete ポリシー作成 / 创建策略
  └─ 特殊テーブル（logs, tenants）の個別ポリシー / 特殊表策略

Phase 5: 並行運用 + 検証 / 并行运行 + 验证
  ├─ テナント分離テスト（クロステナントアクセス不可の検証）
  │  租户隔离测试（验证跨租户访问不可）
  ├─ ロール権限テスト（マトリクス全パターン検証）
  │  角色权限测试（验证矩阵所有模式）
  └─ パフォーマンスベンチマーク（RLS オーバーヘッド測定）
     性能基准（测量 RLS 开销）
```

---

## 付録 A: RLS 一括適用スクリプト / 附录 A: RLS 批量应用脚本

```sql
-- ============================================================
-- 全テーブルに RLS を一括適用するスクリプト
-- 批量对所有表应用 RLS 的脚本
-- ============================================================

DO $$
DECLARE
  tbl TEXT;
  -- 標準テナント分離テーブル / 标准租户隔离表
  tables TEXT[] := ARRAY[
    'users', 'warehouses', 'locations', 'products',
    'stock_quants', 'stock_moves',
    'inbound_orders', 'inbound_order_lines',
    'shipment_orders', 'shipment_order_products', 'shipment_order_materials',
    'return_orders', 'return_order_lines',
    'carriers', 'lots', 'serial_numbers',
    'inventory_reservations', 'inventory_ledger',
    'clients', 'sub_clients', 'shops', 'customers', 'suppliers',
    'order_source_companies',
    'billing_records', 'invoices', 'work_charges',
    'service_rates', 'shipping_rates', 'price_catalogs',
    'waves', 'pick_tasks', 'pick_items',
    'packing_tasks', 'packing_rules',
    'labeling_tasks', 'sorting_tasks',
    'warehouse_tasks', 'wms_tasks', 'replenishment_tasks',
    'stocktaking_orders', 'cycle_count_plans',
    'inspection_records', 'daily_reports', 'exception_reports',
    'materials', 'roles', 'inventory_categories',
    'webhooks', 'automation_scripts',
    'auto_processing_rules', 'rule_definitions', 'slotting_rules',
    'custom_field_definitions',
    'print_templates', 'email_templates', 'form_templates',
    'wms_schedules', 'mapping_configs',
    'fba_shipment_plans', 'rsl_shipment_plans', 'fba_boxes',
    'notifications', 'notification_preferences',
    'order_groups', 'set_products', 'set_orders',
    'carrier_automation_configs', 'carrier_session_caches',
    'system_settings'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    -- RLS 有効化 / 启用 RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);

    -- 既存ポリシー削除（冪等） / 删除已有策略（幂等）
    EXECUTE format('DROP POLICY IF EXISTS tenant_select ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_insert ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_update ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_delete ON %I', tbl);

    -- 標準ポリシー作成 / 创建标准策略
    EXECUTE format(
      'CREATE POLICY tenant_select ON %I FOR SELECT USING (tenant_id = current_tenant_id())', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_insert ON %I FOR INSERT WITH CHECK (tenant_id = current_tenant_id())', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_update ON %I FOR UPDATE USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id())', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_delete ON %I FOR DELETE USING (tenant_id = current_tenant_id())', tbl);

    RAISE NOTICE 'RLS applied to %', tbl;
  END LOOP;
END $$;
```

---

## 付録 B: ADR-005 認証・認可アーキテクチャ / 附录 B: ADR-005 认证・授权架构

### Context / 背景

ZELIXWMS は Express + MongoDB + HS256 JWT の認証基盤から NestJS + PostgreSQL (Supabase) へ移行する。
マルチテナント SaaS として、テナント分離の信頼性と拡張性が最優先事項。

ZELIXWMS 从 Express + MongoDB + HS256 JWT 认证基础迁移到 NestJS + PostgreSQL (Supabase)。
作为多租户 SaaS，租户隔离的可靠性和可扩展性是最高优先事项。

### Decision / 决策

1. **Supabase Auth をアイデンティティプロバイダーとして採用** — パスワード管理、MFA、OAuth を委譲
   采用 Supabase Auth 作为身份提供者 — 委托密码管理、MFA、OAuth
2. **RS256 非対称署名** — マイクロサービス展開時に公開鍵のみ配布で検証可能
   RS256 非对称签名 — 微服务展开时仅分发公钥即可验证
3. **2 層テナント分離** — アプリ層 WHERE (主) + RLS (安全ネット)
   双层租户隔离 — 应用层 WHERE (主) + RLS (安全网)
4. **3 層ガードチェーン** — AuthGuard → TenantGuard → RoleGuard
5. **API キー機構** — M2M 連携用の独立認証メカニズム
   API Key 机制 — 用于 M2M 集成的独立认证机制

### Consequences / 结果

**Positive / 正面**:
- Supabase Auth がパスワードセキュリティを一元管理 / 集中管理密码安全
- RLS により、アプリバグがあってもテナントデータ漏洩を防止 / 即使应用有 bug 也防止数据泄露
- RS256 により将来のマイクロサービス化に対応 / RS256 支持未来微服务化
- API キーにより外部連携の幅が広がる / API Key 扩展外部集成范围

**Negative / 负面**:
- Supabase Auth への依存（ベンダーロックイン）/ 对 Supabase Auth 的依赖（厂商锁定）
- RLS のオーバーヘッド（< 1ms、許容範囲）/ RLS 开销（< 1ms，可接受范围）
- 移行時のパスワードリセットが必要（bcrypt → PBKDF2）/ 迁移时需要密码重置

### Status / 状态

**Accepted** — 2026-03-21

---

> **関連ドキュメント / 相关文档**:
> - `docs/design/03-security-design.md` — セキュリティ設計全体 / 安全设计整体
> - `docs/migration/02-database-design.md` — DB 設計 + RLS / DB 设计 + RLS
> - `docs/migration/03-backend-architecture.md` — バックエンドアーキテクチャ / 后端架构
>
> **最終更新 / 最后更新**: 2026-03-21
```

---

I have composed the complete document above. Since I only have read-oriented tools available (Read, Grep, Glob), I cannot directly write the file. Please save the content above to:

**`/Users/kin/Documents/GitHub/ZELIXWMS/docs/architecture/05-auth-and-multitenancy.md`**

You will need to create the `docs/architecture/` directory first if it does not exist:

```bash
mkdir -p /Users/kin/Documents/GitHub/ZELIXWMS/docs/architecture
```

### Document summary

The document is approximately **900+ lines** and covers all 6 requested sections in bilingual Chinese + Japanese:

1. **认证架构** -- Supabase Auth integration sequence diagram, JWT structure (header/payload with `app_metadata.tenant_id`, `role`, `warehouse_ids`), token lifecycle (login/access/refresh/logout), RS256 vs HS256 comparison table, password policy (PBKDF2 SHA-512 210K iterations), OAuth/SSO providers (Google, Microsoft Entra ID), stateless session management.

2. **授权架构** -- 3-layer guard chain (AuthGuard, TenantGuard, RoleGuard) with ASCII diagram, NestJS implementation code, decorator examples (`@Roles`, `@CurrentUser`, `@TenantId`, `@RequirePermission`, `@Public`), complete 5-role permission matrix covering all modules (CRUDAXI per role), warehouse-scoped filtering via BaseRepository, client portal isolation.

3. **多租户完整设计** -- Application-layer BaseRepository with auto-injected `tenant_id`, database-layer RLS policy template with `current_tenant_id()` helper function, Drizzle SET LOCAL middleware, tenant creation 7-step workflow, cross-tenant data sharing via `service_role` and `SECURITY DEFINER` views, `system_settings` per-tenant configuration.

4. **RLS 策略全表** -- All 70 tenant-scoped tables listed with SELECT/INSERT/UPDATE/DELETE policies. Special cases: `tenants` (self-select only), log tables (insert-only for non-admin, read for admin/manager), global tables (`feature_flags`, `plugins`) with no RLS. Performance optimization section with index strategies and benchmark estimates.

5. **安全攻击防护矩阵** -- 12-row matrix covering JWT forgery (RS256 + algorithm pinning), tenant data leak (RLS + app-layer double check), brute force (account + IP rate limiting), CSRF (SameSite + CORS), XSS (CSP + Vue auto-escape), SQL injection (Drizzle parameterized queries), IDOR (tenant-scoped lookups), token theft, privilege escalation, SSRF, session hijacking, MFA bypass.

6. **API Key 机制** -- `api_keys` table DDL, key format (`zlx_pk_` prefix + 52-char random), SHA-256 storage (never store plaintext), ApiKeyGuard authentication flow, scope definitions (11 scopes), management API endpoints, key rotation support.

Additionally includes migration plan from current Express/HS256 system and ADR-005 decision record.

Key referenced files:
- `/Users/kin/Documents/GitHub/ZELIXWMS/docs/design/03-security-design.md` -- existing security design
- `/Users/kin/Documents/GitHub/ZELIXWMS/docs/migration/02-database-design.md` -- database schema with all 70+ tables
- `/Users/kin/Documents/GitHub/ZELIXWMS/backend/src/api/middleware/auth.ts` -- current HS256 auth middleware
- `/Users/kin/Documents/GitHub/ZELIXWMS/backend/src/api/helpers/tenantHelper.ts` -- current tenant helper
- `/Users/kin/Documents/GitHub/ZELIXWMS/backend/src/types/express.d.ts` -- AuthUser interface
- `/Users/kin/Documents/GitHub/ZELIXWMS/backend/src/models/user.ts` -- UserRole type definition
