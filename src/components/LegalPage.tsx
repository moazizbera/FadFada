"use client";

import Link from "next/link";
import { useAppLocale } from "./AppShell";

type LocalizedText = {
  en: string;
  ar: string;
};

type LegalPageProps = {
  eyebrow: LocalizedText;
  title: LocalizedText;
  updated: LocalizedText;
  intro: LocalizedText;
  sections: Array<{
    title: LocalizedText;
    body: LocalizedText;
  }>;
};

export function LegalPage({ eyebrow, title, updated, intro, sections }: LegalPageProps) {
  const { language, direction } = useAppLocale();
  const isArabic = language === "ar";

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 pb-20 pt-28" dir={direction}>
      <div className="mb-10">
        <Link href="/" className="ui-action text-bone/55 transition-colors hover:text-gold">
          {isArabic ? "العودة إلى فضفضة" : "Back to FadFada"}
        </Link>
        <p className="ui-kicker mt-8">{eyebrow[language]}</p>
        <h1 className="mt-3 font-enserif text-4xl leading-tight text-bone sm:text-5xl">{title[language]}</h1>
        <p className="mt-4 font-arsans text-sm text-bone/50">{updated[language]}</p>
        <p className="mt-7 max-w-2xl font-arsans text-base leading-8 text-bone/74">{intro[language]}</p>
      </div>

      <div className="grid gap-5">
        {sections.map((section) => (
          <section key={section.title.en} className="luxury-surface rounded-2xl p-5">
            <h2 className="font-arsans text-lg font-semibold text-bone">{section.title[language]}</h2>
            <p className="mt-3 font-arsans text-sm leading-7 text-bone/68">{section.body[language]}</p>
          </section>
        ))}
      </div>
    </main>
  );
}