import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const resolvedDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  envDir: resolvedDir, // Look for .env files in project root
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(resolvedDir, "client", "src"),
      "@shared": path.resolve(resolvedDir, "shared"),
      "@assets": path.resolve(resolvedDir, "attached_assets"),
    },
  },
  root: path.resolve(resolvedDir, "client"),
  build: {
    outDir: path.resolve(resolvedDir, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
