"use client";

import Image from "next/image";

type Companion = {
  id: string;
  nameAr: string;
  nameEn: string;
  emoji: string;
  descriptionAr: string;
  descriptionEn: string;
  avatar: string;
  ageGroup: string;
  personality: string;
};

type Language = "ar" | "en";

type ChildCompanionPickerProps = {
  language: Language;
  companions: Companion[];
  selectedId: string;
  onSelect: (companion: Companion) => void;
  onClose: () => void;
};

const companionBackgrounds = [
  "from-blue-500/20 to-purple-500/20",
  "from-amber-500/20 to-orange-500/20",
  "from-green-500/20 to-emerald-500/20",
  "from-pink-500/20 to-rose-500/20",
  "from-cyan-500/20 to-sky-500/20",
  "from-yellow-500/20 to-amber-500/20",
];

export function ChildCompanionPicker({
  language,
  companions,
  selectedId,
  onSelect,
  onClose,
}: ChildCompanionPickerProps) {
  const isArabic = language === "ar";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0E0D10]/95 backdrop-blur-md">
      <div className="mx-auto w-full max-w-lg px-4">
        {/* Header */}
        <div className="mb-6 text-center">
          <h2 className="font-arsans text-2xl font-bold text-amber-100" dir={isArabic ? "rtl" : "ltr"}>
            {isArabic ? "اختر رفيقك!" : "Choose your buddy!"}
          </h2>
          <p className="mt-1 font-arsans text-sm text-bone/60" dir={isArabic ? "rtl" : "ltr"}>
            {isArabic ? "كل رفيق يحمل شخصية مختلفة" : "Each buddy has a different personality"}
          </p>
        </div>

        {/* Companion cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {companions.map((companion, index) => {
            const isSelected = companion.id === selectedId;
            const bgGradient = companionBackgrounds[index % companionBackgrounds.length];

            return (
              <button
                key={companion.id}
                type="button"
                onClick={() => onSelect(companion)}
                className={`group relative flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all duration-200 ${
                  isSelected
                    ? "border-amber-200/60 bg-gradient-to-br from-amber-200/20 to-amber-200/5 shadow-[0_8px_32px_rgba(201,168,106,0.25)]"
                    : "border-white/10 bg-gradient-to-br " + bgGradient + " hover:border-white/25 hover:shadow-lg"
                }`}
              >
                {/* Avatar */}
                <div className="relative h-20 w-20 overflow-hidden rounded-2xl border-2 border-white/20 bg-[#1A171C] sm:h-24 sm:w-24">
                  <Image
                    src={companion.avatar}
                    alt={companion.nameEn}
                    width={96}
                    height={96}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                </div>

                {/* Name */}
                <span className="font-arsans text-base font-bold text-bone/90" dir={isArabic ? "rtl" : "ltr"}>
                  {isArabic ? companion.nameAr : companion.nameEn}
                </span>

                {/* Emoji badge */}
                <span className="text-2xl">{companion.emoji}</span>

                {/* Selected indicator */}
                {isSelected && (
                  <span className="absolute -top-2 -right-2 grid h-6 w-6 place-items-center rounded-full bg-amber-200 text-xs text-[#0E0D10] shadow-md">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl border border-white/15 bg-white/[0.05] py-3 font-arsans text-sm font-semibold text-bone/70 transition-all hover:bg-white/[0.1] hover:text-bone"
        >
          {isArabic ? "إغلاق" : "Close"}
        </button>
      </div>
    </div>
  );
}
