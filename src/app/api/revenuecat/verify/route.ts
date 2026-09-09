export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { hasLifetimePlusAccess } from "../../../../lib/lifetimeAccess";
import { prisma } from "../../../../lib/prisma";
import { authOptions } from "../../../../lib/auth";

const REVENUECAT_REST_URL = "https://api.revenuecat.com/v1/subscribers";

type RevenueCatSubscriberResponse = {
  subscriber?: {
    entitlements?: Record<
      string,
      {
        is_active?: boolean;
        expires_date?: string | null;
        product_identifier?: string;
        product_plan_identifier?: string | null;
      }
    >;
    subscriptions?: Record<
      string,
      {
        expires_date?: string | null;
        auto_resume_date?: string | null;
        unsubscribe_detected_at?: string | null;
      }
    >;
  };
};

type RevenueCatSubscriber = {
  appUserId: string;
  entitlementId: string;
  isActive: boolean;
  expirationDate: string | null;
  productIdentifier: string | null;
  productPlanIdentifier: string | null;
  willRenew: boolean;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      appUserId?: string;
      entitlementId?: string;
    };
    const authSession = await getServerSession(authOptions);
    const authenticatedUserId = authSession?.user && "id" in authSession.user ? String(authSession.user.id) : null;

    if (!authenticatedUserId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const appUserId = body.appUserId?.trim() || authenticatedUserId;
    const entitlementId = body.entitlementId?.trim() || "plus_access";

    if (appUserId !== authenticatedUserId) {
      return NextResponse.json({ error: "APP_USER_MISMATCH" }, { status: 400 });
    }

    const secretKey = process.env.REVENUECAT_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: "REVENUECAT_SECRET_NOT_CONFIGURED" }, { status: 500 });
    }

    const response = await fetch(`${REVENUECAT_REST_URL}/${encodeURIComponent(appUserId)}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ error: "REVENUECAT_FETCH_FAILED", status: response.status }, { status: 502 });
    }

    const data = (await response.json()) as RevenueCatSubscriberResponse;
    const entitlement = data.subscriber?.entitlements?.[entitlementId];
    const subscription = data.subscriber?.subscriptions?.[entitlement?.product_identifier || ""];

    const subscriber: RevenueCatSubscriber = {
      appUserId,
      entitlementId,
      isActive: entitlement?.is_active === true,
      expirationDate: entitlement?.expires_date || null,
      productIdentifier: entitlement?.product_identifier || null,
      productPlanIdentifier: entitlement?.product_plan_identifier || null,
      willRenew: entitlement?.is_active === true && (subscription?.unsubscribe_detected_at || null) === null,
    };

    if (!subscriber.isActive) {
      const user = await prisma.user.findUnique({ where: { id: appUserId }, select: { email: true } });
      const activeTier = hasLifetimePlusAccess(user?.email) ? "PLUS" : "FREE";
      await prisma.user.updateMany({ where: { id: appUserId }, data: { activeTier } });
      return NextResponse.json({ verified: true, entitlement: "FREE" });
    }

    const existingUser = await prisma.user.findUnique({ where: { id: appUserId }, select: { id: true, activeTier: true } });
    if (!existingUser) {
      return NextResponse.json({ verified: true, ignored: "unknown_user" }, { status: 200 });
    }

    const externalId = `revenuecat:${appUserId}:${entitlementId}`;
    await prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id: appUserId },
        data: {
          activeTier: "PLUS",
          tokenBalance: existingUser.activeTier === "PLUS" ? undefined : { increment: 10 },
          revenuecatAppUserId: appUserId,
          revenuecatEntitlementId: entitlementId,
          revenuecatExpiresAt: subscriber.expirationDate ? new Date(subscriber.expirationDate) : null,
        },
      });

      await transaction.transaction.upsert({
        where: { stripeSessionId: externalId },
        create: {
          userId: appUserId,
          stripeSessionId: externalId,
          amountPaid: 0,
          currency: "usd",
          status: "SUCCESSFUL",
        },
        update: {
          status: "SUCCESSFUL",
        },
      });
    });

    return NextResponse.json({
      verified: true,
      entitlement: "PLUS",
      isActive: subscriber.isActive,
      expiresAt: subscriber.expirationDate,
    });
  } catch (error) {
    console.error("RevenueCat verify error", error);
    return NextResponse.json({ error: "REVENUECAT_VERIFY_FAILED" }, { status: 500 });
  }
}
