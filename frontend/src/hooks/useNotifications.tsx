import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import * as notificationService from "@/services/notification.service";
import { AppNotification, NOTIFICATION_TYPE_LABEL } from "@/types/notification.types";

const NOTIFICATION_POLL_MS = 20_000;

function showBrowserNotification(notification: AppNotification) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  new Notification(`${NOTIFICATION_TYPE_LABEL[notification.type]}: ${notification.title}`, {
    body: notification.message,
    tag: notification.id,
  });
}

interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  permission: NotificationPermission;
  requestBrowserPermission: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "denied"
  );

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    notificationService
      .fetchMyNotifications()
      .then((data) => {
        if (isMounted) setNotifications(data);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    // Polls for new notifications via the backend API endpoint
    const poll = window.setInterval(() => {
      notificationService
        .fetchMyNotifications()
        .then((latest) => {
          if (!isMounted) return;
          setNotifications((prev) => {
            const known = new Set(prev.map((n) => n.id));
            for (const incoming of latest.filter((n) => !known.has(n.id))) {
              showBrowserNotification(incoming);
            }
            return latest;
          });
        })
        .catch(() => undefined);
    }, NOTIFICATION_POLL_MS);

    return () => {
      isMounted = false;
      window.clearInterval(poll);
    };
  }, [user, queryClient]);

  const markAsRead = useCallback(async (notificationId: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)));
    await notificationService.markNotificationRead(notificationId);
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await notificationService.markAllNotificationsRead();
  }, []);

  const requestBrowserPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const value = useMemo<NotificationsContextValue>(
    () => ({ notifications, unreadCount, isLoading, markAsRead, markAllAsRead, permission, requestBrowserPermission }),
    [notifications, unreadCount, isLoading, markAsRead, markAllAsRead, permission, requestBrowserPermission]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within a NotificationsProvider");
  return ctx;
}
