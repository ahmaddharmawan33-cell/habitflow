// middleware/rateLimiter.js
// ─────────────────────────────────────────────────────────────────────────────
// WHY: Without rate limiting, a single bad actor can exhaust your Groq API
// quota in seconds and cost you money. This limits each IP to a sane number
// of requests per window.
//
// The AI endpoint is more restrictive than general routes because:
//   1. Groq calls are expensive in latency + tokens
//   2. Abuse would directly drain the API key
// ─────────────────────────────────────────────────────────────────────────────

const rateLimit = require("express-rate-limit");

// General API limiter — applied to all /api/* routes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // 100 requests per IP per window
  standardHeaders: true,     // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,
  message: {
    error: "Too many requests. Please slow down.",
    retryAfter: "15 minutes",
  },
});

// AI-specific limiter — tighter limit for the expensive endpoint
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 5,              // 5 AI calls per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "AI rate limit reached. Please wait 1 minute before analyzing again.",
    retryAfter: "1 minute",
  },
  // Skip rate limiting in development for faster testing
  skip: () => process.env.NODE_ENV === "development",
});

module.exports = { generalLimiter, aiLimiter };
