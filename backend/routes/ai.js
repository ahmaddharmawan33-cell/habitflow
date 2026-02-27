// routes/ai.js
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/analyze
//
// WHY this lives on the backend:
//   The Groq API key is a secret. If it's in the frontend JS, anyone who
//   opens DevTools can steal it and rack up charges on your account.
//   This route acts as a secure proxy — the frontend never touches the key.
// ─────────────────────────────────────────────────────────────────────────────

const express = require("express");
const axios = require("axios");
const { GROQ_CONFIG, SYSTEM_PROMPT } = require("../config/groq");
const { aiLimiter } = require("../middleware/rateLimiter");
const { validateAnalyzePayload } = require("../middleware/validate");

const router = express.Router();

// ── POST /api/ai/analyze ────────────────────────────────────────────────────
router.post(
  "/analyze",
  aiLimiter,
  validateAnalyzePayload,
  async (req, res) => {
    const { habits, stats, mood } = req.body;

    // Build a structured user prompt from the data
    const userPrompt = buildUserPrompt(habits, stats, mood);

    try {
      const response = await axios.post(
        `${GROQ_CONFIG.baseURL}/chat/completions`,
        {
          model: GROQ_CONFIG.model,
          max_tokens: GROQ_CONFIG.maxTokens,
          temperature: GROQ_CONFIG.temperature,
          response_format: { type: "json_object" }, // Force JSON output
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 20000, // 20s timeout — Groq is fast, but networks aren't
        }
      );

      const rawContent = response.data.choices?.[0]?.message?.content;

      if (!rawContent) {
        return res.status(502).json({ error: "No response from AI model." });
      }

      // Parse and validate the JSON shape before passing to frontend
      let parsed;
      try {
        parsed = JSON.parse(rawContent);
      } catch {
        // If model didn't return valid JSON, return it as encouragement
        return res.json({
          strongest: "Your consistency",
          weakest: "Unknown",
          improvement: "Keep tracking daily.",
          newHabit: "Take a 5-minute walk.",
          encouragement: rawContent.slice(0, 200),
        });
      }

      // Ensure all required fields exist
      const result = {
        strongest: String(parsed.strongest || "Your consistency"),
        weakest: String(parsed.weakest || "Keep tracking more data"),
        improvement: String(parsed.improvement || "Stay consistent for another week"),
        newHabit: String(parsed.newHabit || "Journal for 5 minutes daily"),
        encouragement: String(parsed.encouragement || "You're building something great."),
      };

      return res.json(result);

    } catch (err) {
      // Handle Groq API errors specifically
      if (err.response) {
        const status = err.response.status;
        const groqMessage = err.response.data?.error?.message || "Groq API error";

        if (status === 401) {
          console.error("[AI] Invalid Groq API key");
          return res.status(500).json({ error: "AI service configuration error." });
        }
        if (status === 429) {
          return res.status(429).json({ error: "AI service rate limit hit. Try again shortly." });
        }
        if (status >= 500) {
          return res.status(502).json({ error: "AI service temporarily unavailable." });
        }

        console.error(`[AI] Groq error ${status}:`, groqMessage);
        return res.status(502).json({ error: "AI analysis failed." });
      }

      if (err.code === "ECONNABORTED") {
        return res.status(504).json({ error: "AI request timed out. Try again." });
      }

      console.error("[AI] Unexpected error:", err.message);
      return res.status(500).json({ error: "Internal server error." });
    }
  }
);

// ── GET /api/ai/health ──────────────────────────────────────────────────────
// Quick check that the AI config is present (key exists, not empty).
// Does NOT call Groq — no cost.
router.get("/health", (req, res) => {
  const keyPresent = !!process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.length > 10;
  return res.json({
    status: keyPresent ? "ready" : "misconfigured",
    model: GROQ_CONFIG.model,
    keyConfigured: keyPresent,
  });
});

// ── POST /api/ai/chat ──────────────────────────────────────────────────────
router.post(
  "/chat",
  aiLimiter,
  async (req, res) => {
    const { message, context, history = [] } = req.body;

    // Parse name from context sent by frontend
    const userName = context?.userName || context?.displayName || "User";

    const groqMessages = [
      {
        role: "system",
        content: `Kamu adalah AI Coach di aplikasi HabitFlow — asisten produktivitas personal yang cerdas dan kontekstual.

## IDENTITAS
- Tone: Friendly, motivatif, singkat (maks 2-3 kalimat)
- Bahasa: Indonesia informal
- Nama user saat ini: "${userName}" — SELALU pakai nama ini, jangan tanya lagi

## MEMORI
- Ingat semua yang user katakan dalam sesi ini
- Jangan reset konteks di tengah percakapan
- Jika user tanya "siapa namaku" → jawab "${userName}"

## TAG AKSI — Wajib ditulis di BARIS BARU PALING AKHIR jika ada aksi (hanya jika diminta)

### 1. Tambah ke Kalender:
[SET_SCHEDULE:YYYY-MM-DD] Isi agenda
Gunakan jika user sebut tanggal + acara. Jika tahun tidak disebut, gunakan tahun ini (${new Date().getFullYear()}).
Contoh: 
User: "tanggal 3 maret aku bukber" 
Tag: [SET_SCHEDULE:${new Date().getFullYear()}-03-03] Bukber
Konfirmasi: "✅ Sudah masuk kalender, \${userName}!"

### 2. Tambah Habit:
[ADD_HABIT:NamaHabit:high|medium|low:HH:mm]

### 3. Selesaikan Habit:
[COMPLETE_HABIT:ID_atau_Nama]

## LARANGAN KERAS
- ❌ JANGAN bilang "aku catat" atau "aku simpan" tanpa menulis tag yang sesuai.
- ❌ JANGAN tulis tag di tengah kalimat — harus di baris paling bawah.
- ❌ JANGAN jawaban panjang (maks 3 kalimat).
- ❌ JANGAN hardcode nama lain selain "${userName}".

HARI INI ADALAH: ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }).split(",")[0]} | ISO: ${new Date().toISOString().split('T')[0]}`
      }
    ];

    // Add conversation history (ensure the AI actually sees previous turns)
    history.forEach(h => {
      groqMessages.push({
        role: h.role === "assistant" || h.role === "ai" ? "assistant" : "user",
        content: h.content || h.text
      });
    });

    // Add current user message with environment context
    groqMessages.push({
      role: "user",
      content: `Konteks Aplikasi: ${context}\n\nPesan User: "${message}"`
    });

    try {
      const response = await axios.post(
        `${GROQ_CONFIG.baseURL}/chat/completions`,
        {
          model: GROQ_CONFIG.model,
          max_tokens: 1024,
          temperature: 0.7,
          messages: groqMessages,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 20000,
        }
      );

      const reply = response.data.choices?.[0]?.message?.content;

      if (!reply) {
        return res.status(502).json({ error: "No response from AI." });
      }

      console.log(`[AI Chat] AI Reply: "${reply.slice(0, 50)}..."`);
      return res.json({ reply });

    } catch (err) {
      console.error("[AI Chat Error]", err.message);
      return res.status(500).json({ error: "Gagal ngobrol sama AI. Coba lagi ya!" });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds a structured, information-dense prompt for the AI.
 * More structured input = more structured output.
 */
function buildUserPrompt(habits, stats, mood) {
  const habitList = habits.length > 0
    ? habits
      .map((h) => {
        const hs = stats.habitStats?.find((s) => s.id === h.id);
        const pct = hs?.completionPct ?? "?";
        const streak = hs?.streak ?? 0;
        return `  • ${h.emoji || "•"} ${h.name} — ${pct}% this week, ${streak}-day streak`;
      })
      .join("\n")
    : "  (No habits tracked yet)";

  const contextLine = mood ? `\nPERTANYAAN/PESAN USER SAAT INI: "${mood}"` : "\nUser meminta analisis progress rutin.";

  return `Analisis data habit user berikut dan respon sesuai pesan/pertanyaannya.

DATA HABIT MINGGU INI:
${habitList}

STATISTIK KESELURUHAN:
  • Global streak: ${stats.streakDays} hari
  • Weekly completion: ${stats.weeklyPct}%
  • Discipline score: ${stats.disciplineScore}/100
${contextLine}

PENTING: Jawab pertanyaan user di bagian 'encouragement' dengan nada yang natural. Variasikan jawabanmu, jangan selalu menggunakan pola kalimat yang sama. Jika tidak ada pertanyaan, berikan refleksi atau motivasi berbasis data di atas.`;
}

module.exports = router;
