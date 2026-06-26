export const runtime = "nodejs";

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

type PaddleWebhookPayload = {
  event_type?: string;
  data?: {
    id?: string;
    status?: string;
    currency_code?: string;
    custom_data?: {
      userId?: string;
      product?: string;
      personaId?: string | null;
      language?: string;
    };
    details?: {
      totals?: {
        total?: string;
      };
    };
  };
};

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("paddle-signature");

  if (!isValidPaddleSignature(body, signature)) {
    return NextResponse.json({ error: "INVALID_PADDLE_SIGNATURE" }, { status: 400 });
  }

  const payload = JSON.parse(body) as PaddleWebhookPayload;

  if (payload.event_type === "transaction.completed" || payload.event_type === "transaction.paid") {
    const transactionId = payload.data?.id;
    const userId = payload.data?.custom_data?.userId;

    if (transactionId && userId) {
      const amountPaid = Number(payload.data?.details?.totals?.total || "0");
      const currency = payload.data?.currency_code || "usd";

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
          where: { stripeSessionId: `paddle:${transactionId}` },
          create: {
            userId,
            stripeSessionId: `paddle:${transactionId}`,
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
    }
  }

  return NextResponse.json({ received: true });
}

function isValidPaddleSignature(body: string, signatureHeader: string | null) {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(";").map((part) => {
      const [key, value] = part.split("=");
      return [key, value];
    })
  );
  const timestamp = parts.ts;
  const signature = parts.h1;
  if (!timestamp || !signature) return false;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}:${body}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature);
  const signatureBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== signatureBuffer.length) return false;

  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}
