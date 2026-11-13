import axios from "axios";

/**
 * The login session issued by the school backend API (POST /auth/login):
 * a short-lived JWT access token plus a single-use refresh token.
 * Persisted in localStorage so a reload stays signed in; shared across tabs.
 */
export interface Session {
  accessToken: string;
  refreshToken: string;
  /** Access-token expiry, unix seconds. */
  expiresAt: number;
}

const STORAGE_KEY = "sms-session";
const REFRESH_MARGIN_SECONDS = 60;

// Plain instance: refreshing must not go through the `api` interceptors that
// themselves depend on having a session.
const authApi = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL, timeout: 15000 });

type Listener = (session: Session | null) => void;
const listeners = new Set<Listener>();

function read(): Session | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function getSession(): Session | null {
  return read();
}

export function setSession(session: Session | null) {
  try {
    if (session) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage blocked (private mode) — session lives only as long as the tab */
  }
  listeners.forEach((listener) => listener(session));
}

/** Notified on sign-in, refresh, sign-out — including from other tabs. */
export function onSessionChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) listeners.forEach((listener) => listener(read()));
  });
}

/**
 * Exchanges the refresh token for a new session. Deduped: refresh tokens are
 * single-use, so N requests that all need a refresh at once must share ONE
 * call — a second call with the same token would be rejected.
 *
 * Only a definite rejection (401) clears the session; a network blip keeps
 * it so the next request can try again.
 */
let refreshing: Promise<Session | null> | null = null;

export function refreshSession(): Promise<Session | null> {
  refreshing ??= (async () => {
    const current = read();
    if (!current) return null;
    try {
      const { data } = await authApi.post<{ data: Session }>("/auth/refresh", { refreshToken: current.refreshToken });
      setSession(data.data);
      return data.data;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        // Another tab may have already rotated this token; if so, use its session.
        const latest = read();
        if (latest && latest.refreshToken !== current.refreshToken) return latest;
        setSession(null);
      }
      return null;
    }
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

/** A usable access token, refreshing first if it expires within a minute. */
export async function getAccessToken(): Promise<string | null> {
  const session = read();
  if (!session) return null;
  if (session.expiresAt - REFRESH_MARGIN_SECONDS > Date.now() / 1000) return session.accessToken;
  return (await refreshSession())?.accessToken ?? null;
}
