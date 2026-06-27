"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { FAMILY_LABELS, personas, type Persona, type PersonaFamily, type PersonaId } from "../lib/personas";

type Language = "ar" | "en";

type PersonaDrawerProps = {
  open: boolean;
  activePersona: PersonaId;
  language: Language;
  unlockedPersonaIds: PersonaId[];
  customPersona: Persona | null;
  onClose: () => void;
  onSelect: (personaId: PersonaId) => void;
  onLockedPersonaSelect: (personaId: PersonaId) => void;
  onCustomPersonaSave: (draft: { name: string; description: string; avatarPath?: string }) => void;
  onAvatarRate: (persona: Persona, rating: number) => Promise<boolean>;
};

const avatarFrameClass = "relative aspect-square overflow-hidden rounded-[2rem] border border-white/10 bg-[#0E0D10] shadow-2xl";
const generatedAvatarStorageKey = "fadfada-generated-avatar-count";
const freeGeneratedAvatarLimit = 3;
const selectorFamilies: PersonaFamily[] = ["listen", "build"];
const customAvatarOptions = [
  { path: "/profile-logos/calm.svg", ar: "هادئ", en: "Calm" },
  { path: "/profile-logos/spark.svg", ar: "نشط", en: "Spark" },
  { path: "/profile-logos/cedar.svg", ar: "حكيم", en: "Wise" },
  { path: "/profile-logos/moon.svg", ar: "ليلي", en: "Moon" },
  { path: "/profile-logos/wave.svg", ar: "ناعم", en: "Wave" },
  { path: "/profile-logos/terracotta.svg", ar: "دافئ", en: "Warm" },
];

const selectorPersonaIds = [
  "omar",
  "sami",
  "maryam",
  "nema",
  "sanad",
  "rawi",
  "poetry_bot",
  "layl",
  "nora",
  "kareem",
  "malik",
  "malik_alt",
  "sheikh",
  "grandmaster",
  "zein",
  "logoz",
  "screenwriter",
  "dania",
  "adam",
  "ryan",
  "layan",
  "wamda",
  "radar",
  "sarah",
  "sarah_alt",
  "tareq",
] as const;
type SelectorPersonaId = (typeof selectorPersonaIds)[number];

const personaNeedRecommendations: Array<{ id: PersonaId; ar: string; en: string; hintAr: string; hintEn: string }> = [
  { id: "omar", ar: "اسمعني", en: "Listen", hintAr: "حضور هادئ", hintEn: "Calm presence" },
  { id: "nora", ar: "خطوة عملية", en: "Plan", hintAr: "تنفيذ سريع", hintEn: "Action steps" },
  { id: "rawi", ar: "حكاية", en: "Story", hintAr: "مسافة رمزية", hintEn: "Symbolic distance" },
  { id: "sami", ar: "طمأنينة", en: "Comfort", hintAr: "حكمة ناعمة", hintEn: "Gentle wisdom" },
  { id: "logoz", ar: "حل لغز", en: "Solve", hintAr: "أسئلة ذكية", hintEn: "Sharp questions" },
];

type AvatarPresentation = {
  avatarPath: string;
  nameAr: string;
  nameEn: string;
  auraHex: string;
};

const avatarPresentationById: Partial<Record<SelectorPersonaId, AvatarPresentation>> = {
  omar: { avatarPath: "/avatars/omar.png", nameAr: "عمر", nameEn: "Omar", auraHex: "#5C7C6B" },
  sami: { avatarPath: "/avatars/sami.png", nameAr: "عم سامي", nameEn: "Uncle Sami", auraHex: "#C9A86A" },
  nora: { avatarPath: "/avatars/nora.png", nameAr: "نورا", nameEn: "Nora", auraHex: "#8B7BB8" },
  kareem: { avatarPath: "/avatars/kareem.png", nameAr: "كابتن كريم", nameEn: "Captain Kareem", auraHex: "#22C55E" },
  malik: { avatarPath: "/avatars/malik.png", nameAr: "مالك", nameEn: "Malik GamerX", auraHex: "#06B6D4" },
  sheikh: { avatarPath: "/avatars/sheikh.png", nameAr: "مهندس المليار", nameEn: "The Silicon Sheikh", auraHex: "#A855F7" },
  zein: { avatarPath: "/avatars/zein.png", nameAr: "بروفيسور زين", nameEn: "Professor Zein", auraHex: "#22C55E" },
  screenwriter: { avatarPath: "/avatars/screenwriter.png", nameAr: "المخرج الرقمي", nameEn: "The Screenwriter", auraHex: "#A855F7" },
  layl: { avatarPath: "/avatars/layl.png", nameAr: "دي جي ليل", nameEn: "DJ Layl", auraHex: "#06B6D4" },
  rawi: { avatarPath: "/avatars/rawi.png", nameAr: "راوية", nameEn: "Rawiya", auraHex: "#D4724A" },
};

function isSelectorPersonaId(value: string): value is SelectorPersonaId {
  return selectorPersonaIds.includes(value as SelectorPersonaId);
}

function getAvatarPresentation(persona: Persona): AvatarPresentation {
  const presentation = isSelectorPersonaId(persona.id) ? avatarPresentationById[persona.id] : undefined;
  return presentation ?? { avatarPath: persona.avatarPath, nameAr: persona.nameAr, nameEn: persona.nameEn, auraHex: persona.glowColorHex };
}

function getPersonaDisplayName(persona: Persona, language: Language) {
  return language === "ar" ? persona.nameAr : persona.nameEn;
}

function getPersonaRole(persona: Persona, language: Language) {
  return language === "ar" ? persona.roleAr : persona.roleEn;
}

function isGeneratedAvatarPath(value: string | undefined) {
  return Boolean(value && value.startsWith("data:image/"));
}

function isSvgAvatarPath(value: string | undefined) {
  return Boolean(value?.endsWith(".svg"));
}

function AvatarImage({ src, alt, sizes = "180px", priority = false }: { src: string; alt: string; sizes?: string; priority?: boolean }) {
  if (isGeneratedAvatarPath(src) || isSvgAvatarPath(src)) {
    return <img src={src} alt={alt} className="h-full w-full object-cover" />;
  }

  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />;
}

function LockIcon() {
  return (
    <svg className="h-6 w-6 text-[#C9A86A]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7.75 10.5V8.25C7.75 5.9 9.65 4 12 4s4.25 1.9 4.25 4.25v2.25" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M6.5 10.5h11A1.5 1.5 0 0 1 19 12v5.5A2.5 2.5 0 0 1 16.5 20h-9A2.5 2.5 0 0 1 5 17.5V12a1.5 1.5 0 0 1 1.5-1.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M12 14v2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function PersonaDrawer({
  open,
  activePersona,
  language,
  unlockedPersonaIds,
  customPersona,
  onClose,
  onSelect,
  onLockedPersonaSelect,
  onCustomPersonaSave,
  onAvatarRate,
}: PersonaDrawerProps) {
  const [customName, setCustomName] = useState(customPersona?.nameAr || "");
  const [customDescription, setCustomDescription] = useState(customPersona?.coreSystemPrompt || "");
  const [customAvatarPath, setCustomAvatarPath] = useState(customPersona?.avatarPath || customAvatarOptions[0].path);
  const [ratedAvatars, setRatedAvatars] = useState<Record<string, number>>({});
  const [ratingStatus, setRatingStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [generatedAvatarCount, setGeneratedAvatarCount] = useState(0);
  const [avatarGenerationStatus, setAvatarGenerationStatus] = useState<"idle" | "generating" | "saved" | "limit" | "error">("idle");
  const isArabic = language === "ar";
  const personaSource = customPersona ? [...personas, customPersona] : personas;
  const selectorPersonas = selectorPersonaIds
    .map((personaId) => personas.find((persona) => persona.id === personaId))
    .filter((persona): persona is Persona => Boolean(persona));
  const selectedPersona = personaSource.find((persona) => persona.id === activePersona) || selectorPersonas[0] || personaSource[0];
  const personaCards = selectorPersonas.map((persona) => {
    const presentation = getAvatarPresentation(persona);

    return {
      persona,
      presentation,
      displayName: language === "ar" ? presentation.nameAr : presentation.nameEn,
      role: getPersonaRole(persona, language),
      locked: !unlockedPersonaIds.includes(persona.id),
      selected: activePersona === persona.id,
    };
  });
  const personaCardsByFamily = selectorFamilies.map((family) => ({
    family,
    label: FAMILY_LABELS[family],
    cards: personaCards.filter(({ persona }) => persona.family === family),
  }));

  function chooseRecommendedPersona(personaId: PersonaId) {
    if (!unlockedPersonaIds.includes(personaId)) {
      onLockedPersonaSelect(personaId);
      return;
    }

    onSelect(personaId);
    onClose();
  }

  function submitCustomPersona(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!customName.trim() || !customDescription.trim()) return;

    onCustomPersonaSave({ name: customName, description: customDescription, avatarPath: customAvatarPath });
    onClose();
  }

  async function rateSelectedAvatar(persona: Persona, rating: number) {
    if (ratingStatus === "saving") return;

    setRatingStatus("saving");
    const saved = await onAvatarRate(persona, rating);
    if (saved) {
      setRatedAvatars((currentRatings) => ({ ...currentRatings, [persona.id]: rating }));
      setRatingStatus("saved");
      return;
    }

    setRatingStatus("error");
  }

  async function generateCustomAvatar() {
    if (!customName.trim() || !customDescription.trim()) {
      setAvatarGenerationStatus("error");
      return;
    }

    if (generatedAvatarCount >= freeGeneratedAvatarLimit) {
      setAvatarGenerationStatus("limit");
      return;
    }

    setAvatarGenerationStatus("generating");
    const response = await fetch("/api/avatar/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: customName, description: customDescription, language }),
    }).catch(() => null);

    if (!response?.ok) {
      setAvatarGenerationStatus("error");
      return;
    }

    const data = (await response.json()) as { imageDataUrl?: string; model?: string };
    if (!data.imageDataUrl?.startsWith("data:image/")) {
      setAvatarGenerationStatus("error");
      return;
    }

    const nextCount = generatedAvatarCount + 1;
    localStorage.setItem(generatedAvatarStorageKey, String(nextCount));
    setGeneratedAvatarCount(nextCount);
    setCustomAvatarPath(data.imageDataUrl);
    setAvatarGenerationStatus("saved");
    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: "avatar_generate", metadata: { language, model: data.model || "nano-banana", count: nextCount } }),
    }).catch(() => null);
  }

  async function startAvatarUpgrade() {
    setAvatarGenerationStatus("limit");
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentLanguage: language, product: "avatar_generation", priceId: process.env.NEXT_PUBLIC_AVATAR_GENERATION_PRICE_ID }),
    }).catch(() => null);
    const data = response ? ((await response.json()) as { url?: string }) : null;
    if (data?.url) window.location.assign(data.url);
  }

  useEffect(() => {
    setCustomName(customPersona?.nameAr || "");
    setCustomDescription(customPersona?.coreSystemPrompt || "");
    setCustomAvatarPath(customPersona?.avatarPath || customAvatarOptions[0].path);
  }, [customPersona]);

  useEffect(() => {
    setGeneratedAvatarCount(Number(localStorage.getItem(generatedAvatarStorageKey) || "0"));
  }, []);

  return (
    <div className={`fixed inset-0 z-[75] transition ${open ? "pointer-events-auto" : "pointer-events-none"}`}>
      <button type="button" aria-label="Close persona drawer" onClick={onClose} className={`absolute inset-0 bg-black/65 backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "opacity-0"}`} />
      <section
        className={`absolute left-1/2 top-1/2 mx-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-1.5rem)] max-w-2xl -translate-x-1/2 overflow-y-auto rounded-[1.5rem] border border-white/10 bg-[#0E0D10]/96 p-5 pb-8 shadow-2xl backdrop-blur-2xl transition duration-300 [scrollbar-color:rgba(201,168,106,0.45)_transparent] ${
          open ? "-translate-y-1/2 scale-100 opacity-100" : "translate-y-[8%] scale-95 opacity-0"
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className={`${isArabic ? "font-arsans" : "font-ensans"} text-xs text-bone/45`}>{isArabic ? "اختر الرفيق" : "Choose companion"}</p>
            <p className={`${isArabic ? "font-arsans" : "font-ensans"} mt-1 text-[11px] text-bone/35`}>
              {isArabic ? "بعد الاختيار ابدأ مباشرة بكتابة ما تحتاجه من الرفيق." : "After choosing, start by writing what you need from the companion."}
            </p>
          </div>
          <button type="button" onClick={onClose} className={`${isArabic ? "font-arsans" : "font-ensans"} text-xs text-bone/50 transition-colors hover:text-[#C9A86A]`}>
            {isArabic ? "إغلاق" : "Close"}
          </button>
        </div>
        <div className="mb-5 rounded-2xl border border-[#C9A86A]/20 bg-[#C9A86A]/[0.045] p-3" dir={isArabic ? "rtl" : "ltr"}>
          <p className={`${isArabic ? "font-arsans" : "font-ensans"} text-start text-sm font-semibold text-bone/88`}>{isArabic ? "اختر حسب احتياجك الآن" : "Pick by what you need now"}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-5">
            {personaNeedRecommendations.map((item) => {
              const persona = personaSource.find((candidate) => candidate.id === item.id);
              const locked = !unlockedPersonaIds.includes(item.id);
              return (
                <button key={item.id} type="button" onClick={() => chooseRecommendedPersona(item.id)} className={`rounded-xl border px-3 py-2 text-start transition-colors ${locked ? "border-white/10 bg-black/20 text-bone/36" : "border-white/10 bg-white/[0.035] text-bone/78 hover:border-[#C9A86A]/45 hover:bg-[#C9A86A]/10"}`}>
                  <span className={`${isArabic ? "font-arsans" : "font-ensans"} block text-sm font-semibold`}>{isArabic ? item.ar : item.en}</span>
                  <span className={`${isArabic ? "font-arsans" : "font-ensans"} mt-1 block text-[10px] text-bone/42`}>{persona ? (isArabic ? persona.nameAr : persona.nameEn) : item.id} · {isArabic ? item.hintAr : item.hintEn}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="space-y-6">
          {personaCardsByFamily.map(({ family, label, cards }) => (
            <section key={family} dir={isArabic ? "rtl" : "ltr"}>
              <div className="mb-3 px-1 text-start">
                <p className={`${isArabic ? "font-arsans" : "font-ensans"} text-sm font-semibold text-bone/90`}>{isArabic ? label.ar : label.en}</p>
                <p className={`${isArabic ? "font-arsans" : "font-ensans"} mt-1 text-xs leading-5 text-bone/38`}>{isArabic ? label.subAr : label.subEn}</p>
              </div>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {cards.map(({ persona, presentation, displayName, role, locked, selected }) => {
                  return (
                    <button
                      key={persona.id}
                      type="button"
                      onClick={() => {
                        if (locked) {
                          onLockedPersonaSelect(persona.id);
                          return;
                        }

                        onSelect(persona.id);
                      }}
                      className={`group text-start transition duration-300 ${selected ? "scale-[1.04] opacity-100" : "opacity-70 hover:scale-[1.02] hover:opacity-95"}`}
                      aria-pressed={selected}
                      aria-label={locked ? `Unlock ${persona.nameEn}` : `Choose ${persona.nameEn}`}
                    >
                      <span
                        className={`block ${avatarFrameClass} transition-all duration-500 ${
                          selected ? "animate-breathe border-white/20" : ""
                        }`}
                        style={selected ? { boxShadow: `0 0 0 1px rgba(255,255,255,0.1), 0 22px 52px ${presentation.auraHex}66` } : undefined}
                      >
                        <span className={`absolute inset-0 transition duration-500 ${locked ? "filter grayscale contrast-50 brightness-40 opacity-30" : ""}`}>
                          <AvatarImage src={presentation.avatarPath} alt={`${displayName} avatar`} sizes="(max-width: 768px) 30vw, 180px" />
                        </span>
                        {locked ? <span className="absolute inset-0 filter grayscale contrast-50 brightness-40 opacity-30" aria-hidden="true" /> : null}
                        {locked ? (
                          <span className="absolute inset-0 grid place-items-center bg-[#0E0D10]/20">
                            <LockIcon />
                          </span>
                        ) : null}
                        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0E0D10]/90 via-[#0E0D10]/45 to-transparent px-2 pb-2 pt-8">
                          <span className={`block truncate text-center text-xs text-bone/95 ${language === "ar" ? "font-arsans" : "font-ensans"}`}>{displayName}</span>
                        </span>
                      </span>
                      <span className={`mt-1 block truncate text-center text-[10px] uppercase tracking-[0.08em] text-bone/40 ${language === "ar" ? "font-arsans" : "font-ensans"}`}>{role}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {selectedPersona ? (
          <div className="mt-4 border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-3 max-sm:flex-col max-sm:items-stretch">
              <div>
                <p className={`${isArabic ? "font-arsans" : "font-ensans"} text-sm text-bone/88`}>
                  {isArabic ? "قيّم صورة الرفيق" : "Rate this avatar"}
                </p>
                <p className={`${isArabic ? "font-arsans" : "font-ensans"} mt-1 text-xs text-bone/42`}>
                  {getPersonaDisplayName(selectedPersona, language)} · {isArabic ? "تقييمك يساعدنا نطوّر الوجوه القادمة." : "Your rating helps shape the next avatar set."}
                </p>
              </div>
              <div className="flex items-center justify-center gap-1" dir="ltr">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => void rateSelectedAvatar(selectedPersona, rating)}
                    disabled={ratingStatus === "saving"}
                    className={`group grid h-9 w-9 place-items-center border text-xl transition disabled:cursor-wait disabled:opacity-60 ${
                      (ratedAvatars[selectedPersona.id] || 0) >= rating
                        ? "border-gold/60 bg-gold/15 text-gold"
                        : "border-white/10 bg-[#0E0D10] text-gold/45 hover:border-gold/50 hover:bg-gold/10 hover:text-gold"
                    }`}
                    aria-label={isArabic ? `تقييم ${rating} من 5` : `Rate ${rating} out of 5`}
                  >
                    <span className="transition-transform group-hover:scale-110">★</span>
                  </button>
                ))}
              </div>
            </div>
            <p className={`${isArabic ? "font-arsans" : "font-ensans"} mt-3 text-xs ${ratingStatus === "error" ? "text-red-200" : "text-bone/42"}`}>
              {ratingStatus === "saving"
                ? isArabic ? "جاري حفظ التقييم..." : "Saving rating..."
                : ratingStatus === "saved"
                  ? isArabic ? "تم حفظ تقييمك." : "Your rating was saved."
                  : ratingStatus === "error"
                    ? isArabic ? "تعذر حفظ التقييم. حاول مرة أخرى." : "Could not save the rating. Try again."
                    : isArabic ? "اختر من نجمة إلى خمس نجوم." : "Choose from one to five stars."}
            </p>
          </div>
        ) : null}

        <form onSubmit={submitCustomPersona} className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4" dir={isArabic ? "rtl" : "ltr"}>
          <div className="mb-3">
            <p className={`${isArabic ? "font-arsans" : "font-ensans"} text-sm font-semibold text-bone/90`}>{isArabic ? "اصنع رفيقك" : "Create your companion"}</p>
            <p className={`${isArabic ? "font-arsans" : "font-ensans"} mt-1 text-xs leading-5 text-bone/45`}>
              {isArabic
                ? "اكتب معلومات عنك وعن الرفيق الذي تريده. أول الصور مجانية في البيتا، وبعدها تصبح ميزة مدفوعة."
                : "Describe yourself and the companion you want. The first avatar images are free in beta, then this becomes a paid feature."}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[0.75fr_1.25fr]">
            <input
              value={customName}
              onChange={(event) => setCustomName(event.target.value)}
              placeholder={isArabic ? "اسم الرفيق" : "Companion name"}
              className={`${isArabic ? "font-arsans" : "font-ensans"} rounded-lg border border-white/10 bg-[#0E0D10] px-3 py-3 text-sm text-bone/90 outline-none placeholder:text-bone/30 focus:border-[#C9A86A]/55`}
            />
            <input
              value={customDescription}
              onChange={(event) => setCustomDescription(event.target.value)}
              placeholder={isArabic ? "مثال: هادئ، حكيم، صوته ناعم، شكله بسيط" : "Example: calm, wise, soft voice, simple look"}
              className={`${isArabic ? "font-arsans" : "font-ensans"} rounded-lg border border-white/10 bg-[#0E0D10] px-3 py-3 text-sm text-bone/90 outline-none placeholder:text-bone/30 focus:border-[#C9A86A]/55`}
            />
          </div>
          <div className="mt-3 rounded-2xl border border-[#C9A86A]/25 bg-[#C9A86A]/[0.055] p-3">
            <div className="flex items-center gap-3 max-sm:flex-col max-sm:items-stretch">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-[#0E0D10] max-sm:w-full">
                <AvatarImage src={customAvatarPath} alt={isArabic ? "معاينة صورة الرفيق" : "Generated avatar preview"} sizes="96px" />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`${isArabic ? "font-arsans" : "font-ensans"} text-sm font-semibold text-bone/90`}>{isArabic ? "استوديو صورة الرفيق" : "Avatar studio"}</p>
                <p className={`${isArabic ? "font-arsans" : "font-ensans"} mt-1 text-xs leading-5 text-bone/50`}>
                  {isArabic ? `${Math.max(0, freeGeneratedAvatarLimit - generatedAvatarCount)} صور مجانية متبقية على هذا الجهاز.` : `${Math.max(0, freeGeneratedAvatarLimit - generatedAvatarCount)} free generations left on this device.`}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => void generateCustomAvatar()} disabled={avatarGenerationStatus === "generating" || generatedAvatarCount >= freeGeneratedAvatarLimit} className="ui-action rounded-lg bg-[#C9A86A] px-4 py-2 text-xs text-[#0E0D10] transition-colors hover:bg-[#F7F3EC] disabled:opacity-50">
                    {avatarGenerationStatus === "generating" ? (isArabic ? "جاري الرسم..." : "Creating...") : isArabic ? "اصنع الصورة" : "Generate avatar"}
                  </button>
                  {generatedAvatarCount >= freeGeneratedAvatarLimit ? (
                    <button type="button" onClick={() => void startAvatarUpgrade()} className="ui-action rounded-lg border border-[#C9A86A]/35 px-4 py-2 text-xs text-[#C9A86A] transition-colors hover:bg-[#C9A86A] hover:text-[#0E0D10]">
                      {isArabic ? "فتح الترقية" : "Unlock paid"}
                    </button>
                  ) : null}
                </div>
                <p className={`${isArabic ? "font-arsans" : "font-ensans"} mt-2 text-xs ${avatarGenerationStatus === "error" ? "text-red-200" : "text-bone/42"}`}>
                  {avatarGenerationStatus === "saved"
                    ? isArabic ? "تم إنشاء الصورة. احفظ الرفيق لاستخدامها." : "Avatar created. Save the companion to use it."
                    : avatarGenerationStatus === "limit"
                      ? isArabic ? "انتهت الصور المجانية. التوليد الإضافي سيكون مدفوعاً." : "Free generations are used. More avatar generation will be paid."
                      : avatarGenerationStatus === "error"
                        ? isArabic ? "اكتب الاسم والوصف ثم جرّب مرة أخرى." : "Add a name and description, then try again."
                        : isArabic ? "الوصف الجيد يصنع صورة أذكى: المزاج، الأسلوب، الألوان، والرموز." : "Better descriptions make better avatars: mood, style, colors, and symbols."}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-6 gap-2">
            {customAvatarOptions.map((option) => {
              const selected = customAvatarPath === option.path;
              return (
                <button
                  key={option.path}
                  type="button"
                  onClick={() => setCustomAvatarPath(option.path)}
                  className={`group min-w-0 rounded-xl border p-1 transition-colors ${selected ? "border-[#C9A86A] bg-[#C9A86A]/10" : "border-white/10 bg-[#0E0D10] hover:border-[#C9A86A]/45"}`}
                  aria-pressed={selected}
                  aria-label={isArabic ? `اختيار شعار ${option.ar}` : `Choose ${option.en} avatar`}
                >
                  <span className="relative block aspect-square overflow-hidden rounded-lg">
                    <AvatarImage src={option.path} alt="" sizes="48px" />
                  </span>
                  <span className={`${isArabic ? "font-arsans" : "font-ensans"} mt-1 block truncate text-[10px] text-bone/50`}>{isArabic ? option.ar : option.en}</span>
                </button>
              );
            })}
          </div>
          <button type="submit" className="ui-action mt-3 w-full rounded-lg bg-[#C9A86A] px-4 py-3 text-[#0E0D10] transition-colors hover:bg-[#F7F3EC]">
            {isArabic ? "حفظ الرفيق واستخدامه" : "Save and use companion"}
          </button>
        </form>
      </section>
    </div>
  );
}