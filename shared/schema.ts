import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean } from "drizzle-orm/pg-core";
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

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertSeoToolSchema = createInsertSchema(seoTools).omit({
  id: true,
});

export const activateToolSchema = z.object({
  toolId: z.string(),
  input: z.record(z.any()).optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type SeoTool = typeof seoTools.$inferSelect;
export type InsertSeoTool = z.infer<typeof insertSeoToolSchema>;
export type ActivateToolRequest = z.infer<typeof activateToolSchema>;
