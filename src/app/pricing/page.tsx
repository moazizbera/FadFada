"use client";

import { useState } from "react";
import Link from "next/link";
import { useAppLocale } from "../../components/AppShell";

const freeFeatures = {
  ar: ["بدايات موجهة للفضفضة", "عدد محدود من الردود", "رفقاء مختارون", "حفظ محلي للحظات"],
  en: ["Guided venting starts", "Limited replies", "Selected companions", "Local saved moments"],
};

const plusFeatures = {
  ar: ["رحلة محفوظة عبر الجلسات", "كل الرفقاء والشخصيات", "ردود أعمق وخطط أوضح", "تخصيص أوسع وصور رفقاء", "كبسولات ولحظات أكثر"],
  en: ["Saved journey across sessions", "All companions and personas", "Deeper replies and clearer plans", "Expanded personalization and avatars", "More capsules and saved moments"],
};

export default function PricingPage() {
  const { language, direction } = useAppLocale();
  const isArabic = language === "ar";
  const [discountCode, setDiscountCode] = useState("");
  const plusActionHref = "/?upgrade=plus";

  function rememberDiscountCode() {
    const cleanedCode = cleanClientDiscountCode(discountCode);
    setDiscountCode(cleanedCode);
    if (cleanedCode) window.localStorage.setItem("fadfada-discount-code", cleanedCode);
  }

  return (
    <main className="min-h-screen overflow-x-clip bg-ink px-3 pb-20 pt-24 text-bone sm:px-5 sm:pt-28" dir={direction}>
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="ui-action text-bone/55 transition-colors hover:text-gold">
          {isArabic ? "العودة إلى فضفضة" : "Back to FadFada"}
        </Link>

        <section className="mt-8 text-center sm:mt-10">
          <p className="ui-kicker">{isArabic ? "فضفضة بلس" : "FadFada Plus"}</p>
          <h1 className="mt-3 font-enserif text-4xl leading-tight text-bone sm:text-6xl">
            {isArabic ? "احفظ رحلتك، وافتح رفقاء أعمق" : "Keep your journey, unlock deeper companions"}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl font-arsans text-base leading-8 text-bone/68">
            {isArabic
              ? "الخطة المجانية تكفي لتجربة فضفضة. بلس مخصص لمن يريد أن تتحول المحادثات إلى رحلة محفوظة وخطوات واضحة ورفقاء أكثر تخصصاً."
              : "The free plan is enough to try FadFada. Plus is for people who want conversations to become a saved journey, clearer steps, and more specialized companions."}
          </p>
        </section>

        <section className="mt-8 overflow-hidden rounded-[1.35rem] border border-gold/35 bg-[radial-gradient(circle_at_top_left,rgba(201,168,106,0.20),transparent_34%),linear-gradient(135deg,rgba(14,13,16,0.92),rgba(20,38,35,0.72))] p-4 text-start shadow-[0_24px_80px_rgba(0,0,0,0.34)] sm:p-5">
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="ui-kicker text-gold">{isArabic ? "عرض الإطلاق" : "Launch offer"}</p>
              <h2 className="mt-2 font-arserif text-2xl leading-tight text-bone sm:text-3xl">
                {isArabic ? "هل لديك كلمة خصم؟" : "Have a discount word?"}
              </h2>
              <p className="mt-3 max-w-2xl font-arsans text-sm leading-7 text-bone/62">
                {isArabic
                  ? "اكتب كلمة الخصم التي وصلتك. يتحقق Lemon Squeezy من صلاحيتها عند الدفع."
                  : "Enter the discount word you received. Lemon Squeezy validates it at checkout."}
              </p>
            </div>
            <label className="rounded-2xl border border-gold/30 bg-black/24 p-3 md:min-w-56">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-bone/42">{isArabic ? "أدخل كلمة الخصم" : "Enter discount word"}</span>
              <input value={discountCode} onChange={(event) => setDiscountCode(event.target.value.toUpperCase())} onBlur={rememberDiscountCode} placeholder={isArabic ? "اكتب الكلمة هنا" : "Type it here"} autoComplete="off" spellCheck={false} dir="ltr" className="mt-2 w-full border-b border-gold/35 bg-transparent pb-1 text-center font-mono text-lg font-bold tracking-[0.08em] text-gold outline-none placeholder:text-bone/25 focus:border-gold" />
            </label>
          </div>
          <div className="mt-4 flex justify-end">
            <Link href={plusActionHref} onClick={rememberDiscountCode} className="ui-action inline-flex justify-center rounded-xl bg-gold px-4 py-2.5 font-arsans text-sm font-bold text-ink transition-colors hover:bg-bone">
              {isArabic ? "فعّل العرض" : "Claim offer"}
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:mt-10 md:grid-cols-2">
          <PlanCard
            title={isArabic ? "مجاني" : "Free"}
            price={isArabic ? "ابدأ الآن" : "Start now"}
            description={isArabic ? "لأول تجربة وفضفضة قصيرة بدون دفع." : "For a first experience and short reflections without payment."}
            features={freeFeatures[language]}
            actionHref="/"
            actionLabel={isArabic ? "ابدأ مجاناً" : "Start free"}
          />
          <PlanCard
            featured
            title={isArabic ? "بلس" : "Plus"}
            price="$4.99"
            description={isArabic ? "للذاكرة، الرفقاء المميزين، والخطط المحفوظة." : "For memory, premium companions, and saved plans."}
            features={plusFeatures[language]}
            actionHref={plusActionHref}
            actionLabel={isArabic ? "افتح بلس" : "Unlock Plus"}
            onAction={rememberDiscountCode}
          />
        </section>

        <section className="mt-8 rounded-2xl border border-cyan-100/20 bg-cyan-100/[0.045] p-4 text-start shadow-2xl backdrop-blur sm:p-5">
          <p className="ui-kicker text-cyan-100/80">{isArabic ? "لماذا يدفع المستخدم؟" : "Why users upgrade"}</p>
          <div className="mt-4 grid gap-3 min-[560px]:grid-cols-3">
            {(isArabic
              ? [
                  ["استمرارية", "يرجع المستخدم لخيطه بدلاً من البدء من الصفر."],
                  ["تخصيص", "يفتح رفقاء أكثر ورفيقاً خاصاً يشبه احتياجه."],
                  ["نتيجة", "يحصل على لحظة محفوظة وخطة صغيرة قابلة للتنفيذ."],
                ]
              : [
                  ["Continuity", "Users return to their thread instead of starting over."],
                  ["Personalization", "More companions and a custom companion for their need."],
                  ["Outcome", "A saved moment and one practical plan they can act on."],
                ]
            ).map(([title, body]) => (
              <div key={title} className="rounded-xl border border-white/10 bg-black/18 p-4">
                <h2 className="font-arsans text-base font-semibold text-bone/90">{title}</h2>
                <p className="mt-2 font-arsans text-sm leading-6 text-bone/58">{body}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function cleanClientDiscountCode(value: string | null) {
  const cleanedValue = value?.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 48);
  return cleanedValue || "";
}

function PlanCard({ title, price, description, features, actionHref, actionLabel, onAction, featured = false }: { title: string; price: string; description: string; features: string[]; actionHref: string; actionLabel: string; onAction?: () => void; featured?: boolean }) {
  return (
    <section className={`rounded-2xl border p-4 shadow-2xl backdrop-blur sm:p-5 ${featured ? "border-gold/45 bg-gold/[0.075]" : "border-white/10 bg-white/[0.035]"}`}>
      <div className="flex items-start justify-between gap-3 max-[420px]:flex-col">
        <div>
          <h2 className="font-arsans text-xl font-semibold text-bone">{title}</h2>
          <p className="mt-2 font-arsans text-sm leading-6 text-bone/58">{description}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-3 py-1.5 font-mono text-xs ${featured ? "border-gold/45 bg-gold/15 text-gold" : "border-white/10 bg-black/18 text-bone/58"}`}>{price}</span>
      </div>
      <div className="mt-5 grid gap-2">
        {features.map((feature) => (
          <p key={feature} className="rounded-xl border border-white/10 bg-black/16 px-3 py-2 font-arsans text-sm text-bone/70">{feature}</p>
        ))}
      </div>
      <Link href={actionHref} onClick={onAction} className={`ui-action mt-5 inline-flex w-full justify-center rounded-full px-4 py-3 text-sm transition-colors ${featured ? "bg-gold text-ink hover:bg-bone" : "border border-white/10 text-bone/72 hover:border-gold/45 hover:text-gold"}`}>
        {actionLabel}
      </Link>
    </section>
  );
}
