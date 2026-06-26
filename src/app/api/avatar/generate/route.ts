import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { createGeminiClient, isGeminiConfigured } from "../../../../lib/gemini";

type AvatarGenerateRequest = {
  name?: string;
  description?: string;
  language?: "ar" | "en";
};

export const runtime = "nodejs";

const defaultNanoBananaModel = "gemini-2.5-flash-image-preview";
const fallbackImageModels = ["gemini-2.0-flash-preview-image-generation"];

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AvatarGenerateRequest;
    const name = cleanText(body.name, 40);
    const description = cleanText(body.description, 700);
    const language = body.language === "ar" ? "ar" : "en";

    if (!name || !description) {
      return NextResponse.json({ error: "MISSING_DETAILS" }, { status: 400 });
    }

    const requestedModel = process.env.NANO_BANANA_MODEL?.trim() || process.env.GEMINI_IMAGE_MODEL?.trim() || defaultNanoBananaModel;
    const modelCandidates = Array.from(new Set([requestedModel, ...fallbackImageModels]));
    const imageLocation = process.env.NANO_BANANA_LOCATION?.trim() || process.env.GEMINI_IMAGE_LOCATION?.trim() || "global";
    const imageApiKey = process.env.NANO_BANANA_API_KEY?.trim() || process.env.GEMINI_IMAGE_API_KEY?.trim();

    if (imageApiKey) {
      const ai = new GoogleGenAI({ apiKey: imageApiKey });
      for (const model of modelCandidates) {
        try {
          const imagePart = await generateAvatarImage(ai, model, name, description, language);
          if (imagePart) {
            return NextResponse.json({
              imageDataUrl: `data:${imagePart.mimeType};base64,${imagePart.data}`,
              model,
              source: "nano_banana_api_key",
            });
          }
        } catch (error) {
          console.error(`Avatar generation API-key model fallback: ${model}`, error);
        }
      }
    }

    if (isGeminiConfigured()) {
      const ai = createGeminiClient(request.headers.get("x-vercel-oidc-token"), imageLocation, "v1beta");
      for (const model of modelCandidates) {
        try {
          const imagePart = await generateAvatarImage(ai, model, name, description, language);
          if (imagePart) {
            return NextResponse.json({
              imageDataUrl: `data:${imagePart.mimeType};base64,${imagePart.data}`,
              model,
              location: imageLocation,
              source: "nano_banana_vertex",
            });
          }
        } catch (error) {
          console.error(`Avatar generation model fallback: ${model}`, error);
        }
      }
    }

    return NextResponse.json({
      imageDataUrl: buildFallbackAvatarDataUrl(name, description),
      model: "local-avatar-fallback",
      location: imageLocation,
      source: "fallback",
    });
  } catch (error) {
    console.error("Avatar generation failed", error);
    return NextResponse.json({ error: "AVATAR_GENERATION_FAILED" }, { status: 500 });
  }
}

function cleanText(value: string | undefined, maxLength: number) {
  return value?.trim().slice(0, maxLength) || "";
}

function buildAvatarPrompt({ name, description, language }: { name: string; description: string; language: "ar" | "en" }) {
  const localeDirection = language === "ar" ? "Arabic user context" : "English user context";

  return [
    "Create one beautiful square avatar image for the FadFada wellbeing companion app.",
    "The avatar should feel premium, emotionally warm, culturally respectful, and suitable for a mental wellbeing PWA.",
    "Make it an original stylized companion portrait or symbolic self-avatar, not a photorealistic identity document and not a celebrity likeness.",
    "Use rich lighting, expressive eyes or symbolic facial features, soft cinematic detail, and a clean app-icon-ready composition.",
    "Avoid text, logos, watermarks, medical symbols, violent imagery, or sexualized styling.",
    `Companion name: ${name}.`,
    `User-provided self/persona information: ${description}.`,
    `Context: ${localeDirection}.`,
    "Output only the image.",
  ].join("\n");
}

async function generateAvatarImage(ai: GoogleGenAI, model: string, name: string, description: string, language: "ar" | "en") {
  const result = await ai.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: buildAvatarPrompt({ name, description, language }),
          },
        ],
      },
    ],
    config: {
      responseModalities: ["IMAGE", "TEXT"],
    },
  } as never);

  return extractInlineImage(result);
}

function extractInlineImage(result: unknown): { data: string; mimeType: string } | null {
  const candidates = (result as { candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> } }> }).candidates || [];
  for (const candidate of candidates) {
    for (const part of candidate.content?.parts || []) {
      const data = part.inlineData?.data;
      const mimeType = part.inlineData?.mimeType || "image/png";
      if (data && mimeType.startsWith("image/")) {
        return { data, mimeType };
      }
    }
  }

  return null;
}

function buildFallbackAvatarDataUrl(name: string, description: string) {
  const seed = hashText(`${name}:${description}`);
  const hue = seed % 360;
  const accentHue = (hue + 42) % 360;
  const initials = name.slice(0, 2).toUpperCase().replace(/[^A-Z0-9]/g, "") || "FF";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><radialGradient id="g" cx="42%" cy="30%" r="70%"><stop offset="0" stop-color="hsl(${accentHue},78%,78%)"/><stop offset="0.48" stop-color="hsl(${hue},54%,38%)"/><stop offset="1" stop-color="#0E0D10"/></radialGradient><filter id="s"><feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#000" flood-opacity="0.38"/></filter></defs><rect width="512" height="512" rx="112" fill="#0E0D10"/><circle cx="256" cy="240" r="178" fill="url(#g)" filter="url(#s)"/><path d="M156 358c24-70 176-70 200 0" fill="none" stroke="#F7F3EC" stroke-width="22" stroke-linecap="round" opacity="0.72"/><circle cx="206" cy="220" r="20" fill="#F7F3EC" opacity="0.86"/><circle cx="306" cy="220" r="20" fill="#F7F3EC" opacity="0.86"/><path d="M214 292c27 24 57 24 84 0" fill="none" stroke="#F7F3EC" stroke-width="18" stroke-linecap="round" opacity="0.68"/><text x="256" y="446" text-anchor="middle" font-family="Georgia,serif" font-size="54" font-weight="700" fill="#C9A86A">${initials}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function hashText(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}