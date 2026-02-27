// js/habits.js
// ─────────────────────────────────────────────────────────────────────────────
// Habit data layer — all reads/writes for habits and logs.
// Supports both Supabase (cloud) and localStorage (guest mode).
// ─────────────────────────────────────────────────────────────────────────────

import { getSupabase } from "./auth.js";

// ── Storage keys ─────────────────────────────────────────────────────────────
const LS_HABITS = "hf_habits_v3";
const LS_LOGS = "hf_logs_v3";
const LS_STATS = "hf_stats_v3";

// ── In-memory state ───────────────────────────────────────────────────────────
let _habits = [];
let _logs = {}; // { "YYYY-MM-DD": { habitId: true/false } }
let _stats = { xp: 0, level: 1 };
let _userId = null;
let _isGuest = false;

// ── Date helpers ─────────────────────────────────────────────────────────────

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Returns the date keys for Mon–Sun of the current calendar week.
 */
export function getCurrentWeekKeys() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun
  const offsetToMonday = day === 0 ? -6 : 1 - day;
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() + offsetToMonday + i);
    return d.toISOString().slice(0, 10);
  });
}

/**
 * Returns the last N day keys (including today), oldest first.
 */
export function getLastNDayKeys(n = 7) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return d.toISOString().slice(0, 10);
  });
}

// ── Init ─────────────────────────────────────────────────────────────────────

/**
 * Initialize the habit store for a logged-in user.
 * Loads from Supabase, falls back to localStorage on error.
 */
export async function initForUser(userId) {
  _userId = userId;
  _isGuest = false;
  await _loadFromSupabase();
}

/**
 * Initialize in guest (offline) mode.
 * Data lives in localStorage only.
 */
export function initForGuest() {
  _userId = null;
  _isGuest = true;
  _loadFromLocal();
}

/**
 * Clear all in-memory state (on logout).
 */
export function clearStore() {
  _habits = [];
  _logs = {};
  _userId = null;
  _isGuest = false;
}

// ── Getters ───────────────────────────────────────────────────────────────────

export function getHabits() {
  return [..._habits];
}

export function getHabit(id) {
  return _habits.find((h) => h.id === id) ?? null;
}

/**
 * Check if a habit was completed on a given date.
 */
export function isDone(habitId, date = todayKey()) {
  return _logs[date] && _logs[date][habitId] === true;
}

/**
 * Get the specific status of a log (true, "skipped", "rest").
 */
export function getLogStatus(habitId, date = todayKey()) {
  if (!_logs[date]) return null;
  const val = _logs[date][habitId];
  if (val === true) return "done";
  if (val === "skipped") return "skipped";
  if (val === "rest") return "rest";
  return null;
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

/**
 * Add a new habit. Returns the created habit object.
 */
export async function addHabit(name, emoji) {
  const habit = {
    id: _generateId(),
    name: name.trim(),
    emoji,
    created_at: new Date().toISOString(),
  };

  _habits.push(habit);
  _saveLocal();

  if (!_isGuest) {
    const sb = getSupabase();
    const { error } = await sb
      .from("habits")
      .insert({ ...habit, user_id: _userId });
    if (error) console.error("[habits] Insert error:", error.message);
  }

  return habit;
}

/**
 * Update a habit's name and/or emoji.
 */
export async function updateHabit(id, fields) {
  const habit = _habits.find((h) => h.id === id);
  if (!habit) return null;

  Object.assign(habit, fields);
  _saveLocal();

  if (!_isGuest) {
    const sb = getSupabase();
    const { error } = await sb
      .from("habits")
      .update({ name: habit.name, emoji: habit.emoji })
      .eq("id", id)
      .eq("user_id", _userId);
    if (error) console.error("[habits] Update error:", error.message);
  }

  return habit;
}

/**
 * Delete a habit and all its logs.
 */
export async function deleteHabit(id) {
  _habits = _habits.filter((h) => h.id !== id);
  // Remove from all log dates
  Object.keys(_logs).forEach((date) => {
    delete _logs[date][id];
  });
  _saveLocal();

  if (!_isGuest) {
    const sb = getSupabase();
    // Logs will cascade-delete if FK + ON DELETE CASCADE is set.
    // We also delete manually for safety.
    await sb.from("logs").delete().eq("habit_id", id).eq("user_id", _userId);
    await sb.from("habits").delete().eq("id", id).eq("user_id", _userId);
  }
}

/**
 * Toggle a habit's completion for today.
 * Returns the new done state (true/false).
 */
export async function toggleHabit(habitId, date = todayKey()) {
  if (!_logs[date]) _logs[date] = {};
  const current = _logs[date][habitId];

  // Toggle: If done -> none, else -> done
  const newState = current === true ? null : true;
  _logs[date][habitId] = newState;
  _saveLocal();

  if (!_isGuest) {
    const sb = getSupabase();
    if (newState === null) {
      await sb.from("logs").delete().eq("user_id", _userId).eq("habit_id", habitId).eq("date", date);
    } else {
      await sb.from("logs").upsert(
        { user_id: _userId, habit_id: habitId, date, done: true, status: "done" },
        { onConflict: "user_id,habit_id,date" }
      );
    }
  }

  if (newState === true) addXP(10);
  return !!newState;
}

export function addXP(amount) {
  _stats.xp += amount;
  const nextLevelXP = _stats.level * 100;
  if (_stats.xp >= nextLevelXP) {
    _stats.level++;
    _stats.xp -= nextLevelXP;
  }
  _saveLocal();
}

export function getStats() {
  return { ..._stats, nextLevelXP: _stats.level * 100 };
}

/**
 * Set a special status for a habit log (e.g. "skipped", "rest").
 */
export async function setHabitStatus(habitId, status, date = todayKey()) {
  if (!_logs[date]) _logs[date] = {};

  const current = _logs[date][habitId];
  // If already at this status, toggle to none
  const newState = current === status ? null : status;
  _logs[date][habitId] = newState;
  _saveLocal();

  if (!_isGuest) {
    const sb = getSupabase();
    if (newState === null) {
      await sb.from("logs").delete().eq("user_id", _userId).eq("habit_id", habitId).eq("date", date);
    } else {
      await sb.from("logs").upsert(
        { user_id: _userId, habit_id: habitId, date, done: false, status: newState },
        { onConflict: "user_id,habit_id,date" }
      );
    }
  }
  return newState;
}

// ── Stats & Analytics ─────────────────────────────────────────────────────────

/**
 * Streak for a single habit — how many consecutive days ending today.
 */
export function getHabitStreak(habitId) {
  let streak = 0;
  for (let i = 0; i <= 365; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const status = getLogStatus(habitId, key);

    if (status === "done") {
      streak++;
    } else if (status === "skipped" || status === "rest") {
      // Skips and rest days preserve the streak but don't increment it
      continue;
    } else if (i > 0) {
      break; // Streak is broken
    }
  }
  return streak;
}

/**
 * Global streak — days where ALL habits were completed, consecutively.
 * This is the sidebar streak number.
 */
export function getGlobalStreak() {
  if (_habits.length === 0) return 0;
  let streak = 0;
  for (let i = 0; i <= 365; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const allDone = _habits.every((h) => {
      const status = getLogStatus(h.id, key);
      return status === "done" || status === "skipped" || status === "rest";
    });
    if (allDone) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

/**
 * Weekly completion percentage for today's date.
 * = (completed today / total habits) * 100
 */
export function getTodayCompletionPct() {
  if (_habits.length === 0) return 0;
  const done = _habits.filter((h) => isDone(h.id)).length;
  return Math.round((done / _habits.length) * 100);
}

/**
 * For a given week (7 keys), return completion info per day.
 * Used by the week grid component.
 */
export function getWeekStats(weekKeys) {
  return weekKeys.map((date) => {
    const total = _habits.length;
    const done = _habits.filter((h) => isDone(h.id, date)).length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { date, total, done, pct };
  });
}

/**
 * Discipline score (0–100).
 *
 * Formula:
 *   base  = (total completions over last 7 days / max possible) * 80
 *   bonus = min(globalStreak * 2, 20)
 *   score = min(base + bonus, 100)
 *
 * WHY this formula:
 *   - 80% from consistency over the past week (recent behavior matters most)
 *   - 20% streak bonus rewards sustained discipline over time
 *   - Capped at 100 to keep it readable
 */
export function getDisciplineScore() {
  if (_habits.length === 0) return 0;
  const last7 = getLastNDayKeys(7);
  let doneCount = 0;
  last7.forEach((date) => {
    _habits.forEach((h) => {
      if (isDone(h.id, date)) doneCount++;
    });
  });
  const base = Math.round((doneCount / (_habits.length * 7)) * 80);
  const bonus = Math.min(getGlobalStreak() * 2, 20);
  return Math.min(base + bonus, 100);
}

/**
 * Per-habit stats for the AI coach payload.
 * Returns completion % and streak for each habit over the last 7 days.
 */
export function getHabitStats() {
  const last7 = getLastNDayKeys(7);
  return _habits.map((h) => {
    const doneDays = last7.filter((date) => isDone(h.id, date)).length;
    return {
      id: h.id,
      name: h.name,
      emoji: h.emoji,
      completionPct: Math.round((doneDays / 7) * 100),
      streak: getHabitStreak(h.id),
    };
  });
}

/**
 * Build the full stats payload for the AI /analyze endpoint.
 */
export function buildAIPayload(mood = "") {
  return {
    habits: _habits.map(({ id, name, emoji }) => ({ id, name, emoji })),
    stats: {
      streakDays: getGlobalStreak(),
      weeklyPct: getTodayCompletionPct(),
      disciplineScore: getDisciplineScore(),
      habitStats: getHabitStats(),
    },
    mood: mood.trim(),
  };
}

// ── Private helpers ───────────────────────────────────────────────────────────

async function _loadFromSupabase() {
  try {
    const sb = getSupabase();

    const [{ data: habitsData }, { data: logsData }] = await Promise.all([
      sb.from("habits").select("*").eq("user_id", _userId).order("created_at"),
      sb.from("logs").select("*").eq("user_id", _userId),
    ]);

    _habits = habitsData ?? [];
    _logs = {};
    (logsData ?? []).forEach((row) => {
      if (!_logs[row.date]) _logs[row.date] = {};
      _logs[row.date][row.habit_id] = row.done;
    });

    // Mirror to localStorage as offline cache
    _saveLocal();
  } catch (err) {
    console.warn("[habits] Supabase load failed, using local cache:", err.message);
    _loadFromLocal();
  }
}

function _loadFromLocal() {
  try {
    _habits = JSON.parse(localStorage.getItem(LS_HABITS)) ?? [];
    _logs = JSON.parse(localStorage.getItem(LS_LOGS)) ?? {};
    _stats = JSON.parse(localStorage.getItem(LS_STATS)) ?? { xp: 0, level: 1 };
  } catch {
    _habits = [];
    _logs = {};
    _stats = { xp: 0, level: 1 };
  }
}

function _saveLocal() {
  try {
    localStorage.setItem(LS_HABITS, JSON.stringify(_habits));
    localStorage.setItem(LS_LOGS, JSON.stringify(_logs));
    localStorage.setItem(LS_STATS, JSON.stringify(_stats));
  } catch (e) {
    // Storage quota exceeded — not fatal
    console.warn("[habits] localStorage write failed:", e.message);
  }
}

function _generateId() {
  // Uses crypto.randomUUID() if available, falls back to timestamp
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
