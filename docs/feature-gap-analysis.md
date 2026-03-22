# 機能一覧 対比分析 / 功能列表对比分析

> 仕様書: `docs/0411WMS機能一覧及び送り状一覧.xlsx`「基礎機能」シート
> 対比日: 2026-03-23
> 対比対象: ZELIXWMS (frontend Vue 3 + backend-nest NestJS)

---

## サマリー / 概要

| 状態 / 状态 | 件数 | 割合 |
|---|---|---|
| ✅ 実装済 / 已实装 | 55/77 | 71% |
| ⚠️ 部分実装 / 部分实装 | 14/77 | 18% |
| ❌ 未実装 / 未实装 | 8/77 | 11% |

**主な未実装機能 / 主要未实装功能:**
- 入庫分析 (#17)
- 仕分けコード訂正 (#32)
- FBA梱包データ生成/DL (#33-34)
- 受注分析 (#37)
- チャーター便配送証明書 (#44)
- EDI計上予定データ (#74)
- TOS計上実績データ (#75)
- 配送証明POD (#77)

---

## 詳細対比 / 详细对比

### 入庫管理 / 入库管理 (#1-17)

| # | 仕様書の機能 | 状態 | 対応ページ/API | 備考 / 备注 |
|---|---|---|---|---|
| 1 | 入庫予定アップロード（項目紐づけ含む） | ✅ 実装済 | FE: `/inbound/import` (InboundImport.vue) | BE: `POST /api/inbound-orders/import` + `POST /api/import/validate` でCSVバリデーション＋インポート実行。マッピング設定 `/settings/mapping-patterns` で項目紐づけ対応。 |
| 2 | 入庫予定入力（画面入力） | ✅ 実装済 | FE: `/inbound/create` (InboundOrderCreate.vue) | BE: `POST /api/inbound-orders` Zod バリデーション付き。商品選択・明細行入力対応。 |
| 3 | 入庫予定削除（一括・選定） | ✅ 実装済 | FE: `/inbound/orders` (InboundOrderList.vue) | BE: `DELETE /api/inbound-orders/:id` 論理削除。一括削除は画面側で複数選択→順次API呼出。 |
| 4 | 入庫予定一覧表（帳票印刷・ラベル印刷） | ✅ 実装済 | FE: `/inbound/orders` + `/inbound/print/*` | BE: `GET /api/render/inbound/:id/schedule-pdf`, `GET /api/render/inbound/:id/schedule-summary-pdf`。ラベル印刷は `/inbound/print/barcode/:id`。 |
| 5 | 入庫アップロード（入庫実績一括登録） | ✅ 実装済 | FE: `/inbound/import` | BE: `POST /api/inbound-orders/import`。入庫予定とは別に入庫実績データもインポート可能。 |
| 6 | 入庫入力（入庫検品入力・HHTスキャン） | ✅ 実装済 | FE: `/inbound/receive/:id` (InboundReceive.vue) | BE: `POST /api/inbound-orders/:id/receive`, `POST /api/inbound-orders/:id/bulk-receive`。HHTスキャンはレスポンシブ対応済み（c1a360b）。 |
| 7 | 入庫チェックリスト（帳票印刷） | ✅ 実装済 | FE: `/inbound/print/inspection/:id` | BE: `GET /api/inbound-orders/:id/checklist` でデータ取得。`InboundInspectionSheet.vue` で印刷用ビュー。 |
| 8 | 入庫削除（一括・選定） | ✅ 実装済 | FE: `/inbound/orders` | BE: `DELETE /api/inbound-orders/:id`。#3と同じAPI。入庫確定前のデータ削除。 |
| 9 | 入庫差異リスト（帳票印刷） | ✅ 実装済 | FE: 入庫詳細画面内 | BE: `GET /api/inbound-orders/:id/variance` + `GET /api/render/inbound/:id/variance-pdf`。予定 vs 実績の差異をPDF出力。 |
| 10 | 入庫確定入力（在庫データ更新） | ✅ 実装済 | FE: `/inbound/orders` 詳細画面 | BE: `POST /api/inbound-orders/:id/confirm` (draft→confirmed), `POST /api/inbound-orders/:id/complete` (receiving→done, 在庫自動更新含む)。 |
| 11 | 入庫実績一覧表（帳票印刷） | ✅ 実装済 | FE: `/inbound/history` (InboundHistory.vue) | BE: `GET /api/inbound-orders/history`。PDF出力は `GET /api/render/inbound/:id/schedule-summary-pdf`。 |
| 12 | 入庫実績データダウンロード | ✅ 実装済 | FE: `/inbound/history` | BE: `GET /api/inbound-orders/export` (CSV形式), `POST /api/inbound-orders/export` (全オーダーJSON)。 |
| 13 | 入庫帳票の再出力 | ⚠️ 部分実装 | FE: `/inbound/print/*` | PDF再出力自体は可能（同じURLで再アクセス）。ただし出力枚数カウント・再出力枚数の表示機能は未実装。 |
| 14 | 入庫通知（入庫完了通知） | ✅ 実装済 | FE: `/notifications` (NotificationCenter.vue) | BE: `POST /api/notifications`, `GET /api/notifications`。入庫確定時に通知を発行。画面上で確認可能。 |
| 15 | 入庫看板（ロケ貼付用） | ✅ 実装済 | FE: `/inbound/print/kanban/:id` (InboundKanban.vue) | BE: `GET /api/render/inbound/:id/kanban-pdf`。A4看板形式、バーコード付き。 |
| 16 | 入庫請求（単価設定・入庫確定後反映） | ✅ 実装済 | FE: `/inbound/billing` (InboundBillingView.vue) | BE: 請求管理 `api/billing` と連携。サービス料金設定 `/settings/service-rates`。 |
| 17 | 入庫分析（顧客・SKU・頻度分析） | ❌ 未実装 | - | 分析ダッシュボード未実装。日次レポート `/daily/statistics` に部分的な統計はあるが、入庫特化の分析画面なし。 |

### 受注管理 / 订单管理 (#19-37)

| # | 仕様書の機能 | 状態 | 対応ページ/API | 備考 / 备注 |
|---|---|---|---|---|
| 19 | 受注自動処理設定入力 | ✅ 実装済 | FE: `/settings/auto-processing`, `/settings/carrier-automation` | BE: `api/carrier-automation/configs` で自動処理ルール管理。条件別（県別、SKU数、PCS数等）の自動振り分け設定。 |
| 20 | 受注自動処理設定解除 | ✅ 実装済 | FE: `/settings/auto-processing` | BE: `PUT /api/carrier-automation/configs/:type` で設定を無効化。 |
| 21 | 受注アップロード（項目紐づけ） | ✅ 実装済 | FE: `/shipment/orders/create` (ShipmentOrderCreate.vue) | BE: `POST /api/shipment-orders/bulk` + `POST /api/import/validate`。マッピング設定で項目紐づけ。 |
| 22 | 受注入力（画面入力） | ✅ 実装済 | FE: `/shipment/orders/create` | BE: `POST /api/shipment-orders`。Zodバリデーション付き。V2版 (`/shipment/orders/create-v2`) も存在。 |
| 23 | 受注データ削除（一括・選定） | ✅ 実装済 | FE: `/shipment/operations/list` | BE: `POST /api/shipment-orders/bulk-delete`, `DELETE /api/shipment-orders/:id`。 |
| 24 | 取りまとめ入力（顧客単位事前設定） | ✅ 実装済 | FE: `/settings/order-groups` | BE: `POST /api/order-groups`, `POST /api/order-groups/auto-assign`。出荷グループ設定で同一送付先の注文統合。`POST /api/shipment-orders/consolidate`。 |
| 25 | 取りまとめ解除 | ✅ 実装済 | FE: `/settings/order-groups` | BE: `DELETE /api/order-groups/:id`。グループ解除。 |
| 26 | 受注ステータス変更 | ✅ 実装済 | FE: `/shipment/operations/list` | BE: `POST /api/shipment-orders/:id/status`, `POST /api/shipment-orders/status/bulk`。個別・一括ステータス変更。 |
| 27 | 受注引当（在庫引当確認） | ✅ 実装済 | FE: `/shipment/operations/tasks` (ShipmentList.vue) | BE: `POST /api/inventory/reserve-orders`。在庫サービスと連携して引当処理。 |
| 28 | 欠品データ（表示・ダウンロード） | ✅ 実装済 | FE: `/inventory/shortage-records` (ShortageRecords.vue) | BE: `GET /api/shortage-records`。欠品一覧・詳細・ステータス管理。 |
| 29 | 受注引当確定（欠品なし→確定） | ✅ 実装済 | FE: `/shipment/operations/tasks` | BE: `POST /api/shipment-orders/:id/confirm` (statusConfirmed=true)。 |
| 30 | 受注一覧表（帳票印刷） | ⚠️ 部分実装 | FE: `/shipment/operations/list` (ShipmentOperationsList.vue) | 画面表示は完全対応。帳票印刷は送り状テンプレート経由で対応可能だが、受注一覧専用の帳票レイアウトは未定義。 |
| 31 | 受注データ検索 | ✅ 実装済 | FE: `/shipment/operations/list` | BE: `GET /api/shipment-orders?search=xxx`。注文番号・送付先名で検索。 |
| 32 | 仕分けコード訂正（配送会社マスタパック） | ❌ 未実装 | - | 配送会社の仕分けコードマスタ連携・訂正機能は未実装。ヤマトB2連携は存在するが仕分けコード単体の訂正UIなし。 |
| 33 | FBA梱包データ生成 | ⚠️ 部分実装 | FE: `/fba/plans`, `/passthrough/boxes/:orderId` | FBAプラン管理・箱管理のUIは存在。ただしAmazon FBA仕様準拠の梱包データ自動生成ロジックは未完成。 |
| 34 | FBA梱包データダウンロード | ⚠️ 部分実装 | FE: `/fba/plans` | FBAプラン画面からのDL機能は存在するが、Amazon指定フォーマットへの変換は未完成。 |
| 35 | 受注確定 | ✅ 実装済 | FE: `/shipment/operations/tasks` | BE: `POST /api/shipment-orders/:id/confirm`。受注引当確定と同義。 |
| 36 | 受注請求 | ⚠️ 部分実装 | FE: `/billing/charges` (WorkChargeList.vue) | 請求管理モジュールで作業チャージを管理。ただし受注単位の自動請求項目紐づけは手動設定が必要。 |
| 37 | 受注分析（顧客・SKU・頻度分析） | ❌ 未実装 | - | 出荷統計 `/daily/statistics` に部分的な統計はあるが、受注特化の分析ダッシュボードは未実装。 |

### 出荷管理 - 作業 / 出货管理 - 作业 (#39-52)

| # | 仕様書の機能 | 状態 | 対応ページ/API | 備考 / 备注 |
|---|---|---|---|---|
| 39 | 作業グループ設定入力 | ✅ 実装済 | FE: `/settings/order-groups` | BE: `POST /api/order-groups`, `PUT /api/order-groups/:id`。顧客毎・作業毎のグループ設定。`POST /api/order-groups/auto-assign` で自動振り分け。 |
| 40 | 作業グループ解除入力 | ✅ 実装済 | FE: `/settings/order-groups` | BE: `DELETE /api/order-groups/:id`。一括・選定の解除。 |
| 41 | 引当入力 | ✅ 実装済 | FE: `/shipment/operations/tasks` | BE: `POST /api/inventory/reserve-orders`。在庫引当処理。 |
| 42 | 引当取消入力 | ✅ 実装済 | FE: `/shipment/operations/tasks` | BE: `POST /api/inventory/release-expired-reservations`。受注単位で引当取消。 |
| 43 | 作業ピッキングリスト出力 | ✅ 実装済 | FE: `/shipment/picking-list` (PickingListPrint.vue) | BE: `GET /api/shipment-orders/picking-list/total`, `/single`, `/subtotal`。トータル・シングルピッキング対応。PDF出力は `POST /api/render/picking-list-pdf`。 |
| 44 | 作業リスト出力（チャーター便配送証明書） | ❌ 未実装 | - | チャーター便の授受簿・納品明細書・POD・配送証明書の専用帳票は未実装。 |
| 45 | 配送会社伝票用データ吐出し | ✅ 実装済 | FE: `/shipment/operations/tasks` | BE: ヤマトB2 `POST /api/carrier-automation/yamato-b2/export`、佐川 `api/sagawa`、JP `api/japan-post` 各社対応。 |
| 46 | 配送会社発送済みデータアップロード | ✅ 実装済 | FE: `/shipment/operations/tasks` | BE: `POST /api/shipment-orders/carrier-receipts/import`。配送業者の受領データインポート。 |
| 47 | 出荷停止入力（受注番号単位） | ✅ 実装済 | FE: `/shipment/stop` (ShipmentStop.vue) | BE: `POST /api/shipment-orders/stop`。受注番号単位で停止設定。検品時にアラート表示。 |
| 48 | 配送送り状新規発行（事前出し） | ✅ 実装済 | FE: `/shipment/operations/tasks` | BE: ヤマトB2 `POST /api/carrier-automation/yamato-b2/print`。佐川・JP・西濃も各コントローラで対応。 |
| 49 | 配送送り状再発行（事前出し） | ✅ 実装済 | FE: `/shipment/label-reissue` (LabelReissue.vue) | BE: `POST /api/shipment-orders/:id/reissue-label`。同一追跡番号で再印刷。 |
| 50 | 配送送り状追加発行（事前出し） | ✅ 実装済 | FE: `/shipment/label-reissue` | BE: `POST /api/shipment-orders/:id/additional-label`。追加個口用の送り状発行。 |
| 51 | 配送商品明細書（事前出し） | ⚠️ 部分実装 | FE: `/shipment/operations/tasks` | 帳票テンプレート `/settings/form-templates` で明細書テンプレートを管理。BE: `api/form-templates/resolve` で取得可能。ただし配送会社別の標準フォーマットは一部未対応。 |
| 52 | 送り状変更・出荷サイズ変更（事前出し） | ⚠️ 部分実装 | FE: `/shipment/operations/list` | BE: `PATCH /api/shipment-orders/:id` で送り状タイプ・サイズの変更は可能。ただしネコポス→宅急便のフラグ式変更UIは専用画面なし。 |

### 出荷管理 - 検品 / 出货管理 - 检品 (#53-63)

| # | 仕様書の機能 | 状態 | 対応ページ/API | 備考 / 备注 |
|---|---|---|---|---|
| 53 | 出荷未検品一覧表 | ✅ 実装済 | FE: `/shipment/operations/list` | BE: `GET /api/shipment-orders?statusConfirmed=true&statusShipped=false`。未検品フィルタで一覧表示。 |
| 54 | 出荷検品入力（商品検品後、梱包資材スキャン） | ✅ 実装済 | FE: `/shipment/operations/one-by-one/inspection` (OneByOneInspection.vue), `/shipment/operations/n-by-one/inspection` (OneProductInspection.vue) | BE: `api/inspections` で検品データ管理。1-1検品（1注文1商品）とN-1検品（複数注文同一商品）の2モード対応。バーコードスキャン対応。 |
| 55 | 配送送り状新規発行（検品後one by one） | ✅ 実装済 | FE: 検品画面内で発行 | BE: ヤマトB2 `POST /api/carrier-automation/yamato-b2/print`。検品完了後に即時発行。 |
| 56 | 配送送り状再発行（検品後one by one） | ✅ 実装済 | FE: `/shipment/label-reissue` | BE: `POST /api/shipment-orders/:id/reissue-label`。 |
| 57 | 配送送り状追加発行（検品後one by one） | ✅ 実装済 | FE: `/shipment/label-reissue` | BE: `POST /api/shipment-orders/:id/additional-label`。 |
| 58 | 配送商品明細書（検品後one by one） | ⚠️ 部分実装 | FE: 検品画面 | #51と同様。テンプレートベースの明細書出力は可能だが、配送会社別標準フォーマットは一部未対応。 |
| 59 | 送り状変更・出荷サイズ変更（検品後） | ⚠️ 部分実装 | FE: `/shipment/operations/list` | #52と同様。API経由で変更可能だが専用UIなし。 |
| 60 | 梱包明細出力（カートン別商品明細ラベル） | ⚠️ 部分実装 | FE: `/shipment/operations/tasks` | 帳票テンプレート機能で対応可能だが、カートン別の自動分割・ラベル印刷の専用フローは未実装。 |
| 61 | 出荷検品取消入力 | ✅ 実装済 | FE: `/shipment/operations/list` | BE: `POST /api/shipment-orders/:id/cancel-inspection`。検品完了済みの受注を取消。 |
| 62 | 出荷確定入力（在庫データ更新） | ✅ 実装済 | FE: `/shipment/operations/tasks` | BE: `POST /api/shipment-orders/:id/ship` (statusShipped=true)。在庫引当を反映して在庫更新。 |
| 63 | 商品明細書DL | ✅ 実装済 | FE: `/shipment/operations/list` | BE: `POST /api/shipment-orders/export`。出荷注文の商品明細をエクスポート。 |

### 出荷管理 - 出荷停止 / 出货管理 - 出货停止 (#64-71)

| # | 仕様書の機能 | 状態 | 対応ページ/API | 備考 / 备注 |
|---|---|---|---|---|
| 64 | 出荷停止アップロード（受注番号/伝票番号） | ✅ 実装済 | FE: `/shipment/stop` (ShipmentStop.vue) | BE: `POST /api/shipment-orders/stop/bulk-csv`。注文番号で一括停止。 |
| 65 | 出荷停止入力（画面入力） | ✅ 実装済 | FE: `/shipment/stop` | BE: `POST /api/shipment-orders/stop`。ID指定で停止設定、理由入力。 |
| 66 | 出荷停止データ削除（一括・選定） | ✅ 実装済 | FE: `/shipment/stop` | BE: `POST /api/shipment-orders/stop/release`。停止解除（削除相当）。 |
| 67 | 出荷停止一覧表 | ✅ 実装済 | FE: `/shipment/stop` | BE: `GET /api/shipment-orders/stop/list`。停止中の注文一覧。 |
| 68 | 出荷停止データ検索 | ✅ 実装済 | FE: `/shipment/stop` | 停止一覧画面内の検索機能。 |
| 69 | 出荷停止アラート（梱包済みスキャン時） | ⚠️ 部分実装 | FE: 検品画面内 | 出荷停止設定済みの注文を検品時に検出してアラート表示する仕組みは存在。ただし「梱包済みのものをすべてスキャン」する専用フローは未実装。 |
| 70 | 出荷停止確定（保留在庫へ） | ✅ 実装済 | FE: `/shipment/stop` | BE: `POST /api/shipment-orders/stop`。停止確定時に在庫ステータスを保留に変更。保留6日目アラート `GET /api/shipment-orders/held/near-expiry`。7日超過自動クリーンアップ `POST /api/shipment-orders/held/cleanup`。 |
| 71 | 出荷停止分の在庫を通常倉庫へ移動 | ✅ 実装済 | FE: `/inventory/transfer` | BE: `POST /api/inventory/transfer`。保留在庫→通常在庫への移動。停止解除 `POST /api/shipment-orders/stop/release` 後に在庫移動実行。 |

### 出荷管理 - 出荷実績 / 出货管理 - 出货实绩 (#73-77)

| # | 仕様書の機能 | 状態 | 対応ページ/API | 備考 / 备注 |
|---|---|---|---|---|
| 73 | 出荷実績データダウンロード | ✅ 実装済 | FE: `/shipment/results` (ShipmentResults.vue) | BE: `POST /api/shipment-orders/export`。出荷完了情報のCSV/JSONエクスポート。 |
| 74 | EDI計上予定データダウンロード（佐川・ヤマト・JP） | ❌ 未実装 | - | 配送会社への出荷予定データ（EDI形式）の生成・ダウンロードは未実装。各社API連携は存在するが、EDI標準フォーマットでの吐出しは未対応。 |
| 75 | TOS計上実績データダウンロード | ❌ 未実装 | - | 配送会社HHTスキャンなしの計上実績データは未実装。 |
| 76 | 出荷作業請求 | ⚠️ 部分実装 | FE: `/billing/charges` | 請求管理で出荷作業チャージを管理可能。ただし出荷確定と連動した自動請求生成は手動設定が必要。 |
| 77 | 配送証明POD | ❌ 未実装 | - | 配送証明書（Proof of Delivery）の出力は未実装。追跡情報 `GET /api/shipment-orders/:id/tracking` は存在するがPOD帳票出力なし。 |
| 78 | 出荷拠点変更入力 | ⚠️ 部分実装 | FE: `/settings/warehouses` | 倉庫管理で拠点設定は可能。ただし注文単位での発送拠点変更UIは専用画面なし。`PATCH /api/shipment-orders/:id` で warehouseId 変更は可能。 |

---

## 追加実装済み機能（仕様書外） / 规格外已实装功能

以下は仕様書の77機能には含まれないが、ZELIXWMSで実装済みの機能:

| カテゴリ | 機能 | 備考 |
|---|---|---|
| 在庫管理 | 在庫一覧・検索・調整・移動 | `/inventory/*` 14画面 |
| 在庫管理 | ロット管理・賞味期限アラート | `/inventory/lots`, `/inventory/expiry-alerts` |
| 在庫管理 | 拠点間移動ワークフロー（draft→confirmed→done） | 3ステップ完全ワークフロー |
| 在庫管理 | 受払台帳・在庫ダッシュボード | `/inventory/ledger-view`, `/inventory/ledger` |
| 棚卸管理 | 棚卸作成・実行・報告書PDF | `/stocktaking/*` |
| 返品管理 | 返品一覧・作成・請求 | `/returns/*` |
| 商品管理 | 商品マスタ128フィールド対応 | バーコード管理・セット組含む |
| 請求管理 | 月次請求・保管料・作業チャージ | `/billing/*` |
| 日次管理 | 日次レポート・出荷統計 | `/daily/*` |
| 通過型 | 受付スキャン・タスク・出荷マッチング | `/passthrough/*` |
| FBA/RSL | FBAプラン・RSLプラン管理 | `/fba/*`, `/rsl/*` |
| 帳票 | PDF生成（看板・差異・ピッキング・棚卸等） | `api/render/*` |
| 送り状 | ヤマトB2 Cloud連携 | `api/carrier-automation/yamato-b2/*` |
| 送り状 | 佐川・JP・西濃対応 | `api/sagawa`, `api/japan-post`, `api/seino` |
| 設定 | マッピング設定・印刷テンプレート・帳票テンプレート | 3階層継承（system→tenant→client） |

---

## 優先実装推奨 / 优先实装建议

### 高優先度 / 高优先级
1. **#74 EDI計上予定データ** - 配送会社との日常業務に必須
2. **#77 配送証明POD** - 出荷証跡として重要
3. **#32 仕分けコード訂正** - 配送エラー時の手動修正に必要

### 中優先度 / 中优先级
4. **#44 チャーター便配送証明書** - チャーター便利用時に必要
5. **#75 TOS計上実績データ** - HHTスキャンなしの運用で必要
6. **#17/#37 入庫/受注分析** - 運用改善・KPIダッシュボードとして有用
7. **#33-34 FBA梱包データ完全対応** - Amazon FBA業務で必要

### 低優先度 / 低优先级
8. **#13 出力枚数カウント** - 運用管理の精度向上
9. **#52/#59 送り状変更専用UI** - 現状APIで対応可能、UI改善
10. **#60 カートン別梱包明細ラベル** - 専用フロー構築
