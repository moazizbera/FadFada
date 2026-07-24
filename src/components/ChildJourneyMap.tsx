"use client";

type Milestone = {
  id: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  emoji: string;
  completed: boolean;
  unlocked: boolean;
};

type Language = "ar" | "en";

type ChildJourneyMapProps = {
  language: Language;
  milestones: Milestone[];
  currentLevel: number;
  totalPoints: number;
};

export function ChildJourneyMap({
  language,
  milestones,
  currentLevel,
  totalPoints,
}: ChildJourneyMapProps) {
  const isArabic = language === "ar";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="font-arsans text-xl font-bold text-amber-100" dir={isArabic ? "rtl" : "ltr"}>
          {isArabic ? "رحلة المغامرة" : "Adventure Journey"}
        </h3>
        <div className="mt-2 flex items-center justify-center gap-2">
          <span className="text-lg">🎯</span>
          <span className="font-arsans text-sm text-bone/60" dir={isArabic ? "rtl" : "ltr"}>
            {isArabic ? "المستوى" : "Level"} {currentLevel}
          </span>
        </div>
      </div>

      {/* Journey path */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-amber-200/30 via-white/20 to-white/10" />

        {/* Milestones */}
        <div className="space-y-4">
          {milestones.map((milestone, index) => (
            <div
              key={milestone.id}
              className={`relative flex items-start gap-4 transition-all duration-300 ${
                !milestone.unlocked ? "opacity-40" : ""
              }`}
            >
              {/* Node */}
              <div
                className={`relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 text-lg transition-all duration-300 ${
                  milestone.completed
                    ? "border-amber-200 bg-amber-200/20 shadow-[0_0_20px_rgba(201,168,106,0.3)]"
                    : milestone.unlocked
                    ? "border-white/30 bg-white/10"
                    : "border-white/10 bg-white/[0.03]"
                }`}
              >
                {milestone.completed ? (
                  <span className="text-amber-200">✓</span>
                ) : (
                  <span className={milestone.unlocked ? "" : "grayscale"}>{milestone.emoji}</span>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pt-1.5">
                <p
                  className={`font-arsans text-sm font-bold ${
                    milestone.completed
                      ? "text-amber-100"
                      : milestone.unlocked
                      ? "text-bone/80"
                      : "text-bone/40"
                  }`}
                  dir={isArabic ? "rtl" : "ltr"}
                >
                  {isArabic ? milestone.titleAr : milestone.titleEn}
                </p>
                <p
                  className="mt-0.5 font-arsans text-xs text-bone/40"
                  dir={isArabic ? "rtl" : "ltr"}
                >
                  {isArabic ? milestone.descriptionAr : milestone.descriptionEn}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
