// js/ui.js
// ─────────────────────────────────────────────────────────────────────────────
// UI rendering module — all DOM manipulation lives here.
// Pure functions that take data and update the DOM.
// No business logic, no API calls.
// ─────────────────────────────────────────────────────────────────────────────

// ── Screen switching ─────────────────────────────────────────────────────────

export function showScreen(name) {
  document.querySelectorAll("[data-screen]").forEach((el) => {
    if (el.dataset.screen === name) {
      el.style.display = el.dataset.screen === "login" ? "flex" : "block";
    } else {
      el.style.display = "none";
    }
  });
}

// ── Page switching ───────────────────────────────────────────────────────────

let _currentPage = "today";
let _pageChangeHandler = null;

/**
 * Register a callback that fires whenever the active page changes.
 * @param {Function} handler - (pageName) => void
 */
export function setPageChangeHandler(handler) {
  _pageChangeHandler = handler;
}

/**
 * Switch the visible page and update nav active states.
 * @param {string} page - "today" | "progress" | "all-habits" | "achievements"
 */
export function switchPage(page) {
  _currentPage = page;

  // Update nav active states
  document.querySelectorAll(".nav-item[data-page]").forEach((item) => {
    item.classList.toggle("active", item.dataset.page === page);
  });

  // Fire the page change handler
  if (_pageChangeHandler) _pageChangeHandler(page);
}

// ── Progress page ────────────────────────────────────────────────────────────

export function renderProgressPage(habits, isDoneFn, getWeekStatsFn, getCurrentWeekKeysFn, todayKeyFn) {
  const main = document.getElementById("mainContent");
  if (!main) return;

  const weekKeys = getCurrentWeekKeysFn();
  const today = todayKeyFn();
  const weekStats = getWeekStatsFn(weekKeys);

  // Calculate weekly average
  const totalPct = weekStats.reduce((sum, d) => sum + d.pct, 0);
  const avgPct = weekStats.length ? Math.round(totalPct / weekStats.length) : 0;

  // Per-habit stats over the week
  const habitRows = habits.map((h) => {
    const doneDays = weekKeys.filter((k) => isDoneFn(h.id, k)).length;
    const pct = Math.round((doneDays / 7) * 100);
    return `
      <div class="habit-card" style="cursor:default">
        <div class="habit-body">
          <div class="habit-name">${h.emoji} ${esc(h.name)}</div>
          <div class="habit-meta">
            <span style="font-size:12px;color:var(--text-2)">${doneDays}/7 hari</span>
            <span class="streak-badge">${pct}%</span>
          </div>
        </div>
        <div style="flex-shrink:0;width:80px">
          <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
        </div>
      </div>`;
  }).join("");

  main.innerHTML = `
    <div class="page-header" style="animation:fadeUp .4s var(--spring) both">
      <h1 class="page-title">📊 Progress Mingguan</h1>
      <p class="page-subtitle">Ringkasan performa habitmu minggu ini.</p>
    </div>

    <div class="progress-wrap" style="animation:fadeUp .4s var(--spring) .05s both">
      <div class="progress-head">
        <div class="progress-title">Rata-rata Mingguan</div>
        <div class="progress-pct">${avgPct}%</div>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${avgPct}%"></div></div>
    </div>

    <div class="section-header"><div class="section-label">Per Habit</div></div>
    <div class="habits-list" style="animation:fadeUp .4s var(--spring) .1s both">
      ${habits.length > 0 ? habitRows : `
        <div class="empty-state">
          <span class="empty-icon">📊</span>
          <h3 class="empty-title">Belum ada data</h3>
          <p class="empty-desc">Tambahkan habit dan mulai tracking untuk melihat progress.</p>
        </div>`}
    </div>`;
}

// ── All Habits page ──────────────────────────────────────────────────────────

export function renderAllHabitsPage(habits, isDoneFn, streakFn, weekKeys, today, onAdd, onEdit, onDelete, onToggle) {
  const main = document.getElementById("mainContent");
  if (!main) return;

  const habitCards = habits.map((h) => {
    const done = isDoneFn(h.id, today);
    const streak = streakFn(h.id);
    const dots = weekKeys.map((k) => {
      const isOn = isDoneFn(h.id, k);
      const isCur = k === today;
      return `<div class="wd${isOn ? " on" : ""}${isCur ? " cur" : ""}" aria-hidden="true"></div>`;
    }).join("");

    return `
      <div class="habit-card${done ? " done-card" : ""}" id="all-card-${h.id}" role="listitem">
        <button class="check-btn${done ? " checked" : ""}"
                data-action="all-toggle" data-id="${h.id}"
                aria-label="${done ? "Mark incomplete" : "Mark complete"}: ${esc(h.name)}">
          <span class="check-icon" aria-hidden="true">✓</span>
        </button>
        <div class="habit-body">
          <div class="habit-name">${esc(h.name)}</div>
          <div class="habit-meta">
            <span class="habit-emoji">${h.emoji}</span>
            ${streak > 0 ? `<span class="streak-badge">🔥 ${streak}d</span>` : ""}
            <div class="week-dots">${dots}</div>
          </div>
        </div>
        <div class="habit-acts" style="opacity:1">
          <button class="icon-btn" data-action="all-edit" data-id="${h.id}" aria-label="Edit ${esc(h.name)}">✏️</button>
          <button class="icon-btn del" data-action="all-delete" data-id="${h.id}" aria-label="Delete ${esc(h.name)}">🗑️</button>
        </div>
      </div>`;
  }).join("");

  main.innerHTML = `
    <div class="page-header" style="animation:fadeUp .4s var(--spring) both">
      <h1 class="page-title">🗂️ Semua Habit</h1>
      <p class="page-subtitle">Kelola semua habit kamu di sini.</p>
    </div>

    <div class="habits-toolbar">
      <button class="add-habit-btn" id="allAddBtn">＋ Tambah Habit</button>
      <div class="section-label">${habits.length} Habit</div>
    </div>

    <div class="habits-list" role="list" style="animation:fadeUp .4s var(--spring) .1s both">
      ${habits.length > 0 ? habitCards : `
        <div class="empty-state">
          <span class="empty-icon">🗂️</span>
          <h3 class="empty-title">Belum ada habit</h3>
          <p class="empty-desc">Klik "Tambah Habit" untuk mulai.</p>
        </div>`}
    </div>`;

  // Bind events
  document.getElementById("allAddBtn")?.addEventListener("click", onAdd);
  main.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const { action, id } = btn.dataset;
    if (action === "all-toggle") onToggle(id);
    if (action === "all-edit") onEdit(id);
    if (action === "all-delete") onDelete(id);
  });
}

// ── Achievements page ────────────────────────────────────────────────────────

export function renderAchievementPage(habits, isDoneFn, streakFn, getGlobalStreakFn, getDisciplineScoreFn) {
  const main = document.getElementById("mainContent");
  if (!main) return;

  const globalStreak = getGlobalStreakFn();
  const score = getDisciplineScoreFn();
  const totalHabits = habits.length;

  // Calculate total completions (last 30 days)
  let totalCompletions = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    habits.forEach((h) => { if (isDoneFn(h.id, key)) totalCompletions++; });
  }

  // Best habit (highest streak)
  let bestHabit = null;
  let bestStreak = 0;
  habits.forEach((h) => {
    const s = streakFn(h.id);
    if (s > bestStreak) { bestStreak = s; bestHabit = h; }
  });

  const achievements = [
    { emoji: "🌱", name: "Pemula", desc: "Tambahkan habit pertama", done: totalHabits >= 1 },
    { emoji: "🎯", name: "Fokus", desc: "Punya 3 habit aktif", done: totalHabits >= 3 },
    { emoji: "🔥", name: "On Fire", desc: "Streak 3 hari berturut-turut", done: globalStreak >= 3 },
    { emoji: "⚡", name: "Konsisten", desc: "Streak 7 hari berturut-turut", done: globalStreak >= 7 },
    { emoji: "🏆", name: "Champion", desc: "Streak 14 hari berturut-turut", done: globalStreak >= 14 },
    { emoji: "💎", name: "Legend", desc: "Streak 30 hari berturut-turut", done: globalStreak >= 30 },
    { emoji: "📈", name: "Rising Star", desc: "Skor disiplin 50+", done: score >= 50 },
    { emoji: "🌟", name: "Elite", desc: "Skor disiplin 90+", done: score >= 90 },
    { emoji: "💯", name: "Centurion", desc: "100 total completions", done: totalCompletions >= 100 },
    { emoji: "🗓️", name: "Dedicated", desc: "5 habit aktif", done: totalHabits >= 5 },
  ];

  const unlocked = achievements.filter((a) => a.done).length;

  main.innerHTML = `
    <div class="page-header" style="animation:fadeUp .4s var(--spring) both">
      <h1 class="page-title">🏆 Pencapaian</h1>
      <p class="page-subtitle">Kumpulkan achievement dengan konsistensi!</p>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:28px;animation:fadeUp .4s var(--spring) .05s both">
      <div class="kpi-score" style="grid-column:auto">
        <div class="kpi-label" style="color:var(--amber)">🏅 Unlocked</div>
        <div class="kpi-score-num" style="color:var(--amber);font-size:28px">${unlocked}/${achievements.length}</div>
      </div>
      <div class="kpi-score" style="grid-column:auto">
        <div class="kpi-label" style="color:var(--green)">📊 Completions (30d)</div>
        <div class="kpi-score-num" style="color:var(--green);font-size:28px">${totalCompletions}</div>
      </div>
      ${bestHabit ? `<div class="kpi-score" style="grid-column:auto">
        <div class="kpi-label" style="color:var(--violet)">⭐ Best Habit</div>
        <div class="kpi-score-num" style="color:var(--violet);font-size:18px">${bestHabit.emoji} ${esc(bestHabit.name)}</div>
      </div>` : ""}
    </div>

    <div class="section-header"><div class="section-label">Achievements</div></div>
    <div class="habits-list" style="animation:fadeUp .4s var(--spring) .1s both">
      ${achievements.map((a) => `
        <div class="habit-card" style="cursor:default;${a.done ? "" : "opacity:.4"}">
          <div style="font-size:24px;flex-shrink:0;width:36px;text-align:center">${a.emoji}</div>
          <div class="habit-body">
            <div class="habit-name">${esc(a.name)}</div>
            <div style="font-size:12px;color:var(--text-2)">${esc(a.desc)}</div>
          </div>
          <div style="flex-shrink:0;font-size:16px">${a.done ? "✅" : "🔒"}</div>
        </div>`).join("")}
    </div>`;
}

// ── Insight page (placeholder) ───────────────────────────────────────────────

export function renderInsightPage(habits, isDoneFn, streakFn) {
  const main = document.getElementById("mainContent");
  if (!main) return;

  main.innerHTML = `
    <div class="page-header" style="animation:fadeUp .4s var(--spring) both">
      <h1 class="page-title">💡 Insight</h1>
      <p class="page-subtitle">Analisis mendalam tentang kebiasaanmu. Segera hadir!</p>
    </div>
    <div class="empty-state" style="animation:fadeUp .4s var(--spring) .1s both">
      <span class="empty-icon">🔮</span>
      <h3 class="empty-title">Coming Soon</h3>
      <p class="empty-desc">Fitur insight akan tersedia di update berikutnya.</p>
    </div>`;
}


// ── User info ────────────────────────────────────────────────────────────────

export function renderUserInfo(user) {
  const nameEl = document.getElementById("userName");
  const badgeEl = document.getElementById("userBadge");
  const avatarEl = document.getElementById("userAvatar");

  if (!user) {
    nameEl.textContent = "Guest";
    badgeEl.textContent = "LOCAL";
    avatarEl.innerHTML = "👤";
    return;
  }

  const meta = user.user_metadata || {};
  const name = (meta.full_name || meta.name || user.email || "User").split(" ")[0];
  nameEl.textContent = name;
  badgeEl.textContent = "CLOUD";

  if (meta.avatar_url) {
    avatarEl.innerHTML = `<img src="${meta.avatar_url}" alt="${esc(name)}" />`;
  } else {
    avatarEl.textContent = name[0].toUpperCase();
  }
}

// ── Header ───────────────────────────────────────────────────────────────────

export function renderHeader(userName) {
  const h = new Date().getHours();
  const greeting =
    h < 5 ? "Selamat malam" :
      h < 12 ? "Selamat pagi" :
        h < 15 ? "Selamat siang" :
          h < 19 ? "Selamat sore" : "Selamat malam";

  const title = `${greeting}${userName ? ", " + userName : ""}! 👋`;

  const titleEl = document.getElementById("greetingTitle");
  const dateEl = document.getElementById("todayDate");

  if (titleEl) titleEl.textContent = title;
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString("id-ID", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
  }
}

// ── Discipline score ──────────────────────────────────────────────────────────

export function renderDisciplineScore(score) {
  const numEl = document.getElementById("disciplineScore");
  const fillEl = document.getElementById("scoreFill");
  const gradeEl = document.getElementById("scoreGrade");

  if (numEl) numEl.textContent = score;
  if (fillEl) fillEl.style.width = score + "%";

  if (!gradeEl) return;

  const grades = [
    { min: 90, label: "🏆 ELITE", color: "var(--ai)" },
    { min: 70, label: "🔥 ADVANCED", color: "var(--streak)" },
    { min: 50, label: "📈 INTERMEDIATE", color: "var(--success)" },
    { min: 25, label: "🌱 BEGINNER", color: "var(--accent)" },
    { min: 0, label: "💤 MULAI YUK", color: "var(--text-muted)" },
  ];

  const grade = grades.find((g) => score >= g.min) || grades[grades.length - 1];
  gradeEl.textContent = grade.label;
  gradeEl.style.color = grade.color;
}

// ── Sidebar streak ────────────────────────────────────────────────────────────

export function renderSidebarStreak(streak) {
  const el = document.getElementById("sidebarStreak");
  if (el) el.textContent = streak;
}

// ── Week grid ────────────────────────────────────────────────────────────────

/**
 * @param {Array<{date, total, done, pct}>} weekStats
 * @param {string} today - current date key
 */
export function renderWeekGrid(weekStats, today) {
  const container = document.getElementById("weekGrid");
  if (!container) return;

  const dayLabels = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

  container.innerHTML = weekStats
    .map(({ date, total, done, pct }, i) => {
      const isToday = date === today;
      const ringClass = pct === 100 ? "full" : pct > 0 ? "partial" : "";
      return `
        <div class="day-cell${isToday ? " today" : ""}">
          <div class="day-label">${dayLabels[i]}</div>
          <div class="day-ring ${ringClass}">
            <span>${total ? done : "–"}</span>
          </div>
          <div class="day-pct">${total ? pct + "%" : ""}</div>
        </div>`;
    })
    .join("");
}

// ── Progress bar ─────────────────────────────────────────────────────────────

export function renderTodayProgress(pct) {
  const pctEl = document.getElementById("todayPct");
  const fillEl = document.getElementById("progressFill");
  if (pctEl) pctEl.textContent = pct + "%";
  if (fillEl) fillEl.style.width = pct + "%";
}

// ── Habit list ────────────────────────────────────────────────────────────────

/**
 * @param {Array} habits
 * @param {Function} isDoneFn - (habitId, date?) => boolean
 * @param {Function} streakFn - (habitId) => number
 * @param {Array<string>} weekKeys
 * @param {string} today
 */
export function renderHabitList(habits, isDoneFn, streakFn, weekKeys, today) {
  const container = document.getElementById("habitsList");
  if (!container) return;

  if (habits.length === 0) {
    container.innerHTML = `
      <div class="empty-state" role="status" aria-live="polite">
        <span class="empty-icon" aria-hidden="true">🌱</span>
        <h3 class="empty-title">Belum ada habit</h3>
        <p class="empty-desc">Klik "Tambah Habit" untuk memulai perjalananmu.</p>
      </div>`;
    return;
  }

  container.innerHTML = habits
    .map((habit) => {
      const status = isDoneFn(habit.id, today, true); // Overloaded to return status
      const streak = streakFn(habit.id);
      const dots = weekKeys
        .map((k) => {
          const s = isDoneFn(habit.id, k, true);
          const isCur = k === today;
          let dotClass = "";
          if (s === "done") dotClass = " on";
          if (s === "skipped") dotClass = " skipped";
          if (s === "rest") dotClass = " rest";
          return `<div class="wd${dotClass}${isCur ? " cur" : ""}" aria-hidden="true"></div>`;
        })
        .join("");

      return `
        <div class="habit-card${status === "done" ? " done-card" : ""}${status === "skipped" ? " skipped-card" : ""}${status === "rest" ? " rest-card" : ""}"
             id="card-${habit.id}"
             role="listitem">
          <button class="check-btn${status === "done" ? " checked" : ""}"
                  id="chk-${habit.id}"
                  aria-label="${status === "done" ? "Mark incomplete" : "Mark complete"}: ${esc(habit.name)}"
                  data-action="toggle"
                  data-id="${habit.id}">
            <span class="check-icon" aria-hidden="true">✓</span>
          </button>

          <div class="habit-body">
            <div class="habit-name">${esc(habit.name)}</div>
            <div class="habit-meta">
              <span class="habit-emoji" aria-hidden="true">${habit.emoji}</span>
              ${streak > 0 ? `<span class="streak-badge" aria-label="${streak} day streak">🔥 ${streak}d</span>` : ""}
              <div class="week-dots" aria-label="This week">${dots}</div>
            </div>
          </div>

          <div class="habit-acts" role="group" aria-label="Habit actions">
            <button class="icon-btn"
                    data-action="skip"
                    data-id="${habit.id}"
                    title="Skip (Safe)"
                    aria-label="Skip ${esc(habit.name)}">⏭️</button>
            <button class="icon-btn"
                    data-action="edit"
                    data-id="${habit.id}"
                    aria-label="Edit ${esc(habit.name)}">✏️</button>
            <button class="icon-btn del"
                    data-action="delete"
                    data-id="${habit.id}"
                    aria-label="Delete ${esc(habit.name)}">🗑️</button>
          </div>
        </div>`;
    })
    .join("");
}

// ── Missed habits alert ───────────────────────────────────────────────────────

export function renderMissedAlert(missedHabits) {
  const el = document.getElementById("aiAlert");
  if (!el) return;

  if (missedHabits.length === 0) {
    el.classList.remove("show");
    return;
  }

  const names = missedHabits.map((h) => `${h.emoji} ${h.name}`).join(", ");
  document.getElementById("aiAlertBody").textContent =
    `Terlewat 3 hari+: ${names}. Besok, cukup 5 menit aja. Deal? 💪`;
  el.classList.add("show");
}

// ── AI Coach Chat ─────────────────────────────────────────────────────────────
export function openAIChat() {
  const modal = document.getElementById('aiCoachModal');
  if (modal) {
    modal.classList.add('open');
    document.getElementById('aiChatInputModal')?.focus();
  }
}

export function appendChatMessage(role, content, result = null) {
  const chatBody = document.getElementById('chatBody');
  if (!chatBody) return;

  // Remove welcome if first message
  const welcome = chatBody.querySelector('.chat-welcome');
  if (welcome) welcome.remove();

  const msgDiv = document.createElement('div');
  msgDiv.className = `msg msg-${role}`;

  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  let html = `<div class="msg-content">${content}</div>`;

  // Show detailed stats only for 'Harian'/'Mingguan' specifically, not every chat reply
  if (result && (result.strongest || result.weakest)) {
    html += `
      <div class="ai-chat-result">
        ${result.strongest ? `<div class="ai-result-row" style="font-size:11px;margin-top:8px"><span class="ai-tag strongest" style="padding:1px 6px">Terkuat</span> <span style="opacity:0.8">${esc(result.strongest)}</span></div>` : ''}
        ${result.weakest ? `<div class="ai-result-row" style="font-size:11px"><span class="ai-tag weakest" style="padding:1px 6px">Perlu Ditingkatkan</span> <span style="opacity:0.8">${esc(result.weakest)}</span></div>` : ''}
      </div>
    `;
  }

  html += `<span class="msg-time">${time}</span>`;
  msgDiv.innerHTML = html;

  chatBody.appendChild(msgDiv);
  chatBody.scrollTop = chatBody.scrollHeight;
}

export function setTypingIndicator(show) {
  const indicator = document.getElementById('typingIndicator');
  if (indicator) indicator.style.display = show ? 'flex' : 'none';
  const chatBody = document.getElementById('chatBody');
  if (show && chatBody) chatBody.scrollTop = chatBody.scrollHeight;
}

export function clearChatUI() {
  const chatBody = document.getElementById('chatBody');
  if (!chatBody) return;
  chatBody.innerHTML = `
    <div class="chat-welcome">
      <div class="ai-logo-large">✦</div>
      <h3>Chat Dihapus.</h3>
      <p>Ada yang mau ditanyakan lagi?</p>
    </div>
  `;
}

// ── AI result card ────────────────────────────────────────────────────────────

export function renderAIResult(result) {
  const el = document.getElementById("aiMessage");
  if (!el) return;

  // Also append to chat
  appendChatMessage('ai', result.encouragement, result);

  const html = `<div class="ai-result">
    <div class="ai-encouragement">${esc(result.encouragement)}</div>
  </div>`;

  el.innerHTML = html;
}

export function setAILoading(loading) {
  setTypingIndicator(loading);
  const el = document.getElementById("aiMessage");
  if (!el) return;

  if (loading) {
    el.innerHTML = `
      <div class="ai-loading" aria-live="polite">
        <div class="ai-dot" aria-hidden="true"></div>
        <span>Sedang berpikir...</span>
      </div>`;
  }
}

export function setAIError(message) {
  setTypingIndicator(false);
  const el = document.getElementById("aiMessage");
  if (!el) return;
  el.innerHTML = `<div class="ai-error" role="alert">⚠️ ${esc(message)}</div>`;
  appendChatMessage('ai', `Aduh, sepertinya ada masalah: ${message}`);
}

export function setAIText(text) {
  const el = document.getElementById("aiMessage");
  if (!el) return;
  el.textContent = text;
}

// ── Toast ─────────────────────────────────────────────────────────────────────

export function toast(message, type = "default") {
  const container = document.getElementById("toastWrap");
  if (!container) return;

  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.textContent = message;
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");

  container.appendChild(el);

  // Auto-remove after 2.8s
  setTimeout(() => {
    el.classList.add("out");
    setTimeout(() => el.remove(), 300);
  }, 2800);
}

// ── Modal helpers ─────────────────────────────────────────────────────────────

export function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add("open");
  // Focus first focusable element inside modal
  setTimeout(() => {
    const focusable = el.querySelector("input, button, select, textarea");
    if (focusable) focusable.focus();
  }, 60);
}

export function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("open");
}

// ── Emoji grid ────────────────────────────────────────────────────────────────

const EMOJIS = [
  "📚", "🏃", "💧", "🍎", "🧘", "✍️", "🎸", "🌱",
  "🏋️", "💻", "🛌", "🧹", "🎨", "🗣️", "📝", "🚴",
  "🧠", "💊", "☀️", "🌙", "🎯", "🔬", "🧪", "🍵",
  "🏊", "🎵", "📖", "🌿", "🤸", "🧗", "🧘", "🎒",
];

export function renderEmojiGrid(selectedEmoji, onSelect) {
  const container = document.getElementById("emojiGrid");
  if (!container) return;

  container.innerHTML = EMOJIS.map((em) => `
    <button class="emoji-opt${em === selectedEmoji ? " sel" : ""}"
            data-emoji="${em}"
            aria-label="${em}"
            aria-pressed="${em === selectedEmoji}"
            type="button">${em}</button>
  `).join("");

  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".emoji-opt");
    if (!btn) return;
    onSelect(btn.dataset.emoji);
    container.querySelectorAll(".emoji-opt").forEach((b) => {
      b.classList.toggle("sel", b === btn);
      b.setAttribute("aria-pressed", b === btn ? "true" : "false");
    });
  });
}

// ── Btn loading state ─────────────────────────────────────────────────────────

export function setBtnLoading(btnId, loading, originalText) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  if (loading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = `<span class="spinner-sm" aria-hidden="true"></span> Loading…`;
  } else {
    btn.innerHTML = originalText ?? btn.dataset.originalText ?? "Submit";
  }
}

// ── Theme ────────────────────────────────────────────────────────────────────

export function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const toggle = document.getElementById("themeToggle");
  if (toggle) toggle.checked = theme === "dark";
}

export function getSavedTheme() {
  return localStorage.getItem("hf_theme") || "dark";
}

export function saveTheme(theme) {
  localStorage.setItem("hf_theme", theme);
}

// ── Utils ─────────────────────────────────────────────────────────────────────

function esc(str) {
  if (typeof str !== "string") return "";
  return str.replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

// ── Gamification ─────────────────────────────────────────────────────────────

export function renderGamification(stats) {
  const levelEl = document.getElementById("userLevel");
  const xpEl = document.getElementById("userXP");
  const nextEl = document.getElementById("nextLevelXP");
  const fillEl = document.getElementById("xpFill");
  const charEl = document.getElementById("xpChar");

  if (levelEl) levelEl.textContent = stats.level;
  if (xpEl) xpEl.textContent = stats.xp;
  if (nextEl) nextEl.textContent = stats.nextLevelXP;

  const pct = Math.round((stats.xp / stats.nextLevelXP) * 100);
  if (fillEl) fillEl.style.width = pct + "%";

  if (charEl) {
    // Character evolves every 5 levels
    const chars = ["🐣", "🐥", "🐦", "🦅", "🐉", "👑"];
    const idx = Math.min(Math.floor((stats.level - 1) / 5), chars.length - 1);
    charEl.textContent = chars[idx];
  }
}

let _confettiLoaded = false;
export function celebrate() {
  if (typeof confetti === "undefined") {
    if (!_confettiLoaded) {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js";
      document.head.appendChild(script);
      _confettiLoaded = true;
    }
    return;
  }
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#e8623a', '#2dd67b', '#8b72f8']
  });
}

// ── Focus Mode ───────────────────────────────────────────────────────────────

let focusTimer = null;
let focusSeconds = 25 * 60;
let isFocusRunning = false;

export function renderFocusPage() {
  const main = document.getElementById("mainContent");
  if (!main) return;

  main.innerHTML = `
    <div class="page-header" style="animation:fadeUp .4s var(--spring) both">
      <h1 class="page-title">⏱️ Focus Mode</h1>
      <p class="page-subtitle">Selesaikan habitmu dengan timer Pomodoro.</p>
    </div>

    <div class="focus-container" style="animation:fadeUp .4s var(--spring) .05s both">
      <div class="focus-timer" id="focusTimerDisplay">25:00</div>
      <div class="focus-label" id="focusStatus">Waktunya Fokus!</div>
      
      <div class="focus-controls">
        <button class="focus-btn primary" id="focusStartBtn">Start</button>
        <button class="focus-btn" id="focusResetBtn">Reset</button>
      </div>

      <div class="focus-habits">
        <h3 style="margin-bottom:12px; font-size:14px; color:var(--text-3)">Habit Hari Ini</h3>
        <p style="font-size:12px; color:var(--text-4)">Fokus pada satu hal dalam satu waktu.</p>
      </div>
    </div>
  `;

  updateFocusDisplay();

  document.getElementById("focusStartBtn")?.addEventListener("click", toggleFocusTimer);
  document.getElementById("focusResetBtn")?.addEventListener("click", resetFocusTimer);
}

function updateFocusDisplay() {
  const el = document.getElementById("focusTimerDisplay");
  if (!el) return;
  const m = Math.floor(focusSeconds / 60);
  const s = focusSeconds % 60;
  el.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function toggleFocusTimer() {
  const btn = document.getElementById("focusStartBtn");
  if (isFocusRunning) {
    clearInterval(focusTimer);
    isFocusRunning = false;
    if (btn) btn.textContent = "Resume";
  } else {
    isFocusRunning = true;
    if (btn) btn.textContent = "Pause";
    focusTimer = setInterval(() => {
      focusSeconds--;
      updateFocusDisplay();
      if (focusSeconds <= 0) {
        clearInterval(focusTimer);
        isFocusRunning = false;
        if (btn) btn.textContent = "Start";
        alert("Waktu fokus selesai! Istirahat sejenak ☕");
        focusSeconds = 25 * 60;
        updateFocusDisplay();
      }
    }, 1000);
  }
}

function resetFocusTimer() {
  clearInterval(focusTimer);
  isFocusRunning = false;
  focusSeconds = 25 * 60;
  updateFocusDisplay();
  const btn = document.getElementById("focusStartBtn");
  if (btn) btn.textContent = "Start";
}
