import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions, buildGeographicRegionFromHeaders } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

export const runtime = "nodejs";

type AdminSessionUser = {
  id?: string;
  role?: "USER" | "ADMIN";
};

type AdminConfigurationRequest = {
  action?: "save_config" | "add_gift" | "create_discount";
  config?: Record<string, unknown>;
  userId?: string;
  amount?: number;
  kind?: string;
  reason?: string;
  code?: string;
  label?: string;
  percentOff?: number;
  maxRedemptions?: number | null;
  expiresAt?: string | null;
};

const configNumberKeys = ["anonymousReflectionLimit", "signedGiftReflectionLimit", "anonymousPersonaLimit", "signedPersonaLimit"] as const;

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as AdminSessionUser | undefined;

  if (sessionUser?.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const body = (await request.json()) as AdminConfigurationRequest;
  const headerStore = await headers();
  const geographicRegion = buildGeographicRegionFromHeaders(headerStore);

  if (body.action === "save_config") {
    const config = cleanConfig(body.config);
    await prisma.interactionEvent.create({
      data: {
        userId: sessionUser.id,
        eventType: "admin_app_config",
        metadataJson: JSON.stringify(config),
        geographicRegion,
      },
    });

    return NextResponse.json({ ok: true, config });
  }

  if (body.action === "add_gift") {
    const userId = cleanText(body.userId, 120);
    const amount = Math.max(1, Math.min(500, Math.round(Number(body.amount) || 0)));
    const kind = cleanText(body.kind, 40) || "TOKEN_GIFT";
    const reason = cleanText(body.reason, 240);

    if (!userId || !amount) {
      return NextResponse.json({ ok: false, error: "INVALID_GIFT" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        tokenBalance: {
          increment: amount,
        },
      },
      select: { id: true, tokenBalance: true },
    });

    await prisma.interactionEvent.create({
      data: {
        userId: sessionUser.id,
        eventType: "admin_user_gift",
        metadataJson: JSON.stringify({ targetUserId: userId, kind, amount, reason, tokenBalance: user.tokenBalance }),
        geographicRegion,
      },
    });

    return NextResponse.json({ ok: true, user });
  }

  if (body.action === "create_discount") {
    const code = cleanDiscountCode(body.code);
    const label = cleanText(body.label, 120) || code;
    const percentOff = Math.max(1, Math.min(90, Math.round(Number(body.percentOff) || 0)));
    const maxRedemptions = body.maxRedemptions == null ? null : Math.max(1, Math.min(10000, Math.round(Number(body.maxRedemptions) || 1)));
    const expiresAt = cleanDate(body.expiresAt);

    if (!code || !percentOff) {
      return NextResponse.json({ ok: false, error: "INVALID_DISCOUNT" }, { status: 400 });
    }

    const offer = { code, label, percentOff, appliesTo: "PLUS", maxRedemptions, expiresAt, isActive: true };
    await prisma.interactionEvent.create({
      data: {
        userId: sessionUser.id,
        eventType: "admin_discount_offer",
        metadataJson: JSON.stringify(offer),
        geographicRegion,
      },
    });

    return NextResponse.json({ ok: true, offer });
  }

  return NextResponse.json({ ok: false, error: "INVALID_ACTION" }, { status: 400 });
}

function cleanConfig(value: Record<string, unknown> | undefined) {
  const source = value || {};
  const config: Record<string, number> = {};

  for (const key of configNumberKeys) {
    const fallback = key === "anonymousReflectionLimit" ? 5 : key === "signedGiftReflectionLimit" ? 15 : key === "anonymousPersonaLimit" ? 4 : 10;
    config[key] = Math.max(1, Math.min(200, Math.round(Number(source[key]) || fallback)));
  }

  return config;
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanDiscountCode(value: unknown) {
  return cleanText(value, 32).toUpperCase().replace(/[^A-Z0-9_-]/g, "");
}

function cleanDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
