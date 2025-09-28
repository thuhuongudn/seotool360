import "./env";

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// HTTPS and www redirect middleware for production
app.use((req: Request, res: Response, next: NextFunction) => {
  // Only redirect in production
  if (process.env.NODE_ENV === 'production') {
    const protocol = req.header('x-forwarded-proto') || req.protocol;
    const host = req.get('host') || '';

    // Check if we need to redirect for HTTPS or www removal
    const needsHttpsRedirect = protocol !== 'https';
    const needsWwwRedirect = host.startsWith('www.');

    if (needsHttpsRedirect || needsWwwRedirect) {
      // Determine the target host (remove www if present)
      const targetHost = needsWwwRedirect ? host.replace(/^www\./, '') : host;

      // Construct the canonical URL
      const canonicalUrl = `https://${targetHost}${req.originalUrl}`;

      // Log the redirect reason
      if (needsHttpsRedirect && needsWwwRedirect) {
        log(`Redirecting HTTP+www to HTTPS: ${protocol}://${host}${req.originalUrl} -> ${canonicalUrl}`);
      } else if (needsHttpsRedirect) {
        log(`Redirecting HTTP to HTTPS: ${protocol}://${host}${req.originalUrl} -> ${canonicalUrl}`);
      } else {
        log(`Redirecting www to non-www: ${protocol}://${host}${req.originalUrl} -> ${canonicalUrl}`);
      }

      return res.redirect(301, canonicalUrl);
    }
  }
  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    const { setupVite } = await import("./vite-dev.js");
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
