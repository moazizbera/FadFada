"use client";

import { useEffect, useState } from "react";
import { useAppLocale } from "./AppShell";

type VersionPayload = {
  version: string;
  packageVersion: string;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const versionStorageKey = "fadfada-app-version";
const dismissedInstallStorageKey = "fadfada-install-dismissed";
const installTrackedStorageKey = "fadfada-install-tracked";

export function PwaUpdateManager() {
  const { language } = useAppLocale();
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [installDismissed, setInstallDismissed] = useState(false);
  const [installHelpOpen, setInstallHelpOpen] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const isArabic = language === "ar";
  const isProductionHost = typeof window !== "undefined" && window.location.hostname === "fad-fada.vercel.app";

  useEffect(() => {
    setInstallDismissed(localStorage.getItem(dismissedInstallStorageKey) === "true");
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);

    async function registerServiceWorker() {
      if (!("serviceWorker" in navigator)) return;

      try {
        const nextRegistration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        setRegistration(nextRegistration);

        nextRegistration.addEventListener("updatefound", () => {
          const installingWorker = nextRegistration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener("statechange", () => {
            if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          });
        });

        if (nextRegistration.waiting) {
          setUpdateAvailable(true);
        }

        void nextRegistration.update();
      } catch (error) {
        console.warn("FadFada service worker registration failed", error);
      }
    }

    void registerServiceWorker();
  }, []);

  useEffect(() => {
    async function checkVersion() {
      try {
        const response = await fetch("/api/version", { cache: "no-store" });
        const data = (await response.json()) as VersionPayload;
        const previousVersion = localStorage.getItem(versionStorageKey);
        const nextVersion = data.version || data.packageVersion;
        setLatestVersion(nextVersion);

        if (previousVersion && nextVersion && previousVersion !== nextVersion) {
          setCurrentVersion(previousVersion);
          setUpdateAvailable(true);
          return;
        }

        if (nextVersion) {
          setCurrentVersion(nextVersion);
          localStorage.setItem(versionStorageKey, nextVersion);
        }
      } catch {
        // Version checks are a convenience. Offline users keep using the installed app.
      }
    }

    void checkVersion();
    const intervalId = window.setInterval(checkVersion, 30 * 60 * 1000);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void checkVersion();
        void registration?.update();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [registration]);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      if (!isProductionHost) return;
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      trackPwaInstall("appinstalled");
      setInstallPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [isProductionHost]);

  useEffect(() => {
    let reloadPending = false;

    function handleControllerChange() {
      if (reloadPending) return;
      reloadPending = true;
      window.location.reload();
    }

    navigator.serviceWorker?.addEventListener("controllerchange", handleControllerChange);
    return () => navigator.serviceWorker?.removeEventListener("controllerchange", handleControllerChange);
  }, []);

  async function installApp() {
    if (!isProductionHost) {
      setInstallHelpOpen(true);
      return;
    }

    if (!installPrompt) {
      setInstallHelpOpen(true);
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      trackPwaInstall(`prompt:${choice.platform || "unknown"}`);
    }
    setInstallPrompt(null);
  }

  function dismissInstall() {
    localStorage.setItem(dismissedInstallStorageKey, "true");
    setInstallDismissed(true);
  }

  function applyUpdate() {
    if (latestVersion) {
      localStorage.setItem(versionStorageKey, latestVersion);
    }

    const waitingWorker = registration?.waiting;
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
      return;
    }

    window.location.reload();
  }

  const versionChip = currentVersion ? <VersionChip language={language} version={currentVersion} hasUpdate={updateAvailable} /> : null;

  if (updateAvailable) {
    return (
      <>
      {versionChip}
      <div className="fixed inset-x-3 bottom-20 z-[60] mx-auto max-w-md border border-[#C9A86A]/35 bg-[#0E0D10]/95 p-4 text-bone shadow-2xl backdrop-blur-xl" dir={isArabic ? "rtl" : "ltr"}>
        <p className={`${isArabic ? "font-arsans" : "font-mono uppercase tracking-[0.16em]"} text-[9px] text-[#C9A86A]/80`} dir={isArabic ? "rtl" : "ltr"}>{isArabic ? "تحديث جاهز" : "Update ready"}</p>
        <p className="mt-2 font-arsans text-sm leading-6 text-[#F7F3EC]/80">
          {isArabic ? "نسخة جديدة من فضفضة جاهزة. التحديث آمن وسريع ولن يحتاج منك أي إعداد." : "A new FadFada version is ready. Updating is quick and does not need setup."}
        </p>
        <div className="mt-3 grid gap-1 rounded-lg border border-white/10 bg-black/20 p-3 font-mono text-[9px] text-[#F7F3EC]/45" dir="ltr">
          {currentVersion ? <span>current: {currentVersion}</span> : null}
          {latestVersion ? <span>latest: {latestVersion}</span> : null}
        </div>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={applyUpdate} className="flex-1 bg-[#C9A86A] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[#0E0D10] transition-colors hover:bg-[#F7F3EC]">
            {isArabic ? "حدّث الآن" : "Update now"}
          </button>
          <button type="button" onClick={() => setUpdateAvailable(false)} className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[#F7F3EC]/45 transition-colors hover:text-[#F7F3EC]">
            {isArabic ? "لاحقاً" : "Later"}
          </button>
        </div>
      </div>
      </>
    );
  }

  if (installPrompt && !installDismissed && isProductionHost) {
    return (
      <>
      {versionChip}
      <div className="fixed inset-x-3 bottom-20 z-[60] mx-auto max-w-md border border-[#F7F3EC]/12 bg-[#0E0D10]/92 p-4 text-bone shadow-2xl backdrop-blur-xl" dir={isArabic ? "rtl" : "ltr"}>
        <p className={`${isArabic ? "font-arsans" : "font-mono uppercase tracking-[0.16em]"} text-[9px] text-[#C9A86A]/75`} dir={isArabic ? "rtl" : "ltr"}>{isArabic ? "تثبيت التطبيق" : "Install app"}</p>
        <p className="mt-2 font-arsans text-sm leading-6 text-[#F7F3EC]/75">
          {isArabic ? "ثبّت فضفضة على جهازك كتطبيق. ستفتح من الشاشة الرئيسية وتستقبل التحديثات تلقائياً." : "Install FadFada on this device as an app. It opens from your home screen and receives updates automatically."}
        </p>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={() => void installApp()} className="flex-1 bg-[#C9A86A] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[#0E0D10] transition-colors hover:bg-[#F7F3EC]">
            {isArabic ? "ثبّت التطبيق" : "Install app"}
          </button>
          <button type="button" onClick={dismissInstall} className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[#F7F3EC]/45 transition-colors hover:text-[#F7F3EC]">
            {isArabic ? "ليس الآن" : "Not now"}
          </button>
        </div>
      </div>
      </>
    );
  }

  if (!isStandalone) {
    return (
      <>
        {versionChip}
        <button
          type="button"
          onClick={() => void installApp()}
          className="fixed bottom-24 right-3 z-[55] flex items-center gap-2 rounded-full border border-[#C9A86A]/40 bg-[#0E0D10]/92 px-3 py-2 text-[#C9A86A] shadow-2xl backdrop-blur-xl transition-colors hover:bg-[#C9A86A] hover:text-[#0E0D10]"
          aria-label={isArabic ? "تثبيت تطبيق فضفضة" : "Install FadFada app"}
          dir={isArabic ? "rtl" : "ltr"}
        >
          <InstallIcon />
          <span className={`${isArabic ? "font-arsans" : "font-mono uppercase tracking-[0.1em]"} text-[10px]`}>{isArabic ? "ثبّت" : "Install"}</span>
        </button>

        {installHelpOpen ? (
          <div className="fixed inset-x-3 bottom-36 z-[60] mx-auto max-w-md border border-[#C9A86A]/35 bg-[#0E0D10]/95 p-4 text-bone shadow-2xl backdrop-blur-xl" dir={isArabic ? "rtl" : "ltr"}>
            <p className={`${isArabic ? "font-arsans" : "font-mono uppercase tracking-[0.16em]"} text-[9px] text-[#C9A86A]/80`}>{isArabic ? "تثبيت التطبيق" : "Install app"}</p>
            <p className="mt-2 font-arsans text-sm leading-6 text-[#F7F3EC]/75">
              {!isProductionHost
                ? isArabic
                  ? "هذا تشغيل محلي للتطوير. ثبّت التطبيق من https://fad-fada.vercel.app حتى لا يفتح على localhost."
                  : "This is a local development build. Install the app from https://fad-fada.vercel.app so it does not open localhost."
                : isArabic
                  ? "إذا لم تظهر نافذة التثبيت، افتح قائمة المتصفح واختر تثبيت التطبيق أو إضافة إلى الشاشة الرئيسية."
                  : "If the install window does not appear, open your browser menu and choose Install app or Add to home screen."}
            </p>
            <button type="button" onClick={() => setInstallHelpOpen(false)} className="mt-4 w-full bg-[#C9A86A] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[#0E0D10] transition-colors hover:bg-[#F7F3EC]">
              {isArabic ? "تمام" : "Got it"}
            </button>
          </div>
        ) : null}
      </>
    );
  }

  return versionChip;
}

function VersionChip({ language, version, hasUpdate }: { language: "ar" | "en"; version: string; hasUpdate: boolean }) {
  const isArabic = language === "ar";

  return (
    <div className="fixed bottom-3 left-3 z-[54] rounded-full border border-white/10 bg-[#0E0D10]/80 px-3 py-1.5 font-mono text-[9px] text-[#F7F3EC]/45 shadow-2xl backdrop-blur-xl" dir="ltr" aria-label={isArabic ? `إصدار فضفضة ${version}` : `FadFada version ${version}`}>
      <span>{hasUpdate ? (isArabic ? "تحديث" : "update") : "v"}</span> <span>{version}</span>
    </div>
  );
}

function InstallIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4v10m0 0 4-4m-4 4-4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 15.5V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function trackPwaInstall(source: string) {
  if (localStorage.getItem(installTrackedStorageKey) === "true") return;
  localStorage.setItem(installTrackedStorageKey, "true");

  void fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventType: "pwa_install",
      metadata: {
        source,
        device: getDeviceType(),
        platform: navigator.platform || "unknown",
        browser: getBrowserName(),
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        standalone: window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true,
      },
    }),
    keepalive: true,
  });
}

function getDeviceType() {
  const userAgent = navigator.userAgent.toLowerCase();
  if (/ipad|tablet/.test(userAgent)) return "tablet";
  if (/mobi|android|iphone/.test(userAgent)) return "mobile";
  return "desktop";
}

function getBrowserName() {
  const userAgent = navigator.userAgent;
  if (/Edg\//.test(userAgent)) return "Edge";
  if (/Chrome\//.test(userAgent) && !/Edg\//.test(userAgent)) return "Chrome";
  if (/Safari\//.test(userAgent) && !/Chrome\//.test(userAgent)) return "Safari";
  if (/Firefox\//.test(userAgent)) return "Firefox";
  return "Other";
}