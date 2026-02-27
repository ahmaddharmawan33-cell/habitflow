// js/config.js
// ─────────────────────────────────────────────────────────────────────────────
// Central config for the frontend.
// This is the ONLY file that needs to change between environments.
//
// WHY NO API KEY HERE:
//   The Groq API key lives exclusively in the backend .env file.
//   The frontend only knows the backend URL — never the key itself.
// ─────────────────────────────────────────────────────────────────────────────

const CONFIG = {
  // Supabase — these are safe to expose (they're publishable keys)
  SUPABASE_URL: "https://jbzipmuxfynwhavuxsvv.supabase.co",
  SUPABASE_KEY: "sb_publishable_eIPZv5wV1fd5VTZSlFzePQ_orgHZcIH",

  // Backend URL — switch this for production
  // Development:  "http://localhost:4000"
  // Production:   "https://habitflow-backend.up.railway.app"
  BACKEND_URL: "http://localhost:4000",

  // App constants
  APP_NAME: "HabitFlow",
  VERSION: "1.0.0",
};

export default CONFIG;
