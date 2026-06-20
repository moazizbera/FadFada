"use client";

import Image from "next/image";
import Link from "next/link";
import { SessionProvider, signIn, useSession } from "next-auth/react";
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";

type AppLanguage = "ar" | "en";

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

const AppLocaleContext = createContext<AppLocaleContextValue | null>(null);

export function useAppLocale() {
  const context = useContext(AppLocaleContext);

  if (!context) {
    throw new Error("useAppLocale must be used inside AppShell.");
  }

  return context;
}

export function AppShell({ children, initialLanguage = "ar" }: AppShellProps) {
  const [language, setLanguage] = useState<AppLanguage>(initialLanguage);
  const direction = language === "ar" ? "rtl" : "ltr";
  const shellFontClass = language === "ar" ? "font-arsans text-right" : "font-ensans text-left";

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
  }, [direction, language]);

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
          <div className="transition-[padding,margin] duration-300 ease-out">{children}</div>
        </div>
      </AppLocaleContext.Provider>
    </SessionProvider>
  );
}

function GlobalHeader() {
  const { language, direction, toggleLanguage } = useAppLocale();
  const { data: session, status } = useSession();
  const isArabic = language === "ar";
  const nextLanguageLabel = isArabic ? "English" : "العربية";
  const authenticatedImage = session?.user?.image;
  const authenticatedName = session?.user?.name || session?.user?.email || "FadFada member";

  return (
    <header className="fixed inset-x-0 top-0 z-50 mx-auto flex max-w-2xl items-center justify-between px-4 pt-4 text-bone/90" dir={direction}>
      <div className="flex items-center">
        <button
          type="button"
          onClick={toggleLanguage}
          className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-2 font-ensans text-[11px] text-bone/90 shadow-xl backdrop-blur-xl transition-colors hover:border-gold/50 hover:text-gold"
          aria-label={isArabic ? "Switch application language to English" : "Switch application language to Arabic"}
        >
          {nextLanguageLabel}
        </button>
      </div>

      <div className="flex items-center">
        {status === "loading" ? (
          <span className="h-8 w-8 rounded-2xl border border-white/10 bg-slate-950/70 shadow-xl" aria-hidden="true" />
        ) : session?.user ? (
          <Link href="/admin/dashboard" className="relative h-8 w-8 overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-xl" aria-label={`Open account dashboard for ${authenticatedName}`}>
            {authenticatedImage ? <Image src={authenticatedImage} alt={authenticatedName} fill sizes="32px" className="object-cover" /> : <span className="grid h-full w-full place-items-center font-ensans text-xs text-bone/90">{authenticatedName.slice(0, 1).toUpperCase()}</span>}
          </Link>
        ) : (
          <button type="button" onClick={() => void signIn(undefined, { callbackUrl: "/?onboarding=conversation" })} className="font-mono text-[10px] tracking-[0.08em] text-bone/70 transition-colors hover:text-gold">
            تسجيل الدخول / Login
          </button>
        )}
      </div>
    </header>
  );
}
