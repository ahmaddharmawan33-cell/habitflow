// routes/health.js
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/health
// Used by Railway for health checks and by the frontend to verify backend is up.
// ─────────────────────────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "HabitFlow Backend",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

module.exports = router;
