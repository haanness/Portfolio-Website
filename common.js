// common.js — tiny shared helpers, loaded first (no defer) on EVERY page.

// ── Brand colours ─────────────────────────────────────────────
const GREEN = '#00906A';
const WHITE = '#F6F6F6';

// ── Safe storage ──────────────────────────────────────────────
// localStorage / sessionStorage can throw (SecurityError) when storage is
// blocked — e.g. Safari with "block all cookies", some in-app browsers,
// certain private modes — or when the quota is full. An uncaught throw at
// the top of a script would stop the whole script, so every access goes
// through these wrappers: reads fall back to null, writes are skipped.
const makeSafeStorage = (getStore) => ({
  get(key)        { try { return getStore().getItem(key); }       catch { return null; } },
  set(key, value) { try { getStore().setItem(key, String(value)); } catch { /* ignore */ } },
  remove(key)     { try { getStore().removeItem(key); }           catch { /* ignore */ } },
});

const safeLocal   = makeSafeStorage(() => localStorage);
const safeSession = makeSafeStorage(() => sessionStorage);
