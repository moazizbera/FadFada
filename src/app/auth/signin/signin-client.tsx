"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { FormEvent, useMemo, useState } from "react";
import { useAppLocale } from "../../../components/AppShell";

type SignInState = "idle" | "loading" | "error";

export function SignInClient() {
  const { language, direction } = useAppLocale();
  const isArabic = language === "ar";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<SignInState>("idle");
  const callbackUrl = useMemo(() => {
    if (typeof window === "undefined") return "/?onboarding=conversation";
    return new URLSearchParams(window.location.search).get("callbackUrl") || "/?onboarding=conversation";
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");

    const result = await signIn("email-signup", {
      name,
      email,
      redirect: false,
      callbackUrl,
    });

    if (result?.ok) {
      window.location.assign(callbackUrl);
      return;
    }

    setState("error");
  }

  return (
    <main className="min-h-screen overflow-hidden bg-ink px-5 pb-12 pt-24 text-bone/90" dir={direction}>
      <section className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-xl items-center">
        <form onSubmit={submit} className="w-full border border-white/10 bg-[#0E0D10]/88 p-5 shadow-2xl backdrop-blur-xl">
          <div className="mb-5 flex items-center justify-between gap-4 border-b border-white/10 pb-4">
            <Link href="/" className="ui-action rounded-lg border border-white/10 px-3 py-2 text-bone/70 transition-colors hover:border-gold/45 hover:text-gold">
              {isArabic ? "العودة للرئيسية" : "Back home"}
            </Link>
            <span className="font-arserif text-2xl text-bone/95">{isArabic ? "فضفضة" : "FadFada"}</span>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="ui-kicker">{isArabic ? "تسجيل الدخول" : "Sign in"}</p>
              <h2 className="mt-3 font-arserif text-4xl text-bone/95">{isArabic ? "حساب فضفضة" : "FadFada account"}</h2>
            </div>
          </div>

          <p className="mt-4 font-arsans text-sm leading-7 text-bone/55">
            {isArabic ? "مناسب للمستخدمين والحكام: دخول سريع، بدون صفحة افتراضية، وبدون كلمة مرور للمستخدم العادي." : "Built for users and judges: fast sign-in, branded flow, and no password for regular users."}
          </p>

          <label className="mt-7 block">
            <span className="mb-2 block font-arsans text-sm text-bone/65">{isArabic ? "الاسم الكامل" : "Full name"}</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              placeholder="Mo Aziz"
              dir="auto"
              className="w-full border border-white/10 bg-white/[0.035] px-3 py-3 font-arsans text-base text-bone outline-none transition-colors placeholder:text-bone/25 focus:border-gold/55"
            />
          </label>

          <label className="mt-4 block">
            <span className="mb-2 block font-arsans text-sm text-bone/65">{isArabic ? "البريد الإلكتروني" : "Email address"}</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              dir="ltr"
              className="w-full border border-white/10 bg-white/[0.035] px-3 py-3 font-ensans text-base text-bone outline-none transition-colors placeholder:text-bone/25 focus:border-gold/55"
              required
            />
          </label>

          {state === "error" ? (
            <p className="mt-4 border border-red-300/20 bg-red-300/8 px-3 py-2 font-arsans text-sm text-red-100">
              {isArabic ? "لم نتمكن من تسجيل الدخول. تأكد من البريد وحاول مرة أخرى." : "We could not sign you in. Check the email and try again."}
            </p>
          ) : null}

          <button type="submit" disabled={state === "loading"} className="ui-action mt-6 w-full bg-gold px-4 py-3 text-ink transition-colors hover:bg-bone disabled:opacity-60">
            {state === "loading" ? (isArabic ? "جار الدخول..." : "Signing in...") : isArabic ? "دخول إلى فضفضة" : "Enter FadFada"}
          </button>

          <div className="mt-5 flex items-center justify-between gap-4 border-t border-white/10 pt-4">
            <p className="font-arsans text-xs text-bone/40">{isArabic ? "لديك صلاحية إدارة؟" : "Have admin access?"}</p>
            <Link href="/admin/login" className="ui-action text-gold transition-colors hover:text-bone">
              {isArabic ? "دخول الإدارة" : "Admin sign in"}
            </Link>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <Signal direction={direction} label={isArabic ? "تثبيت" : "Install"} value={isArabic ? "قابل للتثبيت" : "Installable"} />
            <Signal direction={direction} label={isArabic ? "حفظ" : "Save"} value={isArabic ? "لحظاتك" : "Moments"} />
            <Signal direction={direction} label={isArabic ? "تجربة" : "Demo"} value={isArabic ? "مجاني" : "Free"} />
          </div>
        </form>
      </section>
    </main>
  );
}

function Signal({ label, value, direction }: { label: string; value: string; direction: "rtl" | "ltr" }) {
  return (
    <div className="border border-white/10 bg-black/15 px-3 py-3" dir={direction}>
      <p className="font-arsans text-xs text-bone/45">{label}</p>
      <p className="mt-1 font-arsans text-sm font-medium text-gold">{value}</p>
    </div>
  );
}