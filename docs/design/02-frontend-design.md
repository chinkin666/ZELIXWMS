# フロントエンド設計書 / 前端设计文档

> 対象読者: 新規開発者 / 目标读者: 新加入的开发者
>
> 最終更新: 2026-03-21

---

## 目次 / 目录

1. [フロントエンド構成](#1-フロントエンド構成--前端架构)
2. [技術スタック](#2-技術スタック--技术栈)
3. [ディレクトリ構成](#3-ディレクトリ構成--目录结构)
4. [ルーティング設計](#4-ルーティング設計--路由设计)
5. [状態管理](#5-状態管理--状态管理)
6. [API 通信層](#6-api-通信層--api-通信层)
7. [コンポーネント設計](#7-コンポーネント設計--组件设计)
8. [i18n（多言語対応）](#8-i18n多言語対応--国际化)
9. [テーマ](#9-テーマ--主题)
10. [共通パターン](#10-共通パターン--通用模式)

---

## 1. フロントエンド構成 / 前端架构

ZELIXWMS は **3 つの独立した Vue 3 アプリケーション** で構成される。
バックエンドは NestJS + PostgreSQL (Supabase) に移行済み。フロントエンドの変更は最小限（API URL のみ変更）。
ZELIXWMS 由 **3 个独立的 Vue 3 应用** 构成。
后端已迁移到 NestJS + PostgreSQL (Supabase)。前端变更最小化（仅修改 API URL）。

| アプリ / 应用 | ディレクトリ / 目录 | 対象ユーザー / 目标用户 | 用途 / 用途 |
|---|---|---|---|
| **frontend** | `frontend/` | 倉庫オペレーター / 仓库操作员 | WMS 本体（入出庫・在庫・出荷・請求等） |
| **admin** | `admin/` | システム管理者 / 系统管理员 | テナント管理・KPI・料金設定・荷主管理 |
| **portal** | `portal/` | 荷主（3PL 委託元）/ 货主（3PL 委托方） | 入庫依頼・在庫照会・出庫申請・請求確認 |

### なぜ分離するのか / 为什么分离

- **権限境界の明確化**: 各アプリは異なるロールに対応。認証・認可ロジックが簡素になる。
  权限边界清晰：每个应用对应不同角色，认证授权逻辑更简单。
- **独立デプロイ**: frontend を更新しても admin/portal に影響しない。
  独立部署：更新 frontend 不影响 admin/portal。
- **バンドルサイズ最適化**: 各アプリは必要な機能のみをバンドルする。
  包体积优化：每个应用仅打包所需功能。
- **UX 最適化**: オペレーター向け UI と荷主向け UI では設計思想が異なる。
  UX 优化：操作员 UI 和货主 UI 的设计理念不同。

### アプリ間の共通点 / 应用间的共同点

- 同一 NestJS バックエンド API (`/api`) を共有する / 共享同一 NestJS 后端 API
- Supabase Auth JWT ベースの認証フロー / 基于 Supabase Auth JWT 的认证流程
- `getApiBaseUrl()` による API エンドポイント解決 / 通过 `getApiBaseUrl()` 解析 API 端点
- 多言語対応（JA/EN/CN）/ 多语言支持

---

## 2. 技術スタック / 技术栈

| カテゴリ / 类别 | 技術 / 技术 | 備考 / 备注 |
|---|---|---|
| フレームワーク | **Vue 3** (Composition API) | `<script setup>` を標準使用 |
| ビルドツール | **Vite** | HMR + `@` エイリアス (`./src`) |
| 状態管理 | **Pinia** | Vuex の後継、TypeScript 親和性が高い |
| UI ライブラリ | **Element Plus** (部分使用) | DatePicker, Dialog 等で利用 |
| カスタム UI | **Odoo 風コンポーネント** | ControlPanel, OButton, DataTable 等 |
| HTTP | **fetch API** (ラッパー付き) | `HttpClient` クラス + `apiFetch` 関数 |
| ルーティング | **Vue Router 4** | History モード、遅延ロード |
| 型安全 | **TypeScript** | strict モード |
| Vite プラグイン | `vue`, `vue-jsx`, `vue-devtools` | vite.config.ts で設定 |

---

## 3. ディレクトリ構成 / 目录结构

```
frontend/src/
├── api/              # API 通信モジュール / API 通信模块
│   ├── base.ts       #   getApiBaseUrl() — URL 解決 / URL 解析
│   └── http.ts       #   HttpClient + apiFetch — 統一 HTTP クライアント / 统一 HTTP 客户端
├── assets/           # 静的リソース (CSS, 画像) / 静态资源
├── components/       # 再利用可能コンポーネント / 可复用组件
│   ├── odoo/         #   Odoo 風 UI 部品 / Odoo 风格 UI 组件
│   ├── layout/       #   ナビゲーション, メニュー / 导航, 菜单
│   ├── table/        #   テーブル関連 / 表格相关
│   ├── form/         #   フォーム関連 / 表单相关
│   ├── dialogs/      #   ダイアログ / 对话框
│   ├── search/       #   検索フォーム / 搜索表单
│   ├── print/        #   印刷プレビュー / 打印预览
│   └── import/       #   CSV/ファイル取込 / CSV/文件导入
├── composables/      # Vue Composition API フック / 组合式函数
│   ├── useI18n.ts    #   多言語 / 国际化
│   ├── useTheme.ts   #   テーマ切替 / 主题切换
│   ├── useToast.ts   #   トースト通知 / 提示通知
│   ├── useConfirm.ts #   確認ダイアログ / 确认对话框
│   ├── useFeatureFlag.ts  # フィーチャーフラグ / 功能开关
│   ├── useFormValidation.ts # バリデーション / 表单验证
│   └── ...
├── i18n/             # 翻訳ファイル / 翻译文件
├── layouts/          # ページレイアウト (WmsLayout) / 页面布局
├── router/           # Vue Router 設定 / 路由配置
├── stores/           # Pinia ストア / 状态仓库
│   ├── auth.ts       #   認証 composable / 认证组合式
│   ├── settings.ts   #   システム設定 / 系统设置
│   ├── warehouse.ts  #   倉庫選択 / 仓库选择
│   ├── shipmentOrderDraft.ts # 出荷下書き / 出货草稿
│   └── wms/          #   WMS コアストア / WMS 核心 store
│       ├── useWmsUserStore.ts  # ユーザー/認証 / 用户/认证
│       └── useWmsConfigStore.ts # WMS 設定 / WMS 配置
├── types/            # TypeScript 型定義 / 类型定义
└── views/            # ページコンポーネント / 页面组件
    ├── inbound/      #   入庫 / 入库
    ├── shipment/     #   出荷 / 出货
    ├── inventory/    #   在庫 / 库存
    └── ...
```

### 命名規則 / 命名规则

- **ページ**: `XxxList.vue`, `XxxDetail.vue`, `XxxCreate.vue` / 页面命名规则
- **コンポーネント**: PascalCase (`OButton.vue`, `DataTable.vue`) / 组件使用 PascalCase
- **composable**: `useXxx.ts` (例: `useToast`, `useI18n`) / 组合式函数以 use 开头
- **ストア**: `useXxxStore.ts` (例: `useWmsUserStore`) / Store 以 useXxxStore 命名

---

## 4. ルーティング設計 / 路由设计

### メインメニュー構成 (9 項目、118 遅延ロードルート) / 主菜单结构 (9 项, 118 个懒加载路由)

| # | メニュー / 菜单 | パス / 路径 | サブタブ数 / 子标签数 |
|---|---|---|---|
| 1 | 商品管理 | `/products` | 5 (一覧, バーコード, 耗材, セット組, 出荷統計) |
| 2 | 入庫管理 | `/inbound` | 9 (ダッシュボード, 指示一覧, 作成, CSV, 履歴...) |
| 3 | 在庫管理 | `/inventory` | 12 (在庫一覧, 調整, 移動, 履歴, ロット...) |
| 4 | 出荷管理 | `/shipment` | 12 (指示作成, 作業一覧, 検品, ピッキング, FBA, RSL...) |
| 5 | 返品管理 | `/returns` | 4 (ダッシュボード, 一覧, 作成, 請求) |
| 6 | 棚卸管理 | `/stocktaking` | 2 (一覧, 作成) |
| 7 | 日次管理 | `/daily` | 3 (レポート, 出荷統計, 業績) |
| 8 | 請求管理 | `/billing` | 4 (ダッシュボード, 月次, チャージ, 保管料) |
| 9 | 設定 | `/settings` | 30+ (6 グループ: 基本, 出荷, マスタ, テンプレート, 拡張, 管理) |

### ルーティングの特徴 / 路由特点

```
/ (WmsLayout)
├── /home              — Welcome ダッシュボード / 欢迎面板
├── /products/list     — 商品一覧 (lazy) / 商品列表
├── /inbound/orders    — 入庫指示一覧 (lazy) / 入库指示列表
├── /shipment/...      — 出荷系ページ (lazy) / 出货系页面
├── /settings/...      — 設定ページ群 (lazy) / 设置页面组
└── ...

/login                 — ログイン (layout 外) / 登录 (布局外)
/inbound/print/...     — 印刷専用ページ (layout 外) / 打印专用页面 (布局外)
```

- **遅延ロード (Lazy Loading)**: ログインと Welcome 以外は `() => import(...)` で動的インポート。
  除登录和 Welcome 外均使用动态导入实现懒加载。
- **メタ情報**: `meta.requiresAuth`, `meta.title`, `meta.parentRoute` でガード/タイトル/ナビゲーション制御。
  通过 meta 字段控制认证守卫、页面标题、导航高亮。
- **印刷ページ**: レイアウト外に配置（ナビバーなし、印刷最適化）。
  打印页面放在布局外（无导航栏，打印优化）。
- **設定サイドバー**: `/settings` 以下は `WmsSettingsSidebar` で 6 グループに分類表示。
  设置页面通过侧边栏分 6 组展示。

### ナビゲーションガード / 导航守卫

```typescript
router.beforeEach((to) => {
  const { isAuthenticated } = useAuth()
  if (to.meta.requiresAuth !== false && !isAuthenticated.value) {
    return { name: 'Login' }
  }
})
```

- デフォルトで認証必須 / 默认需要认证
- `meta.requiresAuth: false` で認証不要ページを明示 / 通过 meta 标记无需认证的页面

---

## 5. 状態管理 / 状态管理

### Pinia ストア一覧 / Store 列表

| ストア / Store | ファイル / 文件 | 責務 / 职责 |
|---|---|---|
| `useWmsUserStore` | `stores/wms/useWmsUserStore.ts` | ユーザー情報, JWT トークン, ロール, 権限 |
| `useWmsConfigStore` | `stores/wms/useWmsConfigStore.ts` | WMS システム設定, フィーチャーフラグ |
| `useAuth` (composable) | `stores/auth.ts` | `useWmsUserStore` の薄いラッパー。ルーターガード等から利用 |
| `settings` | `stores/settings.ts` | テナント単位のシステム設定 |
| `warehouse` | `stores/warehouse.ts` | 現在選択中の倉庫 ID |
| `shipmentOrderDraft` | `stores/shipmentOrderDraft.ts` | 出荷指示の下書き状態管理 |

### 認証状態の管理フロー / 认证状态管理流程

```
ログイン成功
  → JWT トークン取得
  → useWmsUserStore.$patch({ token, currentUser, isAuthenticated: true })
  → localStorage に永続化 (wms_token, wms_current_user)

ページリロード
  → localStorage から復元
  → store に再注入

ログアウト / トークン期限切れ
  → store.logout()
  → localStorage クリア
  → /login にリダイレクト
```

### ロール定義 / 角色定义

```typescript
type UserRole = 'super_admin' | 'admin' | 'operator' | 'viewer' | 'client'
```

- `super_admin`: 全テナント管理 / 全租户管理
- `admin`: テナント内全権限 / 租户内全权限
- `operator`: 倉庫オペレーション / 仓库操作
- `viewer`: 閲覧のみ / 仅查看
- `client`: 荷主ポータル / 货主门户

---

## 6. API 通信層 / API 通信层

### デュアルパターン / 双模式

ZELIXWMS は **2 つの HTTP 通信パターン** を提供する。
ZELIXWMS 提供 **2 种 HTTP 通信模式**。

#### パターン 1: `HttpClient` クラス (推奨) / 推荐模式

```typescript
import { http } from '@/api/http'

// GET
const data = await http.get<Product[]>('/products', { page: '1' })

// POST
const created = await http.post<Product>('/products', { name: '商品A' })

// ファイルダウンロード / 文件下载
const blob = await http.download('/reports/export', { month: '2026-03' })

// ファイルアップロード / 文件上传
const result = await http.upload<ImportResult>('/import/csv', formData)
```

- シングルトン Proxy パターン: 初回アクセス時に `new HttpClient(getApiBaseUrl())` を生成。
  单例 Proxy 模式：首次访问时创建实例。
- 自動認証ヘッダー付与 (`Bearer <token>`) / 自动附加认证头
- 倉庫セレクター値を `X-Warehouse-Id` ヘッダーに自動付与 / 自动附加仓库选择头
- 401 時に自動ログアウト + リダイレクト / 401 时自动登出并跳转

#### パターン 2: `apiFetch` 関数 (レガシー互換) / 兼容模式

```typescript
import { apiFetch } from '@/api/base'

const res = await apiFetch(`${getApiBaseUrl()}/products`, {
  method: 'POST',
  body: JSON.stringify(payload),
})
const data = await res.json()
```

- `fetch()` のドロップイン置換 / fetch() 的直接替代品
- 既存コードを最小変更で移行可能 / 对现有代码的最小侵入迁移
- `HttpClient` と同じ自動認証 + 自動ログアウト機能を持つ / 具有相同的自动认证和登出功能

#### API ベース URL 解決 / API Base URL 解析

```
優先順位 / 优先级:
1. VITE_API_BASE_URL (完全 URL)    → https://api.example.com/api
2. VITE_BACKEND_ORIGIN + VITE_BACKEND_API_PREFIX
3. デフォルト: http://localhost:4000/api
```

---

## 7. コンポーネント設計 / 组件设计

### Odoo 風コンポーネント (`components/odoo/`) / Odoo 风格组件

ZELIXWMS の UI は **Odoo ERP** の設計言語にインスパイアされている。
ZELIXWMS 的 UI 设计灵感来自 **Odoo ERP** 的设计语言。

| コンポーネント / 组件 | 用途 / 用途 |
|---|---|
| `ControlPanel` | ページ上部の検索バー + アクションボタン群。全一覧ページで使用 |
| `OButton` | 統一ボタン。type/variant/size/loading 等をサポート |
| `DataTable` | データテーブル。ソート, ページング, 行選択, 一括操作 |
| `ODialog` | モーダルダイアログ。フォーム表示やプレビューに使用 |
| `OPager` | ページネーション。DataTable と連携 |
| `OStatusbar` | ステータスバー (ドラフト → 確定 → 完了 等の進行表示) |
| `OToast` / `OToastManager` | トースト通知。成功/エラー/警告 |
| `OBarcodeListener` | バーコードスキャナ入力の自動検知 |
| `OBatchActionBar` | 一括操作バー（選択中の件数 + アクションボタン）|
| `OImportWizard` | CSV/ファイル取込ウィザード |
| `SearchPanel` | 検索パネル（フィルタ条件の構築）|
| `StatCard` | ダッシュボード用統計カード |
| `Badge` | ステータスバッジ |
| `OEmptyState` | データなし時の表示 |
| `OConfirmOverlay` | インライン確認オーバーレイ |
| `OFileUploader` | ファイルアップロード |
| `ODatePicker` / `ODateRangePicker` | 日付選択 |

### レイアウトコンポーネント / 布局组件

| コンポーネント / 组件 | 用途 / 用途 |
|---|---|
| `WmsNavbar` | トップナビゲーションバー（メニュー 9 項目）|
| `WmsSubNav` | サブナビゲーション（各セクションのタブ）|
| `WmsSettingsSidebar` | 設定ページ用サイドバー（6 グループ）|
| `CommandPalette` | コマンドパレット（Ctrl+K でクイックナビ）|
| `NotificationBell` | 通知ベル |
| `TopbarMenu` | ユーザーメニュー（プロフィール, ログアウト）|

---

## 8. i18n（多言語対応）/ 国际化

### カスタム `useI18n` composable / 自定义 useI18n 组合式函数

ZELIXWMS は `vue-i18n` ライブラリを使用せず、**独自の `useI18n` composable** を実装している。
ZELIXWMS 不使用 vue-i18n 库，而是实现了**自定义的 useI18n 组合式函数**。

```typescript
type Locale = 'en' | 'zh' | 'ja'  // 英語, 中国語, 日本語
const DEFAULT_LOCALE: Locale = 'ja'
const STORAGE_KEY = 'wms_locale'
```

- **3 言語対応**: 日本語 (ja, デフォルト), 英語 (en), 中国語 (zh)
  支持 3 种语言：日语（默认）、英语、中文
- **localStorage 永続化**: `wms_locale` キーで言語選択を保存
  通过 localStorage 持久化语言偏好
- **ネストキー対応**: `t('inbound.status.pending')` のようにドット区切りでアクセス
  支持嵌套键，通过点分隔符访问
- **翻訳ファイル**: `frontend/src/i18n/` にロケール別 JSON/TS ファイル
  翻译文件位于 `frontend/src/i18n/`

### portal アプリの i18n / portal 应用的 i18n

`portal/src/i18n/` に独立した翻訳ファイルを持つ（ja.ts, en.ts, zh.ts）。
portal 应用有独立的翻译文件。

---

## 9. テーマ / 主题

### `useTheme` composable

テーマシステムは **CSS 変数ベース** で、`ThemeConfig` オブジェクトからパレットを動的に適用する。
主题系统基于 **CSS 变量**，从 `ThemeConfig` 对象动态应用配色方案。

```typescript
// CSS 変数の例 / CSS 变量示例
--o-color-1 (alpha)    // プライマリカラー / 主色
--o-color-2 (beta)     // セカンダリカラー / 辅色
--o-color-3 (gamma)    // アクセントカラー / 强调色
--o-color-4 (delta)    // 背景カラー / 背景色
```

- **パレット切替**: `switchPalette(name)` で実行時にテーマ変更可能
  通过 `switchPalette()` 实现运行时主题切换
- **タイポグラフィ**: `applyTypography(theme)` でフォント設定を適用
  通过 `applyTypography()` 应用字体设置
- **ボタンスタイル**: `applyButtons(theme)` でボタンデザインを統一
  通过 `applyButtons()` 统一按钮样式
- **`useThemeCustomizer`**: テーマカスタマイズ UI 用の composable
  用于主题定制器 UI 的组合式函数

---

## 10. 共通パターン / 通用模式

### パターン 1: フォーム → バリデーション → 送信 → トースト → リダイレクト
### 模式 1: 表单 → 验证 → 提交 → 提示 → 跳转

```typescript
// 典型的なフォーム送信パターン / 典型的表单提交模式
async function handleSubmit() {
  // 1. バリデーション / 验证
  if (!validate(formData)) return

  try {
    // 2. API 呼び出し / API 调用
    await http.post('/inbound/orders', formData)

    // 3. 成功トースト / 成功提示
    toast.success('入庫指示を作成しました')

    // 4. リダイレクト / 跳转
    router.push('/inbound/orders')
  } catch (err) {
    // 5. エラーハンドリング / 错误处理
    toast.error(err instanceof HttpError ? err.message : '保存に失敗しました')
  }
}
```

### パターン 2: 一覧ページの構成 / 模式 2: 列表页结构

```vue
<template>
  <!-- ControlPanel: 検索 + アクションボタン / 搜索 + 操作按钮 -->
  <ControlPanel>
    <SearchForm v-model="filters" @search="fetchData" />
    <OButton @click="create">新規作成</OButton>
  </ControlPanel>

  <!-- DataTable: データ表示 / 数据展示 -->
  <DataTable :data="items" :columns="columns" :loading="loading">
    <template #actions="{ row }">
      <OButton size="small" @click="edit(row)">編集</OButton>
    </template>
  </DataTable>

  <!-- OPager: ページネーション / 分页 -->
  <OPager :total="total" v-model:page="page" @change="fetchData" />
</template>
```

### パターン 3: composable による関心の分離 / 模式 3: 通过 composable 分离关注点

```typescript
// useFormValidation — フォームバリデーション / 表单验证
const { validate, errors } = useFormValidation(rules)

// useConfirm — 確認ダイアログ / 确认对话框
const { confirm } = useConfirm()
await confirm('削除してもよろしいですか？')

// useToast — トースト通知 / 提示通知
const toast = useToast()
toast.success('保存しました')

// useFeatureFlag — フィーチャーフラグ / 功能开关
const { isEnabled } = useFeatureFlag('new-inspection-ui')

// useUnsavedChanges — 未保存変更の検知 / 未保存变更检测
useUnsavedChanges(isDirty)
```

### パターン 4: バーコードスキャン統合 / 模式 4: 条码扫描集成

```vue
<OBarcodeListener @scan="handleBarcodeScan" />
```

- バーコードスキャナのキーボード入力を自動検知 / 自动检测条码扫描器的键盘输入
- 検品・入庫・ピッキング等の画面で利用 / 在检品、入库、拣货等画面中使用

### パターン 5: 印刷フロー / 模式 5: 打印流程

```
印刷ボタン → PrintPreviewDialog → window.print() or PDF ダウンロード
打印按钮   → 打印预览对话框      → window.print() 或 PDF 下载
```

- 印刷専用ページは WmsLayout 外に配置 / 打印专用页面在布局外
- `useAutoPrint` composable で自動印刷をサポート / 通过 composable 支持自动打印

---

## 11. 移行対応（API 互換性）/ 迁移兼容性

### ObjectId → UUID 変換 / ObjectId → UUID 转换

NestJS + PostgreSQL 移行に伴い、ID 形式が変更される。
伴随 NestJS + PostgreSQL 迁移，ID 格式发生变化。

| 項目 / 项目 | 移行前 / 迁移前 | 移行後 / 迁移后 |
|---|---|---|
| ID 形式 | MongoDB ObjectId (`507f1f77bcf86cd799439011`) | UUID v4 (`550e8400-e29b-41d4-a716-446655440000`) |
| ID フィールド名 | `_id` | `id` |
| レスポンス形式 | そのまま / 原样 | `{ success, data, error }` エンベロープ / 响应封套 |

### フロントエンドの対応 / 前端适配

- `_id` → `id` のフィールド名変更に対応 / 适配字段名从 `_id` 到 `id`
- Element Plus tree-shaking: `unplugin-vue-components` + `unplugin-auto-import` で自動インポート最適化
  Element Plus 摇树优化：通过 unplugin 自动导入优化
- 重量コンポーネント（Konva, pdf-lib）は動的インポート / 重型组件使用动态导入
  Heavy components (Konva, pdf-lib) use dynamic import

---

## 付録: admin / portal アプリの構成 / 附录: admin/portal 应用结构

### admin アプリ / admin 应用

```
admin/src/
├── api/http.ts        # 共有 HTTP クライアント / 共享 HTTP 客户端
├── layouts/AdminLayout.vue
├── router/index.ts
└── views/
    ├── DashboardPage.vue
    ├── LoginPage.vue
    ├── clients/       # 荷主管理 / 货主管理
    ├── orders/        # 受注管理 / 订单管理
    ├── kpi/           # KPI ダッシュボード
    └── pricing/       # 料金設定 / 定价设置
```

### portal アプリ / portal 应用

```
portal/src/
├── api/               # portal 専用 API (billing, product, passthrough 等)
├── i18n/              # 独立翻訳ファイル / 独立翻译文件
├── layouts/PortalLayout.vue
├── modules/           # 機能モジュール / 功能模块
│   ├── auth/          #   認証 (Login, Dashboard) / 认证
│   ├── inbound/       #   入庫 (一覧, 詳細, 作成) / 入库
│   ├── outbound/      #   出庫申請 / 出库申请
│   ├── billing/       #   請求確認 / 账单确认
│   ├── products/      #   商品照会 / 商品查询
│   └── settings/      #   設定 / 设置
├── router/index.ts
└── stores/auth.ts
```

portal は **モジュール構成** (`modules/`) を採用し、機能単位でページ・API・型をグループ化している。
portal 采用**模块化结构** (`modules/`)，按功能单元组织页面、API 和类型。
