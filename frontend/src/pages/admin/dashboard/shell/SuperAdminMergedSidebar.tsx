import type { CSSProperties } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Globe2, LogOut, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Avatar } from "@/components/ui/Avatar";
import { SUPER_ADMIN_NAV_GROUPS } from "@/pages/superAdmin/shell/navConfig";
import { NavNotificationBadge } from "./NavNotificationBadge";
import { ROLE_ACCENT_HEX } from "@/utils/roles";

/**
 * The Platform Console sidebar. This app is platform-only — school-level
 * pages live in the separate school project — so there is a single nav
 * (SUPER_ADMIN_NAV_GROUPS) and no Platform / School Console toggle.
 */

interface SuperAdminMergedSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex h-[72px] shrink-0 items-center gap-3 px-4">
      <span className="sidebar-brand-mark flex h-9 w-9 shrink-0 items-center justify-center bg-gradient-to-br from-sky-400 to-blue-600 text-white">
        <Globe2 size={18} strokeWidth={1.9} />
      </span>
      {!collapsed && (
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold leading-tight tracking-tight text-white">Platform Console</p>
          <p className="truncate text-[11px] leading-tight text-slate-400">Super Admin</p>
        </div>
      )}
    </div>
  );
}

function UserCard({ collapsed }: { collapsed: boolean }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="shrink-0 px-3 pt-3">
      <div className={`sidebar-user flex items-center gap-2.5 p-2 ${collapsed ? "flex-col" : ""}`}>
        <span className="relative shrink-0">
          <Avatar src={user.avatar_url} name={user.full_name} size="sm" />
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-black/40" />
        </span>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user.full_name}</p>
            <p className="truncate text-xs text-sky-300/80">Super Admin</p>
          </div>
        )}
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Log out"
          title="Log out"
          className="shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut size={16} strokeWidth={1.85} />
        </button>
      </div>
    </div>
  );
}

function NavGroups({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  return (
    <nav className="sidebar-scroll flex-1 space-y-6 overflow-y-auto px-3 py-2">
      {SUPER_ADMIN_NAV_GROUPS.map((group) => (
        <div key={group.label}>
          {!collapsed && <p className="sidebar-group-label">{group.label}</p>}
          <div className="space-y-1">
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/dashboard/super-admin"}
                onClick={onNavigate}
                title={collapsed ? item.label : undefined}
                data-tour-id={item.to}
                data-tour-label={item.label}
                className={({ isActive }) =>
                  `sidebar-link ${collapsed ? "justify-center" : ""} ${isActive ? "is-active" : ""}`
                }
              >
                <span className="sidebar-icon">
                  <item.icon size={16} strokeWidth={1.9} />
                </span>
                {!collapsed && <span className="truncate">{item.label}</span>}
                <NavNotificationBadge to={item.to} collapsed={collapsed} />
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

const SIDEBAR_BG = "bg-[#0d1220]";
const ACCENT_STYLE = { "--sidebar-accent": ROLE_ACCENT_HEX.super_admin } as CSSProperties;

export function SuperAdminMergedSidebar({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}: SuperAdminMergedSidebarProps) {
  return (
    <>
      <aside
        style={ACCENT_STYLE}
        className={`sidebar-panel hidden shrink-0 flex-col ${SIDEBAR_BG} transition-[width] duration-200 md:flex print:hidden ${
          isCollapsed ? "w-[76px]" : "w-64"
        }`}
      >
        <Brand collapsed={isCollapsed} />
        <NavGroups collapsed={isCollapsed} />
        <UserCard collapsed={isCollapsed} />
        <button type="button" onClick={onToggleCollapse} className="sidebar-collapse m-3">
          {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          {!isCollapsed && "Collapse"}
        </button>
      </aside>

      {isMobileOpen && (
        <div className="fixed inset-0 z-40 h-dvh md:hidden">
          <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onCloseMobile} aria-hidden="true" />
          <aside style={ACCENT_STYLE} className={`sidebar-panel flex h-dvh w-72 animate-slide-up flex-col ${SIDEBAR_BG} shadow-2xl`}>
            <div className="flex items-center justify-between">
              <Brand collapsed={false} />
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Close menu"
                className="mr-3 flex min-h-11 min-w-11 items-center justify-center rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <NavGroups collapsed={false} onNavigate={onCloseMobile} />
            <UserCard collapsed={false} />
            <div className="h-3 shrink-0" />
          </aside>
        </div>
      )}
    </>
  );
}
