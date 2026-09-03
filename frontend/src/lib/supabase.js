import { createClient } from "@supabase/supabase-js";

const url = process.env.REACT_APP_SUPABASE_URL;
const anon = process.env.REACT_APP_SUPABASE_ANON_KEY;
export const isDemoMode = !url || !anon;

const demoStorageKey = "belt-sentinel-demo-session";
const demoListeners = new Set();

function getDemoSession() {
  try {
    return JSON.parse(window.localStorage.getItem(demoStorageKey) || "null");
  } catch {
    return null;
  }
}

function setDemoSession(session) {
  if (session) window.localStorage.setItem(demoStorageKey, JSON.stringify(session));
  else window.localStorage.removeItem(demoStorageKey);
  demoListeners.forEach((listener) => listener("SIGNED_IN", session));
}

if (!url || !anon) {
  // eslint-disable-next-line no-console
  console.warn("Supabase env vars missing – login/signup will not work.");
}

const noopAuth = {
  async getSession() {
    return { data: { session: getDemoSession() } };
  },
  onAuthStateChange() {
    const listener = arguments[0];
    demoListeners.add(listener);
    return { data: { subscription: { unsubscribe: () => demoListeners.delete(listener) } } };
  },
  async signOut() {
    setDemoSession(null);
    return { error: null };
  },
  async signInWithPassword({ email, password }) {
    if (!email || !password) return { error: { message: "Email and password are required." } };
    const session = { user: { id: "offline-operator", email }, access_token: "offline-demo" };
    setDemoSession(session);
    return { data: { session }, error: null };
  },
  async signUp({ email, password }) {
    return this.signInWithPassword({ email, password });
  },
};

export const supabase = url && anon
  ? createClient(url, anon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "belt-sentinel-auth",
      },
    })
  : { auth: noopAuth };
