import { api } from "@/lib/axios";
import { getSession, Session, setSession } from "@/lib/session";
import { AppUser, RoleName } from "@/types/auth.types";

const DEMO_STORAGE_KEY = "sms-demo-auth";
const DEMO_ACCOUNTS: Record<string, { email: string; password: string; fullName: string; role: RoleName; roleNames: RoleName[]; permissions: string[] }> = {
  admin: {
    email: "superadmin@vijayavani.test",
    password: "SuperAdmin@123",
    fullName: "Platform Super Admin",
    role: "super_admin",
    roleNames: ["super_admin", "school_admin"],
    permissions: [
      "platform.manage_schools",
      "platform.manage_school_admins",
      "platform.view_audit_log",
      "schools.view_assigned",
      "assessment.manage_questions",
      "assessment.manage_settings",
      "users.view",
      "users.manage",
    ],
  },
};

function isDemoModeEnabled() {
  return import.meta.env.VITE_DEMO_MODE === "true" || import.meta.env.DEV;
}

function getDemoCredentials(email?: string) {
  const normalizedEmail = (email ?? "").trim().toLowerCase();
  if (normalizedEmail) {
    if (normalizedEmail === "demo@school.local" || normalizedEmail === "superadmin@school.local") {
      return { ...DEMO_ACCOUNTS.admin };
    }
    const accountKey = normalizedEmail.split("@", 1)[0];
    return DEMO_ACCOUNTS[accountKey] ?? null;
  }

  const configuredEmail = (import.meta.env.VITE_DEMO_EMAIL ?? "superadmin@vijayavani.test").trim().toLowerCase();
  const configuredPassword = (import.meta.env.VITE_DEMO_PASSWORD ?? "SuperAdmin@123").trim();
  const account = DEMO_ACCOUNTS[configuredEmail.split("@", 1)[0]] ?? DEMO_ACCOUNTS.admin;
  return { ...account, password: configuredPassword };
}

function getDemoSession() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(DEMO_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { user: AppUser; roleNames: RoleName[]; permissions: string[] };
  } catch {
    return null;
  }
}

function persistDemoSession(user: AppUser, roleNames: RoleName[], permissions: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify({ user, roleNames, permissions }));
}

function clearDemoSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DEMO_STORAGE_KEY);
}

/** Drops any stored session (real or demo) without contacting the server. */
export function clearStuckSession() {
  clearDemoSession();
  setSession(null);
}

/**
 * Signs in through the linked school backend API: `POST /auth/login`.
 * For Super Admin and School Admin, loginAs is "founder" which validates against
 * super_admin / school_admin roles.
 */
export async function signIn(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const demoAccount = getDemoCredentials(normalizedEmail);
  const isDemoLogin =
    Boolean(demoAccount) &&
    (normalizedEmail === demoAccount?.email || normalizedEmail === "demo@school.local") &&
    password === demoAccount?.password;

  if (isDemoModeEnabled() && isDemoLogin && demoAccount) {
    const demoUser: AppUser = {
      id: "demo-super-admin",
      full_name: demoAccount.fullName,
      email: demoAccount.email,
      school_id: null,
      phone: null,
      role_id: 7,
      avatar_url: null,
      roles: { name: demoAccount.role },
    };

    persistDemoSession(demoUser, demoAccount.roleNames, demoAccount.permissions);
    return { user: demoUser };
  }

  clearDemoSession();

  const { data } = await api.post<{ data: Session & { user: AppUser } }>("/auth/login", {
    loginAs: "founder",
    identifier: normalizedEmail,
    password,
  });

  const { accessToken, refreshToken, expiresAt, user } = data.data;
  setSession({ accessToken, refreshToken, expiresAt });
  return { user };
}

export function signInWithPassword(email: string, password: string) {
  return signIn(email, password);
}

export async function signOut() {
  const demoSession = getDemoSession();
  if (demoSession) {
    clearDemoSession();
    return;
  }

  const session = getSession();
  setSession(null);
  if (session) {
    void api.post("/auth/logout", { refreshToken: session.refreshToken }).catch(() => undefined);
  }
}

export interface Identity {
  user: AppUser;
  roleNames: RoleName[];
  permissions: string[];
}

/** Profile, roles and permissions in one call (GET /auth/me). Null when signed out. */
export async function fetchIdentity(): Promise<Identity | null> {
  const demoSession = getDemoSession();
  if (demoSession) {
    return { user: demoSession.user, roleNames: demoSession.roleNames, permissions: demoSession.permissions };
  }
  if (!getSession()) return null;

  const { data } = await api.get<{ data: { profile: AppUser; roles: RoleName[]; permissions: string[] } }>("/auth/me");
  return { user: data.data.profile, roleNames: data.data.roles, permissions: data.data.permissions };
}

export async function fetchCurrentProfile(): Promise<AppUser | null> {
  return (await fetchIdentity())?.user ?? null;
}

export async function fetchMyRoles(): Promise<RoleName[]> {
  return (await fetchIdentity())?.roleNames ?? [];
}

export async function fetchMyPermissions(): Promise<string[]> {
  return (await fetchIdentity())?.permissions ?? [];
}

/** Emails a reset link to /reset-password?token=... */
export async function requestPasswordReset(email: string) {
  await api.post("/auth/forgot-password", { email, redirectTo: `${window.location.origin}/reset-password` });
}

/** Completes a reset with the token from the emailed link. */
export async function completePasswordReset(token: string, newPassword: string) {
  await api.post("/auth/reset-password", { token, newPassword });
}

/**
 * Self-service password change. The backend signs out every other device
 * and returns a fresh session for this one.
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const { data } = await api.post<{ data: { session: Session } }>("/auth/change-password", { currentPassword, newPassword });
  if (data.data.session) setSession(data.data.session);
}
