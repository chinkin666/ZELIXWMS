# セキュリティハードニング設計書 / 安全加固设计文档

> ZELIXWMS NestJS 11 + PostgreSQL 16 (Supabase) + Drizzle ORM
>
> 最終更新 / 最后更新: 2026-03-21
>
> 対象読者: セキュリティ担当者、開発者、運用チーム
> 目标读者: 安全负责人、开发者、运维团队

---

## 目次 / 目录

1. [OWASP Top 10 (2021) 逐条対策](#1-owasp-top-10-2021-逐条対策--逐条对策)
2. [HTTP セキュリティヘッダー完全設定](#2-http-セキュリティヘッダー完全設定--http-安全头完整配置)
3. [レートリミット完全設計](#3-レートリミット完全設計--速率限制完整设计)
4. [暗号化戦略](#4-暗号化戦略--加密策略)
5. [コンプライアンスマッピング (GDPR / 個人情報保護法)](#5-コンプライアンスマッピング--合规性映射)
6. [セキュリティテスト戦略](#6-セキュリティテスト戦略--安全测试策略)
7. [インシデント対応](#7-インシデント対応--事件响应)

---

## 1. OWASP Top 10 (2021) 逐条対策 / 逐条对策

### A01: Broken Access Control / アクセス制御の不備 / 失效的访问控制

**リスク概要 / 风险描述**:
認可されていないユーザーが他テナントのデータへアクセス、あるいは権限外の操作を実行する。
未授权用户访问其他租户数据，或执行超出权限的操作。

**現状の対策 / 当前缓解措施**:
- 3 層ガードパイプライン: `AuthGuard → TenantGuard → RoleGuard`
- `BaseRepository` が全クエリに `WHERE tenant_id = ?` を自動付与
- PostgreSQL RLS (Row-Level Security) によるデータベース層セーフティネット
- 5 段階ロール階層: `admin > manager > operator > viewer > client`

**目標の対策 / 目标缓解措施**:
- 属性ベースアクセス制御 (ABAC) の導入（倉庫単位の権限制御）
- API エンドポイントごとの権限マトリクスの自動テスト
- Broken Object Level Authorization (BOLA) テストの CI 組み込み

**実装詳細 / 实现详情**:

```typescript
// 3層ガードの適用例 / 三层守卫应用示例
@Controller('inbound-orders')
@UseGuards(AuthGuard, TenantGuard)
export class InboundController {

  @Post('receive')
  @Roles('admin', 'manager', 'operator')
  @UseGuards(RoleGuard)
  async receive(
    @Body() dto: ReceiveDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    // tenantId は TenantGuard が JWT app_metadata から抽出・検証済み
    // tenantId 由 TenantGuard 从 JWT app_metadata 提取并验证
    return this.inboundService.receive(tenantId, dto);
  }
}
```

```sql
-- RLS ポリシー（全テーブル共通テンプレート）/ RLS 策略（全表通用模板）
ALTER TABLE inbound_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON inbound_orders
  USING (
    tenant_id = (
      current_setting('request.jwt.claims', true)::jsonb
      -> 'app_metadata' ->> 'tenant_id'
    )::uuid
  );
```

**検証チェックリスト / 验证清单**:
- [ ] テナント A のトークンでテナント B のデータにアクセスできないこと
- [ ] `viewer` ロールで書き込み API が 403 を返すこと
- [ ] RLS 有効時に直接 SQL でもテナント分離が機能すること
- [ ] `warehouse_ids` 制約が正しく機能すること

---

### A02: Cryptographic Failures / 暗号化の失敗 / 加密失败

**リスク概要 / 风险描述**:
弱い暗号化アルゴリズム、平文での機密データ保存・送信。
使用弱加密算法，明文存储或传输敏感数据。

**現状の対策 / 当前缓解措施**:
- Supabase Auth: PBKDF2 SHA-512 (210,000 iterations) でパスワードハッシュ
- JWT: Supabase の RS256 秘密鍵で署名
- HTTPS: Nginx / Cloudflare でTLS終端

**目標の対策 / 目标缓解措施**:
- TLS 1.3 のみ許可（TLS 1.2 以下を無効化）
- フィールドレベル暗号化: AES-256-GCM で機密フィールドを暗号化
- 鍵ローテーション: 90 日ごとの自動ローテーション

**実装詳細 / 实现详情**:

```nginx
# Nginx TLS 設定 / Nginx TLS 配置
ssl_protocols TLSv1.3;
ssl_prefer_server_ciphers off;
ssl_ciphers 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256';
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:10m;
ssl_session_tickets off;
ssl_stapling on;
ssl_stapling_verify on;
```

```typescript
// フィールドレベル暗号化サービス / 字段级加密服务
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export class FieldEncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits

  encrypt(plaintext: string, key: Buffer): EncryptedField {
    const iv = randomBytes(12); // GCM 推奨 96-bit IV / GCM 推荐 96-bit IV
    const cipher = createCipheriv(this.algorithm, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();

    return {
      ciphertext: encrypted,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      version: 1, // 鍵バージョン / 密钥版本
    };
  }

  decrypt(field: EncryptedField, key: Buffer): string {
    const decipher = createDecipheriv(
      this.algorithm,
      key,
      Buffer.from(field.iv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(field.authTag, 'base64'));

    let decrypted = decipher.update(field.ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}

interface EncryptedField {
  ciphertext: string;
  iv: string;
  authTag: string;
  version: number;
}
```

**暗号化対象フィールド / 加密目标字段**:

| テーブル / 表 | フィールド / 字段 | 理由 / 原因 |
|---|---|---|
| `tenants` | `b2_cloud_credentials` | B2 Cloud API 認証情報 / B2 Cloud API 凭据 |
| `tenants` | `bank_account_info` | 銀行口座情報 / 银行账户信息 |
| `webhooks` | `secret` | HMAC 署名鍵 / HMAC 签名密钥 |
| `users` | `phone_number` | PII / 個人情報 |
| `clients` | `contact_email`, `contact_phone` | PII / 個人情報 |

---

### A03: Injection / インジェクション / 注入

**リスク概要 / 风险描述**:
SQL インジェクション、NoSQL インジェクション、OS コマンドインジェクション。
SQL 注入、NoSQL 注入、OS 命令注入。

**現状の対策 / 当前缓解措施**:
- Drizzle ORM: パラメータ化クエリのみ使用。直接 SQL 文字列連結なし
- NestJS `ValidationPipe` + `class-validator`: DTO レベル自動検証
- Zod 3.x: 複雑なビジネスルール検証
- Vue 3 テンプレート: デフォルト HTML エスケープ

**目標の対策 / 目标缓解措施**:
- `sql.raw()` / `sql.unsafe()` の使用を完全禁止（ESLint ルールで強制）
- SQLi ペイロードを含むファジングテストの CI 組み込み

**実装詳細 / 实现详情**:

```typescript
// Drizzle ORM — 安全なクエリ / 安全查询
// GOOD: パラメータ化 / 参数化
const orders = await db.select()
  .from(inboundOrders)
  .where(and(
    eq(inboundOrders.tenantId, tenantId),
    eq(inboundOrders.status, status),   // 自動パラメータ化 / 自动参数化
  ));

// BAD: 直接文字列連結（禁止）/ 直接拼接（禁止）
// db.execute(sql`SELECT * FROM orders WHERE status = '${status}'`);
```

```typescript
// ESLint カスタムルール: sql.raw() / sql.unsafe() の使用禁止
// ESLint 自定义规则: 禁止 sql.raw() / sql.unsafe()
// .eslintrc.js
{
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: "CallExpression[callee.property.name='raw']",
        message: 'sql.raw() は禁止です。パラメータ化クエリを使用してください / 禁止使用 sql.raw()',
      },
      {
        selector: "CallExpression[callee.property.name='unsafe']",
        message: 'sql.unsafe() は禁止です / 禁止使用 sql.unsafe()',
      },
    ],
  },
}
```

```typescript
// Zod バリデーション例 / Zod 验证示例
const createProductSchema = z.object({
  sku: z.string().min(1).max(100).regex(/^[a-zA-Z0-9\-_]+$/),
  name: z.string().min(1).max(500).trim(),
  quantity: z.number().int().nonnegative(),
  price: z.number().nonnegative().optional(),
  barcode: z.array(z.string().max(50)).max(10).optional(),
});
```

---

### A04: Insecure Design / 安全でない設計 / 不安全的设计

**リスク概要 / 风险描述**:
設計段階でのセキュリティ考慮不足。脅威モデリングの欠如。
设计阶段安全考虑不足，缺乏威胁建模。

**現状の対策 / 当前缓解措施**:
- RBAC による体系的な権限管理
- 最小権限の原則: 各ロールに必要最小限の操作のみ許可
- マルチテナント設計: 設計段階からテナント分離を前提

**目標の対策 / 目标缓解措施**:
- 各モジュールの脅威モデリング (STRIDE) を実施
- セキュリティ設計レビューの義務化
- ビジネスロジック不正利用テストの追加

**脅威モデリング (STRIDE) / 威胁建模**:

| モジュール / 模块 | Spoofing | Tampering | Repudiation | Info Disclosure | DoS | Elevation |
|---|---|---|---|---|---|---|
| **認証 / 认证** | JWT 偽造 | トークン改ざん | ログイン否認 | トークン漏洩 | ブルートフォース | 権限昇格 |
| **入庫 / 入库** | なりすまし操作 | 数量改ざん | 操作否認 | 在庫情報漏洩 | 大量リクエスト | ロール悪用 |
| **出庫 / 出库** | なりすまし出荷 | 配送先改ざん | 出荷否認 | 顧客情報漏洩 | PDF 生成攻撃 | API キー悪用 |
| **在庫 / 库存** | テナント横断 | 在庫数改ざん | 棚卸否認 | 価格情報漏洩 | 一括更新攻撃 | 管理者偽装 |
| **Webhook** | 偽装イベント | ペイロード改ざん | 配信否認 | SSRF | 大量配信 | 内部NW 侵入 |

**対策マトリクス / 对策矩阵**:

| 脅威 / 威胁 | 対策 / 对策 |
|---|---|
| Spoofing | Supabase Auth JWT + RS256 署名検証 |
| Tampering | HMAC-SHA256 署名 (Webhook)、PostgreSQL トランザクション |
| Repudiation | `operation_logs` 監査ログ（全ミューテーション記録）|
| Info Disclosure | フィールドレベル暗号化、RLS、最小応答原則 |
| DoS | 多層レートリミット、BullMQ キュー制御 |
| Elevation | 3 層ガード、RLS、JWT `app_metadata` 検証 |

---

### A05: Security Misconfiguration / セキュリティの設定ミス / 安全配置错误

**リスク概要 / 风险描述**:
デフォルト設定のまま運用、不要な機能の有効化、エラー情報の過剰開示。
使用默认配置运行、启用不必要的功能、过度暴露错误信息。

**現状の対策 / 当前缓解措施**:
- Helmet.js で HTTP セキュリティヘッダーを自動設定
- 環境変数の起動時 Zod 検証 (`config/env.schema.ts`)
- 本番環境でのエラー詳細隠蔽 (`AllExceptionsFilter`)

**目標の対策 / 目标缓解措施**:
- CSP (Content-Security-Policy) の完全実装
- HSTS preload リスト登録
- サーバー情報ヘッダーの完全除去
- 不要な HTTP メソッドの無効化

**実装詳細 / 实现详情**:

```typescript
// config/env.schema.ts — 起動時環境変数検証 / 启动时环境变量验证
import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['production', 'development', 'test']),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  DATABASE_URL: z.string().startsWith('postgresql://'),
  REDIS_URL: z.string().startsWith('redis'),
  CORS_ORIGIN: z.string().min(1),
  // 本番では全必須、開発では一部任意 / 生产全必须，开发部分可选
});

// main.ts で起動時に検証 / 启动时验证
const result = envSchema.safeParse(process.env);
if (!result.success) {
  console.error('環境変数検証失敗 / 环境变量验证失败:', result.error.format());
  process.exit(1);
}
```

```typescript
// 本番エラーフィルタ / 生产错误过滤器
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const isProduction = process.env.NODE_ENV === 'production';
    const response = host.switchToHttp().getResponse();

    // 本番ではスタックトレース・内部エラー詳細を隠蔽
    // 生产环境隐藏堆栈跟踪和内部错误详情
    const body = {
      success: false,
      error: isProduction
        ? 'Internal Server Error'
        : (exception as Error).message,
      // 本番では details を含めない / 生产不包含 details
      ...(isProduction ? {} : { stack: (exception as Error).stack }),
    };

    response.status(status).send(body);
  }
}
```

---

### A06: Vulnerable and Outdated Components / 脆弱で古いコンポーネント / 易受攻击和过时的组件

**リスク概要 / 风险描述**:
既知の脆弱性を持つライブラリの使用。
使用存在已知漏洞的库。

**現状の対策 / 当前缓解措施**:
- `npm audit` による定期チェック
- GitHub Dependabot 自動 PR
- CI/CD パイプライン内での `npm audit --audit-level=high`

**目標の対策 / 目标缓解措施**:
- Snyk の CI 統合（ライセンスコンプライアンスも含む）
- コンテナイメージスキャン (Trivy)
- SBoM (Software Bill of Materials) の自動生成

**実装詳細 / 实现详情**:

```yaml
# .github/workflows/security-scan.yml
name: Security Scan / セキュリティスキャン / 安全扫描

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 9 * * 1' # 毎週月曜 09:00 UTC / 每周一 09:00 UTC

jobs:
  npm-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci
      - run: npm audit --audit-level=high
        # high 以上の脆弱性でビルド失敗 / high 以上漏洞导致构建失败

  snyk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

  trivy-container:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build image
        run: docker build -t zelixwms-backend:scan .
      - uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'zelixwms-backend:scan'
          severity: 'HIGH,CRITICAL'
          exit-code: '1'

  sbom:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - uses: anchore/sbom-action@v0
        with:
          format: spdx-json
          output-file: sbom.spdx.json
      - uses: actions/upload-artifact@v4
        with:
          name: sbom
          path: sbom.spdx.json
```

**依存関係更新ポリシー / 依赖更新策略**:

| 深刻度 / 严重度 | 対応期限 / 响应期限 | 対応方法 / 响应方法 |
|---|---|---|
| Critical | 24 時間以内 / 24小时内 | 即座にパッチ適用、緊急リリース / 立即修补，紧急发布 |
| High | 7 日以内 / 7天内 | 次回リリースに含める / 包含在下次发布中 |
| Medium | 30 日以内 / 30天内 | 定期メンテナンス / 定期维护 |
| Low | 90 日以内 / 90天内 | 次回大規模更新時 / 下次大版本更新时 |

---

### A07: Identification and Authentication Failures / 認証の失敗 / 身份验证失败

**リスク概要 / 风险描述**:
ブルートフォース攻撃、弱いパスワードポリシー、セッション管理の不備。
暴力破解攻击、弱密码策略、会话管理不当。

**現状の対策 / 当前缓解措施**:
- Supabase Auth によるパスワードハッシュ管理 (PBKDF2 SHA-512, 210K iterations)
- `authLimiter`: 20 req/15min per IP
- リフレッシュトークンによるセッション管理
- MFA (TOTP) サポート

**目標の対策 / 目标缓解措施**:
- アカウント単位のレートリミット追加 (5 req/15min per account)
- パスワード強度ポリシーの強制 (Supabase Auth 設定)
- ログイン失敗時のアカウントロック (10 回失敗で 30 分ロック)
- 異常ログイン検知 (新規 IP / 地理的異常)

**実装詳細 / 实现详情**:

```typescript
// アカウント単位のレートリミット / 账户级速率限制
// Redis ベースの実装 / 基于 Redis 的实现
@Injectable()
export class AccountRateLimitGuard implements CanActivate {
  constructor(private readonly redis: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const email = request.body?.email;
    if (!email) return true;

    const key = `auth:account:${email.toLowerCase()}`;
    const attempts = await this.redis.incr(key);

    if (attempts === 1) {
      await this.redis.expire(key, 900); // 15 分 / 15分钟
    }

    if (attempts > 5) {
      throw new TooManyRequestsException(
        'アカウントのログイン試行回数が上限に達しました / 该账户登录尝试次数已达上限',
      );
    }

    return true;
  }
}
```

```typescript
// パスワードポリシー（Supabase Auth 設定）/ 密码策略（Supabase Auth 配置）
// supabase/config.toml
// [auth]
// min_password_length = 12
// password_requirements = "letters_digits_symbols"
//
// パスワード要件 / 密码要求:
// - 最低 12 文字 / 最少12个字符
// - 英大文字・小文字・数字・記号をそれぞれ 1 つ以上 / 大小写字母、数字、符号各至少1个
// - 過去 5 回のパスワードと重複不可 / 不可与最近5次密码重复
```

---

### A08: Software and Data Integrity Failures / ソフトウェアとデータの整合性の失敗 / 软件和数据完整性失败

**リスク概要 / 风险描述**:
CI/CD パイプラインの侵害、サプライチェーン攻撃、データ改ざん。
CI/CD 管道被入侵、供应链攻击、数据篡改。

**現状の対策 / 当前缓解措施**:
- Supabase JWT 署名検証で改ざんを検知
- PostgreSQL トランザクションでデータ整合性を保証
- Webhook: HMAC-SHA256 署名

**目標の対策 / 目标缓解措施**:
- SRI (Subresource Integrity) の全 CDN リソースへの適用
- Docker イメージの署名 (cosign)
- npm パッケージの `package-lock.json` integrity 検証
- GitHub Actions のピン留め (SHA ベース)

**実装詳細 / 实现详情**:

```html
<!-- SRI: CDN リソースの整合性検証 / CDN 资源完整性验证 -->
<script
  src="https://cdn.example.com/lib.js"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxAr..."
  crossorigin="anonymous"
></script>
```

```yaml
# GitHub Actions SHA ピン留め / SHA 固定
# BAD: タグはすり替え可能 / 标签可被替换
# - uses: actions/checkout@v4

# GOOD: SHA はイミュータブル / SHA 不可变
- uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
```

```dockerfile
# Docker イメージ署名 / Docker 镜像签名
# ビルド後に cosign で署名 / 构建后用 cosign 签名
# cosign sign --key cosign.key ghcr.io/zelixwms/backend:sha-abc123
```

```typescript
// Webhook HMAC-SHA256 署名 / Webhook HMAC-SHA256 签名
function signWebhookPayload(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
}

// 受信側での検証 / 接收端验证
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const expected = signWebhookPayload(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected),
  );
}
```

---

### A09: Security Logging and Monitoring Failures / セキュリティログとモニタリングの失敗 / 安全日志和监控失败

**リスク概要 / 风险描述**:
侵入の検知遅延、インシデント対応の遅れ、フォレンジック証拠の不足。
入侵检测延迟、事件响应延迟、取证证据不足。

**現状の対策 / 当前缓解措施**:
- `operation_logs`: 全ミューテーション（CRUD）を非同期記録
- `api_logs`: 外部 API 呼び出し（B2 Cloud 等）を記録
- Pino 9.x: 構造化 JSON ログ
- BullMQ: 非同期ログ処理（メインスレッド非ブロック）

**目標の対策 / 目标缓解措施**:
- セキュリティイベント専用ログテーブルの追加
- リアルタイム異常検知アラート
- ログの改ざん防止（追記のみ、削除不可ポリシー）
- 7 年間のアーカイブ保存

**実装詳細 / 实现详情**:

```sql
-- セキュリティイベントログ / 安全事件日志
CREATE TABLE security_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID,                          -- NULL = システムイベント / 系统事件
  event_type  VARCHAR(50) NOT NULL,          -- login_failed, token_revoked, ...
  severity    VARCHAR(10) NOT NULL           -- critical, high, medium, low
              CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  actor_id    UUID,                          -- 操作者（不明の場合 NULL）
  ip_address  INET,
  user_agent  TEXT,
  details     JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- 月次パーティション自動作成 / 月度分区自动创建
-- pg_partman で管理 / 由 pg_partman 管理
```

**監視対象セキュリティイベント / 监控目标安全事件**:

| イベント / 事件 | 深刻度 / 严重度 | アラート / 报警 |
|---|---|---|
| 同一 IP から 10 回以上のログイン失敗 / 同一IP 10次以上登录失败 | High | Slack + Email |
| 異なるテナントへのアクセス試行 / 尝试访问不同租户 | Critical | Slack + PagerDuty |
| 管理者権限の変更 / 管理员权限变更 | High | Slack |
| 異常な大量データエクスポート / 异常大量数据导出 | High | Slack |
| 深夜帯の管理操作 / 深夜管理操作 | Medium | Slack |
| JWT の手動無効化 / JWT 手动撤销 | Medium | ログのみ / 仅日志 |
| 新規 IP からの管理者ログイン / 新IP的管理员登录 | Medium | Email |
| RLS ポリシー違反 / RLS 策略违反 | Critical | Slack + PagerDuty |

```typescript
// 異常検知サービス / 异常检测服务
@Injectable()
export class AnomalyDetectionService {
  constructor(
    private readonly redis: RedisService,
    private readonly alertService: AlertService,
  ) {}

  async checkLoginAnomaly(userId: string, ip: string): Promise<void> {
    const knownIps = await this.redis.smembers(`user:known_ips:${userId}`);

    if (knownIps.length > 0 && !knownIps.includes(ip)) {
      await this.alertService.send({
        type: 'new_ip_login',
        severity: 'medium',
        message: `新規IPからのログイン検知 / 检测到新IP登录: ${ip}`,
        userId,
        ip,
      });
    }

    await this.redis.sadd(`user:known_ips:${userId}`, ip);
    await this.redis.expire(`user:known_ips:${userId}`, 90 * 86400); // 90日
  }
}
```

---

### A10: Server-Side Request Forgery (SSRF) / SSRF

**リスク概要 / 风险描述**:
サーバーが攻撃者の指定する URL にリクエストを送信し、内部ネットワークへのアクセスを許す。
服务器向攻击者指定的 URL 发送请求，允许访问内部网络。

**現状の対策 / 当前缓解措施**:
- Webhook URL の `isPrivateOrBlockedUrl()` による検証
- ブロック対象: `localhost`, `127.0.0.1`, `0.0.0.0`, `::1`, `169.254.169.254`
- プライベート IP レンジ: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`
- 外部 API 呼び出し (B2 Cloud) はサーバーサイドの固定 URL のみ

**目標の対策 / 目标缓解措施**:
- DNS 再バインディング攻撃対策（DNS 解決後の IP 再検証）
- URL ホワイトリスト制 (allowlist) の導入
- 外部リクエストのタイムアウト厳格化 (5 秒)
- 全外部リクエストの `api_logs` 記録

**実装詳細 / 实现详情**:

```typescript
// 現行の SSRF 防護実装（webhookController.ts より）
// 当前 SSRF 防护实现（来自 webhookController.ts）
function isPrivateOrBlockedUrl(urlString: string): boolean {
  const parsed = new URL(urlString);
  const hostname = parsed.hostname.toLowerCase();

  const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '169.254.169.254'];
  if (blockedHosts.includes(hostname)) return true;

  if (net.isIPv4(hostname)) {
    const parts = hostname.split('.').map(Number);
    if (parts[0] === 10) return true;                                  // 10.0.0.0/8
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // 172.16.0.0/12
    if (parts[0] === 192 && parts[1] === 168) return true;            // 192.168.0.0/16
    if (parts[0] === 127) return true;                                  // 127.0.0.0/8
    if (parts[0] === 0) return true;                                    // 0.0.0.0/8
    if (parts[0] === 169 && parts[1] === 254) return true;            // 169.254.0.0/16
  }
  return false;
}
```

```typescript
// 強化版: DNS 再バインディング対策付き / 增强版: 含 DNS 重绑定防护
import { lookup } from 'dns/promises';

async function validateExternalUrl(urlString: string): Promise<void> {
  // Step 1: URL フォーマット検証 / URL 格式验证
  const parsed = new URL(urlString);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new BadRequestException('HTTP/HTTPS のみ許可 / 仅允许 HTTP/HTTPS');
  }

  // Step 2: ホスト名レベルのブロック / 主机名级别阻止
  if (isPrivateOrBlockedUrl(urlString)) {
    throw new BadRequestException('プライベート URL は許可されていません / 不允许私有URL');
  }

  // Step 3: DNS 解決後の IP 再検証（DNS 再バインディング対策）
  // DNS 解析后的 IP 再验证（DNS 重绑定防护）
  const { address } = await lookup(parsed.hostname);
  const fakeUrl = new URL(urlString);
  fakeUrl.hostname = address;
  if (isPrivateOrBlockedUrl(fakeUrl.toString())) {
    throw new BadRequestException(
      'DNS 解決先がプライベート IP です / DNS 解析结果为私有IP',
    );
  }
}
```

---

## 2. HTTP セキュリティヘッダー完全設定 / HTTP 安全头完整配置

### Helmet.js 完全設定 / Helmet.js 完整配置

NestJS (Fastify) 向けの完全な Helmet 設定。
NestJS (Fastify) 的完整 Helmet 配置。

```typescript
// main.ts — Helmet 完全設定 / 完整配置
import helmet from '@fastify/helmet';

await app.register(helmet, {
  // Content-Security-Policy / 内容安全策略
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'strict-dynamic'",  // nonce ベースの動的スクリプト / 基于 nonce 的动态脚本
      ],
      styleSrc: ["'self'", "'unsafe-inline'"],  // Vue SPA インラインスタイル / Vue SPA 内联样式
      imgSrc: [
        "'self'",
        'data:',
        'blob:',
        'https://*.supabase.co',  // Supabase Storage
      ],
      fontSrc: ["'self'", 'data:'],
      connectSrc: [
        "'self'",
        'https://*.supabase.co',       // Supabase API
        'wss://*.supabase.co',         // Supabase Realtime
      ],
      mediaSrc: ["'none'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      frameAncestors: ["'none'"],       // X-Frame-Options: DENY 相当
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],       // HTTP → HTTPS 自動昇格
      blockAllMixedContent: [],
    },
  },

  // Strict-Transport-Security
  // HTTPS 強制。includeSubDomains + preload で HSTS preload リスト対応
  // 强制 HTTPS。includeSubDomains + preload 对应 HSTS preload 列表
  strictTransportSecurity: {
    maxAge: 63072000,           // 2 年 / 2年 (HSTS preload 要件)
    includeSubDomains: true,
    preload: true,
  },

  // X-Content-Type-Options: nosniff
  // MIME タイプスニッフィング防止 / 防止 MIME 类型嗅探
  xContentTypeOptions: true,    // nosniff (デフォルト有効)

  // X-Frame-Options: DENY
  // クリックジャッキング防止（CSP frame-ancestors と併用）
  // 防止点击劫持（与 CSP frame-ancestors 并用）
  xFrameOptions: { action: 'deny' },

  // Referrer-Policy
  // リファラー情報の漏洩制御 / 控制引用信息泄露
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },

  // X-DNS-Prefetch-Control
  // DNS プリフェッチ無効化 / 禁用 DNS 预获取
  xDnsPrefetchControl: { allow: false },

  // X-Download-Options: noopen (IE 用)
  xDownloadOptions: true,

  // X-Permitted-Cross-Domain-Policies: none
  xPermittedCrossDomainPolicies: { permittedPolicies: 'none' },
});

// Permissions-Policy (Helmet では未対応のため手動設定)
// Permissions-Policy（Helmet 不支持，手动设置）
app.getHttpAdapter().getInstance().addHook('onSend', (request, reply, payload, done) => {
  reply.header('Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), ' +
    'accelerometer=(), gyroscope=(), magnetometer=(), ' +
    'interest-cohort=()'  // FLoC オプトアウト / FLoC 退出
  );

  // Cross-Origin-Embedder-Policy
  reply.header('Cross-Origin-Embedder-Policy', 'require-corp');

  // Cross-Origin-Opener-Policy
  reply.header('Cross-Origin-Opener-Policy', 'same-origin');

  // Cross-Origin-Resource-Policy
  reply.header('Cross-Origin-Resource-Policy', 'same-origin');

  done(null, payload);
});
```

### ヘッダー一覧 / 头列表

| ヘッダー / 头 | 値 / 值 | 目的 / 目的 |
|---|---|---|
| `Content-Security-Policy` | (上記 directives 参照) | XSS・データ注入防止 / 防止 XSS 和数据注入 |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | HTTPS 強制 / 强制 HTTPS |
| `X-Content-Type-Options` | `nosniff` | MIME スニッフィング防止 / 防止 MIME 嗅探 |
| `X-Frame-Options` | `DENY` | クリックジャッキング防止 / 防止点击劫持 |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | リファラー漏洩制御 / 控制引用泄露 |
| `Permissions-Policy` | `camera=(), microphone=(), ...` | ブラウザ機能制限 / 浏览器功能限制 |
| `Cross-Origin-Embedder-Policy` | `require-corp` | クロスオリジン埋め込み制御 / 跨源嵌入控制 |
| `Cross-Origin-Opener-Policy` | `same-origin` | クロスオリジンウィンドウ分離 / 跨源窗口隔离 |
| `Cross-Origin-Resource-Policy` | `same-origin` | クロスオリジンリソース制御 / 跨源资源控制 |
| `X-DNS-Prefetch-Control` | `off` | DNS プリフェッチ無効 / 禁用 DNS 预获取 |

---

## 3. レートリミット完全設計 / 速率限制完整设计

### 設計原則 / 设计原则

- **Redis バックエンド**: インメモリではなく Redis で状態管理（水平スケーリング対応）
- **多層防御**: IP 単位 + アカウント単位 + テナント単位
- **標準ヘッダー**: `RateLimit-*` レスポンスヘッダー (RFC 9110 draft-7)
- **ヘルスチェック除外**: `/health`, `/health/liveness` はリミット対象外

### プリセット定義 / 预设定义

| プリセット / 预设 | 対象 / 目标 | 制限 / 限制 | ウィンドウ / 时间窗口 | キー / 键 |
|---|---|---|---|---|
| **global** | 全 API | 1000 req | 15 分 | IP |
| **auth** | `/auth/*` | 20 req | 15 分 | IP |
| **auth-account** | `/auth/login` | 5 req | 15 分 | email (account) |
| **write** | POST/PUT/DELETE | 200 req | 15 分 | IP |
| **import** | CSV/Excel インポート | 10 req | 1 時間 | tenant_id |
| **export** | PDF/CSV エクスポート | 50 req | 1 時間 | tenant_id |

### NestJS Throttler + Redis 実装 / NestJS Throttler + Redis 实现

```typescript
// throttler.config.ts — Redis バックエンドの Throttler 設定
// Redis 后端的 Throttler 配置
import { ThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';

export const throttlerConfig: ThrottlerModuleOptions = {
  throttlers: [
    {
      name: 'global',
      ttl: 15 * 60 * 1000,  // 15 分 / 15分钟
      limit: 1000,
    },
    {
      name: 'auth',
      ttl: 15 * 60 * 1000,
      limit: 20,
    },
    {
      name: 'write',
      ttl: 15 * 60 * 1000,
      limit: 200,
    },
  ],
  storage: new ThrottlerStorageRedisService(process.env.REDIS_URL),
  skipIf: (context) => {
    const request = context.switchToHttp().getRequest();
    // ヘルスチェックを除外 / 排除健康检查
    return ['/health', '/health/liveness'].includes(request.url);
  },
};

// app.module.ts
@Module({
  imports: [
    ThrottlerModule.forRoot(throttlerConfig),
  ],
})
export class AppModule {}
```

```typescript
// テナント単位のカスタムレートリミット / 租户级自定义速率限制
@Injectable()
export class TenantRateLimitGuard implements CanActivate {
  constructor(private readonly redis: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.tenantId;
    const path = request.route?.path || request.url;

    let limit: number;
    let windowSec: number;
    let keyPrefix: string;

    if (path.includes('/import')) {
      limit = 10;
      windowSec = 3600;     // 1 時間 / 1小时
      keyPrefix = 'rl:import';
    } else if (path.includes('/export') || path.includes('/pdf')) {
      limit = 50;
      windowSec = 3600;     // 1 時間 / 1小时
      keyPrefix = 'rl:export';
    } else {
      return true; // グローバル Throttler に任せる / 交由全局 Throttler 处理
    }

    const key = `${keyPrefix}:${tenantId}`;
    const current = await this.redis.incr(key);

    if (current === 1) {
      await this.redis.expire(key, windowSec);
    }

    if (current > limit) {
      const ttl = await this.redis.ttl(key);
      throw new HttpException(
        {
          success: false,
          error: `レートリミット超過。${ttl}秒後に再試行してください / 超出速率限制，请在${ttl}秒后重试`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
```

```typescript
// コントローラーでの適用例 / 控制器中的应用示例
@Controller('shipment-orders')
@UseGuards(AuthGuard, TenantGuard)
export class ShipmentController {

  @Post('import/csv')
  @Roles('admin', 'manager')
  @UseGuards(RoleGuard, TenantRateLimitGuard)
  async importCsv(@Body() dto: ImportCsvDto, @TenantId() tenantId: string) {
    // 10 req/hour per tenant
    return this.shipmentService.importCsv(tenantId, dto);
  }

  @Get('export/pdf')
  @Roles('admin', 'manager', 'operator')
  @UseGuards(RoleGuard, TenantRateLimitGuard)
  async exportPdf(@Query() query: ExportQueryDto, @TenantId() tenantId: string) {
    // 50 req/hour per tenant
    return this.shipmentService.exportPdf(tenantId, query);
  }
}
```

### レスポンスヘッダー / 响应头

```
RateLimit-Limit: 1000
RateLimit-Remaining: 987
RateLimit-Reset: 1711036800
Retry-After: 120          # 429 レスポンス時のみ / 仅在 429 响应时
```

---

## 4. 暗号化戦略 / 加密策略

### 4.1 通信の暗号化 (In Transit) / 传输加密

| 項目 / 项目 | 仕様 / 规格 |
|---|---|
| **プロトコル** | TLS 1.3 のみ（TLS 1.2 以下無効）/ 仅 TLS 1.3 |
| **暗号スイート** | TLS_AES_256_GCM_SHA384, TLS_CHACHA20_POLY1305_SHA256 |
| **証明書** | Let's Encrypt (自動更新) または Cloudflare Universal SSL |
| **HSTS** | `max-age=63072000; includeSubDomains; preload` |
| **OCSP Stapling** | 有効 / 启用 |
| **セッション** | TLS session tickets 無効（Forward Secrecy 確保）|

### 4.2 保存時の暗号化 (At Rest) / 静态加密

| 層 / 层 | 方式 / 方式 | 説明 / 说明 |
|---|---|---|
| **ディスク暗号化** | Supabase 管理の AES-256 暗号化 | PostgreSQL データファイル全体 / 整个 PostgreSQL 数据文件 |
| **バックアップ暗号化** | Supabase 管理の暗号化バックアップ | 自動日次バックアップ / 自动每日备份 |
| **Redis** | TLS 接続 + Upstash at-rest 暗号化 | キャッシュ・セッションデータ / 缓存和会话数据 |

### 4.3 フィールドレベル暗号化 (Field-Level) / 字段级加密

アプリケーション層で特定の機密フィールドを AES-256-GCM で暗号化。
在应用层使用 AES-256-GCM 加密特定敏感字段。

```typescript
// フィールド暗号化の適用パターン / 字段加密应用模式
// EncryptedField 型を JSONB カラムに保存 / EncryptedField 类型存储在 JSONB 列中

// テナント設定テーブルでの使用例 / 租户设置表中的使用示例
const tenantSettings = pgTable('tenant_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  b2CloudCredentials: jsonb('b2_cloud_credentials'),  // EncryptedField
  bankAccountInfo: jsonb('bank_account_info'),         // EncryptedField
  // ...
});
```

**暗号化フロー / 加密流程**:
```
書き込み / 写入:
  plaintext → AES-256-GCM(key, iv) → { ciphertext, iv, authTag, version } → JSONB

読み取り / 读取:
  JSONB → { ciphertext, iv, authTag, version } → AES-256-GCM-decrypt(key) → plaintext
```

### 4.4 鍵管理 / 密钥管理

| 項目 / 项目 | 仕様 / 规格 |
|---|---|
| **マスター鍵保管** | GCP Secret Manager または AWS KMS |
| **鍵導出** | HKDF-SHA256 でマスター鍵からフィールド鍵を導出 |
| **鍵バージョン** | `EncryptedField.version` で鍵バージョンを追跡 |
| **ローテーション周期** | 90 日ごと / 每90天 |
| **ローテーション方式** | ダブルライト: 新鍵で書き込み、旧鍵でも復号可能 |
| **緊急ローテーション** | 鍵漏洩時は即時ローテーション + 全フィールド再暗号化 |

```typescript
// 鍵ローテーションサービス / 密钥轮换服务
@Injectable()
export class KeyRotationService {
  // 鍵バージョンマップ / 密钥版本映射
  private keyVersions: Map<number, Buffer> = new Map();

  async rotateKey(): Promise<void> {
    const newVersion = this.currentVersion + 1;
    const newKey = await this.kms.generateDataKey();

    this.keyVersions.set(newVersion, newKey);
    this.currentVersion = newVersion;

    // バックグラウンドで既存データを再暗号化
    // 后台重新加密现有数据
    await this.reEncryptQueue.add('re-encrypt', {
      fromVersion: newVersion - 1,
      toVersion: newVersion,
    });
  }

  getKey(version: number): Buffer {
    const key = this.keyVersions.get(version);
    if (!key) throw new Error(`鍵バージョン ${version} が見つかりません / 密钥版本 ${version} 未找到`);
    return key;
  }
}
```

---

## 5. コンプライアンスマッピング / 合规性映射

### 5.1 データ分類 / 数据分类

| 分類 / 分类 | 説明 / 说明 | 例 / 示例 | 暗号化 / 加密 |
|---|---|---|---|
| **PII (個人識別情報)** | 個人を特定できる情報 / 可识别个人的信息 | 氏名、Email、電話番号、住所 | フィールドレベル暗号化 |
| **機密 (Sensitive)** | ビジネス上の機密情報 / 商业机密信息 | API キー、銀行口座、契約条件 | フィールドレベル暗号化 |
| **内部 (Internal)** | 社内利用の業務データ / 内部业务数据 | 在庫数、注文情報、配送情報 | At-rest 暗号化のみ |
| **公開 (Public)** | 公開可能な情報 / 可公开的信息 | 商品名、カテゴリ | 暗号化不要 |

### 5.2 GDPR マッピング / GDPR 映射

| GDPR 条項 / 条款 | 要件 / 要求 | ZELIXWMS 実装 / 实现 |
|---|---|---|
| **Art. 5(1)(b)** 目的限定 | データは特定の目的のみに使用 | テナント分離 + ロール制御で目的外アクセスを防止 |
| **Art. 5(1)(e)** 保存期間制限 | 必要以上にデータを保持しない | テーブル別 TTL ポリシー（下表参照）|
| **Art. 15** アクセス権 | データ主体が自身のデータを取得できる | ポータル API でユーザーデータエクスポート |
| **Art. 17** 削除権 (忘れられる権利) | データ主体が削除を要求できる | `DELETE /api/users/:id/data` + カスケード削除 |
| **Art. 25** データ保護 by Design | 設計段階からプライバシー保護 | マルチテナント分離 + フィールドレベル暗号化 |
| **Art. 30** 処理活動の記録 | データ処理活動の記録を維持 | `operation_logs` + `security_events` |
| **Art. 32** セキュリティ措置 | 適切な技術的・組織的措置 | 本文書全体が対象 |
| **Art. 33** 侵害通知 | 72 時間以内にデータ保護当局へ通知 | インシデント対応プロセス（第 7 章参照）|

### 5.3 個人情報保護法 (APPI) マッピング / 日本个人信息保护法映射

| APPI 条項 / 条款 | 要件 / 要求 | ZELIXWMS 実装 / 实现 |
|---|---|---|
| **第 20 条** 安全管理措置 | 個人データの安全管理 | 暗号化 + アクセス制御 + 監査ログ |
| **第 23 条** 第三者提供制限 | 本人同意なく第三者に提供しない | テナント分離で他テナントへのデータ漏洩防止 |
| **第 28 条** 開示請求 | 本人から開示請求があった場合に対応 | ポータル API でデータエクスポート |
| **第 29 条** 訂正・削除請求 | 本人から訂正・削除請求があった場合に対応 | 管理画面 + API で対応 |
| **第 26 条** 漏洩等の報告 | 漏洩時に個人情報保護委員会へ報告 | インシデント対応プロセス |
| **第 22 条** 委託先の監督 | 個人データ処理委託先の監督 | Supabase DPA (Data Processing Agreement) |

### 5.4 データ保持ポリシー / 数据保留策略

| テーブル / 表 | 保持期間 / 保留期限 | 削除方式 / 删除方式 | 根拠 / 依据 |
|---|---|---|---|
| `users` | アカウント有効期間 + 30 日 | 論理削除 → 30 日後物理削除 | GDPR Art. 17 |
| `clients` | テナント有効期間 + 90 日 | 論理削除 → 90 日後物理削除 | APPI 第 20 条 |
| `inbound_orders` | 7 年 | パーティション DROP | 税法（帳簿保存義務）|
| `shipment_orders` | 7 年 | パーティション DROP | 税法（帳簿保存義務）|
| `inventory_transactions` | 7 年 | パーティション DROP | 税法（帳簿保存義務）|
| `operation_logs` | 180 日 (運用) / 7 年 (アーカイブ) | パーティション DROP → S3 アーカイブ | 監査要件 |
| `api_logs` | 180 日 | パーティション DROP | 運用要件 |
| `security_events` | 7 年 | パーティション DROP → S3 アーカイブ | コンプライアンス |
| `notifications` | 90 日 | バッチ削除 | 運用要件 |

### 5.5 削除権 (Right to Deletion) 実装 / 删除权实现

```typescript
// ユーザーデータ完全削除サービス / 用户数据完全删除服务
@Injectable()
export class DataDeletionService {
  async deleteUserData(tenantId: string, userId: string): Promise<DeletionReport> {
    return await this.db.transaction(async (tx) => {
      const report: DeletionReport = { deletedTables: [], totalRows: 0 };

      // 1. 操作ログの匿名化（削除ではなくユーザー情報を匿名化）
      //    操作日志匿名化（不删除，而是将用户信息匿名化）
      const anonResult = await tx.update(operationLogs)
        .set({ userId: ANONYMOUS_USER_ID, details: sql`details - 'user_name'` })
        .where(and(
          eq(operationLogs.tenantId, tenantId),
          eq(operationLogs.userId, userId),
        ));
      report.deletedTables.push({ table: 'operation_logs', action: 'anonymized', rows: anonResult.rowCount });

      // 2. ユーザーの通知を削除 / 删除用户通知
      const notifResult = await tx.delete(notifications)
        .where(and(
          eq(notifications.tenantId, tenantId),
          eq(notifications.userId, userId),
        ));
      report.deletedTables.push({ table: 'notifications', action: 'deleted', rows: notifResult.rowCount });

      // 3. Supabase Auth からユーザーを削除 / 从 Supabase Auth 删除用户
      await this.supabaseAdmin.auth.admin.deleteUser(userId);

      // 4. users テーブルから物理削除 / 从 users 表物理删除
      await tx.delete(users)
        .where(and(
          eq(users.tenantId, tenantId),
          eq(users.id, userId),
        ));
      report.deletedTables.push({ table: 'users', action: 'deleted', rows: 1 });

      // 5. 削除記録をセキュリティイベントに記録（GDPR Art. 30 準拠）
      //    在安全事件中记录删除（GDPR Art. 30 合规）
      await tx.insert(securityEvents).values({
        tenantId,
        eventType: 'user_data_deleted',
        severity: 'medium',
        details: { userId, report },
      });

      return report;
    });
  }
}
```

---

## 6. セキュリティテスト戦略 / 安全测试策略

### 6.1 テスト種別 / 测试类型

| 種別 / 类型 | ツール / 工具 | 頻度 / 频率 | 対象 / 目标 |
|---|---|---|---|
| **SAST (静的解析)** | ESLint security plugin, Semgrep | 全 PR | ソースコード / 源代码 |
| **DAST (動的解析)** | OWASP ZAP | 週次 / 每周 | 稼働中 API |
| **依存関係スキャン** | npm audit, Snyk, Dependabot | 全 PR + 週次 | node_modules |
| **コンテナスキャン** | Trivy | 全 PR | Docker イメージ |
| **シークレットスキャン** | TruffleHog, GitLeaks | 全 PR | Git 履歴 |
| **ペネトレーションテスト** | 外部業者 / 外部公司 | 年 2 回 / 每年2次 | 全システム / 全系统 |
| **BOLA テスト** | カスタムスクリプト | 全 PR (CI) | API エンドポイント |

### 6.2 SAST 設定 / SAST 配置

```yaml
# .github/workflows/sast.yml
name: SAST / 静的セキュリティ解析 / 静态安全分析

on: [push, pull_request]

jobs:
  eslint-security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci
      - run: npx eslint --config .eslintrc.security.js 'src/**/*.ts'

  semgrep:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11
      - uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/typescript
            p/nodejs
            p/owasp-top-ten
            p/sql-injection

  trufflehog:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11
        with:
          fetch-depth: 0
      - uses: trufflesecurity/trufflehog@main
        with:
          extra_args: --only-verified
```

### 6.3 DAST 設定 / DAST 配置

```yaml
# .github/workflows/dast.yml
name: DAST / 動的セキュリティ解析 / 动态安全分析

on:
  schedule:
    - cron: '0 3 * * 1'  # 毎週月曜 03:00 UTC / 每周一 03:00 UTC

jobs:
  zap-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11
      - name: Start application
        run: |
          docker compose -f docker-compose.test.yml up -d
          sleep 30
      - name: OWASP ZAP Full Scan
        uses: zaproxy/action-full-scan@v0.10.0
        with:
          target: 'http://localhost:3000'
          rules_file_name: '.zap-rules.tsv'
          cmd_options: '-a -j'
      - uses: actions/upload-artifact@v4
        with:
          name: zap-report
          path: report_html.html
```

### 6.4 BOLA テスト / BOLA 测试

```typescript
// テナント分離自動テスト / 租户隔离自动测试
describe('BOLA Protection / テナント分離テスト / 租户隔离测试', () => {
  let tenantAToken: string;
  let tenantBToken: string;
  let tenantAOrderId: string;

  beforeAll(async () => {
    tenantAToken = await loginAs('admin@tenant-a.com');
    tenantBToken = await loginAs('admin@tenant-b.com');
    // テナント A にテストデータ作成 / 在租户A创建测试数据
    const order = await createOrder(tenantAToken, { /* ... */ });
    tenantAOrderId = order.id;
  });

  it('テナント B がテナント A のデータにアクセスできないこと / 租户B无法访问租户A的数据', async () => {
    const res = await request(app)
      .get(`/api/inbound-orders/${tenantAOrderId}`)
      .set('Authorization', `Bearer ${tenantBToken}`);

    expect(res.status).toBe(404); // 403 ではなく 404（情報漏洩防止）
  });

  it('テナント B がテナント A のデータを更新できないこと / 租户B无法更新租户A的数据', async () => {
    const res = await request(app)
      .put(`/api/inbound-orders/${tenantAOrderId}`)
      .set('Authorization', `Bearer ${tenantBToken}`)
      .send({ status: 'cancelled' });

    expect(res.status).toBe(404);
  });

  it('テナント B がテナント A のデータを削除できないこと / 租户B无法删除租户A的数据', async () => {
    const res = await request(app)
      .delete(`/api/inbound-orders/${tenantAOrderId}`)
      .set('Authorization', `Bearer ${tenantBToken}`);

    expect(res.status).toBe(404);
  });
});
```

### 6.5 ペネトレーションテストスケジュール / 渗透测试计划

| 時期 / 时间 | 範囲 / 范围 | 実施者 / 执行者 | 成果物 / 成果物 |
|---|---|---|---|
| **毎年 4 月** | 全 API + 認証フロー | 外部セキュリティ業者 | 報告書 + 修正計画 |
| **毎年 10 月** | インフラ + ネットワーク | 外部セキュリティ業者 | 報告書 + 修正計画 |
| **リリース前** | 新機能の脅威モデリング | 内部チーム | STRIDE 分析結果 |
| **四半期** | 自動化ペネテスト (ZAP) | CI/CD | ZAP レポート |

---

## 7. インシデント対応 / 事件响应

### 7.1 インシデント深刻度レベル / 事件严重度级别

| レベル / 级别 | 定義 / 定义 | 例 / 示例 | 対応時間 / 响应时间 |
|---|---|---|---|
| **P1 - Critical** | データ漏洩、システム全停止 | テナントデータの外部漏洩、RCE | 15 分以内 |
| **P2 - High** | 部分サービス障害、権限昇格 | 認証バイパス、SSRF 成功 | 1 時間以内 |
| **P3 - Medium** | 限定的な影響 | レートリミット回避、XSS | 4 時間以内 |
| **P4 - Low** | 最小限の影響 | 情報漏洩（非機密）| 24 時間以内 |

### 7.2 対応フロー / 响应流程

```
Phase 1: 検知 (Detection) / 检测
┌──────────────────────────────────────────────┐
│ 1. セキュリティイベントアラート受信              │
│    接收安全事件告警                              │
│ 2. 初期トリアージ（深刻度判定）                   │
│    初始分类（严重度判定）                         │
│ 3. インシデント対応チーム招集                     │
│    召集事件响应团队                              │
│ 4. 影響範囲の初期評価                            │
│    初始评估影响范围                              │
└──────────────────────┬───────────────────────┘
                       ▼
Phase 2: 封じ込め (Containment) / 遏制
┌──────────────────────────────────────────────┐
│ 5. 侵害されたアカウント/セッションの即時無効化     │
│    立即禁用被入侵的账户/会话                      │
│ 6. 影響を受けるエンドポイントの一時停止            │
│    暂停受影响的端点                              │
│ 7. ネットワークレベルでのブロック（必要に応じて）     │
│    网络级别阻断（如需要）                         │
│ 8. フォレンジック用のログ・証拠保全                 │
│    保全取证用日志和证据                           │
└──────────────────────┬───────────────────────┘
                       ▼
Phase 3: 根絶 (Eradication) / 根除
┌──────────────────────────────────────────────┐
│ 9. 脆弱性の特定と修正                            │
│    识别并修复漏洞                                │
│ 10. 影響を受けたシークレットのローテーション         │
│     轮换受影响的密钥                              │
│ 11. マルウェア/バックドアの除去                     │
│     清除恶意软件/后门                             │
│ 12. パッチ適用と再デプロイ                         │
│     打补丁并重新部署                              │
└──────────────────────┬───────────────────────┘
                       ▼
Phase 4: 復旧 (Recovery) / 恢复
┌──────────────────────────────────────────────┐
│ 13. 段階的なサービス復旧                          │
│     分阶段恢复服务                               │
│ 14. 監視強化（再発防止確認）                       │
│     加强监控（确认未再发）                         │
│ 15. ユーザー/テナントへの通知                      │
│     通知用户/租户                                │
│ 16. 規制当局への報告（必要な場合）                  │
│     向监管机构报告（如需要）                       │
└──────────────────────┬───────────────────────┘
                       ▼
Phase 5: 教訓 (Lessons Learned) / 经验总结
┌──────────────────────────────────────────────┐
│ 17. インシデント報告書の作成                       │
│     撰写事件报告                                 │
│ 18. ポストモーテム会議の実施                       │
│     进行事后回顾会议                              │
│ 19. 対策の改善・追加                              │
│     改进和追加对策                                │
│ 20. セキュリティテスト計画の更新                    │
│     更新安全测试计划                              │
└──────────────────────────────────────────────┘
```

### 7.3 連絡先リスト / 联系人列表

| 役割 / 角色 | 連絡手段 / 联系方式 | 応答目標 / 响应目标 |
|---|---|---|
| **インシデント管理者** | Slack #security-incidents + 電話 | 15 分 (P1/P2) |
| **テックリード** | Slack + 電話 | 30 分 |
| **インフラ担当** | Slack + PagerDuty | 15 分 (P1) |
| **法務 / 法务** | Email + 電話 | 2 時間 |
| **経営層 / 经营层** | 電話 | 1 時間 (P1) |

### 7.4 規制当局への報告義務 / 向监管机构的报告义务

| 規制 / 法规 | 報告期限 / 报告期限 | 報告先 / 报告对象 | 条件 / 条件 |
|---|---|---|---|
| **GDPR Art. 33** | 72 時間以内 | データ保護当局 (DPA) | 個人データ侵害が発生した場合 |
| **APPI 第 26 条** | 速やかに（概ね 3-5 日） | 個人情報保護委員会 | 1,000 人超の個人データ漏洩、又は要配慮個人情報の漏洩 |

### 7.5 インシデント報告書テンプレート / 事件报告模板

```markdown
# インシデント報告書 / 事件报告

## 基本情報 / 基本信息
- インシデント ID / 事件ID: INC-YYYY-NNN
- 発生日時 / 发生时间: YYYY-MM-DD HH:MM (JST)
- 検知日時 / 检测时间: YYYY-MM-DD HH:MM (JST)
- 深刻度 / 严重度: P1 / P2 / P3 / P4
- ステータス / 状态: 調査中 / 封じ込め済 / 解決済 / クローズ

## 影響範囲 / 影响范围
- 影響テナント数 / 受影响租户数:
- 影響ユーザー数 / 受影响用户数:
- データ漏洩の有無 / 是否有数据泄露:
- サービス停止時間 / 服务中断时间:

## タイムライン / 时间线
| 時刻 / 时间 | イベント / 事件 |
|---|---|

## 根本原因 / 根本原因

## 対応内容 / 响应内容

## 再発防止策 / 防止再发措施
```

---

## 付録 A: セキュリティ設定チェックリスト / 附录 A: 安全配置检查清单

### デプロイ前チェックリスト / 部署前检查清单

- [ ] 全環境変数が設定済み（Zod 検証合格）/ 所有环境变量已设置
- [ ] TLS 1.3 のみ有効 / 仅启用 TLS 1.3
- [ ] HSTS ヘッダー設定済み / HSTS 头已设置
- [ ] CSP ヘッダー設定済み / CSP 头已设置
- [ ] Helmet.js 有効 / Helmet.js 已启用
- [ ] CORS オリジン明示設定 / CORS 源明确设置
- [ ] レートリミット有効（Redis バックエンド）/ 速率限制已启用（Redis 后端）
- [ ] RLS ポリシー全テーブルに適用 / RLS 策略已应用于所有表
- [ ] npm audit でクリティカル脆弱性なし / npm audit 无关键漏洞
- [ ] シークレットスキャンでリーク検出なし / 密钥扫描无泄露
- [ ] エラーメッセージが本番用（詳細非公開）/ 错误消息为生产用（不公开详情）
- [ ] デバッグモード無効 / 调试模式已禁用
- [ ] `X-Powered-By` ヘッダー除去済み / 已移除 X-Powered-By 头
- [ ] 不要な API エンドポイント無効化 / 已禁用不必要的 API 端点

### コードレビューチェックリスト / 代码审查检查清单

- [ ] `sql.raw()` / `sql.unsafe()` 未使用 / 未使用 sql.raw()/sql.unsafe()
- [ ] 全入力に Zod / class-validator バリデーションあり / 所有输入有验证
- [ ] テナント ID フィルタが全クエリに存在 / 所有查询包含 tenant_id 过滤
- [ ] 認証・認可ガードが全エンドポイントに適用 / 所有端点应用了认证授权守卫
- [ ] エラーハンドリングでスタックトレース非露出 / 错误处理不暴露堆栈跟踪
- [ ] ハードコードされたシークレットなし / 无硬编码密钥
- [ ] 新規外部依存関係のライセンス確認 / 新外部依赖的许可证确认
- [ ] SSRF 対策（外部 URL アクセス時）/ SSRF 防护（访问外部 URL 时）

---

## 付録 B: 関連ドキュメント / 附录 B: 相关文档

| ドキュメント / 文档 | パス / 路径 |
|---|---|
| セキュリティ設計書 / 安全设计文档 | `docs/design/03-security-design.md` |
| バックエンドアーキテクチャ | `docs/migration/03-backend-architecture.md` |
| データベース設計 | `docs/migration/02-database-design.md` |
| API マッピング | `docs/migration/04-api-mapping.md` |
| 開発ガイド | `docs/migration/05-development-guide.md` |

---

> **最終更新 / 最后更新**: 2026-03-21
> **作成者 / 作者**: Security Architecture Team
> **レビュー予定 / 审查计划**: 四半期ごと（次回 2026-06）/ 每季度（下次 2026-06）
```

---

The complete document is ready. Here is a summary of what it covers and the key file references:

**Document**: `/Users/kin/Documents/GitHub/ZELIXWMS/docs/architecture/08-security-hardening.md`

**Key source files referenced during analysis**:
- `/Users/kin/Documents/GitHub/ZELIXWMS/docs/design/03-security-design.md` -- existing security design (authentication, authorization, OWASP checklist baseline)
- `/Users/kin/Documents/GitHub/ZELIXWMS/backend/src/api/middleware/rateLimit.ts` -- current rate limiting implementation (express-rate-limit, in-memory, 3 presets)
- `/Users/kin/Documents/GitHub/ZELIXWMS/backend/src/app.ts` -- current Helmet configuration (minimal, CSP disabled)
- `/Users/kin/Documents/GitHub/ZELIXWMS/backend/src/api/controllers/webhookController.ts` -- existing SSRF protection (`isPrivateOrBlockedUrl`)
- `/Users/kin/Documents/GitHub/ZELIXWMS/docs/migration/02-database-design.md` -- database schema with RLS and tenant isolation
- `/Users/kin/Documents/GitHub/ZELIXWMS/docs/migration/03-backend-architecture.md` -- NestJS architecture (Fastify, Drizzle, guard pipeline)

**What the document contains (approximately 780 lines)**:

1. **OWASP Top 10 (2021)** -- all 10 items with risk description, current mitigation, target mitigation, and implementation code for each (A01 through A10)
2. **HTTP security headers** -- complete Helmet.js Fastify configuration with CSP full directives, HSTS preload, Permissions-Policy, COEP, COOP, CORP
3. **Rate limiting** -- 6 presets (global, auth IP, auth account, write, import, export) with Redis-backed NestJS Throttler implementation and tenant-level custom guard
4. **Encryption strategy** -- TLS 1.3, Supabase at-rest, AES-256-GCM field-level encryption with key rotation service
5. **Compliance mapping** -- GDPR article-by-article mapping, Japan APPI mapping, data classification, per-table retention policies, right-to-deletion implementation
6. **Security testing** -- SAST (ESLint, Semgrep, TruffleHog), DAST (OWASP ZAP), dependency scanning (Snyk, Trivy), BOLA tests, penetration testing schedule
7. **Incident response** -- severity levels, 5-phase response flow, contact list, regulatory reporting obligations (GDPR 72h, APPI), incident report template

**Notable gaps identified in the current codebase that this document addresses**:
- Current rate limiting at `/Users/kin/Documents/GitHub/ZELIXWMS/backend/src/api/middleware/rateLimit.ts` uses in-memory `express-rate-limit` -- the document prescribes migration to Redis-backed `@nestjs/throttler` with tenant-level limits
- Current Helmet config at line 38 of `app.ts` has `contentSecurityPolicy` effectively disabled for Vue SPA -- the document provides a full CSP directive set compatible with Vue
- No field-level encryption exists currently -- the document specifies AES-256-GCM for sensitive fields (B2 Cloud credentials, bank accounts, API keys)
- SSRF protection in `webhookController.ts` lacks DNS rebinding defense -- the document adds DNS resolution post-validation
- No account-level rate limiting exists (only IP-level) -- the document adds 5 req/15min per email address

You will need to create the directory `docs/architecture/` and save the file. You should also update `docs/devlog.md` per the project's documentation sync rules.
