import axios, { isAxiosError } from "axios";
import { getAccessToken, refreshSession } from "./session";
import { useAuthStore } from "@/store/authStore";
import { useSchoolStore } from "@/store/schoolStore";

/**
 * Axios instance for calling the school backend API. Attaches the current access
 * token (lib/session.ts) as a Bearer header on every request, so the
 * backend's requireAuth middleware can verify identity.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (import.meta.env.VITE_SUPER_ADMIN_BRIDGE_SECRET) {
    config.headers.Authorization = `Bearer ${import.meta.env.VITE_SUPER_ADMIN_BRIDGE_SECRET}`;
  }

  const bridgeSecret = import.meta.env.VITE_SUPER_ADMIN_BRIDGE_SECRET;
  if (bridgeSecret) {
    config.headers["X-Super-Admin-Bridge-Key"] = bridgeSecret;
  }

  // Multi-school support: anyone who can switch schools (super_admin across
  // every school, school_admin across their assigned ones — see
  // 066_super_admin_multi_school.sql) gets the selector's choice attached to
  // every request.
  const canSwitchSchools = useAuthStore.getState().permissions.includes("schools.view_assigned");
  const selectedSchoolId = useSchoolStore.getState().selectedSchoolId;
  if (canSwitchSchools && selectedSchoolId) {
    config.params = { ...config.params, school_id: selectedSchoolId };
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as (typeof error.config & { _retried?: boolean }) | undefined;

    // A 401 can just mean the token expired between being attached and
    // reaching the server. Refresh once (shared across parallel requests)
    // and retry before giving up.
    if (error.response?.status === 401 && originalRequest && !originalRequest._retried) {
      originalRequest._retried = true;
      if (await refreshSession()) {
        return api(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Every backend error response follows `{ success: false, message, details? }`
 * (see backend/src/middleware/error.middleware.ts).
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as { message?: string } | undefined;
    if (data?.message) return data.message;
  }
  return fallback;
}
