import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
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
  isActive: boolean("is_active").default(true),
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

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertSeoToolSchema = createInsertSchema(seoTools).omit({
  id: true,
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
export type ActivateToolRequest = z.infer<typeof activateToolSchema>;
