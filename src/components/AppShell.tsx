"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SessionProvider, signOut, useSession } from "next-auth/react";
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { NotificationCenter } from "./NotificationCenter";
import { PwaUpdateManager } from "./PwaUpdateManager";

type AppLanguage = "ar" | "en";
type HomeHeaderAction = "start" | "avatars" | "newChat";
type AccountTier = "FREE" | "PLUS" | "BUSINESS";

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
  const direction = language === "ar" ? "rtl" : "ltr";
  const shellFontClass = language === "ar" ? "font-arsans text-right" : "font-ensans text-left";

  useEffect(() => {
    const storedLanguage = localStorage.getItem(appLanguageStorageKey);
    if (storedLanguage === "ar" || storedLanguage === "en") {
      setLanguage(storedLanguage);
    }
    setLocaleLoaded(true);
  }, []);

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
        <div dir={direction} className={`min-h-screen bg-ink text-bone/90 ${shellFontClass}`} data-language={language}>
          <GlobalHeader />
          <NotificationCenter />
          <div className="transition-[padding,margin] duration-300 ease-out">{children}</div>
          <GlobalFooter />
          <PwaUpdateManager />
        </div>
      </AppLocaleContext.Provider>
    </SessionProvider>
  );
}

function GlobalFooter() {
  const { language, direction } = useAppLocale();
  const isArabic = language === "ar";
  const links = [
    { href: "/pricing", label: isArabic ? "الأسعار" : "Pricing" },
    { href: "/terms", label: isArabic ? "الشروط" : "Terms" },
    { href: "/privacy", label: isArabic ? "الخصوصية" : "Privacy" },
    { href: "/refund", label: isArabic ? "الاسترداد" : "Refunds" },
  ];

  return (
    <footer className="border-t border-white/10 bg-[#0E0D10]/80 px-5 py-8" dir={direction}>
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
  const { data: session, status } = useSession();
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountProfile, setAccountProfile] = useState<AccountProfile | null>(null);
  const [activeAdminTab, setActiveAdminTab] = useState("dashboard");
  const isArabic = language === "ar";
  const nextLanguageLabel = isArabic ? "EN" : "AR";
  const authenticatedImage = accountProfile?.image || session?.user?.image;
  const authenticatedName = accountProfile?.nickname || accountProfile?.name || session?.user?.name || accountProfile?.email || session?.user?.email || (isArabic ? "عضو فضفضة" : "FadFada member");
  const authenticatedEmail = accountProfile?.email || session?.user?.email || "";
  const sessionUserRole = session?.user && "role" in session.user ? session.user.role : "USER";
  const accountTier = getAccountTier(accountProfile?.activeTier ?? (session?.user && "activeTier" in session.user ? session.user.activeTier : undefined));
  const isAdminArea = pathname?.startsWith("/admin") ?? false;
  const headerActions: Array<{ action: HomeHeaderAction; label: string }> = [
    { action: "start", label: isArabic ? "ابدأ" : "Start" },
    { action: "avatars", label: isArabic ? "الرفاق" : "Avatars" },
    { action: "newChat", label: isArabic ? "محادثة جديدة" : "New chat" },
  ];
  const adminTabs = [
    { id: "dashboard", ar: "القياس", en: "Dashboard" },
    { id: "configuration", ar: "الإعدادات", en: "Config" },
    { id: "users", ar: "الهدايا", en: "Gifts" },
    { id: "personas", ar: "الرفاق", en: "Personas" },
    { id: "offers", ar: "الخصومات", en: "Offers" },
    { id: "sessions", ar: "الجلسات", en: "Sessions" },
  ];

  function runHeaderAction(action: HomeHeaderAction) {
    setAccountOpen(false);
    if (typeof window === "undefined") return;

    if (window.location.pathname !== "/") {
      window.location.assign(`/?fadfadaAction=${action}`);
      return;
    }

    window.dispatchEvent(new CustomEvent(fadfadaHomeActionEventName, { detail: { action } }));
  }

  useEffect(() => {
    if (status !== "authenticated") {
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
  }, [status]);

  useEffect(() => {
    if (!isAdminArea || typeof window === "undefined") {
      setActiveAdminTab("dashboard");
      return;
    }

    function syncActiveAdminTab() {
      const tab = new URLSearchParams(window.location.search).get("tab");
      setActiveAdminTab(tab === "configuration" || tab === "users" || tab === "personas" || tab === "offers" || tab === "sessions" ? tab : "dashboard");
    }

    syncActiveAdminTab();
    window.addEventListener("popstate", syncActiveAdminTab);
    return () => window.removeEventListener("popstate", syncActiveAdminTab);
  }, [isAdminArea, pathname]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#0E0D10]/78 text-bone/90 shadow-2xl backdrop-blur-xl" dir={direction}>
      <div className={`mx-auto flex h-16 items-center justify-between gap-2 px-3 sm:px-4 ${isAdminArea ? "max-w-6xl" : "max-w-3xl"}`}>
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={toggleLanguage}
          className="shrink-0 rounded-full border border-white/10 bg-slate-950/70 px-3 py-2 font-arsans text-sm text-bone/90 shadow-xl backdrop-blur-xl transition-colors hover:border-gold/50 hover:text-gold"
          aria-label={isArabic ? "تغيير اللغة إلى الإنجليزية" : "Switch language to Arabic"}
        >
          {nextLanguageLabel}
        </button>
        {isAdminArea ? (
          <nav className="flex min-w-0 items-center gap-1 overflow-x-auto rounded-full border border-gold/20 bg-gold/[0.06] p-1 shadow-xl backdrop-blur-xl [scrollbar-width:none]" aria-label={isArabic ? "تبويبات الإدارة" : "Admin tabs"}>
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
          <nav className="flex min-w-0 items-center gap-1 overflow-x-auto rounded-full border border-white/10 bg-white/[0.035] p-1 shadow-xl backdrop-blur-xl" aria-label={isArabic ? "اختصارات فضفضة الرئيسية" : "FadFada quick actions"}>
            {headerActions.map((item) => (
              <button
                key={item.action}
                type="button"
                onClick={() => runHeaderAction(item.action)}
                className="group relative inline-flex shrink-0 items-center gap-1.5 overflow-hidden rounded-full px-3 py-1.5 font-arsans text-[11px] text-bone/72 transition-all duration-200 hover:-translate-y-0.5 hover:text-ink sm:px-3.5 sm:text-xs"
              >
                <span className="absolute inset-0 translate-y-full rounded-full bg-gold transition-transform duration-200 group-hover:translate-y-0" aria-hidden="true" />
                {item.action === "newChat" ? <NewChatIcon /> : null}
                <span className="relative">{item.label}</span>
              </button>
            ))}
          </nav>
        )}
      </div>

      <div className="flex items-center gap-2">
        {sessionUserRole === "ADMIN" ? (
          <Link href={isAdminArea ? "/" : "/admin/dashboard"} className={`hidden rounded-full border px-3 py-2 font-arsans text-xs shadow-xl transition-all duration-200 hover:-translate-y-0.5 sm:inline-flex ${isAdminArea ? "border-white/10 bg-white/[0.035] text-bone/72 hover:border-gold/45 hover:text-gold" : "border-gold/35 bg-gold/[0.08] text-gold hover:bg-gold hover:text-ink"}`}>
            {isAdminArea ? (isArabic ? "فتح الشات" : "Chat") : isArabic ? "الإدارة" : "Admin"}
          </Link>
        ) : null}
        {status === "loading" ? (
          <span className="h-8 w-8 rounded-2xl border border-white/10 bg-slate-950/70 shadow-xl" aria-hidden="true" />
        ) : session?.user ? (
          <div className="relative">
            <button type="button" onClick={() => setAccountOpen((open) => !open)} className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-slate-950/82 p-1 pr-2 shadow-xl transition-colors hover:border-gold/45" aria-label={`Open account menu for ${authenticatedName}`} aria-expanded={accountOpen}>
              <span className="relative h-8 w-8 overflow-hidden rounded-xl bg-slate-950">
                {authenticatedImage ? <Image src={authenticatedImage} alt={authenticatedName} fill sizes="32px" className="object-cover" unoptimized /> : <span className="grid h-full w-full place-items-center font-ensans text-xs text-bone/90">{authenticatedName.slice(0, 1).toUpperCase()}</span>}
              </span>
              <TierBadge tier={accountTier} language={language} />
            </button>
            {accountOpen ? (
              <div className="absolute left-0 top-12 w-60 border border-white/10 bg-[#0E0D10]/95 p-3 text-right shadow-2xl backdrop-blur-xl" dir={direction}>
                <p className="truncate font-arsans text-sm text-bone/85">{authenticatedName}</p>
                <p className="mt-1 truncate font-ensans text-xs text-bone/45" dir="ltr">{authenticatedEmail}</p>
                <div className="mt-3 flex justify-start">
                  <TierBadge tier={accountTier} language={language} expanded />
                </div>
                <PlusUnlockList tier={accountTier} language={language} />
                <div className="mt-3 grid gap-1 border-t border-white/10 pt-3">
                  <Link href="/profile" onClick={() => setAccountOpen(false)} className="px-2 py-2 font-arsans text-sm text-bone/70 transition-colors hover:bg-white/[0.04] hover:text-gold">
                    {isArabic ? "الملف واللحظات المحفوظة" : "Profile and saved moments"}
                  </Link>
                  {sessionUserRole === "ADMIN" ? (
                    <Link href="/admin/dashboard" onClick={() => setAccountOpen(false)} className="px-2 py-2 font-arsans text-sm text-bone/70 transition-colors hover:bg-white/[0.04] hover:text-gold">
                      {isArabic ? "لوحة الإدارة" : "Admin dashboard"}
                    </Link>
                  ) : null}
                  <button type="button" onClick={() => void signOut({ callbackUrl: "/" })} className="px-2 py-2 text-right font-arsans text-sm text-red-200/75 transition-colors hover:bg-red-300/10 hover:text-red-100">
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
    </header>
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

function TierBadge({ tier, language, expanded = false }: { tier: AccountTier; language: AppLanguage; expanded?: boolean }) {
  const isPlus = tier === "PLUS" || tier === "BUSINESS";
  const label = isPlus ? (language === "ar" ? "بلس" : "Plus") : language === "ar" ? "مجاني" : "Free";
  const title = isPlus ? (language === "ar" ? "حساب بلس" : "Plus account") : language === "ar" ? "حساب مجاني" : "Free account";

  return (
    <span title={title} className={`inline-flex items-center gap-1 rounded-full border font-arsans text-[10px] leading-none ${expanded ? "px-2.5 py-1.5" : "px-1.5 py-1"} ${isPlus ? "border-gold/45 bg-gold/18 text-gold" : "border-white/12 bg-white/[0.045] text-bone/58"}`}>
      {isPlus ? <PlusTierIcon /> : <FreeTierIcon />}
      <span>{label}</span>
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
