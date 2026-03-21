import mongoose from 'mongoose';
import { loadEnv } from './env';
import { logger } from '@/lib/logger';

let isConnected = false;

/**
 * 连接MongoDB数据库
 */
export const connectDatabase = async (): Promise<void> => {
  if (isConnected) {
    logger.info('Database already connected');
    return;
  }

  const env = loadEnv();

  try {
    // 接続オプション: プール、タイムアウト、リトライ / 连接选项: 连接池、超时、重试
    await mongoose.connect(env.mongoUri, {
      maxPoolSize: Number(process.env.MONGODB_POOL_SIZE) || 10,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
      retryWrites: true,
    });
    isConnected = true;
    logger.info(`MongoDB connected: ${env.mongoUri} (pool: ${Number(process.env.MONGODB_POOL_SIZE) || 10})`);

    mongoose.connection.on('error', (err) => {
      logger.error(err, 'MongoDB connection error');
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
      isConnected = true;
    });
  } catch (error) {
    logger.error(error, 'Failed to connect to MongoDB');
    isConnected = false;
    throw error;
  }
};

/**
 * 断开MongoDB连接
 */
export const disconnectDatabase = async (): Promise<void> => {
  if (!isConnected) {
    return;
  }

  try {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error(error, 'Failed to disconnect from MongoDB');
    throw error;
  }
};

/**
 * 检查数据库连接状态
 */
export const isDatabaseConnected = (): boolean => {
  return isConnected && mongoose.connection.readyState === 1;
};

/**
 * 接続プール統計を取得 / 获取连接池统计
 */
export const getPoolStats = (): { readyState: number; host: string } => {
  return {
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host || 'unknown',
  };
};

/**
 * Check if MongoDB supports transactions (requires replica set)
 */
let transactionsSupported: boolean | null = null;

export const checkTransactionSupport = async (): Promise<boolean> => {
  if (transactionsSupported !== null) {
    return transactionsSupported;
  }

  try {
    const adminDb = mongoose.connection.db?.admin();
    if (!adminDb) {
      transactionsSupported = false;
      return false;
    }

    const serverStatus = await adminDb.serverStatus();
    // Check if running as replica set or mongos
    transactionsSupported = !!(serverStatus.repl || serverStatus.process === 'mongos');

    if (!transactionsSupported) {
      logger.warn('MongoDB is running in standalone mode - transactions are disabled');
    }

    return transactionsSupported;
  } catch {
    transactionsSupported = false;
    logger.warn('Could not determine MongoDB transaction support - transactions disabled');
    return false;
  }
};

export const isTransactionSupported = (): boolean => {
  return transactionsSupported === true;
};










