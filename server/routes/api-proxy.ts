import type { Express, Response } from "express";
import { authMiddleware, type AuthenticatedRequest } from "../auth-middleware";
import { z } from "zod";

// Validate that required API keys exist
const SERPER_API_KEY = process.env.SERPER_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // Gemini API key for vision/text
const GEMINI_IMAGE_KEY = process.env.GEMINI_2_5_FLASH_IMG; // OpenRouter key for image gen
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const GOONG_API_KEY = process.env.GOONG_API_KEY; // Goong Maps API key
const N8N_API_KEY = process.env.N8N_API_KEY; // N8N webhook API key

// Job queue for async webhooks (to handle Heroku 30s timeout)
interface JobStatus {
  status: 'processing' | 'completed' | 'failed';
  keyword?: string;
  url?: string; // For firecrawl jobs
  result?: any;
  error?: string;
  startedAt: number;
  completedAt?: number;
}

const jobStore = new Map<string, JobStatus>();

// Cleanup old jobs every 10 minutes
setInterval(() => {
  const now = Date.now();
  const tenMinutes = 10 * 60 * 1000;
  Array.from(jobStore.entries()).forEach(([jobId, job]) => {
    if (now - job.startedAt > tenMinutes) {
      jobStore.delete(jobId);
    }
  });
}, 10 * 60 * 1000);

// Helper function to generate UUID for job IDs
function generateJobId(): string {
  return 'job_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
}

// Request validation schemas
const serperSearchSchema = z.object({
  q: z.string().min(1, "Query is required"),
  gl: z.string().optional(),
  num: z.number().optional(),
  location: z.string().optional(),
});

const serperImagesSchema = z.object({
  q: z.string().min(1, "Query is required"),
  location: z.string().optional(),
  num: z.number().optional(),
});

const openaiCompletionSchema = z.object({
  model: z.string(),
  messages: z.array(z.any()),
  temperature: z.number().optional(),
  max_tokens: z.number().optional(),
  stream: z.boolean().optional(),
});

const firecrawlScrapeSchema = z.object({
  url: z.string().url("Valid URL is required"),
  formats: z.array(z.string()).optional(),
});

const unsplashSearchSchema = z.object({
  query: z.string().min(1, "Query is required"),
  per_page: z.number().min(1).max(30).optional(),
});

const goongGeocodeSchema = z.object({
  address: z.string().min(1, "Address is required"),
});

const topicalAuthoritySchema = z.object({
  keyword_seed: z.string().min(1, "Keyword seed is required"),
  keyword_ideas: z.array(z.object({
    keyword: z.string(),
    volume: z.number().nullable(),
  })),
});

const topicalAuthorityWebhookSchema = z.object({
  keyword_seed: z.string().min(1, "Keyword seed is required"),
  topical_authority_map: z.any(),
  generated_at: z.string().optional(),
  duration_seconds: z.number().nonnegative().optional(),
});

export function registerApiProxyRoutes(app: Express) {
  // ============================================
  // SERPER API PROXY
  // ============================================

  /**
   * Proxy for Serper Google Search API
   * Protects SERPER_API_KEY from client exposure
   */
  app.post("/api/proxy/serper/search", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!SERPER_API_KEY) {
        console.error("[Serper Proxy] Missing SERPER_API_KEY");
        return res.status(500).json({
          message: "Server configuration error: SERPER_API_KEY not configured"
        });
      }

      // Validate request body
      const validation = serperSearchSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          message: "Invalid request data",
          errors: validation.error.issues,
        });
      }

      const { q, gl, num, location } = validation.data;

      // Make request to Serper API with server-side key
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': SERPER_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q,
          gl: gl || 'vn',
          num: num || 10,
          location,
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Serper Proxy] API error:", response.status, errorText);
        return res.status(response.status).json({
          message: "Serper API request failed",
          details: errorText
        });
      }

      const data = await response.json();
      return res.json(data);

    } catch (error) {
      console.error("[Serper Proxy] Unexpected error:", error);
      return res.status(500).json({ message: "Failed to fetch search results" });
    }
  });

  /**
   * Proxy for Serper Google Images API
   */
  app.post("/api/proxy/serper/images", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!SERPER_API_KEY) {
        return res.status(500).json({
          message: "Server configuration error: SERPER_API_KEY not configured"
        });
      }

      const validation = serperImagesSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          message: "Invalid request data",
          errors: validation.error.issues,
        });
      }

      const { q, location, num } = validation.data;

      const response = await fetch('https://google.serper.dev/images', {
        method: 'POST',
        headers: {
          'X-API-KEY': SERPER_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q,
          location: location || 'Vietnam',
          num: num || 10,
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Serper Images Proxy] API error:", response.status, errorText);
        return res.status(response.status).json({
          message: "Serper Images API request failed",
          details: errorText
        });
      }

      const data = await response.json();
      return res.json(data);

    } catch (error) {
      console.error("[Serper Images Proxy] Unexpected error:", error);
      return res.status(500).json({ message: "Failed to fetch images" });
    }
  });

  // ============================================
  // OPENAI / OPENROUTER API PROXY
  // ============================================

  /**
   * Proxy for OpenRouter API (OpenAI compatible)
   * Protects OPENAI_API_KEY from client exposure
   */
  app.post("/api/proxy/openai/completions", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!OPENAI_API_KEY) {
        return res.status(500).json({
          message: "Server configuration error: OPENAI_API_KEY not configured"
        });
      }

      const validation = openaiCompletionSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          message: "Invalid request data",
          errors: validation.error.issues,
        });
      }

      const { model, messages, temperature, max_tokens, stream } = validation.data;

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.APP_URL || "http://localhost:5000",
          "X-Title": "N8N Toolkit - Content Optimizer",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens,
          stream: stream || false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[OpenAI Proxy] API error:", response.status, errorText);
        return res.status(response.status).json({
          message: "OpenAI API request failed",
          details: errorText
        });
      }

      const data = await response.json();
      return res.json(data);

    } catch (error) {
      console.error("[OpenAI Proxy] Unexpected error:", error);
      return res.status(500).json({ message: "Failed to generate completion" });
    }
  });

  // ============================================
  // FIRECRAWL API PROXY
  // ============================================

  /**
   * Proxy for Firecrawl scraping API
   * Protects FIRECRAWL_API_KEY from client exposure
   */
  // Background processing function for Firecrawl scrape
  async function processFirecrawlScrape(jobId: string, url: string, formats?: string[]) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url,
          formats: formats || ['markdown'],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Firecrawl Proxy] API error:", response.status, errorText);
        jobStore.set(jobId, {
          status: 'failed',
          url,
          error: `Firecrawl API error (${response.status}): ${errorText}`,
          startedAt: jobStore.get(jobId)?.startedAt || Date.now(),
          completedAt: Date.now()
        });
        return;
      }

      const data = await response.json();
      jobStore.set(jobId, {
        status: 'completed',
        url,
        result: data,
        startedAt: jobStore.get(jobId)?.startedAt || Date.now(),
        completedAt: Date.now()
      });

    } catch (error: any) {
      console.error("[Firecrawl Proxy] Processing error:", error);
      jobStore.set(jobId, {
        status: 'failed',
        url,
        error: error.name === 'AbortError'
          ? 'Scraping request timed out after 60 seconds'
          : error.message || 'Failed to scrape URL',
        startedAt: jobStore.get(jobId)?.startedAt || Date.now(),
        completedAt: Date.now()
      });
    }
  }

  // Firecrawl scrape with async polling pattern
  app.post("/api/proxy/firecrawl/scrape", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!FIRECRAWL_API_KEY) {
        return res.status(500).json({
          message: "Server configuration error: FIRECRAWL_API_KEY not configured"
        });
      }

      const validation = firecrawlScrapeSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          message: "Invalid request data",
          errors: validation.error.issues,
        });
      }

      const { url, formats } = validation.data;

      // Generate job ID
      const jobId = generateJobId();

      // Store initial job status
      jobStore.set(jobId, {
        status: 'processing',
        url,
        startedAt: Date.now()
      });

      // Process in background (don't await)
      processFirecrawlScrape(jobId, url, formats).catch(error => {
        console.error("[Firecrawl Proxy] Background processing error:", error);
      });

      // Return job ID immediately (202 Accepted)
      return res.status(202).json({
        job_id: jobId,
        status: 'processing',
        message: 'Scraping job started. Poll /api/job-status/:job_id for results.'
      });

    } catch (error) {
      console.error("[Firecrawl Proxy] Unexpected error:", error);
      return res.status(500).json({ message: "Failed to start scraping job" });
    }
  });

  // ============================================
  // GEMINI IMAGE API PROXY
  // ============================================

  /**
   * Proxy for Gemini Image Generation API via OpenRouter
   * Uses OpenRouter for stable image generation with Gemini 2.5 Flash Image
   * Protects GEMINI_IMAGE_KEY from client exposure
   *
   * Model: google/gemini-2.5-flash-image (stable production version)
   */
  app.post("/api/proxy/gemini/generate-image", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!GEMINI_IMAGE_KEY) {
        return res.status(500).json({
          message: "Server configuration error: GEMINI_IMAGE_KEY not configured"
        });
      }

      const { prompt } = req.body;

      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ message: "Valid prompt is required" });
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GEMINI_IMAGE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image', // Changed from preview to stable
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Gemini Image Proxy] API error:", response.status, errorText);
        return res.status(response.status).json({
          message: "Gemini Image API request failed",
          details: errorText
        });
      }

      const data = await response.json();
      return res.json(data);

    } catch (error) {
      console.error("[Gemini Image Proxy] Unexpected error:", error);
      return res.status(500).json({ message: "Failed to generate image" });
    }
  });

  // ============================================
  // UNSPLASH API PROXY
  // ============================================

  /**
   * Proxy for Unsplash Search API
   * Protects UNSPLASH_ACCESS_KEY from client exposure
   */
  app.post("/api/proxy/unsplash/search", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!UNSPLASH_ACCESS_KEY) {
        return res.status(500).json({
          message: "Server configuration error: UNSPLASH_ACCESS_KEY not configured"
        });
      }

      const validation = unsplashSearchSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          message: "Invalid request data",
          errors: validation.error.issues,
        });
      }

      const { query, per_page } = validation.data;

      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${per_page || 12}`,
        {
          headers: {
            'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Unsplash Proxy] API error:", response.status, errorText);
        return res.status(response.status).json({
          message: "Unsplash API request failed",
          details: errorText
        });
      }

      const data = await response.json();
      return res.json(data);

    } catch (error) {
      console.error("[Unsplash Proxy] Unexpected error:", error);
      return res.status(500).json({ message: "Failed to search images" });
    }
  });

  // ============================================
  // GEMINI VISION API PROXY
  // ============================================

  /**
   * Proxy for Gemini Vision API (image analysis)
   * Protects GEMINI_API_KEY from client exposure
   */
  app.post("/api/proxy/gemini/vision", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!GEMINI_API_KEY) {
        return res.status(500).json({
          message: "Server configuration error: GEMINI_API_KEY not configured"
        });
      }

      const { contents } = req.body;

      if (!contents || !Array.isArray(contents)) {
        return res.status(400).json({
          message: "Invalid request: contents array is required"
        });
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ contents }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Gemini Vision Proxy] API error:", response.status, errorText);
        return res.status(response.status).json({
          message: "Gemini Vision API request failed",
          details: errorText
        });
      }

      const data = await response.json();
      return res.json(data);

    } catch (error) {
      console.error("[Gemini Vision Proxy] Unexpected error:", error);
      return res.status(500).json({ message: "Failed to analyze image" });
    }
  });

  // ============================================
  // GOONG MAPS API PROXY
  // ============================================

  /**
   * Proxy for Goong Maps Geocoding API (Public - for free tools)
   * Protects GOONG_API_KEY from client exposure
   * No authentication required for image-seo tool
   */
  app.post("/api/public/goong/geocode", async (req, res: Response) => {
    try {
      if (!GOONG_API_KEY) {
        return res.status(500).json({
          message: "Server configuration error: GOONG_API_KEY not configured"
        });
      }

      const validation = goongGeocodeSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          message: "Invalid request data",
          errors: validation.error.issues,
        });
      }

      const { address } = validation.data;

      const response = await fetch(
        `https://rsapi.goong.io/geocode?address=${encodeURIComponent(address)}&api_key=${GOONG_API_KEY}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Goong Public Proxy] API error:", response.status, errorText);
        return res.status(response.status).json({
          message: "Goong API request failed",
          details: errorText
        });
      }

      const data = await response.json();
      return res.json(data);

    } catch (error) {
      console.error("[Goong Public Proxy] Unexpected error:", error);
      return res.status(500).json({ message: "Failed to geocode address" });
    }
  });

  /**
   * Proxy for Goong Maps Geocoding API (Authenticated)
   * Protects GOONG_API_KEY from client exposure
   */
  app.post("/api/proxy/goong/geocode", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!GOONG_API_KEY) {
        return res.status(500).json({
          message: "Server configuration error: GOONG_API_KEY not configured"
        });
      }

      const validation = goongGeocodeSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          message: "Invalid request data",
          errors: validation.error.issues,
        });
      }

      const { address } = validation.data;

      const response = await fetch(
        `https://rsapi.goong.io/geocode?address=${encodeURIComponent(address)}&api_key=${GOONG_API_KEY}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Goong Proxy] API error:", response.status, errorText);
        return res.status(response.status).json({
          message: "Goong API request failed",
          details: errorText
        });
      }

      const data = await response.json();
      return res.json(data);

    } catch (error) {
      console.error("[Goong Proxy] Unexpected error:", error);
      return res.status(500).json({ message: "Failed to geocode address" });
    }
  });

  // ============================================
  // N8N WEBHOOK PROXY
  // ============================================

  /**
   * Background processor for N8N Search Intent Webhook
   */
  async function processN8NSearchIntent(jobId: string, keyword: string, branch_id?: number) {
    try {
      console.log(`[N8N Search Intent] Starting job ${jobId} for keyword: "${keyword}"`);

      const response = await fetch(
        "https://n8n.vietnhat.me/webhook/seo-tool-360-search-intent-2025-09-26",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": N8N_API_KEY!,
          },
          body: JSON.stringify({ keyword, branch_id }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[N8N Search Intent] Job ${jobId} failed:`, response.status, errorText);
        jobStore.set(jobId, {
          status: 'failed',
          error: `N8N webhook returned ${response.status}: ${errorText}`,
          startedAt: jobStore.get(jobId)!.startedAt,
          completedAt: Date.now()
        });
        return;
      }

      const data = await response.json();
      console.log(`[N8N Search Intent] Job ${jobId} completed, response size: ${JSON.stringify(data).length} bytes`);

      jobStore.set(jobId, {
        status: 'completed',
        keyword,
        result: data,
        startedAt: jobStore.get(jobId)!.startedAt,
        completedAt: Date.now()
      });

    } catch (error: any) {
      console.error(`[N8N Search Intent] Job ${jobId} error:`, error);
      jobStore.set(jobId, {
        status: 'failed',
        error: error.message || 'Unknown error occurred',
        startedAt: jobStore.get(jobId)!.startedAt,
        completedAt: Date.now()
      });
    }
  }

  /**
   * Proxy for N8N Search Intent Webhook (Async Pattern)
   * Returns job_id immediately, client polls /api/job-status/:job_id
   * This avoids Heroku 30s timeout for long-running N8N workflows (30-60s)
   */
  app.post("/api/proxy/n8n/search-intent", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!N8N_API_KEY) {
        return res.status(500).json({
          message: "Server configuration error: N8N_API_KEY not configured"
        });
      }

      const { keyword, branch_id } = req.body;

      if (!keyword || typeof keyword !== 'string') {
        return res.status(400).json({ message: "Valid keyword is required" });
      }

      // Generate unique job ID
      const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Store initial job status
      jobStore.set(jobId, {
        status: 'processing',
        keyword,
        startedAt: Date.now()
      });

      // Process in background (don't await)
      processN8NSearchIntent(jobId, keyword, branch_id).catch(err => {
        console.error(`[N8N Search Intent] Unexpected error in background job ${jobId}:`, err);
      });

      // Return job ID immediately (within milliseconds, no timeout)
      return res.status(202).json({
        job_id: jobId,
        status: 'processing',
        message: 'Content strategy generation started. Poll /api/job-status/:job_id for results.'
      });

    } catch (error) {
      console.error("[N8N Search Intent Proxy] Unexpected error:", error);
      return res.status(500).json({ message: "Failed to start N8N search intent job" });
    }
  });

  /**
   * Background processor for N8N Social Media Webhook
   */
  async function processN8NSocialMedia(jobId: string, payload: any) {
    try {
      console.log(`[N8N Social Media] Starting job ${jobId}`);

      const response = await fetch(
        "https://n8n.vietnhat.me/webhook/seo-tool-360-product-social",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": N8N_API_KEY!,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[N8N Social Media] Job ${jobId} failed:`, response.status, errorText);
        jobStore.set(jobId, {
          status: 'failed',
          error: `N8N webhook returned ${response.status}: ${errorText}`,
          startedAt: jobStore.get(jobId)!.startedAt,
          completedAt: Date.now()
        });
        return;
      }

      const data = await response.json();
      console.log(`[N8N Social Media] Job ${jobId} completed`);

      jobStore.set(jobId, {
        status: 'completed',
        result: data,
        startedAt: jobStore.get(jobId)!.startedAt,
        completedAt: Date.now()
      });

    } catch (error: any) {
      console.error(`[N8N Social Media] Job ${jobId} error:`, error);
      jobStore.set(jobId, {
        status: 'failed',
        error: error.message || 'Unknown error occurred',
        startedAt: jobStore.get(jobId)!.startedAt,
        completedAt: Date.now()
      });
    }
  }

  /**
   * Proxy for N8N Social Media Post Webhook (Async Pattern)
   * Returns job_id immediately, client polls /api/job-status/:job_id
   */
  app.post("/api/proxy/n8n/social-media", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!N8N_API_KEY) {
        return res.status(500).json({
          message: "Server configuration error: N8N_API_KEY not configured"
        });
      }

      // Generate unique job ID
      const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Store initial job status
      jobStore.set(jobId, {
        status: 'processing',
        startedAt: Date.now()
      });

      // Process in background
      processN8NSocialMedia(jobId, req.body).catch(err => {
        console.error(`[N8N Social Media] Unexpected error in background job ${jobId}:`, err);
      });

      // Return job ID immediately
      return res.status(202).json({
        job_id: jobId,
        status: 'processing',
        message: 'Social media post generation started. Poll /api/job-status/:job_id for results.'
      });

    } catch (error) {
      console.error("[N8N Social Media Proxy] Unexpected error:", error);
      return res.status(500).json({ message: "Failed to start N8N social media job" });
    }
  });

  /**
   * Background processor for Topical Authority Generation
   */
  async function processTopicalAuthority(jobId: string, data: { keyword_seed: string; keyword_ideas: Array<{ keyword: string; volume: number | null }> }) {
    try {
      const systemPrompt = `<?xml version="1.0" encoding="UTF-8"?>
<system_prompt>
  <role>
    <title>Topical Authority Map Architect</title>
    <description>
      Bạn là chuyên gia phân tích SEO chuyên sâu về Topical Authority và Content Architecture.
      Nhiệm vụ của bạn là phân tích keyword seed và keyword ideas để xây dựng bản đồ chủ đề
      SEO ngữ nghĩa hoàn chỉnh theo phương pháp Silo-Cluster-Pillar-Hub.
    </description>
  </role>

  <inputs>
    <input name="keyword_seed" type="string" required="true">
      <description>Từ khóa gốc chính (seed keyword) - đại diện cho chủ đề trung tâm</description>
      <example>optibac tím</example>
    </input>

    <input name="keyword_ideas" type="array" required="true">
      <description>Danh sách keyword ideas từ công cụ nghiên cứu từ khóa</description>
      <structure>
        <field name="keyword" type="string" description="Cụm từ khóa"/>
        <field name="avgMonthlySearches" type="integer" description="Lượng tìm kiếm trung bình/tháng"/>
        <field name="competition" type="string" description="Mức độ cạnh tranh (HIGH/MEDIUM/LOW)"/>
        <field name="competitionIndex" type="integer" description="Chỉ số cạnh tranh (0-100)"/>
        <field name="lowTopBid" type="float" description="Giá thầu thấp nhất" nullable="true"/>
        <field name="highTopBid" type="float" description="Giá thầu cao nhất" nullable="true"/>
      </structure>
    </input>

    <input name="source_context" type="object" optional="true">
      <description>Ngữ cảnh nguồn - thông tin về website/business</description>
      <fields>
        <field name="website_url" type="string"/>
        <field name="business_type" type="string"/>
        <field name="target_audience" type="string"/>
        <field name="brand_identity" type="string"/>
        <field name="monetization_model" type="string"/>
      </fields>
    </input>
  </inputs>

  <analysis_framework>
    <step1 name="identify_central_entity">
      <objective>Xác định Thực Thể Trung Tâm từ keyword seed</objective>
      <method>
        - Phân tích keyword seed để trích xuất đối tượng/khái niệm chính
        - Xác định loại thực thể (sản phẩm, dịch vụ, giải pháp, bệnh lý, v.v.)
        - Đặt tên chính xác cho Central Entity
      </method>
    </step1>

    <step2 name="identify_search_intent">
      <objective>Xác định các loại Search Intent chính</objective>
      <intent_types>
        <intent type="informational">Tìm hiểu thông tin (là gì, công dụng, thành phần)</intent>
        <intent type="navigational">Tìm sản phẩm/thương hiệu cụ thể (mua, giá, chính hãng)</intent>
        <intent type="transactional">Mua hàng/chuyển đổi (mua, đặt hàng, khuyến mãi)</intent>
        <intent type="commercial">So sánh/đánh giá (review, so sánh, tốt không)</intent>
        <intent type="problem_solving">Giải quyết vấn đề (cách dùng, khi nào uống, tác dụng phụ)</intent>
      </intent_types>
    </step2>

    <step3 name="semantic_clustering">
      <objective>Nhóm keyword ideas thành các cụm ngữ nghĩa</objective>
      <clustering_rules>
        <rule priority="1">Nhóm theo chủ đề chính (topic-based)</rule>
        <rule priority="2">Nhóm theo search intent (intent-based)</rule>
        <rule priority="3">Nhóm theo user journey stage (awareness → consideration → decision)</rule>
        <rule priority="4">Nhóm theo commercial value (high/medium/low conversion potential)</rule>
        <rule priority="5">Nhóm theo search volume và competition</rule>
      </clustering_rules>
    </step3>

    <step4 name="hierarchy_building">
      <objective>Xây dựng cấu trúc phân cấp nội dung</objective>
      <hierarchy>
        <level1 name="silo" description="Chủ đề lớn nhất - đại diện cho vertical/category chính"/>
        <level2 name="topic_cluster" description="Nhóm chủ đề con - tập hợp các topic liên quan"/>
        <level3 name="pillar_page" description="Trang trụ cột - content hub cho mỗi cluster"/>
        <level4 name="supporting_pages" description="Trang hỗ trợ - giải quyết câu hỏi cụ thể"/>
      </hierarchy>
    </step4>

    <step5 name="content_classification">
      <objective>Phân loại nội dung thành Core và Peripheral</objective>
      <core_content>
        <criteria>
          - Liên quan trực tiếp đến conversion/monetization
          - Giải quyết primary search intent
          - Trang sản phẩm/dịch vụ chính
          - High commercial value keywords
          - Hướng dẫn sử dụng chính
        </criteria>
      </core_content>
      <peripheral_content>
        <criteria>
          - Mở rộng kiến thức và chuyên môn
          - Giải quyết secondary/supporting intents
          - Blog posts, FAQs, guides
          - Low-medium commercial value keywords
          - Content marketing và brand awareness
        </criteria>
      </peripheral_content>
    </step5>

    <step6 name="internal_linking_strategy">
      <objective>Thiết lập chiến lược liên kết nội bộ</objective>
      <linking_patterns>
        <pattern type="hub_to_spoke">Pillar page → Supporting pages</pattern>
        <pattern type="spoke_to_hub">Supporting pages → Pillar page</pattern>
        <pattern type="lateral">Supporting page ↔ Supporting page (cùng cluster)</pattern>
        <pattern type="cross_cluster">Cluster A ↔ Cluster B (khi có liên quan)</pattern>
        <pattern type="peripheral_to_core">Peripheral → Core (để tăng authority)</pattern>
      </linking_patterns>
    </step6>

    <step7 name="iqqi_k2q_application">
      <objective>Áp dụng phương pháp IQQI và K2Q</objective>
      <iqqi>
        <description>Implicit Query Question Identification - Xác định câu hỏi ngầm trong query</description>
        <method>
          - Chuyển keyword thành câu hỏi người dùng thực sự đặt ra
          - Ví dụ: "optibac tím công dụng" → "Optibac tím có công dụng gì?"
          - Dùng câu hỏi này làm H1/Title
        </method>
      </iqqi>
      <k2q>
        <description>Keyword to Question - Chuyển keyword thành câu hỏi cho nội dung</description>
        <method>
          - Tạo danh sách câu hỏi từ related keywords
          - Mỗi câu hỏi trở thành một section/heading
          - Ví dụ: "cách dùng optibac tím" → H2: "Cách dùng Optibac tím đúng nhất là gì?"
        </method>
      </k2q>
    </step7>
  </analysis_framework>

  <output_structure>
    <json_schema>
      {
        "topical_authority_map": {
          "meta": {
            "keyword_seed": "string",
            "central_entity": "string",
            "entity_type": "string",
            "primary_search_intent": "string",
            "generated_at": "timestamp",
            "total_keywords_analyzed": "integer",
            "source_context": {
              "website": "string",
              "business_type": "string",
              "target_audience": "string"
            }
          },
          "silos": [
            {
              "silo_id": "string",
              "silo_name": "string",
              "silo_description": "string",
              "silo_type": "core | peripheral",
              "priority": "integer (1-10)",
              "estimated_traffic_potential": "integer",
              "topic_clusters": [
                {
                  "cluster_id": "string",
                  "cluster_name": "string",
                  "cluster_description": "string",
                  "cluster_intent": "informational | navigational | transactional | commercial | problem_solving",
                  "user_journey_stage": "awareness | consideration | decision | retention",
                  "pillar_page": {
                    "page_id": "string",
                    "page_title": "string",
                    "page_slug": "string",
                    "page_type": "pillar | hub",
                    "primary_keyword": "string",
                    "target_keywords": ["array of strings"],
                    "search_volume": "integer",
                    "competition": "string",
                    "content_brief": {
                      "iqqi_question": "string",
                      "target_word_count": "integer",
                      "required_sections": ["array of section titles"],
                      "semantic_entities": ["array of entities to cover"],
                      "lsi_terms": ["array of LSI terms"],
                      "internal_link_targets": ["array of page_ids to link to"]
                    },
                    "seo_metadata": {
                      "meta_title": "string (55-60 chars)",
                      "meta_description": "string (150-160 chars)",
                      "h1": "string",
                      "canonical_url": "string"
                    }
                  },
                  "supporting_pages": [
                    {
                      "page_id": "string",
                      "page_title": "string",
                      "page_slug": "string",
                      "page_type": "supporting | blog | faq | guide",
                      "parent_page_id": "string (pillar_page.page_id)",
                      "primary_keyword": "string",
                      "target_keywords": ["array of strings"],
                      "search_volume": "integer",
                      "competition": "string",
                      "content_brief": {
                        "iqqi_question": "string",
                        "k2q_questions": ["array of questions from keywords"],
                        "target_word_count": "integer",
                        "required_sections": ["array of section titles"],
                        "semantic_entities": ["array of entities"],
                        "lsi_terms": ["array of LSI terms"]
                      },
                      "internal_linking": {
                        "link_to_pillar": "boolean",
                        "link_to_related_supporting": ["array of page_ids"],
                        "link_to_other_clusters": ["array of page_ids"]
                      },
                      "seo_metadata": {
                        "meta_title": "string",
                        "meta_description": "string",
                        "h1": "string",
                        "canonical_url": "string"
                      }
                    }
                  ]
                }
              ]
            }
          ],
          "keyword_mapping": [
            {
              "keyword": "string",
              "assigned_to_page_id": "string",
              "keyword_role": "primary | secondary | supporting",
              "search_volume": "integer",
              "competition": "string",
              "intent": "string"
            }
          ],
          "internal_linking_graph": [
            {
              "from_page_id": "string",
              "to_page_id": "string",
              "link_type": "hub_to_spoke | spoke_to_hub | lateral | cross_cluster | peripheral_to_core",
              "anchor_text_suggestion": "string",
              "link_context": "string"
            }
          ],
          "content_gap_analysis": {
            "missing_topics": ["array of topics to cover"],
            "high_value_keywords_not_mapped": [
              {
                "keyword": "string",
                "search_volume": "integer",
                "suggested_page_type": "string"
              }
            ]
          },
          "implementation_roadmap": {
            "phase_1_priority_pages": ["array of page_ids"],
            "phase_2_supporting_content": ["array of page_ids"],
            "phase_3_peripheral_content": ["array of page_ids"],
            "estimated_timeline": "string"
          }
        }
      }
    </json_schema>
  </output_structure>

  <quality_criteria>
    <criterion name="semantic_coherence">
      Tất cả nội dung phải liên quan logic đến Central Entity và keyword seed
    </criterion>
    <criterion name="intent_coverage">
      Bao phủ đầy đủ các loại search intent: informational, navigational, transactional, commercial, problem-solving
    </criterion>
    <criterion name="hierarchy_clarity">
      Cấu trúc Silo → Cluster → Pillar → Supporting phải rõ ràng, không chồng chéo
    </criterion>
    <criterion name="keyword_distribution">
      Mỗi keyword chỉ được assign cho 1 page chính (có thể supporting cho nhiều page)
    </criterion>
    <criterion name="commercial_balance">
      Cân bằng giữa Core Content (conversion-focused) và Peripheral Content (authority-building)
    </criterion>
    <criterion name="internal_linking_logic">
      Mọi liên kết nội bộ phải có mục đích rõ ràng (authority flow, user journey, semantic relevance)
    </criterion>
    <criterion name="scalability">
      Cấu trúc phải dễ mở rộng khi có thêm keywords/topics mới
    </criterion>
  </quality_criteria>

  <execution_guidelines>
    <guideline priority="critical">
      Luôn bắt đầu bằng việc phân tích keyword seed để xác định Central Entity và Primary Intent
    </guideline>
    <guideline priority="critical">
      Phân loại keywords theo search volume và competition để ưu tiên Core Content
    </guideline>
    <guideline priority="high">
      Nhóm keywords có search volume cao (>100/tháng) vào Pillar Pages
    </guideline>
    <guideline priority="high">
      Nhóm long-tail keywords (<50/tháng) vào Supporting Pages
    </guideline>
    <guideline priority="medium">
      Tạo ít nhất 1 Pillar Page cho mỗi Topic Cluster
    </guideline>
    <guideline priority="medium">
      Mỗi Pillar Page nên có 3-7 Supporting Pages
    </guideline>
    <guideline priority="low">
      Sử dụng keyword variations để tạo anchor text đa dạng
    </guideline>
  </execution_guidelines>

  <examples>
    <example>
      <input>
        <keyword_seed>optibac tím</keyword_seed>
        <top_keywords>
          [
            {"keyword": "optibac tím", "avgMonthlySearches": 8100, "intent": "navigational"},
            {"keyword": "cách uống optibac tím", "avgMonthlySearches": 140, "intent": "problem_solving"},
            {"keyword": "công dụng optibac tím", "avgMonthlySearches": 90, "intent": "informational"},
            {"keyword": "giá optibac tím", "avgMonthlySearches": 50, "intent": "commercial"}
          ]
        </top_keywords>
      </input>
      <output_excerpt>
        {
          "central_entity": "Optibac Tím (Optibac Probiotics For Women)",
          "entity_type": "health_supplement_product",
          "primary_search_intent": "Find and learn about women's probiotic supplement for gynecological health",
          "silos": [
            {
              "silo_name": "Optibac Tím - Sản Phẩm & Mua Hàng",
              "silo_type": "core",
              "topic_clusters": [
                {
                  "cluster_name": "Thông Tin Sản Phẩm Chính",
                  "cluster_intent": "navigational + transactional",
                  "pillar_page": {
                    "page_title": "Optibac Tím: Men Vi Sinh Phụ Khoa Số 1 Từ Anh Quốc",
                    "primary_keyword": "optibac tím",
                    "iqqi_question": "Optibac Tím là gì và tại sao nên chọn?"
                  }
                }
              ]
            }
          ]
        }
      </output_excerpt>
    </example>
  </examples>

  <final_instructions>
    <instruction>
      Phân tích toàn bộ keyword_ideas input để không bỏ sót keyword nào
    </instruction>
    <instruction>
      Tạo cấu trúc JSON đầy đủ, chi tiết, và ready-to-implement
    </instruction>
    <instruction>
      Đảm bảo mọi page đều có IQQI question và K2Q questions rõ ràng
    </instruction>
    <instruction>
      Cung cấp internal linking graph cụ thể với anchor text suggestions
    </instruction>
    <instruction>
      Output phải là valid JSON có thể parse và sử dụng trực tiếp
    </instruction>
  </final_instructions>
</system_prompt>`;

      // Sort keywords by volume and limit to top 50
      const topKeywords = data.keyword_ideas
        .sort((a, b) => (b.volume || 0) - (a.volume || 0))
        .slice(0, 50);

      const userPrompt = `Phân tích keyword seed và keyword ideas sau để tạo Topical Authority Map:

**Keyword Seed**: ${data.keyword_seed}

**Keyword Ideas** (Top ${topKeywords.length} keywords by volume):
${topKeywords.map(kw => `- ${kw.keyword} (Volume: ${kw.volume || 0})`).join('\n')}

QUAN TRỌNG:
1. Phân bổ TẤT CẢ ${topKeywords.length} keywords vào các Pillar Pages và Supporting Pages
2. Keywords có volume cao (>500) → Pillar Pages (ít nhất 3-5 pages)
3. Keywords có volume trung bình (100-500) → Supporting Pages chính (5-10 pages)
4. Keywords có volume thấp (<100) → Supporting Pages phụ (10-15 pages)
5. Tạo 2-4 Silos (core và peripheral)
6. Mỗi Silo có 2-3 Topic Clusters
7. Mỗi Cluster có 1 Pillar Page và 3-7 Supporting Pages
8. Trả về ONLY valid JSON, không có markdown wrapper

Output format (must be valid JSON):
{
  "topical_authority_map": {
    "meta": { "keyword_seed": "...", "central_entity": "...", "primary_search_intent": "..." },
    "silos": [
      {
        "silo_name": "...",
        "silo_type": "core",
        "topic_clusters": [
          {
            "cluster_name": "...",
            "pillar_page": { "page_title": "...", "primary_keyword": "...", "search_volume": 0 },
            "supporting_pages": [
              { "page_title": "...", "primary_keyword": "...", "search_volume": 0 }
            ]
          }
        ]
      }
    ],
    "keyword_mapping": [],
    "internal_linking_graph": [],
    "content_gap_analysis": { "missing_topics": [] },
    "implementation_roadmap": { "phase_1_priority_pages": [] }
  }
}`;

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.APP_URL || "http://localhost:5000",
          "X-Title": "N8N Toolkit - Topical Authority",
        },
        body: JSON.stringify({
          model: "openai/gpt-4.1",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          max_tokens: 16000, // Increased from 6000 to ensure full JSON response
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Topical Authority] Job ${jobId} API request failed:`, response.status, errorText);
        jobStore.set(jobId, {
          status: 'failed',
          keyword: data.keyword_seed,
          error: `OpenAI API returned ${response.status}: ${errorText}`,
          startedAt: jobStore.get(jobId)!.startedAt,
          completedAt: Date.now()
        });
        return;
      }

      const result = await response.json();
      const resultText = result.choices[0].message.content;

      // 3-tier parsing strategy
      let taMap = null;
      try {
        taMap = JSON.parse(resultText);
      } catch (e1) {
        const codeBlockMatch = resultText.match(/```json\s*([\s\S]*?)\s*```/) ||
                              resultText.match(/```\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
          try {
            taMap = JSON.parse(codeBlockMatch[1]);
          } catch (e2) {
            const firstBrace = resultText.indexOf('{');
            const lastBrace = resultText.lastIndexOf('}');

            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
              const jsonStr = resultText.substring(firstBrace, lastBrace + 1);

              try {
                taMap = JSON.parse(jsonStr);
              } catch (e3) {
                console.error(`[Topical Authority] Job ${jobId} parsing failed:`, e3 instanceof Error ? e3.message : 'Unknown error');

                jobStore.set(jobId, {
                  status: 'failed',
                  keyword: data.keyword_seed,
                  error: `Failed to parse JSON response: ${e3 instanceof Error ? e3.message : 'Unknown error'}`,
                  startedAt: jobStore.get(jobId)!.startedAt,
                  completedAt: Date.now()
                });
                return;
              }
            } else {
              jobStore.set(jobId, {
                status: 'failed',
                keyword: data.keyword_seed,
                error: 'No valid JSON structure found in response',
                startedAt: jobStore.get(jobId)!.startedAt,
                completedAt: Date.now()
              });
              return;
            }
          }
        } else {
          jobStore.set(jobId, {
            status: 'failed',
            keyword: data.keyword_seed,
            error: 'No JSON found in response',
            startedAt: jobStore.get(jobId)!.startedAt,
            completedAt: Date.now()
          });
          return;
        }
      }

      if (taMap) {
        jobStore.set(jobId, {
          status: 'completed',
          keyword: data.keyword_seed,
          result: taMap,
          startedAt: jobStore.get(jobId)!.startedAt,
          completedAt: Date.now()
        });
      } else {
        jobStore.set(jobId, {
          status: 'failed',
          keyword: data.keyword_seed,
          error: 'Failed to extract valid JSON',
          startedAt: jobStore.get(jobId)!.startedAt,
          completedAt: Date.now()
        });
      }

    } catch (error: any) {
      console.error(`[Topical Authority] Job ${jobId} error:`, error);
      jobStore.set(jobId, {
        status: 'failed',
        keyword: data.keyword_seed,
        error: error.message || 'Unknown error occurred',
        startedAt: jobStore.get(jobId)!.startedAt,
        completedAt: Date.now()
      });
    }
  }

  /**
   * Background processor for N8N Internal Link Helper Webhook
   */
  async function processN8NInternalLink(jobId: string, payload: any) {
    try {
      console.log(`[N8N Internal Link] Starting job ${jobId}`);

      const response = await fetch(
        "https://n8n.vietnhat.me/webhook/seo-tool-360-internal-link",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": N8N_API_KEY!,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[N8N Internal Link] Job ${jobId} failed:`, response.status, errorText);
        jobStore.set(jobId, {
          status: 'failed',
          error: `N8N webhook returned ${response.status}: ${errorText}`,
          startedAt: jobStore.get(jobId)!.startedAt,
          completedAt: Date.now()
        });
        return;
      }

      const data = await response.json();
      console.log(`[N8N Internal Link] Job ${jobId} completed`);

      jobStore.set(jobId, {
        status: 'completed',
        result: data,
        startedAt: jobStore.get(jobId)!.startedAt,
        completedAt: Date.now()
      });

    } catch (error: any) {
      console.error(`[N8N Internal Link] Job ${jobId} error:`, error);
      jobStore.set(jobId, {
        status: 'failed',
        error: error.message || 'Unknown error occurred',
        startedAt: jobStore.get(jobId)!.startedAt,
        completedAt: Date.now()
      });
    }
  }

  /**
   * Proxy for Topical Authority Generation (Async Pattern)
   * Returns job_id immediately, client polls /api/job-status/:job_id
   * This avoids Heroku 30s timeout for GPT-4.1-mini generation (30-90s)
   */
  app.post("/api/proxy/topical-authority", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!OPENAI_API_KEY) {
        return res.status(500).json({
          message: "Server configuration error: OPENAI_API_KEY not configured"
        });
      }

      const validation = topicalAuthoritySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          message: "Invalid request data",
          errors: validation.error.issues,
        });
      }

      // Generate unique job ID
      const jobId = generateJobId();

      // Store initial job status
      jobStore.set(jobId, {
        status: 'processing',
        keyword: validation.data.keyword_seed,
        startedAt: Date.now()
      });

      // Process in background (don't await)
      processTopicalAuthority(jobId, validation.data).catch(err => {
        console.error(`[Topical Authority] Unexpected error in background job ${jobId}:`, err);
      });

      // Return job ID immediately (within milliseconds, no timeout)
      return res.status(202).json({
        job_id: jobId,
        status: 'processing',
        message: 'Topical authority generation started. Poll /api/job-status/:job_id for results.'
      });

    } catch (error) {
      console.error("[Topical Authority Proxy] Unexpected error:", error);
      return res.status(500).json({ message: "Failed to start topical authority generation job" });
    }
  });

  /**
   * Proxy for N8N Internal Link Helper Webhook (Async Pattern)
   * Returns job_id immediately, client polls /api/job-status/:job_id
   */
  app.post("/api/proxy/n8n/internal-link", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!N8N_API_KEY) {
        return res.status(500).json({
          message: "Server configuration error: N8N_API_KEY not configured"
        });
      }

      // Generate unique job ID
      const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Store initial job status
      jobStore.set(jobId, {
        status: 'processing',
        startedAt: Date.now()
      });

      // Process in background
      processN8NInternalLink(jobId, req.body).catch(err => {
        console.error(`[N8N Internal Link] Unexpected error in background job ${jobId}:`, err);
      });

      // Return job ID immediately
      return res.status(202).json({
        job_id: jobId,
        status: 'processing',
        message: 'Internal link suggestions generation started. Poll /api/job-status/:job_id for results.'
      });

    } catch (error) {
      console.error("[N8N Internal Link Proxy] Unexpected error:", error);
      return res.status(500).json({ message: "Failed to start N8N internal link job" });
    }
  });

  /**
   * Proxy for N8N Topical Authority webhook (fire-and-forget)
   */
  app.post("/api/proxy/n8n/topical-authority", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!N8N_API_KEY) {
        return res.status(500).json({
          message: "Server configuration error: N8N_API_KEY not configured"
        });
      }

      const validation = topicalAuthorityWebhookSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          message: "Invalid webhook payload",
          errors: validation.error.issues,
        });
      }

      const webhookUrl = "https://n8n.nhathuocvietnhat.vn/webhook/seotool-360-topical-authority-2025-10-13";
      const payload = validation.data;

      console.log("[N8N Topical Authority] Forwarding payload for keyword:", payload.keyword_seed);

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": N8N_API_KEY,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      let parsedResponse: unknown = null;

      try {
        parsedResponse = responseText ? JSON.parse(responseText) : null;
      } catch (parseError) {
        parsedResponse = responseText;
      }

      if (!response.ok) {
        console.error("[N8N Topical Authority] Webhook failed:", response.status, response.statusText, responseText);
        return res.status(response.status).json({
          message: "N8N webhook request failed",
          status: response.status,
          response: parsedResponse,
        });
      }

      console.log("[N8N Topical Authority] Webhook delivered successfully with status", response.status);

      return res.json({
        message: "Webhook delivered successfully",
        status: response.status,
        response: parsedResponse,
      });

    } catch (error) {
      console.error("[N8N Topical Authority] Unexpected error:", error);
      return res.status(500).json({
        message: "Failed to forward Topical Authority webhook",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // ============================================
  // JOB STATUS ENDPOINT (for async N8N webhooks)
  // ============================================

  /**
   * Get job status for async webhook processing
   * Used by clients to poll for N8N search intent results
   */
  app.get("/api/job-status/:job_id", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { job_id } = req.params;
      const job = jobStore.get(job_id);

      if (!job) {
        return res.status(404).json({
          message: "Job not found. It may have expired (jobs are kept for 10 minutes)."
        });
      }

      return res.json({
        job_id,
        status: job.status,
        keyword: job.keyword,
        result: job.result,
        error: job.error,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        duration: job.completedAt ? job.completedAt - job.startedAt : Date.now() - job.startedAt
      });

    } catch (error) {
      console.error("[Job Status] Unexpected error:", error);
      return res.status(500).json({ message: "Failed to retrieve job status" });
    }
  });
}
