// js/ai.js
// ─────────────────────────────────────────────────────────────────────────────
// AI Coach module — communicates with the backend /api/ai/analyze endpoint.
//
// WHY this is on the backend and not called directly:
//   If we called Groq from here, the API key would be visible in browser
//   DevTools → Network tab. Anyone could steal it and use it freely.
//   This module only knows the BACKEND URL, never the Groq key.
// ─────────────────────────────────────────────────────────────────────────────

import CONFIG from "./config.js";

const AI_ENDPOINT = `${CONFIG.BACKEND_URL}/api/ai/analyze`;

/**
 * Send habit data to the backend for AI analysis.
 *
 * @param {Object} payload - { habits, stats, mood }
 * @returns {Promise<AIResult>} - { strongest, weakest, improvement, newHabit, encouragement }
 *
 * @throws {Error} with a user-friendly message on failure
 */
export async function analyzeHabits(payload) {
  // Sanity check — don't call AI if there are no habits
  if (!payload.habits || payload.habits.length === 0) {
    return _defaultResult("Add some habits first, then I can analyze your patterns! 🌱");
  }

  try {
    const response = await fetch(AI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(25000), // 25s client-side timeout
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg = errorData.error || `HTTP ${response.status}`;

      if (response.status === 429) {
        throw new Error("You're analyzing too quickly. Wait 1 minute and try again.");
      }
      if (response.status === 503 || response.status === 502) {
        throw new Error("AI service is temporarily unavailable. Try again in a moment.");
      }

      throw new Error(msg);
    }

    const result = await response.json();
    return _validateResult(result);

  } catch (err) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      throw new Error("AI took too long to respond. Check your connection and retry.");
    }
    if (err.message.includes("fetch") || err.message.includes("Failed to fetch")) {
      throw new Error("Cannot reach the backend. Make sure it's running on port 4000.");
    }
    throw err;
  }
}

/**
 * Check if the backend AI service is configured and reachable.
 * Returns { status, model, keyConfigured }
 */
export async function checkAIHealth() {
  try {
    const response = await fetch(`${CONFIG.BACKEND_URL}/api/ai/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return { status: "error" };
    return response.json();
  } catch {
    return { status: "unreachable" };
  }
}

// ── Private helpers ───────────────────────────────────────────────────────────

function _defaultResult(encouragement) {
  return {
    strongest: "—",
    weakest: "—",
    improvement: "Start by adding your first habit.",
    newHabit: "Try a 5-minute morning walk.",
    encouragement,
  };
}

function _validateResult(data) {
  // Ensure all expected fields are present and are strings
  return {
    strongest:     String(data.strongest     || "Your consistency"),
    weakest:       String(data.weakest       || "Needs more data"),
    improvement:   String(data.improvement   || "Keep showing up every day."),
    newHabit:      String(data.newHabit      || "5-minute journaling"),
    encouragement: String(data.encouragement || "You're building something great."),
  };
}
