"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useAppLocale } from "../../../components/AppShell";
import { personas } from "../../../lib/personas";

const adminRefreshIntervalMs = 30000;

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
    grantedPersonaIds: string[];
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
  chatSessions: Array<{
    id: string;
    userLabel: string;
    title: string;
    activePersonaId: string;
    activeWorld: string;
    language: string;
    messageCount: number;
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

type AdminTab = "dashboard" | "configuration" | "users" | "personas" | "offers" | "sessions";

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
      plansTitle: "توزيع الخطط",
      plansDescription: "عدد الأعضاء حسب الخطة الحالية. الإيراد الحقيقي يظهر في لوحة مزود الدفع.",
      commentsKicker: "صوت الزوار",
      commentsTitle: "آخر تعليقات الزوار",
      commentsDescription: "ملاحظات قصيرة يرسلها الزوار من الصفحة الرئيسية.",
      pwaKicker: "تثبيت التطبيق",
      pwaTitle: "تثبيتات PWA والأجهزة",
      pwaDescription: "عدد التثبيتات ونوع الجهاز والمتصفح المستخدم.",
      liveKicker: "الغرفة الحية",
      liveTitle: "نبض اليوم في فضفضة",
      liveDescription: "لقطة تشغيلية خفيفة تتجدد تلقائياً بدون ازدحام الرسوم.",
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
    autoRefreshLabel: "تحديث تلقائي كل 30 ثانية",
    lastUpdatedLabel: "آخر تحديث",
    paymentLedgerNote: "لا نعرض مبالغ الويبهوك الداخلية هنا لأنها قد تكون سجلات اختبار. مصدر حقيقة الإيراد هو لوحة مزود الدفع: إذا كانت تعرض 0.00$ فالإيراد الحقيقي للفترة هو 0.00$.",
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
      plansTitle: "Plan distribution",
      plansDescription: "Member count by current plan. Real revenue is verified in the payment vendor dashboard.",
      commentsKicker: "Visitor voice",
      commentsTitle: "Latest visitor comments",
      commentsDescription: "Short notes visitors submit from the home experience.",
      pwaKicker: "App installs",
      pwaTitle: "PWA installs and devices",
      pwaDescription: "Install count, device type, and browser used.",
      liveKicker: "Live room",
      liveTitle: "FadFada pulse today",
      liveDescription: "A lightweight operations snapshot that refreshes automatically without crowding the dashboard.",
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
    autoRefreshLabel: "Auto-refresh every 30 seconds",
    lastUpdatedLabel: "Last updated",
    paymentLedgerNote: "Internal webhook amounts are hidden here because they can include test records. The payment vendor dashboard is the revenue source of truth: if it shows $0.00, real revenue for the period is $0.00.",
    exportDescription: "Exports visitors, registrations, and plan distribution as an encrypted review file.",
    exportButton: "Export file",
    languageNames: { ar: "Arabic", en: "English" },
    tiers: { FREE: "Free", PLUS: "Plus", BUSINESS: "Business" },
  },
} as const;

export function AdminDashboardClient({ data, auditHref }: AdminDashboardClientProps) {
  const { language, direction } = useAppLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [lastRefreshedAt, setLastRefreshedAt] = useState(() => new Date());
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
  const narrativeTimeline = buildNarrativeTimeline(data, language, locale, labels.unnamedProfile, labels.unknownLocation);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "configuration" || tab === "users" || tab === "personas" || tab === "offers" || tab === "sessions") {
      setActiveTab(tab);
      return;
    }

    setActiveTab("dashboard");
  }, [searchParams]);

  useEffect(() => {
    function refreshAdminData() {
      if (document.visibilityState !== "visible") return;
      router.refresh();
      setLastRefreshedAt(new Date());
    }

    const intervalId = window.setInterval(refreshAdminData, adminRefreshIntervalMs);
    window.addEventListener("focus", refreshAdminData);
    document.addEventListener("visibilitychange", refreshAdminData);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshAdminData);
      document.removeEventListener("visibilitychange", refreshAdminData);
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-ink px-5 pb-14 pt-24 text-bone/90" dir={direction}>
      <section className="mx-auto max-w-5xl">
        <div className="border-b border-white/10 pb-8">
          <p className="ui-kicker text-gold">{labels.eyebrow}</p>
          <h1 className="mt-3 font-arserif text-5xl text-bone/95">{labels.title}</h1>
          <p className="mt-4 max-w-2xl font-arsans text-sm leading-7 text-bone/60">{labels.intro}</p>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.08em] text-bone/35" dir="ltr">
            {labels.autoRefreshLabel} · {labels.lastUpdatedLabel}: {formatTime(lastRefreshedAt, locale)}
          </p>
        </div>

        {activeTab === "dashboard" ? (
          <>

        <DashboardListSection kicker={labels.sections.liveKicker} title={labels.sections.liveTitle} description={labels.sections.liveDescription}>
          <div className="grid gap-3 md:grid-cols-4">
            <LiveRoomTile label={labels.metrics.trackedVisits} value={formatNumber(data.totalVisitors, locale)} accent="bg-gold" />
            <LiveRoomTile label={labels.metrics.registeredMembers} value={formatNumber(data.registeredUsers, locale)} accent="bg-emerald-300" />
            <LiveRoomTile label={labels.metrics.visitorComments} value={formatNumber(data.interactionTotals.visitorComments, locale)} accent="bg-dusk" />
            <LiveRoomTile label={labels.metrics.pwaInstalls} value={formatNumber(data.interactionTotals.pwaInstalls, locale)} accent="bg-cyan-200" />
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <LiveSignal label={language === "ar" ? "آخر عضو" : "Latest member"} value={data.recentUsers[0]?.name || data.recentUsers[0]?.email || labels.unnamedProfile} detail={data.recentUsers[0] ? `${formatTier(data.recentUsers[0].activeTier, language)} · ${formatDate(data.recentUsers[0].createdAt, locale)}` : labels.emptySignups} />
            <LiveSignal label={language === "ar" ? "آخر تعليق" : "Latest comment"} value={data.visitorComments[0]?.comment || labels.emptyComments} detail={data.visitorComments[0] ? formatDate(data.visitorComments[0].createdAt, locale) : ""} />
            <LiveSignal label={language === "ar" ? "آخر جلسة" : "Latest session"} value={data.chatSessions[0]?.title || (language === "ar" ? "لا توجد جلسات" : "No sessions yet")} detail={data.chatSessions[0] ? `${data.chatSessions[0].userLabel} · ${formatNumber(data.chatSessions[0].messageCount, locale)} ${language === "ar" ? "رسائل" : "messages"}` : ""} />
          </div>
          <div className="mt-5 border-t border-white/10 pt-5">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.08em] text-bone/35">{language === "ar" ? "خط زمني مختصر" : "Narrative timeline"}</p>
            <div className="space-y-3">
              {narrativeTimeline.length > 0 ? narrativeTimeline.map((item) => (
                <LiveTimelineItem key={`${item.type}-${item.createdAt}-${item.title}`} item={item} />
              )) : <EmptyMetric label={language === "ar" ? "لا توجد إشارات كافية بعد" : "No live signals yet"} />}
            </div>
          </div>
        </DashboardListSection>

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
              <div key={entry.tier} className="grid grid-cols-[6.5rem_1fr] items-baseline gap-4">
                <span className="font-arsans text-xs text-gold">{formatTier(entry.tier, language)}</span>
                <span className="font-arsans text-3xl text-bone/90">{formatNumber(entry.userCount, locale)} {labels.userCount}</span>
              </div>
            ))}
            <p className="border-t border-white/10 pt-4 font-arsans text-xs leading-6 text-bone/45">{labels.paymentLedgerNote}</p>
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
        {activeTab === "personas" ? <PersonaAccessPanel language={language} locale={locale} users={data.recentUsers} /> : null}
        {activeTab === "offers" ? <DiscountPanel language={language} locale={locale} offers={data.discountOffers} /> : null}
        {activeTab === "sessions" ? <SessionsPanel language={language} locale={locale} sessions={data.chatSessions} /> : null}
      </section>
    </main>
  );
}

function NotificationComposer({ language, locale, notifications, emptyLabel }: { language: Locale; locale: string; notifications: AdminDashboardData["recentNotifications"]; emptyLabel: string }) {
  const isArabic = language === "ar";
  const [localNotifications, setLocalNotifications] = useState(notifications);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [type, setType] = useState("NEW_FEATURE");
  const [priority, setPriority] = useState(5);
  const [titleAr, setTitleAr] = useState("جديد: لوحة مشاهد من فضفضتك");
  const [titleEn, setTitleEn] = useState("New: turn reflections into storyboards");
  const [bodyAr, setBodyAr] = useState("بعد أي رد عميق، افتح إيصال فضفضة واضغط حوّلها للوحة مشاهد لترى 3 لقطات رمزية مع ملاحظات وصياغة جاهزة للصور.");
  const [bodyEn, setBodyEn] = useState("After a meaningful reply, open the Reflection Receipt and choose Turn into storyboard to see 3 symbolic shots with notes and copyable image prompts.");
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

function PersonaAccessPanel({ language, locale, users }: { language: Locale; locale: string; users: AdminDashboardData["recentUsers"] }) {
  const isArabic = language === "ar";
  const [localUsers, setLocalUsers] = useState(users);
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id || "");
  const selectedUser = localUsers.find((user) => user.id === selectedUserId) || localUsers[0];
  const [checkedPersonaIds, setCheckedPersonaIds] = useState<string[]>(selectedUser?.grantedPersonaIds || []);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    const nextUser = localUsers.find((user) => user.id === selectedUserId) || localUsers[0];
    setCheckedPersonaIds(nextUser?.grantedPersonaIds || []);
    setStatus("idle");
  }, [localUsers, selectedUserId]);

  function togglePersona(personaId: string) {
    setCheckedPersonaIds((current) => current.includes(personaId) ? current.filter((item) => item !== personaId) : [...current, personaId]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    try {
      const response = await fetch("/api/admin/configuration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_persona_grants", userId: selectedUserId, personaIds: checkedPersonaIds }),
      });
      const data = (await response.json()) as { grants?: { userId: string; personaIds: string[] } };
      if (!response.ok || !data.grants) throw new Error("persona grant failed");
      setLocalUsers((current) => current.map((user) => user.id === data.grants?.userId ? { ...user, grantedPersonaIds: data.grants.personaIds } : user));
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="grid gap-8 py-10 md:grid-cols-[0.8fr_1.2fr]">
      <SectionIntro
        kicker={isArabic ? "صلاحيات الرفاق" : "Persona access"}
        title={isArabic ? "فتح رفيق محجوب لمستخدم محدد" : "Allow blocked personas for signed users"}
        description={isArabic ? "اختر أي مستخدم مسجل وافتح له أي رفيق، حتى لو كان المستخدم ما زال على الخطة المجانية." : "Choose any signed user and unlock any companion for them, even while they remain on the free plan."}
      />
      <div className="space-y-5">
        <form onSubmit={submit} className="rounded-2xl border border-sky-200/20 bg-sky-200/[0.045] p-4">
          <div className="mb-4 rounded-xl border border-white/10 bg-[#0E0D10]/72 p-3">
            <p className="font-arsans text-sm font-semibold text-bone/88">{isArabic ? "كيف تعمل؟" : "How it works"}</p>
            <p className="mt-1 font-arsans text-xs leading-6 text-bone/52">
              {isArabic ? "الحفظ يسجل صلاحية خاصة للمستخدم. عند فتح الشات أو تحديث الصفحة، سيظهر الرفيق ضمن اختياراته حتى لو كان خارج حد الرفاق المجاني." : "Saving records a user-specific access grant. When the user opens or refreshes chat, the companion appears in their picker even if it is outside the free companion limit."}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <label className="space-y-2">
              <span className="block font-arsans text-xs text-bone/50">{isArabic ? "المستخدم" : "User"}</span>
              <select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)} className="w-full rounded-lg border border-white/10 bg-[#0E0D10] px-3 py-3 font-arsans text-sm text-bone/90 outline-none focus:border-sky-200/60">
                {localUsers.map((user) => <option key={user.id} value={user.id}>{user.email || user.name || user.id}</option>)}
              </select>
            </label>
            <MiniStat label={isArabic ? "مختار" : "Checked"} value={formatNumber(checkedPersonaIds.length, locale)} />
          </div>
          <div className="mt-4 grid max-h-[28rem] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 [scrollbar-color:rgba(125,211,252,0.45)_transparent]">
            {personas.map((persona) => {
              const checked = checkedPersonaIds.includes(persona.id);
              return (
                <label key={persona.id} className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${checked ? "border-sky-200/50 bg-sky-200/10" : "border-white/10 bg-[#0E0D10]/72 hover:border-sky-200/30"}`}>
                  <input type="checkbox" checked={checked} onChange={() => togglePersona(persona.id)} className="h-4 w-4 accent-sky-200" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-arsans text-sm text-bone/88">{isArabic ? persona.nameAr : persona.nameEn}</span>
                    <span className="mt-0.5 block truncate font-mono text-[10px] uppercase tracking-[0.08em] text-bone/35" dir="ltr">{persona.id} · {persona.isPremium ? "plus" : "free"}</span>
                  </span>
                </label>
              );
            })}
          </div>
          <button type="submit" disabled={status === "saving" || !selectedUserId} className="mt-4 w-full rounded-full bg-sky-200 px-4 py-3 font-arsans text-sm text-ink transition hover:bg-bone disabled:opacity-60">
            {status === "saving" ? (isArabic ? "جاري الحفظ..." : "Saving...") : isArabic ? "حفظ صلاحيات الرفاق" : "Save persona access"}
          </button>
          <p className={`mt-2 font-arsans text-xs ${status === "error" ? "text-red-200" : "text-bone/45"}`}>{status === "saved" ? (isArabic ? "تم حفظ صلاحيات الرفاق." : "Persona access saved.") : isArabic ? "إزالة العلامة تلغي الصلاحية الخاصة، ثم احفظ." : "Uncheck to remove a user-specific grant, then save."}</p>
        </form>
        <div className="max-h-[34rem] space-y-3 overflow-y-auto pr-2 [scrollbar-color:rgba(201,168,106,0.45)_transparent]">
          {localUsers.map((user) => (
            <article key={user.id} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
              <div className="flex items-start justify-between gap-3 max-sm:flex-col">
                <div className="min-w-0">
                  <p className="truncate font-ensans text-sm text-bone/90" dir="auto">{user.name || user.email || user.id}</p>
                  <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.08em] text-bone/35" dir="ltr">{user.email || "no email"} · {formatTier(user.activeTier, language)} · {formatDate(user.createdAt, locale)}</p>
                </div>
                <MiniStat label={isArabic ? "مفتوح" : "Allowed"} value={formatNumber(user.grantedPersonaIds.length, locale)} />
              </div>
              <p className="mt-3 rounded-xl border border-sky-200/15 bg-sky-200/[0.045] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.08em] text-sky-100/75" dir="ltr">
                {user.grantedPersonaIds.length > 0 ? user.grantedPersonaIds.join(", ") : "no specific persona grants"}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function UsersGiftPanel({ language, locale, users }: { language: Locale; locale: string; users: AdminDashboardData["recentUsers"] }) {
  const isArabic = language === "ar";
  const [localUsers, setLocalUsers] = useState(users);
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id || "");
  const [selectedPersonaId, setSelectedPersonaId] = useState(personas[0]?.id || "omar");
  const [amount, setAmount] = useState(10);
  const [reason, setReason] = useState(isArabic ? "جلسة طويلة كهدية" : "Long session gift");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [personaGrantStatus, setPersonaGrantStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

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

  async function grantPersona(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPersonaGrantStatus("saving");
    try {
      const response = await fetch("/api/admin/configuration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "grant_persona", userId: selectedUserId, personaId: selectedPersonaId }),
      });
      const data = (await response.json()) as { grant?: { userId: string; personaId: string } };
      if (!response.ok || !data.grant) throw new Error("persona grant failed");
      setLocalUsers((current) => current.map((user) => user.id === data.grant?.userId ? { ...user, grantedPersonaIds: Array.from(new Set([...user.grantedPersonaIds, data.grant.personaId])) } : user));
      setPersonaGrantStatus("saved");
    } catch {
      setPersonaGrantStatus("error");
    }
  }

  return (
    <section className="grid gap-8 py-10 md:grid-cols-[0.8fr_1.2fr]">
      <SectionIntro kicker={isArabic ? "الأعضاء" : "Members"} title={isArabic ? "المستخدمون والهدايا" : "Users and gifts"} description={isArabic ? "كل مستخدم مسجل يظهر هنا مع رصيده وخطته. الهدية تضيف رصيد ردود فوراً إلى حساب المستخدم." : "Every signed user appears here with tier and balance. A gift immediately adds reply credits to the user's account."} />
      <div className="space-y-5">
        <form onSubmit={submit} className="rounded-2xl border border-gold/20 bg-gold/[0.045] p-4">
          <div className="mb-4 rounded-xl border border-white/10 bg-[#0E0D10]/72 p-3">
            <p className="font-arsans text-sm font-semibold text-bone/88">{isArabic ? "كيف تطبق الهدية؟" : "How the gift is applied"}</p>
            <p className="mt-1 font-arsans text-xs leading-6 text-bone/52">
              {isArabic
                ? "عند الضغط على إضافة هدية، نزيد رصيد المستخدم في قاعدة البيانات. في الشات سيقرأ الحساب هذا الرصيد ويستخدمه كجلسة أطول من هدية التسجيل العادية. إذا كان المستخدم فاتح التطبيق الآن، يكفي يعمل تحديث للصفحة حتى يظهر الرصيد الجديد."
                : "When you add a gift, we increase the user's database token balance. The chat reads that balance and treats it as a longer signed-in session than the normal gift. If the user already has the app open, a refresh shows the new balance."}
            </p>
          </div>
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
        <form onSubmit={grantPersona} className="rounded-2xl border border-sky-200/20 bg-sky-200/[0.045] p-4">
          <div className="mb-4 rounded-xl border border-white/10 bg-[#0E0D10]/72 p-3">
            <p className="font-arsans text-sm font-semibold text-bone/88">{isArabic ? "فتح رفيق لمستخدم محدد" : "Allow a persona for one user"}</p>
            <p className="mt-1 font-arsans text-xs leading-6 text-bone/52">
              {isArabic ? "اختر المستخدم والرفيق. بعد الحفظ، يظهر الرفيق لهذا المستخدم حتى لو لم يكن ضمن حد الرفقاء المجاني." : "Choose a user and a persona. After saving, that companion unlocks for this user even if it is outside the normal free companion limit."}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)} className="rounded-lg border border-white/10 bg-[#0E0D10] px-3 py-3 font-arsans text-sm text-bone/90 outline-none focus:border-sky-200/60">
              {localUsers.map((user) => <option key={user.id} value={user.id}>{user.email || user.name || user.id}</option>)}
            </select>
            <select value={selectedPersonaId} onChange={(event) => setSelectedPersonaId(event.target.value)} className="rounded-lg border border-white/10 bg-[#0E0D10] px-3 py-3 font-arsans text-sm text-bone/90 outline-none focus:border-sky-200/60">
              {personas.map((persona) => <option key={persona.id} value={persona.id}>{isArabic ? persona.nameAr : persona.nameEn} · {persona.id}</option>)}
            </select>
          </div>
          <button type="submit" disabled={personaGrantStatus === "saving" || !selectedUserId || !selectedPersonaId} className="mt-3 w-full rounded-full bg-sky-200 px-4 py-3 font-arsans text-sm text-ink transition hover:bg-bone disabled:opacity-60">
            {personaGrantStatus === "saving" ? (isArabic ? "جاري الفتح..." : "Allowing...") : isArabic ? "فتح الرفيق لهذا المستخدم" : "Allow persona for user"}
          </button>
          <p className={`mt-2 font-arsans text-xs ${personaGrantStatus === "error" ? "text-red-200" : "text-bone/45"}`}>{personaGrantStatus === "saved" ? (isArabic ? "تم فتح الرفيق للمستخدم." : "Persona allowed for this user.") : isArabic ? "سيحتاج المستخدم تحديث الصفحة إذا كان التطبيق مفتوحاً." : "If the user already has the app open, they may need to refresh."}</p>
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
              {user.grantedPersonaIds.length > 0 ? (
                <p className="sm:col-span-2 rounded-xl border border-sky-200/15 bg-sky-200/[0.045] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.08em] text-sky-100/75" dir="ltr">
                  allowed personas: {user.grantedPersonaIds.join(", ")}
                </p>
              ) : null}
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
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  function getShareUrl(discountCode: string) {
    const origin = typeof window === "undefined" ? "https://fad-fada.vercel.app" : window.location.origin;
    return `${origin}/?discount=${encodeURIComponent(discountCode)}`;
  }

  async function copyOffer(offer: AdminDashboardData["discountOffers"][number]) {
    const shareUrl = getShareUrl(offer.code);
    const text = isArabic
      ? `استخدم كود ${offer.code} للحصول على خصم ${offer.percentOff}% على فضفضة بلس: ${shareUrl}`
      : `Use code ${offer.code} for ${offer.percentOff}% off FadFada Plus: ${shareUrl}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(offer.code);
      window.setTimeout(() => setCopiedCode(null), 2200);
    } catch {
      setCopiedCode(null);
    }
  }

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
      <SectionIntro kicker={isArabic ? "العروض" : "Offers"} title={isArabic ? "خصومات Lemon Squeezy" : "Lemon Squeezy discounts"} description={isArabic ? "أنشئ نفس الكود داخل Lemon Squeezy أولاً، ثم استخدمه هنا للتتبع والمشاركة. سنرسل الكود إلى Lemon عند الدفع." : "Create the same code in Lemon Squeezy first, then use it here for tracking and sharing. Checkout sends the code to Lemon."} />
      <div className="space-y-5">
        <form onSubmit={submit} className="rounded-2xl border border-sky-300/20 bg-sky-300/[0.045] p-4">
          <p className="mb-3 rounded-xl border border-sky-200/20 bg-sky-200/10 px-3 py-2 font-arsans text-xs leading-5 text-sky-100/80">
            {isArabic ? "مهم: لوحة فضفضة لا تنشئ الخصم داخل Lemon Squeezy. يجب إنشاء الكود في Lemon بنفس الاسم حتى يقبله الدفع." : "Important: FadFada does not create the discount inside Lemon Squeezy. Create the same code in Lemon so checkout can apply it."}
          </p>
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
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                <p className="truncate rounded-lg border border-white/10 bg-black/20 px-3 py-2 font-mono text-[10px] text-sky-100/75" dir="ltr">{getShareUrl(offer.code)}</p>
                <button type="button" onClick={() => void copyOffer(offer)} className="rounded-lg border border-sky-200/35 px-3 py-2 font-arsans text-xs text-sky-100 transition-colors hover:bg-sky-100 hover:text-ink">
                  {copiedCode === offer.code ? (isArabic ? "تم النسخ" : "Copied") : isArabic ? "نسخ المشاركة" : "Copy share"}
                </button>
              </div>
            </article>
          )) : <EmptyMetric label={isArabic ? "لا توجد خصومات بعد" : "No discounts yet"} />}
        </div>
      </div>
    </section>
  );
}

function SessionsPanel({ language, locale, sessions }: { language: Locale; locale: string; sessions: AdminDashboardData["chatSessions"] }) {
  const isArabic = language === "ar";
  return (
    <section className="grid gap-8 py-10 md:grid-cols-[0.8fr_1.2fr]">
      <SectionIntro kicker={isArabic ? "الجلسات" : "Sessions"} title={isArabic ? "سجل جلسات المستخدمين" : "Signed-user session history"} description={isArabic ? "جلسات الشات محفوظة للمستخدمين المسجلين هنا بدون خلطها مع قائمة الشات العامة." : "Saved signed-user chat sessions stay visible here without mixing admin controls into the public chat menu."} />
      <div className="max-h-[34rem] space-y-3 overflow-y-auto pr-2 [scrollbar-color:rgba(201,168,106,0.45)_transparent]">
        {sessions.length > 0 ? sessions.map((session) => (
          <article key={session.id} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-arsans text-sm text-bone/90" dir="auto">{session.title}</p>
                <p className="mt-1 truncate font-ensans text-xs text-bone/42" dir="auto">{session.userLabel}</p>
              </div>
              <MiniStat label={isArabic ? "رسائل" : "Messages"} value={formatNumber(session.messageCount, locale)} />
            </div>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-bone/35" dir="ltr">
              {session.activePersonaId} · {session.activeWorld} · {session.language} · {formatDate(session.createdAt, locale)}
            </p>
          </article>
        )) : <EmptyMetric label={isArabic ? "لا توجد جلسات محفوظة بعد" : "No saved sessions yet"} />}
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

function LiveRoomTile({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <article className="border border-white/10 bg-white/[0.025] p-4">
      <span className={`block h-1 w-10 ${accent}`} />
      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.08em] text-bone/35">{label}</p>
      <p className="mt-2 font-enserif text-4xl italic text-bone/92">{value}</p>
    </article>
  );
}

function LiveSignal({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="min-w-0 border border-white/10 bg-black/10 p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-gold/70">{label}</p>
      <p className="mt-2 truncate font-arsans text-sm text-bone/78" dir="auto">{value}</p>
      {detail ? <p className="mt-2 truncate font-mono text-[10px] uppercase tracking-[0.08em] text-bone/35" dir="auto">{detail}</p> : null}
    </article>
  );
}

type LiveTimelineEntry = {
  type: string;
  title: string;
  detail: string;
  createdAt: string;
};

function LiveTimelineItem({ item }: { item: LiveTimelineEntry }) {
  return (
    <article className="grid grid-cols-[0.75rem_1fr_auto] items-start gap-3 border border-white/10 bg-black/10 p-3">
      <span className="mt-1 h-3 w-3 rounded-full bg-gold/80" />
      <span className="min-w-0">
        <span className="block truncate font-arsans text-sm text-bone/78" dir="auto">{item.title}</span>
        <span className="mt-1 block truncate font-arsans text-xs text-bone/42" dir="auto">{item.detail}</span>
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-bone/35">{item.type}</span>
    </article>
  );
}

function buildNarrativeTimeline(data: AdminDashboardData, language: Locale, locale: string, unnamedProfile: string, unknownLocation: string): LiveTimelineEntry[] {
  const isArabic = language === "ar";
  const entries: LiveTimelineEntry[] = [
    ...data.recentUsers.slice(0, 3).map((user) => ({
      type: isArabic ? "عضو" : "Member",
      title: user.name || user.email || unnamedProfile,
      detail: `${formatTier(user.activeTier, language)} · ${formatDate(user.createdAt, locale)} · ${formatLocationValue(user.location, unknownLocation)}`,
      createdAt: user.createdAt,
    })),
    ...data.visitorComments.slice(0, 2).map((comment) => ({
      type: isArabic ? "تعليق" : "Comment",
      title: comment.comment,
      detail: `${formatDate(comment.createdAt, locale)} · ${comment.device} · ${formatLocationValue(comment.location, unknownLocation)}`,
      createdAt: comment.createdAt,
    })),
    ...data.chatSessions.slice(0, 2).map((session) => ({
      type: isArabic ? "جلسة" : "Session",
      title: session.title,
      detail: `${session.userLabel} · ${formatNumber(session.messageCount, locale)} ${isArabic ? "رسائل" : "messages"}`,
      createdAt: session.createdAt,
    })),
    ...data.pwaInstalls.slice(0, 2).map((install) => ({
      type: isArabic ? "تثبيت" : "Install",
      title: `${install.device} · ${install.browser}`,
      detail: `${formatDate(install.createdAt, locale)} · ${formatLocationValue(install.location, unknownLocation)}`,
      createdAt: install.createdAt,
    })),
  ];

  return entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6);
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

function formatTime(value: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(value);
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
