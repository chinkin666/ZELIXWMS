/**
 * 客户模型迁移脚本 / 顧客モデルマイグレーションスクリプト
 *
 * 功能 / 機能:
 * 1. 给现有 Client 数据补充 tenantId（默认 'default'）
 *    既存 Client データに tenantId を追加（デフォルト 'default'）
 * 2. 给现有 Client 数据补充新字段默认值
 *    既存 Client データに新フィールドのデフォルト値を設定
 * 3. 删除旧的 clientCode 单字段唯一索引（改为 tenantId+clientCode 复合索引）
 *    旧 clientCode 単一ユニークインデックスを削除（tenantId+clientCode 複合インデックスに変更）
 *
 * 使用方法 / 使用方法:
 *   node scripts/migrate-client-model.js
 *
 * 安全说明: 此脚本幂等，可重复执行
 * 安全説明: 本スクリプトは冪等、繰り返し実行可能
 */

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/wms';
const DEFAULT_TENANT_ID = 'default';

async function migrate() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db();
    console.log('Connected to MongoDB / MongoDB に接続しました');

    // --- 1. Client collection ---
    const clientsCol = db.collection('clients');

    // 1a. 补充 tenantId / tenantId を追加
    const tenantResult = await clientsCol.updateMany(
      { tenantId: { $exists: false } },
      { $set: { tenantId: DEFAULT_TENANT_ID } },
    );
    console.log(`[clients] Added tenantId to ${tenantResult.modifiedCount} documents`);

    // 1b. 补充新字段默认值 / 新フィールドのデフォルト値を設定
    const defaultsResult = await clientsCol.updateMany(
      { creditTier: { $exists: false } },
      {
        $set: {
          creditTier: 'new',
          creditLimit: 100000,
          currentBalance: 0,
          paymentTermDays: 30,
          portalEnabled: false,
          portalLanguage: 'ja',
        },
      },
    );
    console.log(`[clients] Set defaults for ${defaultsResult.modifiedCount} documents`);

    // 1c. 删除旧的 clientCode 单字段唯一索引 / 旧単一ユニークインデックスを削除
    try {
      const indexes = await clientsCol.indexes();
      const oldIndex = indexes.find(
        (idx) => idx.unique && idx.key && idx.key.clientCode === 1 && !idx.key.tenantId,
      );
      if (oldIndex) {
        await clientsCol.dropIndex(oldIndex.name);
        console.log(`[clients] Dropped old unique index: ${oldIndex.name}`);
      } else {
        console.log('[clients] No old clientCode unique index to drop');
      }
    } catch (e) {
      console.log(`[clients] Index drop skipped: ${e.message}`);
    }

    // --- 2. WorkCharge collection ---
    const workChargesCol = db.collection('work_charges');
    const wcResult = await workChargesCol.updateMany(
      { subClientId: { $exists: false } },
      {
        $set: {
          subClientId: null,
          subClientName: null,
          shopId: null,
          shopName: null,
        },
      },
    );
    console.log(`[work_charges] Added subClientId/shopId to ${wcResult.modifiedCount} documents`);

    console.log('\nMigration completed successfully / マイグレーション完了');
  } catch (error) {
    console.error('Migration failed / マイグレーション失敗:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

migrate();
