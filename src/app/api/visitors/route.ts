import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions, buildGeographicRegionFromHeaders } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

export const runtime = "nodejs";

type VisitorSessionUser = {
  id?: string;
};

export async function POST() {
  try {
    const [headerStore, session] = await Promise.all([headers(), getServerSession(authOptions)]);
    const sessionUser = session?.user as VisitorSessionUser | undefined;
    const forwardedFor = headerStore.get("x-forwarded-for") || "";
    const ipAddress = forwardedFor.split(",")[0]?.trim() || headerStore.get("x-real-ip") || headerStore.get("cf-connecting-ip") || "unknown";
    const geographicRegion = buildGeographicRegionFromHeaders(headerStore);
    const userAgent = headerStore.get("user-agent") || "unknown";
    const referralSource = headerStore.get("referer") || headerStore.get("referrer") || null;

    await prisma.visitorLog.create({
      data: {
        userId: sessionUser?.id,
        ipAddress,
        geographicRegion,
        userAgent,
        referralSource,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Visitor tracking fallback", error);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}