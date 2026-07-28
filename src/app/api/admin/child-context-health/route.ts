import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

export const runtime = "nodejs";

type AdminSessionUser = {
  role?: "USER" | "ADMIN";
  workspaceMode?: "parent" | "child";
};

function parseMetadata(metadataJson: string | null) {
  if (!metadataJson) return {} as Record<string, unknown>;

  try {
    return JSON.parse(metadataJson) as Record<string, unknown>;
  } catch {
    return {} as Record<string, unknown>;
  }
}

function readString(value: unknown, fallback = "unknown") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as AdminSessionUser | undefined;

  if (sessionUser?.role !== "ADMIN" || sessionUser.workspaceMode === "child") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const now = Date.now();
  const since24h = new Date(now - 24 * 60 * 60 * 1000);
  const since1h = new Date(now - 60 * 60 * 1000);

  const [events24h, events1h] = await Promise.all([
    prisma.interactionEvent.findMany({
      where: {
        eventType: "child_context_leak_guard",
        createdAt: { gte: since24h },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        userId: true,
        metadataJson: true,
        createdAt: true,
      },
    }),
    prisma.interactionEvent.count({
      where: {
        eventType: "child_context_leak_guard",
        createdAt: { gte: since1h },
      },
    }),
  ]);

  const reasons = Object.values(
    events24h.reduce<Record<string, { reason: string; count: number }>>((accumulator, event) => {
      const metadata = parseMetadata(event.metadataJson);
      const reason = readString(metadata.reason, "unknown");
      const key = reason.toLowerCase();
      accumulator[key] = accumulator[key] || { reason, count: 0 };
      accumulator[key].count += 1;
      return accumulator;
    }, {})
  ).sort((left, right) => right.count - left.count);

  const recent = events24h.slice(0, 20).map((event) => {
    const metadata = parseMetadata(event.metadataJson);
    return {
      reason: readString(metadata.reason, "unknown"),
      mode: readString(metadata.mode, "unknown"),
      userId: event.userId || null,
      createdAt: event.createdAt.toISOString(),
    };
  });

  const last24hCount = events24h.length;

  return NextResponse.json({
    ok: true,
    status: last24hCount > 0 ? "alert" : "healthy",
    last24hCount,
    lastHourCount: events1h,
    reasons,
    recent,
  });
}
