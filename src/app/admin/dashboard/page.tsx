import crypto from "crypto";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { AdminDashboardClient, type AdminDashboardData } from "./admin-dashboard-client";
import { authOptions } from "../../../lib/auth";
import { personas } from "../../../lib/personas";
import { prisma } from "../../../lib/prisma";

export const dynamic = "force-dynamic";

type AdminSessionUser = {
  id?: string;
  email?: string | null;
  role?: "USER" | "ADMIN";
};

type AuditSnapshot = {
  generatedAt: string;
  visitorsByRegion: Array<{ geographicRegion: string; count: number }>;
  visitorComments: Array<{ comment: string; language: string; device: string; browser: string; createdAt: string; geographicRegion: string }>;
  pwaInstalls: Array<{ device: string; browser: string; platform: string; createdAt: string; geographicRegion: string }>;
  registrationFunnel: Array<{
    id: string;
    name: string | null;
    email: string | null;
    provider: string;
    activeTier: string;
    tokenBalance: number;
    currentLanguage: string;
    createdAt: string;
  }>;
  commercialDistribution: Array<{
    tier: string;
    userCount: number;
    monthlyRevenueMinor: number;
    currency: string;
  }>;
};

function formatLocation(location: string | null | undefined) {
  if (!location || location === "unknown") return "";

  try {
    return decodeURIComponent(location).trim();
  } catch {
    return location.trim();
  }
}

function fallbackLocationLabel(location: string | null | undefined) {
  return formatLocation(location) || "unknown";
}

function combineLocationCounts(entries: Array<{ location: string; count: number }>) {
  return Object.values(
    entries.reduce<Record<string, { location: string; count: number }>>((accumulator, entry) => {
      const location = entry.location || "unknown";
      const key = location.toLowerCase();
      accumulator[key] = accumulator[key] || { location, count: 0 };
      accumulator[key].count += entry.count;
      return accumulator;
    }, {})
  ).sort((a, b) => b.count - a.count);
}

function parseEventMetadata(metadataJson: string | null) {
  if (!metadataJson) return {} as Record<string, unknown>;

  try {
    return JSON.parse(metadataJson) as Record<string, unknown>;
  } catch {
    return {} as Record<string, unknown>;
  }
}

function metadataString(metadata: Record<string, unknown>, key: string, fallback = "unknown") {
  const value = metadata[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function metadataNumber(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  const numberValue = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(numberValue) ? numberValue : null;
}

const registeredUserWhere = { email: { not: null } };
const visibleVisitorCommentWhere = {
  eventType: "visitor_comment",
  NOT: [
    { metadataJson: { contains: "Smoke test visitor comment" } },
    { metadataJson: { contains: "\"browser\":\"PowerShell\"" } },
  ],
};
const visiblePwaInstallWhere = {
  eventType: "pwa_install",
  NOT: [
    { metadataJson: { contains: "\"source\":\"test\"" } },
    { metadataJson: { contains: "\"browser\":\"PowerShell\"" } },
  ],
};

function getAuditEncryptionKey() {
  return crypto.createHash("sha256").update(process.env.AUDIT_EXPORT_KEY || process.env.NEXTAUTH_SECRET || "fadfada-local-audit-key").digest();
}

function encryptAuditSnapshot(snapshot: AuditSnapshot) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getAuditEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(snapshot), "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    algorithm: "aes-256-gcm",
    generatedAt: snapshot.generatedAt,
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    payload: encrypted.toString("base64"),
  };
}

async function buildDashboardData() {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [totalVisitors, registeredUsers, interactionCounts, visitorsByRegion, registrationsByRegionRaw, recentUsers, tierCounts, monthlyTransactions, visibleVisitorCommentCount, visiblePwaInstallCount, recentCommentEvents, pwaInstallEvents, avatarRatingEvents, adminNotifications, adminConfigEvents, adminGiftEvents, adminPersonaGrantEvents, adminPersonaGrantSetEvents, adminDiscountEvents, chatSessionEvents] = await Promise.all([
    prisma.visitorLog.count(),
    prisma.user.count({ where: registeredUserWhere }),
    prisma.interactionEvent.groupBy({
      by: ["eventType"],
      _count: { _all: true },
    }),
    prisma.visitorLog.groupBy({
      by: ["geographicRegion"],
      where: { geographicRegion: { not: "unknown" } },
      _count: { _all: true },
      orderBy: { _count: { geographicRegion: "desc" } },
      take: 8,
    }),
    prisma.user.groupBy({
      by: ["registrationRegion"],
      where: registeredUserWhere,
      _count: { _all: true },
      orderBy: { _count: { registrationRegion: "desc" } },
      take: 8,
    }),
    prisma.user.findMany({
      where: registeredUserWhere,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        accounts: {
          select: {
            provider: true,
          },
          take: 1,
        },
        visitorLogs: {
          where: { geographicRegion: { not: "unknown" } },
          orderBy: { timestamp: "desc" },
          select: { geographicRegion: true },
          take: 1,
        },
      },
    }),
    prisma.user.groupBy({
      by: ["activeTier"],
      where: registeredUserWhere,
      _count: { _all: true },
    }),
    prisma.transaction.findMany({
      where: {
        status: "SUCCESSFUL",
        createdAt: {
          gte: monthStart,
        },
      },
      select: {
        amountPaid: true,
        currency: true,
        user: {
          select: {
            activeTier: true,
          },
        },
      },
    }),
    prisma.interactionEvent.count({ where: visibleVisitorCommentWhere }),
    prisma.interactionEvent.count({ where: visiblePwaInstallWhere }),
    prisma.interactionEvent.findMany({
      where: visibleVisitorCommentWhere,
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.interactionEvent.findMany({
      where: visiblePwaInstallWhere,
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.interactionEvent.findMany({
      where: { eventType: "avatar_rating" },
      orderBy: { createdAt: "desc" },
      take: 1000,
    }),
    prisma.interactionEvent.findMany({
      where: { eventType: "admin_notification" },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.interactionEvent.findMany({
      where: { eventType: "admin_app_config" },
      orderBy: { createdAt: "desc" },
      take: 1,
    }),
    prisma.interactionEvent.findMany({
      where: { eventType: "admin_user_gift" },
      orderBy: { createdAt: "desc" },
      take: 1000,
    }),
    prisma.interactionEvent.findMany({
      where: { eventType: "admin_persona_grant" },
      orderBy: { createdAt: "desc" },
      take: 2000,
    }),
    prisma.interactionEvent.findMany({
      where: { eventType: "admin_persona_grants_set" },
      orderBy: { createdAt: "desc" },
      take: 2000,
    }),
    prisma.interactionEvent.findMany({
      where: { eventType: "admin_discount_offer" },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.interactionEvent.findMany({
      where: { eventType: "chat_session_snapshot" },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
  ]);

  const monthlyRevenueByTier = monthlyTransactions.reduce<Record<string, { amount: number; currency: string }>>((accumulator, transaction) => {
    const tier = transaction.user.activeTier;
    const current = accumulator[tier] || { amount: 0, currency: transaction.currency.toUpperCase() };
    accumulator[tier] = {
      amount: current.amount + transaction.amountPaid,
      currency: current.currency,
    };
    return accumulator;
  }, {});

  const distribution = ["FREE", "PLUS", "BUSINESS"].map((tier) => {
    const count = tierCounts.find((entry) => entry.activeTier === tier)?._count._all ?? 0;
    const monthlyRevenue = monthlyRevenueByTier[tier] || { amount: 0, currency: "USD" };
    return {
      tier,
      userCount: count,
      monthlyRevenueMinor: monthlyRevenue.amount,
      currency: monthlyRevenue.currency,
    };
  });
  const interactionTotals = {
    starterTaps: interactionCounts.find((entry) => entry.eventType === "starter_tap")?._count._all ?? 0,
    savedMoments: interactionCounts.find((entry) => entry.eventType === "moment_save")?._count._all ?? 0,
    capsules: interactionCounts.find((entry) => entry.eventType === "capsule_download")?._count._all ?? 0,
    helpful: interactionCounts.find((entry) => entry.eventType === "helpful_feedback")?._count._all ?? 0,
    softer: interactionCounts.find((entry) => entry.eventType === "softer_feedback")?._count._all ?? 0,
    shares:
      (interactionCounts.find((entry) => entry.eventType === "app_share")?._count._all ?? 0) +
      (interactionCounts.find((entry) => entry.eventType === "moment_share")?._count._all ?? 0),
    visitorComments: visibleVisitorCommentCount,
    pwaInstalls: visiblePwaInstallCount,
  };
  const visitorComments = recentCommentEvents.map((event) => {
    const metadata = parseEventMetadata(event.metadataJson);
    return {
      id: event.id,
      comment: metadataString(metadata, "comment", ""),
      language: metadataString(metadata, "language", "unknown"),
      device: metadataString(metadata, "device", "unknown"),
      browser: metadataString(metadata, "browser", "unknown"),
      viewport: metadataString(metadata, "viewport", "unknown"),
      location: fallbackLocationLabel(event.geographicRegion),
      createdAt: event.createdAt.toISOString(),
    };
  }).filter((comment) => comment.comment.length > 0);
  const pwaInstalls = pwaInstallEvents.map((event) => {
    const metadata = parseEventMetadata(event.metadataJson);
    return {
      id: event.id,
      device: metadataString(metadata, "device", "unknown"),
      browser: metadataString(metadata, "browser", "unknown"),
      platform: metadataString(metadata, "platform", "unknown"),
      viewport: metadataString(metadata, "viewport", "unknown"),
      source: metadataString(metadata, "source", "unknown"),
      location: fallbackLocationLabel(event.geographicRegion),
      createdAt: event.createdAt.toISOString(),
    };
  });
  const pwaDeviceBreakdown = Object.values(
    pwaInstalls.reduce<Record<string, { label: string; count: number }>>((accumulator, install) => {
      const key = `${install.device} / ${install.browser}`;
      accumulator[key] = accumulator[key] || { label: key, count: 0 };
      accumulator[key].count += 1;
      return accumulator;
    }, {})
  ).sort((a, b) => b.count - a.count);
  const registrationsByRegion = registrationsByRegionRaw
    .map((entry) => ({
      location: formatLocation(entry.registrationRegion),
      count: entry._count._all,
    }))
    .filter((entry) => entry.location.length > 0);
  const personaNameById = Object.fromEntries(personas.map((persona) => [persona.id, { ar: persona.nameAr, en: persona.nameEn }]));
  const avatarRatings = Object.values(
    avatarRatingEvents.reduce<Record<string, { personaId: string; personaNameAr: string; personaNameEn: string; ratingCount: number; ratingTotal: number; latestRating: number; latestAt: string; location: string }>>((accumulator, event) => {
      const metadata = parseEventMetadata(event.metadataJson);
      const personaId = metadataString(metadata, "personaId", "unknown");
      const rating = metadataNumber(metadata, "rating");
      if (!rating || rating < 1 || rating > 5) return accumulator;

      const personaName = personaNameById[personaId as keyof typeof personaNameById];
      const current = accumulator[personaId] || {
        personaId,
        personaNameAr: metadataString(metadata, "personaNameAr", personaName?.ar || personaId),
        personaNameEn: metadataString(metadata, "personaNameEn", personaName?.en || personaId),
        ratingCount: 0,
        ratingTotal: 0,
        latestRating: rating,
        latestAt: event.createdAt.toISOString(),
        location: fallbackLocationLabel(event.geographicRegion),
      };
      accumulator[personaId] = {
        ...current,
        ratingCount: current.ratingCount + 1,
        ratingTotal: current.ratingTotal + rating,
      };
      return accumulator;
    }, {})
  )
    .map((entry) => ({
      personaId: entry.personaId,
      personaNameAr: entry.personaNameAr,
      personaNameEn: entry.personaNameEn,
      ratingCount: entry.ratingCount,
      averageRating: Number((entry.ratingTotal / entry.ratingCount).toFixed(2)),
      latestRating: entry.latestRating,
      latestAt: entry.latestAt,
      location: entry.location,
    }))
    .sort((a, b) => b.averageRating - a.averageRating || b.ratingCount - a.ratingCount);
  const recentNotifications = adminNotifications.map((notification) => {
    const metadata = parseEventMetadata(notification.metadataJson);
    return {
      id: notification.id,
      type: metadataString(metadata, "type", "GENERAL"),
      titleAr: metadataString(metadata, "titleAr", "تنبيه من فضفضة"),
      titleEn: metadataString(metadata, "titleEn", "FadFada update"),
      bodyAr: metadataString(metadata, "bodyAr", ""),
      bodyEn: metadataString(metadata, "bodyEn", ""),
      priority: Math.max(1, Math.min(5, Math.round(metadataNumber(metadata, "priority") || 2))),
      isActive: metadata.isActive !== false,
      startsAt: metadataString(metadata, "startsAt", notification.createdAt.toISOString()),
      endsAt: metadataString(metadata, "endsAt", "") || null,
      createdAt: notification.createdAt.toISOString(),
    };
  });
  const latestConfig = parseEventMetadata(adminConfigEvents[0]?.metadataJson || null);
  const configuration = {
    anonymousReflectionLimit: metadataNumber(latestConfig, "anonymousReflectionLimit") || 5,
    signedGiftReflectionLimit: metadataNumber(latestConfig, "signedGiftReflectionLimit") || 15,
    anonymousPersonaLimit: metadataNumber(latestConfig, "anonymousPersonaLimit") || 4,
    signedPersonaLimit: metadataNumber(latestConfig, "signedPersonaLimit") || 10,
  };
  const giftTotalsByUser = adminGiftEvents.reduce<Record<string, { giftCount: number; giftedTokens: number }>>((accumulator, event) => {
    const metadata = parseEventMetadata(event.metadataJson);
    const targetUserId = metadataString(metadata, "targetUserId", "");
    const amount = metadataNumber(metadata, "amount") || 0;
    if (!targetUserId) return accumulator;
    const current = accumulator[targetUserId] || { giftCount: 0, giftedTokens: 0 };
    accumulator[targetUserId] = { giftCount: current.giftCount + 1, giftedTokens: current.giftedTokens + amount };
    return accumulator;
  }, {});
  const personaGrantsByUser = adminPersonaGrantEvents.reduce<Record<string, string[]>>((accumulator, event) => {
    const metadata = parseEventMetadata(event.metadataJson);
    const targetUserId = metadataString(metadata, "targetUserId", "");
    const personaId = metadataString(metadata, "personaId", "");
    if (!targetUserId || !personas.some((persona) => persona.id === personaId)) return accumulator;
    accumulator[targetUserId] = Array.from(new Set([...(accumulator[targetUserId] || []), personaId]));
    return accumulator;
  }, {});
  for (const event of [...adminPersonaGrantSetEvents].reverse()) {
    const metadata = parseEventMetadata(event.metadataJson);
    const targetUserId = metadataString(metadata, "targetUserId", "");
    const personaIds = Array.isArray(metadata.personaIds) ? metadata.personaIds.filter((personaId): personaId is string => typeof personaId === "string" && personas.some((persona) => persona.id === personaId)) : [];
    if (targetUserId) personaGrantsByUser[targetUserId] = Array.from(new Set(personaIds));
  }
  const discountOffers = adminDiscountEvents.map((event) => {
    const metadata = parseEventMetadata(event.metadataJson);
    return {
      id: event.id,
      code: metadataString(metadata, "code", "OFFER"),
      label: metadataString(metadata, "label", "Admin offer"),
      percentOff: Math.max(1, Math.min(90, Math.round(metadataNumber(metadata, "percentOff") || 1))),
      appliesTo: metadataString(metadata, "appliesTo", "PLUS"),
      maxRedemptions: metadataNumber(metadata, "maxRedemptions"),
      expiresAt: metadataString(metadata, "expiresAt", "") || null,
      isActive: metadata.isActive !== false,
      createdAt: event.createdAt.toISOString(),
    };
  });
  const latestChatSessionsById = new Map<string, {
    id: string;
    userLabel: string;
    title: string;
    activePersonaId: string;
    activeWorld: string;
    language: string;
    messageCount: number;
    createdAt: string;
  }>();

  for (const event of chatSessionEvents) {
    const metadata = parseEventMetadata(event.metadataJson);
    const sessionId = metadataString(metadata, "sessionId", event.id);
    if (latestChatSessionsById.has(sessionId)) continue;
    const messages = Array.isArray(metadata.messages) ? metadata.messages : [];
    latestChatSessionsById.set(sessionId, {
      id: event.id,
      userLabel: event.user?.email || event.user?.name || event.userId || "unknown user",
      title: metadataString(metadata, "title", "FadFada session"),
      activePersonaId: metadataString(metadata, "activePersonaId", "omar"),
      activeWorld: metadataString(metadata, "activeWorld", "calm"),
      language: metadataString(metadata, "language", "ar"),
      messageCount: messages.length,
      createdAt: event.createdAt.toISOString(),
    });
  }
  const chatSessions = Array.from(latestChatSessionsById.values()).slice(0, 24);

  const auditSnapshot: AuditSnapshot = {
    generatedAt: new Date().toISOString(),
    visitorsByRegion: visitorsByRegion.map((entry) => ({
      geographicRegion: entry.geographicRegion,
      count: entry._count._all,
    })),
    visitorComments: visitorComments.map((comment) => ({
      comment: comment.comment,
      language: comment.language,
      device: comment.device,
      browser: comment.browser,
      createdAt: comment.createdAt,
      geographicRegion: comment.location,
    })),
    pwaInstalls: pwaInstalls.map((install) => ({
      device: install.device,
      browser: install.browser,
      platform: install.platform,
      createdAt: install.createdAt,
      geographicRegion: install.location,
    })),
    registrationFunnel: recentUsers.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      provider: user.accounts[0]?.provider || "email",
      activeTier: user.activeTier,
      tokenBalance: user.tokenBalance,
      currentLanguage: user.currentLanguage,
      createdAt: user.createdAt.toISOString(),
    })),
    commercialDistribution: distribution,
  };

  return {
    totalVisitors,
    registeredUsers,
    interactionTotals,
    visitorsByRegion,
    registrationsByRegion,
    recentUsers,
    distribution,
    visitorComments,
    pwaInstalls,
    pwaDeviceBreakdown,
    avatarRatings,
    recentNotifications,
    configuration,
    giftTotalsByUser,
    personaGrantsByUser,
    discountOffers,
    chatSessions,
    auditSnapshot,
    encryptedAuditSnapshot: encryptAuditSnapshot(auditSnapshot),
  };
}

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as AdminSessionUser | undefined;

  if (!sessionUser) {
    redirect("/admin/login");
  }

  if (sessionUser.role !== "ADMIN") {
    redirect("/admin/login");
  }

  const { totalVisitors, registeredUsers, interactionTotals, visitorsByRegion, registrationsByRegion, recentUsers, distribution, visitorComments, pwaInstalls, pwaDeviceBreakdown, avatarRatings, recentNotifications, configuration, giftTotalsByUser, personaGrantsByUser, discountOffers, chatSessions, encryptedAuditSnapshot } = await buildDashboardData();
  const auditHref = `data:application/json;base64,${Buffer.from(JSON.stringify(encryptedAuditSnapshot, null, 2)).toString("base64")}`;
  const dashboardData: AdminDashboardData = {
    configuration,
    totalVisitors,
    registeredUsers,
    interactionTotals,
    visitorsByRegion: combineLocationCounts(visitorsByRegion.map((entry) => ({
      location: formatLocation(entry.geographicRegion) || "unknown",
      count: entry._count._all,
    }))),
    registrationsByRegion: combineLocationCounts(registrationsByRegion),
    recentUsers: recentUsers.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      provider: user.accounts[0]?.provider || "email",
      activeTier: user.activeTier,
      tokenBalance: user.tokenBalance,
      currentLanguage: user.currentLanguage,
      createdAt: user.createdAt.toISOString(),
      location: fallbackLocationLabel(user.registrationRegion || user.visitorLogs[0]?.geographicRegion),
      giftCount: giftTotalsByUser[user.id]?.giftCount || 0,
      giftedTokens: giftTotalsByUser[user.id]?.giftedTokens || 0,
      grantedPersonaIds: personaGrantsByUser[user.id] || [],
    })),
    discountOffers,
    chatSessions,
    distribution,
    visitorComments,
    pwaInstalls,
    pwaDeviceBreakdown,
    avatarRatings,
    recentNotifications,
  };

  return <AdminDashboardClient data={dashboardData} auditHref={auditHref} />;
}
