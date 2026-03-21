# ZELIX WMS 终极架构设计文档 / 究極アーキテクチャ設計ドキュメント

> NestJS + PostgreSQL (Supabase) 完美架构的全量设计文档体系
> NestJS + PostgreSQL (Supabase) 完璧なアーキテクチャの完全設計ドキュメント体系
>
> 最終更新 / 最后更新: 2026-03-21

---

## 文档索引 / ドキュメント索引

### 架构总览 / アーキテクチャ総覧

| # | 文档 / ドキュメント | 内容 / 内容 | 行数 / 行数 |
|---|---|---|---|
| 00 | [架构总览](00-architecture-overview.md) | C4 模型、技术栈、模块依赖图、基础设施拓扑 | 1,161 |
| 01 | [领域模型](01-domain-model.md) | DDD 限界上下文、聚合根、状态机、ERD、统一语言 | 939 |
| 17 | [架构决策记录 (ADR)](17-adr-decisions.md) | 18 个关键技术选型的 Why（PostgreSQL/NestJS/Drizzle/Supabase...） | 1,107 |

### 后端设计 / バックエンド設計

| # | 文档 / ドキュメント | 内容 / 内容 | 行数 / 行数 |
|---|---|---|---|
| 02 | [数据库 Schema](02-database-schema.md) | 65+ 表完整 DDL、RLS 策略、索引、Drizzle Schema | ⏳ |
| 03 | [后端模块设计](03-backend-modules.md) | 16 业务模块 + 5 公共模块、Service/DTO/Repository 签名 | 2,146 |
| 04 | [API 契约](04-api-contracts.md) | 492 端点 Request/Response JSON Schema、错误码 | 1,727 |
| 06 | [事件驱动设计](06-event-driven-design.md) | 领域事件、BullMQ 队列、Saga 模式、幂等性 | 1,624 |
| 07 | [错误码体系](07-error-handling-catalog.md) | 统一错误码（三语消息）、验证错误、重试策略 | 708 |
| 15 | [业务规则引擎](15-business-rules-engine.md) | 运费计算、计费规则、库存引当、检品规则 | 1,576 |

### 安全与认证 / セキュリティ・認証

| # | 文档 / ドキュメント | 内容 / 内容 | 行数 / 行数 |
|---|---|---|---|
| 05 | [认证与多租户](05-auth-and-multitenancy.md) | Supabase Auth、RLS 全策略、权限矩阵、API Key | 1,208 |
| 08 | [安全加固](08-security-hardening.md) | OWASP Top 10 逐条、HTTP 安全头、加密策略、合规 | 1,535 |

### 运维与部署 / 運維・デプロイ

| # | 文档 / ドキュメント | 内容 / 内容 | 行数 / 行数 |
|---|---|---|---|
| 09 | [可观测性](09-observability.md) | 日志/指标/追踪、Grafana 仪表板、告警规则 | 1,697 |
| 10 | [部署拓扑](10-deployment-topology.md) | Supabase + Cloud Run + CDN、CI/CD 完整 YAML | 2,219 |
| 14 | [性能与扩展性](14-performance-scalability.md) | 缓存策略、连接池、负载测试、容量规划 | 999 |

### 测试与前端 / テスト・フロントエンド

| # | 文档 / ドキュメント | 内容 / 内容 | 行数 / 行数 |
|---|---|---|---|
| 12 | [测试策略](12-testing-strategy.md) | 测试金字塔、集成测试、E2E、负载测试、k6 | 1,976 |
| 13 | [前端集成](13-frontend-integration.md) | 118 路由全表、组件架构、API 客户端、i18n | 993 |

### 迁移执行 / 移行実行

| # | 文档 / ドキュメント | 内容 / 内容 | 行数 / 行数 |
|---|---|---|---|
| 11 | [数据迁移 ETL](11-data-migration-etl.md) | 零停机 ETL、ID 转换、验证矩阵、回滚计划 | ⏳ |
| 16 | [迁移执行计划](16-migration-execution.md) | 11 周甘特图、回滚剧本、风险登记簿 | ⏳ |

---

## 文档统计 / ドキュメント統計

| 指标 / 指標 | 数值 / 数値 |
|---|---|
| 总文档数 / 総ドキュメント数 | **18 篇** |
| 已完成 / 完成済み | **15 篇** |
| 编写中 / 作成中 | **3 篇** |
| 总行数 / 総行数 | **21,615+ 行** (15 篇) |
| 目标总行数 / 目標総行数 | **~25,000 行** (18 篇完成后) |
| 语言 / 言語 | **中文 + 日本語** 双语 |

---

## 阅读顺序推荐 / 推奨閲読順序

### 新人入门 / 新人向け
1. `00-architecture-overview.md` — 全局视图
2. `01-domain-model.md` — 业务理解
3. `17-adr-decisions.md` — 为什么这样选择

### 后端开发 / バックエンド開発
1. `03-backend-modules.md` — 模块和接口
2. `02-database-schema.md` — 数据库结构
3. `04-api-contracts.md` — API 规范
4. `06-event-driven-design.md` — 事件和队列
5. `07-error-handling-catalog.md` — 错误处理

### 安全审计 / セキュリティ監査
1. `05-auth-and-multitenancy.md` — 认证和租户隔离
2. `08-security-hardening.md` — OWASP 和加固

### 运维部署 / 運維デプロイ
1. `10-deployment-topology.md` — 部署架构
2. `09-observability.md` — 监控和告警
3. `14-performance-scalability.md` — 性能优化

### 迁移执行 / 移行実行
1. `16-migration-execution.md` — 执行计划
2. `11-data-migration-etl.md` — 数据迁移
3. `12-testing-strategy.md` — 测试验证

---

## 关联文档 / 関連ドキュメント

本目录是**目标架构**（NestJS + PostgreSQL）的完整设计。以下是相关的其他文档：

| 目录 / ディレクトリ | 内容 / 内容 |
|---|---|
| `docs/migration/` | 旧迁移文档（Express→NestJS 原始规划）|
| `docs/design/` | 旧设计文档（系统概览、业务流程、前端、安全）|
| `docs/api/` | 当前 API 规范 |
| `docs/operations/` | 运维手册、备份恢复、发布流程 |
| `docs/testing/` | 测试策略 |
| `docs/devlog.md` | 开发记录 |
