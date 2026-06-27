"use client";

import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { FormEvent, useEffect, useState } from "react";
import { useAppLocale } from "../../components/AppShell";

type SavedMoment = {
  id: string;
  text: string;
  world: string;
  personaId?: string;
  personaName?: string;
  avatarPath?: string;
  language?: "ar" | "en";
  savedAt: string;
};

type TinyPlan = {
  id: string;
  title: string;
  steps: string[];
  world: string;
  language?: "ar" | "en";
  createdAt: string;
};

type JourneySnapshot = {
  id: string;
  title: string;
  theme: string;
  nextStep: string;
  messageCount: number;
  world: string;
  language?: "ar" | "en";
  createdAt: string;
};

type GrowthQuest = {
  id: string;
  title: string;
  reason: string;
  days: Array<{ label: string; done: boolean }>;
  world: string;
  language?: "ar" | "en";
  createdAt: string;
};

type JourneyInsight = {
  artifactCount: number;
  completedQuestSteps: number;
  dominantWorlds: Array<{ world: string; count: number }>;
  reflectionScore: number;
  streakSignal: string;
  nextFocus: string;
};

type CompanionInsight = {
  name: string;
  avatarPath?: string;
  count: number;
  world: string;
  latestText: string;
};

type ReflectionReelItem = {
  before: string;
  after: string;
  world: string;
  createdAt: string;
};

type CompanionRecommendation = {
  name: string;
  reason: string;
  command: string;
};

type VoiceDialect = "ar-EG" | "ar-SA" | "ar-AE" | "ar-LB";

type Profile = {
  id: string;
  name: string | null;
  nickname: string | null;
  email: string | null;
  image: string | null;
  role: string;
  activeTier: string;
  lemonSubscriptionStatus: string | null;
  lemonCustomerPortalUrl: string | null;
  createdAt: string;
  socialLinks: Record<string, string>;
};

const logoOptions = [
  "/profile-logos/calm.svg",
  "/profile-logos/spark.svg",
  "/profile-logos/cedar.svg",
  "/profile-logos/moon.svg",
  "/profile-logos/wave.svg",
  "/profile-logos/terracotta.svg",
];

const worldLabels: Record<string, { ar: string; en: string }> = {
  calm: { ar: "هادئ", en: "Calm" },
  story: { ar: "حكاية", en: "Story" },
  faith: { ar: "إيمان", en: "Faith" },
  build: { ar: "بناء", en: "Build" },
  learning: { ar: "تعلم", en: "Learning" },
  celebration: { ar: "فرح", en: "Joy" },
  grief: { ar: "سكينة", en: "Stillness" },
};

const voiceDialectStorageKey = "fadfada-voice-dialect";

const voiceDialects: Array<{ value: VoiceDialect; ar: string; en: string; detailAr: string; detailEn: string }> = [
  { value: "ar-EG", ar: "مصري", en: "Egyptian", detailAr: "دافئ وقريب", detailEn: "warm and close" },
  { value: "ar-SA", ar: "فصحى هادئة", en: "MSA", detailAr: "واضح ورسمي", detailEn: "clear and formal" },
  { value: "ar-AE", ar: "خليجي", en: "Gulf", detailAr: "ناعم ومطمئن", detailEn: "soft and steady" },
  { value: "ar-LB", ar: "شامي", en: "Levantine", detailAr: "خفيف وقريب", detailEn: "light and familiar" },
];

export function ProfileClient({ initialProfile }: { initialProfile: Profile }) {
  const { language, direction } = useAppLocale();
  const isArabic = language === "ar";
  const [profile, setProfile] = useState(initialProfile);
  const [savedMoments, setSavedMoments] = useState<SavedMoment[]>([]);
  const [tinyPlans, setTinyPlans] = useState<TinyPlan[]>([]);
  const [journeySnapshots, setJourneySnapshots] = useState<JourneySnapshot[]>([]);
  const [growthQuests, setGrowthQuests] = useState<GrowthQuest[]>([]);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [billingStatus, setBillingStatus] = useState<"idle" | "opening" | "error">("idle");
  const [billingMessage, setBillingMessage] = useState("");
  const [voiceDialect, setVoiceDialect] = useState<VoiceDialect>("ar-EG");
  const journeyInsight = buildJourneyInsight({ savedMoments, tinyPlans, journeySnapshots, growthQuests }, language);
  const companionInsights = buildCompanionInsights(savedMoments, language);
  const storyMirrorMoments = savedMoments.filter((moment) => moment.world === "story").slice(0, 4);
  const moodConstellation = buildMoodConstellation({ savedMoments, tinyPlans, journeySnapshots, growthQuests });
  const reflectionReel = buildReflectionReel(savedMoments, journeySnapshots, language);
  const companionRecommendations = buildCompanionRecommendations(journeyInsight.dominantWorlds, language);

  useEffect(() => {
    setSavedMoments(JSON.parse(localStorage.getItem("fadfada-saved-moments") || "[]") as SavedMoment[]);
    setTinyPlans(JSON.parse(localStorage.getItem("fadfada-tiny-plans") || "[]") as TinyPlan[]);
    setJourneySnapshots(JSON.parse(localStorage.getItem("fadfada-journey-snapshots") || "[]") as JourneySnapshot[]);
    setGrowthQuests(JSON.parse(localStorage.getItem("fadfada-growth-quests") || "[]") as GrowthQuest[]);
    setVoiceDialect(normalizeVoiceDialect(localStorage.getItem(voiceDialectStorageKey)));
  }, []);

  function saveVoiceDialect(nextDialect: VoiceDialect) {
    localStorage.setItem(voiceDialectStorageKey, nextDialect);
    setVoiceDialect(nextDialect);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");

    const response = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: profile.name,
        nickname: profile.nickname,
        image: profile.image,
        socialLinks: profile.socialLinks,
      }),
    });

    if (!response.ok) {
      setStatus("error");
      return;
    }

    const data = (await response.json()) as { profile: Profile };
    setProfile(data.profile);
    setStatus("saved");
  }

  function clearSavedMoments() {
    localStorage.removeItem("fadfada-saved-moments");
    setSavedMoments([]);
  }

  function clearTinyPlans() {
    localStorage.removeItem("fadfada-tiny-plans");
    setTinyPlans([]);
  }

  function clearJourneySnapshots() {
    localStorage.removeItem("fadfada-journey-snapshots");
    setJourneySnapshots([]);
  }

  function toggleQuestDay(questId: string, dayIndex: number) {
    const nextQuests = growthQuests.map((quest) =>
      quest.id === questId
        ? { ...quest, days: quest.days.map((day, index) => index === dayIndex ? { ...day, done: !day.done } : day) }
        : quest
    );
    localStorage.setItem("fadfada-growth-quests", JSON.stringify(nextQuests));
    setGrowthQuests(nextQuests);
  }

  function clearGrowthQuests() {
    localStorage.removeItem("fadfada-growth-quests");
    setGrowthQuests([]);
  }

  async function startPlusCheckout() {
    setBillingStatus("opening");
    setBillingMessage("");
    const discountCode = typeof window !== "undefined" ? localStorage.getItem("fadfada-discount-code") || undefined : undefined;
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: profile.id, currentLanguage: language, product: "plus_access", personaId: "profile", discountCode }),
    }).catch(() => null);
    const data = response ? ((await response.json().catch(() => ({}))) as { url?: string; error?: string; message?: string; messageEn?: string; lemonMessage?: string; paddleMessage?: string }) : null;

    if (data?.url) {
      window.location.assign(data.url);
      return;
    }

    setBillingStatus("error");
    setBillingMessage(getCheckoutErrorMessage(data, language));
  }

  return (
    <main className="min-h-screen bg-ink px-5 pb-16 pt-24 text-bone/90" dir={direction}>
      <section className="mx-auto grid max-w-5xl gap-8 md:grid-cols-[0.9fr_1.1fr]">
        <aside className="border border-white/10 bg-white/[0.03] p-5">
          <p className="ui-kicker">{isArabic ? "ملف الحساب" : "Account profile"}</p>
          <div className="mt-5 flex items-center gap-4">
            <span className="relative h-20 w-20 overflow-hidden rounded-[1.7rem] border border-white/10 bg-slate-950">
              {profile.image ? <Image src={profile.image} alt={isArabic ? "شعار الملف" : "Profile logo"} fill sizes="80px" className="object-cover" unoptimized /> : <span className="grid h-full place-items-center font-mono text-2xl text-gold">{isArabic ? "ف" : "F"}</span>}
            </span>
            <div className="min-w-0">
              <h1 className="truncate font-arserif text-4xl text-bone/95">{profile.nickname || profile.name || (isArabic ? "ملفي" : "My profile")}</h1>
              <p className="mt-1 truncate font-ensans text-xs text-bone/45" dir="ltr">{profile.email}</p>
              <p className="mt-1 font-arsans text-sm text-gold">{profile.role === "ADMIN" ? (isArabic ? "مدير" : "Admin") : isArabic ? "مستخدم" : "User"} · {formatTier(profile.activeTier, language)}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/" className="ui-action border border-white/15 px-3 py-2 text-bone/85 hover:border-gold/35 hover:text-gold">
              {isArabic ? "العودة للمحادثة" : "Return to chat"}
            </Link>
            {profile.role === "ADMIN" ? <Link href="/admin/dashboard" className="ui-action border border-gold/35 px-3 py-2 text-gold">{isArabic ? "لوحة الإدارة" : "Admin dashboard"}</Link> : null}
            <button type="button" onClick={() => void signOut({ callbackUrl: "/" })} className="ui-action border border-red-300/25 px-3 py-2 text-red-200/80">
              {isArabic ? "تسجيل الخروج" : "Sign out"}
            </button>
          </div>
        </aside>

        <section className="border border-gold/20 bg-gold/[0.025] p-5">
          <p className="ui-kicker">{isArabic ? "الفوترة" : "Billing"}</p>
          <h2 className="mt-2 font-arserif text-3xl text-bone/90">{isArabic ? "إدارة الخطة" : "Manage plan"}</h2>
          <p className="mt-3 font-arsans text-sm leading-7 text-bone/60">
            {isArabic
              ? `خطتك الحالية: ${formatTier(profile.activeTier, language)}${profile.lemonSubscriptionStatus ? ` · ${formatSubscriptionStatus(profile.lemonSubscriptionStatus, language)}` : ""}`
              : `Current plan: ${formatTier(profile.activeTier, language)}${profile.lemonSubscriptionStatus ? ` · ${formatSubscriptionStatus(profile.lemonSubscriptionStatus, language)}` : ""}`}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {profile.activeTier === "PLUS" && profile.lemonCustomerPortalUrl ? (
              <a href={profile.lemonCustomerPortalUrl} target="_blank" rel="noreferrer" className="ui-action bg-gold px-4 py-3 text-ink transition-colors hover:bg-bone">
                {isArabic ? "إدارة الاشتراك" : "Manage subscription"}
              </a>
            ) : profile.activeTier === "PLUS" ? (
              <Link href="/refund" className="ui-action border border-white/15 px-4 py-3 text-bone/85 hover:border-gold/35 hover:text-gold">
                {isArabic ? "مساعدة الفوترة" : "Billing help"}
              </Link>
            ) : (
              <button type="button" onClick={() => void startPlusCheckout()} disabled={billingStatus === "opening"} className="ui-action bg-gold px-4 py-3 text-ink transition-colors hover:bg-bone disabled:opacity-60">
                {billingStatus === "opening" ? (isArabic ? "جار فتح الدفع..." : "Opening checkout...") : isArabic ? "الترقية إلى بلس" : "Upgrade to Plus"}
              </button>
            )}
            <Link href="/refund" className="ui-action border border-white/15 px-4 py-3 text-bone/85 hover:border-gold/35 hover:text-gold">
              {isArabic ? "سياسة الاسترداد" : "Refund policy"}
            </Link>
          </div>
          {billingStatus === "error" ? <p className="mt-3 font-arsans text-sm leading-6 text-red-200">{billingMessage}</p> : null}
          <PlusUnlockedPanel language={language} activeTier={profile.activeTier} />
        </section>

        <form onSubmit={saveProfile} className="space-y-5 border border-white/10 bg-white/[0.025] p-5">
          <div>
            <p className="ui-kicker">{isArabic ? "تعديل الهوية العامة" : "Edit public identity"}</p>
            <p className="mt-2 font-arsans text-sm leading-7 text-bone/55">{isArabic ? "هذه بيانات حساب المستخدم، وليست شخصية الرفيق داخل المحادثة." : "These are account details, separate from the companion persona inside chat."}</p>
          </div>
          <ProfileInput label={isArabic ? "الاسم الكامل" : "Full name"} value={profile.name || ""} onChange={(value) => setProfile((current) => ({ ...current, name: value }))} />
          <ProfileInput label={isArabic ? "الاسم المختصر" : "Nickname"} value={profile.nickname || ""} onChange={(value) => setProfile((current) => ({ ...current, nickname: value }))} />
          <ProfileInput label={isArabic ? "رابط صورة آمن" : "Secure image link"} value={profile.image || ""} onChange={(value) => setProfile((current) => ({ ...current, image: value }))} dir="ltr" />

          <div>
            <p className="mb-3 font-arsans text-sm text-bone/65">{isArabic ? "أو اختر شعار حساب جاهز" : "Or choose a ready account logo"}</p>
            <div className="grid grid-cols-6 gap-2">
              {logoOptions.map((logo) => (
                <button key={logo} type="button" onClick={() => setProfile((current) => ({ ...current, image: logo }))} className={`relative aspect-square overflow-hidden border ${profile.image === logo ? "border-gold" : "border-white/10"}`}>
                  <Image src={logo} alt={isArabic ? "خيار شعار الحساب" : "Profile logo option"} fill sizes="64px" className="object-cover" unoptimized />
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {(["website", "linkedin", "x", "instagram"] as const).map((key) => (
              <ProfileInput key={key} label={socialLabels[language][key]} value={profile.socialLinks[key] || ""} onChange={(value) => setProfile((current) => ({ ...current, socialLinks: { ...current.socialLinks, [key]: value } }))} dir="ltr" />
            ))}
          </div>

          <button type="submit" className="ui-action w-full bg-gold px-4 py-3 text-ink transition-colors hover:bg-bone">
            {status === "saving" ? (isArabic ? "جار الحفظ..." : "Saving...") : status === "saved" ? (isArabic ? "تم الحفظ" : "Saved") : isArabic ? "حفظ الملف" : "Save profile"}
          </button>
          {status === "error" ? <p className="font-arsans text-sm text-red-200">{isArabic ? "لم يتم الحفظ. تأكد أن الروابط تبدأ باتصال آمن." : "Could not save. Make sure links use a secure address."}</p> : null}
        </form>

        <section className="md:col-span-2 border border-dusk/25 bg-dusk/[0.035] p-5">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="ui-kicker text-dusk">{isArabic ? "خريطة الرحلة" : "Journey map"}</p>
              <h2 className="mt-2 font-arserif text-3xl text-bone/90">{isArabic ? "ما يتكرر في رحلتك" : "What keeps returning in your journey"}</h2>
              <p className="mt-3 font-arsans text-sm leading-7 text-bone/58">{journeyInsight.nextFocus}</p>
              <div className="mt-5 grid grid-cols-3 gap-3">
                <InsightTile label={isArabic ? "أثر محفوظ" : "Artifacts"} value={journeyInsight.artifactCount.toLocaleString(isArabic ? "ar-EG" : "en-US")} />
                <InsightTile label={isArabic ? "خطوات منجزة" : "Steps done"} value={journeyInsight.completedQuestSteps.toLocaleString(isArabic ? "ar-EG" : "en-US")} />
                <InsightTile label={isArabic ? "مؤشر التقدم" : "Progress"} value={`${journeyInsight.reflectionScore}%`} />
              </div>
            </div>
            <div className="space-y-4">
              <p className="font-arsans text-sm text-bone/55">{journeyInsight.streakSignal}</p>
              <div className="space-y-3">
                {journeyInsight.dominantWorlds.length > 0 ? journeyInsight.dominantWorlds.map((entry) => (
                  <div key={entry.world} className="grid grid-cols-[6rem_1fr_2.5rem] items-center gap-3">
                    <span className="font-arsans text-xs text-bone/55">{formatWorld(entry.world, language)}</span>
                    <span className="h-px bg-white/10"><span className="block h-px bg-dusk" style={{ width: `${Math.min(100, entry.count * 22)}%` }} /></span>
                    <span className="text-right font-mono text-[10px] text-bone/38">{entry.count}</span>
                  </div>
                )) : <p className="font-arsans text-sm text-bone/42">{isArabic ? "ابدأ بحفظ لحظة أو خطة صغيرة لتظهر الخريطة." : "Save a moment or tiny plan to light up the map."}</p>}
              </div>
            </div>
          </div>
        </section>

        <section className="md:col-span-2 border border-white/10 bg-white/[0.025] p-5">
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="ui-kicker text-dusk">{isArabic ? "كوكبة المزاج" : "Mood constellation"}</p>
              <h2 className="mt-2 font-arserif text-3xl text-bone/90">{isArabic ? "نمطك بدون ازدحام أرقام" : "Your pattern without chart clutter"}</h2>
              <p className="mt-3 font-arsans text-sm leading-7 text-bone/55">{isArabic ? "كل نقطة أثر محفوظ. لونها يلمّح للمساحة التي رجعت لها أكثر من مرة." : "Each point is a saved artifact. Its color hints at the world you returned to."}</p>
            </div>
            <div className="grid min-h-44 grid-cols-8 gap-2 rounded-sm border border-white/10 bg-black/15 p-4 sm:grid-cols-12">
              {moodConstellation.length > 0 ? moodConstellation.map((point, index) => (
                <span key={`${point.world}-${index}`} title={formatWorld(point.world, language)} className={`aspect-square rounded-full ${point.className}`} style={{ opacity: point.opacity }} />
              )) : <p className="col-span-full self-center font-arsans text-sm text-bone/42">{isArabic ? "احفظ لحظات وخططاً لتظهر الكوكبة." : "Save moments and plans to reveal the constellation."}</p>}
            </div>
          </div>
        </section>

        <section className="md:col-span-2 grid gap-4 lg:grid-cols-2">
          <div className="border border-emerald-300/15 bg-emerald-300/[0.025] p-5">
            <p className="ui-kicker text-emerald-200">{isArabic ? "شريط قبل / بعد" : "Before / after reel"}</p>
            <h2 className="mt-2 font-arserif text-3xl text-bone/90">{isArabic ? "الأثر الذي تتركه الجلسات" : "The trace your sessions leave"}</h2>
            <div className="mt-5 space-y-3">
              {reflectionReel.length > 0 ? reflectionReel.map((item) => (
                <article key={`${item.createdAt}-${item.world}`} className="border border-emerald-300/15 bg-black/10 p-4">
                  <p className="font-arsans text-xs text-bone/38">{formatWorld(item.world, language)} · {new Date(item.createdAt).toLocaleDateString(isArabic ? "ar-EG" : "en-US")}</p>
                  <p className="mt-3 font-arsans text-sm leading-6 text-bone/58" dir="auto"><span className="text-bone/35">{isArabic ? "قبل: " : "Before: "}</span>{item.before}</p>
                  <p className="mt-2 font-arsans text-sm leading-6 text-emerald-100/75" dir="auto"><span className="text-emerald-200">{isArabic ? "بعد: " : "After: "}</span>{item.after}</p>
                </article>
              )) : <p className="font-arsans text-sm leading-7 text-bone/45">{isArabic ? "احفظ لقطة رحلة لتظهر هنا نتيجة الجلسة بدون كشف كل المحادثة." : "Save a journey snapshot to show the session outcome without exposing the full chat."}</p>}
            </div>
          </div>

          <div className="border border-dusk/25 bg-dusk/[0.035] p-5">
            <p className="ui-kicker text-dusk">{isArabic ? "اقتراح الرفيق التالي" : "Next companion suggestion"}</p>
            <h2 className="mt-2 font-arserif text-3xl text-bone/90">{isArabic ? "من يستحق التجربة الآن" : "Who is worth trying next"}</h2>
            <div className="mt-5 space-y-3">
              {companionRecommendations.map((item) => (
                <article key={item.command} className="grid grid-cols-[1fr_auto] gap-3 border border-white/10 bg-black/10 p-4">
                  <span className="min-w-0">
                    <span className="block font-arsans text-sm text-bone/82">{item.name}</span>
                    <span className="mt-1 block font-arsans text-xs leading-5 text-bone/45">{item.reason}</span>
                  </span>
                  <Link href={`/?demoCommand=${encodeURIComponent(item.command)}`} className="ui-action self-center border border-dusk/35 px-3 py-2 text-dusk hover:bg-dusk hover:text-ink">{item.command}</Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="md:col-span-2 grid gap-4 lg:grid-cols-2">
          <div className="border border-white/10 bg-white/[0.025] p-5">
            <p className="ui-kicker text-gold">{isArabic ? "ذاكرة الرفقاء" : "Companion memory"}</p>
            <h2 className="mt-2 font-arserif text-3xl text-bone/90">{isArabic ? "من ساعدك مؤخراً" : "Who has been helping lately"}</h2>
            <div className="mt-5 space-y-3">
              {companionInsights.length > 0 ? companionInsights.map((companion) => (
                <article key={companion.name} className="grid grid-cols-[2.6rem_1fr_auto] items-center gap-3 border border-white/10 bg-black/10 p-3">
                  <span className="relative h-10 w-10 overflow-hidden rounded-full border border-gold/20 bg-gold/10">
                    {companion.avatarPath ? <Image src={companion.avatarPath} alt={companion.name} fill sizes="40px" className="object-cover" unoptimized /> : null}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-arsans text-sm text-bone/82" dir="auto">{companion.name}</span>
                    <span className="mt-1 block truncate font-arsans text-xs text-bone/42" dir="auto">{formatWorld(companion.world, language)} · {companion.latestText}</span>
                  </span>
                  <span className="font-mono text-[10px] text-gold">{companion.count}</span>
                  {companion.count >= 3 ? <span className="col-span-3 border-t border-white/10 pt-2 font-arsans text-xs text-gold/80">{isArabic ? "شارة تطور: رفيق متكرر" : "Evolution badge: recurring companion"}</span> : null}
                </article>
              )) : <p className="font-arsans text-sm leading-7 text-bone/45">{isArabic ? "احفظ لحظة من رد رفيقك لتبدأ ذاكرة الرفقاء بالظهور هنا." : "Save a reply from a companion and this memory strip will start to appear here."}</p>}
            </div>
          </div>

          <div className="border border-gold/20 bg-gold/[0.025] p-5">
            <p className="ui-kicker text-gold">{isArabic ? "معرض المرآة" : "Story Mirror gallery"}</p>
            <h2 className="mt-2 font-arserif text-3xl text-bone/90">{isArabic ? "مشاهدك الرمزية المحفوظة" : "Your saved symbolic scenes"}</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {storyMirrorMoments.length > 0 ? storyMirrorMoments.map((moment) => (
                <article key={moment.id} className="border border-gold/20 bg-black/10 p-4">
                  <img src={buildStoryMirrorPreviewUrl(moment)} alt={isArabic ? "مشهد رمزي محفوظ" : "Saved symbolic scene"} className="mb-4 aspect-video w-full border border-white/10 object-cover" loading="lazy" />
                  <p className="font-arsans text-sm leading-6 text-bone/72" dir="auto">{cleanArtifactText(moment.text).slice(0, 160)}</p>
                  <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-bone/35">{new Date(moment.savedAt).toLocaleDateString(isArabic ? "ar-EG" : "en-US")}</p>
                </article>
              )) : <p className="font-arsans text-sm leading-7 text-bone/45">{isArabic ? "استخدم /story ثم احفظ الرد ليظهر هنا كمعرض هادئ." : "Use /story, then save the reply to build a quiet gallery here."}</p>}
            </div>
          </div>
        </section>

        <section className="md:col-span-2 border border-cyan-200/15 bg-cyan-200/[0.025] p-5">
          <p className="ui-kicker text-cyan-100">{isArabic ? "استوديو الصوت الخفيف" : "Voice studio lite"}</p>
          <h2 className="mt-2 font-arserif text-3xl text-bone/90">{isArabic ? "اختر نبرة العربية المفضلة" : "Choose your Arabic voice flavor"}</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            {voiceDialects.map((dialect) => (
              <button key={dialect.value} type="button" onClick={() => saveVoiceDialect(dialect.value)} className={`border p-4 text-start transition-colors ${voiceDialect === dialect.value ? "border-cyan-200/60 bg-cyan-200/10" : "border-white/10 bg-black/10 hover:border-cyan-200/35"}`}>
                <span className="block font-arsans text-sm text-bone/85">{isArabic ? dialect.ar : dialect.en}</span>
                <span className="mt-2 block font-arsans text-xs text-bone/42">{isArabic ? dialect.detailAr : dialect.detailEn}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="md:col-span-2 border border-white/10 bg-white/[0.025] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="ui-kicker">{isArabic ? "اللحظات المحفوظة" : "Saved moments"}</p>
              <h2 className="mt-2 font-arserif text-3xl text-bone/90">{isArabic ? "لحظاتك المحفوظة على هذا الجهاز" : "Your saved moments on this device"}</h2>
            </div>
            {savedMoments.length > 0 ? <button type="button" onClick={clearSavedMoments} className="ui-action text-bone/45 hover:text-red-200">{isArabic ? "مسح الكل" : "Clear all"}</button> : null}
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {savedMoments.length > 0 ? savedMoments.map((moment) => (
              <article key={moment.id} className="border border-white/10 p-4">
                <p className="font-arsans text-sm leading-7 text-bone/75" dir="auto">{moment.text}</p>
                <p className="mt-3 font-arsans text-xs text-bone/35" dir={direction}>{formatWorld(moment.world, language)} · {new Date(moment.savedAt).toLocaleString(isArabic ? "ar-EG" : "en-US")}</p>
              </article>
            )) : <p className="font-arsans text-sm text-bone/45">{isArabic ? "لا توجد لحظات محفوظة بعد. استخدم زر احفظ اللحظة تحت أي رد." : "No saved moments yet. Use the save moment button under any reply."}</p>}
          </div>
        </section>

        <section className="md:col-span-2 border border-gold/20 bg-gold/[0.025] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="ui-kicker">{isArabic ? "لقطات الرحلة" : "Journey snapshots"}</p>
              <h2 className="mt-2 font-arserif text-3xl text-bone/90">{isArabic ? "ملخصات تقدمك المحفوظة" : "Saved progress artifacts"}</h2>
            </div>
            {journeySnapshots.length > 0 ? <button type="button" onClick={clearJourneySnapshots} className="ui-action text-bone/45 hover:text-red-200">{isArabic ? "مسح اللقطات" : "Clear snapshots"}</button> : null}
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {journeySnapshots.length > 0 ? journeySnapshots.map((snapshot) => (
              <article key={snapshot.id} className="border border-gold/20 bg-black/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-arsans text-sm font-semibold text-bone/88">{formatSnapshotTitle(snapshot, language)}</p>
                    <p className="mt-1 font-arsans text-xs text-bone/35" dir={direction}>{formatWorld(snapshot.world, language)} · {new Date(snapshot.createdAt).toLocaleString(isArabic ? "ar-EG" : "en-US")}</p>
                  </div>
                  <span className="rounded-full bg-gold/10 px-2 py-1 font-mono text-[10px] text-gold">{snapshot.messageCount}</span>
                </div>
                <p className="mt-4 font-arsans text-sm leading-7 text-bone/72" dir="auto"><span className="text-gold">{isArabic ? "الخيط: " : "Thread: "}</span>{snapshot.theme}</p>
                <p className="mt-2 font-arsans text-sm leading-7 text-bone/62" dir="auto"><span className="text-emerald-200">{isArabic ? "الخطوة: " : "Step: "}</span>{snapshot.nextStep}</p>
              </article>
            )) : <p className="font-arsans text-sm text-bone/45">{isArabic ? "لا توجد لقطات بعد. من الصفحة الرئيسية، احفظ لقطة من استمرار المحادثة." : "No snapshots yet. From the home screen, save a snapshot from Smart Continuity."}</p>}
          </div>
        </section>

        <section className="md:col-span-2 border border-cyan-200/15 bg-cyan-200/[0.025] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="ui-kicker">{isArabic ? "تحديات فضفضة" : "FadFada quests"}</p>
              <h2 className="mt-2 font-arserif text-3xl text-bone/90">{isArabic ? "تحديات صغيرة تكسبها خلال ٣ أيام" : "Tiny 3-day challenges you can actually finish"}</h2>
            </div>
            {growthQuests.length > 0 ? <button type="button" onClick={clearGrowthQuests} className="ui-action text-bone/45 hover:text-red-200">{isArabic ? "مسح التحديات" : "Clear quests"}</button> : null}
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {growthQuests.length > 0 ? growthQuests.map((quest) => {
              const doneCount = quest.days.filter((day) => day.done).length;
              return (
                <article key={quest.id} className="border border-cyan-200/15 bg-black/10 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-arsans text-sm font-semibold text-bone/88">{formatQuestTitle(quest, language)}</p>
                      <p className="mt-1 font-arsans text-xs text-bone/35" dir={direction}>{formatWorld(quest.world, language)} · {new Date(quest.createdAt).toLocaleString(isArabic ? "ar-EG" : "en-US")}</p>
                    </div>
                    <span className="rounded-full bg-cyan-200/10 px-2 py-1 font-mono text-[10px] text-cyan-100">{doneCount}/{quest.days.length}</span>
                  </div>
                  <p className="mt-3 font-arsans text-sm leading-6 text-bone/60" dir="auto">{cleanArtifactText(quest.reason)}</p>
                  <div className="mt-4 grid gap-2">
                    {quest.days.map((day, index) => (
                      <label key={`${quest.id}-${index}`} className="flex cursor-pointer items-start gap-3 border border-white/10 bg-white/[0.025] p-3 transition-colors hover:border-cyan-200/35" dir="auto">
                        <input type="checkbox" checked={day.done} onChange={() => toggleQuestDay(quest.id, index)} className="mt-1 h-4 w-4 accent-cyan-200" />
                        <span className={`font-arsans text-sm leading-6 ${day.done ? "text-bone/38 line-through" : "text-bone/72"}`}>{formatQuestDayLabel(quest, index, language)}</span>
                      </label>
                    ))}
                  </div>
                </article>
              );
            }) : <p className="font-arsans text-sm text-bone/45">{isArabic ? "لا توجد تحديات بعد. من الصفحة الرئيسية، ابدأ تحدي من استمرار المحادثة." : "No quests yet. From the home screen, start a quest from Smart Continuity."}</p>}
          </div>
        </section>

        <section className="md:col-span-2 border border-emerald-300/15 bg-emerald-300/[0.025] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="ui-kicker">{isArabic ? "الخطط الصغيرة" : "Tiny plans"}</p>
              <h2 className="mt-2 font-arserif text-3xl text-bone/90">{isArabic ? "خطواتك المحفوظة لهذا الأسبوع" : "Your saved steps for this week"}</h2>
            </div>
            {tinyPlans.length > 0 ? <button type="button" onClick={clearTinyPlans} className="ui-action text-bone/45 hover:text-red-200">{isArabic ? "مسح الخطط" : "Clear plans"}</button> : null}
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {tinyPlans.length > 0 ? tinyPlans.map((plan) => (
              <article key={plan.id} className="border border-emerald-300/15 bg-black/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-arsans text-sm font-semibold text-bone/88">{formatTinyPlanTitle(plan, language)}</p>
                    <p className="mt-1 font-arsans text-xs text-bone/35" dir={direction}>{formatWorld(plan.world, language)} · {new Date(plan.createdAt).toLocaleString(isArabic ? "ar-EG" : "en-US")}</p>
                  </div>
                  <span className="rounded-full bg-emerald-300/10 px-2 py-1 font-mono text-[10px] text-emerald-200">{plan.steps.length}</span>
                </div>
                <ol className="mt-4 space-y-2">
                  {plan.steps.map((step, index) => (
                    <li key={`${plan.id}-${index}`} className="grid grid-cols-[1.6rem_1fr] gap-2 font-arsans text-sm leading-6 text-bone/72" dir="auto">
                      <span className="grid h-6 w-6 place-items-center rounded bg-emerald-300/10 font-mono text-[10px] text-emerald-200">{index + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </article>
            )) : <p className="font-arsans text-sm text-bone/45">{isArabic ? "لا توجد خطط صغيرة بعد. استخدم زر خطة صغيرة تحت أي رد." : "No tiny plans yet. Use the Tiny plan button under any reply."}</p>}
          </div>
        </section>
      </section>
    </main>
  );
}

function ProfileInput({ label, value, onChange, dir = "auto" }: { label: string; value: string; onChange: (value: string) => void; dir?: "auto" | "ltr" }) {
  return (
    <label className="block">
      <span className="mb-2 block font-arsans text-sm text-bone/65">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} dir={dir} className="w-full border border-white/10 bg-black/20 px-3 py-3 font-arsans text-base text-bone outline-none transition-colors focus:border-gold/50" />
    </label>
  );
}

function InsightTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 bg-black/15 p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-bone/35">{label}</p>
      <p className="mt-2 font-enserif text-3xl italic text-bone/90">{value}</p>
    </div>
  );
}

function buildJourneyInsight(
  artifacts: { savedMoments: SavedMoment[]; tinyPlans: TinyPlan[]; journeySnapshots: JourneySnapshot[]; growthQuests: GrowthQuest[] },
  language: "ar" | "en"
): JourneyInsight {
  const worldCounts = new Map<string, number>();
  const addWorld = (world: string) => worldCounts.set(world, (worldCounts.get(world) || 0) + 1);
  artifacts.savedMoments.forEach((item) => addWorld(item.world));
  artifacts.tinyPlans.forEach((item) => addWorld(item.world));
  artifacts.journeySnapshots.forEach((item) => addWorld(item.world));
  artifacts.growthQuests.forEach((item) => addWorld(item.world));

  const artifactCount = artifacts.savedMoments.length + artifacts.tinyPlans.length + artifacts.journeySnapshots.length + artifacts.growthQuests.length;
  const completedQuestSteps = artifacts.growthQuests.reduce((total, quest) => total + quest.days.filter((day) => day.done).length, 0);
  const dominantWorlds = Array.from(worldCounts.entries())
    .map(([world, count]) => ({ world, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
  const reflectionScore = Math.min(100, Math.round(artifactCount * 10 + completedQuestSteps * 7 + artifacts.journeySnapshots.length * 12));
  const topWorld = dominantWorlds[0]?.world;

  return {
    artifactCount,
    completedQuestSteps,
    dominantWorlds,
    reflectionScore,
    streakSignal: language === "ar"
      ? artifactCount > 0 ? "الخريطة لا تقيسك؛ هي فقط تريك أين يعود انتباهك." : "الخريطة هادئة الآن، وستبدأ مع أول لحظة تحفظها."
      : artifactCount > 0 ? "The map does not judge you; it simply shows where attention keeps returning." : "The map is quiet for now; it starts with your first saved artifact.",
    nextFocus: language === "ar"
      ? topWorld ? `أكثر خيط ظاهر الآن هو ${formatWorld(topWorld, language)}. اجعل الخطوة القادمة صغيرة بما يكفي أن تبدأها اليوم.` : "احفظ لحظة، خطة، أو لقطة رحلة لتبدأ فضفضة في رسم نمطك الشخصي."
      : topWorld ? `Your strongest current thread is ${formatWorld(topWorld, language)}. Keep the next step small enough to start today.` : "Save a moment, plan, or snapshot so FadFada can begin drawing your personal pattern.",
  };
}

function buildCompanionInsights(savedMoments: SavedMoment[], language: "ar" | "en"): CompanionInsight[] {
  const fallbackName = language === "ar" ? "رفيق فضفضة" : "FadFada companion";
  const companionMap = new Map<string, CompanionInsight>();

  savedMoments.forEach((moment) => {
    const name = moment.personaName || fallbackName;
    const existing = companionMap.get(name);
    const latestText = cleanArtifactText(moment.text).slice(0, 90);

    companionMap.set(name, {
      name,
      avatarPath: moment.avatarPath || existing?.avatarPath,
      count: (existing?.count || 0) + 1,
      world: existing?.world || moment.world,
      latestText: existing?.latestText || latestText,
    });
  });

  return Array.from(companionMap.values()).sort((a, b) => b.count - a.count).slice(0, 4);
}

function buildReflectionReel(savedMoments: SavedMoment[], journeySnapshots: JourneySnapshot[], language: "ar" | "en"): ReflectionReelItem[] {
  const snapshotItems = journeySnapshots.slice(0, 3).map((snapshot) => ({
    before: cleanArtifactText(snapshot.theme).slice(0, 130),
    after: cleanArtifactText(snapshot.nextStep).slice(0, 150),
    world: snapshot.world,
    createdAt: snapshot.createdAt,
  }));

  if (snapshotItems.length > 0) return snapshotItems;

  return savedMoments.slice(0, 2).map((moment) => ({
    before: language === "ar" ? "لحظة كانت تحتاج اسماً أهدأ." : "A moment that needed a calmer name.",
    after: cleanArtifactText(moment.text).slice(0, 150),
    world: moment.world,
    createdAt: moment.savedAt,
  }));
}

function buildCompanionRecommendations(dominantWorlds: JourneyInsight["dominantWorlds"], language: "ar" | "en"): CompanionRecommendation[] {
  const topWorld = dominantWorlds[0]?.world || "calm";
  const isArabic = language === "ar";
  const primary = topWorld === "story"
    ? { name: isArabic ? "راوية" : "Rawiya", reason: isArabic ? "لأن خيط الحكاية حاضر في رحلتك، جرّب تحويل الشعور إلى مشهد." : "Your story thread is active; try turning the feeling into a scene.", command: "/story" }
    : topWorld === "build" || topWorld === "learning"
      ? { name: isArabic ? "مالك" : "Malek", reason: isArabic ? "لأنك تجمع خطوات وخططاً، جرّب رفيقاً يحوّل الكلام إلى بناء." : "You are collecting steps and plans; try a companion who turns reflection into structure.", command: "/quest" }
      : { name: isArabic ? "عمر" : "Omar", reason: isArabic ? "لأن الخيط يحتاج هدوءاً أولاً، ابدأ بجلسة قصيرة ثم احفظ لقطة." : "The thread needs calm first; start with a short reflection, then save a snapshot.", command: "/judge" };

  const secondary = { name: isArabic ? "بطاقة إثبات" : "Proof Card", reason: isArabic ? "عندما يظهر أثر واضح، حوّله إلى بطاقة مشاركة لا تكشف خصوصيتك." : "When a useful outcome appears, turn it into a shareable proof card without exposing private text.", command: "/proof" };
  return [primary, secondary];
}

function buildMoodConstellation(artifacts: { savedMoments: SavedMoment[]; tinyPlans: TinyPlan[]; journeySnapshots: JourneySnapshot[]; growthQuests: GrowthQuest[] }) {
  const worldsList = [
    ...artifacts.savedMoments.map((item) => item.world),
    ...artifacts.tinyPlans.map((item) => item.world),
    ...artifacts.journeySnapshots.map((item) => item.world),
    ...artifacts.growthQuests.map((item) => item.world),
  ].slice(0, 48);

  return worldsList.map((world, index) => ({
    world,
    className: getConstellationColor(world),
    opacity: 0.42 + ((index % 5) * 0.12),
  }));
}

function getConstellationColor(world: string) {
  if (world === "story") return "bg-gold";
  if (world === "build" || world === "learning") return "bg-emerald-300";
  if (world === "faith" || world === "grief") return "bg-cyan-200";
  if (world === "celebration") return "bg-dusk";
  return "bg-bone/70";
}

function buildStoryMirrorPreviewUrl(moment: SavedMoment) {
  const prompt = [
    "quiet symbolic emotional storyboard frame, not text, no words, no logos",
    formatWorld(moment.world, "en"),
    cleanArtifactText(moment.text).slice(0, 220),
  ].join(", ");

  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=960&height=540&model=flux&nologo=true&seed=${encodeURIComponent(moment.id)}`;
}

function normalizeVoiceDialect(value: string | null): VoiceDialect {
  return voiceDialects.some((dialect) => dialect.value === value) ? value as VoiceDialect : "ar-EG";
}

function formatTier(tier: string, language: "ar" | "en") {
  const normalizedTier = tier.toLowerCase();
  if (normalizedTier === "free") return language === "ar" ? "مجاني" : "Free";
  if (normalizedTier === "plus") return language === "ar" ? "بلس" : "Plus";
  if (normalizedTier === "premium") return language === "ar" ? "مدفوع" : "Premium";
  return tier;
}

function formatSubscriptionStatus(status: string, language: "ar" | "en") {
  const normalizedStatus = status.toLowerCase();
  const labels: Record<string, { ar: string; en: string }> = {
    active: { ar: "نشط", en: "Active" },
    cancelled: { ar: "ملغى", en: "Cancelled" },
    expired: { ar: "منتهي", en: "Expired" },
    past_due: { ar: "متأخر الدفع", en: "Past due" },
    unpaid: { ar: "غير مدفوع", en: "Unpaid" },
  };
  return labels[normalizedStatus]?.[language] || status;
}

function getCheckoutErrorMessage(data: { error?: string; message?: string; messageEn?: string; lemonMessage?: string; paddleMessage?: string } | null, language: "ar" | "en") {
  const isArabic = language === "ar";

  if (!data) {
    return isArabic ? "تعذر الاتصال ببوابة الدفع. تحقق من الاتصال وحاول مرة أخرى." : "Could not reach checkout. Check your connection and try again.";
  }

  if (data.error === "USER_ID_REQUIRED") {
    return isArabic ? "انتهت جلسة الحساب. سجّل الدخول مجددًا ثم حاول الترقية." : "Your account session expired. Sign in again, then try upgrading.";
  }

  if (data.error === "PREMIUM_PAUSED") {
    return isArabic ? data.message || "بوابة الدفع متوقفة مؤقتًا حتى يتم إعداد خطة بلس." : data.messageEn || data.message || "Checkout is paused until Plus billing is configured.";
  }

  if (data.error === "LEMONSQUEEZY_CHECKOUT_FAILED") {
    return isArabic ? `تعذر إنشاء دفع Lemon Squeezy: ${data.lemonMessage || "راجع إعدادات المتجر والمنتج."}` : `Lemon Squeezy checkout failed: ${data.lemonMessage || "Check store and variant settings."}`;
  }

  if (data.error === "PADDLE_CHECKOUT_FAILED" || data.error === "INVALID_PADDLE_PRICE_ID") {
    return isArabic ? `تعذر إنشاء دفع Paddle: ${data.paddleMessage || data.message || "راجع Price ID ومفاتيح Paddle."}` : `Paddle checkout failed: ${data.paddleMessage || data.messageEn || data.message || "Check Paddle price ID and API keys."}`;
  }

  return isArabic ? "تعذر فتح الدفع. راجع إعدادات بوابة الدفع ثم حاول مرة أخرى." : "Could not open checkout. Check payment gateway settings, then try again.";
}

function PlusUnlockedPanel({ language, activeTier }: { language: "ar" | "en"; activeTier: string }) {
  const isArabic = language === "ar";
  const isPlus = activeTier === "PLUS" || activeTier === "BUSINESS";
  const items = isArabic
    ? ["كل الرفقاء والشخصيات", "حفظ جلسات أوسع", "لوحات مشاهد بعد الردود", "بطاقات إثبات ومشاركة آمنة"]
    : ["All companions and personas", "More saved sessions", "Storyboards after replies", "Proof cards and safe sharing"];

  return (
    <div className={`mt-5 rounded-2xl border p-4 ${isPlus ? "border-gold/30 bg-gold/[0.07]" : "border-white/10 bg-black/16"}`}>
      <p className="ui-kicker text-gold">{isPlus ? (isArabic ? "مفتوح في حسابك" : "Unlocked in your account") : isArabic ? "ما يفتحه بلس" : "What Plus unlocks"}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <p key={item} className="rounded-xl border border-white/10 bg-black/14 px-3 py-2 font-arsans text-sm text-bone/62">{item}</p>
        ))}
      </div>
    </div>
  );
}

function formatWorld(world: string, language: "ar" | "en") {
  return worldLabels[world]?.[language] || world;
}

function cleanArtifactText(value: string) {
  return value
    .replace(/^\s{0,3}#{1,6}\s*/gm, "")
    .replace(/[ـ*_`>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatSnapshotTitle(snapshot: JourneySnapshot, language: "ar" | "en") {
  if (snapshot.language && snapshot.language !== language) {
    return language === "ar" ? "لقطة رحلة" : "Journey snapshot";
  }

  const cleanedTitle = cleanArtifactText(snapshot.title);
  return cleanedTitle || (language === "ar" ? "لقطة رحلة" : "Journey snapshot");
}

function formatQuestTitle(quest: GrowthQuest, language: "ar" | "en") {
  if (quest.language && quest.language !== language) {
    return language === "ar" ? "تحدي فضفضة لثلاثة أيام" : "3-Day FadFada Quest";
  }

  const cleanedTitle = cleanArtifactText(quest.title);
  return cleanedTitle || (language === "ar" ? "تحدي فضفضة لثلاثة أيام" : "3-Day FadFada Quest");
}

function formatQuestDayLabel(quest: GrowthQuest, index: number, language: "ar" | "en") {
  const label = cleanArtifactText(quest.days[index]?.label || "");

  if (quest.language && quest.language !== language) {
    const localizedDefaults = language === "ar"
      ? [
          "اختر خطوة صغيرة لا تتجاوز عشر دقائق.",
          "ارجع لفضفضة واكتب ماذا تغيّر بعد الخطوة.",
          "حوّل ما تعلمته إلى خطوة أصغر لليوم التالي.",
        ]
      : [
          "Choose one small step that takes under ten minutes.",
          "Return to FadFada and write what changed after the step.",
          "Turn what you learned into an even smaller step for the next day.",
        ];

    if (index > 0 || isLikelyGeneratedQuestStep(label)) return localizedDefaults[index] || label;
  }

  return label;
}

function formatTinyPlanTitle(plan: TinyPlan, language: "ar" | "en") {
  if (plan.language && plan.language !== language) {
    return language === "ar" ? "خطة صغيرة لهذا اليوم" : "Tiny plan for today";
  }

  const cleanedTitle = cleanArtifactText(plan.title);
  return cleanedTitle || (language === "ar" ? "خطة صغيرة لهذا اليوم" : "Tiny plan for today");
}

function isLikelyGeneratedQuestStep(value: string) {
  return /ارجع لفضفضة|حوّل ما تعلمته|اختر خطوة صغيرة|Return to FadFada|Turn what you learned|Choose one small step/i.test(value);
}

const socialLabels: Record<"ar" | "en", Record<"website" | "linkedin" | "x" | "instagram", string>> = {
  ar: {
    website: "الموقع الشخصي",
    linkedin: "لينكدإن",
    x: "إكس",
    instagram: "إنستغرام",
  },
  en: {
    website: "Website",
    linkedin: "LinkedIn",
    x: "X",
    instagram: "Instagram",
  },
};