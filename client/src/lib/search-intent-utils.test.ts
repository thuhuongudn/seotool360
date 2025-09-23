import { describe, expect, it } from "vitest";
import { formatCurrency, formatNumber, parseKeywords } from "./search-intent-utils";

describe("parseKeywords", () => {
  it("returns empty array when input is empty", () => {
    expect(parseKeywords("")).toEqual([]);
  });

  it("splits comma separated keywords, trims whitespace, and deduplicates case-insensitively", () => {
    expect(parseKeywords(" Elevit , DHA bầu , elevit , canxi BioIsland ")).toEqual([
      "Elevit",
      "DHA bầu",
      "canxi BioIsland",
    ]);
  });

  it("filters out empty keywords", () => {
    expect(parseKeywords(",,,keyword,,")).toEqual(["keyword"]);
  });
});

describe("formatNumber", () => {
  it("formats numbers with thousand separators using vi-VN locale", () => {
    expect(formatNumber(1234567)).toBe("1.234.567");
  });

  it("returns dash for null or invalid numbers", () => {
    expect(formatNumber(null)).toBe("-");
    expect(formatNumber(Number.NaN)).toBe("-");
  });
});

describe("formatCurrency", () => {
  it("formats numbers as VND currency without fractional digits", () => {
    expect(formatCurrency(1234567)).toBe("1.234.567 ₫");
  });

  it("returns dash for null or invalid numbers", () => {
    expect(formatCurrency(null)).toBe("-");
    expect(formatCurrency(Number.NaN)).toBe("-");
  });
});
