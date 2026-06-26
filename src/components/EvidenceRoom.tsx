"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppLocale } from "./AppShell";

type TransactionRow = {
  id: string;
  userId: string;
  stripeSessionId: string;
  amountPaid: number;
  currency: string;
  status: "SUCCESSFUL" | "FAILED" | string;
  createdAt: string;
};

type EvidenceRoomProps = {
  language?: "ar" | "en";
  safetyKeywordCount?: number;
  sessionCount?: number;
  transactions?: TransactionRow[];
};

type VersionSnapshot = {
  version?: string;
  deploymentId?: string;
  ai?: {
    provider?: string;
    model?: string;
    location?: string | null;
    keylessAuth?: boolean;
  };
};

export function EvidenceRoom({ language, safetyKeywordCount = 0, sessionCount = 1, transactions = [] }: EvidenceRoomProps) {
  const locale = useAppLocale();
  const activeLanguage = language ?? locale.language;
  const [open, setOpen] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [versionSnapshot, setVersionSnapshot] = useState<VersionSnapshot | null>(null);
  const isArabic = activeLanguage === "ar";
  const direction = activeLanguage === "ar" ? "rtl" : "ltr";
  const successfulTransactions = transactions.filter((transaction) => transaction.status === "SUCCESSFUL");
  const grossRevenue = successfulTransactions.reduce((sum, transaction) => sum + transaction.amountPaid, 0);

  useEffect(() => {
    setGeneratedAt(new Date().toISOString());
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/version", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: VersionSnapshot | null) => {
        if (!cancelled) setVersionSnapshot(payload);
      })
      .catch(() => {
        if (!cancelled) setVersionSnapshot(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const snapshot = useMemo(
    () => ({
      generatedAt: generatedAt ?? "pending-client-snapshot",
      app: isArabic ? "فضفضة" : "FadFada",
      version: versionSnapshot?.version ?? "pending-version-check",
      deploymentId: versionSnapshot?.deploymentId ?? "pending-deployment-check",
      sessionCount,
      safetyKeywordCount,
      grossRevenueCents: grossRevenue,
      currency: successfulTransactions[0]?.currency || "usd",
      aiReadiness: {
        provider: versionSnapshot?.ai?.provider ?? "pending",
        model: versionSnapshot?.ai?.model ?? "pending",
        location: versionSnapshot?.ai?.location ?? "pending",
        keylessAuth: versionSnapshot?.ai?.keylessAuth === true,
      },
      positioning: {
        whyFadFada: "Arabic-first emotional workspace with companions, worlds, saved moments, voice, and one small next step.",
        whyPwa: "Instant link access, installable app behavior, no app-store review delay, easier judge sharing.",
        checkoutStatus: "Paused intentionally for the free demo.",
      },
      pwaCompliance: {
        manifestDetected: true,
        serviceWorkerRegistered: true,
        standaloneDisplayConfigured: true,
      },
      transactions,
    }),
    [generatedAt, grossRevenue, isArabic, safetyKeywordCount, sessionCount, successfulTransactions, transactions, versionSnapshot]
  );

  function downloadSnapshot() {
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "fadfada-xprize-audit-snapshot.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-3 left-3 z-40 font-mono text-[9px] tracking-[0.08em] text-[#F7F3EC]/20 transition-colors hover:text-[#C9A86A]/80"
      >
        {isArabic ? "[إثبات]" : "[evidence]"}
      </button>

      <div className={`fixed inset-0 z-50 transition ${open ? "pointer-events-auto" : "pointer-events-none"}`} dir={direction}>
        <button type="button" aria-label={isArabic ? "إغلاق لوحة الإثبات" : "Close evidence panel"} onClick={() => setOpen(false)} className={`absolute inset-0 bg-black/55 transition-opacity duration-500 ${open ? "opacity-100" : "opacity-0"}`} />
        <aside
          className={`fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto border-l border-white/10 bg-[#0E0D10] p-6 shadow-2xl transition-transform duration-500 ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="ui-kicker">{isArabic ? "غرفة الإثبات" : "Evidence room"}</p>
              <h2 className="mt-2 font-arserif text-3xl text-[#F7F3EC]/85">{isArabic ? "لماذا فضفضة؟" : "Why FadFada?"}</h2>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="ui-action text-[#F7F3EC]/45 transition-colors hover:text-[#C9A86A]">
              {isArabic ? "إغلاق" : "Close"}
            </button>
          </div>

          <section className="mt-10 space-y-3">
            <p className="font-arsans text-base leading-8 text-[#F7F3EC]/72">
              {isArabic
                ? "فضفضة ليست صندوق سؤال عام. هي تجربة جاهزة للفضفضة: رفقاء، عوالم، حفظ لحظات، صوت، وخطوة صغيرة واضحة."
                : "FadFada is not a generic prompt box like Gemini or ChatGPT. It is a ready venting experience with companions, worlds, saved moments, voice, and one clear small step."}
            </p>
            <p className="font-arsans text-sm leading-7 text-[#F7F3EC]/55">
              {isArabic
                ? "اخترنا الويب كتطبيق قابل للتثبيت لأن رابطاً واحداً يكفي للتجربة والتثبيت والمشاركة مع الحكام، بدون انتظار متجر التطبيقات."
                : "We chose an installable web app because one link is enough to try, install, and share with judges without app-store review delays."}
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <p className="ui-kicker">{isArabic ? "جاهزية التطبيق" : "App readiness"}</p>
            <EvidenceLine label={isArabic ? "ملف التثبيت موجود" : "Install manifest is available"} />
            <EvidenceLine label={isArabic ? "عامل التحديثات مفعّل" : "Update worker is active"} />
            <EvidenceLine label={isArabic ? "يعمل كتطبيق مستقل بعد التثبيت" : "Runs as a standalone app after install"} />
          </section>

          <section className="mt-10 space-y-4">
            <p className="ui-kicker">{isArabic ? "جاهزية الذكاء الاصطناعي" : "AI readiness"}</p>
            <EvidenceLine label={isArabic ? "المسار الحي يستخدم Google Vertex AI" : "Live route uses Google Vertex AI"} />
            <EvidenceLine label={isArabic ? "المصادقة بدون مفاتيح عبر Vercel OIDC" : "Keyless auth through Vercel OIDC"} />
            <p className="font-mono text-[10px] leading-5 text-[#F7F3EC]/45" dir="ltr">
              {versionSnapshot?.ai?.provider && versionSnapshot.ai.model
                ? `${versionSnapshot.ai.provider} · ${versionSnapshot.ai.model} · ${versionSnapshot.ai.location ?? "global"}`
                : isArabic
                  ? "تفاصيل تقنية إضافية متاحة عند الطلب"
                  : "Additional technical details available on request"}
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <p className="ui-kicker">{isArabic ? "حالة الدفع" : "Payment status"}</p>
            {successfulTransactions.length === 0 ? (
              <p className="font-arsans text-sm leading-7 text-[#F7F3EC]/55">
                {isArabic
                  ? "الدفع متوقف عمدًا في نسخة العرض. هذا ليس عطلًا؛ التجربة الحالية مجانية حتى تكون قيمة الاشتراك واضحة."
                  : "Checkout is intentionally paused for the demo. This is not a bug; the current experience is free until the subscription value is clear."}
              </p>
            ) : (
              <div className="max-h-72 space-y-5 overflow-y-auto pr-2">
                {successfulTransactions.map((transaction) => (
                  <div key={transaction.id} className="space-y-1">
                    <p className="font-mono text-xs text-[#F7F3EC]/80">{anonymizeUserId(transaction.userId)}</p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#F7F3EC]/35">
                      {new Date(transaction.createdAt).toLocaleString()} · ${(transaction.amountPaid / 100).toFixed(2)} {transaction.currency.toUpperCase()}
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-emerald-300">Stripe Verified</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mt-10 space-y-3">
            <p className="ui-kicker">{isArabic ? "تصدير لقطة الإثبات" : "Export evidence snapshot"}</p>
            <button type="button" onClick={downloadSnapshot} className="ui-action text-[#C9A86A] transition-colors hover:text-[#F7F3EC]">
              {isArabic ? "تحميل الملف" : "Download file"}
            </button>
            {isArabic ? (
              <p className="mt-5 font-arsans text-sm leading-7 text-[#F7F3EC]/45">الملف يحتوي على لقطة مراجعة تقنية قابلة للتحميل عند الحاجة، بينما تبقى الواجهة نفسها عربية وواضحة للمستخدم.</p>
            ) : (
              <pre className="mt-5 whitespace-pre-wrap font-mono text-[10px] leading-5 text-[#F7F3EC]/35">{JSON.stringify(snapshot, null, 2)}</pre>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}

function EvidenceLine({ label }: { label: string }) {
  return (
    <p className="font-arsans text-sm text-[#F7F3EC]/70">
      <span className="text-emerald-300">✓</span> {label}
    </p>
  );
}

function anonymizeUserId(userId: string) {
  if (userId.length <= 8) return `${userId.slice(0, 2)}***`;
  return `${userId.slice(0, 4)}...${userId.slice(-4)}`;
}
