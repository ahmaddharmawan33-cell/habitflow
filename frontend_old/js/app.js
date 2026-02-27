// js/app.js — HabitFlow v3
import { getCurrentUser, signInWithGoogle, signOut, onAuthChange, getUserDisplayName } from "./auth.js";
import {
  initForUser, initForGuest, clearStore,
  addHabit, updateHabit, deleteHabit, toggleHabit, setHabitStatus,
  getHabits, isDone, getHabitStreak, getGlobalStreak, getLogStatus,
  getDisciplineScore, getTodayCompletionPct, getWeekStats, getStats,
  getCurrentWeekKeys, todayKey, buildAIPayload,
} from "./habits.js";
import { analyzeHabits, checkAIHealth } from "./ai.js";
import {
  showScreen, switchPage, setPageChangeHandler,
  renderUserInfo, renderHeader, renderDisciplineScore,
  renderSidebarStreak, renderWeekGrid, renderTodayProgress,
  renderHabitList, renderMissedAlert, renderAIResult,
  setAILoading, setAIError, setAIText,
  renderProgressPage, renderAllHabitsPage,
  renderAchievementPage, renderInsightPage, renderFocusPage,
  toast, openModal, closeModal, renderEmojiGrid,
  setBtnLoading, applyTheme, getSavedTheme, saveTheme,
  openAIChat, appendChatMessage, setTypingIndicator, clearChatUI,
  renderGamification, celebrate,
} from "./ui.js";

let currentUser = null;
let editingHabitId = null;
let selectedEmoji = "📚";

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  applyTheme(getSavedTheme());
  try {
    currentUser = await getCurrentUser();
    if (currentUser) {
      await initForUser(currentUser.id);
      enterApp(currentUser);
    } else {
      showScreen("login");
    }
  } catch (err) {
    console.error("[init]", err);
    showScreen("login");
  }
  onAuthChange(async (event, session) => {
    if (event === "SIGNED_IN" && session?.user) {
      currentUser = session.user;
      await initForUser(currentUser.id);
      enterApp(currentUser);
    } else if (event === "SIGNED_OUT") {
      handleLogout();
    }
  });
}

function enterApp(user) {
  showScreen("app");
  renderUserInfo(user);
  switchPage("today");
  renderAll();
  autoAnalyze();
  detectMissedHabits();
}

// ── Render all ────────────────────────────────────────────────────────────────
function renderAll() {
  const habits = getHabits();
  const today = todayKey();
  const weekKeys = getCurrentWeekKeys();
  const weekStats = getWeekStats(weekKeys);
  const userName = currentUser ? getUserDisplayName(currentUser) : null;

  renderHeader(userName);
  renderDisciplineScore(getDisciplineScore());
  renderSidebarStreak(getGlobalStreak());
  renderWeekGrid(weekStats, today);
  renderTodayProgress(getTodayCompletionPct());
  renderGamification(getStats());

  // Wrapper for status-aware rendering
  const isDoneWithStatus = (id, date, returnStatus = false) => {
    if (returnStatus) return getLogStatus(id, date || today);
    return isDone(id, date || today);
  };
  renderHabitList(habits, isDoneWithStatus, getHabitStreak, weekKeys, today);
}

// ── Page navigation ───────────────────────────────────────────────────────────

// Save the original "today" page HTML so we can restore it after visiting other pages
let _todayPageHTML = null;

function saveTodayHTML() {
  const main = document.getElementById("mainContent");
  if (main && !_todayPageHTML) {
    _todayPageHTML = main.innerHTML;
  }
}

function restoreTodayPage() {
  const main = document.getElementById("mainContent");
  if (main && _todayPageHTML) {
    main.innerHTML = _todayPageHTML;
    // Rebind AI buttons
    document.getElementById("aiAnalyzeBtn")?.addEventListener("click", () => runAIAnalysis());
    document.getElementById("aiDailyBtn")?.addEventListener("click", () => runAIDailyEval());
    // Rebind add habit button
    document.getElementById("addHabitBtn")?.addEventListener("click", () => openHabitModal(null));
    // Rebind main menu AI chat
    document.getElementById("aiChatSendBtnMain")?.addEventListener("click", () => runAIChat("aiChatInputMain"));
    document.getElementById("aiChatInputMain")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        runAIChat("aiChatInputMain");
      }
    });
    // Rebind modal chat listeners
    document.getElementById("aiChatSendBtn")?.addEventListener("click", () => runAIChat("aiChatInputModal"));
    document.getElementById("aiChatInputModal")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        runAIChat("aiChatInputModal");
      }
    });
    document.getElementById("clearChatBtn")?.addEventListener("click", () => clearChatUI());
    // Allow reopening AI chat by clicking badge or message
    document.querySelector(".ai-badge")?.addEventListener("click", () => openAIChat());
    document.getElementById("aiMessage")?.addEventListener("click", () => openAIChat());
    // Rebind habit list click events
    document.getElementById("habitsList")?.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const { action, id } = btn.dataset;
      if (action === "toggle") {
        btn.classList.add("ripple");
        setTimeout(() => btn.classList.remove("ripple"), 400);
        const newState = await toggleHabit(id);
        renderAll();
      }
      if (action === "skip") {
        await setHabitStatus(id, "skipped");
        renderAll();
      }
      if (action === "edit") openHabitModal(id);
      if (action === "delete") {
        if (!confirm("Hapus habit ini? Tidak bisa dibatalkan.")) return;
        await deleteHabit(id);
        renderAll();
        toast("🗑️ Habit dihapus");
      }
    });
  }
}

setPageChangeHandler((page) => {
  const habits = getHabits();
  const weekKeys = getCurrentWeekKeys();
  const today = todayKey();

  switch (page) {
    case "today":
      restoreTodayPage();
      renderAll();
      break;
    case "progress":
      saveTodayHTML();
      renderProgressPage(habits, isDone, getWeekStats, getCurrentWeekKeys, todayKey);
      break;
    case "all-habits":
      saveTodayHTML();
      renderAllHabitsPage(
        habits, isDone, getHabitStreak, weekKeys, today,
        () => openHabitModal(null),
        (id) => openHabitModal(id),
        async (id) => {
          if (!confirm("Hapus habit ini? Tidak bisa dibatalkan.")) return;
          await deleteHabit(id);
          switchPage("all-habits");
          renderAll();
          toast("🗑️ Habit dihapus");
        },
        async (id) => {
          await toggleHabit(id);
          switchPage("all-habits");
        }
      );
      break;
    case "achievements":
      saveTodayHTML();
      renderAchievementPage(habits, isDone, getHabitStreak, getGlobalStreak, getDisciplineScore);
      break;
    case "insight":
      saveTodayHTML();
      renderInsightPage(habits, isDone, getHabitStreak);
      break;
    case "focus":
      saveTodayHTML();
      renderFocusPage();
      break;
  }
});

// ── Nav clicks ────────────────────────────────────────────────────────────────
document.querySelectorAll(".nav-item[data-page]").forEach(item => {
  item.addEventListener("click", () => {
    switchPage(item.dataset.page);
    // close mobile sidebar
    document.getElementById("sidebar")?.classList.remove("open");
    document.getElementById("sidebarBackdrop")?.classList.remove("open");
  });
  item.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); item.click(); }
  });
});

// ── Auth ──────────────────────────────────────────────────────────────────────
document.getElementById("loginGoogleBtn")?.addEventListener("click", async () => {
  setBtnLoading("loginGoogleBtn", true);
  try {
    await signInWithGoogle();
  } catch (err) {
    toast("❌ Login gagal: " + err.message, "error");
    setBtnLoading("loginGoogleBtn", false);
  }
});

document.getElementById("loginGuestBtn")?.addEventListener("click", () => {
  currentUser = null;
  initForGuest();
  showScreen("app");
  renderUserInfo(null);
  switchPage("today");
  renderAll();
  setAIText("Setup backend untuk AI coaching. Mode tamu hanya menyimpan data lokal.");
  detectMissedHabits();
});

document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  try { if (currentUser) await signOut(); } catch { }
  handleLogout();
});

function handleLogout() {
  clearStore();
  currentUser = null;
  showScreen("login");
  toast("Berhasil keluar.");
}

// ── Theme ─────────────────────────────────────────────────────────────────────
document.getElementById("themeToggle")?.addEventListener("change", (e) => {
  const theme = e.target.checked ? "dark" : "light";
  applyTheme(theme);
  saveTheme(theme);
});

// ── Mobile sidebar ────────────────────────────────────────────────────────────
document.getElementById("hamburger")?.addEventListener("click", () => {
  document.getElementById("sidebar")?.classList.toggle("open");
  document.getElementById("sidebarBackdrop")?.classList.toggle("open");
});
document.getElementById("sidebarBackdrop")?.addEventListener("click", () => {
  document.getElementById("sidebar")?.classList.remove("open");
  document.getElementById("sidebarBackdrop")?.classList.remove("open");
});

// ── Habit list events ─────────────────────────────────────────────────────────
document.getElementById("habitsList")?.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const { action, id } = btn.dataset;
  if (action === "toggle") {
    btn.classList.add("ripple");
    setTimeout(() => btn.classList.remove("ripple"), 400);
    const oldStats = getStats();
    const newState = await toggleHabit(id);
    const newStats = getStats();

    renderAll();
    if (newState) {
      celebrate();
      if (newStats.level > oldStats.level) {
        toast("🆙 LEVEL UP! Level " + newStats.level, "success");
        setTimeout(celebrate, 500);
      } else {
        toast("✅ Selesai! Pertahankan!");
      }
    } else {
      toast("⬜ Dibatalkan");
    }
  }
  if (action === "edit") openHabitModal(id);
  if (action === "delete") {
    if (!confirm("Hapus habit ini? Tidak bisa dibatalkan.")) return;
    await deleteHabit(id);
    renderAll();
    toast("🗑️ Habit dihapus");
  }
});

// ── Add habit ─────────────────────────────────────────────────────────────────
document.getElementById("addHabitBtn")?.addEventListener("click", () => openHabitModal(null));

function openHabitModal(habitId) {
  editingHabitId = habitId;
  const habit = habitId ? getHabits().find(h => h.id === habitId) : null;
  document.getElementById("habitModalTitle").textContent = habit ? "Edit Habit" : "Habit Baru";
  document.getElementById("habitNameInput").value = habit?.name ?? "";
  selectedEmoji = habit?.emoji ?? "📚";
  renderEmojiGrid(selectedEmoji, (emoji) => { selectedEmoji = emoji; });
  openModal("habitModal");
}

document.getElementById("saveHabitBtn")?.addEventListener("click", async () => {
  const name = document.getElementById("habitNameInput")?.value.trim();
  if (!name) { toast("⚠️ Masukkan nama habit.", "warn"); return; }
  setBtnLoading("saveHabitBtn", true);
  try {
    if (editingHabitId) {
      await updateHabit(editingHabitId, { name, emoji: selectedEmoji });
      toast("✏️ Habit diperbarui!");
    } else {
      await addHabit(name, selectedEmoji);
      toast("🎉 Habit ditambahkan!");
    }
    closeModal("habitModal");
    renderAll();
  } catch (err) {
    toast("❌ " + err.message, "error");
  }
  setBtnLoading("saveHabitBtn", false, editingHabitId ? "Simpan" : "Tambah Habit");
});

// ── Modal close ───────────────────────────────────────────────────────────────
document.querySelectorAll(".modal-overlay").forEach(overlay => {
  overlay.addEventListener("click", e => { if (e.target === overlay) closeModal(overlay.id); });
});
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal("habitModal"); });

// ── AI Coach ──────────────────────────────────────────────────────────────────
document.getElementById("aiAnalyzeBtn")?.addEventListener("click", () => {
  openAIChat();
  runAIAnalysis();
});
document.getElementById("aiDailyBtn")?.addEventListener("click", () => {
  openAIChat();
  runAIDailyEval();
});
document.getElementById("aiChatSendBtn")?.addEventListener("click", () => runAIChat("aiChatInputModal"));
document.getElementById("aiChatInputModal")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    runAIChat("aiChatInputModal");
  }
});
document.getElementById("aiChatSendBtnMain")?.addEventListener("click", () => runAIChat("aiChatInputMain"));
document.getElementById("aiChatInputMain")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    runAIChat("aiChatInputMain");
  }
});
document.getElementById("clearChatBtn")?.addEventListener("click", () => clearChatUI());

async function runAIChat(inputId = "aiChatInputModal") {
  const input = document.getElementById(inputId);
  const text = input?.value.trim();
  if (!text) return;
  input.value = "";

  openAIChat(); // Ensure modal is open when message is sent
  appendChatMessage('user', text);
  await runAIAnalysis(false, text);
}

async function autoAnalyze() {
  const habits = getHabits();
  if (habits.length === 0) return;
  const health = await checkAIHealth();
  if (health.status !== "ready") return;
  runAIAnalysis(true);
}

async function runAIAnalysis(silent = false, customText = null) {
  if (!silent) setAILoading(true);
  const btn = document.getElementById("aiAnalyzeBtn");
  const sendBtn = document.getElementById("aiChatSendBtn");
  if (btn) btn.disabled = true;
  if (sendBtn) sendBtn.disabled = true;

  try {
    const payload = customText ? buildAIPayload(customText) : buildAIPayload();
    const result = await analyzeHabits(payload);

    // Artificial delay for natural feel
    if (!silent) await new Promise(r => setTimeout(r, 800));

    renderAIResult(result);
    renderSuggestedQuestions(result);
  } catch (err) {
    setAIError(err.message);
    if (!silent) toast("❌ Error AI: " + err.message, "error");
  } finally {
    if (btn) btn.disabled = false;
    if (sendBtn) sendBtn.disabled = false;
    setTypingIndicator(false);
  }
}

async function runAIDailyEval() {
  setAILoading(true);
  const btn = document.getElementById("aiDailyBtn");
  if (btn) btn.disabled = true;
  try {
    const habits = getHabits();
    const today = todayKey();
    const done = habits.filter(h => isDone(h.id, today));
    const missed = habits.filter(h => !isDone(h.id, today));

    appendChatMessage('user', "Minta evaluasi harian dong!");
    openAIChat();

    const payload = buildAIPayload(
      `Evaluasi harian: selesai [${done.map(h => h.name).join(", ")}], terlewat [${missed.map(h => h.name).join(", ")}]`
    );
    const result = await analyzeHabits(payload);

    await new Promise(r => setTimeout(r, 1000));
    renderAIResult(result);
  } catch (err) {
    setAIError(err.message);
    toast("❌ Error AI: " + err.message, "error");
  } finally {
    if (btn) btn.disabled = false;
    setTypingIndicator(false);
  }
}

function renderSuggestedQuestions(result) {
  const container = document.getElementById('suggestedQuestions');
  if (!container) return;

  const questions = [
    "Tips konsisten?",
    "Kenapa aku malas?",
    "Cara bangun pagi?",
    "Micro-habit apa lagi?"
  ];

  container.innerHTML = questions.map(q => `
    <button class="suggest-btn" onclick="document.getElementById('aiChatInputModal').value='${q}'; document.getElementById('aiChatSendBtn').click();">${q}</button>
  `).join("");
}

// ── Missed habits ─────────────────────────────────────────────────────────────
function detectMissedHabits() {
  const missed = getHabits().filter(h => {
    let n = 0;
    for (let i = 1; i <= 3; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      if (!isDone(h.id, d.toISOString().slice(0, 10))) n++;
    }
    return n >= 3;
  });
  renderMissedAlert(missed);
}

init();