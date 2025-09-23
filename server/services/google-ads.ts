import { JWT } from "google-auth-library";

const GOOGLE_ADS_SCOPE = "https://www.googleapis.com/auth/adwords";
const DEFAULT_API_VERSION = process.env.ADS_API_VERSION || "v21";
const DEFAULT_LANGUAGE = process.env.DEFAULT_LANG || "languageConstants/1014";
const DEFAULT_GEO_TARGETS = parseDefaultGeoTargets(process.env.DEFAULT_GEO);
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 300;

export type KeywordPlanNetwork = "GOOGLE_SEARCH" | "GOOGLE_SEARCH_AND_PARTNERS";

export interface GenerateKeywordIdeasOptions {
  keywords: string[];
  language?: string;
  geoTargets?: string[];
  network?: KeywordPlanNetwork;
  pageSize?: number;
}

export interface KeywordIdeaRow {
  keyword: string;
  avgMonthlySearches: number | null;
  competition: string | null;
  competitionIndex: number | null;
  lowTopBid: number | null;
  highTopBid: number | null;
  monthlySearchVolumes?: {
    year: number | null;
    month: string | null;
    monthlySearches: number | null;
  }[];
  range?: {
    min: number | null;
    max: number | null;
  } | null;
}

export interface KeywordIdeaMeta {
  language: string;
  geoTargets: string[];
  network: KeywordPlanNetwork;
  totalResults: number;
  requestedKeywordCount: number;
  requestedAt: string;
  pageSize?: number;
}

export interface KeywordIdeaResponse {
  meta: KeywordIdeaMeta;
  rows: KeywordIdeaRow[];
}

export class GoogleAdsApiError extends Error {
  public readonly status?: number;
  public readonly details?: unknown;

  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = "GoogleAdsApiError";
    this.status = status;
    this.details = details;
  }
}

/**
 * Resolve default geo target constants from env or fall back to Vietnam.
 */
function parseDefaultGeoTargets(raw: string | undefined): string[] {
  if (!raw) {
    return ["geoTargetConstants/2392"];
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch (error) {
    // Ignore JSON parse errors and fall back to comma parsing
  }

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new GoogleAdsApiError(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Convert micro currency values to standard units (divide by 1e6).
 */
function microsToUnits(value: number | null | undefined): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }
  return Math.round((value / 1_000_000) * 100) / 100;
}

/**
 * Fetch wrapper that retries on retryable status codes with exponential backoff.
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  maxRetries = MAX_RETRIES,
): Promise<Response> {
  const body = init.body;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const requestInit: RequestInit = {
      ...init,
      // Ensure headers/body are re-created for each attempt
      headers: new Headers(init.headers as HeadersInit),
      body,
    };

    try {
      const response = await fetch(url, requestInit);

      if (response.ok) {
        return response;
      }

      if (!shouldRetry(response.status) || attempt === maxRetries - 1) {
        return response;
      }

      const delay = BASE_DELAY_MS * 2 ** attempt;
      await wait(delay);
    } catch (error) {
      if (attempt === maxRetries - 1) {
        throw new GoogleAdsApiError("Network error while calling Google Ads API", undefined, {
          message: error instanceof Error ? error.message : String(error),
        });
      }

      const delay = BASE_DELAY_MS * 2 ** attempt;
      await wait(delay);
    }
  }

  throw new GoogleAdsApiError("Failed to fetch data from Google Ads API after retries");
}

function shouldRetry(status: number): boolean {
  return status === 429 || (status >= 500 && status < 600);
}

function wait(durationMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

/**
 * Exchange the service account for a Google Ads API access token.
 */
let jwtClient: JWT | null = null;
let cachedAccessToken: { access_token: string; expiry_date?: number } | null = null;

function getJwtClient(): JWT {
  if (!jwtClient) {
    const clientEmail = getRequiredEnv("SA_EMAIL");
    const privateKeyRaw = getRequiredEnv("SA_PRIVATE_KEY");
    const privateKey = privateKeyRaw.includes("\\n") ? privateKeyRaw.replace(/\\n/g, "\n") : privateKeyRaw;

    jwtClient = new JWT({
      email: clientEmail,
      key: privateKey,
      scopes: [GOOGLE_ADS_SCOPE],
    });
  }

  return jwtClient;
}

function shouldRefreshToken(expiryDate?: number): boolean {
  if (!expiryDate) {
    return true;
  }

  const now = Date.now();
  const refreshThresholdMs = 5 * 60 * 1000; // refresh 5 minutes before expiry
  return now >= expiryDate - refreshThresholdMs;
}

export async function getAccessToken(): Promise<{ access_token: string; expiry_date?: number }> {
  if (cachedAccessToken && !shouldRefreshToken(cachedAccessToken.expiry_date)) {
    return cachedAccessToken;
  }

  const tokenResponse = await getJwtClient().authorize();
  if (!tokenResponse?.access_token) {
    throw new GoogleAdsApiError("Failed to obtain Google Ads access token");
  }

  cachedAccessToken = {
    access_token: tokenResponse.access_token,
    expiry_date: tokenResponse.expiry_date ?? undefined,
  };

  return cachedAccessToken;
}

/**
 * Normalize the Google Ads API response into a UI-friendly structure.
 */
export function normalizeIdeas(
  data: any,
  language: string,
  geoTargets: string[],
  network: KeywordPlanNetwork,
  pageSize?: number,
): KeywordIdeaResponse {
  const results = Array.isArray(data?.results) ? data.results : [];

  const rows: KeywordIdeaRow[] = results.map((result: any) => {
    const metrics = result?.keywordIdeaMetrics ?? {};
    const monthlyVolumesRaw = Array.isArray(metrics?.monthlySearchVolumes) ? metrics.monthlySearchVolumes : [];
    const monthlySearchVolumes = monthlyVolumesRaw.map((entry: any) => ({
      year: typeof entry?.year === "number" ? entry.year : null,
      month: typeof entry?.month === "string" ? entry.month : null,
      monthlySearches: typeof entry?.monthlySearches === "number" ? entry.monthlySearches : null,
    }));

    const numericVolumes = monthlySearchVolumes
      .map((entry: { monthlySearches: number | null }) => (typeof entry.monthlySearches === "number" ? entry.monthlySearches : null))
      .filter((value: number | null): value is number => value !== null);

    const range = numericVolumes.length
      ? {
          min: Math.min(...numericVolumes),
          max: Math.max(...numericVolumes),
        }
      : null;

    return {
      keyword: String(result?.text ?? ""),
      avgMonthlySearches: typeof metrics?.avgMonthlySearches === "number" ? metrics.avgMonthlySearches : null,
      competition: typeof metrics?.competition === "string" ? metrics.competition : null,
      competitionIndex: typeof metrics?.competitionIndex === "number" ? metrics.competitionIndex : null,
      lowTopBid: microsToUnits(metrics?.lowTopOfPageBidMicros),
      highTopBid: microsToUnits(metrics?.highTopOfPageBidMicros),
      monthlySearchVolumes,
      range,
    };
  });

  return {
    meta: {
      language,
      geoTargets,
      network,
      totalResults: rows.length,
      requestedKeywordCount: data?.results?.length ?? rows.length,
      requestedAt: new Date().toISOString(),
      pageSize,
    },
    rows,
  };
}

/**
 * Call Google Ads API to generate keyword ideas using a service account.
 */
export async function generateKeywordIdeas(options: GenerateKeywordIdeasOptions): Promise<KeywordIdeaResponse> {
  const keywords = dedupeKeywords(options.keywords);
  if (keywords.length === 0) {
    throw new GoogleAdsApiError("At least one keyword is required to generate ideas", 400);
  }

  const { access_token } = await getAccessToken();
  const developerToken = getRequiredEnv("DEV_TOKEN");
  const customerId = getRequiredEnv("CUSTOMER_ID");
  const managerId = process.env.MANAGER_ID;

  const language = options.language || DEFAULT_LANGUAGE;
  const geoTargets = options.geoTargets?.length ? options.geoTargets : DEFAULT_GEO_TARGETS;
  const network: KeywordPlanNetwork = options.network || "GOOGLE_SEARCH";
  const pageSize = options.pageSize;

  const url = `https://googleads.googleapis.com/${DEFAULT_API_VERSION}/customers/${customerId}:generateKeywordIdeas`;
  const headers: HeadersInit = {
    Authorization: `Bearer ${access_token}`,
    "developer-token": developerToken,
    "Content-Type": "application/json",
  };

  if (managerId) {
    headers["login-customer-id"] = managerId;
  }

  const body = JSON.stringify({
    customerId,
    language,
    geoTargetConstants: geoTargets,
    keywordPlanNetwork: network,
    keywordSeed: {
      keywords,
    },
    ...(pageSize ? { pageSize } : {}),
  });

  const response = await fetchWithRetry(url, {
    method: "POST",
    headers,
    body,
  });

  if (!response.ok) {
    const errorPayload = await safeJson(response);
    console.error("[SearchIntent] Google Ads API error", {
      status: response.status,
      statusText: response.statusText,
      error: summarizeError(errorPayload),
    });
    throw new GoogleAdsApiError("Google Ads API request failed", response.status, summarizeError(errorPayload));
  }

  const json = await response.json();
  return normalizeIdeas(json, language, geoTargets, network, pageSize);
}

function dedupeKeywords(keywords: string[]): string[] {
  const seen = new Set<string>();
  const uniqueKeywords: string[] = [];

  keywords
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length > 0)
    .forEach((keyword) => {
      const normalized = keyword.toLowerCase();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        uniqueKeywords.push(keyword);
      }
    });

  return uniqueKeywords;
}

async function safeJson(response: Response): Promise<any> {
  try {
    return await response.json();
  } catch (error) {
    return { message: response.statusText };
  }
}

function summarizeError(payload: any): unknown {
  if (!payload) {
    return null;
  }

  const error = payload.error || payload;
  if (typeof error === "string") {
    return error;
  }

  if (error?.message) {
    return {
      message: error.message,
      status: error.status,
      details: error.details,
    };
  }

  return payload;
}

export { DEFAULT_GEO_TARGETS };
