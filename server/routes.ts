import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { activateToolSchema, insertSocialMediaPostSchema, insertInternalLinkSuggestionSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all SEO tools
  app.get("/api/seo-tools", async (req: Request, res: Response) => {
    try {
      const tools = await storage.getAllSeoTools();
      res.json(tools);
    } catch (error) {
      console.error("Error fetching SEO tools:", error);
      res.status(500).json({ message: "Failed to fetch SEO tools" });
    }
  });

  // Get a specific SEO tool
  app.get("/api/seo-tools/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const tool = await storage.getSeoTool(id);
      
      if (!tool) {
        return res.status(404).json({ message: "SEO tool not found" });
      }
      
      res.json(tool);
    } catch (error) {
      console.error("Error fetching SEO tool:", error);
      res.status(500).json({ message: "Failed to fetch SEO tool" });
    }
  });

  // Activate a SEO tool (calls n8n API)
  app.post("/api/seo-tools/activate", async (req: Request, res: Response) => {
    try {
      const validation = activateToolSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid request data",
          errors: validation.error.issues 
        });
      }

      const { toolId, input } = validation.data;
      const tool = await storage.getSeoTool(toolId);
      
      if (!tool) {
        return res.status(404).json({ message: "SEO tool not found" });
      }

      if (tool.status !== "active") {
        return res.status(400).json({ message: "SEO tool is not active" });
      }

      // TODO: Call n8n API endpoint
      // This is where you would make the actual API call to n8n
      // const n8nResponse = await fetch(`${process.env.N8N_BASE_URL}${tool.n8nEndpoint}`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${process.env.N8N_API_KEY}`,
      //   },
      //   body: JSON.stringify(input || {})
      // });
      
      // For now, return a success response with placeholder data
      res.json({
        success: true,
        toolId: tool.id,
        toolName: tool.name,
        message: `${tool.title} has been activated successfully`,
        // result: n8nResponse.data // This would contain the actual n8n response
        result: {
          status: "processing",
          message: "Your request has been submitted and is being processed",
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error("Error activating SEO tool:", error);
      res.status(500).json({ message: "Failed to activate SEO tool" });
    }
  });

  // Create social media post
  app.post("/api/social-media-posts", async (req: Request, res: Response) => {
    try {
      const validation = insertSocialMediaPostSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          message: "Invalid request data", 
          errors: validation.error.issues
        });
      }

      const socialMediaPost = await storage.createSocialMediaPost(validation.data);
      res.json(socialMediaPost);
    } catch (error) {
      console.error("Error creating social media post:", error);
      res.status(500).json({ message: "Failed to save social media post" });
    }
  });

  // Get all social media posts
  app.get("/api/social-media-posts", async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const posts = await storage.getAllSocialMediaPosts(limit);
      res.json(posts);
    } catch (error) {
      console.error("Error fetching social media posts:", error);
      res.status(500).json({ message: "Failed to fetch social media posts" });
    }
  });

  // Update a specific tool (PUT /api/seo-tools/:id)
  app.put("/api/seo-tools/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updatedTool = await storage.updateSeoTool(id, req.body);
      
      if (!updatedTool) {
        return res.status(404).json({ message: "SEO tool not found" });
      }
      
      res.json(updatedTool);
    } catch (error) {
      console.error("Error updating SEO tool:", error);
      res.status(500).json({ message: "Failed to update SEO tool" });
    }
  });


  // Get tools by category
  app.get("/api/seo-tools/category/:category", async (req: Request, res: Response) => {
    try {
      const { category } = req.params;
      const tools = await storage.getAllSeoTools();
      const filteredTools = tools.filter(tool => tool.category === category);
      res.json(filteredTools);
    } catch (error) {
      console.error("Error fetching tools by category:", error);
      res.status(500).json({ message: "Failed to fetch tools by category" });
    }
  });

  // Create internal link suggestion
  app.post("/api/internal-link-suggestions", async (req: Request, res: Response) => {
    try {
      const validation = insertInternalLinkSuggestionSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          message: "Invalid request data", 
          errors: validation.error.issues
        });
      }

      const suggestion = await storage.createInternalLinkSuggestion(validation.data);
      res.json(suggestion);
    } catch (error) {
      console.error("Error creating internal link suggestion:", error);
      res.status(500).json({ message: "Failed to save internal link suggestion" });
    }
  });

  // Get all internal link suggestions
  app.get("/api/internal-link-suggestions", async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const suggestions = await storage.getAllInternalLinkSuggestions(limit);
      res.json(suggestions);
    } catch (error) {
      console.error("Error fetching internal link suggestions:", error);
      res.status(500).json({ message: "Failed to fetch internal link suggestions" });
    }
  });

  // Admin routes
  // Get all SEO tools for admin (including pending ones)
  app.get("/api/admin/seo-tools", async (req: Request, res: Response) => {
    try {
      const tools = await storage.getAllSeoToolsForAdmin();
      res.json(tools);
    } catch (error) {
      console.error("Error fetching SEO tools for admin:", error);
      res.status(500).json({ message: "Failed to fetch SEO tools" });
    }
  });

  // Update SEO tool status
  app.patch("/api/admin/seo-tools/:id/status", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!status || !['active', 'pending'].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Must be 'active' or 'pending'" });
      }
      
      const updatedTool = await storage.updateSeoToolStatus(id, status);
      
      if (!updatedTool) {
        return res.status(404).json({ message: "SEO tool not found" });
      }
      
      res.json(updatedTool);
    } catch (error) {
      console.error("Error updating SEO tool status:", error);
      res.status(500).json({ message: "Failed to update SEO tool status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
