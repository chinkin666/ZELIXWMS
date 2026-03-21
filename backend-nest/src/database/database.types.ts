// データベース型定義 / 数据库类型定义
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

// DrizzleDB 型 / DrizzleDB类型
export type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;
