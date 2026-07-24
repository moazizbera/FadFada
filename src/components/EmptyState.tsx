"use client";

type Language = "ar" | "en";

type EmptyStateType = "no-conversations" | "no-homework" | "no-stories" | "no-saved" | "no-results";

type EmptyStateProps = {
  language: Language;
  type: EmptyStateType;
  onAction?: () => void;
};

const emptyStates: Record<EmptyStateType, Record<Language, { title: string; description: string; actionLabel?: string; illustration: string }>> = {
  "no-conversations": {
    ar: { title: "محادثاتك هنا", description: "ابدأ أول محادثة مع رفيقك. اكتب ما تشعر به أو اختر نشاطاً.", actionLabel: "ابدأ المحادثة", illustration: "💬" },
    en: { title: "Your conversations appear here", description: "Start your first chat with your buddy. Write how you feel or pick an activity.", actionLabel: "Start chatting", illustration: "💬" },
  },
  "no-homework": {
    ar: { title: "لا واجبات بعد", description: "سيظهر الواجب هنا عندما يرسله ولي الأمر.", actionLabel: "العودة", illustration: "📚" },
    en: { title: "No homework yet", description: "Homework will appear here when your parent sends it.", actionLabel: "Go back", illustration: "📚" },
  },
  "no-stories": {
    ar: { title: "القصص في الطريق", description: "قريباً ستتمكن من قراءة قصص تفاعلية مع رفيقك.", actionLabel: "العودة", illustration: "📖" },
    en: { title: "Stories coming soon", description: "Soon you'll be able to read interactive stories with your buddy.", actionLabel: "Go back", illustration: "📖" },
  },
  "no-saved": {
    ar: { title: "لم تحفظ أي لحظة بعد", description: "عندما تحفظ لحظة جميلة، ستظهر هنا.", actionLabel: "العودة", illustration: "⭐" },
    en: { title: "No saved moments yet", description: "When you save a special moment, it will appear here.", actionLabel: "Go back", illustration: "⭐" },
  },
  "no-results": {
    ar: { title: "لا نتائج", description: "جرّب البحث بكلمات مختلفة.", actionLabel: "مسح البحث", illustration: "🔍" },
    en: { title: "No results found", description: "Try searching with different words.", actionLabel: "Clear search", illustration: "🔍" },
  },
};

const illustrationSvgs: Record<EmptyStateType, string> = {
  "no-conversations": "M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z",
  "no-homework": "M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z",
  "no-stories": "M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z",
  "no-saved": "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z",
  "no-results": "M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
};

export function EmptyState({ language, type, onAction }: EmptyStateProps) {
  const isArabic = language === "ar";
  const state = emptyStates[type][language];
  const svgPath = illustrationSvgs[type];

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      {/* Illustrated icon */}
      <div className="relative mb-6">
        <div className="grid h-24 w-24 place-items-center rounded-3xl border border-white/10 bg-white/[0.04]">
          <svg viewBox="0 0 24 24" className="h-10 w-10 text-bone/25" fill="currentColor">
            <path d={svgPath} />
          </svg>
        </div>
        <span className="absolute -bottom-2 -right-2 text-3xl">{state.illustration}</span>
      </div>

      {/* Text */}
      <h3 className="font-arsans text-lg font-bold text-bone/80" dir={isArabic ? "rtl" : "ltr"}>
        {state.title}
      </h3>
      <p className="mt-2 max-w-xs font-arsans text-sm text-bone/45 leading-relaxed" dir={isArabic ? "rtl" : "ltr"}>
        {state.description}
      </p>

      {/* Action button */}
      {state.actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-6 rounded-full border border-amber-200/30 bg-amber-200/10 px-5 py-2.5 font-arsans text-sm font-semibold text-amber-100 transition-all hover:bg-amber-200/20 hover:border-amber-200/50 active:scale-[0.97]"
        >
          {state.actionLabel}
        </button>
      )}
    </div>
  );
}
