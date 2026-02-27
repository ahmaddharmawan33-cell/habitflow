# 🌊 HabitFlow — Production-Ready AI Habit Tracker

> Built for YC Demo Day. AI-powered habit tracking for teenagers, with a secure backend, Supabase auth, and Groq AI coaching.

---

## 📁 Folder Structure

```
habitflow/
├── backend/
│   ├── config/
│   │   └── groq.js              # AI model config + system prompt
│   ├── middleware/
│   │   ├── rateLimiter.js       # Express rate limiting (general + AI-specific)
│   │   └── validate.js          # Request body validation
│   ├── routes/
│   │   ├── ai.js                # POST /api/ai/analyze (secure Groq proxy)
│   │   └── health.js            # GET /api/health
│   ├── .env.example             # Copy → .env
│   ├── package.json
│   └── server.js                # Entry point
│
├── frontend/
│   ├── css/
│   │   └── app.css              # All styles (dark-first, Syne font)
│   ├── js/
│   │   ├── config.js            # Frontend env config (no secrets)
│   │   ├── auth.js              # Supabase auth module
│   │   ├── habits.js            # Habit CRUD + analytics + streak logic
│   │   ├── ai.js                # Backend AI proxy client
│   │   ├── ui.js                # All DOM rendering (no logic)
│   │   └── app.js               # Main controller — wires everything
│   └── index.html               # App shell (data-screen switching)
│
├── supabase_schema.sql          # Run this in Supabase SQL Editor
└── README.md
```

---

## 🔐 Security Architecture

### Why the AI key is NEVER in the frontend

```
❌ BAD (old approach):
  Browser → Groq API directly
  Problem: API key is visible in DevTools → Network tab

✅ GOOD (current approach):
  Browser → Our Backend (POST /api/ai/analyze) → Groq API
  The Groq key lives ONLY in backend/.env
  The frontend only knows the backend URL
```

### Security layers applied

| Layer | What it does |
|-------|-------------|
| `helmet()` | Sets 15+ security HTTP headers (XSS, MIME sniff, clickjacking) |
| `cors()` | Whitelist-only: only your frontend URL can call the backend |
| `express.json({ limit: '50kb' })` | Blocks oversized payload attacks |
| `generalLimiter` | 100 req/15 min per IP on all `/api/*` routes |
| `aiLimiter` | 5 req/min per IP on `/api/ai/analyze` specifically |
| `validateAnalyzePayload` | Validates + sanitizes all inputs before hitting Groq |
| Supabase RLS | Users can only access their own rows in the DB |

---

## 🗄️ Supabase Setup

### 1. Create project
1. Go to [supabase.com](https://supabase.com)
2. New project → name it `habitflow`
3. Choose a region close to your users

### 2. Run schema
1. Dashboard → **SQL Editor** → **New Query**
2. Paste the contents of `supabase_schema.sql`
3. Click **Run**

### 3. Enable Google OAuth
1. Dashboard → **Authentication** → **Providers**
2. Enable **Google**
3. Add your Google OAuth credentials (from [console.cloud.google.com](https://console.cloud.google.com))
4. Add redirect URL: `https://your-project.supabase.co/auth/v1/callback`

### 4. Get your keys
1. Dashboard → **Settings** → **API**
2. Copy **Project URL** and **anon/public** key
3. Update `frontend/js/config.js` with these values

---

## 🚀 Deployment

### Backend → Railway

```bash
# 1. Push backend to GitHub
cd backend
git init && git add . && git commit -m "init"

# 2. Go to railway.app → New Project → Deploy from GitHub
# 3. Select your backend repo
# 4. Set environment variables in Railway dashboard:
```

**Railway environment variables:**
```
GROQ_API_KEY    = gsk_your_groq_key_here
GROQ_MODEL      = llama3-70b-8192
FRONTEND_URL    = https://habitflow.vercel.app
NODE_ENV        = production
PORT            = 4000
```

```bash
# 5. Railway auto-detects Node.js and runs `npm start`
# 6. Your backend URL will be: https://habitflow-backend.up.railway.app
```

### Frontend → Vercel

```bash
# 1. Push frontend to GitHub (separate repo or /frontend subfolder)

# 2. Go to vercel.com → New Project → Import GitHub repo

# 3. Configuration:
#    Framework Preset: Other (it's vanilla HTML)
#    Root Directory: frontend/
#    Build Command: (leave empty)
#    Output Directory: (leave empty or .)

# 4. Update frontend/js/config.js BEFORE deploying:
```

```js
// In frontend/js/config.js
BACKEND_URL: "https://habitflow-backend.up.railway.app",
```

```bash
# 5. Deploy — Vercel gives you: https://habitflow.vercel.app
```

### Post-deploy: Update CORS

After you have your Vercel URL, update Railway env var:
```
FRONTEND_URL = https://habitflow.vercel.app
```
Then redeploy Railway.

---

## ⚡ Streak Logic Explained

### How `getHabitStreak(habitId)` works

```
Start from today, count backwards day by day.
For each day: if habit was done → streak++
The moment we find a day where it wasn't done (after day 0) → STOP.
Day 0 (today) doesn't break the streak even if not done yet.
```

```
Example — today is Thursday:
  Mon: ✅  Tue: ✅  Wed: ✅  Thu: (today, not done yet)
  Streak = 3 ✅ (today's incomplete doesn't break it)

Example — with a gap:
  Mon: ✅  Tue: ❌  Wed: ✅  Thu: ✅
  Streak = 2 (breaks at Tuesday going backwards)
```

### How `getGlobalStreak()` works

Same logic, but requires **every** habit to be done on a given day.
This encourages users to complete ALL habits each day to maintain their streak.

### Why this formula for `getDisciplineScore()`

```
base  = (completions in last 7 days / max possible) × 80
bonus = min(globalStreak × 2, 20)
score = min(base + bonus, 100)
```

- **80% from recent behavior** — last 7 days is what matters
- **20% streak bonus** — rewards sustained consistency over time
- **Capped at 100** — keeps it readable as a percentage

---

## 🧪 QA Testing Checklist

### Authentication
- [ ] Google login works and redirects back to app
- [ ] Guest mode works with localStorage only
- [ ] Refreshing page auto-logs in (session persists)
- [ ] Logout clears state and returns to login screen
- [ ] After logout, cannot see other user's data

### Habit CRUD
- [ ] Add habit with name + emoji → appears in list immediately
- [ ] Edit habit → name and emoji update
- [ ] Delete habit → removed from list + DB
- [ ] Delete habit → its logs are also deleted
- [ ] Habit name is HTML-escaped (no XSS)

### Habit completion
- [ ] Mark done → check button turns green with animation
- [ ] Mark done again → unchecks correctly
- [ ] Progress bar updates correctly after toggling
- [ ] Week dots update correctly

### Streak logic
- [ ] Habit streak increments on consecutive days
- [ ] Streak resets to 0 after missing a day
- [ ] Global streak shows correctly in sidebar
- [ ] Week grid shows correct colors (partial vs full)

### Discipline score
- [ ] Score is 0 when no habits exist
- [ ] Score increases as habits are completed
- [ ] Score reflects last 7 days (not just today)
- [ ] Grade label changes at correct thresholds

### AI Coach
- [ ] `/api/ai/analyze` returns structured JSON
- [ ] AI result displays strongest, weakest, improvement, newHabit, encouragement
- [ ] Loading spinner shows while waiting
- [ ] Error state displays friendly message
- [ ] Rate limit (5/min) triggers correctly after 5 quick requests

### Security
- [ ] `GET /api/health` returns 200
- [ ] `POST /api/ai/analyze` from non-whitelisted origin → 403 CORS error
- [ ] No Groq API key visible in browser source/network
- [ ] Large payload (>50kb) returns 413
- [ ] 6th AI request within 1 minute returns 429

### Supabase
- [ ] Habits save to DB for logged-in users
- [ ] Logs save to DB for logged-in users
- [ ] User A cannot see User B's data (RLS test)
- [ ] Guest mode does NOT write to Supabase

---

## 📈 SaaS Scaling Roadmap

### Phase 1 — Foundation (current)
- ✅ Auth + CRUD + AI coaching
- ✅ Secure backend proxy
- ✅ Row-level security
- ✅ Rate limiting

### Phase 2 — Retention (next 3 months)
- **Daily push notifications** (Web Push API) — remind users at their set time
- **Streak protection shield** — 1 free "miss" per week for premium users
- **AI weekly report** — automated email summary every Sunday
- **Habit templates** — curated starter packs (student, fitness, mental health)

### Phase 3 — Monetization (months 4–6)
```
Free tier:
  - Up to 5 habits
  - 3 AI analyses per week
  - 30-day history

Pro ($4.99/mo):
  - Unlimited habits
  - Unlimited AI analyses
  - 365-day history
  - Weekly AI email report
  - Streak shield (1/week)
```

### Phase 4 — Growth (months 7–12)
- **Team challenges** — compete with friends, school groups
- **Parent dashboard** — parents can view (not edit) their teen's progress
- **Analytics dashboard** — heatmap, trend graphs, best/worst day patterns
- **API access** — let power users build integrations

### Caching strategy (when you hit scale)
```
Redis (Upstash):
  - Cache AI analysis results for 1 hour per user (same habits = same result)
  - Cache user habit list for 30s (prevents DB hammering on load)
  - Key pattern: ai:analyze:{userId}:{habitsHash}
```

### Queue system (for async AI at scale)
```
BullMQ + Redis:
  - Queue AI requests instead of awaiting them
  - User gets "Your analysis is generating..." UI
  - Webhook/SSE when done
  - Prevents Groq rate limits during traffic spikes
```

---

## 🔧 Local Development

```bash
# Backend
cd backend
cp .env.example .env     # Fill in your Groq key
npm install
npm run dev              # Starts on port 4000 with nodemon

# Frontend
cd frontend
# Option 1: VS Code Live Server (right-click index.html → Open with Live Server)
# Option 2: any static server
npx serve .              # Starts on port 3000
```

Test the AI endpoint manually:
```bash
curl -X POST http://localhost:4000/api/ai/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "habits": [{"id":"1","name":"Read","emoji":"📚"}],
    "stats": {
      "streakDays": 5,
      "weeklyPct": 70,
      "disciplineScore": 65,
      "habitStats": [{"id":"1","name":"Read","emoji":"📚","completionPct":70,"streak":5}]
    },
    "mood": "feeling good"
  }'
```

Expected response:
```json
{
  "strongest": "Read",
  "weakest": "Read",
  "improvement": "...",
  "newHabit": "...",
  "encouragement": "..."
}
```

---

Built by **Mawan** ✦ — Powered by Supabase, Groq, and discipline.
