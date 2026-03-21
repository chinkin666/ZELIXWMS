# 发布流程 / リリースプロセス

> 标准发布 SOP 与紧急修复流程
> 標準リリース SOP とホットフィックスフロー

---

## 1. 版本号规范 / バージョン番号規則

遵循语义版本控制 (SemVer)。
セマンティックバージョニング (SemVer) に従う。

```
MAJOR.MINOR.PATCH
  │      │     └── Bug修复、小改动 / バグ修正、小さな変更
  │      └──────── 新功能（向后兼容）/ 新機能（後方互換）
  └─────────────── 破坏性变更 / 破壊的変更
```

**示例 / 例**:
- `1.0.0` → `1.0.1`: 修复产品列表排序 bug / 商品一覧ソートバグ修正
- `1.0.1` → `1.1.0`: 添加CSV导出功能 / CSVエクスポート機能追加
- `1.1.0` → `2.0.0`: API v2 不兼容变更 / API v2 非互換変更

---

## 2. 分支策略 / ブランチ戦略

```
main (生产 / 本番)
  ├── develop (开发 / 開発)
  │     ├── feat/xxx
  │     ├── fix/xxx
  │     └── refactor/xxx
  ├── release/vX.Y.Z (发布分支 / リリースブランチ)
  └── hotfix/xxx (紧急修复 / ホットフィックス)
```

---

## 3. 标准发布流程 / 標準リリースフロー

### Step 1: 创建发布分支 / リリースブランチを作成

```bash
# 从 develop 创建发布分支 / develop からリリースブランチを作成
git checkout develop
git pull origin develop
git checkout -b release/v1.2.0
```

### Step 2: 更新版本号 / バージョン番号を更新

```bash
# 更新 package.json 中的版本号 / package.json のバージョン番号を更新
npm version 1.2.0 --no-git-tag-version

# 更新所有子项目的版本（如有）/ 全サブプロジェクトのバージョンを更新（ある場合）
```

### Step 3: 运行完整测试 / フルテストスイートを実行

```bash
# 全部测试 / 全テスト
npm run test

# 确认覆盖率 / カバレッジを確認
npm run test:coverage
# 要求 ≥ 80%

# E2E 测试 / E2E テスト
npm run test:e2e
```

### Step 4: 构建所有应用 / 全アプリケーションをビルド

```bash
# 后端构建 / バックエンドビルド
npm run build --workspace=backend-nestjs

# 前端构建 / フロントエンドビルド
npm run build --workspace=frontend

# 确认构建无错误 / ビルドにエラーがないことを確認
```

### Step 5: 创建 GitHub Release / GitHub Release を作成

```bash
# 合并到 main / main にマージ
git checkout main
git merge --no-ff release/v1.2.0

# 打标签 / タグを作成
git tag -a v1.2.0 -m "Release v1.2.0: 功能描述 / 機能説明"
git push origin main --tags

# 创建 GitHub Release（含 changelog）/ GitHub Release を作成（changelog 付き）
gh release create v1.2.0 \
  --title "v1.2.0" \
  --notes "$(cat <<'EOF'
## 变更内容 / 変更内容

### 新功能 / 新機能
- 功能A / 機能A

### Bug修复 / バグ修正
- 修复xxx / xxx を修正

### 其他 / その他
- 依赖更新 / 依存関係更新
EOF
)"

# 合并回 develop / develop にマージバック
git checkout develop
git merge --no-ff release/v1.2.0
git push origin develop

# 删除发布分支 / リリースブランチを削除
git branch -d release/v1.2.0
```

### Step 6: 部署到 Staging / Staging にデプロイ

```bash
# CI/CD 自动部署到 staging / CI/CD が自動的に staging にデプロイ
# 或手动触发 / または手動トリガー
gh workflow run deploy-staging.yml --ref v1.2.0
```

### Step 7: Staging 冒烟测试 / Staging スモークテスト

在 staging 环境验证以下关键路径。
Staging 環境で以下のクリティカルパスを検証。

- [ ] 登录/登出 / ログイン/ログアウト
- [ ] 产品 CRUD / 商品 CRUD
- [ ] 入库流程 / 入庫フロー
- [ ] 出库流程 / 出庫フロー
- [ ] B2 Cloud 连携 / B2 Cloud 連携
- [ ] CSV 导入/导出 / CSV インポート/エクスポート
- [ ] 多租户数据隔离 / マルチテナントデータ分離

### Step 8: 部署到生产 / 本番にデプロイ

```bash
# 确认 staging 测试通过后 / staging テスト通過を確認後
gh workflow run deploy-production.yml --ref v1.2.0
```

### Step 9: 验证健康检查 / ヘルスチェックを検証

```bash
curl https://api.zelixwms.com/api/health
# {"status":"ok","version":"1.2.0","db":"connected","redis":"connected"}
```

### Step 10: 监控 30 分钟 / 30 分間モニタリング

- 关注错误率 / エラー率に注目
- 关注响应时间 / レスポンスタイムに注目
- 关注 Sentry 新错误 / Sentry の新規エラーに注目
- 准备好回滚方案 / ロールバック方案を準備

---

## 4. 紧急修复流程 / ホットフィックスフロー

用于修复生产环境的严重 bug。
本番環境の重大バグ修正に使用。

```bash
# 1. 从 main 创建 hotfix 分支 / main から hotfix ブランチを作成
git checkout main
git checkout -b hotfix/fix-description

# 2. 修复并测试 / 修正してテスト
# ... 最小化修改 / 最小限の変更 ...
npm run test

# 3. 更新版本号 (patch) / バージョン番号更新 (patch)
npm version patch --no-git-tag-version

# 4. 合并到 main 并部署 / main にマージしてデプロイ
git checkout main
git merge --no-ff hotfix/fix-description
git tag -a v1.2.1 -m "Hotfix: 修复描述 / 修正説明"
git push origin main --tags

# 5. 合并回 develop / develop にマージバック
git checkout develop
git merge --no-ff hotfix/fix-description
git push origin develop

# 6. 删除 hotfix 分支 / hotfix ブランチを削除
git branch -d hotfix/fix-description
```

---

## 5. 回滚流程 / ロールバックフロー

当生产部署出现严重问题时执行。
本番デプロイで深刻な問題が発生した場合に実行。

```bash
# 方法1: Docker 镜像回滚 / Docker イメージロールバック
# 回滚到前一版本的镜像 / 前バージョンのイメージにロールバック
docker pull zelixwms/api:v1.1.0
docker compose up -d

# 方法2: Git revert / Git revert
git revert HEAD
git push origin main
# CI/CD 会自动重新部署 / CI/CD が自動的に再デプロイ

# 方法3: 数据库回滚（如有 schema 变更）/ データベースロールバック（スキーマ変更がある場合）
npm run db:rollback
```

**回滚后 / ロールバック後**:
1. 验证健康检查 / ヘルスチェックを検証
2. 通知团队 / チームに通知
3. 分析失败原因 / 失敗原因を分析
4. 记录到 devlog / devlog に記録
