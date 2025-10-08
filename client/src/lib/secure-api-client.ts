/**
 * Secure API Client
 * All external API calls are routed through backend proxy to protect API keys
 */

import supabase from './supabase';

/**
 * Get authentication token for API requests
 */
async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

/**
 * Make authenticated request to backend proxy
 */
async function secureRequest<T = any>(
  endpoint: string,
  body: any,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();

  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
    body: JSON.stringify(body),
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(errorData.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}

// ============================================
// SERPER API (Google Search & Images)
// ============================================

export interface SerperSearchParams {
  q: string;
  gl?: string;
  num?: number;
  location?: string;
}

export interface SerperImagesParams {
  q: string;
  location?: string;
  num?: number;
}

export async function serperSearch(params: SerperSearchParams) {
  return secureRequest('/api/proxy/serper/search', params);
}

export async function serperImages(params: SerperImagesParams) {
  return secureRequest('/api/proxy/serper/images', params);
}

// ============================================
// OPENAI / OPENROUTER API
// ============================================

export interface OpenAICompletionParams {
  model: string;
  messages: Array<{
    role: string;
    content: string | Array<{
      type: string;
      text?: string;
      image_url?: {
        url: string;
      };
    }>;
  }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export async function openaiCompletion(params: OpenAICompletionParams) {
  return secureRequest('/api/proxy/openai/completions', params);
}

// ============================================
// FIRECRAWL API
// ============================================

export interface FirecrawlScrapeParams {
  url: string;
  formats?: string[];
}

export async function firecrawlScrape(params: FirecrawlScrapeParams) {
  return secureRequest('/api/proxy/firecrawl/scrape', params);
}

// ============================================
// GEMINI IMAGE API
// ============================================

export interface GeminiImageParams {
  prompt: string;
}

export async function geminiGenerateImage(params: GeminiImageParams) {
  return secureRequest('/api/proxy/gemini/generate-image', params);
}

// ============================================
// UNSPLASH API
// ============================================

export interface UnsplashSearchParams {
  query: string;
  per_page?: number;
}

export async function unsplashSearch(params: UnsplashSearchParams) {
  return secureRequest('/api/proxy/unsplash/search', params);
}

// ============================================
// GEMINI VISION API (Image Analysis)
// ============================================

export interface GeminiVisionParams {
  contents: Array<{
    parts: Array<{
      text?: string;
      inline_data?: {
        mime_type: string;
        data: string;
      };
    }>;
  }>;
}

export async function geminiVision(params: GeminiVisionParams) {
  return secureRequest('/api/proxy/gemini/vision', params);
}
