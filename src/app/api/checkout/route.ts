import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

type CheckoutRequest = {
  userId?: string;
  priceId?: string;
  currentLanguage?: "ar" | "en";
  language?: "ar" | "en";
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as CheckoutRequest;
    const userId = body.userId?.trim();
    const priceId = body.priceId?.trim() || process.env.STRIPE_PRICE_ID;

    if (!userId) {
      return NextResponse.json({ error: "USER_ID_REQUIRED" }, { status: 400 });
    }

    if (!priceId) {
      return NextResponse.json({ error: "PRICE_ID_REQUIRED" }, { status: 400 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2023-10-16" });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || "http://localhost:3000";
    const locale = (body.currentLanguage === "ar" || body.language === "ar" ? "ar" : "en") as Stripe.Checkout.SessionCreateParams.Locale;

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "payment",
      client_reference_id: userId,
      success_url: `${appUrl}/?session=success`,
      cancel_url: `${appUrl}/?session=cancelled`,
      locale,
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (error) {
    console.error("Stripe checkout error", error);
    return NextResponse.json({ error: "CHECKOUT_FAILED" }, { status: 500 });
  }
}
