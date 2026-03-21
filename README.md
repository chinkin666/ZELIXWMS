# ZELIX WMS — 日本 3PL 倉庫管理システム
# ZELIX WMS — 日本 3PL 仓库管理系统

> LOGIFAST 109 項目 100% 実装 / 1807 テスト / B2 Cloud 連携済み

## システム概要 / 系统概述

| アプリ | ポート | 説明 |
|--------|--------|------|
| Backend (Express + TS) | 4000 | REST API + GraphQL + BullMQ |
| Frontend (Vue 3 + Vite) | 4001 | 倉庫オペレーター画面 |
| Portal (Vue 3) | 4002 | 顧客ポータル |
| Admin (Vue 3) | 4003 | プラットフォーム管理 |
| MongoDB | 27017 | メインDB |
| Redis | 6379 | キャッシュ + ジョブキュー |

## クイックスタート / 快速开始

```bash
# 1. DB 起動（Docker）
docker compose up -d mongo redis

# 2. 依存関係インストール
npm install

# 3. 初期データ投入
npm run seed

# 4. 全サービス起動
./dev-start.sh
# または個別:
npm run dev:backend    # :4000
npm run dev:frontend   # :4001
```

ブラウザで http://localhost:4001 を開く（dev mode は自動ログイン）

## 主要機能 / 主要功能

| 区分 | 機能数 | 内容 |
|------|--------|------|
| 入庫管理 | 19 | CSV取込/検品/棚入れ/差異管理/帳票/LOGIFAST全フィールド |
| 出荷管理 | 38 | 個別・一括登録/B2 Cloud/検品/ピッキング/配完管理 |
| 在庫管理 | 18 | 一覧/調整/移動/補充管理/受払/倉庫種別フィルター |
| 返品管理 | 6 | 作成/検品/確定/請求 |
| 棚卸管理 | 棚卸 | 作成/カウント/差異/確定 |
| 請求管理 | 4 | 月次/日次/保管料/作業チャージ |
| 日次管理 | 3 | 日報/統計/業績レポート |
| 設定 | 30+ | マスタ/配送/帳票/拡張/ログ |

## 技術スタック / 技术栈

**Backend:** Express.js + TypeScript + MongoDB + Mongoose + Zod + BullMQ + Redis
**Frontend:** Vue 3 + Vite + Pinia + Element Plus
**連携:** ヤマト B2 Cloud API / 佐川 e飛伝Ⅲ
**DevOps:** Docker Compose + GitHub Actions CI/CD

## ドキュメント / 文档

| ドキュメント | 説明 |
|-------------|------|
| `docs/devlog.md` | 開発記録（時系列） |
| `docs/migration/` | **NestJS + PostgreSQL 移行設計（6文書）** |
| `docs/extension/` | 拡張アーキテクチャ（Phase 1-12） |
| `CLAUDE.md` | AI 開発ルール |
| `backend/docs/` | API 参考 |

## 移行計画 / 迁移计划

> 現在 Express + MongoDB → **NestJS + PostgreSQL (Supabase)** への移行を計画中

詳細は `docs/migration/` を参照：
- 01-requirements.md: 要件定義
- 02-database-design.md: PostgreSQL スキーマ設計
- 03-backend-architecture.md: NestJS アーキテクチャ
- 04-api-mapping.md: API マッピング
- 05-development-guide.md: 開発ガイド
- 06-migration-plan.md: 3 週間実施計画

## テスト / 测试

```bash
# Backend (1454 tests)
cd backend && npx vitest run

# Frontend (353 tests)
cd frontend && npx vitest run
```

## ライセンス / License

Private — LogiFast Inc.
