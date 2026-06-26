"use client";

import { FormEvent, useState } from "react";
import { useAppLocale } from "../../../components/AppShell";

export type AdminDashboardData = {
  configuration: {
    anonymousReflectionLimit: number;
    signedGiftReflectionLimit: number;
    anonymousPersonaLimit: number;
    signedPersonaLimit: number;
  };
  totalVisitors: number;
  registeredUsers: number;
  interactionTotals: {
    starterTaps: number;
    savedMoments: number;
    capsules: number;
    helpful: number;
    softer: number;
    shares: number;
    visitorComments: number;
    pwaInstalls: number;
  };
  visitorsByRegion: Array<{ location: string; count: number }>;
  registrationsByRegion: Array<{ location: string; count: number }>;
  recentUsers: Array<{
    id: string;
    name: string | null;
    email: string | null;
    provider: string;
    activeTier: string;
    tokenBalance: number;
    currentLanguage: string;
    createdAt: string;
    location: string;
    giftCount: number;
    giftedTokens: number;
  }>;
  discountOffers: Array<{
    id: string;
    code: string;
    label: string;
    percentOff: number;
    appliesTo: string;
    maxRedemptions: number | null;
    expiresAt: string | null;
    isActive: boolean;
    createdAt: string;
  }>;
  distribution: Array<{
    tier: string;
    userCount: number;
    monthlyRevenueMinor: number;
    currency: string;
  }>;
  visitorComments: Array<{
    id: string;
    comment: string;
    language: string;
    device: string;
    browser: string;
    viewport: string;
    location: string;
    createdAt: string;
  }>;
  pwaInstalls: Array<{
    id: string;
    device: string;
    browser: string;
    platform: string;
    viewport: string;
    source: string;
    location: string;
    createdAt: string;
  }>;
  pwaDeviceBreakdown: Array<{ label: string; count: number }>;
  avatarRatings: Array<{
    personaId: string;
    personaNameAr: string;
    personaNameEn: string;
    ratingCount: number;
    averageRating: number;
    latestRating: number;
    latestAt: string;
    location: string;
  }>;
  recentNotifications: Array<{
    id: string;
    type: string;
    titleAr: string;
    titleEn: string;
    bodyAr: string;
    bodyEn: string;
    priority: number;
    isActive: boolean;
    startsAt: string;
    endsAt: string | null;
    createdAt: string;
  }>;
};

type Locale = "ar" | "en";

type AdminDashboardClientProps = {
  data: AdminDashboardData;
  auditHref: string;
};

type AdminTab = "dashboard" | "configuration" | "users" | "offers" | "sessions";

const copy = {
  ar: {
    eyebrow: "مركز إدارة فضفضة",
    title: "لوحة عمليات فضفضة",
    intro: "متابعة الزوار، التسجيلات، مواقع المستخدمين، وتوزيع الخطط في مساحة واحدة جاهزة للعرض والإدارة.",
    metrics: {
      trackedVisits: "الزيارات المتتبعة",
      registeredMembers: "الأعضاء المسجلون",
      visitToSignup: "نسبة التحويل للتسجيل",
      starterTaps: "ضغطات البداية",
      savedMoments: "لحظات محفوظة",
      shares: "مشاركات",
      capsuleDownloads: "كبسولات محملة",
      helpfulReplies: "ردود مفيدة",
      softerRequests: "طلبات تهدئة",
      visitorComments: "تعليقات الزوار",
      pwaInstalls: "تثبيتات التطبيق",
    },
    sections: {
      visitorsKicker: "سجل الزوار",
      visitorsTitle: "مصادر الزيارات الجغرافية",
      visitorsDescription: "أماكن فتح فضفضة من الزوار.",
      registrationKicker: "مواقع الأعضاء",
      registrationTitle: "مواقع التسجيل",
      registrationDescription: "الأماكن التي جاء منها الأعضاء المسجلون.",
      funnelKicker: "مؤشر التسجيل",
      funnelTitle: "أحدث الملفات المسجلة",
      funnelDescription: "آخر الأعضاء، لغة الاستخدام، ومصدر التسجيل.",
      plansKicker: "توزيع الخطط",
      plansTitle: "توزيع الخطط والإيراد الشهري",
      plansDescription: "مزيج الخطط والتدفق الشهري الحالي.",
      commentsKicker: "صوت الزوار",
      commentsTitle: "آخر تعليقات الزوار",
      commentsDescription: "ملاحظات قصيرة يرسلها الزوار من الصفحة الرئيسية.",
      pwaKicker: "تثبيت التطبيق",
      pwaTitle: "تثبيتات PWA والأجهزة",
      pwaDescription: "عدد التثبيتات ونوع الجهاز والمتصفح المستخدم.",
      avatarsKicker: "تقييم الرفقاء",
      avatarsTitle: "تقييمات صور الرفقاء",
      avatarsDescription: "متوسط النجوم وعدد تقييمات المستخدمين لكل صورة رفيق.",
      notificationsKicker: "رسائل الإدارة",
      notificationsTitle: "إضافة تنبيه للمستخدمين",
      notificationsDescription: "انشر تحديثاً جميلاً داخل التطبيق حسب النوع والأولوية.",
      auditKicker: "تصدير المراجعة",
      auditTitle: "تصدير لقطة مشفرة",
      auditDescription: "ملف مراجعة مشفر للزوار والتسجيلات وتوزيع الخطط.",
    },
    emptyVisits: "لا توجد زيارات مسجلة بعد",
    emptySignups: "لا توجد تسجيلات مسجلة بعد",
    emptyComments: "لا توجد تعليقات زوار بعد",
    emptyInstalls: "لا توجد تثبيتات PWA بعد",
    emptyAvatarRatings: "لا توجد تقييمات صور بعد",
    emptyNotifications: "لا توجد تنبيهات منشورة بعد",
    unnamedProfile: "ملف بدون اسم",
    unknownLocation: "موقع غير معروف",
    userCount: "مستخدم",
    monthlyRevenue: "إيراد شهري",
    exportDescription: "يصدر بيانات الزوار والتسجيلات وتوزيع الخطط كملف مشفر للمراجعة والتحليل.",
    exportButton: "تصدير الملف",
    languageNames: { ar: "العربية", en: "الإنجليزية" },
    tiers: { FREE: "مجاني", PLUS: "بلس", BUSINESS: "أعمال" },
  },
  en: {
    eyebrow: "FadFada command center",
    title: "FadFada operations dashboard",
    intro: "Visitor intelligence, registration quality, user locations, and plan distribution in one admin-ready workspace.",
    metrics: {
      trackedVisits: "Tracked visits",
      registeredMembers: "Registered members",
      visitToSignup: "Visit to signup",
      starterTaps: "Starter taps",
      savedMoments: "Saved moments",
      shares: "Shares",
      capsuleDownloads: "Capsule downloads",
      helpfulReplies: "Helpful replies",
      softerRequests: "Softer requests",
      visitorComments: "Visitor comments",
      pwaInstalls: "PWA installs",
    },
    sections: {
      visitorsKicker: "Total visitors ledger",
      visitorsTitle: "Geographic visit sources",
      visitorsDescription: "Where visitors are opening FadFada from.",
      registrationKicker: "Registered member locations",
      registrationTitle: "Signup locations",
      registrationDescription: "Where registered members came from.",
      funnelKicker: "Registration funnel index",
      funnelTitle: "Recent registered profiles",
      funnelDescription: "Recent members, language preference, and registration origin.",
      plansKicker: "Commercial plan distribution",
      plansTitle: "Plan distribution and monthly revenue",
      plansDescription: "Plan mix and current monthly inflow.",
      commentsKicker: "Visitor voice",
      commentsTitle: "Latest visitor comments",
      commentsDescription: "Short notes visitors submit from the home experience.",
      pwaKicker: "App installs",
      pwaTitle: "PWA installs and devices",
      pwaDescription: "Install count, device type, and browser used.",
      avatarsKicker: "Companion quality",
      avatarsTitle: "Avatar star ratings",
      avatarsDescription: "Average stars and end-user rating count for each companion avatar.",
      notificationsKicker: "Admin broadcasts",
      notificationsTitle: "Add user notification",
      notificationsDescription: "Publish a polished in-app update by type and priority.",
      auditKicker: "Audit export",
      auditTitle: "Export encrypted snapshot",
      auditDescription: "Encrypted audit snapshot for visitors, registrations, and plan distribution.",
    },
    emptyVisits: "No visits tracked yet",
    emptySignups: "No signups tracked yet",
    emptyComments: "No visitor comments yet",
    emptyInstalls: "No PWA installs yet",
    emptyAvatarRatings: "No avatar ratings yet",
    emptyNotifications: "No notifications published yet",
    unnamedProfile: "Unlabeled profile",
    unknownLocation: "Unknown location",
    userCount: "users",
    monthlyRevenue: "MRR",
    exportDescription: "Exports visitors, registrations, and plan distribution as an encrypted review file.",
    exportButton: "Export file",
    languageNames: { ar: "Arabic", en: "English" },
    tiers: { FREE: "Free", PLUS: "Plus", BUSINESS: "Business" },
  },
} as const;

export function AdminDashboardClient({ data, auditHref }: AdminDashboardClientProps) {
  const { language, direction } = useAppLocale();
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const labels = copy[language];
  const locale = language === "ar" ? "ar-EG" : "en-US";
  const conversionRate = data.totalVisitors > 0 ? `${Math.round((data.registeredUsers / data.totalVisitors) * 100)}%` : "0%";
  const metricRows = [
    [
      { label: labels.metrics.trackedVisits, value: formatNumber(data.totalVisitors, locale) },
      { label: labels.metrics.registeredMembers, value: formatNumber(data.registeredUsers, locale) },
      { label: labels.metrics.visitToSignup, value: conversionRate },
    ],
    [
      { label: labels.metrics.starterTaps, value: formatNumber(data.interactionTotals.starterTaps, locale) },
      { label: labels.metrics.savedMoments, value: formatNumber(data.interactionTotals.savedMoments, locale) },
      { label: labels.metrics.shares, value: formatNumber(data.interactionTotals.shares, locale) },
    ],
    [
      { label: labels.metrics.capsuleDownloads, value: formatNumber(data.interactionTotals.capsules, locale) },
      { label: labels.metrics.helpfulReplies, value: formatNumber(data.interactionTotals.helpful, locale) },
      { label: labels.metrics.softerRequests, value: formatNumber(data.interactionTotals.softer, locale) },
    ],
    [
      { label: labels.metrics.visitorComments, value: formatNumber(data.interactionTotals.visitorComments, locale) },
      { label: labels.metrics.pwaInstalls, value: formatNumber(data.interactionTotals.pwaInstalls, locale) },
    ],
  ];

  const tabs: Array<{ id: AdminTab; ar: string; en: string }> = [
    { id: "dashboard", ar: "لوحة القياس", en: "Dashboard" },
    { id: "configuration", ar: "الإعدادات", en: "Configuration" },
    { id: "users", ar: "المستخدمون والهدايا", en: "Users & gifts" },
    { id: "offers", ar: "الخصومات", en: "Discounts" },
    { id: "sessions", ar: "الجلسات", en: "Sessions" },
  ];

  return (
    <main className="min-h-screen bg-ink px-5 pb-14 pt-24 text-bone/90" dir={direction}>
      <section className="mx-auto max-w-5xl">
        <div className="border-b border-white/10 pb-8">
          <p className="ui-kicker text-gold">{labels.eyebrow}</p>
          <h1 className="mt-3 font-arserif text-5xl text-bone/95">{labels.title}</h1>
          <p className="mt-4 max-w-2xl font-arsans text-sm leading-7 text-bone/60">{labels.intro}</p>
        </div>

        <nav className="sticky top-16 z-30 -mx-2 mt-5 flex gap-2 overflow-x-auto border-b border-white/10 bg-ink/92 px-2 py-3 backdrop-blur-xl [scrollbar-width:none]" aria-label={language === "ar" ? "تبويبات الإدارة" : "Admin tabs"}>
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 rounded-full border px-4 py-2 font-arsans text-sm transition-all duration-200 hover:-translate-y-0.5 ${active ? "border-gold bg-gold text-ink shadow-[0_18px_45px_rgba(201,168,106,0.18)]" : "border-white/10 bg-white/[0.035] text-bone/62 hover:border-gold/45 hover:text-gold"}`}
              >
                {language === "ar" ? tab.ar : tab.en}
              </button>
            );
          })}
        </nav>

        {activeTab === "dashboard" ? (
          <>

        {metricRows.map((row, index) => (
          <section key={index} className="grid gap-4 border-b border-white/10 py-8 sm:grid-cols-3">
            {row.map((metric) => <MetricCard key={metric.label} label={metric.label} value={metric.value} />)}
          </section>
        ))}

        <DashboardListSection kicker={labels.sections.visitorsKicker} title={labels.sections.visitorsTitle} description={labels.sections.visitorsDescription}>
          {data.visitorsByRegion.length > 0 ? data.visitorsByRegion.map((entry) => (
            <ProgressRow key={entry.location} label={entry.location} value={entry.count} width={Math.min(100, entry.count * 12)} color="bg-gold/80" locale={locale} />
          )) : <EmptyMetric label={labels.emptyVisits} />}
        </DashboardListSection>

        <DashboardListSection kicker={labels.sections.registrationKicker} title={labels.sections.registrationTitle} description={labels.sections.registrationDescription}>
          {data.registrationsByRegion.length > 0 ? data.registrationsByRegion.map((entry) => (
            <ProgressRow key={entry.location} label={entry.location || labels.unknownLocation} value={entry.count} width={Math.min(100, entry.count * 18)} color="bg-emerald-300/80" locale={locale} />
          )) : <EmptyMetric label={labels.emptySignups} />}
        </DashboardListSection>

        <DashboardListSection kicker={labels.sections.funnelKicker} title={labels.sections.funnelTitle} description={labels.sections.funnelDescription}>
          <div className="max-h-[28rem] space-y-4 overflow-y-auto pr-2 [scrollbar-color:rgba(201,168,106,0.45)_transparent]">
            {data.recentUsers.map((user) => (
              <div key={user.id} className="grid grid-cols-[2.25rem_1fr_auto] items-center gap-4 border-b border-white/10 pb-4">
                <span className="grid h-9 w-9 place-items-center rounded-2xl border border-white/10 bg-slate-950 font-mono text-xs uppercase text-gold shadow-xl">{user.provider.slice(0, 1)}</span>
                <span className="min-w-0">
                  <span className="block truncate font-ensans text-sm text-bone/90" dir="auto">{user.name || user.email || labels.unnamedProfile}</span>
                  <span className="mt-1 block font-arsans text-xs text-bone/35">{formatDate(user.createdAt, locale)} · {formatLanguage(user.currentLanguage, language)}</span>
                  <span className="mt-1 block truncate font-mono text-[10px] uppercase tracking-[0.08em] text-bone/30" dir="ltr">{formatLocationValue(user.location, labels.unknownLocation)}</span>
                </span>
                <span className="font-arsans text-xs text-gold">{formatTier(user.activeTier, language)}</span>
              </div>
            ))}
          </div>
        </DashboardListSection>

        <DashboardListSection kicker={labels.sections.plansKicker} title={labels.sections.plansTitle} description={labels.sections.plansDescription}>
          <div className="space-y-6">
            {data.distribution.map((entry) => (
              <div key={entry.tier} className="grid grid-cols-[6.5rem_1fr_auto] items-baseline gap-4">
                <span className="font-arsans text-xs text-gold">{formatTier(entry.tier, language)}</span>
                <span className="font-arsans text-3xl text-bone/90">{formatNumber(entry.userCount, locale)} {labels.userCount}</span>
                <span className="font-arsans text-xs text-bone/50">{formatCurrency(entry.monthlyRevenueMinor, entry.currency, locale)} {labels.monthlyRevenue}</span>
              </div>
            ))}
          </div>
        </DashboardListSection>

        <DashboardListSection kicker={labels.sections.commentsKicker} title={labels.sections.commentsTitle} description={labels.sections.commentsDescription}>
          <div className="max-h-[28rem] space-y-4 overflow-y-auto pr-2 [scrollbar-color:rgba(201,168,106,0.45)_transparent]">
            {data.visitorComments.length > 0 ? data.visitorComments.map((comment) => (
              <article key={comment.id} className="border border-white/10 bg-white/[0.025] p-4">
                <p className="font-arsans text-sm leading-7 text-bone/78" dir="auto">{comment.comment}</p>
                <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-bone/35" dir="ltr">
                  {formatDate(comment.createdAt, locale)} · {comment.device} · {comment.browser} · {formatLocationValue(comment.location, labels.unknownLocation)}
                </p>
              </article>
            )) : <EmptyMetric label={labels.emptyComments} />}
          </div>
        </DashboardListSection>

        <DashboardListSection kicker={labels.sections.pwaKicker} title={labels.sections.pwaTitle} description={labels.sections.pwaDescription}>
          <div className="space-y-6">
            {data.pwaDeviceBreakdown.length > 0 ? data.pwaDeviceBreakdown.map((entry) => (
              <ProgressRow key={entry.label} label={entry.label} value={entry.count} width={Math.min(100, entry.count * 22)} color="bg-sky-300/80" locale={locale} />
            )) : <EmptyMetric label={labels.emptyInstalls} />}
            {data.pwaInstalls.length > 0 ? (
              <div className="space-y-3 border-t border-white/10 pt-5">
                {data.pwaInstalls.slice(0, 8).map((install) => (
                  <p key={install.id} className="font-mono text-[10px] uppercase tracking-[0.08em] text-bone/40" dir="ltr">
                    {formatDate(install.createdAt, locale)} · {install.device} · {install.browser} · {install.platform} · {install.viewport}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        </DashboardListSection>

        <DashboardListSection kicker={labels.sections.avatarsKicker} title={labels.sections.avatarsTitle} description={labels.sections.avatarsDescription}>
          <div className="space-y-4">
            {data.avatarRatings.length > 0 ? data.avatarRatings.map((rating) => (
              <div key={rating.personaId} className="border border-white/10 bg-white/[0.025] p-4">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="font-arsans text-sm text-bone/88">{language === "ar" ? rating.personaNameAr : rating.personaNameEn}</p>
                  <p className="font-enserif text-3xl italic text-gold">{rating.averageRating.toFixed(1)} ★</p>
                </div>
                <div className="mt-3 h-px bg-white/10">
                  <span className="block h-px bg-gold/80" style={{ width: `${Math.min(100, (rating.averageRating / 5) * 100)}%` }} />
                </div>
                <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-bone/35" dir="ltr">
                  {formatNumber(rating.ratingCount, locale)} ratings · latest {rating.latestRating}/5 · {formatDate(rating.latestAt, locale)} · {formatLocationValue(rating.location, labels.unknownLocation)}
                </p>
              </div>
            )) : <EmptyMetric label={labels.emptyAvatarRatings} />}
          </div>
        </DashboardListSection>

        <DashboardListSection kicker={labels.sections.notificationsKicker} title={labels.sections.notificationsTitle} description={labels.sections.notificationsDescription}>
          <NotificationComposer language={language} locale={locale} notifications={data.recentNotifications} emptyLabel={labels.emptyNotifications} />
        </DashboardListSection>

        <section className="grid gap-10 py-10 md:grid-cols-[0.85fr_1.15fr]">
          <SectionIntro kicker={labels.sections.auditKicker} title={labels.sections.auditTitle} description={labels.sections.auditDescription} />
          <div className="flex items-center justify-between gap-5 border-y border-white/10 py-5 max-sm:flex-col max-sm:items-stretch">
            <p className="max-w-md font-arsans text-sm leading-7 text-bone/55">{labels.exportDescription}</p>
            <a href={auditHref} download="fadfada-audit-snapshot.encrypted.json" className="shrink-0 rounded-full border border-gold/40 px-4 py-3 text-center font-arsans text-sm text-gold transition-colors hover:bg-gold hover:text-ink">
              {labels.exportButton}
            </a>
          </div>
        </section>
          </>
        ) : null}

        {activeTab === "configuration" ? <ConfigurationPanel language={language} configuration={data.configuration} /> : null}
        {activeTab === "users" ? <UsersGiftPanel language={language} locale={locale} users={data.recentUsers} /> : null}
        {activeTab === "offers" ? <DiscountPanel language={language} locale={locale} offers={data.discountOffers} /> : null}
        {activeTab === "sessions" ? <SessionsPanel language={language} /> : null}
      </section>
    </main>
  );
}

function NotificationComposer({ language, locale, notifications, emptyLabel }: { language: Locale; locale: string; notifications: AdminDashboardData["recentNotifications"]; emptyLabel: string }) {
  const isArabic = language === "ar";
  const [localNotifications, setLocalNotifications] = useState(notifications);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [type, setType] = useState("NEW_FEATURE");
  const [priority, setPriority] = useState(3);
  const [titleAr, setTitleAr] = useState("ميزة جديدة في فضفضة");
  const [titleEn, setTitleEn] = useState("New FadFada feature");
  const [bodyAr, setBodyAr] = useState("جرّب التحديث الجديد الآن من داخل التجربة.");
  const [bodyEn, setBodyEn] = useState("Try the new update now inside the experience.");
  const notificationTypes = [
    { value: "GENERAL", ar: "عام", en: "General" },
    { value: "NEW_FEATURE", ar: "ميزة جديدة", en: "New Feature" },
    { value: "NEW_AVATAR", ar: "رفيق جديد", en: "New Avatar" },
    { value: "MAINTENANCE", ar: "صيانة", en: "Maintenance" },
    { value: "EVENT", ar: "حدث", en: "Event" },
    { value: "PAYMENT", ar: "دفع", en: "Payment" },
  ];

  async function submitNotification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "saving") return;

    setStatus("saving");
    try {
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          priority,
          titleAr: titleAr.trim() || titleEn.trim(),
          titleEn: titleEn.trim() || titleAr.trim(),
          bodyAr: bodyAr.trim() || bodyEn.trim(),
          bodyEn: bodyEn.trim() || bodyAr.trim(),
          isActive: true,
        }),
      });
      if (!response.ok) throw new Error("notification failed");

      setStatus("saved");
      setLocalNotifications((current) => [
        {
          id: `local-${Date.now()}`,
          type,
          titleAr,
          titleEn,
          bodyAr,
          bodyEn,
          priority,
          isActive: true,
          startsAt: new Date().toISOString(),
          endsAt: null,
          createdAt: new Date().toISOString(),
        },
        ...current,
      ].slice(0, 12));
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={submitNotification} className="border border-gold/20 bg-gold/[0.055] p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
          <select value={type} onChange={(event) => setType(event.target.value)} className="border border-white/10 bg-[#0E0D10] px-3 py-3 font-arsans text-sm text-bone/90 outline-none focus:border-gold/60">
            {notificationTypes.map((option) => <option key={option.value} value={option.value}>{isArabic ? option.ar : option.en}</option>)}
          </select>
          <input value={priority} onChange={(event) => setPriority(Number(event.target.value))} min={1} max={5} type="number" className="border border-white/10 bg-[#0E0D10] px-3 py-3 font-mono text-sm text-bone/90 outline-none focus:border-gold/60" aria-label={isArabic ? "الأولوية" : "Priority"} />
        </div>
        <input
          value={isArabic ? titleAr : titleEn}
          onChange={(event) => (isArabic ? setTitleAr(event.target.value) : setTitleEn(event.target.value))}
          placeholder={isArabic ? "عنوان التنبيه" : "Notification title"}
          className={`${isArabic ? "font-arsans" : "font-ensans"} mt-3 w-full border border-white/10 bg-[#0E0D10] px-3 py-3 text-sm text-bone/90 outline-none placeholder:text-bone/30 focus:border-gold/60`}
          dir={isArabic ? "rtl" : "ltr"}
        />
        <textarea
          value={isArabic ? bodyAr : bodyEn}
          onChange={(event) => (isArabic ? setBodyAr(event.target.value) : setBodyEn(event.target.value))}
          rows={4}
          placeholder={isArabic ? "نص التنبيه" : "Notification body"}
          className={`${isArabic ? "font-arsans" : "font-ensans"} mt-3 w-full resize-none border border-white/10 bg-[#0E0D10] px-3 py-3 text-sm leading-6 text-bone/90 outline-none placeholder:text-bone/30 focus:border-gold/60`}
          dir={isArabic ? "rtl" : "ltr"}
        />
        <button type="submit" disabled={status === "saving"} className="mt-3 w-full bg-gold px-4 py-3 font-arsans text-sm text-ink transition hover:bg-bone disabled:opacity-60">
          {status === "saving" ? (isArabic ? "جاري النشر..." : "Publishing...") : isArabic ? "نشر التنبيه" : "Publish notification"}
        </button>
        <p className={`mt-2 font-arsans text-xs ${status === "error" ? "text-red-200" : "text-bone/45"}`}>
          {status === "saved" ? (isArabic ? "تم نشر التنبيه." : "Notification published.") : status === "error" ? (isArabic ? "تعذر نشر التنبيه." : "Could not publish notification.") : isArabic ? "سيظهر التنبيه للمستخدمين داخل التطبيق حسب لغتهم." : "The notification appears in-app using the user's current language."}
        </p>
      </form>

      <div className="space-y-3">
        {localNotifications.length > 0 ? localNotifications.map((notification) => (
          <article key={notification.id} className={`border p-4 ${notification.type === "MAINTENANCE" ? "border-red-300/30 bg-red-300/[0.06]" : "border-white/10 bg-white/[0.025]"}`}>
            <div className="flex items-center justify-between gap-3">
              <p className="font-arsans text-sm text-bone/88">{isArabic ? notification.titleAr : notification.titleEn}</p>
              <span className="border border-white/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-gold" dir="ltr">{notification.type}</span>
            </div>
            <p className="mt-2 font-arsans text-sm leading-7 text-bone/58" dir={isArabic ? "rtl" : "ltr"}>{isArabic ? notification.bodyAr : notification.bodyEn}</p>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-bone/35" dir="ltr">
              priority {notification.priority} · {notification.isActive ? "active" : "inactive"} · {formatDate(notification.createdAt, locale)}
            </p>
          </article>
        )) : <EmptyMetric label={emptyLabel} />}
      </div>
    </div>
  );
}

function ConfigurationPanel({ language, configuration }: { language: Locale; configuration: AdminDashboardData["configuration"] }) {
  const isArabic = language === "ar";
  const [form, setForm] = useState(configuration);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const fields: Array<{ key: keyof AdminDashboardData["configuration"]; ar: string; en: string; hintAr: string; hintEn: string }> = [
    { key: "anonymousReflectionLimit", ar: "ردود الزائر", en: "Visitor replies", hintAr: "كم رد يحصل عليه غير المسجل قبل هدية التسجيل.", hintEn: "Replies before anonymous users are invited to sign in." },
    { key: "signedGiftReflectionLimit", ar: "هدية التسجيل", en: "Sign-in gift", hintAr: "عدد الردود المجانية بعد إنشاء حساب.", hintEn: "Free replies granted after sign-in." },
    { key: "anonymousPersonaLimit", ar: "رفقاء الزائر", en: "Visitor companions", hintAr: "عدد الرفقاء المتاحين بدون حساب.", hintEn: "Companions available without an account." },
    { key: "signedPersonaLimit", ar: "رفقاء الحساب", en: "Account companions", hintAr: "عدد الرفقاء المتاحين للحساب المجاني.", hintEn: "Companions available to signed free users." },
  ];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    try {
      const response = await fetch("/api/admin/configuration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_config", config: form }),
      });
      if (!response.ok) throw new Error("save failed");
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="grid gap-8 py-10 md:grid-cols-[0.8fr_1.2fr]">
      <SectionIntro kicker={isArabic ? "قواعد التجربة" : "Experience rules"} title={isArabic ? "إعدادات الحدود والهدايا" : "Limits and gift configuration"} description={isArabic ? "اضبط الفرق بين الزائر، الحساب المجاني، وبلس بدون تعديل الكود." : "Control visitor, signed-in, and Plus thresholds without code edits."} />
      <form onSubmit={submit} className="rounded-2xl border border-gold/20 bg-gold/[0.045] p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map((field) => (
            <label key={field.key} className="rounded-xl border border-white/10 bg-[#0E0D10]/72 p-3">
              <span className="block font-arsans text-sm text-bone/86">{isArabic ? field.ar : field.en}</span>
              <span className="mt-1 block min-h-10 font-arsans text-xs leading-5 text-bone/42">{isArabic ? field.hintAr : field.hintEn}</span>
              <input
                type="number"
                min={1}
                max={200}
                value={form[field.key]}
                onChange={(event) => setForm((current) => ({ ...current, [field.key]: Number(event.target.value) }))}
                className="mt-3 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-bone/90 outline-none focus:border-gold/60"
              />
            </label>
          ))}
        </div>
        <button type="submit" disabled={status === "saving"} className="mt-4 w-full rounded-full bg-gold px-4 py-3 font-arsans text-sm text-ink transition hover:bg-bone disabled:opacity-60">
          {status === "saving" ? (isArabic ? "جار الحفظ..." : "Saving...") : isArabic ? "حفظ الإعدادات" : "Save configuration"}
        </button>
        <p className={`mt-2 font-arsans text-xs ${status === "error" ? "text-red-200" : "text-bone/45"}`}>{status === "saved" ? (isArabic ? "تم حفظ الإعدادات." : "Configuration saved.") : isArabic ? "الحفظ يسجل نسخة إدارية يمكن مراجعتها." : "Saving records an admin revision for review."}</p>
      </form>
    </section>
  );
}

function UsersGiftPanel({ language, locale, users }: { language: Locale; locale: string; users: AdminDashboardData["recentUsers"] }) {
  const isArabic = language === "ar";
  const [localUsers, setLocalUsers] = useState(users);
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id || "");
  const [amount, setAmount] = useState(10);
  const [reason, setReason] = useState(isArabic ? "جلسة طويلة كهدية" : "Long session gift");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    try {
      const response = await fetch("/api/admin/configuration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_gift", userId: selectedUserId, amount, kind: "LONG_SESSION", reason }),
      });
      const data = (await response.json()) as { user?: { id: string; tokenBalance: number } };
      if (!response.ok || !data.user) throw new Error("gift failed");
      setLocalUsers((current) => current.map((user) => user.id === data.user?.id ? { ...user, tokenBalance: data.user.tokenBalance, giftCount: user.giftCount + 1, giftedTokens: user.giftedTokens + amount } : user));
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="grid gap-8 py-10 md:grid-cols-[0.8fr_1.2fr]">
      <SectionIntro kicker={isArabic ? "الأعضاء" : "Members"} title={isArabic ? "المستخدمون والهدايا" : "Users and gifts"} description={isArabic ? "كل مستخدم مسجل يظهر هنا مع رصيده وخطته. أضف هدية جلسة طويلة أو رصيد إضافي مباشرة." : "Every signed user appears here with tier and balance. Add long-session gifts or extra credits directly."} />
      <div className="space-y-5">
        <form onSubmit={submit} className="rounded-2xl border border-gold/20 bg-gold/[0.045] p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
            <select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)} className="rounded-lg border border-white/10 bg-[#0E0D10] px-3 py-3 font-arsans text-sm text-bone/90 outline-none focus:border-gold/60">
              {localUsers.map((user) => <option key={user.id} value={user.id}>{user.email || user.name || user.id}</option>)}
            </select>
            <input type="number" min={1} max={500} value={amount} onChange={(event) => setAmount(Number(event.target.value))} className="rounded-lg border border-white/10 bg-[#0E0D10] px-3 py-3 font-mono text-sm text-bone/90 outline-none focus:border-gold/60" />
          </div>
          <input value={reason} onChange={(event) => setReason(event.target.value)} className="mt-3 w-full rounded-lg border border-white/10 bg-[#0E0D10] px-3 py-3 font-arsans text-sm text-bone/90 outline-none focus:border-gold/60" />
          <button type="submit" disabled={status === "saving" || !selectedUserId} className="mt-3 w-full rounded-full bg-gold px-4 py-3 font-arsans text-sm text-ink transition hover:bg-bone disabled:opacity-60">{status === "saving" ? (isArabic ? "جار الإضافة..." : "Adding...") : isArabic ? "إضافة هدية" : "Add gift"}</button>
          <p className={`mt-2 font-arsans text-xs ${status === "error" ? "text-red-200" : "text-bone/45"}`}>{status === "saved" ? (isArabic ? "تمت إضافة الهدية." : "Gift added.") : isArabic ? "الهدايا تزيد رصيد المستخدم فوراً." : "Gifts increase the user balance immediately."}</p>
        </form>
        <div className="max-h-[34rem] space-y-3 overflow-y-auto pr-2 [scrollbar-color:rgba(201,168,106,0.45)_transparent]">
          {localUsers.map((user) => (
            <article key={user.id} className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:grid-cols-[1fr_auto]">
              <div className="min-w-0">
                <p className="truncate font-ensans text-sm text-bone/90" dir="auto">{user.name || user.email || user.id}</p>
                <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.08em] text-bone/35" dir="ltr">{user.email || "no email"} · {user.provider} · {formatDate(user.createdAt, locale)}</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center sm:min-w-64">
                <MiniStat label={isArabic ? "الخطة" : "Tier"} value={formatTier(user.activeTier, language)} />
                <MiniStat label={isArabic ? "الرصيد" : "Credits"} value={formatNumber(user.tokenBalance, locale)} />
                <MiniStat label={isArabic ? "الهدايا" : "Gifts"} value={`${formatNumber(user.giftedTokens, locale)} / ${formatNumber(user.giftCount, locale)}`} />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function DiscountPanel({ language, locale, offers }: { language: Locale; locale: string; offers: AdminDashboardData["discountOffers"] }) {
  const isArabic = language === "ar";
  const [localOffers, setLocalOffers] = useState(offers);
  const [code, setCode] = useState("EARLYPLUS");
  const [label, setLabel] = useState(isArabic ? "خصم المؤمنين الأوائل" : "Early believer discount");
  const [percentOff, setPercentOff] = useState(30);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    try {
      const response = await fetch("/api/admin/configuration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_discount", code, label, percentOff, maxRedemptions: 100 }),
      });
      const data = (await response.json()) as { offer?: AdminDashboardData["discountOffers"][number] };
      if (!response.ok || !data.offer) throw new Error("discount failed");
      const nextOffer: AdminDashboardData["discountOffers"][number] = {
        id: `local-${Date.now()}`,
        code: data.offer.code,
        label: data.offer.label,
        percentOff: data.offer.percentOff,
        appliesTo: data.offer.appliesTo,
        maxRedemptions: data.offer.maxRedemptions,
        expiresAt: data.offer.expiresAt,
        isActive: data.offer.isActive,
        createdAt: new Date().toISOString(),
      };
      setLocalOffers((current) => [nextOffer, ...current]);
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="grid gap-8 py-10 md:grid-cols-[0.8fr_1.2fr]">
      <SectionIntro kicker={isArabic ? "العروض" : "Offers"} title={isArabic ? "الخصومات الذكية" : "Smart discounts"} description={isArabic ? "أفضل طريقة: كود محدود للمؤمنين الأوائل، الشركاء، أو المستخدمين النشطين. لا تخفض السعر للجميع." : "Best practice: limited codes for early believers, partners, or active users. Avoid discounting for everyone."} />
      <div className="space-y-5">
        <form onSubmit={submit} className="rounded-2xl border border-sky-300/20 bg-sky-300/[0.045] p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
            <input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} className="rounded-lg border border-white/10 bg-[#0E0D10] px-3 py-3 font-mono text-sm text-bone/90 outline-none focus:border-sky-200/60" />
            <input type="number" min={1} max={90} value={percentOff} onChange={(event) => setPercentOff(Number(event.target.value))} className="rounded-lg border border-white/10 bg-[#0E0D10] px-3 py-3 font-mono text-sm text-bone/90 outline-none focus:border-sky-200/60" />
          </div>
          <input value={label} onChange={(event) => setLabel(event.target.value)} className="mt-3 w-full rounded-lg border border-white/10 bg-[#0E0D10] px-3 py-3 font-arsans text-sm text-bone/90 outline-none focus:border-sky-200/60" />
          <button type="submit" disabled={status === "saving"} className="mt-3 w-full rounded-full bg-sky-200 px-4 py-3 font-arsans text-ink transition hover:bg-bone disabled:opacity-60">{status === "saving" ? (isArabic ? "جار الإنشاء..." : "Creating...") : isArabic ? "إنشاء عرض" : "Create offer"}</button>
        </form>
        <div className="space-y-3">
          {localOffers.length > 0 ? localOffers.map((offer) => (
            <article key={offer.id} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-sm text-sky-100" dir="ltr">{offer.code}</p>
                <p className="font-enserif text-3xl italic text-sky-100">{offer.percentOff}%</p>
              </div>
              <p className="mt-1 font-arsans text-sm text-bone/72">{offer.label}</p>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-bone/35" dir="ltr">{offer.appliesTo} · {offer.maxRedemptions ? `${offer.maxRedemptions} max` : "unlimited"} · {formatDate(offer.createdAt, locale)}</p>
            </article>
          )) : <EmptyMetric label={isArabic ? "لا توجد خصومات بعد" : "No discounts yet"} />}
        </div>
      </div>
    </section>
  );
}

function SessionsPanel({ language }: { language: Locale }) {
  const isArabic = language === "ar";
  return (
    <section className="grid gap-8 py-10 md:grid-cols-[0.8fr_1.2fr]">
      <SectionIntro kicker={isArabic ? "الجلسات" : "Sessions"} title={isArabic ? "إدارة سجل الجلسات" : "Session history management"} description={isArabic ? "تم تجهيز قاعدة البيانات للجلسات. الخطوة التالية تربط كل محادثة مسجلة بسجل دائم مع زر جلسة جديدة." : "The database is prepared for signed-user sessions. The next step wires each conversation into persistent history with a new-session control."} />
      <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
        <p className="font-arsans text-sm leading-7 text-bone/62">{isArabic ? "حالياً لا نخلط إدارة الجلسات مع القائمة العامة. ستظهر هنا جلسات المستخدمين المسجلين، آخر رفيق مستخدم، وعدد الرسائل عند ربط واجهة المحادثة بالـ API الجديد." : "This stays separate from the public site menu. Signed-user sessions, last companion, and message counts will appear here once the chat API is connected."}</p>
      </div>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-xl border border-white/10 bg-black/20 px-2 py-2">
      <span className="block font-arsans text-[10px] text-bone/35">{label}</span>
      <span className="mt-1 block truncate font-arsans text-xs text-gold">{value}</span>
    </span>
  );
}

function SectionIntro({ kicker, title, description }: { kicker: string; title: string; description: string }) {
  return (
    <div>
      <p className="ui-kicker text-bone/40">{kicker}</p>
      <h2 className="mt-3 font-arserif text-3xl text-bone/90">{title}</h2>
      <p className="mt-2 font-arsans text-sm leading-7 text-bone/45">{description}</p>
    </div>
  );
}

function DashboardListSection({ kicker, title, description, children }: { kicker: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-10 border-b border-white/10 py-10 md:grid-cols-[0.85fr_1.15fr]">
      <SectionIntro kicker={kicker} title={title} description={description} />
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 bg-white/[0.03] px-4 py-5">
      <p className="font-arsans text-sm text-bone/70">{label}</p>
      <p className="mt-3 font-enserif text-3xl italic text-bone/95">{value}</p>
    </div>
  );
}

function EmptyMetric({ label }: { label: string }) {
  return <p className="border border-dashed border-white/10 px-4 py-5 font-arsans text-sm text-bone/40">{label}</p>;
}

function ProgressRow({ label, value, width, color, locale }: { label: string; value: number; width: number; color: string; locale: string }) {
  return (
    <div className="grid grid-cols-[minmax(5rem,10rem)_1fr_4rem] items-center gap-4 font-ensans text-sm text-bone/80" dir="ltr">
      <span className="truncate text-left font-mono text-xs uppercase text-gold">{label}</span>
      <span className="h-px bg-white/10">
        <span className={`block h-px ${color}`} style={{ width: `${width}%` }} />
      </span>
      <span className="text-right font-mono text-bone/70">{formatNumber(value, locale)}</span>
    </div>
  );
}

function formatNumber(value: number, locale: string) {
  return value.toLocaleString(locale);
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { month: "short", day: "2-digit", year: "numeric" }).format(new Date(value));
}

function formatCurrency(amount: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount / 100);
}

function formatLanguage(value: string, language: Locale) {
  const normalized = value.toLowerCase();
  if (normalized === "ar") return copy[language].languageNames.ar;
  if (normalized === "en") return copy[language].languageNames.en;
  return value;
}

function formatTier(value: string, language: Locale) {
  const normalized = value.toUpperCase() as keyof typeof copy.ar.tiers;
  return copy[language].tiers[normalized] || value;
}

function formatLocationValue(value: string, fallback: string) {
  return value === "unknown" ? fallback : value;
}
