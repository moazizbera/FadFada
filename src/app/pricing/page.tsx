"use client";

import Link from "next/link";
import { useAppLocale } from "../../components/AppShell";

export default function PricingPage() {
  const { language, direction } = useAppLocale();
  const isArabic = language === "ar";
  const pilotSteps = {
    ar: [
      ["مساحة الطفل", "ينشئ ولي الأمر ملفاً باسم مستعار وحداً يومياً مناسباً."],
      ["واجب واحد", "يحوّل ولي الأمر ورقة أو وصفاً قصيراً إلى نشاط موجه."],
      ["متابعة واضحة", "يرى ولي الأمر الإكمال والحاجة إلى مراجعة، من دون عرض إجابات الطفل."],
    ],
    en: [
      ["Child space", "A parent creates a nickname-only profile and an appropriate daily limit."],
      ["One homework task", "A parent turns a worksheet or short description into guided practice."],
      ["Clear follow-up", "A parent sees completion and review needs without seeing the child's answers."],
    ],
  };

  return (
    <main className="min-h-screen overflow-x-clip bg-ink px-3 pb-20 pt-24 text-bone sm:px-5 sm:pt-28" dir={direction}>
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="ui-action text-bone/55 transition-colors hover:text-gold">
          {isArabic ? "العودة إلى فضفضة" : "Back to FadFada"}
        </Link>

        <section className="mt-10 max-w-3xl text-start">
          <p className="ui-kicker text-emerald-100">{isArabic ? "وصول مبكر للعائلات" : "Early family access"}</p>
          <h1 className="mt-3 font-enserif text-4xl leading-tight text-bone sm:text-6xl">
            {isArabic ? "نبني فدفدة مع العائلات، خطوة واجب في كل مرة" : "Building FadFada with families, one homework step at a time"}
          </h1>
          <p className="mt-5 max-w-2xl font-arsans text-base leading-8 text-bone/68">
            {isArabic
              ? "التجربة الأساسية متاحة خلال مرحلة التحقق الحالية. لا توجد اشتراكات أو تجارب مدفوعة مفعلة الآن، لأننا نركز على جعل حلقة الواجب مفيدة حقاً للعائلات."
              : "The core experience is available during the current validation period. No subscription or paid trial is active today because we are focused on making the homework loop genuinely useful for families."}
          </p>
        </section>

        <section className="mt-10 border-y border-emerald-200/20 py-6">
          <p className="ui-kicker text-emerald-100/80">{isArabic ? "ما الذي يمكن تجربته الآن" : "What you can try now"}</p>
          <div className="mt-5 grid gap-5 md:grid-cols-3">
            {pilotSteps[language].map(([title, body], index) => (
              <article key={title} className="border-l border-emerald-200/30 pl-4 text-start" dir={direction}>
                <span className="font-mono text-xs text-emerald-100/65">0{index + 1}</span>
                <h2 className="mt-2 font-arsans text-lg font-semibold text-bone/92">{title}</h2>
                <p className="mt-2 font-arsans text-sm leading-6 text-bone/58">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 border border-gold/25 bg-gold/[0.045] p-5 text-start sm:p-6">
          <p className="ui-kicker text-gold">{isArabic ? "لاحقاً" : "Later"}</p>
          <h2 className="mt-2 font-arserif text-2xl text-bone sm:text-3xl">{isArabic ? "سيتم تحديد السعر بعد التحقق من القيمة" : "Pricing follows proven value"}</h2>
          <p className="mt-3 max-w-2xl font-arsans text-sm leading-7 text-bone/62">
            {isArabic
              ? "لن نفتح الدفع قبل اختبار الدفع التجريبي، الإلغاء، وإدارة الاشتراك بشكل كامل، وقبل أن تؤكد العائلات أن المتابعة تستحق العودة إليها."
              : "We will not open payments until trial checkout, cancellation, and subscription management are fully tested, and families confirm that the follow-up is worth returning to."}
          </p>
          <Link href="/?setup=child" className="ui-action mt-5 inline-flex border border-gold/45 px-4 py-2.5 font-arsans text-sm text-gold transition-colors hover:bg-gold hover:text-ink">
            {isArabic ? "ابدأ مساحة طفل" : "Start a child space"}
          </Link>
        </section>
      </div>
    </main>
  );
}
