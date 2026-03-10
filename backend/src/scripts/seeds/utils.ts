import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';

type MongoOid = { $oid: string };
type MongoDate = { $date: string | number | { $numberLong: string } };
type MongoNumberInt = { $numberInt: string };
type MongoNumberLong = { $numberLong: string };
type MongoNumberDouble = { $numberDouble: string };

type MongoExtJson = MongoOid | MongoDate | MongoNumberInt | MongoNumberLong | MongoNumberDouble;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function reviveMongoExtendedJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(reviveMongoExtendedJson);
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const maybe = value as Partial<MongoExtJson> & Record<string, unknown>;

  // MongoDB Extended JSON: ObjectId
  if (typeof maybe.$oid === 'string') {
    return new mongoose.Types.ObjectId(maybe.$oid);
  }

  // MongoDB Extended JSON: Date
  if (maybe.$date !== undefined) {
    const d = (maybe as MongoDate).$date;
    if (typeof d === 'string' || typeof d === 'number') {
      return new Date(d);
    }
    if (isPlainObject(d) && typeof (d as any).$numberLong === 'string') {
      return new Date(Number((d as any).$numberLong));
    }
  }

  // Numeric wrappers (rare, but safe to support)
  if (typeof (maybe as any).$numberInt === 'string') {
    return Number((maybe as any).$numberInt);
  }
  if (typeof (maybe as any).$numberLong === 'string') {
    return Number((maybe as any).$numberLong);
  }
  if (typeof (maybe as any).$numberDouble === 'string') {
    return Number((maybe as any).$numberDouble);
  }

  // Generic object: recursively revive children
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = reviveMongoExtendedJson(v);
  }
  return out;
}

export async function loadSeedJsonArray<T = any>(filename: string): Promise<T[]> {
  // __dirname: backend/src/scripts/seeds
  const filePath = path.resolve(__dirname, '../../..', 'seed_test', filename);
  const raw = await fs.readFile(filePath, 'utf-8');
  const parsed = JSON.parse(raw) as unknown;
  const revived = reviveMongoExtendedJson(parsed);
  if (!Array.isArray(revived)) {
    throw new Error(`Seed file is not an array: ${filePath}`);
  }
  return revived as T[];
}


