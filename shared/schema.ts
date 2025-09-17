import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, jsonb, serial } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const seoTools = pgTable("seo_tools", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  iconBgColor: text("icon_bg_color").notNull(),
  iconColor: text("icon_color").notNull(),
  category: text("category").notNull(),
  n8nEndpoint: text("n8n_endpoint"),
  status: text("status").notNull().default("active"), // active | pending
});

export const toolExecutions = pgTable("tool_executions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  toolId: varchar("tool_id").notNull(),
  input: jsonb("input"),
  output: jsonb("output"),
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  error: text("error"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  duration: text("duration"), // human readable duration like "2.5s"
});

export const socialMediaPosts = pgTable("social_media_posts", {
  id: serial("id").primaryKey(),
  postType: text("post_type").notNull(), // Loại bài viết
  title: text("title").notNull(), // Tiêu đề (tên sản phẩm hoặc bài blog)
  framework: text("framework"), // Framework
  writingStyle: text("writing_style"), // Phong cách viết  
  structure: text("structure"), // Cấu trúc bài viết
  maxWords: text("max_words"), // Số từ tối đa
  hashtags: text("hashtags"), // Hashtag bài viết
  result: text("result"), // Kết quả từ response
  createdAt: timestamp("created_at").notNull().defaultNow(), // Thời gian
});

export const internalLinkSuggestions = pgTable("internal_link_suggestions", {
  id: serial("id").primaryKey(),
  postType: text("post_type").notNull(), // Loại bài viết (product | article)
  title: text("title").notNull(), // Tiêu đề
  primaryKeywords: text("primary_keywords"), // Từ khóa chính (phân cách bằng dấu phẩy)
  secondaryKeywords: text("secondary_keywords"), // Từ khóa phụ (phân cách bằng dấu phẩy)
  draftContent: text("draft_content"), // Nội dung mẫu
  result: text("result"), // Kết quả từ response
  createdAt: timestamp("created_at").notNull().defaultNow(), // Ngày tạo
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertSeoToolSchema = createInsertSchema(seoTools).omit({
  id: true,
});

export const insertSocialMediaPostSchema = createInsertSchema(socialMediaPosts).omit({
  id: true,
  createdAt: true,
});

export const insertInternalLinkSuggestionSchema = createInsertSchema(internalLinkSuggestions).omit({
  id: true,
  createdAt: true,
});

// Relations
export const seoToolsRelations = relations(seoTools, ({ many }) => ({
  executions: many(toolExecutions),
}));

export const toolExecutionsRelations = relations(toolExecutions, ({ one }) => ({
  tool: one(seoTools, {
    fields: [toolExecutions.toolId],
    references: [seoTools.id],
  }),
}));

// Schemas
export const insertToolExecutionSchema = createInsertSchema(toolExecutions).omit({
  id: true,
  startedAt: true,
});

export const activateToolSchema = z.object({
  toolId: z.string(),
  input: z.record(z.any()).optional(),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type SeoTool = typeof seoTools.$inferSelect;
export type InsertSeoTool = z.infer<typeof insertSeoToolSchema>;
export type ToolExecution = typeof toolExecutions.$inferSelect;
export type InsertToolExecution = z.infer<typeof insertToolExecutionSchema>;
export type SocialMediaPost = typeof socialMediaPosts.$inferSelect;
export type InsertSocialMediaPost = z.infer<typeof insertSocialMediaPostSchema>;
export type InternalLinkSuggestion = typeof internalLinkSuggestions.$inferSelect;
export type InsertInternalLinkSuggestion = z.infer<typeof insertInternalLinkSuggestionSchema>;
export type ActivateToolRequest = z.infer<typeof activateToolSchema>;
