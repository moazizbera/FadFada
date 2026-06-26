import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

export const runtime = "nodejs";

type SessionUser = {
  id?: string;
};

type ChatSessionSnapshot = {
  sessionId?: string;
  title?: string;
  activePersonaId?: string;
  activeWorld?: string;
  language?: "ar" | "en";
  messages?: Array<{
    id?: string;
    role?: "user" | "assistant";
    text?: string;
    world?: string;
    language?: "ar" | "en";
    personaId?: string;
    personaName?: string;
    avatarPath?: string;
  }>;
};

export async function GET() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as SessionUser | undefined;

  if (!sessionUser?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const events = await prisma.interactionEvent.findMany({
    where: {
      userId: sessionUser.id,
      eventType: "chat_session_snapshot",
    },
    orderBy: { createdAt: "desc" },
    take: 120,
  });

  const latestBySession = new Map<string, ReturnType<typeof normalizeSnapshot> & { updatedAt: string }>();

  for (const event of events) {
    const snapshot = normalizeSnapshot(parseJson(event.metadataJson));
    if (!snapshot.sessionId || latestBySession.has(snapshot.sessionId)) continue;
    latestBySession.set(snapshot.sessionId, { ...snapshot, updatedAt: event.createdAt.toISOString() });
  }

  return NextResponse.json({ sessions: Array.from(latestBySession.values()).slice(0, 24) });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as SessionUser | undefined;

  if (!sessionUser?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await request.json()) as ChatSessionSnapshot;
  const snapshot = normalizeSnapshot(body);

  if (!snapshot.sessionId || snapshot.messages.length === 0) {
    return NextResponse.json({ error: "INVALID_SESSION" }, { status: 400 });
  }

  await prisma.interactionEvent.create({
    data: {
      userId: sessionUser.id,
      eventType: "chat_session_snapshot",
      metadataJson: JSON.stringify(snapshot).slice(0, 12000),
      geographicRegion: "account",
    },
  });

  return NextResponse.json({ ok: true, session: snapshot });
}

function parseJson(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value) as ChatSessionSnapshot;
  } catch {
    return null;
  }
}

function normalizeSnapshot(value: ChatSessionSnapshot | null) {
  const messages = Array.isArray(value?.messages)
    ? value.messages
        .filter((message) => (message.role === "user" || message.role === "assistant") && typeof message.text === "string" && message.text.trim().length > 0)
        .slice(-40)
        .map((message) => ({
          id: cleanText(message.id, 80) || `msg-${Date.now()}`,
          role: message.role,
          text: cleanText(message.text, 2200),
          world: cleanText(message.world, 40) || "calm",
          language: message.language === "en" ? "en" : "ar",
          personaId: cleanText(message.personaId, 80) || undefined,
          personaName: cleanText(message.personaName, 120) || undefined,
          avatarPath: cleanText(message.avatarPath, 500) || undefined,
        }))
    : [];

  const fallbackTitle = messages.find((message) => message.role === "user")?.text || messages[0]?.text || "FadFada session";

  return {
    sessionId: cleanText(value?.sessionId, 100),
    title: cleanText(value?.title, 90) || summarizeTitle(fallbackTitle),
    activePersonaId: cleanText(value?.activePersonaId, 80) || "omar",
    activeWorld: cleanText(value?.activeWorld, 40) || "calm",
    language: value?.language === "en" ? "en" : "ar",
    messages,
  };
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function summarizeTitle(value: string) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length > 70 ? `${cleaned.slice(0, 67).trim()}...` : cleaned || "FadFada session";
}
