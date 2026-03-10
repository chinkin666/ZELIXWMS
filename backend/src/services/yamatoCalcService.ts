import { loadEnv } from '@/config/env';
import { logger } from '@/lib/logger';

export type YamatoCalcBatchByPostcodeItem = {
  clientId: string;
  destinationPostalCode: string;
  departureBaseNo: string;
};

type YamatoCalcBatchByPostcodeResult = {
  clientId?: string;
  destinationPostalCode?: string;
  departureBaseNo?: string;
  sortCode?: string | number | null;
  success?: boolean;
  message?: string;
};

const normalizeDigits = (v: any): string => String(v ?? '').replace(/\D/g, '');

/**
 * sortCode: "7桁想定"（例: 0123456）
 * 要件: 「去掉第一个数字的后六位数字string」 => slice(1, 7)
 */
export const deriveYamatoSortCode = (sortCode: any): string | undefined => {
  const raw = normalizeDigits(sortCode);
  if (!raw) return undefined;
  const padded = raw.length >= 7 ? raw : raw.padStart(7, '0');
  const six = padded.slice(1, 7);
  return six.length === 6 ? six : undefined;
};

const pickResultsArray = (json: any): any[] | null => {
  if (!json || typeof json !== 'object') return null;
  const candidates = [json.data, json.results, json.items];
  for (const c of candidates) {
    if (Array.isArray(c)) return c;
    // common: { data: { results: [] } }
    if (c && typeof c === 'object') {
      if (Array.isArray((c as any).results)) return (c as any).results;
      if (Array.isArray((c as any).items)) return (c as any).items;
      if (Array.isArray((c as any).data)) return (c as any).data;
    }
  }
  return null;
};

/**
 * Call external yamato-calc service:
 * POST {baseUrl}/api/calculate/batch/by-postcode
 *
 * Returns a map: clientId -> derived yamatoSortCode(6 digits)
 *
 * Any network/shape failure will be swallowed (log only) to avoid blocking order registration.
 */
export const fetchYamatoSortCodeBatchByPostcode = async (
  items: YamatoCalcBatchByPostcodeItem[],
): Promise<Map<string, string>> => {
  const out = new Map<string, string>();
  if (!Array.isArray(items) || items.length === 0) return out;

  const env = loadEnv();
  const baseUrl = String(env.yamatoCalcBaseUrl || '').trim().replace(/\/+$/, '');
  if (!baseUrl) return out;

  const url = `${baseUrl}/api/calculate/batch/by-postcode`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    // NOTE: yamato-calc expects { requests: [...] } (no clientId in spec).
    // We keep clientId only on our side and map results back by index.
    const requests = items.map((it) => ({
      departureBaseNo: it.departureBaseNo,
      destinationPostalCode: it.destinationPostalCode,
    }));

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
      signal: controller.signal,
    });

    const json: any = await res.json().catch(() => null);
    if (!res.ok) {
      logger.warn({ status: res.status, url, body: json }, 'yamato-calc batch request failed');
      return out;
    }

    if (json?.success !== true) {
      logger.warn({ url, body: json }, 'yamato-calc batch response success=false');
      return out;
    }

    const results = pickResultsArray(json);
    if (!results) {
      logger.warn({ url, body: json }, 'yamato-calc batch response has no results array');
      return out;
    }

    // yamato-calc results don't include clientId; map by index.
    (results as YamatoCalcBatchByPostcodeResult[]).forEach((r, idx) => {
      const clientId = items[idx]?.clientId;
      if (!clientId) return;
      if (r?.success !== true) return;
      const derived = deriveYamatoSortCode(r?.sortCode);
      if (derived) out.set(clientId, derived);
    });

    return out;
  } catch (e: any) {
    logger.warn({ err: e?.message || String(e), url }, 'yamato-calc batch request error');
    return out;
  } finally {
    clearTimeout(timeout);
  }
};


