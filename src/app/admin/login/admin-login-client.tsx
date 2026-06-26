"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";
import { useAppLocale } from "../../../components/AppShell";

export function AdminLoginClient() {
  const { language, direction } = useAppLocale();
  const isArabic = language === "ar";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(false);

    const result = await signIn("admin-login", {
      email,
      password,
      redirect: false,
      callbackUrl: "/admin/dashboard",
    });

    setLoading(false);

    if (result?.ok) {
      window.location.assign("/admin/dashboard");
      return;
    }

    setError(true);
  }

  return (
    <main className="grid min-h-screen place-items-center bg-ink px-5 pt-20 text-bone/90" dir={direction}>
      <form onSubmit={submit} className="w-full max-w-md border border-white/10 bg-white/[0.03] p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between gap-4 border-b border-white/10 pb-4">
          <Link href="/" className="ui-action rounded-lg border border-white/10 px-3 py-2 text-bone/70 transition-colors hover:border-gold/45 hover:text-gold">
            {isArabic ? "العودة للرئيسية" : "Back home"}
          </Link>
          <span className="font-arserif text-2xl text-bone/95">{isArabic ? "فضفضة" : "FadFada"}</span>
        </div>
        <p className="ui-kicker">{isArabic ? "دخول الإدارة" : "Admin sign in"}</p>
        <h1 className="mt-3 font-arserif text-4xl text-bone/95">{isArabic ? "دخول لوحة الإدارة" : "Admin dashboard access"}</h1>
        <p className="mt-3 font-arsans text-sm leading-7 text-bone/55">{isArabic ? "للعرض مع الحكام: استخدم البريد المصرّح به وكلمة مرور الإدارة المحفوظة في إعدادات المشروع." : "For judge demos: use the authorized email and the admin password saved in project settings."}</p>
        <label className="mt-6 block">
          <span className="mb-2 block font-arsans text-sm text-bone/65">{isArabic ? "بريد المدير" : "Admin email"}</span>
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" dir="ltr" className="w-full border border-white/10 bg-black/20 px-3 py-3 font-ensans text-base outline-none focus:border-gold/50" required />
        </label>
        <label className="mt-4 block">
          <span className="mb-2 block font-arsans text-sm text-bone/65">{isArabic ? "كلمة مرور الإدارة" : "Admin password"}</span>
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" dir="ltr" className="w-full border border-white/10 bg-black/20 px-3 py-3 font-ensans text-base outline-none focus:border-gold/50" required />
        </label>
        {error ? <p className="mt-4 font-arsans text-sm text-red-200">{isArabic ? "بيانات الإدارة غير صحيحة أو كلمة مرور الإدارة غير مضبوطة." : "Admin details are incorrect or the admin password is not configured."}</p> : null}
        <button type="submit" className="ui-action mt-6 w-full bg-gold px-4 py-3 text-ink transition-colors hover:bg-bone">
          {loading ? (isArabic ? "جار التحقق..." : "Checking...") : isArabic ? "دخول لوحة الإدارة" : "Enter dashboard"}
        </button>
      </form>
    </main>
  );
}