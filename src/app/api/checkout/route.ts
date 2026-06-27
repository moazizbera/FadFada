import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import Stripe from "stripe";
import { authOptions } from "../../../lib/auth";

export const runtime = "nodejs";

type CheckoutRequest = {
  userId?: string;
  priceId?: string;
  paddlePriceId?: string;
  currentLanguage?: "ar" | "en";
  language?: "ar" | "en";
  product?: string;
  personaId?: string;
  discountCode?: string;
};

type PaddleTransactionResponse = {
  data?: {
    id?: string;
    checkout?: {
      url?: string;
    };
  };
  error?: {
    code?: string;
    detail?: string;
    documentation_url?: string;
  };
};

type LemonCheckoutResponse = {
  data?: {
    id?: string;
    attributes?: {
      url?: string;
    };
  };
  errors?: Array<{
    title?: string;
    detail?: string;
    status?: string;
  }>;
};

export async function GET() {
  return NextResponse.json(
    {
      status: "PREMIUM_PAUSED",
      message: "بوابة الدفع متوقفة عمدًا في نسخة العرض. التجربة الحالية مجانية، وسنفتح الاشتراك لاحقًا عندما تكون المزايا المدفوعة واضحة.",
      messageEn: "Checkout is intentionally paused for the demo. The current experience is free, and paid plans will open later when the paid value is explicit.",
    },
    { status: 200 }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as CheckoutRequest;
    const authSession = await getServerSession(authOptions);
    const authenticatedUserId = authSession?.user && "id" in authSession.user ? String(authSession.user.id) : null;
    const provider = getPaymentProvider();
    const isLiveLemonCheckout = provider === "lemonsqueezy" && getLemonSqueezyMode() === "live";
    const userId = authenticatedUserId || (isLiveLemonCheckout ? undefined : body.userId?.trim());

    if (!userId) {
      return NextResponse.json({ error: "USER_ID_REQUIRED" }, { status: 400 });
    }

    if (provider === "paddle") {
      return createPaddleCheckout(request, body, userId);
    }

    if (provider === "lemonsqueezy") {
      return createLemonSqueezyCheckout(request, body, userId);
    }

    const priceId = body.priceId?.trim() || process.env.STRIPE_PRICE_ID;

    if (!priceId) {
      return NextResponse.json(
        {
          error: "PREMIUM_PAUSED",
          message: "بوابة الدفع متوقفة عمدًا في نسخة العرض. استخدم فضفضة مجانًا الآن.",
          messageEn: "Checkout is intentionally paused for the demo. Use FadFada for free now.",
        },
        { status: 200 }
      );
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        {
          error: "PREMIUM_PAUSED",
          message: "بوابة الدفع متوقفة عمدًا في نسخة العرض. استخدم فضفضة مجانًا الآن.",
          messageEn: "Checkout is intentionally paused for the demo. Use FadFada for free now.",
        },
        { status: 200 }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || "http://localhost:3000";
    const locale = (body.currentLanguage === "ar" || body.language === "ar" ? "ar" : "en") as Stripe.Checkout.SessionCreateParams.Locale;
    const mode = getStripeCheckoutMode(body.product);

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode,
      client_reference_id: userId,
      success_url: `${appUrl}/?session=success`,
      cancel_url: `${appUrl}/?session=cancelled`,
      locale,
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (error) {
    console.error("Checkout error", error);
    return NextResponse.json({ error: "CHECKOUT_FAILED" }, { status: 500 });
  }
}

function getPaymentProvider() {
  const configuredProvider = process.env.PAYMENT_PROVIDER?.toLowerCase();
  if (configuredProvider === "paddle" || configuredProvider === "stripe" || configuredProvider === "lemonsqueezy") return configuredProvider;
  return "stripe";
}

async function createLemonSqueezyCheckout(request: NextRequest, body: CheckoutRequest, userId: string) {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  const variantId = body.priceId?.trim() || process.env.LEMONSQUEEZY_PLUS_VARIANT_ID;
  const lemonMode = getLemonSqueezyMode();

  if (!apiKey || !storeId || !variantId) {
    return NextResponse.json(
      {
        error: "PREMIUM_PAUSED",
        message: "بوابة الدفع متوقفة مؤقتًا حتى يتم إعداد Lemon Squeezy.",
        messageEn: "Checkout is paused until Lemon Squeezy is configured.",
      },
      { status: 200 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || "https://fad-fada.vercel.app";
  const discountCode = cleanDiscountCode(body.discountCode);
  const response = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
    method: "POST",
    headers: {
      "Accept": "application/vnd.api+json",
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/vnd.api+json",
    },
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            ...(discountCode ? { discount_code: discountCode } : {}),
            custom: {
              userId,
              product: body.product || "plus_access",
              personaId: body.personaId || "none",
              language: body.currentLanguage || body.language || "ar",
              mode: lemonMode,
              discountCode: discountCode || "none",
            },
          },
          checkout_options: {
            embed: false,
            media: false,
          },
          product_options: {
            redirect_url: `${appUrl}/?session=success&provider=lemonsqueezy`,
            receipt_button_text: body.currentLanguage === "ar" || body.language === "ar" ? "العودة إلى فضفضة" : "Return to FadFada",
            receipt_link_url: appUrl,
          },
        },
        relationships: {
          store: {
            data: {
              type: "stores",
              id: storeId,
            },
          },
          variant: {
            data: {
              type: "variants",
              id: variantId,
            },
          },
        },
      },
    }),
  });

  const data = (await response.json().catch(() => ({}))) as LemonCheckoutResponse;
  const checkoutUrl = data.data?.attributes?.url;

  if (!response.ok || !checkoutUrl) {
    if (discountCode && isMissingLemonDiscountError(data)) {
      const retryResponse = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
        method: "POST",
        headers: {
          "Accept": "application/vnd.api+json",
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/vnd.api+json",
        },
        body: JSON.stringify({
          data: {
            type: "checkouts",
            attributes: {
              checkout_data: {
                custom: {
                  userId,
                  product: body.product || "plus_access",
                  personaId: body.personaId || "none",
                  language: body.currentLanguage || body.language || "ar",
                  mode: lemonMode,
                  discountCode: "ignored_missing_discount",
                  ignoredDiscountCode: discountCode,
                },
              },
              checkout_options: {
                embed: false,
                media: false,
              },
              product_options: {
                redirect_url: `${appUrl}/?session=success&provider=lemonsqueezy`,
                receipt_button_text: body.currentLanguage === "ar" || body.language === "ar" ? "العودة إلى فضفضة" : "Return to FadFada",
                receipt_link_url: appUrl,
              },
            },
            relationships: {
              store: {
                data: {
                  type: "stores",
                  id: storeId,
                },
              },
              variant: {
                data: {
                  type: "variants",
                  id: variantId,
                },
              },
            },
          },
        }),
      });
      const retryData = (await retryResponse.json().catch(() => ({}))) as LemonCheckoutResponse;
      const retryCheckoutUrl = retryData.data?.attributes?.url;

      if (retryResponse.ok && retryCheckoutUrl) {
        return NextResponse.json({ url: retryCheckoutUrl, provider: "lemonsqueezy", mode: lemonMode, checkoutId: retryData.data?.id, discountIgnored: discountCode }, { status: 200 });
      }
    }

    console.error("Lemon Squeezy checkout error", data.errors || data);
    return NextResponse.json(
      {
        error: "LEMONSQUEEZY_CHECKOUT_FAILED",
        provider: "lemonsqueezy",
        mode: lemonMode,
        lemonMessage: data.errors?.[0]?.detail || data.errors?.[0]?.title || "Lemon Squeezy did not return a checkout URL.",
      },
      { status: 200 }
    );
  }

  return NextResponse.json({ url: checkoutUrl, provider: "lemonsqueezy", mode: lemonMode, checkoutId: data.data?.id }, { status: 200 });
}

function isMissingLemonDiscountError(data: LemonCheckoutResponse) {
  return Boolean(data.errors?.some((error) => /discount code .*does not exist|discount.*not exist|invalid discount/i.test(`${error.title || ""} ${error.detail || ""}`)));
}

function cleanDiscountCode(value: unknown) {
  return typeof value === "string" ? value.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 32) : "";
}

function getLemonSqueezyMode() {
  const configuredMode = process.env.LEMONSQUEEZY_MODE?.toLowerCase();
  if (configuredMode === "live") return "live";
  return "test";
}

function getStripeCheckoutMode(product?: string): Stripe.Checkout.SessionCreateParams.Mode {
  const configuredMode = process.env.STRIPE_CHECKOUT_MODE?.toLowerCase();
  if (configuredMode === "payment" || configuredMode === "subscription") return configuredMode;
  return product === "persona_unlock" ? "payment" : "subscription";
}

async function createPaddleCheckout(request: NextRequest, body: CheckoutRequest, userId: string) {
  const priceId = body.paddlePriceId?.trim() || body.priceId?.trim() || process.env.PADDLE_PRICE_ID;
  const apiKey = process.env.PADDLE_API_KEY;

  if (priceId && !priceId.startsWith("pri_")) {
    return NextResponse.json(
      {
        error: "INVALID_PADDLE_PRICE_ID",
        message: "استخدم Price ID يبدأ بـ pri_ وليس Product ID يبدأ بـ pro_ .",
        messageEn: "Use a Paddle Price ID that starts with pri_, not a Product ID that starts with pro_ .",
      },
      { status: 200 }
    );
  }

  if (!priceId || !apiKey) {
    return NextResponse.json(
      {
        error: "PREMIUM_PAUSED",
        message: "بوابة الدفع متوقفة مؤقتًا حتى يتم إعداد Paddle.",
        messageEn: "Checkout is paused until Paddle is configured.",
      },
      { status: 200 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || "https://fad-fada.vercel.app";
  const paddleBaseUrl = process.env.PADDLE_ENVIRONMENT === "sandbox" ? "https://sandbox-api.paddle.com" : "https://api.paddle.com";
  const response = await fetch(`${paddleBaseUrl}/transactions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: [{ price_id: priceId, quantity: 1 }],
      custom_data: {
        userId,
        product: body.product || "plus_access",
        personaId: body.personaId || null,
        language: body.currentLanguage || body.language || "ar",
      },
      checkout: {
        url: `${appUrl}/?provider=paddle`,
      },
    }),
  });

  const data = (await response.json().catch(() => ({}))) as PaddleTransactionResponse;
  const checkoutUrl = data.data?.checkout?.url;

  if (!response.ok || !checkoutUrl) {
    console.error("Paddle checkout error", data.error || data);
    return NextResponse.json(
      {
        error: "PADDLE_CHECKOUT_FAILED",
        provider: "paddle",
        paddleCode: data.error?.code || null,
        paddleMessage: data.error?.detail || "Paddle did not return a checkout URL.",
      },
      { status: 200 }
    );
  }

  return NextResponse.json({ url: checkoutUrl, provider: "paddle", transactionId: data.data?.id }, { status: 200 });
}
