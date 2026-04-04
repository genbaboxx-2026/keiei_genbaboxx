/**
 * Format number with comma separators (e.g. 1000 → "1,000")
 */
export function formatNumber(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return "";
  return value.toLocaleString("ja-JP");
}

/**
 * Parse a comma-separated number string back to number
 */
export function parseNumber(value: string): number {
  const cleaned = value.replace(/[,，\s]/g, "");
  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
}
