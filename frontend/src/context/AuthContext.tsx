import { createContext, ReactNode, useEffect, useRef } from "react";
import { onSessionChange } from "@/lib/session";
import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/store/authStore";
import { clearStuckSession, fetchIdentity, signIn, signOut } from "@/services/auth.service";
import { AppUser, RoleName } from "@/types/auth.types";

const IDENTITY_LOAD_TIMEOUT_MS = 8000;

class SessionLoadTimeoutError extends Error {}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new SessionLoadTimeoutError("Timed out loading your session")),
      ms
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

interface AuthContextValue {
  user: AppUser | null;
  roleNames: RoleName[];
  permissions: string[];
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AppUser | null>;
  logout: () => Promise<void>;
  hasRole: (role: RoleName) => boolean;
  hasPermission: (permissionCode: string) => boolean;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, roleNames, permissions, isLoading, setUser, setRoleNames, setPermissions, setLoading } =
    useAuthStore();

  const identityRef = useRef<string | null>(null);

  function resetToSignedOut() {
    if (identityRef.current !== null) {
      queryClient.clear();
      identityRef.current = null;
    }
    setUser(null);
    setRoleNames([]);
    setPermissions([]);
  }

  async function loadFullIdentity() {
    const identity = await fetchIdentity();
    const profile = identity?.user ?? null;

    if (profile?.id !== identityRef.current) {
      queryClient.clear();
      identityRef.current = profile?.id ?? null;
    }

    setUser(profile);
    setRoleNames(identity?.roleNames ?? []);
    setPermissions(identity?.permissions ?? []);
    return profile;
  }

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      setLoading(true);
      try {
        await withTimeout(loadFullIdentity(), IDENTITY_LOAD_TIMEOUT_MS);
      } catch (err) {
        if (err instanceof SessionLoadTimeoutError) {
          console.warn("Session load timed out; leaving stored session untouched.", err);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    bootstrap();

    let lastToken: string | null | undefined;
    const unsubscribe = onSessionChange((session) => {
      if (!session) {
        if (lastToken !== null) resetToSignedOut();
        lastToken = null;
        return;
      }
      lastToken = session.accessToken;
      if (identityRef.current) return;
      void withTimeout(loadFullIdentity(), IDENTITY_LOAD_TIMEOUT_MS).catch(() => undefined);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(email: string, password: string) {
    await signIn(email, password);
    try {
      return await withTimeout(loadFullIdentity(), IDENTITY_LOAD_TIMEOUT_MS);
    } catch (err) {
      clearStuckSession();
      throw err;
    }
  }

  async function logout() {
    await signOut();
    resetToSignedOut();
  }

  function hasRole(role: RoleName) {
    return roleNames.includes(role);
  }

  function hasPermission(permissionCode: string) {
    return permissions.includes(permissionCode);
  }

  return (
    <AuthContext.Provider
      value={{ user, roleNames, permissions, isLoading, login, logout, hasRole, hasPermission }}
    >
      {children}
    </AuthContext.Provider>
  );
}
