import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions, buildGeographicRegionFromHeaders } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

export const runtime = "nodejs";

const allowedEventTypes = new Set(["starter_tap", "moment_save", "tiny_plan", "moment_share", "app_share", "capsule_download", "helpful_feedback", "softer_feedback", "visitor_comment", "pwa_install", "avatar_rating", "avatar_generate"]);

type EventRequestBody = {
  eventType?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

type EventSessionUser = {
  id?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as EventRequestBody;
    const eventType = body.eventType?.trim();

    if (!eventType || !allowedEventTypes.has(eventType)) {
      return NextResponse.json({ ok: false, error: "INVALID_EVENT" }, { status: 400 });
    }

    const [headerStore, session] = await Promise.all([headers(), getServerSession(authOptions)]);
    const sessionUser = session?.user as EventSessionUser | undefined;

    await prisma.interactionEvent.create({
      data: {
        userId: sessionUser?.id,
        eventType,
        metadataJson: body.metadata ? JSON.stringify(body.metadata).slice(0, 1200) : null,
        geographicRegion: buildGeographicRegionFromHeaders(headerStore),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Interaction event tracking fallback", error);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}