import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions, inferChildAgeBand, requireParentWorkspace } from "../../../../lib/auth";
import { hasLifetimePlusAccess } from "../../../../lib/lifetimeAccess";
import { NEW_CHILDREN_ROSTER } from "../../../../lib/personas";
import { prisma } from "../../../../lib/prisma";

export const runtime = "nodejs";

const defaultFreeChildProfileLimit = 1;
const defaultPlusChildProfileLimit = 5;
const defaultDailyTimeLimitMinutes = 30;
const minimumSupportedAge = 4;
const maximumSupportedAge = 17;
const allowedAvatarPreferences = new Set<string>(NEW_CHILDREN_ROSTER.map((persona) => persona.avatar));

const familyNameSignals = [
  "bin",
  "bint",
  "ibn",
  "abu",
  "umm",
  "al-",
  "el-",
  "family",
  "surname",
  "lastname",
  "last name",
  "dad",
  "mom",
  "mama",
  "papa",
  "father",
  "mother",
  "بابا",
  "ماما",
  "أبو",
  "ابو",
  "أم",
  "ام",
  "ابن",
  "بنت",
  "العائلة",
  "اللقب",
];

const playfulFallbackNicknames = ["Moon Spark", "Tiny Comet", "Kind Star", "Puzzle Hero", "Sunny Builder", "Brave Bean"];

type CreateChildProfileRequest = {
  nickname?: unknown;
  birthYear?: unknown;
  avatarPreference?: unknown;
  dailyTimeLimitMinutes?: unknown;
  phone?: unknown;
  phoneNumber?: unknown;
  familyName?: unknown;
  lastName?: unknown;
  fullName?: unknown;
};

type ChildProfileResponse = {
  id: string;
  nickname: string;
  birthYear: number;
  ageBand: ReturnType<typeof inferChildAgeBand>;
  avatarPreference: string;
  gamePoints: number;
  dailyTimeLimitMinutes: number;
  createdAt: string;
  updatedAt: string;
  conversationHistory: ChildConversationHistoryItem[];
};

type ChildConversationHistoryItem = {
  id: string;
  childText: string;
  assistantText: string;
  personaId: string | null;
  world: string;
  language: "ar" | "en";
  createdAt: string;
};

export async function GET() {
  const session = await getServerSession(authOptions);
  const parentContext = requireParentWorkspace(session?.user);

  if (!parentContext.ok) {
    return NextResponse.json({ error: parentContext.error }, { status: parentContext.status });
  }

  let childProfiles: Array<{
    id: string;
    nickname: string;
    birthYear: number;
    avatarPreference: string;
    gamePoints: number;
    dailyTimeLimitMinutes: number;
    createdAt: Date;
    updatedAt: Date;
  }>;

  try {
    childProfiles = await prisma.childProfile.findMany({
      where: { parentId: parentContext.userId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        nickname: true,
        birthYear: true,
        avatarPreference: true,
        gamePoints: true,
        dailyTimeLimitMinutes: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (error) {
    return buildChildProfileDatabaseErrorResponse(error);
  }

  const [historiesByChildId, childLimitContext] = await Promise.all([
    loadChildConversationHistory(parentContext.userId, childProfiles.map((profile) => profile.id)),
    loadChildProfileLimitContext(parentContext.userId),
  ]);

  return NextResponse.json({
    childProfiles: childProfiles.map((profile) => toChildProfileResponse(profile, historiesByChildId.get(profile.id) ?? [])),
    childProfileLimit: childLimitContext.limit,
    childProfileTier: childLimitContext.tier,
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const parentContext = requireParentWorkspace(session?.user);

  if (!parentContext.ok) {
    return NextResponse.json({ error: parentContext.error }, { status: parentContext.status });
  }

  const body = (await request.json().catch(() => ({}))) as CreateChildProfileRequest;
  let existingProfileCount = 0;
  let childLimitContext = { limit: defaultFreeChildProfileLimit, tier: "FREE" };

  try {
    [existingProfileCount, childLimitContext] = await Promise.all([
      prisma.childProfile.count({ where: { parentId: parentContext.userId } }),
      loadChildProfileLimitContext(parentContext.userId),
    ]);
  } catch (error) {
    return buildChildProfileDatabaseErrorResponse(error);
  }

  if (existingProfileCount >= childLimitContext.limit) {
    return NextResponse.json({ error: "CHILD_PROFILE_LIMIT_REACHED", maxProfiles: childLimitContext.limit, childProfileTier: childLimitContext.tier, upgradeRequired: childLimitContext.tier === "FREE" }, { status: 409 });
  }

  const birthYear = normalizeBirthYear(body.birthYear);

  if (!birthYear) {
    return NextResponse.json({ error: "INVALID_BIRTH_YEAR", minimumAge: minimumSupportedAge, maximumAge: maximumSupportedAge }, { status: 400 });
  }

  const nickname = sanitizeChildNickname(body.nickname, existingProfileCount);
  const avatarPreference = sanitizeAvatarPreference(body.avatarPreference);
  const dailyTimeLimitMinutes = sanitizeDailyTimeLimit(body.dailyTimeLimitMinutes);

  let childProfile: {
    id: string;
    nickname: string;
    birthYear: number;
    avatarPreference: string;
    gamePoints: number;
    dailyTimeLimitMinutes: number;
    createdAt: Date;
    updatedAt: Date;
  };

  try {
    childProfile = await prisma.childProfile.create({
      data: {
        parentId: parentContext.userId,
        nickname,
        birthYear,
        avatarPreference,
        dailyTimeLimitMinutes,
      },
      select: {
        id: true,
        nickname: true,
        birthYear: true,
        avatarPreference: true,
        gamePoints: true,
        dailyTimeLimitMinutes: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (error) {
    return buildChildProfileDatabaseErrorResponse(error);
  }

  return NextResponse.json({ childProfile: toChildProfileResponse(childProfile, []) }, { status: 201 });
}

async function loadChildProfileLimitContext(parentId: string) {
  const [user, configEvent] = await Promise.all([
    prisma.user.findUnique({ where: { id: parentId }, select: { activeTier: true, email: true } }),
    prisma.interactionEvent.findFirst({ where: { eventType: "admin_app_config" }, orderBy: { createdAt: "desc" }, select: { metadataJson: true } }),
  ]);
  const config = parseConfig(configEvent?.metadataJson);
  const freeLimit = cleanLimit(config.freeChildProfileLimit, defaultFreeChildProfileLimit);
  const plusLimit = Math.max(freeLimit, cleanLimit(config.plusChildProfileLimit, defaultPlusChildProfileLimit));
  const isPlus = user?.activeTier === "PLUS" || user?.activeTier === "BUSINESS" || hasLifetimePlusAccess(user?.email);

  return { limit: isPlus ? plusLimit : freeLimit, tier: isPlus ? "PLUS" : "FREE" };
}

function parseConfig(value: string | null | undefined) {
  if (!value) return {} as Record<string, unknown>;
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {} as Record<string, unknown>;
  }
}

function cleanLimit(value: unknown, fallback: number) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? Math.max(1, Math.min(50, Math.round(numberValue))) : fallback;
}

async function loadChildConversationHistory(parentId: string, childProfileIds: string[]) {
  const childProfileIdSet = new Set(childProfileIds);
  const historiesByChildId = new Map<string, ChildConversationHistoryItem[]>();

  if (childProfileIds.length === 0) return historiesByChildId;

  try {
    const events = await prisma.interactionEvent.findMany({
      where: {
        userId: parentId,
        eventType: "child_conversation_turn",
      },
      orderBy: { createdAt: "desc" },
      take: 90,
      select: {
        id: true,
        metadataJson: true,
        createdAt: true,
      },
    });

    for (const event of events) {
      const metadata = parseChildConversationMetadata(event.metadataJson);
      if (!metadata || !childProfileIdSet.has(metadata.childProfileId)) continue;

      const current = historiesByChildId.get(metadata.childProfileId) ?? [];
      if (current.length >= 8) continue;

      current.push({
        id: event.id,
        childText: metadata.childText,
        assistantText: metadata.assistantText,
        personaId: metadata.personaId,
        world: metadata.world,
        language: metadata.language,
        createdAt: event.createdAt.toISOString(),
      });
      historiesByChildId.set(metadata.childProfileId, current);
    }
  } catch (error) {
    console.error("Child conversation history load fallback", error);
  }

  return historiesByChildId;
}

function parseChildConversationMetadata(value: string | null) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const childProfileId = typeof parsed.childProfileId === "string" ? parsed.childProfileId : "";
    const childText = typeof parsed.childText === "string" ? parsed.childText : "";
    const assistantText = typeof parsed.assistantText === "string" ? parsed.assistantText : "";
    if (!childProfileId || !childText || !assistantText) return null;

    return {
      childProfileId,
      childText: childText.slice(0, 1200),
      assistantText: assistantText.slice(0, 1800),
      personaId: typeof parsed.personaId === "string" ? parsed.personaId.slice(0, 80) : null,
      world: typeof parsed.world === "string" ? parsed.world.slice(0, 40) : "calm",
      language: parsed.language === "en" ? "en" as const : "ar" as const,
    };
  } catch {
    return null;
  }
}

function buildChildProfileDatabaseErrorResponse(error: unknown) {
  console.error("Child profile database error", error);
  const message = error instanceof Error ? error.message : "";
  const code = typeof (error as { code?: unknown })?.code === "string" ? (error as { code: string }).code : "";

  if (code === "P2021" || /ChildProfile|child_profiles|childprofile|table.*does not exist/i.test(message)) {
    return NextResponse.json({ error: "CHILD_PROFILE_MIGRATION_REQUIRED" }, { status: 503 });
  }

  if (code === "P1001" || code === "P1012" || /database.*url|can't reach database|environment variable.*DATABASE_URL|empty string/i.test(message)) {
    return NextResponse.json({ error: "DATABASE_NOT_CONFIGURED" }, { status: 503 });
  }

  return NextResponse.json({ error: "CHILD_PROFILE_DATABASE_UNAVAILABLE" }, { status: 503 });
}

function toChildProfileResponse(profile: {
  id: string;
  nickname: string;
  birthYear: number;
  avatarPreference: string;
  gamePoints: number;
  dailyTimeLimitMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}, conversationHistory: ChildConversationHistoryItem[]): ChildProfileResponse {
  return {
    id: profile.id,
    nickname: profile.nickname,
    birthYear: profile.birthYear,
    ageBand: inferChildAgeBand(profile.birthYear),
    avatarPreference: profile.avatarPreference,
    gamePoints: profile.gamePoints,
    dailyTimeLimitMinutes: profile.dailyTimeLimitMinutes,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
    conversationHistory,
  };
}

function normalizeBirthYear(value: unknown) {
  const birthYear = typeof value === "number"
    ? value
    : typeof value === "string"
      ? Number.parseInt(normalizeLocalizedDigits(value).trim(), 10)
      : Number.NaN;
  const currentYear = new Date().getUTCFullYear();
  const age = currentYear - birthYear;

  if (!Number.isInteger(birthYear) || age < minimumSupportedAge || age > maximumSupportedAge) {
    return null;
  }

  return birthYear;
}

function sanitizeChildNickname(value: unknown, fallbackIndex: number) {
  const rawNickname = typeof value === "string" ? value : "";
  const strippedPrivateData = rawNickname
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, " ")
    .replace(/(?:\+?\d[\d\s().-]{6,}\d)/g, " ")
    .replace(/[<>()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const playfulParts = strippedPrivateData
    .split(" ")
    .map((part) => part.replace(/[^\p{L}\p{M}'-]/gu, ""))
    .filter((part) => part.length >= 2 && part.length <= 18)
    .filter((part) => !isFamilyNameSignal(part));

  const nickname = playfulParts.slice(0, 2).join(" ").trim();

  if (nickname.length >= 2) {
    return nickname.slice(0, 32);
  }

  return playfulFallbackNicknames[fallbackIndex % playfulFallbackNicknames.length];
}

function isFamilyNameSignal(value: string) {
  const normalized = value.trim().toLowerCase();
  return familyNameSignals.some((signal) => normalized === signal || normalized.startsWith(signal));
}

function sanitizeAvatarPreference(value: unknown) {
  const avatarPreference = typeof value === "string" ? value.trim() : "";
  return allowedAvatarPreferences.has(avatarPreference) ? avatarPreference : "/avatars/rami_riddles.png";
}

function sanitizeDailyTimeLimit(value: unknown) {
  const minutes = typeof value === "number"
    ? value
    : typeof value === "string"
      ? Number.parseInt(normalizeLocalizedDigits(value).trim(), 10)
      : defaultDailyTimeLimitMinutes;

  if (!Number.isInteger(minutes)) {
    return defaultDailyTimeLimitMinutes;
  }

  return Math.min(120, Math.max(10, minutes));
}

function normalizeLocalizedDigits(value: string) {
  return value
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
}
