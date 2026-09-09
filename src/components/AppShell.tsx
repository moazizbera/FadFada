"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SessionProvider, signOut, useSession } from "next-auth/react";
import { createContext, type ChangeEvent, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NEW_CHILDREN_ROSTER } from "../lib/personas";
import { NotificationCenter } from "./NotificationCenter";
import { PwaUpdateManager } from "./PwaUpdateManager";

type AppLanguage = "ar" | "en";
type HomeHeaderAction = "start" | "avatars" | "stories" | "homework" | "newChat";
type AccountTier = "FREE" | "PLUS" | "BUSINESS";
type ParentTool = "homework" | "followup" | "playbook" | "plans";

type ParentChildProfile = {
  id: string;
  nickname: string;
  ageBand: "under_8" | "8_to_10" | "11_to_12" | "13_plus";
  avatarPreference?: string;
};

type HomeworkActivity = {
  type: "quiz" | "trace" | "match" | "story" | "challenge";
  title: string;
  prompt: string;
  hint: string;
  answer: string;
  choices?: string[];
};

type HomeworkResult = {
  subject: "math" | "english" | "arabic" | "kg" | "mixed";
  detectedTask: string;
  parentSummary: string;
  childIntro: string;
  activities: HomeworkActivity[];
  safetyNote: string;
};

type ParentHomeworkAssignmentStatus = {
  id: string;
  childProfileId: string;
  childNickname: string;
  detectedTask: string;
  subject: HomeworkResult["subject"];
  assignedAt: string;
  missionCompleted: boolean;
  missionCompletedAt: string | null;
  missionPoints: number;
};

type ParentHomeworkChildFollowup = {
  childProfileId: string;
  childNickname: string;
  totalAssignments: number;
  completedAssignments: number;
  pendingAssignments: number;
  completionRate: number;
  totalPoints: number;
  assignments: ParentHomeworkAssignmentStatus[];
};

type ParentHomeworkFollowupResponse = {
  range?: "today" | "7d" | "30d" | "all";
  children: ParentHomeworkChildFollowup[];
  totals: {
    totalAssignments: number;
    completedAssignments: number;
    pendingAssignments: number;
    totalPoints: number;
  };
};

type ParentHomeworkFollowupRange = "today" | "7d" | "30d" | "all";

type ParentPlaybookResult = {
  title: string;
  quickRead: string;
  childLens: string;
  sayThis: string[];
  avoidThis: string[];
  resetSteps: string[];
  playBridge: string;
  boundaryScript: string;
  repairLine: string;
  followUp: string;
  safetyNote: string;
  childNickname?: string | null;
};

type SavedParentPlan = ParentPlaybookResult & {
  id: string;
  createdAt: string;
  situation: string;
  goal: string;
};

type AppLocaleContextValue = {
  language: AppLanguage;
  direction: "rtl" | "ltr";
  toggleLanguage: () => void;
  setLanguage: (language: AppLanguage) => void;
};

type AppShellProps = {
  children: ReactNode;
  initialLanguage?: AppLanguage;
};

type AccountProfile = {
  name: string | null;
  nickname: string | null;
  email: string | null;
  image: string | null;
  activeTier?: string | null;
};

const AppLocaleContext = createContext<AppLocaleContextValue | null>(null);
const appLanguageStorageKey = "fadfada-language";
const fadfadaHomeActionEventName = "fadfada:home-action";
const savedParentPlansStorageKey = "fadfada-parent-plans";

export function useAppLocale() {
  const context = useContext(AppLocaleContext);

  if (!context) {
    throw new Error("useAppLocale must be used inside AppShell.");
  }

  return context;
}

export function AppShell({ children, initialLanguage = "ar" }: AppShellProps) {
  const [language, setLanguage] = useState<AppLanguage>(initialLanguage);
  const [localeLoaded, setLocaleLoaded] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const direction = language === "ar" ? "rtl" : "ltr";
  const shellFontClass = language === "ar" ? "font-arsans text-right" : "font-ensans text-left";

  // Only load from localStorage after hydration is complete to avoid hydration mismatch
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    const storedLanguage = localStorage.getItem(appLanguageStorageKey);
    if (storedLanguage === "ar" || storedLanguage === "en" && storedLanguage !== language) {
      setLanguage(storedLanguage);
    }
    setLocaleLoaded(true);
  }, [isHydrated]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
  }, [direction, language]);

  useEffect(() => {
    if (!localeLoaded) return;
    localStorage.setItem(appLanguageStorageKey, language);
  }, [language, localeLoaded]);

  const localeContext = useMemo<AppLocaleContextValue>(
    () => ({
      language,
      direction,
      setLanguage,
      toggleLanguage: () => setLanguage((currentLanguage) => (currentLanguage === "ar" ? "en" : "ar")),
    }),
    [direction, language]
  );

  return (
    <SessionProvider>
      <AppLocaleContext.Provider value={localeContext}>
        <div dir={direction} className={`min-h-screen bg-ink text-bone/90 ${shellFontClass}`} data-language={language} suppressHydrationWarning>
          {isHydrated && <GlobalHeader />}
          {isHydrated && <NotificationCenter />}
          <div className="transition-[padding,margin] duration-300 ease-out">
            {isHydrated ? children : null}
          </div>
          {isHydrated && <GlobalFooter />}
          {isHydrated && <PwaUpdateManager />}
        </div>
      </AppLocaleContext.Provider>
    </SessionProvider>
  );
}

function GlobalFooter() {
  const { language, direction } = useAppLocale();
  const pathname = usePathname();
  const { data: session } = useSession();
  const isArabic = language === "ar";
  const isChildWorkspace = session?.user && "workspaceMode" in session.user && session.user.workspaceMode === "child";
  const links = [
    { href: "/pricing", label: isArabic ? "الأسعار" : "Pricing" },
    { href: "/terms", label: isArabic ? "الشروط" : "Terms" },
    { href: "/privacy", label: isArabic ? "الخصوصية" : "Privacy" },
    { href: "/refund", label: isArabic ? "الاسترداد" : "Refunds" },
  ];

  if (pathname === "/" || isChildWorkspace) return null;

  return (
    <footer className="border-t border-white/10 bg-[#0E0D10]/80 px-4 py-8 sm:px-6 md:px-8" dir={direction}>
      <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-center gap-x-5 gap-y-3 text-center font-arsans text-sm text-bone/48">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="transition-colors hover:text-gold">
            {link.label}
          </Link>
        ))}
      </div>
    </footer>
  );
}

function GlobalHeader() {
  const { language, direction, toggleLanguage } = useAppLocale();
  const pathname = usePathname();
  const { data: session, status, update: updateSession } = useSession();
  const [accountOpen, setAccountOpen] = useState(false);
  const [activitiesOpen, setActivitiesOpen] = useState(false);
  const [childrenOpen, setChildrenOpen] = useState(false);
  const [headerChildProfiles, setHeaderChildProfiles] = useState<ParentChildProfile[]>([]);
  const [childrenLoadStatus, setChildrenLoadStatus] = useState<"idle" | "loading" | "error">("idle");
  const [childSwitchingId, setChildSwitchingId] = useState("");
  const [activeParentTool, setActiveParentTool] = useState<ParentTool | null>(null);
  const [accountProfile, setAccountProfile] = useState<AccountProfile | null>(null);
  const [activeAdminTab, setActiveAdminTab] = useState("dashboard");
  const [parentReturnStatus, setParentReturnStatus] = useState<"idle" | "switching" | "error">("idle");
  const [parentReturnOpen, setParentReturnOpen] = useState(false);
  const [parentReturnCodeInput, setParentReturnCodeInput] = useState("");
  const [parentReturnCode, setParentReturnCode] = useState("");
  const [, setEscapePressCount] = useState(0);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const activitiesMenuRef = useRef<HTMLDivElement | null>(null);
  const childrenMenuRef = useRef<HTMLDivElement | null>(null);
  const isArabic = language === "ar";
  const nextLanguageLabel = isArabic ? "EN" : "AR";
  const authenticatedImage = accountProfile?.image || session?.user?.image;
  const sessionChildNickname = session?.user && "childNickname" in session.user && typeof session.user.childNickname === "string" ? session.user.childNickname : "";
  const childWorkspaceName = sessionChildNickname || (isArabic ? "مساحة الطفل" : "Child space");
  const authenticatedName = accountProfile?.nickname || accountProfile?.name || session?.user?.name || accountProfile?.email || session?.user?.email || (isArabic ? "عضو فضفضة" : "FadFada member");
  const authenticatedEmail = accountProfile?.email || session?.user?.email || "";
  const sessionUserRole = session?.user && "role" in session.user ? session.user.role : "USER";
  const isChildWorkspace = session?.user && "workspaceMode" in session.user && session.user.workspaceMode === "child";
  const accountTier = getAccountTier(accountProfile?.activeTier ?? (session?.user && "activeTier" in session.user ? session.user.activeTier : undefined));
  const isAdminArea = pathname?.startsWith("/admin") ?? false;
  const isProfileArea = pathname === "/profile";
  const accountMenuAlignmentClass = isArabic ? "left-0 text-right" : "right-0 text-left";
  const activitiesMenuAlignmentClass = isArabic ? "left-0 text-right" : "right-0 text-left";
  const headerActions: Array<{ action: HomeHeaderAction; label: string }> = [
    { action: "start", label: isArabic ? "ابدأ" : "Start" },
    { action: "avatars", label: isArabic ? "الرفاق" : "Avatars" },
    ...(isChildWorkspace ? [{ action: "stories" as const, label: isArabic ? "القصص" : "Stories" }] : []),
    ...(isChildWorkspace ? [{ action: "homework" as const, label: isArabic ? "واجب" : "Homework" }] : []),
    { action: "newChat", label: isArabic ? "محادثة جديدة" : "New chat" },
  ];
  const adminTabs = [
    { id: "dashboard", ar: "القياس", en: "Dashboard" },
    { id: "configuration", ar: "الإعدادات", en: "Config" },
    { id: "users", ar: "الهدايا", en: "Gifts" },
    { id: "personas", ar: "الرفاق", en: "Personas" },
    { id: "families", ar: "الأطفال", en: "Children" },
    { id: "offers", ar: "الخصومات", en: "Offers" },
    { id: "sessions", ar: "الجلسات", en: "Sessions" },
  ];
  const parentActivityLinks: Array<{ tool: ParentTool; label: string; accent: string }> = [
    { tool: "homework", label: isArabic ? "محول الواجب" : "Homework transformer", accent: "text-emerald-100" },
    { tool: "followup", label: isArabic ? "متابعة الواجب" : "Homework follow-up", accent: "text-sky-100" },
    { tool: "playbook", label: isArabic ? "دليل ولي الأمر" : "Parent Playbook", accent: "text-amber-100" },
    { tool: "plans", label: isArabic ? "خطط أطفالي" : "My kids plans", accent: "text-cyan-100" },
  ];

  function openParentTool(tool: ParentTool) {
    setActivitiesOpen(false);
    setAccountOpen(false);
    setChildrenOpen(false);
    setActiveParentTool(tool);
  }

  function runHeaderAction(action: HomeHeaderAction) {
    setAccountOpen(false);
    setActivitiesOpen(false);
    setChildrenOpen(false);
    if (typeof window === "undefined") return;

    if (window.location.pathname !== "/") {
      window.location.assign(`/?fadfadaAction=${action}`);
      return;
    }

    window.dispatchEvent(new CustomEvent(fadfadaHomeActionEventName, { detail: { action } }));
  }

  async function openChildWorkspaceFromHeader(childProfileId: string) {
    if (childSwitchingId) return;

    setChildSwitchingId(childProfileId);
    try {
      const nextSession = await updateSession({ childProfileId, activeChildProfileId: childProfileId });
      const nextWorkspaceMode = nextSession?.user && "workspaceMode" in nextSession.user ? nextSession.user.workspaceMode : null;
      const nextChildProfileId = nextSession?.user && "childProfileId" in nextSession.user ? nextSession.user.childProfileId : null;

      if (nextWorkspaceMode !== "child" || nextChildProfileId !== childProfileId) {
        setChildSwitchingId("");
        window.location.assign("/profile#child-profiles");
        return;
      }

      setChildrenOpen(false);
      window.location.assign("/");
    } catch {
      setChildSwitchingId("");
      window.location.assign("/profile#child-profiles");
    }
  }

  function openParentReturnGate() {
    setParentReturnCodeInput("");
    setEscapePressCount(0);
    setParentReturnStatus("idle");
    setParentReturnOpen(true);
  }

  async function loadParentReturnCode() {
    const response = await fetch("/api/parent/return-code", { cache: "no-store" }).catch(() => null);
    if (!response?.ok) return "";
    const data = (await response.json().catch(() => ({}))) as { code?: string };
    const nextCode = typeof data.code === "string" ? data.code.trim() : "";
    if (!/^\d{4}$/.test(nextCode)) return "";
    setParentReturnCode(nextCode);
    return nextCode;
  }

  async function returnToParentProfile(event?: FormEvent<HTMLFormElement>, bypassGate = false) {
    event?.preventDefault();
    if (parentReturnStatus === "switching") return;

    const enteredCode = parentReturnCodeInput.replace(/\D/g, "").slice(0, 4);
    const validCode = parentReturnCode || await loadParentReturnCode();

    if (!bypassGate && enteredCode !== validCode) {
      setParentReturnStatus("error");
      return;
    }

    setParentReturnStatus("switching");
    try {
      const submittedParentReturnCode = bypassGate ? validCode : enteredCode;
      const nextSession = await updateSession({
        clearChildProfile: true,
        childProfileId: null,
        activeChildProfileId: null,
        parentReturnCode: submittedParentReturnCode,
      });
      const nextWorkspaceMode = nextSession?.user && "workspaceMode" in nextSession.user ? nextSession.user.workspaceMode : null;
      if (nextWorkspaceMode === "child") {
        setParentReturnStatus("error");
        return;
      }
      window.location.assign("/profile");
    } catch {
      setParentReturnStatus("error");
    }
  }

  function handleParentReturnKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Escape") return;

    event.preventDefault();
    setEscapePressCount((current) => {
      const nextCount = current + 1;
      if (nextCount >= 3) {
        void returnToParentProfile(undefined, true);
        return 0;
      }
      return nextCount;
    });
  }

  useEffect(() => {
    if (status !== "authenticated" || !isChildWorkspace) {
      setParentReturnCode("");
      return;
    }

    let active = true;
    loadParentReturnCode().then((code) => {
      if (!active) return;
      setParentReturnCode(code);
    }).catch(() => {
      if (!active) return;
      setParentReturnCode("");
    });

    return () => {
      active = false;
    };
  }, [isChildWorkspace, status]);

  useEffect(() => {
    if (status !== "authenticated" || isChildWorkspace || !accountOpen) {
      setAccountProfile(null);
      return;
    }

    let active = true;
    fetch("/api/profile")
      .then((response) => response.ok ? response.json() as Promise<{ profile?: AccountProfile }> : null)
      .then((data) => {
        if (active && data?.profile) setAccountProfile(data.profile);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [accountOpen, isChildWorkspace, status]);

  useEffect(() => {
    if (!isAdminArea || typeof window === "undefined") {
      setActiveAdminTab("dashboard");
      return;
    }

    function syncActiveAdminTab() {
      const tab = new URLSearchParams(window.location.search).get("tab");
      setActiveAdminTab(tab === "configuration" || tab === "users" || tab === "personas" || tab === "families" || tab === "offers" || tab === "sessions" ? tab : "dashboard");
    }

    syncActiveAdminTab();
    window.addEventListener("popstate", syncActiveAdminTab);
    return () => window.removeEventListener("popstate", syncActiveAdminTab);
  }, [isAdminArea, pathname]);

  useEffect(() => {
    if (!accountOpen) return;

    function closeAccountMenuOnOutsidePointer(event: MouseEvent | TouchEvent) {
      const target = event.target;
      if (!(target instanceof Node) || accountMenuRef.current?.contains(target)) return;
      setAccountOpen(false);
    }

    function closeAccountMenuOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setAccountOpen(false);
    }

    document.addEventListener("mousedown", closeAccountMenuOnOutsidePointer);
    document.addEventListener("touchstart", closeAccountMenuOnOutsidePointer);
    document.addEventListener("keydown", closeAccountMenuOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeAccountMenuOnOutsidePointer);
      document.removeEventListener("touchstart", closeAccountMenuOnOutsidePointer);
      document.removeEventListener("keydown", closeAccountMenuOnEscape);
    };
  }, [accountOpen]);

  useEffect(() => {
    if (!activitiesOpen) return;

    function closeActivitiesMenuOnOutsidePointer(event: MouseEvent | TouchEvent) {
      const target = event.target;
      if (!(target instanceof Node) || activitiesMenuRef.current?.contains(target)) return;
      setActivitiesOpen(false);
    }

    function closeActivitiesMenuOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setActivitiesOpen(false);
    }

    document.addEventListener("mousedown", closeActivitiesMenuOnOutsidePointer);
    document.addEventListener("touchstart", closeActivitiesMenuOnOutsidePointer);
    document.addEventListener("keydown", closeActivitiesMenuOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeActivitiesMenuOnOutsidePointer);
      document.removeEventListener("touchstart", closeActivitiesMenuOnOutsidePointer);
      document.removeEventListener("keydown", closeActivitiesMenuOnEscape);
    };
  }, [activitiesOpen]);

  useEffect(() => {
    if (status !== "authenticated" || isChildWorkspace || isAdminArea || !childrenOpen) return;

    let active = true;
    setChildrenLoadStatus("loading");
    fetch("/api/parent/child", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<{ childProfiles?: ParentChildProfile[] }> : Promise.reject(new Error(String(response.status))))
      .then((data) => {
        if (!active) return;
        setHeaderChildProfiles(Array.isArray(data.childProfiles) ? data.childProfiles : []);
        setChildrenLoadStatus("idle");
      })
      .catch(() => {
        if (!active) return;
        setChildrenLoadStatus("error");
      });

    return () => {
      active = false;
    };
  }, [childrenOpen, isAdminArea, isChildWorkspace, status]);

  useEffect(() => {
    if (!childrenOpen) return;

    function closeChildrenMenuOnOutsidePointer(event: MouseEvent | TouchEvent) {
      const target = event.target;
      if (!(target instanceof Node) || childrenMenuRef.current?.contains(target)) return;
      setChildrenOpen(false);
    }

    function closeChildrenMenuOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setChildrenOpen(false);
    }

    document.addEventListener("mousedown", closeChildrenMenuOnOutsidePointer);
    document.addEventListener("touchstart", closeChildrenMenuOnOutsidePointer);
    document.addEventListener("keydown", closeChildrenMenuOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeChildrenMenuOnOutsidePointer);
      document.removeEventListener("touchstart", closeChildrenMenuOnOutsidePointer);
      document.removeEventListener("keydown", closeChildrenMenuOnEscape);
    };
  }, [childrenOpen]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#0E0D10]/78 text-bone/90 shadow-2xl backdrop-blur-xl" dir={direction}>
      <div className={`mx-auto flex min-h-16 items-center justify-between gap-1.5 px-2 py-2 sm:gap-2 sm:px-4 ${isAdminArea ? "max-w-6xl" : "max-w-5xl"}`}>
      <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={toggleLanguage}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-slate-950/70 font-arsans text-xs text-bone/90 shadow-xl backdrop-blur-xl transition-colors hover:border-gold/50 hover:text-gold sm:w-auto sm:px-3 sm:text-sm"
          aria-label={isArabic ? "تغيير اللغة إلى الإنجليزية" : "Switch language to Arabic"}
        >
          {nextLanguageLabel}
        </button>
        {isProfileArea ? (
          <nav className="flex min-w-0 items-center gap-1 rounded-full border border-gold/20 bg-gold/[0.06] p-1 shadow-xl backdrop-blur-xl" aria-label={isArabic ? "قائمة ملف الحساب" : "Account profile menu"}>
            <Link href="/" className="group relative inline-flex shrink-0 items-center gap-1.5 overflow-hidden rounded-full px-3 py-1.5 font-arsans text-[11px] text-gold transition-all duration-200 hover:-translate-y-0.5 hover:text-ink sm:px-3.5 sm:text-xs">
              <span className="absolute inset-0 translate-y-full rounded-full bg-gold transition-transform duration-200 group-hover:translate-y-0" aria-hidden="true" />
              <span className="relative">{isArabic ? "العودة للرئيسية" : "Back home"}</span>
            </Link>
            <span className="hidden px-3 py-1.5 font-arsans text-xs text-bone/55 sm:inline">{isArabic ? "ملف الحساب" : "Account"}</span>
          </nav>
        ) : isAdminArea ? (
          <nav className="mobile-scrollbar-none flex min-w-0 items-center gap-1 overflow-x-auto rounded-full border border-gold/20 bg-gold/[0.06] p-1 shadow-xl backdrop-blur-xl sm:flex-wrap sm:overflow-visible" aria-label={isArabic ? "تبويبات الإدارة" : "Admin tabs"}>
            {adminTabs.map((tab) => {
              const active = activeAdminTab === tab.id;
              return (
                <Link
                  key={tab.id}
                  href={`/admin/dashboard${tab.id === "dashboard" ? "" : `?tab=${tab.id}`}`}
                  onClick={() => setActiveAdminTab(tab.id)}
                  className={`group relative shrink-0 overflow-hidden rounded-full px-3 py-1.5 font-arsans text-[11px] transition-all duration-200 hover:-translate-y-0.5 sm:px-3.5 sm:text-xs ${active ? "bg-gold text-ink shadow-[0_14px_34px_rgba(201,168,106,0.22)]" : "text-gold/78 hover:text-ink"}`}
                >
                  {!active ? <span className="absolute inset-0 translate-y-full rounded-full bg-gold transition-transform duration-200 group-hover:translate-y-0" aria-hidden="true" /> : null}
                  <span className="relative">{isArabic ? tab.ar : tab.en}</span>
                </Link>
              );
            })}
          </nav>
        ) : (
          <nav className="mobile-scrollbar-none flex min-w-0 items-center gap-1 overflow-x-auto rounded-full border border-white/10 bg-white/[0.035] p-1 shadow-xl backdrop-blur-xl sm:flex-wrap sm:overflow-visible" aria-label={isArabic ? "اختصارات فضفضة الرئيسية" : "FadFada quick actions"}>
            {headerActions.map((item) => (
              <button
                key={item.action}
                type="button"
                onClick={() => runHeaderAction(item.action)}
                className="group relative inline-flex h-9 w-9 shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full font-arsans text-[11px] text-bone/72 transition-all duration-200 hover:-translate-y-0.5 hover:text-ink sm:w-auto sm:px-3.5 sm:text-xs"
                title={item.label}
                aria-label={item.label}
              >
                <span className="absolute inset-0 translate-y-full rounded-full bg-gold transition-transform duration-200 group-hover:translate-y-0" aria-hidden="true" />
                <HeaderActionIcon action={item.action} />
                <span className="sr-only sm:not-sr-only sm:relative">{item.label}</span>
              </button>
            ))}
          </nav>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {sessionUserRole === "ADMIN" && !isChildWorkspace ? (
          <Link href={isAdminArea ? "/" : "/admin/dashboard"} className={`hidden rounded-full border px-3 py-2 font-arsans text-xs shadow-xl transition-all duration-200 hover:-translate-y-0.5 sm:inline-flex ${isAdminArea ? "border-white/10 bg-white/[0.035] text-bone/72 hover:border-gold/45 hover:text-gold" : "border-gold/35 bg-gold/[0.08] text-gold hover:bg-gold hover:text-ink"}`}>
            {isAdminArea ? (isArabic ? "فتح الشات" : "Chat") : isArabic ? "الإدارة" : "Admin"}
          </Link>
        ) : null}
        {session?.user && !isChildWorkspace && !isAdminArea ? (
          <>
            <div ref={activitiesMenuRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setActivitiesOpen((open) => !open);
                  setAccountOpen(false);
                  setChildrenOpen(false);
                }}
                className="inline-flex h-10 w-10 items-center justify-center gap-1.5 rounded-full border border-gold/30 bg-gold/[0.09] font-arsans text-xs text-gold shadow-xl transition-all duration-200 hover:-translate-y-0.5 hover:bg-gold hover:text-ink sm:w-auto sm:px-3"
                aria-haspopup="menu"
                aria-expanded={activitiesOpen}
                aria-label={isArabic ? "الأنشطة" : "Activities"}
                title={isArabic ? "الأنشطة" : "Activities"}
              >
                <ActivityMenuIcon />
                <span className="sr-only sm:not-sr-only">{isArabic ? "الأنشطة" : "Activities"}</span>
              </button>
              {activitiesOpen ? (
                <div className={`absolute top-11 z-50 w-[min(16rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1rem)] border border-gold/28 bg-[#0E0D10] p-2 shadow-2xl shadow-black/60 ${activitiesMenuAlignmentClass}`} role="menu" dir={direction}>
                  <p className="px-2 py-1 font-arsans text-[11px] font-semibold uppercase tracking-[0.08em] text-gold/78">{isArabic ? "وصول سريع" : "Fast access"}</p>
                  <div className="mt-1 grid gap-1">
                    {parentActivityLinks.map((link) => (
                      <button key={link.tool} type="button" onClick={() => openParentTool(link.tool)} className="group flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#1A171C] px-2 py-2 text-start font-arsans text-sm text-bone/88 transition-colors hover:border-gold/35 hover:bg-[#231E22] hover:text-gold" role="menuitem">
                        <span>{link.label}</span>
                        <span className={`h-2 w-2 rounded-full ${link.accent} bg-current shadow-[0_0_18px_currentColor]`} aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <div ref={childrenMenuRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setChildrenOpen((open) => !open);
                  setActivitiesOpen(false);
                  setAccountOpen(false);
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-cyan-200/24 bg-cyan-200/10 font-arsans text-xs text-cyan-100 shadow-xl transition-all duration-200 hover:-translate-y-0.5 hover:bg-cyan-200 hover:text-ink sm:w-auto sm:px-3"
                aria-haspopup="menu"
                aria-expanded={childrenOpen}
                aria-label={isArabic ? "الأطفال" : "Children"}
                title={isArabic ? "الأطفال" : "Children"}
              >
                <ChildrenHeaderIcon />
                <span className="sr-only sm:not-sr-only sm:ms-1.5">{isArabic ? "الأطفال" : "Children"}</span>
              </button>
              {childrenOpen ? (
                <div className={`absolute top-11 z-50 w-[min(17rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1rem)] border border-cyan-200/24 bg-[#050607] p-2 shadow-2xl shadow-black/70 ${activitiesMenuAlignmentClass}`} role="menu" dir={direction}>
                  <p className="px-2 py-1 font-arsans text-[11px] font-semibold uppercase tracking-[0.08em] text-cyan-100/78">{isArabic ? "مساحات الأطفال" : "Child spaces"}</p>
                  <div className="mt-1 grid gap-1">
                    {childrenLoadStatus === "loading" ? <p className="rounded-xl border border-white/10 bg-[#171A1E] px-2 py-2 font-arsans text-sm text-bone/58">{isArabic ? "تحميل الأطفال..." : "Loading children..."}</p> : null}
                    {childrenLoadStatus === "error" ? <p className="rounded-xl border border-red-200/18 bg-[#331319] px-2 py-2 font-arsans text-sm text-red-100/86">{isArabic ? "تعذر تحميل ملفات الأطفال." : "Could not load child profiles."}</p> : null}
                    {childrenLoadStatus !== "loading" && headerChildProfiles.length === 0 ? <p className="rounded-xl border border-white/10 bg-[#171A1E] px-2 py-2 font-arsans text-sm text-bone/58">{isArabic ? "لا توجد ملفات أطفال بعد." : "No child profiles yet."}</p> : null}
                    {headerChildProfiles.map((child) => {
                      const persona = NEW_CHILDREN_ROSTER.find((candidate) => candidate.avatar === child.avatarPreference);
                      const personaName = persona ? (isArabic ? persona.arabicName : persona.name) : child.avatarPreference || (isArabic ? "رفيق الطفل" : "Child persona");
                      const avatarPath = child.avatarPreference || persona?.avatar || "";
                      const switching = childSwitchingId === child.id;

                      return (
                        <button key={child.id} type="button" onClick={() => void openChildWorkspaceFromHeader(child.id)} disabled={Boolean(childSwitchingId)} className="group flex items-center gap-3 rounded-xl border border-white/10 bg-[#15191D] px-2 py-2 text-start font-arsans transition-colors hover:border-cyan-200/35 hover:bg-[#1A2429] disabled:cursor-wait disabled:opacity-65" role="menuitem">
                          <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-cyan-100/18 bg-[#081014]" aria-hidden="true">
                            {avatarPath ? <Image src={avatarPath} alt="" fill sizes="40px" className="object-cover" unoptimized /> : <span className="grid h-full w-full place-items-center text-xs font-semibold text-cyan-100">{child.nickname.slice(0, 1).toUpperCase()}</span>}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-bone/90 group-hover:text-cyan-100">{child.nickname}</span>
                            <span className="block truncate text-xs text-bone/48">{switching ? (isArabic ? "جار الفتح..." : "Opening...") : personaName}</span>
                          </span>
                        </button>
                      );
                    })}
                    <Link href="/profile#child-profiles" onClick={() => setChildrenOpen(false)} className="rounded-xl border border-cyan-200/20 bg-[#0B2026] px-2 py-2 text-start font-arsans text-sm font-semibold text-cyan-100 transition-colors hover:bg-cyan-200 hover:text-ink" role="menuitem">
                      {isArabic ? "عرض كل الملفات" : "View all profiles"}
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>
          </>
        ) : null}
        {status === "loading" ? (
          <span className="h-8 w-8 rounded-2xl border border-white/10 bg-slate-950/70 shadow-xl" aria-hidden="true" />
        ) : session?.user && isChildWorkspace ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={openParentReturnGate}
              disabled={parentReturnStatus === "switching"}
              className="hidden rounded-full border border-cyan-200/24 bg-cyan-200/10 px-3 py-2 font-arsans text-xs text-cyan-100 shadow-xl transition-colors hover:bg-cyan-200 hover:text-ink disabled:cursor-wait disabled:opacity-60 min-[420px]:inline-flex"
            >
              {parentReturnStatus === "switching" ? (isArabic ? "جار الرجوع..." : "Returning...") : isArabic ? "ولي الأمر" : "Parent"}
            </button>
            <div className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-slate-950/82 p-1 pr-2 shadow-xl" aria-label={isArabic ? `مساحة الطفل ${childWorkspaceName}` : `Child space ${childWorkspaceName}`}>
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-gold/15 font-arsans text-xs text-gold">
                {childWorkspaceName.slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden max-w-28 truncate font-arsans text-xs text-bone/78 sm:inline">{childWorkspaceName}</span>
            </div>
            <button
              type="button"
              onClick={openParentReturnGate}
              disabled={parentReturnStatus === "switching"}
              className="grid h-10 w-10 place-items-center rounded-2xl border border-cyan-200/24 bg-cyan-200/10 font-arsans text-xs text-cyan-100 shadow-xl transition-colors hover:bg-cyan-200 hover:text-ink disabled:cursor-wait disabled:opacity-60 min-[420px]:hidden"
              aria-label={isArabic ? "الرجوع لمساحة ولي الأمر" : "Return to parent space"}
            >
              {isArabic ? "ولي" : "P"}
            </button>
          </div>
        ) : session?.user ? (
          <div ref={accountMenuRef} className="relative">
            <button type="button" onClick={() => setAccountOpen((open) => !open)} className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-slate-950/82 p-1 pr-2 shadow-xl transition-colors hover:border-gold/45" aria-label={`Open account menu for ${authenticatedName}`} aria-expanded={accountOpen}>
              <span className="relative h-8 w-8 overflow-hidden rounded-xl bg-slate-950">
                {authenticatedImage ? <Image src={authenticatedImage} alt={authenticatedName} fill sizes="32px" className="object-cover" unoptimized /> : <span className="grid h-full w-full place-items-center font-ensans text-xs text-bone/90">{authenticatedName.slice(0, 1).toUpperCase()}</span>}
              </span>
              <TierBadge tier={accountTier} language={language} />
            </button>
            {accountOpen ? (
              <div className={`absolute top-12 z-50 w-[min(18rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1rem)] border border-white/14 bg-[#0E0D10] p-3 shadow-2xl shadow-black/60 ${accountMenuAlignmentClass}`} dir={direction}>
                <p className="truncate font-arsans text-sm text-bone/85">{authenticatedName}</p>
                <p className="mt-1 truncate font-ensans text-xs text-bone/45" dir="ltr">{authenticatedEmail}</p>
                <div className="mt-3 flex justify-start">
                  <TierBadge tier={accountTier} language={language} expanded />
                </div>
                <PlusUnlockList tier={accountTier} language={language} />
                <div className="mt-3 grid gap-1 border-t border-white/10 pt-3">
                  {!isAdminArea ? (
                    <Link href="/profile#child-profiles" onClick={() => setAccountOpen(false)} className="rounded-xl border border-white/10 bg-[#1A171C] px-2 py-2 font-arsans text-sm text-bone/86 transition-colors hover:border-gold/35 hover:bg-[#231E22] hover:text-gold">
                      {isArabic ? "ملفات الأطفال" : "Children profiles"}
                    </Link>
                  ) : null}
                  <Link href="/profile" onClick={() => setAccountOpen(false)} className="rounded-xl border border-white/10 bg-[#1A171C] px-2 py-2 font-arsans text-sm text-bone/86 transition-colors hover:border-gold/35 hover:bg-[#231E22] hover:text-gold">
                    {isArabic ? "الملف واللحظات المحفوظة" : "Profile and saved moments"}
                  </Link>
                  {sessionUserRole === "ADMIN" ? (
                    <Link href="/admin/dashboard" onClick={() => setAccountOpen(false)} className="rounded-xl border border-white/10 bg-[#1A171C] px-2 py-2 font-arsans text-sm text-bone/86 transition-colors hover:border-gold/35 hover:bg-[#231E22] hover:text-gold">
                      {isArabic ? "لوحة الإدارة" : "Admin dashboard"}
                    </Link>
                  ) : null}
                  <button type="button" onClick={() => void signOut({ callbackUrl: "/" })} className="rounded-xl border border-red-200/16 bg-red-950/40 px-2 py-2 text-start font-arsans text-sm text-red-100/86 transition-colors hover:border-red-200/35 hover:bg-red-900/55 hover:text-red-50">
                    {isArabic ? "تسجيل الخروج" : "Sign out"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link href="/admin/login" className="hidden font-arsans text-sm text-bone/45 transition-colors hover:text-gold sm:inline">
              {isArabic ? "الإدارة" : "Admin"}
            </Link>
            <Link href="/auth/signin?callbackUrl=/?onboarding=conversation" className="font-arsans text-sm text-bone/80 transition-colors hover:text-gold">
              {isArabic ? "تسجيل الدخول" : "Sign in"}
            </Link>
          </div>
        )}
      </div>
      </div>
      {parentReturnOpen ? (
        <div onKeyDown={handleParentReturnKeyDown} className="fixed inset-0 z-[120] grid place-items-center bg-[#050607] px-4" role="dialog" aria-modal="true" aria-label={isArabic ? "رمز ولي الأمر" : "Parent return code"} dir={direction}>
          <form onSubmit={(event) => void returnToParentProfile(event)} className="w-full max-w-sm rounded-2xl border border-cyan-200/22 bg-[#0E0D10] p-4 shadow-2xl shadow-black">
            <p className="font-arsans text-sm font-semibold text-cyan-100">{isArabic ? "رمز ولي الأمر" : "Parent return code"}</p>
            <p className="mt-2 font-arsans text-xs leading-6 text-bone/58">
              {isArabic ? "اكتب رمز الرجوع الموجود في صفحة ملفات الأطفال عند ولي الأمر." : "Enter the return code shown in the parent Children profiles page."}
            </p>
            <input
              value={parentReturnCodeInput}
              onChange={(event) => {
                setParentReturnCodeInput(event.target.value.replace(/\D/g, "").slice(0, 4));
                if (parentReturnStatus === "error") setParentReturnStatus("idle");
              }}
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              dir="ltr"
              autoComplete="one-time-code"
              autoFocus
              placeholder="••••"
              className="mt-3 min-h-11 w-full rounded-xl border border-white/12 bg-[#050607] px-3 text-center font-ensans text-lg tracking-[0.35em] text-bone/95 outline-none placeholder:text-bone/42 focus:border-cyan-200/55"
            />
            {parentReturnStatus === "error" ? <p className="mt-2 font-arsans text-xs text-red-200">{isArabic ? "الرمز غير صحيح." : "The code is not correct."}</p> : null}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setParentReturnOpen(false)} className="ui-action rounded-xl border border-white/10 px-3 py-2 text-xs text-bone/70 hover:border-bone/35 hover:text-bone">
                {isArabic ? "إلغاء" : "Cancel"}
              </button>
              <button type="submit" disabled={parentReturnStatus === "switching"} className="ui-action rounded-xl border border-cyan-200/35 bg-cyan-200/12 px-3 py-2 text-xs text-cyan-100 hover:bg-cyan-200 hover:text-ink disabled:cursor-wait disabled:opacity-60">
                {parentReturnStatus === "switching" ? (isArabic ? "جار الرجوع..." : "Returning...") : isArabic ? "فتح ملف الوالد" : "Open parent profile"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
      {activeParentTool && typeof document !== "undefined" ? createPortal(<ParentToolDialog tool={activeParentTool} onClose={() => setActiveParentTool(null)} />, document.body) : null}
    </header>
  );
}

function ParentToolDialog({ tool, onClose }: { tool: ParentTool; onClose: () => void }) {
  const { language, direction } = useAppLocale();
  const isArabic = language === "ar";
  const [childProfiles, setChildProfiles] = useState<ParentChildProfile[]>([]);
  const [childProfileId, setChildProfileId] = useState("");
  const [loadStatus, setLoadStatus] = useState<"loading" | "idle" | "error">("loading");
  const [homeworkImage, setHomeworkImage] = useState<File | null>(null);
  const [homeworkImagePreviewUrl, setHomeworkImagePreviewUrl] = useState("");
  const [homeworkHint, setHomeworkHint] = useState("");
  const [homeworkAgeBand, setHomeworkAgeBand] = useState<ParentChildProfile["ageBand"] | "unknown">("unknown");
  const [homeworkStatus, setHomeworkStatus] = useState<"idle" | "analyzing" | "ready" | "error">("idle");
  const [homeworkMessage, setHomeworkMessage] = useState("");
  const [homeworkResult, setHomeworkResult] = useState<HomeworkResult | null>(null);
  const [playbookSituation, setPlaybookSituation] = useState("");
  const [playbookGoal, setPlaybookGoal] = useState("");
  const [playbookEnergy, setPlaybookEnergy] = useState<"calm" | "tired" | "stressed" | "angry">("calm");
  const [playbookStatus, setPlaybookStatus] = useState<"idle" | "building" | "ready" | "error">("idle");
  const [playbookMessage, setPlaybookMessage] = useState("");
  const [playbookResult, setPlaybookResult] = useState<ParentPlaybookResult | null>(null);
  const [savedParentPlans, setSavedParentPlans] = useState<SavedParentPlan[]>([]);
  const [homeworkFollowup, setHomeworkFollowup] = useState<ParentHomeworkFollowupResponse | null>(null);
  const [homeworkFollowupStatus, setHomeworkFollowupStatus] = useState<"idle" | "loading" | "error">("idle");
  const [homeworkFollowupRange, setHomeworkFollowupRange] = useState<ParentHomeworkFollowupRange>("30d");

  function loadHomeworkFollowupForRange(range: ParentHomeworkFollowupRange) {
    setHomeworkFollowupStatus("loading");
    fetch(`/api/parent/homework/status?range=${range}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<ParentHomeworkFollowupResponse> : Promise.reject(new Error(String(response.status))))
      .then((data) => {
        setHomeworkFollowup(data);
        setHomeworkFollowupStatus("idle");
      })
      .catch(() => {
        setHomeworkFollowup(null);
        setHomeworkFollowupStatus("error");
      });
  }

  useEffect(() => {
    let active = true;
    setLoadStatus("loading");
    fetch("/api/parent/child", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<{ childProfiles?: ParentChildProfile[] }> : Promise.reject(new Error(String(response.status))))
      .then((data) => {
        if (!active) return;
        const nextProfiles = Array.isArray(data.childProfiles) ? data.childProfiles : [];
        setChildProfiles(nextProfiles);
        setChildProfileId((current) => current || nextProfiles[0]?.id || "");
        setLoadStatus("idle");
      })
      .catch(() => {
        if (!active) return;
        setLoadStatus("error");
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setSavedParentPlans(readSavedParentPlans());
  }, []);

  useEffect(() => {
    if (tool !== "followup") return;
    let active = true;
    setHomeworkFollowupStatus("loading");
    fetch(`/api/parent/homework/status?range=${homeworkFollowupRange}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<ParentHomeworkFollowupResponse> : Promise.reject(new Error(String(response.status))))
      .then((data) => {
        if (!active) return;
        setHomeworkFollowup(data);
        setHomeworkFollowupStatus("idle");
      })
      .catch(() => {
        if (!active) return;
        setHomeworkFollowup(null);
        setHomeworkFollowupStatus("error");
      });

    return () => {
      active = false;
    };
  }, [homeworkFollowupRange, tool]);

  useEffect(() => {
    return () => {
      if (homeworkImagePreviewUrl) URL.revokeObjectURL(homeworkImagePreviewUrl);
    };
  }, [homeworkImagePreviewUrl]);

  function selectHomeworkImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setHomeworkImage(file);
    setHomeworkImagePreviewUrl(file ? URL.createObjectURL(file) : "");
    if (homeworkStatus !== "idle") {
      setHomeworkStatus("idle");
      setHomeworkMessage("");
    }
  }

  async function submitHomework(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (homeworkStatus === "analyzing") return;
    if (!childProfileId) {
      setHomeworkStatus("error");
      setHomeworkMessage(isArabic ? "اختر الطفل الذي سيستلم الواجب أولاً." : "Choose the child who should receive this homework first.");
      return;
    }
    if (!homeworkImage && !homeworkHint.trim()) {
      setHomeworkStatus("error");
      setHomeworkMessage(isArabic ? "ارفع صورة الواجب أو اكتب وصفاً قصيراً له." : "Upload a homework image or type a short description.");
      return;
    }

    setHomeworkStatus("analyzing");
    setHomeworkMessage("");

    const formData = new FormData();
    formData.set("language", language);
    formData.set("childAgeBand", homeworkAgeBand);
    formData.set("childProfileId", childProfileId);
    formData.set("hint", homeworkHint.trim());
    if (homeworkImage) formData.set("image", homeworkImage);

    try {
      const response = await fetch("/api/parent/homework", { method: "POST", body: formData });
      const data = await response.json().catch(() => ({})) as HomeworkResult & { error?: string };
      if (!response.ok || !Array.isArray(data.activities)) throw new Error(data.error || "HOMEWORK_HELPER_FAILED");
      const child = childProfiles.find((profile) => profile.id === childProfileId);
      setHomeworkResult(data);
      setHomeworkStatus("ready");
      setHomeworkMessage(isArabic ? `تم إرسال الواجب إلى مساحة ${child?.nickname || "الطفل"}.` : `Homework sent to ${child?.nickname || "the child"}'s space.`);
    } catch (error) {
      setHomeworkStatus("error");
      setHomeworkMessage(formatParentToolHomeworkError(error instanceof Error ? error.message : undefined, language));
    }
  }

  async function submitPlaybook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (playbookStatus === "building") return;
    if (!playbookSituation.trim()) {
      setPlaybookStatus("error");
      setPlaybookMessage(isArabic ? "اكتب الموقف الذي تريد خطة له." : "Write the situation you want a plan for.");
      return;
    }

    setPlaybookStatus("building");
    setPlaybookMessage("");
    const child = childProfiles.find((profile) => profile.id === childProfileId);

    try {
      const response = await fetch("/api/parent/playbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          childProfileId,
          childAgeBand: child?.ageBand || "unknown",
          parentEnergy: playbookEnergy,
          situation: playbookSituation.trim(),
          goal: playbookGoal.trim(),
        }),
      });
      const data = await response.json().catch(() => ({})) as ParentPlaybookResult & { error?: string };
      if (!response.ok || !data.title) throw new Error(data.error || "PARENT_PLAYBOOK_FAILED");
      setPlaybookResult(data);
      const savedPlan = saveParentPlan({ ...data, situation: playbookSituation.trim(), goal: playbookGoal.trim() });
      setSavedParentPlans((current) => [savedPlan, ...current.filter((plan) => plan.id !== savedPlan.id)].slice(0, 20));
      setPlaybookStatus("ready");
      setPlaybookMessage(isArabic ? "جهزت الخطة وحفظتها في خطط أطفالي." : "Parent playbook is ready and saved to My kids plans.");
    } catch (error) {
      setPlaybookStatus("error");
      setPlaybookMessage(formatParentToolPlaybookError(error instanceof Error ? error.message : undefined, language));
    }
  }

  function createAnotherPlan() {
    setPlaybookSituation("");
    setPlaybookGoal("");
    setPlaybookResult(null);
    setPlaybookStatus("idle");
    setPlaybookMessage("");
  }

  const title = tool === "homework"
    ? (isArabic ? "محول الواجب" : "Homework transformer")
    : tool === "followup"
      ? (isArabic ? "متابعة الواجب" : "Homework follow-up")
      : tool === "plans"
        ? (isArabic ? "خطط أطفالي" : "My kids plans")
        : (isArabic ? "دليل ولي الأمر" : "Parent Playbook");

  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-[#050607] px-3 py-4 sm:px-6" role="dialog" aria-modal="true" aria-label={title} dir={direction}>
      <section className={`mx-auto flex w-full max-w-6xl flex-1 flex-col min-h-0 border bg-[#0E0D10] p-4 shadow-2xl shadow-black ${tool === "homework" ? "border-emerald-200/22" : "border-amber-200/22"}`}>
        <div className="mb-4 flex flex-shrink-0 items-start justify-between gap-3">
          <div>
            <p className={`ui-kicker ${tool === "homework" ? "text-emerald-100" : "text-amber-100"}`}>{title}</p>
            <h2 className="mt-2 font-arserif text-2xl text-bone/90">{tool === "homework" ? (isArabic ? "نافذة تحويل الواجب" : "Homework popup") : tool === "followup" ? (isArabic ? "متابعة أداء الأطفال" : "Children performance follow-up") : tool === "plans" ? (isArabic ? "الخطط المحفوظة" : "Saved plans") : (isArabic ? "نافذة خطة ولي الأمر" : "Parent plan popup")}</h2>
          </div>
          <button type="button" onClick={onClose} className={`ui-action border border-white/10 px-3 py-2 text-xs text-bone/65 ${tool === "homework" ? "hover:border-emerald-200/35 hover:text-emerald-100" : "hover:border-amber-200/35 hover:text-amber-100"}`}>
            {isArabic ? "إغلاق" : "Close"}
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
        {loadStatus === "error" ? <p className="mb-3 border border-red-200/18 bg-red-950/35 p-3 font-arsans text-sm text-red-100">{isArabic ? "تعذر تحميل ملفات الأطفال. افتح ملف الحساب إذا احتجت إدارة الأطفال." : "Could not load child profiles. Open the profile if you need to manage children."}</p> : null}
        {tool === "plans" ? (
          <SavedParentPlansPanel plans={savedParentPlans} language={language} onDelete={(planId) => {
            const nextPlans = savedParentPlans.filter((plan) => plan.id !== planId);
            setSavedParentPlans(nextPlans);
            writeSavedParentPlans(nextPlans);
          }} />
        ) : tool === "followup" ? (
          <ParentHomeworkFollowupPanel
            language={language}
            data={homeworkFollowup}
            status={homeworkFollowupStatus}
            range={homeworkFollowupRange}
            onRangeChange={setHomeworkFollowupRange}
            onRefresh={() => loadHomeworkFollowupForRange(homeworkFollowupRange)}
          />
        ) : tool === "homework" ? (
          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <form onSubmit={submitHomework} className="space-y-3 text-start">
              <p className="font-arsans text-sm leading-6 text-bone/70">{isArabic ? "ارفع صورة واجب أو اكتب وصفاً، ثم أرسل النشاط مباشرة إلى مساحة الطفل." : "Upload a worksheet or type a note, then send the activity directly to the child workspace."}</p>
              <label className="block text-start">
                <span className="mb-2 block font-arsans text-xs text-bone/55">{isArabic ? "إرسال إلى الطفل" : "Send to child"}</span>
                <select value={childProfileId} onChange={(event) => setChildProfileId(event.target.value)} className="w-full rounded-lg border border-emerald-200/18 bg-[#050607] px-3 py-2.5 font-arsans text-sm text-bone/90 outline-none focus:border-emerald-200/45">
                  {childProfiles.length === 0 ? <option value="">{loadStatus === "loading" ? (isArabic ? "تحميل الأطفال..." : "Loading children...") : (isArabic ? "أنشئ ملف طفل أولاً" : "Create a child profile first")}</option> : null}
                  {childProfiles.map((child) => <option key={child.id} value={child.id}>{child.nickname}</option>)}
                </select>
              </label>
              <div className="block border border-emerald-200/18 bg-[#050607] p-3">
                <span className="block font-arsans text-xs font-semibold text-emerald-100/82">{isArabic ? "صورة الواجب أو لقطة الكاميرا" : "Homework image or camera capture"}</span>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <label className="ui-action cursor-pointer border border-emerald-200/28 bg-emerald-200/10 px-3 py-2.5 text-center text-xs text-emerald-50 transition-colors hover:bg-emerald-200 hover:text-ink">
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={selectHomeworkImage} className="sr-only" />
                    {isArabic ? "رفع صورة" : "Upload image"}
                  </label>
                  <label className="ui-action cursor-pointer bg-emerald-200 px-3 py-2.5 text-center text-xs text-ink transition-colors hover:bg-bone">
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" capture="environment" onChange={selectHomeworkImage} className="sr-only" />
                    {isArabic ? "فتح الكاميرا" : "Open camera"}
                  </label>
                </div>
                {homeworkImage ? <span className="mt-2 block truncate font-arsans text-[11px] text-emerald-100/72" dir="auto">{homeworkImage.name}</span> : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-[0.8fr_1.2fr]">
                <label className="block text-start">
                  <span className="mb-2 block font-arsans text-xs text-bone/55">{isArabic ? "مرحلة الطفل" : "Child stage"}</span>
                  <select value={homeworkAgeBand} onChange={(event) => setHomeworkAgeBand(event.target.value as ParentChildProfile["ageBand"] | "unknown")} className="w-full rounded-lg border border-white/10 bg-[#050607] px-3 py-2.5 font-arsans text-sm text-bone/90 outline-none focus:border-emerald-200/45">
                    <option value="unknown">{isArabic ? "تلقائي" : "Auto"}</option>
                    <option value="under_8">{formatParentToolAgeBand("under_8", language)}</option>
                    <option value="8_to_10">{formatParentToolAgeBand("8_to_10", language)}</option>
                    <option value="11_to_12">{formatParentToolAgeBand("11_to_12", language)}</option>
                    <option value="13_plus">{formatParentToolAgeBand("13_plus", language)}</option>
                  </select>
                </label>
                <label className="block text-start">
                  <span className="mb-2 block font-arsans text-xs text-bone/55">{isArabic ? "ملاحظة اختيارية" : "Optional note"}</span>
                  <input value={homeworkHint} onChange={(event) => setHomeworkHint(event.target.value)} placeholder={isArabic ? "مثلاً: جمع حتى ٢٠ أو حروف A/B/C" : "Example: addition to 20 or A/B/C letters"} className="w-full rounded-lg border border-white/10 bg-[#050607] px-3 py-2.5 font-arsans text-sm text-bone/90 outline-none placeholder:text-bone/36 focus:border-emerald-200/45" />
                </label>
              </div>
              <button type="submit" disabled={homeworkStatus === "analyzing"} className="ui-action w-full bg-emerald-200 px-4 py-3 text-ink transition-colors hover:bg-bone disabled:cursor-wait disabled:opacity-60">
                {homeworkStatus === "analyzing" ? (isArabic ? "يقرأ الواجب..." : "Reading homework...") : isArabic ? "اصنع وأرسل للطفل" : "Create and send to child"}
              </button>
              {homeworkMessage ? <p className={`font-arsans text-xs leading-5 ${homeworkStatus === "error" ? "text-red-100" : "text-emerald-100/78"}`}>{homeworkMessage}</p> : null}
            </form>
            <ParentHomeworkResultPanel result={homeworkResult} language={language} imagePreviewUrl={homeworkImagePreviewUrl} imageName={homeworkImage?.name} />
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <form onSubmit={submitPlaybook} className="space-y-3 text-start">
              <p className="font-arsans text-sm leading-6 text-bone/70">{isArabic ? "اكتب موقفاً مثل رفض الواجب أو الشاشات لتحصل على جملة وحد واضح وخطوة اتصال." : "Write a moment like homework refusal or screens to get phrases, a boundary, and a connection move."}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-start">
                  <span className="mb-2 block font-arsans text-xs text-bone/55">{isArabic ? "الطفل" : "Child"}</span>
                  <select value={childProfileId} onChange={(event) => setChildProfileId(event.target.value)} className="w-full rounded-lg border border-amber-200/18 bg-[#050607] px-3 py-2.5 font-arsans text-sm text-bone/90 outline-none focus:border-amber-200/45">
                    <option value="">{isArabic ? "بدون طفل محدد" : "No specific child"}</option>
                    {childProfiles.map((child) => <option key={child.id} value={child.id}>{child.nickname}</option>)}
                  </select>
                </label>
                <label className="block text-start">
                  <span className="mb-2 block font-arsans text-xs text-bone/55">{isArabic ? "طاقتك الآن" : "Your energy now"}</span>
                  <select value={playbookEnergy} onChange={(event) => setPlaybookEnergy(event.target.value as "calm" | "tired" | "stressed" | "angry")} className="w-full rounded-lg border border-amber-200/18 bg-[#050607] px-3 py-2.5 font-arsans text-sm text-bone/90 outline-none focus:border-amber-200/45">
                    <option value="calm">{isArabic ? "هادئ" : "Calm"}</option>
                    <option value="tired">{isArabic ? "متعب" : "Tired"}</option>
                    <option value="stressed">{isArabic ? "مضغوط" : "Stressed"}</option>
                    <option value="angry">{isArabic ? "غاضب" : "Angry"}</option>
                  </select>
                </label>
              </div>
              <label className="block text-start">
                <span className="mb-2 block font-arsans text-xs text-bone/55">{isArabic ? "ما الموقف؟" : "What happened?"}</span>
                <textarea value={playbookSituation} onChange={(event) => setPlaybookSituation(event.target.value)} rows={4} placeholder={isArabic ? "مثلاً: ابني يرفض الواجب ويبكي كل مرة أطلب منه يبدأ." : "Example: My child refuses homework and cries every time I ask them to start."} className="w-full resize-none rounded-lg border border-white/10 bg-[#050607] px-3 py-2.5 font-arsans text-sm leading-6 text-bone/90 outline-none placeholder:text-bone/36 focus:border-amber-200/45" />
              </label>
              <label className="block text-start">
                <span className="mb-2 block font-arsans text-xs text-bone/55">{isArabic ? "هدفك الاختياري" : "Optional goal"}</span>
                <input value={playbookGoal} onChange={(event) => setPlaybookGoal(event.target.value)} placeholder={isArabic ? "أريد أن أساعده يبدأ بدون صراخ" : "I want to help them start without shouting"} className="w-full rounded-lg border border-white/10 bg-[#050607] px-3 py-2.5 font-arsans text-sm text-bone/90 outline-none placeholder:text-bone/36 focus:border-amber-200/45" />
              </label>
              <button type="submit" disabled={playbookStatus === "building"} className="ui-action w-full bg-amber-200 px-4 py-3 text-ink transition-colors hover:bg-bone disabled:cursor-wait disabled:opacity-60">
                {playbookStatus === "building" ? (isArabic ? "يبني الخطة..." : "Building playbook...") : isArabic ? "اصنع خطة ولي الأمر" : "Create parent playbook"}
              </button>
              {playbookMessage ? <p className={`font-arsans text-xs leading-5 ${playbookStatus === "error" ? "text-red-100" : "text-amber-100/78"}`}>{playbookMessage}</p> : null}
            </form>
            <div className="flex flex-col gap-2">
              <div className="max-h-[45vh] overflow-y-auto lg:max-h-none [scrollbar-color:rgba(251,191,36,0.4)_transparent]">
                <ParentPlaybookResultPanel result={playbookResult} language={language} />
              </div>
              {playbookResult ? (
                <button type="button" onClick={createAnotherPlan} className="ui-action border border-amber-200/28 bg-amber-200/10 px-4 py-3 font-arsans text-xs text-amber-50 hover:bg-amber-200 hover:text-ink">
                  {isArabic ? "اصنع خطة أخرى" : "Create another plan"}
                </button>
              ) : null}
            </div>
          </div>
        )}
        </div>
      </section>
    </div>
  );
}

function ParentHomeworkResultPanel({ result, language, imagePreviewUrl, imageName }: { result: HomeworkResult | null; language: AppLanguage; imagePreviewUrl?: string; imageName?: string }) {
  const isArabic = language === "ar";
  return (
    <div className="border border-white/10 bg-[#050607] p-3 text-start">
      {result ? (
        <div>
          {imagePreviewUrl ? (
            <figure className="mb-3 overflow-hidden border border-emerald-200/18 bg-[#050607]">
              <img src={imagePreviewUrl} alt={isArabic ? "صورة الواجب الأصلية" : "Original homework image"} className="max-h-72 w-full object-contain" />
              <figcaption className="border-t border-emerald-200/12 px-3 py-2 font-arsans text-[11px] text-emerald-100/68" dir="auto">
                {isArabic ? "مرجع الواجب الأصلي" : "Original homework reference"}{imageName ? ` · ${imageName}` : ""}
              </figcaption>
            </figure>
          ) : null}
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-arsans text-xs font-semibold uppercase tracking-[0.08em] text-emerald-100/70">{formatParentToolHomeworkSubject(result.subject, language)}</p>
              <h4 className="mt-1 font-arsans text-lg font-semibold text-bone/90">{result.detectedTask}</h4>
            </div>
            <span className="rounded-full border border-emerald-200/25 px-2.5 py-1 font-arsans text-[10px] text-emerald-100/72">{isArabic ? "جاهز للطفل" : "child-ready"}</span>
          </div>
          <p className="mt-2 font-arsans text-sm leading-6 text-bone/58">{result.parentSummary}</p>
          <p className="mt-3 rounded-xl border border-emerald-200/16 bg-emerald-200/[0.055] px-3 py-2 font-arsans text-sm font-semibold text-emerald-50/88">{result.childIntro}</p>
          <div className="mt-3 max-h-[28rem] space-y-2 overflow-y-auto pr-1 [scrollbar-color:rgba(110,231,183,0.4)_transparent]">
            {result.activities.map((activity, index) => (
              <article key={`${activity.title}-${index}`} className="border border-white/10 bg-[#0E0D10] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-arsans text-sm font-semibold text-bone/88">{activity.title}</p>
                  <span className="rounded-full border border-white/10 px-2 py-0.5 font-arsans text-[10px] text-bone/45">{formatParentToolHomeworkActivityType(activity.type, language)}</span>
                </div>
                <p className="mt-2 font-arsans text-xs leading-5 text-bone/70">{activity.prompt}</p>
                {activity.choices && activity.choices.length > 0 ? <div className="mt-2 flex flex-wrap gap-1.5">{activity.choices.map((choice) => <span key={choice} className="rounded-full border border-emerald-200/16 bg-emerald-200/[0.045] px-2 py-1 font-arsans text-[11px] text-emerald-100/72">{choice}</span>)}</div> : null}
                <p className="mt-2 font-arsans text-[11px] leading-5 text-amber-100/72"><span className="font-semibold">{isArabic ? "تلميح: " : "Hint: "}</span>{activity.hint}</p>
                <p className="mt-1 font-arsans text-[11px] leading-5 text-cyan-100/66"><span className="font-semibold">{isArabic ? "إجابة ولي الأمر: " : "Parent answer: "}</span>{activity.answer}</p>
              </article>
            ))}
          </div>
          <p className="mt-3 font-arsans text-[11px] leading-5 text-bone/38">{result.safetyNote}</p>
        </div>
      ) : (
        <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-emerald-200/18 bg-emerald-200/[0.025] p-5 text-center">
          <div>
            <p className="font-arserif text-2xl text-emerald-100/86">{isArabic ? "من ورقة واجب إلى لعبة" : "From worksheet to game"}</p>
            <p className="mt-2 font-arsans text-sm leading-6 text-bone/48">{isArabic ? "ستظهر هنا أسئلة قصيرة وتلميحات وإجابات ولي الأمر." : "Short questions, hints, and parent answers will appear here."}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ParentHomeworkFollowupPanel({
  language,
  data,
  status,
  range,
  onRangeChange,
  onRefresh,
}: {
  language: AppLanguage;
  data: ParentHomeworkFollowupResponse | null;
  status: "idle" | "loading" | "error";
  range: ParentHomeworkFollowupRange;
  onRangeChange: (range: ParentHomeworkFollowupRange) => void;
  onRefresh: () => void;
}) {
  const isArabic = language === "ar";
  const rangeOptions: Array<{ id: ParentHomeworkFollowupRange; ar: string; en: string }> = [
    { id: "today", ar: "اليوم", en: "Today" },
    { id: "7d", ar: "7 أيام", en: "7 days" },
    { id: "30d", ar: "30 يوم", en: "30 days" },
    { id: "all", ar: "الكل", en: "All" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-2">
        {rangeOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onRangeChange(option.id)}
            className={`ui-action rounded-lg px-3 py-1.5 font-arsans text-xs transition-colors ${range === option.id ? "bg-sky-100 text-ink" : "border border-sky-200/25 bg-sky-200/10 text-sky-100 hover:bg-sky-200 hover:text-ink"}`}
          >
            {isArabic ? option.ar : option.en}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-200/20 bg-sky-200/[0.06] p-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-arsans text-xs text-sky-100/82 sm:grid-cols-4">
          <p>{isArabic ? "كل الواجبات" : "All homework"}: <span className="font-semibold text-sky-50">{data?.totals.totalAssignments ?? 0}</span></p>
          <p>{isArabic ? "مكتمل" : "Completed"}: <span className="font-semibold text-emerald-100">{data?.totals.completedAssignments ?? 0}</span></p>
          <p>{isArabic ? "غير مكتمل" : "Pending"}: <span className="font-semibold text-amber-100">{data?.totals.pendingAssignments ?? 0}</span></p>
          <p>{isArabic ? "النقاط" : "Points"}: <span className="font-semibold text-cyan-100">{data?.totals.totalPoints ?? 0}</span></p>
        </div>
        <button type="button" onClick={onRefresh} className="ui-action rounded-xl border border-sky-200/28 bg-sky-200/12 px-3 py-2 font-arsans text-xs text-sky-100 hover:bg-sky-200 hover:text-ink" disabled={status === "loading"}>
          {status === "loading" ? (isArabic ? "تحديث..." : "Refreshing...") : (isArabic ? "تحديث" : "Refresh")}
        </button>
      </div>

      {status === "error" ? (
        <p className="rounded-xl border border-red-200/28 bg-red-950/40 p-3 font-arsans text-sm text-red-100">
          {isArabic ? "تعذر تحميل متابعة الواجب الآن." : "Could not load homework follow-up right now."}
        </p>
      ) : null}

      {status === "loading" && !data ? (
        <p className="rounded-xl border border-white/10 bg-[#050607] p-3 font-arsans text-sm text-bone/72">{isArabic ? "جار تحميل الأداء..." : "Loading performance..."}</p>
      ) : null}

      {data && data.children.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/16 bg-[#050607] p-3 font-arsans text-sm text-bone/70">{isArabic ? "لا توجد ملفات أطفال بعد." : "No child profiles yet."}</p>
      ) : null}

      {data?.children.map((child) => (
        <section key={child.childProfileId} className="rounded-2xl border border-white/10 bg-[#050607] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-arsans text-sm font-semibold text-bone/92">{child.childNickname}</h3>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="rounded-full border border-amber-100/28 bg-amber-100/12 px-2 py-0.5 text-amber-100">{isArabic ? "غير مكتمل" : "Pending"}: {child.pendingAssignments}</span>
              <span className="rounded-full border border-emerald-100/28 bg-emerald-100/12 px-2 py-0.5 text-emerald-100">{isArabic ? "مكتمل" : "Completed"}: {child.completedAssignments}</span>
              <span className="rounded-full border border-cyan-100/28 bg-cyan-100/12 px-2 py-0.5 text-cyan-100">{isArabic ? "الإنجاز" : "Rate"}: {child.completionRate}%</span>
            </div>
          </div>

          {child.assignments.length === 0 ? (
            <p className="mt-2 rounded-xl border border-dashed border-white/14 bg-black/25 px-3 py-2 font-arsans text-xs text-bone/66">{isArabic ? "لم يتم إرسال واجبات لهذا الطفل بعد." : "No homework assigned to this child yet."}</p>
          ) : (
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1 [scrollbar-color:rgba(125,211,252,0.42)_transparent]">
              {child.assignments.map((assignment) => (
                <article key={assignment.id} className="rounded-xl border border-white/10 bg-[#0E0D10] p-2.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-arsans text-xs font-semibold text-bone/88">{assignment.detectedTask}</p>
                      <p className="mt-1 font-arsans text-[11px] text-bone/50">{formatParentToolHomeworkSubject(assignment.subject, language)} • {formatFollowupDateLabel(assignment.assignedAt, language)}</p>
                    </div>
                    {assignment.missionCompleted ? (
                      <span className="rounded-full border border-emerald-100/28 bg-emerald-100/14 px-2 py-0.5 font-arsans text-[10px] text-emerald-100">{isArabic ? "مكتمل" : "Completed"}{assignment.missionPoints > 0 ? ` +${assignment.missionPoints}` : ""}</span>
                    ) : (
                      <span className="rounded-full border border-amber-100/26 bg-amber-100/12 px-2 py-0.5 font-arsans text-[10px] text-amber-100">{isArabic ? "قيد الانتظار" : "Pending"}</span>
                    )}
                  </div>
                  {assignment.missionCompletedAt ? (
                    <p className="mt-1 font-arsans text-[10px] text-emerald-100/74">{isArabic ? "أُنجز في" : "Completed at"}: {formatFollowupDateLabel(assignment.missionCompletedAt, language)}</p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

function ParentPlaybookResultPanel({ result, language }: { result: ParentPlaybookResult | null; language: AppLanguage }) {
  const isArabic = language === "ar";
  return (
    <div className="border border-white/10 bg-[#050607] p-3 text-start">
      {result ? (
        <div>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-arsans text-xs font-semibold uppercase tracking-[0.08em] text-amber-100/70">{result.childNickname || (isArabic ? "خطة عامة" : "general plan")}</p>
              <h4 className="mt-1 font-arsans text-lg font-semibold text-bone/90">{result.title}</h4>
            </div>
            <span className="rounded-full border border-amber-200/25 px-2.5 py-1 font-arsans text-[10px] text-amber-100/72">{isArabic ? "جاهزة الآن" : "ready now"}</span>
          </div>
          <p className="mt-2 font-arsans text-sm leading-6 text-bone/62">{result.quickRead}</p>
          <p className="mt-3 rounded-xl border border-amber-200/16 bg-amber-200/[0.055] px-3 py-2 font-arsans text-sm leading-6 text-amber-50/88">{result.childLens}</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <div className="border border-emerald-200/16 bg-emerald-200/[0.04] p-3">
              <p className="font-arsans text-xs font-semibold text-emerald-100/78">{isArabic ? "قل هذا" : "Say this"}</p>
              <ul className="mt-2 space-y-1.5">{result.sayThis.map((item) => <li key={item} className="font-arsans text-xs leading-5 text-bone/66">{item}</li>)}</ul>
            </div>
            <div className="border border-red-200/14 bg-red-200/[0.035] p-3">
              <p className="font-arsans text-xs font-semibold text-red-100/72">{isArabic ? "تجنب هذا" : "Avoid this"}</p>
              <ul className="mt-2 space-y-1.5">{result.avoidThis.map((item) => <li key={item} className="font-arsans text-xs leading-5 text-bone/58">{item}</li>)}</ul>
            </div>
          </div>
          <div className="mt-2 border border-white/10 bg-[#0E0D10] p-3">
            <p className="font-arsans text-xs font-semibold text-bone/68">{isArabic ? "إعادة ضبط من ٤ خطوات" : "4-step reset"}</p>
            <div className="mt-2 grid gap-1.5">{result.resetSteps.map((item, index) => <span key={item} className="font-arsans text-xs leading-5 text-bone/62"><span className="text-amber-100/72">{index + 1}. </span>{item}</span>)}</div>
          </div>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <p className="border border-cyan-200/14 bg-cyan-200/[0.035] p-3 font-arsans text-xs leading-5 text-cyan-50/72"><span className="font-semibold">{isArabic ? "لعبة اتصال: " : "Play bridge: "}</span>{result.playBridge}</p>
            <p className="border border-gold/18 bg-gold/[0.045] p-3 font-arsans text-xs leading-5 text-bone/66"><span className="font-semibold text-gold/76">{isArabic ? "الحد: " : "Boundary: "}</span>{result.boundaryScript}</p>
          </div>
          <p className="mt-2 font-arsans text-xs leading-5 text-bone/56"><span className="font-semibold text-amber-100/74">{isArabic ? "إصلاح: " : "Repair: "}</span>{result.repairLine}</p>
          <p className="mt-1 font-arsans text-xs leading-5 text-bone/46"><span className="font-semibold">{isArabic ? "متابعة: " : "Follow-up: "}</span>{result.followUp}</p>
          <p className="mt-3 font-arsans text-[11px] leading-5 text-bone/34">{result.safetyNote}</p>
        </div>
      ) : (
        <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-amber-200/18 bg-amber-200/[0.025] p-5 text-center">
          <div>
            <p className="font-arserif text-2xl text-amber-100/86">{isArabic ? "خطة جاهزة قبل رد الفعل" : "A plan before the reaction"}</p>
            <p className="mt-2 font-arsans text-sm leading-6 text-bone/48">{isArabic ? "ستظهر هنا جمل جاهزة، حدود، وخطوة اتصال صغيرة." : "Ready phrases, boundaries, and one connection move will appear here."}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function SavedParentPlansPanel({ plans, language, onDelete }: { plans: SavedParentPlan[]; language: AppLanguage; onDelete: (planId: string) => void }) {
  const isArabic = language === "ar";

  if (!plans.length) {
    return (
      <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-cyan-200/20 bg-[#050607] p-5 text-center">
        <div>
          <p className="font-arserif text-2xl text-cyan-100/86">{isArabic ? "لا توجد خطط محفوظة بعد" : "No saved plans yet"}</p>
          <p className="mt-2 font-arsans text-sm leading-6 text-bone/56">{isArabic ? "افتح دليل ولي الأمر، اصنع خطة، وستظهر هنا." : "Open Parent Playbook, create a plan, and it will appear here."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {plans.map((plan) => (
        <article key={plan.id} className="border border-cyan-200/16 bg-[#050607] p-3 text-start">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-arsans text-[11px] text-cyan-100/62">{new Date(plan.createdAt).toLocaleString(isArabic ? "ar" : "en", { dateStyle: "medium", timeStyle: "short" })}</p>
              <h3 className="mt-1 font-arsans text-base font-bold text-bone/90">{plan.title}</h3>
            </div>
            <button type="button" onClick={() => onDelete(plan.id)} className="ui-action border border-red-200/18 px-2.5 py-1.5 font-arsans text-[11px] text-red-100/76 hover:bg-red-200 hover:text-ink">
              {isArabic ? "حذف" : "Delete"}
            </button>
          </div>
          {plan.situation ? <p className="mt-2 rounded-xl border border-white/10 bg-[#0E0D10] px-3 py-2 font-arsans text-xs leading-5 text-bone/62">{plan.situation}</p> : null}
          <p className="mt-2 font-arsans text-sm leading-6 text-bone/68">{plan.quickRead}</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <div className="border border-emerald-200/14 bg-emerald-200/[0.045] p-3">
              <p className="font-arsans text-xs font-semibold text-emerald-100/78">{isArabic ? "قل هذا" : "Say this"}</p>
              <ul className="mt-2 space-y-1.5">{plan.sayThis.slice(0, 3).map((item) => <li key={item} className="font-arsans text-xs leading-5 text-bone/66">{item}</li>)}</ul>
            </div>
            <div className="border border-gold/18 bg-gold/[0.045] p-3">
              <p className="font-arsans text-xs font-semibold text-gold/78">{isArabic ? "الحد" : "Boundary"}</p>
              <p className="mt-2 font-arsans text-xs leading-5 text-bone/66">{plan.boundaryScript}</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function readSavedParentPlans(): SavedParentPlan[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(savedParentPlansStorageKey) || "[]") as SavedParentPlan[];
    return Array.isArray(parsed) ? parsed.filter((plan) => plan && typeof plan.id === "string" && typeof plan.title === "string").slice(0, 20) : [];
  } catch {
    localStorage.removeItem(savedParentPlansStorageKey);
    return [];
  }
}

function writeSavedParentPlans(plans: SavedParentPlan[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(savedParentPlansStorageKey, JSON.stringify(plans.slice(0, 20)));
}

function saveParentPlan(plan: ParentPlaybookResult & { situation: string; goal: string }): SavedParentPlan {
  const savedPlan: SavedParentPlan = {
    ...plan,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const nextPlans = [savedPlan, ...readSavedParentPlans()].slice(0, 20);
  writeSavedParentPlans(nextPlans);
  return savedPlan;
}

function formatParentToolAgeBand(ageBand: ParentChildProfile["ageBand"], language: AppLanguage) {
  const labels: Record<ParentChildProfile["ageBand"], { ar: string; en: string }> = {
    under_8: { ar: "أقل من ٨", en: "Under 8" },
    "8_to_10": { ar: "٨ إلى ١٠", en: "8 to 10" },
    "11_to_12": { ar: "١١ إلى ١٢", en: "11 to 12" },
    "13_plus": { ar: "١٣+", en: "13+" },
  };
  return labels[ageBand][language];
}

function formatParentToolHomeworkSubject(value: HomeworkResult["subject"], language: AppLanguage) {
  const labels: Record<HomeworkResult["subject"], { ar: string; en: string }> = {
    math: { ar: "رياضيات", en: "Math" },
    english: { ar: "إنجليزي", en: "English" },
    arabic: { ar: "عربي", en: "Arabic" },
    kg: { ar: "KG", en: "KG" },
    mixed: { ar: "مختلط", en: "Mixed" },
  };
  return labels[value]?.[language] || value;
}

function formatParentToolHomeworkActivityType(value: HomeworkActivity["type"], language: AppLanguage) {
  const labels: Record<HomeworkActivity["type"], { ar: string; en: string }> = {
    quiz: { ar: "سؤال", en: "Quiz" },
    trace: { ar: "تتبّع", en: "Trace" },
    match: { ar: "توصيل", en: "Match" },
    story: { ar: "قصة", en: "Story" },
    challenge: { ar: "تحدي", en: "Challenge" },
  };
  return labels[value]?.[language] || value;
}

function formatFollowupDateLabel(value: string, language: AppLanguage) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(language === "ar" ? "ar-EG" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatParentToolHomeworkError(error: string | undefined, language: AppLanguage) {
  if (error === "UNSUPPORTED_IMAGE_TYPE") return language === "ar" ? "نوع الصورة غير مدعوم. استخدم PNG أو JPG أو WEBP." : "Unsupported image type. Use PNG, JPG, or WEBP.";
  if (error === "IMAGE_TOO_LARGE") return language === "ar" ? "الصورة كبيرة جداً. جرّب صورة أقل من ٨ ميجابايت." : "The image is too large. Try an image under 8 MB.";
  if (error === "CHILD_PROFILE_REQUIRED") return language === "ar" ? "اختر الطفل الذي سيستلم الواجب." : "Choose the child who should receive this homework.";
  if (error === "CHILD_PROFILE_NOT_FOUND") return language === "ar" ? "لم نجد ملف الطفل المختار. حدّث الصفحة وحاول مرة أخرى." : "Could not find the selected child profile. Refresh and try again.";
  if (error === "PARENT_WORKSPACE_REQUIRED") return language === "ar" ? "هذه الميزة لولي الأمر فقط." : "This feature is parent-only.";
  return language === "ar" ? "لم نتمكن من قراءة الواجب الآن. جرّب صورة أوضح أو اكتب وصفاً قصيراً." : "Could not read the homework right now. Try a clearer image or type a short description.";
}

function formatParentToolPlaybookError(error: string | undefined, language: AppLanguage) {
  if (error === "SITUATION_REQUIRED") return language === "ar" ? "اكتب موقفاً واضحاً أولاً." : "Write a clear situation first.";
  if (error === "CHILD_PROFILE_NOT_FOUND") return language === "ar" ? "لم نجد ملف الطفل المختار. حدّث الصفحة وحاول مرة أخرى." : "Could not find the selected child profile. Refresh and try again.";
  if (error === "PARENT_WORKSPACE_REQUIRED") return language === "ar" ? "هذه الميزة لولي الأمر فقط." : "This feature is parent-only.";
  return language === "ar" ? "لم نتمكن من بناء الخطة الآن. جرّب وصفاً أقصر أو حاول مرة أخرى." : "Could not build the playbook right now. Try a shorter description or try again.";
}

function HeaderActionIcon({ action }: { action: HomeHeaderAction }) {
  if (action === "start") return <StartHeaderIcon />;
  if (action === "avatars") return <AvatarsHeaderIcon />;
  if (action === "stories") return <StoryHeaderIcon />;
  if (action === "homework") return <HomeworkHeaderIcon />;
  return <NewChatIcon />;
}

function StartHeaderIcon() {
  return (
    <svg className="relative h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2.2v11.6M2.2 8h11.6" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" />
      <path d="M4.2 4.2 11.8 11.8M11.8 4.2 4.2 11.8" stroke="currentColor" strokeWidth="1.05" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}

function AvatarsHeaderIcon() {
  return (
    <svg className="relative h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M5.9 7.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4ZM10.9 6.8a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2.9 12.8c.4-2 1.6-3.1 3-3.1s2.6 1.1 3 3.1M8.6 11.2c.45-.7 1.2-1.1 2.2-1.1 1.25 0 2.2.85 2.55 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function NewChatIcon() {
  return (
    <svg className="relative h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3.5 4.2C3.5 3.54 4.04 3 4.7 3h6.6c.66 0 1.2.54 1.2 1.2v4.45c0 .66-.54 1.2-1.2 1.2H7.1L4.35 12v-2.15h.35c-.66 0-1.2-.54-1.2-1.2V4.2Z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
      <path d="M8 5.2v2.8M6.6 6.6h2.8" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
    </svg>
  );
}

function StoryHeaderIcon() {
  return (
    <svg className="relative h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3.25 3.4A1.4 1.4 0 0 1 4.65 2h7.1v9.4h-7.1a1.4 1.4 0 0 0-1.4 1.4V3.4Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M3.25 12.8a1.4 1.4 0 0 1 1.4-1.4h7.1M5.7 5h3.7M5.7 7h2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function HomeworkHeaderIcon() {
  return (
    <svg className="relative h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3.2 3.5c0-.66.54-1.2 1.2-1.2h6.2l2.2 2.2v8.1c0 .66-.54 1.2-1.2 1.2H4.4c-.66 0-1.2-.54-1.2-1.2V3.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M10.6 2.3v2.2h2.2M5.4 7h5.2M5.4 9.4h5.2M5.4 11.8h3.1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function ActivityMenuIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3.2 4.2h9.6M3.2 8h9.6M3.2 11.8h5.7" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      <path d="m10.7 10.2 1.45 1.45 1.45-1.45" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChildrenHeaderIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M5.9 7.2a2.15 2.15 0 1 0 0-4.3 2.15 2.15 0 0 0 0 4.3ZM10.8 6.7a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4Z" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2.8 12.7c.42-1.95 1.65-3.05 3.1-3.05s2.68 1.1 3.1 3.05M8.9 10.9c.45-.52 1.08-.8 1.9-.8 1.18 0 2.08.78 2.45 2.25" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function TierBadge({ tier, language, expanded = false }: { tier: AccountTier; language: AppLanguage; expanded?: boolean }) {
  const isPlus = tier === "PLUS" || tier === "BUSINESS";
  const label = isPlus ? (language === "ar" ? "بلس" : "Plus") : language === "ar" ? "مجاني" : "Free";
  const title = isPlus ? (language === "ar" ? "حساب بلس" : "Plus account") : language === "ar" ? "حساب مجاني" : "Free account";

  return (
    <span title={title} className={`inline-flex items-center gap-1 rounded-full border font-arsans text-[10px] leading-none ${expanded ? "px-2.5 py-1.5" : "px-1.5 py-1"} ${isPlus ? "border-gold/45 bg-gold/18 text-gold" : "border-white/12 bg-white/[0.045] text-bone/58"}`}>
      {isPlus ? <PlusTierIcon /> : <FreeTierIcon />}
      <span className={expanded ? "" : "hidden sm:inline"}>{label}</span>
    </span>
  );
}

function PlusTierIcon() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="m8 1.9 1.72 3.48 3.84.56-2.78 2.7.66 3.82L8 10.66l-3.44 1.8.66-3.82-2.78-2.7 3.84-.56L8 1.9Z" fill="currentColor" />
    </svg>
  );
}

function FreeTierIcon() {
  return <span className="h-2 w-2 rounded-full border border-current" aria-hidden="true" />;
}

function PlusUnlockList({ tier, language }: { tier: AccountTier; language: AppLanguage }) {
  const isPlus = tier === "PLUS" || tier === "BUSINESS";
  const items = language === "ar"
    ? isPlus
      ? ["كل الرفقاء مفتوحون", "جلسات محفوظة", "لوحات مشاهد وبطاقات إثبات"]
      : ["رقّ إلى بلس لكل الرفقاء", "حفظ أوسع للجلسات", "رحلة أعمق بعد كل رد"]
    : isPlus
      ? ["All companions unlocked", "Saved sessions", "Storyboards and proof cards"]
      : ["Upgrade for all companions", "More saved sessions", "Deeper journey after replies"];

  return (
    <div className={`mt-3 rounded-xl border px-3 py-2 ${isPlus ? "border-gold/25 bg-gold/[0.07]" : "border-white/10 bg-white/[0.025]"}`}>
      <p className="font-arsans text-[11px] font-semibold text-bone/70">{language === "ar" ? (isPlus ? "مفتوح الآن" : "يفتح مع بلس") : isPlus ? "Unlocked now" : "Unlock with Plus"}</p>
      <div className="mt-2 grid gap-1.5">
        {items.map((item) => (
          <p key={item} className="font-arsans text-[11px] leading-4 text-bone/48">{item}</p>
        ))}
      </div>
    </div>
  );
}

function getAccountTier(value: unknown): AccountTier {
  return value === "PLUS" || value === "BUSINESS" ? value : "FREE";
}
