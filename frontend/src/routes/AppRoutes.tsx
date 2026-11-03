import { lazy, Suspense } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { AdminDashboardShell } from "@/pages/admin/dashboard/shell/AdminDashboardShell";
import { Spinner } from "@/components/ui/Spinner";

const LoginPage = lazy(() => import("@/pages/auth/LoginPage").then((m) => ({ default: m.LoginPage })));
const ForgotPasswordPage = lazy(() =>
  import("@/pages/auth/ForgotPasswordPage").then((m) => ({ default: m.ForgotPasswordPage }))
);
const ResetPasswordPage = lazy(() =>
  import("@/pages/auth/ResetPasswordPage").then((m) => ({ default: m.ResetPasswordPage }))
);
const UnauthorizedPage = lazy(() =>
  import("@/pages/errors/UnauthorizedPage").then((m) => ({ default: m.UnauthorizedPage }))
);
const NotificationsPage = lazy(() =>
  import("@/pages/shared/NotificationsPage").then((m) => ({ default: m.NotificationsPage }))
);
const ProfilePage = lazy(() => import("@/pages/profile/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const WebsiteKnowledgePage = lazy(() =>
  import("@/pages/websiteKnowledge/WebsiteKnowledgePage").then((m) => ({ default: m.WebsiteKnowledgePage }))
);
const SuperAdminDashboardPage = lazy(() =>
  import("@/pages/superAdmin/SuperAdminDashboardPage").then((m) => ({ default: m.SuperAdminDashboardPage }))
);
const SuperAdminSchoolsPage = lazy(() =>
  import("@/pages/superAdmin/SuperAdminSchoolsPage").then((m) => ({ default: m.SuperAdminSchoolsPage }))
);
const SuperAdminSchoolRequestsPage = lazy(() =>
  import("@/pages/superAdmin/SuperAdminSchoolRequestsPage").then((m) => ({ default: m.SuperAdminSchoolRequestsPage }))
);
const SuperAdminSchoolOverviewPage = lazy(() =>
  import("@/pages/superAdmin/SuperAdminSchoolOverviewPage").then((m) => ({ default: m.SuperAdminSchoolOverviewPage }))
);
const SuperAdminSchoolAdminsPage = lazy(() =>
  import("@/pages/superAdmin/SuperAdminSchoolAdminsPage").then((m) => ({ default: m.SuperAdminSchoolAdminsPage }))
);
const SuperAdminAuditLogPage = lazy(() =>
  import("@/pages/superAdmin/SuperAdminAuditLogPage").then((m) => ({ default: m.SuperAdminAuditLogPage }))
);

/** Platform Console shell — React Router keeps it mounted across child pages. */
function PlatformLayout() {
  return (
    <AdminDashboardShell>
      <Outlet />
    </AdminDashboardShell>
  );
}

/**
 * Route tree for the Super Admin Platform. Every page is gated to the
 * super_admin role; any other role that signs in here is sent to
 * /unauthorized (they use the school project instead). There is no
 * self-registration — super admin accounts are provisioned by an
 * existing administrator.
 */
export function AppRoutes() {
  return (
    <Suspense fallback={<Spinner label="Loading..." />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        <Route element={<ProtectedRoute allowedRoles={["super_admin"]} />}>
          <Route element={<PlatformLayout />}>
            <Route path="/dashboard/super-admin" element={<SuperAdminDashboardPage />} />
            <Route path="/dashboard/super-admin/schools" element={<SuperAdminSchoolsPage />} />
            <Route path="/dashboard/super-admin/school-requests" element={<SuperAdminSchoolRequestsPage />} />
            <Route path="/dashboard/super-admin/schools/:schoolId" element={<SuperAdminSchoolOverviewPage />} />
            <Route path="/dashboard/super-admin/school-admins" element={<SuperAdminSchoolAdminsPage />} />
            <Route path="/dashboard/super-admin/audit-log" element={<SuperAdminAuditLogPage />} />
            <Route path="/dashboard/super-admin/notifications" element={<NotificationsPage />} />
            <Route path="/dashboard/super-admin/website-knowledge" element={<WebsiteKnowledgePage />} />
            <Route path="/dashboard/profile" element={<ProfilePage />} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/dashboard/super-admin" replace />} />
        <Route path="*" element={<Navigate to="/dashboard/super-admin" replace />} />
      </Routes>
    </Suspense>
  );
}
