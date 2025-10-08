import type { Express, Response } from "express";
import { authMiddleware, type AuthenticatedRequest } from "../auth-middleware";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * Test endpoint to verify OpenAI API connectivity
 */
export function registerTestRoutes(app: Express) {
  app.get("/api/test/openai", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!OPENAI_API_KEY) {
        return res.status(500).json({
          success: false,
          message: "OPENAI_API_KEY not configured"
        });
      }

      console.log("[Test OpenAI] Making test request...");

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.APP_URL || "http://localhost:5000",
          "X-Title": "N8N Toolkit - API Test",
        },
        body: JSON.stringify({
          model: "openai/gpt-3.5-turbo",
          messages: [
            {
              role: "user",
              content: "Say 'Hello, this is a test!' and nothing else."
            }
          ],
          max_tokens: 50,
          temperature: 0.7,
        }),
      });

      const responseText = await response.text();
      console.log("[Test OpenAI] Status:", response.status);
      console.log("[Test OpenAI] Response:", responseText.substring(0, 500));

      if (!response.ok) {
        return res.status(500).json({
          success: false,
          message: "OpenRouter API request failed",
          status: response.status,
          details: responseText
        });
      }

      const data = JSON.parse(responseText);

      return res.json({
        success: true,
        message: "OpenAI API is working",
        model: data.model,
        hasChoices: !!data.choices,
        choicesLength: data.choices?.length,
        hasContent: !!data.choices?.[0]?.message?.content,
        content: data.choices?.[0]?.message?.content,
        fullResponse: data
      });

    } catch (error: any) {
      console.error("[Test OpenAI] Error:", error);
      return res.status(500).json({
        success: false,
        message: "Test failed",
        error: error.message
      });
    }
  });
}
