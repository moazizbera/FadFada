"use client";

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

  return (
    <main className="min-h-screen bg-ink px-5 pb-20 pt-28 text-bone" dir={direction}>
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="ui-action text-bone/55 transition-colors hover:text-gold">
          {isArabic ? "العودة إلى فضفضة" : "Back to FadFada"}
        </Link>

        <section className="mt-10 text-center">
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

        <section className="mt-10 grid gap-4 md:grid-cols-2">
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
            actionHref="/?upgrade=plus"
            actionLabel={isArabic ? "افتح بلس" : "Unlock Plus"}
          />
        </section>

        <section className="mt-8 rounded-2xl border border-cyan-100/20 bg-cyan-100/[0.045] p-5 text-start shadow-2xl backdrop-blur">
          <p className="ui-kicker text-cyan-100/80">{isArabic ? "لماذا يدفع المستخدم؟" : "Why users upgrade"}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
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

function PlanCard({ title, price, description, features, actionHref, actionLabel, featured = false }: { title: string; price: string; description: string; features: string[]; actionHref: string; actionLabel: string; featured?: boolean }) {
  return (
    <section className={`rounded-2xl border p-5 shadow-2xl backdrop-blur ${featured ? "border-gold/45 bg-gold/[0.075]" : "border-white/10 bg-white/[0.035]"}`}>
      <div className="flex items-start justify-between gap-3">
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
      <Link href={actionHref} className={`ui-action mt-5 inline-flex w-full justify-center rounded-full px-4 py-3 text-sm transition-colors ${featured ? "bg-gold text-ink hover:bg-bone" : "border border-white/10 text-bone/72 hover:border-gold/45 hover:text-gold"}`}>
        {actionLabel}
      </Link>
    </section>
  );
}
