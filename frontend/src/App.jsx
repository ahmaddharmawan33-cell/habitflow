import { useState, useEffect, useRef, useCallback } from "react";
import confetti from "canvas-confetti";
import { supabase } from "./lib/supabase";
import Login from "./pages/Login";

// ============================================================
// CONSTANTS & DATA
// ============================================================
const LEVELS = [
  { level: 1, xpRequired: 0, title: "Pemula", emoji: "🥚", costume: "Telur Mula", color: "#888" },
  { level: 2, xpRequired: 100, title: "Pejuang", emoji: "🐣", costume: "Bibit Tekad", color: "#a0c4ff" },
  { level: 3, xpRequired: 250, title: "Penjelajah", emoji: "🐥", costume: "Jiwa Petualang", color: "#ffd6a5" },
  { level: 4, xpRequired: 500, title: "Pendekar", emoji: "🦅", costume: "Elang Pengawas", color: "#caffbf" },
  { level: 5, xpRequired: 900, title: "Maestro", emoji: "🦁", costume: "Singa Disiplin", color: "#ffadad" },
  { level: 6, xpRequired: 1500, title: "Legenda", emoji: "🐉", costume: "Naga Evolusi", color: "#ffc6ff" },
  { level: 7, xpRequired: 2500, title: "Abadi", emoji: "✨", costume: "Cahaya Sejati", color: "#fdffb6" },
];

const BADGES = [
  { id: "first_habit", name: "Langkah Pertama", desc: "Selesaikan habit pertama", icon: "👣", condition: (s) => s.totalCompleted >= 1 },
  { id: "streak_3", name: "On Fire!", desc: "Streak 3 hari berturut", icon: "🔥", condition: (s) => s.maxStreak >= 3 },
  { id: "streak_7", name: "Seminggu Penuh", desc: "Streak 7 hari", icon: "🌟", condition: (s) => s.maxStreak >= 7 },
  { id: "habits_5", name: "Multi Tasker", desc: "Punya 5 habit aktif", icon: "🎯", condition: (s) => s.habitCount >= 5 },
  { id: "perfect_day", name: "Hari Sempurna", desc: "100% completion dalam sehari", icon: "💎", condition: (s) => s.perfectDays >= 1 },
  { id: "freeze_used", name: "Survival Mode", desc: "Gunakan Streak Freeze", icon: "🧊", condition: (s) => s.freezeUsed >= 1 },
  { id: "rest_day", name: "Work Smarter", desc: "Ambil Rest Day", icon: "🛌", condition: (s) => s.restDaysUsed >= 1 },
  { id: "pomodoro_5", name: "Fokus Pro", desc: "Selesaikan 5 Pomodoro", icon: "⏱️", condition: (s) => s.pomodoroCompleted >= 5 },
];

const COSTUMES = [
  { level: 1, name: "Telur Mula", emoji: "🥚", desc: "Awal dari segalanya", bg: "linear-gradient(135deg,#333,#555)" },
  { level: 2, name: "Bibit Tekad", emoji: "🌱", desc: "Mulai tumbuh perlahan", bg: "linear-gradient(135deg,#1a472a,#2d6a4f)" },
  { level: 3, name: "Jiwa Petualang", emoji: "⛺", desc: "Siap menjelajahi habit baru", bg: "linear-gradient(135deg,#7b4f12,#c8852e)" },
  { level: 4, name: "Elang Pengawas", emoji: "🦅", desc: "Melihat target dari ketinggian", bg: "linear-gradient(135deg,#1a1a2e,#16213e)" },
  { level: 5, name: "Singa Disiplin", emoji: "👑", desc: "Penguasa hari yang teratur", bg: "linear-gradient(135deg,#7b2d00,#c84b00)" },
  { level: 6, name: "Naga Evolusi", emoji: "🐉", desc: "Bentuk tertinggi konsistensi", bg: "linear-gradient(135deg,#12003b,#4a0080)" },
  { level: 7, name: "Cahaya Sejati", emoji: "🌌", desc: "Menjadi satu dengan produktivitas", bg: "linear-gradient(135deg,#000020,#001060)" },
];

const SAMPLE_HABITS = [
  { id: 1, name: "Olahraga Pagi", icon: "🏃", category: "Kesehatan", frequency: "daily", time: "07:00", energy: "high", completedDates: [], streak: 0, xpReward: 20, skipped: [], notes: "" },
  { id: 2, name: "Baca Buku", icon: "📚", category: "Belajar", frequency: "daily", time: "20:00", energy: "medium", completedDates: [], streak: 0, xpReward: 15, skipped: [], notes: "" },
  { id: 3, name: "Meditasi", icon: "🧘", category: "Kesehatan", frequency: "daily", time: "06:30", energy: "low", completedDates: [], streak: 0, xpReward: 10, skipped: [], notes: "" },
];

const NATIONAL_HOLIDAYS = {
  "2026-01-01": "Tahun Baru Masehi",
  "2026-02-17": "Isra Mi'raj",
  "2026-02-17": "Tahun Baru Imlek",
  "2026-03-19": "Hari Suci Nyepi",
  "2026-03-20": "Idul Fitri 1447 H",
  "2026-03-21": "Idul Fitri Hari Kedua",
  "2026-03-25": "Wafat Yesus Kristus",
  "2026-05-01": "Hari Buruh Internasional",
  "2026-05-14": "Kenaikan Yesus Kristus",
  "2026-05-27": "Hari Raya Waisak",
  "2026-05-27": "Idul Adha 1447 H",
  "2026-06-01": "Hari Lahir Pancasila",
  "2026-07-16": "Tahun Baru Islam 1448 H",
  "2026-08-17": "Hari Kemerdekaan RI",
  "2026-09-25": "Maulid Nabi Muhammad SAW",
  "2026-12-25": "Hari Raya Natal",
};

const getToday = () => new Date().toISOString().split("T")[0];
const getTodayDay = () => new Date().getDay();

// ============================================================
// UTILS
// ============================================================
const ICONS = ["🏃", "📚", "🧘", "💊", "🥗", "💤", "🏋️", "🎯", "✍️", "🎸", "🎨", "🧹", "💧", "🌿", "📝", "💼", "🍳", "🚴", "🏊", "🧠", "☀️", "🌙", "⚡", "🌟", "❤️", "🎵", "📱", "🖥️", "🤝", "🦷", "🧴", "🌸"];

function getLevelInfo(xp) {
  let current = LEVELS[0], next = LEVELS[1];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpRequired) { current = LEVELS[i]; next = LEVELS[i + 1] || null; break; }
  }
  const xpInLevel = xp - current.xpRequired;
  const xpForNext = next ? next.xpRequired - current.xpRequired : 100;
  return { current, next, xpInLevel, xpForNext, pct: Math.min(100, (xpInLevel / xpForNext) * 100) };
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Selamat pagi! ☀️";
  if (h < 15) return "Selamat siang! 🌤️";
  if (h < 18) return "Selamat sore! 🌅";
  return "Selamat malam! 🌙";
}

function formatDate() {
  return new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).toUpperCase();
}

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ============================================================
// AI COACH HOOK
// ============================================================
function useAICoach() {
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem("hf_ai_messages");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return [{ role: "ai", text: "Hei! Saya AI Coach kamu 🤖 Siap bantu kamu konsisten dan berkembang. Mau tanya apa?" }];
  });
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem("hf_ai_history");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return [];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem("hf_ai_messages", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem("hf_ai_history", JSON.stringify(history));
  }, [history]);

  const sendMessage = useCallback(async (text, context = "") => {
    if (!text.trim()) return;
    const userMsg = text.trim();
    setMessages(p => [...p, { role: "user", text: userMsg }]);
    setInput("");
    setLoading(true);

    const startTime = Date.now();

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${apiUrl}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, context, history: history.slice(-10) })
      });
      const data = await res.json();
      const reply = data.reply || "Maaf, ada kendala koneksi. Coba lagi ya!";

      const elapsed = Date.now() - startTime;
      const delay = Math.max(800, 1500 - elapsed);

      setTimeout(() => {
        let cleanReply = reply;

        // 1. Parsing tags line by line for better reliability
        const lines = reply.split("\n");
        lines.forEach(line => {
          // --- KALENDER ---
          const scheduleMatch = line.match(/\[SET_SCHEDULE:\s*(\d{4}-\d{2}-\d{2})\]\s*(.*)/i);
          if (scheduleMatch) {
            const [fullTag, date, content] = scheduleMatch;
            window.dispatchEvent(new CustomEvent("ai-schedule", { detail: { date, content: content.trim() } }));
            cleanReply = cleanReply.replace(fullTag, "");
          }

          // --- ADD HABIT ---
          const addHabitRegex = /\[ADD_HABIT:\s*([^:]+):\s*([^:]+):\s*([^\]]+)\]/i;
          const addHabitMatch = line.match(addHabitRegex);
          if (addHabitMatch) {
            const [fullTag, name, energy, time] = addHabitMatch;
            window.dispatchEvent(new CustomEvent("ai-add-habit", { detail: { name: name.trim(), energy: energy.trim().toLowerCase(), time: time.trim() } }));
            cleanReply = cleanReply.replace(fullTag, "");
          }

          // --- COMPLETE HABIT ---
          const completeHabitRegex = /\[COMPLETE_HABIT:\s*([^\]]+)\]/i;
          const completeHabitMatch = line.match(completeHabitRegex);
          if (completeHabitMatch) {
            const [fullTag, query] = completeHabitMatch;
            window.dispatchEvent(new CustomEvent("ai-complete-habit", { detail: { query: query.trim() } }));
            cleanReply = cleanReply.replace(fullTag, "");
          }
        });

        // Final cleanup of any stray tags
        cleanReply = cleanReply.replace(/\[\w+:[^\]]*\]/g, "").trim();

        setMessages(p => [...p, { role: "ai", text: cleanReply || "✅ Sip!" }]);
        setHistory(prev => {
          const newHistory = [...prev, { role: "user", content: userMsg }, { role: "assistant", content: reply }];
          return newHistory.slice(-10);
        });
        setLoading(false);
      }, delay);

    } catch (err) {
      console.error("AI Chat Error:", err);
      setMessages(p => [...p, { role: "ai", text: "Ups, koneksi bermasalah nih. Tapi tetap semangat! 💪" }]);
      setLoading(false);
    }
  }, [history]);

  return { messages, input, setInput, loading, sendMessage };
}

// ============================================================
// COMPONENTS
// ============================================================

function Confetti({ trigger }) {
  const [pieces, setPieces] = useState([]);
  useEffect(() => {
    if (!trigger) return;
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#ff6b35", "#fbbf24", "#4ade80", "#60a5fa", "#a78bfa", "#f87171", "#2dd4bf"]
    });
  }, [trigger]);
  return null;
}

function CelebrationOverlay({ data, onDone }) {
  useEffect(() => {
    if (!data) return;
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [data, onDone]);
  if (!data) return null;
  return (
    <div className="celebration-overlay">
      <div className="celebration-card">
        <div className="celebration-emoji">{data.emoji}</div>
        <div className="celebration-text">{data.title}</div>
        <div className="celebration-sub">{data.sub}</div>
      </div>
    </div>
  );
}

function PomodoroModal({ habit, onClose, onComplete }) {
  const WORK = 25 * 60, BREAK = 5 * 60;
  const [timeLeft, setTimeLeft] = useState(WORK);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState("work");
  const [sessions, setSessions] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            setRunning(false);
            if (phase === "work") { setSessions(s => s + 1); setPhase("break"); setTimeLeft(BREAK); onComplete(); }
            else { setPhase("work"); setTimeLeft(WORK); }
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [running, phase, onComplete]);

  const total = phase === "work" ? WORK : BREAK;
  const progress = ((total - timeLeft) / total) * 100;
  const circumference = 2 * Math.PI * 60;
  const dash = circumference - (progress / 100) * circumference;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 360 }}>
        <div className="modal-title">
          <span>⏱️ Focus Mode — {habit?.name || "Habit"}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="pomo-display">
          <div className="pomo-ring">
            <svg width="152" height="152" viewBox="0 0 152 152">
              <circle cx="76" cy="76" r="60" fill="none" stroke="var(--bg4)" strokeWidth="10" />
              <circle cx="76" cy="76" r="60" fill="none"
                stroke={phase === "work" ? "var(--orange)" : "var(--green)"}
                strokeWidth="10" strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dash} />
            </svg>
            <div>
              <div className="pomo-time">{formatTime(timeLeft)}</div>
            </div>
          </div>
          <div className="pomo-status">
            {phase === "work" ? "🔥 Sesi Fokus" : "☕ Istirahat Singkat"} · {sessions} sesi selesai
          </div>
          <div className="pomo-controls">
            <button className={`pomo-btn ${running ? "" : "start"}`} onClick={() => setRunning(r => !r)}>
              {running ? "⏸ Pause" : "▶ Mulai"}
            </button>
            <button className="pomo-btn" onClick={() => { setRunning(false); setTimeLeft(WORK); setPhase("work"); }}>↺ Reset</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddHabitModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ name: "", icon: "🎯", category: "Umum", frequency: "daily", time: "08:00", energy: "medium", notes: "" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">
          <span>+ Tambah Habit</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="form-group">
          <label className="form-label">Nama Habit</label>
          <input className="form-input" placeholder="contoh: Olahraga Pagi" value={form.name} onChange={e => set("name", e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Ikon</label>
          <div className="icon-grid">
            {ICONS.map(ic => <div key={ic} className={`icon-option ${form.icon === ic ? "selected" : ""}`} onClick={() => set("icon", ic)}>{ic}</div>)}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Kategori</label>
            <select className="form-select" value={form.category} onChange={e => set("category", e.target.value)}>
              {["Kesehatan", "Belajar", "Produktivitas", "Relasi", "Finansial", "Kreatif", "Umum"].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Waktu</label>
            <input className="form-input" type="time" value={form.time} onChange={e => set("time", e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Level Energi</label>
          <div className="energy-row">
            {["low", "medium", "high"].map(e => (
              <span key={e} className={`energy-badge energy-${e} ${form.energy === e ? "active" : ""}`}
                style={{ cursor: "pointer", opacity: form.energy === e ? 1 : 0.5 }}
                onClick={() => set("energy", e)}>
                {e === "low" ? "🌿 Rendah" : e === "medium" ? "⚡ Sedang" : "🔥 Tinggi"}
              </span>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Catatan (opsional)</label>
          <input className="form-input" placeholder="motivasi atau detail..." value={form.notes} onChange={e => set("notes", e.target.value)} />
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Batal</button>
          <button className="btn btn-primary" onClick={() => { if (form.name.trim()) { onAdd(form); onClose(); } }}>Simpan</button>
        </div>
      </div>
    </div>
  );
}


function FreezeModal({ freezes, onUse, onClose }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 360 }}>
        <div className="modal-title">
          <span>🧊 Streak Freeze</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="freeze-info">
          <div className="freeze-count">{freezes}</div>
          <div className="freeze-label">Freeze tersisa</div>
        </div>
        <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 16, lineHeight: 1.6 }}>
          Streak Freeze melindungi streak kamu saat ada hal darurat. Kamu mendapat 1 freeze setiap 7 hari streak berturut-turut.
        </p>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Tutup</button>
          <button className="btn btn-primary" onClick={onUse} disabled={freezes <= 0}
            style={{ opacity: freezes <= 0 ? 0.4 : 1 }}>
            🧊 Gunakan Freeze
          </button>
        </div>
      </div>
    </div>
  );
}
function CalendarPage({ dailyNotes, onUpdateNote }) {
  const [viewDate, setViewDate] = useState(new Date());
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const [selectedDate, setSelectedDate] = useState(null);

  return (
    <div className="calendar-page">
      <div className="topbar">
        <div className="topbar-left">
          <h2>{months[month]} {year}</h2>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 4 }}>
            <button className="top-btn" onClick={prevMonth}>◀</button>
            <button className="top-btn" onClick={nextMonth}>▶</button>
          </div>
        </div>
        <button className="mobile-toggle" onClick={() => setSidebarOpen(true)}>☰</button>
      </div>

      <div className="calendar-grid">
        {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map(d => (
          <div key={d} className="calendar-day-label">{d}</div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} className="calendar-date empty" />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const d = i + 1;
          const dateStr = `${year}-${(month + 1).toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
          const isToday = dateStr === getToday();
          const hasNote = dailyNotes[dateStr];
          const holiday = NATIONAL_HOLIDAYS[dateStr];

          return (
            <div key={d}
              className={`calendar-date ${isToday ? "today" : ""} ${hasNote ? "has-note" : ""} ${holiday ? "holiday" : ""}`}
              onClick={() => setSelectedDate(dateStr)}>
              <div className="date-num">{d}</div>
              {holiday && <div className="holiday-label" title={holiday}>{holiday}</div>}
              {hasNote && <div className="note-indicator">📝</div>}
            </div>
          );
        })}
      </div>

      {selectedDate && (
        <div className="modal-overlay" onClick={() => setSelectedDate(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              <span>📝 Agenda {new Date(selectedDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
              <button className="modal-close" onClick={() => setSelectedDate(null)}>✕</button>
            </div>
            {NATIONAL_HOLIDAYS[selectedDate] && (
              <div style={{ padding: "8px 12px", background: "rgba(239, 68, 68, 0.1)", borderRadius: 8, color: "#ef4444", fontSize: 13, marginBottom: 12, fontWeight: 600 }}>
                🇮🇩 {NATIONAL_HOLIDAYS[selectedDate]}
              </div>
            )}
            <textarea
              className="note-textarea"
              placeholder="Tulis agenda atau catatan untuk hari ini..."
              value={dailyNotes[selectedDate] || ""}
              onChange={(e) => onUpdateNote(selectedDate, e.target.value)}
              style={{ minHeight: 150, width: "100%", marginTop: 8 }}
            />
            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => setSelectedDate(null)}>Simpan & Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WardrobeModal({ xp, activeCostume, onSelect, onClose }) {
  const lvInfo = getLevelInfo(xp);
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">
          <span>🎭 Pakaian Karakter</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 16 }}>
          Kamu di Level {lvInfo.current.level}. Pilih kostum spesialmu!
        </p>
        <div className="costume-grid">
          {COSTUMES.map(c => {
            const unlocked = lvInfo.current.level >= c.level;
            const isActive = activeCostume === c.level;
            return (
              <div key={c.level}
                className={`costume-card ${isActive ? "active" : ""} ${!unlocked ? "locked" : ""}`}
                style={{ background: c.bg }}
                onClick={() => unlocked && onSelect(c.level)}>
                {!unlocked && <div className="costume-lock">🔒</div>}
                <div className="costume-card-emoji">{c.emoji}</div>
                <div className="costume-card-name">{c.name}</div>
                <div className="costume-card-desc">{c.desc}</div>
                {!unlocked && <div className="costume-unlock-hint">Level {c.level}</div>}
                {isActive && <div style={{ fontSize: 10, color: "var(--orange)", marginTop: 4, fontWeight: 700 }}>● AKTIF</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AvatarSVG({ level, size = 40 }) {
  const costume = COSTUMES.find(c => c.level === level) || COSTUMES[0];
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: costume.bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: size * 0.6,
      border: "3px solid var(--border)",
      boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
    }}>
      {costume.emoji}
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const today = getToday();
  const todayDay = getTodayDay();

  // Auth State
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Core state
  const [habits, setHabits] = useState([]);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [freezes, setFreezes] = useState(0);
  const [restDays, setRestDays] = useState([]);
  const [restDayOfWeek, setRestDayOfWeek] = useState(null);
  const [disciplineScore, setDisciplineScore] = useState(0);
  const [pomodoroCompleted, setPomodoroCompleted] = useState(0);
  const [perfectDays, setPerfectDays] = useState(0);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [freezeUsed, setFreezeUsed] = useState(0);
  const [restDaysUsed, setRestDaysUsed] = useState(0);
  const [earnedBadges, setEarnedBadges] = useState(new Set());
  const [dailyNotes, setDailyNotes] = useState({}); // { "YYYY-MM-DD": "note content" }
  const [activeCostume, setActiveCostume] = useState(1);
  const [showWardrobe, setShowWardrobe] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState("");

  // UI state
  const [page, setPage] = useState("today");
  const [aiOpen, setAiOpen] = useState(true);
  const [aiTab, setAiTab] = useState("daily");
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [showFreeze, setShowFreeze] = useState(false);
  const [pomodoroHabit, setPomodoroHabit] = useState(null);
  const [celebration, setCelebration] = useState(null);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const ai = useAICoach();

  // Auth Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) loadData(session.user.id);
      else setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) loadData(session.user.id);
      else {
        setAuthLoading(false);
        setIsGuest(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadData = async (userId) => {
    setAuthLoading(true);
    try {
      const [
        { data: habitsData },
        { data: logsData },
        { data: profileData }
      ] = await Promise.all([
        supabase.from("habits").select("*").eq("user_id", userId),
        supabase.from("logs").select("*").eq("user_id", userId),
        supabase.from("profiles").select("*").eq("id", userId).single()
      ]);

      if (habitsData) {
        setHabits(habitsData.map(h => {
          const hLogs = (logsData || []).filter(l => l.habit_id === h.id);
          return {
            ...h,
            completedDates: hLogs.filter(l => l.status === "done").map(l => l.date),
            skipped: hLogs.filter(l => l.status === "skipped").map(l => l.date),
            // Use old streak if exists, otherwise compute? 
            // For now, let's just use what we have in the habit record if added.
          };
        }));
      }

      if (profileData) {
        setXp(profileData.xp || 0);
        setStreak(profileData.streak || 0);
        setFreezes(profileData.freezes || 0);
        setDisciplineScore(profileData.discipline_score || 0);
        setRestDays(profileData.rest_days || []);
        setRestDayOfWeek(profileData.rest_day_of_week);
        setEarnedBadges(new Set(profileData.earned_badges || []));
        setPomodoroCompleted(profileData.pomodoro_completed || 0);
        setPerfectDays(profileData.perfect_days || 0);
        setTotalCompleted(profileData.total_completed || 0);
        setDailyNotes(profileData.daily_notes || {});
        setActiveCostume(profileData.active_costume || 1);
        setDisplayName(profileData.display_name || getUserDisplayName(session?.user || user));
      }
    } catch (err) {
      console.error("Load failed:", err);
    } finally {
      setAuthLoading(false);
    }
  };

  const saveData = useCallback(async () => {
    if (!user) return;

    // 1. Sync Profile
    await supabase.from("profiles").upsert({
      id: user.id,
      xp, streak, freezes,
      discipline_score: disciplineScore,
      rest_days: restDays,
      rest_day_of_week: restDayOfWeek,
      earned_badges: Array.from(earnedBadges),
      pomodoro_completed: pomodoroCompleted,
      perfect_days: perfectDays,
      total_completed: totalCompleted,
      daily_notes: dailyNotes,
      active_costume: activeCostume,
      display_name: displayName,
      updated_at: new Date().toISOString()
    });
  }, [user, xp, streak, freezes, disciplineScore, activeCostume, restDays, restDayOfWeek, earnedBadges, pomodoroCompleted, perfectDays, totalCompleted, dailyNotes, displayName]);

  // Auto-save on changes
  useEffect(() => {
    const timer = setTimeout(saveData, 2000);
    return () => clearTimeout(timer);
  }, [saveData]);

  // AI System Event Listeners
  useEffect(() => {
    const handleSchedule = (e) => {
      const { date, content } = e.detail;
      setDailyNotes(p => ({
        ...p,
        [date]: p[date] ? p[date] + "\n" + content : content
      }));
      triggerCelebration("📅", "Jadwal Ditambahkan!", `AI Coach mengagendakan: ${content} di tanggal ${date}`);
    };

    const handleAddHabit = (e) => {
      const { name, energy, time } = e.detail;
      addHabit({
        name,
        icon: "🎯",
        category: "Umum",
        energy,
        time,
        notes: "Ditambahkan oleh AI Coach"
      });
      triggerCelebration("🎯", "Habit Baru!", `AI Coach menambahkan habit: ${name}`);
    };

    const handleCompleteHabit = (e) => {
      const { query } = e.detail;
      const h = habits.find(x => x.name.toLowerCase().includes(query.toLowerCase()) || x.id === query);
      if (h) {
        completeHabit(h.id);
        triggerCelebration("✅", "Habit Selesai!", `AI Coach mencatat penyelesaian: ${h.name}`);
      }
    };

    window.addEventListener("ai-schedule", handleSchedule);
    window.addEventListener("ai-add-habit", handleAddHabit);
    window.addEventListener("ai-complete-habit", handleCompleteHabit);

    return () => {
      window.removeEventListener("ai-schedule", handleSchedule);
      window.removeEventListener("ai-add-habit", handleAddHabit);
      window.removeEventListener("ai-complete-habit", handleCompleteHabit);
    };
  }, [habits]);

  // Initial Data Load for Guest
  useEffect(() => {
    if (isGuest && habits.length === 0) {
      const local = localStorage.getItem("hf_guest_data");
      if (local) {
        const d = JSON.parse(local);
        setHabits(d.habits || []);
        setXp(d.xp || 0);
        setStreak(d.streak || 0);
        setFreezes(d.freezes || 0);
        setDisciplineScore(d.disciplineScore || 0);
        setDailyNotes(d.dailyNotes || {});
      } else {
        setHabits(SAMPLE_HABITS);
        setXp(30);
        setStreak(1);
        setFreezes(2);
        setDisciplineScore(13);
        setDailyNotes({});
      }
    }
  }, [isGuest]);

  // Guest Save
  useEffect(() => {
    if (isGuest) {
      localStorage.setItem("hf_guest_data", JSON.stringify({ habits, xp, streak, freezes, disciplineScore, dailyNotes }));
    }
  }, [isGuest, habits, xp, streak, freezes, disciplineScore, dailyNotes]);

  function getUserDisplayName(u) {
    if (displayName) return displayName;
    if (!u) return "Guest";
    const meta = u.user_metadata || {};
    return (meta.full_name || meta.name || u.email || "User").split(" ")[0];
  }

  // Computed
  const isRestDay = restDays.includes(today) || restDayOfWeek === todayDay;
  const todayHabits = habits.filter(h => !isRestDay);
  const completedToday = todayHabits.filter(h => h.completedDates.includes(today));
  const skippedToday = todayHabits.filter(h => h.skipped.includes(today));
  const completion = todayHabits.length > 0 ? Math.round(((completedToday.length + skippedToday.length) / todayHabits.length) * 100) : 0;
  const overloaded = habits.length > 7;
  const lvInfo = getLevelInfo(xp);

  // Badge checking
  useEffect(() => {
    const stats = { totalCompleted, maxStreak: streak, habitCount: habits.length, perfectDays, freezeUsed, restDaysUsed, pomodoroCompleted };
    BADGES.forEach(b => {
      if (!earnedBadges.has(b.id) && b.condition(stats)) {
        setEarnedBadges(s => new Set([...s, b.id]));
        triggerCelebration(b.icon, b.name, b.desc);
      }
    });
  }, [totalCompleted, streak, habits.length, perfectDays, freezeUsed, restDaysUsed, pomodoroCompleted]);

  function triggerCelebration(emoji, title, sub) {
    setCelebration({ emoji, title, sub });
    setConfettiTrigger(t => t + 1);
  }

  function addXP(amount) {
    const prevLvl = getLevelInfo(xp).current.level;
    const newXp = xp + amount;
    const newLvl = getLevelInfo(newXp).current.level;
    setXp(newXp);
    setDisciplineScore(s => s + Math.floor(amount / 2));
    if (newLvl > prevLvl) {
      const lvData = LEVELS.find(l => l.level === newLvl);
      setTimeout(() => triggerCelebration("🆙", `Level Up! ${lvData?.title}`, `Kostum baru terbuka: ${lvData?.emoji}`), 500);
    }
  }

  async function completeHabit(id) {
    const h = habits.find(x => x.id === id);
    if (!h || h.completedDates.includes(today)) return;

    setHabits(hs => hs.map(h => {
      if (h.id !== id) return h;
      const newDates = [...h.completedDates, today];
      const newStreak = h.streak + 1;

      // Streak milestone: bonus freeze
      if (newStreak % 7 === 0) {
        setFreezes(f => f + 1);
        triggerCelebration("🧊", "Streak 7 Hari!", "Kamu dapat 1 Streak Freeze gratis!");
      }

      return { ...h, completedDates: newDates, streak: newStreak };
    }));

    addXP(h.xpReward);
    setTotalCompleted(t => t + 1);

    if (user) {
      await supabase.from("logs").upsert({
        user_id: user.id,
        habit_id: id,
        date: today,
        status: "done",
        done: true
      });
    }

    // Check perfect day
    // ...
  }

  async function skipHabit(id) {
    if (habits.find(h => h.id === id)?.skipped.includes(today)) return;

    setHabits(hs => hs.map(h => {
      if (h.id !== id) return h;
      return { ...h, skipped: [...h.skipped, today] };
    }));

    triggerCelebration("⏩", "Skip Aman!", "Streak kamu tetap terjaga 💪");
    addXP(5);

    if (user) {
      await supabase.from("logs").upsert({
        user_id: user.id,
        habit_id: id,
        date: today,
        status: "skipped",
        done: false
      });
    }
  }

  async function rescheduleHabit(id) {
    if (habits.find(h => h.id === id)?.skipped.includes(today)) return;

    setHabits(hs => hs.map(h => {
      if (h.id !== id) return h;
      return { ...h, skipped: [...h.skipped, today] };
    }));

    triggerCelebration("📅", "Dijadwal Ulang!", "Habit dipindah ke besok");

    if (user) {
      await supabase.from("logs").upsert({
        user_id: user.id,
        habit_id: id,
        date: today,
        status: "skipped",
        done: false
      });
    }
  }

  async function addHabit(form) {
    const id = Date.now().toString();
    const newHabit = {
      id, name: form.name, icon: form.icon,
      category: form.category, frequency: form.frequency,
      time: form.time, energy: form.energy,
      completedDates: [], streak: 0,
      xpReward: form.energy === "high" ? 25 : form.energy === "medium" ? 15 : 10,
      skipped: [], notes: form.notes
    };

    setHabits(h => [...h, newHabit]);
    addXP(5);

    if (user) {
      await supabase.from("habits").insert({
        id,
        user_id: user.id,
        name: form.name,
        icon: form.icon,
        category: form.category,
        energy: form.energy,
        time: form.time,
        notes: form.notes,
        xp_reward: newHabit.xpReward
      });
    }
  }

  function useFreeze() {
    if (freezes <= 0) return;
    setFreezes(f => f - 1);
    setFreezeUsed(f => f + 1);
    triggerCelebration("🧊", "Streak Terlindungi!", "Freeze digunakan - streak aman!");
    setShowFreeze(false);
  }

  function toggleRestDay() {
    if (restDays.includes(today)) {
      setRestDays(d => d.filter(x => x !== today));
    } else {
      setRestDays(d => [...d, today]);
      setRestDaysUsed(r => r + 1);
      triggerCelebration("🛌", "Rest Day!", "Istirahat itu bagian dari progres");
    }
  }

  const weekDays = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay() + i);
    return d;
  });


  // ============================================================
  // PAGES
  // ============================================================
  function renderToday() {
    return (
      <>
        <div className="topbar">
          <div className="topbar-left">
            <h2>{getGreeting()}</h2>
            <div className="topbar-date">{formatDate()}</div>
          </div>
          <div className="topbar-right">
            <button className="mobile-toggle" onClick={() => setSidebarOpen(true)}>☰</button>
            <div className="topbar-actions">
              <button className="top-btn" onClick={toggleRestDay}>
                {isRestDay ? "❌ Batalkan Rest" : "🛌 Rest Day"}
              </button>
              <button className="top-btn" onClick={() => setShowFreeze(true)}>🧊 {freezes}</button>
              <button className="top-btn primary" onClick={() => setShowAddHabit(true)}>+ Tambah</button>
            </div>
          </div>
        </div>

        {overloaded && (
          <div className="overload-warn">
            <div className="alert-icon">⚠️</div>
            <div>
              <div className="alert-title" style={{ color: "var(--red)" }}>Overload Warning!</div>
              <div style={{ fontSize: 13 }}>Kamu punya {habits.length} habit — terlalu banyak bisa menyebabkan burnout. Pertimbangkan untuk fokus ke 5-7 habit terpenting.</div>
            </div>
          </div>
        )}

        {isRestDay ? (
          <div className="rest-day-banner">
            <div style={{ fontSize: 48 }}>🛌</div>
            <h3>Hari Istirahat</h3>
            <p>Istirahat itu bagian dari proses. Tubuh dan pikiran perlu recovery. Nikmati harimu!</p>
          </div>
        ) : habits.length > 0 && (
          <div className="alert-box">
            <div className="alert-icon">⚡</div>
            <div>
              <div className="alert-title">Terlewat 3+ hari!</div>
              <div style={{ fontSize: 13 }}>
                {habits.filter(h => !h.completedDates.includes(today) && !h.skipped.includes(today)).map(h => `${h.icon} ${h.name}`).join(", ") || "Semua berjalan baik! 🎉"}
                {". Besok, cukup 5 menit aja. Deal? 💪"}
              </div>
            </div>
          </div>
        )}

        <div className="note-card agenda-card" style={{
          background: "var(--bg3)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "16px",
          marginBottom: "20px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontSize: "14px", fontWeight: "700", color: "var(--text)" }}>📅 Agenda Hari Ini</span>
            <button onClick={() => setPage("calendar")} style={{ background: "none", border: "none", color: "var(--orange)", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>LIHAT KALENDER →</button>
          </div>
          {NATIONAL_HOLIDAYS[today] && (
            <div style={{ padding: "6px 10px", background: "rgba(239, 68, 68, 0.1)", borderRadius: 6, color: "#ef4444", fontSize: 12, marginBottom: 10, fontWeight: 700 }}>
              🔴 {NATIONAL_HOLIDAYS[today]}
            </div>
          )}
          <div style={{ fontSize: "13px", color: dailyNotes[today] ? "var(--text)" : "var(--text2)", fontStyle: dailyNotes[today] ? "normal" : "italic" }}>
            {dailyNotes[today] || "Belum ada agenda hari ini. Ketuk untuk menambah."}
          </div>
        </div>

        {/* Daily Note Edit - Replaced by Agenda but still useful as quick entry */}
        <div className="note-card" style={{
          background: "var(--bg3)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "16px",
          marginBottom: "20px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontSize: "14px", fontWeight: "700", color: "var(--text)" }}>📝 Catatan Hari Ini</span>
            {dailyNotes[today] && <span style={{ fontSize: "11px", color: "var(--green)" }}>● Tersimpan</span>}
          </div>
          <textarea
            className="note-textarea"
            placeholder="Tulis refleksi, tantangan, atau rasa syukurmu hari ini..."
            value={dailyNotes[today] || ""}
            onChange={(e) => setDailyNotes(prev => ({ ...prev, [today]: e.target.value }))}
            style={{
              width: "100%",
              background: "var(--bg4)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "12px",
              color: "var(--text)",
              fontSize: "13px",
              minHeight: "80px",
              resize: "vertical",
              outline: "none",
              fontFamily: "var(--font)",
              transition: "border-color 0.2s"
            }}
          />
        </div>

        {/* AI Coach */}
        <div className="ai-panel">
          <div className="ai-panel-header" onClick={() => setAiOpen(o => !o)}>
            <div className="ai-header-left">
              <div className="ai-dot" />
              <span className="ai-title">AI COACH</span>
            </div>
            <div className="ai-header-right" onClick={e => e.stopPropagation()}>
              <button className={`ai-tab ${aiTab === "daily" ? "active" : ""}`}
                onClick={() => {
                  setAiTab("daily");
                  ai.sendMessage("Berikan evaluasi harian untuk progres habit saya hari ini.", `Stats harian: ${completedToday.length}/${todayHabits.length} selesai. Catatan hari ini: ${dailyNotes[today] || "Tidak ada catatan"}`);
                }}>🌙 Harian</button>
              <button className={`ai-tab ${aiTab === "weekly" ? "active" : ""}`}
                onClick={() => {
                  setAiTab("weekly");
                  ai.sendMessage("Berikan evaluasi mingguan berdasarkan progres saya belakangan ini.", `Stats mingguan: Streak ${streak} hari, skor disiplin ${disciplineScore}.`);
                }}>⚡ Mingguan</button>
              <div className="ai-collapse-btn" onClick={() => setAiOpen(o => !o)}>
                {aiOpen ? "▲" : "▼"}
              </div>
            </div>
          </div>
          <div className={`ai-body ${aiOpen ? "" : "collapsed"}`}>
            <div className="ai-messages">
              {ai.messages.map((m, i) => (
                <div key={i} className={`ai-msg ${m.role}`}>{m.text}</div>
              ))}
              {ai.loading && <div className="ai-typing"><span /><span /><span /></div>}
            </div>
            <div className="ai-input-row">
              <input className="ai-input" value={ai.input} onChange={e => ai.setInput(e.target.value)}
                placeholder="Ketik pesan..." onKeyDown={e => {
                  if (e.key === "Enter") {
                    const ctx = {
                      userName: displayName,
                      level: lvInfo.current.level,
                      streak,
                      habits: habits.map(h => h.name).join(", "),
                      todayStats: `${completedToday.length}/${todayHabits.length} selesai`
                    };
                    ai.sendMessage(ai.input, ctx);
                  }
                }} />
              <button className="ai-send" onClick={() => {
                const ctx = {
                  userName: displayName,
                  level: lvInfo.current.level,
                  streak,
                  habits: habits.map(h => h.name).join(", "),
                  todayStats: `${completedToday.length}/${todayHabits.length} selesai`
                };
                ai.sendMessage(ai.input, ctx);
              }}>➤</button>
            </div>
          </div>
        </div>

        {/* Week Strip */}
        <div className="week-strip">
          {weekDates.map((d, i) => {
            const dateStr = d.toISOString().split("T")[0];
            const isToday2 = dateStr === today;
            const isRest2 = restDays.includes(dateStr) || restDayOfWeek === i;
            const dayHabits = habits;
            const dayDone = dayHabits.filter(h => h.completedDates.includes(dateStr)).length;
            const pct = dayHabits.length > 0 ? Math.round((dayDone / dayHabits.length) * 100) : 0;
            return (
              <div key={i} className={`week-day ${isToday2 ? "today" : ""} ${isRest2 ? "rest" : ""}`}>
                <div className="week-day-name">{weekDays[i]}</div>
                <div className="week-day-num">{d.getDate()}</div>
                {isRest2
                  ? <div className="week-dot dot-rest" />
                  : <div className={`week-dot ${pct === 100 ? "dot-full" : pct > 0 ? "dot-partial" : "dot-empty"}`} />}
                <div className="week-day-pct">{isRest2 ? "🛌" : `${pct}%`}</div>
              </div>
            );
          })}
        </div>

        {/* Completion */}
        {!isRestDay && (
          <div className="completion-card">
            <div className="completion-header">
              <span className="completion-title">Penyelesaian Hari Ini</span>
              <span className="completion-pct">{completion}%</span>
            </div>
            <div className="completion-bar">
              <div className="completion-fill" style={{ width: `${completion}%` }} />
            </div>
          </div>
        )}

        {/* Habits List */}
        {!isRestDay && (
          <>
            <div className="habits-header">
              <span className="habits-title">Daftar Habit</span>
              <div style={{ display: "flex", gap: 6 }}>
                <span className="chip">🔥 Energi Tinggi</span>
                <span className="chip">⚡ Sedang</span>
                <span className="chip">🌿 Rendah</span>
              </div>
            </div>
            {habits.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🎯</div>
                <div className="empty-state-title">Belum ada habit</div>
                <div className="empty-state-desc">Tambah habit pertama kamu dan mulai perjalanan!</div>
              </div>
            ) : (
              habits.map(h => {
                const done = h.completedDates.includes(today);
                const skipped = h.skipped.includes(today);
                return (
                  <div key={h.id} className={`habit-item ${done ? "completed" : ""} ${skipped ? "skipped-today" : ""}`}>
                    <button className={`habit-check ${done ? "done" : skipped ? "skipped" : ""}`}
                      onClick={() => !done && !skipped && completeHabit(h.id)}>
                      {done ? "✓" : skipped ? "⏩" : ""}
                    </button>
                    <div className="habit-icon">{h.icon}</div>
                    <div className="habit-info">
                      <div className="habit-name">{h.name}</div>
                      <div className="habit-meta">
                        <span className="habit-tag">{h.category}</span>
                        <span className={`habit-tag energy-${h.energy}`} style={{ background: h.energy === "high" ? "rgba(248,113,113,0.1)" : h.energy === "medium" ? "rgba(251,191,36,0.1)" : "rgba(74,222,128,0.1)", color: h.energy === "high" ? "var(--red)" : h.energy === "medium" ? "var(--yellow)" : "var(--green)" }}>
                          {h.energy === "high" ? "🔥" : h.energy === "medium" ? "⚡" : "🌿"}
                        </span>
                        <span className="habit-tag">🔥 {h.streak}d</span>
                        <span className="habit-tag">+{h.xpReward}XP</span>
                        {h.time && <span className="habit-tag">⏰ {h.time}</span>}
                      </div>
                    </div>
                    {!done && !skipped && (
                      <div className="habit-actions">
                        <button className="habit-btn pomo" onClick={() => setPomodoroHabit(h)}>⏱️</button>
                        <button className="habit-btn skip" onClick={() => skipHabit(h.id)}>⏩ Skip</button>
                        <button className="habit-btn reschedule" onClick={() => rescheduleHabit(h.id)}>📅</button>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Energy Planning */}
            <div className="section-header">🧠 Rekomendasi Energi Hari Ini</div>
            <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 16 }}>
              <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 10 }}>Urutan habit berdasarkan energi optimal:</p>
              {["high", "medium", "low"].map(e => {
                const eHabits = habits.filter(h => h.energy === e && !h.completedDates.includes(today));
                if (!eHabits.length) return null;
                const label = e === "high" ? "🔥 Pagi (Energi Tinggi)" : e === "medium" ? "⚡ Siang (Energi Sedang)" : "🌿 Malam (Energi Rendah)";
                return (
                  <div key={e} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: e === "high" ? "var(--red)" : e === "medium" ? "var(--yellow)" : "var(--green)" }}>{label}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {eHabits.map(h => <span key={h.id} className="chip">{h.icon} {h.name}</span>)}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </>
    );
  }

  function renderProgress() {
    return (
      <>
        <div className="topbar">
          <div className="topbar-left"><h2>📊 Progress</h2><div className="topbar-date">Statistik & Heatmap</div></div>
        </div>
        <div className="progress-grid">
          {[
            { title: "Total XP", val: xp, sub: `Level ${lvInfo.current.level} — ${lvInfo.current.title}`, color: "var(--orange)" },
            { title: "Streak Terpanjang", val: streak, sub: "hari berturut-turut", color: "var(--red)" },
            { title: "Habit Aktif", val: habits.length, sub: `${completedToday.length} selesai hari ini`, color: "var(--blue)" },
            { title: "Skor Disiplin", val: disciplineScore, sub: "poin disiplin", color: "var(--purple)" },
            { title: "Pomodoro Selesai", val: pomodoroCompleted, sub: "sesi fokus", color: "var(--teal)" },
            { title: "Badge Diraih", val: earnedBadges.size, sub: `dari ${BADGES.length} total`, color: "var(--yellow)" },
          ].map(c => (
            <div key={c.title} className="progress-card">
              <div className="progress-card-title">{c.title}</div>
              <div className="progress-card-val" style={{ color: c.color }}>{c.val}</div>
              <div className="progress-card-sub">{c.sub}</div>
            </div>
          ))}
        </div>

        <div className="section-header">📅 Activity Heatmap (28 Hari)</div>
        <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 16, marginBottom: 20 }}>
          <div className="heatmap">
            {Array.from({ length: 28 }, (_, i) => {
              const d = new Date(); d.setDate(d.getDate() - 27 + i);
              const ds = d.toISOString().split("T")[0];
              const done = habits.filter(h => h.completedDates.includes(ds)).length;
              const total = habits.length;
              const pct = total > 0 ? done / total : 0;
              const heat = pct === 0 ? "" : pct < 0.25 ? "heat-1" : pct < 0.5 ? "heat-2" : pct < 0.75 ? "heat-3" : "heat-4";
              return <div key={i} className={`heatmap-cell ${heat}`} title={`${ds}: ${done}/${total}`} />;
            })}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center", fontSize: 11, color: "var(--text2)" }}>
            <span>Kurang</span>
            {["", "heat-1", "heat-2", "heat-3", "heat-4"].map(h => <div key={h} className={`heatmap-cell ${h}`} style={{ width: 12, height: 12 }} />)}
            <span>Banyak</span>
          </div>
        </div>

        <div className="section-header">🏆 Badge & Pencapaian</div>
        <div className="badges-grid">
          {BADGES.map(b => (
            <div key={b.id} className={`badge-card ${earnedBadges.has(b.id) ? "earned" : ""}`}>
              <div className="badge-card-icon">{b.icon}</div>
              <div className="badge-card-name">{b.name}</div>
              <div className="badge-card-desc">{b.desc}</div>
            </div>
          ))}
        </div>
      </>
    );
  }

  function renderAllHabits() {
    return (
      <>
        <div className="topbar">
          <div className="topbar-left"><h2>📋 Semua Habit</h2><div className="topbar-date">{habits.length} habit aktif</div></div>
          <div className="topbar-actions">
            <button className="top-btn primary" onClick={() => setShowAddHabit(true)}>+ Tambah</button>
          </div>
        </div>
        {habits.map(h => (
          <div key={h.id} className="habit-item">
            <div className="habit-icon" style={{ fontSize: 28 }}>{h.icon}</div>
            <div className="habit-info">
              <div className="habit-name">{h.name}</div>
              <div className="habit-meta">
                <span className="habit-tag">{h.category}</span>
                <span className="habit-tag">🔥 {h.streak} streak</span>
                <span className="habit-tag">+{h.xpReward}XP</span>
                <span className={`habit-tag energy-${h.energy}`}>
                  {h.energy === "high" ? "🔥 Tinggi" : h.energy === "medium" ? "⚡ Sedang" : "🌿 Rendah"}
                </span>
              </div>
              {h.notes && <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 4 }}>"{h.notes}"</div>}
            </div>
            <button className="habit-btn" style={{ color: "var(--red)" }}
              onClick={() => setHabits(hs => hs.filter(x => x.id !== h.id))}>🗑️</button>
          </div>
        ))}
      </>
    );
  }

  function renderAchievements() {
    return (
      <>
        <div className="topbar">
          <div className="topbar-left"><h2>🏆 Pencapaian</h2><div className="topbar-date">{earnedBadges.size} dari {BADGES.length} badge diraih</div></div>
        </div>
        <div className="badges-grid">
          {BADGES.map(b => (
            <div key={b.id} className={`badge-card ${earnedBadges.has(b.id) ? "earned" : ""}`}>
              <div className="badge-card-icon">{b.icon}</div>
              <div className="badge-card-name">{b.name}</div>
              <div className="badge-card-desc">{b.desc}</div>
              {!earnedBadges.has(b.id) && <div style={{ fontSize: 10, color: "var(--text2)", marginTop: 4 }}>🔒 Belum terbuka</div>}
            </div>
          ))}
        </div>

      </>
    );
  }

  const navItems = [
    { id: "today", icon: "📋", label: "Hari Ini", section: "menu" },
    { id: "calendar", icon: "📅", label: "Kalender", section: "menu" },
    { id: "progress", icon: "📊", label: "Progress", section: "menu" },
    { id: "habits", icon: "📝", label: "Semua Habit", section: "menu" },
    { id: "achievements", icon: "🏆", label: "Pencapaian", section: "tools" },
  ];

  if (authLoading) return <div className="app" style={{ justifyContent: "center", alignItems: "center" }}><div className="ai-typing"><span /><span /><span /></div></div>;

  if (!user && !isGuest) {
    return <Login onGuest={() => setIsGuest(true)} />;
  }

  return (
    <div className="app">
      <Confetti trigger={confettiTrigger} />
      <CelebrationOverlay data={celebration} onDone={() => setCelebration(null)} />

      {/* SIDEBAR */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      <div className={`sidebar ${sidebarOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-logo" style={{ flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="logo-icon">🌊</div>
            <span className="logo-text">HabitFlow</span>
          </div>
          <div className="sidebar-level-icons">
            {LEVELS.map(l => (
              <span key={l.level} style={{
                opacity: lvInfo.current.level >= l.level ? 1 : 0.2,
                filter: lvInfo.current.level >= l.level ? "none" : "grayscale(1)",
                fontSize: 16
              }} title={l.costume}>{l.emoji}</span>
            ))}
          </div>
        </div>

        <div className="sidebar-user">
          <div className="user-costume-card" onClick={() => setShowWardrobe(true)}>
            <div className="avatar-wrapper" style={{ marginBottom: 8, display: "flex", justifyContent: "center" }}>
              <AvatarSVG level={activeCostume} size={64} />
            </div>
            <div className="user-level-badge">Lv.{lvInfo.current.level}</div>

            {editingName ? (
              <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: "4px", justifyContent: "center", marginTop: "4px" }}>
                <input
                  autoFocus
                  value={tempName}
                  onChange={e => setTempName(e.target.value)}
                  onKeyDown={e => {
                    e.stopPropagation();
                    if (e.key === "Enter" && tempName.trim()) {
                      setDisplayName(tempName.trim());
                      setEditingName(false);
                    }
                    if (e.key === "Escape") setEditingName(false);
                  }}
                  style={{
                    background: "var(--bg4)",
                    border: "1px solid var(--border)",
                    borderRadius: "4px",
                    padding: "2px 8px",
                    width: "120px",
                    color: "var(--text)",
                    fontSize: "12px"
                  }}
                />
                <button onClick={() => { if (tempName.trim()) { setDisplayName(tempName.trim()); setEditingName(false); } }}
                  style={{ background: "none", border: "none", color: "var(--orange)", cursor: "pointer", fontSize: "14px" }}>✓</button>
              </div>
            ) : (
              <div className="user-name" style={{ cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); setTempName(displayName); setEditingName(true); }} title="Klik untuk ganti nama">
                {displayName} · {lvInfo.current.title} ✏️
              </div>
            )}

            <div className="user-title">{COSTUMES.find(c => c.level === activeCostume)?.name || "Warga Baru"}</div>
            <div className="xp-bar-wrap">
              <div className="xp-label"><span>XP</span><span>{xp} / {lvInfo.next ? lvInfo.next.xpRequired : "MAX"}</span></div>
              <div className="xp-bar"><div className="xp-fill" style={{ width: `${lvInfo.pct}%` }} /></div>
            </div>
          </div>
          <button className="nav-item" style={{ marginTop: 10, width: "100%", background: "none", border: "1px solid var(--border)", color: "var(--red)" }}
            onClick={() => user ? supabase.auth.signOut() : setIsGuest(false)}>
            <span className="nav-icon">🚪</span> Keluar
          </button>
        </div>

        <div className="sidebar-stats">
          <div className="stat-mini"><div className="stat-mini-val stat-orange">🔥{streak}</div><div className="stat-mini-lbl">Streak</div></div>
          <div className="stat-mini"><div className="stat-mini-val stat-purple">{disciplineScore}</div><div className="stat-mini-lbl">Disiplin</div></div>
          <div className="stat-mini"><div className="stat-mini-val stat-blue">🧊{freezes}</div><div className="stat-mini-lbl">Freeze</div></div>
          <div className="stat-mini"><div className="stat-mini-val stat-green">{completion}%</div><div className="stat-mini-lbl">Hari ini</div></div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Menu</div>
          {navItems.filter(n => n.section === "menu").map(n => (
            <div key={n.id} className={`nav-item ${page === n.id ? "active" : ""}`} onClick={() => { setPage(n.id); setSidebarOpen(false); }}>
              <span className="nav-icon">{n.icon}</span>{n.label}
            </div>
          ))}
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Tools</div>
          {navItems.filter(n => n.section === "tools").map(n => (
            <div key={n.id} className={`nav-item ${page === n.id ? "active" : ""}`} onClick={() => { setPage(n.id); setSidebarOpen(false); }}>
              <span className="nav-icon">{n.icon}</span>{n.label}
            </div>
          ))}
          <div className="nav-item" onClick={() => setShowWardrobe(true)}><span className="nav-icon">🎭</span>Pakaian Karakter</div>
          <div className="nav-item" onClick={() => { setShowFreeze(true); setSidebarOpen(false); }}><span className="nav-icon">🧊</span>Streak Freeze</div>
        </div>

        {/* Badge Strip */}
        <div className="sidebar-badge-strip">
          {BADGES.map(b => (
            <div key={b.id} className={`badge-mini ${earnedBadges.has(b.id) ? "earned" : ""}`}>
              {b.icon}
              <div className="badge-tooltip">{b.name}</div>
            </div>
          ))}
        </div>

        {/* Credit */}
        <div style={{
          padding: "16px",
          marginTop: "auto",
          fontSize: "10px",
          color: "var(--text2)",
          textAlign: "center",
          opacity: 0.6,
          letterSpacing: "1.5px",
          fontWeight: 600,
          borderTop: "1px solid var(--border)"
        }}>
          CREATED BY MAWAN
        </div>
      </div>

      {/* MAIN */}
      <div className="main">
        <div className="main-inner">
          {page === "today" && renderToday()}
          {page === "calendar" && <CalendarPage dailyNotes={dailyNotes} onUpdateNote={(date, text) => setDailyNotes(p => ({ ...p, [date]: text }))} />}
          {page === "progress" && renderProgress()}
          {page === "habits" && renderAllHabits()}
          {page === "achievements" && renderAchievements()}
        </div>
      </div>

      {/* MODALS */}
      {showWardrobe && <WardrobeModal xp={xp} activeCostume={activeCostume} onSelect={v => { setActiveCostume(v); setShowWardrobe(false); }} onClose={() => setShowWardrobe(false)} />}
      {showAddHabit && <AddHabitModal onClose={() => setShowAddHabit(false)} onAdd={addHabit} />}
      {showFreeze && <FreezeModal freezes={freezes} onUse={useFreeze} onClose={() => setShowFreeze(false)} />}
      {pomodoroHabit && (
        <PomodoroModal habit={pomodoroHabit}
          onClose={() => setPomodoroHabit(null)}
          onComplete={() => {
            setPomodoroCompleted(p => p + 1);
            addXP(10);
            triggerCelebration("⏱️", "Pomodoro Selesai!", "+10 XP bonus fokus!");
          }}
        />
      )}
    </div>
  );
}
