export const runtime = "nodejs";

import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { hasLifetimePlusAccess } from "../../../../lib/lifetimeAccess";
import { prisma } from "../../../../lib/prisma";

type LemonWebhookPayload = {
  meta?: {
    event_name?: string;
    custom_data?: {
      userId?: string;
      product?: string;
      personaId?: string | null;
      language?: string;
    };
  };
  data?: {
    id?: string;
    type?: string;
    attributes?: {
      status?: string;
      total?: number;
      subtotal?: number;
      currency?: string;
      currency_rate?: string;
      user_email?: string;
      customer_id?: number;
      order_id?: number;
      store_id?: number;
      variant_id?: number;
      product_id?: number;
      urls?: {
        customer_portal?: string;
        update_payment_method?: string;
      };
    };
  };
};

const paidEventNames = new Set([
  "order_created",
  "subscription_created",
  "subscription_payment_success",
  "subscription_resumed",
]);

const inactiveSubscriptionStatuses = new Set(["cancelled", "expired", "past_due", "unpaid"]);

export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-signature");
  const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  const body = await request.text();

  if (!webhookSecret) {
    console.error("Lemon Squeezy webhook secret is not configured.");
    return NextResponse.json({ error: "WEBHOOK_SECRET_NOT_CONFIGURED" }, { status: 500 });
  }

  if (!signature || !verifyLemonSqueezySignature(body, signature, webhookSecret)) {
    return NextResponse.json({ error: "INVALID_LEMONSQUEEZY_SIGNATURE" }, { status: 400 });
  }

  const payload = JSON.parse(body) as LemonWebhookPayload;
  const eventName = payload.meta?.event_name || "unknown";
  const userId = payload.meta?.custom_data?.userId?.trim();

  if (!userId) {
    return NextResponse.json({ received: true, ignored: "missing_user_id" });
  }

  if (paidEventNames.has(eventName)) {
    const granted = await grantPlusAccess(userId, payload, eventName);
    if (!granted) {
      return NextResponse.json({ received: true, ignored: "unknown_user" });
    }
    return NextResponse.json({ received: true, entitlement: "PLUS" });
  }

  if (eventName === "subscription_cancelled" || eventName === "subscription_expired") {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    const activeTier = hasLifetimePlusAccess(user?.email) ? "PLUS" : "FREE";
    await prisma.user.updateMany({ where: { id: userId }, data: { activeTier, lemonSubscriptionStatus: hasLifetimePlusAccess(user?.email) ? "lifetime" : payload.data?.attributes?.status || eventName.replace("subscription_", "") } });
    return NextResponse.json({ received: true, entitlement: "FREE" });
  }

  if (eventName === "subscription_updated" && payload.data?.attributes?.status && inactiveSubscriptionStatuses.has(payload.data.attributes.status)) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    const activeTier = hasLifetimePlusAccess(user?.email) ? "PLUS" : "FREE";
    await prisma.user.updateMany({ where: { id: userId }, data: { activeTier, lemonSubscriptionStatus: hasLifetimePlusAccess(user?.email) ? "lifetime" : payload.data.attributes.status } });
    return NextResponse.json({ received: true, entitlement: "FREE" });
  }

  return NextResponse.json({ received: true });
}

function verifyLemonSqueezySignature(body: string, signature: string, secret: string) {
  const digest = createHmac("sha256", secret).update(body).digest("hex");
  const expected = Buffer.from(digest, "hex");
  const received = Buffer.from(signature, "hex");

  if (expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
}

async function grantPlusAccess(userId: string, payload: LemonWebhookPayload, eventName: string) {
  const externalId = buildExternalTransactionId(payload, eventName);
  const amountPaid = payload.data?.attributes?.total ?? payload.data?.attributes?.subtotal ?? 0;
  const currency = payload.data?.attributes?.currency?.toLowerCase() || "usd";

  const existingUser = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!existingUser) return false;

  await prisma.$transaction(async (transaction) => {
    await transaction.user.update({
      where: { id: userId },
      data: {
        tokenBalance: {
          increment: 10,
        },
        activeTier: "PLUS",
        lemonCustomerId: payload.data?.attributes?.customer_id ? String(payload.data.attributes.customer_id) : undefined,
        lemonSubscriptionId: payload.data?.type === "subscriptions" && payload.data.id ? payload.data.id : undefined,
        lemonSubscriptionStatus: payload.data?.attributes?.status || "active",
        lemonCustomerPortalUrl: payload.data?.attributes?.urls?.customer_portal || undefined,
      },
    });

    await transaction.transaction.upsert({
      where: { stripeSessionId: externalId },
      create: {
        userId,
        stripeSessionId: externalId,
        amountPaid,
        currency,
        status: "SUCCESSFUL",
      },
      update: {
        amountPaid,
        currency,
        status: "SUCCESSFUL",
      },
    });
  });

  return true;
}

function buildExternalTransactionId(payload: LemonWebhookPayload, eventName: string) {
  const dataId = payload.data?.id || "unknown";
  const orderId = payload.data?.attributes?.order_id;
  return `lemonsqueezy:${eventName}:${orderId || dataId}`;
}