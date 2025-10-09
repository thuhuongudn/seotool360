import type { Express, Response } from "express";
import { authMiddleware, type AuthenticatedRequest } from "../auth-middleware";
import { z } from "zod";

// Validate that required API keys exist
const SERPER_API_KEY = process.env.SERPER_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // Direct Gemini API key
const GEMINI_IMAGE_KEY = process.env.GEMINI_2_5_FLASH_IMG; // OpenRouter key for image gen
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const GOONG_API_KEY = process.env.GOONG_API_KEY; // Goong Maps API key
const N8N_API_KEY = process.env.N8N_API_KEY; // N8N webhook API key

// Job queue for async N8N webhooks (to handle Heroku 30s timeout)
interface JobStatus {
  status: 'processing' | 'completed' | 'failed';
  keyword?: string;
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

      // Set timeout for scraping (60 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      try {
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
          return res.status(response.status).json({
            message: "Firecrawl API request failed",
            details: errorText
          });
        }

        const data = await response.json();
        return res.json(data);

      } catch (fetchError: any) {
        clearTimeout(timeoutId);

        if (fetchError.name === 'AbortError') {
          return res.status(408).json({
            message: "Scraping request timed out after 60 seconds"
          });
        }
        throw fetchError;
      }

    } catch (error) {
      console.error("[Firecrawl Proxy] Unexpected error:", error);
      return res.status(500).json({ message: "Failed to scrape URL" });
    }
  });

  // ============================================
  // GEMINI IMAGE API PROXY
  // ============================================

  /**
   * Proxy for Gemini Image Generation API (via OpenRouter)
   * Protects GEMINI_IMAGE_KEY from client exposure
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
          model: 'google/gemini-2.5-flash-image-preview',
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
   * Proxy for Goong Maps Geocoding API
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
        "https://n8n.nhathuocvietnhat.vn/webhook/seo-tool-360-search-intent-2025-09-26",
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
        "https://n8n.nhathuocvietnhat.vn/webhook/seo-tool-360-product-social",
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
   * Background processor for N8N Internal Link Helper Webhook
   */
  async function processN8NInternalLink(jobId: string, payload: any) {
    try {
      console.log(`[N8N Internal Link] Starting job ${jobId}`);

      const response = await fetch(
        "https://n8n.nhathuocvietnhat.vn/webhook/seo-tool-360-internal-link",
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
