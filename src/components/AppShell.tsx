"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SessionProvider, signOut, useSession } from "next-auth/react";
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { NotificationCenter } from "./NotificationCenter";
import { PwaUpdateManager } from "./PwaUpdateManager";

type AppLanguage = "ar" | "en";
type HomeHeaderAction = "start" | "avatars" | "tools";

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
  const isArabic = language === "ar";
  const nextLanguageLabel = isArabic ? "EN" : "AR";
  const authenticatedImage = accountProfile?.image || session?.user?.image;
  const authenticatedName = accountProfile?.nickname || accountProfile?.name || session?.user?.name || accountProfile?.email || session?.user?.email || (isArabic ? "عضو فضفضة" : "FadFada member");
  const authenticatedEmail = accountProfile?.email || session?.user?.email || "";
  const sessionUserRole = session?.user && "role" in session.user ? session.user.role : "USER";
  const isAdminArea = pathname?.startsWith("/admin") ?? false;
  const headerActions: Array<{ action: HomeHeaderAction; label: string }> = [
    { action: "start", label: isArabic ? "ابدأ" : "Start" },
    { action: "avatars", label: isArabic ? "الرفاق" : "Avatars" },
    { action: "tools", label: isArabic ? "الأدوات" : "Tools" },
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

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#0E0D10]/78 text-bone/90 shadow-2xl backdrop-blur-xl" dir={direction}>
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-2 px-3 sm:px-4">
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
          <div className="rounded-full border border-gold/25 bg-gold/[0.08] px-4 py-2 font-arsans text-xs text-gold shadow-xl">
            {isArabic ? "وضع الإدارة" : "Admin mode"}
          </div>
        ) : (
          <nav className="flex min-w-0 items-center gap-1 overflow-x-auto rounded-full border border-white/10 bg-white/[0.035] p-1 shadow-xl backdrop-blur-xl" aria-label={isArabic ? "اختصارات فضفضة الرئيسية" : "FadFada quick actions"}>
            {headerActions.map((item) => (
              <button
                key={item.action}
                type="button"
                onClick={() => runHeaderAction(item.action)}
                className="group relative shrink-0 overflow-hidden rounded-full px-3 py-1.5 font-arsans text-[11px] text-bone/72 transition-all duration-200 hover:-translate-y-0.5 hover:text-ink sm:px-3.5 sm:text-xs"
              >
                <span className="absolute inset-0 translate-y-full rounded-full bg-gold transition-transform duration-200 group-hover:translate-y-0" aria-hidden="true" />
                <span className="relative">{item.label}</span>
              </button>
            ))}
          </nav>
        )}
      </div>

      <div className="flex items-center">
        {status === "loading" ? (
          <span className="h-8 w-8 rounded-2xl border border-white/10 bg-slate-950/70 shadow-xl" aria-hidden="true" />
        ) : session?.user ? (
          <div className="relative">
            <button type="button" onClick={() => setAccountOpen((open) => !open)} className="relative h-9 w-9 overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-xl" aria-label={`Open account menu for ${authenticatedName}`} aria-expanded={accountOpen}>
              {authenticatedImage ? <Image src={authenticatedImage} alt={authenticatedName} fill sizes="36px" className="object-cover" unoptimized /> : <span className="grid h-full w-full place-items-center font-ensans text-xs text-bone/90">{authenticatedName.slice(0, 1).toUpperCase()}</span>}
            </button>
            {accountOpen ? (
              <div className="absolute left-0 top-12 w-60 border border-white/10 bg-[#0E0D10]/95 p-3 text-right shadow-2xl backdrop-blur-xl" dir={direction}>
                <p className="truncate font-arsans text-sm text-bone/85">{authenticatedName}</p>
                <p className="mt-1 truncate font-ensans text-xs text-bone/45" dir="ltr">{authenticatedEmail}</p>
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
