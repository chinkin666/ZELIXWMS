/**
 * 全移行スクリプト実行 / 执行全部迁移脚本
 *
 * MongoDB → PostgreSQL (Supabase) の全テーブルを順序通り移行する。
 * 按顺序将所有表从 MongoDB 迁移到 PostgreSQL (Supabase)。
 *
 * Usage / 使用方法:
 *   npx ts-node scripts/migrate/run-all.ts
 *
 * Environment Variables / 環境変数:
 *   MONGO_URI       - MongoDB 接続 URI / MongoDB 连接 URI
 *   DATABASE_URL    - PostgreSQL 接続 URL / PostgreSQL 连接 URL
 *   BATCH_SIZE      - バッチサイズ（デフォルト: 500）/ 批量大小（默认: 500）
 *   SKIP_STEPS      - スキップするステップ番号（カンマ区切り）/ 跳过的步骤号（逗号分隔）
 *                     例: SKIP_STEPS=01,02 で tenants と users をスキップ
 */

import { MongoClient, Db } from 'mongodb';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
// @ts-expect-error pg 未安装为 devDep，运行时需单独安装 / pg未安装为devDep，运行时需单独安装
import { Pool } from 'pg';

// 移行関数のインポート / 导入迁移函数
import { migrateTenants } from './01-tenants';
import { migrateUsers } from './02-users';
import { migrateProducts } from './03-products';
import { migrateWarehousesAndLocations } from './04-warehouses-locations';
import { migrateAllClients } from './05-clients';
import { migrateAllOrders } from './06-orders';
import { migrateAllInventory } from './07-inventory';
import { migrateAllBilling } from './08-billing';

/**
 * 移行ステップ定義 / 迁移步骤定义
 */
const MIGRATION_STEPS = [
  { id: '01', name: 'Tenants / テナント / 租户', fn: migrateTenants },
  { id: '02', name: 'Users / ユーザー / 用户', fn: migrateUsers },
  { id: '03', name: 'Products / 商品 / 商品', fn: migrateProducts },
  { id: '04', name: 'Warehouses & Locations / 倉庫・ロケーション / 仓库・库位', fn: migrateWarehousesAndLocations },
  { id: '05', name: 'Clients / 顧客関連 / 客户相关', fn: migrateAllClients },
  { id: '06', name: 'Orders / 注文 / 订单', fn: migrateAllOrders },
  { id: '07', name: 'Inventory / 在庫 / 库存', fn: migrateAllInventory },
  { id: '08', name: 'Billing / 請求 / 请求', fn: migrateAllBilling },
] as const;

/**
 * メイン実行関数 / 主执行函数
 */
async function main(): Promise<void> {
  const startTime = Date.now();

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  ZELIX WMS - MongoDB → PostgreSQL Data Migration           ║');
  console.log('║  データ移行 ETL / 数据迁移 ETL                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log();

  // 環境変数チェック / 检查环境变量
  const mongoUri = process.env.MONGO_URI;
  const databaseUrl = process.env.DATABASE_URL;

  if (!mongoUri) {
    console.error('ERROR: MONGO_URI environment variable is required');
    process.exit(1);
  }
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL environment variable is required');
    process.exit(1);
  }

  // スキップ設定 / 跳过设置
  const skipSteps = new Set(
    (process.env.SKIP_STEPS || '').split(',').map((s) => s.trim()).filter(Boolean),
  );
  if (skipSteps.size > 0) {
    console.log(`Skipping steps: ${[...skipSteps].join(', ')}`);
  }

  // MongoDB 接続 / 连接 MongoDB
  console.log('\nConnecting to MongoDB...');
  const mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();
  const mongoDb: Db = mongoClient.db();
  console.log('  MongoDB connected');

  // PostgreSQL 接続 / 连接 PostgreSQL
  console.log('Connecting to PostgreSQL...');
  const pool = new Pool({ connectionString: databaseUrl });
  const pgDb: NodePgDatabase = drizzle(pool);
  console.log('  PostgreSQL connected');

  // 移行ステップの実行 / 执行迁移步骤
  console.log('\n--- Starting migration ---\n');

  const results: Array<{ step: string; status: string; duration: number }> = [];

  for (const step of MIGRATION_STEPS) {
    if (skipSteps.has(step.id)) {
      console.log(`\n[SKIP] ${step.id} - ${step.name}`);
      results.push({ step: step.name, status: 'skipped', duration: 0 });
      continue;
    }

    const stepStart = Date.now();
    try {
      await step.fn(mongoDb, pgDb);
      const duration = Date.now() - stepStart;
      results.push({ step: step.name, status: 'success', duration });
    } catch (err) {
      const duration = Date.now() - stepStart;
      results.push({ step: step.name, status: 'FAILED', duration });
      console.error(`\n[ERROR] Step ${step.id} failed:`, err);
      // 継続するかどうかの判断は環境変数で制御可能にする / 是否继续可以通过环境变量控制
      if (process.env.STOP_ON_ERROR === 'true') {
        console.error('STOP_ON_ERROR=true: aborting migration');
        break;
      }
      console.log('Continuing to next step...');
    }
  }

  // サマリー出力 / 输出汇总
  const totalDuration = Date.now() - startTime;

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Migration Summary / 移行サマリー / 迁移汇总               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log();

  for (const r of results) {
    const statusIcon = r.status === 'success' ? 'OK' : r.status === 'skipped' ? '--' : 'NG';
    const durationStr = r.duration > 0 ? `${(r.duration / 1000).toFixed(1)}s` : '-';
    console.log(`  [${statusIcon}] ${r.step} (${durationStr})`);
  }

  console.log(`\n  Total time: ${(totalDuration / 1000).toFixed(1)}s`);
  console.log(`  Steps: ${results.filter((r) => r.status === 'success').length} success, ` +
    `${results.filter((r) => r.status === 'FAILED').length} failed, ` +
    `${results.filter((r) => r.status === 'skipped').length} skipped`);

  // クリーンアップ / 清理
  await mongoClient.close();
  await pool.end();

  const hasFailed = results.some((r) => r.status === 'FAILED');
  process.exit(hasFailed ? 1 : 0);
}

// 実行 / 执行
main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
