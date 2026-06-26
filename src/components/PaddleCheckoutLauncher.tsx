"use client";

import { useEffect, useState } from "react";
import { useAppLocale } from "./AppShell";

type PaddleWindow = Window & {
  Paddle?: {
    Environment?: {
      set: (environment: "sandbox" | "production") => void;
    };
    Initialize: (options: { token: string }) => void;
    Checkout: {
      open: (options: { transactionId: string }) => void;
    };
  };
};

const paddleScriptUrl = "https://cdn.paddle.com/paddle/v2/paddle.js";
let paddleScriptPromise: Promise<void> | null = null;

export function PaddleCheckoutLauncher() {
  const { language } = useAppLocale();
  const [status, setStatus] = useState<"idle" | "missing-token" | "loading" | "error">("idle");
  const isArabic = language === "ar";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const transactionId = params.get("_ptxn");
    if (!transactionId?.startsWith("txn_")) return;

    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    if (!token) {
      setStatus("missing-token");
      return;
    }

    let cancelled = false;
    setStatus("loading");

    loadPaddleScript()
      .then(() => {
        if (cancelled) return;
        const paddle = (window as PaddleWindow).Paddle;
        if (!paddle) throw new Error("Paddle.js did not initialize");

        const environment = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === "sandbox" ? "sandbox" : "production";
        paddle.Environment?.set(environment);
        paddle.Initialize({ token });
        paddle.Checkout.open({ transactionId });
        setStatus("idle");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "idle") return null;

  return (
    <div className="fixed inset-x-3 bottom-28 z-[70] mx-auto max-w-md rounded-2xl border border-[#C9A86A]/35 bg-[#0E0D10]/95 p-4 text-bone shadow-2xl backdrop-blur-xl" dir={isArabic ? "rtl" : "ltr"}>
      <p className="ui-kicker text-[#C9A86A]/85">{isArabic ? "دفع Paddle" : "Paddle checkout"}</p>
      <p className="mt-2 font-arsans text-sm leading-6 text-[#F7F3EC]/75">
        {status === "loading"
          ? isArabic
            ? "جار فتح نافذة الدفع الآمنة..."
            : "Opening secure payment checkout..."
          : status === "missing-token"
            ? isArabic
              ? "ينقص رمز Client-side tokens من Paddle في إعداد NEXT_PUBLIC_PADDLE_CLIENT_TOKEN داخل Vercel."
              : "Add a Paddle Client-side tokens value to NEXT_PUBLIC_PADDLE_CLIENT_TOKEN in Vercel. Do not use the server API key."
            : isArabic
              ? "تعذر فتح نافذة الدفع. أعد تحميل الصفحة أو راجع إعدادات Paddle."
              : "Could not open checkout. Reload the page or check Paddle settings."}
      </p>
    </div>
  );
}

function loadPaddleScript() {
  if ((window as PaddleWindow).Paddle) return Promise.resolve();
  if (paddleScriptPromise) return paddleScriptPromise;

  paddleScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${paddleScriptUrl}"]`);
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = paddleScriptUrl;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return paddleScriptPromise;
}
