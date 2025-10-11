import { GoogleAuth } from 'google-auth-library';

// Environment variables for Service Account
const SA_EMAIL = process.env.SA_EMAIL;
const SA_PRIVATE_KEY = process.env.SA_PRIVATE_KEY;

// Validate environment variables
if (!SA_EMAIL || !SA_PRIVATE_KEY) {
  console.error('❌ Missing Service Account credentials');
  console.error('Required: SA_EMAIL, SA_PRIVATE_KEY');
}

// Log masked credentials for verification (hide first 4 and last 4 characters)
if (SA_EMAIL && SA_PRIVATE_KEY) {
  const maskedEmail = `${SA_EMAIL.slice(0, 4)}...${SA_EMAIL.slice(-10)}`;
  const maskedKey = `${SA_PRIVATE_KEY.slice(0, 20)}...${SA_PRIVATE_KEY.slice(-20)}`;
  console.log(`✓ [GSC] SA_EMAIL loaded: ${maskedEmail}`);
  console.log(`✓ [GSC] SA_PRIVATE_KEY loaded: ${maskedKey.slice(0, 30)}...`);
}

/**
 * Custom error class for Google Search Console API errors
 */
export class GSCApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'GSCApiError';
  }
}

/**
 * Time preset type
 */
export type TimePreset = 'last7d' | 'last28d' | 'last90d' | 'custom';

/**
 * Analysis mode type
 */
export type AnalysisMode = 'queries-for-page' | 'pages-for-keyword';

/**
 * Search type options
 */
export type SearchType = 'web' | 'image' | 'video' | 'news';

/**
 * Data state options
 */
export type DataState = 'final' | 'all';

/**
 * Dimension filter
 */
export interface DimensionFilter {
  dimension: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'notContains';
  expression: string;
}

/**
 * Search Analytics request parameters
 */
export interface SearchAnalyticsRequest {
  siteUrl: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  dimensions: string[];
  dimensionFilterGroups?: Array<{
    filters: DimensionFilter[];
  }>;
  rowLimit?: number;
  startRow?: number;
  searchType?: SearchType;
  dataState?: DataState;
}

/**
 * Search Analytics response row
 */
export interface SearchAnalyticsRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

/**
 * Search Analytics response
 */
export interface SearchAnalyticsResponse {
  rows: SearchAnalyticsRow[];
  responseAggregationType?: string;
}

/**
 * Calculate date range from preset
 */
export function getDateRangeFromPreset(preset: TimePreset): { startDate: string; endDate: string } {
  const today = new Date();
  const endDate = today.toISOString().split('T')[0]; // YYYY-MM-DD

  let daysAgo: number;
  switch (preset) {
    case 'last7d':
      daysAgo = 7;
      break;
    case 'last28d':
      daysAgo = 28;
      break;
    case 'last90d':
      daysAgo = 90;
      break;
    default:
      daysAgo = 7;
  }

  const startDateObj = new Date(today);
  startDateObj.setDate(startDateObj.getDate() - daysAgo);
  const startDate = startDateObj.toISOString().split('T')[0];

  return { startDate, endDate };
}

/**
 * Create authenticated Google Auth client
 */
async function getAuthClient() {
  if (!SA_EMAIL || !SA_PRIVATE_KEY) {
    throw new GSCApiError('Service Account credentials not configured', 500);
  }

  const auth = new GoogleAuth({
    credentials: {
      client_email: SA_EMAIL,
      private_key: SA_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });

  return auth.getClient();
}

/**
 * Query Google Search Console Search Analytics API
 */
export async function querySearchAnalytics(
  params: SearchAnalyticsRequest
): Promise<SearchAnalyticsResponse> {
  try {
    const client = await getAuthClient();
    const accessToken = await client.getAccessToken();

    if (!accessToken.token) {
      throw new GSCApiError('Failed to obtain access token', 500);
    }

    // Encode site URL for API endpoint
    const encodedSiteUrl = encodeURIComponent(params.siteUrl);
    const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodedSiteUrl}/searchAnalytics/query`;

    // Prepare request body
    const requestBody: any = {
      startDate: params.startDate,
      endDate: params.endDate,
      dimensions: params.dimensions || [],
    };

    if (params.dimensionFilterGroups) {
      requestBody.dimensionFilterGroups = params.dimensionFilterGroups;
    }

    if (params.rowLimit) {
      requestBody.rowLimit = params.rowLimit;
    }

    if (params.startRow) {
      requestBody.startRow = params.startRow;
    }

    if (params.searchType) {
      requestBody.searchType = params.searchType;
    }

    if (params.dataState) {
      requestBody.dataState = params.dataState;
    }

    console.log(`[GSC Insights] Querying: ${params.siteUrl}`);
    console.log(`[GSC Insights] Date range: ${params.startDate} to ${params.endDate}`);
    console.log(`[GSC Insights] Dimensions: ${params.dimensions.join(', ')}`);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      if (response.status === 403) {
        throw new GSCApiError(
          'Access denied. Please add the Service Account to Google Search Console property.',
          403,
          errorData
        );
      }

      if (response.status === 404) {
        throw new GSCApiError(
          'Site URL not found. Please verify the site URL matches your Search Console property.',
          404,
          errorData
        );
      }

      throw new GSCApiError(
        `Google Search Console API error: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    const data = await response.json();
    console.log(`[GSC Insights] Rows returned: ${data.rows?.length || 0}`);

    return data;
  } catch (error) {
    if (error instanceof GSCApiError) {
      throw error;
    }

    console.error('[GSC Insights] Error:', error);
    throw new GSCApiError(
      error instanceof Error ? error.message : 'Unknown error occurred',
      500
    );
  }
}

/**
 * Fetch all data with pagination (handles API limit of 25,000 rows per request)
 */
export async function fetchAllSearchAnalytics(
  params: SearchAnalyticsRequest
): Promise<SearchAnalyticsRow[]> {
  const allRows: SearchAnalyticsRow[] = [];
  let startRow = 0;
  const rowLimit = 25000; // Maximum allowed by API

  let hasMore = true;

  while (hasMore) {
    const response = await querySearchAnalytics({
      ...params,
      rowLimit,
      startRow,
    });

    if (response.rows && response.rows.length > 0) {
      allRows.push(...response.rows);
      console.log(`[GSC Insights] Fetched ${response.rows.length} rows (total: ${allRows.length})`);

      // Continue if we got the maximum number of rows (might have more)
      if (response.rows.length === rowLimit) {
        startRow += rowLimit;
      } else {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }

  return allRows;
}

/**
 * Get top 100 results sorted by impressions (descending) then clicks (descending)
 */
export function getTop100Results(rows: SearchAnalyticsRow[]): SearchAnalyticsRow[] {
  // Sort by impressions (desc), then clicks (desc)
  const sorted = [...rows].sort((a, b) => {
    if (b.impressions !== a.impressions) {
      return b.impressions - a.impressions;
    }
    return b.clicks - a.clicks;
  });

  // Return top 100
  return sorted.slice(0, 100);
}

/**
 * High-level function to get queries for a specific page
 */
export async function getQueriesForPage(params: {
  siteUrl: string;
  pageUrl: string;
  startDate: string;
  endDate: string;
  searchType?: SearchType;
  dataState?: DataState;
}): Promise<SearchAnalyticsRow[]> {
  console.log(`[GSC Insights] Mode: queries-for-page`);
  console.log(`[GSC Insights] Page URL: ${params.pageUrl || '(domain-wide)'}`);

  // Build dimension filter only if pageUrl is provided
  const dimensionFilterGroups = params.pageUrl
    ? [
        {
          filters: [
            {
              dimension: 'page' as const,
              operator: 'equals' as const,
              expression: params.pageUrl,
            },
          ],
        },
      ]
    : undefined; // No filter = domain-wide query

  const allRows = await fetchAllSearchAnalytics({
    siteUrl: params.siteUrl,
    startDate: params.startDate,
    endDate: params.endDate,
    dimensions: ['query'],
    dimensionFilterGroups,
    searchType: params.searchType || 'web',
    dataState: params.dataState,
  });

  return getTop100Results(allRows);
}

/**
 * High-level function to get pages for a specific keyword
 */
export async function getPagesForKeyword(params: {
  siteUrl: string;
  keyword: string;
  startDate: string;
  endDate: string;
  searchType?: SearchType;
  dataState?: DataState;
}): Promise<SearchAnalyticsRow[]> {
  console.log(`[GSC Insights] Mode: pages-for-keyword`);
  console.log(`[GSC Insights] Keyword: ${params.keyword}`);

  const allRows = await fetchAllSearchAnalytics({
    siteUrl: params.siteUrl,
    startDate: params.startDate,
    endDate: params.endDate,
    dimensions: ['page'],
    dimensionFilterGroups: [
      {
        filters: [
          {
            dimension: 'query',
            operator: 'equals',
            expression: params.keyword,
          },
        ],
      },
    ],
    searchType: params.searchType || 'web',
    dataState: params.dataState,
  });

  return getTop100Results(allRows);
}

/**
 * Get data for specific URL and Query combination (clicked from table)
 */
export async function getDataForUrlAndQuery(params: {
  siteUrl: string;
  pageUrl: string;
  keyword: string;
  startDate: string;
  endDate: string;
  searchType?: SearchType;
  dataState?: DataState;
}): Promise<SearchAnalyticsRow[]> {
  console.log(`[GSC Insights] Mode: url-and-query`);
  console.log(`[GSC Insights] Page URL: ${params.pageUrl}`);
  console.log(`[GSC Insights] Keyword: ${params.keyword}`);

  const allRows = await fetchAllSearchAnalytics({
    siteUrl: params.siteUrl,
    startDate: params.startDate,
    endDate: params.endDate,
    dimensions: ['date'],
    dimensionFilterGroups: [
      {
        filters: [
          {
            dimension: 'page',
            operator: 'equals',
            expression: params.pageUrl,
          },
          {
            dimension: 'query',
            operator: 'equals',
            expression: params.keyword,
          },
        ],
      },
    ],
    searchType: params.searchType || 'web',
    dataState: params.dataState,
  });

  return allRows;
}

/**
 * Get time series data grouped by date
 */
export async function getTimeSeriesData(params: {
  siteUrl: string;
  startDate: string;
  endDate: string;
  pageUrl?: string;
  keyword?: string;
  searchType?: SearchType;
  dataState?: DataState;
}): Promise<SearchAnalyticsRow[]> {
  console.log(`[GSC Insights] Getting time series data`);

  const filters: DimensionFilter[] = [];

  if (params.pageUrl) {
    filters.push({
      dimension: 'page',
      operator: 'equals',
      expression: params.pageUrl,
    });
  }

  if (params.keyword) {
    filters.push({
      dimension: 'query',
      operator: 'equals',
      expression: params.keyword,
    });
  }

  const allRows = await fetchAllSearchAnalytics({
    siteUrl: params.siteUrl,
    startDate: params.startDate,
    endDate: params.endDate,
    dimensions: ['date'],
    dimensionFilterGroups: filters.length > 0 ? [{ filters }] : undefined,
    searchType: params.searchType || 'web',
    dataState: params.dataState,
  });

  return allRows.sort((a, b) => a.keys[0].localeCompare(b.keys[0]));
}

/**
 * Comparison metrics interface
 */
export interface ComparisonMetrics {
  current: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  };
  previous: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  };
  changes: {
    clicks: number;
    clicksPercent: number;
    impressions: number;
    impressionsPercent: number;
    ctr: number;
    ctrPercent: number;
    position: number;
    positionPercent: number;
  };
}

/**
 * Get comparison data between two periods
 */
export async function getComparisonData(params: {
  siteUrl: string;
  currentStartDate: string;
  currentEndDate: string;
  previousStartDate: string;
  previousEndDate: string;
  pageUrl?: string;
  keyword?: string;
  searchType?: SearchType;
  dataState?: DataState;
}): Promise<ComparisonMetrics> {
  console.log(`[GSC Insights] Getting comparison data`);
  console.log(`[GSC Insights] Current: ${params.currentStartDate} to ${params.currentEndDate}`);
  console.log(`[GSC Insights] Previous: ${params.previousStartDate} to ${params.previousEndDate}`);

  const [currentData, previousData] = await Promise.all([
    getTimeSeriesData({
      siteUrl: params.siteUrl,
      startDate: params.currentStartDate,
      endDate: params.currentEndDate,
      pageUrl: params.pageUrl,
      keyword: params.keyword,
      searchType: params.searchType,
      dataState: params.dataState,
    }),
    getTimeSeriesData({
      siteUrl: params.siteUrl,
      startDate: params.previousStartDate,
      endDate: params.previousEndDate,
      pageUrl: params.pageUrl,
      keyword: params.keyword,
      searchType: params.searchType,
      dataState: params.dataState,
    }),
  ]);

  const current = currentData.reduce(
    (acc, row) => ({
      clicks: acc.clicks + row.clicks,
      impressions: acc.impressions + row.impressions,
      ctr: 0,
      position: 0,
      count: acc.count + 1,
    }),
    { clicks: 0, impressions: 0, ctr: 0, position: 0, count: 0 }
  );

  const previous = previousData.reduce(
    (acc, row) => ({
      clicks: acc.clicks + row.clicks,
      impressions: acc.impressions + row.impressions,
      ctr: 0,
      position: 0,
      count: acc.count + 1,
    }),
    { clicks: 0, impressions: 0, ctr: 0, position: 0, count: 0 }
  );

  current.ctr = current.impressions > 0 ? current.clicks / current.impressions : 0;
  current.position = currentData.reduce((sum, row) => sum + row.position, 0) / (currentData.length || 1);

  previous.ctr = previous.impressions > 0 ? previous.clicks / previous.impressions : 0;
  previous.position = previousData.reduce((sum, row) => sum + row.position, 0) / (previousData.length || 1);

  const changes = {
    clicks: current.clicks - previous.clicks,
    clicksPercent: previous.clicks > 0 ? ((current.clicks - previous.clicks) / previous.clicks) * 100 : 0,
    impressions: current.impressions - previous.impressions,
    impressionsPercent: previous.impressions > 0 ? ((current.impressions - previous.impressions) / previous.impressions) * 100 : 0,
    ctr: current.ctr - previous.ctr,
    ctrPercent: previous.ctr > 0 ? ((current.ctr - previous.ctr) / previous.ctr) * 100 : 0,
    position: current.position - previous.position,
    positionPercent: previous.position > 0 ? ((current.position - previous.position) / previous.position) * 100 : 0,
  };

  return {
    current: {
      clicks: current.clicks,
      impressions: current.impressions,
      ctr: current.ctr,
      position: current.position,
    },
    previous: {
      clicks: previous.clicks,
      impressions: previous.impressions,
      ctr: previous.ctr,
      position: previous.position,
    },
    changes,
  };
}
