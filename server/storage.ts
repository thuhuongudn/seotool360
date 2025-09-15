import { type User, type InsertUser, type SeoTool, type InsertSeoTool, type ToolExecution, type InsertToolExecution, users, seoTools, toolExecutions } from "@shared/schema";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllSeoTools(): Promise<SeoTool[]>;
  getSeoTool(id: string): Promise<SeoTool | undefined>;
  createSeoTool(tool: InsertSeoTool): Promise<SeoTool>;
  updateSeoTool(id: string, tool: Partial<InsertSeoTool>): Promise<SeoTool | undefined>;
  // Tool execution methods
  createToolExecution(execution: InsertToolExecution): Promise<ToolExecution>;
  updateToolExecution(id: string, update: Partial<InsertToolExecution>): Promise<ToolExecution | undefined>;
  getToolExecution(id: string): Promise<ToolExecution | undefined>;
  getToolExecutions(limit?: number): Promise<ToolExecution[]>;
  getToolExecutionsByTool(toolId: string, limit?: number): Promise<ToolExecution[]>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    this.initializeDefaultTools();
  }

  private async initializeDefaultTools() {
    // Check if tools already exist
    const existingTools = await db.select().from(seoTools).limit(1);
    if (existingTools.length > 0) {
      return; // Tools already initialized
    }

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
        isActive: true
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
        isActive: true
      },
      {
        name: 'ai-writing',
        title: 'Viết bài AI',
        description: 'Tạo bài viết chuẩn SEO chất lượng cao chỉ trong vài phút với sức mạnh của trí tuệ nhân tạo.',
        icon: 'PenTool',
        iconBgColor: 'bg-green-100',
        iconColor: 'text-green-600',
        category: 'content-seo',
        n8nEndpoint: '/n8n/ai-writing',
        isActive: true
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
        isActive: true
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
        isActive: true
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
        isActive: true
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
        isActive: true
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
        isActive: true
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
        isActive: true
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
        isActive: true
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
        isActive: true
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
        isActive: true
      }
    ];

    // Insert tools into database
    await db.insert(seoTools).values(defaultTools);
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllSeoTools(): Promise<SeoTool[]> {
    return await db.select().from(seoTools).where(eq(seoTools.isActive, true));
  }

  async getSeoTool(id: string): Promise<SeoTool | undefined> {
    const [tool] = await db.select().from(seoTools).where(eq(seoTools.id, id));
    return tool || undefined;
  }

  async createSeoTool(insertTool: InsertSeoTool): Promise<SeoTool> {
    const [tool] = await db.insert(seoTools).values(insertTool).returning();
    return tool;
  }

  async updateSeoTool(id: string, updateData: Partial<InsertSeoTool>): Promise<SeoTool | undefined> {
    const [updated] = await db.update(seoTools)
      .set(updateData)
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
}

export const storage = new DatabaseStorage();
