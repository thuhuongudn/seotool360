import type { Express, Response } from "express";
import { authMiddleware, type AuthenticatedRequest } from "../auth-middleware";
import { z } from "zod";

// Validate that required API keys exist
const SERPER_API_KEY = process.env.SERPER_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_2_5_FLASH_IMG;
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

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
   * Protects GEMINI_API_KEY from client exposure
   */
  app.post("/api/proxy/gemini/generate-image", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!GEMINI_API_KEY) {
        return res.status(500).json({
          message: "Server configuration error: GEMINI_API_KEY not configured"
        });
      }

      const { prompt } = req.body;

      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ message: "Valid prompt is required" });
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GEMINI_API_KEY}`,
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
}
