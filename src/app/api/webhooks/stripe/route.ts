export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "../../../../lib/prisma";

export async function POST(request: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2023-10-16" });
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "MISSING_SIGNATURE" }, { status: 400 });
  }

  const body = await request.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, process.env.STRIPE_WEBHOOK_SECRET!, undefined, Stripe.createSubtleCryptoProvider());
  } catch (error) {
    console.error("Stripe webhook signature verification failed", error);
    return NextResponse.json({ error: "INVALID_STRIPE_SIGNATURE" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;

      if (userId) {
        await prisma.$transaction(async (transaction) => {
          await transaction.user.upsert({
            where: { id: userId },
            create: {
              id: userId,
              tokenBalance: 10,
              activeTier: "PLUS",
            },
            update: {
              tokenBalance: {
                increment: 10,
              },
              activeTier: "PLUS",
            },
          });

          await transaction.transaction.upsert({
            where: { stripeSessionId: session.id },
            create: {
              userId,
              stripeSessionId: session.id,
              amountPaid: session.amount_total ?? 0,
              currency: session.currency ?? "usd",
              status: "SUCCESSFUL",
            },
            update: {
              amountPaid: session.amount_total ?? 0,
              currency: session.currency ?? "usd",
              status: "SUCCESSFUL",
            },
          });

          if (session.metadata?.product === "moment_capsule_journal" && session.metadata.capsuleId) {
            await transaction.momentCapsule.update({
              where: { id: session.metadata.capsuleId },
              data: {
                stripeSessionId: session.id,
                fulfillmentStatus: "PAID_AWAITING_FULFILLMENT",
              },
            });
          }
        });

        if (session.metadata?.product === "moment_capsule_journal" && session.metadata.capsuleId) {
          await triggerMomentCapsuleFulfillment(session.metadata.capsuleId, session);
        }
      }

      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}

async function triggerMomentCapsuleFulfillment(capsuleId: string, session: Stripe.Checkout.Session) {
  const capsule = await prisma.momentCapsule.findUnique({ where: { id: capsuleId } });

  if (!capsule) {
    return;
  }

  const endpoint = process.env.PRINT_FULFILLMENT_WEBHOOK_URL;
  if (!endpoint) {
    await prisma.momentCapsule.update({
      where: { id: capsule.id },
      data: { fulfillmentStatus: "AWAITING_FULFILLMENT_CONFIGURATION" },
    });
    return;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.PRINT_FULFILLMENT_WEBHOOK_SECRET ? { Authorization: `Bearer ${process.env.PRINT_FULFILLMENT_WEBHOOK_SECRET}` } : {}),
    },
    body: JSON.stringify({
      provider: capsule.fulfillmentPartner,
      product: "FadFada Personal Reflection Journal",
      capsuleId: capsule.id,
      userId: capsule.userId,
      stripeSessionId: session.id,
      amountPaid: session.amount_total ?? 0,
      currency: session.currency ?? "usd",
      customer: {
        name: session.customer_details?.name ?? session.shipping_details?.name ?? null,
        email: session.customer_details?.email ?? null,
        phone: session.customer_details?.phone ?? null,
      },
      shipping: session.shipping_details ?? null,
      printTemplate: JSON.parse(capsule.templateJson) as unknown,
    }),
  });

  await prisma.momentCapsule.update({
    where: { id: capsule.id },
    data: {
      fulfillmentStatus: response.ok ? "FULFILLMENT_SUBMITTED" : "FULFILLMENT_FAILED",
    },
  });
}
