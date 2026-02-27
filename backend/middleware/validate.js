// middleware/validate.js
// ─────────────────────────────────────────────────────────────────────────────
// Input validation for the AI analyze endpoint.
// We validate BEFORE calling Groq so we never waste tokens on bad input.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates the request body for POST /api/ai/analyze
 * Expected shape:
 * {
 *   habits: Array<{ id, name, emoji }>,
 *   stats:  {
 *     streakDays: number,
 *     weeklyPct:  number,          // 0–100
 *     disciplineScore: number,     // 0–100
 *     habitStats: Array<{ name, emoji, completionPct, streak }>
 *   },
 *   mood: string (optional, max 200 chars)
 * }
 */
function validateAnalyzePayload(req, res, next) {
  const { habits, stats } = req.body;

  if (!habits || !Array.isArray(habits)) {
    return res.status(400).json({ error: "habits must be an array." });
  }

  if (habits.length > 50) {
    return res.status(400).json({ error: "Too many habits (max 50)." });
  }

  for (const h of habits) {
    if (typeof h.name !== "string" || h.name.trim().length === 0) {
      return res.status(400).json({ error: "Each habit must have a non-empty name." });
    }
    if (h.name.length > 100) {
      return res.status(400).json({ error: "Habit name too long (max 100 chars)." });
    }
  }

  if (!stats || typeof stats !== "object") {
    return res.status(400).json({ error: "stats object is required." });
  }

  if (
    typeof stats.streakDays !== "number" ||
    typeof stats.weeklyPct !== "number" ||
    typeof stats.disciplineScore !== "number"
  ) {
    return res.status(400).json({
      error: "stats must include streakDays, weeklyPct, and disciplineScore as numbers.",
    });
  }

  // Sanitize optional mood field
  if (req.body.mood && typeof req.body.mood === "string") {
    req.body.mood = req.body.mood.slice(0, 200).trim();
  } else {
    req.body.mood = "";
  }

  next();
}

export { validateAnalyzePayload };
