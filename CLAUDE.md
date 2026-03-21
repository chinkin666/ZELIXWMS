# Project Rules

## DO NOT MODIFY: Yamato B2 Cloud 連携

以下のファイル・機能は安定稼働中のため変更禁止:

- `backend/src/services/yamatoB2Service.ts` の認証・バリデーション・エクスポート周り
  - `authenticatedFetch()`: 500 + 'entry' セッション切れ自動リトライ
  - `validateShipments()`: 日本語キー + `/api/v1/shipments/validate`
  - `exportShipments()`: 英語キー + `/api/v1/shipments`
  - `login()` / `loginFromApi()`: 3層キャッシュ（インメモリ→MongoDB→API）
  - `addressMapping`: consignee/shipper 住所フィールドマッピング

- `backend/src/utils/yamatoB2Format.ts` の `b2ApiToJapaneseKeyMapping`

### 背景
- 2026-03-12 に長時間デバッグして安定化
- proxy の 'entry' エラーは B2 Cloud session 切れが原因、自動リトライで解決済み
- `/api/v1/shipments/validate-full` は使わない（幅チェッカーにバグあり）
- `/api/v1/shipments/validate` (ShipmentInput schema, 日本語キー) を使用

### 機能追加時の注意
B2 Cloud 関連の変更が必要な場合は、既存のコアロジックを変更せず上に構築すること。

## 文档同步规则 / ドキュメント同期ルール

当以下内容发生变更时，**必须**同步更新对应的文档，然后再进行代码开发：
変更が発生した場合、対応するドキュメントを**必ず**先に更新してから開発を行うこと：

| 变更类型 / 変更種別 | 对应文档 / 対応ドキュメント |
|---|---|
| 需求变更 / 要件変更 | `docs/migration/01-requirements.md` |
| DB设计变更 / DB設計変更 | `docs/migration/02-database-design.md` |
| 架构变更 / アーキテクチャ変更 | `docs/migration/03-backend-architecture.md` |
| API变更 / API変更 | `docs/migration/04-api-mapping.md` |
| 开发计划变更 / 開発計画変更 | `docs/migration/06-migration-plan.md` |

### 流程 / フロー
1. 识别变更影响的文档 / 変更が影響するドキュメントを特定
2. 先更新文档，记录变更内容 / 先にドキュメントを更新し、変更内容を記録
3. 在开发记录中追加条目 / 開発記録にエントリを追加（`docs/devlog.md`）
4. 再进行代码开发 / その後コード開発を行う

## 开发记录 / 開発記録

所有开发活动都必须记录到 `docs/devlog.md`，包括但不限于：
すべての開発活動は `docs/devlog.md` に記録すること：

- 功能新增 / 機能追加
- Bug 修复 / バグ修正
- 重构 / リファクタリング
- 设计决策及其理由 / 設計決定とその理由
- 变更的影响范围 / 変更の影響範囲

### 记录格式 / 記録フォーマット
```
## [YYYY-MM-DD] 简要标题 / 簡単なタイトル

**变更类型 / 変更種別**: feat | fix | refactor | docs | chore
**影响范围 / 影響範囲**: 涉及的模块或文件 / 関連モジュール・ファイル
**关联文档 / 関連ドキュメント**: 同步更新了哪些文档 / 同期更新したドキュメント

### 内容 / 内容
（描述做了什么、为什么这样做 / 何をしたか、なぜそうしたか）
```

## 移行関連 / 迁移相关

NestJS + PostgreSQL (Supabase) への移行を計画中。設計ドキュメント:
正在计划迁移到 NestJS + PostgreSQL (Supabase)。设计文档：

| ドキュメント | パス |
|-------------|------|
| 要件定義 | `docs/migration/01-requirements.md` |
| DB設計 | `docs/migration/02-database-design.md` |
| アーキテクチャ | `docs/migration/03-backend-architecture.md` |
| API マッピング | `docs/migration/04-api-mapping.md` |
| 開発ガイド | `docs/migration/05-development-guide.md` |
| 実施計画 | `docs/migration/06-migration-plan.md` |

### 移行時の注意 / 迁移注意事项
- `yamatoB2Service.ts` は NestJS でも変更禁止（wrapper で囲む）
- フロントエンド（Vue 3）は変更しない（API URL のみ変更）
- 全 109 画面の機能維持が必須
- 既存 1807 テストの互換性維持

## 双语备注规则 / バイリンガル注釈ルール

所有开发相关的备注、注释、文档说明必须使用**中文 + 日文**双语：
開発関連のコメント・注釈・ドキュメント説明はすべて**中国語 + 日本語**の二言語で記載すること：

- 代码注释 / コードコメント（中日双语 / 中日バイリンガル）
- commit message（中日双语 / 中日バイリンガル）
- 文档内容 / ドキュメント内容（中日双语 / 中日バイリンガル）
- PR 描述 / PR 説明（中日双语 / 中日バイリンガル）
- 开发记录 devlog / 開発記録 devlog（中日双语 / 中日バイリンガル）
