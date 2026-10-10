// A helper to remember last login method Via LocalStorage (used for a badge in Login page)

export type LoginMethod = "credentials" | "google" | "github";
const KEY = "authnest:lastLoginMethod";

// Tiny pub/sub so useSyncExternalStore can subscribe to changes
const listeners = new Set<() => void>();
function emit() { listeners.forEach((l) => l()); }

// Set last login method function
export function setLastLoginMethod(method: LoginMethod) {
  try { 
    localStorage.setItem(KEY, method);  // set localStorage item 
    emit();                             // notify same-tab subscribers
  } catch {}
}

// Get last login method function
export function getLastLoginMethod(): LoginMethod | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "credentials" || v === "google" || v === "github" ? v : null;
  } catch {
    return null;
  }
}

// Subscribe fn for useSyncExternalStore — also listens for cross-tab changes
export function subscribeLastLoginMethod(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY || e.key === null) { cb(); } };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}