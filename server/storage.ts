import { type SeoTool, type InsertSeoTool, type ToolExecution, type InsertToolExecution, type SocialMediaPost, type InsertSocialMediaPost, type InternalLinkSuggestion, type InsertInternalLinkSuggestion, type Profile, type InsertProfile, type UserToolAccess, type InsertUserToolAccess, type AdminAuditLog, type InsertAdminAuditLog, type ToolSettings, type InsertToolSettings, seoTools, toolExecutions, socialMediaPosts, internalLinkSuggestions, profiles, userToolAccess, adminAuditLog, toolSettings } from "@shared/schema";
import { supabaseDb as db } from "./supabase";
import { eq, sql, desc, and, like, count } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // SEO Tools Management
  getAllSeoTools(): Promise<SeoTool[]>;
  getAllSeoToolsForAdmin(): Promise<SeoTool[]>;
  getSeoTool(id: string): Promise<SeoTool | undefined>;
  createSeoTool(tool: InsertSeoTool): Promise<SeoTool>;
  updateSeoTool(id: string, tool: Partial<InsertSeoTool>): Promise<SeoTool | undefined>;
  updateSeoToolStatus(id: string, status: 'active' | 'pending'): Promise<SeoTool | undefined>;
  
  // User Management (Admin Operations)
  getAllProfiles(limit?: number, offset?: number): Promise<{ profiles: Profile[], total: number }>;
  getProfile(userId: string): Promise<Profile | undefined>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  updateProfile(userId: string, update: Partial<InsertProfile>): Promise<Profile | undefined>;
  toggleUserStatus(userId: string, isActive: boolean): Promise<Profile | undefined>;
  
  // User Tool Access Management
  getUserToolAccess(userId: string): Promise<UserToolAccess[]>;
  getAllUserToolAccess(limit?: number): Promise<UserToolAccess[]>;
  grantToolAccess(access: InsertUserToolAccess): Promise<UserToolAccess>;
  revokeToolAccess(userId: string, toolId: string): Promise<boolean>;
  
  // Tool Settings Management
  getUserToolSettings(userId: string, toolId?: string): Promise<ToolSettings[]>;
  updateToolSettings(userId: string, toolId: string, settings: any): Promise<ToolSettings | undefined>;
  
  // Admin Audit Log
  getAuditLogs(limit?: number, offset?: number): Promise<{ logs: AdminAuditLog[], total: number }>;
  createAuditLog(log: InsertAdminAuditLog): Promise<AdminAuditLog>;
  
  // Tool execution methods
  createToolExecution(execution: InsertToolExecution): Promise<ToolExecution>;
  updateToolExecution(id: string, update: Partial<InsertToolExecution>): Promise<ToolExecution | undefined>;
  getToolExecution(id: string): Promise<ToolExecution | undefined>;
  getToolExecutions(limit?: number): Promise<ToolExecution[]>;
  getToolExecutionsByTool(toolId: string, limit?: number): Promise<ToolExecution[]>;
  
  // Social media post methods
  createSocialMediaPost(post: InsertSocialMediaPost): Promise<SocialMediaPost>;
  getSocialMediaPost(id: number): Promise<SocialMediaPost | undefined>;
  getAllSocialMediaPosts(limit?: number): Promise<SocialMediaPost[]>;
  
  // Internal link suggestion methods
  createInternalLinkSuggestion(suggestion: InsertInternalLinkSuggestion): Promise<InternalLinkSuggestion>;
  getInternalLinkSuggestion(id: number): Promise<InternalLinkSuggestion | undefined>;
  getAllInternalLinkSuggestions(limit?: number): Promise<InternalLinkSuggestion[]>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    this.initializeDefaultTools();
    this.ensureInternalLinkSuggestionsTable();
  }

  private async ensureInternalLinkSuggestionsTable() {
    try {
      // Try to query the table to check if it exists
      await db.select().from(internalLinkSuggestions).limit(1);
    } catch (error) {
      // Table doesn't exist, create it using raw SQL 
      // Security policies will be applied via migration script
      console.log('Creating internal_link_suggestions table...');
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS internal_link_suggestions (
          id SERIAL PRIMARY KEY,
          post_type TEXT NOT NULL,
          title TEXT NOT NULL,
          primary_keywords TEXT,
          secondary_keywords TEXT,
          draft_content TEXT,
          result TEXT,
          owner_id TEXT REFERENCES profiles(user_id),
          tool_id CHARACTER VARYING REFERENCES seo_tools(id),
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
      console.log('internal_link_suggestions table created');
      console.log('⚠️  SECURITY: Run setup-rls-policies.sql to enable RLS and create security policies');
    }
  }

  private async migrateAiWritingToInternalLink() {
    try {
      // Find the ai-writing tool
      const tools = await db.select().from(seoTools).where(eq(seoTools.name, 'ai-writing'));
      
      if (tools.length > 0) {
        const aiWritingTool = tools[0];
        console.log('Migrating ai-writing tool to internal-link-helper...');
        
        // Update the tool to internal-link-helper
        await db.update(seoTools)
          .set({
            name: 'internal-link-helper',
            title: 'Gợi ý internal link',
            description: 'Tạo gợi ý liên kết nội bộ thông minh cho bài viết để cải thiện SEO và trải nghiệm người dùng.',
            icon: 'Link',
            iconBgColor: 'bg-green-100',
            iconColor: 'text-green-600',
            n8nEndpoint: '/n8n/internal-link-helper'
          })
          .where(eq(seoTools.id, aiWritingTool.id));
        
        console.log('Successfully migrated ai-writing to internal-link-helper');
      }
    } catch (error) {
      console.error('Error migrating ai-writing tool:', error);
    }
  }

  private async initializeDefaultTools() {
    // Always ensure we have all tools - force sync with schema
    await this.migrateAiWritingToInternalLink();
    await this.ensureAllToolsExist();

    const defaultTools: Omit<SeoTool, 'id'>[] = [
      {
        name: 'topical-map',
        title: 'Xây dựng Topical Map',
        description: 'Tạo bản đồ chủ đề toàn diện để không định vị thế chuyên gia (Topical Authority).',
        icon: 'Sitemap',
        iconBgColor: 'bg-purple-100',
        iconColor: 'text-purple-600',
        category: 'content-seo',
        n8nEndpoint: '/n8n/topical-map',
        status: "active"
      },
      {
        name: 'search-intent',
        title: 'Phân tích Search Intent',
        description: 'Thấu hiểu ý định tìm kiếm đằng sau mỗi từ khóa để xây dựng nội dung đúng mục tiêu.',
        icon: 'Search',
        iconBgColor: 'bg-blue-100',
        iconColor: 'text-blue-600',
        category: 'content-seo',
        n8nEndpoint: '/n8n/search-intent',
        status: "active"
      },
      {
        name: 'internal-link-helper',
        title: 'Gợi ý internal link',
        description: 'Tạo gợi ý liên kết nội bộ thông minh cho bài viết để cải thiện SEO và trải nghiệm người dùng.',
        icon: 'Link',
        iconBgColor: 'bg-green-100',
        iconColor: 'text-green-600',
        category: 'content-seo',
        n8nEndpoint: '/n8n/internal-link-helper',
        status: "active"
      },
      {
        name: 'article-rewriter',
        title: 'Viết lại bài AI',
        description: 'Tái tạo nội dung từ một link thành một bài viết mới, độc đáo và chuẩn SEO.',
        icon: 'RotateCcw',
        iconBgColor: 'bg-red-100',
        iconColor: 'text-red-600',
        category: 'content-seo',
        n8nEndpoint: '/n8n/article-rewriter',
        status: "active"
      },
      {
        name: 'social-media',
        title: 'Viết bài Mạng Xã Hội',
        description: 'Tạo các bài đăng Facebook, Instagram... sáng tạo và thu hút chỉ trong vài giây.',
        icon: 'Share2',
        iconBgColor: 'bg-cyan-100',
        iconColor: 'text-cyan-600',
        category: 'content-seo',
        n8nEndpoint: '/n8n/social-media',
        status: "active"
      },
      {
        name: 'bing-indexing',
        title: 'Gửi Index Bing',
        description: 'Thông báo cho Bing và các công cụ tìm kiếm khác qua IndexNow API.',
        icon: 'Globe',
        iconBgColor: 'bg-blue-100',
        iconColor: 'text-blue-600',
        category: 'index',
        n8nEndpoint: '/n8n/bing-indexing',
        status: "active"
      },
      {
        name: 'google-indexing',
        title: 'Gửi Index Google',
        description: 'Chủ động gửi yêu cầu của Index, cập nhật hoặc xóa URL đến Google qua API.',
        icon: 'Globe2',
        iconBgColor: 'bg-green-100',
        iconColor: 'text-green-600',
        category: 'index',
        n8nEndpoint: '/n8n/google-indexing',
        status: "active"
      },
      {
        name: 'google-checker',
        title: 'Kiểm tra Google Index',
        description: 'Xác định nhanh trang thái index của hàng loạt URL trên Google.',
        icon: 'SearchCheck',
        iconBgColor: 'bg-indigo-100',
        iconColor: 'text-indigo-600',
        category: 'index',
        n8nEndpoint: '/n8n/google-checker',
        status: "active"
      },
      {
        name: 'schema-markup',
        title: 'Tạo Schema Markup',
        description: 'Tự động tạo mã JSON-LD cho các loại schema phổ biến như Article, FAQ, How-to.',
        icon: 'Code',
        iconBgColor: 'bg-yellow-100',
        iconColor: 'text-yellow-600',
        category: 'content-seo',
        n8nEndpoint: '/n8n/schema-markup',
        status: "active"
      },
      {
        name: 'image-seo',
        title: 'Tối ưu SEO Hình ảnh',
        description: 'Tự động thêm metadata, geotag và các thông tin SEO quan trọng khác vào ảnh.',
        icon: 'Image',
        iconBgColor: 'bg-pink-100',
        iconColor: 'text-pink-600',
        category: 'seo',
        n8nEndpoint: '/n8n/image-seo',
        status: "active"
      },
      {
        name: 'markdown-html',
        title: 'Markdown to HTML',
        description: 'Chuyển đổi văn bản Markdown sang mã HTML sạch một cách nhanh chóng và tiện lợi.',
        icon: 'FileCode',
        iconBgColor: 'bg-orange-100',
        iconColor: 'text-orange-600',
        category: 'tools',
        n8nEndpoint: '/n8n/markdown-html',
        status: "active"
      },
      {
        name: 'qr-code',
        title: 'Tạo mã QR Code',
        description: 'Tạo mã QR miễn phí cho link, VCard, số điện thoại, Google Maps và nhiều hơn nữa.',
        icon: 'QrCode',
        iconBgColor: 'bg-teal-100',
        iconColor: 'text-teal-600',
        category: 'tools',
        n8nEndpoint: '/n8n/qr-code',
        status: "active"
      }
    ];

    // Insert tools into database
    await db.insert(seoTools).values(defaultTools);
  }

  private async ensureAllToolsExist() {
    const defaultTools: Omit<SeoTool, 'id'>[] = [
      {
        name: 'topical-map',
        title: 'Xây dựng Topical Map',
        description: 'Tạo bản đồ chủ đề toàn diện để không định vị thế chuyên gia (Topical Authority).',
        icon: 'Sitemap',
        iconBgColor: 'bg-purple-100',
        iconColor: 'text-purple-600',
        category: 'content-seo',
        n8nEndpoint: '/n8n/topical-map',
        status: "active"
      },
      {
        name: 'search-intent',
        title: 'Phân tích Search Intent',
        description: 'Thấu hiểu ý định tìm kiếm đằng sau mỗi từ khóa để xây dựng nội dung đúng mục tiêu.',
        icon: 'Search',
        iconBgColor: 'bg-blue-100',
        iconColor: 'text-blue-600',
        category: 'content-seo',
        n8nEndpoint: '/n8n/search-intent',
        status: "active"
      },
      {
        name: 'internal-link-helper',
        title: 'Gợi ý internal link',
        description: 'Tạo gợi ý liên kết nội bộ thông minh cho bài viết để cải thiện SEO và trải nghiệm người dùng.',
        icon: 'Link',
        iconBgColor: 'bg-green-100',
        iconColor: 'text-green-600',
        category: 'content-seo',
        n8nEndpoint: '/n8n/internal-link-helper',
        status: "active"
      },
      {
        name: 'article-rewriter',
        title: 'Viết lại bài AI',
        description: 'Tái tạo nội dung từ một link thành một bài viết mới, độc đáo và chuẩn SEO.',
        icon: 'RotateCcw',
        iconBgColor: 'bg-red-100',
        iconColor: 'text-red-600',
        category: 'content-seo',
        n8nEndpoint: '/n8n/article-rewriter',
        status: "active"
      },
      {
        name: 'social-media',
        title: 'Viết bài Mạng Xã Hội',
        description: 'Tạo các bài đăng Facebook, Instagram... sáng tạo và thu hút chỉ trong vài giây.',
        icon: 'Share2',
        iconBgColor: 'bg-cyan-100',
        iconColor: 'text-cyan-600',
        category: 'content-seo',
        n8nEndpoint: '/n8n/social-media',
        status: "active"
      },
      {
        name: 'bing-indexing',
        title: 'Gửi Index Bing',
        description: 'Thông báo cho Bing và các công cụ tìm kiếm khác qua IndexNow API.',
        icon: 'Globe',
        iconBgColor: 'bg-blue-100',
        iconColor: 'text-blue-600',
        category: 'index',
        n8nEndpoint: '/n8n/bing-indexing',
        status: "active"
      },
      {
        name: 'google-indexing',
        title: 'Gửi Index Google',
        description: 'Chủ động gửi yêu cầu của Index, cập nhật hoặc xóa URL đến Google qua API.',
        icon: 'Globe2',
        iconBgColor: 'bg-green-100',
        iconColor: 'text-green-600',
        category: 'index',
        n8nEndpoint: '/n8n/google-indexing',
        status: "active"
      },
      {
        name: 'google-checker',
        title: 'Kiểm tra Google Index',
        description: 'Xác định nhanh trang thái index của hàng loạt URL trên Google.',
        icon: 'SearchCheck',
        iconBgColor: 'bg-indigo-100',
        iconColor: 'text-indigo-600',
        category: 'index',
        n8nEndpoint: '/n8n/google-checker',
        status: "active"
      },
      {
        name: 'schema-markup',
        title: 'Tạo Schema Markup',
        description: 'Tự động tạo mã JSON-LD cho các loại schema phổ biến như Article, FAQ, How-to.',
        icon: 'Code',
        iconBgColor: 'bg-yellow-100',
        iconColor: 'text-yellow-600',
        category: 'content-seo',
        n8nEndpoint: '/n8n/schema-markup',
        status: "active"
      },
      {
        name: 'image-seo',
        title: 'Tối ưu SEO Hình ảnh',
        description: 'Tự động thêm metadata, geotag và các thông tin SEO quan trọng khác vào ảnh.',
        icon: 'Image',
        iconBgColor: 'bg-pink-100',
        iconColor: 'text-pink-600',
        category: 'seo',
        n8nEndpoint: '/n8n/image-seo',
        status: "active"
      },
      {
        name: 'markdown-html',
        title: 'Markdown to HTML',
        description: 'Chuyển đổi văn bản Markdown sang mã HTML sạch một cách nhanh chóng và tiện lợi.',
        icon: 'FileCode',
        iconBgColor: 'bg-orange-100',
        iconColor: 'text-orange-600',
        category: 'tools',
        n8nEndpoint: '/n8n/markdown-html',
        status: "active"
      },
      {
        name: 'qr-code',
        title: 'Tạo mã QR Code',
        description: 'Tạo mã QR miễn phí cho link, VCard, số điện thoại, Google Maps và nhiều hơn nữa.',
        icon: 'QrCode',
        iconBgColor: 'bg-teal-100',
        iconColor: 'text-teal-600',
        category: 'tools',
        n8nEndpoint: '/n8n/qr-code',
        status: "active"
      }
    ];

    // Upsert all tools - insert if not exists, update if exists
    for (const tool of defaultTools) {
      try {
        const existing = await db.select().from(seoTools).where(eq(seoTools.name, tool.name));
        
        if (existing.length === 0) {
          // Tool doesn't exist, insert it
          await db.insert(seoTools).values(tool);
          console.log(`✓ Inserted missing tool: ${tool.name}`);
        } else {
          // Tool exists, update it to ensure latest data
          await db.update(seoTools)
            .set(tool)
            .where(eq(seoTools.name, tool.name));
          console.log(`✓ Updated existing tool: ${tool.name}`);
        }
      } catch (error) {
        console.error(`Failed to upsert tool ${tool.name}:`, error);
      }
    }
    
    console.log('✓ All SEO tools synchronized with schema');
  }

  // User management methods removed - now using Supabase Auth + profiles table

  async getAllSeoTools(): Promise<SeoTool[]> {
    return await db.select().from(seoTools).where(eq(seoTools.status, "active"));
  }

  async getSeoTool(id: string): Promise<SeoTool | undefined> {
    const [tool] = await db.select().from(seoTools).where(eq(seoTools.id, id));
    return tool || undefined;
  }

  async createSeoTool(insertTool: InsertSeoTool): Promise<SeoTool> {
    const [tool] = await db.insert(seoTools).values(insertTool).returning();
    return tool;
  }

  async getAllSeoToolsForAdmin(): Promise<SeoTool[]> {
    return await db.select().from(seoTools);
  }

  async updateSeoTool(id: string, updateData: Partial<InsertSeoTool>): Promise<SeoTool | undefined> {
    const [updated] = await db.update(seoTools)
      .set(updateData)
      .where(eq(seoTools.id, id))
      .returning();
    return updated || undefined;
  }

  async updateSeoToolStatus(id: string, status: 'active' | 'pending'): Promise<SeoTool | undefined> {
    const [updated] = await db.update(seoTools)
      .set({ status })
      .where(eq(seoTools.id, id))
      .returning();
    return updated || undefined;
  }

  // Tool execution methods
  async createToolExecution(execution: InsertToolExecution): Promise<ToolExecution> {
    const [created] = await db.insert(toolExecutions).values(execution).returning();
    return created;
  }

  async updateToolExecution(id: string, update: Partial<InsertToolExecution>): Promise<ToolExecution | undefined> {
    const [updated] = await db.update(toolExecutions)
      .set(update)
      .where(eq(toolExecutions.id, id))
      .returning();
    return updated || undefined;
  }

  async getToolExecution(id: string): Promise<ToolExecution | undefined> {
    const [execution] = await db.select().from(toolExecutions).where(eq(toolExecutions.id, id));
    return execution || undefined;
  }

  async getToolExecutions(limit: number = 50): Promise<ToolExecution[]> {
    return await db.select().from(toolExecutions)
      .orderBy(sql`${toolExecutions.startedAt} DESC`)
      .limit(limit);
  }

  async getToolExecutionsByTool(toolId: string, limit: number = 50): Promise<ToolExecution[]> {
    return await db.select().from(toolExecutions)
      .where(eq(toolExecutions.toolId, toolId))
      .orderBy(sql`${toolExecutions.startedAt} DESC`)
      .limit(limit);
  }

  // Social media post methods
  async createSocialMediaPost(post: InsertSocialMediaPost): Promise<SocialMediaPost> {
    const [created] = await db.insert(socialMediaPosts).values(post).returning();
    return created;
  }

  async getSocialMediaPost(id: number): Promise<SocialMediaPost | undefined> {
    const [post] = await db.select().from(socialMediaPosts).where(eq(socialMediaPosts.id, id));
    return post || undefined;
  }

  async getAllSocialMediaPosts(limit: number = 50): Promise<SocialMediaPost[]> {
    return await db.select().from(socialMediaPosts)
      .orderBy(sql`${socialMediaPosts.createdAt} DESC`)
      .limit(limit);
  }

  // Internal link suggestion methods
  async createInternalLinkSuggestion(suggestion: InsertInternalLinkSuggestion): Promise<InternalLinkSuggestion> {
    const [created] = await db.insert(internalLinkSuggestions).values(suggestion).returning();
    return created;
  }

  async getInternalLinkSuggestion(id: number): Promise<InternalLinkSuggestion | undefined> {
    const [suggestion] = await db.select().from(internalLinkSuggestions).where(eq(internalLinkSuggestions.id, id));
    return suggestion || undefined;
  }

  async getAllInternalLinkSuggestions(limit: number = 50): Promise<InternalLinkSuggestion[]> {
    return await db.select().from(internalLinkSuggestions)
      .orderBy(sql`${internalLinkSuggestions.createdAt} DESC`)
      .limit(limit);
  }

  // ============================================
  // USER MANAGEMENT METHODS
  // ============================================

  async getAllProfiles(limit: number = 50, offset: number = 0): Promise<{ profiles: Profile[], total: number }> {
    // Get profiles with pagination
    const profilesResult = await db.select().from(profiles)
      .orderBy(desc(profiles.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ count: totalCount }] = await db.select({ count: count() }).from(profiles);

    return {
      profiles: profilesResult,
      total: totalCount
    };
  }

  async getProfile(userId: string): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
    return profile || undefined;
  }

  async createProfile(profile: InsertProfile): Promise<Profile> {
    const [createdProfile] = await db.insert(profiles).values(profile).returning();
    return createdProfile;
  }

  async updateProfile(userId: string, update: Partial<InsertProfile>): Promise<Profile | undefined> {
    const [updated] = await db.update(profiles)
      .set(update)
      .where(eq(profiles.userId, userId))
      .returning();
    return updated || undefined;
  }

  async toggleUserStatus(userId: string, isActive: boolean): Promise<Profile | undefined> {
    const [updated] = await db.update(profiles)
      .set({ isActive })
      .where(eq(profiles.userId, userId))
      .returning();
    return updated || undefined;
  }

  // ============================================
  // USER TOOL ACCESS MANAGEMENT
  // ============================================

  async getUserToolAccess(userId: string): Promise<UserToolAccess[]> {
    return await db.select().from(userToolAccess)
      .where(eq(userToolAccess.userId, userId))
      .orderBy(desc(userToolAccess.createdAt));
  }

  async getAllUserToolAccess(limit: number = 100): Promise<UserToolAccess[]> {
    return await db.select().from(userToolAccess)
      .orderBy(desc(userToolAccess.createdAt))
      .limit(limit);
  }

  async grantToolAccess(access: InsertUserToolAccess): Promise<UserToolAccess> {
    // Use upsert to handle duplicate grants gracefully
    const [granted] = await db
      .insert(userToolAccess)
      .values(access)
      .onConflictDoUpdate({
        target: [userToolAccess.userId, userToolAccess.toolId],
        set: {
          permission: access.permission,
          grantedBy: access.grantedBy,
          createdAt: new Date()
        }
      })
      .returning();
    console.log('Tool access granted/updated:', { userId: access.userId, toolId: access.toolId });
    return granted;
  }

  async revokeToolAccess(userId: string, toolId: string): Promise<boolean> {
    const result = await db.delete(userToolAccess)
      .where(and(eq(userToolAccess.userId, userId), eq(userToolAccess.toolId, toolId)))
      .returning();
    const success = result.length > 0;
    console.log('Permission revoke attempt:', {
      userId, toolId, 
      rowsAffected: result.length,
      success: success
    });
    return success;
  }

  // ============================================
  // TOOL SETTINGS MANAGEMENT
  // ============================================

  async getUserToolSettings(userId: string, toolId?: string): Promise<ToolSettings[]> {
    const conditions = [eq(toolSettings.userId, userId)];
    
    if (toolId) {
      conditions.push(eq(toolSettings.toolId, toolId));
    }
    
    return await db.select().from(toolSettings)
      .where(and(...conditions))
      .orderBy(desc(toolSettings.updatedAt));
  }

  async updateToolSettings(userId: string, toolId: string, settings: any): Promise<ToolSettings | undefined> {
    const [updated] = await db.insert(toolSettings)
      .values({
        userId,
        toolId,
        settings,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: [toolSettings.userId, toolSettings.toolId],
        set: {
          settings,
          updatedAt: new Date()
        }
      })
      .returning();
    return updated || undefined;
  }

  // ============================================
  // ADMIN AUDIT LOG
  // ============================================

  async getAuditLogs(limit: number = 50, offset: number = 0): Promise<{ logs: AdminAuditLog[], total: number }> {
    // Get logs with pagination
    const logsResult = await db.select().from(adminAuditLog)
      .orderBy(desc(adminAuditLog.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ count: totalCount }] = await db.select({ count: count() }).from(adminAuditLog);

    return {
      logs: logsResult,
      total: totalCount
    };
  }

  async createAuditLog(log: InsertAdminAuditLog): Promise<AdminAuditLog> {
    const [created] = await db.insert(adminAuditLog)
      .values(log)
      .returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
