# ZELIXWMS 移行実施計画（11 週間）
# ZELIXWMS 迁移实施计划（11周）

> Express.js + MongoDB → NestJS + PostgreSQL (Supabase) 段階的移行計画
> Express.js + MongoDB → NestJS + PostgreSQL (Supabase) 分阶段迁移计划
>
> 最終更新 / 最后更新: 2026-03-21

---

## 1. スケジュール概要 / 日程概述

| Phase | 週 / 周 | 内容 / 内容 | 工数 / 工时 | 成果物 / 交付物 |
|-------|--------|------------|------------|----------------|
| 0 | Week 1 | NestJS 骨格 + Drizzle + 認証 + Health | 40h | 起動可能なアプリ（認証付き）/ 可启动应用（含认证） |
| 1 | Week 2-3 | 全65+ Drizzle スキーマ + マイグレーション + Seed | 40h | 完全 DB スキーマ / 完整DB Schema |
| 2 | Week 3-5 | コア: Products, Inventory, Inbound, Shipment, Carriers | 80h | コア CRUD + B2 Cloud wrapper |
| 3 | Week 5-7 | ビジネス: Billing, Returns, Warehouse, Stocktaking, Clients | 60h | ビジネスロジック / 业务逻辑 |
| 4 | Week 7-9 | 拡張: Extensions, Automation, Reporting, Import, Render | 50h | 全機能パリティ / 全功能对等 |
| 5 | Week 9-10 | データ移行 ETL + E2E + フロントエンド切替 | 40h | 移行スクリプト / 迁移脚本 |
| 6 | Week 10-11 | 回帰テスト + パフォーマンス + セキュリティ + デプロイ | 30h | 本番リリース / 生产发布 |
| | **合計** | | **340h** | |

```
Week:  1    2    3    4    5    6    7    8    9    10   11
       ├─P0─┤
            ├──── P1 ────┤
                 ├──────────── P2 ────────────┤
                              ├──────────── P3 ────────────┤
                                            ├──────────── P4 ────────────┤
                                                          ├──── P5 ────┤
                                                                ├──── P6 ────┤
```

---

## 2. Phase 0: NestJS 骨格 + 認証 + Health（Week 1, 40h）
## Phase 0: NestJS骨架 + 认证 + Health（第1周，40h）

### タスク詳細 / 任务详情

| タスク / 任务 | 工数 / 工时 | 成果物 / 交付物 |
|---|---|---|
| NestJS プロジェクト初期化 (pnpm, strict mode) | 2h | `backend-nest/` |
| Drizzle ORM セットアップ + drizzle.config.ts | 2h | `database.module.ts` |
| 環境変数管理 (@nestjs/config + Zod) | 2h | `config/env.ts` |
| Docker Compose 更新 (PostgreSQL + Redis 追加) | 2h | `docker-compose.yml` |
| CommonModule (Guards, Interceptors, Pipes, Filters) | 8h | `common/` |
| AuthGuard (Supabase JWT 検証) | 4h | `auth.guard.ts` |
| TenantGuard + @TenantId() デコレータ | 3h | `tenant.guard.ts` |
| RolesGuard + @RequireRole() | 3h | `role.guard.ts` |
| TransformInterceptor (_id 互換) | 2h | `transform.interceptor.ts` |
| HttpExceptionFilter (統一エラー形式) | 2h | `http-exception.filter.ts` |
| AuthModule (login, register, me, logout) | 4h | `auth/` |
| HealthModule (NestJS Terminus) | 2h | `health/` |
| 基本テスト (Auth + Health) | 4h | `test/` |

### 成功基準 / 成功标准

- [ ] `pnpm start:dev` でアプリが起動する / 应用可启动
- [ ] `GET /health` が 200 を返す / 返回200
- [ ] `POST /api/auth/login` で JWT トークン取得可能 / 可获取JWT令牌
- [ ] AuthGuard が無効なトークンを拒否する / 拒绝无效令牌
- [ ] TenantGuard がテナント分離を実施する / 实施租户隔离
- [ ] CI パイプラインが動作する / CI流水线正常运行

### リスクと対策 / 风险与对策

| リスク / 风险 | 影響 / 影响 | 対策 / 对策 |
|---|---|---|
| Supabase Auth の設定ミス | 認証全体停止 | ローカル Supabase で先にテスト / 先在本地Supabase测试 |
| CommonModule の設計不良 | 後続全 Phase に影響 | 先に 03-backend-architecture.md のパターンに従う / 遵循架构文档模式 |

### 依存関係 / 依赖关系

- **前提**: なし（最初の Phase）/ 无（首个Phase）
- **後続への影響**: 全 Phase が Phase 0 に依存 / 所有Phase依赖Phase 0

---

## 3. Phase 1: 全 Drizzle スキーマ + マイグレーション（Week 2-3, 40h）
## Phase 1: 全Drizzle Schema + 迁移（第2-3周，40h）

### タスク詳細 / 任务详情

| タスク / 任务 | テーブル数 / 表数 | 工数 / 工时 |
|---|---|---|
| コアドメイン: tenants, users, warehouses, locations, products, product_sub_skus | 6 | 6h |
| 出荷ドメイン: shipment_orders, shipment_order_products, shipment_order_materials | 3 | 4h |
| 入庫ドメイン: inbound_orders, inbound_order_lines, inbound_service_options | 3 | 3h |
| 在庫ドメイン: stock_quants, stock_moves, inventory_ledger, lots, serial_numbers | 5 | 4h |
| 返品: return_orders, return_order_lines | 2 | 2h |
| 請求: billing_records, invoices, work_charges, service_rates, shipping_rates, price_catalogs | 6 | 4h |
| 配送: carriers, carrier_automation_configs, carrier_session_cache | 3 | 2h |
| 顧客: clients, sub_clients, shops, customers, suppliers, order_source_companies | 6 | 3h |
| 作業: waves, pick_tasks, pick_items, packing_tasks, labeling_tasks, sorting_tasks, warehouse_tasks | 7 | 3h |
| 棚卸: stocktaking_orders, stocktaking_items, cycle_count_plans | 3 | 2h |
| 拡張: plugins, plugin_configs, webhooks, webhook_logs, automation_scripts, script_execution_logs | 6 | 3h |
| 自動化: auto_processing_rules, auto_processing_logs, rule_definitions, slotting_rules | 4 | 2h |
| テンプレート: print_templates, email_templates, form_templates | 3 | 1h |
| ログ: operation_logs, api_logs, event_logs, notifications, notification_preferences | 5 | 2h |
| 設定: system_settings, custom_field_definitions, feature_flags | 3 | 1h |
| FBA/RSL: fba_shipment_plans, fba_boxes, rsl_shipment_plans | 3 | 1h |
| その他: mapping_configs, wms_schedules, wms_schedule_logs, daily_reports, exception_reports, order_groups | 6 | 2h |
| 初期マイグレーション SQL 生成 + 実行 | - | 3h |
| Seed データ作成 (dev + test) | - | 3h |
| PostgreSQL enum 定義 (user_role, location_type, order_status 等) | - | 2h |
| インデックス設計 + 作成 | - | 3h |

**合計: 65+ テーブル / 总计: 65+表**

### 成功基準 / 成功标准

- [ ] 全 65+ テーブルが PostgreSQL に作成される / 全部表已创建
- [ ] 全外部キー制約が正しく設定される / 全部外键约束正确
- [ ] Seed データが投入される / 种子数据已投入
- [ ] `drizzle-kit studio` でスキーマ確認可能 / 可在Studio确认
- [ ] 02-database-design.md との整合性確認 / 与DB设计文档一致

### リスクと対策 / 风险与对策

| リスク / 风险 | 影響 / 影响 | 対策 / 对策 |
|---|---|---|
| MongoDB 柔軟スキーマ → RDB 制約不足 | データ移行時にエラー | JSONB で逃がしつつ段階的正規化 / 用JSONB过渡逐步规范化 |
| テーブル間依存関係の循環参照 | マイグレーション失敗 | 依存順にマイグレーション分割 / 按依赖顺序拆分迁移 |

### 依存関係 / 依赖关系

- **前提**: Phase 0（DatabaseModule が動作すること）
- **後続への影響**: Phase 2-4 の全 Service が Phase 1 のスキーマに依存

---

## 4. Phase 2: コアモジュール実装（Week 3-5, 80h）
## Phase 2: 核心模块实现（第3-5周，80h）

### タスク詳細 / 任务详情

#### 4.1 ProductsModule（16h）

| タスク / 任务 | 工数 / 工时 |
|---|---|
| ProductsController (14 endpoints) | 4h |
| ProductsService (CRUD + search + bulk) | 4h |
| SetProductsController + Service | 3h |
| MaterialsController + Service | 2h |
| CSV インポート / CSV导入 | 2h |
| テスト (unit + integration) | 3h |

#### 4.2 InventoryModule（20h）

| タスク / 任务 | 工数 / 工时 |
|---|---|
| InventoryController (17 endpoints) | 4h |
| StockService (reserve, confirm, move, adjust — トランザクション) | 6h |
| InventoryService (overview, summary, aging) | 3h |
| LocationController + LocationService (CRUD + tree) | 3h |
| LotService + SerialNumberService | 2h |
| InventoryLedgerService | 2h |
| テスト (unit + integration) | 4h |

#### 4.3 InboundModule（18h）

| タスク / 任务 | 工数 / 工时 |
|---|---|
| InboundController (15 endpoints) | 4h |
| InboundService (CRUD) | 3h |
| InboundWorkflowService (confirm → receive → putaway → complete) | 5h |
| PassthroughController + Service (通過型入庫) | 3h |
| CSV インポート / CSV导入 | 1h |
| テスト (unit + integration) | 4h |

#### 4.4 ShipmentModule（18h）

| タスク / 任务 | 工数 / 工时 |
|---|---|
| ShipmentController (15 endpoints) | 4h |
| ShipmentService (CRUD + 50+ filters query builder) | 5h |
| Bulk operations (create, update, delete, status) | 3h |
| OutboundRequestController + Service | 2h |
| SetOrderController + Service | 1h |
| テスト (unit + integration) | 3h |

#### 4.5 CarriersModule（8h）

| タスク / 任务 | 工数 / 工时 |
|---|---|
| CarriersController + Service (CRUD) | 2h |
| CarrierAutomationController + Service | 2h |
| YamatoB2Module (wrapper — **変更禁止ロジックをラップ**) | 2h |
| SagawaModule | 1h |
| テスト | 1h |

### 成功基準 / 成功标准

- [ ] 商品 CRUD + CSV インポートが動作 / 商品CRUD + CSV导入正常
- [ ] 入庫フロー全ステップ (draft → confirm → receive → putaway → complete) / 入库全流程
- [ ] 出荷フロー全ステップ (create → status → bulk) / 出库全流程
- [ ] 在庫引当・移動・調整がトランザクションで動作 / 库存预留移动调整事务正常
- [ ] B2 Cloud validate/export/print が wrapper 経由で動作 / B2 Cloud通过wrapper正常
- [ ] 全コア API のレスポンスがフロントエンドと互換 / 核心API响应与前端兼容

### リスクと対策 / 风险与对策

| リスク / 风险 | 影響 / 影响 | 対策 / 对策 |
|---|---|---|
| ShipmentOrder の 50+ フィルター移行 | クエリ性能劣化 | Drizzle query builder + 適切なインデックス / 适当索引 |
| B2 Cloud wrapper 互換性 | 出荷業務停止 | 既存コード変更禁止、wrapper のみ / 仅wrapper |
| 在庫トランザクション設計 | データ不整合 | PostgreSQL serializable + retry / 序列化+重试 |
| Phase 1 スキーマ修正 | 手戻り | Phase 1 と並行で修正 / 与Phase 1并行修正 |

### 依存関係 / 依赖关系

- **前提**: Phase 0 (Auth, Common), Phase 1 (全スキーマ)
- **Phase 1 と並行可能**: Week 3 で重複（スキーマ確定次第コア開発開始）

---

## 5. Phase 3: ビジネスモジュール実装（Week 5-7, 60h）
## Phase 3: 业务模块实现（第5-7周，60h）

### タスク詳細 / 任务详情

| モジュール / 模块 | エンドポイント数 / 端点数 | 工数 / 工时 | 備考 / 备注 |
|---|---|---|---|
| BillingModule (請求) | 30 | 14h | chargeService + 月次生成 + 請求書 / 月度生成+发票 |
| ReturnsModule (返品) | 11 | 8h | receive → inspect → putback → complete |
| WarehouseModule (倉庫オペ) | 20 | 12h | waves, tasks, inspection, labeling |
| StocktakingModule (棚卸) | 14 | 8h | stocktaking + cycle count |
| ClientsModule (顧客) | 35 | 10h | clients, sub-clients, shops, customers, suppliers |
| ClientPortalModule (荷主ポータル) | 5 | 4h | ポータル専用 API / 门户专用API |
| テスト (全モジュール) | - | 4h | unit + integration |

### 成功基準 / 成功标准

- [ ] 月次請求生成がトランザクションで動作 / 月度计费事务正常
- [ ] 返品フロー (receive → inspect → putback → complete) / 退货全流程
- [ ] ウェーブ → ピッキング → パッキング → 出荷フロー / 波次→拣货→打包→出库
- [ ] 棚卸 (create → count → complete) / 盘点全流程
- [ ] 荷主ポータルが client ロールで制限動作 / 货主门户按client角色限制
- [ ] 全 109 画面のうち 70% が動作 / 109画面中70%正常

### リスクと対策 / 风险与对策

| リスク / 风险 | 影響 / 影响 | 対策 / 对策 |
|---|---|---|
| 請求計算ロジックの複雑さ | 計算ミス | 既存テストを先に移行して検証 / 先迁移现有测试验证 |
| WarehouseModule の多数 Controller | ファイル膨大化 | Controller を wave, task, inspection に分割 / 拆分Controller |

### 依存関係 / 依赖关系

- **前提**: Phase 2 (InventoryModule, ShipmentModule が必要)
- **ReturnsModule**: ShipmentModule + InventoryModule に依存
- **BillingModule**: ShipmentModule + InboundModule のデータに依存

---

## 6. Phase 4: 拡張モジュール実装（Week 7-9, 50h）
## Phase 4: 扩展模块实现（第7-9周，50h）

### タスク詳細 / 任务详情

| モジュール / 模块 | エンドポイント数 / 端点数 | 工数 / 工时 | 備考 / 备注 |
|---|---|---|---|
| ExtensionsModule (プラグイン・Webhook・スクリプト) | 46 | 12h | plugin, webhook, script, custom-field, feature-flag |
| AutomationModule (ルール・ワークフロー) | 10 | 6h | rule engine, workflow, auto-processing |
| ReportingModule (ダッシュボード・KPI・日報) | 25 | 8h | dashboard, KPI, daily-report, exception |
| NotificationsModule (通知・メールテンプレート) | 15 | 5h | CRUD + email templates |
| ImportModule (CSV・マッピング) | 15 | 5h | csv-import, mapping-config, wms-schedule |
| RenderModule (PDF・ラベル) | 15 | 6h | print-template, render, form-template |
| AdminModule (テナント・ユーザー・設定) | 25 | 6h | tenants, users, system-settings, logs |
| QueueModule (BullMQ workers) | 5 | 4h | webhook, script, audit processors |
| IntegrationsModule (FBA, RSL, OMS, ERP) | 35 | 8h | FBA, RSL, OMS, marketplace, ERP |
| PeakModeModule | 3 | 1h | activate, deactivate, status |
| テスト (全モジュール) | - | 4h | unit + integration |

### 成功基準 / 成功标准

- [ ] プラグインの有効化/無効化が動作 / 插件启用禁用正常
- [ ] Webhook 送信 + リトライが動作 / Webhook发送+重试正常
- [ ] 自動処理ルールが BullMQ で実行される / 自动处理规则在BullMQ执行
- [ ] PDF ラベル生成が動作 / PDF标签生成正常
- [ ] ダッシュボード KPI が正しく集計される / 仪表盘KPI正确汇总
- [ ] 全 109 画面の 100% が動作 / 109画面100%正常

### リスクと対策 / 风险与对策

| リスク / 风险 | 影響 / 影响 | 対策 / 对策 |
|---|---|---|
| ExtensionsModule の巨大さ (46 endpoints) | 実装遅延 | Controller を plugin, webhook, script 等に分割 / 拆分 |
| PDF 生成ライブラリの互換性 | PDF 出力不正 | 既存コードをそのまま wrapper で使用 / 用wrapper使用现有代码 |
| FBA/RSL 外部 API 依存 | テスト困難 | Mock + 統合テストを分離 / Mock+分离集成测试 |

### 依存関係 / 依赖关系

- **前提**: Phase 2-3 の全コアモジュール
- **QueueModule**: ExtensionsModule, NotificationsModule に依存
- **ReportingModule**: 全ドメインモジュールのデータに依存

---

## 7. Phase 5: データ移行 + E2E + フロントエンド切替（Week 9-10, 40h）
## Phase 5: 数据迁移 + E2E + 前端切换（第9-10周，40h）

### タスク詳細 / 任务详情

| タスク / 任务 | 工数 / 工时 | 備考 / 备注 |
|---|---|---|
| MongoDB → PostgreSQL ETL スクリプト開発 | 12h | 詳細は 07-data-migration.md |
| ObjectId → UUID v5 変換ロジック | 2h | namespace + collection + oid |
| コレクション別移行スクリプト (6ステップ) | 8h | 依存順: tenants → users → products → ... |
| データ検証スクリプト (件数・整合性) | 4h | 行数比較 + FK 整合性 + 合計検証 |
| E2E テスト (全クリティカルフロー) | 6h | 入庫フロー, 出荷フロー, 請求フロー |
| フロントエンド API URL 切替 | 2h | `.env` の `VITE_API_URL` 変更のみ |
| フロントエンド全画面スモークテスト | 4h | 109 画面確認 |
| Playwright 自動テスト (主要フロー) | 2h | 入庫・出荷・在庫の主要操作 |

### 成功基準 / 成功标准

- [ ] MongoDB 全データが PostgreSQL に移行される / MongoDB全数据迁移到PostgreSQL
- [ ] 行数が MongoDB と PostgreSQL で一致 / 行数一致
- [ ] 在庫合計が一致 / 库存总数一致
- [ ] 外部キー参照が全て有効 / 全部外键引用有效
- [ ] 全 E2E テストがパス / 全部E2E测试通过
- [ ] フロントエンド全 109 画面が表示される / 全部109画面正常显示

### リスクと対策 / 风险与对策

| リスク / 风险 | 影響 / 影响 | 対策 / 对策 |
|---|---|---|
| データ量が多く移行に時間がかかる | ダウンタイム長期化 | バッチ処理 + 差分移行 / 批处理+增量迁移 |
| ObjectId → UUID 変換で参照切れ | データ不整合 | マッピングテーブルで全参照を事前検証 / 映射表预先验证 |
| フロントエンドの隠れた API 依存 | 画面エラー | 全 109 画面を手動確認 + Playwright / 手动确认+Playwright |

### 依存関係 / 依赖关系

- **前提**: Phase 0-4 の全モジュール実装完了
- **データ移行**: Phase 1 のスキーマが確定していること

---

## 8. Phase 6: 回帰テスト + パフォーマンス + セキュリティ + デプロイ（Week 10-11, 30h）
## Phase 6: 回归测试 + 性能 + 安全 + 部署（第10-11周，30h）

### タスク詳細 / 任务详情

| タスク / 任务 | 工数 / 工时 | 備考 / 备注 |
|---|---|---|
| 回帰テスト（既存 1807+ テスト移行・実行）| 6h | Vitest 互換 |
| パフォーマンステスト (k6 or autocannon) | 4h | 主要 API レイテンシ測定 |
| N+1 クエリ検出・修正 | 3h | Drizzle query log 分析 |
| インデックスチューニング | 2h | EXPLAIN ANALYZE |
| セキュリティレビュー | 4h | OWASP Top 10 チェック |
| 負荷テスト (100 concurrent users) | 2h | 出荷一覧 API が 500ms 以下 |
| Docker Compose 本番用設定 | 2h | docker-compose.prod.yml |
| ステージングデプロイ + スモークテスト | 3h | 全フロー確認 |
| 本番デプロイ | 2h | 並行稼働開始 |
| Express 停止 + クリーンアップ | 1h | 1 週間 standby 後 |
| 最終動作確認 + ドキュメント更新 | 1h | 全チェックリスト完了 |

### 成功基準 / 成功标准

- [ ] 全 1807+ テストがパス / 全部测试通过
- [ ] 主要 API レイテンシ < 500ms (p95) / 主要API延迟<500ms
- [ ] N+1 クエリなし / 无N+1查询
- [ ] OWASP Top 10 全項目クリア / OWASP Top 10全部通过
- [ ] 100 concurrent users で安定稼働 / 100并发稳定运行
- [ ] 全 109 画面が本番で動作 / 全部109画面生产正常
- [ ] B2 Cloud validate → export → PDF が動作 / B2 Cloud正常
- [ ] Docker Compose ワンコマンド起動 / Docker Compose一键启动

### リスクと対策 / 风险与对策

| リスク / 风险 | 影響 / 影响 | 対策 / 对策 |
|---|---|---|
| パフォーマンス劣化 | UX 悪化 | インデックス + クエリ最適化 + connection pool / 索引+查询优化+连接池 |
| セキュリティ脆弱性発見 | リリース延期 | Phase 4 から継続的にセキュリティチェック / 从Phase 4持续安全检查 |
| 本番デプロイ失敗 | 業務停止 | ロールバック手順事前準備 / 预先准备回滚步骤 |

### 依存関係 / 依赖关系

- **前提**: Phase 5（データ移行完了、E2E パス）

---

## 9. ロールバック戦略 / 回滚策略

### 9.1 Phase 別ロールバック / 按Phase回滚

| Phase | ロールバック方法 / 回滚方法 |
|-------|--------------------------|
| Phase 0-4 | NestJS 開発中は Express が稼働中。NestJS に問題があれば開発を中断するだけ / NestJS开发中Express仍在运行，有问题暂停开发即可 |
| Phase 5 | MongoDB データは変更していない。フロントエンドの `VITE_API_URL` を Express に戻すだけ / MongoDB数据未变更，将前端URL改回Express即可 |
| Phase 6 | 本番切替後も 1 週間は Express を standby 維持。問題発生時は URL を切り戻す / 切换后Express保持1周standby |

### 9.2 データロールバック / 数据回滚

```bash
# MongoDB は変更していないため、そのまま利用可能
# MongoDB未被修改，可直接使用

# PostgreSQL データ全削除（必要な場合）
# 清空PostgreSQL数据（必要时）
docker exec zelixwms-db psql -U postgres -d zelixwms -c "
  TRUNCATE ALL TABLES CASCADE;
"

# フロントエンドを Express に戻す
# 将前端切回Express
# frontend/.env: VITE_API_URL=http://localhost:4000/api
```

### 9.3 判断基準 / 判断标准

ロールバックを実行する条件：
执行回滚的条件：

- クリティカルな業務フロー（入庫・出荷・B2 Cloud）が動作しない
  关键业务流程（入库、出库、B2 Cloud）无法运行
- データ不整合が検出された（在庫数不一致等）
  检测到数据不一致（库存数不符等）
- パフォーマンスが既存の 2 倍以上劣化
  性能劣化超过现有2倍

---

## 10. 週次マイルストーン / 每周里程碑

| 週 / 周 | マイルストーン / 里程碑 | 確認方法 / 确认方法 |
|---|---|---|
| Week 1 | NestJS 起動 + Auth + Health | `curl /health` + login テスト |
| Week 2 | 全テーブル作成完了 | `drizzle-kit studio` で確認 |
| Week 3 | Products CRUD + Inventory 基本動作 | API テスト |
| Week 4 | Inbound + Shipment フロー動作 | E2E テスト |
| Week 5 | B2 Cloud wrapper 動作 | 送り状 PDF 生成確認 |
| Week 6 | Billing + Returns 動作 | 月次請求生成テスト |
| Week 7 | Warehouse ops + Stocktaking 動作 | ウェーブ→ピック→出荷テスト |
| Week 8 | Extensions + Automation 動作 | Webhook テスト送信 |
| Week 9 | 全 API 実装完了 (492 endpoints) | 全 API レスポンス確認 |
| Week 10 | データ移行完了 + フロントエンド切替 | 109 画面スモークテスト |
| Week 11 | 本番デプロイ完了 | 全チェックリスト完了 |

---

## 11. 完了基準 / 完成标准

本移行プロジェクトの完了基準：
本迁移项目的完成标准：

### 機能要件 / 功能需求
- [ ] 全 492 エンドポイントが NestJS で動作 / 全部492端点在NestJS正常运行
- [ ] 全 109 画面が NestJS バックエンドで動作 / 全部109画面正常
- [ ] B2 Cloud validate → export → PDF フロー動作 / B2 Cloud流程正常
- [ ] Supabase Auth でログイン/ログアウト動作 / Supabase Auth正常
- [ ] PostgreSQL トランザクションが正しく動作 / PostgreSQL事务正常

### 非機能要件 / 非功能需求
- [ ] 全テスト（1807+α）がパス / 全部测试通过
- [ ] API レイテンシ < 500ms (p95) / API延迟<500ms
- [ ] 100 concurrent users で安定 / 100并发稳定
- [ ] OWASP Top 10 セキュリティチェック完了 / OWASP Top 10完了
- [ ] Docker Compose ワンコマンド起動 / 一键启动

### データ移行 / 数据迁移
- [ ] 既存データ 100% 移行完了 / 100%迁移完成
- [ ] 在庫数整合性確認 / 库存数一致性确认
- [ ] 外部キー参照整合性確認 / 外键引用一致性确认
- [ ] パフォーマンスが既存と同等以上 / 性能同等或更优
