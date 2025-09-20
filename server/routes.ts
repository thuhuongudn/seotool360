import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { activateToolSchema, insertSocialMediaPostSchema, insertInternalLinkSuggestionSchema, insertUserToolAccessSchema, insertAdminAuditLogSchema } from "@shared/schema";
import { createClient } from "@supabase/supabase-js";
import { authMiddleware, requireAdmin, type AuthenticatedRequest } from "./auth-middleware";

// Validate required environment variables at startup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ CRITICAL: Missing required environment variables');
  console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Initialize Supabase admin client
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

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
  app.post("/api/seo-tools/activate", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
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

      // Load user profile once so we can determine admin bypass
      const userProfile = await storage.getProfile(req.user!.id);
      const isAdmin = userProfile?.role === 'admin';
      
      if (tool.status !== "active" && !isAdmin) {
        return res.status(400).json({ message: "SEO tool is not active" });
      }

      // Check if tool is premium and requires permission
      // Since isPremium field doesn't exist yet, use name-based check
      const isPremium = (tool.name !== 'markdown-html' && tool.name !== 'qr-code');
      
      if (isPremium && !isAdmin) {
        // Premium tool - check user permissions for non-admins
        const userAccess = await storage.getUserToolAccess(req.user!.id);
        const hasAccess = userAccess.some(access => access.toolId === toolId);
        
        if (!hasAccess) {
          return res.status(403).json({ 
            message: "Access denied. You don't have permission to use this tool." 
          });
        }
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

  // Update a specific tool (PUT /api/seo-tools/:id) - Admin only
  app.put("/api/seo-tools/:id", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      
      // Validate that tool exists first
      const existingTool = await storage.getSeoTool(id);
      if (!existingTool) {
        return res.status(404).json({ message: "SEO tool not found" });
      }
      
      const updatedTool = await storage.updateSeoTool(id, req.body);
      
      if (!updatedTool) {
        return res.status(404).json({ message: "SEO tool not found" });
      }
      
      // Create audit log for tool modification
      try {
        await storage.createAuditLog({
          actorId: req.user!.id,
          action: 'update_tool',
          subjectUserId: req.user!.id, // Admin modifying tool
          metadata: { toolId: id, changes: req.body, timestamp: new Date().toISOString() }
        });
      } catch (auditError) {
        // Log audit error but don't fail the main operation
        console.warn('Audit log creation failed (likely duplicate):', auditError);
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

  // ============================================
  // ADMIN ROUTES
  // ============================================

  // SEO Tools Management (existing)
  app.get("/api/admin/seo-tools", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tools = await storage.getAllSeoToolsForAdmin();
      res.json(tools);
    } catch (error) {
      console.error("Error fetching SEO tools for admin:", error);
      res.status(500).json({ message: "Failed to fetch SEO tools" });
    }
  });

  app.patch("/api/admin/seo-tools/:id/status", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
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

  // ============================================
  // USER PROFILE ROUTES
  // ============================================
  
  // Get current user profile (authenticated users only)
  app.get("/api/users/me", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const profile = await storage.getProfile(req.user.id);
      
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      
      // Return profile with email from Supabase user
      res.json({
        ...profile,
        email: req.user.email
      });
    } catch (error) {
      console.error("Error fetching current user profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  // Get user's tool access permissions for a specific tool
  app.get("/api/user/tool-access/:toolId", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = req.user.id;
      const { toolId } = req.params;

      // ADMIN BYPASS: Admin accounts have access to all tools
      const userProfile = await storage.getProfile(userId);
      const isAdmin = userProfile?.role === 'admin';
      
      if (isAdmin) {
        // Return synthetic permission for admin bypass
        res.json([{
          id: 'admin-bypass',
          userId: userId,
          toolId: toolId,
          permission: 'use',
          grantedBy: userId,
          createdAt: new Date()
        }]);
        return;
      }

      const userToolAccess = await storage.getUserToolAccess(userId);
      const hasAccess = userToolAccess.filter(access => access.toolId === toolId);
      
      res.json(hasAccess);
    } catch (error) {
      console.error("Error fetching user tool access:", error);
      res.status(500).json({ message: "Failed to fetch tool access" });
    }
  });

  // Cleanup duplicate tools (admin only)
  app.post("/api/admin/cleanup-duplicate-tools", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      console.log('🧹 Starting cleanup of duplicate tools...');
      
      // Get all tools grouped by name
      const allTools = await storage.getAllSeoToolsForAdmin();
      console.log(`Found ${allTools.length} total tools in database`);
      
      // Group tools by name and find duplicates
      const toolsByName = allTools.reduce((acc, tool) => {
        if (!acc[tool.name]) {
          acc[tool.name] = [];
        }
        acc[tool.name].push(tool);
        return acc;
      }, {} as { [key: string]: any[] });
      
      let duplicatesRemoved = 0;
      
      // For each tool name, keep the first one and delete the rest
      for (const [toolName, tools] of Object.entries(toolsByName)) {
        if (tools.length > 1) {
          console.log(`🔍 Found ${tools.length} duplicates for ${toolName}`);
          
          // Sort by ID to keep the earliest one
          tools.sort((a, b) => a.id.localeCompare(b.id));
          const keepTool = tools[0]; // Keep the first one
          const toolsToDelete = tools.slice(1); // Remove all except first
          
          for (const tool of toolsToDelete) {
            const success = await storage.deleteSeoToolWithDependencies(tool.id, keepTool.id);
            if (success) {
              duplicatesRemoved++;
              console.log(`🗑️  Deleted duplicate ${toolName}: ${tool.id}`);
            } else {
              console.warn(`⚠️  Failed to delete duplicate ${toolName}: ${tool.id}`);
            }
          }
        }
      }
      
      console.log(`✅ Cleanup completed! Removed ${duplicatesRemoved} duplicate tools`);
      
      // Get final count
      const finalTools = await storage.getAllSeoToolsForAdmin();
      console.log(`📊 Final tool count: ${finalTools.length}`);
      
      res.json({
        message: `Successfully removed ${duplicatesRemoved} duplicate tools`,
        duplicatesRemoved,
        finalToolCount: finalTools.length
      });
      
    } catch (error) {
      console.error("Error cleaning duplicate tools:", error);
      res.status(500).json({ message: "Failed to cleanup duplicate tools" });
    }
  });

  // ============================================
  // ADMIN USER MANAGEMENT ROUTES
  // ============================================

  // Create new user
  app.post("/api/admin/users", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { email, password, username, role } = req.body;
      
      // Validate required fields
      if (!email || !password || !username || !role) {
        return res.status(400).json({ 
          message: "Email, password, username, and role are required" 
        });
      }
      
      if (password.length < 8) {
        return res.status(400).json({ 
          message: "Password must be at least 8 characters long" 
        });
      }
      
      if (!['admin', 'member'].includes(role)) {
        return res.status(400).json({ 
          message: "Role must be 'admin' or 'member'" 
        });
      }
      
      // Check if user already exists
      const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) {
        console.error("Error listing users:", listError);
        return res.status(500).json({ message: "Failed to check existing users" });
      }
      
      const existingUser = existingUsers.users.find(user => user.email === email);
      if (existingUser) {
        return res.status(409).json({ message: "User with this email already exists" });
      }
      
      // Create user in Supabase Auth
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });
      
      if (createError) {
        console.error("Supabase user creation error:", createError);
        return res.status(500).json({ message: "Failed to create user account" });
      }
      
      if (!newUser.user) {
        return res.status(500).json({ message: "User creation failed" });
      }
      
      // Create profile in database
      const profileData = {
        userId: newUser.user.id,
        username,
        role: role as 'admin' | 'member',
        isActive: true
      };
      
      const profile = await storage.createProfile(profileData);
      
      // Create audit log
      try {
        await storage.createAuditLog({
          actorId: req.user!.id,
          action: 'create_user',
          subjectUserId: newUser.user.id,
          metadata: { 
            email,
            username,
            role,
            created_at: new Date().toISOString()
          }
        });
      } catch (auditError) {
        // Log audit error but don't fail the main operation
        console.warn('Audit log creation failed (likely duplicate):', auditError);
      }
      
      res.status(201).json({
        ...profile,
        email: newUser.user.email
      });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Get all users with pagination
  app.get("/api/admin/users", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const result = await storage.getAllProfiles(limit, offset);
      res.json(result);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Get specific user details
  app.get("/api/admin/users/:userId", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const profile = await storage.getProfile(userId);
      
      if (!profile) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get user's tool access and settings
      const toolAccess = await storage.getUserToolAccess(userId);
      const toolSettings = await storage.getUserToolSettings(userId);
      
      res.json({
        ...profile,
        toolAccess,
        toolSettings
      });
    } catch (error) {
      console.error("Error fetching user details:", error);
      res.status(500).json({ message: "Failed to fetch user details" });
    }
  });

  // Update user profile
  app.patch("/api/admin/users/:userId", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const { username, role } = req.body;
      
      if (role && !['admin', 'member'].includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be 'admin' or 'member'" });
      }
      
      const updatedProfile = await storage.updateProfile(userId, { username, role });
      
      if (!updatedProfile) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Create audit log
      try {
        await storage.createAuditLog({
          actorId: req.user!.id, // Use authenticated admin ID
          action: 'update_user',
          subjectUserId: userId,
          metadata: { changes: { username, role } }
        });
      } catch (auditError) {
        // Log audit error but don't fail the main operation
        console.warn('Audit log creation failed (likely duplicate):', auditError);
      }
      
      res.json(updatedProfile);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update user profile" });
    }
  });

  // Toggle user status (activate/deactivate)
  app.patch("/api/admin/users/:userId/status", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const { isActive } = req.body;
      
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: "isActive must be a boolean" });
      }
      
      const updatedProfile = await storage.toggleUserStatus(userId, isActive);
      
      if (!updatedProfile) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Create audit log
      try {
        await storage.createAuditLog({
          actorId: req.user!.id, // Use authenticated admin ID
          action: isActive ? 'activate_user' : 'deactivate_user',
          subjectUserId: userId,
          metadata: { isActive }
        });
      } catch (auditError) {
        // Log audit error but don't fail the main operation
        console.warn('Audit log creation failed (likely duplicate):', auditError);
      }
      
      res.json(updatedProfile);
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  // Reset user password
  app.post("/api/admin/users/:userId/reset-password", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const { newPassword } = req.body;
      
      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
      }
      
      // Use Supabase Admin API to update password
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword
      });
      
      if (error) {
        console.error("Supabase password reset error:", error);
        return res.status(500).json({ message: "Failed to reset password" });
      }
      
      // Create audit log
      try {
        await storage.createAuditLog({
          actorId: req.user!.id, // Use authenticated admin ID
          action: 'reset_password',
          subjectUserId: userId,
          metadata: { timestamp: new Date().toISOString() }
        });
      } catch (auditError) {
        // Log audit error but don't fail the main operation
        console.warn('Audit log creation failed (likely duplicate):', auditError);
      }
      
      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // ============================================
  // PERMISSION MANAGEMENT ROUTES
  // ============================================

  // Get all user tool access records
  app.get("/api/admin/permissions", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const permissions = await storage.getAllUserToolAccess(limit);
      res.json(permissions);
    } catch (error) {
      console.error("Error fetching permissions:", error);
      res.status(500).json({ message: "Failed to fetch permissions" });
    }
  });

  // Grant tool access to user
  app.post("/api/admin/permissions/grant", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validation = insertUserToolAccessSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          message: "Invalid request data",
          errors: validation.error.issues
        });
      }

      const access = await storage.grantToolAccess(validation.data);
      
      // Create audit log - handle duplicate constraint gracefully
      try {
        await storage.createAuditLog({
          actorId: req.user!.id, // Use authenticated admin ID
          action: 'grant_tool_access',
          subjectUserId: validation.data.userId,
          metadata: { 
            toolId: validation.data.toolId,
            permission: validation.data.permission,
            timestamp: new Date().toISOString() // Add timestamp for uniqueness
          }
        });
      } catch (auditError) {
        // Log audit error but don't fail the main operation
        console.warn('Audit log creation failed (likely duplicate):', auditError);
      }
      
      res.json(access);
    } catch (error) {
      console.error("Error granting tool access:", error);
      res.status(500).json({ message: "Failed to grant tool access" });
    }
  });

  // Revoke tool access from user
  app.delete("/api/admin/permissions/:userId/:toolId", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId, toolId } = req.params;
      
      const success = await storage.revokeToolAccess(userId, toolId);
      
      if (!success) {
        return res.status(404).json({ message: "Permission not found" });
      }
      
      // Create audit log
      try {
        await storage.createAuditLog({
          actorId: req.user!.id, // Use authenticated admin ID
          action: 'revoke_tool_access',
          subjectUserId: userId,
          metadata: { toolId }
        });
      } catch (auditError) {
        // Log audit error but don't fail the main operation
        console.warn('Audit log creation failed (likely duplicate):', auditError);
      }
      
      res.json({ message: "Tool access revoked successfully" });
    } catch (error) {
      console.error("Error revoking tool access:", error);
      res.status(500).json({ message: "Failed to revoke tool access" });
    }
  });

  // ============================================
  // SETTINGS MANAGEMENT ROUTES
  // ============================================

  // Get user tool settings
  app.get("/api/admin/users/:userId/settings", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const toolId = req.query.toolId as string;
      
      const settings = await storage.getUserToolSettings(userId, toolId);
      res.json(settings);
    } catch (error) {
      console.error("Error fetching user settings:", error);
      res.status(500).json({ message: "Failed to fetch user settings" });
    }
  });

  // Update user tool settings
  app.patch("/api/admin/users/:userId/settings/:toolId", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId, toolId } = req.params;
      const { settings } = req.body;
      
      const updatedSettings = await storage.updateToolSettings(userId, toolId, settings);
      
      if (!updatedSettings) {
        return res.status(500).json({ message: "Failed to update settings" });
      }
      
      // Create audit log
      try {
        await storage.createAuditLog({
          actorId: req.user!.id, // Use authenticated admin ID
          action: 'update_user_settings',
          subjectUserId: userId,
          metadata: { toolId, settings }
        });
      } catch (auditError) {
        // Log audit error but don't fail the main operation
        console.warn('Audit log creation failed (likely duplicate):', auditError);
      }
      
      res.json(updatedSettings);
    } catch (error) {
      console.error("Error updating user settings:", error);
      res.status(500).json({ message: "Failed to update user settings" });
    }
  });

  // ============================================
  // AUDIT LOG ROUTES
  // ============================================

  // Get admin audit logs with pagination
  app.get("/api/admin/audit-logs", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const result = await storage.getAuditLogs(limit, offset);
      res.json(result);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // ============================================
  // SESSION MANAGEMENT ROUTES
  // ============================================

  // Get user sessions (via Supabase Auth)
  app.get("/api/admin/users/:userId/sessions", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      
      // Get user sessions from Supabase Auth
      const { data: user, error } = await supabaseAdmin.auth.admin.getUserById(userId);
      
      if (error) {
        return res.status(500).json({ message: "Failed to fetch user sessions" });
      }
      
      res.json({
        userId: user.user?.id,
        email: user.user?.email,
        lastSignInAt: user.user?.last_sign_in_at,
        emailConfirmedAt: user.user?.email_confirmed_at,
        createdAt: user.user?.created_at,
        updatedAt: user.user?.updated_at
      });
    } catch (error) {
      console.error("Error fetching user sessions:", error);
      res.status(500).json({ message: "Failed to fetch user sessions" });
    }
  });

  // Force user logout (revoke sessions)
  app.post("/api/admin/users/:userId/logout", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      
      // Sign out user sessions via Supabase Auth Admin
      const { error } = await supabaseAdmin.auth.admin.signOut(userId);
      
      if (error) {
        return res.status(500).json({ message: "Failed to logout user" });
      }
      
      // Create audit log
      try {
        await storage.createAuditLog({
          actorId: req.user!.id, // Use authenticated admin ID
          action: 'force_logout',
          subjectUserId: userId,
          metadata: { timestamp: new Date().toISOString() }
        });
      } catch (auditError) {
        // Log audit error but don't fail the main operation
        console.warn('Audit log creation failed (likely duplicate):', auditError);
      }
      
      res.json({ message: "User logged out successfully" });
    } catch (error) {
      console.error("Error logging out user:", error);
      res.status(500).json({ message: "Failed to logout user" });
    }
  });

  // ============================================
  // ADMIN USER TOOL ACCESS MANAGEMENT ROUTES
  // ============================================

  // Get user's tool access permissions (admin only)
  app.get("/api/admin/users/:userId/tool-access", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      
      const userToolAccess = await storage.getUserToolAccess(userId);
      res.json(userToolAccess);
    } catch (error) {
      console.error("Error fetching user tool access:", error);
      res.status(500).json({ message: "Failed to fetch user tool access" });
    }
  });

  // Grant tool access to user (admin only)
  app.post("/api/admin/users/:userId/tool-access", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const { toolId } = req.body;
      
      if (!toolId) {
        return res.status(400).json({ message: "Tool ID is required" });
      }
      
      // Validate that the tool exists
      const tool = await storage.getSeoTool(toolId);
      if (!tool) {
        return res.status(404).json({ message: "Tool not found" });
      }
      
      // Validate that the user profile exists
      const userProfile = await storage.getProfile(userId);
      if (!userProfile) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if user already has access
      const existingAccess = await storage.getUserToolAccess(userId);
      const hasAccess = existingAccess.some(access => access.toolId === toolId);
      
      if (hasAccess) {
        return res.status(400).json({ message: "User already has access to this tool" });
      }
      
      // Grant access
      await storage.grantToolAccess({ 
        userId, 
        toolId, 
        permission: 'use',
        grantedBy: req.user!.id 
      });
      
      // Create audit log
      try {
        await storage.createAuditLog({
          actorId: req.user!.id,
          action: 'grant_tool_access',
          subjectUserId: userId,
          metadata: { toolId, timestamp: new Date().toISOString() }
        });
      } catch (auditError) {
        // Log audit error but don't fail the main operation
        console.warn('Audit log creation failed (likely duplicate):', auditError);
      }
      
      res.json({ message: "Tool access granted successfully" });
    } catch (error) {
      console.error("Error granting tool access:", error);
      res.status(500).json({ message: "Failed to grant tool access" });
    }
  });

  // Revoke tool access from user (admin only)
  app.delete("/api/admin/users/:userId/tool-access/:toolId", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId, toolId } = req.params;
      
      // Validate that the tool exists
      const tool = await storage.getSeoTool(toolId);
      if (!tool) {
        return res.status(404).json({ message: "Tool not found" });
      }
      
      // Validate that the user profile exists
      const userProfile = await storage.getProfile(userId);
      if (!userProfile) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Enhanced debugging for permission revoke failures
      // Check current permissions before revoking
      const currentPermissions = await storage.getUserToolAccess(userId);
      const hasMatchingPermission = currentPermissions.some(p => p.toolId === toolId);
      
      console.log('Permission revoke attempt - Debug info:', {
        userId,
        toolId,
        userExists: !!userProfile,
        currentPermissionsCount: currentPermissions.length,
        userPermissions: currentPermissions.map(p => ({ toolId: p.toolId, permission: p.permission })),
        hasMatchingPermission,
        actorId: req.user!.id
      });
      
      // Revoke access
      const success = await storage.revokeToolAccess(userId, toolId);
      
      if (!success) {
        return res.status(404).json({ 
          message: "Permission not found or already revoked", 
          debug: { 
            userId, 
            toolId, 
            userPermissions: currentPermissions.map(p => p.toolId),
            hasMatchingPermission 
          } 
        });
      }
      
      // Create audit log
      try {
        await storage.createAuditLog({
          actorId: req.user!.id,
          action: 'revoke_tool_access',
          subjectUserId: userId,
          metadata: { toolId, timestamp: new Date().toISOString() }
        });
      } catch (auditError) {
        // Log audit error but don't fail the main operation
        console.warn('Audit log creation failed (likely duplicate):', auditError);
      }
      
      res.json({ message: "Tool access revoked successfully" });
    } catch (error) {
      console.error("Error revoking tool access:", error);
      res.status(500).json({ message: "Failed to revoke tool access" });
    }
  });

  // ============================================
  // SECURITY: BOOTSTRAP ENDPOINT REMOVED
  // ============================================
  
  // Bootstrap endpoint has been removed after successful ROOT admin setup
  // This eliminates the security vulnerability of unauthenticated admin escalation

  const httpServer = createServer(app);
  return httpServer;
}
