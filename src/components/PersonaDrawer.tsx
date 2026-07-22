"use client";

import Image from "next/image";
import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { childStories, type ChildStory } from "../lib/childStories";
import { FAMILY_LABELS, NEW_CHILDREN_ROSTER, personas, type Persona, type PersonaFamily, type PersonaId } from "../lib/personas";

type Language = "ar" | "en";

type PersonaDrawerProps = {
  open: boolean;
  activePersona: PersonaId;
  language: Language;
  unlockedPersonaIds: PersonaId[];
  blockedPersonaIds?: PersonaId[];
  childrenOnly?: boolean;
  mode?: "avatars" | "stories";
  storyShelfSignal?: number;
  customPersona: Persona | null;
  onClose: () => void;
  onSelect: (personaId: PersonaId) => void;
  onStoryGuideStart?: (story: ChildStory) => void;
  onLockedPersonaSelect: (personaId: PersonaId) => void;
  onCustomPersonaSave: (draft: { name: string; description: string; avatarPath?: string }) => void;
  onAvatarRate: (persona: Persona, rating: number) => Promise<boolean>;
};

const avatarFrameClass = "relative aspect-square overflow-hidden rounded-[2rem] border border-white/10 bg-[#0E0D10] shadow-2xl";
const generatedAvatarStorageKey = "fadfada-generated-avatar-count";
const freeGeneratedAvatarLimit = 3;
const selectorFamilies: PersonaFamily[] = ["listen", "build"];
const newChildrenPersonaIds = NEW_CHILDREN_ROSTER.map((persona) => persona.id);
const newChildrenPersonaIdSet = new Set<string>(newChildrenPersonaIds);
const childrenPersonaIdSet = new Set<PersonaId>([
  "lulu_letters", "zizo_numbers", "tala_explorer", "biso_kindness",
  ...newChildrenPersonaIds,
]);
const customAvatarOptions = [
  { path: "/profile-logos/calm.svg", ar: "هادئ", en: "Calm" },
  { path: "/profile-logos/spark.svg", ar: "نشط", en: "Spark" },
  { path: "/profile-logos/cedar.svg", ar: "حكيم", en: "Wise" },
  { path: "/profile-logos/moon.svg", ar: "ليلي", en: "Moon" },
  { path: "/profile-logos/wave.svg", ar: "ناعم", en: "Wave" },
  { path: "/profile-logos/terracotta.svg", ar: "دافئ", en: "Warm" },
];

const personaNeedRecommendations: Array<{ id: PersonaId; ar: string; en: string; hintAr: string; hintEn: string }> = [
  { id: "omar", ar: "اسمعني", en: "Listen", hintAr: "حضور هادئ", hintEn: "Calm presence" },
  { id: "nora", ar: "خطوة عملية", en: "Plan", hintAr: "تنفيذ سريع", hintEn: "Action steps" },
  { id: "rawi", ar: "حكاية", en: "Story", hintAr: "مسافة رمزية", hintEn: "Symbolic distance" },
  { id: "sami", ar: "طمأنينة", en: "Comfort", hintAr: "حكمة ناعمة", hintEn: "Gentle wisdom" },
  { id: "sarah", ar: "وضوح", en: "Clarity", hintAr: "تبسيط هادئ", hintEn: "Calm simplifier" },
];

type AvatarPresentation = {
  avatarPath: string;
  nameAr: string;
  nameEn: string;
  auraHex: string;
};

function getAvatarPresentation(persona: Persona): AvatarPresentation {
  return { avatarPath: persona.avatarPath, nameAr: persona.nameAr, nameEn: persona.nameEn, auraHex: persona.glowColorHex };
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

type StoryChoiceIconName = "spark" | "mask" | "play";

function StoryChoiceIcon({ name }: { name: StoryChoiceIconName }) {
  if (name === "mask") {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 8.5c2.2-1.2 4.5-1.2 7 0 2.5-1.2 4.8-1.2 7 0v3.2c0 3.8-2.3 6.3-5.1 6.3-1.1 0-2-.4-2.9-1.2-.8.8-1.8 1.2-2.9 1.2C5.3 18 3 15.5 3 11.7V8.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M7.5 11.2h2M14.5 11.2h2M8 14.6c.9.6 1.8.6 2.7 0M13.3 14.6c.9.6 1.8.6 2.7 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "play") {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M8 5.8v12.4c0 .9 1 1.4 1.7.9l8.9-6.2c.6-.4.6-1.3 0-1.7L9.7 4.9C9 4.4 8 4.9 8 5.8Z" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3.5 13.8 9l5.7 1.8-5.7 1.8L12 18l-1.8-5.4-5.7-1.8L10.2 9 12 3.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="m18.5 15 .7 2.1 2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7.7-2.1Z" fill="currentColor" />
    </svg>
  );
}

function getStoryChoiceIcon(index: number): StoryChoiceIconName {
  return index === 0 ? "mask" : index === 1 ? "spark" : "play";
}

function getCompactStoryChoiceLabel(choice: string, isArabic: boolean) {
  const normalized = choice.toLowerCase();
  if (normalized.includes("role") || choice.includes("دور")) return isArabic ? "دوري" : "Role";
  if (normalized.includes("funny") || normalized.includes("scene") || choice.includes("مشه")) return isArabic ? "مشهد" : "Scene";
  if (normalized.includes("curtain") || normalized.includes("open") || choice.includes("ستار")) return isArabic ? "ابدأ" : "Start";
  if (normalized.includes("hint") || choice.includes("تلميح")) return isArabic ? "تلميح" : "Hint";
  if (normalized.includes("quiz") || choice.includes("اختبار")) return isArabic ? "اختبار" : "Quiz";
  return choice.split(/\s+/).slice(0, 2).join(" ");
}

export function PersonaDrawer({
  open,
  activePersona,
  language,
  unlockedPersonaIds,
  blockedPersonaIds = [],
  childrenOnly = false,
  mode = "avatars",
  storyShelfSignal = 0,
  customPersona,
  onClose,
  onSelect,
  onStoryGuideStart,
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
  const [selectedChildStory, setSelectedChildStory] = useState<ChildStory | null>(null);
  const childStoriesSectionRef = useRef<HTMLElement | null>(null);
  const isArabic = language === "ar";
  const storiesOnly = mode === "stories";
  const avatarsOnly = mode === "avatars";
  const blockedPersonaIdSet = new Set(blockedPersonaIds);
  const basePersonaSource = childrenOnly ? personas.filter((persona) => childrenPersonaIdSet.has(persona.id)) : personas.filter((persona) => !childrenPersonaIdSet.has(persona.id));
  const personaSource = !childrenOnly && customPersona ? [...basePersonaSource, customPersona] : basePersonaSource;
  const selectorPersonas = personaSource.filter((persona) => !blockedPersonaIdSet.has(persona.id));
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
  const newChildrenRosterCards = NEW_CHILDREN_ROSTER
    .map((childPersona) => personaCards.find(({ persona }) => persona.id === childPersona.id))
    .filter((card): card is NonNullable<typeof card> => Boolean(card));
  const legacyChildrenCards = childrenOnly ? [] : personaCards.filter(({ persona }) => childrenPersonaIdSet.has(persona.id) && !newChildrenPersonaIdSet.has(persona.id));
  const personaCardSections = [
    ...(childrenOnly ? [{
      id: "children",
      label: {
        ar: "اختر رفيقك",
        en: "Choose your friend",
        subAr: "كل رفيق متخصص. اختر واحداً واللعب يبدأ.",
        subEn: "Each companion has a specialty. Pick one and play starts.",
      },
      cards: [...legacyChildrenCards, ...newChildrenRosterCards],
    }] : []),
    ...(childrenOnly ? [] : selectorFamilies.map((family) => ({
      id: family,
      label: FAMILY_LABELS[family],
      cards: personaCards.filter(({ persona }) => persona.family === family && !childrenPersonaIdSet.has(persona.id)),
    }))),
  ].filter((section) => section.cards.length > 0);

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

  function chooseStoryGuide(story: ChildStory) {
    const isFreeChildGuide = NEW_CHILDREN_ROSTER.some((persona) => persona.id === story.personaId);
    if (!isFreeChildGuide && !unlockedPersonaIds.includes(story.personaId)) {
      onLockedPersonaSelect(story.personaId);
      return;
    }

    if (onStoryGuideStart) {
      onStoryGuideStart(story);
    } else {
      onSelect(story.personaId);
    }
    setSelectedChildStory(null);
    onClose();
  }

  useEffect(() => {
    setCustomName(customPersona?.nameAr || "");
    setCustomDescription(customPersona?.coreSystemPrompt || "");
    setCustomAvatarPath(customPersona?.avatarPath || customAvatarOptions[0].path);
  }, [customPersona]);

  useEffect(() => {
    setGeneratedAvatarCount(Number(localStorage.getItem(generatedAvatarStorageKey) || "0"));
  }, []);

  useEffect(() => {
    if (!open || storyShelfSignal <= 0) return;
    window.requestAnimationFrame(() => {
      childStoriesSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [open, storyShelfSignal]);

  return (
    <div className={`fixed inset-0 z-[75] transition ${open ? "pointer-events-auto" : "pointer-events-none"}`}>
      <button type="button" aria-label="Close persona drawer" onClick={onClose} className={`absolute inset-0 bg-black/65 backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "opacity-0"}`} />
      <section
        className={`absolute left-1/2 top-1/2 mx-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-1.5rem)] max-w-2xl -translate-x-1/2 overflow-y-auto rounded-[1.5rem] border border-white/10 bg-[#0E0D10]/96 p-5 pb-8 shadow-2xl backdrop-blur-2xl transition duration-300 [scrollbar-color:rgba(201,168,106,0.45)_transparent] ${
          open ? "-translate-y-1/2 scale-100 opacity-100" : "translate-y-[8%] scale-95 opacity-0"
        }`}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0 text-start">
            <p className={`${isArabic ? "font-arsans" : "font-ensans"} text-lg font-semibold text-bone/92`}>{storiesOnly ? (isArabic ? "قصص الأطفال" : "Children stories") : isArabic ? "اختر رفيقك" : "Choose your companion"}</p>
            <p className={`${isArabic ? "font-arsans" : "font-ensans"} mt-1 max-w-md text-xs leading-5 text-bone/42`}>
              {storiesOnly ? (isArabic ? "اقرأ قصة جاهزة أو ابدأها مع رفيقها." : "Read a ready story or start it with its guide.") : isArabic ? "اختر وجهاً يناسب اللحظة. يمكنك تغييره في أي وقت." : "Pick the face that fits this moment. You can switch anytime."}
            </p>
          </div>
          <button type="button" onClick={onClose} className={`${isArabic ? "font-arsans" : "font-ensans"} shrink-0 rounded-full border border-white/10 px-3 py-1.5 text-xs text-bone/55 transition-colors hover:border-[#C9A86A]/45 hover:text-[#C9A86A]`}>
            {isArabic ? "إغلاق" : "Close"}
          </button>
        </div>
        {avatarsOnly && !childrenOnly ? <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.035] p-3" dir={isArabic ? "rtl" : "ltr"}>
          <div className="mb-2 flex items-center justify-between gap-3 px-1">
            <p className={`${isArabic ? "font-arsans" : "font-ensans"} text-xs font-semibold text-bone/72`}>{isArabic ? "اختيارات سريعة" : "Quick picks"}</p>
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#C9A86A]/70" dir="ltr">
              Plus previews
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {personaNeedRecommendations.map((item) => {
              const persona = personaSource.find((candidate) => candidate.id === item.id);
              const locked = !unlockedPersonaIds.includes(item.id);
              return (
                <button key={item.id} type="button" onClick={() => chooseRecommendedPersona(item.id)} className={`group grid grid-cols-[1fr_auto] items-center gap-2 rounded-xl border px-3 py-2 text-start transition-colors ${locked ? "border-[#C9A86A]/24 bg-black/24 text-bone/68 hover:border-[#C9A86A]/48 hover:bg-[#C9A86A]/10" : "border-white/10 bg-black/18 text-bone/78 hover:border-[#C9A86A]/45 hover:bg-[#C9A86A]/10"}`}>
                  <span className="min-w-0">
                    <span className={`${isArabic ? "font-arsans" : "font-ensans"} block truncate text-sm font-semibold`}>{isArabic ? item.ar : item.en}</span>
                    <span className={`${isArabic ? "font-arsans" : "font-ensans"} mt-0.5 block truncate text-[10px] text-bone/42`}>{persona ? (isArabic ? persona.nameAr : persona.nameEn) : item.id}</span>
                  </span>
                  <span className={`rounded-full border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.08em] ${locked ? "border-[#C9A86A]/35 text-[#C9A86A]" : "border-white/10 text-bone/36 group-hover:border-[#C9A86A]/35 group-hover:text-[#C9A86A]"}`} dir="ltr">
                    {locked ? "Plus" : isArabic ? "اختر" : "Pick"}
                  </span>
                </button>
              );
            })}
          </div>
        </div> : null}
        {storiesOnly ? (
          <section ref={childStoriesSectionRef} dir={isArabic ? "rtl" : "ltr"}>
            <div className="mb-3 px-1 text-start">
              <p className={`${isArabic ? "font-arsans" : "font-ensans"} text-sm font-semibold text-bone/90`}>{isArabic ? "مكتبة القصص" : "Story library"}</p>
              <p className={`${isArabic ? "font-arsans" : "font-ensans"} mt-1 text-xs leading-5 text-bone/38`}>{isArabic ? "قصص جاهزة ببوسترات جذابة، آمنة ومناسبة للأطفال." : "Ready stories with attractive posters, built for safe child reading."}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {childStories.map((story) => (
                <button
                  key={story.id}
                  type="button"
                  onClick={() => setSelectedChildStory(story)}
                  className="group overflow-hidden rounded-2xl border border-white/10 bg-[#0E0D10] text-start shadow-xl transition duration-300 hover:-translate-y-0.5 hover:border-[#C9A86A]/45 hover:shadow-[0_22px_52px_rgba(0,0,0,0.38)]"
                >
                  <span className={`relative block min-h-36 bg-gradient-to-br ${story.posterClassName} p-4`}>
                    <span className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(255,255,255,0.28),transparent_18%),radial-gradient(circle_at_78%_28%,rgba(255,255,255,0.18),transparent_16%),linear-gradient(135deg,rgba(255,255,255,0.18),transparent_44%)]" aria-hidden="true" />
                    <span className="absolute end-4 top-3 font-mono text-5xl text-white/70 drop-shadow-lg" aria-hidden="true">{story.posterGlyph}</span>
                    <span className="relative flex min-h-28 flex-col justify-end">
                      <span className="w-fit rounded-full border border-white/25 bg-black/22 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.08em] text-white/84" dir="ltr">
                        {story.ageBand} · {story.readingMinutes} min
                      </span>
                      <span className={`${isArabic ? "font-arsans" : "font-ensans"} mt-3 block text-lg font-semibold leading-6 text-white drop-shadow`}>{isArabic ? story.titleAr : story.titleEn}</span>
                      <span className={`${isArabic ? "font-arsans" : "font-ensans"} mt-1 line-clamp-2 text-xs leading-5 text-white/76`}>{isArabic ? story.subtitleAr : story.subtitleEn}</span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : null}
        {avatarsOnly ? (
        <div className="space-y-6">
          {personaCardSections.map(({ id, label, cards }) => (
            <section key={id} ref={id === "children" ? childStoriesSectionRef : undefined} dir={isArabic ? "rtl" : "ltr"}>
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
                        onClose();
                      }}
                      className={`group text-start transition duration-300 ${selected ? "scale-[1.04] opacity-100" : locked ? "opacity-95 hover:scale-[1.02]" : "opacity-78 hover:scale-[1.02] hover:opacity-100"}`}
                      aria-pressed={selected}
                      aria-label={locked ? `Unlock ${persona.nameEn}` : `Choose ${persona.nameEn}`}
                    >
                      <span
                        className={`block ${avatarFrameClass} transition-all duration-500 ${
                          selected ? "animate-breathe border-white/20" : locked ? "border-[#C9A86A]/28" : ""
                        }`}
                        style={selected || locked ? { boxShadow: `0 0 0 1px rgba(255,255,255,0.08), 0 18px 42px ${presentation.auraHex}${locked ? "33" : "66"}` } : undefined}
                      >
                        <span className={`absolute inset-0 transition duration-500 ${locked ? "brightness-75 saturate-[0.72]" : ""}`}>
                          <AvatarImage src={presentation.avatarPath} alt={`${displayName} avatar`} sizes="(max-width: 768px) 30vw, 180px" />
                        </span>
                        {locked ? (
                          <span className="absolute end-1.5 top-1.5 inline-flex items-center gap-1 rounded-full border border-[#C9A86A]/45 bg-[#0E0D10]/78 px-2 py-1 text-[#C9A86A] shadow-xl">
                            <LockIcon />
                            <span className={`${language === "ar" ? "font-arsans" : "font-ensans"} text-[9px] uppercase tracking-[0.08em]`}>{isArabic ? "بلس" : "Plus"}</span>
                          </span>
                        ) : null}
                        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0E0D10]/90 via-[#0E0D10]/45 to-transparent px-2 pb-2 pt-8">
                          <span className={`block truncate text-center text-xs text-bone/95 ${language === "ar" ? "font-arsans" : "font-ensans"}`}>{displayName}</span>
                        </span>
                      </span>
                      <span className={`mt-1 block truncate text-center text-[10px] uppercase tracking-[0.08em] ${locked ? "text-[#C9A86A]/70" : "text-bone/40"} ${language === "ar" ? "font-arsans" : "font-ensans"}`}>{locked ? (isArabic ? "معاينة مقفلة" : "Locked preview") : role}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
        ) : null}

        {avatarsOnly && !childrenOnly ? <form onSubmit={submitCustomPersona} className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4" dir={isArabic ? "rtl" : "ltr"}>
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
        </form> : null}

        {selectedChildStory && typeof document !== "undefined" ? createPortal((
          <div className="fixed inset-0 z-[140] grid place-items-center bg-black/82 px-3 py-3 backdrop-blur-md sm:py-4" role="dialog" aria-modal="true" aria-label={isArabic ? selectedChildStory.titleAr : selectedChildStory.titleEn} dir={isArabic ? "rtl" : "ltr"}>
            <button type="button" className="absolute inset-0" onClick={() => setSelectedChildStory(null)} aria-label={isArabic ? "إغلاق القصة" : "Close story"} />
            <article className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[1.35rem] border border-white/12 bg-[#0E0D10] shadow-2xl [scrollbar-color:rgba(201,168,106,0.45)_transparent]">
              <div className={`relative shrink-0 overflow-hidden bg-gradient-to-br ${selectedChildStory.posterClassName} p-5 sm:p-6`}>
                <span className="absolute inset-0 bg-[radial-gradient(circle_at_24%_18%,rgba(255,255,255,0.32),transparent_18%),radial-gradient(circle_at_76%_24%,rgba(255,255,255,0.18),transparent_16%),linear-gradient(135deg,rgba(255,255,255,0.18),transparent_42%)]" aria-hidden="true" />
                <span className="absolute end-5 top-4 font-mono text-7xl text-white/68 drop-shadow-xl" aria-hidden="true">{selectedChildStory.posterGlyph}</span>
                <button type="button" onClick={() => setSelectedChildStory(null)} className="absolute start-4 top-4 rounded-full border border-white/25 bg-black/24 px-3 py-1.5 text-xs text-white/86 transition-colors hover:bg-white hover:text-[#0E0D10]">
                  {isArabic ? "إغلاق" : "Close"}
                </button>
                <div className="relative pt-14 text-start sm:pt-16">
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/78" dir="ltr">Story poster · {selectedChildStory.ageBand}</p>
                  <h2 className={`${isArabic ? "font-arsans" : "font-ensans"} mt-3 max-w-xl text-2xl font-semibold leading-9 text-white sm:text-4xl sm:leading-[3rem]`}>{isArabic ? selectedChildStory.titleAr : selectedChildStory.titleEn}</h2>
                  <p className={`${isArabic ? "font-arsans" : "font-ensans"} mt-2 max-w-xl text-sm leading-6 text-white/78`}>{isArabic ? selectedChildStory.subtitleAr : selectedChildStory.subtitleEn}</p>
                </div>
              </div>
              <div className="min-h-0 overflow-y-auto bg-[#0E0D10] p-4 sm:p-5">
                <div className="space-y-3 text-start">
                  {(isArabic ? selectedChildStory.pagesAr : selectedChildStory.pagesEn).map((page, index) => (
                    <p key={`${selectedChildStory.id}-${index}`} className={`${isArabic ? "font-arsans" : "font-ensans"} rounded-xl border border-white/10 bg-[#17151A] px-4 py-3 text-sm leading-7 text-bone/88`}>
                      {page}
                    </p>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-2.5">
                  <p className={`${isArabic ? "font-arsans" : "font-ensans"} mb-2 px-1 text-[11px] font-semibold text-[#C9A86A]/76`}>{isArabic ? "اختر بسرعة" : "Quick taps"}</p>
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                    {(isArabic ? selectedChildStory.tapChoicesAr : selectedChildStory.tapChoicesEn).map((choice, index) => (
                      <button
                        key={choice}
                        type="button"
                        onClick={() => chooseStoryGuide(selectedChildStory)}
                        className={`${isArabic ? "font-arsans" : "font-ensans"} ui-action group flex min-h-0 flex-col items-center justify-center gap-1 rounded-xl border border-[#C9A86A]/24 bg-[#C9A86A]/10 px-1.5 py-2 text-center text-[11px] font-semibold leading-4 text-[#F7F3EC]/82 transition-colors hover:border-[#C9A86A]/55 hover:bg-[#C9A86A]/18 hover:text-[#C9A86A] sm:min-h-16 sm:px-3 sm:py-3 sm:text-xs`}
                        aria-label={choice}
                        title={choice}
                      >
                        <span className="grid h-7 w-7 place-items-center rounded-full border border-white/12 bg-black/22 text-[#C9A86A] shadow-[0_8px_24px_rgba(0,0,0,0.24)] transition-colors group-hover:border-[#C9A86A]/45 group-hover:bg-[#C9A86A] group-hover:text-[#0E0D10] sm:h-8 sm:w-8">
                          <StoryChoiceIcon name={getStoryChoiceIcon(index)} />
                        </span>
                        <span className="block sm:hidden">{getCompactStoryChoiceLabel(choice, isArabic)}</span>
                        <span className="hidden sm:block">{choice}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button type="button" onClick={() => chooseStoryGuide(selectedChildStory)} className="ui-action rounded-xl bg-[#C9A86A] px-4 py-3 text-xs text-[#0E0D10] transition-colors hover:bg-[#F7F3EC]">
                    {isArabic ? "ابدأ مع رفيق القصة" : "Start with story guide"}
                  </button>
                  <button type="button" onClick={() => setSelectedChildStory(null)} className="ui-action rounded-xl border border-white/12 px-4 py-3 text-xs text-bone/62 transition-colors hover:border-[#C9A86A]/45 hover:text-[#C9A86A]">
                    {isArabic ? "رجوع للقصص" : "Back to stories"}
                  </button>
                </div>
              </div>
            </article>
          </div>
        ), document.body) : null}
      </section>
    </div>
  );
}