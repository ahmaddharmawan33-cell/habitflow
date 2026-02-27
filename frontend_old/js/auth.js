// js/auth.js
// ─────────────────────────────────────────────────────────────────────────────
// Authentication module — wraps all Supabase auth logic.
// Uses Google OAuth + session persistence.
// ─────────────────────────────────────────────────────────────────────────────

import CONFIG from "./config.js";

let _supabase = null;

/**
 * Lazily initialize Supabase client.
 * Returns the singleton instance.
 */
export function getSupabase() {
  if (_supabase) return _supabase;
  // Supabase is loaded via CDN in index.html
  _supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
  return _supabase;
}

/**
 * Get the currently authenticated user.
 * Returns null if not logged in.
 */
export async function getCurrentUser() {
  const sb = getSupabase();
  const { data: { session } } = await sb.auth.getSession();
  return session?.user ?? null;
}

/**
 * Sign in with Google OAuth.
 * Redirects to the current page after login.
 */
export async function signInWithGoogle() {
  const sb = getSupabase();
  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin + window.location.pathname,
    },
  });
  if (error) throw new Error(error.message);
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  const sb = getSupabase();
  const { error } = await sb.auth.signOut();
  if (error) throw new Error(error.message);
}

/**
 * Listen for auth state changes.
 * Calls callback(event, session) on every change.
 *
 * @param {Function} callback
 * @returns {Function} unsubscribe function
 */
export function onAuthChange(callback) {
  const sb = getSupabase();
  const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  return () => subscription.unsubscribe();
}

/**
 * Extract a clean display name from user metadata.
 */
export function getUserDisplayName(user) {
  if (!user) return "Guest";
  const meta = user.user_metadata || {};
  const full = meta.full_name || meta.name || user.email || "User";
  return full.split(" ")[0]; // First name only
}

/**
 * Extract avatar URL from user metadata.
 */
export function getUserAvatarURL(user) {
  return user?.user_metadata?.avatar_url ?? null;
}
