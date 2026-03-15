/**
 * データベースエクスポートスクリプト / 数据库导出脚本
 * 全コレクションをJSONファイルに書き出す
 * 将所有集合导出为JSON文件
 */
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const DB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nexand-shipment';
const OUT_DIR = path.resolve(__dirname, '../../database');

async function main() {
  await mongoose.connect(DB_URI);
  const db = mongoose.connection;

  // 出力先ディレクトリ作成 / 创建输出目录
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const collections = await db.db.listCollections().toArray();
  const sorted = collections.map(c => c.name).sort();

  console.log(`Exporting ${sorted.length} collections to ${OUT_DIR}\n`);

  let totalDocs = 0;
  for (const name of sorted) {
    const docs = await db.collection(name).find({}).toArray();
    const filePath = path.join(OUT_DIR, `${name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf-8');
    console.log(`  ${name}: ${docs.length} docs`);
    totalDocs += docs.length;
  }

  console.log(`\nTotal: ${sorted.length} collections, ${totalDocs} documents`);
  console.log(`Output: ${OUT_DIR}`);
  process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
