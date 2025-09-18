import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, jsonb, serial, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Legacy users table removed - now using Supabase auth with profiles table

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
  // TODO: Add isPremium field when database migration is ready
});

export const toolExecutions = pgTable("tool_executions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  toolId: varchar("tool_id").notNull().references(() => seoTools.id),
  ownerId: text("owner_id").references(() => profiles.userId), // FK to profiles.user_id (nullable for existing data)
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
  ownerId: text("owner_id").references(() => profiles.userId), // FK to profiles.user_id (nullable for existing data)
  toolId: varchar("tool_id").references(() => seoTools.id), // FK to seo_tools.id (required, no default)
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
  ownerId: text("owner_id").references(() => profiles.userId), // FK to profiles.user_id (nullable for existing data)
  toolId: varchar("tool_id").references(() => seoTools.id), // FK to seo_tools.id (required, no default)
  createdAt: timestamp("created_at").notNull().defaultNow(), // Ngày tạo
});

// Auth and User Management Tables (aligned with actual DB structure)
export const profiles = pgTable("profiles", {
  userId: text("user_id").primaryKey(), // FK to auth.users.id (varchar in Supabase)
  username: text("username").notNull().unique(),
  role: text("role").notNull().default("member"), // 'admin' | 'member'
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userToolAccess = pgTable("user_tool_access", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().references(() => profiles.userId), // FK to profiles.user_id
  toolId: varchar("tool_id").notNull().references(() => seoTools.id), // FK to seo_tools.id - FIXED: match varchar type
  permission: text("permission").notNull(), // 'use' | 'manage'
  grantedBy: text("granted_by").notNull().references(() => profiles.userId), // FK to profiles.user_id
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userToolUniqueIdx: sql`CREATE UNIQUE INDEX IF NOT EXISTS user_tool_unique_idx ON ${table} (${table.userId}, ${table.toolId})`,
}));

export const toolSettings = pgTable("tool_settings", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().references(() => profiles.userId), // FK to profiles.user_id
  toolId: varchar("tool_id").notNull().references(() => seoTools.id), // FK to seo_tools.id - FIXED: match varchar type
  settings: jsonb("settings").notNull().default(sql`'{}'::jsonb`),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userToolSettingsUniqueIdx: sql`CREATE UNIQUE INDEX IF NOT EXISTS user_tool_settings_unique_idx ON ${table} (${table.userId}, ${table.toolId})`,
}));

export const adminAuditLog = pgTable("admin_audit_log", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  actorId: text("actor_id").notNull().references(() => profiles.userId), // FK to profiles.user_id
  action: text("action").notNull(), // create_user, delete_user, reset_password, grant_tool, etc
  subjectUserId: text("subject_user_id").references(() => profiles.userId), // FK to profiles.user_id (nullable)
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  adminAuditUniqueIdx: sql`CREATE UNIQUE INDEX IF NOT EXISTS admin_audit_unique_idx ON ${table} (${table.actorId}, ${table.action}, ${table.subjectUserId})`,
}));

// Legacy user schema removed - now using Supabase auth

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

// Auth schemas
export const insertProfileSchema = createInsertSchema(profiles).omit({
  createdAt: true,
});

export const insertUserToolAccessSchema = createInsertSchema(userToolAccess).omit({
  id: true,
  createdAt: true,
});

export const insertToolSettingsSchema = createInsertSchema(toolSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertAdminAuditLogSchema = createInsertSchema(adminAuditLog).omit({
  id: true,
  createdAt: true,
});

// Relations
export const seoToolsRelations = relations(seoTools, ({ many }) => ({
  executions: many(toolExecutions),
  userAccess: many(userToolAccess),
  toolSettings: many(toolSettings),
}));

export const toolExecutionsRelations = relations(toolExecutions, ({ one }) => ({
  tool: one(seoTools, {
    fields: [toolExecutions.toolId],
    references: [seoTools.id],
  }),
  owner: one(profiles, {
    fields: [toolExecutions.ownerId],
    references: [profiles.userId],
  }),
}));

export const profilesRelations = relations(profiles, ({ many }) => ({
  toolAccess: many(userToolAccess, { relationName: "userAccess" }),
  toolSettings: many(toolSettings),
  executions: many(toolExecutions),
  socialMediaPosts: many(socialMediaPosts),
  internalLinkSuggestions: many(internalLinkSuggestions),
  auditActions: many(adminAuditLog, { relationName: "actorActions" }),
  auditSubject: many(adminAuditLog, { relationName: "subjectActions" }),
}));

export const userToolAccessRelations = relations(userToolAccess, ({ one }) => ({
  user: one(profiles, {
    fields: [userToolAccess.userId],
    references: [profiles.userId],
    relationName: "userAccess",
  }),
  tool: one(seoTools, {
    fields: [userToolAccess.toolId],
    references: [seoTools.id],
  }),
  grantedByUser: one(profiles, {
    fields: [userToolAccess.grantedBy],
    references: [profiles.userId],
    relationName: "grantedAccess",
  }),
}));

export const toolSettingsRelations = relations(toolSettings, ({ one }) => ({
  user: one(profiles, {
    fields: [toolSettings.userId],
    references: [profiles.userId],
  }),
  tool: one(seoTools, {
    fields: [toolSettings.toolId],
    references: [seoTools.id],
  }),
}));

export const adminAuditLogRelations = relations(adminAuditLog, ({ one }) => ({
  actor: one(profiles, {
    fields: [adminAuditLog.actorId],
    references: [profiles.userId],
    relationName: "actorActions",
  }),
  subject: one(profiles, {
    fields: [adminAuditLog.subjectUserId],
    references: [profiles.userId],
    relationName: "subjectActions",
  }),
}));

export const socialMediaPostsRelations = relations(socialMediaPosts, ({ one }) => ({
  owner: one(profiles, {
    fields: [socialMediaPosts.ownerId],
    references: [profiles.userId],
  }),
  tool: one(seoTools, {
    fields: [socialMediaPosts.toolId],
    references: [seoTools.id],
  }),
}));

export const internalLinkSuggestionsRelations = relations(internalLinkSuggestions, ({ one }) => ({
  owner: one(profiles, {
    fields: [internalLinkSuggestions.ownerId],
    references: [profiles.userId],
  }),
  tool: one(seoTools, {
    fields: [internalLinkSuggestions.toolId],
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
export type SeoTool = typeof seoTools.$inferSelect;
export type InsertSeoTool = z.infer<typeof insertSeoToolSchema>;
export type ToolExecution = typeof toolExecutions.$inferSelect;
export type InsertToolExecution = z.infer<typeof insertToolExecutionSchema>;
export type SocialMediaPost = typeof socialMediaPosts.$inferSelect;
export type InsertSocialMediaPost = z.infer<typeof insertSocialMediaPostSchema>;
export type InternalLinkSuggestion = typeof internalLinkSuggestions.$inferSelect;
export type InsertInternalLinkSuggestion = z.infer<typeof insertInternalLinkSuggestionSchema>;
export type ActivateToolRequest = z.infer<typeof activateToolSchema>;

// Auth types
export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type UserToolAccess = typeof userToolAccess.$inferSelect;
export type InsertUserToolAccess = z.infer<typeof insertUserToolAccessSchema>;
export type ToolSettings = typeof toolSettings.$inferSelect;
export type InsertToolSettings = z.infer<typeof insertToolSettingsSchema>;
export type AdminAuditLog = typeof adminAuditLog.$inferSelect;
export type InsertAdminAuditLog = z.infer<typeof insertAdminAuditLogSchema>;
