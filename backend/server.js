// server.js
// ─────────────────────────────────────────────────────────────────────────────
// HabitFlow Backend — Entry Point
//
// Stack:  Node.js + Express
// Deploy: Railway
//
// Security layers applied at startup:
//   1. helmet()         — sets secure HTTP headers (XSS, clickjacking, etc.)
//   2. cors()           — whitelist-only cross-origin requests
//   3. express.json()   — parse JSON body, limit size to block payload attacks
//   4. generalLimiter   — global rate limit on all /api/* routes
//   5. Per-route limits — AI endpoint has its own tighter limiter
// ─────────────────────────────────────────────────────────────────────────────

require("dotenv").config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { generalLimiter } from "./middleware/rateLimiter.js";
import aiRouter from "./routes/ai.js";
import healthRouter from "./routes/health.js";

// ── Validate critical env vars at startup ───────────────────────────────────
if (!process.env.GROQ_API_KEY) {
  console.error("❌ FATAL: GROQ_API_KEY is not set in environment variables.");
  console.error("   Copy .env.example to .env and fill in your Groq key.");
  process.exit(1);
}

// ── App init ────────────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 4000;

// ── Security: Helmet ─────────────────────────────────────────────────────────
// Sets ~15 security-related HTTP response headers automatically.
// Protects against XSS, clickjacking, MIME sniffing, and more.
app.use(helmet());

// ── Security: CORS ───────────────────────────────────────────────────────────
// WHY: Without this, any website can make requests to your backend.
// We whitelist only the exact frontend origin. In dev, localhost is allowed.
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:53904", // Current browser port from screenshot
  "http://127.0.0.1:53904",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow any localhost origin in development
      if (process.env.NODE_ENV === "development" && (!origin || origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:"))) {
        return callback(null, true);
      }
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS: origin '${origin}' not allowed.`));
    },
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ── Body parsing ─────────────────────────────────────────────────────────────
// Limit to 50kb — we're sending small JSON, not files.
// This blocks oversized payloads that could slow/crash the server.
app.use(express.json({ limit: "50kb" }));

// ── Logging ──────────────────────────────────────────────────────────────────
// 'dev' format in development (colorized), 'combined' in production (Apache-style)
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ── Rate limiting: global ────────────────────────────────────────────────────
app.use("/api", generalLimiter);

// ── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/health", healthRouter);
app.use("/api/ai", aiRouter);

// ── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Route not found.", path: req.path });
});

// ── Global error handler ─────────────────────────────────────────────────────
// Catches any unhandled errors thrown in route handlers.
// Returns a safe generic message in production (no stack traces to clients).
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("[ERROR]", err.message);

  // CORS errors
  if (err.message && err.message.startsWith("CORS:")) {
    return res.status(403).json({ error: err.message });
  }

  if (process.env.NODE_ENV === "development") {
    return res.status(500).json({ error: err.message, stack: err.stack });
  }

  res.status(500).json({ error: "Internal server error." });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║          🌊  HabitFlow Backend               ║
╠══════════════════════════════════════════════╣
║  Status  : Running                           ║
║  Port    : ${String(PORT).padEnd(34)}║
║  Env     : ${String(process.env.NODE_ENV || "development").padEnd(34)}║
║  Model   : ${String(process.env.GROQ_MODEL || "llama3-70b-8192").padEnd(34)}║
╚══════════════════════════════════════════════╝
  `);
});

export default app; // for testing
