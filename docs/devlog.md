# 开发记录 / 開発記録

> ZELIX WMS Development Log
> 所有开发活动按时间倒序记录 / すべての開発活動を時系列逆順で記録

## [2026-03-16] 三端架构 + 权限 + 商品库存 + 最终开发计划 / 3アプリ構成 + 権限 + 商品在庫 + 最終開発計画

**变更类型 / 変更種別**: docs
**影响范围 / 影響範囲**: `docs/3pl-fba-enhancement/05-plan.md`, `10-platform-rbac.md`, `11-product-inventory.md`, `06-decisions.md`

### 内容 / 内容

新增三端架构设计（admin 平台端 + frontend 仓库端 + portal 客户端）、仓库端 RBAC 权限（7 角色 + resource:action 权限矩阵）、模板设计器需求（快递面单/账票 PDF/CSV 映射/标签）、角色工作台设计、新客户引导流程。

商品管理改造（商品归属 Shop 级别 + 多平台编码 platformCodes + 数据维护职责分离）。库存管理设计（通过型不写 StockQuant 用暂存区看板、保管型写 StockQuant 加客户隔离、混合型客户支持）。

最终开发计划重写：Phase 0-4 共 60-75 天、5 个里程碑、完整依赖关系图、风险应对。新增 ADR-014/015。

---

## [2026-03-16] 通过型业务流程 + 客户体系设计 / 通過型業務フロー + 顧客体系設計

**变更类型 / 変更種別**: docs
**影响范围 / 影響範囲**: `docs/3pl-fba-enhancement/07-passthrough-flow.md`, `docs/3pl-fba-enhancement/08-client-model.md`

### 内容 / 内容

新增两份核心设计文档：

07-passthrough-flow: 基于实际运营的通过型流程设计（FBA/RSL/B2B 三种目的地共用），包括客户门户入库预定（作业选项=收费点）、FBA 外箱标 PDF 拆分打印（4-up/6-up→热敏单张）、仓库受付→作业→检品出货全流程、差异明细客户自助查看、状态机设计。

08-client-model: 客户层级体系（Client→SubClient→Shop）、价格目录（每客户独立定价）、信用额度控制、费用明细按子客户/店铺拆分、账单只对顶层客户结算、多语言（中/日/英）、门户权限分级。

07: 実務に基づく通過型フロー（FBA/RSL/B2B 共用）、顧客ポータル入庫予約（作業オプション=課金ポイント）、外箱ラベル PDF 分割印刷、受付→作業→出荷フロー、差異明細、ステートマシン。

08: 顧客階層（Client→SubClient→Shop）、価格カタログ、与信枠、費用明細、請求書、多言語、権限。

---

## [2026-03-16] 3PL/FBA 系统增强开发文档（6 份） / 3PL/FBA システム強化開発ドキュメント（6 件）

**变更类型 / 変更種別**: docs
**影响范围 / 影響範囲**: `docs/3pl-fba-enhancement/`
**关联文档 / 関連ドキュメント**: `01-requirements.md` ~ `06-decisions.md`

### 内容 / 内容

基于 3PL/FBA SOP 与系统现状的 Gap 分析，编写完整开发文档：需求映射（40+ 功能点，P0/P1/P2 分级）、设计（6 个新模型 + 4 个模型扩展 + 流程图 + UI 要点）、技术方案（API/存储/打印/性能/安全）、开发实现（文件结构 + 任务拆分）、开发计划（4 Phase + 依赖链 + 里程碑）、架构决策（8 个 ADR）。

SOP とシステム現状の Gap 分析に基づき、完全な開発ドキュメントを作成：要件マッピング（40+ 機能、P0/P1/P2 分類）、設計（新規 6 モデル + 4 モデル拡張 + フロー図 + UI ポイント）、技術方案（API/ストレージ/印刷/性能/セキュリティ）、開発実装（ファイル構成 + タスク分解）、開発計画（4 Phase + 依存関係 + マイルストーン）、アーキテクチャ決定（8 ADR）。

---

## [2026-03-16] 3PL/FBA SOP 补充完善（10项内容） / 3PL/FBA SOP 補完（10項目）

**变更类型 / 変更種別**: docs
**影响范围 / 影響範囲**: `docs/japan-3pl-fba-sop-management.md`, `docs/japan-3pl-fba-sop-warehouse.md`
**关联文档 / 関連ドキュメント**: 同上

### 内容 / 内容

管理版新增 6 个章节：保险与赔偿标准、Amazon FBA 规格约束（箱规/贴标/包装/版本管理）、多仓纳品处理、IOR 与税务处理（含 ACP/消费税）、大促旺季应对、客户沟通机制（渠道/响应时效/定期报告）。

仓库作业版新增 4 个章节：在库管理（库位/盘点/库龄预警/状态标识）、培训与上岗标准（新人研修/岗位认证/复训）、FBA 移除订单处理、设备与耗材清单。

管理版に 6 章追加：保険・賠償基準、Amazon FBA 仕様制約、複数 FC 納品対応、IOR・税務処理、セール繁忙期対応、顧客コミュニケーション体制。

倉庫作業版に 4 章追加：在庫管理（ロケーション/棚卸/エイジング/ステータス）、教育・資格基準、FBA 返送注文対応、設備・消耗品一覧。

---

## [2026-03-16] 新增日本 3PL 与 FBA 通过型业务 SOP / 日本 3PL・FBA 通過型業務 SOP を追加

**变更类型 / 変更種別**: docs
**影响范围 / 影響範囲**: `docs/japan-3pl-fba-sop-management.md`, `docs/japan-3pl-fba-sop-warehouse.md`
**关联文档 / 関連ドキュメント**: `docs/japan-3pl-fba-sop-management.md`, `docs/japan-3pl-fba-sop-warehouse.md`

### 内容 / 内容

新增两份面向业务与仓库现场的标准作业文档，用于说明日本本土 `3PL` 与“中国发货到日本后转 `Amazon.co.jp FBA`”业务的标准流程、职责分工、收费结构、风险控制、现场执行步骤与表单模板。

管理版文档面向老板、业务负责人、项目负责人，重点整理业务定义、服务边界、流程、风险、`KPI` 与套餐化建议。

仓库作业版面向现场主管与执行人员，重点整理收货、检品、贴标、分箱、`FBA` 出货、退货整备的执行流程与可复制表单。

日本国内 `3PL` と「中国から日本へ輸送後、`Amazon.co.jp FBA` に転送する業務」について、営業・管理向けおよび倉庫現場向けの標準作業文書を新規追加した。

管理版では、業務定義、サービス範囲、責任分界、料金構成、リスク管理、`KPI`、商品化案を整理した。

倉庫作業版では、受領、検品、ラベル貼付、分箱、`FBA` 出荷、返品整備の手順と、そのまま転用できる帳票テンプレートを整備した。

---

## [2026-03-15] UX大改善 + 業績レポート + 荷主ポータル + 倉庫隔離

**变更类型 / 変更種別**: feat
**影响范围 / 影響範囲**: 前端全体 + 后端API + 数据库
**关联文档 / 関連ドキュメント**: なし

### 内容 / 内容

#### UX改善（8 commits）
- 全局確認ダイアログ美化（70+箇所のwindow.confirm()を自動置換、危險操作は赤色警告）
- OLoadingState組件（8ページにloading/空状態表示追加）
- 通知ベル（低在庫・期限切れ・入庫遅延アラート、5分ポーリング、クリックで遷移）
- 出荷検品スキャン音（成功/失敗/完了、Web Audio API）
- F3（次へスキップ）F8（手動完了）ショートカット追加
- autoAdvance設定のlocalStorage永続化
- 検品ページ タブレット/モバイル レスポンシブ対応
- 入庫検品スキャン入力拡大＋音フィードバック
- 入庫作成: 商品検索可能セレクト＋合計行表示

#### 業績レポート
- 荷主別業績レポートAPI（出荷・入庫集計）
- 在庫回転率API（回転率・回転日数・TOP SKU）
- /reports ページ: KPIカード、日別トレンド、回転率表、荷主別表

#### 荷主ポータル強化
- 在庫照会API + 画面（商品別在庫サマリー）
- 追跡番号検索API + 画面（注文番号/追跡番号/管理番号）

#### 倉庫レベルデータ隔離
- getWarehouseFilter() ヘルパー（ロール別倉庫アクセス制御）
- X-Warehouse-Id ヘッダー自動付与（HttpClient + apiFetch）
- 入庫指示・在庫一覧に倉庫フィルタ適用

#### 性能最適化
- APIキャッシュcomposable（重複リクエスト防止 + TTLキャッシュ）
- 通知ベルのポーリング最適化（60秒キャッシュ）

#### その他
- billing.ts重複コード削除
- コマンドパレットにページ追加
- 権限ロール白名単修正（/reports）
- base.ts import.meta.env クラッシュ修正
- E2Eテスト46/46全通過
- 旧E2Eテストデータ清掃

---

## [2026-03-15] 大規模SaaS化セッション / 大规模SaaS化session

**变更类型 / 変更種別**: feat, fix, refactor, perf, docs
**影响范围 / 影響範囲**: 全モジュール / 全模块
**关联文档 / 関連ドキュメント**: docs/extension/06-event-payloads.md

70+コミットによる大規模開発セッションの総括。
70+次提交的大规模开发session总结。

### SaaS基盤 / SaaS基础
- JWT認証 + ログインページ + ルートガード実装
  JWT认证 + 登录页面 + 路由守卫实装
- 多租户 tenantId 全コントローラ統一（共有ヘルパー getTenantId パターン）
  多租户 tenantId 全controller统一（共享helper getTenantId模式）
- ロール別メニュー表示制御（admin/manager/operator/viewer/client）
  角色菜单显示控制（admin/manager/operator/viewer/client）
- 全APIファイル認証対応（apiFetch wrapper、200+箇所）
  全API文件认证对应（apiFetch wrapper、200+处）
- 401自動ログアウト
  401自动登出

### 3PL料金体系 / 3PL费率体系
- 料金マスタ（ServiceRate）11種類の課金タイプ
  费率主数据（ServiceRate）11种计费类型
- 作業チャージ自動生成（出荷確認/検品/入庫/返品完了時）
  作业收费自动生成（出货确认/检品/入库/返品完成时）
- 月次請求→確定→請求書発行→入金確認 全フロー
  月次请求→确定→请求书发行→入金确认 全流程
- 運賃自動計算（出荷確認時に ShippingRate マスタから）
  运费自动计算（出货确认时从 ShippingRate 主数据）

### FBA/RSL管理 / FBA/RSL管理
- FBA入庫プラン管理（FNSKU/ASIN/FC選択/ステータス管理）
  FBA入库计划管理（FNSKU/ASIN/FC选择/状态管理）
- RSL入庫プラン管理（楽天SKU/FC選択）
  RSL入库计划管理（乐天SKU/FC选择）
- 出荷先タイプ（B2C/B2B/FBA/RSL）
  出货目的地类型（B2C/B2B/FBA/RSL）

### Integration Layer / 集成层
- OMS API（注文取込/在庫照会/出荷通知）
  OMS API（订单导入/库存查询/出货通知）
- Marketplace API（7家EC stub）
  Marketplace API（7家EC stub）
- ERP API（出荷/請求/在庫エクスポート）
  ERP API（出货/请求/库存导出）

### 入庫管理強化 / 入库管理强化
- 通過型入庫（クロスドック）
  通过型入库（交叉转运）
- 入庫差異レポート + 棚入れロケーション推薦
  入库差异报告 + 上架位置推荐
- 仕入先マスタ連携
  仕入先主数据连接

### 在庫管理 / 库存管理
- 在庫リビルド（StockMoveから再計算）
  库存重建（从StockMove重新计算）
- 引当超時解放（30分タイムアウト）
  预留超时释放（30分钟超时）
- KPIダッシュボード + 期限4段階色分け
  KPI仪表板 + 保质期4级颜色区分

### 出荷検品UX / 出货检品UX
- F键バー再設計 + 自動進行 + スキャン履歴
  F键栏重设计 + 自动前进 + 扫描历史
- 進捗バー + 成功フラッシュ + 重複防止
  进度条 + 成功闪烁 + 重复防止

### コンポーネント化 / 组件化
- 11個 composable 抽出（1230行削減）
  11个 composable 提取（削减1230行）

### その他 / 其他
- 企業ブルー配色変更 / 企业蓝色配色变更
- 倉庫切替セレクター + 荷主ポータル / 仓库切换选择器 + 荷主门户
- Swagger API Docs / Swagger API文档
- B2B納品書テンプレート / B2B交货单模板
- 商品出荷統計 + ラベル印刷 / 商品出货统计 + 标签打印
- ユーザー管理（5角色+子ユーザー）/ 用户管理（5角色+子用户）
- 耗材管理 + 梱包ルール / 耗材管理 + 梱包规则

---

## [2026-03-15] RSL管理モジュール追加 / 添加RSL管理模块（楽天スーパーロジスティクス / 乐天超级物流）

**变更类型 / 変更種別**: feat
**影响范围 / 影響範囲**: backend/src/models, backend/src/api, frontend/src/api, frontend/src/views/rsl, frontend/src/types, frontend/src/router, frontend/src/components/layout
**关联文档 / 関連ドキュメント**: docs/devlog.md

### 内容 / 内容
FBAモジュールと同じ構造でRSL（楽天スーパーロジスティクス）管理モジュールを新規作成。
按照FBA模块的相同结构新建RSL（乐天超级物流）管理模块。

- バックエンド: RSLプランモデル、コントローラー（CRUD+状態遷移）、ルーター作成、/api/rsl に登録
- 后端: 创建RSL计划模型、控制器（CRUD+状态转换）、路由，注册到 /api/rsl
- フロントエンド: API クライアント、プラン一覧・作成/編集ページ、ルーター・ナビゲーション追加
- 前端: API客户端、计划列表/创建编辑页面、路由和导航菜单添加
- 商品マスタにrakutenSku、rslEnabledフィールドを追加（バックエンド・フロントエンド）
- 商品主数据添加 rakutenSku、rslEnabled 字段（后端和前端）
- 配送先倉庫: 市川FC, 八千代FC, 茨木FC, 小牧FC, 鳥栖FC
- 配送目的仓库: 市川FC, 八千代FC, 茨木FC, 小牧FC, 鳥栖FC

---

## [2026-03-15] 通過型入庫（クロスドック）基盤追加 / 添加通过型入库（交叉转运）基础

**变更类型 / 変更種別**: feat
**影响范围 / 影響範囲**: 入庫モデル・コントローラ・フロントエンド（作成画面・一覧画面）
**关联文档 / 関連ドキュメント**: `docs/devlog.md`

### 内容 / 内容

- InboundOrderモデルに `flowType` (standard/crossdock) と `linkedOrderIds` フィールドを追加
  InboundOrder模型添加 `flowType` (standard/crossdock) 和 `linkedOrderIds` 字段
- 通過型入庫の場合、検品完了後に棚入れをスキップし直接完了（received → done）
  通过型入库时，检品完成后跳过上架直接完成（received → done）
- 一括検品でも通過型の場合は自動完了
  批量检品时通过型也自动完成
- 入庫指示作成画面に入庫タイプ選択フィールドとクロスドックヒントを追加
  入库指示创建画面添加入库类型选择字段和交叉转运提示
- 入庫指示一覧画面のステータス列に通過型バッジ（オレンジ色）を表示
  入库指示列表画面的状态列显示通过型标签（橙色）
- 既存の在庫型（standard）フローには影響なし
  不影响现有的库存型（standard）流程

---

## [2026-03-16] 全面機能拡充・品質改善・パフォーマンス最適化 / 全面功能扩充、质量改善、性能优化

**变更类型 / 変更種別**: feat, fix, refactor, perf
**影响范围 / 影響範囲**: 全モジュール（出荷/入庫/在庫/返品/棚卸/商品/日次/検品/拡張システム）
**关联文档 / 関連ドキュメント**: なし

### 内容 / 内容

#### 入庫管理 / 入库管理
- 入庫CSV仕入先マスタ連携: CSV値/マスタ選択/手動入力の3モード対応
  入库CSV仕入先主数据连接: CSV值/主数据选择/手动输入3种模式

#### 返品管理 / 返品管理
- 返品検品にZodスキーマ数量バリデーション追加、操作ログ接入
  返品检品添加Zod schema数量校验、操作日志接入
- 返品詳細ページにロケーション選択器追加（disposition=restock時）
  返品详情页添加位置选择器（disposition=restock时）
- 返品作成ページの商品SKU入力をマスタドロップダウンに変更
  返品创建页商品SKU输入改为主数据下拉选择
- 返品事務保護: トランザクションで返品完了操作をアトミック化
  返品事务保护: 用事务保证返品完了操作的原子性
- 返品ダッシュボード（KPIカード+理由別集計+最近の返品テーブル）
  返品仪表板（KPI卡片+按原因汇总+最近返品表格）

#### 商品管理 / 商品管理
- 商品ラベル印刷（単体）: LabelPrintDialog テンプレート選択→プレビュー→印刷
  商品标签打印（单个）: LabelPrintDialog 模板选择→预览→打印
- 商品一括ラベル印刷: 複数商品選択→順次印刷、前後ナビ付きプレビュー
  商品批量标签打印: 多商品选择→顺序打印、前后导航预览
- 商品在庫数表示+フィルター: テーブルに在庫数列追加、在庫あり/なしフィルター
  商品库存数显示+过滤器: 表格添加库存数列、有库存/无库存过滤
- renderTemplateToPng: 汎用コンテキスト対応リファクタ
  renderTemplateToPng: 通用上下文重构

#### 出荷管理 / 出货管理
- 出荷一覧サーバーサイドページネーション実装
  出货列表服务端分页实现
- 出荷統計グラフ追加（出荷トレンド可視化）
  出货统计图表追加（出货趋势可视化）

#### 在庫管理 / 库存管理
- ロケーション使用率表示（GET /api/inventory/location-usage + 色分けバッジ）
  位置使用率显示（GET /api/inventory/location-usage + 色分徽章）
- 賞味期限アラート4段階色分け（期限切れ/7日/30日/90日）
  保质期警报4级颜色区分（过期/7天/30天/90天）
- ロット管理・在庫調整修正（計算ロジック・バリデーション改善）
  批次管理・库存调整修正（计算逻辑・校验改善）

#### 棚卸管理 / 盘点管理
- 棚卸修正: lotNumber対応、upsertロジック修正、操作ログ追加
  盘点修正: lotNumber对应、upsert逻辑修正、操作日志追加

#### 日次レポート / 日次报告
- 日次レポートKPIカード（出荷/入庫/返品/在庫/棚卸の完了率表示）
  日次报告KPI卡片（出货/入库/返品/库存/盘点完成率显示）
- 日次レポート詳細ページに進捗バー追加
  日次报告详情页添加进度条

#### 検品UX改善 / 检品UX改善
- 検品ページUX改善: Fキーショートカット、自動進行、履歴表示、行番号表示
  检品页UX改善: F键快捷键、自动进行、历史显示、行号显示
- モバイルレスポンシブ対応（InboundReceive/InboundPutaway/OrderItemScan）
  移动端响应式适配（InboundReceive/InboundPutaway/OrderItemScan）

#### パフォーマンス最適化 / 性能优化
- stockService N+1クエリ最適化: reserveStockForOrder/completeStockForOrder/unreserveStockForOrder 一括取得化（N回→2~3回に削減）
  stockService N+1查询优化: 批量获取化（N次→2~3次削减）

#### 拡張システム改善 / 扩展系统改善
- HOOK_EVENTS 全覆盖: TASK/STOCKTAKING イベント追加
  HOOK_EVENTS 全覆盖: 添加TASK/STOCKTAKING事件
- ScriptRunner 可修改フィールド拡張（より多くのエンティティフィールドを編集可能に）
  ScriptRunner 可修改字段扩展（更多实体字段可编辑）
- イベントペイロード文書化（各Hookイベントのペイロード構造を明記）
  事件负载文档化（明确各Hook事件的负载结构）

#### UI・品質改善 / UI・质量改善
- CSV導入バリデーション改善（エラー行赤ハイライト+インラインメッセージ+サマリーバナー）
  CSV导入校验改善（错误行红色高亮+行内消息+汇总横幅）
- Wave管理バグ修正（assignedNameスキーマ欠落、warehouseIdフォーム欠落）
  Wave管理Bug修正（assignedName schema缺失、warehouseId表单缺失）
- サイドバーナビゲーション整理（業務フロー順、設定グループ再編）
  侧边栏导航整理（业务流程顺序、设置分组重组）
- console 清理: 66ファイルからconsole.log/warn/errorをlogger呼び出しに置換
  console清理: 66个文件的console.log/warn/error替换为logger调用
- 印刷テンプレート名修正（テンプレート表示名の不整合を修正）
  打印模板名修正（模板显示名不一致修正）

---

## [2026-03-15] 商品設定ページに在庫数カラムと在庫フィルターを追加 / 商品设置页面添加库存数列和库存过滤器

**变更类型 / 変更種別**: feat
**影响范围 / 影響範囲**: `frontend/src/views/settings/ProductSettings.vue`
**关联文档 / 関連ドキュメント**: なし

### 内容 / 内容

商品設定ページに以下の改善を実施：
对商品设置页面进行了以下改善：

- **在庫数カラム追加 / 添加库存数列**: テーブルに「在庫数」列を追加。既存の在庫サマリーAPIを非同期で呼び出し、商品一覧と在庫数量をマージ表示。在庫あり=緑色、在庫なし=グレー表示。
- **在庫クイックフィルター追加 / 添加库存快速过滤器**: 「全て」「在庫あり」「在庫なし」の3ボタンフィルターを追加。クライアントサイドで即時フィルタリング。
- **CSV出力に在庫数を追加 / CSV导出添加库存数**: CSV出力設定に在庫数列を追加。

技術的アプローチ：バックエンド変更なし。既存の `/api/inventory/stock/summary` エンドポイントを利用して、商品一覧ロード後に非同期で在庫データを取得・マージする軽量な実装。
技术方案：无后端变更。利用已有的 `/api/inventory/stock/summary` 端点，在商品列表加载后异步获取库存数据进行合并的轻量级实现。

---

## [2026-03-15] 入庫管理強化・操作ログ・帳票拡張・検品UX・コード品質 / 入库管理强化、操作日志、帐票扩展、检品UX、代码质量

**变更类型 / 変更種別**: feat, fix, refactor, perf
**影响范围 / 影響範囲**: 全モジュール（出荷/入庫/在庫/商品/帳票/検品）
**关联文档 / 関連ドキュメント**: なし

### 内容 / 内容

#### 機能追加 / 功能追加
- 送り状種類マッピング enabled Zodスキーマ修正 + 出荷指示フォーム連動
- 操作ログ全量接入（出荷CRUD/ステータス、入庫全操作、在庫調整/移動、商品CRUD、B2エクスポート）
- 入庫差異レポート API + 検品画面に差異サマリー表示
- 棚入れロケーション推薦 API + 自動選択・ヒント表示
- 帳票テンプレートに入庫系（入庫リスト/検品シート）・商品ラベル targetType 追加
- 入庫一覧ページ帳票印刷ボタン接続
- FormTemplateSettings Table組件化 + プリセットテンプレート
- 在庫ダッシュボードKPIカード + 期限切れ警告
- 入庫仕入先フィールドを仕入先マスタ連携

#### 出荷検品UX改善 / 出货检品UX改善
- 3ページ共通: 検品進捗バー、スキャン成功フラッシュ
- 商品スキャン検品: 重複スキャン防護
- N-1/1-1検品: スキャンエラー時に期待SKU表示
- 自動印刷失敗時のエラー表示

#### コード品質修正 / 代码质量修正
- v-for変数遮蔽修正（3箇所）、renderサービスconsole→logger（24箇所）
- JSON.parse防護、regex注入対策、静默エラー→logger.warn
- ruleController Zodバリデーション、DBインデックス追加

---

## [2026-03-14] Phase 8: 佐川急便插件实装 / Phase 8: 佐川急便プラグイン実装

**变更类型 / 変更種別**: feat
**影响范围 / 影響範囲**: `extensions/plugins/sagawa-express/`、`frontend/src/api/sagawa.ts`、`backend/src/api/routes/sagawa.ts`
**关联文档 / 関連ドキュメント**: `docs/extension/05-plan.md` Phase 8

### 内容 / 内容

将佐川急便 CSV 连携从硬编码路由迁移到标准插件架构。
佐川急便 CSV 連携をハードコードルートから標準プラグインアーキテクチャに移行。

#### 新增文件 / 新規ファイル
- `extensions/plugins/sagawa-express/manifest.json` — 插件声明
- `extensions/plugins/sagawa-express/index.ts` — 插件入口（Hook 注册 + API 注册）
- `extensions/plugins/sagawa-express/routes.ts` — 插件 API 路由（5个端点）
- `extensions/plugins/sagawa-express/services/sagawaCsvService.ts` — CSV 生成服务
- `extensions/plugins/sagawa-express/services/sagawaTrackingService.ts` — 追踪号解析服务
- `extensions/plugins/sagawa-express/data/invoiceTypes.ts` — 送り状种类 + 配达时间带定义

#### 变更文件 / 変更ファイル
- `frontend/src/api/sagawa.ts` — API 路径迁移到 `/api/plugins/sagawa-express/*`
- `backend/src/api/routes/sagawa.ts` — 旧路由添加 deprecation 警告

#### API 端点 / API エンドポイント
- `GET /api/plugins/sagawa-express/status` — 插件状态
- `GET /api/plugins/sagawa-express/invoice-types` — 送り状种类
- `GET /api/plugins/sagawa-express/config` — 插件配置
- `POST /api/plugins/sagawa-express/export` — CSV 导出
- `POST /api/plugins/sagawa-express/import-tracking` — 追踪号导入

#### Hook 连携 / Hook 連携
- `order.shipped` — 佐川订单出荷完了时记录日志
- `order.confirmed` — 佐川订单确认时记录日志

---

## [2026-03-14] UI 打磨 + Dashboard 改善 / UI ポリッシュ + ダッシュボード改善

**变更类型 / 変更種別**: fix / refactor
**影响范围 / 影響範囲**: `frontend/src/views/Welcome.vue`、`frontend/src/components/odoo/ODialog.vue`、`frontend/src/components/layout/WmsNavbar.vue`、`backend/src/core/queue/queueManager.ts`、`frontend/.env.development`、`frontend/src/views/settings/ProductSettings.vue`、`frontend/src/views/inventory/InventoryStock.vue`
**关联文档 / 関連ドキュメント**: 无 / なし

### 内容 / 内容

#### Dashboard 改善 / ダッシュボード改善
- Dashboard 页面增加 padding，修复内容紧贴顶部/边缘的问题 / ダッシュボードページに padding を追加、コンテンツが上端・端に密着する問題を修正
- Quick Nav 图标从纯文字符号（+, >, v, #）改为 SVG 图标 / クイックナビのアイコンをテキスト文字から SVG アイコンに変更
- 保留・逾期订单卡片增加警告/危险背景色 / 保留・遅延注文カードに警告・危険背景色を追加
- 最近出荷表格点击修复（从创建页改为作业列表）/ 最近出荷テーブルのクリック先を修正（作成ページ→作業一覧）

#### Navbar 改善 / ナビバー改善
- Home 按钮与菜单之间增加分隔线 / ホームボタンとメニュー間にセパレーターを追加

#### Bug 修复 / バグ修正
- ODialog `width` 属性警告消除（`inheritAttrs: false`）/ ODialog width 属性警告を解消
- 前端 `.env.development` 中 API 地址从 `192.168.0.99` 改为 `localhost` / フロントエンド API アドレスを localhost に変更
- 后端 + 前端 host 绑定从 `0.0.0.0` 改为 `localhost` / バックエンド・フロントエンドの host バインドを localhost に変更
- 商品一览 + 在库一览的产品图片大小限制（inline style 替代 scoped CSS）/ 商品・在庫一覧の商品画像サイズを制限

#### 基础设施 / インフラ
- Redis 连接失败不再无限刷错误日志（3次重试后放弃，只打一次 WARN）/ Redis 接続失敗時の無限ログ出力を修正
- BullMQ 队列名从 `wms:webhook` 改为 `wms-webhook`（修复 `:` 不允许的问题）/ BullMQ キュー名のコロンをハイフンに修正

---

## [2026-03-14] Extension Architecture Phase 5 完成 / 拡張アーキテクチャ Phase 5 完了

**变更类型 / 変更種別**: feat
**影响范围 / 影響範囲**: `backend/src/core/extensions/customFieldService.ts`、`backend/src/core/extensions/featureFlagService.ts`、`backend/src/models/customFieldDefinition.ts`、`backend/src/models/featureFlag.ts`
**关联文档 / 関連ドキュメント**: `docs/extension/05-plan.md`

### 内容 / 内容

实现了 Extension Architecture Phase 5（CustomFields + FeatureFlags）：

#### 新增文件 / 新規ファイル
- `backend/src/models/customFieldDefinition.ts` — 自定义字段定义模型（支持 text/number/boolean/date/select 类型）
- `backend/src/models/featureFlag.ts` — 功能开关模型（支持按租户覆盖）
- `backend/src/core/extensions/customFieldService.ts` — 自定义字段服务（CRUD + 值校验 + 默认值）
- `backend/src/core/extensions/featureFlagService.ts` — 功能开关服务（含1分钟内存缓存 + 租户覆盖）
- `backend/src/api/controllers/customFieldController.ts` — 自定义字段管理 API
- `backend/src/api/controllers/featureFlagController.ts` — 功能开关管理 API
- `frontend/src/api/customField.ts` — 前端自定义字段 API 客户端
- `frontend/src/api/featureFlag.ts` — 前端功能开关 API 客户端
- `frontend/src/views/settings/CustomFieldSettings.vue` — 自定义字段管理页面
- `frontend/src/views/settings/FeatureFlagSettings.vue` — 功能开关管理页面
- `frontend/src/composables/useFeatureFlag.ts` — 功能开关 composable

#### 修改文件 / 変更ファイル
- `backend/src/core/extensions/extensionManager.ts` — 集成 CustomFieldService + FeatureFlagService
- `backend/src/core/extensions/index.ts` — 导出新服务
- `backend/src/api/routes/extensions.ts` — 注册 custom-fields 和 feature-flags 路由
- `backend/src/models/shipmentOrder.ts` — 添加 customFields 字段
- `backend/src/models/product.ts` — 添加 customFields 字段
- `backend/src/models/inboundOrder.ts` — 添加 customFields 字段
- `backend/src/models/returnOrder.ts` — 添加 customFields 字段
- `frontend/src/router/index.ts` — 注册 CustomFieldSettings 和 FeatureFlagSettings 路由
- `frontend/src/layouts/WmsLayout.vue` — 侧边栏添加「カスタムフィールド」和「フィーチャーフラグ」菜单
- `frontend/src/views/settings/product-settings/ProductFormDialog.vue` — 集成 OCustomFields 到商品独自フィールド tab
- `frontend/src/components/form/ShipmentOrderEditDialog.vue` — 集成 OCustomFields 到订单编辑「カスタムフィールド」tab
- `backend/src/api/middleware/featureFlagGuard.ts` — 功能开关路由中间件（NEW）
- `backend/src/api/routes/extensions.ts` — Webhook/Plugin/Script 路由添加功能开关守卫

#### API 新增 / API 追加
- `GET /api/extensions/custom-fields` — 列出所有字段定义
- `POST /api/extensions/custom-fields` — 创建字段定义
- `GET /api/extensions/custom-fields/:entityType/active` — 获取指定实体启用的字段定义
- `POST /api/extensions/custom-fields/:entityType/validate` — 校验字段值
- `PUT /api/extensions/custom-fields/:id` — 更新字段定义
- `DELETE /api/extensions/custom-fields/:id` — 删除字段定义
- `GET /api/extensions/feature-flags` — 列出所有功能开关
- `GET /api/extensions/feature-flags/status` — 获取租户功能状态映射
- `POST /api/extensions/feature-flags` — 创建功能开关
- `PUT /api/extensions/feature-flags/:id` — 更新功能开关
- `DELETE /api/extensions/feature-flags/:id` — 删除功能开关
- `POST /api/extensions/feature-flags/:id/toggle` — 切换功能开关
- `POST /api/extensions/feature-flags/:id/tenant-override` — 设置租户覆盖
- `DELETE /api/extensions/feature-flags/:id/tenant-override/:tenantId` — 删除租户覆盖

---

## [2026-03-14] Extension Architecture Phase 4 完成 / 拡張アーキテクチャ Phase 4 完了

**变更类型 / 変更種別**: feat
**影响范围 / 影響範囲**: `backend/src/core/extensions/scriptRunner.ts`、`backend/src/models/automationScript.ts`、`backend/src/models/scriptExecutionLog.ts`
**关联文档 / 関連ドキュメント**: `docs/extension/05-plan.md`

### 内容 / 内容

实现了 Extension Architecture Phase 4（ScriptRunner）：

#### 新增文件 / 新規ファイル
- `backend/src/models/automationScript.ts` — 自动化脚本模型
- `backend/src/models/scriptExecutionLog.ts` — 脚本执行日志模型（30天TTL）
- `backend/src/core/extensions/scriptRunner.ts` — 脚本执行器（Node.js vm 沙箱）
- `backend/src/api/controllers/scriptController.ts` — 脚本管理 API
- `frontend/src/api/script.ts` — 前端脚本 API 客户端
- `frontend/src/views/settings/ScriptEditor.vue` — 脚本管理页面

#### 修改文件 / 変更ファイル
- `backend/src/core/extensions/extensionManager.ts` — 集成 ScriptRunner（emit 后异步执行匹配脚本）
- `backend/src/api/routes/extensions.ts` — 注册脚本管理路由
- `frontend/src/router/index.ts` — 注册脚本页面路由
- `frontend/src/layouts/WmsLayout.vue` — 侧边栏添加「スクリプト」菜单

#### 安全特性 / セキュリティ機能
- Node.js vm 沙箱隔离（禁止代码生成和 WASM）
- 禁止关键字检查（require, import, eval, process, fs 等）
- 白名单字段修改（仅允许修改指定路径如 order.orderGroup）
- 超时保护（100ms - 30s 可配置）
- 创建时强制语法校验

#### API 新增 / API 追加
- `GET /api/extensions/scripts` — 列出所有脚本
- `POST /api/extensions/scripts` — 创建脚本（含语法校验）
- `GET /api/extensions/scripts/:id` — 获取单个脚本
- `PUT /api/extensions/scripts/:id` — 更新脚本
- `DELETE /api/extensions/scripts/:id` — 删除脚本
- `POST /api/extensions/scripts/:id/toggle` — 切换启用/禁用
- `POST /api/extensions/scripts/:id/validate` — 语法校验
- `POST /api/extensions/scripts/:id/test` — 手动测试执行
- `GET /api/extensions/scripts/:id/logs` — 查询执行日志

---

## [2026-03-14] Extension Architecture Phase 3 完成 / 拡張アーキテクチャ Phase 3 完了

**变更类型 / 変更種別**: feat
**影响范围 / 影響範囲**: `backend/src/core/extensions/pluginManager.ts`、`backend/src/models/plugin.ts`、`backend/src/models/pluginConfig.ts`、`extensions/plugins/`
**关联文档 / 関連ドキュメント**: `docs/extension/05-plan.md`

### 内容 / 内容

实现了 Extension Architecture Phase 3（PluginManager）：

#### 新增文件 / 新規ファイル
- `backend/src/models/plugin.ts` — 插件元数据模型
- `backend/src/models/pluginConfig.ts` — 插件配置模型（按租户隔离）
- `backend/src/core/extensions/pluginManager.ts` — 插件管理器（加载/启用/禁用/配置）
- `backend/src/api/controllers/pluginController.ts` — 插件管理 API
- `extensions/plugins/inventory-alert/` — 示例插件（库存预警）
- `frontend/src/api/plugin.ts` — 前端插件 API 客户端
- `frontend/src/views/settings/PluginManagement.vue` — 插件管理页面

#### 修改文件 / 変更ファイル
- `backend/src/core/extensions/extensionManager.ts` — 集成 PluginManager（启动时加载插件）
- `backend/src/core/extensions/index.ts` — 导出 PluginManager
- `backend/src/api/routes/extensions.ts` — 注册插件管理路由
- `backend/src/app.ts` — 挂载插件自定义 API 路由 (`/api/plugins/{name}/*`)
- `frontend/src/router/index.ts` — 注册插件管理页面路由
- `frontend/src/layouts/WmsLayout.vue` — 侧边栏添加「プラグイン」菜单

#### API 新增 / API 追加
- `GET /api/extensions/plugins` — 列出所有插件
- `GET /api/extensions/plugins/:name` — 获取单个插件详情
- `POST /api/extensions/plugins/:name/enable` — 启用插件
- `POST /api/extensions/plugins/:name/disable` — 禁用插件
- `GET /api/extensions/plugins/:name/config` — 获取插件配置
- `PUT /api/extensions/plugins/:name/config` — 更新插件配置
- `GET /api/plugins/{name}/*` — 插件自定义 API

---

## [2026-03-14] Extension Architecture Phase 2 完成 / 拡張アーキテクチャ Phase 2 完了

**变更类型 / 変更種別**: feat
**影响范围 / 影響範囲**: `backend/src/core/extensions/webhookDispatcher.ts`、`backend/src/models/webhook.ts`、`backend/src/models/webhookLog.ts`、`backend/src/api/controllers/webhookController.ts`
**关联文档 / 関連ドキュメント**: `docs/extension/05-plan.md`

### 内容 / 内容

实现了 Extension Architecture Phase 2（WebhookDispatcher）的后端部分：

拡張アーキテクチャ Phase 2（WebhookDispatcher）のバックエンドを実装完了：

#### 新增文件 / 新規ファイル
- `backend/src/models/webhook.ts` — Webhook 配置模型 / Webhook 設定モデル
- `backend/src/models/webhookLog.ts` — 投递日志模型（30天TTL）/ 配信ログモデル（30日TTL）
- `backend/src/core/extensions/webhookDispatcher.ts` — Webhook 投递器（HMAC-SHA256 签名、指数退避重试、30s 超时）
- `backend/src/api/controllers/webhookController.ts` — Webhook CRUD + 测试发送 + 投递日志查询

#### 修改文件 / 変更ファイル
- `backend/src/core/extensions/extensionManager.ts` — 集成 WebhookDispatcher（emit 后异步投递）
- `backend/src/api/routes/extensions.ts` — 注册 Webhook 路由

#### API 新增 / API 追加
- `GET /api/extensions/webhooks` — 列出所有 Webhook（可按 event/enabled 筛选）
- `POST /api/extensions/webhooks` — 创建 Webhook（自动生成 secret）
- `GET /api/extensions/webhooks/:id` — 获取单个 Webhook
- `PUT /api/extensions/webhooks/:id` — 更新 Webhook
- `DELETE /api/extensions/webhooks/:id` — 删除 Webhook
- `POST /api/extensions/webhooks/:id/test` — 测试发送
- `POST /api/extensions/webhooks/:id/toggle` — 快速切换启用/禁用
- `GET /api/extensions/webhooks/:id/logs` — 查询投递日志（分页）

---

## [2026-03-14] Extension Architecture Phase 1 完成 / 拡張アーキテクチャ Phase 1 完了

**变更类型 / 変更種別**: feat
**影响范围 / 影響範囲**: `backend/src/core/extensions/`、`backend/src/models/eventLog.ts`、核心 Controller/Service
**关联文档 / 関連ドキュメント**: `docs/extension/01-requirements.md` ~ `docs/extension/05-plan.md`

### 内容 / 内容

实现了 Extension Architecture Phase 1 的全部内容：

拡張アーキテクチャ Phase 1 のすべてを実装完了：

#### 新增文件 / 新規ファイル
- `backend/src/core/extensions/types.ts` — 17个标准 Hook 事件定义 / 17個の標準 Hook イベント定義
- `backend/src/core/extensions/hookManager.ts` — Hook 注册与事件分发 / Hook 登録・イベント配信
- `backend/src/core/extensions/extensionManager.ts` — 统一扩展管理入口 / 統一拡張管理エントリ
- `backend/src/core/extensions/index.ts` — 公共导出 / 公開エクスポート
- `backend/src/models/eventLog.ts` — 事件日志模型（90天TTL）/ イベントログモデル（90日TTL）
- `backend/src/api/controllers/extensionController.ts` — Hook 查看 + 事件日志 API
- `backend/src/api/routes/extensions.ts` — 扩展系统路由

#### 修改文件 / 変更ファイル
- `backend/src/server.ts` — 初始化 ExtensionManager / ExtensionManager 初期化
- `backend/src/api/routes/index.ts` — 注册 `/api/extensions` 路由
- `backend/src/api/controllers/shipmentOrderController.ts` — 埋入 order.created/confirmed/shipped/held/unheld/cancelled 事件
- `backend/src/services/stockService.ts` — 埋入 stock.reserved/released + inventory.changed 事件
- `backend/src/services/inboundWorkflow.ts` — 埋入 inbound.received/putaway.completed 事件
- `backend/src/services/outboundWorkflow.ts` — 埋入 wave.created/completed 事件
- `backend/src/api/controllers/returnOrderController.ts` — 埋入 return.completed 事件

#### API 新增 / API 追加
- `GET /api/extensions/hooks` — 查看所有 Hook 事件及 handler
- `GET /api/extensions/hooks/summary` — Hook 概要
- `GET /api/extensions/logs` — 事件日志查询（分页）
- `GET /api/extensions/logs/stats` — 事件日志统计

---

## [2026-03-14] 建立开发规范与记录体系 / 開発規範と記録体制の構築

**变更类型 / 変更種別**: docs
**影响范围 / 影響範囲**: `CLAUDE.md`, `docs/devlog.md`
**关联文档 / 関連ドキュメント**: `CLAUDE.md`

### 内容 / 内容

新增三条项目规则 / 3つのプロジェクトルールを追加：

1. **文档同步规则** — 需求/设计/技术/开发/计划变更时，必须先更新对应文档再开发
   **ドキュメント同期ルール** — 要件/設計/技術/開発/計画変更時、対応ドキュメントを先に更新してから開発

2. **开发记录规则** — 所有开发活动记录到 `docs/devlog.md`
   **開発記録ルール** — すべての開発活動を `docs/devlog.md` に記録

3. **双语备注规则** — 所有备注、注释、文档使用中文+日文双语
   **バイリンガル注釈ルール** — すべてのコメント・注釈・ドキュメントは中国語+日本語の二言語

---
