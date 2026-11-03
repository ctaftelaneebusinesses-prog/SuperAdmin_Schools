/**
 * Link to the separate school project. School-level pages (users, school
 * details, leave, exams, …) live there, not in this platform app, so any
 * route outside the platform console opens the school app in a new tab.
 */
const SCHOOL_APP_URL = (import.meta.env.VITE_SCHOOL_APP_URL || "http://localhost:5173").replace(/\/$/, "");

/** True when the route belongs to this app rather than the school project. */
export function isPlatformRoute(path: string): boolean {
  return path.startsWith("/dashboard/super-admin") || path === "/dashboard/profile";
}

export function openInSchoolApp(path: string): void {
  window.open(`${SCHOOL_APP_URL}${path}`, "_blank", "noopener,noreferrer");
}

/** Navigates in-app for platform routes, otherwise opens the school app. */
export function goToRoute(path: string, navigate: (to: string) => void): void {
  if (isPlatformRoute(path)) navigate(path);
  else openInSchoolApp(path);
}
