"use client";

import Image from "next/image";
import { useState } from "react";

type Language = "ar" | "en";

type OnboardingStep = "welcome" | "mood" | "companion" | "ready";

type OnboardingFlowProps = {
  language: Language;
  userName?: string;
  onComplete: (selectedMood: string, selectedCompanionId?: string) => void;
  onSkip: () => void;
};

const moodOptions: Record<Language, Array<{ id: string; emoji: string; label: string }>> = {
  ar: [
    { id: "happy", emoji: "😊", label: "سعيد" },
    { id: "calm", emoji: "😌", label: "هادئ" },
    { id: "worried", emoji: "😟", label: "قلق" },
    { id: "sad", emoji: "😢", label: "حزين" },
    { id: "angry", emoji: "😤", label: "زعلان" },
    { id: "tired", emoji: "😴", label: "متعب" },
  ],
  en: [
    { id: "happy", emoji: "😊", label: "Happy" },
    { id: "calm", emoji: "😌", label: "Calm" },
    { id: "worried", emoji: "😟", label: "Worried" },
    { id: "sad", emoji: "😢", label: "Sad" },
    { id: "angry", emoji: "😤", label: "Angry" },
    { id: "tired", emoji: "😴", label: "Tired" },
  ],
};

const companionSuggestions: Record<Language, Array<{ id: string; nameAr: string; nameEn: string; emoji: string; avatar: string; tagAr: string; tagEn: string }>> = {
  ar: [
    { id: "noor", nameAr: "نور", nameEn: "Noor", emoji: "🌟", avatar: "/avatars/noor.png", tagAr: "لطيفة ودافئة", tagEn: "Gentle and warm" },
    { id: "zaid", nameAr: "زيد", nameEn: "Zaid", emoji: "🚀", avatar: "/avatars/zaid.png", tagAr: "مغامر شجاع", tagEn: "Brave adventurer" },
    { id: "layla", nameAr: "ليلى", nameEn: "Layla", emoji: "🌙", avatar: "/avatars/layla.png", tagAr: "حكيمة وهادئة", tagEn: "Wise and calm" },
    { id: "omar", nameAr: "عمر", nameEn: "Omar", emoji: "💡", avatar: "/avatars/omar.png", tagAr: "محب للاستكشاف", tagEn: "Curious explorer" },
  ],
  en: [
    { id: "noor", nameAr: "نور", nameEn: "Noor", emoji: "🌟", avatar: "/avatars/noor.png", tagAr: "لطيفة ودافئة", tagEn: "Gentle and warm" },
    { id: "zaid", nameAr: "زيد", nameEn: "Zaid", emoji: "🚀", avatar: "/avatars/zaid.png", tagAr: "مغامر شجاع", tagEn: "Brave adventurer" },
    { id: "layla", nameAr: "ليلى", nameEn: "Layla", emoji: "🌙", avatar: "/avatars/layla.png", tagAr: "حكيمة وهادئة", tagEn: "Wise and calm" },
    { id: "omar", nameAr: "عمر", nameEn: "Omar", emoji: "💡", avatar: "/avatars/omar.png", tagAr: "محب للاستكشاف", tagEn: "Curious explorer" },
  ],
};

export function OnboardingFlow({ language, userName, onComplete, onSkip }: OnboardingFlowProps) {
  const isArabic = language === "ar";
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedCompanion, setSelectedCompanion] = useState<string | null>(null);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");

  function goForward(next: OnboardingStep) {
    setDirection("forward");
    setStep(next);
  }

  function goBack() {
    setDirection("backward");
    if (step === "mood") setStep("welcome");
    else if (step === "companion") setStep("mood");
  }

  function handleComplete() {
    onComplete(selectedMood ?? "calm", selectedCompanion ?? undefined);
  }

  const slideClass = direction === "forward" ? "animate-slide-in-right" : "animate-slide-in-left";

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-[#0E0D10]">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 pt-8">
        {(["welcome", "mood", "companion", "ready"] as OnboardingStep[]).map((s, i) => (
          <span
            key={s}
            className={`h-2 rounded-full transition-all duration-300 ${
              s === step
                ? "w-6 bg-amber-200"
                : i < (["welcome", "mood", "companion", "ready"] as OnboardingStep[]).indexOf(step)
                ? "w-2 bg-amber-200/50"
                : "w-2 bg-white/20"
            }`}
          />
        ))}
      </div>

      {/* Skip button */}
      {step !== "ready" && (
        <button
          type="button"
          onClick={onSkip}
          className="absolute right-4 top-8 font-arsans text-xs text-bone/40 transition-colors hover:text-bone/70"
          dir={isArabic ? "rtl" : "ltr"}
        >
          {isArabic ? "تخطي" : "Skip"}
        </button>
      )}

      {/* Content */}
      <div className="flex flex-1 items-center justify-center px-6">
        <div key={step} className={`w-full max-w-md ${slideClass}`}>
          {step === "welcome" && (
            <div className="text-center">
              <div className="mb-6 text-6xl">🌍</div>
              <h1 className="font-arsans text-3xl font-bold text-amber-100" dir={isArabic ? "rtl" : "ltr"}>
                {isArabic ? `أهلاً${userName ? ` ${userName}` : ""}!` : `Welcome${userName ? ` ${userName}` : ""}!`}
              </h1>
              <p className="mt-3 font-arsans text-base text-bone/60" dir={isArabic ? "rtl" : "ltr"}>
                {isArabic
                  ? "فضفضة مكانك الآمن للتعبير عن شعورك والحصول على خطوة صغيرة نحو الأفضل."
                  : "FadFada is your safe space to express how you feel and take one small step forward."}
              </p>
              <button
                type="button"
                onClick={() => goForward("mood")}
                className="mt-8 w-full rounded-2xl bg-gradient-to-r from-amber-200 to-amber-300 px-6 py-4 font-arsans text-lg font-bold text-[#0E0D10] shadow-[0_8px_32px_rgba(201,168,106,0.3)] transition-all hover:brightness-110 active:scale-[0.98]"
              >
                {isArabic ? "ابدأ الرحلة" : "Start the journey"}
              </button>
            </div>
          )}

          {step === "mood" && (
            <div>
              <h2 className="text-center font-arsans text-2xl font-bold text-amber-100" dir={isArabic ? "rtl" : "ltr"}>
                {isArabic ? "كيف حالك اليوم؟" : "How are you today?"}
              </h2>
              <p className="mt-2 text-center font-arsans text-sm text-bone/50" dir={isArabic ? "rtl" : "ltr"}>
                {isArabic ? "اختر ما يشبه شعورك" : "Pick what matches your feeling"}
              </p>
              <div className="mt-6 grid grid-cols-3 gap-3">
                {moodOptions[language].map((mood) => (
                  <button
                    key={mood.id}
                    type="button"
                    onClick={() => {
                      setSelectedMood(mood.id);
                      goForward("companion");
                    }}
                    className={`group flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all duration-200 ${
                      selectedMood === mood.id
                        ? "border-amber-200/50 bg-amber-200/10 shadow-[0_0_20px_rgba(201,168,106,0.15)]"
                        : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]"
                    }`}
                  >
                    <span className="text-3xl transition-transform duration-200 group-hover:scale-110">{mood.emoji}</span>
                    <span className="font-arsans text-sm text-bone/80">{mood.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === "companion" && (
            <div>
              <h2 className="text-center font-arsans text-2xl font-bold text-amber-100" dir={isArabic ? "rtl" : "ltr"}>
                {isArabic ? "اختر رفيقك" : "Choose your buddy"}
              </h2>
              <p className="mt-2 text-center font-arsans text-sm text-bone/50" dir={isArabic ? "rtl" : "ltr"}>
                {isArabic ? "رفيقك سي accompaniesك في الرحلة" : "Your buddy will accompany you"}
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {companionSuggestions[language].map((companion) => (
                  <button
                    key={companion.id}
                    type="button"
                    onClick={() => setSelectedCompanion(companion.id)}
                    className={`group flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all duration-200 ${
                      selectedCompanion === companion.id
                        ? "border-amber-200/50 bg-amber-200/10 shadow-[0_0_20px_rgba(201,168,106,0.15)]"
                        : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="relative h-14 w-14 overflow-hidden rounded-xl border-2 border-white/20 bg-[#1A171C]">
                      <img src={companion.avatar} alt={companion.nameEn} className="h-full w-full object-cover" />
                    </div>
                    <span className="font-arsans text-sm font-bold text-bone/90" dir={isArabic ? "rtl" : "ltr"}>
                      {isArabic ? companion.nameAr : companion.nameEn}
                    </span>
                    <span className="text-lg">{companion.emoji}</span>
                    <span className="font-arsans text-[10px] text-bone/40" dir={isArabic ? "rtl" : "ltr"}>
                      {isArabic ? companion.tagAr : companion.tagEn}
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => goForward("ready")}
                disabled={!selectedCompanion}
                className="mt-6 w-full rounded-2xl bg-gradient-to-r from-amber-200 to-amber-300 px-6 py-3 font-arsans text-sm font-bold text-[#0E0D10] shadow-[0_8px_32px_rgba(201,168,106,0.3)] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:hover:brightness-100"
              >
                {isArabic ? "التالي" : "Next"}
              </button>
            </div>
          )}

          {step === "ready" && (
            <div className="text-center">
              <div className="mb-6 animate-bounce-gentle text-6xl">🎉</div>
              <h2 className="font-arsans text-3xl font-bold text-amber-100" dir={isArabic ? "rtl" : "ltr"}>
                {isArabic ? "كل شيء جاهز!" : "All set!"}
              </h2>
              <p className="mt-3 font-arsans text-base text-bone/60" dir={isArabic ? "rtl" : "ltr"}>
                {isArabic
                  ? "ابدأ بالكتابة أو اضغط زر المحادثة. رفيقك بانتظارك."
                  : "Start writing or tap the chat button. Your buddy is waiting."}
              </p>
              <button
                type="button"
                onClick={handleComplete}
                className="mt-8 w-full rounded-2xl bg-gradient-to-r from-amber-200 to-amber-300 px-6 py-4 font-arsans text-lg font-bold text-[#0E0D10] shadow-[0_8px_32px_rgba(201,168,106,0.3)] transition-all hover:brightness-110 active:scale-[0.98]"
              >
                {isArabic ? "تفضل بالدخول" : "Let's go!"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Back button */}
      {step !== "welcome" && (
        <div className="flex justify-center pb-8">
          <button
            type="button"
            onClick={goBack}
            className="font-arsans text-sm text-bone/40 transition-colors hover:text-bone/70"
            dir={isArabic ? "rtl" : "ltr"}
          >
            {isArabic ? "→ رجوع" : "← Back"}
          </button>
        </div>
      )}
    </div>
  );
}
