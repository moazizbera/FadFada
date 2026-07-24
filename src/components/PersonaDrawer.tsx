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
const childStoryProgressStorageKey = "fadfada-child-story-progress";
const childStoryCompletedStorageKey = "fadfada-child-story-completed";
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
  const [storyPageIndex, setStoryPageIndex] = useState(0);
  const [storyNarrationStatus, setStoryNarrationStatus] = useState<"idle" | "speaking">("idle");
  const [storyAutoPlayStatus, setStoryAutoPlayStatus] = useState<"idle" | "playing">("idle");
  const [storyProgressById, setStoryProgressById] = useState<Record<string, number>>({});
  const [completedStoryIds, setCompletedStoryIds] = useState<string[]>([]);
  const [rewardRevealStory, setRewardRevealStory] = useState<ChildStory | null>(null);
  const [bookTouchStartX, setBookTouchStartX] = useState<number | null>(null);
  const [bookTouchCurrentX, setBookTouchCurrentX] = useState<number | null>(null);
  const storyAutoPlayActiveRef = useRef(false);
  const childStoriesSectionRef = useRef<HTMLElement | null>(null);
  const isArabic = language === "ar";
  const storiesOnly = mode === "stories";
  const avatarsOnly = mode === "avatars";
  const blockedPersonaIdSet = new Set(blockedPersonaIds);
  const basePersonaSource = childrenOnly ? personas.filter((persona) => childrenPersonaIdSet.has(persona.id)) : personas.filter((persona) => !childrenPersonaIdSet.has(persona.id));
  const personaSource = !childrenOnly && customPersona ? [...basePersonaSource, customPersona] : basePersonaSource;
  const selectorPersonas = personaSource.filter((persona) => !blockedPersonaIdSet.has(persona.id));
  const completedStoryIdSet = new Set(completedStoryIds);
  const totalReadingMinutes = childStories.reduce((sum, story) => sum + story.readingMinutes, 0);
  const completedReadingMinutes = childStories.reduce((sum, story) => completedStoryIdSet.has(story.id) ? sum + story.readingMinutes : sum, 0);
  const activeResumeStory = childStories.find((story) => {
    const progress = storyProgressById[story.id];
    return typeof progress === "number" && progress > 0 && progress < (isArabic ? story.pagesAr.length : story.pagesEn.length) - 1;
  }) ?? null;
  const nextAdventureStory = childStories.find((story) => !completedStoryIdSet.has(story.id) && story.id !== activeResumeStory?.id)
    ?? activeResumeStory
    ?? childStories[0]
    ?? null;
  const storyTrail = childStories.slice(0, 5).map((story) => {
    const isCompleted = completedStoryIdSet.has(story.id);
    const isCurrent = activeResumeStory?.id === story.id;
    const isNext = nextAdventureStory?.id === story.id && !isCurrent;

    return {
      story,
      state: isCompleted ? "completed" : isCurrent ? "current" : isNext ? "next" : "locked",
    } as const;
  });
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

  function markStoryCompleted(storyId: string) {
    setCompletedStoryIds((current) => {
      if (current.includes(storyId)) return current;
      const next = [...current, storyId];
      if (typeof window !== "undefined") {
        window.localStorage.setItem(childStoryCompletedStorageKey, JSON.stringify(next));
      }
      return next;
    });
  }

  function completeStoryWithReward(story: ChildStory) {
    if (completedStoryIdSet.has(story.id)) return;
    markStoryCompleted(story.id);
    setRewardRevealStory(story);
  }

  function stopStoryNarration() {
    storyAutoPlayActiveRef.current = false;
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setStoryNarrationStatus("idle");
    setStoryAutoPlayStatus("idle");
  }

  function speakStoryPage(pageText: string) {
    if (typeof window === "undefined" || !window.speechSynthesis || !pageText.trim()) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(pageText);
    utterance.lang = isArabic ? "ar-EG" : "en-US";
    utterance.rate = isArabic ? 0.92 : 0.96;
    utterance.pitch = 1;
    utterance.onstart = () => setStoryNarrationStatus("speaking");
    utterance.onend = () => setStoryNarrationStatus("idle");
    utterance.onerror = () => setStoryNarrationStatus("idle");
    window.speechSynthesis.speak(utterance);
  }

  function goToNextStoryPage(totalPages: number) {
    storyAutoPlayActiveRef.current = false;
    setStoryAutoPlayStatus("idle");
    stopStoryNarration();
    setStoryPageIndex((current) => Math.min(totalPages - 1, current + 1));
  }

  function goToPreviousStoryPage() {
    storyAutoPlayActiveRef.current = false;
    setStoryAutoPlayStatus("idle");
    stopStoryNarration();
    setStoryPageIndex((current) => Math.max(0, current - 1));
  }

  function startStoryAutoPlay(storyPages: string[]) {
    if (!storyPages.length || typeof window === "undefined" || !window.speechSynthesis) return;

    storyAutoPlayActiveRef.current = true;
    setStoryAutoPlayStatus("playing");

    const narrateFromPage = (pageIndex: number) => {
      if (!storyAutoPlayActiveRef.current) {
        setStoryNarrationStatus("idle");
        setStoryAutoPlayStatus("idle");
        return;
      }

      const boundedPageIndex = Math.max(0, Math.min(storyPages.length - 1, pageIndex));
      const pageText = storyPages[boundedPageIndex] || "";
      setStoryPageIndex(boundedPageIndex);

      if (!pageText.trim()) {
        storyAutoPlayActiveRef.current = false;
        setStoryNarrationStatus("idle");
        setStoryAutoPlayStatus("idle");
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(pageText);
      utterance.lang = isArabic ? "ar-EG" : "en-US";
      utterance.rate = isArabic ? 0.9 : 0.95;
      utterance.pitch = 1;
      utterance.onstart = () => setStoryNarrationStatus("speaking");
      utterance.onend = () => {
        if (!storyAutoPlayActiveRef.current) {
          setStoryNarrationStatus("idle");
          setStoryAutoPlayStatus("idle");
          return;
        }

        if (boundedPageIndex >= storyPages.length - 1) {
          storyAutoPlayActiveRef.current = false;
          setStoryNarrationStatus("idle");
          setStoryAutoPlayStatus("idle");
          if (selectedChildStory) completeStoryWithReward(selectedChildStory);
          return;
        }

        narrateFromPage(boundedPageIndex + 1);
      };
      utterance.onerror = () => {
        storyAutoPlayActiveRef.current = false;
        setStoryNarrationStatus("idle");
        setStoryAutoPlayStatus("idle");
      };
      window.speechSynthesis.speak(utterance);
    };

    narrateFromPage(storyPageIndex);
  }

  function onBookTouchStart(clientX: number) {
    setBookTouchStartX(clientX);
    setBookTouchCurrentX(clientX);
  }

  function onBookTouchMove(clientX: number) {
    if (bookTouchStartX === null) return;
    setBookTouchCurrentX(clientX);
  }

  function onBookTouchEnd(totalPages: number) {
    if (bookTouchStartX === null || bookTouchCurrentX === null) {
      setBookTouchStartX(null);
      setBookTouchCurrentX(null);
      return;
    }

    const deltaX = bookTouchCurrentX - bookTouchStartX;
    const threshold = 44;
    if (deltaX <= -threshold) {
      goToNextStoryPage(totalPages);
    } else if (deltaX >= threshold) {
      goToPreviousStoryPage();
    }

    setBookTouchStartX(null);
    setBookTouchCurrentX(null);
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const rawProgress = window.localStorage.getItem(childStoryProgressStorageKey);
    if (!rawProgress) return;

    try {
      const parsedProgress = JSON.parse(rawProgress) as Record<string, number>;
      if (parsedProgress && typeof parsedProgress === "object") {
        const safeProgress: Record<string, number> = {};
        Object.entries(parsedProgress).forEach(([storyId, pageIndex]) => {
          if (typeof pageIndex === "number" && Number.isFinite(pageIndex) && pageIndex >= 0) {
            safeProgress[storyId] = Math.round(pageIndex);
          }
        });
        setStoryProgressById(safeProgress);
      }
    } catch {
      setStoryProgressById({});
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const rawCompleted = window.localStorage.getItem(childStoryCompletedStorageKey);
    if (!rawCompleted) return;

    try {
      const parsedCompleted = JSON.parse(rawCompleted) as string[];
      if (Array.isArray(parsedCompleted)) {
        setCompletedStoryIds(parsedCompleted.filter((storyId) => typeof storyId === "string"));
      }
    } catch {
      setCompletedStoryIds([]);
    }
  }, []);

  useEffect(() => {
    if (!selectedChildStory) return;
    const storyPages = isArabic ? selectedChildStory.pagesAr : selectedChildStory.pagesEn;
    const savedPageIndex = storyProgressById[selectedChildStory.id] || 0;
    const nextPageIndex = Math.max(0, Math.min(storyPages.length - 1, savedPageIndex));
    setStoryPageIndex(nextPageIndex);
    stopStoryNarration();
  }, [isArabic, selectedChildStory, storyProgressById]);

  useEffect(() => {
    if (!selectedChildStory || typeof window === "undefined") return;
    setStoryProgressById((current) => {
      if (current[selectedChildStory.id] === storyPageIndex) return current;
      const next = { ...current, [selectedChildStory.id]: storyPageIndex };
      window.localStorage.setItem(childStoryProgressStorageKey, JSON.stringify(next));
      return next;
    });
  }, [selectedChildStory, storyPageIndex]);

  useEffect(() => {
    if (!selectedChildStory) return;
    const storyPages = isArabic ? selectedChildStory.pagesAr : selectedChildStory.pagesEn;
    if (storyPageIndex >= storyPages.length - 1) {
      completeStoryWithReward(selectedChildStory);
    }
  }, [completedStoryIdSet, isArabic, selectedChildStory, storyPageIndex]);

  useEffect(() => {
    setStoryPageIndex(0);
    stopStoryNarration();
  }, [selectedChildStory]);

  useEffect(() => () => stopStoryNarration(), []);

  return (
    <div className={`fixed inset-0 z-[75] transition ${open ? "pointer-events-auto" : "pointer-events-none"}`}>
      <button type="button" aria-label="Close persona drawer" onClick={onClose} className={`absolute inset-0 bg-black/65 backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "opacity-0"}`} />
      <section
        className={`absolute left-1/2 top-1/2 mx-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-1.5rem)] max-w-2xl -translate-x-1/2 overflow-y-auto rounded-[1.5rem] border border-white/10 bg-[#0E0D10]/96 p-5 pb-8 shadow-2xl backdrop-blur-2xl transition duration-300 [scrollbar-color:rgba(201,168,106,0.45)_transparent] ${
          open ? "-translate-y-1/2 scale-100 opacity-100" : "translate-y-[8%] scale-95 opacity-0"
        }`}
        onKeyDown={(event) => {
          if (!selectedChildStory) return;
          const storyPages = isArabic ? selectedChildStory.pagesAr : selectedChildStory.pagesEn;
          if (event.key === "ArrowRight") {
            if (isArabic) {
              goToPreviousStoryPage();
            } else {
              goToNextStoryPage(storyPages.length);
            }
          }
          if (event.key === "ArrowLeft") {
            if (isArabic) {
              goToNextStoryPage(storyPages.length);
            } else {
              goToPreviousStoryPage();
            }
          }
        }}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0 text-start">
            <p className={`${isArabic ? "font-arsans" : "font-ensans"} text-lg font-semibold text-bone/92`}>{storiesOnly ? (isArabic ? "قصص الأطفال" : "Children stories") : isArabic ? "اختر رفيقك" : "Choose your companion"}</p>
            <p className={`${isArabic ? "font-arsans" : "font-ensans"} mt-1 max-w-md text-xs leading-5 text-bone/42`}>
              {storiesOnly ? (isArabic ? "اقرأ قصة جاهزة أو ابدأها مع رفيقها." : "Read a ready story or start it with its guide.") : childrenOnly ? (isArabic ? "اختر رفيقك المفضل للعب والتعلم." : "Choose your favorite friend for play and learning.") : isArabic ? "اختر وجهاً يناسب اللحظة. يمكنك تغييره في أي وقت." : "Pick the face that fits this moment. You can switch anytime."}
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
            <div className="mb-4 overflow-hidden rounded-[1.35rem] border border-[#C9A86A]/18 bg-[linear-gradient(135deg,rgba(201,168,106,0.16),rgba(18,18,24,0.94)_56%,rgba(74,144,226,0.16))] p-4 shadow-[0_18px_42px_rgba(0,0,0,0.28)]">
              <div className="flex flex-wrap items-start justify-between gap-3 text-start">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#F7F3EC]/72">{isArabic ? "Story Passport" : "Story Passport"}</p>
                  <h3 className={`${isArabic ? "font-arsans" : "font-ensans"} mt-2 text-lg font-semibold text-white`}>{isArabic ? "جواز رحلة الحكايات" : "Story journey passport"}</h3>
                  <p className={`${isArabic ? "font-arsans" : "font-ensans"} mt-1 text-xs leading-5 text-white/72`}>
                    {activeResumeStory
                      ? isArabic
                        ? `آخر قصة مفتوحة: ${activeResumeStory.titleAr}`
                        : `Current open story: ${activeResumeStory.titleEn}`
                      : isArabic
                        ? "كل قصة تنتهي تصبح نجمة في مكتبة الطفل."
                        : "Every finished story becomes a star in the child's shelf."}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2" dir="ltr">
                  <span className="rounded-full border border-white/16 bg-black/18 px-3 py-1 font-mono text-[10px] text-white/78">{completedStoryIds.length}/{childStories.length} books</span>
                  <span className="rounded-full border border-amber-100/20 bg-amber-100/10 px-3 py-1 font-mono text-[10px] text-amber-100">{completedReadingMinutes}/{totalReadingMinutes} min</span>
                </div>
              </div>
              {nextAdventureStory ? (
                <button
                  type="button"
                  onClick={() => setSelectedChildStory(nextAdventureStory)}
                  className="mt-3 flex w-full items-center justify-between gap-3 rounded-2xl border border-sky-100/18 bg-sky-100/[0.08] px-3 py-3 text-start transition-colors hover:border-sky-100/35 hover:bg-sky-100/[0.14]"
                >
                  <span className="min-w-0">
                    <span className="block font-mono text-[10px] uppercase tracking-[0.1em] text-sky-100/78">{isArabic ? "Next Adventure" : "Next Adventure"}</span>
                    <span className={`${isArabic ? "font-arsans" : "font-ensans"} mt-1 block truncate text-sm font-semibold text-white`}>
                      {isArabic ? nextAdventureStory.titleAr : nextAdventureStory.titleEn}
                    </span>
                    <span className={`${isArabic ? "font-arsans" : "font-ensans"} mt-1 block truncate text-xs text-white/64`}>
                      {activeResumeStory?.id === nextAdventureStory.id
                        ? isArabic ? "أكمل من آخر صفحة وصلت إليها" : "Continue from your last saved page"
                        : isArabic ? "قصة جاهزة كالمغامرة التالية" : "Ready as the next guided story"}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full border border-white/16 bg-black/18 px-3 py-1 font-mono text-[10px] text-sky-100" dir="ltr">
                    {nextAdventureStory.posterGlyph}
                  </span>
                </button>
              ) : null}
              <div className="mt-3 rounded-2xl border border-white/10 bg-black/16 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className={`${isArabic ? "font-arsans" : "font-ensans"} text-xs font-semibold text-white/78`}>
                    {isArabic ? "مسار المغامرات" : "Adventure trail"}
                  </p>
                  <span className="font-mono text-[10px] text-white/48" dir="ltr">5-step view</span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                  {storyTrail.map(({ story, state }, index) => (
                    <div key={`${story.id}-trail`} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedChildStory(story)}
                        className={`group flex min-w-[4.75rem] flex-col items-center rounded-2xl border px-2 py-2 text-center transition-colors ${
                          state === "completed"
                            ? "border-amber-100/28 bg-amber-100/12 text-amber-100"
                            : state === "current"
                              ? "border-sky-100/28 bg-sky-100/12 text-sky-100"
                              : state === "next"
                                ? "border-emerald-100/28 bg-emerald-100/12 text-emerald-100"
                                : "border-white/10 bg-white/[0.03] text-white/52"
                        }`}
                      >
                        <span className="font-mono text-2xl">{story.posterGlyph}</span>
                        <span className={`${isArabic ? "font-arsans" : "font-ensans"} mt-1 line-clamp-2 text-[10px] leading-4`}>
                          {isArabic ? story.titleAr : story.titleEn}
                        </span>
                        <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.08em]">
                          {state === "completed"
                            ? isArabic ? "تم" : "Done"
                            : state === "current"
                              ? isArabic ? "الآن" : "Now"
                              : state === "next"
                                ? isArabic ? "التالي" : "Next"
                                : isArabic ? "لاحقاً" : "Later"}
                        </span>
                      </button>
                      {index < storyTrail.length - 1 ? (
                        <span className={`h-px w-4 shrink-0 ${state === "completed" ? "bg-amber-100/45" : state === "current" ? "bg-sky-100/45" : "bg-white/14"}`} aria-hidden="true" />
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {childStories.slice(0, 6).map((story) => {
                  const completed = completedStoryIdSet.has(story.id);
                  const progress = storyProgressById[story.id] || 0;
                  return (
                    <div key={`${story.id}-passport`} className={`rounded-2xl border px-2 py-2 text-center ${completed ? "border-amber-100/30 bg-amber-100/12" : "border-white/10 bg-black/20"}`}>
                      <div className="font-mono text-2xl text-white/82">{story.posterGlyph}</div>
                      <div className={`${isArabic ? "font-arsans" : "font-ensans"} mt-1 text-[10px] text-white/72`}>{completed ? (isArabic ? "مكتملة" : "Done") : progress > 0 ? (isArabic ? `ص${progress + 1}` : `p${progress + 1}`) : (isArabic ? "جديدة" : "New")}</div>
                    </div>
                  );
                })}
              </div>
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
                    {completedStoryIdSet.has(story.id) ? (
                      <span className="absolute start-4 top-3 rounded-full border border-amber-100/28 bg-black/25 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.08em] text-amber-100" dir="ltr">★ {isArabic ? "مكتملة" : "Done"}</span>
                    ) : (storyProgressById[story.id] || 0) > 0 ? (
                      <span className="absolute start-4 top-3 rounded-full border border-sky-100/28 bg-black/25 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.08em] text-sky-100" dir="ltr">{isArabic ? "متابعة" : "Resume"} · {Math.min((storyProgressById[story.id] || 0) + 1, isArabic ? story.pagesAr.length : story.pagesEn.length)}</span>
                    ) : null}
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
            <button
              type="button"
              className="absolute inset-0"
              onClick={() => {
                stopStoryNarration();
                setSelectedChildStory(null);
              }}
              aria-label={isArabic ? "إغلاق القصة" : "Close story"}
            />
            <article className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-[1.35rem] border border-white/12 bg-[#0E0D10] shadow-2xl [scrollbar-color:rgba(201,168,106,0.45)_transparent]">
              <div className={`relative shrink-0 overflow-hidden bg-gradient-to-br ${selectedChildStory.posterClassName} p-5 sm:p-6`}>
                <span className="absolute inset-0 bg-[radial-gradient(circle_at_24%_18%,rgba(255,255,255,0.32),transparent_18%),radial-gradient(circle_at_76%_24%,rgba(255,255,255,0.18),transparent_16%),linear-gradient(135deg,rgba(255,255,255,0.18),transparent_42%)]" aria-hidden="true" />
                <span className="absolute end-5 top-4 font-mono text-7xl text-white/68 drop-shadow-xl" aria-hidden="true">{selectedChildStory.posterGlyph}</span>
                <button
                  type="button"
                  onClick={() => {
                    stopStoryNarration();
                    setSelectedChildStory(null);
                  }}
                  className="absolute start-4 top-4 rounded-full border border-white/25 bg-black/24 px-3 py-1.5 text-xs text-white/86 transition-colors hover:bg-white hover:text-[#0E0D10]"
                >
                  {isArabic ? "إغلاق" : "Close"}
                </button>
                <div className="relative pt-14 text-start sm:pt-16">
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/78" dir="ltr">Story poster · {selectedChildStory.ageBand}</p>
                  <h2 className={`${isArabic ? "font-arsans" : "font-ensans"} mt-3 max-w-2xl text-2xl font-semibold leading-9 text-white sm:text-4xl sm:leading-[3rem]`}>{isArabic ? selectedChildStory.titleAr : selectedChildStory.titleEn}</h2>
                  <p className={`${isArabic ? "font-arsans" : "font-ensans"} mt-2 max-w-2xl text-sm leading-6 text-white/78`}>{isArabic ? selectedChildStory.subtitleAr : selectedChildStory.subtitleEn}</p>
                </div>
              </div>
              <div className="min-h-0 overflow-y-auto bg-[#0E0D10] p-4 sm:p-5">
                {(() => {
                  const storyPages = isArabic ? selectedChildStory.pagesAr : selectedChildStory.pagesEn;
                  const currentPage = storyPages[storyPageIndex] || "";
                  const nextPage = storyPages[storyPageIndex + 1] || "";
                  const totalPages = storyPages.length;
                  const canGoPrevious = storyPageIndex > 0;
                  const canGoNext = storyPageIndex < totalPages - 1;

                  return (
                    <>
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <p className={`${isArabic ? "font-arsans" : "font-ensans"} text-xs text-bone/62`}>
                          {isArabic ? "اسحب يمين/يسار أو استخدم الأزرار لتقليب الصفحات." : "Swipe left/right or use buttons to turn pages."}
                        </p>
                        <div className="flex flex-wrap items-center gap-2" dir="ltr">
                          {completedStoryIdSet.has(selectedChildStory.id) ? <span className="rounded-full border border-amber-100/20 bg-amber-100/10 px-3 py-1 font-mono text-[10px] text-amber-100">★ {isArabic ? "قصة مكتملة" : "Story completed"}</span> : null}
                          <span className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 font-mono text-[10px] text-bone/66">{storyPageIndex + 1} / {totalPages}</span>
                        </div>
                      </div>

                      <div
                        className="relative overflow-hidden rounded-[1.2rem] border border-amber-100/18 bg-[#151218] p-2 shadow-[0_22px_60px_rgba(0,0,0,0.32)]"
                        onTouchStart={(event) => onBookTouchStart(event.touches[0]?.clientX ?? 0)}
                        onTouchMove={(event) => onBookTouchMove(event.touches[0]?.clientX ?? 0)}
                        onTouchEnd={() => onBookTouchEnd(totalPages)}
                      >
                        <div className="pointer-events-none absolute inset-y-2 left-1/2 hidden w-px bg-gradient-to-b from-transparent via-amber-100/28 to-transparent sm:block" aria-hidden="true" />
                        <div className="grid gap-2 sm:grid-cols-2">
                          <article className="min-h-52 rounded-xl border border-white/10 bg-[linear-gradient(180deg,#F7F1DF_0%,#F1E8D2_100%)] p-4 text-start text-[#2B241A] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25)] sm:min-h-64">
                            <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#7D6341]" dir="ltr">{isArabic ? "الصفحة" : "Page"} {storyPageIndex + 1}</p>
                            <p className={`${isArabic ? "font-arsans" : "font-ensans"} mt-2 text-sm leading-7 sm:text-[15px] sm:leading-8`}>{currentPage}</p>
                          </article>
                          <article className="hidden min-h-64 rounded-xl border border-white/10 bg-[linear-gradient(180deg,#F7F1DF_0%,#EFE5CB_100%)] p-4 text-start text-[#2B241A] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25)] sm:block">
                            {nextPage ? (
                              <>
                                <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#7D6341]" dir="ltr">{isArabic ? "الصفحة" : "Page"} {storyPageIndex + 2}</p>
                                <p className={`${isArabic ? "font-arsans" : "font-ensans"} mt-2 text-[15px] leading-8`}>{nextPage}</p>
                              </>
                            ) : (
                              <div className="grid h-full place-items-center text-center">
                                <p className={`${isArabic ? "font-arsans" : "font-ensans"} text-sm text-[#7D6341]`}>{isArabic ? "نهاية القصة الجميلة" : "The end of this lovely story"}</p>
                              </div>
                            )}
                          </article>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={goToPreviousStoryPage}
                          disabled={!canGoPrevious}
                          className="ui-action rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2 text-xs text-bone/72 transition-colors hover:border-[#C9A86A]/45 hover:text-[#C9A86A] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {isArabic ? "الصفحة السابقة" : "Previous page"}
                        </button>
                        <button
                          type="button"
                          onClick={() => speakStoryPage(currentPage)}
                          className="ui-action rounded-xl border border-cyan-100/24 bg-cyan-100/[0.08] px-3 py-2 text-xs text-cyan-50 transition-colors hover:bg-cyan-100 hover:text-[#0E0D10]"
                        >
                          {storyNarrationStatus === "speaking" ? (isArabic ? "يقرأ الآن..." : "Reading...") : isArabic ? "اقرأ الصفحة" : "Read page"}
                        </button>
                        <button
                          type="button"
                          onClick={() => goToNextStoryPage(totalPages)}
                          disabled={!canGoNext}
                          className="ui-action rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2 text-xs text-bone/72 transition-colors hover:border-[#C9A86A]/45 hover:text-[#C9A86A] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {isArabic ? "الصفحة التالية" : "Next page"}
                        </button>
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const pages = isArabic ? selectedChildStory.pagesAr : selectedChildStory.pagesEn;
                            startStoryAutoPlay(pages);
                          }}
                          disabled={storyAutoPlayStatus === "playing"}
                          className="ui-action rounded-xl border border-emerald-100/24 bg-emerald-100/[0.1] px-3 py-2 text-xs text-emerald-50 transition-colors hover:bg-emerald-100 hover:text-[#0E0D10] disabled:cursor-not-allowed disabled:opacity-55"
                        >
                          {storyAutoPlayStatus === "playing" ? (isArabic ? "يقرأ تلقائياً..." : "Auto reading...") : isArabic ? "اقرأ القصة تلقائياً" : "Auto-read story"}
                        </button>
                        <button
                          type="button"
                          onClick={stopStoryNarration}
                          className="ui-action rounded-xl border border-rose-100/24 bg-rose-100/[0.08] px-3 py-2 text-xs text-rose-50 transition-colors hover:bg-rose-100 hover:text-[#0E0D10]"
                        >
                          {isArabic ? "إيقاف القراءة" : "Stop reading"}
                        </button>
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
                        <button
                          type="button"
                          onClick={() => {
                            stopStoryNarration();
                            setSelectedChildStory(null);
                          }}
                          className="ui-action rounded-xl border border-white/12 px-4 py-3 text-xs text-bone/62 transition-colors hover:border-[#C9A86A]/45 hover:text-[#C9A86A]"
                        >
                          {isArabic ? "رجوع للقصص" : "Back to stories"}
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            </article>
          </div>
        ), document.body) : null}

        {rewardRevealStory && typeof document !== "undefined" ? createPortal((
          <div className="fixed inset-0 z-[150] grid place-items-center bg-black/74 px-4 py-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-label={isArabic ? "ملصق مكافأة جديد" : "New reward sticker"} dir={isArabic ? "rtl" : "ltr"}>
            <button type="button" className="absolute inset-0" onClick={() => setRewardRevealStory(null)} aria-label={isArabic ? "إغلاق المكافأة" : "Close reward"} />
            <article className="relative w-full max-w-md overflow-hidden rounded-[1.6rem] border border-amber-100/28 bg-[linear-gradient(160deg,rgba(201,168,106,0.2),rgba(14,13,16,0.96)_55%,rgba(255,255,255,0.06))] p-5 text-center shadow-[0_32px_90px_rgba(0,0,0,0.42)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.28),transparent_16%),radial-gradient(circle_at_80%_18%,rgba(255,255,255,0.16),transparent_14%),radial-gradient(circle_at_50%_100%,rgba(201,168,106,0.12),transparent_35%)]" aria-hidden="true" />
              <div className="relative">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-amber-100/78">{isArabic ? "Story Reward Sticker" : "Story Reward Sticker"}</p>
                <div className="mx-auto mt-4 grid h-28 w-28 place-items-center rounded-full border-4 border-amber-100/30 bg-black/18 text-5xl text-white shadow-[0_0_0_10px_rgba(201,168,106,0.1)]">
                  {rewardRevealStory.posterGlyph}
                </div>
                <h3 className={`${isArabic ? "font-arsans" : "font-ensans"} mt-4 text-2xl font-semibold text-white`}>
                  {isArabic ? "ملصق جديد في جواز الحكايات" : "New sticker for the Story Passport"}
                </h3>
                <p className={`${isArabic ? "font-arsans" : "font-ensans"} mt-2 text-sm leading-6 text-white/76`}>
                  {isArabic
                    ? `أكملت قصة ${rewardRevealStory.titleAr} وحصلت على ختم جديد في رف القصص.`
                    : `You finished ${rewardRevealStory.titleEn} and earned a new stamp in the story shelf.`}
                </p>
                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-100/24 bg-amber-100/10 px-3 py-1.5 font-mono text-[10px] text-amber-100" dir="ltr">
                  <span>★</span>
                  <span>{rewardRevealStory.readingMinutes} min</span>
                  <span>•</span>
                  <span>{rewardRevealStory.ageBand}</span>
                </div>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <button type="button" onClick={() => setRewardRevealStory(null)} className="ui-action rounded-xl bg-[#C9A86A] px-4 py-3 text-xs text-[#0E0D10] transition-colors hover:bg-[#F7F3EC]">
                    {isArabic ? "رائع" : "Awesome"}
                  </button>
                  {nextAdventureStory && nextAdventureStory.id !== rewardRevealStory.id ? (
                    <button
                      type="button"
                      onClick={() => {
                        setRewardRevealStory(null);
                        setSelectedChildStory(nextAdventureStory);
                      }}
                      className="ui-action rounded-xl border border-sky-100/22 bg-sky-100/[0.08] px-4 py-3 text-xs text-sky-100 transition-colors hover:bg-sky-100 hover:text-[#0E0D10]"
                    >
                      {isArabic ? `المغامرة التالية: ${nextAdventureStory.titleAr}` : `Next adventure: ${nextAdventureStory.titleEn}`}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setRewardRevealStory(null);
                      setSelectedChildStory(null);
                    }}
                    className="ui-action rounded-xl border border-white/12 px-4 py-3 text-xs text-bone/62 transition-colors hover:border-[#C9A86A]/45 hover:text-[#C9A86A]"
                  >
                    {isArabic ? "ارجع للمكتبة" : "Back to shelf"}
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