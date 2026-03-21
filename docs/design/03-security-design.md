# セキュリティ設計書 / 安全设计文档

> 対象読者: 新規開発者 / 目标读者: 新加入的开发者
>
> 最終更新: 2026-03-21

---

## 目次 / 目录

1. [認証方式](#1-認証方式--认证方式)
2. [認可 / RBAC](#2-認可--rbac--授权--rbac)
3. [マルチテナント分離](#3-マルチテナント分離--多租户隔离)
4. [API セキュリティ](#4-api-セキュリティ--api-安全)
5. [データ保護](#5-データ保護--数据保护)
6. [OWASP Top 10 対策](#6-owasp-top-10-対策--owasp-top-10-防护)
7. [ログ・監査](#7-ログ監査--日志审计)
8. [今後の改善計画](#8-今後の改善計画--未来改进计划)

---

## 1. 認証方式 / 认证方式

### 現在の実装: JWT ベース認証 / 当前实现: 基于 JWT 的认证

```
[クライアント] → POST /api/auth/login { email, password }
               ← { token: "eyJhbG...", user: { id, email, role, ... } }

[後続リクエスト] → Authorization: Bearer <token>
                → auth.ts ミドルウェアで検証 / 中间件验证
                ← req.user に注入 / 注入到 req.user
```

#### JWT 設定 / JWT 配置

| 項目 / 项目 | 値 / 值 | 備考 / 备注 |
|---|---|---|
| アルゴリズム | HS256 (jsonwebtoken デフォルト) | 対称鍵方式 / 对称密钥 |
| 有効期間 | `JWT_EXPIRES_IN` (デフォルト: 24h) | 環境変数で設定可 / 可通过环境变量配置 |
| シークレット | `JWT_SECRET` 環境変数 | **本番では必ず設定** / 生产环境必须设置 |
| ペイロード | `{ id, email, displayName, role, warehouseIds, tenantId }` | `AuthUser` 型 |

#### 認証ミドルウェア / 认证中间件

`backend/src/api/middleware/auth.ts` に 4 つの認証関数を提供:
提供 4 个认证函数：

| 関数 / 函数 | 用途 / 用途 |
|---|---|
| `requireAuth` | **必須認証**: トークン未提供/無効時は 401 を返す。本番環境の全 API で使用 |
| `optionalAuth` | **任意認証**: トークンがあれば検証して `req.user` に注入、なくてもリクエストを通す |
| `requireRole(...roles)` | **ロール制限**: `requireAuth` の後に使用。指定ロール以外は 403 |
| `generateToken(payload)` | **トークン生成**: ログイン成功時に JWT を発行 |

#### 開発環境の特例 / 开发环境特殊处理

```typescript
// NODE_ENV === 'development' の場合、認証をスキップしデフォルト管理者を注入
// 开发环境跳过认证，注入默认管理员
if (process.env.NODE_ENV === 'development') {
  req.user = {
    id: 'dev-admin',
    email: 'dev@zelix.local',
    role: 'admin',
    tenantId: 'default',
  }
}
```

> **注意**: この挙動は `NODE_ENV=development` でのみ有効。本番では絶対に発生しない。
> 此行为仅在 `NODE_ENV=development` 时生效，生产环境不会触发。

### 計画中: Supabase Auth 移行 / 计划中: 迁移到 Supabase Auth

将来的に自前 JWT 認証から **Supabase Auth** に移行予定。
计划从自建 JWT 认证迁移到 **Supabase Auth**。

| 現在 / 当前 | 移行後 / 迁移后 |
|---|---|
| 自前 JWT 発行/検証 | Supabase Auth JWT |
| パスワードを MongoDB に保存 | Supabase Auth が管理 |
| セッション管理なし | Supabase リフレッシュトークン |
| メール認証なし | Supabase メール認証/MFA |

移行の影響範囲: `auth.ts` ミドルウェア + フロントエンド `useAuth` composable + ログイン画面。
迁移影响范围：auth.ts 中间件 + 前端 useAuth 组合式 + 登录页面。

---

## 2. 認可 / RBAC / 授权 / RBAC

### ロール階層 / 角色层级

```
super_admin          全テナント・全機能 / 全租户全功能
  └── admin          テナント内全権限 / 租户内全权限
       ├── operator  倉庫オペレーション / 仓库操作
       ├── viewer    閲覧のみ / 仅查看
       └── client    荷主ポータル / 货主门户
```

### requirePermission ミドルウェア / 权限校验中间件

`backend/src/api/middleware/requirePermission.ts`

#### 使用方法 / 使用方法

```typescript
// 単一権限チェック / 单一权限校验
router.post('/receive', requirePermission('inbound:receive'), controller.receive)
router.get('/list', requirePermission('inbound:view'), controller.list)

// 複数権限チェック（いずれか1つでOK）/ 多权限校验（有其一即可）
router.put('/update', requireAnyPermission('shipment:edit', 'shipment:admin'), controller.update)
```

#### 内部動作 / 内部逻辑

1. `req.user` が存在しなければ **401**
   如果 `req.user` 不存在则返回 401
2. `user.role === 'admin'` なら全権限をバイパス（**admin は全権限**）
   admin 角色绕过所有权限检查
3. `user.roleIds` から DB (`Role` モデル) の権限リストを取得
   从数据库 Role 模型获取权限列表
4. 要求された権限が含まれていなければ **403**
   如果不包含所需权限则返回 403

#### 権限キャッシュ / 权限缓存

```typescript
// プロセスメモリキャッシュ、TTL 5 分 / 进程内存缓存，TTL 5分钟
const permissionCache: Map<string, { permissions: string[]; expiry: number }> = new Map()
const CACHE_TTL = 5 * 60 * 1000
```

- ロール ID リストをキーに、権限配列をキャッシュ / 以角色 ID 列表为键缓存权限数组
- 5 分間有効。ロール変更時は最大 5 分の遅延が発生 / 5 分钟有效，角色变更最多有 5 分钟延迟

### 権限命名規則 / 权限命名规则

```
<モジュール>:<操作>
<module>:<action>

例 / 示例:
  inbound:view, inbound:receive, inbound:create
  shipment:view, shipment:edit, shipment:admin
  inventory:view, inventory:adjust, inventory:transfer
  settings:view, settings:edit
```

---

## 3. マルチテナント分離 / 多租户隔离

### 現在の実装 / 当前实现

- 全データモデルに `tenantId` フィールドを保持 / 所有数据模型都有 tenantId 字段
- `req.user.tenantId` を使ってクエリ条件にテナント ID を付与 / 通过 req.user.tenantId 过滤查询
- アプリケーション層でのフィルタリング（DB レベルの強制ではない）
  在应用层进行过滤（非数据库层面强制）

```typescript
// 典型的なテナントフィルタリング / 典型的租户过滤
const orders = await InboundOrder.find({
  tenantId: req.user.tenantId,
  ...otherFilters,
})
```

### 計画中: Supabase RLS / 计划中: Supabase RLS

Supabase 移行後は **Row Level Security (RLS)** でデータベースレベルの分離を実現予定。
迁移到 Supabase 后计划通过 **RLS** 实现数据库级别的隔离。

```sql
-- 計画中の RLS ポリシー例 / 计划中的 RLS 策略示例
CREATE POLICY tenant_isolation ON inbound_orders
  USING (tenant_id = auth.jwt()->>'tenantId');
```

---

## 4. API セキュリティ / API 安全

### レートリミット / 速率限制

`backend/src/api/middleware/rateLimit.ts`

| プリセット / 预设 | 対象 / 目标 | 制限 / 限制 | ウィンドウ / 时间窗口 |
|---|---|---|---|
| `globalLimiter` | 全 API | 1000 req | 15 分 |
| `authLimiter` | 認証エンドポイント (`/auth/*`) | 20 req | 15 分 |
| `writeLimiter` | 書き込み操作 (POST/PUT/DELETE) | 200 req | 15 分 |

#### 特記事項 / 注意事项

- **開発環境ではスキップ**: `NODE_ENV === 'development'` の場合、全リミッターが無効。
  开发环境跳过：`NODE_ENV === 'development'` 时所有限制器均禁用。
- **ヘルスチェック除外**: `/health`, `/health/liveness` はグローバルリミットから除外。
  健康检查排除：从全局限制中排除。
- **標準ヘッダー**: `draft-7` 準拠のレスポンスヘッダー (`RateLimit-*`) を返す。
  返回 draft-7 标准的响应头。

### 入力バリデーション / 输入验证

- **Zod** によるスキーマベースバリデーション / 基于 Zod 的 schema 验证
- リクエストボディ、クエリパラメータ、パスパラメータを検証 / 验证请求体、查询参数、路径参数
- バリデーションエラーは 400 + 詳細メッセージを返す / 验证错误返回 400 + 详细信息

### CORS

- 本番環境では許可オリジンを明示的に指定 / 生产环境明确指定允许的源
- `credentials: true` でクッキー送信を許可 / 允许发送 cookie

### Helmet

- Express Helmet ミドルウェアで HTTP セキュリティヘッダーを設定
  通过 Helmet 中间件设置 HTTP 安全头
- `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security` 等
  包括 X-Frame-Options, X-Content-Type-Options, HSTS 等

---

## 5. データ保護 / 数据保护

### パスワードハッシュ / 密码哈希

- **PBKDF2** (または bcrypt) でパスワードをハッシュ化 / 使用 PBKDF2 (或 bcrypt) 哈希密码
- ソルト付きハッシュを MongoDB に保存 / 加盐后存储到 MongoDB
- 平文パスワードは一切保存しない / 绝不存储明文密码

### JWT シークレット管理 / JWT 密钥管理

```bash
# 環境変数で設定 / 通过环境变量配置
JWT_SECRET=<strong-random-string>
JWT_EXPIRES_IN=24h
```

- **開発環境**: ハードコードされたフォールバック値あり (`zelix-wms-dev-secret-change-in-production`)
  开发环境有硬编码的回退值
- **本番環境**: `JWT_SECRET` 未設定時はアプリケーションの起動を推奨的にブロックすべき
  生产环境未设置时应阻止应用启动

### 環境変数一覧 (セキュリティ関連) / 安全相关环境变量

| 変数 / 变量 | 用途 / 用途 | 必須 / 必须 |
|---|---|---|
| `JWT_SECRET` | JWT 署名鍵 / JWT 签名密钥 | 本番: 必須 / 生产必须 |
| `JWT_EXPIRES_IN` | JWT 有効期間 / JWT 有效期 | 任意 (デフォルト: 24h) |
| `MONGODB_URI` | データベース接続文字列 / 数据库连接串 | 必須 |
| `NODE_ENV` | 実行環境 / 运行环境 | 必須 (production/development) |
| `CORS_ORIGIN` | 許可オリジン / 允许的源 | 本番: 推奨 |

### フロントエンドのトークン管理 / 前端令牌管理

```typescript
// localStorage に保存 / 存储到 localStorage
localStorage.setItem('wms_token', token)
localStorage.setItem('wms_current_user', JSON.stringify(user))

// 401 時に自動クリア + リダイレクト / 401 时自动清除并跳转
if (response.status === 401) {
  localStorage.removeItem('wms_token')
  localStorage.removeItem('wms_current_user')
  window.location.href = '/login'
}
```

---

## 6. OWASP Top 10 対策 / OWASP Top 10 防护

### A01: アクセス制御の不備 / 失效的访问控制

- `requireAuth` + `requireRole` + `requirePermission` の 3 層チェック
  三层校验：认证 + 角色 + 权限
- テナント ID によるデータ分離 / 通过 tenantId 隔离数据
- admin ロールのバイパスは意図的設計（全権限所持）/ admin 角色的绕过是有意设计

### A02: 暗号化の失敗 / 加密失败

- パスワードは PBKDF2/bcrypt でハッシュ / 密码使用 PBKDF2/bcrypt 哈希
- JWT シークレットは環境変数で管理 / JWT 密钥通过环境变量管理
- HTTPS は本番デプロイで Nginx/Cloudflare 等のリバースプロキシで終端
  HTTPS 在生产环境通过反向代理终端

### A03: インジェクション / 注入

- **MongoDB**: Mongoose ORM 経由でクエリ。直接文字列連結なし。
  通过 Mongoose ORM 查询，无直接字符串拼接。
- **入力バリデーション**: Zod スキーマで全入力を検証。
  通过 Zod schema 验证所有输入。
- **XSS**: Vue のテンプレートはデフォルトで HTML エスケープ。`v-html` は極力使用しない。
  Vue 模板默认 HTML 转义，尽量不使用 v-html。

### A04: 安全でない設計 / 不安全的设计

- ロールベースアクセス制御 (RBAC) で権限を体系的に管理
  通过 RBAC 系统性管理权限
- 最小権限の原則: operator/viewer は必要最小限の操作のみ許可
  最小权限原则：operator/viewer 仅允许最少必要操作

### A05: セキュリティの設定ミス / 安全配置错误

- Helmet で HTTP ヘッダーを自動設定 / 通过 Helmet 自动设置 HTTP 头
- 開発環境の認証スキップは `NODE_ENV` で厳格に制御
  开发环境的认证跳过通过 NODE_ENV 严格控制
- エラーメッセージは本番では詳細を隠蔽 / 生产环境隐藏错误详情

### A06: 脆弱で古いコンポーネント / 易受攻击和过时的组件

- `npm audit` で定期的に脆弱性チェック / 定期通过 npm audit 检查漏洞
- CI/CD パイプラインで自動チェック / 在 CI/CD 流水线中自动检查

### A07: 認証の失敗 / 身份验证失败

- `authLimiter` (20 req/15min) でブルートフォース攻撃を防止
  通过 authLimiter 防止暴力破解
- JWT 有効期間の制限 (24h) / JWT 有效期限制
- トークン期限切れ時の明確なエラーメッセージ / 令牌过期时的明确错误信息

### A08: ソフトウェアとデータの整合性の失敗 / 软件和数据完整性失败

- JWT 署名検証で改ざんを検知 / 通过 JWT 签名验证检测篡改
- `jwt.verify()` で期限切れ・無効トークンを明確に区別
  通过 jwt.verify() 明确区分过期和无效令牌

### A09: セキュリティログとモニタリングの失敗 / 安全日志和监控失败

- 認証失敗をログに記録 (`logger.warn`) / 记录认证失败日志
- 操作ログ・API ログで全変更を追跡（後述）/ 通过操作日志和 API 日志追踪所有变更

### A10: SSRF (サーバーサイドリクエストフォージェリ) / 服务器端请求伪造

- 外部 API 呼び出し (Yamato B2 Cloud 等) はサーバーサイドで実行
  外部 API 调用在服务器端执行
- URL のホワイトリスト制御で不正な送信先を防止
  通过 URL 白名单控制防止非法目标

---

## 7. ログ・監査 / 日志・审计

### ログ種別 / 日志类型

| ログ / 日志 | 保存先 / 存储 | 内容 / 内容 | TTL |
|---|---|---|---|
| `operationLog` | MongoDB | ユーザー操作 (CRUD) の記録 / 用户操作记录 | 180 日 |
| `apiLog` | MongoDB | 外部 API 呼び出しの記録 (B2 Cloud 等) / 外部 API 调用记录 | 180 日 |
| アプリケーションログ | stdout (pino) | サーバー実行ログ / 服务器运行日志 | インフラ依存 |

### 操作ログの記録内容 / 操作日志记录内容

```typescript
{
  userId: string       // 操作者 / 操作人
  tenantId: string     // テナント / 租户
  action: string       // 操作種別 (create, update, delete) / 操作类型
  resource: string     // 対象リソース (inboundOrder, shipmentOrder, ...) / 目标资源
  resourceId: string   // 対象 ID / 目标 ID
  details: object      // 変更内容 (before/after) / 变更详情
  timestamp: Date      // 実行日時 / 执行时间
  ipAddress: string    // クライアント IP / 客户端 IP
}
```

### 閲覧方法 / 查看方式

- **設定 > 管理・ログ > 操作ログ** (`/settings/operation-logs`)
  设置 > 管理・日志 > 操作日志
- **設定 > 管理・ログ > API 連携ログ** (`/settings/api-logs`)
  设置 > 管理・日志 > API 连携日志

---

## 8. 今後の改善計画 / 未来改进计划

### Phase 1: Supabase Auth 移行 / 迁移到 Supabase Auth

| 項目 / 项目 | 説明 / 描述 |
|---|---|
| **認証基盤** | 自前 JWT → Supabase Auth に移行 / 自建 JWT 迁移到 Supabase Auth |
| **MFA** | Supabase の TOTP/SMS MFA を有効化 / 启用 Supabase 的 MFA |
| **ソーシャルログイン** | 必要に応じて Google/Microsoft SSO を追加 / 按需添加 SSO |
| **リフレッシュトークン** | 自動トークンリフレッシュ / 自动令牌刷新 |
| **メール認証** | サインアップ時のメール確認 / 注册时的邮件验证 |

### Phase 2: RLS (Row Level Security) / 行级安全

| 項目 / 项目 | 説明 / 描述 |
|---|---|
| **テナント分離** | アプリ層フィルタ → DB 層 RLS / 应用层过滤 → 数据库层 RLS |
| **倉庫分離** | `warehouseIds` による行レベル制御 / 基于 warehouseIds 的行级控制 |
| **荷主分離** | `clientId` による行レベル制御 / 基于 clientId 的行级控制 |

### Phase 3: セキュリティ強化 / 安全强化

| 項目 / 项目 | 説明 / 描述 |
|---|---|
| **service_role キー管理** | Supabase service_role キーをシークレットマネージャーで管理 / 通过密钥管理器管理 |
| **監査ログの外部送信** | SIEM 連携 (CloudWatch / Datadog 等) / SIEM 集成 |
| **脆弱性スキャン自動化** | CI/CD に Snyk/Dependabot を統合 / 在 CI/CD 中集成漏洞扫描 |
| **ペネトレーションテスト** | 本番デプロイ前に実施 / 生产部署前执行 |
| **API キー認証** | 外部連携向け API キー方式の追加 / 为外部集成添加 API Key 认证 |
| **IP ホワイトリスト** | 管理画面へのアクセス制限 / 限制管理界面的访问 |

---

## クイックリファレンス: セキュリティミドルウェアの適用順序
## 快速参考: 安全中间件的应用顺序

```typescript
// 典型的なルート定義 / 典型的路由定义
app.use(helmet())                           // 1. HTTP ヘッダー保護 / HTTP 头保护
app.use(cors(corsOptions))                  // 2. CORS 設定
app.use(globalLimiter)                      // 3. グローバルレートリミット / 全局速率限制

// 認証ルート / 认证路由
app.use('/api/auth', authLimiter, authRouter)

// 保護ルート / 受保护路由
app.use('/api/inbound', requireAuth, writeLimiter, inboundRouter)
//                       ↑ 認証      ↑ 書込制限     ↑ ルーター

// ルート内での権限チェック / 路由内的权限校验
router.post('/receive',
  requirePermission('inbound:receive'),     // 4. 権限チェック / 权限校验
  controller.receive
)
```

この順序により、未認証リクエストは早期に拒否され、不要な処理コストを回避できる。
通过此顺序，未认证请求会被提前拒绝，避免不必要的处理开销。
