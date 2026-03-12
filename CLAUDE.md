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
