/**
 * Parse user input into a deduplicated list of keywords (case-insensitive).
 */
export function parseKeywords(input: string): string[] {
  const seen = new Set<string>();
  const keywords: string[] = [];

  input
    .split(",")
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length > 0)
    .forEach((keyword) => {
      const normalized = keyword.toLowerCase();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        keywords.push(keyword);
      }
    });

  return keywords;
}

/**
 * Format numeric values with thousand separators for the UI.
 */
export function formatNumber(value: number | null): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }
  return value.toLocaleString("vi-VN");
}

/**
 * Convert numeric values to localized currency (VND) string.
 */
export function formatCurrency(value: number | null): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }
  return value.toLocaleString("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}
