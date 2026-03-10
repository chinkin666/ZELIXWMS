export function mergeBarcodesWithSku(
  barcodes: Array<string | null | undefined> | undefined,
  sku?: string,
): string[] {
  const normalizedSku = (sku ?? '').trim();
  const cleaned = (Array.isArray(barcodes) ? barcodes : [])
    .map((v) => (v ?? '').toString().trim())
    .filter(Boolean);

  // append sku before dedupe so it is part of set
  if (normalizedSku) cleaned.push(normalizedSku);

  const seen = new Set<string>();
  for (const code of cleaned) {
    if (!seen.has(code)) {
      seen.add(code);
    }
  }

  const unique = Array.from(seen);
  if (!normalizedSku) return unique;

  // ensure sku is the last element
  const withoutSku = unique.filter((c) => c !== normalizedSku);
  return [...withoutSku, normalizedSku];
}

