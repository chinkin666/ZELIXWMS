# ZELIX WMS 文档索引 / ドキュメントインデックス

> 所有项目文档的导航入口（26 份文档，13,000+ 行）
> 全プロジェクトドキュメントのナビゲーション（26文書、13,000行以上）

---

## 设计文档 / 設計ドキュメント

| # | 文档 | 说明 |
|---|------|------|
| 1 | [系统概览](design/00-system-overview.md) | 架构、技术栈、模块概览 |
| 2 | [业务流程](design/01-business-flow.md) | WMS 核心流程：入庫→在庫→出荷 |
| 3 | [前端设计](design/02-frontend-design.md) | Vue 3 + Element Plus + Pinia |
| 4 | [安全设计](design/03-security-design.md) | Supabase Auth + RLS + RBAC + OWASP |

## API 文档 / API ドキュメント

| # | 文档 | 说明 |
|---|------|------|
| 5 | [API 规范](api/01-api-specification.md) | 认证、分页、错误码、示例 |
| 6 | [API 端点映射](migration/04-api-mapping.md) | 全 492 端点按模块分类 |

## 迁移文档 / 移行ドキュメント

| # | 文档 | 说明 |
|---|------|------|
| 7 | [需求定义](migration/01-requirements.md) | 技术选型、ADR、工期估算 |
| 8 | [数据库设计](migration/02-database-design.md) | 65+ 表完整设计（1,744 行） |
| 9 | [后端架构](migration/03-backend-architecture.md) | 16 NestJS 模块、Repository Pattern |
| 10 | [API 映射](migration/04-api-mapping.md) | Express → NestJS 端点对照 |
| 11 | [开发指南](migration/05-development-guide.md) | 代码规范、测试、Git 工作流 |
| 12 | [迁移计划](migration/06-migration-plan.md) | 11 周 Phase 0-6 实施计划 |
| 13 | [数据迁移](migration/07-data-migration.md) | ObjectId→UUID v5、ETL、双写期 |

## 基础设施 / インフラ

| # | 文档 | 说明 |
|---|------|------|
| 14 | [部署指南](infrastructure/01-deployment.md) | Docker + Supabase + CI/CD |
| 15 | [监控](infrastructure/02-monitoring.md) | 健康检查、日志、告警、APM |

## 运维 / 運用

| # | 文档 | 说明 |
|---|------|------|
| 16 | [运维手册](operations/01-runbook.md) | 日/周/月运维、事故响应 |
| 17 | [备份与灾备](operations/02-backup-disaster-recovery.md) | RTO 4h / RPO 1h、PITR |
| 18 | [上线检查清单](operations/03-go-live-checklist.md) | 上线前逐项确认 |
| 19 | [故障排查](operations/04-troubleshooting.md) | 10 类常见问题诊断 |
| 20 | [性能调优](operations/05-performance-tuning.md) | PostgreSQL / Node.js / Redis |
| 21 | [新人入职](operations/06-onboarding.md) | 3 天入职指南 |
| 22 | [发布流程](operations/07-release-process.md) | SemVer + 10 步发布 SOP |
| 23 | [SLA/SLO](operations/08-sla-slo.md) | 99.9% 可用性、API p95<200ms |
| 24 | [变更管理](operations/09-change-management.md) | 变更分类、维护窗口 |

## 测试 / テスト

| # | 文档 | 说明 |
|---|------|------|
| 25 | [测试策略](testing/01-test-strategy.md) | 测试金字塔、覆盖率目标 |

## 开发记录 / 開発記録

| # | 文档 | 说明 |
|---|------|------|
| 26 | [开发日志](devlog.md) | 历史开发活动记录 |
