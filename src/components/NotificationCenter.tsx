"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppLocale } from "./AppShell";

type AdminNotification = {
  id: string;
  type: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  priority: number;
  startsAt: string;
  endsAt: string | null;
  createdAt: string;
};

type NotificationsResponse = {
  notifications?: AdminNotification[];
};

const dismissedStorageKey = "fadfada-dismissed-notifications";
const typeStyles: Record<string, { labelAr: string; labelEn: string; className: string; marker: string }> = {
  GENERAL: { labelAr: "عام", labelEn: "General", className: "border-white/15 bg-[#0E0D10]/92", marker: "bg-bone/70" },
  NEW_FEATURE: { labelAr: "ميزة جديدة", labelEn: "New Feature", className: "border-gold/35 bg-[#15120B]/94", marker: "bg-gold" },
  NEW_AVATAR: { labelAr: "رفيق جديد", labelEn: "New Avatar", className: "border-emerald-200/30 bg-[#081611]/94", marker: "bg-emerald-200" },
  MAINTENANCE: { labelAr: "صيانة", labelEn: "Maintenance", className: "border-red-200/35 bg-[#1B0B0B]/94", marker: "bg-red-200" },
  EVENT: { labelAr: "حدث", labelEn: "Event", className: "border-sky-200/30 bg-[#07131A]/94", marker: "bg-sky-200" },
  PAYMENT: { labelAr: "دفع", labelEn: "Payment", className: "border-amber-200/30 bg-[#191205]/94", marker: "bg-amber-200" },
};

function readDismissedIds() {
  try {
    return JSON.parse(localStorage.getItem(dismissedStorageKey) || "[]") as string[];
  } catch {
    return [];
  }
}

export function NotificationCenter() {
  const { language, direction } = useAppLocale();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const visibleNotifications = useMemo(
    () => notifications.filter((notification) => !dismissedIds.includes(notification.id)).slice(0, 2),
    [dismissedIds, notifications]
  );

  useEffect(() => {
    setDismissedIds(readDismissedIds());
    let cancelled = false;

    async function loadNotifications() {
      try {
        const response = await fetch("/api/notifications", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as NotificationsResponse;
        if (!cancelled) setNotifications(payload.notifications || []);
      } catch {
        if (!cancelled) setNotifications([]);
      }
    }

    void loadNotifications();
    return () => {
      cancelled = true;
    };
  }, []);

  function dismissNotification(notificationId: string) {
    const nextDismissedIds = Array.from(new Set([...dismissedIds, notificationId]));
    setDismissedIds(nextDismissedIds);
    localStorage.setItem(dismissedStorageKey, JSON.stringify(nextDismissedIds.slice(-30)));
  }

  if (visibleNotifications.length === 0) return null;

  return (
    <div className="fixed inset-x-0 top-[4.35rem] z-40 mx-auto grid max-w-2xl gap-2 px-4" dir={direction}>
      {visibleNotifications.map((notification) => {
        const style = typeStyles[notification.type] || typeStyles.GENERAL;
        const title = language === "ar" ? notification.titleAr : notification.titleEn;
        const body = language === "ar" ? notification.bodyAr : notification.bodyEn;
        const typeLabel = language === "ar" ? style.labelAr : style.labelEn;

        return (
          <section key={notification.id} className={`border px-4 py-3 shadow-2xl backdrop-blur-xl ${style.className}`}>
            <div className="flex items-start gap-3">
              <span className={`mt-1 h-2.5 w-2.5 shrink-0 ${style.marker}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-bone/45" dir="ltr">{typeLabel}</p>
                <h2 className={`${language === "ar" ? "font-arsans" : "font-ensans"} mt-1 text-sm font-semibold text-bone/95`}>{title}</h2>
                <p className={`${language === "ar" ? "font-arsans" : "font-ensans"} mt-1 text-xs leading-5 text-bone/60`}>{body}</p>
              </div>
              <button type="button" onClick={() => dismissNotification(notification.id)} className="shrink-0 border border-white/10 px-2 py-1 font-mono text-xs text-bone/45 transition hover:border-gold/45 hover:text-gold" aria-label={language === "ar" ? "إغلاق التنبيه" : "Dismiss notification"}>
                ×
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
