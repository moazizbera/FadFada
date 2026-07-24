"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Language = "ar" | "en";

type ChildWelcomeScreenProps = {
  language: Language;
  childName: string;
  avatarPath: string;
  gamePoints: number;
  onEnter: () => void;
  onBrowseCompanions: () => void;
  onOpenStoryShelf: () => void;
};

const greetingMessages: Record<Language, string[]> = {
  ar: [
    "مرحباً يا بطل!",
    "أهلاً يا نجم!",
    "很高兴见到ك!",
  ],
  en: [
    "Hello, hero!",
    "Welcome back, star!",
    "Great to see you!",
  ],
};

const dailyQuestLabels: Record<Language, Array<{ emoji: string; label: string; hint: string }>> = {
  ar: [
    { emoji: "📚", label: "اقرأ قصة اليوم", hint: "قصة جديدة تنتظرك" },
    { emoji: "🧩", label: "حل لغز", hint: "اختبر ذكاءك" },
    { emoji: "🎨", label: "اختبر رفيقك", hint: "اختر صديقاً جديداً" },
    { emoji: "💪", label: "تحدي صغير", hint: "أكمل مهمة اليوم" },
  ],
  en: [
    { emoji: "📚", label: "Read today's story", hint: "A new story awaits" },
    { emoji: "🧩", label: "Solve a riddle", hint: "Test your brain" },
    { emoji: "🎨", label: "Meet a buddy", hint: "Choose a new friend" },
    { emoji: "💪", label: "Tiny challenge", hint: "Complete a quest" },
  ],
};

const starBursts = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  left: `${8 + Math.random() * 84}%`,
  top: `${8 + Math.random() * 84}%`,
  delay: `${i * 0.35}s`,
  size: 8 + Math.random() * 16,
}));

export function ChildWelcomeScreen({
  language,
  childName,
  avatarPath,
  gamePoints,
  onEnter,
  onBrowseCompanions,
  onOpenStoryShelf,
}: ChildWelcomeScreenProps) {
  const isArabic = language === "ar";
  const [greetingIndex, setGreetingIndex] = useState(0);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setGreetingIndex((prev) => (prev + 1) % greetingMessages[language].length);
    }, 4000);
    return () => clearInterval(interval);
  }, [language]);

  const quests = dailyQuestLabels[language];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0E0D10]">
      {/* Animated star background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {starBursts.map((star) => (
          <span
            key={star.id}
            className="absolute animate-pulse rounded-full bg-amber-200/40"
            style={{
              left: star.left,
              top: star.top,
              width: star.size,
              height: star.size,
              animationDelay: star.delay,
              animationDuration: "3s",
            }}
          />
        ))}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(201,168,106,0.12),transparent_60%)]" />
      </div>

      {/* Content */}
      <div className={`relative z-10 mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 py-12 transition-all duration-700 ${showContent ? "opacity-100" : "translate-y-6 opacity-0"}`}>
        {/* Avatar greeting */}
        <div className="relative mb-6">
          <div className="h-28 w-28 overflow-hidden rounded-[2rem] border-4 border-amber-200/30 bg-[#1A171C] shadow-[0_0_60px_rgba(201,168,106,0.2)]">
            <Image
              src={avatarPath}
              alt={childName}
              width={112}
              height={112}
              className="h-full w-full object-cover"
              unoptimized
            />
          </div>
          <span className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full border-2 border-amber-200/40 bg-amber-200 text-lg shadow-lg">
            ⭐
          </span>
        </div>

        {/* Rotating greeting */}
        <h1 className="font-arsans text-3xl font-bold text-amber-100 sm:text-4xl" dir={isArabic ? "rtl" : "ltr"}>
          {greetingMessages[language][greetingIndex]}
        </h1>
        <p className="mt-2 font-arsans text-lg text-bone/70" dir={isArabic ? "rtl" : "ltr"}>
          {childName}
        </p>

        {/* Points badge */}
        <div className="mt-4 flex items-center gap-2 rounded-full border border-amber-200/25 bg-amber-200/10 px-5 py-2">
          <span className="text-xl">🏆</span>
          <span className="font-arsans text-sm font-bold text-amber-100">
            {gamePoints} {isArabic ? "نجمة" : "stars"}
          </span>
        </div>

        {/* Today's activities */}
        <div className="mt-8 w-full">
          <p className="mb-3 text-center font-arsans text-sm font-semibold text-bone/50" dir={isArabic ? "rtl" : "ltr"}>
            {isArabic ? " اليوم" : "Today's adventure"}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {quests.map((quest, index) => (
              <button
                key={quest.label}
                type="button"
                onClick={index === 2 ? onBrowseCompanions : index === 0 ? onOpenStoryShelf : onEnter}
                className="group flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition-all duration-200 hover:border-amber-200/35 hover:bg-amber-200/[0.08] hover:shadow-[0_8px_30px_rgba(201,168,106,0.12)]"
              >
                <span className="text-3xl transition-transform duration-200 group-hover:scale-110">{quest.emoji}</span>
                <span className="font-arsans text-xs font-bold text-bone/80" dir={isArabic ? "rtl" : "ltr"}>
                  {quest.label}
                </span>
                <span className="font-arsans text-[10px] text-bone/40" dir={isArabic ? "rtl" : "ltr"}>
                  {quest.hint}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Main CTA */}
        <button
          type="button"
          onClick={onEnter}
          className="mt-8 w-full rounded-2xl bg-gradient-to-r from-amber-200 to-amber-300 px-6 py-4 font-arsans text-lg font-bold text-[#0E0D10] shadow-[0_8px_32px_rgba(201,168,106,0.3)] transition-all duration-200 hover:shadow-[0_12px_40px_rgba(201,168,106,0.4)] hover:brightness-110 active:scale-[0.98]"
        >
          {isArabic ? "ابدأ المغامرة!" : "Start Adventure!"}
        </button>

        {/* Safety badge */}
        <p className="mt-6 flex items-center gap-1.5 font-arsans text-[11px] text-bone/35">
          <span>🛡️</span>
          <span dir={isArabic ? "rtl" : "ltr"}>
            {isArabic ? "مساحتك الآمنة" : "Your safe space"}
          </span>
        </p>
      </div>
    </div>
  );
}
