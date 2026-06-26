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

type Profile = {
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

  useEffect(() => {
    setSavedMoments(JSON.parse(localStorage.getItem("fadfada-saved-moments") || "[]") as SavedMoment[]);
    setTinyPlans(JSON.parse(localStorage.getItem("fadfada-tiny-plans") || "[]") as TinyPlan[]);
    setJourneySnapshots(JSON.parse(localStorage.getItem("fadfada-journey-snapshots") || "[]") as JourneySnapshot[]);
    setGrowthQuests(JSON.parse(localStorage.getItem("fadfada-growth-quests") || "[]") as GrowthQuest[]);
  }, []);

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
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentLanguage: language, product: "plus_access", personaId: "profile" }),
    }).catch(() => null);
    const data = response ? ((await response.json().catch(() => ({}))) as { url?: string }) : null;

    if (data?.url) {
      window.location.assign(data.url);
      return;
    }

    setBillingStatus("error");
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
          {billingStatus === "error" ? <p className="mt-3 font-arsans text-sm text-red-200">{isArabic ? "تعذر فتح الدفع. سجّل الدخول مجددًا ثم حاول مرة أخرى." : "Could not open checkout. Sign in again and try once more."}</p> : null}
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