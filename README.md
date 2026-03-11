# Nexand 出荷管理システム (ZELIXWMS)

## 環境構築

### 必要なもの

- **Node.js** >= 20.x (`node -v` で確認)
- **npm** >= 10.x
- **MongoDB** >= 7.x (Community Edition)

### MongoDB インストール

**Windows:**
1. https://www.mongodb.com/try/download/community からダウンロード
2. インストーラーで「Complete」を選択
3. 「Install MongoDB as a Service」のチェックを**外す**（手動起動するため）
4. `mongod` にパスが通っていることを確認: `mongod --version`

**Mac (Homebrew):**
```bash
brew tap mongodb/brew
brew install mongodb-community
```

### セットアップ手順

```bash
# 1. 依存パッケージをインストール（ルートで実行、backend/frontend両方入る）
npm install

# 2. MongoDB を起動（データはプロジェクト内 local-db/mongo/ に保存される）
npm run db

# 3. 別ターミナルで backend の .env を作成
cd backend
cp env.example .env
cd ..

# 4. 初回のみ: シードデータを投入（配送業者マスタ等）
npm run seed

# 5. バックエンド起動（別ターミナル）
npm run dev:backend

# 6. フロントエンド起動（別ターミナル）
npm run dev:frontend
```

### 起動に必要なターミナル（3つ）

| ターミナル | コマンド | 説明 |
|-----------|---------|------|
| 1 | `npm run db` | MongoDB (port 27017) |
| 2 | `npm run dev:backend` | Backend API (port 4000) |
| 3 | `npm run dev:frontend` | Frontend dev server (port 5173) |

### データベースについて

- データは `local-db/mongo/` ディレクトリに保存されます
- プロジェクトフォルダごとコピーすれば別PCでもそのまま動きます
- MongoDB Compass で接続: `mongodb://localhost:27017/nexand-shipment`

### よく使うコマンド

```bash
npm run db              # MongoDB 起動
npm run dev:backend     # バックエンド起動
npm run dev:frontend    # フロントエンド起動
npm run seed            # シードデータ投入
```

---

## 開発規範

### 現在のフェーズ

**快速開発フェーズ** - 以下のルールに従ってください：

1. **旧バージョンとの互換性は不要** - 既存のデータ構造やAPIとの後方互換性を維持する必要はありません
2. **シンプルな実装を優先** - 将来の拡張性よりも、現在の要件を満たすシンプルな実装を選択してください
3. **レガシーコードの削除OK** - 使用されていない旧構造のコードは積極的に削除してください
