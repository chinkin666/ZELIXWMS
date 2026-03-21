# ZELIXWMS 移行実施計画
# ZELIXWMS 迁移实施计划

## 1. スケジュール概要 / 日程概述

```
Week 1: インフラ + 認証 + マスタ系
Week 2: コアビジネス（入庫/出荷/在庫）
Week 3: 拡張機能 + テスト + 切替
```

## 2. Week 1: インフラ + 認証 + マスタ系 / 基础设施 + 认证 + 主数据

### Day 1-2: プロジェクト初期化
| タスク | 成果物 | 工数 |
|--------|--------|------|
| NestJS プロジェクト作成 | backend-nest/ | 2h |
| Drizzle ORM セットアップ | drizzle.config.ts | 1h |
| Supabase ローカル環境 | supabase/ 更新 | 1h |
| Docker Compose 更新 | docker-compose.yml | 1h |
| 共通モジュール作成 | guards, decorators, pipes | 3h |

### Day 3: 認証
| タスク | 成果物 | 工数 |
|--------|--------|------|
| Supabase Auth 統合 | auth.module.ts | 3h |
| AuthGuard | auth.guard.ts | 1h |
| TenantGuard | tenant.guard.ts | 1h |
| RLS ポリシー | migration | 1h |
| テスト | auth.spec.ts | 1h |

### Day 4-5: データベーススキーマ + マスタ系 API
| タスク | 成果物 | 工数 |
|--------|--------|------|
| テーブル定義（全65+テーブル）| schema/*.ts | 6h |
| 初期マイグレーション | migrations/ | 2h |
| ProductsModule | CRUD + CSV import | 3h |
| LocationsModule | CRUD | 1h |
| WarehousesModule | CRUD | 1h |
| CarriersModule | CRUD + B2 Cloud wrapper | 2h |
| ClientsModule | CRUD | 1h |
| テスト | *.spec.ts | 2h |

**Week 1 合計: ~32h**

## 3. Week 2: コアビジネス / 核心业务

### Day 6-7: 入庫モジュール
| タスク | 成果物 | 工数 |
|--------|--------|------|
| InboundModule (CRUD) | controller + service | 4h |
| InboundWorkflowService | confirm→receive→putaway→complete | 6h |
| CSV Import | importInboundOrders | 2h |
| トランザクション実装 | db.transaction() | 2h |
| テスト | inbound.spec.ts | 2h |

### Day 8-9: 出荷モジュール
| タスク | 成果物 | 工数 |
|--------|--------|------|
| ShipmentModule (CRUD) | controller + service | 4h |
| createOrders (一括作成) | service method | 3h |
| searchOrders (50+フィルター) | query builder | 4h |
| status bulk operations | mark-shipped etc | 2h |
| B2 Cloud 連携 | validate/export/print | 3h |
| テスト | shipment.spec.ts | 2h |

### Day 10: 在庫モジュール
| タスク | 成果物 | 工数 |
|--------|--------|------|
| InventoryModule | controller + service | 3h |
| StockService (原子操作) | adjust/transfer/reserve | 4h |
| InventoryLedger | 受払集計 | 2h |
| LowStockAlerts | 補充管理 | 1h |
| テスト | inventory.spec.ts | 2h |

**Week 2 合計: ~44h**

## 4. Week 3: 拡張 + テスト + 切替 / 扩展 + 测试 + 切换

### Day 11-12: 残りモジュール
| タスク | 成果物 | 工数 |
|--------|--------|------|
| BillingModule | chargeService + billing | 3h |
| ReturnsModule | return workflow | 2h |
| StocktakingModule | create→count→complete | 2h |
| NotificationsModule | CRUD | 1h |
| DailyReportsModule | generate + list | 2h |
| KpiModule | dashboard | 1h |
| ExtensionsModule | webhook + plugin + script | 3h |
| QueueModule | BullMQ workers | 2h |

### Day 13: データ移行
| タスク | 成果物 | 工数 |
|--------|--------|------|
| MongoDB → PostgreSQL ETL スクリプト | migrate-to-pg.ts | 4h |
| ID マッピング | mapping table | 1h |
| データ検証 | verify script | 1h |
| Seed データ移行 | seed-pg.ts | 1h |

### Day 14-15: テスト + 切替
| タスク | 成果物 | 工数 |
|--------|--------|------|
| 全API E2E テスト | e2e/*.spec.ts | 4h |
| Playwright 画面テスト | *.test.ts | 2h |
| フロントエンド API URL 切替 | env変更 | 1h |
| Docker更新 + デプロイテスト | docker-compose.yml | 2h |
| Express 停止 | cleanup | 1h |
| 最終動作確認 | checklist | 2h |

**Week 3 合計: ~33h**

## 5. 総工数 / 总工时

| Phase | 工数 |
|-------|------|
| Week 1: インフラ + 認証 + マスタ | 32h |
| Week 2: コアビジネス | 44h |
| Week 3: 拡張 + テスト + 切替 | 33h |
| **合計** | **109h (~3週間)** |

## 6. リスク管理 / 风险管理

| リスク | 影響 | 対策 |
|--------|------|------|
| B2 Cloud 連携の互換性 | 出荷停止 | yamatoB2Service.ts を変更せず wrapper で囲む |
| MongoDB の柔軟スキーマ → RDB 化 | データロス | JSONB で逃がす、段階的に正規化 |
| フロントエンド互換性 | 全画面壊れる | TransformInterceptor で _id 互換維持 |
| パフォーマンス劣化 | UX 悪化 | インデックス設計を先行、N+1 防止 |
| テスト不足 | 回帰バグ | 既存テストを先に移行してから機能移行 |

## 7. ロールバック計画 / 回滚计划

移行中は Express と NestJS を並行稼働：
- NestJS に問題が発生した場合、フロントエンドの API URL を Express に戻すだけ
- MongoDB のデータは残っているので即座にロールバック可能
- 完全切替後も 1 週間は Express を standby で維持

## 8. 完了基準 / 完成标准

- [ ] 全 109 画面が NestJS バックエンドで動作
- [ ] 全テスト（1807+α）がパス
- [ ] B2 Cloud validate→export→PDF が動作
- [ ] Supabase Auth でログイン/ログアウトが動作
- [ ] PostgreSQL トランザクションが正しく動作
- [ ] Docker Compose でワンコマンド起動可能
- [ ] 既存データが完全に移行されている
- [ ] パフォーマンスが既存と同等以上
