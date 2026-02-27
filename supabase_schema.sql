-- ─────────────────────────────────────────────────────────────────────────────
-- HabitFlow — Supabase PostgreSQL Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ─────────────────────────────────────────────────────────────────────────────

-- ── HABITS TABLE ─────────────────────────────────────────────────────────────
-- Stores each user's habits.
-- user_id links to auth.users — no manual user table needed.

CREATE TABLE IF NOT EXISTS habits (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT         NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  emoji       TEXT         NOT NULL DEFAULT '📝' CHECK (char_length(emoji) <= 10),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Performance index: most queries filter by user_id
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);

-- ── LOGS TABLE ────────────────────────────────────────────────────────────────
-- One row per (user, habit, date). The unique constraint prevents duplicate entries.
-- done = true means the habit was completed on that date.

CREATE TABLE IF NOT EXISTS logs (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id    UUID    NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date        DATE    NOT NULL,
  done        BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- CRITICAL: prevents double-logging the same habit on the same day
  CONSTRAINT logs_user_habit_date_unique UNIQUE (user_id, habit_id, date)
);

-- Performance indexes for streak and weekly queries
CREATE INDEX IF NOT EXISTS idx_logs_user_date    ON logs(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_logs_habit_id     ON logs(habit_id);
CREATE INDEX IF NOT EXISTS idx_logs_user_habit   ON logs(user_id, habit_id);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────────────────────
-- WHY: Without RLS, any authenticated user can query ANY user's data.
-- With RLS enabled + correct policies, users can ONLY see their own rows.

ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs   ENABLE ROW LEVEL SECURITY;

-- ── RLS POLICIES: habits ─────────────────────────────────────────────────────

-- Users can only SELECT their own habits
CREATE POLICY "habits_select_own" ON habits
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only INSERT habits for themselves
CREATE POLICY "habits_insert_own" ON habits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only UPDATE their own habits
CREATE POLICY "habits_update_own" ON habits
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only DELETE their own habits
CREATE POLICY "habits_delete_own" ON habits
  FOR DELETE USING (auth.uid() = user_id);

-- ── RLS POLICIES: logs ───────────────────────────────────────────────────────

CREATE POLICY "logs_select_own" ON logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "logs_insert_own" ON logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Upsert requires both INSERT + UPDATE policies
CREATE POLICY "logs_update_own" ON logs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "logs_delete_own" ON logs
  FOR DELETE USING (auth.uid() = user_id);

-- ── VERIFY SETUP ──────────────────────────────────────────────────────────────
-- Run this after to confirm everything looks right:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('habits','logs');
-- Expected: both show rowsecurity = true
