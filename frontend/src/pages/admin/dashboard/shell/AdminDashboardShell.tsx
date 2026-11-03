import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { SchoolProvider } from "@/context/SchoolContext";
import { SuperAdminMergedSidebar } from "./SuperAdminMergedSidebar";
import { AdminTopbar } from "./AdminTopbar";

/** Shell (sidebar + topbar + school context) for every Platform Console page. */
export function AdminDashboardShell({ children }: { children: ReactNode }) {
  const [isCollapsed, setCollapsed] = useState(false);
  const [isMobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const Sidebar = SuperAdminMergedSidebar;

  // Belt-and-suspenders: close the mobile drawer whenever the route changes,
  // not just when a nav link's onClick fires — so the drawer never lingers
  // open over the newly-opened page on mobile.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <SchoolProvider>
      <div className="fixed inset-0 flex overflow-hidden bg-[var(--page-plane)] print:static print:block print:h-auto print:overflow-visible">
        <Sidebar
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setCollapsed((v) => !v)}
          isMobileOpen={isMobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
        <div className="flex min-w-0 flex-1 flex-col print:block">
          <AdminTopbar onOpenMobileMenu={() => setMobileOpen(true)} />
          <main className="relative flex-1 overflow-y-auto p-4 sm:p-6 print:overflow-visible print:p-0">{children}</main>
        </div>
      </div>
    </SchoolProvider>
  );
}
