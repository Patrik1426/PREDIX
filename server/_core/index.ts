import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./auth/oauth";
import { appRouter } from "../routers";
import { createContext } from "./auth/context";
import { serveStatic, setupVite } from "./infra/vite";
import { startSyncScheduler } from "../services/syncScheduler";
import { sseHandler, eventBus } from "../services/realtimeService";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Railway (y la mayoría de PaaS) corren detrás de un proxy inverso que
  // agrega X-Forwarded-For; sin esto, express-rate-limit lo rechaza.
  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === "production" ? undefined : false,
    crossOriginEmbedderPolicy: false,
  }));

  // CORS — allowlist por entorno
  const corsOrigins = process.env.NODE_ENV !== "production"
    ? ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"]
    : process.env.VITE_FRONTEND_URL
      ? process.env.VITE_FRONTEND_URL.split(",").map((u) => u.trim())
      : [];
  app.use(cors({
    origin: corsOrigins.length > 0 ? corsOrigins : false,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 600,
  }));

  // Rate limiting en login institucional
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Demasiados intentos. Espera 15 minutos." },
  });
  app.use("/api/trpc/auth.institutionalLogin", loginLimiter);

  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api/", apiLimiter);

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // SSE endpoint para notificaciones en tiempo real
  app.get("/api/events", sseHandler);

  // API para obtener historial de eventos
  app.get("/api/events/history", (_req, res) => {
    res.json({
      events: eventBus.getHistory(50),
      clients: eventBus.getClientCount(),
    });
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV !== "production") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    // Start SESNSP data sync scheduler
    startSyncScheduler();
    // Start realtime event simulator
    eventBus.startSimulator();
  });
}

startServer().catch(console.error);
