import path from 'path';
import { config } from 'dotenv';

let isLoaded = false;

export type AppEnv = {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  host: string;
  mongoUri: string;
  mongoDb: string;
  fileBucket: string;
  fileDir: string;
  /** External Yamato sort-code calculator service base URL */
  yamatoCalcBaseUrl: string;
};

export const loadEnv = (): AppEnv => {
  if (!isLoaded) {
    const envPath = path.resolve(process.cwd(), '.env');
    config({ path: envPath, override: false });
    isLoaded = true;
  }

  return {
    nodeEnv: (process.env.NODE_ENV as AppEnv['nodeEnv']) ?? 'development',
    port: Number(process.env.PORT) || 4000,
    host: process.env.HOST ?? 'localhost',
    mongoUri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/nexand-shipment',
    mongoDb: process.env.MONGODB_DB ?? 'nexand-shipment',
    fileBucket: process.env.FILE_STORAGE_BUCKET ?? 'local',
    fileDir: process.env.FILE_STORAGE_DIR ?? path.resolve(process.cwd(), 'tmp', 'uploads'),
    yamatoCalcBaseUrl: process.env.YAMATO_CALC_BASE_URL ?? 'https://yamato-calc.nexand.org',
  };
};

