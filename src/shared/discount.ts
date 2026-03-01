export function computeDiscountPct(
  priceCurrent: number,
  priceOriginal?: number
): number | undefined {
  if (priceOriginal === undefined || priceOriginal <= 0) return undefined;
  if (priceCurrent < 0) return undefined;
  if (priceCurrent >= priceOriginal) return 0;
  const pct = ((priceOriginal - priceCurrent) / priceOriginal) * 100;
  return Math.ceil((pct - Number.EPSILON) * 100) / 100;
}
